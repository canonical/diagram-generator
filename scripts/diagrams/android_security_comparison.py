"""Containerized vs Virtualized Android – security comparison.

Side-by-side comparison showing SELinux enforcement differences between
LXD containers and VMs, with a dashed separator for the host kernel layer.
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


android_security_comparison = Diagram(
    title="Android Security Comparison",
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

        # ── Row 1: Containers / VMs ──
        Panel(
            id="lxd_container",
            heading=_heading("LXD Container"),
            fill=Fill.WHITE,
            cols=1,
            row_gap=8,
            col=0, row=1,
            children=[
                Box(
                    id="lxd_headline",
                    label=[_heading("SELinux removed")],
                    fill=Fill.WHITE,
                    col=0, row=0,
                ),
                Box(
                    id="lxd_system",
                    label=[_body("Android System")],
                    fill=Fill.GREY,
                    col=0, row=1,
                ),
            ],
        ),
        Panel(
            id="vm",
            heading=_heading("VM"),
            fill=Fill.GREY,
            cols=1,
            row_gap=8,
            col=1, row=1,
            children=[
                Box(
                    id="vm_headline",
                    label=[
                        _heading("SELinux ON"),
                        _body("/enforcing mode"),
                        _body("App sandboxing"),
                        _body("System service isolation"),
                    ],
                    fill=Fill.WHITE,
                    col=0, row=0,
                ),
                Box(
                    id="vm_system",
                    label=[_body("Android System")],
                    fill=Fill.WHITE,
                    col=0, row=1,
                ),
                Box(
                    id="vm_kernel",
                    label=[_body("Android Kernel")],
                    fill=Fill.WHITE,
                    col=0, row=2,
                ),
            ],
        ),
        Annotation(
            lines=[
                _helper("SELinux assumptions only"),
            ],
            col=2, row=1,
            id="note_left",
        ),

        # ── Row 2: Separator ──
        Separator(col=0, row=2, col_span=3),

        # ── Row 3: Host kernel layer ──
        Box(
            id="host_container",
            label=[_body("Host Kernel (AppArmor)")],
            fill=Fill.GREY,
            col=0, row=3,
        ),
        Box(
            id="host_vm",
            label=[_body("Host Kernel (AppArmor)")],
            fill=Fill.GREY,
            col=1, row=3,
        ),
        Annotation(
            lines=[
                _helper("AppArmor enforcement"),
                _helper("/ VM confinement"),
            ],
            col=2, row=3,
        ),
    ],
)
