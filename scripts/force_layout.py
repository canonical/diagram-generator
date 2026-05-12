# Copyright 2024 Mike Bostock
# Copyright 2026 Lyubomir Popov
#
# Permission to use, copy, modify, and/or distribute this software for any
# purpose with or without fee is hereby granted, provided that the above
# copyright notice and this permission notice appear in all copies.
#
# THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
# WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
# MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
# ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
# WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
# ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
# OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
#
# Ported from d3-force (https://github.com/d3/d3-force) by Mike Bostock.
# Rectangle collision adapted from the original circle-based algorithm.
"""Force-directed layout engine, ported from d3-force.

This is a literal translation of the D3 velocity Verlet simulation into
Python, adapted for rectangular diagram nodes.  No external dependencies
beyond the Python standard library.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

# ---------------------------------------------------------------------------
# diagram_model import (deferred to integration section at bottom)
# ---------------------------------------------------------------------------

BASELINE_UNIT = 8  # 8px grid snap


# ── lcg.js ────────────────────────────────────────────────────────────────
# https://en.wikipedia.org/wiki/Linear_congruential_generator#Parameters_in_common_use

_LCG_A = 1664525
_LCG_C = 1013904223
_LCG_M = 4294967296  # 2**32


def lcg() -> Callable[[], float]:
    """Deterministic linear congruential generator.  Returns a callable
    that yields successive pseudo-random floats in [0, 1)."""
    s = 1

    def _next() -> float:
        nonlocal s
        s = (_LCG_A * s + _LCG_C) % _LCG_M
        return s / _LCG_M

    return _next


# ── jiggle.js ─────────────────────────────────────────────────────────────

def jiggle(random: Callable[[], float]) -> float:
    """Tiny random displacement to break ties between coincident nodes."""
    return (random() - 0.5) * 1e-6


# ── Node / Link dataclasses ──────────────────────────────────────────────

@dataclass
class ForceNode:
    """A node in the force simulation.

    ``x``/``y`` are the centre of the node.  ``width``/``height`` are used
    by the rectangle-collide force.  ``fx``/``fy`` pin the node when set.
    """
    index: int = 0
    x: float = 0.0
    y: float = 0.0
    vx: float = 0.0
    vy: float = 0.0
    fx: Optional[float] = None
    fy: Optional[float] = None
    # Rectangle dimensions (for collision)
    width: float = 192.0
    height: float = 64.0
    # Back-reference to the source diagram component (set by integration)
    component_id: str = ""


@dataclass
class ForceLink:
    """An edge in the force simulation."""
    index: int = 0
    source: Any = None  # ForceNode or int/str resolved during init
    target: Any = None
    # Back-reference
    arrow_index: int = -1


# ── Forces ────────────────────────────────────────────────────────────────


class ForceCenter:
    """Centering force — translates all nodes so their mean position
    equals (x, y).  Ported from d3-force/src/center.js."""

    def __init__(self, x: float = 0.0, y: float = 0.0) -> None:
        self._x = x
        self._y = y
        self._strength = 1.0
        self._nodes: list[ForceNode] = []

    def initialize(self, nodes: list[ForceNode], random: Callable) -> None:
        self._nodes = nodes

    def __call__(self, alpha: float) -> None:
        nodes = self._nodes
        n = len(nodes)
        if n == 0:
            return
        sx = sum(nd.x for nd in nodes)
        sy = sum(nd.y for nd in nodes)
        sx = (sx / n - self._x) * self._strength
        sy = (sy / n - self._y) * self._strength
        for nd in nodes:
            nd.x -= sx
            nd.y -= sy

    # -- Chainable setters (mirror D3 API) --

    def x(self, val: float) -> ForceCenter:
        self._x = val
        return self

    def y(self, val: float) -> ForceCenter:
        self._y = val
        return self

    def strength(self, val: float) -> ForceCenter:
        self._strength = val
        return self


class ForceManyBody:
    """Charge (many-body) force — naive O(n²) all-pairs version.

    Ported from d3-force/src/manyBody.js with the Barnes-Hut quadtree
    removed.  For diagram-scale graphs (<100 nodes) the naive approach
    is sufficient and avoids the quadtree dependency.
    """

    def __init__(self) -> None:
        self._strength_fn: Callable[[ForceNode, int, list[ForceNode]], float] = (
            lambda n, i, ns: -30.0
        )
        self._strengths: list[float] = []
        self._distance_min2 = 1.0
        self._distance_max2 = float("inf")
        self._nodes: list[ForceNode] = []
        self._random: Callable[[], float] = lcg()

    def initialize(self, nodes: list[ForceNode], random: Callable) -> None:
        self._nodes = nodes
        self._random = random
        self._init_strength()

    def _init_strength(self) -> None:
        nodes = self._nodes
        self._strengths = [
            self._strength_fn(nd, i, nodes) for i, nd in enumerate(nodes)
        ]

    def __call__(self, alpha: float) -> None:
        nodes = self._nodes
        n = len(nodes)
        strengths = self._strengths
        random = self._random
        dmin2 = self._distance_min2
        dmax2 = self._distance_max2

        for i in range(n):
            node = nodes[i]
            for j in range(n):
                if i == j:
                    continue
                other = nodes[j]
                dx = other.x - node.x
                dy = other.y - node.y
                l = dx * dx + dy * dy

                if l >= dmax2:
                    continue

                if dx == 0:
                    dx = jiggle(random)
                    l += dx * dx
                if dy == 0:
                    dy = jiggle(random)
                    l += dy * dy
                if l < dmin2:
                    l = math.sqrt(dmin2 * l)

                node.vx += dx * strengths[j] * alpha / l
                node.vy += dy * strengths[j] * alpha / l

    # -- Chainable setters --

    def strength(self, val: Any) -> ForceManyBody:
        if callable(val):
            self._strength_fn = val
        else:
            v = float(val)
            self._strength_fn = lambda n, i, ns: v
        self._init_strength()
        return self

    def distance_min(self, val: float) -> ForceManyBody:
        self._distance_min2 = val * val
        return self

    def distance_max(self, val: float) -> ForceManyBody:
        self._distance_max2 = val * val
        return self


class ForceCollideRect:
    """Rectangle collision force — O(n²) adaptation of d3-force/src/collide.js.

    The original D3 force uses circles and a quadtree.  This version
    uses axis-aligned rectangles (each node has ``width`` and ``height``)
    and a naive all-pairs check.

    Collision resolution pushes overlapping rectangles apart along the
    axis of least overlap, distributing displacement proportionally.
    """

    def __init__(self, padding: float = 0.0) -> None:
        self._padding = padding
        self._strength = 1.0
        self._iterations = 1
        self._nodes: list[ForceNode] = []
        self._random: Callable[[], float] = lcg()

    def initialize(self, nodes: list[ForceNode], random: Callable) -> None:
        self._nodes = nodes
        self._random = random

    def __call__(self, alpha: float) -> None:
        nodes = self._nodes
        n = len(nodes)
        strength = self._strength
        padding = self._padding
        random = self._random

        for _ in range(self._iterations):
            for i in range(n):
                ni = nodes[i]
                # Half-extents including padding
                hw_i = ni.width / 2 + padding
                hh_i = ni.height / 2 + padding
                xi = ni.x + ni.vx
                yi = ni.y + ni.vy

                for j in range(i + 1, n):
                    nj = nodes[j]
                    hw_j = nj.width / 2 + padding
                    hh_j = nj.height / 2 + padding
                    xj = nj.x + nj.vx
                    yj = nj.y + nj.vy

                    dx = xi - xj
                    dy = yi - yj

                    # Overlap extents along each axis
                    overlap_x = (hw_i + hw_j) - abs(dx)
                    overlap_y = (hh_i + hh_j) - abs(dy)

                    if overlap_x > 0 and overlap_y > 0:
                        # Resolve along the axis of least penetration
                        if overlap_x < overlap_y:
                            if dx == 0:
                                dx = jiggle(random)
                            sign = 1.0 if dx > 0 else -1.0
                            push = overlap_x * strength * 0.5 * sign
                            ni.vx += push
                            nj.vx -= push
                        else:
                            if dy == 0:
                                dy = jiggle(random)
                            sign = 1.0 if dy > 0 else -1.0
                            push = overlap_y * strength * 0.5 * sign
                            ni.vy += push
                            nj.vy -= push

    # -- Chainable setters --

    def padding(self, val: float) -> ForceCollideRect:
        self._padding = val
        return self

    def strength(self, val: float) -> ForceCollideRect:
        self._strength = val
        return self

    def iterations(self, val: int) -> ForceCollideRect:
        self._iterations = val
        return self


class ForceLinkForce:
    """Spring force between linked nodes.
    Ported from d3-force/src/link.js."""

    def __init__(self, links: Optional[list[ForceLink]] = None) -> None:
        self._links: list[ForceLink] = links or []  # type: ignore[assignment]
        self._id_fn: Callable[[ForceNode, int, list[ForceNode]], Any] = (
            lambda d, i, ns: d.index
        )
        self._strength_fn: Optional[Callable] = None
        self._distance_fn: Callable = lambda l, i, ls: 30.0
        self._strengths: list[float] = []
        self._distances: list[float] = []
        self._bias: list[float] = []
        self._count: list[int] = []
        self._nodes: list[ForceNode] = []
        self._random: Callable[[], float] = lcg()
        self._iterations = 1

    def _default_strength(self, link: Any, i: int, links: list) -> float:
        return 1.0 / min(
            self._count[link.source.index],
            self._count[link.target.index],
        )

    def initialize(self, nodes: list[ForceNode], random: Callable) -> None:
        self._nodes = nodes
        self._random = random
        self._init_links()

    def _init_links(self) -> None:
        nodes = self._nodes
        if not nodes:
            return

        n = len(nodes)
        links = self._links
        m = len(links)

        node_by_id: dict[Any, ForceNode] = {}
        for i, nd in enumerate(nodes):
            node_by_id[self._id_fn(nd, i, nodes)] = nd

        self._count = [0] * n

        for i, lk in enumerate(links):
            lk.index = i
            if not isinstance(lk.source, ForceNode):
                lk.source = node_by_id[lk.source]
            if not isinstance(lk.target, ForceNode):
                lk.target = node_by_id[lk.target]
            self._count[lk.source.index] += 1
            self._count[lk.target.index] += 1

        self._bias = [0.0] * m
        for i, lk in enumerate(links):
            self._bias[i] = self._count[lk.source.index] / (
                self._count[lk.source.index] + self._count[lk.target.index]
            )

        strength_fn = self._strength_fn or self._default_strength
        self._strengths = [strength_fn(lk, i, links) for i, lk in enumerate(links)]
        self._distances = [self._distance_fn(lk, i, links) for i, lk in enumerate(links)]

    def __call__(self, alpha: float) -> None:
        links = self._links
        random = self._random

        for _ in range(self._iterations):
            for i, lk in enumerate(links):
                source: ForceNode = lk.source
                target: ForceNode = lk.target

                dx = target.x + target.vx - source.x - source.vx
                dy = target.y + target.vy - source.y - source.vy

                if dx == 0:
                    dx = jiggle(random)
                if dy == 0:
                    dy = jiggle(random)

                l = math.sqrt(dx * dx + dy * dy)
                l = (l - self._distances[i]) / l * alpha * self._strengths[i]
                dx *= l
                dy *= l

                b = self._bias[i]
                target.vx -= dx * b
                target.vy -= dy * b
                source.vx += dx * (1 - b)
                source.vy += dy * (1 - b)

    # -- Chainable setters --

    def links(self, val: list) -> ForceLinkForce:
        self._links = val
        self._init_links()
        return self

    def id(self, fn: Callable) -> ForceLinkForce:
        self._id_fn = fn
        return self

    def iterations(self, val: int) -> ForceLinkForce:
        self._iterations = val
        return self

    def strength(self, val: Any) -> ForceLinkForce:
        if callable(val):
            self._strength_fn = val
        else:
            v = float(val)
            self._strength_fn = lambda l, i, ls: v
        if self._nodes:
            self._strengths = [
                (self._strength_fn or self._default_strength)(lk, i, self._links)
                for i, lk in enumerate(self._links)
            ]
        return self

    def distance(self, val: Any) -> ForceLinkForce:
        if callable(val):
            self._distance_fn = val
        else:
            v = float(val)
            self._distance_fn = lambda l, i, ls: v
        if self._nodes:
            self._distances = [
                self._distance_fn(lk, i, self._links)
                for i, lk in enumerate(self._links)
            ]
        return self


# ── Simulation ────────────────────────────────────────────────────────────


class ForceSimulation:
    """Velocity Verlet force simulation.
    Ported from d3-force/src/simulation.js.

    Browser-specific features (d3-dispatch events, d3-timer) are removed.
    Instead, call ``tick()`` manually or use ``run()`` to iterate until
    the simulation settles.
    """

    _INITIAL_RADIUS = 10
    _INITIAL_ANGLE = math.pi * (3 - math.sqrt(5))

    def __init__(self, nodes: Optional[list[ForceNode]] = None) -> None:
        self._nodes: list[ForceNode] = nodes or []
        self._alpha = 1.0
        self._alpha_min = 0.001
        self._alpha_decay = 1 - math.pow(self._alpha_min, 1 / 300)
        self._alpha_target = 0.0
        self._velocity_decay = 0.6
        self._forces: dict[str, Any] = {}
        self._random = lcg()
        self._initialize_nodes()

    # -- Node initialisation (d3 initializeNodes) --

    def _initialize_nodes(self) -> None:
        for i, node in enumerate(self._nodes):
            node.index = i
            if node.fx is not None:
                node.x = node.fx
            if node.fy is not None:
                node.y = node.fy
            if math.isnan(node.x) or math.isnan(node.y):
                radius = self._INITIAL_RADIUS * math.sqrt(0.5 + i)
                angle = i * self._INITIAL_ANGLE
                node.x = radius * math.cos(angle)
                node.y = radius * math.sin(angle)
            if math.isnan(node.vx) or math.isnan(node.vy):
                node.vx = node.vy = 0.0

    def _initialize_force(self, force: Any) -> Any:
        if hasattr(force, "initialize"):
            force.initialize(self._nodes, self._random)
        return force

    # -- Core tick (d3 simulation.tick) --

    def tick(self, iterations: int = 1) -> ForceSimulation:
        """Advance the simulation by *iterations* steps."""
        for _ in range(iterations):
            self._alpha += (self._alpha_target - self._alpha) * self._alpha_decay

            for force in self._forces.values():
                force(self._alpha)

            for node in self._nodes:
                if node.fx is None:
                    node.vx *= self._velocity_decay
                    node.x += node.vx
                else:
                    node.x = node.fx
                    node.vx = 0.0
                if node.fy is None:
                    node.vy *= self._velocity_decay
                    node.y += node.vy
                else:
                    node.y = node.fy
                    node.vy = 0.0

        return self

    def run(self, max_iterations: int = 300) -> ForceSimulation:
        """Tick until alpha < alpha_min or *max_iterations* is reached."""
        for _ in range(max_iterations):
            if self._alpha < self._alpha_min:
                break
            self.tick()
        return self

    # -- find (d3 simulation.find) --

    def find(
        self,
        x: float,
        y: float,
        radius: Optional[float] = None,
    ) -> Optional[ForceNode]:
        """Return the node closest to (x, y), optionally within *radius*."""
        best: Optional[ForceNode] = None
        best_d2 = radius * radius if radius is not None else float("inf")
        for node in self._nodes:
            dx = x - node.x
            dy = y - node.y
            d2 = dx * dx + dy * dy
            if d2 < best_d2:
                best = node
                best_d2 = d2
        return best

    # -- Accessors / chainable setters (mirror D3 API) --

    @property
    def nodes(self) -> list[ForceNode]:
        return self._nodes

    @nodes.setter
    def nodes(self, val: list[ForceNode]) -> None:
        self._nodes = val
        self._initialize_nodes()
        for f in self._forces.values():
            self._initialize_force(f)

    @property
    def alpha(self) -> float:
        return self._alpha

    @alpha.setter
    def alpha(self, val: float) -> None:
        self._alpha = float(val)

    @property
    def alpha_min(self) -> float:
        return self._alpha_min

    @alpha_min.setter
    def alpha_min(self, val: float) -> None:
        self._alpha_min = float(val)

    @property
    def alpha_decay(self) -> float:
        return self._alpha_decay

    @alpha_decay.setter
    def alpha_decay(self, val: float) -> None:
        self._alpha_decay = float(val)

    @property
    def alpha_target(self) -> float:
        return self._alpha_target

    @alpha_target.setter
    def alpha_target(self, val: float) -> None:
        self._alpha_target = float(val)

    @property
    def velocity_decay(self) -> float:
        return 1 - self._velocity_decay

    @velocity_decay.setter
    def velocity_decay(self, val: float) -> None:
        self._velocity_decay = 1 - val

    def force(self, name: str, f: Any = None) -> Any:
        """Get or set a named force.  Pass ``None`` to remove."""
        if f is None:
            return self._forces.get(name)
        if f is False:
            self._forces.pop(name, None)
            return self
        self._forces[name] = self._initialize_force(f)
        return self


# ── Grid snapping ─────────────────────────────────────────────────────────

def snap_to_grid(value: float, unit: int = BASELINE_UNIT) -> float:
    """Round *value* to the nearest multiple of *unit*."""
    return round(value / unit) * unit


# ── Integration with diagram_model ────────────────────────────────────────


def force_layout_diagram(diagram: Any, iterations: int = 300) -> Any:
    """Run a force-directed layout on a ``Diagram`` object.

    1. Extracts nodes (Box/Panel) and edges (Arrow) from the component tree.
    2. Builds a ``ForceSimulation`` with center, charge, link, and
       rectangle-collision forces.
    3. Runs until settled.
    4. Snaps positions to the 8px baseline grid.
    5. Writes positions back into the diagram components.

    Returns the mutated *diagram*.
    """
    from diagram_model import Arrow as DiagramArrow, Box, Panel, Diagram
    from diagram_shared import BLOCK_WIDTH, BOX_MIN_HEIGHT, INSET, GRID_GUTTER

    # -- 1. Extract nodes & edges --
    components: list = []
    comp_by_id: dict[str, Any] = {}

    def _walk(items: list) -> None:
        for c in items:
            if isinstance(c, (Box, Panel)):
                components.append(c)
                if getattr(c, "id", ""):
                    comp_by_id[c.id] = c
            if isinstance(c, Panel) and hasattr(c, "children"):
                _walk(c.children)

    _walk(diagram.components)

    if not components:
        return diagram

    # Build ForceNode list
    force_nodes: list[ForceNode] = []
    comp_to_fnode: dict[int, ForceNode] = {}  # id(component) → ForceNode

    for i, comp in enumerate(components):
        w = getattr(comp, "width", None) or BLOCK_WIDTH
        h = getattr(comp, "height", None) or BOX_MIN_HEIGHT
        fn = ForceNode(
            index=i,
            x=float("nan"),
            y=float("nan"),
            width=float(w),
            height=float(h),
            component_id=getattr(comp, "id", ""),
        )
        force_nodes.append(fn)
        comp_to_fnode[id(comp)] = fn

    # Build ForceLink list from arrows
    arrows = [c for c in diagram.components if isinstance(c, DiagramArrow)]
    force_links: list[ForceLink] = []  # type: ignore[assignment]
    for ai, arrow in enumerate(arrows):
        src_id = arrow.source.split(".")[0] if "." in arrow.source else arrow.source
        tgt_id = arrow.target.split(".")[0] if "." in arrow.target else arrow.target
        src_comp = comp_by_id.get(src_id)
        tgt_comp = comp_by_id.get(tgt_id)
        if src_comp is None or tgt_comp is None:
            continue
        src_fn = comp_to_fnode.get(id(src_comp))
        tgt_fn = comp_to_fnode.get(id(tgt_comp))
        if src_fn is None or tgt_fn is None:
            continue
        fl = ForceLink(  # type: ignore[call-arg]
            source=src_fn.index,
            target=tgt_fn.index,
            arrow_index=ai,
        )
        force_links.append(fl)

    # -- 2. Build simulation --
    sim = ForceSimulation(force_nodes)

    # Center of the canvas
    canvas_w = diagram.canvas_width or (BLOCK_WIDTH * 4)
    canvas_h = diagram.canvas_height or (BOX_MIN_HEIGHT * 6)
    cx = canvas_w / 2
    cy = canvas_h / 2

    sim.force("center", ForceCenter(cx, cy))
    sim.force("charge", ForceManyBody().strength(-200))
    sim.force("collide", ForceCollideRect(padding=GRID_GUTTER / 2))

    if force_links:
        link_force = ForceLinkForce(force_links)  # type: ignore[arg-type]
        link_force.distance(lambda l, i, ls: 120.0)
        sim.force("link", link_force)

    # -- 3. Run simulation --
    sim.run(iterations)

    # -- 4. Snap to baseline grid --
    for fn in force_nodes:
        fn.x = snap_to_grid(fn.x)
        fn.y = snap_to_grid(fn.y)

    # -- 5. Write positions back --
    for comp, fn in zip(components, force_nodes):
        # Store absolute pixel position.  The existing layout engine uses
        # col/row grid indices, but force layout operates in pixel space.
        # We stash the resolved position as private attributes that
        # renderers can check before falling back to grid placement.
        comp._force_x = fn.x  # type: ignore[attr-defined]
        comp._force_y = fn.y  # type: ignore[attr-defined]

    return diagram
