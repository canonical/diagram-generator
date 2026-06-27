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

- [x] **T010** Define a typed engine-workspace state model.
      **Do**: model active engine, compatible engines, persisted engine,
      per-engine unsaved session state, and fast-navigation affordances.
      **Verify**: `npm --prefix packages/layout-engine test`

- [x] **T011** Define explicit reopen/save semantics.
      **Do**: encode the contract for last persisted engine vs unsaved
      engine-local tab state.
      **Verify**: focused save/reopen tests at the owning layer.

## Phase 2: Navigation and Chrome

- [x] **T020** Implement compatible-engine prev/next and tab-rail navigation.
      **Verify**: focused DOM/runtime tests.

- [x] **T021** Hide inactive engine chrome from the shell.
      **Do**: ensure engine-specific sections become hidden and unfocusable when
      their owning engine is inactive.
      **Verify**: `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`

- [x] **T022** Show active engine identity consistently across document kinds.
      **Verify**: focused host/viewer tests for frame and sequence routes.

## Phase 3: Validation

- [x] **T030** Full validation.
      **Verify**:
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;
      `node scripts/check_no_new_python.mjs`

## Phase 4: Review Follow-up

- [x] **T031** Wire browser-local engine workspace semantics into the live shell.
      **Do**: keep engine-tab selection browser-local until Save, surface the
      active engine through the runtime workspace state, and persist
      `layout_engine` only through the document save path.
      **Verify**: focused workspace chrome + save-client tests.

- [x] **T032** Plumb runtime document kind into engine-owned panel visibility sync.
      **Do**: use preview-host config for active engine, persisted engine, and
      document kind instead of hard-coded frame defaults.
      **Verify**: focused grid install + preview host tests.

- [x] **T033** Make the advertised validation bootstrap reproducible after local installs.
      **Do**: build graph-layout package deps before layout-engine compile/test,
      and build both node + browser layout-engine artifacts before preview-app
      tests.
      **Verify**: `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`

- [x] **T034** Refresh the review follow-up contract around live workspace sync.
      **Do**: tighten the runtime panel-visibility regression so it exercises
      browser-local active-engine switches against the live
      `document_kind` / persisted-engine config, and refresh the spec flow map
      so it matches the typed workspace owner now shipping on this branch.
      **Verify**: `npm --prefix packages/layout-engine test -- app-grid-editor-install-unit.test.ts`
