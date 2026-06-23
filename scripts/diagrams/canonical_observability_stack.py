"""Canonical Observability Stack (COS) on-brand redraw.

Goal: show how application, infrastructure, and operating-system signals flow
into the Canonical Observability Stack, where Tempo, Loki, Prometheus, and
Grafana run on Canonical Kubernetes backed by VMs, then provide dashboards and
alerts to a sysadmin.
"""

from __future__ import annotations

from diagram_model import Arrow, Border, Box, Diagram, Fill, Line, Panel


HELPER = "#666666"
SIDE_W = 152
SERVICE_W = 136
KUBE_W = (SERVICE_W * 4) + (8 * 3)
VM_W = (KUBE_W - (8 * 2)) // 3


def _body(text: str, **kw) -> Line:
    return Line(text, **kw)


def _heading(text: str) -> Line:
    return Line(text, size="24", weight="700", line_step=32)


def _helper(text: str) -> Line:
    return Line(text, fill=HELPER)


def _small(text: str) -> Line:
    return Line(text, size="14", fill=HELPER, line_step=20)


def _source(text: str, row: int) -> Box:
    return Box(
        id=text.lower().replace(" ", "_"),
        label=[_helper(text)],
        border=Border.NONE,
        height=64,
        col=0,
        row=row,
    )


def _channel(channel_id: str, title: str, detail: str, row: int) -> Box:
    return Box(
        id=channel_id,
        label=[_helper(title), _small(detail)],
        border=Border.NONE,
        height=64,
        col=0,
        row=row,
    )


canonical_observability_stack = Diagram(
    title="Canonical Observability Stack",
    arrangement=Diagram.Arrangement.HORIZONTAL,
    col_gap=24,
    outer_margin=24,
    components=[
        Panel(
            id="source_layers",
            cols=1,
            col_width=SIDE_W,
            row_gap=24,
            border=Border.NONE,
            uniform_height=False,
            children=[
                _source("Application layer", 0),
                Box(
                    id="signal_note",
                    label=[_small("metrics + logs")],
                    border=Border.NONE,
                    height=88,
                    col=0,
                    row=1,
                ),
                _source("Infra layer", 2),
                _source("Operating system", 3),
            ],
        ),
        Panel(
            id="cos",
            heading=_heading("Canonical Observability Stack (COS)"),
            cols=4,
            col_width=SERVICE_W,
            col_gap=8,
            row_gap=8,
            border=Border.DASHED,
            uniform_height=False,
            children=[
                Box(
                    id="tempo",
                    label=[_body("Traces"), _small("Tempo")],
                    fill=Fill.WHITE,
                    col=0,
                    row=0,
                ),
                Box(
                    id="loki",
                    label=[_body("Logs"), _small("Loki")],
                    fill=Fill.WHITE,
                    col=1,
                    row=0,
                ),
                Box(
                    id="prometheus",
                    label=[_body("Metrics"), _small("Prometheus")],
                    fill=Fill.WHITE,
                    col=2,
                    row=0,
                ),
                Box(
                    id="grafana",
                    label=[_body("Dashboards"), _body("+ alerts"), _small("Grafana")],
                    fill=Fill.WHITE,
                    col=3,
                    row=0,
                ),
                Box(
                    id="kubernetes",
                    label=[_body("Canonical Kubernetes")],
                    icon="Cluster.svg",
                    fill=Fill.GREY,
                    col=0,
                    row=1,
                    col_span=4,
                ),
                Box(
                    id="vm_1",
                    label=[_body("VM")],
                    icon="Virtual machine.svg",
                    fill=Fill.WHITE,
                    width=VM_W,
                    height=72,
                    col=0,
                    row=2,
                ),
                Box(
                    id="vm_2",
                    label=[_body("VM")],
                    icon="Virtual machine.svg",
                    fill=Fill.WHITE,
                    width=VM_W,
                    height=72,
                    col=1,
                    row=2,
                ),
                Box(
                    id="vm_3",
                    label=[_body("VM")],
                    icon="Virtual machine.svg",
                    fill=Fill.WHITE,
                    width=VM_W,
                    height=72,
                    col=2,
                    row=2,
                ),
            ],
        ),
        Panel(
            id="outputs",
            cols=1,
            col_width=SIDE_W,
            row_gap=24,
            border=Border.NONE,
            uniform_height=False,
            children=[
                _channel("dashboard_path", "dashboards", "web GUI", 0),
                Box(
                    id="sysadmin",
                    label=[_body("Sysadmin")],
                    icon="User.svg",
                    fill=Fill.WHITE,
                    col=0,
                    row=1,
                ),
                _channel("alert_path", "alerts", "email", 2),
            ],
        ),
        Arrow(source="application_layer.right", target="cos.left"),
        Arrow(source="infra_layer.right", target="cos.left"),
        Arrow(source="operating_system.right", target="cos.left"),
        Arrow(source="cos.right", target="dashboard_path.left"),
        Arrow(source="cos.right", target="alert_path.left"),
    ],
)
