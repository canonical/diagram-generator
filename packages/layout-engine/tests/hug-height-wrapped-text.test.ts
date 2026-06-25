import { describe, expect, it } from 'vitest';
import { Direction, Frame, FrameDiagram, Sizing, createLine } from '../src/frame-model.js';
import { layoutFrameTree } from '../src/layout.js';
import { resolveFrameRenderPlan } from '../src/frame-render-plan.js';
import { getHarfBuzzAdapter } from './svg-golden-harness.js';

/**
 * Regression: a FILL leaf's hug height must cover its text wrapped at the leaf's
 * final placed width. The bug was that hug height was measured at a grid-snapped
 * (wider) width than the width `place()` ultimately assigned, so a label that
 * wrapped to more lines at the narrower placed width overflowed the box. The fix
 * makes width resolution use the same unsnapped FILL width that placement uses,
 * so the measured hug height always covers the rendered lines.
 */
describe('hug height covers wrapped text at placed width', () => {
  it('keeps every wrapped line inside a FILL leaf placed in a fixed-width row', async () => {
    const adapter = await getHarfBuzzAdapter();

    const wrapping = new Frame({
      id: 'implement',
      sizingW: Sizing.FILL,
      sizingH: Sizing.HUG,
      label: [createLine('Implement Ingress pipeline')],
    });
    const sibling = new Frame({
      id: 'spike',
      sizingW: Sizing.FILL,
      sizingH: Sizing.HUG,
      label: [createLine('Build spike')],
    });
    const row = new Frame({
      id: 'row',
      direction: Direction.HORIZONTAL,
      sizingW: Sizing.FIXED,
      // 320px splits into a ~139px FILL width. Grid-snapping that width up (the
      // old bug) measured the hug height at a wider basis that wrapped the
      // label to 2 lines, while placement used the narrower 139px that wraps to
      // 3 lines - overflowing the 64px box. The fix keeps both widths equal.
      width: 320,
      sizingH: Sizing.HUG,
      children: [wrapping, sibling],
    });
    const root = new Frame({
      id: 'page',
      direction: Direction.VERTICAL,
      children: [row],
    });

    layoutFrameTree(root, adapter);

    // The label must wrap at the narrow fill width to exercise the bug.
    const plan = resolveFrameRenderPlan(wrapping, adapter);
    const lines = plan.textBlocks[0]?.lines ?? [];
    expect(lines.length).toBeGreaterThan(1);

    // Every wrapped line baseline must sit inside the leaf's placed box. If the
    // hug height were measured at a wider (grid-snapped) width, the extra
    // wrapped line would push a baseline past placedH and overflow.
    const boxBottom = wrapping._layout.placedY + wrapping._layout.placedH;
    for (const line of lines) {
      expect(line.y).toBeLessThanOrEqual(boxBottom);
    }
  });
});
