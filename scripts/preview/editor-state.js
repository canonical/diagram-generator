/**
 * Thin preview editor state adapter (spec 026 T021).
 *
 * DOM wiring and undo apply callbacks stay here; snapshot + undo logic live in
 * LayoutEngine.previewShell.bootstrap.createEditorStateStore
 * (TS preview-shell modules).
 */
(function () {
  "use strict";

  /** @type {import("@diagram-generator/layout-engine").EditorStateStore | null} */
  let _store = null;

  function _bootstrapContract() {
    const bootstrap = window.LayoutEngine?.previewShell?.bootstrap;
    if (bootstrap && typeof bootstrap.createEditorStateStore === "function") return bootstrap;
    throw new Error("LayoutEngine previewShell.bootstrap.createEditorStateStore is required for EditorState");
  }

  function _requireStore() {
    if (!_store) {
      throw new Error("EditorState.init() must run before editor state operations");
    }
    _bootstrapContract();
    return _store;
  }

  function init(deps) {
    const bootstrap = _bootstrapContract();
    _store = bootstrap.createEditorStateStore({
      getOverrides: () => deps.getOverrides(),
      getGridOverrides: () => deps.getGridOverrides(),
      getElkLayoutOverrides: () => deps.getElkLayoutOverrides(),
      getRemovedIds: () => deps.getRemovedIds(),
      getFrameTree: () => deps.getFrameTree(),
    });
  }

  function cloneValue(value) {
    return _bootstrapContract().cloneEditorSnapshotValue(value);
  }

  function captureSnapshot() {
    return _requireStore().captureSnapshot();
  }

  function serializeDirtyState() {
    return _requireStore().serializeDirtyState();
  }

  function normalizeGridOverrides(gridOverrides) {
    return _requireStore().normalizeGridOverrides(gridOverrides);
  }

  function beginUndoableAction(label) {
    return _requireStore().beginUndoableAction(label);
  }

  function commitUndoableAction(action) {
    const committed = _requireStore().commitUndoableAction(action);
    if (committed) updateUndoRedoButtons();
    return committed;
  }

  function commitOverridePatchAction(label, beforeEntries, afterEntries) {
    const committed = _requireStore().commitOverridePatchAction(label, beforeEntries, afterEntries);
    if (committed) updateUndoRedoButtons();
    return committed;
  }

  function runUndoableAction(label, mutate) {
    const result = _requireStore().runUndoableAction(label, mutate);
    updateUndoRedoButtons();
    return result;
  }

  function pushUndoCommand(command) {
    const pushed = _requireStore().pushUndoCommand(command);
    if (pushed) updateUndoRedoButtons();
    return pushed;
  }

  function captureOverrideEntries(ids) {
    return _requireStore().captureOverrideEntries(ids);
  }

  function canUndo() {
    return _requireStore().canUndo();
  }

  function canRedo() {
    return _requireStore().canRedo();
  }

  async function undo(applyCommand) {
    const command = _requireStore().popUndoCommand();
    if (!command) return null;
    await applyCommand(command, "undo");
    updateUndoRedoButtons();
    return command.label;
  }

  async function redo(applyCommand) {
    const command = _requireStore().popRedoCommand();
    if (!command) return null;
    await applyCommand(command, "redo");
    updateUndoRedoButtons();
    return command.label;
  }

  function clearUndoHistory() {
    _requireStore().clearUndoHistory();
    updateUndoRedoButtons();
  }

  function getPendingGridAction() {
    return _requireStore().getPendingGridAction();
  }

  function setPendingGridAction(action) {
    _requireStore().setPendingGridAction(action);
  }

  function updateUndoRedoButtons() {
    const undoBtn = document.getElementById("btn-undo");
    const redoBtn = document.getElementById("btn-redo");
    if (!_store) return;
    if (undoBtn) undoBtn.disabled = !_store.canUndo();
    if (redoBtn) redoBtn.disabled = !_store.canRedo();
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
