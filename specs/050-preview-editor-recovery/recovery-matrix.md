# Preview Editor Recovery Matrix

**Last audit**: 2026-06-23 on `feat/050-preview-editor-recovery`

This matrix tracks the user-visible editor surface after the 046 decomposition.
It records the typed owner first; legacy JS should remain thin browser glue.

## Engine baseline (Phase 0 gate)

`npm --prefix packages/layout-engine test` currently fails **16 parity tests**
in `tests/parity.test.ts` (`test-deep-nesting`, `test-alignment-grid`; 100-128px
deltas). These are **pre-046 layout drift, not an editor-refactor regression**.
The parity fixtures were last regenerated at `e45bd18` (2026-06-05); `layout.ts`
then changed at `1c6e46a` (2026-06-10, arrow-routing) and `ba62301` (2026-06-13,
author-fixture restore) without regenerating the goldens. The 046 editor
decomposition landed later and does not touch `layout.ts`. Until Phase 0
(T0a/T0b) classifies each failure as stale-golden or real-regression and returns
the suite to green, "tests pass" is not a valid recovery gate.

Note: the triple `failRelayout:`/`finishRelayout:` destructuring in
`scripts/preview/editor.js` is **not** a bug. Destructuring with renaming reads
the same source property into multiple local names (all defined and equal); it
is redundant migration-era aliasing, not dead code. Do not "fix" it by deleting
aliases without first confirming no consumer references the extra names.

| Surface | Typed owner | Current coverage / probe | Observed status | Next action |
| --- | --- | --- | --- | --- |
| Engine parity baseline | `packages/layout-engine/src/layout.ts`, `tests/parity.test.ts` | `npm --prefix packages/layout-engine test -- parity` | Red. 16 failures (deep-nesting, alignment-grid), pre-existing. | Phase 0 T0a/T0b: classify each as stale golden vs real regression, return suite to green or quarantine explicitly. |
| Browser bundle exports | `packages/layout-engine/src/browser-entry-preview-shell.ts` | `npm --prefix packages/layout-engine test -- app-diagram-navigation browser-entry app-bootstrap` | Pass. `previewShell.bootstrap` exports route/picker helpers used by the shell. | Keep coverage with each browser export change. |
| Route bootstrap, canonical path `/view/v3:<slug>` | `apps/preview/src/preview-host/*`, `preview-shell/app-bootstrap.ts` | Live probe on `/view/v3:preview-smoke` and `/view/v3:mongo-octavia-ha` | Pass. SVG renders, build status updates, component selection opens the inspector, no browser errors. | Add durable route smoke if another bootstrap regression appears. |
| Route alias `/v3/view/<slug>` | `preview-shell/app-diagram-navigation.ts`, thin `scripts/preview/editor-base.js` glue | New `app-diagram-navigation` alias tests plus live probe on `/v3/view/preview-smoke` | Fixed. Picker and browse nav now select canonical `/view/v3:<slug>` instead of blank state. | Watch for other route aliases before adding new shell-local logic. |
| Diagram picker next/previous and browse links | `preview-shell/app-diagram-navigation.ts` | Unit tests for picker sync, stepped navigation, browse active state | Partially verified. Canonical and alias sync pass; live next/previous stepping not yet exercised. | Add a focused browser smoke if stepping remains suspect. |
| Stage render and selection | `preview-shell/interaction/*`, `preview-shell/scene/*` | Live probe selected `define` and `mongo_clients` | Pass for single frame selection and inspector population. | Continue with keyboard, drag, resize, and tree synchronization probes. |
| Single-selection inspector | `preview-shell/inspector/*`, `scripts/preview/editor-state.js` adapter | Live probe after selecting `define`, changing `min_width`, then undoing | Partial. Inspector render, dirty state, undo command, Undo button enablement, and undo restore now pass. Selection chrome after **inspector-triggered** relayout is **not yet re-verified** — `d6f2f16` wired `reapplySelection` into the live-resize lane only, not necessarily this path. | Live-probe an inspector field change (e.g. `min_width`) and confirm `.dg-selected` survives the refresh; if not, wire `reapplySelection` through the inspector-mutation/scene-refresh path too, then verify save payload. |
| Live-resize selection restore | `preview-shell/app-live-resize.ts`, `app-editor-relayout-facade.ts` | `npm --prefix packages/layout-engine test -- app-live-resize` | **Regressed.** `d6f2f16` restores selection after a live-resize relayout but broke 2 existing tests: the new `.then(reapplySelection).finally(...)` chain inserts a microtask, leaving `state.running === true` when the cancel/orchestration tests assert `false`. | Fix without changing timing: call `options.reapplySelection?.()` **inside** the existing `.finally()` (before/after `state.running = false`), not in a separate `.then()`. Re-run `app-live-resize`. |
| Engine switcher | `preview-engines/*`, `preview-shell/app-bootstrap.ts`, `scripts/preview/engine-switcher.js` | Live probe checks compatible options on v3 fixtures | Options render (`v3`, `elk-layered`); switching was not re-tested after the alias fix to avoid mutating YAML. | Use a temporary fixture or isolated save harness before validating switching. |
| Grid controls and overlays | `preview-shell/scene/*` | Existing preview app tests; no live mutation in this audit | Unverified in live editor. | Probe numeric grid edit, overlay toggle, dirty state, undo. |
| Drag, resize, keyboard nudge, delete, undo/redo | `preview-shell/interaction/*`, `preview-shell/app-bootstrap.ts` | Existing contract tests only | Unverified in live editor after 046. | Highest next interaction group after route/picker. |
| Multi-selection inspector | `preview-shell/inspector/*`, `preview-shell/interaction/*` | Existing panel tests only | Unverified in live editor. | Probe shift/meta selection and bulk align/size controls. |
| Text edit commit/cancel | `preview-shell/inspector/*`, `preview-shell/interaction/*` | `app-text-edit*` + `app-selection-host` contract tests now cover nested text hit-testing and start-state fallback; all suite passes (`browser-entry app-diagram-navigation app-bootstrap app-text-edit* app-selection-host`) | Contract coverage is restored for text target resolution after 046 refactor; live editor probe still pending for Enter/Escape and save/undo/dirty side-effects. | Add a narrow live probe that verifies double-click on nested text and checks dirty state, undo, and save payload. |
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

Inspector mutation probe result: changing `define.min_width` to `128` enables
Save and Undo, reports `1 override`, and Undo restores the empty value and clean
state. Remaining bug: `.dg-selected` is not restored on the refreshed SVG after
the inspector-triggered relayout.
