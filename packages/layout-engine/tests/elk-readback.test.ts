import { describe, expect, it } from 'vitest';

import type { GraphLayoutResult } from '@diagram-generator/graph-layout-core';
import { computeNodeIntersection } from '@diagram-generator/graph-layout-elk';

import { deserializeFrameDiagramWire } from '../src/frame-serialize.js';
import { layoutElkFrameDiagram } from '../src/elk-layout.js';
import { MockTextAdapter } from '../src/text-measure.js';

type FrameLike = {
  id: string;
  children: FrameLike[];
  _layout: {
    placedX: number;
    placedY: number;
    placedW: number;
    placedH: number;
  };
};

function findFrameById(frame: FrameLike, id: string): FrameLike | null {
  if (frame.id === id) {
    return frame;
  }
  for (const child of frame.children) {
    const match = findFrameById(child, id);
    if (match) {
      return match;
    }
  }
  return null;
}

function fixtureDiagram() {
  return deserializeFrameDiagramWire({
    title: 'ELK readback fixture',
    root: {
      id: 'page',
      direction: 'VERTICAL',
      width: 640,
      sizingW: 'FIXED',
      sizingH: 'HUG',
      children: [
        {
          id: 'cluster',
          level: 2,
          heading: { content: 'Cluster' },
          sizingW: 'FILL',
          sizingH: 'HUG',
          children: [
            {
              id: 'row',
              direction: 'HORIZONTAL',
              sizingW: 'FILL',
              sizingH: 'HUG',
              children: [
                {
                  id: 'left',
                  width: 120,
                  sizingW: 'FIXED',
                  label: [{ content: 'Left node' }],
                },
                {
                  id: 'right',
                  width: 120,
                  sizingW: 'FIXED',
                  label: [{ content: 'Right node' }],
                },
              ],
            },
          ],
        },
      ],
    },
    arrows: [{ id: 'left_to_right', source: 'left', target: 'right' }],
    gridCols: 1,
  } as Record<string, unknown>);
}

describe('ELK readback', () => {
  it('reads placed node rectangles and trims ELK edge sections to frame borders', async () => {
    const diagram = fixtureDiagram();
    const adapter = new MockTextAdapter();
    const graphLayout = async (): Promise<GraphLayoutResult> => ({
      width: 480,
      height: 280,
      engine: 'elk-layered',
      direction: 'TB',
      nodes: [
        {
          id: 'cluster',
          x: 16,
          y: 24,
          width: 420,
          height: 240,
          children: [
            {
              id: 'row',
              x: 32,
              y: 80,
              width: 388,
              height: 120,
              children: [
                { id: 'left', x: 56, y: 104, width: 120, height: 64 },
                { id: 'right', x: 296, y: 104, width: 120, height: 64 },
              ],
            },
          ],
        },
      ],
      edges: [
        {
          id: 'left_to_right',
          source: 'left',
          target: 'right',
          sections: [
            {
              startPoint: { x: 116, y: 136 },
              bendPoints: [{ x: 216, y: 136 }],
              endPoint: { x: 356, y: 136 },
            },
          ],
        },
      ],
    });

    await layoutElkFrameDiagram(diagram, adapter, {
      originX: 0,
      originY: 0,
      graphLayout,
    });

    const root = diagram.root as unknown as FrameLike;
    const cluster = findFrameById(root, 'cluster');
    const row = findFrameById(root, 'row');
    const left = findFrameById(root, 'left');
    const right = findFrameById(root, 'right');

    expect(cluster?._layout).toMatchObject({ placedX: 16, placedY: 24, placedW: 420, placedH: 240 });
    expect(row?._layout?.placedX).toBe(32);
    expect(row?._layout?.placedY).toBe(80);
    expect(row?._layout?.placedH).toBe(120);
    expect((row?._layout?.placedW ?? 0) - 388).toBeLessThanOrEqual(4);
    expect(left?._layout).toMatchObject({ placedX: 56, placedY: 104, placedW: 120, placedH: 64 });
    expect(right?._layout).toMatchObject({ placedX: 296, placedY: 104, placedW: 120, placedH: 64 });

    const expectedStart = computeNodeIntersection(
      {},
      { x: 116, y: 136, width: 120, height: 64 },
      { x: 216, y: 136 },
      { x: 116, y: 136 },
    );
    const expectedEnd = computeNodeIntersection(
      {},
      { x: 356, y: 136, width: 120, height: 64 },
      { x: 216, y: 136 },
      { x: 356, y: 136 },
    );

    expect(diagram.arrows[0]?.layoutPath).toEqual([
      [expectedStart.x, expectedStart.y],
      [216, 136],
      [expectedEnd.x, expectedEnd.y],
    ]);
    expect(diagram.arrows[0]?.waypoints).toEqual([[216, 136]]);
  });

  it('keeps ELK label geometry but does not synthesize a fallback route when sections are missing', async () => {
    const diagram = fixtureDiagram();
    diagram.arrows[0]!.label = [{ content: 'Step 1' }];
    const adapter = new MockTextAdapter();
    const graphLayout = async (): Promise<GraphLayoutResult> => ({
      width: 480,
      height: 280,
      engine: 'elk-layered',
      direction: 'TB',
      nodes: [
        {
          id: 'cluster',
          x: 16,
          y: 24,
          width: 420,
          height: 240,
          children: [
            {
              id: 'row',
              x: 32,
              y: 80,
              width: 388,
              height: 120,
              children: [
                { id: 'left', x: 56, y: 104, width: 120, height: 64 },
                { id: 'right', x: 296, y: 104, width: 120, height: 64 },
              ],
            },
          ],
        },
      ],
      edges: [
        {
          id: 'left_to_right',
          source: 'left',
          target: 'right',
          sections: [],
          labels: [
            {
              text: 'Step 1',
              x: 0,
              y: 0,
              width: 96,
              height: 24,
            },
          ],
        },
      ],
    });

    await layoutElkFrameDiagram(diagram, adapter, {
      originX: 0,
      originY: 0,
      graphLayout,
    });

    expect(diagram.arrows[0]?.elkLabels).toEqual([
      {
        text: 'Step 1',
        x: 0,
        y: 0,
        width: 96,
        height: 24,
      },
    ]);
    expect(diagram.arrows[0]?.layoutPath).toBeUndefined();
    expect(diagram.arrows[0]?.waypoints).toEqual([]);
  });
});
