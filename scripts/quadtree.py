# Copyright 2010-2021 Mike Bostock
# ISC License
#
# Permission to use, copy, modify, and/or distribute this software for any
# purpose with or without fee is hereby granted, provided that the above
# copyright notice and this permission notice appear in all copies.
#
# THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
# WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
# MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
# SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
# WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
# OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
# CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
#
# Literal Python translation of d3-quadtree.
# Source: https://github.com/d3/d3-quadtree

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Callable, Optional


# ---------------------------------------------------------------------------
# Node types
# ---------------------------------------------------------------------------
# Internal nodes: plain ``list`` of length 4 (quadrants 0-3).
# Leaf nodes: ``QuadLeaf`` with ``.data`` and ``.next``.
# ---------------------------------------------------------------------------

@dataclass
class QuadLeaf:
    """Leaf node. Holds one datum and an optional link to the next coincident
    leaf (forming a singly-linked list for coincident points)."""
    data: Any
    next: Optional[QuadLeaf] = None


@dataclass
class _Quad:
    """Traversal helper (mirrors ``d3/src/quad.js``)."""
    node: Any
    x0: float
    y0: float
    x1: float
    y1: float


# ---------------------------------------------------------------------------
# Default accessors (mirrors d3/src/x.js, y.js)
# ---------------------------------------------------------------------------

def _default_x(d: Any) -> float:
    return d.x


def _default_y(d: Any) -> float:
    return d.y


# ---------------------------------------------------------------------------
# Internal add helper (module-level, mirrors d3/src/add.js ``add()``)
# ---------------------------------------------------------------------------

def _add(tree: Quadtree, x: float, y: float, d: Any) -> Quadtree:
    if math.isnan(x) or math.isnan(y):
        return tree

    node = tree._root
    leaf = QuadLeaf(data=d)
    x0 = tree._x0
    y0 = tree._y0
    x1 = tree._x1
    y1 = tree._y1

    # If the tree is empty, initialize the root as a leaf.
    if node is None:
        tree._root = leaf
        return tree

    # Find the existing leaf for the new point, or add it.
    parent: Any = None
    i = 0
    while isinstance(node, list):
        xm = (x0 + x1) / 2
        right = int(x >= xm)
        if right:
            x0 = xm
        else:
            x1 = xm

        ym = (y0 + y1) / 2
        bottom = int(y >= ym)
        if bottom:
            y0 = ym
        else:
            y1 = ym

        parent = node
        i = (bottom << 1) | right
        node = parent[i]
        if node is None:
            parent[i] = leaf
            return tree

    # Is the new point exactly coincident with the existing point?
    xp = float(tree._x(node.data))
    yp = float(tree._y(node.data))
    if x == xp and y == yp:
        leaf.next = node
        if parent is not None:
            parent[i] = leaf
        else:
            tree._root = leaf
        return tree

    # Otherwise, split the leaf node until the old and new point are separated.
    while True:
        if parent is not None:
            new_internal: list[Any] = [None, None, None, None]
            parent[i] = new_internal
            parent = new_internal
        else:
            parent = [None, None, None, None]
            tree._root = parent

        xm = (x0 + x1) / 2
        right = int(x >= xm)
        if right:
            x0 = xm
        else:
            x1 = xm

        ym = (y0 + y1) / 2
        bottom = int(y >= ym)
        if bottom:
            y0 = ym
        else:
            y1 = ym

        i = (bottom << 1) | right
        j = (int(yp >= ym) << 1) | int(xp >= xm)
        if i != j:
            break

    parent[j] = node
    parent[i] = leaf
    return tree


# ---------------------------------------------------------------------------
# Leaf copy helper (from quadtree.js ``leaf_copy``)
# ---------------------------------------------------------------------------

def _leaf_copy(leaf: QuadLeaf) -> QuadLeaf:
    copy = QuadLeaf(data=leaf.data)
    current = copy
    source = leaf.next
    while source is not None:
        current.next = QuadLeaf(data=source.data)
        current = current.next
        source = source.next
    return copy


# ---------------------------------------------------------------------------
# Quadtree
# ---------------------------------------------------------------------------

class Quadtree:
    """Port of d3-quadtree.  Same data structures, same algorithms."""

    def __init__(
        self,
        x: Optional[Callable] = None,
        y: Optional[Callable] = None,
        data: Any = None,
    ) -> None:
        self._x: Callable = x if x is not None else _default_x
        self._y: Callable = y if y is not None else _default_y
        self._x0: float = float("nan")
        self._y0: float = float("nan")
        self._x1: float = float("nan")
        self._y1: float = float("nan")
        self._root: Any = None
        if data is not None:
            self.add_all(data)

    # -- cover (d3/src/cover.js) -------------------------------------------

    def cover(self, x: float, y: float) -> Quadtree:
        x = float(x)
        y = float(y)
        if math.isnan(x) or math.isnan(y):
            return self

        x0 = self._x0
        y0 = self._y0
        x1 = self._x1
        y1 = self._y1

        # If the quadtree has no extent, initialize them.
        # Integer extents are necessary so that if we later double the extent,
        # the existing quadrant boundaries don't change due to floating point
        # error!
        if math.isnan(x0):
            x0 = math.floor(x)
            x1 = x0 + 1
            y0 = math.floor(y)
            y1 = y0 + 1
        else:
            # Otherwise, double repeatedly to cover.
            z = (x1 - x0) or 1
            node = self._root
            while x0 > x or x >= x1 or y0 > y or y >= y1:
                i = (int(y < y0) << 1) | int(x < x0)
                parent: list[Any] = [None, None, None, None]
                parent[i] = node
                node = parent
                z *= 2
                if i == 0:
                    x1 = x0 + z
                    y1 = y0 + z
                elif i == 1:
                    x0 = x1 - z
                    y1 = y0 + z
                elif i == 2:
                    x1 = x0 + z
                    y0 = y1 - z
                else:  # i == 3
                    x0 = x1 - z
                    y0 = y1 - z

            if self._root is not None and isinstance(self._root, list):
                self._root = node

        self._x0 = x0
        self._y0 = y0
        self._x1 = x1
        self._y1 = y1
        return self

    # -- add / add_all (d3/src/add.js) -------------------------------------

    def add(self, datum: Any) -> Quadtree:
        x = float(self._x(datum))
        y = float(self._y(datum))
        return _add(self.cover(x, y), x, y, datum)

    def add_all(self, data: Any) -> Quadtree:
        if not isinstance(data, (list, tuple)):
            data = list(data)
        n = len(data)
        xz = [0.0] * n
        yz = [0.0] * n
        x0 = float("inf")
        y0 = float("inf")
        x1 = float("-inf")
        y1 = float("-inf")

        # Compute the points and their extent.
        for idx in range(n):
            d = data[idx]
            xi = float(self._x(d))
            yi = float(self._y(d))
            if math.isnan(xi) or math.isnan(yi):
                continue
            xz[idx] = xi
            yz[idx] = yi
            if xi < x0:
                x0 = xi
            if xi > x1:
                x1 = xi
            if yi < y0:
                y0 = yi
            if yi > y1:
                y1 = yi

        # If there were no (valid) points, abort.
        if x0 > x1 or y0 > y1:
            return self

        # Expand the tree to cover the new points.
        self.cover(x0, y0).cover(x1, y1)

        # Add the new points.
        for idx in range(n):
            _add(self, xz[idx], yz[idx], data[idx])

        return self

    # -- remove / remove_all (d3/src/remove.js) ----------------------------

    def remove(self, datum: Any) -> Quadtree:
        x = float(self._x(datum))
        y = float(self._y(datum))
        if math.isnan(x) or math.isnan(y):
            return self

        node = self._root
        if node is None:
            return self

        parent = None
        retainer = None
        previous = None
        x0 = self._x0
        y0 = self._y0
        x1 = self._x1
        y1 = self._y1
        i = 0
        j = 0

        # Find the leaf node for the point.
        # While descending, also retain the deepest parent with a non-removed
        # sibling.
        if isinstance(node, list):
            while True:
                xm = (x0 + x1) / 2
                right = int(x >= xm)
                if right:
                    x0 = xm
                else:
                    x1 = xm

                ym = (y0 + y1) / 2
                bottom = int(y >= ym)
                if bottom:
                    y0 = ym
                else:
                    y1 = ym

                parent = node
                i = (bottom << 1) | right
                node = parent[i]
                if node is None:
                    return self
                if not isinstance(node, list):
                    break
                if (parent[(i + 1) & 3]
                        or parent[(i + 2) & 3]
                        or parent[(i + 3) & 3]):
                    retainer = parent
                    j = i

        # Find the point to remove.
        while node.data is not datum:
            previous = node
            node = node.next
            if node is None:
                return self

        next_node: Optional[QuadLeaf] = node.next
        node.next = None

        # If there are multiple coincident points, remove just the point.
        if previous is not None:
            if next_node is not None:
                previous.next = next_node
            else:
                previous.next = None
            return self

        # If this is the root point, remove it.
        if parent is None:
            self._root = next_node
            return self

        # Remove this leaf.
        if next_node is not None:
            parent[i] = next_node
        else:
            parent[i] = None

        # If the parent now contains exactly one leaf, collapse superfluous
        # parents.
        node = parent[0] or parent[1] or parent[2] or parent[3]
        if (node is not None
                and node is (parent[3] or parent[2] or parent[1] or parent[0])
                and not isinstance(node, list)):
            if retainer is not None:
                retainer[j] = node
            else:
                self._root = node

        return self

    def remove_all(self, data: Any) -> Quadtree:
        for d in data:
            self.remove(d)
        return self

    # -- find (d3/src/find.js) ---------------------------------------------

    def find(
        self, x: float, y: float, radius: Optional[float] = None
    ) -> Any:
        data = None
        x0 = self._x0
        y0 = self._y0
        x3 = self._x1
        y3 = self._y1
        quads: list[_Quad] = []
        node = self._root

        if node is not None:
            quads.append(_Quad(node, x0, y0, x3, y3))

        if radius is None:
            radius_sq = float("inf")
        else:
            x0 = x - radius
            y0 = y - radius
            x3 = x + radius
            y3 = y + radius
            radius_sq = radius * radius

        while quads:
            q = quads.pop()
            node = q.node
            x1 = q.x0
            y1 = q.y0
            x2 = q.x1
            y2 = q.y1

            if (node is None
                    or x1 > x3
                    or y1 > y3
                    or x2 < x0
                    or y2 < y0):
                continue

            if isinstance(node, list):
                xm = (x1 + x2) / 2
                ym = (y1 + y2) / 2

                quads.append(_Quad(node[3], xm, ym, x2, y2))
                quads.append(_Quad(node[2], x1, ym, xm, y2))
                quads.append(_Quad(node[1], xm, y1, x2, ym))
                quads.append(_Quad(node[0], x1, y1, xm, ym))

                # Visit the closest quadrant first.
                i = (int(y >= ym) << 1) | int(x >= xm)
                if i:
                    q_swap = quads[-1]
                    quads[-1] = quads[-1 - i]
                    quads[-1 - i] = q_swap
            else:
                dx = x - float(self._x(node.data))
                dy = y - float(self._y(node.data))
                d2 = dx * dx + dy * dy
                if d2 < radius_sq:
                    d = math.sqrt(d2)
                    radius_sq = d2
                    x0 = x - d
                    y0 = y - d
                    x3 = x + d
                    y3 = y + d
                    data = node.data

        return data

    # -- visit (d3/src/visit.js) -------------------------------------------

    def visit(self, callback: Callable) -> Quadtree:
        quads: list[_Quad] = []
        node = self._root
        if node is not None:
            quads.append(
                _Quad(node, self._x0, self._y0, self._x1, self._y1)
            )
        while quads:
            q = quads.pop()
            node = q.node
            x0, y0, x1, y1 = q.x0, q.y0, q.x1, q.y1
            if not callback(node, x0, y0, x1, y1) and isinstance(node, list):
                xm = (x0 + x1) / 2
                ym = (y0 + y1) / 2
                if node[3] is not None:
                    quads.append(_Quad(node[3], xm, ym, x1, y1))
                if node[2] is not None:
                    quads.append(_Quad(node[2], x0, ym, xm, y1))
                if node[1] is not None:
                    quads.append(_Quad(node[1], xm, y0, x1, ym))
                if node[0] is not None:
                    quads.append(_Quad(node[0], x0, y0, xm, ym))
        return self

    # -- visit_after (d3/src/visitAfter.js) --------------------------------

    def visit_after(self, callback: Callable) -> Quadtree:
        quads: list[_Quad] = []
        next_list: list[_Quad] = []
        if self._root is not None:
            quads.append(
                _Quad(self._root, self._x0, self._y0, self._x1, self._y1)
            )
        while quads:
            q = quads.pop()
            node = q.node
            if isinstance(node, list):
                x0, y0, x1, y1 = q.x0, q.y0, q.x1, q.y1
                xm = (x0 + x1) / 2
                ym = (y0 + y1) / 2
                if node[0] is not None:
                    quads.append(_Quad(node[0], x0, y0, xm, ym))
                if node[1] is not None:
                    quads.append(_Quad(node[1], xm, y0, x1, ym))
                if node[2] is not None:
                    quads.append(_Quad(node[2], x0, ym, xm, y1))
                if node[3] is not None:
                    quads.append(_Quad(node[3], xm, ym, x1, y1))
            next_list.append(q)
        while next_list:
            q = next_list.pop()
            callback(q.node, q.x0, q.y0, q.x1, q.y1)
        return self

    # -- copy (from quadtree.js) -------------------------------------------

    def copy(self) -> Quadtree:
        cp = Quadtree()
        cp._x = self._x
        cp._y = self._y
        cp._x0 = self._x0
        cp._y0 = self._y0
        cp._x1 = self._x1
        cp._y1 = self._y1

        node = self._root
        if node is None:
            return cp

        if not isinstance(node, list):
            cp._root = _leaf_copy(node)
            return cp

        stack = [{"source": node, "target": [None, None, None, None]}]
        cp._root = stack[0]["target"]
        while stack:
            current = stack.pop()
            for idx in range(4):
                child = current["source"][idx]
                if child is not None:
                    if isinstance(child, list):
                        new_target: list[Any] = [None, None, None, None]
                        current["target"][idx] = new_target
                        stack.append({"source": child, "target": new_target})
                    else:
                        current["target"][idx] = _leaf_copy(child)

        return cp

    # -- data (d3/src/data.js) ---------------------------------------------

    def data(self) -> list[Any]:
        result: list[Any] = []

        def _collect(node: Any, *_: Any) -> None:
            if not isinstance(node, list):
                leaf: Optional[QuadLeaf] = node
                while leaf is not None:
                    result.append(leaf.data)
                    leaf = leaf.next

        self.visit(_collect)
        return result

    # -- size (d3/src/size.js) ---------------------------------------------

    def size(self) -> int:
        count = 0

        def _count(node: Any, *_: Any) -> None:
            nonlocal count
            if not isinstance(node, list):
                leaf: Optional[QuadLeaf] = node
                while leaf is not None:
                    count += 1
                    leaf = leaf.next

        self.visit(_count)
        return count

    # -- extent (d3/src/extent.js) -----------------------------------------

    def extent(self, ext: Any = None) -> Any:
        if ext is not None:
            return (self
                    .cover(float(ext[0][0]), float(ext[0][1]))
                    .cover(float(ext[1][0]), float(ext[1][1])))
        if math.isnan(self._x0):
            return None
        return [[self._x0, self._y0], [self._x1, self._y1]]

    # -- root (d3/src/root.js) ---------------------------------------------

    @property
    def root(self) -> Any:
        return self._root

    # -- x / y accessors (d3/src/x.js, y.js) -------------------------------

    def x(self, fn: Optional[Callable] = None) -> Any:
        if fn is not None:
            self._x = fn
            return self
        return self._x

    def y(self, fn: Optional[Callable] = None) -> Any:
        if fn is not None:
            self._y = fn
            return self
        return self._y


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import random

    def _run_tests() -> None:
        random.seed(42)

        class Pt:
            __slots__ = ("x", "y")

            def __init__(self, x: float, y: float) -> None:
                self.x = x
                self.y = y

            def __repr__(self) -> str:
                return f"Pt({self.x:.2f}, {self.y:.2f})"

        # 1. Insert 20 random points, check size() == 20
        points = [Pt(random.uniform(0, 100), random.uniform(0, 100)) for _ in range(20)]
        qt = Quadtree(data=points)
        assert qt.size() == 20, f"Expected size 20, got {qt.size()}"
        print(f"[PASS] size after 20 inserts: {qt.size()}")

        # 2. find(x, y) returns nearest point
        target = points[0]
        found = qt.find(target.x, target.y)
        assert found is target, f"Expected {target}, got {found}"
        print(f"[PASS] find exact: {found}")

        found2 = qt.find(target.x + 0.001, target.y + 0.001)
        assert found2 is target, f"Nearest should be {target}, got {found2}"
        print(f"[PASS] find near: {found2}")

        # find with radius
        found3 = qt.find(target.x, target.y, 0.0001)
        assert found3 is target, f"Expected {target} within radius, got {found3}"
        print(f"[PASS] find with radius: {found3}")

        found_none = qt.find(1e9, 1e9, 0.001)
        assert found_none is None, f"Expected None for distant search, got {found_none}"
        print("[PASS] find distant returns None")

        # 3. visit callback is called
        visit_count = 0

        def _visit_cb(node: Any, x0: float, y0: float, x1: float, y1: float) -> None:
            nonlocal visit_count
            visit_count += 1

        qt.visit(_visit_cb)
        assert visit_count > 0, "visit callback was never called"
        print(f"[PASS] visit called {visit_count} times")

        # visit_after
        va_count = 0

        def _va_cb(node: Any, x0: float, y0: float, x1: float, y1: float) -> None:
            nonlocal va_count
            va_count += 1

        qt.visit_after(_va_cb)
        assert va_count > 0, "visit_after callback was never called"
        print(f"[PASS] visit_after called {va_count} times")

        # 4. remove decrements size
        qt.remove(points[0])
        assert qt.size() == 19, f"Expected size 19 after remove, got {qt.size()}"
        print(f"[PASS] size after remove: {qt.size()}")

        # data() returns all remaining data
        all_data = qt.data()
        assert len(all_data) == 19, f"Expected 19 data items, got {len(all_data)}"
        print(f"[PASS] data() length: {len(all_data)}")

        # copy() preserves size
        qt2 = qt.copy()
        assert qt2.size() == 19, f"Copy size should be 19, got {qt2.size()}"
        print(f"[PASS] copy size: {qt2.size()}")

        # extent() returns bounds
        ext = qt.extent()
        assert ext is not None, "extent should not be None"
        assert len(ext) == 2 and len(ext[0]) == 2, "extent shape wrong"
        print(f"[PASS] extent: {ext}")

        # x() / y() accessor round-trip
        assert qt.x() is _default_x
        assert qt.y() is _default_y
        print("[PASS] accessor round-trip")

        print("\nAll quadtree tests passed.")

    _run_tests()
