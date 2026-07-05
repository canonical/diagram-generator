# Plan: Spec 064 Arrow annotation label de-overlap

## Working theory

Arrow labels are placed one arrow at a time at the shaft midpoint plus a fixed
normal offset (`resolveArrowLabelAnchor` in `arrow-render-plan.ts`), with no
awareness of any other arrow's label. When a layout-option or engine change
(e.g. node placement → network simplex) clusters several arrow midpoints, the
labels stack. That is the most likely cause, but the bug has been "fixed" before
without sticking, and there is a plausible second cause: labels from a prior
layout/engine not being cleared by the spec 071 render/switch-node lifecycle,
leaving stale labels painted under new ones.

So the plan is investigation-first, then a fix routed to whichever owner the
evidence points at:

1. Reproduce on a named fixture and prove whether the overlap is fresh geometry
   or stale render nodes.
2. If geometric: add a deterministic, order-stable label de-overlap pass over
   the arrow label plans, using measured label bounds.
3. If stale-render: fix the clear/re-derive step in the spec 071 lifecycle.
4. Lock it with a repo-owned regression on the reproducing fixture.

## Likely file map

- Label plan + anchor: `packages/layout-engine/src/arrow-render-plan.ts`
  (`ArrowRenderLabelPlan`, `resolveArrowLabelAnchor`, `normalizeArrowLabelLines`).
- Label measurement: `packages/layout-engine/src/text-measure.ts` and
  `text-render-geometry.ts` (already imported by the arrow plan) for real line
  boxes / bounds.
- Shaft geometry: `packages/layout-engine/src/arrow-geometry.ts`,
  `arrow-routing.ts`.
- DOM label render + lifecycle: `packages/layout-engine/src/preview-shell/app-arrow-render.ts`.
- Render/switch-node lifecycle (stale-render hypothesis): the spec 071 owners
  under `packages/layout-engine/src/preview-shell/` — confirm the exact clear
  point during T010, do not assume.
- Tests: `packages/layout-engine/tests/` for a pure de-overlap/bounds test;
  `apps/preview` for a DOM/lifecycle contract test.
- Committed finding: `specs/064-arrow-annotation-label-de-overlap/findings.md`.

## Investigation protocol (must be evidence-based)

1. Pick and record a reproducing fixture (start from the `image.png` case: a
   many-arrow document where node placement → network simplex stacks labels).
2. Capture the arrow label plans before and after the option/engine change and
   check whether stacked labels are (a) distinct new labels at near-identical
   anchors (geometric) or (b) duplicated/retained labels from the prior layout
   (stale render).
3. Check the spec 071 render/switch-node lifecycle for whether arrow label DOM /
   plan state is cleared on engine/option switch.
4. Classify in `findings.md` with file+symbol references and reproduction steps.

## De-overlap design (only if the cause is geometric)

- Operate on the collection of `ArrowRenderLabelPlan`s after per-arrow anchors
  are resolved, before DOM render.
- Compute each label's bounds from its measured line box (not a fixed size).
- Resolve collisions deterministically: stable input order, deterministic
  nudge/stacking direction along the shaft normal (or a stable alternate-side
  rule), so repeated relayout of the same input yields identical placement.
- Never detach a label from its arrow; only adjust its offset.
- Leave non-colliding labels at their current midpoint+`labelGap` anchor.

## Verification shape

- Pure unit test: given clustered arrow anchors with known label bounds, the
  de-overlap pass produces non-overlapping bounds and is idempotent/deterministic
  across repeated application.
- No-regression unit test: a single non-colliding arrow keeps its exact current
  anchor.
- Contract/real-gesture proof: on the reproducing fixture, node placement →
  network simplex (and an engine switch and back) leaves no overlapping labels.
- Full validation: layout-engine tests, apps/preview tests,
  `check_no_new_python.mjs`.

## Sequencing note

This is an investigation-first spec. Do not open a PR that only tweaks
`resolveArrowLabelAnchor` for one screenshot. `findings.md` (real cause, with
references) plus a fix in the correct owner plus a repo-owned regression are all
required for closeout.
