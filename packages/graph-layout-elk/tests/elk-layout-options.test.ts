import { describe, expect, it } from 'vitest';

import { buildElkGraph, buildLayeredLayoutOptions, buildSubgraphLayoutOptions } from '../src/index.js';

const BOX = { width: 192, height: 64 };

describe('ELK compound layout options', () => {
  it('buildSubgraphLayoutOptions ports Mermaid compound defaults into local ELK options', () => {
    expect(buildSubgraphLayoutOptions({
      kind: 'ordering-cluster',
      direction: 'LR',
      children: [{ id: 'leaf', ...BOX }],
    })).toEqual({
      'spacing.baseValue': '30',
      'nodeLabels.placement': '[H_CENTER V_TOP, INSIDE]',
      'elk.direction': 'RIGHT',
      'elk.hierarchyHandling': 'SEPARATE_CHILDREN',
    });
  });

  it('applies root and compound option defaults for clustered graphs', () => {
    const graph = buildElkGraph(
      {
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
            ],
          },
        ],
        edges: [],
      },
      buildLayeredLayoutOptions({ direction: 'TB', spacingProfile: 'normal' }),
    );

    expect(graph.layoutOptions['elk.direction']).toBe('DOWN');
    expect(graph.layoutOptions['elk.hierarchyHandling']).toBe('INCLUDE_CHILDREN');
    expect(graph.layoutOptions['elk.layered.considerModelOrder.strategy']).toBe('NODES_AND_EDGES');

    expect(graph.children[0]?.layoutOptions).toMatchObject({
      'spacing.baseValue': '30',
      'nodeLabels.placement': '[H_CENTER V_TOP, INSIDE]',
      'elk.direction': 'DOWN',
      'elk.hierarchyHandling': 'SEPARATE_CHILDREN',
    });
    expect(graph.children[0]?.children?.[0]?.layoutOptions).toMatchObject({
      'spacing.baseValue': '30',
      'nodeLabels.placement': '[H_CENTER V_TOP, INSIDE]',
      'elk.direction': 'RIGHT',
      'elk.hierarchyHandling': 'SEPARATE_CHILDREN',
    });
  });
});
