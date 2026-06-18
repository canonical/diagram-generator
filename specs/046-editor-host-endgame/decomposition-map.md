# Editor Host Decomposition Map

Cold-start map for the remaining `scripts/preview/editor.js` surface.

## Current size

- `scripts/preview/editor.js`: about 1,702 lines in the current working tree on the active 046 branch
- `scripts/preview/layout-bridge.js`: about 531 lines after the typed bridge-state/runtime extraction under spec 044
- Closeout status: the integration-sink bar is now met for spec 046. The remaining size in `editor.js` is legacy interaction glue, not the default engine-onboarding sink, and the residual preview-shell/browser-entry cold-start burden moves to spec 044 follow-up work.

## Remaining buckets

| Bucket | Example regions | Direction |
|--------|-----------------|-----------|
| Bootstrap/load/navigation | `loadSVG()`, dirty nav, diagram load signaling, tree/grid fetch bootstrap, SSE tail | diagram-load signaling, dirty navigation, tree load, arrow sync, grid load, runtime-owned SVG-load option mapping, and bootstrap-tail runtime-option mapping now live behind bootstrap owners in `app-bootstrap.ts`, `app-load.ts`, and `app-diagram-data.ts`; the remaining code is callback assembly around those owners |
| Grid/tree host UI | grid overlay/control host, tree panel render/sync | tree host render/context-menu wiring now lives in `app-selection-host.ts`; grid overlay, grid-info refresh, waypoint reapply, override-summary, constraint refresh, scene refresh sequencing, and stage-rerender host composition now live in `app-scene-host.ts`; keep shrinking the remaining grid-control runtime glue |
| Inspector host dispatch | delegated click/change/input action binding and inspector render entry | action binding lives in `app-inspector-actions.ts`; single/multi inspector runtime assembly plus inspector unit-state/render orchestration now also live in `app-inspector-host.ts` and `app-inspector-display-runtime.ts`; keep shrinking adjacent callback wiring |
| Selection/interaction glue | selection sync, bindInteraction, drag/resize/waypoint host entrypoints | selection UI sync, select/deselect state wrappers, and tree-selection host wiring now also live behind `app-selection-runtime.ts` and typed hosts; double-click/depth-selection host flow, pointer/drag-start wiring, drag-move/autolayout-context wiring, resize start/move wiring, waypoint handle/drag start-move wiring, selection chrome/arrow visual helpers, and drag/resize/waypoint completion teardown already live behind typed hosts; the remaining file is mostly generic callback assembly rather than engine-specific ownership |
| Text edit / override orchestration | commit/cancel, override summary, relayout request coordination | text-edit start/commit/cancel, relayout runtime/status, relayout success/failure follow-up, clear-override fallback, runtime-owned relayout option mapping, override-application host wiring, live resize completion-state normalization, bootstrap-tail controller/save glue, single-frame inspector mutation runtime, inspector display/unit runtime, and multi-selection action runtime now live behind typed hosts in `app-text-edit-host.ts`, `app-relayout.ts`, `app-relayout-runtime.ts`, `app-scene-host.ts`, `app-override-application.ts`, `app-resize-host.ts`, `app-bootstrap.ts`, `app-inspector-mutation-runtime.ts`, `app-inspector-display-runtime.ts`, and `app-inspector-selection-runtime.ts`; the remaining code is mostly repo-specific callback assembly and relayout scheduling glue |
| Keyboard / stage refresh | document keydown bridge, rerender follow-up sequencing | keyboard host wiring now lives in `interaction-keyboard-dispatch.ts`, including the editor-host state/flag adapter; stage hit-testing wrappers now also live in typed helpers; bootstrap-tail registration is still unfinished |
| Boot tail | save client init, engine shell controller init, pageshow/SSE bootstrap | runtime ordering, document/test-facade binding, generic engine shell controller/save payload wiring, build-status updates, override-toolbar assembly, selection restore, and EventSource creation now live in `app-bootstrap.ts`; keep only thin entry wiring plus repo-specific callbacks |

## Engine-onboarding proof

- Proof document: [engine-onboarding-proof.md](./engine-onboarding-proof.md)
- `editor.js` no longer owns engine panel/save/bootstrap branching directly.
- Future engine-local browser hooks now enter through `PreviewEngineShellController` instead of direct ELK calls in `editor.js`.
- `layout-bridge.js` no longer owns bridge state, text-adapter readiness, or local-vs-ELK relayout dispatch; those now enter through `previewBridge.host` and `app-layout-bridge-runtime.ts`.
- `editor.js` no longer owns the selection/inspector/waypoint runtime constructor bags inline; those now enter through `previewShell.bootstrap.createPreviewEditorRuntimeSetFromRuntime(...)` and `app-editor-runtime-set.ts`.
- `editor.js` no longer owns the bootstrap-tail runtime option mapping inline; that now enters through `previewShell.bootstrap.createBootstrapPreviewEditorRuntimeOptionsFromHost(...)` and `app-bootstrap.ts`.
- `editor.js` no longer owns the higher-level `loadSVG()` or relayout-runtime option mapping inline; those now enter through `previewShell.bootstrap.createLoadPreviewSvgHostOptionsFromRuntime(...)` in `app-load.ts` and `previewBridge.relayout.createPreviewRelayoutRuntimeFromRuntime(...)` in `app-relayout-runtime.ts`.
- The typed registration-first answer is now test-backed for a real external adapter plus representative ported-family and bespoke browser-shell controllers, and the remaining browser-entry/barrel cleanup no longer blocks spec 046 closeout.

## Key rule

Do not treat "already calls namespaced contracts" as equivalent to "architecturally finished."

Namespaced calls solved one class of problem.
This spec solves the remaining trap-file problem.
