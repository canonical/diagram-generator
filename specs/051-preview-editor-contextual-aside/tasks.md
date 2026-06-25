# Tasks: Spec 051 Preview Editor Contextual Aside

**Input**: `specs/051-preview-editor-contextual-aside/spec.md`
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

- [ ] T020 Define stable right-aside groups: Selection, Layout, Position,
      Appearance, Engine, Document, Diagnostics.
- [ ] T021 Split current `inspector-single-panel.ts` output into group-level
      render helpers without changing behavior yet.
- [ ] T022 Split current `inspector-autolayout-panel.ts` output into Layout,
      Sizing, and Position groups.
- [ ] T023 Split current `inspector-multi-panel.ts` output into Selection,
      Arrangement, Layout, Sizing, and Appearance groups.
- [ ] T024 Move save/export/undo/redo/clear/copy controls into one typed
      Document action group while preserving existing button ids for browser
      compatibility.
- [ ] T025 Ensure groups have stable DOM ids or `data-dg-panel-id` attributes
      so tests do not rely on English labels.
- [ ] T026 Keep layout dense: no nested cards, no oversized headings, no
      explanatory feature text beyond concise help for disabled or destructive
      actions.

## Phase 4: Selection-Specific Predicates

- [ ] T030 Extend selection summary helpers in `inspector-selection.ts` and
      `inspector-single.ts` to classify root, frame leaf, container frame,
      structural wrapper, arrow, text-bearing frame, and mixed selection.
- [ ] T031 Empty selection: render only the compact empty state.
- [ ] T032 Single frame: show identity, alignment, sizing, position,
      appearance, overrides, and violations as applicable.
- [ ] T033 Container frame: show direction and gap delta only for containers.
- [ ] T034 Text-bearing hug-width frame: show min/max width and max chars; hide
      max chars when fixed pixel max width owns measurement.
- [ ] T035 Absolute positioning: show X/Y offset only when selected frame has a
      parent and position is `ABSOLUTE`.
- [ ] T036 Structural wrapper: hide style picker and show read-only structural
      status only if needed.
- [ ] T037 Single arrow: show waypoint/arrow details only; hide frame layout,
      sizing, style, and position controls.
- [ ] T038 Multi-select: show align for bounded items; show distribute/gap only
      for same-parent actionable siblings.
- [ ] T039 Multi-select: show bulk style/sizing/direction only when all
      actionable selected items support the group; show mixed values when
      values differ.
- [ ] T040 Root selection: block delete and parent-position controls; root grid
      controls remain in Document/Layout only when native grid editing applies.

## Phase 5: Diagnostics And Document Actions

- [ ] T050 Hide constraints/violations when there is no active registry or no
      violations to report.
- [ ] T051 Keep build status always visible and driven by relayout/save state.
- [ ] T052 Save button: disable when clean, saving, relayout blocked, or errors
      block persistence.
- [ ] T053 Save SVG: disable when current render is unavailable or export is in
      flight.
- [ ] T054 Undo/Redo: preserve current ids and keyboard contracts while moving
      visual placement into the Document group.
- [ ] T055 Clear all: show or enable only when there are clearable overrides,
      removals, grid overrides, or engine layout overrides.
- [ ] T056 Copy overrides: hide by default unless diagnostics mode is active or
      there are overrides; retain an explicit debug path if users rely on it.

## Phase 6: Tests And Verification

- [x] T060 Add panel-registry unit tests in `packages/layout-engine/tests/`.
- [ ] T061 Add inspector render tests for empty, frame leaf, container, arrow,
      root, same-parent multi, mixed-parent multi, and mixed unsupported multi.
- [x] T062 Add apps/preview contract tests for static host HTML visibility for
      v3, ELK, force, and sequence/mindmap-like engine proofs.
- [ ] T063 Add keyboard/focus tests proving hidden controls are not focusable.
- [x] T064 Run `npm --prefix packages/layout-engine test`.
- [x] T065 Run `npm --prefix apps/preview test`.
- [x] T066 Run `node scripts/check_no_new_python.mjs`.
- [ ] T067 If browser verification is needed, use no-screenshot Playwright DOM
      probes by default; do not capture screenshots unless explicitly asked.

## Ordered Improvement Plan

1. Build the typed UI context and registry first, with pure tests.
2. Fix engine-level visibility: ELK hidden for v3, grid hidden for ELK, force
   controls hidden for grid.
3. Reorganize right-aside groups without changing field semantics.
4. Add selection-specific predicates for frame, container, arrow, root, and
   multi-select.
5. Tighten Document and Diagnostics groups with disabled-state reasons.
6. Polish labels, density, and focus order after behavior is locked.
