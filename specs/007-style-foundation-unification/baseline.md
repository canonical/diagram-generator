# Baseline Report (Phase 1)

Date: 2026-05-30
Feature: 007-style-foundation-unification

## Scope

Covers T001-T003 from tasks.md:

- baseline reproduction and regression capture for style dropdown behavior
- behavior matrix for local-ready vs fallback relayout modes
- inventory of style-derivation branches in preview local renderer

## Environment Snapshot

- Page: `/view/v3:lt-a4-generator`
- Local relayout readiness (`isLocalRelayoutReady()`): `false`
- Frame-tree endpoint for slug `lt-a4-generator`: `200 OK`
- Fallback warnings observed: `v3 relayout: local bridge unavailable, using server fallback`

## T001 - Baseline Repro Capture

Observed and captured in browser automation:

- Style changes now produce visible output in fallback mode.
- Override summary updates (`No overrides` -> `1 override`).
- Example selected component: `row2`

Style option results (fallback mode):

- `""` -> fill `transparent`, stroke `none`
- `default` -> fill `transparent`, stroke `none`
- `parent` -> fill `#F3F3F3`, stroke `none`
- `section` -> fill `transparent`, stroke `none`
- `annotation` -> fill `transparent`, stroke `none`
- `highlight` -> fill `#000000`, stroke `none`

## T002 - Local/Fallback Matrix

### Fallback mode (confirmed)

- Style edits: visible and persisted
- Alignment edits: control state updates and persists
- Sizing edits: control state updates and persists (e.g., `Height -> FIXED 200`)

### Local-ready mode (not observed in this page)

- Readiness remained `false` during test session.
- Matrix row recorded as blocked in this baseline run.
- Follow-up in implementation: add deterministic test harness to force mode transitions (`ready -> fallback -> ready`) independent of page startup timing.

## T003 - Style-Derivation Branch Inventory (preview JS)

Primary style derivation logic remaining in local preview renderer:

- `scripts/preview/layout-bridge.js`
- function `_frameBoxRenderState(frame)`
- branches:
  - `frame.fill === LayoutEngine.Fill.BLACK`
  - `frame.border === "FILL"`
  - `frame.border === "NONE"`
  - icon/text color handling tied to `frame.fill`

Related behavior-gating logic:

- `scripts/preview/editor.js`
- `isV3LocalRelayoutReady()`
- `applyAllOverrides()` -> `isV3FrameManaged()` gating

## Key Baseline Finding

The original no-op bug class is tied to mode/ownership mismatch:

- when local path is unavailable, style controls must still route through fallback and avoid v3-managed suppression of client-side override application
- style interpretation in local renderer remains heuristic and should be aligned to the unified style contract in this feature
