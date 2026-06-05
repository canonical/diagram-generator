import { describe, it, expect } from 'vitest';
import { Frame, FrameDiagram, createLine } from '../src/frame-model.js';
import { resolveStyles } from '../src/resolve-styles.js';
import { layoutFrameTree } from '../src/layout.js';
import { MockTextAdapter } from '../src/text-measure.js';
import { renderFrameDiagramToSvg } from '../src/svg-render.js';

describe('renderFrameDiagramToSvg resolved style snapshot', () => {
  it('renders section __heading typography from snapshot not stale line spec', () => {
    const heading = new Frame({
      id: 'sect__heading',
      role: 'heading',
      label: [createLine('Infrastructure', { weight: '400', smallCaps: false, fill: '#FF00FF' })],
    });
    const body = new Frame({
      id: 'sect__body',
      children: [new Frame({ id: 'leaf', label: [createLine('VM')] })],
    });
    const section = new Frame({
      id: 'sect',
      level: 3,
      children: [heading, body],
    });
    const root = new Frame({ id: 'page', children: [section] });
    resolveStyles(root);
    // Simulate resolver/author drift: line spec no longer matches snapshot.
    expect(heading.resolvedHeadingSmallCaps).toBe(true);
    expect(heading.resolvedTextFill).toBe('#000000');
    heading.label[0]!.smallCaps = false;
    heading.label[0]!.weight = '400';
    heading.label[0]!.fill = '#FF00FF';

    const diagram = new FrameDiagram({ title: 't', root });
    const adapter = new MockTextAdapter();
    const result = layoutFrameTree(root, adapter);
    const svg = renderFrameDiagramToSvg(diagram, result, adapter);

    expect(svg).toContain('font-variant-caps="small-caps"');
    expect(svg).toContain('font-weight="700"');
    expect(svg).toContain('fill="#000000"');
    expect(svg).not.toContain('fill="#FF00FF"');
  });

  it('renders leaf lead typography from snapshot not stale line spec', () => {
    const leaf = new Frame({
      id: 'leaf',
      level: 3,
      label: [createLine('Lead', { weight: '400', smallCaps: true, fill: '#FF00FF' })],
    });
    const root = new Frame({ id: 'page', children: [leaf] });
    resolveStyles(root);
    expect(leaf.resolvedLeafLeadWeight).toBe('700');
    expect(leaf.resolvedTextFill).toBe('#000000');

    leaf.label[0]!.weight = '400';
    leaf.label[0]!.smallCaps = true;
    leaf.label[0]!.fill = '#FF00FF';

    const diagram = new FrameDiagram({ title: 't', root });
    const adapter = new MockTextAdapter();
    const result = layoutFrameTree(root, adapter);
    const svg = renderFrameDiagramToSvg(diagram, result, adapter);

    expect(svg).toContain('font-weight="700"');
    expect(svg).toContain('fill="#000000"');
    expect(svg).not.toContain('fill="#FF00FF"');
    expect(svg).not.toContain('font-variant-caps="small-caps"');
  });
});
