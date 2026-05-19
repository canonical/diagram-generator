"""Load native Frame YAML definitions into FrameDiagram objects.

Native frame YAML has ``engine: v3`` at the top level and defines a
recursive Frame tree directly — no v2 Diagram intermediary.

Usage::

    from frame_loader import load_frame_yaml
    diagram = load_frame_yaml("diagrams/frames/test-vertical-stack.yaml")
"""

from __future__ import annotations

import pathlib
import yaml

from diagram_model import Arrow, Border, Fill, Line
from frame_model import Align, Direction, Frame, FrameDiagram, Sizing

# ── Enum maps (lowercase YAML strings → Python enums) ──────────────

_DIRECTION = {"vertical": Direction.VERTICAL, "horizontal": Direction.HORIZONTAL}
_SIZING = {"hug": Sizing.HUG, "fill": Sizing.FILL, "fixed": Sizing.FIXED}
_FILL = {"white": Fill.WHITE, "grey": Fill.GREY, "black": Fill.BLACK}
_BORDER = {"solid": Border.SOLID, "dashed": Border.DASHED, "none": Border.NONE}
_ALIGN = {
    "top-left": Align.TOP_LEFT, "top-center": Align.TOP_CENTER, "top-right": Align.TOP_RIGHT,
    "center-left": Align.CENTER_LEFT, "center": Align.CENTER, "center-right": Align.CENTER_RIGHT,
    "bottom-left": Align.BOTTOM_LEFT, "bottom-center": Align.BOTTOM_CENTER, "bottom-right": Align.BOTTOM_RIGHT,
}


def _parse_line(raw) -> Line:
    """Parse a label line from YAML — string or {text, weight, size, ...}."""
    if isinstance(raw, str):
        return Line(raw)
    if isinstance(raw, dict):
        return Line(
            raw.get("text", ""),
            weight=raw.get("weight"),
            size=raw.get("size"),
            fill=raw.get("fill"),
            small_caps=raw.get("small_caps", False),
        )
    return Line(str(raw))


def _parse_frame(data: dict) -> Frame:
    """Recursively parse a Frame dict from YAML."""
    children_data = data.get("children", [])
    children = [_parse_frame(c) for c in children_data]
    is_container = len(children) > 0

    # Label: list of strings/dicts → list of Line
    label_raw = data.get("label", [])
    label = [_parse_line(l) for l in label_raw]

    # Heading: string or dict → Line
    heading = None
    if "heading" in data:
        h = data["heading"]
        heading = Line(h, weight="700") if isinstance(h, str) else _parse_line(h)

    # Sensible defaults differ for leaf vs container
    default_border = Border.NONE if is_container else Border.SOLID
    default_gap = 24 if is_container else 0

    return Frame(
        id=data.get("id", ""),
        direction=_DIRECTION.get(data.get("direction", "vertical"), Direction.VERTICAL),
        gap=int(data.get("gap", default_gap)),
        padding=int(data.get("padding", 8)),
        sizing=_SIZING.get(data.get("sizing", "hug"), Sizing.HUG),
        child_sizing=_SIZING.get(data.get("child_sizing", "hug"), Sizing.HUG),
        align=_ALIGN.get(data.get("align", "top-left"), Align.TOP_LEFT),
        width=int(data["width"]) if "width" in data else None,
        height=int(data["height"]) if "height" in data else None,
        fill=_FILL.get(data.get("fill", "white"), Fill.WHITE),
        border=_BORDER.get(data.get("border", ""), default_border),
        heading=heading,
        icon=data.get("icon"),
        icon_fill=data.get("icon_fill"),
        label=label,
        children=children,
    )


def _parse_arrow(data: dict) -> Arrow:
    """Parse an arrow from YAML."""
    return Arrow(
        source=data.get("source", ""),
        target=data.get("target", ""),
        label=data.get("label"),
    )


def load_frame_yaml(path: str | pathlib.Path) -> FrameDiagram:
    """Load a native Frame YAML file into a FrameDiagram.

    The file must have ``engine: v3`` at the top level.
    """
    p = pathlib.Path(path)
    data = yaml.safe_load(p.read_text(encoding="utf-8"))

    if data.get("engine") != "v3":
        raise ValueError(f"{p}: not a native frame YAML (missing engine: v3)")

    root_data = data.get("root", {})
    root = _parse_frame(root_data)

    arrows = [_parse_arrow(a) for a in data.get("arrows", [])]

    return FrameDiagram(
        title=data.get("title", ""),
        root=root,
        arrows=arrows,
    )


def is_frame_yaml(path: str | pathlib.Path) -> bool:
    """Check if a YAML file is a native frame definition (has engine: v3)."""
    try:
        p = pathlib.Path(path)
        data = yaml.safe_load(p.read_text(encoding="utf-8"))
        return isinstance(data, dict) and data.get("engine") == "v3"
    except Exception:
        return False
