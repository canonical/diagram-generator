# Feature Specification: Autolayout hardening and contract cleanup

**Feature Branch**: `feat/005-autolayout-hardening`

**Created**: 2026-05-30

**Status**: Draft

**Input**: Formalize and execute the high-risk autolayout corrective work currently tracked in TODO/adversarial audit, so layout behavior is predictable, non-patchy, and architecture-clean.

## Problem Statement

Autolayout currently works for the corpus but carries structural risks that can cause regressions and patch-on-patch behavior:

- layout pass mutates semantic `Frame` fields
- style defaults are split across loader and renderer
- heading/body synthesis may silently drop inherited behavior
- measurement/rendering use divergent padding logic
- some parser/default fallbacks hide invalid config

The goal is to convert these into explicit contracts with tests and clear ownership.

## User Scenarios & Testing

### User Story 1 - Layout does not mutate semantic source tree (Priority: P1)

As an engine maintainer, I need measure/place to compute derived geometry without rewriting semantic frame inputs, so repeated runs are idempotent and safe.

**Why this priority**: Semantic mutation is a root architectural risk and multiplies downstream bugs.

**Independent Test**: Run layout twice on the same parsed frame tree and assert semantic fields are unchanged between runs.

**Acceptance Scenarios**:

1. **Given** a frame tree containing `col_span`, FILL/HUG combinations, and min/max constraints, **When** layout runs, **Then** semantic fields (`width`, `sizing_*`, content labels, structure) remain unchanged and only derived layout fields differ.
2. **Given** the same input tree, **When** layout runs repeatedly, **Then** output geometry is stable across runs (idempotent).

---

### User Story 2 - Style resolution has one owner (Priority: P1)

As a renderer maintainer, I need all fill/stroke/text-default decisions resolved once upstream, so the renderer is a pure projection layer.

**Why this priority**: Duplicated style logic causes hidden overrides and visual drift.

**Independent Test**: Add a style-resolution fixture and assert loader output fully determines final rendered style with no renderer-side reinterpretation.

**Acceptance Scenarios**:

1. **Given** a container with no explicit fill/border, **When** defaults are resolved, **Then** renderer emits exactly those resolved values and no additional style branching.
2. **Given** explicit semantic overrides in YAML, **When** rendered, **Then** overrides survive unchanged through render.

---

### User Story 3 - Heading/body synthesis is explicit and lossless (Priority: P1)

As a diagram author, I need heading/body transformation rules to be explicit so behavior does not silently change when parent properties evolve.

**Why this priority**: Silent behavior changes here can break many diagrams at once.

**Independent Test**: Golden tests for heading/body synthetic nodes covering wrap, fill_weight, justify, and spacing combinations.

**Acceptance Scenarios**:

1. **Given** a container with heading and parent-level layout props, **When** synthetic `__heading`/`__body` nodes are produced, **Then** propagation behavior matches documented contract exactly.
2. **Given** any unsupported inheritance path, **When** parsing, **Then** system emits deterministic warning or explicit no-propagation behavior (not accidental fallback).

---

### User Story 4 - Measure/render padding contract is consistent (Priority: P2)

As a layout engineer, I need the same padding model used in measurement and rendering so text never unexpectedly overlaps icon columns or edges.

**Why this priority**: Current mismatch allows subtle visual defects that tests may miss.

**Independent Test**: Compare measured text bounds vs emitted SVG positions for leaf boxes under varied `padding_*` and icon/no-icon combinations.

**Acceptance Scenarios**:

1. **Given** per-side padding overrides, **When** layout and render run, **Then** text origin and wrap width agree between measurement and output.
2. **Given** explicit `padding: 0` values, **When** processed, **Then** they remain zero (no truthiness fallback).

## Edge Cases

- deeply nested mixed-direction trees with col/row spans and min/max constraints
- diagrams using semantic variants (`highlight`, `annotation`) with heading synthesis
- explicit zero values for gap/padding/sizing limits
- malformed enum values for sizing/direction/align/variant

## Requirements

### Functional Requirements

- **FR-001**: Layout MUST NOT mutate semantic `Frame` inputs; derived runtime state must be isolated.
- **FR-002**: Style defaults MUST be resolved in exactly one owning layer and consumed as-is by renderer.
- **FR-003**: Heading/body synthesis behavior MUST be fully specified and test-covered.
- **FR-004**: Measurement and rendering MUST share one padding contract including per-side padding.
- **FR-005**: Invalid enum inputs MUST surface warnings/errors; silent fallback is disallowed except where explicitly documented.

### Non-Functional Requirements

- **NFR-001**: No visual regressions across existing frame corpus unless explicitly accepted in this spec.
- **NFR-002**: Full focused layout test suite remains green.
- **NFR-003**: New behavior must avoid one-off per-diagram conditionals.

## Success Criteria

- **SC-001**: New idempotency test passes and remains stable in CI.
- **SC-002**: No style-resolution logic remains duplicated between loader and renderer.
- **SC-003**: Padding-consistency tests cover at least leaf+icon, leaf-no-icon, heading+body cases.
- **SC-004**: Existing corpus renders without unplanned regressions.

## Out of Scope

- introducing a new visual language
- force-editor UX features unrelated to frame autolayout contracts
- TS parity for arrow routing itself (tracked separately in arrow-routing feature)

## Dependencies

- `docs/architecture/adversarial-audit-2026-05-27.md`
- `docs/architecture/v3-engine-audit.md`
- existing specs 001-004 for style/layout baseline behavior
