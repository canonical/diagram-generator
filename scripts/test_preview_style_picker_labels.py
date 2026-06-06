from __future__ import annotations

import pathlib


ROOT = pathlib.Path(__file__).resolve().parent.parent
PREVIEW = ROOT / "scripts" / "preview"


def test_grid_style_picker_uses_as_defined_labels() -> None:
    editor = (PREVIEW / "editor.js").read_text(encoding="utf-8")
    assert "— original —" not in editor
    assert "— as defined —" in editor
    assert "— as defined (" in editor


def test_implicit_wrappers_do_not_offer_visible_style_picker() -> None:
    editor = (PREVIEW / "editor.js").read_text(encoding="utf-8")
    assert "_isImplicitStructuralWrapper" in editor
    assert "_nodeSupportsVisibleStylePicker" in editor
    assert "Structural wrapper — no box style or default panel padding." in editor


def test_force_style_picker_uses_as_defined_labels() -> None:
    force = (PREVIEW / "force.js").read_text(encoding="utf-8")
    assert "— original —" not in force
    assert "— as defined —" in force
    assert "— as defined (" in force


def test_shared_box_style_helper_defaults_to_as_defined() -> None:
    helper = (PREVIEW / "box-styles.js").read_text(encoding="utf-8")
    assert "— original —" not in helper
    assert '"As defined"' in helper
    assert "— as defined —" in helper
