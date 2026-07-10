import { describe, expect, it } from 'vitest';

import type { GraphLayoutInput } from '@diagram-generator/graph-layout-core';

import {
  buildElkGraph,
  buildLayeredLayoutOptions,
  indexPlacedNodes,
  layoutLayered,
} from '../src/index.js';

const BOX = { width: 192, height: 64 };

function clusteredInput(): GraphLayoutInput {
  return {
    id: 'root',
    direction: 'TB',
    spacingProfile: 'normal',
    routeCrossHierarchyEdgesToBorders: true,
    nodes: [
      {
        id: 'provider',
        kind: 'compound',
        width: 0,
        height: 0,
        direction: 'TB',
        children: [
          { id: 'manual', ...BOX },
        ],
      },
      {
        id: 'services_row',
        kind: 'compound',
        width: 0,
        height: 0,
        direction: 'LR',
        children: [
          { id: 'service_a', ...BOX },
          { id: 'service_b', ...BOX },
        ],
      },
      {
        id: 'endpoints_row',
        kind: 'compound',
        width: 0,
        height: 0,
        direction: 'LR',
        children: [
          { id: 'endpoint_a', ...BOX },
          { id: 'endpoint_b', ...BOX },
          { id: 'endpoint_c', ...BOX },
        ],
      },
    ],
    edges: [
      { id: 'cross', source: 'manual', target: 'endpoint_c' },
      { id: 'local', source: 'service_a', target: 'service_b' },
    ],
  };
}

function authoredOrderRowsInput(): GraphLayoutInput {
  return {
    id: 'root',
    direction: 'TB',
    spacingProfile: 'normal',
    routeCrossHierarchyEdgesToBorders: true,
    nodes: [
      {
        id: 'provider',
        kind: 'compound',
        width: 0,
        height: 0,
        direction: 'TB',
        children: [
          { id: 'origin', width: 304, height: 64 },
          {
            id: 'services_row',
            kind: 'compound',
            width: 0,
            height: 0,
            direction: 'LR',
            children: [
              { id: 'service_a', width: 184, height: 88 },
              { id: 'service_b', width: 184, height: 88 },
              { id: 'service_c', width: 184, height: 88 },
            ],
          },
          {
            id: 'endpoints_row',
            kind: 'compound',
            width: 0,
            height: 0,
            direction: 'LR',
            children: [
              { id: 'endpoint_a', width: 240, height: 64 },
              { id: 'endpoint_b', width: 240, height: 64 },
              { id: 'endpoint_c', width: 240, height: 64 },
            ],
          },
        ],
      },
    ],
    edges: [
      { id: 'origin_a', source: 'origin', target: 'service_a' },
      { id: 'origin_b', source: 'origin', target: 'service_b' },
      { id: 'origin_c', source: 'origin', target: 'service_c' },
      { id: 'service_a_endpoint_a', source: 'service_a', target: 'endpoint_a' },
      { id: 'service_b_endpoint_b', source: 'service_b', target: 'endpoint_b' },
      { id: 'service_c_endpoint_c', source: 'service_c', target: 'endpoint_c' },
    ],
  };
}

describe('ELK clustered layout', () => {
  it('builds a border-routed clustered graph without fixed implicit ports on cross-hierarchy leaves', () => {
    const graph = buildElkGraph(
      clusteredInput(),
      buildLayeredLayoutOptions({ direction: 'TB', spacingProfile: 'normal' }),
    );
    const provider = graph.children.find((node) => node.id === 'provider');
    const servicesRow = graph.children.find((node) => node.id === 'services_row');
    const endpointsRow = graph.children.find((node) => node.id === 'endpoints_row');
    const cross = graph.edges.find((edge) => edge.id === 'cross');

    expect(graph.layoutOptions['elk.hierarchyHandling']).toBe('INCLUDE_CHILDREN');
    expect(provider?.children?.[0]?.ports).toBeUndefined();
    expect(endpointsRow?.children?.[2]?.ports).toBeUndefined();
    expect(servicesRow?.layoutOptions?.['elk.hierarchyHandling']).toBeDefined();
    expect(endpointsRow?.layoutOptions?.['elk.hierarchyHandling']).toBeDefined();
    expect(cross).toMatchObject({
      id: 'cross',
      sources: ['manual'],
      targets: ['endpoint_c'],
    });
  });

  it('preserves authored left-to-right row order for multi-edge clustered fan-outs', async () => {
    const result = await layoutLayered(authoredOrderRowsInput());
    const nodes = indexPlacedNodes(result.nodes);

    expect(nodes.get('service_a')!.x).toBeLessThan(nodes.get('service_b')!.x);
    expect(nodes.get('service_b')!.x).toBeLessThan(nodes.get('service_c')!.x);
    expect(nodes.get('endpoint_a')!.x).toBeLessThan(nodes.get('endpoint_b')!.x);
    expect(nodes.get('endpoint_b')!.x).toBeLessThan(nodes.get('endpoint_c')!.x);
  });

  it('uses merged shared source starts for no-port clustered fan-outs by default', async () => {
    const merged = await layoutLayered(authoredOrderRowsInput());
    const unmerged = await layoutLayered(authoredOrderRowsInput(), {
      optionOverrides: {
        'elk.layered.mergeEdges': 'false',
      },
    });
    const originEdgeIds = new Set(['origin_a', 'origin_b', 'origin_c']);
    const mergedStarts = new Set(merged.edges
      .filter((edge) => originEdgeIds.has(edge.id))
      .map((edge) => `${edge.sections[0]?.startPoint.x},${edge.sections[0]?.startPoint.y}`));
    const unmergedStarts = new Set(unmerged.edges
      .filter((edge) => originEdgeIds.has(edge.id))
      .map((edge) => `${edge.sections[0]?.startPoint.x},${edge.sections[0]?.startPoint.y}`));

    expect(mergedStarts.size).toBe(1);
    expect(unmergedStarts.size).toBeGreaterThan(1);
  });
});
