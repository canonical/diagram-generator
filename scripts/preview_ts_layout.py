"""Bounded TS layout subprocess for preview_server (grid + component tree)."""

from __future__ import annotations

import json
import os
import subprocess
import threading
import traceback
from collections import OrderedDict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return max(1, int(raw))
    except ValueError:
        return default


@dataclass
class TsLayoutConfig:
    script_path: Path
    emit_script_path: Path
    repo_root: Path
    frames_dir: Path
    timeout_sec: float = 45.0
    max_concurrent: int = 2
    cache_max_entries: int = 32
    disabled: bool = False


class _InflightWait:
    def __init__(self) -> None:
        self._event = threading.Event()
        self._result: dict[str, Any] | None = None

    def done(self, result: dict[str, Any] | None) -> None:
        self._result = result
        self._event.set()

    def wait(self, timeout: float) -> bool:
        return self._event.wait(timeout=timeout)


class TsLayoutPool:
    """Cache + concurrency limit + in-flight coalescing for layout / emit JSON."""

    def __init__(
        self,
        config: TsLayoutConfig,
        *,
        layout_runner: Callable[[str], subprocess.CompletedProcess[str]] | None = None,
        emit_runner: Callable[[str], subprocess.CompletedProcess[str]] | None = None,
    ) -> None:
        self._config = config
        self._layout_runner = layout_runner or self._default_layout_runner
        self._emit_runner = emit_runner or self._default_emit_runner
        self._cache: OrderedDict[str, tuple[float, dict[str, Any]]] = OrderedDict()
        self._emit_cache: OrderedDict[str, tuple[float, dict[str, Any]]] = OrderedDict()
        self._lock = threading.RLock()
        self._semaphore = threading.Semaphore(config.max_concurrent)
        self._layout_inflight: dict[str, _InflightWait] = {}
        self._emit_inflight: dict[str, _InflightWait] = {}
        self._stats = {"coalesced": 0}

    @property
    def stats(self) -> dict[str, int]:
        return dict(self._stats)

    def clear_cache(self) -> None:
        with self._lock:
            self._cache.clear()
            self._emit_cache.clear()
            self._layout_inflight.clear()
            self._emit_inflight.clear()

    def invalidate_slug(self, slug: str) -> None:
        key = _normalize_slug(slug)
        with self._lock:
            self._cache.pop(key, None)
            self._emit_cache.pop(key, None)

    def layout_bundle(self, slug: str) -> dict[str, Any] | None:
        return self._fetch(
            slug,
            cache=self._cache,
            inflight=self._layout_inflight,
            script_ok=self._config.script_path.is_file(),
            runner=self._layout_runner,
            label="layout",
        )

    def frame_tree_json(self, slug: str) -> dict[str, Any] | None:
        return self._fetch(
            slug,
            cache=self._emit_cache,
            inflight=self._emit_inflight,
            script_ok=self._config.emit_script_path.is_file(),
            runner=self._emit_runner,
            label="frame-tree emit",
        )

    def _fetch(
        self,
        slug: str,
        *,
        cache: OrderedDict[str, tuple[float, dict[str, Any]]],
        inflight: dict[str, _InflightWait],
        script_ok: bool,
        runner: Callable[[str], subprocess.CompletedProcess[str]],
        label: str,
    ) -> dict[str, Any] | None:
        if self._config.disabled:
            return None
        key = _normalize_slug(slug)
        yaml_path = self._config.frames_dir / f"{key}.yaml"
        if not yaml_path.is_file():
            return None
        try:
            mtime = yaml_path.stat().st_mtime
        except OSError:
            return None

        cached = self._cache_get(cache, key, mtime)
        if cached is not None:
            return cached

        if not script_ok:
            return None

        return self._fetch_with_coalesce(
            key,
            mtime,
            cache=cache,
            inflight=inflight,
            runner=runner,
            label=label,
        )

    def _cache_get(
        self,
        cache: OrderedDict[str, tuple[float, dict[str, Any]]],
        key: str,
        mtime: float,
    ) -> dict[str, Any] | None:
        with self._lock:
            hit = cache.get(key)
            if hit and hit[0] == mtime:
                cache.move_to_end(key)
                return hit[1]
        return None

    def _cache_put(
        self,
        cache: OrderedDict[str, tuple[float, dict[str, Any]]],
        key: str,
        mtime: float,
        data: dict[str, Any],
    ) -> None:
        with self._lock:
            cache[key] = (mtime, data)
            cache.move_to_end(key)
            while len(cache) > self._config.cache_max_entries:
                cache.popitem(last=False)

    def _fetch_with_coalesce(
        self,
        key: str,
        mtime: float,
        *,
        cache: OrderedDict[str, tuple[float, dict[str, Any]]],
        inflight: dict[str, _InflightWait],
        runner: Callable[[str], subprocess.CompletedProcess[str]],
        label: str,
    ) -> dict[str, Any] | None:
        leader = False
        waiter: _InflightWait | None = None

        with self._lock:
            cached = self._cache_get(cache, key, mtime)
            if cached is not None:
                return cached
            existing = inflight.get(key)
            if existing is not None:
                waiter = existing
            else:
                waiter = _InflightWait()
                inflight[key] = waiter
                leader = True

        if not leader and waiter is not None:
            self._stats["coalesced"] += 1
            if waiter.wait(self._config.timeout_sec + 10.0):
                return self._cache_get(cache, key, mtime)
            return None

        result: dict[str, Any] | None = None
        try:
            with self._semaphore:
                proc = runner(key)
            data = json.loads(proc.stdout)
            if isinstance(data, dict):
                result = data
                self._cache_put(cache, key, mtime, data)
        except subprocess.TimeoutExpired:
            print(f"  [preview] TS {label} timed out for {key}", flush=True)
        except (subprocess.CalledProcessError, OSError, json.JSONDecodeError) as exc:
            print(f"  [preview] TS {label} failed for {key}: {exc}", flush=True)
        except Exception as exc:
            print(f"  [preview] TS {label} unexpected error for {key}: {exc}", flush=True)
            traceback.print_exc()
        finally:
            with self._lock:
                inflight_wait = inflight.pop(key, None)
            if inflight_wait is not None:
                inflight_wait.done(result)

        return result

    def _default_layout_runner(self, slug: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["node", str(self._config.script_path), "--slug", slug],
            cwd=str(self._config.repo_root),
            capture_output=True,
            text=True,
            timeout=self._config.timeout_sec,
            check=True,
            env=os.environ.copy(),
        )

    def _default_emit_runner(self, slug: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["node", str(self._config.emit_script_path), "--slug", slug],
            cwd=str(self._config.repo_root),
            capture_output=True,
            text=True,
            timeout=self._config.timeout_sec,
            check=True,
            env=os.environ.copy(),
        )


def _normalize_slug(slug: str) -> str:
    return slug[3:] if slug.startswith("v3:") else slug


def pool_from_env(
    *,
    layout_script: Path,
    emit_script: Path,
    repo_root: Path,
    frames_dir: Path,
) -> TsLayoutPool:
    disabled = os.environ.get("DG_DISABLE_TS_LAYOUT", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    return TsLayoutPool(
        TsLayoutConfig(
            script_path=layout_script,
            emit_script_path=emit_script,
            repo_root=repo_root,
            frames_dir=frames_dir,
            timeout_sec=float(_env_int("DG_TS_LAYOUT_TIMEOUT", 45)),
            max_concurrent=_env_int("DG_TS_LAYOUT_MAX_CONCURRENT", 2),
            cache_max_entries=_env_int("DG_TS_LAYOUT_CACHE_SIZE", 32),
            disabled=disabled,
        ),
    )
