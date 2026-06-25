import { describe, expect, it } from 'vitest';
import {
  createNudgeOverrideEntries,
  isNudgeKey,
  resolveKeyboardShortcutAction,
} from '../src/preview-shell/interaction-keyboard.js';

describe('interaction keyboard helpers', () => {
  it('identifies supported nudge keys', () => {
    expect(isNudgeKey('ArrowUp')).toBe(true);
    expect(isNudgeKey('ArrowRight')).toBe(true);
    expect(isNudgeKey('Enter')).toBe(false);
  });

  it('creates nudged override entries while preserving size deltas', () => {
    expect(createNudgeOverrideEntries({
      items: [
        { id: 'a', dx: 8, dy: -8, dw: 10, dh: 12 },
        { id: 'b', dx: 0, dy: 0, dw: -4, dh: 6 },
      ],
      key: 'ArrowLeft',
      step: 24,
    })).toEqual([
      { id: 'a', dx: -16, dy: -8, dw: 10, dh: 12 },
      { id: 'b', dx: -24, dy: 0, dw: -4, dh: 6 },
    ]);
  });

  it('resolves sidebar, save, and undo/redo shortcuts', () => {
    expect(resolveKeyboardShortcutAction({ key: '1', altKey: true })).toEqual({
      kind: 'toggle-sidebar',
      sidebar: 'nav',
    });
    expect(resolveKeyboardShortcutAction({ key: 's', ctrlKey: true })).toEqual({ kind: 'save' });
    expect(resolveKeyboardShortcutAction({ key: 'z', ctrlKey: true })).toEqual({ kind: 'undo' });
    expect(resolveKeyboardShortcutAction({ key: 'Z', ctrlKey: true, shiftKey: true })).toEqual({ kind: 'redo' });
    expect(resolveKeyboardShortcutAction({ key: 'S', ctrlKey: true })).toEqual({ kind: 'save' });
    expect(resolveKeyboardShortcutAction({ key: 'Z', ctrlKey: true })).toEqual({ kind: 'undo' });
    expect(resolveKeyboardShortcutAction({ key: 'Y', ctrlKey: true })).toEqual({ kind: 'redo' });
    expect(resolveKeyboardShortcutAction({ key: 'Z', metaKey: true })).toEqual({ kind: 'undo' });
  });

  it('resolves selection-oriented keyboard actions and blocks autolayout nudges', () => {
    expect(resolveKeyboardShortcutAction({
      key: 'Enter',
      shiftKey: true,
      selectedCount: 1,
    })).toEqual({ kind: 'select-parent' });
    expect(resolveKeyboardShortcutAction({
      key: 'Enter',
      selectedCount: 2,
    })).toEqual({ kind: 'select-children' });
    expect(resolveKeyboardShortcutAction({
      key: 'ArrowRight',
      selectedCount: 2,
      shiftKey: true,
    })).toEqual({ kind: 'nudge-selection', key: 'ArrowRight', step: 24 });
    expect(resolveKeyboardShortcutAction({
      key: 'ArrowRight',
      selectedCount: 1,
      hasAutolayoutSelection: true,
    })).toEqual({ kind: 'none' });
  });

  it('resolves escape according to the active interaction mode', () => {
    expect(resolveKeyboardShortcutAction({ key: 'Escape', isTextEditing: true })).toEqual({ kind: 'cancel-text-edit' });
    expect(resolveKeyboardShortcutAction({ key: 'Escape', isDragging: true })).toEqual({ kind: 'cancel-drag' });
    expect(resolveKeyboardShortcutAction({ key: 'Escape', isResizing: true })).toEqual({ kind: 'cancel-resize' });
    expect(resolveKeyboardShortcutAction({ key: 'Escape' })).toEqual({ kind: 'deselect-all' });
  });
});
