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

**Engine defect found outside the parity fixtures (2026-06-24):** the live
`mongo-octavia-ha` repro (apply `highlight` to one of two identical icon boxes)
exposed an icon leaf collapsing 64→40. Root cause was in `leafNaturalSize`
(`packages/layout-engine/src/layout.ts`): the icon-row height floor was gated on
`border !== NONE`, so removing the border (as `highlight` does) dropped the icon
reservation. Fixed by also reserving the icon row when the leaf has an icon. The
parity fixtures did not cover this because their boxes either keep a border or are
re-derived through `resolveStyles`; the bug only surfaces on the live override
relayout path. Tracked as a new "Style picker" surface row below.

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
| Single-selection inspector | `preview-shell/inspector/*`, `scripts/preview/editor-state.js` adapter | Live probe (2026-06-24) on `mongo-octavia-ha`: select `mongo_write`, set Min W=160, then Undo | **Pass.** Inspector renders, dirty/override summary increments (`1 override`), relayout completes (status returns to `Ready`), `.dg-selected` **survives** the inspector-triggered relayout refresh, inspector still targets the box, and Undo restores empty Min W + `No overrides` + disabled Save/Undo. `dispatchPreviewRelayoutSuccessHost` already calls `reapplySelection()` after `applyAllOverrides()`. | Save-payload round-trip still to be covered under T023/Phase 5. |
| Live-resize selection restore | `preview-shell/app-live-resize.ts`, `app-editor-relayout-facade.ts` | `npm --prefix packages/layout-engine test -- app-live-resize` | **Fixed.** Moving `reapplySelection?.()` into `.finally()` removed the `state.running` timing regression; focused assertion added. Inspector-triggered relayout selection restore now also live-verified (see Single-selection inspector row). | No open work. |
| Engine switcher | `preview-engines/*`, `preview-shell/app-bootstrap.ts`, `scripts/preview/engine-switcher.js` | Live probe (2026-06-24) on `preview-smoke` cross-checked against the server `compatible_engines` payload | **Pass.** The engine `<select>` offers exactly `[v3, elk-layered]`, matching the server compatibility list; selecting `elk-layered` renders the ELK panel (ELK layout, Show ELK raw view, Show ELK debug overlay). Compatibility is resolved by the single `evaluatePreviewEngineCompatibility` decision in `preview-engine/registry.ts` consumed by both the switcher offer and save validation. Switch-and-save against the live fixture was avoided to keep YAML clean; engine persistence stays covered by `engine-switcher.test.ts`. | Resolved (T030/T033). |
| Grid controls and overlays | `preview-shell/scene/*` | Live probe (2026-06-24) on `preview-smoke` + existing preview app tests | **Pass.** Pressing `W` toggles the grid overlay (a grid overlay element is added to the stage); the inspector exposes a numeric grid `Rows` control. No live error. | Resolved at the overlay-toggle level; numeric grid mutation stays contract-covered. |
| Drag, resize, keyboard nudge, delete, undo/redo | `preview-shell/interaction/*`, `preview-shell/app-bootstrap.ts` | Existing contract tests + live probe (2026-06-24) on `preview-smoke` | **Pass.** Delete + Undo + Redo round-trip live with faithful keyboard/mouse input (leaf delete 15→14, Ctrl+Z restores 14→15). **Drag-reorder fixed** (`e6bfa72`): `applyReorder` keys `children_order` to the authored parent, but the relayout tree splits heading parents into `[__heading, __body]` with reorderable children nested in the synthetic body; `applyPreviewOverridesToFrameTree` now redirects `children_order` to the synthetic body. Live: drag `measure` above `define` reorders (`define,measure`→`measure,define`), Undo/Redo restore, Save+reload persists (resolved into authored child order). **Handle-resize live-verified**: drag bottom-right `.dg-handle` grows `source_notes` 238×40→304×88, sizing flips to Fixed (302×88), dirties, Undo restores. **Live-resize** tracked by `app-live-resize` suite. **Nudge on absolute frame**: keyboard nudge stays gated for any child of an autolayout parent because `_isAutolayoutChild` keys off parent layout, not child position type — pre-existing (predates 046/047), consistent with drag treating such children as reorderable; the supported move path is the inspector **Offset X/Y** fields, live-verified (`implement` Absolute, Offset X=48 → x 572→601). | Known limitation: nudge on an absolute child of an autolayout parent is gated; use Offset X/Y. No 050 regression. |
| Multi-selection inspector | `preview-shell/inspector/*`, `preview-shell/interaction/*` | Live probe (2026-06-24) on `preview-smoke` | **Pass.** Shift-selecting two frames drives a bulk inspector action (Align center) that records 2 overrides + dirty, and Undo reverts it. Bulk delete of a multi-selection removes both frames and the connecting arrow (15→12 nodes) and Undo restores all 15. | Resolved (T021). |
| Style picker (highlight / border) | `packages/layout-engine/src/layout.ts` (`leafNaturalSize`), `preview-shell/frame-style.ts`, `app-relayout.ts` | `npm --prefix packages/layout-engine test -- layout frame-style` (icon-row regression + highlight-bordered regression) | **Fixed (architectural).** Two stacked causes: (1) `leafNaturalSize` gated the icon-row height floor on `border !== NONE`, so removing the border collapsed an icon leaf 64→40 — now also fires on `hasIcon`; (2) `PREVIEW_STYLE_SEMANTICS.highlight` set `border: NONE`, contradicting DIAGRAM.md (highlight = black 1px border) and `VARIANT_OVERLAYS`, so editor-picked highlight could collapse to bare-text height. Highlight is now a bordered leaf (border invisible on black fill) and reserves the 64px box minimum. Live-verified on `mongo-octavia-ha`: highlight on a non-icon box stays h=64 with stroke `#000000` through a forced relayout; annotation on an icon box stays h=64. | Resolved. The two style systems now agree: bordered leaves (default/parent/section/highlight) keep box height; annotation is the only intentionally borderless bare-text style. |
| Style picker – highlight icon color | `preview-shell/app-override-application.ts` (`applyStyleOverrideToGroup`), `preview-shell/app-fresh-render.ts`, `icon-markup.ts` (`recolorIconElementShapes`) | `npm --prefix packages/layout-engine test -- icon-embed` (new `recolorIconElementShapes` contract) | **Fixed.** Highlight-mode icons in the live override fast-path were recolored with `filter: invert(1)`, which inverted anti-aliased edge pixels into a halo (the "weird glow"). Both the fresh-render path and the override fast-path now drive icon color through `resolvedIconFill`/`preset.icon` via the shared `recolorIconElementShapes` helper (sets `fill` on shape elements), matching the static-export tint semantics. Browser bundle rebuilt; no `invert(1)` remains in `dist`. | Architecture is unified onto the fill-based color path; no further work needed for highlight icon color. |
| Text edit commit/cancel | `preview-shell/app-text-edit-runtime.ts`, `preview-shell/inspector/*`, `preview-shell/interaction/*` | `app-text-edit*` + `app-selection-host` contract tests, plus a new binding regression in `app-text-edit-runtime.test.ts`, plus a live double-click probe (2026-06-24) | **Fixed.** Live double-click text editing **threw on every attempt** — `createPreviewTextEditRuntimeFromHost` forwarded `options.model.get` as an unbound method, so `getNode` lost its `this` and `component-model.js` raised `Cannot read properties of undefined (reading 'get')` inside `startTextEdit`. Now bound via `(cid) => options.model.get(cid)` (matching the established pattern in `app-editor-relayout-facade.ts` / `app-editor-runtime-set.ts`). Live-verified on `preview-smoke`: double-click the `planning` heading glyph opens the focused `dg-text-editor` with value `Planning`, Ctrl+Enter commits `Planning live`, the heading updates, and the editor dirties with `1 override` + Save enabled. A regression test reproduces the unbound-method throw (fails without the fix). | Resolved (T022). Enter-to-commit vs Ctrl+Enter and Escape-cancel side-effects remain contract-covered. |
| Arrow/waypoint editing | `preview-shell/interaction/*`, `preview-bridge/*` | Existing waypoint contract tests + live interaction probe (2026-06-24) | **Triaged – out of active 050 scope.** Not a numbered recovery task. A live probe near the `define->measure` arrow on `preview-smoke` produced no error, but the arrow hit-target is tiny (5.8×24px) and overlapped by the `planning` column, so click/double-click resolved to the frame rather than the arrow — the probe could not reliably isolate waypoint editing. No live regression observed; behaviour stays covered by waypoint contract tests. | Optional: build a wider-arrow fixture if waypoint editing needs a dedicated live probe. Not blocking 050. |
| Save/reload/export | `preview-shell/app-save-client.ts`, `apps/preview/src/preview-host/frame-document-actions.ts` | `npm --prefix apps/preview test`; strengthened `app-save-client.test.ts`; live save/reload/export probe (2026-06-24) | **Pass.** Live on `preview-smoke`: a dirty edit flips the active Save button to `dirty`; Save persists (Min W=320 written to YAML), a fresh route reload shows 320 with `No overrides` (promoted to canonical, not a lingering override), and the export route `/svg/preview-smoke` returns SVG width 336 reflecting the saved size. A rejected save (relayout unavailable) issues no persist request and no reload (strengthened block test); a failed/thrown relayout never calls `finishRelayout` (SC-003 hardening), so no partial state is promoted. Fixture restored after the probe. | Resolved (T040–T043). |

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
