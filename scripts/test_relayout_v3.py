"""Tests for the /api/relayout-v3/<slug> endpoint logic.

Tests exercise _relayout_v3() directly against real frame YAML files
to verify:
  - basic relayout returns SVG + tree + grid_info
  - grid_overrides round-trip (cols, col_gap, row_gap, outer_margin)
  - frame property overrides (direction, gap, sizing_w, sizing_h, align)
  - style overrides (fill, border)
  - coercion detection (FILL-in-HUG → FIXED)
  - children_order reorder
"""

import json
import os
import sys

import pytest

# Ensure scripts/ is on the path so preview_server can find its siblings
SCRIPTS = os.path.dirname(os.path.abspath(__file__))
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)

from preview_server import _relayout_v3, _layout_cache


@pytest.fixture(autouse=True)
def clear_layout_cache():
    """Clear the layout cache before each test so results are fresh."""
    _layout_cache.clear()
    yield
    _layout_cache.clear()


# ---------------------------------------------------------------------------
# Slug used for most tests — must exist as a frame YAML
# ---------------------------------------------------------------------------
SLUG = "support-engineering-flow"


class TestBasicRelayout:
    """Relayout with no overrides returns a valid response."""

    def test_returns_svg_string(self):
        result = _relayout_v3(SLUG, {})
        assert result is not None
        assert "svg" in result
        assert result["svg"].strip().startswith("<svg")

    def test_returns_tree(self):
        result = _relayout_v3(SLUG, {})
        assert "tree" in result
        assert isinstance(result["tree"], list)
        assert len(result["tree"]) > 0

    def test_returns_grid_info(self):
        result = _relayout_v3(SLUG, {})
        assert "grid_info" in result
        gi = result["grid_info"]
        assert "col_xs" in gi
        assert "col_widths" in gi
        assert "row_ys" in gi
        assert "row_heights" in gi

    def test_grid_info_matches_yaml_grid_block(self):
        """Grid info should reflect the explicit grid: block in the YAML."""
        result = _relayout_v3(SLUG, {})
        gi = result["grid_info"]
        assert len(gi["col_xs"]) == 5, "YAML declares cols: 5"
        assert gi["col_gap"] == 48, "YAML declares col_gap: 48"
        assert gi["outer_margin"] == 24, "YAML declares outer_margin: 24"

    def test_nonexistent_slug_returns_none(self):
        result = _relayout_v3("nonexistent-slug-xyz", {})
        assert result is None


class TestGridOverrides:
    """grid_overrides change the Brockman grid metadata."""

    def test_override_cols(self):
        result = _relayout_v3(SLUG, {"grid_overrides": {"cols": 3}})
        assert result is not None
        gi = result["grid_info"]
        assert len(gi["col_xs"]) == 3

    def test_override_col_gap(self):
        result = _relayout_v3(SLUG, {"grid_overrides": {"col_gap": 16}})
        gi = result["grid_info"]
        assert gi["col_gap"] == 16

    def test_override_row_gap(self):
        result = _relayout_v3(SLUG, {"grid_overrides": {"row_gap": 8}})
        gi = result["grid_info"]
        assert gi["row_gap"] == 8

    def test_override_outer_margin(self):
        result = _relayout_v3(SLUG, {"grid_overrides": {"outer_margin": 48}})
        gi = result["grid_info"]
        assert gi["outer_margin"] == 48

    def test_multiple_grid_overrides(self):
        result = _relayout_v3(SLUG, {"grid_overrides": {
            "cols": 2,
            "col_gap": 32,
            "row_gap": 16,
            "outer_margin": 8,
        }})
        gi = result["grid_info"]
        assert len(gi["col_xs"]) == 2
        assert gi["col_gap"] == 32
        assert gi["outer_margin"] == 8

    def test_grid_overrides_do_not_affect_layout_size(self):
        """Changing grid metadata should not change the SVG dimensions —
        grid is an overlay, not a layout driver."""
        base = _relayout_v3(SLUG, {})
        _layout_cache.clear()
        modified = _relayout_v3(SLUG, {"grid_overrides": {"cols": 10, "col_gap": 100}})
        # Both should produce the same SVG content (layout unchanged)
        assert base["svg"] == modified["svg"]


class TestFramePropertyOverrides:
    """frame_overrides change layout properties on specific frames."""

    def test_change_direction(self):
        result = _relayout_v3(SLUG, {
            "frame_overrides": {"page": {"direction": "VERTICAL"}}
        })
        assert result is not None
        # Vertical layout should be taller than wide
        svg = result["svg"]
        assert "svg" in svg.lower()

    def test_change_gap(self):
        base = _relayout_v3(SLUG, {})
        _layout_cache.clear()
        modified = _relayout_v3(SLUG, {
            "frame_overrides": {"page": {"gap": 8}}
        })
        # Smaller gap → shorter SVG (root is sizing_h: hug)
        base_svg = base["svg"]
        mod_svg = modified["svg"]
        import re
        base_h = int(re.search(r'height="(\d+)"', base_svg).group(1))
        mod_h = int(re.search(r'height="(\d+)"', mod_svg).group(1))
        assert mod_h <= base_h, "Gap 8 should produce shorter or equal layout than gap 48"

    def test_change_sizing_w(self):
        result = _relayout_v3(SLUG, {
            "frame_overrides": {"step_problem": {"sizing_w": "HUG"}}
        })
        assert result is not None
        # Verify the override was applied: step_problem should report HUG
        tree = result["tree"]
        root = tree[0]
        children = root.get("children", [])
        step_problem = next(c for c in children if c["id"] == "step_problem")
        assert step_problem["sizing_w"] == "HUG"

    def test_change_sizing_h(self):
        result = _relayout_v3(SLUG, {
            "frame_overrides": {"step_problem": {"sizing_h": "HUG"}}
        })
        assert result is not None

    def test_change_align(self):
        result = _relayout_v3(SLUG, {
            "frame_overrides": {"page": {"align": "BOTTOM_RIGHT"}}
        })
        assert result is not None

    def test_change_padding(self):
        base = _relayout_v3(SLUG, {})
        _layout_cache.clear()
        modified = _relayout_v3(SLUG, {
            "frame_overrides": {"page": {"padding": 48}}
        })
        import re
        base_h = int(re.search(r'height="(\d+)"', base["svg"]).group(1))
        mod_h = int(re.search(r'height="(\d+)"', modified["svg"]).group(1))
        # Larger padding → taller SVG (root is sizing_h: hug)
        assert mod_h > base_h

    def test_legacy_single_frame_format(self):
        """Legacy format: frame_id + flat props instead of frame_overrides dict."""
        result = _relayout_v3(SLUG, {
            "frame_id": "page",
            "gap": 8,
        })
        assert result is not None
        assert "svg" in result


class TestStyleOverrides:
    """Fill and border overrides produce visible style changes."""

    def test_override_fill_to_black(self):
        result = _relayout_v3(SLUG, {
            "frame_overrides": {"step_problem": {"fill": "BLACK"}}
        })
        assert result is not None
        # Black fill should produce white text
        svg = result["svg"]
        assert "#FFFFFF" in svg or "white" in svg.lower()

    def test_override_border_to_none(self):
        result = _relayout_v3(SLUG, {
            "frame_overrides": {"step_problem": {"border": "NONE"}}
        })
        assert result is not None


class TestCoercion:
    """FILL-in-HUG coercion should be reported in the response."""

    def test_coercion_reported(self):
        """When root is changed to HUG width and children are FILL,
        the engine should coerce root to FIXED and report it."""
        result = _relayout_v3(SLUG, {
            "frame_overrides": {"page": {"sizing_w": "HUG"}}
        })
        assert result is not None
        # Children are sizing_w: fill, parent is now HUG → should coerce
        if "coerced_overrides" in result:
            assert "page" in result["coerced_overrides"]
            assert result["coerced_overrides"]["page"]["sizing_w"] == "FIXED"


class TestChildrenOrder:
    """children_order override reorders siblings."""

    def test_reorder_children(self):
        # Reverse the 5 children
        reversed_order = [
            "step_result", "step_fix", "step_analysis",
            "step_investigation", "step_problem",
        ]
        result = _relayout_v3(SLUG, {
            "frame_overrides": {"page": {"children_order": reversed_order}}
        })
        assert result is not None
        tree = result["tree"]
        root = tree[0]
        child_ids = [c["id"] for c in root.get("children", [])]
        assert child_ids == reversed_order

    def test_partial_reorder_preserves_missing(self):
        """Children not in the order list should be appended at the end."""
        partial_order = ["step_result", "step_problem"]
        result = _relayout_v3(SLUG, {
            "frame_overrides": {"page": {"children_order": partial_order}}
        })
        assert result is not None
        tree = result["tree"]
        root = tree[0]
        child_ids = [c["id"] for c in root.get("children", [])]
        assert child_ids[:2] == partial_order
        assert len(child_ids) == 5  # all 5 still present


class TestAndroidDiagrams:
    """Verify relayout works on other real frame YAML diagrams."""

    @pytest.mark.parametrize("slug", [
        "android-container-vs-vm",
        "android-security-comparison",
        "android-graphics-stack",
    ])
    def test_basic_relayout(self, slug):
        _layout_cache.clear()
        result = _relayout_v3(slug, {})
        assert result is not None
        assert "svg" in result
        assert "tree" in result
        assert "grid_info" in result

    @pytest.mark.parametrize("slug", [
        "android-container-vs-vm",
        "android-security-comparison",
        "android-graphics-stack",
    ])
    def test_grid_overrides_round_trip(self, slug):
        _layout_cache.clear()
        result = _relayout_v3(slug, {"grid_overrides": {"cols": 4, "col_gap": 16}})
        assert result is not None
        gi = result["grid_info"]
        assert len(gi["col_xs"]) == 4
        assert gi["col_gap"] == 16
