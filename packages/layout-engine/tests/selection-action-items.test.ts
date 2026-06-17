import { describe, expect, it } from 'vitest';
import { collectPreviewSelectionActionInfo } from '../src/preview-shell/selection-action-items.js';

describe('selection action item helpers', () => {
  it('collects geometry-rich selection items and same-parent metadata', () => {
    const nodes = new Map([
      ['root', {
        id: 'root',
        data: { id: 'root', x: 0, y: 0, width: 400, height: 300 },
        parent: null,
      }],
      ['alpha', {
        id: 'alpha',
        data: { id: 'alpha', x: 40, y: 60, width: 100, height: 80 },
        parent: { id: 'root' },
      }],
      ['beta', {
        id: 'beta',
        data: { id: 'beta', x: 180, y: 60, width: 120, height: 80 },
        parent: { id: 'root' },
      }],
    ]);
    const ownById = {
      root: { dx: 0, dy: 0, dw: 20, dh: 10 },
      alpha: { dx: 4, dy: 6, dw: 8, dh: 0 },
      beta: { dx: -2, dy: 10, dw: 0, dh: 12 },
    };
    const effById = {
      root: { dx: 12, dy: 16, dw: 20, dh: 10 },
      alpha: { dx: 18, dy: 30, dw: 8, dh: 0 },
      beta: { dx: 8, dy: 26, dw: 0, dh: 12 },
    };

    const info = collectPreviewSelectionActionInfo({
      selectedIds: ['alpha', 'beta'],
      getNode: (id) => nodes.get(id) ?? null,
      getOwnDelta: (id) => ownById[id as keyof typeof ownById],
      getEffectiveDelta: (id) => effById[id as keyof typeof effById],
      inset: 12,
    });

    expect(info.sameParent).toBe(true);
    expect(info.parentId).toBe('root');
    expect(info.hasUnsupported).toBe(false);
    expect(info.items).toEqual([
      {
        id: 'alpha',
        node: nodes.get('alpha'),
        parentId: 'root',
        own: ownById.alpha,
        eff: effById.alpha,
        baseX: 40,
        baseY: 60,
        ancestorDx: 14,
        ancestorDy: 24,
        parentBounds: { minX: 24, minY: 28, maxX: 312, maxY: 234 },
        x: 58,
        y: 90,
        width: 108,
        height: 80,
      },
      {
        id: 'beta',
        node: nodes.get('beta'),
        parentId: 'root',
        own: ownById.beta,
        eff: effById.beta,
        baseX: 180,
        baseY: 60,
        ancestorDx: 10,
        ancestorDy: 16,
        parentBounds: { minX: 24, minY: 28, maxX: 300, maxY: 222 },
        x: 188,
        y: 86,
        width: 120,
        height: 92,
      },
    ]);
  });

  it('marks unsupported selections and skips arrows or missing nodes', () => {
    const nodes = new Map([
      ['arrow', {
        id: 'arrow',
        type: 'arrow',
        data: { id: 'arrow', x: 0, y: 0, width: 0, height: 0 },
        parent: null,
      }],
      ['box', {
        id: 'box',
        data: { id: 'box', x: 10, y: 20, width: 30, height: 40 },
        parent: null,
      }],
    ]);

    const info = collectPreviewSelectionActionInfo({
      selectedIds: ['missing', 'arrow', 'box'],
      getNode: (id) => nodes.get(id) ?? null,
      getOwnDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      getEffectiveDelta: () => ({ dx: 0, dy: 0, dw: 0, dh: 0 }),
      inset: 12,
    });

    expect(info.hasUnsupported).toBe(true);
    expect(info.items).toHaveLength(1);
    expect(info.items[0]?.id).toBe('box');
  });
});
