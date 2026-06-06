# Tasks: Preview browser test API (shim removal)

**Input**: Design documents from `/specs/027-preview-browser-test-api/`

**Prerequisites**: spec.md, plan.md, research.md, contracts/preview-test-api.md

**Depends on**: spec 026 complete

## Phase 1 - Contract and inventory

- [ ] T001 Confirm caller inventory matches `research.md` (grep repo for legacy global evaluate strings)
- [ ] T002 Finalize `contracts/preview-test-api.md` namespace and member list
- [ ] T003 Document validation commands in `quickstart.md` if the contract changes during implementation

## Phase 2 - Test API mount

- [ ] T010 Add `window.__DG_TEST_preview` to `scripts/preview/editor.js` (thin delegates to `PreviewSaveClient` / `EditorState`)
- [ ] T011 Keep legacy shims temporarily so tests can migrate incrementally (both paths delegate to the same modules)

## Phase 3 - Playwright migration

- [ ] T020 Add Python helpers in `scripts/test_preview_support_engineering_flow.py` for save/undo/redo/canUndo/canRedo via `__DG_TEST_preview`
- [ ] T021 Replace all bare global `page.evaluate` call sites (7× save, 2× undo, 2× redo, 1× canUndo)
- [ ] T022 Run `python -m pytest scripts/test_preview_support_engineering_flow.py -q` green

## Phase 4 - Shim removal and boundary lock

- [ ] T030 Remove legacy `window.saveOverrides` / `performUndo` / `performRedo` / `canUndo` / `canRedo` shims from `editor.js`
- [ ] T031 Add `scripts/test_preview_browser_test_api.py` — fails if legacy globals reappear or test facade is missing
- [ ] T032 Extend or adjust `scripts/test_preview_editor_shell_shrink.py` so it forbids legacy shim assignments explicitly

## Phase 5 - Closeout

- [ ] T040 Add one-line note to `specs/026-preview-shell-decomposition-ts-migration/boundaries.md` that globals retired in spec 027
- [ ] T041 Update `TODO.md`, `STATUS.md`, `docs/specs.md`, and `HISTORY.md` when the feature lands
- [ ] T042 Mark spec 027 `spec.md` status Complete
