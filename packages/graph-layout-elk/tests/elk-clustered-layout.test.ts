import { describe, expect, it } from 'vitest';

import type { GraphLayoutInput } from '@diagram-generator/graph-layout-core';

import {
  edgeEndpointsTouchEndpointNodes,
  indexPlacedNodes,
  layoutLayered,
} from '../src/index.js';

const BOX = { width: 192, height: 64 };

function clusteredInput(): GraphLayoutInput {
  return {
    id: 'root',
    direction: 'TB',
    spacingProfile: 'normal',
    nodes: [
      {
        id: 'provider',
        kind: 'compound',
        width: 0,
        height: 0,
        direction: 'TB',
        children: [
          {
            id: 'services_row',
            kind: 'ordering-cluster',
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
            kind: 'ordering-cluster',
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
      },
    ],
    edges: [
      { id: 'cross', source: 'service_a', target: 'endpoint_c' },
      { id: 'local', source: 'service_a', target: 'service_b' },
    ],
  };
}

function authoredOrderRowsInput(): GraphLayoutInput {
  return {
    id: 'root',
    direction: 'TB',
    spacingProfile: 'normal',
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
            kind: 'ordering-cluster',
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
            kind: 'ordering-cluster',
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
  it('lays out clustered LCA-routed edges with native model order and no crash', async () => {
    const result = await layoutLayered(clusteredInput());
    const nodes = indexPlacedNodes(result.nodes);
    const provider = nodes.get('provider');
    const servicesRow = nodes.get('services_row');
    const endpointsRow = nodes.get('endpoints_row');
    const cross = result.edges.find((edge) => edge.id === 'cross');

    expect(provider).toBeDefined();
    expect(servicesRow).toBeDefined();
    expect(endpointsRow).toBeDefined();
    expect(servicesRow!.y).toBeLessThan(endpointsRow!.y);
    expect(cross?.sections.length).toBeGreaterThan(0);
    expect(cross?.sections[0]?.bendPoints?.length ?? 0).toBeGreaterThan(0);
    expect(
      edgeEndpointsTouchEndpointNodes(cross!.sections[0]!, cross!, nodes, 4),
      'cross-cluster route should touch the source and target node boundaries',
    ).toBe(true);
  });

  it('preserves authored left-to-right row order for multi-edge clustered fan-outs', async () => {
    const result = await layoutLayered(authoredOrderRowsInput());
    const nodes = indexPlacedNodes(result.nodes);

    expect(nodes.get('service_a')!.x).toBeLessThan(nodes.get('service_b')!.x);
    expect(nodes.get('service_b')!.x).toBeLessThan(nodes.get('service_c')!.x);
    expect(nodes.get('endpoint_a')!.x).toBeLessThan(nodes.get('endpoint_b')!.x);
    expect(nodes.get('endpoint_b')!.x).toBeLessThan(nodes.get('endpoint_c')!.x);
  });
});
