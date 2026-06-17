import { describe, expect, it } from 'vitest';
import { applySelectionStateMutation } from '../src/preview-shell/interaction-selection-state.js';

describe('interaction selection state helpers', () => {
  it('clears selection state', () => {
    expect(applySelectionStateMutation(
      { selectedIds: ['a', 'b'], selectionDepth: 2 },
      { kind: 'clear' },
    )).toEqual({
      selectedIds: [],
      selectionDepth: 0,
    });
  });

  it('toggles additive selection without changing depth', () => {
    expect(applySelectionStateMutation(
      { selectedIds: ['a'], selectionDepth: 1 },
      { kind: 'toggle', targetId: 'b' },
    )).toEqual({
      selectedIds: ['a', 'b'],
      selectionDepth: 1,
    });

    expect(applySelectionStateMutation(
      { selectedIds: ['a', 'b'], selectionDepth: 1 },
      { kind: 'toggle', targetId: 'a' },
    )).toEqual({
      selectedIds: ['b'],
      selectionDepth: 1,
    });
  });

  it('replaces selection with a single target and explicit depth', () => {
    expect(applySelectionStateMutation(
      { selectedIds: ['a', 'b'], selectionDepth: 1 },
      { kind: 'replace', targetId: 'child', nextSelectionDepth: 3 },
    )).toEqual({
      selectedIds: ['child'],
      selectionDepth: 3,
    });
  });

  it('replaces selection with a child group and deduplicates ids', () => {
    expect(applySelectionStateMutation(
      { selectedIds: ['a'], selectionDepth: 0 },
      { kind: 'replace-many', targetIds: ['x', 'y', 'x'], nextSelectionDepth: 2 },
    )).toEqual({
      selectedIds: ['x', 'y'],
      selectionDepth: 2,
    });
  });
});
