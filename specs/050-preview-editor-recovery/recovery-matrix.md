# Preview Editor Recovery Matrix

**Last audit**: 2026-06-23 on `feat/050-preview-editor-recovery`

This matrix tracks the user-visible editor surface after the 046 decomposition.
It records the typed owner first; legacy JS should remain thin browser glue.
No intentionally deferred surfaces remain untriaged at this stage; all gaps are
listed as concrete next actions in this package’s task plan.

## Engine baseline (Phase 0 gate)

`npm --prefix packages/layout-engine test` failed **16 parity checks** in
`tests/parity.test.ts` (`test-nested-containers`, `test-deep-nesting`,
`test-alignment-grid`) before fixture regen. These are **pre-046 layout drift**,
not an editor-refactor regression. Phase 0 classification is complete on
2026-06-24:

| Test | Class | Reason | Source |
| --- | --- | --- | --- |
| `test-nested-containers` | A | Heading-row and nested height placement drift now follows arrow-aware gap promotion behavior. | `packages/layout-engine/src/layout.ts:148`, `:1056` (`1c6e46a`) |
| `test-deep-nesting` | A | Same arrow-aware gap promotion placement drift path as above, with updated expected y/h profile. | `packages/layout-engine/src/layout.ts:148`, `:1056` (`1c6e46a`) |
| `test-alignment-grid` | A | Same `layout.ts` layout-path drift in baseline and heading semantics; fixture baseline was stale. | `packages/layout-engine/src/layout.ts:148`, `:1056` (`1c6e46a`) |

`npm --prefix packages/layout-engine test` is now green after regenerating only the
three stale-golden fixtures listed above.

Note: the triple `failRelayout:`/`finishRelayout:` destructuring in
`scripts/preview/editor.js` is **not** a bug. Destructuring with renaming reads
the same source property into multiple local names (all defined and equal); it
is redundant migration-era aliasing, not dead code. Do not "fix" it by deleting
aliases without first confirming no consumer references the extra names.

Note: the triple `failRelayout:`/`finishRelayout:` destructuring in
`scripts/preview/editor.js` is **not** a bug. Destructuring with renaming reads
the same source property into multiple local names (all defined and equal); it
is redundant migration-era aliasing, not dead code. Do not "fix" it by deleting
aliases without first confirming no consumer references the extra names.

| Surface | Typed owner | Current coverage / probe | Observed status | Next action |
| --- | --- | --- | --- | --- |
| Engine parity baseline | `packages/layout-engine/src/layout.ts`, `tests/parity.test.ts` | `npm --prefix packages/layout-engine test -- parity` | Fixed. 16 failures (`test-nested-containers`, `test-deep-nesting`, `test-alignment-grid`) are classified A and fixtures regenerated accordingly. | No open baseline gate risk. |
| Browser bundle exports | `packages/layout-engine/src/browser-entry-preview-shell.ts` | `npm --prefix packages/layout-engine test -- app-diagram-navigation browser-entry app-bootstrap` | Pass. `previewShell.bootstrap` exports route/picker helpers used by the shell. | Keep coverage with each browser export change. |
| Route bootstrap, canonical path `/view/v3:<slug>` | `apps/preview/src/preview-host/*`, `preview-shell/app-bootstrap.ts` | Live probe on `/view/v3:preview-smoke` and `/view/v3:mongo-octavia-ha` | Pass. SVG renders, build status updates, component selection opens the inspector, no browser errors. `T003` focused install-unit bootstrap smoke added in `app-grid-editor-install-unit.test.ts`. | Add durable route smoke if another bootstrap regression appears. |
| Route alias `/v3/view/<slug>` | `preview-shell/app-diagram-navigation.ts`, thin `scripts/preview/editor-base.js` glue | New `app-diagram-navigation` alias tests plus live probe on `/v3/view/preview-smoke` | Fixed. Picker and browse nav now select canonical `/view/v3:<slug>` instead of blank state. | Watch for other route aliases before adding new shell-local logic. |
| Diagram picker next/previous and browse links | `preview-shell/app-diagram-navigation.ts` | Unit tests for picker sync, stepped navigation, browse active state | Fixed at unit level (`initPreviewDiagramNavigation` now covers stepping callbacks); live next/previous smoke remains pending. | Add a focused browser smoke if stepping remains suspect. |
| Stage render and selection | `preview-shell/interaction/*`, `preview-shell/scene/*` | Live probe selected `define` and `mongo_clients` | Pass for single frame selection and inspector population. | Continue with keyboard, drag, resize, and tree synchronization probes. |
| Single-selection inspector | `preview-shell/inspector/*`, `scripts/preview/editor-state.js` adapter | Live probe after selecting `define`, changing `min_width`, then undoing | Partial. Inspector render, dirty state, undo command, Undo button enablement, and undo restore now pass. Selection chrome after **inspector-triggered** relayout is **not yet re-verified** — `d6f2f16` wired `reapplySelection` into the live-resize lane only, not necessarily this path. | Live-probe an inspector field change (e.g. `min_width`) and confirm `.dg-selected` survives the refresh; if not, wire `reapplySelection` through the inspector-mutation/scene-refresh path too, then verify save payload. |
| Live-resize selection restore | `preview-shell/app-live-resize.ts`, `app-editor-relayout-facade.ts` | `npm --prefix packages/layout-engine test -- app-live-resize` | **Fixed.** Moving `reapplySelection?.()` into `.finally()` removed the `state.running` timing regression; focused assertion added. | `state.running` now resets after relayout completion; still needs inspector-triggered relayout live-proof in `T012`. |
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
