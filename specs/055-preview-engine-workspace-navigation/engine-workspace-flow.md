# Preview engine workspace flow

## Pipeline

1. `apps/preview/src/preview-host/frame-documents.ts`
   - picks the frame-YAML document handler (`frame-diagram` vs `sequence`)
   - builds `compatibleContext`
   - resolves `activeLayoutEngine`, `activeEngine`, and `compatibleEngines`
2. `packages/layout-engine/src/preview-engine/registry.ts`
   - is the single compatibility source
   - only gates by `shellMode`, `documentKinds`, `minArrowCount`,
     `rejectUnsupportedCarrierIds`, and `requiredLayoutEngineKey`
3. `apps/preview/src/preview-host/builtin-autolayout-host.ts`
   - passes `activeEngine`, `compatibleEngines`, and `persistedLayoutEngine` into
     `previewUiContext`
   - injects `layout_engine` and `compatible_engines` into `window.__DG_CONFIG`
   - loads `engine-switcher.js` only when `shouldShowPreviewEngineSwitcher(...)`
4. `packages/layout-engine/src/preview-shell/preview-ui-context.ts`
   - owns `PREVIEW_PANEL_REGISTRY`
   - decides switcher visibility plus engine-owned sidebar sections
     (`elk-layout`, `graph-layout`)
5. `scripts/preview/viewer-unified.html`
   - provides the engine switcher sidebar section
   - keeps the output header label static as `Output` (no active-engine identity slot)
6. `packages/layout-engine/src/preview-shell/app-grid-editor-install-unit.ts`
   - re-resolves the active engine during runtime selection changes
   - re-syncs sidebar visibility through `syncPreviewPanelVisibilityFromContext(...)`
   - currently hard-codes `documentKind: 'frame-diagram'` for that runtime sync path
7. `scripts/preview/engine-switcher.js`
   - renders the `<select>` from `compatible_engines`
   - POSTs `{ layout_engine }` to `/api/overrides/{slug}`
   - reloads after a successful save because the host injects per-engine scripts
8. `apps/preview/src/preview-host/frame-document-actions.ts`
   - validates the requested `layout_engine` through
     `evaluatePreviewEngineCompatibility(...)`
   - persists via `saveFrameYamlDocumentForSlug(...)`

## Current owner list

- Engine resolution: `frame-documents.ts`, `preview-engine/registry.ts`
- Compatible-engine filtering: `preview-engine/registry.ts`
- Active-engine shell context: `builtin-autolayout-host.ts`
- Sidebar visibility: `preview-ui-context.ts`, `app-shell-panels.ts`,
  `app-grid-editor-install-unit.ts`
- Browser switch/save glue: `engine-switcher.js`
- Persisted engine validation: `frame-document-actions.ts`
- Current engine display: no typed owner yet; `viewer-unified.html` still shows a
  static `Output` label

## Current baseline matrix

| Example | Kind | Persisted engine | Current compatible set | Current gap |
|---|---|---|---|---|
| `support-engineering-flow` | `frame-diagram` | `elk-force` | `v3`, `dagre`, `elk-force`, `elk-layered`, `elk-mrtree`, `elk-radial`, `elk-rectpacking`, `elk-stress` | registry-only compatibility still offers `elk-rectpacking`; no fidelity/workspace filter narrows the tab set |
| `preview-smoke` | `frame-diagram` | `elk-layered` | `v3`, `dagre`, `elk-force`, `elk-layered`, `elk-mrtree`, `elk-radial`, `elk-rectpacking`, `elk-stress` | valid multi-engine frame baseline, but navigation is still the legacy dropdown-only flow |
| `service-handshake-sequence` | `sequence` | `sequence` | `sequence` | `shouldShowPreviewEngineSwitcher(...)` is frame-only and the output header stays `Output`, so the active engine has no visible identity surface |

## Sidebar section ownership today

- ELK-family engines expose `elk-layout`
- `dagre` exposes `graph-layout`
- `v3`, `sequence`, and `force` expose no engine-specific sidebar section
