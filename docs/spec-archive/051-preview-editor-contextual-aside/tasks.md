# Tasks: Spec 051 Preview Editor Contextual Aside

**Input**: `docs/spec-archive/051-preview-editor-contextual-aside/spec.md`
**Branch**: `feat/051-preview-editor-contextual-aside`

## Phase 1: Inventory And Contract

- [x] T001 Confirm the static chrome inventory in `scripts/preview/viewer-unified.html`:
      browse, layers, nodes, output, header, selection, engine switcher, grid,
      ELK, overrides, constraints, force solver, force simulation, force
      guidance, guide badge.
- [x] T002 Confirm current manifest facts in
      `packages/layout-engine/src/preview-engine/builtins.ts`: v3 grid editing,
      ELK layout controls, force simulation controls, sequence output-only.
- [x] T003 Add a typed `PreviewUiContext` model under
      `packages/layout-engine/src/preview-shell/` that accepts engine manifest,
      document kind, shell mode, compatible engines, selection summary, dirty
      state, undo/redo state, constraint state, and reference availability.
- [x] T004 Add a typed `PreviewPanelRegistry` with entries for every current
      static section and control group. Each entry must include id, owner,
      visible predicate, disabled predicate where applicable, and reason.
- [x] T005 Add pure unit tests for the registry covering v3, ELK, force,
      sequence, invalid persisted engine, and no-manifest fallback.

## Phase 2: Engine And Document Visibility

- [x] T010 Replace always-visible autolayout template sections in
      `apps/preview/src/preview-host/builtin-autolayout-host.ts` with
      manifest/capability-driven section selection.
- [x] T011 Ensure ELK layout controls are visible only when
      `hostView.sidebarSections` includes `elk-layout`.
- [x] T012 Ensure ELK raw/debug toggles are separately gated by explicit
      capability or typed ELK debug support; do not show them for v3.
- [x] T013 Ensure grid controls are visible only when
      `capabilities.gridEditing === true`.
- [x] T014 Ensure force solver/simulation/guidance sections are visible only
      when the active shell mode is force and the manifest exposes the matching
      capabilities.
- [x] T015 Move engine switcher visibility into typed logic: show for multiple
      compatible engines or invalid persisted engine repair; hide for a single
      valid compatible engine.
- [x] T016 Update engine switcher help text to state that engine switching
      persists `meta.layout_engine` and reloads the page.
- [x] T017 Add apps/preview host-contract tests asserting v3 lacks ELK controls,
      ELK lacks native grid controls, and force lacks grid/ELK controls.

## Phase 3: Figma-Like Right Aside Structure

- [x] T020 Define stable right-aside groups: Selection, Arrangement, Layout,
      Sizing, Position, Appearance, Engine, Document, Diagnostics.
- [x] T021 Split current `inspector-single-panel.ts` output into group-level
      render helpers without changing behavior yet.
- [x] T022 Split current `inspector-autolayout-panel.ts` output into Layout,
      Sizing, and Position groups.
- [x] T023 Split current `inspector-multi-panel.ts` output into Selection,
      Arrangement, Layout, Sizing, and Appearance groups.
- [x] T024 Move save/export/undo/redo/clear/copy controls into one typed
      Document action group while preserving existing button ids for browser
      compatibility.
- [x] T025 Ensure groups have stable DOM ids or `data-dg-panel-id` attributes
      so tests do not rely on English labels.
- [x] T026 Keep layout dense: no nested cards, no oversized headings, no
      explanatory feature text beyond concise help for disabled or destructive
      actions.

## Phase 4: Selection-Specific Predicates

- [x] T030 Extend selection summary helpers in `inspector-selection.ts` and
      `inspector-single.ts` to classify root, frame leaf, container frame,
      structural wrapper, arrow, text-bearing frame, and mixed selection.
- [x] T031 Empty selection: render only the compact empty state.
- [x] T032 Single frame: show identity, alignment, sizing, position,
      appearance, overrides, and violations as applicable.
- [x] T033 Container frame: show direction and gap delta only for containers.
- [x] T034 Text-bearing hug-width frame: show min/max width and max chars; hide
      max chars when fixed pixel max width owns measurement.
- [x] T035 Absolute positioning: show X/Y offset only when selected frame has a
      parent and position is `ABSOLUTE`.
- [x] T036 Structural wrapper: hide style picker and show read-only structural
      status only if needed.
- [x] T037 Single arrow: show waypoint/arrow details only; hide frame layout,
      sizing, style, and position controls.
- [x] T038 Multi-select: show align for bounded items; show distribute/gap only
      for same-parent actionable siblings.
- [x] T039 Multi-select: show bulk style/sizing/direction only when all
      actionable selected items support the group; show mixed values when
      values differ.
- [x] T040 Root selection: block delete and parent-position controls; root grid
      controls remain in Document/Layout only when native grid editing applies.

## Phase 5: Diagnostics And Document Actions

- [x] T050 Hide constraints/violations when there is no active registry or no
      violations to report.
- [x] T051 Keep build status always visible and driven by relayout/save state.
- [x] T052 Save button: disable when clean, saving, relayout blocked, or errors
      block persistence.
- [x] T053 Save SVG: disable when current render is unavailable or export is in
      flight.
- [x] T054 Undo/Redo: preserve current ids and keyboard contracts while moving
      visual placement into the Document group.
- [x] T055 Clear all: show or enable only when there are clearable overrides,
      removals, grid overrides, or engine layout overrides.
- [x] T056 Copy overrides: hide by default unless diagnostics mode is active or
      there are overrides; retain an explicit debug path if users rely on it.

## Phase 6: Tests And Verification

- [x] T060 Add panel-registry unit tests in `packages/layout-engine/tests/`.
- [x] T061 Add inspector render tests for empty, frame leaf, container, arrow,
      root, same-parent multi, mixed-parent multi, and mixed unsupported multi.
- [x] T062 Add apps/preview contract tests for static host HTML visibility for
      v3, ELK, force, and sequence/mindmap-like engine proofs.
- [x] T063 Add keyboard/focus tests proving hidden controls are not focusable.
- [x] T064 Run `npm --prefix packages/layout-engine test`.
- [x] T065 Run `npm --prefix apps/preview test`.
- [x] T066 Run `node scripts/check_no_new_python.mjs`.
- [x] T067 If browser verification is needed, use no-screenshot Playwright DOM
      probes by default; do not capture screenshots unless explicitly asked.

## Phase 7: Follow-Up Live UI Audit

- [x] T070 Reproduce reported ELK-control leakage on a non-ELK selected engine
      with a no-screenshot DOM probe. Capture route, active manifest id,
      persisted `meta.layout_engine`, server-rendered section visibility,
      runtime DOM `hidden` state, and focusability for `#elk-layout-section`,
      `#elk-raw-view-toggle`, `#elk-debug-overlay-toggle`, and nested ELK inputs.
- [x] T071 Fix the owning layer for ELK leakage once reproduced. Do not just
      hide the outer section if nested controls remain visible or focusable.
      Add regression coverage for fresh page load and engine-switch reload.
- [x] T072 Remove redundant single-selection identity chrome from the right
      aside: duplicate `Selection` heading, selected id text such as
      `global_server`, and type text such as `Frame`.
- [x] T073 Audit the `weight` parameter. Prove the exact supported layout case
      where changing weight has an observable effect, or remove the control as
      a no-op.
- [x] T074 Remove user-tamperable stroke/style internals from Appearance unless
      a variant-selection product decision explicitly reintroduces them.
- [x] T075 Replace `as defined` style display with concrete effective variant
      names such as `child`, `parent`, `section`, `highlight`, and
      `annotation`, with a clear fallback for unknown authored variants.
- [x] T076 Gate Layout grid controls on top-level page/root selection plus
      `capabilities.gridEditing === true`; hide the grid section for non-root
      frame, arrow, multi, and empty selection states.
- [x] T077 Add inspector/render tests proving grid controls appear for root
      selection only and remain hidden for non-root v3 selections.
- [x] T078 Redesign constraint diagnostics so counts like `31 warnings` expose
      inspectable details: severity, affected frame id, rule name, and
      actionable hint.
- [x] T079 Add tests for constraint diagnostics: no diagnostics for zero
      violations, summary plus details for warnings/errors, and selected-frame
      linkage when a selected element has violations.
- [x] T080 Run the full validation set and a no-screenshot browser DOM probe
      covering v3, ELK, root selection, non-root selection, and diagnostics.

## Phase 8: Contextual surfacing — author-reported live gate (closed 2026-06-29)

> The Phase 1–7 `[x]` items proved registry/DOM-visibility *unit* facts. The
> author still reports the live editor wrong. These tasks close the gap and are
> gated by spec 065 `verification-protocol.md` §2 "Inspector / ELK option
> contextual surfacing" — proven by **real Playwright** on a live server, no
> mocks, controls asserted `hidden` AND non-focusable (not `disabled`).
>
> **Closed 2026-06-29** by
> `docs/spec-archive/051-preview-editor-contextual-aside/evidence/contextual-aside-check.ts`
> against a fresh `http://127.0.0.1:8120` preview server. Result JSON:
> `evidence/contextual-aside-result.json` (`ok: true`). Cropped screenshots:
> `evidence/screenshots/v3-tiered-network-root-aside.png`,
> `evidence/screenshots/elk-support-root-aside.png`,
> `evidence/screenshots/elk-layered-controls-aside.png`, and
> `evidence/screenshots/elk-radial-controls-aside.png`.

- [x] **T090** Gate the single-selection autolayout inspector
      (`inspector-autolayout-panel.ts` / `inspector-autolayout-options.ts`) on
      `activeEngine` + `capabilities.gridEditing`. When the active engine is ELK
      (or any non-grid engine), cols/rows/gutters/margins and other N/A fields
      must be **removed/hidden and skipped in Tab order**, never merely disabled.
      **Verify**: protocol §2 — `v3` doc shows grid fields; `elk-layered` doc has
      them absent + unfocusable, proven by real DOM probe + Tab traversal.
      **Verified 2026-06-29**: `contextual-aside-check.ts` selects `page` through
      the layer tree; v3 shows native direction/grid controls, ELK reports no
      native direction/gap controls and grid inputs hidden/unpainted/unfocusable,
      with Tab traversal skipping the forbidden controls.

- [x] **T091** Make ELK option surfacing **algorithm-contextual**. Today
      `elk-layout-controls.ts::paramSpecs` renders one flat per-engine
      `controlSpecs` list. Only options relevant to the active ELK algorithm may
      render; switching algorithm (e.g. layered → radial) must hide the now-
      irrelevant `elk-layered`-only inputs, not grey them.
      **Verify**: protocol §2 — real `selectOption` of the algorithm control on
      an `elk-layered` doc; assert layered-only inputs disappear for radial.
      **Verified 2026-06-29**: this UI selects ELK algorithms through engine
      tabs; real tab clicks `elk-layered` -> `elk-radial` prove
      `elk.layered.layering.strategy` is rendered only for layered and absent
      from radial DOM, rendered control keys, screenshot, and Tab sequence.

- [x] **T092** Remove the ELK debug overlay entirely (control + code):
      `#elk-debug-overlay-toggle`, its handler in `elk-layout-controls.ts`
      (`bindElkViewToggles`/`readPreviewEngineDebugOverlay`/setter), and the
      `viewer-unified.html` markup + help text. Author asked for it gone.
      **Verify**: grep shows no `elk-debug-overlay` / `DebugOverlay` symbols
      remain in source; protocol §2 asserts the element is absent on every engine.
      **Verified 2026-06-29**: source grep under `scripts/`, `packages/`, and
      `apps/` has no `elk-debug-overlay`/`DebugOverlay` symbols outside specs and
      inbox notes; browser proof asserts the element absent on v3 and ELK.

- [x] **T093** Make "Show ELK raw view" ELK-only: the raw-view toggle must be
      present only when the active engine is an ELK-family engine, hidden +
      unfocusable otherwise.
      **Verify**: protocol §2 — `v3` doc has no raw-view toggle in DOM/Tab order;
      `elk-layered` doc shows it.
      **Verified 2026-06-29**: v3 root proof reports `#elk-raw-view-toggle`
      absent/hidden/unfocusable; ELK force and radial proofs report it visible.

- [x] **T094** Remove the "Only engines compatible with this document are
      listed…" help paragraph (`viewer-unified.html`); tab presence is enough.
      **Verify**: template test asserts the paragraph is gone; DOM probe confirms.
      **Verified 2026-06-29**: source grep finds the text only in historical
      notes/specs; browser proof asserts the text absent after ELK loads and
      after algorithm switching.

- [x] **T095** Source the panel/inspector visibility resolver from the SAME
      `PreviewRenderIntent`/engine resolver spec 065 introduces, so the aside
      cannot drift from the rendered engine (FR-007 of 065).
      **Verify**: focused test that panel engine === rendered engine from one
      source; protocol §2 confirms post-switch the aside matches the new engine.
      **Verified 2026-06-29**: `app-grid-editor-install-unit.ts` resolves panel
      and inspector visibility from `__DG_previewRenderIntent`/active engine,
      with the predicate threaded through the typed grid runtime; browser proof
      confirms `data-layout-engine` and aside controls match after ELK switches.


## Ordered Improvement Plan

1. Build the typed UI context and registry first, with pure tests.
2. Fix engine-level visibility: ELK hidden for v3, grid hidden for ELK, force
   controls hidden for grid.
3. Reorganize right-aside groups without changing field semantics.
4. Add selection-specific predicates for frame, container, arrow, root, and
   multi-select.
5. Tighten Document and Diagnostics groups with disabled-state reasons.
6. Polish labels, density, and focus order after behavior is locked.
7. Complete the live UI audit follow-up before closing spec 051.
