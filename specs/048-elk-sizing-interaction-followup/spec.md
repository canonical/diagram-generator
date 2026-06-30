# Feature Specification: ELK sizing and interaction follow-up

**Feature Branch**: `feat/048-elk-sizing-interaction-followup`

**Created**: 2026-06-22

**Status**: Closeout Ready 2026-06-29 — ELK live-resize was re-proven through
spec 065's real-gesture harness. The resize fix lands via spec 065
(`PreviewRenderIntent` + engine-backed resize lane), and
`specs/065-interactive-relayout-contract/evidence/post-load-mutations-result.json`
now shows `ok: true` with `mongo_clients` resized from 224px to 304px and status
remaining `Ready`. Closing gate:
[`specs/065-interactive-relayout-contract/verification-protocol.md`](../065-interactive-relayout-contract/verification-protocol.md).
See [`docs/spec-reviews/CLINE-VERDICT-2026-06-28.md`](../../docs/spec-reviews/CLINE-VERDICT-2026-06-28.md).
(was: Closeout Ready)

**Priority**: Highest active ELK/product follow-up

**Depends on**: spec 046 closeout architecture, spec 044 preview-shell architecture follow-up, spec 042 implicit ELK side ports

## Problem Statement

Spec 046 made the preview shell architecture ready for many engines, but the
current ELK lane still has user-visible sizing and interaction regressions:

- multi-selected ELK boxes set to `FILL` do not become equal size even when the
  native v3 semantic layout does
- manual width edits and resize interactions can leave text wrapping stale until
  a later full render
- resize feedback is too delayed for interactive editing because the visible
  relayout path effectively completes on drop
- parent/container text insets can drift between v3 and ELK, especially for
  headed/parent-styled frames
- exposed ELK controls need a stricter option-surface contract and better debug
  visibility for selective flattening

These are product and layout-engine follow-ups. They are not reasons to reopen
spec 046 unless the fix widens legacy JS sinks or reintroduces central
engine/document branches.

## Scope

This spec covers:

- ELK non-fixed sizing semantics for `FILL` / `HUG` / `FIXED` per axis
- interactive preview remeasurement after width changes
- live resize feedback during drag
- ELK parent/headed container text inset parity with v3
- ELK layered option-surface hardening
- debug-only introspection of authored frame tree vs ELK input graph

This spec does not cover:

- adding new engine families such as Mermaid, D2, Dagre, state, tree, swimlane,
  ER, or class layouts
- reopening the spec 046 architecture closeout
- broad preview-host modularity owned by spec 045
- render IR convergence owned by spec 047

## User Stories & Testing

### User Story 1 - Set selected ELK boxes to fill (Priority: P1)

As a diagram author, when I select peer boxes in an ELK-backed diagram and set
their width/height to Fill, I expect them to obey the same semantic fill sizing
contract as v3 unless an explicit fixed size overrides it.

**Independent test**: applying `sizing_w: FILL` and `sizing_h: FILL` to the
top-level boxes in `request-to-hardware-stack` produces equal top-level sizes
under `layoutElkFrameDiagram(...)`, matching native semantic layout sizing.

### User Story 2 - Width edits rewrap text immediately (Priority: P1)

As a diagram author, when I make a box wider, I expect HarfBuzz measurement and
text wrapping to rerun so text unwraps as soon as the width changes.

**Independent test**: a manual width override or resize update enters the typed
relayout/measure path and produces updated text line breaks before save/export.

### User Story 3 - Resize updates during drag (Priority: P1)

As a diagram author, I expect resize handles to feel interactive, with visual
feedback during drag instead of only after dropping the handle.

**Independent test**: live resize dispatches bounded/coalesced updates through
typed preview-shell owners and final drop uses the same measurement contract.

### User Story 4 - ELK parent chrome matches v3 rhythm (Priority: P2)

As a diagram author, I expect parent/headed frames to keep consistent top text
spacing across v3 and ELK layouts.

**Independent test**: a focused headed/parent frame fixture compares ELK and v3
text/chrome inset expectations without relying on screenshots.

### User Story 5 - Debug selective flattening (Priority: P2)

As a maintainer, I need to see the authored frame tree and the ELK input graph
after selective flattening so I can reason about compound retention and edge
attachment without changing persisted diagram behavior.

**Independent test**: a debug-only inspection path exposes authored tree and
ELK input graph data without writing new YAML or adding a persisted toggle.

## Functional Requirements

- **FR-001**: ELK layout MUST preserve explicit `FIXED` dimensions as
  authoritative input sizes.
- **FR-002**: ELK layout MUST preserve the native semantic sizing contract for
  non-fixed `FILL` axes when semantic layout has equalized peer boxes.
- **FR-003**: ELK layout MUST not collapse `FILL` peer stacks into uneven
  intrinsic compound widths after ELK placement.
- **FR-004**: Headed compound endpoints MUST keep synthetic heading/body
  placement valid after any semantic size restoration.
- **FR-005**: Manual width edits MUST rerun text measurement/wrapping through
  TypeScript-owned preview-shell paths.
- **FR-006**: Live resize MUST provide visual updates during drag through a
  bounded/coalesced update path, not only on pointer-up.
- **FR-007**: Final resize/drop and live resize MUST share the same measurement
  and override semantics.
- **FR-008**: ELK parent/headed container text insets MUST match the v3 chrome
  contract unless a deliberate engine-specific exception is documented.
- **FR-009**: ELK layered controls exposed to the UI/save surface MUST have
  matching behavior coverage or explicit caveat copy.
- **FR-010**: Unsupported or implementation-owned ELK options MUST stay hidden
  from author-facing controls.
- **FR-011**: The debug authored-tree vs ELK-input view MUST be debug-only and
  MUST NOT become a persisted layout behavior toggle.
- **FR-012**: Fixes under this spec MUST NOT add behavior-heavy JS under
  `scripts/preview/`.
- **FR-013**: Fixes under this spec MUST NOT widen `editor.js` or
  `layout-bridge.js` as engine behavior owners.

## Non-Functional Requirements

- **NFR-001**: Prefer one focused owning-layer test per behavior over broad
  screenshot or browser suites.
- **NFR-002**: Preserve the live YAML -> TypeScript -> SVG path.
- **NFR-003**: Keep debug/introspection data structured so later tooling can
  reuse it without string parsing.
- **NFR-004**: Keep ELK-specific translation inside ELK-owned adapters and
  layout integration modules, not in shared graph substrate contracts.

## Success Criteria

- **SC-001**: `request-to-hardware-stack` peer boxes set to Fill produce equal
  top-level sizes in the ELK lane.
- **SC-002**: Fixed-size ELK regression tests remain green.
- **SC-003**: Width edits and live resize trigger updated text measurement
  without requiring a save/reload cycle.
- **SC-004**: Resize interaction visibly updates during drag through typed
  preview-shell owners.
- **SC-005**: ELK parent/headed text inset drift is covered by a focused test
  and corrected.
- **SC-006**: ELK option controls cannot expand without a matching contract
  test or documented caveat.
- **SC-007**: A maintainer can inspect authored tree vs ELK input graph for a
  real diagram without changing persisted layout behavior.

## Primary Entry Point For Agents

Start with [`tasks.md`](./tasks.md), then use
[`elk-sizing-interaction-flow.md`](./elk-sizing-interaction-flow.md) for the
cross-layer map. Do not use `TODO.md` as the implementation checklist.
