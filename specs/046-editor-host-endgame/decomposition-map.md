# Editor Host Decomposition Map

Cold-start map for the remaining `scripts/preview/editor.js` surface.

## Current size

- `scripts/preview/editor.js`: 256 physical lines in the current working tree
  on the active 046 branch
- `scripts/preview/layout-bridge.js`: 352 physical lines in the current working
  tree on the active 046 branch
- Closeout status: **still open**. The integration-sink risk is materially
  lower than it was, and `editor.js` is now inside the target thin-adapter
  size band, but the honest answer to the 50/150/500-engine question is still
  "not yet" because `layout-bridge.js`, document-family closure, install-unit
  proof, barrel/harness split, and the final adversarial audit remain open.

## Target adapter shape

- `editor.js`: at or below about 350 physical lines, with only browser
  bootstrap, DOM lookup, typed installer calls, and compat-global wiring
- `layout-bridge.js`: at or below about 180 physical lines, with only bridge
  bootstrap, typed runtime creation, and compat alias wiring
- neither file should retain domain behavior, engine-specific branching,
  document-kind branching, or large inline option-bag assembly

## Remaining buckets

| Bucket | Example regions | Direction |
|--------|-----------------|-----------|
| Bootstrap/load/navigation | `loadSVG()`, dirty nav, diagram load signaling, tree/grid fetch bootstrap, SSE tail | diagram-load signaling, dirty navigation, tree load, arrow sync, grid load, runtime-owned SVG-load option mapping, and bootstrap-tail runtime-option mapping now live behind bootstrap owners in `app-bootstrap.ts`, `app-load.ts`, `app-diagram-data.ts`, and `app-editor-bootstrap-facade.ts`; `editor.js` now enters this family through one typed legacy-host installer and thin compat/global binding only |
| Grid/tree host UI | grid overlay/control host, tree panel render/sync | tree host render/context-menu wiring now lives in `app-selection-host.ts`; grid overlay, grid-info refresh, waypoint reapply, override-summary, constraint refresh, scene refresh sequencing, and stage-rerender host composition now live in `app-scene-host.ts`; grid-runtime host assembly now also lives in `app-grid-runtime.ts` through `createPreviewGridRuntimeFromEditorHost(...)`; `editor.js` now enters the residual grid/scene/rerender/delete/status-refresh coordinator surface through `app-editor-scene-facade.ts`; keep shrinking the remaining editor-local control wiring |
| Inspector host dispatch | delegated click/change/input action binding and inspector render entry | action binding lives in `app-inspector-actions.ts`; single/multi inspector runtime assembly plus inspector unit-state/render orchestration now also live in `app-inspector-host.ts` and `app-inspector-display-runtime.ts`; keep shrinking adjacent callback wiring |
| Selection/interaction glue | selection sync, bindInteraction, drag/resize/waypoint host entrypoints | selection UI sync, select/deselect state wrappers, and tree-selection host wiring now also live behind `app-selection-runtime.ts` and typed hosts; double-click/depth-selection host flow, pointer/drag-start wiring, drag-move/autolayout-context wiring, resize start/move wiring, waypoint handle/drag start-move wiring, selection chrome/arrow visual helpers, and drag/resize/waypoint completion teardown already live behind typed hosts; `editor.js` now enters the stage/pointer/selection-chrome/text-edit/resize/keyboard/runtime-set assembly through `app-editor-interaction-facade.ts`; the remaining file is mostly generic callback assembly rather than engine-specific ownership |
| Text edit / override orchestration | commit/cancel, override summary, relayout request coordination | text-edit start/commit/cancel, relayout runtime/status, relayout success/failure follow-up, clear-override fallback, runtime-owned relayout option mapping, override-application host wiring, live resize completion-state normalization, bootstrap-tail controller/save glue, single-frame inspector mutation runtime, inspector display/unit runtime, multi-selection action runtime, restore-runtime host assembly, the relayout/state-restore/live-resize editor-host facade, and the interaction/runtime-set editor-host facade now live behind typed hosts in `app-text-edit-host.ts`, `app-relayout.ts`, `app-relayout-runtime.ts`, `app-editor-relayout-facade.ts`, `app-editor-interaction-facade.ts`, `app-scene-host.ts`, `app-override-application.ts`, `app-resize-host.ts`, `app-bootstrap.ts`, `app-inspector-mutation-runtime.ts`, `app-inspector-display-runtime.ts`, `app-inspector-selection-runtime.ts`, and `app-state-restore.ts`; the remaining code is mostly repo-specific callback assembly and bootstrap wiring |
| Keyboard / stage refresh | document keydown bridge, rerender follow-up sequencing | keyboard host wiring now lives in `interaction-keyboard-dispatch.ts`, including the editor-host state/flag adapter; stage hit-testing wrappers now also live in typed helpers; the remaining JS now enters those runtime caches through `app-editor-interaction-facade.ts`, but the file still carries repo-local event/selection glue |
| Boot tail | save client init, engine shell controller init, pageshow/SSE bootstrap | runtime ordering, document/test-facade binding, generic engine shell controller/save payload wiring, build-status updates, override-toolbar assembly, selection restore, EventSource creation, and the editor-host bootstrap option mapping now live in `app-bootstrap.ts` plus `app-editor-bootstrap-facade.ts`; keep only thin entry wiring plus repo-specific callbacks |

## Engine-onboarding proof

- Proof document: [engine-onboarding-proof.md](./engine-onboarding-proof.md)
- `editor.js` no longer owns engine panel/save/bootstrap branching directly.
- Future engine-local browser hooks now enter through `PreviewEngineShellController` instead of direct ELK calls in `editor.js`.
- `layout-bridge.js` no longer owns bridge state, text-adapter readiness, local-vs-ELK relayout dispatch, or browser view-mode/runtime assembly; those now enter through `previewBridge.host`, `app-layout-bridge-runtime.ts`, `createPreviewLayoutBridgeRuntimeFromBrowserHost(...)`, and `createPreviewElkViewModeRuntimeFromBrowserHost(...)`.
- `editor.js` no longer owns the selection/inspector/waypoint runtime constructor bags inline; those now enter through `previewShell.bootstrap.createPreviewEditorInteractionFacadeFromEditorHost(...)`, `previewShell.bootstrap.createPreviewEditorRuntimeSetFromRuntime(...)`, `app-editor-interaction-facade.ts`, and `app-editor-runtime-set.ts`.
- `editor.js` no longer owns the mutable install-state wrapper assembly for generation, selection depth, override state, last violations, dirty-nav suppression, or relayout timers; those now enter through `previewShell.bootstrap.createPreviewGridEditorInstallUnitFromLegacyEditorHost(...)` in `app-grid-editor-install-unit.ts`.
- `editor.js` no longer owns the bootstrap-tail runtime option mapping inline; that now enters through `previewShell.bootstrap.createBootstrapPreviewEditorRuntimeOptionsFromHost(...)` and `app-bootstrap.ts`.
- `editor.js` no longer owns the higher-level `loadSVG()` or relayout-runtime option mapping inline; those now enter through `previewShell.bootstrap.createLoadPreviewSvgHostOptionsFromRuntime(...)` in `app-load.ts` and `previewBridge.relayout.createPreviewRelayoutRuntimeFromRuntime(...)` in `app-relayout-runtime.ts`.
- `editor.js` no longer owns the relayout/state-restore/live-resize coordinator option bags inline; those now enter through `previewBridge.relayout.createPreviewEditorRelayoutFacadeFromEditorHost(...)` and `app-editor-relayout-facade.ts`.
- `editor.js` no longer owns the grid/scene/rerender/delete/status-refresh coordinator option bags inline; those now enter through `previewShell.scene.createPreviewEditorSceneFacadeFromEditorHost(...)` and `app-editor-scene-facade.ts`.
- `editor.js` no longer owns the bootstrap/load/navigation/diagram-loaded/bootstrap-tail option bags inline; those now enter through `previewShell.bootstrap.createPreviewEditorBootstrapFacadeFromEditorHost(...)` and `app-editor-bootstrap-facade.ts`.
- The typed registration-first answer is now test-backed for a real external adapter plus representative ported-family and bespoke browser-shell controllers, but that is only one slice of the broader closeout bar. It does not by itself make spec 046 50/150/500-engine ready.

## Key rule

Do not treat "already calls namespaced contracts" as equivalent to "architecturally finished."

Namespaced calls solved one class of problem.
This spec solves the remaining trap-file problem.
