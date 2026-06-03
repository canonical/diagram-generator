"""Bounded, cached TS SVG export for preview_server (Node subprocess)."""

from __future__ import annotations

import os
import subprocess
import threading
import traceback
from collections import OrderedDict
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return max(1, int(raw))
    except ValueError:
        return default


@dataclass
class TsExportConfig:
    script_path: Path
    repo_root: Path
    frames_dir: Path
    timeout_sec: float = 45.0
    max_concurrent: int = 2
    cache_max_entries: int = 32
    disabled: bool = False


class TsSvgExportPool:
    """Cache + concurrency limit + in-flight request coalescing for Node export."""

    def __init__(
        self,
        config: TsExportConfig,
        *,
        runner: Callable[[str], subprocess.CompletedProcess[str]] | None = None,
    ) -> None:
        self._config = config
        self._runner = runner or self._default_runner
        self._cache: OrderedDict[str, tuple[float, bytes]] = OrderedDict()
        self._cache_lock = threading.Lock()
        self._semaphore = threading.Semaphore(config.max_concurrent)
        self._inflight: dict[str, _InflightWait] = {}
        self._stats = {"hits": 0, "misses": 0, "timeouts": 0, "errors": 0, "coalesced": 0}

    @property
    def stats(self) -> dict[str, int]:
        return dict(self._stats)

    def clear_cache(self) -> None:
        with self._cache_lock:
            self._cache.clear()
            self._inflight.clear()

    def invalidate_slug(self, slug: str) -> None:
        key = _normalize_slug(slug)
        with self._cache_lock:
            self._cache.pop(key, None)

    def render_svg(self, slug: str) -> bytes | None:
        if self._config.disabled or not self._config.script_path.is_file():
            return None

        key = _normalize_slug(slug)
        yaml_path = self._config.frames_dir / f"{key}.yaml"
        if not yaml_path.is_file():
            return None

        try:
            mtime = yaml_path.stat().st_mtime
        except OSError:
            return None

        cached = self._cache_get(key, mtime)
        if cached is not None:
            self._stats["hits"] += 1
            return cached

        self._stats["misses"] += 1
        return self._render_with_coalesce(key, mtime)

    def _cache_get(self, key: str, mtime: float) -> bytes | None:
        with self._cache_lock:
            entry = self._cache.get(key)
            if entry and entry[0] == mtime:
                self._cache.move_to_end(key)
                return entry[1]
        return None

    def _cache_put(self, key: str, mtime: float, svg: bytes) -> None:
        with self._cache_lock:
            self._cache[key] = (mtime, svg)
            self._cache.move_to_end(key)
            while len(self._cache) > self._config.cache_max_entries:
                self._cache.popitem(last=False)

    def _render_with_coalesce(self, key: str, mtime: float) -> bytes | None:
        leader = False
        waiter: _InflightWait | None = None

        with self._cache_lock:
            cached = self._cache.get(key)
            if cached and cached[0] == mtime:
                self._stats["hits"] += 1
                return cached[1]
            existing = self._inflight.get(key)
            if existing is not None:
                waiter = existing
            else:
                waiter = _InflightWait()
                self._inflight[key] = waiter
                leader = True

        if not leader and waiter is not None:
            self._stats["coalesced"] += 1
            if waiter.wait(self._config.timeout_sec + 10.0):
                return self._cache_get(key, mtime)
            self._stats["timeouts"] += 1
            return None

        result: bytes | None = None
        error: BaseException | None = None
        try:
            with self._semaphore:
                result = self._run_node(key)
            if result is not None:
                self._cache_put(key, mtime, result)
        except subprocess.TimeoutExpired:
            self._stats["timeouts"] += 1
            print(f"  [preview] TS SVG export timed out for {key}", flush=True)
        except (subprocess.CalledProcessError, OSError) as exc:
            self._stats["errors"] += 1
            err = getattr(exc, "stderr", None) or str(exc)
            print(f"  [preview] TS SVG export failed for {key}: {err}", flush=True)
        except Exception as exc:
            self._stats["errors"] += 1
            error = exc
            print(f"  [preview] TS SVG export unexpected error for {key}: {exc}", flush=True)
            traceback.print_exc()
        finally:
            with self._cache_lock:
                inflight = self._inflight.pop(key, None)
            if inflight is not None:
                inflight.done(result, error)

        return result

    def _run_node(self, slug: str) -> bytes | None:
        proc = self._runner(slug)
        if not proc.stdout:
            return None
        return proc.stdout.encode("utf-8")

    def _default_runner(self, slug: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["node", str(self._config.script_path), "--slug", slug],
            cwd=str(self._config.repo_root),
            capture_output=True,
            text=True,
            timeout=self._config.timeout_sec,
            check=True,
        )


class _InflightWait:
    def __init__(self) -> None:
        self._event = threading.Event()
        self._result: bytes | None = None
        self._error: BaseException | None = None

    def done(self, result: bytes | None, error: BaseException | None = None) -> None:
        self._result = result
        self._error = error
        self._event.set()

    def wait(self, timeout: float) -> bool:
        return self._event.wait(timeout=timeout)


def _normalize_slug(slug: str) -> str:
    return slug[3:] if slug.startswith("v3:") else slug


def pool_from_env(
    *,
    script_path: Path,
    repo_root: Path,
    frames_dir: Path,
) -> TsSvgExportPool:
    disabled = os.environ.get("DG_DISABLE_TS_EXPORT", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    return TsSvgExportPool(
        TsExportConfig(
            script_path=script_path,
            repo_root=repo_root,
            frames_dir=frames_dir,
            timeout_sec=float(_env_int("DG_TS_EXPORT_TIMEOUT", 45)),
            max_concurrent=_env_int("DG_TS_EXPORT_MAX_CONCURRENT", 2),
            cache_max_entries=_env_int("DG_TS_SVG_CACHE_SIZE", 32),
            disabled=disabled,
        ),
    )
