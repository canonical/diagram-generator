# Preview Editor Recovery Flow

Purpose: map the post-046 editor UI path from route load through browser
runtime contracts, typed interaction owners, save APIs, and disk.

## Pipeline

```text
frame YAML slug
  -> preview viewer route
  -> viewer config + browser bundle scripts
  -> thin scripts/preview wrappers
  -> namespaced TypeScript browser-entry contracts
  -> editor bootstrap/runtime set
  -> stage/tree/inspector/engine/save UI
  -> relayout/render/update model
  -> save API
  -> frame YAML on disk
  -> reload/export
```

## Key Files

- `apps/preview/src/preview-host/builtin-autolayout-host.ts`
  Viewer config, visible sections, scripts, and document endpoints.
- `apps/preview/src/persistence/*`
  Browser-wrapper and preview-host contract tests.
- `packages/layout-engine/src/browser-entry*.ts`
  Browser-visible export surface consumed by preview wrappers.
- `packages/layout-engine/src/preview-shell/app-bootstrap.ts`
  Editor bootstrap, navigation, config, save-client init, and runtime wiring.
- `packages/layout-engine/src/preview-shell/app-grid-editor-install-unit.ts`
  Grid editor install/runtime assembly.
- `packages/layout-engine/src/preview-shell/app-editor-*-facade.ts`
  Typed facades for bootstrap, scene, interaction, relayout, and inspector
  paths.
- `packages/layout-engine/src/preview-shell/interaction-*.ts`
  Pointer, keyboard, resize, drag, and selection semantics.
- `packages/layout-engine/src/preview-shell/inspector-*.ts`
  Single and multi-selection inspector controls.
- `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts`
  Local/engine relayout execution and stage replacement.
- `scripts/preview/editor.js` and `scripts/preview/layout-bridge.js`
  Thin compatibility wrappers only. Do not move recovered behavior here.

## Tests To Run

- `npm --prefix apps/preview test`
- `npm --prefix packages/layout-engine test -- browser-entry`
- `npm --prefix packages/layout-engine test -- app-bootstrap`
- `npm --prefix packages/layout-engine test -- app-grid-editor`
- `npm --prefix packages/layout-engine test -- app-layout-bridge-runtime`
- `npm --prefix packages/layout-engine test -- app-relayout`
- `node scripts/check_no_new_python.mjs`

## Known Limits

- Default verification is contract and behavior tests. Do not add screenshot
  checks unless the user explicitly asks for visual validation.
- Fixes should shrink or preserve legacy JS wrappers. Any change that widens
  `editor.js` or `layout-bridge.js` must be rerouted through typed owners.
