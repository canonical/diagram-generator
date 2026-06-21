import { describe, expect, it, vi } from 'vitest';
import { createPreviewKeyboardRuntime, createPreviewKeyboardRuntimeFromHost } from '../src/preview-shell/app-keyboard-runtime.js';

describe('preview keyboard runtime', () => {
  it('delegates the editor keyboard host contract through the runtime seam', () => {
    const dispatchHostShortcut = vi.fn();
    const runtime = createPreviewKeyboardRuntime({
      dispatchHostShortcut,
      document: {
        querySelector() {
          return null;
        },
        removeEventListener() {},
      },
      selectedIds: ['alpha', 'beta'],
      getSelectionDepth: () => 2,
      interactionManager: {
        isBusy: true,
        isMode() {
          return false;
        },
        endInteraction() {},
      },
      interactionModes: {
        TEXT_EDITING: 'TEXT',
        DRAGGING: 'DRAG',
        RESIZING: 'RESIZE',
      },
      isAutolayoutChild() {
        return false;
      },
      save() {},
      undo() {},
      redo() {},
      deleteSelection() {},
      cancelTextEdit() {},
      clearGuideLines() {},
      onDragMove() {},
      onDragUp() {},
      onResizeMove() {},
      onResizeUp() {},
      cycleGuideMode() {},
      getParentId() {
        return null;
      },
      getChildIds() {
        return [];
      },
      getAncestorDepth() {
        return 0;
      },
      selectComponent() {},
      applySelectionState() {},
      captureOverrideEntries() {
        return {};
      },
      commitOverridePatchAction() {},
      getOwnDelta() {
        return { dx: 0, dy: 0, dw: 0, dh: 0 };
      },
      applyInteractionOverrideEntries() {},
      applyAllOverrides() {},
      showResizeHandles() {},
      renderSelectionInspector() {},
    });

    const event = {
      key: 'ArrowRight',
      target: { tagName: 'DIV', isContentEditable: false },
      preventDefault() {},
    };

    runtime.onDocumentKeyDown(event);

    expect(dispatchHostShortcut).toHaveBeenCalledWith(expect.objectContaining({
      event,
      selectedIds: ['alpha', 'beta'],
      selectionDepth: 2,
    }));
  });

  it('maps host model children into the keyboard dispatcher runtime', () => {
    const applyInteractionOverrideEntries = vi.fn();
    const commitOverridePatchAction = vi.fn();
    const showResizeHandles = vi.fn();
    const renderSelectionInspector = vi.fn();
    const runtime = createPreviewKeyboardRuntimeFromHost({
      document: {
        querySelector() {
          return null;
        },
        removeEventListener() {},
      },
      selectedIds: new Set(['alpha', 'beta']),
      selectionDepthState: {
        get: () => 2,
      },
      interactionManager: {
        isBusy: false,
        isMode() {
          return false;
        },
        endInteraction() {},
      },
      interactionModes: {
        TEXT_EDITING: 'TEXT',
        DRAGGING: 'DRAG',
        RESIZING: 'RESIZE',
      },
      isAutolayoutChild() {
        return false;
      },
      save() {},
      undo() {},
      redo() {},
      deleteSelection() {},
      cancelTextEdit() {},
      clearGuideLines() {},
      onDragMove() {},
      onDragUp() {},
      onResizeMove() {},
      onResizeUp() {},
      cycleGuideMode() {},
      model: {
        get(id) {
          return id === 'alpha'
            ? { children: [{ data: { id: 'gamma' } }] }
            : { children: [] };
        },
      },
      getParentId() {
        return null;
      },
      getAncestorDepth() {
        return 1;
      },
      selectComponent() {},
      applySelectionState() {},
      captureOverrideEntries(ids) {
        return ids;
      },
      commitOverridePatchAction,
      getOwnDelta() {
        return { dx: 0, dy: 0, dw: 0, dh: 0 };
      },
      applyInteractionOverrideEntries,
      applyAllOverrides() {},
      showResizeHandles,
      renderSelectionInspector,
    });

    runtime.onDocumentKeyDown({
      key: 'ArrowRight',
      target: { tagName: 'DIV', isContentEditable: false },
      preventDefault() {},
    });

    expect(applyInteractionOverrideEntries).toHaveBeenCalledWith([
      { id: 'alpha', dx: 8, dy: 0, dw: 0, dh: 0 },
      { id: 'beta', dx: 8, dy: 0, dw: 0, dh: 0 },
    ]);
    expect(commitOverridePatchAction).toHaveBeenCalledWith(
      'Nudge selection',
      ['alpha', 'beta'],
      ['alpha', 'beta'],
    );
    expect(showResizeHandles).toHaveBeenCalledWith('beta');
    expect(renderSelectionInspector).toHaveBeenCalledWith('beta');
  });
});
