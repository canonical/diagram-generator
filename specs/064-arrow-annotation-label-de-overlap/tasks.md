# Tasks: Spec 064 Arrow annotation label de-overlap

**Input**: `specs/064-arrow-annotation-label-de-overlap/spec.md`
**Plan**: `specs/064-arrow-annotation-label-de-overlap/plan.md`
**Branch**: `feat/064-arrow-annotation-label-de-overlap`

## Phase 1: Reproduce and locate

- [ ] T001 Read the arrow label plan owner:
      `packages/layout-engine/src/arrow-render-plan.ts`
      (`ArrowRenderLabelPlan`, `resolveArrowLabelAnchor`,
      `normalizeArrowLabelLines`) and confirm it places one label per arrow with
      no cross-label awareness.
- [ ] T002 Read the DOM label render/lifecycle owner
      `packages/layout-engine/src/preview-shell/app-arrow-render.ts` and the
      shaft geometry owners `arrow-geometry.ts` / `arrow-routing.ts`.
- [ ] T003 Read the label measurement helpers `text-measure.ts` and
      `text-render-geometry.ts` to confirm how to derive real label bounds.
- [ ] T004 Choose and record a reproducing fixture (start from the `image.png`
      many-arrow case where node placement → network simplex stacks labels).

## Phase 2: Investigation — prove the real cause

- [ ] T010 Capture the arrow label plans before and after the option/engine
      change; determine whether stacked labels are distinct new labels at
      near-identical anchors (geometric) or retained labels from the prior layout
      (stale render).
- [ ] T011 Check the spec 071 render/switch-node lifecycle for whether arrow
      label DOM/plan state is cleared on engine/option switch; record the exact
      clear point (or its absence).
- [ ] T012 Write `specs/064-arrow-annotation-label-de-overlap/findings.md`:
      reproduce the symptom, classify the cause (geometric / stale-render / both)
      per FR-001/FR-002 with file+symbol references and reproduction steps, and
      name the owner the fix will land in.

## Phase 3A: Geometric fix (only if the finding says geometric)

- [ ] T020 Add a deterministic, order-stable label de-overlap pass over the
      resolved `ArrowRenderLabelPlan`s, using measured label bounds, before DOM
      render. Never detach a label from its arrow.
- [ ] T021 Leave non-colliding labels at their current midpoint+`labelGap`
      anchor; only nudge colliding labels.
- [ ] T022 Guarantee determinism: repeated application on the same input yields
      identical placement (idempotent, stable input order).

## Phase 3B: Stale-render fix (only if the finding says stale render)

- [ ] T025 Route the clear/re-derive of arrow labels through the spec 071
      render/switch-node lifecycle so stale labels do not survive an
      engine/option switch. No ad-hoc DOM clear in legacy JS.
- [ ] T026 Confirm the fix does not re-run relayout unnecessarily; it clears/
      re-derives labels on the existing render path.

## Phase 4: Tests and verification

- [ ] T030 Add a layout-engine unit test: given clustered arrow anchors with
      known label bounds, the de-overlap pass yields non-overlapping bounds and
      is deterministic/idempotent (geometric fix), OR a lifecycle unit test
      proving stale labels are cleared on switch (stale-render fix).
- [ ] T031 Add a no-regression test proving a single non-colliding arrow keeps
      its exact current midpoint+`labelGap` anchor.
- [ ] T032 Add an apps/preview contract or real-gesture proof that node
      placement → network simplex (and an engine switch and back) leaves no
      overlapping labels on the reproducing fixture.
- [ ] T033 Run `npm --prefix packages/layout-engine test`.
- [ ] T034 Run `npm --prefix apps/preview test`.
- [ ] T035 Run `node scripts/check_no_new_python.mjs`.
- [ ] T036 Use no-screenshot browser DOM probes only if unit/contract tests miss
      an integration behavior; do not capture screenshots unless asked.

## Closeout gate

- `findings.md` committed with a referenced, reproduced root cause (not one
  screenshot). Classification gates which of Phase 3A / 3B is executed.
- Fix landed in the correct owner per the finding.
- Repo-owned regression protects the reproducing fixture (SC-002/SC-003).
- Full validation green (T033–T035).

## Deferred follow-up

- Arrow routing (shaft path) redesign remains spec 006.
- Annotation typography/one-font-size hardening remains the 059-class styling
  contract, not this spec.
