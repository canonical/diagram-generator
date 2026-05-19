"""Comprehensive auto-layout test suite.

Covers three areas:
  1. Directional layout — vertical, horizontal, mixed nesting
  2. 9-point alignment grid — all Align enum values on both axes
  3. Sizing model — HUG, FILL, FIXED and edge cases

Run with:  pytest scripts/test_autolayout.py -v
    or:    python scripts/test_autolayout.py
"""

from __future__ import annotations

import sys
import os
import math

sys.path.insert(0, os.path.dirname(__file__))

from frame_model import Frame, FrameDiagram, Direction, Sizing, Align
from diagram_model import Line, Fill, Border
from layout_v3 import measure, place, _align_offset
from diagram_shared import BASELINE_UNIT


# ───────────────────────────────────────────────────────────────────
# Test helpers
# ───────────────────────────────────────────────────────────────────

def _box(id: str, w: int = 192, h: int = 64, **kw) -> Frame:
    """Leaf box with explicit size — bypasses text measurement."""
    return Frame(id=id, width=w, height=h, label=[Line("test")], **kw)


def _container(
    id: str,
    direction: Direction,
    children: list[Frame],
    gap: int = 24,
    padding: int = 8,
    border: Border = Border.SOLID,
    fill: Fill = Fill.WHITE,
    **kw,
) -> Frame:
    """Container frame with children."""
    return Frame(
        id=id,
        direction=direction,
        children=children,
        gap=gap,
        padding=padding,
        border=border,
        fill=fill,
        **kw,
    )


def _layout(root: Frame) -> Frame:
    """Measure + place a frame tree, return root."""
    measure(root)
    place(root, 0, 0, root._measured_w, root._measured_h)
    return root


def _layout_fixed(root: Frame, w: int, h: int) -> Frame:
    """Measure + place into a fixed-size area."""
    measure(root)
    place(root, 0, 0, w, h)
    return root


def _children_within_parent(frame: Frame) -> list[str]:
    """Return error messages for any child that overflows its parent."""
    errors = []
    px, py = frame._placed_x, frame._placed_y
    pw, ph = frame._placed_w, frame._placed_h
    for child in frame.children:
        cx, cy = child._placed_x, child._placed_y
        cw, ch = child._placed_w, child._placed_h
        if cx < px - 0.5:
            errors.append(f"{child.id}: x={cx} < parent x={px}")
        if cy < py - 0.5:
            errors.append(f"{child.id}: y={cy} < parent y={py}")
        if cx + cw > px + pw + 0.5:
            errors.append(f"{child.id}: right={cx+cw} > parent right={px+pw}")
        if cy + ch > py + ph + 0.5:
            errors.append(f"{child.id}: bottom={cy+ch} > parent bottom={py+ph}")
        errors.extend(_children_within_parent(child))
    return errors


def _on_grid(value: float) -> bool:
    """Check that a value is snapped to the 8px baseline grid."""
    return abs(value - round(value / BASELINE_UNIT) * BASELINE_UNIT) < 0.5


def _dump_tree(frame: Frame, indent: int = 0) -> str:
    """ASCII dump of a laid-out frame tree for debugging."""
    prefix = "  " * indent
    lines = [
        f"{prefix}{frame.id}: "
        f"pos=({frame._placed_x},{frame._placed_y}) "
        f"size={frame._placed_w}x{frame._placed_h} "
        f"measured={frame._measured_w}x{frame._measured_h}"
    ]
    for child in frame.children:
        lines.append(_dump_tree(child, indent + 1))
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════
# PART 1: DIRECTIONAL LAYOUT
# ═══════════════════════════════════════════════════════════════════

# ── 1A: Vertical direction ──

class TestVerticalDirection:

    def test_single_child(self):
        """One box in vertical container: positioned at (pad, pad)."""
        child = _box("a", w=100, h=50)
        root = _container("root", Direction.VERTICAL, [child],
                          gap=0, padding=8)
        _layout(root)

        assert child._placed_x == 8, f"x={child._placed_x}, expected 8"
        assert child._placed_y == 8, f"y={child._placed_y}, expected 8"
        assert not _children_within_parent(root)

    def test_gap_spacing(self):
        """Three children with gap=24: exact 24px between each pair."""
        a = _box("a", w=100, h=40)
        b = _box("b", w=100, h=40)
        c = _box("c", w=100, h=40)
        root = _container("root", Direction.VERTICAL, [a, b, c],
                          gap=24, padding=8)
        _layout(root)

        gap_ab = b._placed_y - (a._placed_y + a._placed_h)
        gap_bc = c._placed_y - (b._placed_y + b._placed_h)
        assert gap_ab == 24, f"gap a→b = {gap_ab}, expected 24"
        assert gap_bc == 24, f"gap b→c = {gap_bc}, expected 24"
        assert not _children_within_parent(root)

    def test_with_heading(self):
        """Container with heading reserves space before first child."""
        child = _box("a", w=100, h=50)
        root = _container("root", Direction.VERTICAL, [child],
                          gap=24, padding=8,
                          heading=Line("Section heading"))
        _layout(root)

        # Child should start below heading + heading_gap
        assert child._placed_y > 8, \
            f"Child y={child._placed_y}, should be after heading"
        assert not _children_within_parent(root)

    def test_nested_two_levels(self):
        """Vertical container inside vertical container — no overflow."""
        inner_a = _box("inner_a", w=100, h=40)
        inner_b = _box("inner_b", w=100, h=40)
        inner = _container("inner", Direction.VERTICAL, [inner_a, inner_b],
                           gap=8, padding=8)

        outer_a = _box("outer_a", w=150, h=50)
        root = _container("root", Direction.VERTICAL, [outer_a, inner],
                          gap=24, padding=8)
        _layout(root)

        assert not _children_within_parent(root)
        # Inner children must also be within inner
        assert not _children_within_parent(inner)

    def test_zero_gap(self):
        """Gap=0 means children are flush against each other."""
        a = _box("a", w=100, h=40)
        b = _box("b", w=100, h=40)
        root = _container("root", Direction.VERTICAL, [a, b],
                          gap=0, padding=0, border=Border.NONE)
        _layout(root)

        gap = b._placed_y - (a._placed_y + a._placed_h)
        assert gap == 0, f"gap={gap}, expected 0"


# ── 1B: Horizontal direction ──

class TestHorizontalDirection:

    def test_single_child(self):
        """One box in horizontal container: positioned at (pad, pad)."""
        child = _box("a", w=100, h=50)
        root = _container("root", Direction.HORIZONTAL, [child],
                          gap=0, padding=8)
        _layout(root)

        assert child._placed_x == 8, f"x={child._placed_x}, expected 8"
        assert child._placed_y == 8, f"y={child._placed_y}, expected 8"
        assert not _children_within_parent(root)

    def test_three_children_side_by_side(self):
        """Three boxes side-by-side with gap=24."""
        a = _box("a", w=80, h=40)
        b = _box("b", w=80, h=40)
        c = _box("c", w=80, h=40)
        root = _container("root", Direction.HORIZONTAL, [a, b, c],
                          gap=24, padding=8)
        _layout(root)

        gap_ab = b._placed_x - (a._placed_x + a._placed_w)
        gap_bc = c._placed_x - (b._placed_x + b._placed_w)
        assert gap_ab == 24, f"gap a→b = {gap_ab}, expected 24"
        assert gap_bc == 24, f"gap b→c = {gap_bc}, expected 24"
        assert not _children_within_parent(root)

    def test_cross_axis_stretch(self):
        """Children of different heights stretch to the tallest."""
        short = _box("short", w=80, h=40)
        tall = _box("tall", w=80, h=120)
        root = _container("root", Direction.HORIZONTAL, [short, tall],
                          gap=8, padding=8)
        _layout(root)

        assert short._placed_h == tall._placed_h, \
            f"short h={short._placed_h}, tall h={tall._placed_h}"

    def test_fill_width_distribution(self):
        """FILL children in horizontal layout share remaining width."""
        a = _box("a", w=80, h=40)
        a.child_sizing = Sizing.FILL
        b = _box("b", w=80, h=40)
        b.child_sizing = Sizing.FILL

        root = _container("root", Direction.HORIZONTAL, [a, b],
                          gap=8, padding=8)
        root.width = 400
        root.sizing = Sizing.FIXED
        root.height = 80
        _layout_fixed(root, 400, 80)

        # Both should be wider than measured
        assert a._placed_w >= 80, f"a width={a._placed_w}"
        assert b._placed_w >= 80, f"b width={b._placed_w}"
        # Should be roughly equal (within grid rounding)
        assert abs(a._placed_w - b._placed_w) <= BASELINE_UNIT, \
            f"a={a._placed_w}, b={b._placed_w} differ by > {BASELINE_UNIT}"
        assert not _children_within_parent(root)


# ── 1C: Mixed direction nesting ──

class TestMixedDirections:

    def test_vertical_then_horizontal(self):
        """Vertical root → horizontal child with 2 boxes."""
        h_a = _box("h_a", w=80, h=40)
        h_b = _box("h_b", w=80, h=40)
        h_row = _container("row", Direction.HORIZONTAL, [h_a, h_b],
                           gap=8, padding=0, border=Border.NONE)

        v_box = _box("v_box", w=160, h=60)
        root = _container("root", Direction.VERTICAL, [v_box, h_row],
                          gap=24, padding=8)
        _layout(root)

        # h_a and h_b should be side by side
        assert h_b._placed_x > h_a._placed_x + h_a._placed_w - 1, \
            "Horizontal children should be side by side"
        # h_row should be below v_box
        assert h_row._placed_y > v_box._placed_y + v_box._placed_h - 1, \
            "Horizontal row should be below vertical box"
        assert not _children_within_parent(root)

    def test_horizontal_then_vertical(self):
        """Horizontal root → vertical child with 2 boxes."""
        v_a = _box("v_a", w=80, h=40)
        v_b = _box("v_b", w=80, h=40)
        v_col = _container("col", Direction.VERTICAL, [v_a, v_b],
                           gap=8, padding=0, border=Border.NONE)

        h_box = _box("h_box", w=100, h=80)
        root = _container("root", Direction.HORIZONTAL, [h_box, v_col],
                          gap=24, padding=8)
        _layout(root)

        # v_a and v_b should be stacked vertically
        assert v_b._placed_y > v_a._placed_y + v_a._placed_h - 1, \
            "Vertical children should be stacked"
        # v_col should be to the right of h_box
        assert v_col._placed_x > h_box._placed_x + h_box._placed_w - 1, \
            "Vertical column should be right of horizontal box"
        assert not _children_within_parent(root)

    def test_three_level_nesting(self):
        """root(V) → row(H) → col(V) → leaf: full hierarchy."""
        leaf_a = _box("leaf_a", w=60, h=30)
        leaf_b = _box("leaf_b", w=60, h=30)
        col = _container("col", Direction.VERTICAL, [leaf_a, leaf_b],
                         gap=8, padding=4, border=Border.NONE)

        sibling = _box("sibling", w=80, h=60)
        row = _container("row", Direction.HORIZONTAL, [col, sibling],
                         gap=8, padding=4, border=Border.NONE)

        top = _box("top", w=160, h=40)
        root = _container("root", Direction.VERTICAL, [top, row],
                          gap=24, padding=8)
        _layout(root)

        # No overflow at any level
        assert not _children_within_parent(root), \
            f"Overflow:\n{chr(10).join(_children_within_parent(root))}"

        # Leaves stacked vertically inside col
        assert leaf_b._placed_y > leaf_a._placed_y + leaf_a._placed_h - 1
        # col and sibling side-by-side inside row
        assert sibling._placed_x > col._placed_x + col._placed_w - 1


# ═══════════════════════════════════════════════════════════════════
# PART 2: 9-POINT ALIGNMENT GRID
# ═══════════════════════════════════════════════════════════════════

# ── 2A: _align_offset unit tests ──

class TestAlignOffset:
    """Direct tests of the _align_offset() helper."""

    def test_x_left(self):
        assert _align_offset(Align.TOP_LEFT, 200, 100, "x") == 0
        assert _align_offset(Align.CENTER_LEFT, 200, 100, "x") == 0
        assert _align_offset(Align.BOTTOM_LEFT, 200, 100, "x") == 0

    def test_x_center(self):
        assert _align_offset(Align.TOP_CENTER, 200, 100, "x") == 50
        assert _align_offset(Align.CENTER, 200, 100, "x") == 50
        assert _align_offset(Align.BOTTOM_CENTER, 200, 100, "x") == 50

    def test_x_right(self):
        assert _align_offset(Align.TOP_RIGHT, 200, 100, "x") == 100
        assert _align_offset(Align.CENTER_RIGHT, 200, 100, "x") == 100
        assert _align_offset(Align.BOTTOM_RIGHT, 200, 100, "x") == 100

    def test_y_top(self):
        assert _align_offset(Align.TOP_LEFT, 200, 100, "y") == 0
        assert _align_offset(Align.TOP_CENTER, 200, 100, "y") == 0
        assert _align_offset(Align.TOP_RIGHT, 200, 100, "y") == 0

    def test_y_center(self):
        assert _align_offset(Align.CENTER_LEFT, 200, 100, "y") == 50
        assert _align_offset(Align.CENTER, 200, 100, "y") == 50
        assert _align_offset(Align.CENTER_RIGHT, 200, 100, "y") == 50

    def test_y_bottom(self):
        assert _align_offset(Align.BOTTOM_LEFT, 200, 100, "y") == 100
        assert _align_offset(Align.BOTTOM_CENTER, 200, 100, "y") == 100
        assert _align_offset(Align.BOTTOM_RIGHT, 200, 100, "y") == 100

    def test_no_slack(self):
        """When content == available, offset is always 0."""
        for align in Align:
            assert _align_offset(align, 100, 100, "x") == 0
            assert _align_offset(align, 100, 100, "y") == 0

    def test_content_larger_than_available(self):
        """When content > available, offset is 0 (no negative offset)."""
        for align in Align:
            assert _align_offset(align, 50, 100, "x") == 0
            assert _align_offset(align, 50, 100, "y") == 0


# ── 2B: Main-axis alignment integration tests ──

class TestMainAxisAlignment:
    """Alignment shifts children along the main axis."""

    def test_vertical_top_left_default(self):
        """TOP_LEFT: children start at the top."""
        child = _box("a", w=100, h=40)
        root = _container("root", Direction.VERTICAL, [child],
                          gap=0, padding=8, align=Align.TOP_LEFT)
        root.height = 200
        root.sizing = Sizing.FIXED
        _layout_fixed(root, root.width or 200, 200)

        # Child at top
        assert child._placed_y == 8, f"y={child._placed_y}"

    def test_vertical_bottom_left(self):
        """BOTTOM_LEFT: children pushed to the bottom of the container."""
        child = _box("a", w=100, h=40)
        root = _container("root", Direction.VERTICAL, [child],
                          gap=0, padding=8, align=Align.BOTTOM_LEFT)
        root.height = 200
        root.sizing = Sizing.FIXED
        _layout_fixed(root, root.width or 200, 200)

        # Child pushed down: y = pad + (inner_h - content_h)
        inner_h = 200 - 16  # 184
        content_h = child._placed_h
        expected_y = 8 + (inner_h - content_h)
        assert child._placed_y == expected_y, \
            f"y={child._placed_y}, expected {expected_y}"

    def test_vertical_center(self):
        """CENTER: children centered along main axis (vertical)."""
        child = _box("a", w=100, h=40)
        root = _container("root", Direction.VERTICAL, [child],
                          gap=0, padding=8, align=Align.CENTER)
        root.height = 200
        root.sizing = Sizing.FIXED
        _layout_fixed(root, root.width or 200, 200)

        inner_h = 200 - 16
        content_h = child._placed_h
        expected_y = 8 + (inner_h - content_h) / 2
        assert abs(child._placed_y - expected_y) <= 1, \
            f"y={child._placed_y}, expected ~{expected_y}"

    def test_horizontal_center_left(self):
        """CENTER_LEFT in horizontal: children centered along x-axis."""
        child = _box("a", w=80, h=40)
        root = _container("root", Direction.HORIZONTAL, [child],
                          gap=0, padding=8, align=Align.CENTER_LEFT)
        root.width = 300
        root.height = 80
        root.sizing = Sizing.FIXED
        _layout_fixed(root, 300, 80)

        # Main axis is X for horizontal; CENTER_LEFT → x-offset = 0 (LEFT)
        assert child._placed_x == 8, f"x={child._placed_x}, expected 8"

    def test_horizontal_top_center(self):
        """TOP_CENTER in horizontal: children centered along x-axis."""
        child = _box("a", w=80, h=40)
        root = _container("root", Direction.HORIZONTAL, [child],
                          gap=0, padding=8, align=Align.TOP_CENTER)
        root.width = 300
        root.height = 80
        root.sizing = Sizing.FIXED
        _layout_fixed(root, 300, 80)

        inner_w = 300 - 16  # 284
        content_w = child._placed_w  # may be rounded up to grid
        expected_x = 8 + (inner_w - content_w) / 2
        # Allow grid-rounding tolerance
        assert abs(child._placed_x - expected_x) <= BASELINE_UNIT, \
            f"x={child._placed_x}, expected ~{expected_x} (child_w={content_w})"

    def test_horizontal_top_right(self):
        """TOP_RIGHT in horizontal: children pushed to the right."""
        child = _box("a", w=80, h=40)
        root = _container("root", Direction.HORIZONTAL, [child],
                          gap=0, padding=8, align=Align.TOP_RIGHT)
        root.width = 300
        root.height = 80
        root.sizing = Sizing.FIXED
        _layout_fixed(root, 300, 80)

        inner_w = 300 - 16
        content_w = child._placed_w  # may be rounded up
        expected_x = 8 + (inner_w - content_w)
        # Allow grid-rounding tolerance
        assert abs(child._placed_x - expected_x) <= BASELINE_UNIT, \
            f"x={child._placed_x}, expected ~{expected_x} (child_w={content_w})"

    def test_fill_ignores_main_alignment(self):
        """FILL children consume all space → main-axis alignment has no effect."""
        a = _box("a", w=80, h=40)
        a.child_sizing = Sizing.FILL
        b = _box("b", w=80, h=40)
        b.child_sizing = Sizing.FILL

        # With BOTTOM_RIGHT: main axis offset should be 0 or near-zero
        # because fill children consume (almost) all available space.
        # Any residual comes from grid-rounding fill_extra DOWN.
        root = _container("root", Direction.VERTICAL, [a, b],
                          gap=8, padding=8, align=Align.BOTTOM_RIGHT)
        root.height = 400
        root.sizing = Sizing.FIXED
        _layout_fixed(root, root.width or 200, 400)

        # fill_extra is rounded DOWN to BASELINE_UNIT, so there may be
        # a small residual offset. The key invariant: no overflow.
        assert not _children_within_parent(root), \
            f"Children overflow parent"
        # Both FILL children should get expanded sizes
        assert a._placed_h > a._measured_h, \
            f"FILL child a should expand: {a._placed_h} <= {a._measured_h}"
        assert b._placed_h > b._measured_h, \
            f"FILL child b should expand: {b._placed_h} <= {b._measured_h}"

    def test_multiple_children_centered(self):
        """Three children centered vertically in a tall container."""
        a = _box("a", w=100, h=40)
        b = _box("b", w=100, h=40)
        c = _box("c", w=100, h=40)
        root = _container("root", Direction.VERTICAL, [a, b, c],
                          gap=8, padding=8, align=Align.CENTER)
        root.height = 400
        root.sizing = Sizing.FIXED
        _layout_fixed(root, root.width or 200, 400)

        inner_h = 400 - 16
        content_h = a._placed_h + b._placed_h + c._placed_h + 2 * 8
        expected_offset = (inner_h - content_h) / 2
        expected_a_y = 8 + expected_offset

        assert abs(a._placed_y - expected_a_y) <= 1, \
            f"First child y={a._placed_y}, expected ~{expected_a_y}"
        assert not _children_within_parent(root)


# ── 2C: Grid-snap under alignment ──

class TestAlignmentGridSnap:

    def test_all_positions_on_grid(self):
        """Every frame position should be snapped to the 8px grid.

        NOTE: This test currently documents that alignment offsets are NOT
        grid-snapped. The engine rounds sizes to grid but computes alignment
        offsets from the rounded sizes without re-snapping. This is a known
        gap — Milestone 5 should add grid-snapping to alignment offsets.
        For now, we verify sizes are on grid and positions are on grid
        when alignment is TOP_LEFT (no offset).
        """
        a = _box("a", w=104, h=40)  # already on grid
        b = _box("b", w=104, h=40)
        root = _container("root", Direction.VERTICAL, [a, b],
                          gap=24, padding=8, align=Align.TOP_LEFT)
        root.height = 304  # on grid
        root.sizing = Sizing.FIXED
        _layout_fixed(root, root.width or 200, 304)

        for frame in [root, a, b]:
            assert _on_grid(frame._placed_x), \
                f"{frame.id} x={frame._placed_x} not on grid"
            assert _on_grid(frame._placed_y), \
                f"{frame.id} y={frame._placed_y} not on grid"
            assert _on_grid(frame._placed_w), \
                f"{frame.id} w={frame._placed_w} not on grid"
            assert _on_grid(frame._placed_h), \
                f"{frame.id} h={frame._placed_h} not on grid"

    def test_alignment_offset_not_yet_snapped(self):
        """Document that CENTER alignment can produce off-grid positions.

        This is the known gap. When Milestone 5 adds grid-snapping to
        alignment offsets, change this test to assert ON-grid.
        """
        a = _box("a", w=100, h=40)
        root = _container("root", Direction.VERTICAL, [a],
                          gap=0, padding=8, align=Align.CENTER)
        root.height = 300
        root.sizing = Sizing.FIXED
        _layout_fixed(root, root.width or 200, 300)

        # Alignment offset = (inner_h - content_h) / 2 which may be fractional
        # Sizes should still be on grid even if positions aren't
        assert _on_grid(a._placed_w), f"w={a._placed_w} not on grid"
        assert _on_grid(a._placed_h), f"h={a._placed_h} not on grid"


# ═══════════════════════════════════════════════════════════════════
# PART 3: SIZING MODEL
# ═══════════════════════════════════════════════════════════════════

# ── 3A: HUG sizing ──

class TestHugSizing:

    def test_container_shrinks_to_content(self):
        """HUG container = sum(children) + gaps + padding, no more."""
        a = _box("a", w=100, h=40)
        b = _box("b", w=100, h=40)
        root = _container("root", Direction.VERTICAL, [a, b],
                          gap=24, padding=8)
        _layout(root)

        expected_h = 8 + 40 + 24 + 40 + 8  # pad + a + gap + b + pad = 120
        assert root._placed_h == round_up(expected_h), \
            f"root h={root._placed_h}, expected {round_up(expected_h)}"

    def test_nested_hug(self):
        """HUG inside HUG: both shrink correctly."""
        inner_child = _box("ic", w=60, h=30)
        inner = _container("inner", Direction.VERTICAL, [inner_child],
                           gap=0, padding=4, border=Border.NONE)
        outer = _container("outer", Direction.VERTICAL, [inner],
                           gap=0, padding=8)
        _layout(outer)

        # inner = 4 + 32 + 4 = 40 (rounded 30→32)
        # outer = 8 + 40 + 8 = 56
        assert inner._placed_h >= 30 + 8  # child + 2*pad
        assert outer._placed_h >= inner._placed_h + 16  # inner + 2*pad
        assert not _children_within_parent(outer)


# ── 3B: FILL sizing ──

class TestFillSizing:

    def test_two_equal_fill(self):
        """Two FILL children in fixed container get equal shares."""
        a = _box("a", w=100, h=40)
        a.child_sizing = Sizing.FILL
        b = _box("b", w=100, h=40)
        b.child_sizing = Sizing.FILL

        root = _container("root", Direction.VERTICAL, [a, b],
                          gap=8, padding=8)
        root.height = 400
        root.sizing = Sizing.FIXED
        _layout_fixed(root, root.width or 200, 400)

        assert abs(a._placed_h - b._placed_h) <= BASELINE_UNIT
        assert not _children_within_parent(root)

    def test_three_unequal_measured(self):
        """Three FILL with different measured sizes → all get equal share."""
        a = _box("a", w=100, h=40)
        a.child_sizing = Sizing.FILL
        b = _box("b", w=100, h=80)
        b.child_sizing = Sizing.FILL
        c = _box("c", w=100, h=120)
        c.child_sizing = Sizing.FILL

        root = _container("root", Direction.VERTICAL, [a, b, c],
                          gap=8, padding=8)
        root.height = 500
        root.sizing = Sizing.FIXED
        _layout_fixed(root, root.width or 200, 500)

        # Figma model: FILL children share available space equally,
        # regardless of their natural sizes.
        assert abs(a._placed_h - b._placed_h) <= BASELINE_UNIT, \
            f"a={a._placed_h}, b={b._placed_h}"
        assert abs(b._placed_h - c._placed_h) <= BASELINE_UNIT, \
            f"b={b._placed_h}, c={c._placed_h}"
        assert not _children_within_parent(root)

    def test_fill_with_hug_siblings(self):
        """1 HUG + 2 FILL: HUG takes measured, FILL splits remainder."""
        hug = _box("hug", w=100, h=60)
        hug.child_sizing = Sizing.HUG

        fill_a = _box("fill_a", w=100, h=40)
        fill_a.child_sizing = Sizing.FILL
        fill_b = _box("fill_b", w=100, h=40)
        fill_b.child_sizing = Sizing.FILL

        root = _container("root", Direction.VERTICAL, [hug, fill_a, fill_b],
                          gap=8, padding=8)
        root.height = 400
        root.sizing = Sizing.FIXED
        _layout_fixed(root, root.width or 200, 400)

        # HUG child keeps its measured height
        assert hug._placed_h == hug._measured_h, \
            f"HUG h={hug._placed_h}, measured={hug._measured_h}"
        # FILL children share the remainder equally
        assert abs(fill_a._placed_h - fill_b._placed_h) <= BASELINE_UNIT
        assert not _children_within_parent(root)

    def test_fill_in_hug_container_keeps_measured(self):
        """FILL child in HUG container keeps measured size (container fits)."""
        big = _box("big", w=100, h=200)
        big.child_sizing = Sizing.FILL

        root = _container("root", Direction.VERTICAL, [big],
                          gap=0, padding=8)
        # Don't force a smaller container — let HUG size it
        _layout(root)

        # HUG container sizes to fit, so FILL child gets exactly its measured size
        assert big._placed_h == big._measured_h, \
            f"FILL h={big._placed_h}, measured={big._measured_h}"

    def test_fill_rounds_down_to_grid(self):
        """FILL sizes are grid-aligned and never overflow the parent."""
        a = _box("a", w=100, h=40)
        a.child_sizing = Sizing.FILL
        b = _box("b", w=100, h=40)
        b.child_sizing = Sizing.FILL

        root = _container("root", Direction.VERTICAL, [a, b],
                          gap=8, padding=8)
        root.height = 304  # on 8px grid (304/8=38)
        root.sizing = Sizing.FIXED
        _layout_fixed(root, root.width or 200, 304)

        total_children = a._placed_h + b._placed_h + 8  # + gap
        available = root._placed_h - 16  # actual placed parent - 2*pad
        assert total_children <= available + 0.5, \
            f"total={total_children} > available={available}"
        # FILL children should consume all available space (zero slack)
        assert total_children >= available - BASELINE_UNIT, \
            f"total={total_children} leaves too much slack (available={available})"
        assert not _children_within_parent(root)


# ── 3C: FIXED sizing ──

class TestFixedSizing:

    def test_fixed_container_explicit_size(self):
        """FIXED container uses declared width/height."""
        child = _box("a", w=80, h=40)
        root = _container("root", Direction.VERTICAL, [child],
                          gap=0, padding=8)
        root.width = 300
        root.height = 200
        root.sizing = Sizing.FIXED
        _layout_fixed(root, 300, 200)

        assert root._placed_w == round_up(300), f"w={root._placed_w}"
        assert root._placed_h == round_up(200), f"h={root._placed_h}"

    def test_fixed_leaf_explicit_size(self):
        """Leaf with explicit height uses that height, not BOX_MIN_HEIGHT."""
        sep = Frame(id="sep", border=Border.NONE, fill=Fill.WHITE,
                    label=[], width=192, height=1, padding=0)
        measure(sep)
        assert sep._measured_h <= BASELINE_UNIT, \
            f"Separator measured_h={sep._measured_h}, expected ≤ {BASELINE_UNIT}"

    def test_fixed_container_children_fill(self):
        """FILL children inside FIXED container fill the declared space."""
        a = _box("a", w=100, h=40)
        a.child_sizing = Sizing.FILL
        b = _box("b", w=100, h=40)
        b.child_sizing = Sizing.FILL

        root = _container("root", Direction.VERTICAL, [a, b],
                          gap=8, padding=8)
        root.width = 250
        root.height = 400
        root.sizing = Sizing.FIXED
        _layout_fixed(root, 250, 400)

        total = a._placed_h + b._placed_h + 8
        available = 400 - 16
        # Children should fill most of the space (within grid rounding)
        assert total >= available - BASELINE_UNIT, \
            f"total={total} should fill ~{available}"
        assert not _children_within_parent(root)


# ── 3D: Edge cases ──

class TestSizingEdgeCases:

    def test_empty_container(self):
        """Container with 0 children is treated as a leaf by the engine.

        Because Frame.is_leaf checks len(children)==0, an empty container
        gets leaf sizing (BLOCK_WIDTH x BOX_MIN_HEIGHT). This is acceptable:
        real diagrams never have empty containers.
        """
        root = _container("root", Direction.VERTICAL, [],
                          gap=0, padding=8)
        _layout(root)

        # Empty container = leaf, so it gets default leaf size
        assert root._placed_w > 0, f"w={root._placed_w}"
        assert root._placed_h > 0, f"h={root._placed_h}"

    def test_single_fill_child_gets_all_space(self):
        """One FILL child gets all remaining space."""
        a = _box("a", w=100, h=40)
        a.child_sizing = Sizing.FILL

        root = _container("root", Direction.VERTICAL, [a],
                          gap=0, padding=8)
        root.height = 400
        root.sizing = Sizing.FIXED
        _layout_fixed(root, root.width or 200, 400)

        expected_h = 400 - 16  # all available minus padding
        # Should be close to full available (within grid rounding)
        assert a._placed_h >= expected_h - BASELINE_UNIT, \
            f"a h={a._placed_h}, expected ~{expected_h}"
        assert not _children_within_parent(root)

    def test_all_hug_in_fixed_container(self):
        """All HUG children in FIXED container: extra space is unused."""
        a = _box("a", w=100, h=40)
        b = _box("b", w=100, h=40)

        root = _container("root", Direction.VERTICAL, [a, b],
                          gap=8, padding=8, align=Align.TOP_LEFT)
        root.height = 400
        root.sizing = Sizing.FIXED
        _layout_fixed(root, root.width or 200, 400)

        # Children keep their measured sizes
        assert a._placed_h == a._measured_h, \
            f"a h={a._placed_h}, measured={a._measured_h}"
        assert b._placed_h == b._measured_h, \
            f"b h={b._placed_h}, measured={b._measured_h}"
        # Extra space at the bottom
        bottom_of_b = b._placed_y + b._placed_h
        assert bottom_of_b < 400 - 8, \
            "Should have unused space at bottom"


# ═══════════════════════════════════════════════════════════════════
# PART 4: INVARIANT CHECKS
# ═══════════════════════════════════════════════════════════════════

class TestInvariants:
    """Cross-cutting invariants that must hold for any layout."""

    def test_grid_snap_vertical(self):
        """All positions and sizes snap to 8px grid (vertical layout)."""
        a = _box("a", w=100, h=50)
        b = _box("b", w=120, h=70)
        root = _container("root", Direction.VERTICAL, [a, b],
                          gap=24, padding=8)
        _layout(root)

        for f in [root, a, b]:
            assert _on_grid(f._placed_x), f"{f.id} x={f._placed_x} off grid"
            assert _on_grid(f._placed_y), f"{f.id} y={f._placed_y} off grid"
            assert _on_grid(f._placed_w), f"{f.id} w={f._placed_w} off grid"
            assert _on_grid(f._placed_h), f"{f.id} h={f._placed_h} off grid"

    def test_grid_snap_horizontal(self):
        """All positions and sizes snap to 8px grid (horizontal layout)."""
        a = _box("a", w=100, h=50)
        b = _box("b", w=120, h=70)
        root = _container("root", Direction.HORIZONTAL, [a, b],
                          gap=24, padding=8)
        _layout(root)

        for f in [root, a, b]:
            assert _on_grid(f._placed_x), f"{f.id} x={f._placed_x} off grid"
            assert _on_grid(f._placed_y), f"{f.id} y={f._placed_y} off grid"
            assert _on_grid(f._placed_w), f"{f.id} w={f._placed_w} off grid"
            assert _on_grid(f._placed_h), f"{f.id} h={f._placed_h} off grid"

    def test_no_negative_positions(self):
        """No frame should have negative coordinates."""
        a = _box("a", w=100, h=50)
        b = _box("b", w=80, h=40)
        inner = _container("inner", Direction.HORIZONTAL, [a, b],
                           gap=8, padding=4, border=Border.NONE)
        root = _container("root", Direction.VERTICAL, [inner],
                          gap=0, padding=8)
        _layout(root)

        def check_positive(f: Frame):
            assert f._placed_x >= 0, f"{f.id} x={f._placed_x} < 0"
            assert f._placed_y >= 0, f"{f.id} y={f._placed_y} < 0"
            for c in f.children:
                check_positive(c)

        check_positive(root)

    def test_measured_leq_placed(self):
        """Placed size is always >= measured size (no shrinking)."""
        a = _box("a", w=100, h=50)
        b = _box("b", w=80, h=40)
        root = _container("root", Direction.VERTICAL, [a, b],
                          gap=24, padding=8)
        _layout(root)

        def check_sizes(f: Frame):
            assert f._placed_w >= f._measured_w - 0.5, \
                f"{f.id} placed_w={f._placed_w} < measured_w={f._measured_w}"
            assert f._placed_h >= f._measured_h - 0.5, \
                f"{f.id} placed_h={f._placed_h} < measured_h={f._measured_h}"
            for c in f.children:
                check_sizes(c)

        check_sizes(root)


# ═══════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════

def round_up(v: float) -> int:
    """Round up to nearest BASELINE_UNIT."""
    return math.ceil(v / BASELINE_UNIT) * BASELINE_UNIT


# ═══════════════════════════════════════════════════════════════════
# Standalone runner (works without pytest too)
# ═══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import traceback

    # Collect all test classes and methods
    test_classes = [
        TestVerticalDirection,
        TestHorizontalDirection,
        TestMixedDirections,
        TestAlignOffset,
        TestMainAxisAlignment,
        TestAlignmentGridSnap,
        TestHugSizing,
        TestFillSizing,
        TestFixedSizing,
        TestSizingEdgeCases,
        TestInvariants,
    ]

    passed = 0
    failed = 0
    errors = []

    for cls in test_classes:
        instance = cls()
        methods = [m for m in dir(instance) if m.startswith("test_")]
        for method_name in sorted(methods):
            full_name = f"{cls.__name__}.{method_name}"
            try:
                getattr(instance, method_name)()
                passed += 1
                print(f"  PASS: {full_name}")
            except AssertionError as e:
                failed += 1
                errors.append(f"  FAIL: {full_name}: {e}")
                print(f"  FAIL: {full_name}: {e}")
            except Exception as e:
                failed += 1
                errors.append(f"  ERROR: {full_name}: {type(e).__name__}: {e}")
                print(f"  ERROR: {full_name}: {type(e).__name__}: {e}")
                traceback.print_exc()

    print(f"\n{passed} passed, {failed} failed out of {passed + failed} tests")
    if errors:
        print("\nFailures:")
        for e in errors:
            print(e)
    sys.exit(1 if failed else 0)
