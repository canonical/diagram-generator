import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

test("editor-state adapter accepts previewShell.bootstrap contract aliases", () => {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const source = fs.readFileSync(path.join(repoRoot, "scripts", "preview", "editor-state.js"), "utf8");
  const calls: Array<Record<string, unknown>> = [];

  const fakeStore = {
    captureSnapshot() { return { snapshot: true }; },
    serializeDirtyState() { return "{}"; },
    normalizeGridOverrides(value: unknown) { return value; },
    beginUndoableAction(label: string) { return { label }; },
    commitUndoableAction() {},
    commitOverridePatchAction() {},
    runUndoableAction() {},
    pushUndoCommand() {},
    captureOverrideEntries(ids: string[]) { return ids; },
    canUndo() { return false; },
    canRedo() { return false; },
    popUndoCommand() { return null; },
    popRedoCommand() { return null; },
    clearUndoHistory() {},
    getPendingGridAction() { return null; },
    setPendingGridAction() {},
  };

  const context = {
    window: {} as Record<string, unknown>,
    document: {
      getElementById() {
        return null;
      },
    },
    console,
    LayoutEngine: {
      previewShell: {
        bootstrap: {
          createEditorStateStore(deps: Record<string, unknown>) {
            calls.push({ createEditorStateStore: Object.keys(deps).sort() });
            return fakeStore;
          },
          cloneEditorSnapshotValue(value: unknown) {
            calls.push({ cloneEditorSnapshotValue: value as Record<string, unknown> });
            return { cloned: value };
          },
        },
      },
    },
  };

  vm.runInNewContext(source, context);
  const editorState = (context.window as { EditorState: Record<string, (...args: any[]) => unknown> }).EditorState;

  editorState.init({
    getOverrides: () => ({}),
    getGridOverrides: () => ({}),
    getElkLayoutOverrides: () => ({}),
    getRemovedIds: () => new Set(),
    getFrameTree: () => null,
  });

  const cloned = editorState.cloneValue({ alpha: 1 });

  assert.deepEqual(calls, [
    {
      createEditorStateStore: [
        "getElkLayoutOverrides",
        "getFrameTree",
        "getGridOverrides",
        "getOverrides",
        "getRemovedIds",
      ],
    },
    {
      cloneEditorSnapshotValue: { alpha: 1 },
    },
  ]);
  assert.deepEqual(cloned, { cloned: { alpha: 1 } });
});
