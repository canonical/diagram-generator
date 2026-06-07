"""Regression: preview browser test facade replaces legacy globals (spec 027)."""

from __future__ import annotations

import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PREVIEW = ROOT / "scripts" / "preview"


def test_editor_mounts_preview_test_facade():
    editor = (PREVIEW / "editor.js").read_text(encoding="utf-8")
    assert "window.__DG_TEST_preview = Object.freeze({" in editor
    assert "saveOverrides: () => PreviewSaveClient.saveOverrides()" in editor
    assert "undo: () => EditorState.undo(_applyUndoCommand)" in editor
    assert "redo: () => EditorState.redo(_applyUndoCommand)" in editor
    assert "canUndo: () => EditorState.canUndo()" in editor
    assert "canRedo: () => EditorState.canRedo()" in editor


def test_editor_does_not_reintroduce_legacy_globals():
    editor = (PREVIEW / "editor.js").read_text(encoding="utf-8")
    forbidden = [
        "window.saveOverrides =",
        "window.performUndo =",
        "window.performRedo =",
        "window.canUndo =",
        "window.canRedo =",
    ]
    for token in forbidden:
        assert token not in editor, f"legacy preview global reintroduced: {token}"


def test_preview_browser_coverage_uses_named_test_facade():
    text = (ROOT / "scripts" / "test_preview_support_engineering_flow.py").read_text(encoding="utf-8")
    assert "__DG_TEST_preview.saveOverrides()" in text
    assert "__DG_TEST_preview.undo()" in text
    assert "__DG_TEST_preview.redo()" in text
    assert "__DG_TEST_preview.canUndo()" in text
    forbidden = [
        'page.evaluate("() => saveOverrides()")',
        'page.evaluate("() => performUndo()")',
        'page.evaluate("() => performRedo()")',
        'page.evaluate("() => canUndo()")',
        'page.evaluate("() => canRedo()")',
    ]
    for token in forbidden:
        assert token not in text, f"legacy Playwright evaluate call still present: {token}"
