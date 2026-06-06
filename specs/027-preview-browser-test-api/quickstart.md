# Quickstart: Preview browser test API (spec 027)

**Status**: Spec only — implementation starts at tasks T010+.

## When to run this work

- **Prerequisite**: spec 026 complete on `main`.
- **Trigger**: before adding new Playwright tests that call save/undo via globals.
- **Effort**: ~1 focused session.

## Validate after implementation

```bash
# Primary consumer
python -m pytest scripts/test_preview_support_engineering_flow.py -q

# Shell boundaries (spec 026 + 027)
python -m pytest scripts/test_preview_editor_shell_shrink.py scripts/test_preview_editor_state.py scripts/test_preview_save_client.py scripts/test_preview_browser_test_api.py -q
```

## Console debugging (after migration)

Use the documented test facade in DevTools:

```javascript
await __DG_TEST_preview.saveOverrides()
await __DG_TEST_preview.undo()
__DG_TEST_preview.canUndo()
```

Legacy globals (`saveOverrides()`, `performUndo()`, …) are removed once spec 027 lands.

## Implementation order

1. Add `window.__DG_TEST_preview` in `editor.js` (delegates only).
2. Migrate `test_preview_support_engineering_flow.py`.
3. Remove legacy `window.*` shims.
4. Add boundary pytest; update tracking docs.

See `tasks.md` for numbered tasks.
