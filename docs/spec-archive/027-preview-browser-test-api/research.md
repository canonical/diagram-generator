# Research: Preview browser test API (spec 027)

**Date**: 2026-06-06

## Why the shims exist

During spec 026 T030, undo/save helpers were inlined to `EditorState` / `PreviewSaveClient`. That broke Playwright tests that evaluate bare global names in the browser context. Commit `321c406` restored thin shims:

```javascript
window.performUndo = () => EditorState.undo(_applyUndoCommand);
window.performRedo = () => EditorState.redo(_applyUndoCommand);
window.canUndo = () => EditorState.canUndo();
window.canRedo = () => EditorState.canRedo();
window.saveOverrides = () => PreviewSaveClient.saveOverrides();
```

Production UI does not need these — Save/Undo buttons already call the modules.

## Caller inventory (in-repo)

| Symbol | Call sites | File |
| --- | --- | --- |
| `saveOverrides()` | 7 | `scripts/test_preview_support_engineering_flow.py` |
| `performUndo()` | 2 | same |
| `performRedo()` | 2 | same |
| `canUndo()` | 1 | same |

No other Python/JS files use `page.evaluate` with these globals.

## Related test patterns already in use

The same Playwright file already uses explicit test hooks:

- `__DG_TEST_treeHasFrameId`
- `getV3RelayoutStatus()`
- `model`, `selectedIds`, `overrides` (legacy globals intentionally retained for model access)

Aligning save/undo with a `__DG_TEST_preview` object matches existing conventions.

## Static checks today

| Check | File | Notes |
| --- | --- | --- |
| Save not inline in editor | `test_preview_save_client.py` | Asserts no `async function saveOverrides` in editor |
| No undo wrappers in editor | `test_preview_editor_shell_shrink.py` | Asserts no `function performUndo` — shims are `window.*` assignments, not functions |
| Save client owns save | `save-client.js` | `saveOverrides` implementation |

Gap: nothing fails if `window.saveOverrides =` returns to `editor.js` after migration — spec 027 adds that.

## Scheduling rationale

- **Safe to defer**: shims are delegates only; no behavioral fork.
- **Should not defer indefinitely**: new tests will copy the global pattern; `editor.js` stays slightly wider than spec 026 target.
- **Good time to execute**: immediately after spec 026 closeout stabilizes, or in parallel with spec 022 — low coupling, ~1 session.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| **A. `__DG_TEST_preview` facade** (recommended) | Matches existing test hooks; explicit; easy grep | Still a global, but namespaced |
| **B. Playwright clicks only** | No test API in production bundle | Slow/flaky for save; can't easily assert `canUndo` |
| **C. Keep shims forever** | Zero migration cost | Perpetuates undocumented contract |
| **D. Separate test-only script tag** | Production HTML never loads test API | Requires preview_server test mode wiring |

Recommendation: **Option A** for this repo unless preview_server gains a dedicated test build flavor later.
