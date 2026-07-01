# Render-path inventory

Spec 071 T000. Snapshot taken on `feat/071-preview-render-node-graph` at commit
`86eb5e1`.

## Classification key

- `migrate`: must be absorbed by the spec 071 render node or switch node.
- `read-only`: helper or pass-through that may remain only if it becomes a thin
  delegate to the new owner.
- `deferred(<spec>)`: allowed to survive only behind an explicit later spec.

## 1. Stage mount sites

| File | Lines | Current role | Classification | Why |
|---|---:|---|---|---|
| `packages/layout-engine/src/preview-shell/app-load.ts` | 315 | Initial load and save->reload path mounts `renderResult.svg` into `#stage`. | `migrate` | FR-001 requires load/reload to route through one render node instead of owning its own mount + fit path. |
| `packages/layout-engine/src/preview-shell/app-scene-host.ts` | 456-470 | `rerenderPreviewStageHost()` mounts fresh-render output during engine-tab rerender / scene-host refresh. | `migrate` | This is the tab-switch path that currently skips fit and causes canvas drift. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 2023-2039 | `performEngineRelayout()` mounts fresh engine-relayout output and then fits it. | `migrate` | Engine relayout is a third independent stage owner; render node must absorb it. |

## 2. Fit implementation and fit call sites

| File | Lines | Current role | Classification | Why |
|---|---:|---|---|---|
| `packages/layout-engine/src/preview-shell/app-frame-svg.ts` | 192-235 | `fitPreviewSvgToRenderedContent()` is the current fit primitive. | `read-only` | Keep only as the single fit implementation or move it into the render node; it must stop being a free-floating primitive with multiple callers. |
| `packages/layout-engine/src/preview-shell/app-frame-svg.ts` | 239-299 | `patchPreviewSvgFromLayout()` resets `viewBox` to `0 0 w h` and then re-fits after local relayout patching. | `migrate` | This is the origin-divergent fit path Phase 1 must unify. |
| `packages/layout-engine/src/preview-shell/app-load.ts` | 252-320 | `createLoadPreviewSvgHostOptions()` wires an optional `fitRenderedSvgToContent` callback into the load path. | `migrate` | Load should stop deciding how/when fit happens; render node owns render->fit->mount. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 1699-1703 | Bridge runtime exposes `fitRenderedSvg()` by forwarding to `fitPreviewSvgToRenderedContent()`. | `read-only` | This can survive only as a thin bridge into the render node; it cannot remain an alternate fit authority. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 2034-2037 | `performEngineRelayout()` calls `fitRenderedSvg()` after its own mount. | `migrate` | Same path as the stage mount above; render node must own both steps atomically. |
| `packages/layout-engine/src/preview-shell/app-grid-editor-install-unit.ts` | 803 | Browser-host options pass `fitSvgToRenderedContent` into the preview load host. | `read-only` | Plumbing only after Phase 1, provided it delegates to the render node owner. |
| `packages/layout-engine/src/preview-shell/app-grid-editor-runtime.ts` | 620 | Runtime passes browser `fitRenderedSvgToContent` into the scene/bootstrap contract. | `read-only` | Another pass-through; acceptable only if it no longer decides fit semantics. |

## 3. Render-intent commit sites

| File | Lines | Current role | Classification | Why |
|---|---:|---|---|---|
| `packages/layout-engine/src/preview-shell/app-grid-editor-install-unit.ts` | 678-689 | Bootstrap commits initial active/persisted engine into `__DG_previewRenderIntent`. | `migrate` | Initial workspace state should be seeded by the switch node, not a browser-host helper. |
| `packages/layout-engine/src/preview-shell/app-grid-editor-install-unit.ts` | 1116-1121 | `__DG_rerenderPreviewEngineWorkspaceStage()` recommits active engine just before rerender. | `migrate` | This is one of the duplicate switch writers Phase 3 must remove. |
| `packages/layout-engine/src/preview-shell/app-grid-editor-runtime.ts` | 356-365 | `syncRestoredFrameTreeState()` commits restored engine/direction/override state after reload. | `migrate` | Restore/reload is part of switch-state rehydration and must funnel through one owner. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 1091-1095 | Compat host `setFrameTreeLayoutEngine()` commits render intent after changing frame-tree engine. | `migrate` | Bridge compatibility layer should call the switch node, not publish intent itself. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 1176-1179 | Window binding `setFrameTreeJson()` republishes render intent. | `migrate` | Duplicate writer. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 1185-1189 | Window binding `setFrameTreeLayoutEngine()` republishes render intent. | `migrate` | Duplicate writer. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 1221-1224 | Top-level bridge API `setFrameTreeJson()` republishes render intent. | `migrate` | Duplicate writer. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 1228-1233 | Top-level bridge API `setFrameTreeLayoutEngine()` republishes render intent. | `migrate` | Duplicate writer. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 1744-1747 | `publishRenderIntentToWindow()` republishes intent after init/render/relayout calls. | `migrate` | This is effectively an ad-hoc proto-switch inside the bridge runtime. |
| `packages/layout-engine/src/preview-shell/preview-engine-workspace-chrome.ts` | 108-114 | `setRuntimeWorkspaceState()` writes active/persisted engine into config + render intent. | `migrate` | Workspace chrome should update the switch node, not own persisted engine signaling. |
| `packages/layout-engine/src/preview-shell/preview-engine-workspace-chrome.ts` | 166-170 | `commitFrameTreeLayoutEngine()` commits intent after mutating frame-tree engine. | `migrate` | Another duplicate writer in the tab-switch path. |

## 4. Immediate implications for Phase 1 / Phase 3

1. There are exactly three direct `#stage` replacement sites in product code,
   and all three are `migrate`.
2. The engine-tab path in `app-scene-host.ts` is the only direct mount path that
   does not currently fit the stage after mount.
3. Local relayout does not replace the stage, but it still owns a separate
   fit-origin rule via `patchPreviewSvgFromLayout()`.
4. There are 11 product-code `commitPreviewRenderIntentToWindow(...)` call
   sites outside `preview-render-intent.ts`; none are safe as permanent owners.
5. No site is currently classified `deferred`; spec 071 must absorb or thin all
   of them for closeout.
