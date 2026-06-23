# Preview Editor Recovery Matrix

**Last audit**: 2026-06-23 on `feat/050-preview-editor-recovery`

This matrix tracks the user-visible editor surface after the 046 decomposition.
It records the typed owner first; legacy JS should remain thin browser glue.

| Surface | Typed owner | Current coverage / probe | Observed status | Next action |
| --- | --- | --- | --- | --- |
| Browser bundle exports | `packages/layout-engine/src/browser-entry-preview-shell.ts` | `npm --prefix packages/layout-engine test -- app-diagram-navigation browser-entry app-bootstrap` | Pass. `previewShell.bootstrap` exports route/picker helpers used by the shell. | Keep coverage with each browser export change. |
| Route bootstrap, canonical path `/view/v3:<slug>` | `apps/preview/src/preview-host/*`, `preview-shell/app-bootstrap.ts` | Live probe on `/view/v3:preview-smoke` and `/view/v3:mongo-octavia-ha` | Pass. SVG renders, build status updates, component selection opens the inspector, no browser errors. | Add durable route smoke if another bootstrap regression appears. |
| Route alias `/v3/view/<slug>` | `preview-shell/app-diagram-navigation.ts`, thin `scripts/preview/editor-base.js` glue | New `app-diagram-navigation` alias tests plus live probe on `/v3/view/preview-smoke` | Fixed. Picker and browse nav now select canonical `/view/v3:<slug>` instead of blank state. | Watch for other route aliases before adding new shell-local logic. |
| Diagram picker next/previous and browse links | `preview-shell/app-diagram-navigation.ts` | Unit tests for picker sync, stepped navigation, browse active state | Partially verified. Canonical and alias sync pass; live next/previous stepping not yet exercised. | Add a focused browser smoke if stepping remains suspect. |
| Stage render and selection | `preview-shell/interaction/*`, `preview-shell/scene/*` | Live probe selected `define` and `mongo_clients` | Pass for single frame selection and inspector population. | Continue with keyboard, drag, resize, and tree synchronization probes. |
| Single-selection inspector | `preview-shell/inspector/*` | Live probe after selecting child frames | Pass for initial render of sizing/style/layout controls. | Verify mutation, dirty state, undo, save payload. |
| Engine switcher | `preview-engines/*`, `preview-shell/app-bootstrap.ts`, `scripts/preview/engine-switcher.js` | Live probe checks compatible options on v3 fixtures | Options render (`v3`, `elk-layered`); switching was not re-tested after the alias fix to avoid mutating YAML. | Use a temporary fixture or isolated save harness before validating switching. |
| Grid controls and overlays | `preview-shell/scene/*` | Existing preview app tests; no live mutation in this audit | Unverified in live editor. | Probe numeric grid edit, overlay toggle, dirty state, undo. |
| Drag, resize, keyboard nudge, delete, undo/redo | `preview-shell/interaction/*`, `preview-shell/app-bootstrap.ts` | Existing contract tests only | Unverified in live editor after 046. | Highest next interaction group after route/picker. |
| Multi-selection inspector | `preview-shell/inspector/*`, `preview-shell/interaction/*` | Existing panel tests only | Unverified in live editor. | Probe shift/meta selection and bulk align/size controls. |
| Text edit commit/cancel | `preview-shell/inspector/*`, `preview-shell/interaction/*` | Existing text-edit contract tests only | Unverified in live editor. | Probe double-click edit, Enter/Escape, dirty/undo/save state. |
| Arrow/waypoint editing | `preview-shell/interaction/*`, `preview-bridge/*` | Existing waypoint contract tests only | Unverified in live editor. | Probe waypoint insert/drag/remove without saving. |
| Save/reload/export | `preview-shell/app-save-client.ts`, `apps/preview/src/preview-host/frame-document-actions.ts` | `npm --prefix apps/preview test`; live route probe did not save | Server save/export contracts pass; live editor save flow unverified. | Use a disposable frame fixture before live save/reload testing. |

## Audit Commands

```bash
npm --prefix packages/layout-engine test -- app-diagram-navigation browser-entry app-bootstrap
npm --prefix apps/preview test
npm --prefix packages/layout-engine run build:browser
```

Live probe result: `/v3/view/preview-smoke` now reports picker value,
selected option, and active browse link as `/view/v3:preview-smoke` with no
browser console/page errors.
