# Tasks: Spec 055 Preview Engine Workspace Navigation

**Input**: `specs/055-preview-engine-workspace-navigation/spec.md`  
**Branch**: `feat/055-preview-engine-workspace-navigation`

## Phase 0: Scope the Workspace Model

- [x] **T000** Inventory the current engine-switch path and compatibility source.
      **Do**: trace engine selection, active-engine display, compatible-engine
      filtering, and active sidebar-section visibility through the preview host
      and preview-shell owners.
      **Verify**: capture the current owner list before changing UI.

- [x] **T001** Reproduce the reported engine-workspace failures.
      **Do**: verify the current behavior for `support-engineering-flow`,
      `service-handshake-sequence`, and one multi-engine frame example.
      **Verify**: record the failure matrix in implementation notes or tests.

## Phase 1: Typed Engine Workspace State

- [ ] **T010** Define a typed engine-workspace state model.
      **Do**: model active engine, compatible engines, persisted engine,
      per-engine unsaved session state, and fast-navigation affordances.
      **Verify**: `npm --prefix packages/layout-engine test`

- [ ] **T011** Define explicit reopen/save semantics.
      **Do**: encode the contract for last persisted engine vs unsaved
      engine-local tab state.
      **Verify**: focused save/reopen tests at the owning layer.

## Phase 2: Navigation and Chrome

- [ ] **T020** Implement compatible-engine prev/next and tab-rail navigation.
      **Verify**: focused DOM/runtime tests.

- [ ] **T021** Hide inactive engine chrome from the shell.
      **Do**: ensure engine-specific sections become hidden and unfocusable when
      their owning engine is inactive.
      **Verify**: `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`

- [ ] **T022** Show active engine identity consistently across document kinds.
      **Verify**: focused host/viewer tests for frame and sequence routes.

## Phase 3: Validation

- [ ] **T030** Full validation.
      **Verify**:
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;
      `node scripts/check_no_new_python.mjs`
