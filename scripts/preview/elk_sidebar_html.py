"""Server-rendered ELK sidebar controls (mirrors elk-layout-controls.js fallback specs)."""

from __future__ import annotations

import html

# (group, key, label, kind, default, min, max, step)
_ELk_NUMBERS = [
    ("Spacing", "elk.layered.spacing.nodeNodeBetweenLayers", "Layer gap", "144", 8, 512, 8),
    ("Spacing", "elk.spacing.nodeNode", "Same-layer gap", "48", 8, 256, 8),
    ("Spacing", "elk.spacing.edgeNode", "Edge ↔ node", "56", 0, 128, 4),
    ("Spacing", "elk.spacing.edgeEdge", "Edge ↔ edge", "48", 0, 128, 4),
    ("Spacing", "elk.layered.spacing.edgeEdgeBetweenLayers", "Edge gap (layers)", "40", 0, 128, 4),
]

_ELk_ENUMS: dict[str, list[tuple[str, str]]] = {
    "elk.direction": [
        ("DOWN", "Top → bottom (TB)"),
        ("RIGHT", "Left → right (LR)"),
        ("UP", "Bottom → top"),
        ("LEFT", "Right → left"),
    ],
    "elk.edgeRouting": [
        ("ORTHOGONAL", "Orthogonal"),
        ("POLYLINE", "Polyline"),
        ("SPLINES", "Splines"),
    ],
    "elk.layered.layering.strategy": [
        ("NETWORK_SIMPLEX", "Network simplex"),
        ("LONGEST_PATH", "Longest path"),
        ("INTERACTIVE", "Interactive"),
    ],
    "elk.layered.crossingMinimization.strategy": [
        ("LAYER_SWEEP", "Layer sweep"),
        ("INTERACTIVE", "Interactive"),
    ],
    "elk.layered.nodePlacement.strategy": [
        ("NETWORK_SIMPLEX", "Network simplex"),
        ("BRANDES_KOEPF", "Brandes-Köpf"),
        ("LINEAR_SEGMENTS", "Linear segments"),
        ("SIMPLE", "Simple"),
    ],
    "elk.hierarchyHandling": [
        ("INCLUDE_CHILDREN", "Include children"),
        ("SEPARATE_CHILDREN", "Separate children"),
        ("CHILDREN_ON", "Children on"),
    ],
    "elk.portConstraints": [
        ("FREE", "Free"),
        ("FIXED_SIDE", "Fixed side"),
        ("FIXED_ORDER", "Fixed order"),
        ("FIXED_RATIO", "Fixed ratio"),
    ],
}

_ELk_BOOLS = [
    ("Edges", "elk.layered.unnecessaryBendpoints", "Remove extra bends", "true"),
    ("Edges", "elk.layered.nodePlacement.favorStraightEdges", "Favor straight edges", "true"),
]

_ELk_TEXT = [
    ("Compound", "elk.padding", "Compound padding", "[top=32,left=8,bottom=8,right=8]"),
]


def _control_id(key: str) -> str:
    return "elk-" + key.replace(".", "-")


def _field_number(key: str, label: str, value: str, min_v: int, max_v: int, step: int) -> str:
    cid = _control_id(key)
    return (
        f'<label class="bf-field dg-grid-field is-full-span">'
        f'<span class="bf-form-label">{html.escape(label)}</span>'
        f'<span class="bf-control dg-grid-control">'
        f'<input class="bf-input dg-number-input" type="number" id="{cid}" data-elk-key="{html.escape(key)}" '
        f'value="{html.escape(value)}" min="{min_v}" max="{max_v}" step="{step}">'
        f'<span class="dg-grid-unit">px</span></span></label>'
    )


def _field_enum(key: str, label: str, value: str, options: list[tuple[str, str]]) -> str:
    cid = _control_id(key)
    opts = "".join(
        f'<option value="{html.escape(v)}"{" selected" if v == value else ""}>{html.escape(lbl)}</option>'
        for v, lbl in options
    )
    return (
        f'<label class="bf-field dg-grid-field is-full-span">'
        f'<span class="bf-form-label">{html.escape(label)}</span>'
        f'<span class="bf-control dg-grid-control">'
        f'<select class="bf-input" id="{cid}" data-elk-key="{html.escape(key)}">{opts}</select>'
        f"</span></label>"
    )


def _field_bool(key: str, label: str, value: str) -> str:
    cid = _control_id(key)
    checked = " checked" if value == "true" else ""
    return (
        f'<label class="bf-switch is-full-span">'
        f'<input class="bf-switch-input" type="checkbox" id="{cid}" data-elk-key="{html.escape(key)}"{checked}>'
        f'<span class="bf-switch-slider"></span>'
        f'<span class="bf-switch-label">{html.escape(label)}</span>'
        f"</label>"
    )


def _field_text(key: str, label: str, value: str) -> str:
    cid = _control_id(key)
    return (
        f'<label class="bf-field dg-grid-field is-full-span">'
        f'<span class="bf-form-label">{html.escape(label)}</span>'
        f'<span class="bf-control dg-grid-control">'
        f'<input class="bf-input dg-number-input" type="text" id="{cid}" data-elk-key="{html.escape(key)}" '
        f'value="{html.escape(value)}"></span></label>'
    )


def render_elk_layout_controls_html(overrides: dict[str, str] | None = None) -> str:
    """Render BF sidebar fields for ELK layered layout."""
    ov = overrides or {}
    groups: dict[str, list[str]] = {}

    def add(group: str, fragment: str) -> None:
        groups.setdefault(group, []).append(fragment)

    add("Graph", _field_enum("elk.direction", "Direction", ov.get("elk.direction", "DOWN"), _ELk_ENUMS["elk.direction"]))
    for group, key, label, default, min_v, max_v, step in _ELk_NUMBERS:
        add(group, _field_number(key, label, ov.get(key, default), min_v, max_v, step))
    add("Edges", _field_enum("elk.edgeRouting", "Edge routing", ov.get("elk.edgeRouting", "ORTHOGONAL"), _ELk_ENUMS["elk.edgeRouting"]))
    for group, key, label, default in _ELk_BOOLS:
        add(group, _field_bool(key, label, ov.get(key, default)))
    add("Layering", _field_enum(
        "elk.layered.layering.strategy", "Layering strategy",
        ov.get("elk.layered.layering.strategy", "NETWORK_SIMPLEX"),
        _ELk_ENUMS["elk.layered.layering.strategy"],
    ))
    add("Layering", _field_enum(
        "elk.layered.crossingMinimization.strategy", "Crossing minimization",
        ov.get("elk.layered.crossingMinimization.strategy", "LAYER_SWEEP"),
        _ELk_ENUMS["elk.layered.crossingMinimization.strategy"],
    ))
    add("Layering", _field_enum(
        "elk.layered.nodePlacement.strategy", "Node placement",
        ov.get("elk.layered.nodePlacement.strategy", "NETWORK_SIMPLEX"),
        _ELk_ENUMS["elk.layered.nodePlacement.strategy"],
    ))
    add("Compound", _field_enum(
        "elk.hierarchyHandling", "Hierarchy handling",
        ov.get("elk.hierarchyHandling", "INCLUDE_CHILDREN"),
        _ELk_ENUMS["elk.hierarchyHandling"],
    ))
    add("Compound", _field_enum(
        "elk.portConstraints", "Port constraints",
        ov.get("elk.portConstraints", "FREE"),
        _ELk_ENUMS["elk.portConstraints"],
    ))
    for group, key, label, default in _ELk_TEXT:
        add(group, _field_text(key, label, ov.get(key, default)))

    order = ["Graph", "Spacing", "Edges", "Layering", "Compound"]
    parts: list[str] = []
    for group in order:
        if group not in groups:
            continue
        parts.append(f'<h3 class="dg-section-subheading bf-h6">{html.escape(group)}</h3>')
        parts.append('<div class="grid-controls">')
        parts.extend(groups[group])
        parts.append("</div>")
    return "\n".join(parts)
