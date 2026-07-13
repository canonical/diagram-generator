import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadFrameYaml } from '../src/frame-yaml-loader.js';
import { layoutElkFrameDiagram } from '../src/elk-layout.js';
import { renderFrameDiagramToSvg } from '../src/svg-render.js';
import { MockTextAdapter } from '../src/text-measure.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURE_PATH = join(__dirname, '../../..', 'diagrams/1.input/elk-cluster-portability.yaml');

type FrameLike = {
  id: string;
  level?: number;
  children: FrameLike[];
  _layout: {
    placedX: number;
    placedY: number;
    placedW: number;
    placedH: number;
  };
};

type RawElkNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children?: RawElkNode[];
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

function collectRawGeometry(
  nodes: RawElkNode[],
  originX: number,
  originY: number,
  out = new Map<string, { x: number; y: number; width: number; height: number }>(),
): Map<string, { x: number; y: number; width: number; height: number }> {
  for (const node of nodes) {
    out.set(node.id, {
      x: node.x + originX,
      y: node.y + originY,
      width: node.width,
      height: node.height,
    });
    collectRawGeometry(node.children ?? [], originX, originY, out);
  }
  return out;
}

describe('ELK cluster lowering portability', () => {
  it('renders a non-TLS clustered topology through generic lowering', async () => {
    const diagram = loadFrameYaml(FIXTURE_PATH);
    const root = diagram.root as unknown as FrameLike;
    const layout = await layoutElkFrameDiagram(diagram, new MockTextAdapter());
    const snapshot = layout.elkSnapshot as {
      originX: number;
      originY: number;
      nodes: RawElkNode[];
      edges: Array<{ id: string; sections: unknown[] }>;
      debug: {
        inputGraph: { nodes: Array<{ id: string }> };
      };
    };
    const svg = renderFrameDiagramToSvg(diagram, layout, new MockTextAdapter());

    expect(root.children.map((child) => child.id)).toEqual([
      'capture_cluster',
      'normalize_cluster',
      'archive_cluster',
      'observe_cluster',
    ]);
    expect(findFrameById(root, 'capture_cluster__body')?.children.map((child) => child.id)).toEqual([
      'collector_primary',
      'collector_secondary',
      'collector_auxiliary',
    ]);
    expect(findFrameById(root, 'observe_cluster__body')?.children.map((child) => child.id)).toEqual([
      'observer_primary',
      'observer_secondary',
      'observer_tertiary',
      'observer_quaternary',
    ]);
    expect(root.children.map((child) => child.level)).toEqual([3, 3, 2, 2]);
    expect(snapshot.debug.inputGraph.nodes.map((node) => node.id)).toEqual([
      'capture_cluster',
      'normalize_cluster',
      'archive_cluster',
      'observe_cluster',
    ]);
    expect(snapshot.edges).toHaveLength(6);
    expect(snapshot.edges.every((edge) => edge.sections.length > 0)).toBe(true);

    const rawGeometry = collectRawGeometry(snapshot.nodes, snapshot.originX, snapshot.originY);
    for (const id of [
      'capture_cluster',
      'normalize_cluster',
      'archive_cluster',
      'observe_cluster',
      'collector_primary',
      'collector_secondary',
      'collector_auxiliary',
      'normalizer',
      'archive_node',
      'observer_primary',
      'observer_quaternary',
    ]) {
      const frame = findFrameById(root, id);
      const geometry = rawGeometry.get(id);
      expect(frame, `${id} should remain in the authored tree`).toBeTruthy();
      expect(geometry, `${id} should be present in raw ELK geometry`).toBeTruthy();
      expect({
        x: frame?._layout.placedX,
        y: frame?._layout.placedY,
        width: frame?._layout.placedW,
        height: frame?._layout.placedH,
      }).toEqual(geometry);
      expect(svg).toContain(`data-component-id="${id}"`);
    }

    expect(svg).toContain('telemetry');
    expect(svg).toContain('interface: events');
    expect(svg).toContain('durable');
    expect(svg).toContain('metrics');
    expect(svg).toContain('audit');
  });
});
