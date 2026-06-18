import { describe, expect, it, vi } from 'vitest';
import { dispatchPreviewKeyboardShortcut } from '../src/preview-shell/interaction-keyboard-dispatch.js';

function createBaseOptions() {
  return {
    key: 'x',
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    altKey: false,
    isEditableTarget: false,
    selectedIds: [],
    selectionDepth: 0,
    isBusy: false,
    isTextEditing: false,
    isDragging: false,
    isResizing: false,
    hasAutolayoutSelection: false,
    preventDefault: vi.fn(),
    toggleSidebar: vi.fn(),
    save: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    deleteSelection: vi.fn(),
    cancelTextEdit: vi.fn(),
    cancelDrag: vi.fn(),
    cancelResize: vi.fn(),
    cycleGuideMode: vi.fn(),
    getParentId: vi.fn(() => null),
    getChildIds: vi.fn(() => []),
    getAncestorDepth: vi.fn(() => 0),
    selectComponent: vi.fn(),
    applySelectionState: vi.fn(),
    captureOverrideEntries: vi.fn(() => []),
    commitOverridePatchAction: vi.fn(),
    getOwnDelta: vi.fn(() => ({ dx: 0, dy: 0, dw: 0, dh: 0 })),
    applyInteractionOverrideEntries: vi.fn(),
    applyAllOverrides: vi.fn(),
    showResizeHandles: vi.fn(),
    renderSelectionInspector: vi.fn(),
  };
}

describe('interaction keyboard dispatch helper', () => {
  it('nudges a free-position selection through override callbacks', () => {
    const options = createBaseOptions();
    options.key = 'ArrowLeft';
    options.shiftKey = true;
    options.selectedIds = ['alpha', 'beta'];
    options.captureOverrideEntries = vi
      .fn()
      .mockReturnValueOnce([{ id: 'before' }])
      .mockReturnValueOnce([{ id: 'after' }]);
    options.getOwnDelta = vi.fn((id: string) => (
      id === 'alpha'
        ? { dx: 8, dy: 0, dw: 4, dh: 6 }
        : { dx: 0, dy: 16, dw: 0, dh: 8 }
    ));

    const action = dispatchPreviewKeyboardShortcut(options);

    expect(action).toEqual({ kind: 'nudge-selection', key: 'ArrowLeft', step: 24 });
    expect(options.preventDefault).toHaveBeenCalledTimes(1);
    expect(options.applyInteractionOverrideEntries).toHaveBeenCalledWith([
      { id: 'alpha', dx: -16, dy: 0, dw: 4, dh: 6 },
      { id: 'beta', dx: -24, dy: 16, dw: 0, dh: 8 },
    ]);
    expect(options.commitOverridePatchAction).toHaveBeenCalledWith(
      'Nudge selection',
      [{ id: 'before' }],
      [{ id: 'after' }],
    );
    expect(options.applyAllOverrides).toHaveBeenCalledTimes(1);
    expect(options.showResizeHandles).toHaveBeenCalledWith('beta');
    expect(options.renderSelectionInspector).toHaveBeenCalledWith('beta');
  });

  it('replaces selection with children on Enter', () => {
    const options = createBaseOptions();
    options.key = 'Enter';
    options.selectedIds = ['parent-a', 'parent-b'];
    options.selectionDepth = 2;
    options.getChildIds = vi.fn((id: string) => (
      id === 'parent-a' ? ['child-1', 'child-2'] : ['child-2', 'child-3']
    ));
    options.getAncestorDepth = vi.fn(() => 3);

    const action = dispatchPreviewKeyboardShortcut(options);

    expect(action).toEqual({ kind: 'select-children' });
    expect(options.preventDefault).toHaveBeenCalledTimes(1);
    expect(options.applySelectionState).toHaveBeenCalledWith(
      {
        selectedIds: ['child-1', 'child-2', 'child-3'],
        selectionDepth: 3,
      },
      'child-3',
    );
  });

  it('clears selection on Escape when no interaction mode is active', () => {
    const options = createBaseOptions();
    options.key = 'Escape';
    options.selectedIds = ['leaf'];
    options.selectionDepth = 4;

    const action = dispatchPreviewKeyboardShortcut(options);

    expect(action).toEqual({ kind: 'deselect-all' });
    expect(options.applySelectionState).toHaveBeenCalledWith({
      selectedIds: [],
      selectionDepth: 0,
    });
    expect(options.preventDefault).not.toHaveBeenCalled();
  });

  it('routes keyboard host wiring through the shared interaction owner', () => {
    const save = vi.fn();
    const undo = vi.fn();
    const deleteSelection = vi.fn();
    const clearGuideLines = vi.fn();
    const endInteraction = vi.fn();
    const toggleApp = vi.fn();
    const handle = { style: { display: 'none' } };

    const action = dispatchPreviewKeyboardShortcut({
      event: {
        key: 's',
        ctrlKey: true,
        preventDefault: vi.fn(),
        target: { tagName: 'DIV', isContentEditable: false },
      },
      document: {
        querySelector(selector: string) {
          if (selector === '.dg-preview-app') {
            return {
              classList: {
                toggle: toggleApp,
              },
            };
          }
          if (selector === '#stage svg') {
            return {
              querySelectorAll() {
                return [handle];
              },
            };
          }
          return null;
        },
        removeEventListener: vi.fn(),
      },
      selectedIds: ['alpha'],
      selectionDepth: 0,
      save,
      undo,
      redo: vi.fn(),
      deleteSelection,
      cancelTextEdit: vi.fn(),
      clearGuideLines,
      onDragMove: vi.fn(),
      onDragUp: vi.fn(),
      onResizeMove: vi.fn(),
      onResizeUp: vi.fn(),
      endInteraction,
      cycleGuideMode: vi.fn(),
      getParentId: vi.fn(() => null),
      getChildIds: vi.fn(() => []),
      getAncestorDepth: vi.fn(() => 0),
      selectComponent: vi.fn(),
      applySelectionState: vi.fn(),
      captureOverrideEntries: vi.fn(() => []),
      commitOverridePatchAction: vi.fn(),
      getOwnDelta: vi.fn(() => ({ dx: 0, dy: 0, dw: 0, dh: 0 })),
      applyInteractionOverrideEntries: vi.fn(),
      applyAllOverrides: vi.fn(),
      showResizeHandles: vi.fn(),
      renderSelectionInspector: vi.fn(),
    });

    expect(action).toEqual({ kind: 'save' });
    expect(save).toHaveBeenCalledTimes(1);
    expect(undo).not.toHaveBeenCalled();
    expect(deleteSelection).not.toHaveBeenCalled();
    expect(clearGuideLines).not.toHaveBeenCalled();
    expect(endInteraction).not.toHaveBeenCalled();
    expect(toggleApp).not.toHaveBeenCalled();
    expect(handle.style.display).toBe('none');
  });

  it('derives live editor interaction flags through the editor-host wrapper', () => {
    const action = dispatchPreviewKeyboardShortcut({
      event: {
        key: 'ArrowDown',
        preventDefault: vi.fn(),
        target: { tagName: 'DIV', isContentEditable: false },
      },
      document: {
        querySelector() {
          return null;
        },
        removeEventListener: vi.fn(),
      },
      selectedIds: new Set(['auto-child', 'free-child']),
      selectionDepth: 2,
      interactionManager: {
        isBusy: true,
        isMode(mode: unknown) {
          return mode === 'drag';
        },
        endInteraction: vi.fn(),
      },
      interactionModes: {
        TEXT_EDITING: 'text',
        DRAGGING: 'drag',
        RESIZING: 'resize',
      },
      isAutolayoutChild(id: string) {
        return id === 'auto-child';
      },
      save: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      deleteSelection: vi.fn(),
      cancelTextEdit: vi.fn(),
      clearGuideLines: vi.fn(),
      onDragMove: vi.fn(),
      onDragUp: vi.fn(),
      onResizeMove: vi.fn(),
      onResizeUp: vi.fn(),
      cycleGuideMode: vi.fn(),
      getParentId: vi.fn(() => null),
      getChildIds: vi.fn(() => []),
      getAncestorDepth: vi.fn(() => 0),
      selectComponent: vi.fn(),
      applySelectionState: vi.fn(),
      captureOverrideEntries: vi.fn(() => []),
      commitOverridePatchAction: vi.fn(),
      getOwnDelta: vi.fn(() => ({ dx: 0, dy: 0, dw: 0, dh: 0 })),
      applyInteractionOverrideEntries: vi.fn(),
      applyAllOverrides: vi.fn(),
      showResizeHandles: vi.fn(),
      renderSelectionInspector: vi.fn(),
    });

    expect(action).toEqual({ kind: 'none' });
  });
});
