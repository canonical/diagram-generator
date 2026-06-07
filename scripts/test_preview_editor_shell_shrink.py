"""Regression: editor.js shell shrink after extracted modules (spec 026 T030)."""

from __future__ import annotations

import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PREVIEW = ROOT / "scripts" / "preview"


def test_editor_no_longer_wraps_extracted_state_helpers():
    editor = (PREVIEW / "editor.js").read_text(encoding="utf-8")
    obsolete_wrappers = [
        "function _serializeDirtyState",
        "function _cloneState",
        "function _normaliseGridOverrides",
        "function _captureOverrideEntries",
        "function beginUndoableAction",
        "function commitUndoableAction",
        "function commitOverridePatchAction",
        "function runUndoableAction",
        "function performUndo",
        "function performRedo",
        "function updateUndoRedoButtons",
        "function isEditorDirty",
        "function _getOverrides",
    ]
    for name in obsolete_wrappers:
        assert name not in editor, f"obsolete wrapper still present: {name}"


def test_editor_calls_extracted_modules_directly():
    editor = (PREVIEW / "editor.js").read_text(encoding="utf-8")
    assert "EditorState.serializeDirtyState()" in editor
    assert "EditorState.commitOverridePatchAction(" in editor
    assert "EditorState.undo(_applyUndoCommand)" in editor
    assert "PreviewSaveClient.isDirty()" in editor
    assert "LayoutEngine.parseEditorSnapshot" in editor


def test_editor_no_longer_assigns_legacy_browser_globals():
    editor = (PREVIEW / "editor.js").read_text(encoding="utf-8")
    forbidden = [
        "window.saveOverrides =",
        "window.performUndo =",
        "window.performRedo =",
        "window.canUndo =",
        "window.canRedo =",
    ]
    for token in forbidden:
        assert token not in editor, f"legacy global shim still present: {token}"
