# Editor Mutation State Flow

Cross-layer map for spec 069.

## Pipeline

```text
UI gesture
  -> typed control owner
  -> EditorMutationTransaction
  -> PreviewRenderIntent / frameTreeJson / option buckets
  -> relayout or fresh render
  -> SVG + visible controls + dirty/undo state
  -> save payload
  -> YAML
  -> reload parse
```

## Key Files

- `scripts/preview/editor.js`
  Thin browser adapter. Must not regain mutation ownership.
- `scripts/preview/layout-bridge.js`
  Thin bridge adapter. Must not own engine branching.
- `packages/layout-engine/src/preview-shell/preview-render-intent.ts`
  Existing render-intent source of truth.
- `packages/layout-engine/src/preview-shell/preview-engine-workspace-chrome.ts`
  Engine tab UI/runtime owner.
- `packages/layout-engine/src/preview-shell/layout-operator-overrides.ts`
  Active engine option bucket owner.
- `packages/layout-engine/src/preview-shell/app-grid-editor-install-unit.ts`
  Current integration seam for panel sync, engine workspace, save/runtime wiring.
- `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts`
  Relayout/fresh-render bridge runtime.
- `packages/layout-engine/src/preview-shell/app-save-payload.ts`
  Save payload assembly.
- `apps/preview/src/persistence/frame-diagram.ts`
  YAML persistence and supported namespace enforcement.

## Tests To Run

```bash
npm --prefix packages/layout-engine test -- preview-render-intent preview-engine-workspace-chrome layout-operator-overrides app-grid-editor-install-unit app-layout-bridge-runtime app-relayout app-live-resize
npm --prefix apps/preview test
npm --prefix packages/layout-engine run build:browser
node scripts/check-browser-bundle-fresh.mjs
node scripts/check_no_new_python.mjs
```

## Known Limits

- Spec 065 has the closest existing browser evidence protocol, but it does not
  fully capture dirty/undo/save/reload state vectors.
- Spec 060 proves engine identity changes, but it does not require geometry or
  equivalent-geometry classification for every tab click.
- Spec 068 fixed alias and fallback debt; it did not define a mutation
  transaction model.
