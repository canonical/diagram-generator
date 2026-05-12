"""Lightning talk — design-language engine overview.

Shows three specs feeding into a central engine from the left,
three input formats feeding in from the top, and outputs flowing
down through an editor to final file formats.

Grid: 4 columns × 7 rows.
  col 0: specs (Typography, Spacing, Grid)
  cols 1–3: inputs (row 0), engine (row 1–3), editor (row 4), outputs (row 6)
"""

from __future__ import annotations

from diagram_model import (
    Annotation,
    Arrow,
    Border,
    Box,
    BoxStyle,
    Diagram,
    Fill,
    Line,
    Panel,
)
from diagram_shared import HELPER as HELPER_COLOR


def _body(text: str, **kw) -> Line:
    return Line(text, **kw)


def _heading(text: str) -> Line:
    return Line(text, weight="700")


def _helper(text: str) -> Line:
    return Line(text, fill=HELPER_COLOR)


lightning_talk_engine = Diagram(
    title="Design-language engine",
    arrangement=Diagram.Arrangement.GRID,
    cols=4,
    col_width=192,
    row_height=64,
    col_gap=24,
    row_gap=24,
    outer_margin=24,
    components=[
        # ── Row 0: Input formats (above the engine) ──
        Box(
            id="input_dg",
            label=[_body("Rough"), _body("diagram")],
            icon="Design.svg",
            col=1, row=0,
        ),
        Box(
            id="input_a4",
            label=[_body("Copydoc")],
            icon="Document.svg",
            col=2, row=0,
        ),
        Box(
            id="input_blo",
            label=[_body("Marketing"), _body("brief")],
            icon="Marketing.svg",
            col=3, row=0,
        ),

        # ── Row 1–3: Specs (col 0) ──
        Box(
            id="spec_typo",
            label=[_body("Typography"), _body("spec")],
            fill=Fill.GREY,
            icon="Documents.svg",
            col=0, row=1,
        ),
        Box(
            id="spec_spacing",
            label=[_body("Spacing"), _body("spec")],
            fill=Fill.GREY,
            icon="Documents.svg",
            col=0, row=2,
        ),
        Box(
            id="spec_grid",
            label=[_body("Grid"), _body("spec")],
            fill=Fill.GREY,
            icon="Documents.svg",
            col=0, row=3,
        ),

        # ── Row 1–3: Engine (cols 1–3) ──
        Panel(
            id="engine",
            heading=_heading("Design-language engine"),
            cols=3,
            col_gap=8,
            row_gap=8,
            fill=Fill.WHITE,
            border=Border.SOLID,
            col=1, row=1,
            col_span=3, row_span=3,
            children=[
                Box(
                    id="eng_dg",
                    label=[_body("Diagram"), _body("generator")],
                    fill=Fill.GREY,
                    icon="Blueprint.svg",
                    col=0, row=0,
                ),
                Box(
                    id="eng_a4",
                    label=[_body("A4"), _body("generator")],
                    fill=Fill.GREY,
                    icon="Document management.svg",
                    col=1, row=0,
                ),
                Box(
                    id="eng_blo",
                    label=[_body("Brand layout"), _body("ops")],
                    fill=Fill.GREY,
                    icon="Composable.svg",
                    col=2, row=0,
                ),
            ],
        ),

        # ── Row 4: Editor ──
        Box(
            id="editor",
            label=[_body("Constrained"), _body("editor")],
            icon="Laptop with code.svg",
            col=1, row=4,
            col_span=3,
        ),

        # ── Row 5: Output files ──
        Box(
            id="out_svg",
            label=[_body("SVG")],
            fill=Fill.GREY,
            icon="Design.svg",
            col=1, row=5,
        ),
        Box(
            id="out_pdf",
            label=[_body("PDF")],
            fill=Fill.GREY,
            icon="Document.svg",
            col=2, row=5,
        ),
        Box(
            id="out_mp4",
            label=[_body("MP4 / PNG")],
            fill=Fill.GREY,
            icon="Video.svg",
            col=3, row=5,
        ),

        # ── Arrows: inputs → engine ──
        Arrow(source="input_dg.bottom", target="engine.top"),
        Arrow(source="input_a4.bottom", target="engine.top"),
        Arrow(source="input_blo.bottom", target="engine.top"),

        # ── Arrows: specs → engine (left side) ──
        Arrow(source="spec_typo.right", target="engine.left"),
        Arrow(source="spec_spacing.right", target="engine.left"),
        Arrow(source="spec_grid.right", target="engine.left"),

        # ── Arrows: engine → editor → outputs ──
        Arrow(source="engine.bottom", target="editor.top"),
        Arrow(source="editor.bottom", target="out_svg.top"),
        Arrow(source="editor.bottom", target="out_pdf.top"),
        Arrow(source="editor.bottom", target="out_mp4.top"),
    ],
)
