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
- drag / resize mousemove/mouseup cleanup, live local-resize relayout scheduling, and shell callback wiring still wired in JS after move/completion dispatch
- remaining grid event binding, DOM patch application, undo/dirty coordination, and relayout debounce glue
- undo wiring and mutation commits around waypoint add/remove/move after the typed geometry/DOM helpers run
- compatibility shims / global exposures used during migration

## Slice 1 status

Landed:

- primary-selection resolution
- multi-selection grouping and same-parent classification
- selection-derived inferred gap rules
- multi-selection align / distribute target planning
- multi-selection action-item assembly, including parent-bound derivation and unsupported-item filtering
- top-level multi-selection inspector flags
- single-selection summary flags (`currentAlign`, override state, waypoint state, child-note mode)
- single-selection autolayout panel branch state
- single-selection autolayout panel HTML assembly
- single-selection inspector panel HTML assembly
- multi-selection shared sizing / container / align state
- multi-selection inspector panel HTML assembly
- multi-selection inspector option resolution now delegates to TS helpers, including inferred gap, align/container/sizing state, and runtime sizing lookup
- legacy JS fallback branches for those inspector state helpers are removed; `editor.js` now delegates those decisions directly to `LayoutEngine`
- SVG click / double-click selection-depth decisions now delegate to `LayoutEngine`
- depth-aware and deepest selection hit-testing now delegates to TS helpers, leaving `editor.js` with only DOM bounds capture for the live SVG
- selection-set and selection-depth mutations now route through TS helpers instead of inline JS state updates
- autolayout reorder targeting and multi-selection resize bounds now delegate to TS geometry helpers
- multi-selection member scaling, recursive child relayout collection, propagated-override reset shaping, and sibling-relayout override merging now delegate to TS resize helpers
- arrow-key nudge override shaping, top-level keyboard shortcut resolution, and resize-persist plan building now delegate to TS interaction helpers
- document keydown branching now delegates to a TS keyboard dispatcher, leaving `editor.js` as a thin state/callback wrapper
- drag-end and resize-end completion branching now delegate to TS completion-plan helpers
- drag-end and resize-end completion dispatch now delegates to TS helpers, leaving `editor.js` to provide shell callbacks and DOM cleanup only
- live drag move branching now delegates to a TS dispatcher, leaving `editor.js` to provide SVG coordinate capture, clamp lookups, and shell glue
- live resize move branching now delegates to a TS dispatcher, leaving `editor.js` to supply model lookups, DOM callbacks, and shell glue
- drag-start selection capture, autolayout reorder context shaping, and reorder-indicator rendering now delegate to TS helpers instead of inline shell planning
- rendered component bounds capture, multi-selection resize envelope shaping, resize-handle plan selection, and resize-start state capture now delegate to a TS host helper instead of inline `editor.js` traversal
- Brockman-style preview grid resolution and span/pixel conversion now delegate to TS grid helpers
- grid control display-state resolution and runtime override shaping now delegate to TS grid-control helpers
- grid overlay geometry and grid-info recompute fallback logic now delegate to TS helpers, leaving `editor.js` with DOM patch application, event hookup, and relayout debounce glue
- grid control margin normalization, DOM-state parsing, and control-value patch shaping now delegate to TS helpers, leaving `editor.js` to apply the resulting DOM patch and handle relayout timing
- grid control runtime update planning now delegates to TS helpers, including normalized override payloads, local overlay recompute, link-to-root pruning intent, and stable relayout target fallback
- preview shell resize-handle behavior, width persistence, and panel-specific binding presets now delegate to TS helpers, leaving `editor.js` with only DOM lookup for shell bootstrap
- preview load/bootstrap coordination now delegates to a TS helper, including canonical frame-tree seeding, local-readiness fallback branching, shared post-load replay, and ELK/grid bootstrap decisions
- preview shell bootstrap now delegates to TS helpers for shell resize/picker hookup, fallback `EditorState` / `ElkPreviewController` initialization, save-client init config shaping, pageshow reload registration, and SSE reconnect status updates
- preview input/output/split-view tab state now delegates to a TS helper, including reference placeholder behavior and split-toggle label updates
- tree/sidebar rendering, context-menu setup, override summary/export shaping, and constraint-status view-state resolution now delegate to TS helpers instead of inline shell UI assembly
- the local-vs-ELK relayout branch, normalized grid-override handoff, and runtime-only coercion cleanup now delegate to a TS helper instead of living inline in `editor.js`
- single-selection inspector host composition now delegates to a TS helper, including missing-component fallback, width-unit normalization, autolayout panel composition, and final panel markup assembly
- stage SVG hit-area insertion, hover class toggling, and stage event binding now delegate to a TS helper instead of inline browser-host logic
- arrow waypoint endpoint reading, in-place segment updates, full arrow SVG rebuilds, arrowhead geometry, and waypoint-handle position updates now delegate to TS helpers
- arrow waypoint handle rendering, segment double-click binding, drag-axis resolution, collinear-prune planning, and add/remove waypoint mutation helpers now delegate to TS helpers
- the full preview SVG override pass now delegates to a TS helper, including reset/restore passes, text reflow and re-anchoring, grid-row reflow offsets, and arrow endpoint/waypoint geometry updates
- serialized-state and override-patch restore planning now delegates to TS helpers, including relayout-vs-local refresh decisions and frame-tree-aware rerender selection
- single- and multi-selection frame-property mutation rules now delegate to TS helpers, including constraint normalization, FIXED sizing capture, and inspector size-unit px conversion
- single-selection autolayout panel option resolution now delegates to TS helpers, including runtime sizing, text-measure preview widths, unit conversions, and absolute-position field values
- structural-wrapper detection, authored/rendered style inference, single-selection style mode resolution, multi-selection shared style resolution, and visible style mutation rules now delegate to TS helpers
- single-selection inspector panel option resolution now delegates to a TS helper, including view-model assembly, autolayout-panel error fallback, style-option selection, and final panel render-option packaging

Still in `editor.js` for now:

- DOM event wiring for pointer down / double-click and live drag / resize interaction
- live resize RAF scheduling and final resize-persist wrappers
- residual grid DOM host glue and relayout debounce timing
- a small set of shell runtime shims and migration-era globals

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

1. Residual pointer/drag/resize DOM cleanup, resize-relayout scheduling, and shell callbacks
2. Remaining grid DOM wiring and debounce glue
3. Final shell hook normalization and compatibility-shim cleanup
