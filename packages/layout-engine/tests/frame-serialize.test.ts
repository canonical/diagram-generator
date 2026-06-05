import { describe, expect, it } from 'vitest';
import { createLine, Frame, FrameDiagram } from '../src/frame-model.js';
import { serializeFrameDiagram } from '../src/frame-serialize.js';

describe('frame serialize', () => {
  it('omits line-level style fields from preview wire DTO', () => {
    const diagram = new FrameDiagram({
      root: new Frame({
        id: 'page',
        heading: createLine('Heading', { weight: '900', fill: '#FF00FF', smallCaps: true }),
        label: [createLine('Body', { weight: '900', fill: '#00FF00', smallCaps: true })],
      }),
    });

    const json = serializeFrameDiagram(diagram);
    const root = json.root as { heading?: Record<string, unknown> | null; label: Record<string, unknown>[] };

    expect(root.heading).toEqual({ content: 'Heading' });
    expect(root.label[0]).toEqual({ content: 'Body' });
  });
});