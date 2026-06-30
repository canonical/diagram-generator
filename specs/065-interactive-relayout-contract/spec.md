# Spec 065: Interactive Relayout Contract (single render intent)

**Feature Branch**: `feat/065-interactive-relayout-contract`
**Status**: Active / administratively blocked 2026-06-29 — behavior tasks
T010–T050 are real-gesture proven and downstream 060/057/048/051 have been
reverified. Only T000 remains unchecked because the required pre-fix
`baseline-fail.json` was not captured before implementation began, so it cannot
be produced truthfully after the fixes.
**Created**: 2026-06-28
**Authority**: [`docs/spec-reviews/CLINE-VERDICT-2026-06-28.md`](../../docs/spec-reviews/CLINE-VERDICT-2026-06-28.md)
**Closing gate**: [`verification-protocol.md`](./verification-protocol.md) (mandatory, every clause)

## Problem

The preview has **two worlds**. On-load rendering is well tested and usually
correct. Post-load interaction is broken across the board, and successive specs
keep closing on proofs that test the seam (a function was called) rather than
the contract (the visible diagram changed in the way the user asked).

The single architectural cause: *render intent is not a single source of truth.*
It is currently spread across `__DG_CONFIG`, `frameTreeJson.layoutEngine`,
per-frame overrides, and three relayout lanes:

1. `performLocalRelayout` — v3 only; patches DOM + `routeArrows`. Skipped when
   the diagram is engine-backed (`app-layout-bridge-runtime.ts`).
2. `performEngineRelayout` — full SVG via `renderFreshPreviewSvg`; live resize
   calls it with `skipModelUpdate: true`.
3. Bridge patch — `patchPreviewFrameGroup` / `patchPreviewArrowSvg`.

Because these lanes read different sources, a gesture can update one without the
render path observing it. That is why "switch engine, nothing changes",
"direction flip leaves arrows behind", and "box-type change triggers relayout"
all persist even when unit tests are green.

Spec 060 already added the first correct piece: `setFrameTreeLayoutEngine` +
`resolveActivePreviewLayoutEngine` + a `data-layout-engine` stamp. This spec
generalizes that into a complete, typed `PreviewRenderIntent` and makes every
post-load gesture and every relayout lane read **only** from it.

## Goals

- One typed `PreviewRenderIntent` committed before any render/relayout.
- Every mutation gesture commits a new intent; render/relayout reads only intent.
- `__DG_CONFIG` is a chrome mirror, never a render input.
- ELK resize never reports "relayout failed".
- Direction flip recomputes layout and reroutes arrows on the real UI gesture.
- Box-type / variant change is appearance-only (no relayout) by contract.
- Proof is by real Playwright gesture and geometry assertion, per the protocol.

## Functional requirements

- **FR-001**: Define `PreviewRenderIntent` (engineId resolved, pageDirection,
  frameOverrides, engineOverrides, gridOverrides) in a typed preview-shell owner.
  It is the only object the render/relayout entry points accept as "what to
  render".
- **FR-002**: All gestures (engine tab, direction select, resize, box-type, ELK
  option) commit a new intent through one typed committer before triggering
  render. No gesture writes engine/direction to `__DG_CONFIG` as the render
  source.
- **FR-003**: `renderFreshPreviewSvg` and every relayout lane resolve engine and
  direction from the committed intent / frame-tree, never from `__DG_CONFIG`.
  The rendered root keeps the truthful `data-layout-engine` stamp.
- **FR-004**: Page-direction change invalidates and recomputes routed arrows so
  endpoints stay attached after layout changes axis.
- **FR-005**: ELK live resize uses an engine-backed relayout path that resolves
  and never throws the "relayout failed" status for a valid resize; the resized
  node reaches the dragged size.
- **FR-006**: A box-type / variant change produces no relayout request when
  geometry is unchanged; node bounds are identical before/after.
- **FR-007**: Panel/chrome visibility sync reads the same resolver as render so
  the aside cannot drift from the rendered engine.
- **FR-008**: No new behavior-heavy ownership in `scripts/preview/*.js`; all
  logic lands in typed preview-shell owners (spec 046 ratchet).

## Success criteria

Every criterion is proven by the spec-065 verification protocol — real gesture,
geometry assertion, fresh bundle/server. No mocks, no hashes, no
`skipModelUpdate` in proofs.

- **SC-001**: `mongo-octavia-ha` and `juju-bootstrap-machines-process`: clicking
  each compatible engine tab changes `data-layout-engine` AND moves node bounds
  in an engine-appropriate way.
- **SC-002**: `tiered-network-architecture`: inspector direction
  HORIZONTAL→VERTICAL flips the spread axis and keeps every arrow endpoint on a
  node perimeter.
- **SC-003**: an `elk-layered` doc: live resize shows no "relayout failed" and
  the node reaches dragged size.
- **SC-004**: `support-engineering-flow`: box-type change leaves all node bounds
  byte-identical and does not change engine.
- **SC-005**: a `v3` doc exposes no ELK/grid N/A controls (hidden + unfocusable),
  proving the panel resolver shares the render resolver.
- **SC-006**: `evidence/post-load-mutations.ts` + JSON + `RESULT.md` committed,
  `ok: true`, plus the standard validation trio green.

## Non-goals

- Auto-style-by-depth (063), grid-overlay regression (061), hug-resize
  propagation (062), arrow-label de-overlap (064) — distinct specs.
- New engine onboarding — owned by 052.

## Dependencies / sequencing

Land 065 first. It unblocks the reopened 060 (direction + real-gesture proof),
057 (browser re-verification of mongo/tiered), 048 (ELK resize), and 051 (panel
resolver sharing). 058/059 must re-pass the protocol matrix before archive.
