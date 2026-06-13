# Implementation Plan: Preview browser test API (shim removal)

## Goal

Retire the post–spec 026 compatibility shims by giving Playwright and documented debug tooling an explicit API, then delete the shim block from `editor.js`.

## Summary

Spec 026 extracted save and undo into modules. Review restored five `window.*` delegates so `scripts/test_preview_support_engineering_flow.py` kept working. This spec migrates those callers to a named test surface and removes the delegates.

## Technical Context

| Item | Detail |
| --- | --- |
| **Legacy globals** | `saveOverrides`, `performUndo`, `performRedo`, `canUndo`, `canRedo` on `window` |
| **Current owners** | `PreviewSaveClient`, `EditorState` |
| **Primary consumer** | `scripts/test_preview_support_engineering_flow.py` (~12 `page.evaluate` call sites) |
| **Shim location** | `scripts/preview/editor.js` (post-init block) |
| **Testing** | Playwright (pytest), static boundary pytest |

## Approach

### Phase 1 — Inventory and contract (P1)

1. Confirm the full caller list (Playwright, any `__DG_TEST_*` overlap, docs).
2. Freeze the replacement API in `contracts/preview-test-api.md`.
3. Decide namespace: **`window.__DG_TEST_preview`** (test-only) vs extending existing `__DG_TEST_*` helpers already used in the same file.

Preferred direction: a single test facade object mounted once from `editor.js` bootstrap (or a tiny `preview-test-api.js` loaded only in test builds — **defer** separate file unless HTML injection is needed).

Example shape:

```javascript
window.__DG_TEST_preview = {
  saveOverrides: () => PreviewSaveClient.saveOverrides(),
  undo: () => EditorState.undo(_applyUndoCommand),
  redo: () => EditorState.redo(_applyUndoCommand),
  canUndo: () => EditorState.canUndo(),
  canRedo: () => EditorState.canRedo(),
};
```

### Phase 2 — Migrate callers (P1)

1. Update `scripts/test_preview_support_engineering_flow.py` to call `__DG_TEST_preview.saveOverrides()` etc.
2. Add helper functions in the test module to avoid scattered evaluate strings.
3. Run the full support-engineering-flow suite green before shim removal.

### Phase 3 — Remove shims and lock boundary (P1)

1. Delete the five `window.*` shim lines from `editor.js`.
2. Extend `scripts/test_preview_editor_shell_shrink.py` (or add `test_preview_browser_test_api.py`) to assert:
   - no `window.saveOverrides =` in `editor.js`
   - no bare global shim names assigned on `window`
   - `__DG_TEST_preview` (or chosen name) is present until/unless tests move to module-only hooks
3. Update `specs/026-preview-shell-decomposition-ts-migration/boundaries.md` with a one-line note that legacy globals were retired in spec 027.

### Phase 4 — Docs closeout (P2)

1. Update `TODO.md`, `STATUS.md`, `docs/specs.md`, `HISTORY.md` when the feature lands.
2. Keep `quickstart.md` in this package as the maintainer reference for console debugging.

## Architecture constraints

- No duplicated save/undo logic — test API delegates only.
- Do not reopen spec 026 module boundaries (`save-client.js`, `editor-state.js`).
- Do not rewrite `layout-bridge.js`.
- Production UI paths unchanged.

## Validation gates

```bash
python -m pytest scripts/test_preview_support_engineering_flow.py -q
python -m pytest scripts/test_preview_editor_shell_shrink.py scripts/test_preview_editor_state.py scripts/test_preview_save_client.py -q
# After boundary test lands:
python -m pytest scripts/test_preview_browser_test_api.py -q
```

Full spec 026 preview slice should remain green after shim removal.

## Risks

| Risk | Mitigation |
| --- | --- |
| External/manual scripts rely on globals | Document migration in `quickstart.md`; grep repo before removal |
| Test API becomes a second public surface | Prefix with `__DG_TEST_`; document as non-guaranteed |
| Playwright strings drift again | Centralize helpers in the test module |

## Project Structure

```text
specs/027-preview-browser-test-api/
├── spec.md
├── plan.md
├── tasks.md
├── research.md
├── quickstart.md
└── contracts/
    └── preview-test-api.md
```
