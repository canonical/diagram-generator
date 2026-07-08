import { describe, expect, it } from 'vitest';

import type { GraphLayoutInput } from '@diagram-generator/graph-layout-core';

import { buildElkGraph, buildLayeredLayoutOptions } from '../src/index.js';

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
            ],
          },
        ],
      },
    ],
    edges: [
      { id: 'cross', source: 'service_a', target: 'endpoint_b' },
      { id: 'local', source: 'service_a', target: 'service_b' },
    ],
  };
}

describe('ELK edge LCA lowering', () => {
  it('attaches a cross-cluster edge to its LCA compound and promotes that ancestor', () => {
    const graph = buildElkGraph(
      clusteredInput(),
      buildLayeredLayoutOptions({ direction: 'TB', spacingProfile: 'normal' }),
    );

    const provider = graph.children[0]!;
    expect(graph.edges).toEqual([]);
    expect(provider.edges?.map((edge) => edge.id)).toContain('cross');
    expect(provider.layoutOptions?.['elk.hierarchyHandling']).toBe('INCLUDE_CHILDREN');
  });

  it('keeps an intra-cluster edge local to the owning ordering cluster', () => {
    const graph = buildElkGraph(
      clusteredInput(),
      buildLayeredLayoutOptions({ direction: 'TB', spacingProfile: 'normal' }),
    );

    const provider = graph.children[0]!;
    const servicesRow = provider.children?.find((child) => child.id === 'services_row');

    expect(servicesRow?.edges?.map((edge) => edge.id)).toContain('local');
    expect(provider.edges?.map((edge) => edge.id) ?? []).not.toContain('local');
  });
});
