# Preview Shell Callback Flow

Cold-start map for the preview-shell callback chain after the spec 043 extractions.

## Pipeline

1. `scripts/preview/editor.js`
   Browser events, DOM lookup, compatibility globals, and shell timers still start here.
2. `LayoutEngine.loadPreviewSvg(...)`
   `packages/layout-engine/src/preview-shell/app-load.ts`
   Loads stage markup, seeds frame-tree state, and decides local-ready / ELK bootstrap flow.
3. `LayoutEngine.applyPreviewSvgOverrides(...)`
   `packages/layout-engine/src/preview-shell/app-override-application.ts`
   Patches rendered SVG from live overrides, then the shell refreshes selection chrome and inspector state.
4. Mutation paths
   `frame-prop-actions.ts`, `frame-style.ts`, `grid-controls.ts`, `interaction-*`, `app-live-resize.ts`
   TS owns mutation shaping; `editor.js` still commits undo, dirty state, debounce timers, and some DOM cleanup.
5. Relayout path
   `requestV3Relayout()` in `editor.js` -> `LayoutEngine.runPreviewRelayout(...)`
   `packages/layout-engine/src/preview-shell/app-relayout.ts`
   Chooses local bridge vs ELK, clears runtime coercions, and returns control to `_finishV3Relayout()`.
6. Reload / refresh
   `_finishV3Relayout()` -> `loadSVG()` -> inspector/tree/constraint refresh in `editor.js`
7. Undo / restore path
   `EditorState` command -> `app-state-restore.ts`
   Restores override/editor snapshots, then either local refreshes or relayouts before shell refresh.

## Key files

- `scripts/preview/editor.js`
- `packages/layout-engine/src/preview-shell/app-load.ts`
- `packages/layout-engine/src/preview-shell/app-override-application.ts`
- `packages/layout-engine/src/preview-shell/app-relayout.ts`
- `packages/layout-engine/src/preview-shell/app-live-resize.ts`
- `packages/layout-engine/src/preview-shell/frame-prop-actions.ts`
- `packages/layout-engine/src/preview-shell/grid-controls.ts`
- `packages/layout-engine/src/preview-shell/app-inspector-host.ts`

## Tests to run

- `npm --prefix packages/layout-engine test -- app-load.test.ts app-override-application.test.ts app-relayout.test.ts app-live-resize.test.ts frame-prop-actions.test.ts grid-controls.test.ts`
- `npm --prefix apps/preview test`

## Known limits

- Inline inspector handler globals still exist during the migration.
- Pointer down / move / up DOM wiring still lives in `editor.js`.
- `scripts/preview/layout-bridge.js` remains part of the local relayout path and is still a trap file.
