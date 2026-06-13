# Feature Specification: Implicit ELK side ports

**Feature Branch**: `feat/042-implicit-elk-side-ports`

**Created**: 2026-06-13

**Status**: Draft

**Input**: Make ELK layered use automatic midpoint ports on box sides so edge attachment becomes deterministic without adding YAML authoring burden.

## Problem Statement

The current ELK layered integration connects edges directly to nodes, not to explicit ports. That leaves ELK free to guess attachment sides and anchor positions per layout run. In practice, this causes several problems:

- edge anchors drift when layout parameters change
- edges can enter and leave the same box from visually awkward sides
- controls such as `portConstraints` appear configurable even though the current graph model has no ports to constrain
- authors cannot improve edge readability without hand-tuning unrelated spacing controls

We need ELK to reason about stable connection points, but we do not want diagram authors to hand-author port objects in YAML for ordinary boxes.

## Implementation Boundary

This feature is **TypeScript-authority in the ELK graph path**.

- YAML remains the source of truth for diagram content and box structure.
- Ports are generated implicitly from node geometry in TypeScript.
- The initial scope is ELK layered only.
- No new Python path or authored YAML schema is allowed.

## User Scenarios & Testing

### User Story 1 - Ordinary boxes get deterministic side anchors automatically (Priority: P1)

As a diagram author, I want ordinary boxes to expose sensible connection points automatically so arrows attach predictably without extra YAML.

**Independent Test**: A simple service/dataflow diagram with multiple arrows routes through generated side ports and preserves attachment-side stability across reruns.

**Acceptance Scenarios**:

1. **Given** a box with incoming and outgoing edges, **When** ELK layered runs, **Then** the edge endpoints attach through generated side-midpoint ports rather than free node-center heuristics.
2. **Given** the same diagram with a spacing or layering parameter change, **When** ELK layered reruns, **Then** attachment sides remain semantically stable unless graph direction or topology requires a change.

---

### User Story 2 - No new YAML burden for ordinary diagrams (Priority: P1)

As a maintainer, I need port behavior to improve layout quality without introducing manual port authoring for standard boxes.

**Independent Test**: Existing frame YAML renders through ELK layered with improved edge attachment and no new required fields.

**Acceptance Scenarios**:

1. **Given** an existing frame YAML diagram, **When** ELK layered uses implicit ports, **Then** the YAML schema remains unchanged.
2. **Given** a diagram with no special connector needs, **When** it is authored or edited, **Then** no explicit port configuration is required.

---

### User Story 3 - Only meaningful ELK controls remain exposed (Priority: P1)

As a preview user, I need the ELK inspector to expose controls that actually affect the graph model in use.

**Independent Test**: After implicit ports are introduced, `portConstraints` changes produce observable differences where supported; dead or misleading controls are removed or relabeled.

**Acceptance Scenarios**:

1. **Given** a diagram routed through implicit ports, **When** `portConstraints` changes between supported values, **Then** the resulting edge attachment behavior changes in ways consistent with the generated ports.
2. **Given** an ELK option that remains unsupported by the current graph model, **When** the inspector renders, **Then** that option is not shown as if it were active.

## Edge Cases

- nodes with many incident edges on one side that need multiple lanes around a single side midpoint concept
- compound nodes whose outer chrome should not expose the same port policy as leaf boxes
- very small nodes where side-midpoint attachment can collide with labels or icons
- top-to-bottom versus left-to-right diagrams, where the preferred ingress/egress sides differ
- diagrams that mix semantic containers and ordinary endpoint boxes

## Requirements

### Functional Requirements

- **FR-001**: The ELK graph IR path MUST support explicit ports on generated graph nodes.
- **FR-002**: The ELK graph builder MUST generate implicit ports automatically for eligible nodes without requiring YAML-authored port data.
- **FR-003**: The default implicit port set for an ordinary rectangular node MUST include side anchors at the midpoint of the top, right, bottom, and left edges.
- **FR-004**: Edge endpoints MUST connect to generated ports rather than to unconstrained node bodies when the node is port-enabled.
- **FR-005**: The initial implementation MUST define deterministic rules for choosing preferred ingress and egress sides based on graph direction and relative source/target position.
- **FR-006**: The initial implementation MUST keep the implicit-port feature internal to TypeScript and MUST NOT require new YAML fields.
- **FR-007**: The preview ELK controls MUST be audited so `portConstraints` is exposed only if it has real effect on the generated graph model.
- **FR-008**: The implementation MUST preserve compatibility for existing diagrams that do not need authored connector semantics.

### Non-Functional Requirements

- **NFR-001**: Port generation SHOULD be deterministic for the same graph input and option set.
- **NFR-002**: The implementation SHOULD minimize author-facing complexity by keeping ordinary port behavior implicit.
- **NFR-003**: The first iteration SHOULD prefer a small, testable graph-IR extension over a broad editor-surface change.
- **NFR-004**: The design MUST leave room for future explicit authored ports without forcing them into the initial release.

## Success Criteria

- **SC-001**: ELK layered diagrams show more stable, readable edge attachments under parameter changes.
- **SC-002**: `portConstraints` becomes either observably meaningful or removed from the UI.
- **SC-003**: Existing frame YAML continues to work with no required schema change.
- **SC-004**: Focused tests cover port generation, endpoint attachment, and at least one real diagram regression.

## Out of Scope

- authored YAML port definitions in the first iteration
- force-layout port support
- arbitrary custom connection points per shape
- full arrow-routing redesign outside the ELK layered path
- reintroducing ELK `INTERACTIVE` controls

## Open Questions

1. Should compound/container nodes expose implicit ports at all, or should the first iteration restrict ports to leaf nodes?
2. When several edges need the same side, should we fan them across multiple generated side ports or allow ELK to stack several edges on one logical side?
3. Should the first iteration prefer a strict directional policy such as inbound-left/outbound-right for LR and inbound-top/outbound-bottom for TB, or a relative-position policy that can switch sides per neighbor?
4. How should implicit ports interact with spec 006 if and when the broader routing system takes ownership of side selection?
