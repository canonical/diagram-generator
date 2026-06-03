"""Regression: Node preview CLIs honor DG_FRAMES_DIR (adversarial review P1)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
EMIT_SCRIPT = ROOT / "packages" / "layout-engine" / "scripts" / "emit-frame-diagram-json.mjs"
REPO_FRAMES = ROOT / "scripts" / "diagrams" / "frames"


@pytest.mark.skipif(not EMIT_SCRIPT.is_file(), reason="emit script missing")
def test_emit_frame_diagram_json_honors_dg_frames_dir(tmp_path: Path):
    alt_frames = tmp_path / "frames"
    alt_frames.mkdir()
    slug = "dg-frames-probe"
    unique_title = "DG_FRAMES_DIR_PROBE_TITLE_XYZ"
    (alt_frames / f"{slug}.yaml").write_text(
        f'engine: v3\ntitle: "{unique_title}"\nroot:\n  id: page\n  direction: horizontal\n  children: []\n',
        encoding="utf-8",
    )
    assert not (REPO_FRAMES / f"{slug}.yaml").is_file()

    proc = subprocess.run(
        ["node", str(EMIT_SCRIPT), "--slug", slug],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=60,
        env={**os.environ, "DG_FRAMES_DIR": str(alt_frames)},
    )
    assert proc.returncode == 0, proc.stderr
    data = json.loads(proc.stdout)
    assert data.get("title") == unique_title
