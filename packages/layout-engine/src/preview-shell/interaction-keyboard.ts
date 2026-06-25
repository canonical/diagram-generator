import type { InteractionOverrideEntry } from './interaction-resize.js';

/**
 * Keyboard interaction helpers (spec 043 interaction slice E).
 */

export type NudgeKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

export interface NudgeSelectionItem {
  id: string;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export type KeyboardShortcutAction =
  | { kind: 'none' }
  | { kind: 'toggle-sidebar'; sidebar: 'nav' | 'aside' }
  | { kind: 'save' }
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'delete-selection' }
  | { kind: 'cancel-text-edit' }
  | { kind: 'cancel-drag' }
  | { kind: 'cancel-resize' }
  | { kind: 'deselect-all' }
  | { kind: 'cycle-guide-mode' }
  | { kind: 'select-parent' }
  | { kind: 'select-children' }
  | { kind: 'nudge-selection'; key: NudgeKey; step: number };

export function isNudgeKey(value: string): value is NudgeKey {
  return value === 'ArrowUp'
    || value === 'ArrowDown'
    || value === 'ArrowLeft'
    || value === 'ArrowRight';
}

export function resolveKeyboardShortcutAction(options: {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  selectedCount?: number;
  isEditableTarget?: boolean;
  isBusy?: boolean;
  isTextEditing?: boolean;
  isDragging?: boolean;
  isResizing?: boolean;
  hasAutolayoutSelection?: boolean;
}): KeyboardShortcutAction {
  const selectedCount = Math.max(0, options.selectedCount ?? 0);
  const isEditableTarget = Boolean(options.isEditableTarget);
  const ctrlKey = Boolean(options.ctrlKey);
  const shiftKey = Boolean(options.shiftKey);
  const metaKey = Boolean(options.metaKey);
  const altKey = Boolean(options.altKey);
  const shortcutKey = options.key.toLowerCase();
  const primaryShortcutKey = ctrlKey || metaKey;

  if (altKey && (options.key === '1' || options.key === '2') && !ctrlKey && !metaKey) {
    return {
      kind: 'toggle-sidebar',
      sidebar: options.key === '1' ? 'nav' : 'aside',
    };
  }

  if (primaryShortcutKey && shortcutKey === 's') {
    return { kind: 'save' };
  }
  if (primaryShortcutKey && shortcutKey === 'z' && !shiftKey) {
    return { kind: 'undo' };
  }
  if ((primaryShortcutKey && shiftKey && shortcutKey === 'z') || (primaryShortcutKey && shortcutKey === 'y')) {
    return { kind: 'redo' };
  }
  if ((options.key === 'Delete' || options.key === 'Backspace') && !ctrlKey && !metaKey && !altKey) {
    if (isEditableTarget || selectedCount === 0 || options.isBusy) {
      return { kind: 'none' };
    }
    return { kind: 'delete-selection' };
  }
  if (options.key === 'Escape') {
    if (options.isTextEditing) return { kind: 'cancel-text-edit' };
    if (options.isDragging) return { kind: 'cancel-drag' };
    if (options.isResizing) return { kind: 'cancel-resize' };
    return { kind: 'deselect-all' };
  }
  if ((options.key === 'w' || options.key === 'W') && !ctrlKey && !metaKey && !altKey) {
    return { kind: 'cycle-guide-mode' };
  }
  if (
    options.key === 'Enter'
    && shiftKey
    && !ctrlKey
    && !metaKey
    && !altKey
    && selectedCount > 0
    && !options.isTextEditing
    && !isEditableTarget
  ) {
    return { kind: 'select-parent' };
  }
  if (
    options.key === 'Enter'
    && !shiftKey
    && !ctrlKey
    && !metaKey
    && !altKey
    && selectedCount > 0
    && !options.isTextEditing
    && !isEditableTarget
  ) {
    return { kind: 'select-children' };
  }
  if (
    selectedCount > 0
    && !options.isTextEditing
    && !ctrlKey
    && !metaKey
    && !altKey
    && isNudgeKey(options.key)
  ) {
    if (options.hasAutolayoutSelection) {
      return { kind: 'none' };
    }
    return {
      kind: 'nudge-selection',
      key: options.key,
      step: shiftKey ? 24 : 8,
    };
  }

  return { kind: 'none' };
}

export function createNudgeOverrideEntries(options: {
  items: NudgeSelectionItem[];
  key: NudgeKey;
  step: number;
}): InteractionOverrideEntry[] {
  let dxStep = 0;
  let dyStep = 0;

  if (options.key === 'ArrowUp') dyStep = -options.step;
  else if (options.key === 'ArrowDown') dyStep = options.step;
  else if (options.key === 'ArrowLeft') dxStep = -options.step;
  else if (options.key === 'ArrowRight') dxStep = options.step;

  return options.items.map((item) => ({
    id: item.id,
    dx: item.dx + dxStep,
    dy: item.dy + dyStep,
    dw: item.dw,
    dh: item.dh,
  }));
}
