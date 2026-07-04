# Render-path inventory

Spec 071 T041/T043. Post-migration snapshot for the current
`feat/071-preview-render-node-graph` branch worktree.

## Classification key

- `migrated`: legacy ownership is gone; the remaining site delegates to the
  typed owner.
- `read-only`: helper or browser bridge that may remain because it does not own
  behavior; it only forwards to the typed owner.
- `deferred(<spec>)`: allowed to survive only behind an explicit later spec.

## 1. Stage mount ownership

| File | Lines | Current role | Classification | Why |
|---|---:|---|---|---|
| `packages/layout-engine/src/preview-shell/preview-render-node.ts` | 34-48 | Sole typed owner of `stage.replaceChildren(...)` after fit. | `migrated` | This is now the only product-code stage mount path; tests source-scan `preview-shell/**` for stray stage mounts. |
| `packages/layout-engine/src/preview-shell/app-load.ts` | 315-323 | Load/save->reload host delegates `mountRenderedSvg(...)` to `mountPreviewRenderNode(...)`. | `read-only` | No direct stage mutation remains here; it is a thin adapter into the render node. |
| `packages/layout-engine/src/preview-shell/app-scene-host.ts` | 463-485 | Engine-tab and scene-host rerenders delegate to `mountPreviewRenderNode(...)`. | `read-only` | Tab switches no longer own an unfitted mount path. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 1864-1873 | Bridge runtime local relayout mount delegates to `mountPreviewRenderNode(...)`. | `read-only` | The bridge no longer owns an alternate mount path. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 2165-2174 | Engine relayout mount delegates to `mountPreviewRenderNode(...)`. | `read-only` | Same typed owner as the load and tab-switch paths. |

Result: there are no unclassified direct `#stage` replacement sites outside
`preview-render-node.ts`.

## 2. Fit ownership

| File | Lines | Current role | Classification | Why |
|---|---:|---|---|---|
| `packages/layout-engine/src/preview-shell/app-frame-svg.ts` | 192-235 | `fitPreviewSvgToRenderedContent()` remains the single fit implementation. | `read-only` | One fit primitive survives, but render-node callers now share the same rule. |
| `packages/layout-engine/src/preview-shell/app-frame-svg.ts` | 239-299 | `patchPreviewSvgFromLayout()` now reuses `fitPreviewSvgToRenderedContent(...)`. | `migrated` | The old `0 0 w h` reset divergence is gone; local relayout uses the same fit rule. |
| `packages/layout-engine/src/preview-shell/app-load.ts` | 253-320 | Load host optionally forwards fit through `mountPreviewRenderNode(...)`. | `read-only` | This is bridge plumbing only, not an independent fit policy. |
| `packages/layout-engine/src/preview-shell/app-scene-host.ts` | 477-485 | Scene-host rerenders pass fit callbacks into `mountPreviewRenderNode(...)`. | `read-only` | The host no longer decides separate fit semantics. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 1722-1724 | Bridge runtime exposes `fitRenderedSvg(...)` by forwarding to preview-bridge render fit. | `read-only` | Browser-host compat seam only. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 1867-1870 | Local relayout fit happens only via render-node callback wiring. | `read-only` | Atomic render->fit->mount now goes through the render node. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 2168-2171 | Engine relayout fit happens only via render-node callback wiring. | `read-only` | No second fit owner remains here. |
| `packages/layout-engine/src/preview-shell/app-grid-editor-install-unit.ts` | 840 | Browser install unit passes `fitRenderedSvgToContent` into typed runtime wiring. | `read-only` | Pass-through only. |
| `packages/layout-engine/src/preview-shell/app-grid-editor-runtime.ts` | 353-365 | Runtime resolves the browser fit callback and forwards it into typed hosts. | `read-only` | Adapter plumbing only; it does not fit stages directly. |

Result: the fit algorithm is singular, and the surviving call sites are all
delegates or pass-through seams.

## 3. Render-intent ownership

| File | Lines | Current role | Classification | Why |
|---|---:|---|---|---|
| `packages/layout-engine/src/preview-shell/preview-switch-node.ts` | 233-277 | Sole direct writer of `__DG_previewRenderIntent` and typed committer of `frameTreeJson.layoutEngine`. | `migrated` | Product tests source-scan for direct render-intent writes outside this file. |
| `packages/layout-engine/src/preview-shell/app-grid-editor-install-unit.ts` | 715-719 | Bootstrap state seeds the switch by calling `commitPreviewSwitchNode(...)`. | `read-only` | Initial editor wiring now delegates to the switch node. |
| `packages/layout-engine/src/preview-shell/app-grid-editor-install-unit.ts` | 1153-1158 | Workspace rerender path switches engines through `commitPreviewSwitchNodeLayoutEngine(...)`. | `read-only` | No direct render-intent write remains here. |
| `packages/layout-engine/src/preview-shell/app-grid-editor-runtime.ts` | 379-384 | Restore sync delegates to `commitPreviewSwitchNode(...)`. | `read-only` | Restore/reload uses the typed switch owner. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 1114-1118 | Compat setter republishes through `commitPreviewSwitchNode(...)`. | `read-only` | The bridge no longer writes render intent directly. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 1199-1212 | Window bindings `setFrameTreeJson()` / `setFrameTreeLayoutEngine()` both delegate to switch-node helpers. | `read-only` | Shared switch owner now owns publication. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 1244-1254 | Top-level bridge API `setFrameTreeJson()` / `setFrameTreeLayoutEngine()` both delegate to switch-node helpers. | `read-only` | Same typed owner as the compat bindings. |
| `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` | 1783-1787 | Init/render/relayout republish path delegates to `commitPreviewSwitchNode(...)`. | `read-only` | This is now a thin publication hook, not a proto-switch. |
| `packages/layout-engine/src/preview-shell/preview-engine-workspace-chrome.ts` | 110-114 | Runtime workspace state commits through `commitPreviewSwitchNode(...)`. | `read-only` | Workspace chrome no longer owns a second render-intent writer. |
| `packages/layout-engine/src/preview-shell/preview-engine-workspace-chrome.ts` | 212-216 | Frame-tree layout-engine commit delegates through `commitPreviewSwitchNodeLayoutEngine(...)`. | `read-only` | Typed switch owner commits the active engine signal. |

Result: there are no direct `commitPreviewRenderIntentToWindow(...)` call sites
left in product code, and no direct `__DG_previewRenderIntent = ...` write
outside `preview-switch-node.ts`.

## 4. Closeout status

1. Stage mount ownership is closed: one typed render node mounts `#stage`.
2. Fit ownership is closed: one fit implementation remains, and all paths share
   it through render-node delegation.
3. Render-intent ownership is closed: one typed switch node writes render
   intent and commits frame-tree engine selection.
4. No inventory item is currently `deferred(...)`.
5. No unclassified second path remains for stage mount, fit, or render intent.
