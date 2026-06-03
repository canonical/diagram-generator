"""Tests for preview_ts_layout.TsLayoutPool."""

from __future__ import annotations

import json
import subprocess
import threading
import time
from pathlib import Path

from preview_ts_layout import TsLayoutConfig, TsLayoutPool


def _config(tmp_path: Path) -> TsLayoutConfig:
    frames = tmp_path / "frames"
    frames.mkdir(parents=True, exist_ok=True)
    layout = tmp_path / "layout.mjs"
    emit = tmp_path / "emit.mjs"
    layout.write_text("// stub\n", encoding="utf-8")
    emit.write_text("// stub\n", encoding="utf-8")
    return TsLayoutConfig(
        script_path=layout,
        emit_script_path=emit,
        repo_root=tmp_path,
        frames_dir=frames,
        timeout_sec=2.0,
        max_concurrent=2,
        cache_max_entries=8,
    )


def test_layout_bundle_parses_json(tmp_path: Path):
    slug = "demo"
    frames = tmp_path / "frames"
    frames.mkdir(parents=True, exist_ok=True)
    (frames / f"{slug}.yaml").write_text("engine: v3\n", encoding="utf-8")
    payload = {"width": 100, "height": 80, "gridInfo": {}, "componentTree": []}

    def layout_runner(s: str) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(args=[], returncode=0, stdout=json.dumps(payload))

    pool = TsLayoutPool(_config(tmp_path), layout_runner=layout_runner)
    assert pool.layout_bundle(slug) == payload
    assert pool.layout_bundle(slug) == payload


def test_frame_tree_json(tmp_path: Path):
    slug = "demo"
    frames = tmp_path / "frames"
    frames.mkdir(parents=True, exist_ok=True)
    (frames / f"{slug}.yaml").write_text("engine: v3\n", encoding="utf-8")
    payload = {"title": "t", "root": {"id": "page", "children": []}}

    def emit_runner(s: str) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(args=[], returncode=0, stdout=json.dumps(payload))

    pool = TsLayoutPool(_config(tmp_path), emit_runner=emit_runner)
    assert pool.frame_tree_json(slug) == payload


def test_coalesces_concurrent_layout_requests(tmp_path: Path):
    slug = "burst"
    cfg = _config(tmp_path)
    frames = tmp_path / "frames"
    (frames / f"{slug}.yaml").write_text("engine: v3\n", encoding="utf-8")
    payload = {"width": 1, "height": 1, "gridInfo": {}, "componentTree": []}
    active = 0
    peak = 0
    lock = threading.Lock()

    def layout_runner(s: str) -> subprocess.CompletedProcess[str]:
        nonlocal active, peak
        with lock:
            active += 1
            peak = max(peak, active)
        time.sleep(0.15)
        with lock:
            active -= 1
        return subprocess.CompletedProcess(args=[], returncode=0, stdout=json.dumps(payload))

    pool = TsLayoutPool(_config(tmp_path), layout_runner=layout_runner)
    results: list[dict | None] = [None] * 6

    def work(i: int) -> None:
        results[i] = pool.layout_bundle(slug)

    threads = [threading.Thread(target=work, args=(i,)) for i in range(6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=10)

    assert all(r == payload for r in results)
    assert peak <= 2
    assert pool.stats["coalesced"] >= 1
