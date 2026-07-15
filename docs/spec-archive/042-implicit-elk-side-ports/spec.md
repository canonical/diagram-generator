# Feature Specification: Implicit ELK side ports

**Feature Branch**: `feat/042-implicit-elk-side-ports`

**Created**: 2026-06-13

**Status**: Draft

**Input**: Make ELK layered use native port-based midpoint attachment on box sides so edge attachment becomes deterministic without adding YAML authoring burden, while keeping ELK authoritative for edge routes and edge-label placement.

## Problem Statement

The current ELK layered integration connects edges directly to nodes, not to explicit ports. That leaves ELK free to guess attachment sides and anchor positions per layout run. In practice, this causes several problems:

- edge anchors drift when layout parameters change
- edges can enter and leave the same box from visually awkward sides
- headed or icon-bearing compounds can be treated too conservatively even though their header chrome should be decorative, not a reason to abandon native ELK
- controls such as `portConstraints` appear configurable even though the current graph model has no ports to constrain
- authors cannot improve edge readability without hand-tuning unrelated spacing controls
- post-ELK route repair creates rendering smells such as broken arrowheads, synthetic fan-out, and routes cutting through ELK-managed edge labels

We need ELK to reason about stable connection points natively, but we do not want diagram authors to hand-author port objects in YAML for ordinary boxes, and we do not want TypeScript to become a second arrow-routing engine layered on top of ELK.

## Implementation Boundary

This feature is **TypeScript-authority in the ELK graph path**.

- YAML remains the source of truth for diagram content and box structure.
- Ports are generated implicitly from node geometry in TypeScript.
- The initial scope is ELK layered only.
- No new Python path or authored YAML schema is allowed.
- ELK remains the authority for node placement, edge routes, bend points, and edge-label placement.
- TypeScript may configure graph inputs, supported ELK options, and coordinate translation, but MUST NOT re-route returned ELK edges or synthesize new arrow geometry after layout.

## User Scenarios & Testing

### User Story 1 - Ordinary boxes get deterministic side anchors automatically (Priority: P1)

As a diagram author, I want ordinary boxes to expose sensible connection points automatically so arrows attach predictably without extra YAML.

**Independent Test**: A simple service/dataflow diagram with multiple arrows routes through generated side ports and preserves attachment-side stability across reruns, while the rendered path still follows ELK's returned route geometry.

**Acceptance Scenarios**:

1. **Given** a box with incoming and outgoing edges, **When** ELK layered runs, **Then** the edge endpoints attach through generated side-midpoint ports rather than free node-center heuristics.
2. **Given** the same diagram with a spacing or layering parameter change, **When** ELK layered reruns, **Then** attachment sides remain semantically stable unless graph direction or topology requires a change.
3. **Given** ELK returns routed sections and edge-label geometry, **When** the diagram renders, **Then** the displayed arrow path follows that ELK output rather than a TypeScript reroute pass.

---

### User Story 2 - No new YAML burden for ordinary diagrams (Priority: P1)

As a maintainer, I need port behavior to improve layout quality without introducing manual port authoring for standard boxes.

**Independent Test**: Existing frame YAML renders through ELK layered with improved edge attachment and no new required fields.

**Acceptance Scenarios**:

1. **Given** an existing frame YAML diagram, **When** ELK layered uses implicit ports, **Then** the YAML schema remains unchanged.
2. **Given** a diagram with no special connector needs, **When** it is authored or edited, **Then** no explicit port configuration is required.

---

### User Story 3 - The preview stops exposing dead port controls (Priority: P1)

As a preview user, I need the ELK inspector to stop advertising `portConstraints` as a meaningful authored control when the implementation owns port side selection internally.

**Independent Test**: After implicit ports are introduced, the preview no longer renders a `portConstraints` control, and legacy YAML values do not override fixed-side generated-port behavior.

**Acceptance Scenarios**:

1. **Given** a diagram routed through implicit ports, **When** layout runs, **Then** generated ports use fixed-side semantics even if legacy YAML still carries `meta.elk.elk.portConstraints: FREE`.
2. **Given** the ELK inspector renders for an `elk-layered` diagram, **When** the control list is built, **Then** `portConstraints` is not shown as a user-tunable setting.

---

### User Story 4 - Arrow rendering stays a thin pass over ELK output (Priority: P1)

As a maintainer, I want arrow rendering to stay a thin styling pass over native ELK geometry so we do not accumulate a fragile second routing system.

**Independent Test**: A real ELK frame with arrow labels and multiple outgoing edges renders from native ELK route sections with correctly oriented arrowheads and no preview-side fan-out synthesis.

**Acceptance Scenarios**:

1. **Given** a diagram laid out by ELK layered, **When** arrowheads are drawn, **Then** their direction is derived from the final ELK segment, not from a separately recomputed path.
2. **Given** a shared-source fan-out case, **When** ELK provides native shared behavior via a supported option, **Then** the implementation may enable that option; **Otherwise** the rendered result stays with default ELK edge behavior instead of a custom TypeScript fan-out pass.
3. **Given** an edge label placed by ELK, **When** the diagram renders, **Then** the integration does not rewrite the route in a way that creates new route-over-label collisions.

## Edge Cases

- nodes with many incident edges on one side; the first slice still uses one logical midpoint port per side
- compound nodes that are direct arrow endpoints versus compounds that exist only as structural carriers
- headed or icon-bearing compounds whose header chrome should move with the box as decorative padding/background, not as a separate ELK-participating layout node
- very small nodes where side-midpoint attachment can collide with labels or icons
- `elk.direction` overrides that reverse the family default axis (`UP` or `LEFT`)
- diagrams that mix semantic containers and ordinary endpoint boxes
- shared-source fan-out where default ELK behavior may not produce a shared stem unless a supported native option is enabled
- diagrams with edge labels where any post-layout route shaping would invalidate ELK's label placement assumptions

## Requirements

### Functional Requirements

- **FR-001**: The shared graph IR MUST allow nodes to expose optional ports and edges to reference a specific `sourcePort` and `targetPort` without breaking existing callers that do not use ports.
- **FR-002**: The ELK graph builder MUST generate implicit ports automatically for eligible nodes from node geometry; YAML authors MUST NOT supply port data in this slice.
- **FR-003**: The default implicit port set for an eligible rectangular node MUST be exactly four side-midpoint ports: `top`, `right`, `bottom`, and `left`, each with a stable id derived from the node id plus side.
- **FR-004**: The ELK integration MUST express port-based attachment through native ELK graph inputs only: declared ports plus supported edge-port references and supported ELK options.
- **FR-005**: If the chosen ELK layered configuration requires explicit endpoint-port refs, edge endpoints MUST connect through generated `sourcePort` / `targetPort` ids rather than unconstrained node bodies.
- **FR-006**: If the chosen ELK layered configuration can natively choose among declared ports without explicit endpoint-port refs, the implementation MAY use that behavior; any such choice MUST remain native ELK behavior rather than a post-layout repair pass.
- **FR-007**: Any preferred ingress and egress side policy MUST be expressed through ELK input modeling or supported ELK options only; the implementation MUST NOT mutate returned ELK routes to repair side choice.
- **FR-008**: Structural carrier nodes MUST NOT receive implicit ports unless that exact frame id is an authored arrow endpoint; carrier-only compounds remain layout structure only. Headed or icon-bearing compounds remain ELK-eligible when their header chrome is treated as decorative padding/background rather than as graph-participating layout nodes.
- **FR-009**: The first implementation MUST use one logical midpoint port per side.
- **FR-010**: If a supported native ELK option exists for shared-source fan-out or merged stems and is compatible with the chosen layered-plus-port setup, the implementation MAY enable it; otherwise the result MUST stay with default ELK edge behavior.
- **FR-011**: The implicit-port feature MUST remain TypeScript-internal and MUST NOT require new YAML fields or authored port objects.
- **FR-012**: Generated-port nodes MUST enforce fixed-side semantics in the ELK graph even if legacy YAML still carries `meta.elk.elk.portConstraints` values such as `FREE`.
- **FR-013**: The preview ELK controls MUST stop exposing `elk.portConstraints` as a user-authored knob in this slice.
- **FR-014**: Existing `elk-layered` frame YAML MUST continue to render without schema migration; legacy saved `elk.portConstraints` keys SHOULD be scrubbed when YAML is rewritten, but MUST NOT weaken runtime behavior if they remain.
- **FR-015**: ELK-returned edge sections and ELK-returned edge-label geometry MUST remain authoritative; post-processing MAY translate coordinates or serialize data, but MUST NOT add synthetic bend points, shared stems, reroutes, or label-avoidance passes.
- **FR-016**: Optional same-size box behavior MAY be supported only if it stays an input-side node-sizing concern and does not require post-layout route rewriting.
- **FR-017**: The IR and builder changes MUST remain compatible with a future explicit-authored-port model shared with spec 006.

### Non-Functional Requirements

- **NFR-001**: Port generation SHOULD be deterministic for the same graph input and option set.
- **NFR-002**: The implementation SHOULD minimize author-facing complexity by keeping ordinary port behavior implicit.
- **NFR-003**: The integration SHOULD keep ELK as the single routing authority and avoid duplicating route logic in TypeScript or preview-only code.
- **NFR-004**: The first iteration SHOULD prefer a small, testable graph-IR and render-path change over a broad editor-surface change.
- **NFR-005**: The design MUST leave room for future explicit authored ports without forcing them into the initial release.

## Success Criteria

- **SC-001**: ELK layered diagrams show more stable, readable edge attachments under parameter changes.
- **SC-002**: `portConstraints` is no longer shown as a preview control, and legacy `FREE` values no longer weaken fixed-side generated-port behavior.
- **SC-003**: Existing frame YAML continues to work with no required schema change.
- **SC-004**: ELK-managed arrows render from native ELK route sections with correct final-segment arrowhead orientation.
- **SC-005**: Focused tests cover stable port ids, endpoint attachment refs, and at least one real diagram regression without relying on a custom reroute layer.

## Out of Scope

- authored YAML port definitions in the first iteration
- multiple distinct generated ports per side or manual same-side lane ordering
- force-layout port support
- arbitrary custom connection points per shape
- TypeScript-side arrow rerouting, synthetic shared-stem fan-out, endpoint bend insertion, or label-avoidance passes layered on top of ELK
- preview-only fixes that change ELK edge geometry instead of changing ELK inputs or supported ELK options
- reintroducing ELK `INTERACTIVE` controls

## First-Iteration Decisions

1. **Eligible nodes**: Only authored arrow endpoint nodes get implicit ports. Structural carriers remain unported. Compound nodes get ports only when they are referenced directly as `source` or `target`. Headed compounds stay ELK-compatible; their heading/icon chrome remains decorative and moves with the box instead of participating in ELK layout.
2. **Port count**: The first slice uses one logical midpoint port per side. Multiple generated lanes per side are deferred.
3. **Authority**: ELK owns route geometry and edge-label placement. The render path may translate coordinates and apply visual styling, but it does not redesign arrows after layout.
4. **Shared-source behavior**: If a compatible native ELK option exists for shared fan-out, it may be enabled. If not, the feature accepts default ELK behavior instead of emulating shared stems in TypeScript.
5. **Box sizing**: Optional same-size box behavior is acceptable only when expressed as input-side sizing and kept separate from edge-routing ownership.
6. **Spec 006 overlap**: This feature may share the optional IR port shapes with spec 006, but it does not introduce authored side-qualified endpoint selectors or a second native-router layer in this release.
