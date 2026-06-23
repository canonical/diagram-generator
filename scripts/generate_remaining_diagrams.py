from __future__ import annotations

import html
import pathlib
from diagram_shared import (
    ARROW_HEAD_HALF_WIDTH,
    ARROW_HEAD_LENGTH,
    ASCENT_RATIO,
    BASELINE_UNIT,
    BLACK,
    BLOCK_WIDTH,
    BODY_LINE_STEP,
    BODY_SIZE,
    BOX_MIN_HEIGHT,
    COMPACT_GAP,
    DESCENT_RATIO,
    DIAGRAM_TIER_BODY_SIZE,
    GRID_GUTTER,
    GREY,
    HELPER,
    ICON_SIZE,
    INSET,
    MATRIX_COLUMN_DIVIDERS,
    MATRIX_HEADER_HEIGHT,
    MATRIX_LABEL_SIZE,
    MATRIX_ROW_DIVIDERS,
    MATRIX_SIZE,
    ORANGE,
    OUTER_MARGIN,
    SVG_DIR,
    TERMINAL_BAR_HEIGHT,
    TERMINAL_CHROME_HEIGHT,
    TERMINAL_DOT_CENTERS,
    TERMINAL_DOT_RADIUS,
    TERMINAL_FONT_FAMILY,
    TITLE_SIZE,
    WHITE,
    centered_band_text_top,
    fmt,
    line_top_to_baseline,
    lines_required_height,
    load_icon,
    make_diagram_line,
    make_line,
    panel_grid,
    round_up_to_grid,
    size_to_px,
    terminal_text_top,
    tight_box_height,
)


def svg_open(width: int, height: int) -> list[str]:
    return [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" xml:space="preserve">',
        f'  <rect width="{width}" height="{height}" fill="{WHITE}" />',
    ]


def rect(
    x: float,
    y: float,
    width: float,
    height: float,
    *,
    fill: str = WHITE,
    stroke: str = BLACK,
    dasharray: str | None = None,
) -> str:
    dash_attr = f' stroke-dasharray="{dasharray}"' if dasharray else ""
    return (
        f'  <rect x="{fmt(x)}" y="{fmt(y)}" width="{fmt(width)}" height="{fmt(height)}" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="1" stroke-miterlimit="10"{dash_attr} />'
    )


def line(
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    *,
    stroke: str = BLACK,
    dasharray: str | None = None,
) -> str:
    dash_attr = f' stroke-dasharray="{dasharray}"' if dasharray else ""
    return (
        f'  <line x1="{fmt(x1)}" y1="{fmt(y1)}" x2="{fmt(x2)}" y2="{fmt(y2)}" '
        f'fill="none" stroke="{stroke}" stroke-width="1" stroke-miterlimit="10"{dash_attr} />'
    )


def polygon(points: list[tuple[float, float]], fill: str = BLACK) -> str:
    return (
        f'  <polygon points="{" ".join(f"{fmt(x)},{fmt(y)}" for x, y in points)}" '
        f'fill="{fill}" />'
    )


def circle(cx: float, cy: float, radius: float, *, fill: str, stroke: str = BLACK) -> str:
    return (
        f'  <circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(radius)}" fill="{fill}" '
        f'stroke="{stroke}" stroke-width="1" stroke-miterlimit="10" />'
    )


def polyline_arrow(points: list[tuple[float, float]], color: str = ORANGE) -> str:
    if len(points) < 2:
        raise ValueError("polyline_arrow requires at least two points")

    shaft_points = list(points)
    tip_x, tip_y = shaft_points[-1]
    prev_x, prev_y = shaft_points[-2]
    dx = tip_x - prev_x
    dy = tip_y - prev_y

    if dx == 0 and dy == 0:
        raise ValueError("Arrow tip cannot duplicate previous point")

    if dx == 0:
        direction = 1 if dy > 0 else -1
        base_point = (tip_x, tip_y - direction * ARROW_HEAD_LENGTH)
        head = [
            (tip_x - ARROW_HEAD_HALF_WIDTH, base_point[1]),
            (tip_x, tip_y),
            (tip_x + ARROW_HEAD_HALF_WIDTH, base_point[1]),
        ]
    elif dy == 0:
        direction = 1 if dx > 0 else -1
        base_point = (tip_x - direction * ARROW_HEAD_LENGTH, tip_y)
        head = [
            (base_point[0], tip_y - ARROW_HEAD_HALF_WIDTH),
            (tip_x, tip_y),
            (base_point[0], tip_y + ARROW_HEAD_HALF_WIDTH),
        ]
    else:
        raise ValueError("Only orthogonal arrow segments are supported")

    shaft_points[-1] = base_point
    parts: list[str] = []
    for index in range(len(shaft_points) - 1):
        x1, y1 = shaft_points[index]
        x2, y2 = shaft_points[index + 1]
        parts.append(line(x1, y1, x2, y2, stroke=color))
    parts.append(polygon(head, fill=color))
    return "\n".join(parts)


def jagged_box(x: float, y: float, width: float, height: float, fill: str = GREY) -> str:
    step = BASELINE_UNIT
    half = step / 2
    points: list[tuple[float, float]] = []
    for index in range(int(width // step) + 1):
        px = x + index * step
        if px > x + width:
            px = x + width
        points.append((px, y if index % 2 == 0 else y - half))
    points.append((x + width, y + height))
    for index in range(int(width // step), -1, -1):
        px = x + index * step
        if px > x + width:
            px = x + width
        points.append((px, y + height if index % 2 == 0 else y + height + half))
    d = ["M"]
    first_x, first_y = points[0]
    d.append(f"{fmt(first_x)} {fmt(first_y)}")
    for px, py in points[1:]:
        d.append(f"L {fmt(px)} {fmt(py)}")
    d.append("Z")
    return (
        f'  <path d="{" ".join(d)}" fill="{fill}" stroke="{BLACK}" '
        'stroke-width="1" stroke-miterlimit="10" />'
    )


def text_block(x: float, y: float, lines: list[dict[str, object]]) -> str:
    if not lines:
        return ""
    parts = ['  <text font-family="Ubuntu Sans">']
    current_top = y
    for spec in lines:
        content = html.escape(str(spec["content"]))
        size = str(spec["size"])
        weight = str(spec["weight"])
        fill = str(spec["fill"])
        small_caps = bool(spec["small_caps"])
        small_caps_attrs = ''
        if small_caps:
            small_caps_attrs = ' font-variant-caps="all-small-caps" letter-spacing="0.05em"'
        parts.append(
            f'    <tspan x="{fmt(x)}" y="{fmt(line_top_to_baseline(current_top, size))}" font-size="{size}" '
            f'font-weight="{weight}" fill="{fill}"{small_caps_attrs}>{content}</tspan>'
        )
        current_top += int(spec["line_step"])
    parts.append("  </text>")
    return "\n".join(parts)


def icon_group(x: float, y: float, icon_name: str, fill: str = BLACK) -> str:
    return f'  <g transform="translate({fmt(x)} {fmt(y)})">\n{load_icon(icon_name, fill)}\n  </g>'


def box(
    x: float,
    y: float,
    width: float,
    fill: str,
    text_lines: list[dict[str, object]],
    *,
    icon_name: str | None = None,
    text_fill: str = BLACK,
    icon_fill: str | None = None,
    height: int | None = None,
) -> str:
    resolved_height = max(height or 0, lines_required_height(text_lines))
    resolved_lines = []
    for line_spec in text_lines:
        merged = dict(line_spec)
        merged.setdefault("fill", text_fill)
        resolved_lines.append(merged)
    parts = [rect(x, y, width, resolved_height, fill=fill)]
    parts.append(text_block(x + INSET, y + INSET, resolved_lines))
    if icon_name:
        parts.append(
            icon_group(
                x + width - INSET - ICON_SIZE,
                y + INSET,
                icon_name,
                fill=icon_fill or text_fill,
            )
        )
    return "\n".join(parts)


def vertical_arrow(center_x: float, start_y: float, tip_y: float, color: str = ORANGE) -> str:
    return polyline_arrow([(center_x, start_y), (center_x, tip_y)], color=color)


def horizontal_arrow(start_x: float, center_y: float, tip_x: float, color: str = ORANGE) -> str:
    return polyline_arrow([(start_x, center_y), (tip_x, center_y)], color=color)


def orthogonal_arrow_to_right(
    start_x: float,
    start_y: float,
    bend_x: float,
    bend_y: float,
    tip_x: float,
    color: str = ORANGE,
) -> str:
    return polyline_arrow(
        [
            (start_x, start_y),
            (bend_x, start_y),
            (bend_x, bend_y),
            (tip_x, bend_y),
        ],
        color=color,
    )


def orthogonal_arrow_down(
    start_x: float,
    start_y: float,
    route_y: float,
    end_x: float,
    tip_y: float,
    color: str = ORANGE,
) -> str:
    return polyline_arrow(
        [
            (start_x, start_y),
            (start_x, route_y),
            (end_x, route_y),
            (end_x, tip_y),
        ],
        color=color,
    )


def matrix_group(x: float, y: float, label: str) -> str:
    label_top = y + centered_band_text_top(MATRIX_HEADER_HEIGHT, MATRIX_LABEL_SIZE)
    return "\n".join(
        [
            rect(x, y, MATRIX_SIZE, MATRIX_SIZE, fill=GREY),
            line(x, y + MATRIX_HEADER_HEIGHT, x + MATRIX_SIZE, y + MATRIX_HEADER_HEIGHT),
            *(line(x + divider_x, y + MATRIX_HEADER_HEIGHT, x + divider_x, y + MATRIX_SIZE) for divider_x in MATRIX_COLUMN_DIVIDERS),
            *(line(x, y + divider_y, x + MATRIX_SIZE, y + divider_y) for divider_y in MATRIX_ROW_DIVIDERS),
            f'  <text x="{fmt(x + MATRIX_SIZE / 2)}" y="{fmt(line_top_to_baseline(label_top, MATRIX_LABEL_SIZE))}" text-anchor="middle" '
            f'font-family="Ubuntu Sans" font-size="{MATRIX_LABEL_SIZE}" font-weight="700" fill="{BLACK}">{html.escape(label)}</text>',
        ]
    )


def command_bar(
    x: float,
    y: float,
    width: float,
    text_value: str,
    *,
    text_size: str = BODY_SIZE,
) -> str:
    parts = [rect(x, y, width, TERMINAL_BAR_HEIGHT, fill=GREY)]
    parts.append(line(x, y + TERMINAL_CHROME_HEIGHT, x + width, y + TERMINAL_CHROME_HEIGHT))
    for center_x in TERMINAL_DOT_CENTERS:
        parts.append(circle(center_x + x, y + TERMINAL_CHROME_HEIGHT / 2, TERMINAL_DOT_RADIUS, fill=WHITE))
    parts.append(
        f'  <text x="{fmt(x + INSET)}" y="{fmt(line_top_to_baseline(y + terminal_text_top(), text_size))}" '
        f'font-family="{TERMINAL_FONT_FAMILY}" font-size="{text_size}" font-weight="400" fill="{BLACK}">{html.escape(text_value)}</text>'
    )
    return "\n".join(parts)


def request_cluster(x: float, y: float) -> str:
    step = ICON_SIZE + COMPACT_GAP
    return "\n".join(
        [
            icon_group(x, y, "Document.svg"),
            icon_group(x + step, y, "Photography.svg"),
            icon_group(x + (step * 2), y, "Globe.svg"),
        ]
    )


def panel_box(
    x: float,
    y: float,
    width: float,
    height: float,
    title: str,
    *,
    fill: str,
    icon_name: str | None = None,
) -> str:
    return box(
        x,
        y,
        width,
        fill,
        [make_line(title, weight="700")],
        icon_name=icon_name,
        height=height,
    )


SERVICE_PLACEMENT_COMMON_SERVICES = [
    "MAAS Region API",
    "MAAS Rack",
    "MAAS PostgreSQL",
    "Juju Controller LXD",
    "MAAS HAProxy",
    "MAAS Keepalived",
    "Microceph RGW",
    "Juju Controller MAAS",
    "Landscape Server",
    "Landscape RabbitMQ",
    "Landscape PostgreSQL",
    "Canonical Kubernetes",
    "Vault",
    "Landscape HAProxy",
    "Landscape Keepalived",
]

SERVICE_PLACEMENT_SPECIAL_SERVICES = [
    ("Manual TLS certificates", (True, False, False)),
    ("Ceph Proxy", (False, True, False)),
]


def service_placement_rows() -> list[tuple[str, tuple[bool, bool, bool]]]:
    rows = [(service, (True, True, True)) for service in SERVICE_PLACEMENT_COMMON_SERVICES]
    rows.extend(SERVICE_PLACEMENT_SPECIAL_SERVICES)
    return rows


def table_cell(
    x: float,
    y: float,
    width: float,
    height: float,
    fill: str,
    lines: list[dict[str, object]],
    *,
    icon_name: str | None = None,
) -> str:
    text_width = width - (INSET * 2)
    if icon_name:
        text_width -= ICON_SIZE + INSET
    parts = [rect(x, y, width, height, fill=fill)]
    parts.append(text_block(x + INSET, y + INSET, lines))
    if icon_name:
        parts.append(icon_group(x + width - INSET - ICON_SIZE, y + INSET, icon_name))
    return "\n".join(parts)


def service_marker(cx: float, cy: float) -> str:
    return f'  <circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="5" fill="{BLACK}" />'


def write_svg(path: pathlib.Path, parts: list[str]) -> None:
    path.write_text("\n".join(parts + ["</svg>", ""]), encoding="utf-8")


def build_service_placement_map() -> None:
    rows = service_placement_rows()
    service_col_width = 288
    node_col_width = 160
    table_x = 32
    table_y = 128
    header_height = 96
    row_height = 40
    table_width = service_col_width + (node_col_width * 3)
    table_height = header_height + (len(rows) * row_height)
    width = table_x + table_width + 32
    height = table_y + table_height + 80

    node_headers = [
        ("Infra #1", "Rack 1", "AZ 1"),
        ("Infra #2", "Rack 3", "AZ 2"),
        ("Infra #3", "Rack 5", "AZ 3"),
    ]

    parts = svg_open(width, height)
    parts.append(
        text_block(
            table_x,
            32,
            [make_line("Infrastructure service placement map", size=TITLE_SIZE, weight="700")],
        )
    )
    parts.append(
        text_block(
            table_x,
            72,
            [make_line("Infrastructure services mapped across three infrastructure nodes", fill=HELPER)],
        )
    )

    parts.append(
        table_cell(
            table_x,
            table_y,
            service_col_width,
            header_height,
            GREY,
            [make_line("Service", weight="700"), make_line("placement", weight="700")],
        )
    )
    for index, (infra, rack, az) in enumerate(node_headers):
        x = table_x + service_col_width + (index * node_col_width)
        parts.append(
            table_cell(
                x,
                table_y,
                node_col_width,
                header_height,
                GREY,
                [make_line(infra, weight="700"), make_line(rack, fill=HELPER), make_line(az, fill=HELPER)],
                icon_name="Server.svg",
            )
        )

    for row_index, (service, placements) in enumerate(rows):
        y = table_y + header_height + (row_index * row_height)
        fill = WHITE if row_index % 2 == 0 else GREY
        parts.append(table_cell(table_x, y, service_col_width, row_height, fill, [make_line(service)]))
        for node_index, present in enumerate(placements):
            x = table_x + service_col_width + (node_index * node_col_width)
            parts.append(rect(x, y, node_col_width, row_height, fill=fill))
            if present:
                parts.append(service_marker(x + (node_col_width / 2), y + (row_height / 2)))

    legend_y = table_y + table_height + 32
    parts.append(service_marker(table_x + 5, legend_y + 5))
    parts.append(text_block(table_x + 24, legend_y - 7, [make_line("Service present on node", fill=HELPER)]))
    write_svg(SVG_DIR / "service-placement-map-onbrand.svg", parts)


# --- Node network connectivity -------------------------------------------------
# Networks, top-to-bottom, mapped to the node roles that consume them.
NODE_NETWORK_NETWORKS = [
    "BMC",
    "OAM / provisioning",
    "Storage access",
    "Storage replication",
    "SDN underlay",
    "Internal API",
    "Public API",
    "Provider network",
]

# (label lines, icon, set of consumed network indices)
NODE_NETWORK_ROLES = [
    (["Infrastructure", "node"], "Server.svg", {0, 1, 5, 6, 7}),
    (["Control node"], "Cluster.svg", {0, 1, 2, 3, 4, 5, 6}),
    (["Hyper-converged", "node"], "Cloud with node.svg", {0, 1, 2, 3, 4, 5, 6, 7}),
]

NODE_NETWORK_NOTES = [
    "BMC \u2014 dedicated BMC port on every node",
    "OAM / provisioning \u2014 native VLAN for PXE boot",
    "Internal API \u2014 used for Vault on the infrastructure node",
    "Public API \u2014 can be routed (infrastructure node)",
    "Provider network \u2014 can be routed and facilitates validation tests (infrastructure node)",
]


def node_network_geometry() -> dict[str, object]:
    table_x = 32
    # Reserve a left strip for the network names so no arrow ever crosses the
    # bar labels.  The node boxes live in a right-hand cluster, mirroring the
    # reference layout where every connector drops into clear space above a node.
    label_zone = 240
    node_w = 256
    node_gap = 48
    node_cluster_w = node_w * 3 + node_gap * 2
    content_w = label_zone + node_cluster_w
    nodes_x_start = table_x + content_w - node_cluster_w
    bar_h = 40
    bar_gap = 8
    bars_top = 128
    n_net = len(NODE_NETWORK_NETWORKS)
    lane_inset = 16
    lane_step = (node_w - (lane_inset * 2)) / (n_net - 1)

    def bar_top(k: int) -> float:
        return bars_top + k * (bar_h + bar_gap)

    stack_bottom = bar_top(n_net - 1) + bar_h
    arrow_gap = 48
    nodes_y = stack_bottom + arrow_gap
    node_h = 64
    notes_top = nodes_y + node_h + 32
    width = table_x + content_w + 32
    height = int(notes_top + len(NODE_NETWORK_NOTES) * 24 + 24)

    def node_x(i: int) -> float:
        return nodes_x_start + i * (node_w + node_gap)

    def lane_x(i: int, k: int) -> float:
        return node_x(i) + lane_inset + k * lane_step

    return {
        "table_x": table_x,
        "node_w": node_w,
        "content_w": content_w,
        "bar_h": bar_h,
        "bars_top": bars_top,
        "bar_top": bar_top,
        "nodes_y": nodes_y,
        "node_h": node_h,
        "notes_top": notes_top,
        "width": width,
        "height": height,
        "node_x": node_x,
        "lane_x": lane_x,
        "lane_inset": lane_inset,
        "lane_step": lane_step,
    }


def build_node_network_connectivity() -> None:
    g = node_network_geometry()
    table_x = g["table_x"]
    node_w = g["node_w"]
    content_w = g["content_w"]
    bar_h = g["bar_h"]
    bar_top = g["bar_top"]
    nodes_y = g["nodes_y"]
    node_h = g["node_h"]

    parts = svg_open(g["width"], g["height"])
    parts.append(
        text_block(table_x, 32, [make_line("Node network connectivity", size=TITLE_SIZE, weight="700")])
    )
    parts.append(
        text_block(table_x, 72, [make_line("Networks consumed by each OpenStack node role", fill=HELPER)])
    )

    # Network bars (background).
    for k, name in enumerate(NODE_NETWORK_NETWORKS):
        y = bar_top(k)
        parts.append(rect(table_x, y, content_w, bar_h, fill=GREY))
        parts.append(text_block(table_x + INSET, y + INSET, [make_line(name, weight="600")]))

    # Orange connectors network -> node, drawn before the node boxes so each
    # node's top edge stays crisp while the arrowheads remain visible above it.
    for i, (_, _, consumed) in enumerate(NODE_NETWORK_ROLES):
        for k in sorted(consumed):
            x = g["lane_x"](i, k)
            parts.append(polyline_arrow([(x, bar_top(k) + bar_h), (x, nodes_y)]))

    # Node boxes.
    for i, (label_lines, icon, _) in enumerate(NODE_NETWORK_ROLES):
        x = g["node_x"](i)
        parts.append(rect(x, nodes_y, node_w, node_h, fill=WHITE))
        parts.append(
            text_block(
                x + INSET,
                nodes_y + INSET,
                [make_line(line_text, weight="600") for line_text in label_lines],
            )
        )
        parts.append(icon_group(x + node_w - INSET - ICON_SIZE, nodes_y + INSET, icon))

    # Footnotes.
    parts.append(
        text_block(table_x, g["notes_top"], [make_line(note, fill=HELPER) for note in NODE_NETWORK_NOTES])
    )

    write_svg(SVG_DIR / "node-network-connectivity-onbrand.svg", parts)


def build_memory_wall() -> None:
    width = 496
    height = 656
    parts = svg_open(width, height)
    background: list[str] = []
    foreground: list[str] = []

    x = 96
    center_x = x + 96

    background.append(vertical_arrow(center_x, 88, 112))
    background.append(vertical_arrow(center_x, 176, 200))
    background.append(vertical_arrow(center_x, 264, 288))
    background.append(vertical_arrow(center_x, 352, 376))
    background.append(vertical_arrow(center_x, 440, 464))
    background.append(vertical_arrow(center_x, 528, 552))
    background.append(line(x, 188, x + 192, 188, dasharray="12 8"))
    background.append(horizontal_arrow(328, 232, 288, color=BLACK))

    foreground.append(box(x, 24, 192, WHITE, [make_line("User request")]))
    foreground.append(request_cluster(304, 32))
    foreground.append(
        box(
            x,
            112,
            192,
            GREY,
            [make_line("App & model"), make_line("framework")],
            icon_name="Package.svg",
            height=64,
        )
    )
    foreground.append(box(x, 200, 192, WHITE, [make_line("Missing layer")], height=64))
    foreground.append(
        text_block(
            336,
            216,
            [make_line("No model-aware", fill=HELPER), make_line("orchestration!", fill=HELPER)],
        )
    )
    foreground.append(
        box(
            x,
            288,
            192,
            GREY,
            [make_line("Operating"), make_line("system")],
            icon_name="Server.svg",
        )
    )
    foreground.append(
        box(
            x,
            376,
            192,
            GREY,
            [make_line("Hardware")],
            icon_name="Chip 1.svg",
        )
    )
    foreground.append(
        box(
            x,
            464,
            192,
            GREY,
            [make_line("Silicon")],
            icon_name="Chip 2.svg",
        )
    )
    foreground.append(jagged_box(x, 560, 192, 64, GREY))
    foreground.append(text_block(x + INSET, 568, [make_line("Memory wall", fill=BLACK)]))
    foreground.append(icon_group(x + 192 - INSET - ICON_SIZE, 568, "Memory.svg"))

    parts.extend(background)
    parts.extend(foreground)
    write_svg(SVG_DIR / "memory-wall-onbrand.svg", parts)


def build_request_to_hardware_stack() -> None:
    width = 520
    height = 1232
    parts = svg_open(width, height)
    background: list[str] = []
    foreground: list[str] = []

    x = 56
    panel_width = 408
    center_x = x + panel_width / 2

    background.extend(
        [
            vertical_arrow(center_x, 88, 112),
            vertical_arrow(center_x, 312, 336),
            vertical_arrow(center_x, 608, 632),
            vertical_arrow(center_x, 832, 856),
            vertical_arrow(center_x, 984, 1008),
        ]
    )

    foreground.append(box(x + 108, 24, 192, WHITE, [make_line("User request")], icon_name="Cloud.svg"))

    foreground.append(panel_box(x, 112, panel_width, 200, "Orchestration layer", fill=GREY, icon_name="Snap.svg"))
    foreground.append(box(x + 8, 168, 192, WHITE, [make_line("Ollama")]))
    foreground.append(box(x + 208, 168, 192, WHITE, [make_line("Lemonade"), make_line("Server")], height=72))
    foreground.append(box(x + 8, 240, 392, WHITE, [make_line("vLLM")]))

    foreground.append(panel_box(x, 336, panel_width, 272, "Model runtime", fill=WHITE, icon_name="AI.svg"))
    foreground.append(box(x + 8, 392, 192, GREY, [make_line("llama.cpp")]))
    foreground.append(box(x + 208, 392, 192, GREY, [make_line("OpenVINO")]))
    foreground.append(box(x + 8, 464, 192, GREY, [make_line("vLLM")]))
    foreground.append(box(x + 208, 464, 192, GREY, [make_line("TensorRT-"), make_line("LLM")], height=72))
    foreground.append(box(x + 8, 536, 392, GREY, [make_line("ONNX Runtime")]))

    foreground.append(panel_box(x, 632, panel_width, 200, "Compute kernel", fill=GREY, icon_name="kernel.svg"))
    foreground.append(box(x + 8, 688, 192, WHITE, [make_line("CUDA")]))
    foreground.append(box(x + 208, 688, 192, WHITE, [make_line("ROCm")]))
    foreground.append(box(x + 8, 760, 192, WHITE, [make_line("Metal")]))
    foreground.append(box(x + 208, 760, 192, WHITE, [make_line("oneDNN")]))

    foreground.append(panel_box(x, 856, panel_width, 128, "Driver", fill=WHITE, icon_name="Wrench 1.svg"))
    foreground.append(box(x + 8, 912, 192, GREY, [make_line("CUDA")]))
    foreground.append(box(x + 208, 912, 192, GREY, [make_line("ROCm")]))

    foreground.append(panel_box(x, 1008, panel_width, 200, "Hardware", fill=GREY, icon_name="Chip 1.svg"))
    foreground.append(box(x + 8, 1064, 192, WHITE, [make_line("CPU")], icon_name="CPU.svg"))
    foreground.append(box(x + 208, 1064, 192, WHITE, [make_line("GPU")], icon_name="RAM.svg"))
    foreground.append(box(x + 8, 1136, 192, WHITE, [make_line("NPU")], icon_name="Chip 2.svg"))
    foreground.append(
        box(
            x + 208,
            1136,
            192,
            WHITE,
            [make_line("RAM &"), make_line("VRAM")],
            icon_name="Memory.svg",
            height=72,
        )
    )

    parts.extend(background)
    parts.extend(foreground)
    write_svg(SVG_DIR / "request-to-hardware-stack-onbrand.svg", parts)


def build_inference_snaps() -> None:
    width = 760
    height = 792
    parts = svg_open(width, height)
    background: list[str] = []
    foreground: list[str] = []

    x = 72
    frame_width = 616
    pad_x = x
    pad_y = 296
    pad_width = frame_width
    pad_height = 296
    tile_gap = 8
    tile_width = 296
    left_x = pad_x + 8
    right_x = left_x + tile_width + tile_gap
    rows = [304, 376, 448, 520]
    hardware_y = 624
    hardware_width = 200
    hardware_x = [x, x + hardware_width + tile_gap, x + (hardware_width + tile_gap) * 2]
    hardware_centers = [hardware_x[0] + hardware_width / 2, hardware_x[1] + hardware_width / 2, hardware_x[2] + hardware_width / 2]

    background.append(vertical_arrow(x + frame_width / 2, 176, 216))
    background.append(vertical_arrow(hardware_centers[0], pad_y + pad_height, hardware_y))
    background.append(vertical_arrow(hardware_centers[1], pad_y + pad_height, hardware_y))
    background.append(vertical_arrow(hardware_centers[2], pad_y + pad_height, hardware_y))

    foreground.append(
        box(
            x,
            24,
            frame_width,
            WHITE,
            [make_line("Inference snaps", weight="700")],
            icon_name="Snap.svg",
            height=64,
        )
    )
    foreground.append(command_bar(x, 112, frame_width, "$ snap install gemma3"))
    foreground.append(rect(x - 8, 200, frame_width + 16, 520, fill="none", stroke=BLACK, dasharray="8 8"))
    foreground.append(box(x, 216, frame_width, WHITE, [make_line("Inference snap", weight="700")], icon_name="Package.svg"))
    foreground.append(f'  <rect x="{pad_x}" y="{pad_y}" width="{pad_width}" height="{pad_height}" fill="{GREY}" />')

    foreground.append(box(left_x, rows[0], tile_width, WHITE, [make_line("Model")], icon_name="Network.svg", height=64))
    foreground.append(box(right_x, rows[0], tile_width, WHITE, [make_line("Workload"), make_line("identity")], icon_name="User.svg", height=64))
    foreground.append(box(left_x, rows[1], tile_width, WHITE, [make_line("Runtime")], icon_name="Gauge.svg", height=64))
    foreground.append(box(right_x, rows[1], tile_width, WHITE, [make_line("Heterogeneous"), make_line("hardware")], icon_name="Chip 1.svg", height=64))
    foreground.append(box(left_x, rows[2], tile_width, WHITE, [make_line("Dependencies")], icon_name="Wrench 1.svg"))
    foreground.append(box(right_x, rows[2], tile_width, WHITE, [make_line("Reproducibility")], icon_name="Clipboard.svg", height=64))
    foreground.append(box(left_x, rows[3], tile_width, WHITE, [make_line("Hardware"), make_line("config")], icon_name="CPU.svg", height=64))
    foreground.append(box(right_x, rows[3], tile_width, WHITE, [make_line("Operational"), make_line("observability")], icon_name="Bar chart with check.svg", height=64))

    foreground.append(box(hardware_x[0], hardware_y, hardware_width, WHITE, [make_line("CPU")], icon_name="CPU.svg", height=64))
    foreground.append(box(hardware_x[1], hardware_y, hardware_width, GREY, [make_line("GPU")], icon_name="RAM.svg", height=64))
    foreground.append(box(hardware_x[2], hardware_y, hardware_width, WHITE, [make_line("NPU")], icon_name="Chip 2.svg", height=64))

    parts.extend(background)
    parts.extend(foreground)
    write_svg(SVG_DIR / "inference-snaps-onbrand.svg", parts)


def build_inference_snaps_dense() -> None:
    width = 760
    height = 800
    parts = svg_open(width, height)
    background: list[str] = []
    foreground: list[str] = []

    x = 60
    frame_width = 640
    inner_pad = INSET
    tile_gap = GRID_GUTTER
    row_gap = GRID_GUTTER
    tile_width = 300
    hardware_gap = GRID_GUTTER
    hardware_width = BLOCK_WIDTH
    left_x = x + inner_pad
    right_x = left_x + tile_width + tile_gap
    hardware_x = [
        left_x,
        left_x + hardware_width + hardware_gap,
        left_x + (hardware_width + hardware_gap) * 2,
    ]
    hardware_centers = [left + hardware_width / 2 for left in hardware_x]

    tile_rows = [
        ([make_diagram_line("Model")], "Network.svg", [make_diagram_line("Workload"), make_diagram_line("identity")], "User.svg"),
        ([make_diagram_line("Runtime")], "Gauge.svg", [make_diagram_line("Heterogeneous"), make_diagram_line("hardware")], "Chip 1.svg"),
        ([make_diagram_line("Dependencies")], "Wrench 1.svg", [make_diagram_line("Reproducibility")], "Clipboard.svg"),
        ([make_diagram_line("Hardware"), make_diagram_line("config")], "CPU.svg", [make_diagram_line("Operational"), make_diagram_line("observability")], "Bar chart with check.svg"),
    ]

    current_row_y = inner_pad
    rows: list[float] = []
    for left_lines, _left_icon, right_lines, _right_icon in tile_rows:
        rows.append(current_row_y)
        current_row_y += max(lines_required_height(left_lines), lines_required_height(right_lines)) + row_gap
    pad_height = int(current_row_y - row_gap + inner_pad)
    pad_y = 304
    hardware_y = pad_y + pad_height + row_gap
    dashed_height = (hardware_y + 64 + 16) - 200

    background.append(vertical_arrow(x + frame_width / 2, 176, 216))
    background.append(vertical_arrow(hardware_centers[0], pad_y + pad_height, hardware_y))
    background.append(vertical_arrow(hardware_centers[1], pad_y + pad_height, hardware_y))
    background.append(vertical_arrow(hardware_centers[2], pad_y + pad_height, hardware_y))

    foreground.append(box(x, 24, frame_width, WHITE, [make_diagram_line("Inference snaps", weight="700")], icon_name="Snap.svg", height=64))
    foreground.append(command_bar(x, 112, frame_width, "$ snap install gemma3"))
    foreground.append(rect(x - 8, 200, frame_width + 16, dashed_height, fill="none", stroke=BLACK, dasharray="8 8"))
    foreground.append(box(x, 216, frame_width, WHITE, [make_diagram_line("Inference snap", weight="700")], icon_name="Package.svg", height=64))
    foreground.append(f'  <rect x="{x}" y="{pad_y}" width="{frame_width}" height="{pad_height}" fill="{GREY}" />')

    for row_y, (left_lines, left_icon, right_lines, right_icon) in zip(rows, tile_rows):
        foreground.append(box(left_x, pad_y + row_y, tile_width, WHITE, left_lines, icon_name=left_icon))
        foreground.append(box(right_x, pad_y + row_y, tile_width, WHITE, right_lines, icon_name=right_icon))

    foreground.append(box(hardware_x[0], hardware_y, hardware_width, WHITE, [make_diagram_line("CPU")], icon_name="CPU.svg"))
    foreground.append(box(hardware_x[1], hardware_y, hardware_width, GREY, [make_diagram_line("GPU")], icon_name="RAM.svg"))
    foreground.append(box(hardware_x[2], hardware_y, hardware_width, WHITE, [make_diagram_line("NPU")], icon_name="Chip 2.svg"))

    parts.extend(background)
    parts.extend(foreground)
    write_svg(SVG_DIR / "inference-snaps-dense-onbrand.svg", parts)


def build_gpu_waiting() -> None:
    width = 760
    height = 408
    parts = svg_open(width, height)
    background: list[str] = []
    foreground: list[str] = []

    background.append(orthogonal_arrow_to_right(232, 264, 304, 68, 392))

    foreground.append(
        box(
            392,
            32,
            320,
            WHITE,
            [make_line("Scheduler", weight="700"), make_line("AI inference"), make_line("request")],
            icon_name="Desktop monitor.svg",
        )
    )
    foreground.append(icon_group(304, 96, "Document.svg"))
    foreground.append(icon_group(120, 152, "Gauge.svg"))
    foreground.append(box(40, 232, 192, GREY, [make_line("GPU", weight="700")], icon_name="CPU.svg"))
    foreground.append(text_block(288, 164, [make_line("Queued request", fill=HELPER)]))
    foreground.append(text_block(40, 320, [make_line("Waiting...", weight="700", fill=BLACK)]))

    parts.extend(background)
    parts.extend(foreground)
    write_svg(SVG_DIR / "gpu-waiting-scheduler-onbrand.svg", parts)


def build_diagram_intake_workflow() -> None:
    width = 752
    height = 632
    parts = svg_open(width, height)
    background: list[str] = []
    foreground: list[str] = []

    x = 72
    frame_y = 24
    frame_width = 608
    frame_height = 176
    center_x = x + frame_width / 2

    background.extend(
        [
            vertical_arrow(center_x, frame_y + frame_height, 224),
            vertical_arrow(center_x, 296, 320),
            vertical_arrow(center_x, 384, 408),
            vertical_arrow(center_x, 480, 504),
        ]
    )

    foreground.append(rect(x, frame_y, frame_width, frame_height, fill="none", stroke=BLACK, dasharray="8 8"))
    foreground.append(text_block(x + 8, frame_y + 8, [make_line("Rough initial diagram sources", weight="700")]))
    foreground.append(box(x + 8, frame_y + 48, 192, WHITE, [make_line("ChatGPT-generated"), make_line("diagrams")], icon_name="AI.svg", height=64))
    foreground.append(
        box(
            x + 208,
            frame_y + 48,
            392,
            GREY,
            [make_line("? Additional rough"), make_line("source formats"), make_line("from PMs")],
            height=72,
        )
    )
    foreground.append(
        text_block(
            x + 8,
            frame_y + 136,
            [make_line("Ask PMs: which rough formats reach the brand team before on-brand redraw?", fill=HELPER)],
        )
    )
    foreground.append(
        box(
            x,
            224,
            frame_width,
            WHITE,
            [make_line("Agentic workflow", weight="700"), make_line("in this repo"), make_line("playbook + generators", fill=HELPER)],
            icon_name="Screen with code.svg",
            height=72,
        )
    )
    foreground.append(
        box(
            x,
            320,
            frame_width,
            GREY,
            [make_line("Compare mode", weight="700"), make_line("HTML before / agent / refined", fill=HELPER)],
            icon_name="Document with Magnifying glass.svg",
            height=64,
        )
    )
    foreground.append(
        box(
            x,
            408,
            frame_width,
            WHITE,
            [make_line("Designer polish", weight="700"), make_line("manual pass in generated"), make_line("draw.io", fill=HELPER)],
            icon_name="Design.svg",
            height=72,
        )
    )
    foreground.append(
        box(
            x,
            504,
            frame_width,
            BLACK,
            [make_line("Final SVGs", weight="700", fill=WHITE), make_line("on-brand deliverables", fill=WHITE)],
            icon_name="Storage image.svg",
            text_fill=WHITE,
            icon_fill=WHITE,
            height=64,
        )
    )

    parts.extend(background)
    parts.extend(foreground)
    write_svg(SVG_DIR / "diagram-intake-workflow-onbrand.svg", parts)


def build_diagram_language_workflow() -> None:
    width = 800
    height = 784
    parts = svg_open(width, height)
    background: list[str] = []
    foreground: list[str] = []

    x = 72
    frame_y = 24
    frame_width = 656
    frame_height = 184
    center_x = x + frame_width / 2

    background.extend(
        [
            vertical_arrow(center_x, frame_y + frame_height, 232),
            vertical_arrow(center_x, 296, 320),
            vertical_arrow(center_x, 392, 416),
            vertical_arrow(center_x, 480, 504),
            vertical_arrow(center_x, 568, 592),
            vertical_arrow(center_x, 656, 680),
        ]
    )

    foreground.append(rect(x, frame_y, frame_width, frame_height, fill="none", stroke=BLACK, dasharray="8 8"))
    foreground.append(text_block(x + 8, frame_y + 8, [make_line("Inputs and canonical context", weight="700")]))
    foreground.append(box(x + 24, frame_y + 48, 192, WHITE, [make_line("Rough source"), make_line("diagram")], icon_name="Document.svg", height=64))
    foreground.append(box(x + 232, frame_y + 48, 192, GREY, [make_line("Local refs"), make_line("+ outputs")], icon_name="Document with Magnifying glass.svg", height=64))
    foreground.append(
        box(
            x + 440,
            frame_y + 48,
            192,
            BLACK,
            [make_line("DIAGRAM.md", weight="700", fill=WHITE), make_line("canonical spec", fill=WHITE)],
            icon_name="Book with Magnifying glass.svg",
            text_fill=WHITE,
            icon_fill=WHITE,
            height=64,
        )
    )
    foreground.append(
        text_block(
            x + 8,
            frame_y + 136,
            [make_line("Next: ingest typography, spacing, and grid specs into this spec layer.", fill=HELPER)],
        )
    )
    foreground.append(
        box(
            x,
            232,
            frame_width,
            BLACK,
            [make_line("Diagram redraw", weight="700", fill=WHITE), make_line("skill", fill=WHITE)],
            icon_name="Wrench 1.svg",
            text_fill=WHITE,
            icon_fill=WHITE,
            height=64,
        )
    )
    foreground.append(
        box(
            x,
            320,
            frame_width,
            WHITE,
            [make_line("Repo generators", weight="700"), make_line("shared tokens + library", fill=HELPER)],
            icon_name="Screen with code.svg",
            height=72,
        )
    )
    foreground.append(
        box(
            x,
            416,
            frame_width,
            BLACK,
            [make_line("Build + validate", weight="700", fill=WHITE), make_line("skill", fill=WHITE)],
            icon_name="Rosette with check.svg",
            text_fill=WHITE,
            icon_fill=WHITE,
            height=64,
        )
    )
    foreground.append(
        box(
            x,
            504,
            frame_width,
            GREY,
            [make_line("Compare + review lane", weight="700"), make_line("before / agent / refined", fill=HELPER)],
            icon_name="Document with Magnifying glass.svg",
            height=64,
        )
    )
    foreground.append(
        box(
            x,
            592,
            frame_width,
            BLACK,
            [make_line("Protected draw.io", weight="700", fill=WHITE), make_line("review skill", fill=WHITE)],
            icon_name="Design.svg",
            text_fill=WHITE,
            icon_fill=WHITE,
            height=64,
        )
    )
    foreground.append(
        box(
            x,
            680,
            frame_width,
            WHITE,
            [make_line("Editable draw.io +", weight="700"), make_line("SVG outputs"), make_line("ready for token ingest", fill=HELPER)],
            icon_name="Storage image.svg",
            height=72,
        )
    )

    parts.extend(background)
    parts.extend(foreground)
    write_svg(SVG_DIR / "diagram-language-workflow-onbrand.svg", parts)


def build_rise_of_inference_economy() -> None:
    width = 912
    height = 792
    parts = svg_open(width, height)
    background: list[str] = []
    foreground: list[str] = []

    background.extend(
        [
            vertical_arrow(236, 184, 208),
            vertical_arrow(676, 184, 208),
            horizontal_arrow(440, 240, 472),
            vertical_arrow(456, 672, 696),
        ]
    )

    foreground.append(
        box(
            32,
            32,
            848,
            WHITE,
            [make_line("The rise of the inference economy", weight="700")],
            icon_name="Cloud.svg",
            height=64,
        )
    )

    foreground.append(box(32, 120, 408, GREY, [make_line("Training", weight="700")], icon_name="AI.svg"))
    foreground.append(
        box(
            472,
            120,
            408,
            BLACK,
            [make_line("Inference", weight="700", fill=WHITE)],
            icon_name="CPU.svg",
            text_fill=WHITE,
            icon_fill=WHITE,
        )
    )
    foreground.append(
        box(
            32,
            208,
            408,
            WHITE,
            [make_line("Costly & episodic"), make_line("High investment", fill=HELPER)],
            icon_name="Finance.svg",
        )
    )
    foreground.append(
        box(
            472,
            208,
            408,
            WHITE,
            [make_line("Constant & demand-driven"), make_line("Ongoing expense", fill=HELPER)],
            icon_name="Server.svg",
        )
    )

    foreground.append(box(32, 320, 408, GREY, [make_line("Always-on compute", weight="700")], icon_name="Globe.svg"))
    foreground.append(box(472, 320, 408, GREY, [make_line("Revenue impact", weight="700")], icon_name="Financial data.svg"))
    foreground.append(box(32, 416, 192, WHITE, [make_line("Data centers")], icon_name="Server.svg"))
    foreground.append(box(248, 416, 192, WHITE, [make_line("Edge devices")], icon_name="Mobile.svg"))
    foreground.append(box(32, 504, 408, WHITE, [make_line("Local AI")], icon_name="AI.svg"))
    foreground.append(box(472, 416, 192, WHITE, [make_line("Latency down")], icon_name="Gauge.svg"))
    foreground.append(box(688, 416, 192, WHITE, [make_line("Tokens/sec up")], icon_name="Scale up.svg"))
    foreground.append(box(472, 504, 192, WHITE, [make_line("Efficiency up")], icon_name="Line chart with check.svg"))
    foreground.append(box(688, 504, 192, WHITE, [make_line("Optimization"), make_line("& scale")], icon_name="Line chart with commerce.svg", height=72))

    foreground.append(box(32, 608, 848, GREY, [make_line("From training focused to inference focused", weight="700")]))
    foreground.append(box(32, 696, 848, WHITE, [make_line("Performance & cost efficiency", weight="700")]))

    parts.extend(background)
    parts.extend(foreground)
    write_svg(SVG_DIR / "rise-of-inference-economy-onbrand.svg", parts)


def build_logic_data_vram() -> None:
    # -- Grid tokens --
    col_width = BLOCK_WIDTH  # 192
    col_gap = COMPACT_GAP    # 8
    inset = INSET             # 8
    row_gap = COMPACT_GAP     # 8

    # Box heights (inside-out)
    h_text_1 = tight_box_height([make_line("x")])                           # 36 (1-line, no icon)
    h_icon_1 = tight_box_height([make_line("x")], has_icon=True)            # 64 (1-line + icon)
    heading_h = tight_box_height([make_line("x", weight="700")])            # 36

    # -- Top panels: "Logic + data conflict" and "AI inference" --
    # Left panel: col0 has 1 icon box, col1 has 3 text-only boxes
    left_grid = panel_grid(
        cols=2, rows=3,
        col_width=col_width, col_gap=col_gap, row_gap=row_gap,
        heading_height=heading_h, heading_gap=row_gap,
        row_heights=[h_icon_1, h_text_1, h_icon_1],
    )
    # Right panel: col0 has 3 icon boxes, col1 has 2 icon boxes (rows 0 and 2)
    right_grid = panel_grid(
        cols=2, rows=3,
        col_width=col_width, col_gap=col_gap, row_gap=row_gap,
        heading_height=heading_h, heading_gap=row_gap,
        row_heights=[h_icon_1, h_icon_1, h_icon_1],
    )

    panel_gap = GRID_GUTTER  # 24
    outer = OUTER_MARGIN     # 24

    left_x = outer
    left_y = outer
    right_x = left_x + left_grid["width"] + panel_gap
    right_y = outer

    # -- Bottom panel: "VRAM fragmentation" --
    vram_bar_h = 32
    vram_rows = 3  # full bar, split bar, fragment bar
    vram_heading_h = heading_h
    sub_panel_w = col_width * 2 + col_gap  # 392
    sub_panel_h = round_up_to_grid(
        inset + vram_heading_h + row_gap
        + vram_rows * vram_bar_h + (vram_rows - 1) * row_gap
        + inset
    )
    helper_line_h = BODY_LINE_STEP  # 24
    vram_outer_h = round_up_to_grid(
        inset + heading_h + row_gap
        + sub_panel_h + row_gap
        + helper_line_h + inset
    )
    vram_outer_w = round_up_to_grid(
        inset + sub_panel_w + panel_gap + sub_panel_w + inset
    )
    helper_below_top = max(left_grid["height"], right_grid["height"]) + 2 * helper_line_h + row_gap
    vram_y = outer + round_up_to_grid(helper_below_top + panel_gap)
    vram_x = outer

    # Total canvas
    width = round_up_to_grid(outer + max(
        left_grid["width"] + panel_gap + right_grid["width"],
        vram_outer_w,
    ) + outer)
    height = round_up_to_grid(vram_y + vram_outer_h + outer)

    parts = svg_open(width, height)
    background: list[str] = []
    foreground: list[str] = []

    # ── Left panel: Logic + data conflict ──
    lc = [left_x + cx for cx in left_grid["col_xs"]]
    lr = [left_y + ry for ry in left_grid["row_ys"]]

    foreground.append(rect(left_x, left_y, left_grid["width"], left_grid["height"]))
    foreground.append(text_block(left_x + inset, left_y + inset, [make_line("Logic + data conflict", weight="700")]))

    foreground.append(box(lc[0], lr[0], col_width, GREY, [make_line("CPU")], icon_name="CPU.svg", height=h_icon_1))
    foreground.append(box(lc[1], lr[0], col_width, WHITE, [make_line("Logic")], height=h_text_1))
    foreground.append(box(lc[1], lr[1], col_width, WHITE, [make_line("Logic")], height=h_text_1))
    foreground.append(box(lc[1], lr[2], col_width, GREY, [make_line("Memory")], icon_name="Memory.svg", height=h_icon_1))

    # Helper text below left panel
    foreground.append(text_block(lc[0], left_y + left_grid["height"] + row_gap,
                                 [make_line("Logic with optional data.", fill=HELPER)]))
    foreground.append(text_block(lc[1], left_y + left_grid["height"] + row_gap,
                                 [make_line("Optional data can stay separate.", fill=HELPER)]))

    # ── Right panel: AI inference ──
    rc = [right_x + cx for cx in right_grid["col_xs"]]
    rr = [right_y + ry for ry in right_grid["row_ys"]]

    foreground.append(rect(right_x, right_y, right_grid["width"], right_grid["height"]))
    foreground.append(text_block(right_x + inset, right_y + inset, [make_line("AI inference", weight="700")]))

    foreground.append(box(rc[0], rr[0], col_width, WHITE, [make_line("Logic")], icon_name="AI.svg", height=h_icon_1))
    foreground.append(box(rc[0], rr[1], col_width, GREY, [make_line("Data")], icon_name="Data.svg", height=h_icon_1))
    foreground.append(box(rc[0], rr[2], col_width, WHITE, [make_line("CPU")], icon_name="CPU.svg", height=h_icon_1))
    foreground.append(box(rc[1], rr[0], col_width, WHITE, [make_line("Data")], icon_name="Data.svg", height=h_icon_1))
    foreground.append(box(rc[1], rr[2], col_width, GREY, [make_line("Memory")], icon_name="Memory.svg", height=h_icon_1))

    # Orange arrows inside right panel (flow from Logic→Data2, Data→CPU, Data2→Memory)
    background.append(vertical_arrow(rc[0] + col_width // 2, rr[0] + h_icon_1, rr[1]))
    background.append(vertical_arrow(rc[0] + col_width // 2, rr[1] + h_icon_1, rr[2]))
    background.append(vertical_arrow(rc[1] + col_width // 2, rr[0] + h_icon_1, rr[2]))

    # Helper text below right panel
    foreground.append(text_block(rc[0], right_y + right_grid["height"] + row_gap,
                                 [make_line("Logic inseparable from data.", fill=HELPER)]))

    # ── Bottom panel: VRAM fragmentation ──
    foreground.append(rect(vram_x, vram_y, vram_outer_w, vram_outer_h))
    foreground.append(text_block(vram_x + inset, vram_y + inset, [make_line("VRAM fragmentation", weight="700")]))

    # Sub-panel positions
    sp_y = vram_y + inset + heading_h + row_gap
    frag_x = vram_x + inset
    packed_x = frag_x + sub_panel_w + panel_gap

    # Bar row y-positions inside sub-panels
    bar_y0 = inset + vram_heading_h + row_gap
    bar_y1 = bar_y0 + vram_bar_h + row_gap
    bar_y2 = bar_y1 + vram_bar_h + row_gap
    bar_inner_w = sub_panel_w - 2 * inset  # 376

    # Fragmented layout sub-panel
    foreground.append(rect(frag_x, sp_y, sub_panel_w, sub_panel_h, fill=GREY))
    foreground.append(text_block(frag_x + inset, sp_y + inset, [make_line("Fragmented layout", weight="700")]))
    foreground.append(icon_group(frag_x + sub_panel_w - inset - ICON_SIZE, sp_y + inset, "RAM.svg"))
    foreground.append(rect(frag_x + inset, sp_y + bar_y0, bar_inner_w, vram_bar_h))
    foreground.append(text_block(frag_x + inset + inset, sp_y + bar_y0 + 6, [make_line("10 GB")]))
    foreground.append(rect(frag_x + inset, sp_y + bar_y1, bar_inner_w, vram_bar_h))
    foreground.append(text_block(frag_x + inset + inset, sp_y + bar_y1 + 6, [make_line("6 GB context cache")]))
    # Fragment chunks
    chunk_y = sp_y + bar_y2
    foreground.append(rect(frag_x + inset, chunk_y, 72, vram_bar_h))
    foreground.append(rect(frag_x + inset + 80, chunk_y, 56, vram_bar_h, fill=GREY))
    foreground.append(rect(frag_x + inset + 144, chunk_y, 88, vram_bar_h))
    foreground.append(rect(frag_x + inset + 240, chunk_y, 40, vram_bar_h, fill=GREY))
    foreground.append(rect(frag_x + inset + 288, chunk_y, 88, vram_bar_h))
    # Helper below fragmented
    foreground.append(text_block(frag_x + inset, sp_y + sub_panel_h + row_gap,
                                 [make_line("Fragmented allocations leave gaps.", fill=HELPER)]))
    foreground.append(text_block(frag_x + inset, sp_y + sub_panel_h + row_gap + helper_line_h,
                                 [make_line("GPU", fill=HELPER)]))

    # Packed layout sub-panel
    foreground.append(rect(packed_x, sp_y, sub_panel_w, sub_panel_h, fill=GREY))
    foreground.append(text_block(packed_x + inset, sp_y + inset, [make_line("Packed layout", weight="700")]))
    foreground.append(icon_group(packed_x + sub_panel_w - inset - ICON_SIZE, sp_y + inset, "Memory.svg"))
    foreground.append(rect(packed_x + inset, sp_y + bar_y0, bar_inner_w, vram_bar_h))
    foreground.append(text_block(packed_x + inset + inset, sp_y + bar_y0 + 6, [make_line("24 GB GPU memory")]))
    # Split row
    foreground.append(rect(packed_x + inset, sp_y + bar_y1, 70, vram_bar_h))
    foreground.append(text_block(packed_x + inset + inset, sp_y + bar_y1 + 6, [make_line("9 GB")]))
    foreground.append(rect(packed_x + inset + 78, sp_y + bar_y1, 110, vram_bar_h, fill=GREY))
    foreground.append(text_block(packed_x + inset + 78 + inset, sp_y + bar_y1 + 6, [make_line("Alloc")]))
    foreground.append(rect(packed_x + inset + 196, sp_y + bar_y1, bar_inner_w - 196, vram_bar_h))
    # Bottom row
    foreground.append(rect(packed_x + inset, sp_y + bar_y2, 220, vram_bar_h, fill=GREY))
    foreground.append(rect(packed_x + inset + 228, sp_y + bar_y2, bar_inner_w - 228, vram_bar_h))
    foreground.append(text_block(packed_x + inset + 228 + inset, sp_y + bar_y2 + 6, [make_line("8 GB model")]))
    # Helper below packed
    foreground.append(text_block(packed_x + inset, sp_y + sub_panel_h + row_gap,
                                 [make_line("860 B free", fill=HELPER)]))
    foreground.append(text_block(packed_x + inset, sp_y + sub_panel_h + row_gap + helper_line_h,
                                 [make_line("GPU", fill=HELPER)]))

    # Arrow between sub-panels
    arrow_y = sp_y + bar_y1 + vram_bar_h // 2
    background.append(horizontal_arrow(frag_x + sub_panel_w, arrow_y, packed_x))

    # Fragmentation icon between sub-panels
    foreground.append(icon_group(frag_x + sub_panel_w + (panel_gap - ICON_SIZE) // 2, arrow_y - ICON_SIZE // 2 + 12, "Fragmentation.svg"))

    parts.extend(background)
    parts.extend(foreground)
    write_svg(SVG_DIR / "logic-data-vram-onbrand.svg", parts)


def build_attention_qkv() -> None:
    width = 1776
    height = 1112
    parts = svg_open(width, height)
    background: list[str] = []
    foreground: list[str] = []

    left_x = 48
    right_x = 912
    top_y = 48
    lower_y = 600

    # Query panel
    foreground.append(text_block(left_x, top_y, [make_line('The query (Q): the "question"', weight="700")]))
    foreground.append(matrix_group(144, 96, "Q"))
    background.append(vertical_arrow(168, 144, 184))
    foreground.append(box(left_x, 184, 240, GREY, [make_line("Ubuntu:")]))
    foreground.append(
        text_block(
            312,
            192,
            [
                make_line("I am a noun at the start of a", fill=HELPER),
                make_line("sentence followed by a colon.", fill=HELPER),
            ],
        )
    )
    foreground.append(
        text_block(
            left_x,
            280,
            [
                make_line("I am a noun at the start of a sentence followed", fill=HELPER),
                make_line("by a colon. I am likely a subject being defined.", fill=HELPER),
                make_line("What in this sentence explains what I am?", fill=HELPER),
            ],
        )
    )

    # Keys panel
    foreground.append(text_block(right_x, top_y, [make_line('The keys (K): the "advertisements"', weight="700")]))
    foreground.append(matrix_group(1296, 96, "K"))
    background.append(line(1320, 144, 1320, 160, stroke=ORANGE))
    background.append(line(1008, 160, 1632, 160, stroke=ORANGE))
    for center_x in (1008, 1216, 1424, 1632):
        background.append(vertical_arrow(center_x, 160, 184))
    foreground.append(box(912, 184, 192, BLACK, [make_line("Linux", fill=WHITE)], text_fill=WHITE))
    foreground.append(box(1120, 184, 192, WHITE, [make_line("for")]))
    foreground.append(box(1328, 184, 192, GREY, [make_line("human")]))
    foreground.append(box(1536, 184, 192, WHITE, [make_line("beings")]))
    foreground.append(
        text_block(
            912,
            280,
            [
                make_line("I am a technical", fill=HELPER),
                make_line("OS kernel", fill=HELPER),
                make_line("category.", fill=HELPER),
            ],
        )
    )
    foreground.append(
        text_block(
            1120,
            280,
            [
                make_line("I am a preposition", fill=HELPER),
                make_line("indicating a target", fill=HELPER),
                make_line("audience.", fill=HELPER),
            ],
        )
    )
    foreground.append(
        text_block(
            1328,
            280,
            [
                make_line("I am the adjective", fill=HELPER),
                make_line("that narrows the", fill=HELPER),
                make_line("species or type.", fill=HELPER),
            ],
        )
    )
    foreground.append(
        text_block(
            1536,
            280,
            [
                make_line("I am the plural noun,", fill=HELPER),
                make_line("the object of the", fill=HELPER),
                make_line("audience.", fill=HELPER),
            ],
        )
    )

    # Match panel
    foreground.append(text_block(left_x, lower_y, [make_line('The match (QK^T): the "relevance check"', weight="700")]))
    foreground.append(matrix_group(432, 648, "QK"))
    background.append(line(456, 696, 456, 720, stroke=ORANGE))
    background.append(line(144, 720, 768, 720, stroke=ORANGE))
    for center_x in (144, 352, 560, 768):
        background.append(vertical_arrow(center_x, 720, 744))
    foreground.append(box(48, 744, 192, BLACK, [make_line("Linux", fill=WHITE)], text_fill=WHITE))
    foreground.append(box(256, 744, 192, WHITE, [make_line("for")]))
    foreground.append(box(464, 744, 192, GREY, [make_line("human")]))
    foreground.append(box(672, 744, 192, WHITE, [make_line("beings")]))
    foreground.append(
        text_block(
            48,
            840,
            [
                make_line("Best semantic match:", fill=HELPER),
                make_line("the likely subject", fill=HELPER),
                make_line("being defined.", fill=HELPER),
            ],
        )
    )
    foreground.append(
        text_block(
            256,
            840,
            [
                make_line("Relevant as context,", fill=HELPER),
                make_line("but not the thing", fill=HELPER),
                make_line("being defined.", fill=HELPER),
            ],
        )
    )
    foreground.append(
        text_block(
            464,
            840,
            [
                make_line("Useful modifier,", fill=HELPER),
                make_line("but not stronger than", fill=HELPER),
                make_line("the main noun.", fill=HELPER),
            ],
        )
    )
    foreground.append(
        text_block(
            672,
            840,
            [
                make_line("Part of the phrase,", fill=HELPER),
                make_line("yet less direct than", fill=HELPER),
                make_line("the kernel word.", fill=HELPER),
            ],
        )
    )
    legend_y = 1008
    legend_items = [
        (80, "Low", WHITE),
        (212, "Medium", GREY),
        (388, "High", BLACK),
    ]
    for cx, label, fill in legend_items:
        foreground.append(circle(cx, legend_y, 12, fill=fill))
        foreground.append(text_block(cx + 20, legend_y - 8, [make_line(label, fill=HELPER)]))

    # Value panel
    foreground.append(text_block(right_x, lower_y, [make_line('The value (V): the "knowledge transfer"', weight="700")]))
    foreground.append(matrix_group(912, 648, "Q"))
    foreground.append(matrix_group(1136, 648, "K"))
    background.append(vertical_arrow(936, 696, 744))
    background.append(vertical_arrow(1160, 696, 744))
    foreground.append(box(912, 744, 192, GREY, [make_line("Ubuntu:")]))
    foreground.append(box(1136, 744, 192, BLACK, [make_line("Linux", fill=WHITE)], text_fill=WHITE))
    background.append(horizontal_arrow(1104, 776, 1136))
    foreground.append(
        text_block(
            1360,
            752,
            [
                make_line('Strongest meaning comes from "Linux",', fill=HELPER),
                make_line('with extra audience context from', fill=HELPER),
                make_line('"human beings".', fill=HELPER),
            ],
        )
    )
    background.append(vertical_arrow(1232, 808, 848))
    foreground.append(box(960, 848, 336, GREY, [make_line("Value transfer (V)", weight="700")]))
    foreground.append(
        text_block(
            912,
            944,
            [
                make_line('Now that the model knows "Linux" is the most relevant', fill=HELPER),
                make_line('word, it takes the value step to transfer the actual', fill=HELPER),
                make_line('semantic meaning of "Linux" and "human beings" into', fill=HELPER),
                make_line('the representation of "Ubuntu".', fill=HELPER),
            ],
        )
    )

    parts.extend(background)
    parts.extend(foreground)
    write_svg(SVG_DIR / "attention-qkv-onbrand.svg", parts)


def main() -> None:
    SVG_DIR.mkdir(parents=True, exist_ok=True)
    build_attention_qkv()
    build_service_placement_map()
    build_node_network_connectivity()
    build_memory_wall()
    build_request_to_hardware_stack()
    build_inference_snaps()
    build_inference_snaps_dense()
    build_rise_of_inference_economy()
    build_gpu_waiting()
    build_diagram_intake_workflow()
    build_diagram_language_workflow()
    build_logic_data_vram()


if __name__ == "__main__":
    main()
