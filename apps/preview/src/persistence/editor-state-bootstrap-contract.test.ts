import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

test("editor-state adapter requires the namespaced previewShell.bootstrap contract", () => {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const source = fs.readFileSync(path.join(repoRoot, "scripts", "preview", "editor-state.js"), "utf8");
  const calls: Array<Record<string, unknown>> = [];
  const layoutEngine = {
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
  };

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
    window: {
      LayoutEngine: layoutEngine,
    } as Record<string, unknown>,
    document: {
      getElementById() {
        return null;
      },
    },
    console,
    LayoutEngine: layoutEngine,
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

test("editor-state adapter no longer falls back to a flat LayoutEngine root alias", () => {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const source = fs.readFileSync(path.join(repoRoot, "scripts", "preview", "editor-state.js"), "utf8");
  assert.equal(source.includes("LayoutEngine.createEditorStateStore"), false);
});
