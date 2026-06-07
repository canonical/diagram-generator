# Contract: Preview browser test API

**Spec**: 027-preview-browser-test-api  
**Status**: Complete  
**Audience**: In-repo Playwright tests and maintainer console debugging only — **not** a public integration API.

## Namespace

Mount once after preview shell init:

```text
window.__DG_TEST_preview
```

All members delegate to spec 026 modules (`PreviewSaveClient`, `EditorState`). No independent implementations.

## Surface

| Member | Signature | Delegates to | Semantics |
| --- | --- | --- | --- |
| `saveOverrides` | `() => Promise<void>` | `PreviewSaveClient.saveOverrides()` | POST overrides + canonical reload path |
| `undo` | `() => Promise<string \| null>` | `EditorState.undo(_applyUndoCommand)` | Pop undo stack and apply restore |
| `redo` | `() => Promise<string \| null>` | `EditorState.redo(_applyUndoCommand)` | Pop redo stack and apply restore |
| `canUndo` | `() => boolean` | `EditorState.canUndo()` | Whether undo stack is non-empty |
| `canRedo` | `() => boolean` | `EditorState.canRedo()` | Whether redo stack is non-empty |

## Playwright usage

Prefer Python helpers wrapping evaluate strings:

```python
def _preview_save(page):
    page.evaluate("() => __DG_TEST_preview.saveOverrides()")

def _preview_undo(page):
    page.evaluate("() => __DG_TEST_preview.undo()")
```

Do **not** add new call sites using bare `saveOverrides()` / `performUndo()` globals.

## Legacy globals (removed in spec 027)

| Legacy global | Replacement |
| --- | --- |
| `saveOverrides()` | `__DG_TEST_preview.saveOverrides()` |
| `performUndo()` | `__DG_TEST_preview.undo()` |
| `performRedo()` | `__DG_TEST_preview.redo()` |
| `canUndo()` | `__DG_TEST_preview.canUndo()` |
| `canRedo()` | `__DG_TEST_preview.canRedo()` |

After migration, `editor.js` MUST NOT assign the legacy names on `window`.

## Out of scope

- Model/selection globals (`model`, `selectedIds`, `overrides`) — unchanged in this spec.
- UI button behavior — unchanged.
- External third-party scripts consuming preview globals.

## Regression requirements

1. Static: `editor.js` must not contain `window.saveOverrides =`, `window.performUndo =`, etc.
2. Static: `scripts/test_preview_support_engineering_flow.py` must not reference bare legacy globals in evaluate strings.
3. Runtime: full `test_preview_support_engineering_flow.py` suite green.
