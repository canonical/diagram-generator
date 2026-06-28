# Spec 060 Evidence: Playwright And Validation

Date: 2026-06-28
Branch: `feat/060-output-pane-engine-tabs-rerender`

## Repro Summary

Initial live-browser repro on `http://127.0.0.1:8100/view/v3:support-engineering-flow` confirmed:

- engine workspace chrome rendered in the right aside instead of the output pane
- engine controls still exposed `prev` / `next`
- clicking `Dagre layout` changed header state but did not change the rendered SVG

Root cause:

- `preview-engine-workspace-chrome.ts` updated local active-engine state but did
  not drive the render-owned rerender path
- the render runtime still resolved the preview engine from
  `window.__DG_CONFIG.layout_engine`
- the live preview server process had to be restarted after the host-template
  move because it was still serving the old cached bootstrap

## Implemented Fix

- moved the engine switcher section into the output pane header in
  `scripts/preview/viewer-unified.html`
- restyled the workspace chrome to use baseline-foundry tabs in
  `scripts/preview/editor.css`
- updated `preview-engine-workspace-chrome.ts` so tab switches:
  - write the active engine back to `__DG_CONFIG.layout_engine`
  - call the typed rerender callback
  - resync panel visibility and save-button chrome
- exposed a typed `__DG_rerenderPreviewEngineWorkspaceStage` callback from the
  grid install/runtime seam
- locked the host/runtime contract with focused tests

## Playwright Proof

Fixture: `support-engineering-flow`

Observed after restarting the preview server on the updated branch:

- `#engine-switcher-section` is inside `#output-pane .dg-preview-pane-header`
- no `#engine-switcher-section` exists inside `#dg-preview-aside`
- no `#engine-switcher-prev` / `#engine-switcher-next` exist
- `#engine-switcher-tabs [role="tab"]` renders 8 baseline-foundry tabs
- switching from `ELK force layout` to `Dagre layout` changes the rendered SVG

Recorded browser result:

```json
{
  "before": {
    "switcherInHeader": true,
    "switcherInAside": false,
    "tabCount": 8,
    "activeTab": "ELK force layout",
    "hasEnginePrev": false,
    "hasEngineNext": false,
    "svgHash": 3019241488
  },
  "after": {
    "activeTab": "Dagre layout",
    "help": "Selected engine is unsaved until you save this document.",
    "activeBadge": "Engine: Dagre layout",
    "svgHash": 2998224578,
    "svgChanged": true
  },
  "errors": []
}
```

## Validation

- `npm --prefix packages/layout-engine test`
  - 146 files / 851 tests passed
- `npm --prefix apps/preview test`
  - 145 tests passed
- `node scripts/check-browser-bundle-fresh.mjs`
  - passed
- `node scripts/check_no_new_python.mjs`
  - passed
