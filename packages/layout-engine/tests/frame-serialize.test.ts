import { describe, expect, it } from 'vitest';
import { createLine, Frame, FrameDiagram } from '../src/frame-model.js';
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

  it('round-trips helper text for headed containers through preview wire DTO', () => {
    const diagram = new FrameDiagram({
      root: new Frame({
        id: 'page',
        children: [
          new Frame({
            id: 'section',
            children: [new Frame({ id: 'leaf', label: [createLine('Body')] })],
          }),
        ],
      }),
    });

    const section = diagram.root.children[0]!;
    section.heading = createLine('Section');
    section.helper = [createLine('Helper copy')];

    const json = serializeFrameDiagram(diagram);
    const roundTripped = deserializeFrameDiagramWire(json);
    const restoredSection = roundTripped.root.children[0]!;
    const restoredHeading = restoredSection.children[0]!;

    expect((json.root as { children: Array<{ helper?: unknown[] }> }).children[0]?.helper).toEqual([
      { content: 'Helper copy' },
    ]);
    expect(restoredSection.helper).toEqual([]);
    expect(restoredHeading.id).toBe('section__heading');
    expect(restoredHeading.helper.map((line) => line.content)).toEqual(['Helper copy']);
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
