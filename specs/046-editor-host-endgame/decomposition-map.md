# Editor Host Decomposition Map

Cold-start map for the remaining `scripts/preview/editor.js` surface.

## Current size

- `scripts/preview/editor.js`: about 2,178 lines in the current working tree
- Closeout status: still far above the "thin host entrypoint" bar

## Remaining buckets

| Bucket | Example regions | Direction |
|--------|-----------------|-----------|
| Bootstrap/load/navigation | `loadSVG()`, dirty nav, diagram load signaling, tree/grid fetch bootstrap, SSE tail | diagram-load signaling, dirty navigation, tree load, arrow sync, and grid load now live behind bootstrap owners in `app-bootstrap.ts` and `app-diagram-data.ts`; keep shrinking the remaining boot tail |
| Grid/tree host UI | grid overlay/control host, tree panel render/sync | tree host render/context-menu wiring now lives in `app-selection-host.ts`; grid overlay, grid-info refresh, waypoint reapply, override-summary, constraint refresh, scene refresh sequencing, and stage-rerender host composition now live in `app-scene-host.ts`; keep shrinking the remaining grid-control runtime glue |
| Inspector host dispatch | delegated click/change/input action binding and inspector render entry | action binding lives in `app-inspector-actions.ts`; single/multi inspector runtime assembly now also lives in `app-inspector-host.ts`; keep shrinking adjacent unit/state wrappers |
| Selection/interaction glue | selection sync, bindInteraction, drag/resize/waypoint host entrypoints | selection UI sync, select/deselect state wrappers, tree-selection host wiring, double-click/depth-selection host flow, pointer/drag-start wiring, drag-move/autolayout-context wiring, resize start/move wiring, waypoint handle/drag start-move wiring, and selection chrome/arrow visual helpers now live behind typed hosts; continue shrinking the remaining drag/resize/waypoint completion-adjacent glue |
| Text edit / override orchestration | commit/cancel, override summary, relayout request coordination | text-edit start/commit/cancel, relayout runtime/status, relayout success/failure follow-up, clear-override fallback, and override-application host wiring now live behind typed hosts in `app-text-edit-host.ts`, `app-relayout.ts`, `app-scene-host.ts`, and `app-override-application.ts`; keep shrinking any completion-adjacent JS glue that still snapshots live state unnecessarily |
| Keyboard / stage refresh | document keydown bridge, rerender follow-up sequencing | keyboard host wiring now lives in `interaction-keyboard-dispatch.ts`; keep trimming the residual editor-level callback assembly and state-copy wrappers |
| Boot tail | save client init, ELK preview controller init, pageshow/SSE bootstrap | runtime ordering and document/test-facade binding now live in `app-bootstrap.ts`; keep only thin entry wiring plus repo-specific callbacks |

## Key rule

Do not treat "already calls namespaced contracts" as equivalent to "architecturally finished."

Namespaced calls solved one class of problem.
This spec solves the remaining trap-file problem.
