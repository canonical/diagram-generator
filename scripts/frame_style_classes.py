from __future__ import annotations

from dataclasses import dataclass

from diagram_model import Line


@dataclass(frozen=True)
class FrameTextStyle:
    weight: str
    small_caps: bool
    letter_spacing: str | None = None


@dataclass(frozen=True)
class FrameClassDefinition:
    fill: str
    stroke: str
    text_fill: str | None = None
    icon_fill: str | None = None
    heading_text: FrameTextStyle | None = None
    leaf_lead_text: FrameTextStyle | None = None

FRAME_CLASS_DEFS: dict[str, FrameClassDefinition] = {
    "hidden": FrameClassDefinition(
        fill="transparent",
        stroke="none",
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
        text_fill="#666666",
        icon_fill="#666666",
        heading_text=FrameTextStyle(weight="400", small_caps=False),
        leaf_lead_text=FrameTextStyle(weight="400", small_caps=False),
    ),
    "section": FrameClassDefinition(
        fill="transparent",
        stroke="#000000",
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


def apply_frame_class(frame, frame_class: FrameClassDefinition) -> None:
    frame.resolved_fill = frame_class.fill
    frame.resolved_stroke = frame_class.stroke
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
