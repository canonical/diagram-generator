import { describe, expect, it } from 'vitest';

import { resolveArrowRenderPlan } from '../src/arrow-render-plan.js';
import { createLine } from '../src/frame-model.js';
import { ARROW_COLOR } from '../src/tokens.js';

describe('arrow render plan', () => {
  it('chooses the label side farthest from nearby bounds while preserving shaft/head geometry', () => {
    const plan = resolveArrowRenderPlan({
      arrow: {
        componentId: 'edge-1',
        points: [[0, 50], [100, 50]],
        label: [createLine('Fast path')],
        labelGap: 24,
      },
      boundsMap: {
        obstacle: { x: 40, y: 0, w: 20, h: 40 },
      },
    });

    expect(plan.componentId).toBe('edge-1');
    expect(plan.color).toBe(ARROW_COLOR);
    expect(plan.shaftSegments).toHaveLength(1);
    expect(plan.shaftSegments[0]?.x2).toBeLessThan(100);
    expect(plan.head).not.toBeNull();
    expect(plan.label?.lines).toHaveLength(1);
    expect(plan.label?.lines[0]?.y ?? 0).toBeGreaterThan(50);
  });
});
