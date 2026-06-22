import { describe, expect, it } from 'vitest';

import { resolveFrameRenderPlan } from '../src/frame-render-plan.js';
import { Frame, createLine } from '../src/frame-model.js';
import { MockTextAdapter } from '../src/text-measure.js';
import { ICON_SIZE } from '../src/tokens.js';

describe('frame render plan', () => {
  it('resolves wrapped text lines and icon placement from one shared plan', () => {
    const frame = new Frame({
      id: 'alpha',
      icon: 'shield',
      label: [createLine('Shared frame render planning should wrap and place icons consistently.')],
    });
    frame._layout.placedX = 12;
    frame._layout.placedY = 24;
    frame._layout.placedW = 160;
    frame._layout.placedH = 96;

    const narrowPlan = resolveFrameRenderPlan(frame, new MockTextAdapter());
    frame._layout.placedW = 320;
    frame._layout.placedH = 64;
    const widePlan = resolveFrameRenderPlan(frame, new MockTextAdapter());

    expect(narrowPlan.componentId).toBe('alpha');
    expect(narrowPlan.textBlocks[0]?.role).toBe('label');
    expect(narrowPlan.textBlocks[0]?.lines.length).toBeGreaterThan(1);
    expect(widePlan.textBlocks[0]?.lines.length).toBeLessThan(narrowPlan.textBlocks[0]?.lines.length ?? 0);
    expect(widePlan.icon).toMatchObject({
      x: frame._layout.placedX + frame._layout.placedW - frame.paddingRight - ICON_SIZE,
      y: frame._layout.placedY + frame.paddingTop,
      width: ICON_SIZE,
      height: ICON_SIZE,
      fill: '#000000',
    });
  });
});
