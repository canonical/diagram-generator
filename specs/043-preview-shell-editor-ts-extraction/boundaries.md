# Preview shell boundaries (active)

Use this file as the cold-start map for spec 043. Do not start from archived spec 026 unless historical detail is required.

## Goal

Shrink `scripts/preview/editor.js` into a thin bootstrap/coordinator so the standalone repo stays lean and stable while the preview shell scales to many more engines.

## Stable owners already outside `editor.js`

- save flow: `scripts/preview/save-client.js`, `apps/preview/src/persistence/*`
- editor state helpers: `scripts/preview/editor-state.js`
- ELK controller slice: `scripts/preview/elk-controller.js`
- inspector selection view-model helpers: `packages/layout-engine/src/preview-shell/inspector-selection.ts`
- multi-selection action target helpers: `packages/layout-engine/src/preview-shell/selection-actions.ts`
- single-selection inspector state helpers: `packages/layout-engine/src/preview-shell/inspector-single.ts`
- single-selection inspector panel renderer: `packages/layout-engine/src/preview-shell/inspector-single-panel.ts`
- multi-selection field-state helpers: `packages/layout-engine/src/preview-shell/inspector-multi.ts`
- multi-selection inspector option/state helpers: `packages/layout-engine/src/preview-shell/inspector-multi-options.ts`
- multi-selection inspector panel renderer: `packages/layout-engine/src/preview-shell/inspector-multi-panel.ts`
- single-selection autolayout panel renderer: `packages/layout-engine/src/preview-shell/inspector-autolayout-panel.ts`
- single-selection autolayout panel option/value shaping helpers: `packages/layout-engine/src/preview-shell/inspector-autolayout-options.ts`
- click / double-click selection-resolution helpers: `packages/layout-engine/src/preview-shell/interaction-selection.ts`
- selection-set / depth mutation helpers: `packages/layout-engine/src/preview-shell/interaction-selection-state.ts`
- reorder / multi-resize geometry helpers: `packages/layout-engine/src/preview-shell/interaction-geometry.ts`
- live resize override shaping / recursive relayout helpers: `packages/layout-engine/src/preview-shell/interaction-resize.ts`
- keyboard shortcut resolution + nudge helpers: `packages/layout-engine/src/preview-shell/interaction-keyboard.ts`
- keyboard dispatch controller helper: `packages/layout-engine/src/preview-shell/interaction-keyboard-dispatch.ts`
- drag / resize completion-plan helpers: `packages/layout-engine/src/preview-shell/interaction-completion.ts`
- drag / resize completion-dispatch helpers: `packages/layout-engine/src/preview-shell/interaction-completion-dispatch.ts`
- live drag move-dispatch helpers: `packages/layout-engine/src/preview-shell/interaction-drag-dispatch.ts`
- live resize move-dispatch helpers: `packages/layout-engine/src/preview-shell/interaction-resize-dispatch.ts`
- preview grid resolver + span conversion helpers: `packages/layout-engine/src/preview-shell/grid-resolution.ts`
- preview grid control state helpers: `packages/layout-engine/src/preview-shell/grid-controls.ts`
- preview grid overlay scene helpers: `packages/layout-engine/src/preview-shell/grid-overlay-scene.ts`
- preview shell resize + width persistence helpers: `packages/layout-engine/src/preview-shell/app-shell-resize.ts`
- preview shell tree/sidebar rendering, override summary/export shaping, and constraint-status helpers: `packages/layout-engine/src/preview-shell/app-shell-panels.ts`
- preview load/bootstrap coordinator helpers: `packages/layout-engine/src/preview-shell/app-load.ts`
- preview local-vs-ELK relayout coordination and runtime coercion cleanup helpers: `packages/layout-engine/src/preview-shell/app-relayout.ts`
- preview live resize relayout policy, RAF queueing, and temporary override shaping helpers: `packages/layout-engine/src/preview-shell/app-live-resize.ts`
- preview single-selection inspector host composition helpers: `packages/layout-engine/src/preview-shell/app-inspector-host.ts`
- preview drag-start, reorder-indicator, rendered-bounds, multi-resize selection, resize-handle planning, and resize-start host helpers: `packages/layout-engine/src/preview-shell/app-interaction-host.ts`
- preview stage SVG hit-area, hover-state, and event-binding helpers: `packages/layout-engine/src/preview-shell/app-stage-svg.ts`
- preview shell bootstrap, pageshow reload, save-client init config, and SSE reconnect helpers: `packages/layout-engine/src/preview-shell/app-bootstrap.ts`
- preview input/output/both mode helpers: `packages/layout-engine/src/preview-shell/app-view-modes.ts`
- preview SVG override application helpers: `packages/layout-engine/src/preview-shell/app-override-application.ts`
- preview undo/save restore planning helpers: `packages/layout-engine/src/preview-shell/app-state-restore.ts`
- inspector-driven frame override mutation + fixed-size px conversion helpers: `packages/layout-engine/src/preview-shell/frame-prop-actions.ts`
- frame override allowlists: `packages/layout-engine/src/preview-shell/frame-override-manifest.ts`
- engine registry contracts: `packages/layout-engine/src/index.ts`, `packages/layout-engine/tests/preview-engine-registry.test.ts`

## Responsibilities still concentrated in `editor.js`

- selection-depth DOM/event wiring around pointer handlers
- drag / resize mousemove/mouseup cleanup and shell callback wiring still wired in JS after move/completion dispatch
- remaining grid event binding, DOM patch application, undo/dirty coordination, and relayout debounce glue
- residual artboard-fit, snap-target, and delete orchestration helpers
- undo wiring and mutation commits around waypoint add/remove/move after the typed geometry/DOM helpers run
- compatibility shims / global exposures used during migration

## Current shape

Landed concerns now group into these typed owners:

- Inspector state and renderer shaping
  `inspector-*`, `app-inspector-host.ts`, `frame-prop-actions.ts`, `frame-style.ts`
- Interaction state and controller decisions
  `interaction-*`, `app-interaction-host.ts`, `app-live-resize.ts`, `app-arrow-waypoints.ts`
- Grid state and runtime update planning
  `grid-resolution.ts`, `grid-controls.ts`, `grid-overlay-scene.ts`
- Shell coordinator and restore flow
  `app-load.ts`, `app-bootstrap.ts`, `app-shell-panels.ts`, `app-shell-resize.ts`, `app-stage-svg.ts`, `app-relayout.ts`, `app-override-application.ts`, `app-state-restore.ts`, `app-view-modes.ts`

The migration has materially reduced `editor.js`, but the residual shell is still not closeout-ready for an external architecture review. The remaining JS hotspots are now concentrated enough to attack directly:

- pointer down / double-click wiring and remaining drag / resize shell callbacks
- residual grid DOM host glue and relayout debounce timing
- artboard-fit, snap-target, and delete orchestration helpers
- a small set of compatibility globals and migration-era browser shims

## Target landing zones

- `packages/layout-engine/src/preview-shell/inspector-*`
- `packages/layout-engine/src/preview-shell/interaction-*`
- `packages/layout-engine/src/preview-shell/grid-*`
- `packages/layout-engine/src/preview-shell/app-*` for shared coordinator state when needed
- `scripts/preview/editor.js` only for DOM lookup, event hookup, bootstrap wiring, and compatibility glue

## Hard rules

- New shared preview logic goes into TS-owned modules, not new legacy JS helper files.
- Browser-consumed TS modules expose through `packages/layout-engine/src/browser-entry.ts`; rebuild with `npm --prefix packages/layout-engine run build:browser` after surface changes.
- Engine-specific behavior stays in engine-owned modules, manifests, or typed controller contracts.
- Do not add direct design-foundry dependencies here; preserve spec 038 seams and public API guardrails.

## Validation

- Always run targeted tests for the extracted TS slice.
- After browser-surface changes, run `npm --prefix packages/layout-engine run build:browser`.
- Minimum repo checks: `npm --prefix packages/layout-engine test`, `npm --prefix apps/preview test`, `node scripts/check_no_new_python.mjs`.
- Interaction-heavy slices also need one focused controller/DOM/browser regression path, not just persistence coverage.

## Next recommended order

1. Residual pointer/drag/resize DOM cleanup and shell callbacks
2. Remaining grid DOM wiring and debounce glue
3. Final shell hook normalization and compatibility-shim cleanup
