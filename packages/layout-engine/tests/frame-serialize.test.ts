import { describe, expect, it } from 'vitest';
import { createLine, Direction, Frame, FrameDiagram, Justify } from '../src/frame-model.js';
import { deserializeFrameDiagramWire, serializeFrameDiagram } from '../src/frame-serialize.js';

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

  it('round-trips justify for preview wire frames', () => {
    const diagram = new FrameDiagram({
      root: new Frame({
        id: 'page',
        direction: Direction.VERTICAL,
        children: [
          new Frame({
            id: 'row',
            direction: Direction.HORIZONTAL,
            justify: Justify.SPACE_BETWEEN,
            sizingW: 'FILL',
            children: [
              new Frame({ id: 'left', width: 120, sizingW: 'FIXED', label: [createLine('left')] }),
              new Frame({ id: 'right', width: 120, sizingW: 'FIXED', label: [createLine('right')] }),
            ],
          }),
        ],
      }),
    });

    const wire = serializeFrameDiagram(diagram);
    const reloaded = deserializeFrameDiagramWire(wire);

    expect((wire.root as { children: Array<{ justify?: string }> }).children[0].justify).toBe('SPACE_BETWEEN');
    expect(reloaded.root.children[0]?.justify).toBe(Justify.SPACE_BETWEEN);
  });
});
