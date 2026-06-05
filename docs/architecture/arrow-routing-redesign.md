# Arrow Routing Redesign — Architectural Plan

**Status:** Draft  
**Date:** 2026-05-27  
**Scope:** Replace the current ad-hoc arrow routing with a principled port-based connection system.

---

## 1. Problem statement

The current arrow routing has accumulated five patches in one session and still produces incorrect results in complex diagrams. The root problems are structural:

| Problem | Root cause |
|---------|-----------|
| Arrows connect parent containers instead of the intended child | `_infer_sides()` resolves to the first matching ID in `bounds_map`; nested children are referenced by bare ID but the parent's bounds are geometrically closer or overlap |
| Side inference picks wrong edges for wide/tall containers | Center-to-center fallback in `_infer_sides()` doesn't understand that a wide container connecting to a narrow box below should exit from `bottom`, not `right` |
| L-shaped paths hug box edges ("wedge" artifact) | Post-hoc Z-shape fix only handles 3-point paths; longer paths with similar geometry are missed |
| No standard connection points | Edge midpoints are computed on the fly; no concept of which ports a box actually exposes |
| Grid snap breaks nested routing | Obstacle inflation and grid construction don't account for snapped positions |
| No crossing minimization | Each arrow routes independently; parallel arrows between adjacent rows can cross unnecessarily |

## 2. Prior art survey

### 2.1 ELK (Eclipse Layout Kernel)

ELK Layered implements a 5-stage Sugiyama pipeline: layer assignment → crossing minimization → node placement → **edge routing** → label placement.

**Port system** (the most relevant concept for us):
- Every node has **ports** — named connection points on specific sides
- Port constraints hierarchy: `UNDEFINED` → `FIXED_SIDE` → `FIXED_ORDER` → `FIXED_POS`
- `FIXED_SIDE` means the port is locked to N/S/E/W but can slide along the edge
- `FIXED_POS` means the port is at an exact coordinate on its side
- Port alignment: `JUSTIFIED`, `CENTER`, `BEGIN`, `END`
- Port spacing: configurable minimum distance between ports on the same side
- Edges connect port-to-port, not node-to-node

**Edge routing modes:**
- `ORTHOGONAL` — all segments axis-aligned, respects port constraints
- `POLYLINE` — diagonal shortcuts allowed
- `SPLINES` — curved edges (sloppy or strict mode)

**Hierarchy handling:**
- `INCLUDE_CHILDREN` — edges can cross hierarchy boundaries
- Compound graph support: edges from child-of-A to child-of-B route correctly through container boundaries
- Hierarchy-crossing edges are handled by "merging" the hierarchical graph into a flat representation for routing, then projecting results back

**Spacing granularity** (100+ options):
- `edgeEdgeBetweenLayers`, `edgeNodeBetweenLayers`, `edgeNode`, `edgeEdge`, `portPort`
- Each controls a specific spatial relationship

### 2.2 draw.io / mxGraph

draw.io uses mxGraph's edge routing with:
- **Perimeter functions** — each shape defines a function that computes the connection point given an approach angle. For rectangles, this produces the intersection of the approach line with the nearest edge
- **Connection constraints** — fixed points on a shape where edges can attach (typically edge midpoints, corners, or custom positions)
- **Edge styles**: `orthogonalEdgeStyle`, `elbowEdgeStyle`, `entityRelationEdgeStyle`, `isometricEdgeStyle`
- **Routing happens during rendering** — the edge style function takes source/target connection points and produces control points
- **Grouping**: edges connecting children across groups are rendered correctly because the edge style operates on absolute coordinates after layout
- **Control points**: user-draggable waypoints stored as relative offsets from edge geometry

### 2.3 Pikchr

Pikchr uses an **8-compass + center anchor system** (N, NE, E, SE, S, SW, W, NW, center). Arrows explicitly name their attachment points: `arrow from Box1.s to Box2.n`. No auto-routing — author manually specifies multi-segment paths.

### 2.4 Dagre (used by Mermaid, D2)

Dagre is a JavaScript Sugiyama layout with basic orthogonal edge routing. No port constraints, no hierarchy-crossing edges, no grid alignment. Edges connect to node centers and are routed around other nodes.

### 2.5 Key insight from benchmarks

Our system is **not** a general graph layout engine. We have a **fixed frame layout** (measure/place pipeline) that positions boxes hierarchically, then routes arrows as a post-processing step. This is architecturally closest to:

1. **draw.io's approach**: shapes are positioned first, then edges route between connection points
2. **ELK's port system**: but without ELK's layer assignment (we have explicit hierarchy)

The right design borrows **ELK's port model** (typed, side-constrained connection points) and **draw.io's post-layout routing** (edges route after all boxes are placed).

## 3. Proposed architecture

### 3.1 Connection port model

Every frame (leaf or container) exposes **connection ports** — named points on its boundary where arrows can attach.

```python
@dataclass
class Port:
    """A named connection point on a frame's boundary."""
    id: str                          # e.g. "top", "bottom", "left", "right"
    side: str                        # "top" | "bottom" | "left" | "right"
    position: float = 0.5           # 0.0–1.0 along the side (0.5 = midpoint)
    offset: tuple[float, float] = (0, 0)  # absolute offset after position calc

@dataclass  
class ResolvedPort:
    """A port with computed absolute canvas coordinates."""
    frame_id: str
    port_id: str
    side: str
    x: float
    y: float
```

**Default ports:** Every frame automatically gets 4 ports at edge midpoints:
- `top` → (x + w/2, y)
- `bottom` → (x + w/2, y + h)
- `left` → (x, y + h/2)
- `right` → (x + w, y + h/2)

**Custom ports** (future): YAML can declare additional ports for fan-in/fan-out:
```yaml
ports:
  - id: top-left
    side: top
    position: 0.25
  - id: bottom-right
    side: bottom  
    position: 0.75
```

### 3.2 Arrow reference syntax

Current: `source: "box_id"` or `source: "box_id.side"`

Proposed (backward-compatible extension):

| Syntax | Meaning |
|--------|---------|
| `source: box_id` | Auto-infer best port (current behavior, improved) |
| `source: box_id.bottom` | Use the `bottom` midpoint port |
| `source: box_id:port_name` | Use a named custom port |
| `source: container_id/child_id` | Explicitly target a child inside a container |
| `source: container_id/child_id.bottom` | Child's bottom port |

The `/` separator for hierarchy is the key new feature. Currently `source: logging` could match either a top-level `logging` frame or a nested one, and the router has no way to express "the `logging` that lives inside `core`". With path syntax: `source: core/logging.bottom`.

### 3.3 Port resolution pipeline

```
Arrow YAML → parse reference → resolve frame ID → resolve port → absolute coordinates
```

**Step 1: Parse reference**
```
"core/logging.bottom"  →  path=["core", "logging"], port="bottom"
"tgw"                  →  path=["tgw"],              port=None (auto)
"box_id:fan-out-1"     →  path=["box_id"],           port="fan-out-1"  
```

**Step 2: Resolve frame ID**
Walk the frame tree using the path segments. `core/logging` means "find `core`, then find `logging` among its children." Plain `tgw` does a flat lookup in `bounds_map` (backward compat).

**Step 3: Resolve port**
- If port is explicit (`bottom`, `right`, etc.): compute the absolute coordinates from the frame's placed bounds
- If port is `None`: run improved side inference

**Step 4: Side inference (improved)**

The new `_infer_best_ports()` replaces `_infer_sides()`:

```
Given source frame S and target frame T (with absolute bounds):

1. Compute edge gaps on all 4 axis pairs:
   gap_S_bottom_to_T_top  = T.y - (S.y + S.h)
   gap_S_top_to_T_bottom  = S.y - (T.y + T.h)  
   gap_S_right_to_T_left  = T.x - (S.x + S.w)
   gap_S_left_to_T_right  = S.x - (T.x + T.w)

2. Score each (source_side, target_side) pair:
   score = gap_distance                         # prefer shortest gap
         - overlap_penalty if boxes overlap      # penalize overlapping pairs
         + alignment_bonus if midpoints align    # prefer aligned ports
         - obstruction_penalty                   # penalize if path crosses obstacles

3. Pick the pair with the best score.
```

This replaces the current binary v_gap/h_gap decision with a multi-factor scoring system.

### 3.4 Routing algorithm

Keep the A*-based orthogonal router but fix its structural issues:

**3.4.1 Obstacle model**

Current: `leaf_obstacles` dict built from `bounds_map` entries where `is_leaf=True`.

Problem: Container boundaries should be semi-transparent — arrows from *inside* a container should be able to exit through the container boundary, but arrows from *outside* should not cross into the container's interior arbitrarily.

Fix: **Obstacle classification:**

```python
@dataclass
class RoutingObstacle:
    rect: tuple[float, float, float, float]  # x, y, w, h inflated
    frame_id: str
    is_leaf: bool
    parent_id: str | None
```

For each arrow, build a per-arrow obstacle set:
1. Start with all leaf boxes
2. Exclude source and target (current behavior)
3. **Also exclude all ancestors of source and target** (allows routing through container boundaries)
4. **Also exclude all siblings' containers along the path** (allows routing through intermediate containers when going from nested child to external target)

**3.4.2 Grid construction (improved)**

Current: grid built from obstacle corners only.

Problem: routing grid has no intermediate points between widely-spaced obstacles, forcing the router into suboptimal paths.

Fix: Add **channel midpoints** — for each gap between adjacent obstacles, add a grid line at the midpoint. This gives the router more routing channel options:

```python
def _build_routing_grid(start, end, obstacles):
    xs = {start.x, end.x}
    ys = {start.y, end.y}
    for x0, y0, x1, y1 in obstacles:
        xs.update([x0, x1])
        ys.update([y0, y1])
    
    # Add channel midpoints between adjacent grid lines
    sorted_xs = sorted(xs)
    sorted_ys = sorted(ys)
    for i in range(len(sorted_xs) - 1):
        mid = (sorted_xs[i] + sorted_xs[i+1]) / 2
        xs.add(mid)
    for i in range(len(sorted_ys) - 1):
        mid = (sorted_ys[i] + sorted_ys[i+1]) / 2
        ys.add(mid)
    
    return sorted(xs), sorted(ys)
```

**3.4.3 Exit/entry stub (generalized)**

Current: only handles 3-point L-shaped paths.

Fix: Apply the wedge rule to **all** segments, not just L-shapes:

```
For each segment in the path:
  If segment[i] is the first segment (exit from source):
    Ensure it extends at least ARROW_EXIT_CLEARANCE perpendicular to the source edge
  If segment[i] is the last segment (entry to target):
    Ensure it extends at least ARROW_CLEARANCE perpendicular to the target edge
  If any segment runs parallel to an adjacent box edge within ARROW_CLEARANCE:
    Push it to the midpoint of the gap
```

**3.4.4 Bend penalty tuning**

Current: flat `8.0` penalty per bend.

Better: **Direction-aware penalties:**
- Bend away from the target: +12
- Bend toward the target: +4
- U-turn (180°): +24
- Maintain straight line toward target: 0

### 3.5 Nested arrow routing

This is the most important fix. Currently:

```yaml
arrows:
  - source: modernisation    # a container (row1 child)
    target: tgw              # a leaf box (row2 child)
```

The arrow connects container-to-leaf. The user *means* "from the modernisation group down to the TGW box." But `modernisation` is a container with children `lz`. The arrow should exit from `modernisation`'s bottom edge, not from `lz`'s bottom edge.

**Rules for nested routing:**

1. **If the source/target IS a container**: attach the arrow to the container's own edge (not a child's edge). The container acts as a single entity for this arrow.

2. **If the source/target is a child inside a container**: attach to the child's edge. The arrow must route through the parent container's boundary.

3. **Path syntax resolves ambiguity**: `source: core/logging` means "the logging box inside core — attach to logging's edge, route through core's boundary." `source: core` means "the core container itself — attach to core's edge."

4. **Container boundary crossing**: When an arrow exits a child inside a container, the routing algorithm must:
   - Start from the child's port
   - Route through the container's interior (container is NOT an obstacle for this arrow)
   - Cross the container boundary
   - Continue routing in the exterior space

5. **Visual treatment at boundary crossings**: The arrow simply passes through the container border. No special visual marker needed (same as draw.io behavior).

### 3.6 SVG rendering improvements

Current: arrow geometry (head shape, shaft segments) computed in `diagram_render_svg.py`.

**Architecture violation** (flagged in planning repo audit): arrow geometry should be pre-computed in the layout pass, not computed during rendering.

Fix: `_route_arrows()` returns fully resolved geometry:

```python
@dataclass
class ArrowPrimitive:
    shaft_segments: list[tuple[float, float, float, float]]  # (x1,y1,x2,y2) per segment
    head_vertices: list[tuple[float, float]]                 # 3 vertices of triangle
    label_position: tuple[float, float] | None
    label_text: str | None
    color: str
    source_ref: str
    target_ref: str
```

The SVG renderer then becomes a trivial emitter:
```python
for seg in arrow.shaft_segments:
    emit_line(seg)
emit_polygon(arrow.head_vertices)
```

This also fixes the draw.io renderer duplication — both SVG and draw.io renderers consume the same pre-computed geometry.

## 4. Implementation plan

### Phase 1: Port model + path syntax (foundation)

1. Add `Port` and `ResolvedPort` dataclasses to `frame_model.py`
2. Add default port computation to `_render_frame()` — every frame gets 4 midpoint ports stored in a `port_map: dict[str, ResolvedPort]`
3. Extend `_parse_ref()` to handle `/` hierarchy separator and `:` custom port syntax
4. Add frame-tree path resolution (walk tree by path segments)
5. Tests: port computation, reference parsing, path resolution

### Phase 2: Improved side inference

1. Replace `_infer_sides()` with `_infer_best_ports()` using multi-factor scoring
2. Use resolved ports (from port_map) instead of raw bounds for edge points
3. Tests: scoring produces correct results for all existing diagram arrow pairs

### Phase 3: Obstacle model fix

1. Refactor obstacle construction to be per-arrow with ancestor exclusion
2. Add container boundary transparency for nested arrows
3. Tests: nested child-to-external routing, container-to-leaf routing

### Phase 4: Grid + routing improvements

1. Add channel midpoints to routing grid
2. Generalize wedge rule to all segments (not just 3-point paths)
3. Direction-aware bend penalties
4. Tests: routing quality on all existing diagrams, no regressions

### Phase 5: Geometry pre-computation

1. Move arrowhead geometry computation from renderers into `_route_arrows()`
2. Extend `ArrowPrimitive` with `shaft_segments` and `head_vertices`
3. Simplify SVG and draw.io renderers to trivial emitters
4. Tests: visual parity (SVG output unchanged)

### Phase 6: Crossing minimization (stretch)

1. After all arrows are routed, detect crossings
2. Try swapping port assignments for crossing pairs
3. Re-route swapped arrows
4. Accept swap if crossing count decreases
5. Tests: crossing count metrics on multi-arrow diagrams

## 5. Migration strategy

All changes are backward-compatible:
- `source: box_id` continues to work (flat lookup + auto-infer)
- `source: box_id.side` continues to work (flat lookup + explicit side)
- New syntax `source: parent/child.side` is additive
- Port model adds default ports automatically; no YAML changes needed
- Rendering output should be visually identical or better for all existing diagrams

## 6. Validation

After each phase:
1. All 205+ existing tests pass
2. All 24 diagrams pass automated overlap/overflow audit
3. Browser-verify: request-to-hardware-stack, example-platform-architecture, android-custom-to-cloud, complex-routing-usecase
4. No arrow regression in any existing diagram

## 7. Non-goals

- Full ELK integration (that's ROADMAP Stage 16)
- Spline/curved routing
- Automatic node placement (we have fixed frame layout)
- Multi-arrow bundling (future work)
- Force-directed arrow routing (separate editor)
