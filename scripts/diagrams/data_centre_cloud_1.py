"""Data Centre Cloud 1 — three failure-tolerant availability zones.

Goal: show how Data Centre Cloud 1 distributes its bare-metal servers across
three single-rack availability zones (pods) so the cloud survives the failure
of any one availability zone.  Each pod carries an identical role layout:
one infrastructure node, one control-plane node, and four cloud nodes.
"""

from __future__ import annotations

from diagram_model import (
    Border,
    Box,
    Diagram,
    Fill,
    Line,
    Panel,
)


HELPER = "#666666"

# Per-pod child box content width and the dashed wrapper outer width.
NODE_W = 288
POD_W = NODE_W + 16          # content + 2 * INSET
ROW_W = POD_W * 3 + 24 * 2   # three pods + two 24px gutters


def _role(text: str) -> Line:
    return Line(text, weight="600")


def _meta(text: str) -> Line:
    return Line(text, size="14", fill=HELPER, line_step=20)


def _heading(text: str) -> Line:
    return Line(text, weight="700")


def _node(role: str, model: str, host: str, *, icon: str, fill: Fill, col: int, row: int) -> Box:
    return Box(
        label=[_role(role), _meta(model), _meta(host)],
        icon=icon,
        fill=fill,
        width=NODE_W,
        col=col,
        row=row,
    )


def _pod(pod_id: str, az: str, rack: str, prefix: str, col: int) -> Panel:
    """One availability zone: a dashed pod with six role-grouped nodes."""
    return Panel(
        id=pod_id,
        heading=_heading(f"{az} \u00b7 {rack}"),
        cols=1,
        col_width=NODE_W,
        row_gap=8,
        border=Border.DASHED,
        col=col,
        children=[
            _node(
                "Infrastructure", "HPE ProLiant DL365 Gen11",
                f"{prefix}-mgt01.cit-mgmt.loc",
                icon="Server.svg", fill=Fill.GREY, col=0, row=0,
            ),
            _node(
                "Control plane", "HPE ProLiant DL365 Gen11",
                f"{prefix}-osc01.cit-mgmt.loc",
                icon="Cluster.svg", fill=Fill.GREY, col=0, row=1,
            ),
            _node(
                "Cloud node", "HPE ProLiant DL385 Gen11",
                f"{prefix}-osn01.maas.cit-mgmt.loc",
                icon="Cloud with node.svg", fill=Fill.WHITE, col=0, row=2,
            ),
            _node(
                "Cloud node", "HPE ProLiant DL385 Gen11",
                f"{prefix}-osn02.maas.cit-mgmt.loc",
                icon="Cloud with node.svg", fill=Fill.WHITE, col=0, row=3,
            ),
            _node(
                "Cloud node", "HPE ProLiant DL385 Gen11",
                f"{prefix}-osn03.maas.cit-mgmt.loc",
                icon="Cloud with node.svg", fill=Fill.WHITE, col=0, row=4,
            ),
            _node(
                "Cloud node", "HPE ProLiant DL385 Gen11",
                f"{prefix}-osn04.maas.cit-mgmt.loc",
                icon="Cloud with node.svg", fill=Fill.WHITE, col=0, row=5,
            ),
        ],
    )


data_centre_cloud_1 = Diagram(
    title="Data Centre Cloud 1",
    arrangement=Diagram.Arrangement.VERTICAL,
    row_gap=24,
    outer_margin=24,
    components=[
        Box(
            id="title",
            label=[
                Line("Data Centre Cloud 1", size="24", weight="700", line_step=32),
                Line(
                    "Germany \u00b7 three availability zones (pods), one rack each "
                    "\u2014 services survive the loss of any one AZ",
                    fill=HELPER,
                ),
            ],
            width=ROW_W,
        ),
        Panel(
            id="zones",
            cols=3,
            col_width=POD_W,
            col_gap=24,
            border=Border.NONE,
            uniform_height=False,
            children=[
                _pod("pod_az1", "Dus7-az1", "Rack 1", "dus7", col=0),
                _pod("pod_az2", "Dus6-az2", "Rack 2", "dus6", col=1),
                _pod("pod_az3", "Dus1-az3", "Rack 3", "dus1", col=2),
            ],
        ),
    ],
)
