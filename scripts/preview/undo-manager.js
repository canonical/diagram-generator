/**
 * UndoRedoManager — shared undo/redo stack for both grid and force editors.
 *
 * The manager owns the stack data structure and button/keyboard state.
 * Callers provide async restore callbacks when creating the manager.
 *
 * Usage:
 *   const undo = new UndoRedoManager({
 *     maxSize: 50,
 *     undoBtnId: "btn-undo",
 *     redoBtnId: "btn-redo",
 *     onRestore: async (state, direction) => { ... },
 *   });
 *   undo.push("Move", beforeState, afterState);
 *   await undo.undo();
 *   await undo.redo();
 */

class UndoRedoManager {
  /**
   * @param {Object} opts
   * @param {number}   [opts.maxSize=50]   — Maximum stack depth.
   * @param {string}   [opts.undoBtnId]    — DOM id for the undo button.
   * @param {string}   [opts.redoBtnId]    — DOM id for the redo button.
   * @param {Function} opts.onRestore      — async (state, "undo"|"redo") => void
   * @param {Function} [opts.onStackChange] — () => void, called after any push/undo/redo/clear
   */
  constructor(opts) {
    this._maxSize = opts.maxSize || 50;
    this._undoBtnId = opts.undoBtnId || null;
    this._redoBtnId = opts.redoBtnId || null;
    this._saveBtnId = opts.saveBtnId || null;
    this._onRestore = opts.onRestore;
    this._onStackChange = opts.onStackChange || null;
    this._undoStack = [];
    this._redoStack = [];
    this._savedIndex = 0; // undo stack length at last save
    this._updateButtons();
  }

  get undoCount() { return this._undoStack.length; }
  get redoCount() { return this._redoStack.length; }
  canUndo() { return this._undoStack.length > 0; }
  canRedo() { return this._redoStack.length > 0; }

  /** Push a new undoable command. Clears the redo stack. */
  push(label, before, after) {
    // If the saved point was ahead of us (in the redo branch being discarded),
    // it's now unreachable — mark permanently dirty.
    if (this._redoStack.length > 0 && this._savedIndex > this._undoStack.length) {
      this._savedIndex = -1;
    }
    this._undoStack.push({ label, before, after });
    if (this._undoStack.length > this._maxSize) {
      this._undoStack.shift();
      // If the saved point was in the dropped portion, it's unreachable
      if (this._savedIndex > 0) this._savedIndex--;
      else this._savedIndex = -1; // permanently dirty
    }
    this._redoStack = [];
    this._updateButtons();
    if (this._onStackChange) this._onStackChange();
  }

  /** Undo the last command. Returns the command label or null. */
  async undo() {
    if (!this.canUndo()) return null;
    const command = this._undoStack.pop();
    this._redoStack.push(command);
    await this._onRestore(command.before, "undo");
    this._updateButtons();
    if (this._onStackChange) this._onStackChange();
    return command.label;
  }

  /** Redo the last undone command. Returns the command label or null. */
  async redo() {
    if (!this.canRedo()) return null;
    const command = this._redoStack.pop();
    this._undoStack.push(command);
    await this._onRestore(command.after, "redo");
    this._updateButtons();
    if (this._onStackChange) this._onStackChange();
    return command.label;
  }

  /** Clear both stacks (e.g. on reset). */
  clear() {
    this._undoStack = [];
    this._redoStack = [];
    this._savedIndex = 0;
    this._updateButtons();
    if (this._onStackChange) this._onStackChange();
  }

  /** Mark the current state as "saved" — isDirty() returns false until the stack moves. */
  markSaved() {
    this._savedIndex = this._undoStack.length;
    this._updateButtons();
  }

  /** True when the current stack position differs from the last-saved position. */
  isDirty() {
    return this._undoStack.length !== this._savedIndex;
  }

  /** Update disabled state of undo/redo/save buttons. */
  _updateButtons() {
    if (this._undoBtnId) {
      const btn = document.getElementById(this._undoBtnId);
      if (btn) btn.disabled = !this.canUndo();
    }
    if (this._redoBtnId) {
      const btn = document.getElementById(this._redoBtnId);
      if (btn) btn.disabled = !this.canRedo();
    }
    if (this._saveBtnId) {
      const btn = document.getElementById(this._saveBtnId);
      if (btn) btn.disabled = !this.isDirty();
    }
  }
}

// Expose globally.
window.UndoRedoManager = UndoRedoManager;
