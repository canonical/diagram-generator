# Preview Shell Contract Shape

Staged browser-contract proposal for spec 044.

## Problem to solve

The current browser contract is function-level and flat:

- `browser-entry.ts` exports 587 names
- `preview-shell/index.js` contributes 437 of them
- `editor.js` now has 0 direct `LayoutEngine.*` call sites after the current namespace migrations

That makes every browser consumer pay for low-level wiring details instead of depending on a small number of concern-owned services.

## Design decision

Do **not** introduce more top-level browser globals.

Keep `window.LayoutEngine` for compatibility during migration, but stop treating it as the long-term flat export bag. The next-stage contract is **namespaced under the existing global** and grouped by concern.

## Target contract

```text
window.LayoutEngine
  .core
  .previewShell
  .previewBridge
  .previewEngines
```

### `LayoutEngine.core`

Purpose: pure runtime/model/layout primitives that are not preview-shell specific.

Includes:

- frame model, tokens, text measure/layout
- layout/runtime primitives
- shared serialization helpers
- engine-family runtime that is not browser-host glue

Primary consumers:

- `layout-bridge.js`
- future engine adapters
- export/render paths

Rule:

- No DOM-facing preview-shell helpers belong here.

### `LayoutEngine.previewShell`

Purpose: output-only preview shell services used directly by `editor.js`.

Sub-groups:

- `bootstrap`
  `loadPreviewSvg`, save/init, nav/pageshow/SSE, snapshot/restore helpers
- `inspector`
  inspector renderers, text-edit commit/cancel, prop/style mutation entrypoints
- `interaction`
  selection, drag, resize, keyboard, waypoint host helpers
- `scene`
  tree/grid/constraint/status helpers, stage hit areas, override summaries

Primary consumers:

- `scripts/preview/editor.js`

Rule:

- New browser-facing preview helper work should land behind one of these concern groups, not as another free function on the root object.

### `LayoutEngine.previewBridge`

Purpose: services owned by the local relayout bridge rather than the shell coordinator.

Includes:

- override normalization contract
- fresh rerender contract
- frame-tree bridge bootstrap helpers
- SVG patch/render bridge helpers that remain browser-side

Primary consumers:

- `scripts/preview/layout-bridge.js`
- follow-on bridge host module(s)

Rule:

- If a helper is only needed by `layout-bridge.js`, it should not be exported through `previewShell`.

### `LayoutEngine.previewEngines`

Purpose: engine-specific browser hooks and controller contracts.

Includes:

- ELK preview controller/debug hooks
- future engine-owned browser adapters
- engine registry/browser capability metadata

Primary consumers:

- `editor.js` only through generic engine hooks
- engine-owned browser scripts

Rule:

- Engine-specific behavior must stop leaking into `previewShell` unless it is genuinely shared shell logic.

## Mapping from current `editor.js` buckets

| Current bucket | Target contract |
|---------------|-----------------|
| Load/restore/relayout helpers | `previewShell.bootstrap` and `previewBridge` |
| Inspector/text-edit rendering | `previewShell.inspector` |
| Interaction/selection/drag/resize | `previewShell.interaction` |
| Grid/tree/constraint UI | `previewShell.scene` |
| Frame props/style/selection actions | `previewShell.inspector` + `previewShell.interaction` |
| ELK controller touchpoints | `previewEngines` |

## Migration stages

### Stage 0 — freeze flat growth

Current rule stays in force:

- no new ad hoc root-level `LayoutEngine.*` additions without an owner note

### Stage 1 — add namespaced aliases

Add nested namespaces under `window.LayoutEngine` while keeping the existing root-level exports alive for compatibility.

Goal:

- switch consumers first
- remove root aliases later

Landed pilots:

- `scripts/preview/editor-state.js` now prefers `LayoutEngine.previewShell.bootstrap`
- `scripts/preview/editor.js` now prefers `LayoutEngine.previewShell.scene` for grid/tree/constraint/override-summary helpers
- `scripts/preview/editor.js` now prefers `LayoutEngine.previewShell.inspector` for inspector rendering and text-edit host helpers
- `scripts/preview/editor.js` now prefers `LayoutEngine.previewShell.inspector` for frame-prop/style/size mutation helpers and multi-selection inspector state
- `scripts/preview/editor.js` now prefers `LayoutEngine.previewShell.bootstrap` for shell bootstrap and load helpers that already belong to that namespace
- `scripts/preview/editor.js` now prefers `LayoutEngine.previewShell.interaction` for selection, drag, resize, waypoint, context-menu, hover, and keyboard helpers
- `scripts/preview/layout-bridge.js` now prefers `LayoutEngine.core` for deserialize/text/layout/arrow/sequence runtime helpers that belong to the bridge/runtime layer rather than `previewShell`
- `scripts/preview/elk-layout-controls.js` and `scripts/preview/elk-controller.js` now prefer `LayoutEngine.previewEngines`
- `scripts/preview/layout-bridge.js` now prefers `LayoutEngine.previewEngines.elk` for ELK debug/raw-view SVG construction
- `scripts/preview/force.js` now prefers `LayoutEngine.previewEngines.registry` / `previewEngines.force` for engine lookup and runtime helpers
- `scripts/preview/editor.js` now prefers `LayoutEngine.previewBridge.relayout` / `.render` for state-restore, live-resize relayout, artboard/bounds, and arrow SVG helpers
- `scripts/preview/layout-bridge.js` now prefers `LayoutEngine.previewBridge.relayout` both for override filtering and typed frame-tree override application

### Stage 2 — switch browser consumers

Move consumers by file, not by API:

1. `editor.js` uses `LayoutEngine.previewShell.*`
2. `layout-bridge.js` uses `LayoutEngine.previewBridge.*` plus `LayoutEngine.core.*`
3. engine-owned browser code uses `LayoutEngine.previewEngines.*`

Current state:

- engine-owned browser code has started this stage via `previewEngines`
- `editor.js` has started the bridge-owned part of this stage via `previewBridge`
- `editor.js` now consumes `previewShell.scene`, `previewShell.inspector`, `previewShell.bootstrap`, and `previewShell.interaction` without direct flat root calls
- `layout-bridge.js` has started the `core` part of this stage for pure runtime/layout/text/sequence helpers, the first T051 slice moved override normalization behind `previewBridge.relayout`, and the second moved ELK debug/raw-view rendering behind `previewEngines.elk`
- the main remaining work is no longer consumer migration on `editor.js`; it is decomposing the still-large `layout-bridge.js` host around the new contracts

### Stage 3 — stop adding root aliases

After the two trap files stop consuming the root bag directly:

- new APIs may only appear under a namespace
- root-level aliases become compatibility shims only

### Stage 4 — prune root aliases

Remove root-level mirrors in bounded batches after call-site migration and browser smoke checks.

## First implementation candidates

1. Introduce namespace objects in `browser-entry.ts` without deleting current exports.
2. Migrate one bounded consumer group, preferably `editor.js` inspector or grid helpers.
3. Only then decide whether a small pilot is needed beyond the namespacing step.

## Non-goals

- one-shot browser API rewrite
- introducing multiple new globals
- making 044 depend on design-foundry
