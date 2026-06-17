# Preview Shell Surface Audit

Baseline audit for spec 044 after spec 043 closeout.

## Current metrics

Baseline was captured at 043 closeout. The figures below are refreshed after the initial 044 bridge-contract pilots so cold-start readers do not rely on stale trap-file sizes.

| Surface | Metric | Notes |
|--------|--------|-------|
| `packages/layout-engine/src/browser-entry.ts` | 587 exported names across 24 export blocks | Flat browser surface remains the main contract problem |
| `./preview-shell/index.js` re-export in `browser-entry.ts` | 437 names total | 221 runtime exports + 216 type exports |
| `scripts/preview/editor.js` | 0 direct `LayoutEngine.` call sites | `editor.js` now consumes browser helpers entirely through `__DG_getPreview*Contract()` seams |
| `scripts/preview/layout-bridge.js` | 1,286 lines | T051 has now moved override normalization, ELK debug/raw-view rendering, and the fresh-render pipeline out of the bridge host; the bridge now routes runtime/layout/text helpers through `LayoutEngine.core`, `previewBridge.relayout`, `previewBridge.render`, and `previewEngines.elk` |
| `packages/layout-engine/dist/layout-engine.iife.js` | 3,967,845 bytes | About 3.78 MiB browser payload |

## Browser-entry owner groups

| Owner concern | Export count | Sources |
|---------------|-------------:|---------|
| Core frame/layout/text/style runtime | 86 | `frame-model`, `tokens`, `text-measure`, `canvas-text-adapter`, `layout`, `resolve-styles`, `text-layout`, `elk-layout`, `graph-layout-elk`, `heading-synthesis`, `frame-classes`, `resolved-spec-typography` |
| Engine families outside preview shell | 43 | `force-runtime`, `sequence-layout/*`, `arrow-routing` |
| Preview shell/browser host surface | 437 | `preview-shell/index.js` |
| Serialization helpers | 4 | `frame-serialize.js` |
| Preview-engine registry/contracts | 17 | `preview-engine/index.js` |

`preview-shell/index.js` now accounts for about 74% of the browser-entry surface. Reducing the flat browser contract means shrinking that export bag first, not shaving isolated engine exports.

## Current browser-consumer buckets

| File | Flat root calls | Namespaced path |
|------|----------------:|-----------------|
| `scripts/preview/editor.js` | 0 | `previewShell.bootstrap`, `previewShell.scene`, `previewShell.inspector`, `previewShell.interaction`, `previewBridge.*` |
| `scripts/preview/layout-bridge.js` | 0 executable root calls | `previewBridge.relayout`, `previewBridge.render`, `previewEngines.elk`, plus `core` |

## Contract pressure points

1. `editor.js` pays for many single-use callbacks because the browser contract is function-level, not concern-level.
2. `preview-shell/index.js` mixes runtime helpers, host helpers, renderers, stores, and types into one browser surface.
3. `layout-bridge.js` still mixes bootstrap, DOM patching, and arrow patch/render helpers in one file even after override normalization, ELK debug/raw-view rendering, and fresh-render orchestration moved out.
4. ELK controller hooks are thin now, but still shell-wired through globals rather than a typed browser contract.

## Delta since the first 044 pilot

- `editor.js` direct flat `LayoutEngine.*` usage dropped from 92 call sites / 83 unique APIs to 0.
- The last reduction came from widening `previewShell.scene`, `previewShell.bootstrap`, and `previewShell.interaction` for grid/navigation/hit-testing/snap helpers.
- `layout-bridge.js` now routes its deserialize/text/layout/arrow/sequence helpers through the new `LayoutEngine.core` pilot instead of the flat root bag.
- The first T051 extraction moved `applyPreviewOverridesToFrameTree()` into `packages/layout-engine/src/preview-shell/app-relayout.ts`.
- The second T051 extraction moved ELK debug/raw-view SVG construction into `packages/layout-engine/src/preview-engine/elk-debug-view.ts`.
- The third T051 extraction moved `renderFreshPreviewSvg()` and `renderPreviewFrameTreeToSvg()` into `packages/layout-engine/src/preview-shell/app-fresh-render.ts`, with `editor.js` consuming the fresh-render path through `previewBridge.render`.
- Together those three slices shrank the browser bridge by about 661 lines, from 1,947 to 1,286.

## First safe moves for spec 044

1. Keep `editor.js` on the namespaced contract surface; do not reintroduce root-level browser calls.
2. Continue T051 by splitting `layout-bridge.js` on ownership lines, not by arbitrary line-count slicing.
3. Treat `LayoutEngine.core` as the bridge/runtime namespace for future pure helpers instead of growing the flat root bag again.
4. Keep the shell output-only; do not reopen Input / Output / Both compatibility as part of this spec.
