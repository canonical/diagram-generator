"""Android graphics stack – vertical layer diagram with side annotations.

Declarative definition using the diagram model.
"""

from __future__ import annotations

from diagram_model import (
    Annotation,
    Arrow,
    Box,
    Diagram,
    Fill,
    Line,
)

HELPER = "#666666"


def _body(text: str, **kw) -> Line:
    return Line(text, **kw)


def _heading(text: str) -> Line:
    return Line(text, weight="700")


def _helper(text: str) -> Line:
    return Line(text, fill=HELPER)


android_graphics_stack = Diagram(
    title="Android graphics stack",
    arrangement=Diagram.Arrangement.GRID,
    cols=2,
    col_width=480,
    col_gap=24,
    row_gap=24,
    outer_margin=24,
    components=[
        # ── Row 0: Applications ──
        Box(
            id="apps",
            label=[
                _heading("Applications"),
                _body("• OpenGL / Vulkan"),
                _body("• UI toolkits"),
            ],
            fill=Fill.GREY,
            icon="Mobile.svg",
            col=0, row=0,
        ),
        Annotation(
            lines=[
                _helper("Applications render into GPU-backed buffers"),
            ],
            col=1, row=0,
        ),

        Arrow(source="apps.bottom", target="runtime.top"),

        # ── Row 1: Android Graphics Runtime ──
        Box(
            id="runtime",
            label=[
                _heading("Android graphics runtime"),
                _body("• EGL"),
                _body("• Vulkan loader"),
                _body("• Buffer management abstractions"),
            ],
            fill=Fill.WHITE,
            icon="Gateway.svg",
            col=0, row=1,
        ),
        Annotation(
            lines=[
                _helper("EGL connects rendering APIs"),
                _helper("to the native buffer system"),
            ],
            col=1, row=1,
        ),

        Arrow(source="runtime.bottom", target="composition.top"),

        # ── Row 2: System Composition and Display Policy ──
        Box(
            id="composition",
            label=[
                _heading("System composition and display policy"),
                _body("• SurfaceFlinger"),
                _body("• HWComposer (capability & policy)"),
            ],
            fill=Fill.GREY,
            icon="Composable.svg",
            col=0, row=2,
        ),
        Annotation(
            lines=[
                _helper("SurfaceFlinger composes buffers into a frame"),
            ],
            col=1, row=2,
        ),

        Arrow(source="composition.bottom", target="kernel_gfx.top"),

        # ── Row 3: Kernel Graphics & Display Subsystems ──
        Box(
            id="kernel_gfx",
            label=[
                _heading("Kernel graphics & display subsystems"),
                _body("• DRM / KMS"),
                _body("• GPU drivers"),
                _body("• Memory & synchronization primitives"),
            ],
            fill=Fill.WHITE,
            icon="kernel.svg",
            col=0, row=3,
        ),
        Annotation(
            lines=[
                _helper("HWComposer and kernel graphics subsystems"),
                _helper("interact with the GPU and display hardware"),
            ],
            col=1, row=3,
        ),

        Arrow(source="kernel_gfx.bottom", target="display.top"),

        # ── Row 4: Display output ──
        Box(
            id="display",
            label=[_heading("Display output")],
            fill=Fill.GREY,
            icon="Desktop monitor.svg",
            col=0, row=4,
        ),
    ],
)
