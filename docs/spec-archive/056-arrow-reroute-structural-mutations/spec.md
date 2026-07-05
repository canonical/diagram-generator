# Spec 056: Arrow Reroute Structural Mutations

**Feature Branch**: `feat/056-arrow-reroute-structural-mutations`  
**Status**: Closeout Ready  
**Created**: 2026-06-27

## Problem

The routing pipeline can produce correct arrows on initial render and still fail
once users mutate route-bearing structure in the editor.

Inbox reports point at the same missing contract:

- changing the top-level page direction on a saved v3 example can break arrow
  attachments
- resizing in v3 can leave arrows visually stale or obviously wrong

The issue is not a single bad fixture. The preview mutation pipeline lacks an
explicit typed rule for when structural edits, size edits, or relayout-bearing
override changes must invalidate and recompute routed arrow geometry.

## Goals

- Define mutation-driven reroute invalidation as a typed preview-shell contract.
- Guarantee that direction, size, position, and layout edits reroute arrows when
  they change route inputs.
- Preserve authored attachment semantics such as `arrow:<id>` and explicit arrow
  ids through relayout-triggering edits.
- Cover both live editor behavior and persisted reload behavior.

## Non-goals

- No broad redesign of the underlying routing algorithm in spec 006.
- No YAML-schema expansion unless a missing route input contract truly requires
  it.
- No fixture-only patching.

## Grouped Inbox Notes

- Changing a top-level saved v3 page from horizontal to vertical breaks arrow
  attachment.
- Resizing in v3 breaks arrows because reroute does not appear to happen.

## Functional Requirements

- **FR-001**: The preview shell must define a typed reroute invalidation trigger
  set for structural and size-bearing edits.
- **FR-002**: Page-direction changes must trigger reroute recomputation before
  the next visible render.
- **FR-003**: Resize interactions must recompute routed arrows from the updated
  geometry on live preview and on final drop.
- **FR-004**: Reroute recomputation must preserve authored arrow identity and
  authored attachment targets.
- **FR-005**: Save/reload coverage must prove route-bearing structural edits
  persist and reopen correctly.
- **FR-006**: The implementation must stay in TypeScript preview-shell and
  routing owners.

## Success Criteria

- **SC-001**: Focused tests prove top-level direction changes do not break arrow
  attachments.
- **SC-002**: Focused tests prove resize-triggered rerenders update arrow
  geometry correctly.
- **SC-003**: Persist->reload coverage exists for at least one direction-change
  and one resize-triggered arrow case.
- **SC-004**: `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, and, if browser exports change,
  `npm --prefix packages/layout-engine run build:browser` pass.

## Dependencies

- Spec 006 for the routing substrate.
- Spec 054 rules if any save-path contract changes are required.

## Status Notes

- 2026-06-27: Reproduced the direction-change and resize failures against the
  preview relayout path and traced them to stale authored arrow waypoint reuse.
- 2026-06-27: Added typed reroute invalidation for route-bearing frame overrides
  in local relayout and fresh render owners.
- 2026-06-27: Added save/reload coverage that clears stale authored waypoint
  geometry while preserving arrow ids and `arrow:<id>` attachment targets.
- 2026-06-27: Full validation is green across `packages/layout-engine`,
  `packages/layout-engine` browser bundle, `apps/preview`, and the no-new-Python
  guard.
