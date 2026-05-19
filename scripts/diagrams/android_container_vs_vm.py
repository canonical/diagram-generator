"""Containerized vs Virtualized Android – full stack comparison.

Side-by-side comparison showing the Anbox Instance architecture in both
container and VM modes, with a dashed kernel boundary separator and the
host OS & hardware layer below.
"""

from __future__ import annotations

from diagram_model import (
    Annotation,
    Box,
    Diagram,
    Fill,
    Line,
    Panel,
    Separator,
)

HELPER = "#666666"


def _body(text: str, **kw) -> Line:
    return Line(text, **kw)


def _heading(text: str) -> Line:
    return Line(text, weight="700")


def _helper(text: str) -> Line:
    return Line(text, fill=HELPER)


android_container_vs_vm = Diagram(
    title="Android container vs VM architecture",
    arrangement=Diagram.Arrangement.GRID,
    cols=3,
    col_width=240,
    col_gap=24,
    row_gap=24,
    outer_margin=24,
    components=[
        # ── Row 0: Column headings ──
        Annotation(
            lines=[Line("Containerized Android", weight="700")],
            col=0, row=0,
        ),
        Annotation(
            lines=[Line("Virtualized Android", weight="700")],
            col=1, row=0,
        ),

        # ── Row 1: Anbox Instances ──
        Panel(
            id="anbox_container",
            heading=_heading("Anbox instance"),
            fill=Fill.WHITE,
            cols=1,
            row_gap=8,
            col=0, row=1,
            children=[
                Box(
                    id="container_system",
                    label=[
                        _body("Android system"),
                        _body("(App/Framework/API)"),
                    ],
                    fill=Fill.GREY,
                    col=0, row=0,
                ),
                Box(
                    id="container_runtime",
                    label=[_body("Android runtime")],
                    fill=Fill.GREY,
                    col=0, row=1,
                ),
            ],
        ),
        Panel(
            id="anbox_vm",
            heading=_heading("Anbox instance"),
            fill=Fill.GREY,
            cols=1,
            row_gap=8,
            col=1, row=1,
            children=[
                Box(
                    id="vm_system",
                    label=[
                        _body("Android system"),
                        _body("(App/Framework/API)"),
                    ],
                    fill=Fill.WHITE,
                    col=0, row=0,
                ),
                Box(
                    id="vm_runtime",
                    label=[_body("Android runtime")],
                    fill=Fill.WHITE,
                    col=0, row=1,
                ),
                Box(
                    id="vm_kernel",
                    label=[_body("Android kernel")],
                    fill=Fill.WHITE,
                    col=0, row=2,
                ),
            ],
        ),
        Annotation(
            lines=[
                _helper("Android owns everything"),
                _helper("above"),
            ],
            col=2, row=1,
        ),

        # ── Row 2: Kernel boundary separator ──
        Separator(col=0, row=2, col_span=3),

        # ── Row 3: Host OS & Hardware ──
        Panel(
            id="host_container",
            heading=_heading("Host OS & hardware"),
            fill=Fill.WHITE,
            cols=1,
            row_gap=8,
            col=0, row=3,
            children=[
                Box(
                    id="host_container_kernel",
                    label=[
                        _body("Host Linux kernel"),
                        _body("(shared kernel)"),
                    ],
                    fill=Fill.GREY,
                    col=0, row=0,
                ),
                Box(
                    id="host_container_hw",
                    label=[_body("Host hardware")],
                    fill=Fill.GREY,
                    col=0, row=1,
                ),
            ],
        ),
        Panel(
            id="host_vm",
            heading=_heading("Host OS & hardware"),
            fill=Fill.WHITE,
            cols=1,
            row_gap=8,
            col=1, row=3,
            children=[
                Box(
                    id="host_vm_kernel",
                    label=[_body("Host Linux kernel")],
                    fill=Fill.GREY,
                    col=0, row=0,
                ),
                Box(
                    id="host_vm_hw",
                    label=[_body("Host hardware")],
                    fill=Fill.GREY,
                    col=0, row=1,
                ),
            ],
        ),
        Annotation(
            lines=[
                _helper("Android has no control"),
                _helper("below"),
            ],
            col=2, row=3,
        ),
    ],
)
