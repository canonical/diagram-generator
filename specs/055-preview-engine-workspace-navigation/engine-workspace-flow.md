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
   - passes `activeEngine`, `compatibleEngines`, `persistedLayoutEngine`, and
     `documentKind` into `previewUiContext`
   - injects `document_kind`, `active_engine_id`, `active_engine_label`,
     `persisted_layout_engine`, `layout_engine`, and `compatible_engines` into
     `window.__DG_CONFIG`
   - loads `engine-switcher.js` only when `shouldShowPreviewEngineSwitcher(...)`
4. `packages/layout-engine/src/preview-shell/preview-ui-context.ts`
   - owns `PREVIEW_PANEL_REGISTRY`
   - decides switcher visibility plus engine-owned sidebar sections
     (`elk-layout`, `graph-layout`)
5. `scripts/preview/viewer-unified.html`
   - provides the engine switcher sidebar section and `active-engine-label` slot
   - loads the thin `scripts/preview/engine-switcher.js` bootstrap wrapper
6. `packages/layout-engine/src/preview-shell/preview-engine-workspace-chrome.ts`
   - owns the typed browser-local workspace model for active vs persisted engine
   - updates `window.__DG_CONFIG` + runtime state as tabs change
   - persists `layout_engine` only when the save client collects the payload
7. `packages/layout-engine/src/preview-shell/app-grid-editor-install-unit.ts`
   - re-resolves the active engine during runtime selection changes
   - re-syncs sidebar visibility through `syncPreviewPanelVisibilityFromContext(...)`
   - reads `document_kind`, `active_engine_id`, and `persisted_layout_engine`
     from the live runtime config instead of hard-coding frame defaults
8. `scripts/preview/engine-switcher.js`
   - remains a thin bootstrap wrapper over the typed workspace chrome owner
9. `apps/preview/src/preview-host/frame-document-actions.ts`
   - validates the requested `layout_engine` through
     `evaluatePreviewEngineCompatibility(...)`
   - persists via `saveFrameYamlDocumentForSlug(...)`

## Current owner list

- Engine resolution: `frame-documents.ts`, `preview-engine/registry.ts`
- Compatible-engine filtering: `preview-engine/registry.ts`
- Active-engine shell context: `builtin-autolayout-host.ts`
- Active-engine identity + browser-local workspace runtime:
  `preview-engine-workspace-chrome.ts`
- Sidebar visibility: `preview-ui-context.ts`, `app-shell-panels.ts`,
  `app-grid-editor-install-unit.ts`
- Browser switch bootstrap: `engine-switcher.js`
- Persisted engine validation: `frame-document-actions.ts`
- Current engine display: `preview-engine-workspace-chrome.ts` via
  `viewer-unified.html#active-engine-label`

## Current behavior matrix

| Example | Kind | Persisted engine | Current compatible set | Current behavior / limit |
|---|---|---|---|---|
| `support-engineering-flow` | `frame-diagram` | `elk-force` | `v3`, `dagre`, `elk-force`, `elk-layered`, `elk-mrtree`, `elk-radial`, `elk-rectpacking`, `elk-stress` | tab rail + prev/next navigation switch engines browser-locally until Save; fidelity filtering is still deferred to spec 057 |
| `preview-smoke` | `frame-diagram` | `elk-layered` | `v3`, `dagre`, `elk-force`, `elk-layered`, `elk-mrtree`, `elk-radial`, `elk-rectpacking`, `elk-stress` | active engine label, tab rail, and save-path persistence all run through the typed workspace owner |
| `service-handshake-sequence` | `sequence` | `sequence` | `sequence` | switcher stays hidden while the output header still surfaces `Engine: Sequence layout` |

## Sidebar section ownership

- ELK-family engines expose `elk-layout`
- `dagre` exposes `graph-layout`
- `v3`, `sequence`, and `force` expose no engine-specific sidebar section
