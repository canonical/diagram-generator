import {
  dispatchPreviewKeyboardShortcut,
  type DispatchPreviewKeyboardShortcutEditorHostOptions,
  type PreviewKeyboardHostEventLike,
} from './interaction-keyboard-dispatch.js';
import type { InteractionOverrideEntry } from './interaction-resize.js';
import type { SelectionStateSnapshot } from './interaction-selection-state.js';

export interface CreatePreviewKeyboardRuntimeOptions {
  dispatchHostShortcut?: (
    options: DispatchPreviewKeyboardShortcutEditorHostOptions,
  ) => unknown;
  document: DispatchPreviewKeyboardShortcutEditorHostOptions['document'];
  selectedIds: Iterable<string>;
  getSelectionDepth: () => number;
  interactionManager: DispatchPreviewKeyboardShortcutEditorHostOptions['interactionManager'];
  interactionModes: DispatchPreviewKeyboardShortcutEditorHostOptions['interactionModes'];
  isAutolayoutChild: DispatchPreviewKeyboardShortcutEditorHostOptions['isAutolayoutChild'];
  save: () => void;
  undo: () => void;
  redo: () => void;
  deleteSelection: () => void;
  cancelTextEdit: () => void;
  clearGuideLines: () => void;
  onDragMove: (event?: any) => void;
  onDragUp: (event?: any) => void;
  onResizeMove: (event?: any) => void;
  onResizeUp: (event?: any) => void;
  cycleGuideMode: () => void;
  getParentId: (id: string) => string | null | undefined;
  getChildIds: (id: string) => string[];
  getAncestorDepth: (id: string) => number;
  selectComponent: (id: string) => void;
  applySelectionState: (
    nextState: SelectionStateSnapshot,
    preferredId?: string,
  ) => void;
  captureOverrideEntries: (ids: string[]) => unknown;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: unknown,
    afterEntries: unknown,
  ) => void;
  getOwnDelta: (id: string) => { dx: number; dy: number; dw: number; dh: number };
  applyInteractionOverrideEntries: (entries: InteractionOverrideEntry[]) => void;
  applyAllOverrides: () => void;
  showResizeHandles: (id: string) => void;
  renderSelectionInspector: (id?: string) => void;
}

export interface CreatePreviewKeyboardRuntimeFromHostOptions {
  document: DispatchPreviewKeyboardShortcutEditorHostOptions['document'];
  selectedIds: Set<string>;
  selectionDepthState: {
    get: () => number;
  };
  interactionManager: DispatchPreviewKeyboardShortcutEditorHostOptions['interactionManager'];
  interactionModes: DispatchPreviewKeyboardShortcutEditorHostOptions['interactionModes'];
  isAutolayoutChild: DispatchPreviewKeyboardShortcutEditorHostOptions['isAutolayoutChild'];
  save: () => void;
  undo: () => void;
  redo: () => void;
  deleteSelection: () => void;
  cancelTextEdit: () => void;
  clearGuideLines: () => void;
  onDragMove: (event?: any) => void;
  onDragUp: (event?: any) => void;
  onResizeMove: (event?: any) => void;
  onResizeUp: (event?: any) => void;
  cycleGuideMode: () => void;
  model: {
    get: (id: string) => {
      children?: Array<{ data: { id: string } }>;
    } | null | undefined;
  };
  getParentId: (id: string) => string | null | undefined;
  getAncestorDepth: (id: string) => number;
  selectComponent: (id: string) => void;
  applySelectionState: (
    nextState: SelectionStateSnapshot,
    preferredId?: string,
  ) => void;
  captureOverrideEntries: (ids: string[]) => unknown;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: unknown,
    afterEntries: unknown,
  ) => void;
  getOwnDelta: (id: string) => { dx: number; dy: number; dw: number; dh: number };
  applyInteractionOverrideEntries: (entries: InteractionOverrideEntry[]) => void;
  applyAllOverrides: () => void;
  showResizeHandles: (id: string) => void;
  renderSelectionInspector: (id?: string) => void;
}

export interface PreviewKeyboardRuntime {
  onDocumentKeyDown: (event: PreviewKeyboardHostEventLike) => void;
}

export function createPreviewKeyboardRuntime(
  options: CreatePreviewKeyboardRuntimeOptions,
): PreviewKeyboardRuntime {
  const dispatchHostShortcut = options.dispatchHostShortcut ?? dispatchPreviewKeyboardShortcut;
  return {
    onDocumentKeyDown(event) {
      dispatchHostShortcut({
        event,
        document: options.document,
        selectedIds: options.selectedIds,
        selectionDepth: options.getSelectionDepth(),
        interactionManager: options.interactionManager,
        interactionModes: options.interactionModes,
        isAutolayoutChild: options.isAutolayoutChild,
        save: options.save,
        undo: options.undo,
        redo: options.redo,
        deleteSelection: options.deleteSelection,
        cancelTextEdit: options.cancelTextEdit,
        clearGuideLines: options.clearGuideLines,
        onDragMove: options.onDragMove,
        onDragUp: options.onDragUp,
        onResizeMove: options.onResizeMove,
        onResizeUp: options.onResizeUp,
        cycleGuideMode: options.cycleGuideMode,
        getParentId: options.getParentId,
        getChildIds: options.getChildIds,
        getAncestorDepth: options.getAncestorDepth,
        selectComponent: options.selectComponent,
        applySelectionState: options.applySelectionState,
        captureOverrideEntries: options.captureOverrideEntries,
        commitOverridePatchAction: options.commitOverridePatchAction,
        getOwnDelta: options.getOwnDelta,
        applyInteractionOverrideEntries: options.applyInteractionOverrideEntries,
        applyAllOverrides: options.applyAllOverrides,
        showResizeHandles: options.showResizeHandles,
        renderSelectionInspector: options.renderSelectionInspector,
      });
    },
  };
}

export function createPreviewKeyboardRuntimeFromHost(
  options: CreatePreviewKeyboardRuntimeFromHostOptions,
): PreviewKeyboardRuntime {
  return createPreviewKeyboardRuntime({
    document: options.document,
    selectedIds: options.selectedIds,
    getSelectionDepth: options.selectionDepthState.get,
    interactionManager: options.interactionManager,
    interactionModes: options.interactionModes,
    isAutolayoutChild: options.isAutolayoutChild,
    save: options.save,
    undo: options.undo,
    redo: options.redo,
    deleteSelection: options.deleteSelection,
    cancelTextEdit: options.cancelTextEdit,
    clearGuideLines: options.clearGuideLines,
    onDragMove: options.onDragMove,
    onDragUp: options.onDragUp,
    onResizeMove: options.onResizeMove,
    onResizeUp: options.onResizeUp,
    cycleGuideMode: options.cycleGuideMode,
    getParentId: options.getParentId,
    getChildIds: (id) => {
      const node = options.model.get(id);
      return node?.children ? node.children.map((child) => child.data.id) : [];
    },
    getAncestorDepth: options.getAncestorDepth,
    selectComponent: options.selectComponent,
    applySelectionState: options.applySelectionState,
    captureOverrideEntries: options.captureOverrideEntries,
    commitOverridePatchAction: options.commitOverridePatchAction,
    getOwnDelta: options.getOwnDelta,
    applyInteractionOverrideEntries: options.applyInteractionOverrideEntries,
    applyAllOverrides: options.applyAllOverrides,
    showResizeHandles: options.showResizeHandles,
    renderSelectionInspector: options.renderSelectionInspector,
  });
}
