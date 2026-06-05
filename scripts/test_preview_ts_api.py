"""HTTP smoke tests for TS preview API (frame-tree, grid, component tree)."""

from __future__ import annotations

import json
import os
import pathlib
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

import pytest

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
SLUG = "preview-smoke"


def _reserve_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _wait_for_server(base_url: str, process: subprocess.Popen[str], timeout: float = 90.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if process.poll() is not None:
            output = process.stdout.read() if process.stdout else ""
            raise RuntimeError(
                f"Preview server exited with code {process.returncode}.\n{output}"
            )
        try:
            with urllib.request.urlopen(base_url, timeout=1):
                return
        except Exception:
            time.sleep(0.25)
    raise RuntimeError(f"Preview server did not start at {base_url}")


def _fetch_json(url: str) -> tuple[int, object]:
    try:
        with urllib.request.urlopen(url, timeout=60) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode() if exc.fp else ""
        try:
            payload = json.loads(body) if body else None
        except json.JSONDecodeError:
            payload = body
        return exc.code, payload


@pytest.fixture(scope="module")
def preview_base() -> str:
    port = _reserve_port()
    env = os.environ.copy()
    env["DG_DISABLE_TS_EXPORT"] = "1"
    process = subprocess.Popen(
        [
            sys.executable,
            str(SCRIPTS / "preview_server.py"),
            "--port",
            str(port),
            "--no-watch",
        ],
        cwd=str(ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        env=env,
    )
    base = f"http://127.0.0.1:{port}"
    try:
        _wait_for_server(base, process)
        yield base
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=10)


def test_frame_tree_from_ts(preview_base: str):
    status, data = _fetch_json(f"{preview_base}/api/frame-tree/{SLUG}")
    assert status == 200
    assert isinstance(data, dict)
    assert data.get("title")
    assert isinstance(data.get("root"), dict)


def test_grid_from_ts(preview_base: str):
    status, data = _fetch_json(f"{preview_base}/api/grid/{SLUG}")
    assert status == 200
    assert isinstance(data, dict)
    assert "col_xs" in data
    assert "baseline_step" in data


def test_component_tree_from_ts(preview_base: str):
    status, data = _fetch_json(f"{preview_base}/api/tree/{SLUG}")
    assert status == 200
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0].get("id") == "page"


def test_frame_tree_404_unknown_slug(preview_base: str):
    status, _ = _fetch_json(f"{preview_base}/api/frame-tree/no-such-diagram-xyz")
    assert status == 404


def test_preview_api_without_ts_layout_returns_empty_or_error():
    port = _reserve_port()
    process = subprocess.Popen(
        [
            sys.executable,
            str(SCRIPTS / "preview_server.py"),
            "--port",
            str(port),
            "--no-watch",
        ],
        cwd=str(ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        env={**os.environ, "DG_DISABLE_TS_LAYOUT": "1", "DG_DISABLE_TS_EXPORT": "1"},
    )
    base = f"http://127.0.0.1:{port}"
    try:
        _wait_for_server(base, process)
        status, _ = _fetch_json(f"{base}/api/frame-tree/{SLUG}")
        assert status == 503
        status, data = _fetch_json(f"{base}/api/grid/{SLUG}")
        assert status == 200
        assert data is None
        status, data = _fetch_json(f"{base}/api/tree/{SLUG}")
        assert status == 200
        assert data == []
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
