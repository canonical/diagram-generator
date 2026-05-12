#!/usr/bin/env python3
"""Benchmark for force_layout.py — measures simulation performance
at various graph sizes.

Run:  python scripts/benchmark_force.py
"""

from __future__ import annotations

import random
import sys
import os
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from force_layout import (
    ForceCenter,
    ForceCollideRect,
    ForceLinkForce,
    ForceManyBody,
    ForceNode,
    ForceLink,
    ForceSimulation,
)

TICKS = 300
SIZES = [10, 50, 100, 200, 500]
SEED = 42


def make_graph(n: int, rng: random.Random) -> tuple[list[ForceNode], list[ForceLink]]:
    """Create n nodes with random positions and ~2 edges per node."""
    nodes = [
        ForceNode(
            index=i,
            x=rng.uniform(0, 2000),
            y=rng.uniform(0, 2000),
            width=rng.choice([128, 160, 192]),
            height=rng.choice([48, 64, 80]),
            component_id=f"n{i}",
        )
        for i in range(n)
    ]

    # ~2 edges per node → n edges total
    num_links = n
    links: list[ForceLink] = []
    for k in range(num_links):
        s = rng.randint(0, n - 1)
        t = rng.randint(0, n - 1)
        while t == s:
            t = rng.randint(0, n - 1)
        links.append(ForceLink(source=s, target=t))

    return nodes, links


def benchmark(n: int, rng: random.Random) -> tuple[float, int]:
    """Run a simulation with n nodes, return (elapsed_seconds, ticks)."""
    nodes, links = make_graph(n, rng)

    sim = ForceSimulation(nodes)
    sim.force("center", ForceCenter(1000, 1000))
    sim.force("charge", ForceManyBody().strength(-150))
    sim.force("collide", ForceCollideRect(padding=8))

    link_force = ForceLinkForce(links)
    link_force.distance(lambda l, i, ls: 100.0)
    sim.force("link", link_force)

    start = time.perf_counter()
    sim.run(TICKS)
    elapsed = time.perf_counter() - start

    return elapsed, TICKS


def main() -> None:
    print(f"Force layout benchmark (Barnes-Hut quadtree, {TICKS} ticks)")
    print("=" * 58)
    print(f"{'nodes':>6} | {'links':>6} | {'time (s)':>10} | {'ticks/s':>10}")
    print("-" * 58)

    rng = random.Random(SEED)

    for n in SIZES:
        elapsed, ticks = benchmark(n, rng)
        links_count = n  # ~2 per node = n total links
        tps = ticks / elapsed if elapsed > 0 else float("inf")
        print(f"{n:>6} | {links_count:>6} | {elapsed:>10.4f} | {tps:>10.1f}")

    print()
    print("Done.")


if __name__ == "__main__":
    main()
