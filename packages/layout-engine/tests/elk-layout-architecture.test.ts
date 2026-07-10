import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { GraphLayoutResult, PlacedEdge, PlacedNode } from '@diagram-generator/graph-layout-core';
import { computeNodeIntersection } from '@diagram-generator/graph-layout-elk';

import { loadFrameYaml } from '../src/frame-yaml-loader.js';
import { layoutElkFrameDiagram } from '../src/elk-layout.js';
import { MockTextAdapter } from '../src/text-measure.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FRAMES_DIR = join(__dirname, '../../..', 'scripts/diagrams/frames');

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

type DebugTreeNode = {
  id: string;
  kind: 'frame' | 'synthetic-heading' | 'synthetic-body' | 'annotation';
  status: 'graph-node' | 'flattened' | 'synthetic' | 'annotation' | 'omitted';
  children: DebugTreeNode[];
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

function flattenPlacedNodes(
  nodes: PlacedNode[],
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
    if (node.children?.length) {
      flattenPlacedNodes(node.children, originX, originY, out);
    }
  }
  return out;
}

function collectGraphNodeIds(
  nodes: Array<{ id: string; children?: Array<{ id: string; children?: unknown[] }> }>,
  out = new Set<string>(),
): Set<string> {
  for (const node of nodes) {
    out.add(node.id);
    if (node.children?.length) {
      collectGraphNodeIds(node.children as Array<{ id: string; children?: unknown[] }>, out);
    }
  }
  return out;
}

function elkEdgeToLayoutPath(edge: PlacedEdge, originX: number, originY: number): [number, number][] {
  const points: [number, number][] = [];
  for (const section of edge.sections) {
    const start: [number, number] = [
      section.startPoint.x + originX,
      section.startPoint.y + originY,
    ];
    const last = points[points.length - 1];
    if (!last || last[0] !== start[0] || last[1] !== start[1]) {
      points.push(start);
    }
    for (const bend of section.bendPoints ?? []) {
      points.push([bend.x + originX, bend.y + originY]);
    }
    points.push([section.endPoint.x + originX, section.endPoint.y + originY]);
  }
  return points;
}

function dedupeConsecutivePoints(points: [number, number][]): [number, number][] {
  if (points.length <= 1) {
    return points;
  }
  const deduped: [number, number][] = [points[0]!];
  for (let index = 1; index < points.length; index += 1) {
    const previous = deduped[deduped.length - 1]!;
    const current = points[index]!;
    if (previous[0] !== current[0] || previous[1] !== current[1]) {
      deduped.push(current);
    }
  }
  return deduped;
}

function trimLayoutPathToFrameBounds(
  points: [number, number][],
  sourceFrame: FrameLike,
  targetFrame: FrameLike,
): [number, number][] {
  if (points.length < 2) {
    return points;
  }

  const asPoints = points.map(([x, y]) => ({ x, y }));
  const sourceBounds = {
    x: sourceFrame._layout.placedX + sourceFrame._layout.placedW / 2,
    y: sourceFrame._layout.placedY + sourceFrame._layout.placedH / 2,
    width: sourceFrame._layout.placedW,
    height: sourceFrame._layout.placedH,
  };
  const targetBounds = {
    x: targetFrame._layout.placedX + targetFrame._layout.placedW / 2,
    y: targetFrame._layout.placedY + targetFrame._layout.placedH / 2,
    width: targetFrame._layout.placedW,
    height: targetFrame._layout.placedH,
  };
  const onBorder = (
    point: { x: number; y: number },
    rect: { left: number; right: number; top: number; bottom: number },
    tolerance = 0.1,
  ): boolean => (
    (
      Math.abs(point.x - rect.left) <= tolerance
      || Math.abs(point.x - rect.right) <= tolerance
    ) && point.y >= rect.top - tolerance && point.y <= rect.bottom + tolerance
  ) || (
    (
      Math.abs(point.y - rect.top) <= tolerance
      || Math.abs(point.y - rect.bottom) <= tolerance
    ) && point.x >= rect.left - tolerance && point.x <= rect.right + tolerance
  );
  const sourceRect = {
    left: sourceFrame._layout.placedX,
    right: sourceFrame._layout.placedX + sourceFrame._layout.placedW,
    top: sourceFrame._layout.placedY,
    bottom: sourceFrame._layout.placedY + sourceFrame._layout.placedH,
  };
  if (!onBorder(asPoints[0]!, sourceRect)) {
    asPoints[0] = computeNodeIntersection(
      {},
      sourceBounds,
      asPoints[1]!,
      { x: sourceBounds.x, y: sourceBounds.y },
    );
  }
  const targetRect = {
    left: targetFrame._layout.placedX,
    right: targetFrame._layout.placedX + targetFrame._layout.placedW,
    top: targetFrame._layout.placedY,
    bottom: targetFrame._layout.placedY + targetFrame._layout.placedH,
  };
  const lastIndex = asPoints.length - 1;
  if (!onBorder(asPoints[lastIndex]!, targetRect)) {
    asPoints[lastIndex] = computeNodeIntersection(
      {},
      targetBounds,
      asPoints[asPoints.length - 2]!,
      { x: targetBounds.x, y: targetBounds.y },
    );
  }
  return asPoints.map((point) => [point.x, point.y]);
}

function findPlacedEdge(
  edges: PlacedEdge[],
  arrow: { id?: string; source: string; target: string },
): PlacedEdge | undefined {
  const source = arrow.source.split('.')[0]!;
  const target = arrow.target.split('.')[0]!;
  return (arrow.id ? edges.find((edge) => edge.id === arrow.id) : undefined)
    ?? edges.find((edge) => edge.source === source && edge.target === target);
}

describe('ELK cluster-lowered architecture', () => {
  it('keeps ELK-owned node geometry and edge sections on the cluster-lowered TLS path', async () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'tls-certificate-provider-topology.yaml'));
    const adapter = new MockTextAdapter();
    const layout = await layoutElkFrameDiagram(diagram, adapter);
    const snapshot = layout.elkSnapshot as GraphLayoutResult & {
      originX: number;
      originY: number;
      debug: {
        authoredTree: DebugTreeNode;
        inputGraph: {
          nodes: Array<{ id: string; children?: Array<{ id: string; children?: unknown[] }> }>;
        };
        flattenedFrameIds: string[];
      };
    };

    expect(snapshot).toBeDefined();
    const root = diagram.root as unknown as FrameLike;
    const placedById = flattenPlacedNodes(snapshot.nodes, snapshot.originX, snapshot.originY);
    const inputNodeIds = collectGraphNodeIds(snapshot.debug.inputGraph.nodes);
    expect(inputNodeIds).not.toContain('octavia_certificates');
    expect(inputNodeIds).not.toContain('public_certificates');
    expect(inputNodeIds).not.toContain('services_row');
    expect(inputNodeIds).not.toContain('load_balancer_endpoint_row');
    expect(snapshot.debug.flattenedFrameIds).not.toContain('octavia_certificates');
    expect(snapshot.debug.flattenedFrameIds).not.toContain('public_certificates');
    expect(snapshot.debug.inputGraph.nodes.map((node) => node.id)).toEqual([
      'tls_provider',
      'openstack_services',
      'load_balancers',
    ]);
    expect(snapshot.debug.inputGraph.edges.map((edge) => edge.id)).toEqual([
      'edge-0',
      'edge-1',
      'edge-2',
      'edge-3',
      'edge-4',
      'edge-5',
      'edge-6',
    ]);

    for (const nodeId of inputNodeIds) {
      const frame = findFrameById(root, nodeId);
      const placed = placedById.get(nodeId);
      expect(frame, `missing frame ${nodeId}`).not.toBeNull();
      expect(placed, `missing ELK placement ${nodeId}`).toBeDefined();
      expect(frame?._layout?.placedX).toBe(placed?.x);
      expect(frame?._layout?.placedY).toBe(placed?.y);
      expect(frame?._layout?.placedW).toBe(placed?.width);
      expect(frame?._layout?.placedH).toBe(placed?.height);
    }

    expect(diagram.arrows).toHaveLength(7);
    for (const arrow of diagram.arrows) {
      const edge = findPlacedEdge(snapshot.edges, arrow);
      expect(edge, `missing ELK edge for ${arrow.id ?? `${arrow.source}->${arrow.target}`}`).toBeDefined();
      const sourceFrame = findFrameById(root, arrow.source.split('.')[0]!);
      const targetFrame = findFrameById(root, arrow.target.split('.')[0]!);
      expect(sourceFrame).not.toBeNull();
      expect(targetFrame).not.toBeNull();
      expect(edge?.sections.length ?? 0, `${arrow.id} must be routed by raw ELK sections`).toBeGreaterThan(0);
      expect(edge?.labels?.length ?? 0, `${arrow.id} must expose raw ELK label geometry`).toBe(1);
      expect(
        [edge?.labels?.[0]?.x, edge?.labels?.[0]?.y],
        `${arrow.id} label should not be the ELK missing-label sentinel`,
      ).not.toEqual([0, 0]);

      const expectedPath = dedupeConsecutivePoints(trimLayoutPathToFrameBounds(
        elkEdgeToLayoutPath(edge!, snapshot.originX, snapshot.originY),
        sourceFrame!,
        targetFrame!,
      ));

      expect(arrow.layoutPath).toEqual(expectedPath);
      expect(arrow.waypoints).toEqual(expectedPath.slice(1, -1));
    }
  });
});
