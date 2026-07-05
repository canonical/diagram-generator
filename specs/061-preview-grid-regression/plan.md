# Plan: Spec 061 Preview grid regression investigation

## Working theory

The layout grid (spec 043) has typed owners for math, overlay geometry, and
control state, but during the preview-shell refactor one or more seams between
those owners and the live render/mount path regressed, and the affordance
gating was never scoped to grid-capable engines. Two things are true at once:
the grid does not render as designed, and the controls are shown (only disabled)
on engines that cannot use them, where interacting throws.

The work splits cleanly:

1. **Containment first.** Add one typed capability predicate for "this
   document/engine has a grid model" and route grid-affordance visibility
   through it so non-grid engines hide the controls entirely. This alone kills
   the reachable ELK relayout error.
2. **Investigation second.** Trace the grid pipeline end to end and write a
   committed finding that names the regressed seam and records a restore-or-retire
   decision.

Do containment before investigation so the error stops immediately, but keep the
finding honest: hiding the affordance is not the same as restoring the grid.

## Likely file map

- Capability predicate + affordance gating:
  `packages/layout-engine/src/preview-shell/app-grid-host.ts`
  (control enumeration lives here), plus the install/runtime wiring in
  `app-grid-editor-install-unit.ts` / `app-grid-editor-runtime.ts` /
  `app-grid-editor-browser-state.ts`.
- Grid math: `packages/layout-engine/src/preview-shell/grid-resolution.ts`.
- Overlay geometry: `packages/layout-engine/src/preview-shell/grid-overlay-scene.ts`.
- Control state resolvers: `packages/layout-engine/src/preview-shell/grid-controls.ts`.
- Overlay mount / render path: whichever preview-shell render owner draws the
  overlay scene into the stage SVG (confirm during T010, do not assume).
- Engine capability source: the engine/document capability descriptors used by
  the preview-shell to decide compatible chrome (confirm exact owner in T011).
- Tests: `packages/layout-engine/tests/` for the predicate + overlay unit
  behavior; `apps/preview` contract test for DOM affordance presence/absence.
- Committed finding: `specs/061-preview-grid-regression/findings.md`.

## Investigation protocol (must be evidence-based)

Follow the repo's vision/evidence discipline in spirit: do not declare a cause
without a code reference.

1. Confirm which owner is supposed to mount the overlay scene into the stage,
   and whether it still runs for a grid-capable document.
2. Confirm whether `resolvePreviewGridInfo` still receives correct canvas
   dimensions and produces a non-empty scene.
3. Confirm whether the control runtime updates still reach a relayout that the
   render path honours.
4. Confirm the ELK error path: which control id and which relayout call throw on
   a non-grid document.
5. Classify per FR-006 (not mounted / wrong geometry / controls dead / dropped),
   with file+symbol references, in `findings.md`.
6. Record the restore-or-retire decision per FR-007 and, if restore, the named
   follow-up owner/contract.

## Verification shape

- Unit test for the capability predicate: grid-capable → controls shown,
  non-grid → controls hidden (not just disabled).
- Contract/DOM test proving grid affordances are absent from DOM/tab order on a
  non-grid engine and present on a grid-capable one, and that no grid relayout is
  dispatched for the non-grid case.
- If the finding chooses restore and it is small enough to land here, a focused
  overlay-render test proving the grid overlay mounts for a grid-capable
  document. If restore is larger, it becomes a named follow-up spec and this
  package closes on containment + finding.
- Full validation: layout-engine tests, apps/preview tests,
  `check_no_new_python.mjs`.

## Sequencing note

This is an investigation spec. Containment (Phase 1–2) is shippable on its own
and satisfies the "hide them for now" instruction. The finding (Phase 3) is the
required deliverable that turns "hidden" into a real decision. Do not mark the
spec complete on containment alone — `findings.md` and the restore-or-retire
decision are part of closeout.
