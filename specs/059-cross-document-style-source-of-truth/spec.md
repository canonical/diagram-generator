# Spec 059: Cross-Document Style Source Of Truth

**Feature Branch**: `feat/059-cross-document-style-source-of-truth`  
**Status**: Closeout Ready
**Created**: 2026-06-27

## Problem

Document kinds that should feel visually related are drifting apart.

The clearest reported example is `service-handshake-sequence`:

- no engine is shown in the shell even though an engine notion exists
- box spacing does not match the canonical v3 box rhythm
- fixing it ad hoc would deepen the current problem, which is that style facts
  are not owned cleanly in one reusable source across renderers/examples

This is a style-contract problem, not a one-fixture tuning task.

## Goals

- Establish one reusable style authority for shared box rhythm across document
  kinds that are meant to look on-brand together.
- Remove document-kind-specific spacing drift where the same conceptual box
  chrome should resolve to the same rhythm.
- Show active engine identity consistently where it materially helps explain the
  current document lane.
- Keep the contract TypeScript-owned and aligned with `DIAGRAM.md`,
  `tokens.ts`, `frame-classes.ts`, and the active renderer owners.

## Non-goals

- No broad visual redesign of the whole product.
- No screenshot-only approval flow.
- No one-off fixture literals to make `service-handshake-sequence` look right.

## Grouped Inbox Notes

- `service-handshake-sequence` shows no engine.
- Its box spacing/top rhythm does not match v3.
- The user explicitly asked for one source of styling reused across examples so
  one change updates the full set.

## Functional Requirements

- **FR-001**: Shared box rhythm tokens must be owned in one reusable TS contract
  rather than copied separately in document-kind renderers.
- **FR-002**: Renderers that use the same conceptual box chrome must consume the
  same spacing/style contract unless a documented exception exists.
- **FR-003**: The sequence lane must prove parity or a deliberate exception for
  box top spacing, padding rhythm, and related chrome metrics.
- **FR-004**: Engine identity display must be available for the sequence lane if
  it helps explain the active document/renderer path.
- **FR-005**: Tests must protect the shared style contract without requiring
  screenshot capture.

## Success Criteria

- **SC-001**: A focused style-parity test proves the relevant sequence and v3
  box rhythm now share one source of truth or a documented exception path.
- **SC-002**: Host/viewer tests prove engine identity display is present where
  the lane needs it.
- **SC-003**: `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, and
  `node scripts/check_no_new_python.mjs` pass.

## Dependencies

- Spec 047 render IR unification for shared renderer ownership.
- Spec 055 if engine-identity display work shares host chrome with engine
  workspace navigation.

## Closeout Notes

- `SHARED_BOX_RHYTHM` is the reusable TypeScript contract for shared box body
  font size, line step, text inset, minimum box height, and headed-frame bottom
  spacing.
- Frame render plans and the sequence layout/SVG renderer consume the shared
  contract; the sequence lane no longer carries a separate annotation font size.
- Browser evidence records `service-handshake-sequence` rendering through
  `data-layout-engine="sequence"`, showing `Engine: Sequence layout`, and
  emitting one 18px text size with 8px text insets.
