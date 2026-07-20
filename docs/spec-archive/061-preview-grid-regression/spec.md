# Spec 061: Preview grid regression investigation

**Feature Branch**: `feat/061-preview-grid-regression`
**Status**: Review
**Created**: 2026-07-05
**Priority**: Spec candidate promoted from INBOX; part of the current
open-work queue alongside spec 064 and spec 070.
**Context**: `INBOX.md` (grid loss note + `image-3.png`; "all elk parameters
gone even when on elk"; "Local relayout failed ... when I change the 9 dot
alignment grid; it should not be present on elk"), spec 043 grid slices,
`docs/agent-index.md`.

## Problem

The Brockman-style layout grid regressed during the preview-shell refactor and
its editor affordances are now both broken and mis-scoped:

1. **The layout grid is lost.** The visible column/row grid overlay that used to
   help align frame children no longer renders as designed. The grid controls in
   the editor now "make no sense" against what the stage shows (`image-3.png`).
   It is not clear whether the overlay geometry, the resolve step, the toggle
   wiring, or the render/mount path regressed.
2. **Grid affordances leak onto engines that do not support them.** The grid
   column/row/gutter/margin controls and the 9-dot alignment control are shown
   for documents and engines that have no grid model (for example ELK layouts).
   They are only disabled, not hidden, and interacting with them throws:
   "Local relayout failed ... when I change the 9 dot alignment grid" on an ELK
   document.

The user asked for two things, in order: **hide the broken affordances now** so
they stop producing errors and confusion, and **root-cause the regression** so a
follow-up can restore or intentionally retire the layout grid. This spec owns
both the immediate containment and the investigation. It does not commit to a
particular restoration design until the root cause is written down.

## Goals

- Stop the errors: grid affordances must never be interactable for documents or
  engines that have no grid model, and must be hidden rather than disabled.
- Contain the confusion: the layout grid overlay and its controls must not be
  presented as working when they are not.
- Produce a written root-cause finding for what removed or broke the layout grid
  during the refactor, grounded in the actual grid owners, not a guess.
- Leave a concrete, reviewable decision: restore the grid on the current typed
  render path, or intentionally retire it, with the follow-up work identified.

## Non-goals

- No full redesign of the grid model in this spec. Restoration design, if
  chosen, is scoped by the investigation finding and may become its own spec.
- No new grid features (new snap modes, new alignment tools).
- No arrow-label work; that is spec 064.
- No auto-style/nesting work; that is spec 063.
- No new behavior-heavy logic in `scripts/preview/*.js`. Grid ownership stays in
  the typed preview-shell owners.
- No widening of `scripts/preview/editor.js` or `scripts/preview/layout-bridge.js`.

## Current behavior (as found)

- Grid math is owned by
  `packages/layout-engine/src/preview-shell/grid-resolution.ts`
  (`resolvePreviewGridInfo`, `PreviewGridInfo`), tagged spec 043 slice A.
- Overlay geometry is owned by
  `packages/layout-engine/src/preview-shell/grid-overlay-scene.ts`
  (`PreviewGridOverlayScene`, rect/line shapes), spec 043 slice C.
- Control state is owned by
  `packages/layout-engine/src/preview-shell/grid-controls.ts`
  (`PreviewGridControlState`, DOM patch + runtime update resolvers).
- The DOM/state bridge is owned by
  `packages/layout-engine/src/preview-shell/app-grid-host.ts`, which enumerates
  the control ids `grid-cols`, `grid-rows`, `grid-col-gap`, `grid-row-gap`,
  `grid-margin`, `grid-margin-top|right|bottom|left`, `grid-link-root`,
  `grid-slack`.
- Runtime install/wiring is under `app-grid-runtime.ts`,
  `app-grid-editor-runtime.ts`, `app-grid-editor-install-unit.ts`, and
  `app-grid-editor-browser-state.ts`.
- The 9-dot alignment control and the grid controls are rendered without a hard
  engine/document capability gate, so they appear on ELK documents and error on
  interaction.

The exact regressed seam is unknown until T010–T013 confirm it; the list above
is the investigation surface, not a root-cause claim.

## Functional requirements

### Containment (ship first)

- **FR-001**: Grid controls (`grid-cols`, `grid-rows`, `grid-col-gap`,
  `grid-row-gap`, all `grid-margin*`, `grid-link-root`, `grid-slack`) and the
  9-dot alignment control MUST be **hidden** — not merely disabled — for any
  document or engine that has no grid model.
- **FR-002**: Grid affordance visibility MUST be driven by a single typed
  capability predicate (for example "does the active engine/document expose a
  grid model"), not by ad-hoc per-control disabling in legacy JS.
- **FR-003**: With grid affordances hidden, no grid interaction path can run for
  a non-grid engine, so the "Local relayout failed ... 9 dot alignment grid"
  error on ELK documents MUST no longer be reachable.
- **FR-004**: Engines/documents that legitimately support the grid MUST keep
  their grid controls visible and functional (no regression for the supported
  case). If no engine currently renders a correct grid overlay, that fact MUST
  be recorded in the finding rather than hidden.

### Investigation (root cause + decision)

- **FR-005**: The spec MUST produce a written root-cause finding, committed in
  this package (`findings.md`), that names the regressed seam among grid
  resolution, overlay scene, control wiring, and the render/mount path, with the
  evidence used to locate it.
- **FR-006**: The finding MUST classify the regression as one of: (a) overlay no
  longer mounted/rendered, (b) overlay rendered but geometry wrong, (c) controls
  no longer drive relayout, or (d) grid intentionally dropped during the
  refactor. The classification MUST be backed by code references, not
  supposition.
- **FR-007**: The finding MUST state a decision — restore on the current typed
  render path, or intentionally retire — and, if restore, identify the concrete
  follow-up (which owner, which contract) as either in-scope tasks here or a
  named follow-up spec.
- **FR-008**: All work MUST stay TypeScript-first in the preview-shell owners
  and MUST NOT widen `editor.js` or `layout-bridge.js`.

## User stories

### US1: Grid controls disappear where they cannot work

As an editor user on an ELK (or other non-grid) document, I do not see grid
column/row/gutter/margin controls or the 9-dot alignment control at all, so I
cannot trigger the relayout error by touching them.

**Acceptance**: on a non-grid engine, the grid affordances are absent from the
DOM/tab order; on a grid-capable engine they remain present.

### US2: The grid regression is explained, not hidden

As a maintainer, I can read a committed finding that says exactly what broke the
layout grid and what the follow-up is.

**Acceptance**: `specs/061-preview-grid-regression/findings.md` names the
regressed seam with code references and records the restore-or-retire decision.

## Success criteria

- **SC-001**: A repo-owned test proves the grid-affordance capability predicate
  hides all grid controls and the 9-dot alignment control for a non-grid
  engine/document and shows them for a grid-capable one.
- **SC-002**: A repo-owned test (or DOM contract test) proves the ELK grid
  interaction path is unreachable once affordances are hidden — no grid relayout
  is dispatched for a non-grid engine.
- **SC-003**: `findings.md` exists, names the regressed seam per FR-005/FR-006,
  and records the restore-or-retire decision per FR-007.
- **SC-004**: No supported-engine regression: grid-capable documents keep
  working grid controls (or the finding records that none currently do and why).
- **SC-005**: `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, and `node scripts/check_no_new_python.mjs`
  pass.

## Risks

- The grid may be broken at more than one seam (mount + geometry). The finding
  must not stop at the first plausible cause; FR-006 requires an explicit
  classification.
- Hiding affordances is easy to do in legacy JS per-control; FR-002 forces a
  single typed predicate so the fix does not add JS drift.
- The 9-dot alignment control and the Brockman layout grid may have different
  owners and different regressions; treat them as two affordances behind one
  capability gate unless the finding shows they must diverge.
