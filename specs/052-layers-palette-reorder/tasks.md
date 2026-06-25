# Tasks: Spec 052 Layers Palette Reorder

**Input**: `specs/052-layers-palette-reorder/spec.md`
**Branch**: `feat/052-layers-palette-reorder`

## Phase 1: Model And Reuse Points

- [ ] T001 Read current tree rendering in
      `packages/layout-engine/src/preview-shell/app-shell-panels.ts`.
- [ ] T002 Read stage reorder completion in
      `interaction-drag-dispatch.ts`, `interaction-completion.ts`, and
      `interaction-completion-dispatch.ts`.
- [ ] T003 Read `children_order` relayout and persistence in
      `app-relayout.ts` and `apps/preview/src/persistence/frame-diagram.ts`.
- [ ] T004 Add a typed `PreviewLayerTreeRow` model with id, depth, authored
      parent id, sibling ids, sibling index, selected, overridden,
      reorderable, and disabled reason.
- [ ] T005 Add pure helpers to flatten the component tree into layer rows
      without changing current rendered order.
- [ ] T006 Add pure helpers to resolve a layer drop target:
      source id, target row id, before/after edge, authored parent id,
      insert index, no-op status, and rejection reason.
- [ ] T007 Add unit tests for row flattening and drop target resolution,
      including headed containers and synthetic body redirection facts.

## Phase 2: Palette Rendering

- [ ] T010 Extend `renderPreviewTreePanel` to render a stable row structure with
      row id, parent id, sibling index, selected/overridden state, and a reorder
      affordance for reorderable rows.
- [ ] T011 Preserve existing click selection, shift-click selection, and context
      menu behavior.
- [ ] T012 Add before/after drop indicator rendering and cleanup helpers.
- [ ] T013 Add disabled affordance state and ARIA labels for non-reorderable
      rows.
- [ ] T014 Keep row dimensions stable so showing the drag affordance or
      indicator does not resize the tree.

## Phase 3: Pointer Drag Reorder

- [ ] T020 Add a typed layer-palette drag runtime under
      `packages/layout-engine/src/preview-shell/`.
- [ ] T021 Start drag from the row affordance, or from row pointer movement only
      after a small threshold; plain click must remain selection.
- [ ] T022 During drag, resolve valid same-parent before/after targets and show
      indicators only for valid targets.
- [ ] T023 Reject root, arrow, synthetic, runtime-only, cross-parent, and no-op
      targets without mutating state.
- [ ] T024 On valid drop, call the existing reorder commit seam that writes
      `children_order` for the authored parent.
- [ ] T025 Preserve current selection and primary selected id after relayout.
- [ ] T026 Refresh layer order, stage, inspector, handles, and override summary
      after commit.

## Phase 4: Keyboard And Accessibility

- [ ] T030 Add keyboard reorder commands for focused reorderable rows.
- [ ] T031 Ensure keyboard reorder uses the same pure target resolver as pointer
      drag.
- [ ] T032 Add ARIA labels that include row id and command direction.
- [ ] T033 Ensure disabled rows expose a clear unavailable reason through title
      or accessible description.
- [ ] T034 Add focus tests proving keyboard reorder remains available after
      tree rerender.

## Phase 5: Undo, Save, Reload

- [ ] T040 Create one undoable action per valid palette reorder.
- [ ] T041 Verify undo restores stage and layer order.
- [ ] T042 Verify redo reapplies stage and layer order.
- [ ] T043 Verify Save persists reordered authored YAML through existing
      `children_order` support.
- [ ] T044 Verify reload and SVG export use the saved order.
- [ ] T045 Confirm stage drag reorder tests still pass unchanged.

## Phase 6: Tests And Verification

- [ ] T050 Add layout-engine unit tests for row model and reorder target
      planning.
- [ ] T051 Add apps/preview contract tests for DOM row affordances, drag target
      indicators, invalid drops, keyboard reorder, selection sync, and context
      menu coexistence.
- [ ] T052 Add save/reload persistence coverage at the apps/preview layer,
      extending existing `children_order` tests where possible.
- [ ] T053 Run `npm --prefix packages/layout-engine test`.
- [ ] T054 Run `npm --prefix apps/preview test`.
- [ ] T055 Run `node scripts/check_no_new_python.mjs`.
- [ ] T056 Use no-screenshot browser DOM probes only if unit and contract tests
      miss an integration behavior; do not capture screenshots unless asked.

## Deferred Follow-Up

- Cross-parent reparenting.
- Multi-selection group reorder when selected siblings share a parent.
- Force node palette reorder or grouping.
- Layer search/filter and collapse/expand state.
