import { describe, expect, it } from 'vitest';
import {
  captureEditorSnapshot,
  cloneEditorSnapshotValue,
  normalizeGridOverrides,
  parseEditorSnapshot,
  serializeEditorSnapshot,
} from '../src/preview-shell/index.js';

describe('editor snapshot helpers', () => {
  it('clones values without sharing references', () => {
    const source = { gap: 8, nested: { cols: 3 } };
    const cloned = cloneEditorSnapshotValue(source);
    cloned.nested.cols = 99;
    expect(source.nested.cols).toBe(3);
  });

  it('normalizes grid overrides to the persisted subset', () => {
    const normalized = normalizeGridOverrides({
      cols: 12,
      rows: 4,
      col_gap: 16,
      row_gap: 8,
      margin_top: 24,
      link_to_root: true,
      slack_absorption: false,
      ignored: 'drop-me',
    });
    expect(normalized).toEqual({
      cols: 12,
      rows: 4,
      col_gap: 16,
      row_gap: 8,
      margin_top: 24,
      outer_margin: 24,
      link_to_root: true,
      slack_absorption: false,
    });
    expect(normalized).not.toHaveProperty('ignored');
  });

  it('captures optional layout-operator, layout, removed, and frame tree fields', () => {
    const snapshot = captureEditorSnapshot({
      overrides: { root: { gap: 4 } },
      gridOverrides: { cols: 6 },
      layoutOverrides: { direction: 'RIGHT' },
      layoutOperatorOverrides: {
        activeOperatorKey: 'dagre',
        byOperator: {
          dagre: { 'dagre.rankdir': 'LR' },
        },
      },
      removedIds: ['a', 'b'],
      frameTree: { id: 'root', children: [] },
    });
    expect(snapshot.o).toEqual({ root: { gap: 4 } });
    expect(snapshot.g).toEqual({ cols: 6 });
    expect(snapshot.e).toEqual({ direction: 'RIGHT' });
    expect(snapshot.ep).toEqual({
      activeOperatorKey: 'dagre',
      byOperator: {
        dagre: { 'dagre.rankdir': 'LR' },
      },
    });
    expect(snapshot.r).toEqual(['a', 'b']);
    expect(snapshot.f).toEqual({ id: 'root', children: [] });
  });

  it('round-trips serialized snapshots', () => {
    const snapshot = captureEditorSnapshot({
      overrides: { n1: { text: 'hello' } },
      gridOverrides: { col_gap: 12 },
    });
    const parsed = parseEditorSnapshot(serializeEditorSnapshot(snapshot));
    expect(parsed).toEqual(snapshot);
  });
});
