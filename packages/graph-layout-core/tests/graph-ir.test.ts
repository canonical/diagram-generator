import { describe, expect, it } from 'vitest';
import {
  GRID_BASELINE_PX,
  isGraphCompoundNode,
  resolveGraphPortPlacement,
  resolveGraphNodeKind,
  roundToGrid,
} from '../src/index.js';

describe('graph-layout-core', () => {
  it('snaps to 8px grid', () => {
    expect(GRID_BASELINE_PX).toBe(8);
    expect(roundToGrid(10)).toBe(8);
    expect(roundToGrid(12)).toBe(16);
  });

  it('resolves side-anchored ports to midpoint coordinates', () => {
    expect(resolveGraphPortPlacement(
      { width: 192, height: 64 },
      {
        id: 'node__right',
        anchor: { kind: 'side', side: 'right' },
      },
    )).toEqual({
      side: 'right',
      x: 192,
      y: 32,
      width: 0,
      height: 0,
    });
  });

  it('preserves point-anchored port coordinates without ELK-specific fields', () => {
    expect(resolveGraphPortPlacement(
      { width: 192, height: 64 },
      {
        id: 'node__bottom_custom',
        anchor: { kind: 'point', side: 'bottom', x: 144, y: 64 },
        width: 12,
        height: 8,
      },
    )).toEqual({
      side: 'bottom',
      x: 144,
      y: 64,
      width: 12,
      height: 8,
    });
  });

  it('treats ordering clusters as typed compounds instead of visible leaf nodes', () => {
    const orderingCluster = {
      id: 'row',
      kind: 'ordering-cluster' as const,
      width: 0,
      height: 0,
      children: [
        { id: 'a', width: 192, height: 64 },
        { id: 'b', width: 192, height: 64 },
      ],
    };

    expect(resolveGraphNodeKind(orderingCluster)).toBe('ordering-cluster');
    expect(isGraphCompoundNode(orderingCluster)).toBe(true);
    expect(resolveGraphNodeKind({ id: 'box', width: 192, height: 64 })).toBe('node');
  });
});
