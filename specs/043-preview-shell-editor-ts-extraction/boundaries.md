# Preview shell boundaries (active)

Use this file as the cold-start map for spec 043. Do not start from archived spec 026 unless historical detail is required.

## Goal

Shrink `scripts/preview/editor.js` into a thin bootstrap/coordinator so the standalone repo stays lean and stable while the preview shell scales to many more engines.

## Stable owners already outside `editor.js`

- save flow: `scripts/preview/save-client.js`, `apps/preview/src/persistence/*`
- editor state helpers: `scripts/preview/editor-state.js`
- ELK controller slice: `scripts/preview/elk-controller.js`
- inspector selection view-model helpers: `packages/layout-engine/src/preview-shell/inspector-selection.ts`
- single-selection inspector state helpers: `packages/layout-engine/src/preview-shell/inspector-single.ts`
- multi-selection field-state helpers: `packages/layout-engine/src/preview-shell/inspector-multi.ts`
- click / double-click selection-resolution helpers: `packages/layout-engine/src/preview-shell/interaction-selection.ts`
- selection-set / depth mutation helpers: `packages/layout-engine/src/preview-shell/interaction-selection-state.ts`
- reorder / multi-resize geometry helpers: `packages/layout-engine/src/preview-shell/interaction-geometry.ts`
- live resize override shaping / recursive relayout helpers: `packages/layout-engine/src/preview-shell/interaction-resize.ts`
- keyboard shortcut resolution + nudge helpers: `packages/layout-engine/src/preview-shell/interaction-keyboard.ts`
- drag / resize completion-plan helpers: `packages/layout-engine/src/preview-shell/interaction-completion.ts`
- preview grid resolver + span conversion helpers: `packages/layout-engine/src/preview-shell/grid-resolution.ts`
- frame override allowlists: `packages/layout-engine/src/preview-shell/frame-override-manifest.ts`
- engine registry contracts: `packages/layout-engine/src/index.ts`, `packages/layout-engine/tests/preview-engine-registry.test.ts`

## Responsibilities still concentrated in `editor.js`

- most inspector view-model resolution and field merge rules
- inspector DOM rendering and field wiring
- remaining selection depth-cycling edge cases
- most drag / resize / nudge controller logic
- keyboard side effects and DOM cleanup still wired in shell
- grid control state shaping and update dispatch
- `loadSVG()` shell coordination and some engine hookup glue

## Slice 1 status

Landed:

- primary-selection resolution
- multi-selection grouping and same-parent classification
- selection-derived inferred gap rules
- top-level multi-selection inspector flags
- single-selection summary flags (`currentAlign`, override state, waypoint state, child-note mode)
- single-selection autolayout panel branch state
- multi-selection shared sizing / container / align state
- legacy JS fallback branches for those inspector state helpers are removed; `editor.js` now delegates those decisions directly to `LayoutEngine`
- SVG click / double-click selection-depth decisions now delegate to `LayoutEngine`
- selection-set and selection-depth mutations now route through TS helpers instead of inline JS state updates
- autolayout reorder targeting and multi-selection resize bounds now delegate to TS geometry helpers
- multi-selection member scaling, recursive child relayout collection, propagated-override reset shaping, and sibling-relayout override merging now delegate to TS resize helpers
- arrow-key nudge override shaping, top-level keyboard shortcut resolution, and resize-persist plan building now delegate to TS interaction helpers
- drag-end and resize-end completion branching now delegate to TS completion-plan helpers
- Brockman-style preview grid resolution and span/pixel conversion now delegate to TS grid helpers

Still in `editor.js` for now:

- HTML assembly for single- and multi-selection inspector panels
- field-level value formatting and unit conversion
- style picker resolution
- single-selection constraint and style rendering
- DOM event wiring for live drag / resize / keyboard interaction

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

1. Remaining drag / resize / nudge controller state, especially keyboard dispatch and persist/commit cleanup
2. Remaining inspector DOM/wiring cleanup only where it still removes real branching
3. Grid control state shaping and remaining DOM wiring
4. Bootstrap cleanup and hook normalization
