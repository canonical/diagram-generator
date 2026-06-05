/**
 * Shared preview editor state container (spec 026 T012).
 *
 * Owns undo/redo stacks, pending grid actions, and dirty snapshot serialization.
 * Snapshot shaping delegates to TS helpers on LayoutEngine when available.
 */
(function () {
  "use strict";

  const MAX_UNDO_STACK_SIZE = 50;

  /** @type {object | null} */
  let _deps = null;
  let _undoStack = [];
  let _redoStack = [];
  /** @type {object | null} */
  let _pendingGridAction = null;

  function _requireDeps() {
    if (!_deps) {
      throw new Error("EditorState.init() must run before editor state operations");
    }
    return _deps;
  }

  function _snapshotApi() {
    if (typeof LayoutEngine !== "undefined" && LayoutEngine.captureEditorSnapshot) {
      return LayoutEngine;
    }
    return null;
  }

  function cloneValue(value) {
    const api = _snapshotApi();
    if (api && typeof api.cloneEditorSnapshotValue === "function") {
      return api.cloneEditorSnapshotValue(value);
    }
    return JSON.parse(JSON.stringify(value || {}));
  }

  function captureSnapshot() {
    const deps = _requireDeps();
    const api = _snapshotApi();
    if (api && typeof api.captureEditorSnapshot === "function") {
      return api.captureEditorSnapshot({
        overrides: deps.getOverrides(),
        gridOverrides: deps.getGridOverrides(),
        elkLayoutOverrides: deps.getElkLayoutOverrides(),
        removedIds: deps.getRemovedIds(),
        frameTree: deps.getFrameTree(),
      });
    }
    const snapshot = {
      o: cloneValue(deps.getOverrides()),
      g: cloneValue(deps.getGridOverrides() || {}),
    };
    const elk = deps.getElkLayoutOverrides();
    if (elk && Object.keys(elk).length > 0) snapshot.e = cloneValue(elk);
    const removed = deps.getRemovedIds();
    if (removed && removed.length) snapshot.r = [...removed];
    const frameTree = deps.getFrameTree();
    if (frameTree) snapshot.f = frameTree;
    return snapshot;
  }

  function serializeDirtyState() {
    const api = _snapshotApi();
    const snapshot = captureSnapshot();
    if (api && typeof api.serializeEditorSnapshot === "function") {
      return api.serializeEditorSnapshot(snapshot);
    }
    return JSON.stringify(snapshot);
  }

  function normalizeGridOverrides(gridOverrides) {
    const api = _snapshotApi();
    if (api && typeof api.normalizeGridOverrides === "function") {
      return api.normalizeGridOverrides(gridOverrides);
    }
    return gridOverrides || {};
  }

  function createUndoCommand(label, beforeState, afterState) {
    return { label, before: beforeState, after: afterState };
  }

  function createOverridePatchCommand(label, beforeEntries, afterEntries) {
    return { label, kind: "override-patch", beforeEntries, afterEntries };
  }

  function pushUndoCommand(command) {
    _undoStack.push(command);
    if (_undoStack.length > MAX_UNDO_STACK_SIZE) _undoStack.shift();
    _redoStack = [];
    updateUndoRedoButtons();
    return true;
  }

  function beginUndoableAction(label) {
    return { label, before: serializeDirtyState() };
  }

  function commitUndoableAction(action) {
    if (!action) return false;
    const after = serializeDirtyState();
    if (action.before === after) return false;
    return pushUndoCommand(createUndoCommand(action.label, action.before, after));
  }

  function commitOverridePatchAction(label, beforeEntries, afterEntries) {
    if (JSON.stringify(beforeEntries) === JSON.stringify(afterEntries)) return false;
    return pushUndoCommand(createOverridePatchCommand(label, beforeEntries, afterEntries));
  }

  function runUndoableAction(label, mutate) {
    const action = beginUndoableAction(label);
    const result = mutate();
    commitUndoableAction(action);
    return result;
  }

  function canUndo() {
    return _undoStack.length > 0;
  }

  function canRedo() {
    return _redoStack.length > 0;
  }

  async function undo(applyCommand) {
    if (!canUndo()) return null;
    const command = _undoStack.pop();
    _redoStack.push(command);
    await applyCommand(command, "undo");
    updateUndoRedoButtons();
    return command.label;
  }

  async function redo(applyCommand) {
    if (!canRedo()) return null;
    const command = _redoStack.pop();
    _undoStack.push(command);
    await applyCommand(command, "redo");
    updateUndoRedoButtons();
    return command.label;
  }

  function clearUndoHistory() {
    _undoStack = [];
    _redoStack = [];
    _pendingGridAction = null;
    updateUndoRedoButtons();
  }

  function getPendingGridAction() {
    return _pendingGridAction;
  }

  function setPendingGridAction(action) {
    _pendingGridAction = action;
  }

  function captureOverrideEntries(ids) {
    const deps = _requireDeps();
    const snapshot = {};
    const orderedIds = [...new Set(ids || [])].sort();
    for (const cid of orderedIds) {
      const entry = deps.getOverrides()[cid];
      snapshot[cid] = entry ? cloneValue(entry) : null;
    }
    return snapshot;
  }

  function updateUndoRedoButtons() {
    const undoBtn = document.getElementById("btn-undo");
    const redoBtn = document.getElementById("btn-redo");
    if (undoBtn) undoBtn.disabled = !canUndo();
    if (redoBtn) redoBtn.disabled = !canRedo();
  }

  function init(deps) {
    _deps = deps;
  }

  window.EditorState = {
    init,
    cloneValue,
    captureSnapshot,
    serializeDirtyState,
    normalizeGridOverrides,
    beginUndoableAction,
    commitUndoableAction,
    commitOverridePatchAction,
    runUndoableAction,
    pushUndoCommand,
    captureOverrideEntries,
    canUndo,
    canRedo,
    undo,
    redo,
    clearUndoHistory,
    getPendingGridAction,
    setPendingGridAction,
    updateUndoRedoButtons,
  };
})();
