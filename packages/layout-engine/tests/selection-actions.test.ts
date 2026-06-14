import { describe, expect, it } from 'vitest';
import {
  clampSelectionTarget,
  createSelectionTargetOverrideEntries,
  normalizeSelectionGap,
  resolveSelectionAlignTargets,
  resolveSelectionDistributeTargets,
} from '../src/preview-shell/selection-actions.js';

describe('selection action helpers', () => {
  const items = [
    {
      id: 'a',
      x: 100,
      y: 120,
      width: 80,
      height: 40,
      baseX: 92,
      baseY: 112,
      ancestorDx: 8,
      ancestorDy: 8,
      parentBounds: { minX: 80, minY: 100, maxX: 220, maxY: 240 },
    },
    {
      id: 'b',
      x: 220,
      y: 160,
      width: 60,
      height: 60,
      baseX: 200,
      baseY: 152,
      ancestorDx: 20,
      ancestorDy: 8,
      parentBounds: { minX: 80, minY: 100, maxX: 240, maxY: 220 },
    },
  ];

  it('normalizes selection gap and clamps targets within parent bounds', () => {
    expect(normalizeSelectionGap(23, 8)).toBe(24);
    expect(clampSelectionTarget(items[0], 40, 400, 8)).toEqual({
      x: 80,
      y: 240,
    });
  });

  it('resolves distributed targets across the chosen axis', () => {
    expect(resolveSelectionDistributeTargets({
      items,
      axis: 'x',
      gap: 24,
      snapStep: 8,
    })).toEqual({
      a: { x: 104, y: 120 },
      b: { x: 208, y: 160 },
    });
  });

  it('resolves aligned targets and converts them into override entries', () => {
    const targets = resolveSelectionAlignTargets({
      items,
      mode: 'bottom',
      snapStep: 8,
    });

    expect(targets).toEqual({
      a: { x: 104, y: 184 },
      b: { x: 224, y: 160 },
    });
    expect(createSelectionTargetOverrideEntries({
      items,
      targets,
      snapStep: 8,
    })).toEqual([
      { id: 'a', dx: 8, dy: 64 },
      { id: 'b', dx: 8, dy: 0 },
    ]);
  });
});
