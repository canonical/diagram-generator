# Tasks: Preview Editor Recovery

**Input**: Design documents from `/specs/050-preview-editor-recovery/`

## Phase 1 - Recovery Audit

- [ ] T001 Build an editor recovery matrix from the spec and map each UI
      surface to its typed owner, current tests, and observed status.
- [ ] T002 Run the current targeted preview/editor suites and record the first
      failing owner for each broken surface.
- [ ] T003 Add or update a focused smoke contract proving the editor route
      bootstraps all required runtime contracts.
- [ ] T004 Mark any intentionally deferred surface in the matrix with a reason,
      owner, and follow-up spec pointer.

## Phase 2 - Bootstrap And Stage Interactions

- [ ] T010 Fix missing or miswired browser-entry exports consumed by thin
      preview wrappers.
- [ ] T011 Restore diagram picker/route load and stage binding behavior.
- [ ] T012 Restore selection, hover, selection chrome, and tree/inspector
      synchronization.
- [ ] T013 Restore drag, resize, live resize, keyboard nudge, delete, undo, and
      redo through typed interaction/runtime owners.
- [ ] T014 Add focused behavior coverage for each restored interaction group.

## Phase 3 - Inspector And Text Editing

- [ ] T020 Restore single-selection inspector text, style, sizing, layout, and
      autolayout controls.
- [ ] T021 Restore multi-selection align, distribute, sizing, and delete
      controls.
- [ ] T022 Restore text-block edit commit/cancel behavior.
- [ ] T023 Prove inspector/text changes update model state, SVG state, dirty
      state, undo state, and save payloads.

## Phase 4 - Engine Controls And Relayout Recovery

- [ ] T030 Restore engine switcher wiring and compatible-engine UI state.
- [ ] T031 Restore ELK controls, raw/debug toggles, and relayout trigger
      behavior.
- [ ] T032 Add failed relayout coverage proving the last good render is
      preserved with a clear status.
- [ ] T033 Ensure engine control saves share the same compatibility validation
      used by route load and relayout.

## Phase 5 - Save, Reload, Export

- [ ] T040 Restore save client dirty-state, save, and rejected-save feedback.
- [ ] T041 Add a save/reload regression covering representative stage,
      inspector, text, and engine edits.
- [ ] T042 Confirm export SVG reflects saved semantic state after reload.
- [ ] T043 Confirm no partial state is persisted after failed relayout or
      rejected save.

## Phase 6 - Verification And Handoff

- [ ] T050 Run targeted layout-engine preview-shell tests for changed owners.
- [ ] T051 Run targeted apps/preview persistence and host contract tests.
- [ ] T052 Run `npm --prefix apps/preview test`.
- [ ] T053 Run `npm --prefix packages/layout-engine test -- browser-entry app-bootstrap app-grid-editor app-layout-bridge-runtime app-relayout`.
- [ ] T054 Run `node scripts/check_no_new_python.mjs`.
- [ ] T055 Update `docs/specs.md`, `AGENTS.md`, and this package status when
      the recovery bar changes.
