from __future__ import annotations

from dataclasses import dataclass

from diagram_model import Line
from diagram_shared import DEFAULT_FRAME_STROKE_WIDTH


@dataclass(frozen=True)
class FrameTextStyle:
    weight: str
    small_caps: bool
    letter_spacing: str | None = None


@dataclass(frozen=True)
class FrameClassDefinition:
    fill: str
    stroke: str
    stroke_width: int = DEFAULT_FRAME_STROKE_WIDTH
    text_fill: str | None = None
    icon_fill: str | None = None
    heading_text: FrameTextStyle | None = None
    leaf_lead_text: FrameTextStyle | None = None

FRAME_CLASS_DEFS: dict[str, FrameClassDefinition] = {
    "hidden": FrameClassDefinition(
        fill="transparent",
        stroke="none",
        stroke_width=0,
    ),
    "highlight": FrameClassDefinition(
        fill="#000000",
        stroke="#000000",
        text_fill="#FFFFFF",
        icon_fill="#FFFFFF",
    ),
    "annotation": FrameClassDefinition(
        fill="transparent",
        stroke="none",
        stroke_width=0,
        text_fill="#666666",
        icon_fill="#666666",
        heading_text=FrameTextStyle(weight="400", small_caps=False),
        leaf_lead_text=FrameTextStyle(weight="400", small_caps=False),
    ),
    "section": FrameClassDefinition(
        fill="transparent",
        stroke="#000000",
        stroke_width=DEFAULT_FRAME_STROKE_WIDTH,
        text_fill="#000000",
        icon_fill="#000000",
        heading_text=FrameTextStyle(weight="700", small_caps=False),
        leaf_lead_text=FrameTextStyle(weight="700", small_caps=False),
    ),
    "panel": FrameClassDefinition(
        fill="#F3F3F3",
        stroke="#F3F3F3",
        text_fill="#000000",
        icon_fill="#000000",
        heading_text=FrameTextStyle(weight="700", small_caps=False),
        leaf_lead_text=FrameTextStyle(weight="700", small_caps=False),
    ),
    "leaf": FrameClassDefinition(
        fill="transparent",
        stroke="#000000",
        text_fill="#000000",
        icon_fill="#000000",
        heading_text=FrameTextStyle(weight="400", small_caps=False),
        leaf_lead_text=FrameTextStyle(weight="400", small_caps=False),
    ),
}


def _clone_line(line: Line, **overrides) -> Line:
    return Line(
        line.content,
        size=overrides.get("size", line.size),
        weight=overrides.get("weight", line.weight),
        fill=overrides.get("fill", line.fill),
        small_caps=overrides.get("small_caps", line.small_caps),
        letter_spacing=overrides.get("letter_spacing", line.letter_spacing),
        line_step=overrides.get("line_step", line.line_step),
        font_family=overrides.get("font_family", line.font_family),
    )


def _apply_line_fill(line: Line, fill: str | None) -> Line:
    if fill is None:
        return line
    return _clone_line(line, fill=fill)


def _apply_text_style(line: Line, style: FrameTextStyle, fill: str | None) -> Line:
    return _clone_line(
        line,
        weight=style.weight,
        fill=fill or line.fill,
        small_caps=style.small_caps,
        letter_spacing=style.letter_spacing,
    )


def stroke_width_for_class(frame_class: FrameClassDefinition) -> int:
    """Stroke width from a frame-class definition (0 when the class has no visible stroke)."""
    if frame_class.stroke in ("none", "transparent"):
        return 0
    return frame_class.stroke_width


def effective_resolved_stroke_width(frame) -> int:
    """Effective border width after resolve_styles() — layout inset and SVG render."""
    from diagram_model import Border

    # If resolve_styles() has run, trust the resolved values.
    if frame.resolved_stroke is not None:
        stroke = frame.resolved_stroke
        if stroke in ("none", "transparent"):
            return 0
        if frame.resolved_stroke_width is not None and frame.resolved_stroke_width > 0:
            return int(frame.resolved_stroke_width)
        return DEFAULT_FRAME_STROKE_WIDTH
    # resolve_styles() hasn't run yet — fall back to the border field.
    return DEFAULT_FRAME_STROKE_WIDTH if frame.border in (Border.SOLID, Border.DASHED) else 0


def apply_frame_class(frame, frame_class: FrameClassDefinition) -> None:
    frame.resolved_fill = frame_class.fill
    frame.resolved_stroke = frame_class.stroke
    frame.resolved_stroke_width = stroke_width_for_class(frame_class)
    if frame.icon and (frame.icon_fill is None or frame.icon_fill == "#000000"):
        frame.icon_fill = frame_class.icon_fill or frame.icon_fill

    if frame_class.heading_text:
        for child in frame.children:
            if child.role == "heading":
                if frame_class.text_fill:
                    child.label = [_apply_line_fill(line, frame_class.text_fill) for line in child.label]
                if child.label:
                    child.label[0] = _apply_text_style(
                        child.label[0], frame_class.heading_text, frame_class.text_fill
                    )
                if child.icon and (child.icon_fill is None or child.icon_fill == "#000000"):
                    child.icon_fill = frame_class.icon_fill or child.icon_fill
        if frame.heading is not None:
            if frame_class.text_fill:
                frame.heading = _apply_line_fill(frame.heading, frame_class.text_fill)
            frame.heading = _apply_text_style(
                frame.heading, frame_class.heading_text, frame_class.text_fill
            )
    elif frame_class.text_fill:
        for child in frame.children:
            if child.role == "heading":
                child.label = [_apply_line_fill(line, frame_class.text_fill) for line in child.label]
                if child.icon and (child.icon_fill is None or child.icon_fill == "#000000"):
                    child.icon_fill = frame_class.icon_fill or child.icon_fill
        if frame.heading is not None:
            frame.heading = _apply_line_fill(frame.heading, frame_class.text_fill)

    if frame_class.text_fill and frame.label:
        frame.label = [_apply_line_fill(line, frame_class.text_fill) for line in frame.label]

    if frame_class.leaf_lead_text and not frame.is_container and frame.label:
        frame.label[0] = _apply_text_style(
            frame.label[0], frame_class.leaf_lead_text, frame_class.text_fill
        )


def apply_highlight_parent_contrast(frame) -> None:
    """Apply readable text/icon contrast for frames on a highlight parent."""
    text_fill = "#FFFFFF"
    icon_fill = "#FFFFFF"

    if frame.label:
        frame.label = [_apply_line_fill(line, text_fill) for line in frame.label]
    if frame.heading is not None:
        frame.heading = _apply_line_fill(frame.heading, text_fill)
    if frame.icon and (frame.icon_fill is None or frame.icon_fill == "#000000"):
        frame.icon_fill = icon_fill
    for child in frame.children:
        if child.role != "heading":
            continue
        child.label = [_apply_line_fill(line, text_fill) for line in child.label]
        if child.icon and (child.icon_fill is None or child.icon_fill == "#000000"):
            child.icon_fill = icon_fill
