# Spec 062: Parent/Child Hug Resize Propagation

**Feature Branch**: `feat/062-parent-child-hug-resize-propagation`
**Status**: Active — adversarial review reopened 2026-07-03
**Created**: 2026-07-03
**Priority**: Next in Opus execution order after spec 071
**Context**: `docs/spec-reviews/inbox-triage.md` row 13 and
`docs/spec-reviews/CLINE-VERDICT-2026-06-28.md`

## Status Notes

- 2026-07-03: `test-alignment-grid` was confirmed as the owning repro seam:
  `container` starts authored with explicit `width`/`height`, `small_box`
  starts authored `FIXED 192x64`, and the reported bug only appears after the
  child is switched to `HUG` and the parent is then resized smaller.
- 2026-07-03: the typed resize/render path now holds end-to-end. The inspector
  mutation path still flows through `frame-prop-actions.ts` and
  `app-inspector-mutation-runtime.ts`; live resize still flows through
  `app-live-resize.ts` into relayout; `layout.ts` now recomputes constrained
  `HUG` leaf width/height from the resized parent width instead of reusing the
  stale authored fixed size; the remaining JS touchpoint stays a thin
  compatibility handle renderer in `scripts/preview/editor-base.js`.
- 2026-07-03 adversarial-review follow-up fixed the generic container gap:
  constrained remeasurement now refreshes non-leaf `HUG` `measuredW` from the
  reflowed descendants, so a nested `HUG` container child no longer keeps a
  stale wider width under a smaller fixed-width parent.
- 2026-07-03 repo-owned regressions now cover both the original leaf
  `small_box` path on `test-alignment-grid` and a nested `HUG` container child
  round-trip in `packages/layout-engine/tests/layout.test.ts` and
  `apps/preview/src/persistence/frame-diagram.test.ts`.
- 2026-07-03 the package remains `Active`: the reopened review fix supersedes
  the earlier full validation run, so the full SC-005 battery still needs to be
  rerun in a fully installed worktree before restoring `Closeout Ready`.

## Problem

The preview/editor resize path still breaks a basic autolayout sizing contract:
when a parent shrinks, children authored or edited to `HUG` do not reflow to
fit the smaller available space. The concrete repro is
`/view/v3:test-alignment-grid`, where the parent can be resized smaller but the
child keeps its previous effective size instead of recomputing under the new
container width/height. The same report also notes a related authoring problem:
the child starts effectively fixed, and switching it to `HUG` does not yield
the expected shrink-to-fit behavior.

This is a distinct contract from spec 048's ELK sizing follow-up and from spec
071's render/switch substrate. Spec 071 is now the prerequisite substrate; this
spec owns the localized parent/child resize semantics that still fail after the
render-node refactor.

## Goals

- Make parent resize propagate the new available space to `HUG` children.
- Ensure a child explicitly switched to `HUG` recomputes to fit the resized
  parent instead of retaining a stale fixed effective size.
- Preserve `FIXED` child behavior unless the author changes sizing.
- Keep the live preview, save, and reload paths consistent for the propagated
  sizing result.
- Land the fix in TypeScript owners, not as new architecture in
  `scripts/preview/*.js`.

## Non-goals

- No auto-style work; that remains spec 063.
- No grid-regression investigation; that remains spec 061.
- No broad ELK fidelity or engine-tab behavior; that remains in specs 057/065.
- No reopening of spec 046 by adding behavior-heavy ownership back into legacy
  JS files.

## User Stories

### US1: Hug child shrinks with a smaller parent

As a diagram author, when I resize a parent smaller, a child set to `HUG`
should reflow within the parent's new inner bounds instead of keeping a stale
effective width/height.

**Acceptance**: on `test-alignment-grid`, after setting the child to `HUG`,
resizing the parent smaller yields a visibly smaller child that still respects
padding/alignment and stays within the parent.

### US2: Fixed child remains fixed until explicitly changed

As a diagram author, I expect a child still set to `FIXED` to preserve explicit
fixed sizing semantics during parent resize, so the propagation fix does not
quietly change authored fixed layouts.

**Acceptance**: focused tests prove the propagated path reflows `HUG` children
but leaves `FIXED` children on their existing semantics.

### US3: Save/reload preserves the intended child sizing mode

As a diagram author, if I switch a child from `FIXED` to `HUG` and save, reload
must preserve the sizing mode and the propagated layout result.

**Acceptance**: a repo-owned `persist -> reload` regression on
`test-alignment-grid` shows the child returns as `HUG` and still fits the saved
parent size.

## Functional Requirements

- **FR-001**: The resize interaction path MUST distinguish authored/committed
  `FIXED` child sizing from `HUG` child sizing when a parent's available inner
  space changes.
- **FR-002**: A child set to `HUG` MUST recompute from the resized parent's new
  inner bounds instead of reusing the child's prior effective size on the
  resized axis.
- **FR-003**: The propagation logic MUST preserve fixed child sizing semantics
  unless the author explicitly changes that child's sizing mode.
- **FR-004**: The fix MUST cover both live resize feedback and resize
  completion/persistence, so the preview does not show one result during drag
  and another after commit or reload.
- **FR-005**: Inspector or mutation actions that change a child from `FIXED` to
  `HUG` MUST produce the same propagated contract as authored `HUG` sizing.
- **FR-006**: Save/reload MUST persist the child sizing mode and parent size
  through the existing YAML override path without introducing new save-only
  fields.
- **FR-007**: The implementation MUST live in TypeScript-owned preview/layout
  code. Legacy JS may only shrink or delegate where touched.
- **FR-008**: The spec MUST include at least one real-browser proof on
  `test-alignment-grid`; mock-only wiring is insufficient.

## Success Criteria

- **SC-001**: A focused regression proves a `HUG` child on
  `test-alignment-grid` shrinks when its parent is resized smaller.
- **SC-002**: A focused regression proves a `FIXED` child does not silently
  adopt `HUG` propagation semantics.
- **SC-003**: A real-browser proof on `test-alignment-grid` shows the child can
  be switched to `HUG`, the parent resized smaller, and the child remains within
  the new parent bounds with the expected smaller geometry.
- **SC-004**: A `persist -> reload` regression proves the saved child sizing
  mode and propagated result survive reload.
- **SC-005**: `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, and `node scripts/check_no_new_python.mjs`
  pass for the landed fix.

## Likely Owners

- `packages/layout-engine/src/preview-shell/app-resize-host.js`
- `packages/layout-engine/src/preview-shell/app-resize-interaction-runtime.ts`
- `packages/layout-engine/src/preview-shell/interaction-resize-dispatch.ts`
- `packages/layout-engine/src/preview-shell/frame-prop-actions.ts`
- `packages/layout-engine/src/layout.ts`
- `apps/preview/src/persistence/`

## Primary Entry Point For Agents

Start with [`tasks.md`](./tasks.md). Use the `test-alignment-grid` fixture and
the existing resize/persistence tests as the initial evidence seam. Do not treat
spec 048 as authority for this contract; 062 is its own user-facing sizing
behavior package.
