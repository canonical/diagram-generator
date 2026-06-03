"""Tests for preview_ts_export.TsSvgExportPool."""

from __future__ import annotations

import subprocess
import threading
import time
from pathlib import Path

import pytest

from preview_ts_export import TsExportConfig, TsSvgExportPool


def _config(tmp_path: Path) -> TsExportConfig:
    frames = tmp_path / "frames"
    frames.mkdir()
    script = tmp_path / "export.mjs"
    script.write_text("// stub\n", encoding="utf-8")
    return TsExportConfig(
        script_path=script,
        repo_root=tmp_path,
        frames_dir=frames,
        timeout_sec=2.0,
        max_concurrent=2,
        cache_max_entries=8,
    )


def _write_frame_yaml(config: TsExportConfig, slug: str) -> Path:
    config.frames_dir.mkdir(parents=True, exist_ok=True)
    path = config.frames_dir / f"{slug}.yaml"
    path.write_text("engine: v3\n", encoding="utf-8")
    return path


def test_cache_hit_skips_subprocess(tmp_path: Path):
    slug = "demo"
    cfg = _config(tmp_path)
    _write_frame_yaml(cfg, slug)
    calls: list[str] = []

    def runner(s: str) -> subprocess.CompletedProcess[str]:
        calls.append(s)
        return subprocess.CompletedProcess(args=[], returncode=0, stdout="<svg/>")

    pool = TsSvgExportPool(cfg, runner=runner)
    assert pool.render_svg(slug) == b"<svg/>"
    assert pool.render_svg(slug) == b"<svg/>"
    assert len(calls) == 1
    assert pool.stats["hits"] == 1


def test_timeout_returns_none_without_raising(tmp_path: Path):
    slug = "slow"
    cfg = _config(tmp_path)
    _write_frame_yaml(cfg, slug)

    def runner(s: str) -> subprocess.CompletedProcess[str]:
        raise subprocess.TimeoutExpired(cmd="node", timeout=2)

    pool = TsSvgExportPool(cfg, runner=runner)
    assert pool.render_svg(slug) is None
    assert pool.stats["timeouts"] == 1


def test_coalesces_concurrent_requests(tmp_path: Path):
    slug = "burst"
    cfg = _config(tmp_path)
    _write_frame_yaml(cfg, slug)
    active = 0
    peak = 0
    lock = threading.Lock()

    def runner(s: str) -> subprocess.CompletedProcess[str]:
        nonlocal active, peak
        with lock:
            active += 1
            peak = max(peak, active)
        time.sleep(0.15)
        with lock:
            active -= 1
        return subprocess.CompletedProcess(args=[], returncode=0, stdout="<svg/>")

    pool = TsSvgExportPool(cfg, runner=runner)
    results: list[bytes | None] = [None] * 6

    def work(i: int) -> None:
        results[i] = pool.render_svg(slug)

    threads = [threading.Thread(target=work, args=(i,)) for i in range(6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=10)

    assert all(r == b"<svg/>" for r in results)
    assert peak <= 2
    assert pool.stats["coalesced"] >= 1


def test_invalidate_slug_forces_rerender(tmp_path: Path):
    slug = "x"
    cfg = _config(tmp_path)
    _write_frame_yaml(cfg, slug)
    calls = 0

    def runner(s: str) -> subprocess.CompletedProcess[str]:
        nonlocal calls
        calls += 1
        return subprocess.CompletedProcess(args=[], returncode=0, stdout=f"<svg n='{calls}'/>")

    pool = TsSvgExportPool(cfg, runner=runner)
    first = pool.render_svg(slug)
    pool.invalidate_slug(slug)
    second = pool.render_svg(slug)
    assert first != second
    assert calls == 2
