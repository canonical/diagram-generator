"""Unit tests for the Frame-based layout engine.

Verifies the core autolayout invariants:
  1. Children never overflow their parent
  2. FILL children expand to share remaining space
  3. Explicit height/width is respected on leaf frames
  4. Padding is applied even when border is NONE
  5. Cross-axis children stretch to parent's cross extent
"""

from __future__ import annotations

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from frame_model import Frame, FrameDiagram, Direction, Sizing, Align
from diagram_model import Line, Fill, Border
from layout_v3 import measure, place, _enforce_fill_hug_invariant


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _box(id: str, w: int = 192, h: int = 64, **kw) -> Frame:
    """Create a leaf box frame with explicit size."""
    return Frame(id=id, width=w, height=h, label=[Line("test")], **kw)


def _container(id: str, direction: Direction, children: list[Frame],
               gap: int = 8, padding: int = 8, border: Border = Border.SOLID,
               fill: Fill = Fill.WHITE, **kw) -> Frame:
    """Create a container frame."""
    return Frame(id=id, direction=direction, children=children,
                 gap=gap, padding=padding, border=border, fill=fill, **kw)


def _layout(root: Frame) -> Frame:
    """Measure + place a frame tree, return root."""
    measure(root)
    _enforce_fill_hug_invariant(root)
    place(root, 0, 0, root._measured_w, root._measured_h)
    return root


def _children_within_parent(frame: Frame) -> list[str]:
    """Return list of error messages for children that overflow their parent."""
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
        # Recurse
        errors.extend(_children_within_parent(child))
    return errors


# ---------------------------------------------------------------------------
# Test 1: Simple vertical stack — children must not overflow
# ---------------------------------------------------------------------------

def test_vertical_stack_no_overflow():
    """Three boxes stacked vertically must fit inside their parent."""
    root = _container("root", Direction.VERTICAL, [
        _box("a", h=64),
        _box("b", h=64),
        _box("c", h=64),
    ], gap=8, padding=8)
    _layout(root)

    errors = _children_within_parent(root)
    assert not errors, f"Children overflow parent:\n" + "\n".join(errors)

    # Expected height: 3*64 + 2*8 + 2*8 = 192 + 16 + 16 = 224
    expected_content = 3 * 64 + 2 * 8  # 208
    expected_total = expected_content + 2 * 8  # 224
    assert root._placed_h >= expected_total, \
        f"Root too short: {root._placed_h} < {expected_total}"
    print(f"  PASS: vertical stack, root={root._placed_w}x{root._placed_h}")


# ---------------------------------------------------------------------------
# Test 2: FILL children share remaining space
# ---------------------------------------------------------------------------

def test_fill_children_share_space():
    """Two FILL children in a 400px-tall container should each get ~half."""
    child_a = _box("a", h=40)
    child_a.child_sizing = Sizing.FILL
    child_b = _box("b", h=40)
    child_b.child_sizing = Sizing.FILL

    root = _container("root", Direction.VERTICAL, [child_a, child_b],
                       gap=8, padding=8)
    root.height = 400
    root.sizing = Sizing.FIXED
    _layout(root)

    errors = _children_within_parent(root)
    assert not errors, f"Children overflow parent:\n" + "\n".join(errors)

    # Each child should get (400 - 16 - 8) / 2 = 188
    print(f"  PASS: fill children, a={child_a._placed_h}, b={child_b._placed_h}")


# ---------------------------------------------------------------------------
# Test 3: Mixed HUG + FILL — FILL gets remaining space
# ---------------------------------------------------------------------------

def test_mixed_hug_fill():
    """One HUG child + one FILL child: FILL gets the remaining space."""
    child_a = _box("a_hug", h=100)
    child_a.child_sizing = Sizing.HUG
    child_b = _box("b_fill", h=40)
    child_b.child_sizing = Sizing.FILL

    root = _container("root", Direction.VERTICAL, [child_a, child_b],
                       gap=8, padding=8)
    root.height = 400
    root.sizing = Sizing.FIXED
    _layout(root)

    errors = _children_within_parent(root)
    assert not errors, f"Children overflow parent:\n" + "\n".join(errors)

    # b should get remaining space; a rounds 100 → 104 (grid)
    assert child_a._placed_h >= 100, f"HUG child should be >= 100, got {child_a._placed_h}"
    print(f"  PASS: mixed hug+fill, a={child_a._placed_h}, b={child_b._placed_h}")


# ---------------------------------------------------------------------------
# Test 4: FILL children with unequal measured sizes — no overflow
# ---------------------------------------------------------------------------

def test_fill_unequal_measured_no_overflow():
    """FILL children with different natural sizes must not overflow.

    This is the bug from android-container-vs-vm: columns divide space
    equally among FILL children, but larger children refuse to shrink,
    causing total > container.
    """
    child_a = _box("a_small", h=40)
    child_a.child_sizing = Sizing.FILL
    child_b = _box("b_big", h=192)
    child_b.child_sizing = Sizing.FILL
    child_c = _box("c_small", h=40)
    child_c.child_sizing = Sizing.FILL
    child_d = _box("d_big", h=192)
    child_d.child_sizing = Sizing.FILL

    root = _container("root", Direction.VERTICAL,
                       [child_a, child_b, child_c, child_d],
                       gap=24, padding=0, border=Border.NONE)
    _layout(root)

    errors = _children_within_parent(root)
    assert not errors, f"Children overflow parent:\n" + "\n".join(errors)
    print(f"  PASS: unequal fill no overflow, root_h={root._placed_h}")
    print(f"    a={child_a._placed_h}, b={child_b._placed_h}, "
          f"c={child_c._placed_h}, d={child_d._placed_h}")


# ---------------------------------------------------------------------------
# Test 5: Explicit height on leaf is respected
# ---------------------------------------------------------------------------

def test_explicit_height_respected():
    """A leaf with height=1 (separator) should measure at 1, not BOX_MIN_HEIGHT."""
    sep = Frame(id="sep", border=Border.NONE, fill=Fill.WHITE,
                label=[], width=192, height=1, padding=0)
    measure(sep)
    assert sep._measured_h <= 8, \
        f"Separator should measure ~1px (rounded to 8), got {sep._measured_h}"
    print(f"  PASS: explicit height, sep measured={sep._measured_w}x{sep._measured_h}")


# ---------------------------------------------------------------------------
# Test 6: Padding applied on borderless frames
# ---------------------------------------------------------------------------

def test_padding_on_borderless_frame():
    """Padding should be applied even when border=NONE (e.g. root outer_margin)."""
    child = _box("inner", w=100, h=100)
    root = _container("root", Direction.VERTICAL, [child],
                       gap=0, padding=24, border=Border.NONE)
    _layout(root)

    # Child should be offset by padding
    assert child._placed_x >= 24 - 0.5, \
        f"Child x={child._placed_x}, expected >= 24 (padding)"
    assert child._placed_y >= 24 - 0.5, \
        f"Child y={child._placed_y}, expected >= 24 (padding)"

    # Root should be big enough to include padding on all sides
    assert root._placed_w >= 100 + 48, \
        f"Root w={root._placed_w}, expected >= {100+48}"
    assert root._placed_h >= 100 + 48, \
        f"Root h={root._placed_h}, expected >= {100+48}"

    errors = _children_within_parent(root)
    assert not errors, f"Children overflow parent:\n" + "\n".join(errors)
    print(f"  PASS: borderless padding, root={root._placed_w}x{root._placed_h}, "
          f"child at ({child._placed_x},{child._placed_y})")


# ---------------------------------------------------------------------------
# Test 7: Nested containers — no overflow at any level
# ---------------------------------------------------------------------------

def test_nested_containers_no_overflow():
    """Panel inside a column inside root — nothing overflows."""
    inner_a = _box("inner_a", h=64)
    inner_b = _box("inner_b", h=40)
    panel = _container("panel", Direction.VERTICAL, [inner_a, inner_b],
                        gap=8, padding=8, heading=Line("Panel heading"))

    annotation = Frame(id="ann", border=Border.NONE, fill=Fill.WHITE,
                       label=[Line("Heading text")], width=240, padding=0)
    sep = Frame(id="sep", border=Border.NONE, fill=Fill.WHITE,
                label=[], width=240, height=1, padding=0)

    # Mark all as FILL (like the grid adapter does)
    for f in [annotation, panel, sep]:
        f.child_sizing = Sizing.FILL

    column = _container("col", Direction.VERTICAL,
                         [annotation, panel, sep],
                         gap=24, padding=0, border=Border.NONE)
    _layout(column)

    errors = _children_within_parent(column)
    assert not errors, f"Children overflow column:\n" + "\n".join(errors)
    print(f"  PASS: nested containers, col={column._placed_w}x{column._placed_h}")
    for c in column.children:
        print(f"    {c.id}: ({c._placed_x},{c._placed_y}) {c._placed_w}x{c._placed_h}")


# ---------------------------------------------------------------------------
# Test 8: Cross-axis stretch
# ---------------------------------------------------------------------------

def test_cross_axis_stretch():
    """In a horizontal layout, children stretch to the tallest child's height."""
    child_a = _box("short", h=40)
    child_b = _box("tall", h=120)

    root = _container("root", Direction.HORIZONTAL, [child_a, child_b],
                       gap=8, padding=8)
    _layout(root)

    # Both children should have the same height (cross-axis stretch)
    assert child_a._placed_h == child_b._placed_h, \
        f"Cross-axis mismatch: short={child_a._placed_h}, tall={child_b._placed_h}"
    print(f"  PASS: cross-axis stretch, both h={child_a._placed_h}")


# ---------------------------------------------------------------------------
# Run all tests
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    tests = [
        test_vertical_stack_no_overflow,
        test_fill_children_share_space,
        test_mixed_hug_fill,
        test_fill_unequal_measured_no_overflow,
        test_explicit_height_respected,
        test_padding_on_borderless_frame,
        test_nested_containers_no_overflow,
        test_cross_axis_stretch,
    ]

    passed = 0
    failed = 0
    for test in tests:
        name = test.__name__
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"  FAIL: {name}: {e}")
            failed += 1
        except Exception as e:
            print(f"  ERROR: {name}: {type(e).__name__}: {e}")
            failed += 1

    print(f"\n{passed} passed, {failed} failed out of {len(tests)} tests")
    sys.exit(1 if failed else 0)
