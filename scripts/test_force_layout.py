#!/usr/bin/env python3
"""Tests for force_layout.py — the d3-force Python port.

Run:  python scripts/test_force_layout.py
"""

from __future__ import annotations

import sys
import os

# Ensure scripts/ is on the path so bare imports work (matches the rest
# of the diagram-generator scripts).
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from force_layout import (
    BASELINE_UNIT,
    ForceCenter,
    ForceCollideRect,
    ForceLinkForce,
    ForceManyBody,
    ForceNode,
    ForceLink,
    ForceSimulation,
    jiggle,
    lcg,
    snap_to_grid,
)


# ── Helpers ───────────────────────────────────────────────────────────────

def _rects_overlap(a: ForceNode, b: ForceNode) -> bool:
    """True if the axis-aligned bounding boxes of *a* and *b* overlap."""
    a_left = a.x - a.width / 2
    a_right = a.x + a.width / 2
    a_top = a.y - a.height / 2
    a_bottom = a.y + a.height / 2
    b_left = b.x - b.width / 2
    b_right = b.x + b.width / 2
    b_top = b.y - b.height / 2
    b_bottom = b.y + b.height / 2
    return (a_left < b_right and a_right > b_left and
            a_top < b_bottom and a_bottom > b_top)


def _is_grid_snapped(val: float, unit: int = BASELINE_UNIT) -> bool:
    return abs(val - round(val / unit) * unit) < 1e-9


# ── Tests ─────────────────────────────────────────────────────────────────

def test_lcg_deterministic() -> None:
    """LCG produces the same sequence from a fresh generator."""
    r1 = lcg()
    r2 = lcg()
    seq1 = [r1() for _ in range(10)]
    seq2 = [r2() for _ in range(10)]
    assert seq1 == seq2, "LCG is not deterministic"
    assert all(0 <= v < 1 for v in seq1), "LCG values out of range"
    print("  PASS  lcg deterministic")


def test_jiggle_nonzero() -> None:
    r = lcg()
    vals = [jiggle(r) for _ in range(100)]
    assert all(v != 0 for v in vals), "jiggle returned zero"
    assert all(abs(v) < 1e-5 for v in vals), "jiggle too large"
    print("  PASS  jiggle nonzero & tiny")


def test_snap_to_grid() -> None:
    assert snap_to_grid(13.0) == 16.0
    assert snap_to_grid(12.0) == 16.0
    assert snap_to_grid(11.9) == 8.0
    assert snap_to_grid(0.0) == 0.0
    assert snap_to_grid(-5.0) == -8.0
    print("  PASS  snap_to_grid")


def test_simulation_no_overlap() -> None:
    """Six nodes connected in a chain; after settlement no rectangles
    should overlap and all positions should be grid-snapped."""
    nodes = [
        ForceNode(index=i, x=float("nan"), y=float("nan"),
                  width=192, height=64, component_id=f"box{i}")
        for i in range(6)
    ]

    links = [
        ForceLink(source=i, target=i + 1)
        for i in range(5)
    ]

    sim = ForceSimulation(nodes)
    sim.force("center", ForceCenter(400, 300))
    sim.force("charge", ForceManyBody().strength(-200))
    sim.force("collide", ForceCollideRect(padding=12))

    link_force = ForceLinkForce(links)
    link_force.distance(lambda l, i, ls: 120.0)
    sim.force("link", link_force)

    sim.run(300)

    # Snap
    for nd in nodes:
        nd.x = snap_to_grid(nd.x)
        nd.y = snap_to_grid(nd.y)

    # Check no overlaps
    overlapping = []
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            if _rects_overlap(nodes[i], nodes[j]):
                overlapping.append((i, j))
    assert not overlapping, f"Overlapping pairs: {overlapping}"

    # Check grid snap
    for nd in nodes:
        assert _is_grid_snapped(nd.x), f"Node {nd.component_id} x={nd.x} not snapped"
        assert _is_grid_snapped(nd.y), f"Node {nd.component_id} y={nd.y} not snapped"

    print("  PASS  simulation: no overlaps after settlement")
    print()
    print("  Final positions:")
    for nd in nodes:
        print(f"    {nd.component_id}: ({nd.x:>7.0f}, {nd.y:>7.0f})  "
              f"[{nd.width}×{nd.height}]")


def test_find() -> None:
    """Simulation.find returns the nearest node."""
    nodes = [
        ForceNode(index=0, x=0, y=0),
        ForceNode(index=1, x=100, y=0),
        ForceNode(index=2, x=0, y=100),
    ]
    sim = ForceSimulation(nodes)
    # Don't run — just test find on initial positions
    assert sim.find(10, 10) is nodes[0]
    assert sim.find(90, 5) is nodes[1]
    assert sim.find(5, 90) is nodes[2]
    assert sim.find(1000, 1000, radius=10) is None
    print("  PASS  simulation.find")


def test_pinned_nodes() -> None:
    """Nodes with fx/fy stay put."""
    nodes = [
        ForceNode(index=0, x=100, y=100, fx=100, fy=100),
        ForceNode(index=1, x=float("nan"), y=float("nan")),
    ]
    sim = ForceSimulation(nodes)
    sim.force("charge", ForceManyBody())
    sim.run(50)
    assert nodes[0].x == 100 and nodes[0].y == 100, "Pinned node moved"
    print("  PASS  pinned nodes stay put")


# ── Runner ────────────────────────────────────────────────────────────────

def main() -> None:
    print("force_layout tests")
    print("=" * 40)
    test_lcg_deterministic()
    test_jiggle_nonzero()
    test_snap_to_grid()
    test_find()
    test_pinned_nodes()
    test_simulation_no_overlap()
    print()
    print("All tests passed.")


if __name__ == "__main__":
    main()
