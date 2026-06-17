import { describe, expect, it } from 'vitest';
import {
  autoFitPreviewArtboard,
  collectPreviewArtboardBounds,
  resolvePreviewArtboardFit,
} from '../src/preview-shell/app-artboard.js';

describe('preview artboard helpers', () => {
  it('collects non-arrow rendered bounds across the tree', () => {
    const bounds = collectPreviewArtboardBounds({
      roots: [
        {
          id: 'root',
          children: [
            { id: 'child-a', type: 'box', children: [] },
            { id: 'arrow-a', type: 'arrow', children: [] },
            { id: 'child-b', type: 'box', children: [] },
          ],
        },
      ],
      readBounds: (id) => {
        if (id === 'root') return { left: 0, top: 0, right: 100, bottom: 80, width: 100, height: 80 };
        if (id === 'child-a') return { left: -12, top: 16, right: 48, bottom: 96, width: 60, height: 80 };
        if (id === 'child-b') return { left: 120, top: -24, right: 240, bottom: 120, width: 120, height: 144 };
        return null;
      },
    });

    expect(bounds).toEqual({
      minX: -12,
      minY: -24,
      maxX: 240,
      maxY: 120,
    });
  });

  it('expands only in overflow directions', () => {
    expect(resolvePreviewArtboardFit({
      current: { x: 0, y: 0, width: 200, height: 160 },
      contentBounds: { minX: -10, minY: 8, maxX: 240, maxY: 120 },
      padding: 24,
    })).toEqual({
      x: -34,
      y: 0,
      width: 298,
      height: 160,
      changed: true,
    });
  });

  it('updates the svg viewBox and size when the content would clip', () => {
    const attributes = new Map<string, string>([
      ['width', '200'],
      ['height', '160'],
    ]);
    const svg = {
      viewBox: {
        baseVal: { x: 0, y: 0, width: 200, height: 160 },
      },
      getAttribute: (name: string) => attributes.get(name) || null,
      setAttribute: (name: string, value: string) => {
        attributes.set(name, value);
      },
    } as unknown as SVGSVGElement;

    expect(autoFitPreviewArtboard({
      svg,
      roots: [{ id: 'root', children: [] }],
      readBounds: () => ({ left: -8, top: 0, right: 220, bottom: 100, width: 228, height: 100 }),
      padding: 24,
    })).toBe(true);
    expect(attributes.get('viewBox')).toBe('-32 0 276 160');
    expect(attributes.get('width')).toBe('276');
    expect(attributes.get('height')).toBe('160');
  });
});
