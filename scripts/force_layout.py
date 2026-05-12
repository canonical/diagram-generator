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

from quadtree import Quadtree, QuadLeaf

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
    """Charge (many-body) force — Barnes-Hut quadtree approximation.

    Ported from d3-force/src/manyBody.js.  Builds a quadtree each tick
    and uses the Barnes-Hut theta criterion to approximate distant
    charge clusters as single points.
    """

    def __init__(self) -> None:
        self._strength_fn: Callable[[ForceNode, int, list[ForceNode]], float] = (
            lambda n, i, ns: -30.0
        )
        self._strengths: list[float] = []
        self._distance_min2 = 1.0
        self._distance_max2 = float("inf")
        self._theta2 = 0.81  # 0.9²
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
        if n == 0:
            return
        strengths = self._strengths
        random = self._random
        dmin2 = self._distance_min2
        dmax2 = self._distance_max2
        theta2 = self._theta2

        # Build quadtree from current positions
        tree = Quadtree(data=nodes)

        # Accumulate charge per quad node via visit_after.
        # Store (value, cx, cy) keyed by id(quad_node).
        acc: dict[int, tuple[float, float, float]] = {}

        def accumulate(quad: Any, *_: Any) -> None:
            strength_sum = 0.0
            weight = 0.0
            cx = 0.0
            cy = 0.0

            if isinstance(quad, list):
                # Internal node: aggregate from children
                for ci in range(4):
                    child = quad[ci]
                    if child is not None:
                        cid = id(child)
                        if cid in acc:
                            cv, cqx, cqy = acc[cid]
                            c = abs(cv)
                            if c:
                                strength_sum += cv
                                weight += c
                                cx += c * cqx
                                cy += c * cqy
                if weight:
                    cx /= weight
                    cy /= weight
            else:
                # Leaf node: centre of charge = data position
                cx = quad.data.x
                cy = quad.data.y
                leaf: Optional[QuadLeaf] = quad
                while leaf is not None:
                    strength_sum += strengths[leaf.data.index]
                    leaf = leaf.next

            acc[id(quad)] = (strength_sum, cx, cy)

        tree.visit_after(accumulate)

        # For each node, traverse the tree with Barnes-Hut
        for i in range(n):
            node = nodes[i]

            def apply(
                quad: Any, x0: float, y0: float, x1: float, y1: float,
                _node: ForceNode = node,
            ) -> bool:
                qid = id(quad)
                if qid not in acc:
                    return True
                qv, qcx, qcy = acc[qid]
                if not qv:
                    return True

                dx = qcx - _node.x
                dy = qcy - _node.y
                w = x1 - x0
                l = dx * dx + dy * dy

                # Barnes-Hut: use approximation if quad is small enough
                if w * w / theta2 < l:
                    if l < dmax2:
                        if dx == 0:
                            dx = jiggle(random)
                            l += dx * dx
                        if dy == 0:
                            dy = jiggle(random)
                            l += dy * dy
                        if l < dmin2:
                            l = math.sqrt(dmin2 * l)
                        _node.vx += dx * qv * alpha / l
                        _node.vy += dy * qv * alpha / l
                    return True  # skip children

                # Not approximable — recurse into children for internal nodes
                if isinstance(quad, list) or l >= dmax2:
                    return False

                # Leaf node within range — apply individual forces
                leaf_node: Optional[QuadLeaf] = quad
                if leaf_node.data is not _node or leaf_node.next is not None:
                    if dx == 0:
                        dx = jiggle(random)
                        l += dx * dx
                    if dy == 0:
                        dy = jiggle(random)
                        l += dy * dy
                    if l < dmin2:
                        l = math.sqrt(dmin2 * l)

                while leaf_node is not None:
                    if leaf_node.data is not _node:
                        w2 = strengths[leaf_node.data.index] * alpha / l
                        _node.vx += dx * w2
                        _node.vy += dy * w2
                    leaf_node = leaf_node.next

                return False

            tree.visit(apply)

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

    def theta(self, val: float) -> ForceManyBody:
        self._theta2 = val * val
        return self


class ForceCollideRect:
    """Rectangle collision force — quadtree-accelerated.

    Adapted from d3-force/src/collide.js.  Uses axis-aligned rectangles
    (each node has ``width`` and ``height``) instead of circles.  A
    quadtree prunes quadrants whose bounding boxes cannot overlap the
    current node.
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
        if n == 0:
            return
        strength = self._strength
        padding = self._padding
        random = self._random

        for _ in range(self._iterations):
            # Build quadtree from projected positions
            tree = Quadtree(
                x=lambda d: d.x + d.vx,
                y=lambda d: d.y + d.vy,
                data=nodes,
            )

            # Accumulate max half-extents per quad via visit_after
            hw_map: dict[int, float] = {}
            hh_map: dict[int, float] = {}

            def prepare(quad: Any, *_: Any) -> None:
                if not isinstance(quad, list):
                    # Leaf: half-extents of this datum
                    hw_map[id(quad)] = quad.data.width / 2 + padding
                    hh_map[id(quad)] = quad.data.height / 2 + padding
                else:
                    # Internal: max of children
                    max_hw = 0.0
                    max_hh = 0.0
                    for ci in range(4):
                        child = quad[ci]
                        if child is not None:
                            cid = id(child)
                            chw = hw_map.get(cid, 0.0)
                            chh = hh_map.get(cid, 0.0)
                            if chw > max_hw:
                                max_hw = chw
                            if chh > max_hh:
                                max_hh = chh
                    hw_map[id(quad)] = max_hw
                    hh_map[id(quad)] = max_hh

            tree.visit_after(prepare)

            for i in range(n):
                ni = nodes[i]
                hw_i = ni.width / 2 + padding
                hh_i = ni.height / 2 + padding
                xi = ni.x + ni.vx
                yi = ni.y + ni.vy

                def apply(
                    quad: Any, x0: float, y0: float, x1: float, y1: float,
                    _ni: ForceNode = ni, _hw_i: float = hw_i,
                    _hh_i: float = hh_i, _xi: float = xi, _yi: float = yi,
                ) -> bool:
                    qid = id(quad)

                    if not isinstance(quad, list):
                        # Leaf — check each coincident datum
                        leaf: Optional[QuadLeaf] = quad
                        while leaf is not None:
                            data = leaf.data
                            if data.index > _ni.index:
                                hw_j = data.width / 2 + padding
                                hh_j = data.height / 2 + padding
                                dx = _xi - data.x - data.vx
                                dy = _yi - data.y - data.vy
                                overlap_x = (_hw_i + hw_j) - abs(dx)
                                overlap_y = (_hh_i + hh_j) - abs(dy)

                                if overlap_x > 0 and overlap_y > 0:
                                    if overlap_x < overlap_y:
                                        if dx == 0:
                                            dx = jiggle(random)
                                        sign = 1.0 if dx > 0 else -1.0
                                        push = overlap_x * strength * 0.5 * sign
                                        _ni.vx += push
                                        data.vx -= push
                                    else:
                                        if dy == 0:
                                            dy = jiggle(random)
                                        sign = 1.0 if dy > 0 else -1.0
                                        push = overlap_y * strength * 0.5 * sign
                                        _ni.vy += push
                                        data.vy -= push
                            leaf = leaf.next
                        return True

                    # Internal — prune if bounding boxes can't overlap
                    max_hw = hw_map.get(qid, 0.0)
                    max_hh = hh_map.get(qid, 0.0)
                    r_hw = _hw_i + max_hw
                    r_hh = _hh_i + max_hh
                    if (x0 > _xi + r_hw or x1 < _xi - r_hw or
                            y0 > _yi + r_hh or y1 < _yi - r_hh):
                        return True  # skip children
                    return False  # recurse

                tree.visit(apply)

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
