# Spec 072: Preview engine hardening

**Feature Branch**: `feat/072-preview-engine-hardening`
**Status**: Active
**Created**: 2026-07-04

## Problem

The current preview-engine substrate is real and useful, but the closeout claim
that it is ready for "another 100 engines" is overstated. The 2026-07-04
adversarial review found three concrete gaps:

1. The no-central-branching guard misses `v3` and `sequence`, while real
   central document-kind/engine branches still exist in the load and render
   owners.
2. Builtin engine installation is still an O(engines) shared-file edit in
   `builtin-install-units.ts`.
3. There is no browser proof that engine-specific saved state survives
   save -> reload -> engine switch-back.

At the same time, a few recurring user-facing preview issues remain honestly
open and fit the same hardening slice:

- the hidden active-engine badge markup still exists even though the tab rail is
  the engine identity surface;
- the V3 engine still leaks the stale "native v3 autolayout" wording in some
  runtime metadata;
- canvas padding parity regressed on engine switches for at least one ELK path;
- section heading rhythm still needs the requested bottom-spacing increase.

This spec hardens the shared preview-engine substrate and the remaining preview
chrome around it without reopening spec 061 (grid regression) or spec 064
(annotation-label de-overlap).

## Goals

- Remove stale or misleading engine-switcher chrome.
- Make stage fitting/padding stable across engine-tab switches.
- Generalize the central preview document-kind path so new render families do
  not require `sequence`-style branches in shared owners.
- Replace the hand-maintained builtin install-unit registration ladder with a
  data-driven builtin list.
- Add a repo-owned browser regression that proves non-active engine state
  survives save -> reload -> switch-back.
- Keep the fixes in TypeScript owners; do not widen legacy JS ownership.

## Non-goals

- No reopening of spec 061 grid-regression investigation.
- No reopening of spec 064 arrow annotation label de-overlap.
- No new behavior-heavy logic under `scripts/preview/*.js`.
- No attempt to solve arbitrary plugin/fs discovery for external engines in this
  slice; builtin registration only needs to stop being one shared import ladder.

## Functional requirements

- **FR-001**: The output-pane engine tabs MUST remain the only visible engine
  identity surface when the tab rail is present. The hidden active-engine badge
  markup and runtime path should be removed.
- **FR-002**: The V3 engine label/copy MUST resolve to `Autolayout` in builtin
  preview-engine metadata and the output-pane chrome. Legacy "native v3
  autolayout" wording must not remain in user-facing preview-engine copy.
- **FR-003**: Engine switches MUST preserve the fitted stage canvas/viewBox
  parity. The mount/fit owner must not depend on detached-SVG geometry that can
  drop right/bottom padding during engine changes.
- **FR-004**: Section boxes MUST get the requested additional bottom spacing
  between heading and child content through the shared style/layout contract.
- **FR-005**: The shared no-central-branching guard MUST catch engine/document
  identity branches for `v3` and `sequence`, not just ELK/Dagre/force ids.
- **FR-006**: Shared preview load/render owners MUST not special-case sequence
  via central `kind === 'sequence'` branches. Distinct preview document kinds
  must resolve through a typed owner/registry seam.
- **FR-007**: Builtin preview-engine install-unit registration MUST become
  data-driven from one builtin collection instead of a hand-maintained series of
  `registerPreviewEngineInstallUnit(...)` calls.
- **FR-008**: A browser regression MUST prove that edits to engine A survive
  save -> reload -> switch to B -> switch back to A, including live UI state,
  not just serialized buckets.

## Success criteria

- **SC-001**: Repo-owned tests prove the stage fit/mount order preserves canvas
  padding parity across engine switches.
- **SC-002**: Repo-owned tests prove the engine-switcher chrome no longer emits
  or depends on the active-engine badge while still surfacing the selected tab
  and dirty-state help.
- **SC-003**: Repo-owned tests prove the widened branching guard catches `v3`
  and `sequence` identity branches outside explicitly allowed registry/engine
  owner files.
- **SC-004**: Repo-owned tests prove builtin install-unit registration comes
  from a shared builtin list rather than one shared call ladder.
- **SC-005**: A browser test proves per-engine saved state survives
  save -> reload -> switch-back across at least layered/radial/dagre.
- **SC-006**: `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, and `node scripts/check_no_new_python.mjs`
  pass.

## Likely owners

- `packages/layout-engine/src/preview-shell/preview-render-node.ts`
- `packages/layout-engine/tests/preview-render-node.test.ts`
- `packages/layout-engine/src/preview-shell/preview-engine-workspace-chrome.ts`
- `packages/layout-engine/tests/preview-engine-workspace-chrome.test.ts`
- `packages/layout-engine/src/preview-shell/app-diagram-data.ts`
- `packages/layout-engine/src/preview-shell/app-fresh-render.ts`
- `packages/layout-engine/tests/no-engine-id-branching.test.ts`
- `packages/layout-engine/src/preview-engine/builtins.ts`
- `packages/layout-engine/src/preview-engine/builtin-install-units.ts`
- `apps/preview/src/persistence/editor-live-repaint-regression.test.ts`

## Primary entry point for agents

Start with [`tasks.md`](./tasks.md). Keep the split explicit:

- spec 061 still owns the missing grid investigation;
- spec 064 still owns arrow annotation label de-overlap;
- spec 072 owns the shared preview-engine hardening and the remaining honest
  engine-switch/padding/chrome gaps.
