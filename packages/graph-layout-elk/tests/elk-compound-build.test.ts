import { describe, expect, it } from 'vitest';

import type { GraphLayoutInput } from '@diagram-generator/graph-layout-core';

import {
  buildElkGraph,
  buildInputTreeData,
  buildLayeredLayoutOptions,
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
    edges: [],
  };
}

describe('ELK compound graph build', () => {
  it('builds parent and child lookup maps for nested compounds and ordering clusters', () => {
    const input = clusteredInput();
    const tree = buildInputTreeData(input.nodes, input.id);

    expect(tree.parentById).toEqual({
      provider: 'root',
      services_row: 'provider',
      service_a: 'services_row',
      service_b: 'services_row',
      endpoints_row: 'provider',
      endpoint_a: 'endpoints_row',
      endpoint_b: 'endpoints_row',
      endpoint_c: 'endpoints_row',
    });
    expect(tree.childrenById).toEqual({
      root: ['provider'],
      provider: ['services_row', 'endpoints_row'],
      services_row: ['service_a', 'service_b'],
      endpoints_row: ['endpoint_a', 'endpoint_b', 'endpoint_c'],
    });
  });

  it('emits compounds with nested children and preserves measured leaf sizes', () => {
    const graph = buildElkGraph(
      clusteredInput(),
      buildLayeredLayoutOptions({ direction: 'TB', spacingProfile: 'normal' }),
    );

    const provider = graph.children[0]!;
    const servicesRow = provider.children?.[0]!;
    const serviceA = servicesRow.children?.[0]!;
    const serviceB = servicesRow.children?.[1]!;

    expect(provider.width).toBeUndefined();
    expect(provider.height).toBeUndefined();
    expect(provider.children?.map((child) => child.id)).toEqual(['services_row', 'endpoints_row']);
    expect(servicesRow.width).toBeUndefined();
    expect(servicesRow.height).toBeUndefined();
    expect(serviceA).toMatchObject(BOX);
    expect(serviceB).toMatchObject(BOX);
    expect(servicesRow.labels).toBeUndefined();
  });
});
