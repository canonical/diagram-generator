import { describe, it, expect } from 'vitest';
import { Frame, createLine, Sizing } from '../src/frame-model.js';
import { layoutFrameTree } from '../src/layout.js';
import { MockTextAdapter } from '../src/text-measure.js';
import { buildComponentTree } from '../src/component-tree.js';
import { applyHeadingAsChild } from '../src/heading-synthesis.js';

describe('buildComponentTree', () => {
  it('includes placed bounds and label text', () => {
    const leaf = new Frame({
      id: 'leaf',
      label: [createLine('Hello')],
      sizingW: Sizing.HUG,
    });
    layoutFrameTree(leaf, new MockTextAdapter());
    const tree = buildComponentTree(leaf);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.id).toBe('leaf');
    expect(tree[0]!.label_text).toEqual(['Hello']);
    expect(tree[0]!.width).toBeGreaterThan(0);
  });

  it('reads heading from __heading child', () => {
    const panel = new Frame({
      id: 'panel',
      children: [new Frame({ id: 'child', label: [createLine('Body')] })],
    });
    applyHeadingAsChild(panel, createLine('Title', { weight: '700' }));
    layoutFrameTree(panel, new MockTextAdapter());
    const tree = buildComponentTree(panel);
    expect(tree[0]!.heading_text).toBe('Title');
  });
});
