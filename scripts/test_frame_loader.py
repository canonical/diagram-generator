"""Unit tests for native frame YAML parsing.

These tests freeze the omission semantics in ``frame_loader.py`` so future
YAML changes do not silently alter the v3 frame contract.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from frame_loader import load_frame_yaml
from frame_model import Direction, Justify, Sizing
from diagram_model import Border, Fill
from diagram_model import Border


def _load(tmp_path, content: str):
    path = tmp_path / "diagram.yaml"
    path.write_text(content, encoding="utf-8")
    return load_frame_yaml(path)


def test_omitted_sizing_defaults_leaf_nodes_to_fill_width_hug_height(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
root:
  id: root
  children:
    - id: child
      label:
        - Hello
""",
    )

    # Root defaults to HUG/HUG — no parent to FILL into
    assert diagram.root.sizing_w == Sizing.HUG
    assert diagram.root.sizing_h == Sizing.HUG
    # Non-root children default to FILL width, HUG height
    child = diagram.root.children[0]
    assert child.sizing_w == Sizing.FILL
    assert child.sizing_h == Sizing.HUG


def test_explicit_width_without_sizing_infers_fixed_width_only(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
root:
  id: root
  children:
    - id: child
      width: 240
      label:
        - Hello
""",
    )

    child = diagram.root.children[0]
    assert child.sizing_w == Sizing.FIXED
    assert child.sizing_h == Sizing.HUG


def test_explicit_height_without_sizing_infers_fixed_height_only(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
root:
  id: root
  children:
    - id: child
      height: 96
      label:
        - Hello
""",
    )

    child = diagram.root.children[0]
    assert child.sizing_w == Sizing.FILL
    assert child.sizing_h == Sizing.FIXED


def test_container_children_still_default_to_fill_on_both_axes(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
root:
  id: root
  children:
    - id: child
      children:
        - id: leaf
          label:
            - Hello
""",
    )

    child = diagram.root.children[0]
    assert child.sizing_w == Sizing.FILL
    assert child.sizing_h == Sizing.HUG


def test_borderless_leaf_text_defaults_to_fill_width_hug_height(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
root:
  id: root
  children:
    - id: note
      border: none
      label:
        - Hello
""",
    )

    note = diagram.root.children[0]
    assert note.sizing_w == Sizing.FILL
    assert note.sizing_h == Sizing.HUG


def test_explicit_sizing_prevents_fixed_inference(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
root:
  id: root
  children:
    - id: child
      sizing: hug
      width: 240
      label:
        - Hello
""",
    )

    child = diagram.root.children[0]
    assert child.sizing_w == Sizing.HUG
    assert child.sizing_h == Sizing.HUG


def test_per_axis_sizing_overrides_uniform_sizing(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
root:
  id: root
  children:
    - id: child
      sizing: hug
      sizing_h: fill
      label:
        - Hello
""",
    )

    child = diagram.root.children[0]
    assert child.sizing_w == Sizing.HUG
    assert child.sizing_h == Sizing.FILL


def test_padding_defaults_follow_border_semantics(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
root:
  id: root
  children:
    - id: child
      label:
        - Hello
""",
    )

    assert diagram.root.border == Border.NONE
    assert diagram.root.padding == 0
    child = diagram.root.children[0]
    assert child.border == Border.SOLID
    assert child.padding == 8


def test_grid_block_parses_into_frame_diagram_metadata(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
grid:
  cols: 4
  col_gap: 32
  row_gap: 24
  outer_margin: 40
root:
  id: root
  children:
    - id: child
      label:
        - Hello
""",
    )

    assert diagram.grid_cols == 4
    assert diagram.grid_col_gap == 32
    assert diagram.grid_row_gap == 24
    assert diagram.grid_outer_margin == 40


def test_meta_block_parses_into_ontology_fields(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
meta:
  diagram_type: system_architecture
  abstraction_level: container
  layout_engine: elk-force
  presentation_form: swimlane
root:
  id: root
  children:
    - id: child
      label:
        - Hello
""",
    )

    assert diagram.diagram_type == "system_architecture"
    assert diagram.abstraction_level == "container"
    assert diagram.layout_engine == "elk-force"
    assert diagram.presentation_form == "swimlane"


def test_meta_block_defaults_to_none_when_absent(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
root:
  id: root
  children:
    - id: child
      label:
        - Hello
""",
    )

    assert diagram.diagram_type is None
    assert diagram.abstraction_level is None
    assert diagram.layout_engine is None
    assert diagram.presentation_form is None


def test_partial_meta_block_leaves_missing_fields_none(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
meta:
  diagram_type: layered_stack
root:
  id: root
  children:
    - id: child
      label:
        - Hello
""",
    )

    assert diagram.diagram_type == "layered_stack"
    assert diagram.abstraction_level is None
    assert diagram.layout_engine is None
    assert diagram.presentation_form is None


def test_svg_meta_filters_none_values():
    from frame_model import FrameDiagram

    d = FrameDiagram(
        diagram_type="system_architecture",
        layout_engine="elk-force",
    )
    meta = d.svg_meta()
    assert meta == {"diagram_type": "system_architecture", "layout_engine": "elk-force"}


def test_svg_meta_returns_none_when_all_fields_empty():
    from frame_model import FrameDiagram

    d = FrameDiagram()
    assert d.svg_meta() is None


def test_meta_unknown_field_warns(tmp_path):
    import warnings

    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        _load(
            tmp_path,
            """
engine: v3
meta:
  diagram_type: system_architecture
  bogus_field: hello
root:
  id: root
  children:
    - id: child
      label:
        - Hello
""",
        )
    assert any("unknown meta field 'bogus_field'" in str(x.message) for x in w)


def test_meta_unknown_value_warns(tmp_path):
    import warnings

    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        _load(
            tmp_path,
            """
engine: v3
meta:
  diagram_type: not_a_real_type
root:
  id: root
  children:
    - id: child
      label:
        - Hello
""",
        )
    assert any("not a recognised value" in str(x.message) for x in w)


# ── Variant overlays ───────────────────────────────────────────────


def test_variant_highlight_sets_black_fill(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
root:
  id: page
  children:
    - id: a
      variant: highlight
      label: [Hello]
""",
    )
    a = diagram.root.children[0]
    assert a.fill == Fill.BLACK
    assert a.icon_fill == "#FFFFFF"


def test_variant_annotation_removes_border(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
root:
  id: page
  children:
    - id: note
      variant: annotation
      label: [Some note]
""",
    )
    note = diagram.root.children[0]
    assert note.border == Border.NONE


def test_explicit_yaml_overrides_variant(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
root:
  id: page
  children:
    - id: a
      variant: highlight
      fill: grey
      label: [Hello]
""",
    )
    a = diagram.root.children[0]
    assert a.fill == Fill.GREY  # explicit override wins over variant


def test_no_variant_works_as_before(tmp_path):
    """Existing raw YAMLs without variant: continue to work unchanged."""
    diagram = _load(
        tmp_path,
        """
engine: v3
root:
  id: page
  children:
    - id: a
      border: solid
      fill: grey
      label: [Hello]
""",
    )
    a = diagram.root.children[0]
    assert a.border == Border.SOLID
    assert a.fill == Fill.GREY


# ── Style resolution (level system) ────────────────────────────────


def test_panel_with_heading_and_leaves_resolves_level2(tmp_path):
    """Container with heading + leaf children gets panel style: grey fill."""
    diagram = _load(tmp_path, """
engine: v3
root:
  id: root
  children:
    - id: panel
      heading: "Panel"
      children:
        - id: leaf
          label: [Child]
""")
    panel = diagram.root.children[0]
    assert panel.resolved_fill == "#F3F3F3"
    assert panel.resolved_stroke == "#F3F3F3"


def test_standalone_leaf_resolves_level1_box(tmp_path):
    """Standalone leaf gets box style: transparent fill, black stroke."""
    diagram = _load(tmp_path, """
engine: v3
root:
  id: root
  children:
    - id: standalone
      label: [Hello]
""")
    leaf = diagram.root.children[0]
    assert leaf.resolved_fill == "transparent"
    assert leaf.resolved_stroke == "#000000"


def test_leaf_inside_panel_resolves_level1_box(tmp_path):
    """Leaf inside a panel gets box style (outlined)."""
    diagram = _load(tmp_path, """
engine: v3
root:
  id: root
  children:
    - id: panel
      heading: "Panel"
      children:
        - id: leaf
          label: [Hello]
""")
    # panel has __heading and __body children; leaf is inside __body
    body = panel = diagram.root.children[0]
    for c in panel.children:
        if "__body" in (c.id or ""):
            body = c
            break
    leaf = body.children[0]
    assert leaf.resolved_fill == "transparent"
    assert leaf.resolved_stroke == "#000000"


def test_highlight_variant_resolves_black(tmp_path):
    """Highlight variant produces black fill, black stroke."""
    diagram = _load(tmp_path, """
engine: v3
root:
  id: root
  children:
    - id: hl
      variant: highlight
      label: [Hello]
""")
    hl = diagram.root.children[0]
    assert hl.resolved_fill == "#000000"
    assert hl.resolved_stroke == "#000000"


def test_annotation_variant_resolves_transparent(tmp_path):
    """Annotation variant produces transparent fill and stroke."""
    diagram = _load(tmp_path, """
engine: v3
root:
  id: root
  children:
    - id: ann
      variant: annotation
      label: [Hello]
""")
    ann = diagram.root.children[0]
    assert ann.resolved_fill == "transparent"
    assert ann.resolved_stroke == "none"


def test_panel_parent_resolves_level3_with_small_caps(tmp_path):
    """Container with heading + panel descendant gets outlined + small-caps heading."""
    diagram = _load(tmp_path, """
engine: v3
root:
  id: root
  children:
    - id: section
      heading: "Section"
      children:
        - id: inner_panel
          heading: "Panel"
          children:
            - id: deep
              label: [Hello]
""")
    section = diagram.root.children[0]
    # Level 3: outlined (transparent fill, black stroke)
    assert section.resolved_fill == "transparent"
    assert section.resolved_stroke == "#000000"
    # Heading gets small caps
    heading = section.children[0]
    assert heading.role == "heading"
    assert heading.label[0].small_caps is True

    # Inner panel is still level 2 (grey)
    body = section.children[1]  # __body
    inner = body.children[0]
    assert inner.resolved_fill == "#F3F3F3"


def test_headingless_container_resolves_level0_transparent(tmp_path):
    """Container without heading is a layout wrapper — transparent."""
    diagram = _load(tmp_path, """
engine: v3
root:
  id: root
  children:
    - id: wrapper
      direction: horizontal
      children:
        - id: a
          label: [A]
        - id: b
          label: [B]
""")
    wrapper = diagram.root.children[0]
    assert wrapper.resolved_fill == "transparent"
    assert wrapper.resolved_stroke == "none"


def test_root_frame_resolves_transparent(tmp_path):
    """Root frame is always transparent/none."""
    diagram = _load(tmp_path, """
engine: v3
root:
  id: root
  children:
    - id: leaf
      label: [Hello]
""")
    assert diagram.root.resolved_fill == "transparent"
    assert diagram.root.resolved_stroke == "none"


def test_layout_wrappers_resolve_transparent(tmp_path):
    """Synthetic __heading and __body wrappers are transparent."""
    diagram = _load(tmp_path, """
engine: v3
root:
  id: root
  children:
    - id: panel
      heading: "Panel"
      children:
        - id: leaf
          label: [Hello]
""")
    panel = diagram.root.children[0]
    heading = panel.children[0]
    body = panel.children[1]
    assert "heading" in heading.id
    assert "body" in body.id
    assert heading.resolved_fill == "transparent"
    assert heading.resolved_stroke == "none"
    assert body.resolved_fill == "transparent"
    assert body.resolved_stroke == "none"


# ── __body field inheritance ────────────────────────────────────────


def test_body_inherits_wrap_from_parent(tmp_path):
    """__body must copy wrap from its parent container."""
    diagram = _load(tmp_path, """
engine: v3
root:
  id: root
  children:
    - id: panel
      heading: "Panel"
      direction: horizontal
      wrap: true
      children:
        - id: a
          label: [A]
        - id: b
          label: [B]
""")
    panel = diagram.root.children[0]
    body = panel.children[1]
    assert "body" in body.id
    assert body.wrap is True


def test_body_inherits_fill_weight_from_parent(tmp_path):
    """__body must copy fill_weight from its parent container."""
    diagram = _load(tmp_path, """
engine: v3
root:
  id: root
  direction: horizontal
  children:
    - id: wide
      heading: "Wide"
      fill_weight: 3
      sizing_w: fill
      children:
        - id: a
          label: [A]
    - id: narrow
      heading: "Narrow"
      fill_weight: 1
      sizing_w: fill
      children:
        - id: b
          label: [B]
""")
    wide = diagram.root.children[0]
    body = wide.children[1]
    assert "body" in body.id
    assert body.fill_weight == 3


def test_body_inherits_justify_in_vertical_parent(tmp_path):
    """__body must copy justify from a vertical parent container."""
    diagram = _load(tmp_path, """
engine: v3
root:
  id: root
  children:
    - id: panel
      heading: "Panel"
      justify: space-between
      children:
        - id: a
          label: [A]
        - id: b
          label: [B]
""")
    panel = diagram.root.children[0]
    body = panel.children[1]
    assert "body" in body.id
    assert body.justify == Justify.SPACE_BETWEEN


# ── Column span ─────────────────────────────────────────────────────


def test_col_span_parsed_into_frame(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
grid:
  cols: 3
  col_gap: 24
  outer_margin: 24
root:
  id: page
  direction: horizontal
  children:
    - id: a
      col_span: 2
      label: [Wide]
    - id: b
      label: [Narrow]
""",
    )
    a = diagram.root.children[0]
    assert a.col_span == 2


def test_col_span_resolves_to_fixed_width(tmp_path):
    from layout_v3 import layout_frame_diagram
    diagram = _load(
        tmp_path,
        """
engine: v3
grid:
  cols: 4
  col_gap: 24
  outer_margin: 24
root:
  id: page
  direction: horizontal
  padding: 24
  children:
    - id: wide
      col_span: 2
      label: [Wide box]
    - id: narrow
      label: [Narrow]
""",
    )
    result = layout_frame_diagram(diagram)
    wide = diagram.root.children[0]
    assert wide.sizing_w == Sizing.FIXED
    # col_span=2 means 2*col_w + 1*col_gap
    assert wide.width is not None
    assert wide.width > 0


def test_highlighted_section_heading_inherits_black_fill(tmp_path):
    """variant: highlight on a parent propagates fill to the heading child."""
    diagram = _load(
        tmp_path,
        """
engine: v3
root:
  id: page
  children:
    - id: panel
      variant: highlight
      heading: Services
      children:
        - id: b
          label: [Hello]
""",
    )
    panel = diagram.root.children[0]
    assert panel.fill == Fill.BLACK
    # The synthetic heading child should also be black
    heading_child = panel.children[0]
    assert heading_child.role == "heading"
    assert heading_child.fill == Fill.BLACK
    assert heading_child.icon_fill == "#FFFFFF"


# ── Overlays ────────────────────────────────────────────────────────


def test_overlays_parsed_from_yaml(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
overlays:
  - id: devteam
    label: "Dev team"
    members: [a, b]
root:
  id: page
  direction: horizontal
  children:
    - id: a
      label: [Alice]
    - id: b
      label: [Bob]
""",
    )
    assert len(diagram.overlays) == 1
    ov = diagram.overlays[0]
    assert ov.id == "devteam"
    assert ov.label == "Dev team"
    assert ov.members == ["a", "b"]


def test_overlay_renders_bounding_rect(tmp_path):
    """Overlay rect wraps member nodes tightly, not full canvas width."""
    from layout_v3 import layout_frame_diagram, OVERLAY_PADDING
    from diagram_layout import Rect, FrameBox
    diagram = _load(
        tmp_path,
        """
engine: v3
overlays:
  - id: team
    label: "Team"
    members: [a, b]
root:
  id: page
  direction: horizontal
  children:
    - id: a
      label: [Alice]
    - id: b
      label: [Bob]
    - id: c
      label: [Charlie]
""",
    )
    result = layout_frame_diagram(diagram)
    overlay_rects = [p for p in result.foreground if isinstance(p, Rect) and p.stroke_dasharray]
    assert len(overlay_rects) == 1
    ov = overlay_rects[0]
    assert ov.component_id == "team"
    assert ov.stroke_dasharray == "2 4"

    # Overlay should wrap members a and b, NOT span full canvas
    # Get bounds of members a and b
    a_boxes = [p for p in result.foreground if isinstance(p, FrameBox) and p.component_id == "a"]
    b_boxes = [p for p in result.foreground if isinstance(p, FrameBox) and p.component_id == "b"]
    c_boxes = [p for p in result.foreground if isinstance(p, FrameBox) and p.component_id == "c"]
    assert len(a_boxes) == 1 and len(b_boxes) == 1 and len(c_boxes) == 1
    a, b, c = a_boxes[0], b_boxes[0], c_boxes[0]

    pad = OVERLAY_PADDING
    expected_x = a.x - pad
    expected_w = (b.x + b.width) - a.x + 2 * pad
    assert ov.x == expected_x, f"overlay x={ov.x}, expected {expected_x}"
    assert ov.width == expected_w, f"overlay w={ov.width}, expected {expected_w}"
    # Overlay must NOT extend to cover c
    assert ov.x + ov.width < c.x, "overlay should not cover non-member c"


def test_no_overlays_when_absent(tmp_path):
    diagram = _load(
        tmp_path,
        """
engine: v3
root:
  id: page
  children:
    - id: a
      label: [Hello]
""",
    )
    assert diagram.overlays == []