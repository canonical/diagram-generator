import { describe, expect, it } from 'vitest';
import { createPreviewRenderIntent } from '../src/preview-shell/preview-render-intent.js';

describe('preview render intent', () => {
  it('derives the engine from a freshly loaded frame tree before any prior intent', () => {
    const intent = createPreviewRenderIntent({
      current: {
        engineId: 'elk-layered',
        pageDirection: null,
        frameOverrides: {},
        engineOverrides: {},
        gridOverrides: {},
      },
      frameTreeJson: {
        layoutEngine: 'dagre',
        root: { id: 'root' },
      },
    });

    expect(intent.engineId).toBe('dagre');
  });

  it('keeps an explicit active engine above the loaded frame tree', () => {
    const intent = createPreviewRenderIntent({
      activeEngineId: 'v3',
      frameTreeJson: {
        layoutEngine: 'elk-layered',
        root: { id: 'root' },
      },
    });

    expect(intent.engineId).toBe('v3');
  });
});
