# Layers Palette Reorder Flow

## Pipeline

```text
frame tree JSON
  -> ComponentModel indexed tree
  -> typed layer row model
  -> Layers palette drag or keyboard reorder
  -> reorder target resolver
  -> existing children_order override seam
  -> local relayout
  -> stage/tree/inspector refresh
  -> undo/redo
  -> save YAML child order
```

## Key Files

- `scripts/preview/viewer-unified.html`: `#tree` container in the Layers tab.
- `packages/layout-engine/src/preview-shell/app-shell-panels.ts`: current tree
  row rendering, selection sync, context menu, override state.
- `packages/layout-engine/src/preview-shell/app-selection-host.ts`: tree and
  stage selection synchronization.
- `packages/layout-engine/src/preview-shell/interaction-drag-dispatch.ts`:
  existing stage reorder target resolution.
- `packages/layout-engine/src/preview-shell/interaction-completion.ts`: existing
  drag completion plan.
- `packages/layout-engine/src/preview-shell/interaction-completion-dispatch.ts`:
  existing reorder commit dispatch seam.
- `packages/layout-engine/src/preview-shell/app-editor-interaction-facade.ts`:
  writes `children_order`.
- `packages/layout-engine/src/preview-shell/app-relayout.ts`: applies
  `children_order`, including headed-container synthetic body handling.
- `apps/preview/src/persistence/frame-diagram.ts`: persists YAML child order.

## Tests To Run

- `npm --prefix packages/layout-engine test`
- `npm --prefix apps/preview test`
- `node scripts/check_no_new_python.mjs`

## Known Limits

- First release is same-parent sibling reorder only.
- No screenshot verification by default.
- Legacy JS can delegate to typed APIs but must not own layer reorder logic.
