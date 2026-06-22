# Layout Bridge Decomposition Map

Cold-start map for `scripts/preview/layout-bridge.js` under spec 044.

## Pipeline

1. Bridge bootstrap
   `initLayoutBridge(slug)` now thin-wraps the typed `previewBridge.host`
   runtime, which fetches tree/document JSON and seeds bridge state.
2. Rehydrate and normalize
   `deserializeFrame*`, `applyOverridesToFrameTree()`, removal helpers,
   linked-grid spacing.
3. Local relayout
   `performLocalRelayout()` now delegates to the typed bridge runtime, which
   rehydrates TS models, runs layout, updates component model, and patches the
   live SVG.
4. ELK relayout
   `performElkRelayout()` now delegates to the typed bridge runtime and then
   feeds the remaining debug/raw-view helpers.
5. Fresh rerender
   `renderFreshSvg()` and `renderFrameTreeToSvg()` now thin-wrap
   `previewBridge.host` / `previewBridge.render` helpers for
   delete/full-refresh paths.

## Candidate slices

| Slice | Current functions | Future owner |
|------|-------------------|--------------|
| Bridge state + bootstrap | thin JS wrappers only | `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` via `previewBridge.host` |
| Override normalization | `applyOverridesToFrameTree`, linked-grid helpers, removal helpers | preview-shell relayout/override contract |
| Frame/icon/text SVG patching | thin JS wrappers only | `packages/layout-engine/src/preview-shell/app-frame-svg.ts` via `previewBridge.render` |
| Arrow patch/render path | thin JS wrappers only | `packages/layout-engine/src/preview-shell/app-arrow-render.ts` via `previewBridge.render` |
| ELK debug/raw view | `_elk*`, `refreshElkViewMode`, `refreshElkDebugOverlay` | ELK controller/debug owner |
| Fresh render/export helpers | thin wrappers only | `packages/layout-engine/src/preview-shell/app-fresh-render.ts` via `previewBridge.render` |

## First safe split points

1. Move override normalization rules out first; they are the least DOM-coupled and already overlap typed shell concerns.
2. Separate ELK debug/raw-view helpers from the live relayout path so debug UI stops sharing one trap file with core bridge logic.
3. Split arrow patch/render helpers or the fresh-render orchestration only after the override contract is stable; they share DOM assumptions with current stage markup.

## Pilot landed

- The bridge now resolves `filterRelayoutOverrideEntry` through `LayoutEngine.previewBridge.relayout` first.
- Override normalization now lives in `packages/layout-engine/src/preview-shell/app-relayout.ts` as `applyPreviewOverridesToFrameTree()`, with `layout-bridge.js` calling the typed relayout contract instead of mutating the frame tree inline.
- ELK debug/raw-view SVG construction now lives in `packages/layout-engine/src/preview-engine/elk-debug-view.ts`, with `layout-bridge.js` consuming it through `previewEngines.elk`.
- Fresh render now lives in `packages/layout-engine/src/preview-shell/app-fresh-render.ts`, with `layout-bridge.js` reduced to host wrappers and `editor.js` consuming rerenders through `previewBridge.render`.
- Arrow identity, routed-arrow decoration, live arrow SVG patching, and fresh arrow SVG construction now live in `packages/layout-engine/src/preview-shell/app-arrow-render.ts`, with `layout-bridge.js` consuming them through `previewBridge.render`.
- Frame/icon/text DOM rebuild, placed-bounds collection, rendered-SVG fitting, and layout-delta SVG patching now live in `packages/layout-engine/src/preview-shell/app-frame-svg.ts`, with `layout-bridge.js` reduced to namespaced wrappers.
- Bridge state/bootstrap, frame-tree mutation helpers, text-adapter readiness, and local-vs-ELK relayout orchestration now live in `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts`, with `layout-bridge.js` consuming them through `previewBridge.host`.
- `editor.js` now consumes the same namespaced bridge contract for restore, relayout, live-resize scheduling, artboard fitting, rendered-bounds reads, arrow SVG patch helpers, full rerender paths, and the live bridge runtime surface.
- Next bridge-host step: finish the remaining ELK debug/raw-view ownership and retire compatibility fallbacks so the bridge file reads purely as a thin façade.

## Tests to run

- `npm --prefix packages/layout-engine test -- app-arrow-render.test.ts app-relayout.test.ts app-live-resize.test.ts app-override-application.test.ts app-stage-svg.test.ts arrow-render.test.ts`
- `npm --prefix apps/preview test`

## Known limits

- `layout-bridge.js` still carries ELK debug/raw-view DOM wiring and compatibility fallbacks in one browser file.
- The bridge still carries a compatibility fallback through `window.LayoutEngine?.core`, even though executable flat `LayoutEngine.foo` calls are gone.
