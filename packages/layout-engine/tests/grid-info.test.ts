import { describe, it, expect } from 'vitest';
import { Frame, FrameDiagram, Sizing } from '../src/frame-model.js';
import { layoutFrameTree } from '../src/layout.js';
import { MockTextAdapter } from '../src/text-measure.js';
import { buildGridInfo } from '../src/grid-info.js';

describe('buildGridInfo', () => {
  it('returns column geometry for a laid-out root', () => {
    const root = new Frame({
      id: 'page',
      sizingW: Sizing.HUG,
      sizingH: Sizing.HUG,
      children: [
        new Frame({ id: 'a', label: [{ content: 'A', size: '18', weight: '400' }] as never }),
      ],
    });
    const diagram = new FrameDiagram({ root, gridCols: 2 });
    const adapter = new MockTextAdapter();
    layoutFrameTree(root, adapter);
    const info = buildGridInfo(diagram, root);
    expect(info.col_xs.length).toBe(2);
    expect(info.col_widths.length).toBe(2);
    expect(info.baseline_step).toBe(8);
  });
});
