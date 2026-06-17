import {
  applySelectionStateMutation,
  type SelectionStateSnapshot,
} from './interaction-selection-state.js';
import {
  createNudgeOverrideEntries,
  resolveKeyboardShortcutAction,
  type KeyboardShortcutAction,
} from './interaction-keyboard.js';
import type { InteractionOverrideEntry } from './interaction-resize.js';

/**
 * Keyboard dispatch helper (spec 043 interaction slice G).
 *
 * This keeps `editor.js` focused on gathering live shell state and wiring DOM
 * callbacks while TS owns the branch-heavy keyboard controller behavior.
 */

export interface PreviewKeyboardDelta {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export interface PreviewKeyboardDispatchOptions {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  isEditableTarget?: boolean;
  selectedIds: string[];
  selectionDepth: number;
  isBusy?: boolean;
  isTextEditing?: boolean;
  isDragging?: boolean;
  isResizing?: boolean;
  hasAutolayoutSelection?: boolean;
  preventDefault: () => void;
  toggleSidebar: (sidebar: 'nav' | 'aside') => void;
  save: () => void;
  undo: () => void;
  redo: () => void;
  deleteSelection: () => void;
  cancelTextEdit: () => void;
  cancelDrag: () => void;
  cancelResize: () => void;
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
  getOwnDelta: (id: string) => PreviewKeyboardDelta;
  applyInteractionOverrideEntries: (entries: InteractionOverrideEntry[]) => void;
  applyAllOverrides: () => void;
  showResizeHandles: (id: string) => void;
  renderSelectionInspector: (id?: string) => void;
}

export interface PreviewKeyboardHostEventTargetLike {
  tagName?: string | null;
  isContentEditable?: boolean;
}

export interface PreviewKeyboardHostEventLike {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  target?: PreviewKeyboardHostEventTargetLike | null;
  preventDefault: () => void;
}

export interface PreviewKeyboardHostToggleElement {
  classList: {
    toggle: (name: string) => void;
  };
}

export interface PreviewKeyboardHostSvgHandleLike {
  style: {
    display: string;
  };
}

export interface PreviewKeyboardHostSvgLike {
  querySelectorAll: (selector: string) => Iterable<PreviewKeyboardHostSvgHandleLike>;
}

export interface PreviewKeyboardHostDocumentLike {
  querySelector: (selector: string) => PreviewKeyboardHostToggleElement | PreviewKeyboardHostSvgLike | null;
  removeEventListener: (
    type: 'mousemove' | 'mouseup',
    handler: ((event?: any) => void),
  ) => void;
}

export interface DispatchPreviewKeyboardShortcutHostOptions {
  event: PreviewKeyboardHostEventLike;
  document: PreviewKeyboardHostDocumentLike;
  selectedIds: Iterable<string>;
  selectionDepth: number;
  isBusy?: boolean;
  isTextEditing?: boolean;
  isDragging?: boolean;
  isResizing?: boolean;
  hasAutolayoutSelection?: boolean;
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
  endInteraction: () => void;
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
  getOwnDelta: (id: string) => PreviewKeyboardDelta;
  applyInteractionOverrideEntries: (entries: InteractionOverrideEntry[]) => void;
  applyAllOverrides: () => void;
  showResizeHandles: (id: string) => void;
  renderSelectionInspector: (id?: string) => void;
}

function uniqueIds(ids: Iterable<string>): string[] {
  return [...new Set(ids)].filter(Boolean);
}

export function dispatchPreviewKeyboardShortcut(
  options: PreviewKeyboardDispatchOptions,
): KeyboardShortcutAction {
  const selectedIds = uniqueIds(options.selectedIds);
  const action = resolveKeyboardShortcutAction({
    key: options.key,
    ctrlKey: options.ctrlKey,
    shiftKey: options.shiftKey,
    metaKey: options.metaKey,
    altKey: options.altKey,
    selectedCount: selectedIds.length,
    isEditableTarget: options.isEditableTarget,
    isBusy: options.isBusy,
    isTextEditing: options.isTextEditing,
    isDragging: options.isDragging,
    isResizing: options.isResizing,
    hasAutolayoutSelection: options.hasAutolayoutSelection,
  });
  const currentState: SelectionStateSnapshot = {
    selectedIds,
    selectionDepth: Math.max(0, options.selectionDepth),
  };

  switch (action.kind) {
    case 'toggle-sidebar':
      options.preventDefault();
      options.toggleSidebar(action.sidebar);
      return action;
    case 'save':
      options.preventDefault();
      options.save();
      return action;
    case 'undo':
      options.preventDefault();
      options.undo();
      return action;
    case 'redo':
      options.preventDefault();
      options.redo();
      return action;
    case 'delete-selection':
      options.preventDefault();
      options.deleteSelection();
      return action;
    case 'cancel-text-edit':
      options.cancelTextEdit();
      return action;
    case 'cancel-drag':
      options.cancelDrag();
      return action;
    case 'cancel-resize':
      options.cancelResize();
      return action;
    case 'deselect-all':
      options.applySelectionState(
        applySelectionStateMutation(currentState, { kind: 'clear' }),
      );
      return action;
    case 'cycle-guide-mode':
      options.cycleGuideMode();
      return action;
    case 'select-parent': {
      options.preventDefault();
      const primary = selectedIds[0];
      const parentId = primary ? options.getParentId(primary) : null;
      if (parentId) options.selectComponent(parentId);
      return action;
    }
    case 'select-children': {
      options.preventDefault();
      const childIds = uniqueIds(selectedIds.flatMap((id) => options.getChildIds(id)));
      if (childIds.length > 0) {
        options.applySelectionState(
          applySelectionStateMutation(currentState, {
            kind: 'replace-many',
            targetIds: childIds,
            nextSelectionDepth: options.getAncestorDepth(childIds[0]!),
          }),
          childIds[childIds.length - 1],
        );
      }
      return action;
    }
    case 'nudge-selection': {
      options.preventDefault();
      const beforeEntries = options.captureOverrideEntries(selectedIds);
      const entries = createNudgeOverrideEntries({
        items: selectedIds.map((id) => ({
          id,
          ...options.getOwnDelta(id),
        })),
        key: action.key,
        step: action.step,
      });
      options.applyInteractionOverrideEntries(entries);
      options.commitOverridePatchAction(
        'Nudge selection',
        beforeEntries,
        options.captureOverrideEntries(selectedIds),
      );
      options.applyAllOverrides();
      const primary = selectedIds[selectedIds.length - 1];
      if (primary) options.showResizeHandles(primary);
      options.renderSelectionInspector(primary);
      return action;
    }
    case 'none':
    default:
      return action;
  }
}

export function dispatchPreviewKeyboardShortcutHost(
  options: DispatchPreviewKeyboardShortcutHostOptions,
): KeyboardShortcutAction {
  const tag = options.event.target?.tagName || '';
  const isEditableTarget = tag === 'INPUT'
    || tag === 'TEXTAREA'
    || tag === 'SELECT'
    || Boolean(options.event.target?.isContentEditable);

  return dispatchPreviewKeyboardShortcut({
    key: options.event.key,
    ctrlKey: options.event.ctrlKey,
    shiftKey: options.event.shiftKey,
    metaKey: options.event.metaKey,
    altKey: options.event.altKey,
    isEditableTarget,
    selectedIds: [...options.selectedIds],
    selectionDepth: options.selectionDepth,
    isBusy: options.isBusy,
    isTextEditing: options.isTextEditing,
    isDragging: options.isDragging,
    isResizing: options.isResizing,
    hasAutolayoutSelection: options.hasAutolayoutSelection,
    preventDefault: () => options.event.preventDefault(),
    toggleSidebar: (sidebar) => {
      const app = options.document.querySelector('.dg-preview-app') as PreviewKeyboardHostToggleElement | null;
      if (!app) {
        return;
      }
      app.classList.toggle(sidebar === 'nav' ? 'is-nav-hidden' : 'is-aside-hidden');
    },
    save: options.save,
    undo: options.undo,
    redo: options.redo,
    deleteSelection: options.deleteSelection,
    cancelTextEdit: options.cancelTextEdit,
    cancelDrag: () => {
      options.clearGuideLines();
      options.document.removeEventListener('mousemove', options.onDragMove);
      options.document.removeEventListener('mouseup', options.onDragUp);
      options.endInteraction();
    },
    cancelResize: () => {
      options.clearGuideLines();
      options.document.removeEventListener('mousemove', options.onResizeMove);
      options.document.removeEventListener('mouseup', options.onResizeUp);
      const svg = options.document.querySelector('#stage svg') as PreviewKeyboardHostSvgLike | null;
      for (const handle of svg?.querySelectorAll('.dg-handle') || []) {
        handle.style.display = '';
      }
      options.endInteraction();
    },
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
}
