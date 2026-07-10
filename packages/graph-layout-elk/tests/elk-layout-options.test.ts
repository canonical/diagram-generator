import { describe, expect, it } from 'vitest';

import { buildElkGraph, buildLayeredLayoutOptions, buildSubgraphLayoutOptions } from '../src/index.js';

const BOX = { width: 192, height: 64 };

describe('ELK compound layout options', () => {
  it('keeps layered routing options configurable with safe family defaults', () => {
    const defaults = buildLayeredLayoutOptions({
      direction: 'TB',
      spacingProfile: 'normal',
    });
    expect(defaults).toMatchObject({
      'elk.layered.mergeEdges': 'false',
      'elk.layered.mergeHierarchyEdges': 'true',
      'elk.edgeLabels.inline': 'true',
      'elk.edgeLabels.placement': 'CENTER',
      'elk.layered.crossingMinimization.forceNodeModelOrder': 'false',
    });
    expect(defaults['elk.layered.considerModelOrder.strategy']).toBeUndefined();

    expect(buildLayeredLayoutOptions({
      direction: 'TB',
      spacingProfile: 'normal',
      optionOverrides: {
        'elk.layered.mergeEdges': 'true',
        'elk.layered.mergeHierarchyEdges': 'false',
        'elk.edgeLabels.inline': 'false',
        'elk.edgeLabels.placement': 'HEAD',
        'elk.layered.considerModelOrder.strategy': 'PREFER_EDGES',
        'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
      },
    })).toMatchObject({
      'elk.layered.mergeEdges': 'true',
      'elk.layered.mergeHierarchyEdges': 'false',
      'elk.edgeLabels.inline': 'false',
      'elk.edgeLabels.placement': 'HEAD',
      'elk.layered.considerModelOrder.strategy': 'PREFER_EDGES',
      'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
    });
  });

  it('buildSubgraphLayoutOptions ports Mermaid compound defaults into local ELK options', () => {
    expect(buildSubgraphLayoutOptions({
      kind: 'ordering-cluster',
      direction: 'LR',
      children: [{ id: 'leaf', ...BOX }],
    }, 'layered')).toEqual({
      'elk.algorithm': 'layered',
      'spacing.baseValue': '30',
      'nodeLabels.placement': '[H_CENTER V_TOP, INSIDE]',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
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
    expect(graph.layoutOptions['elk.hierarchyHandling']).toBeUndefined();
    expect(graph.layoutOptions['elk.layered.considerModelOrder.strategy']).toBe('NODES_AND_EDGES');
    expect(graph.layoutOptions['org.eclipse.elk.layered.considerModelOrder.components']).toBe('MODEL_ORDER');

    expect(graph.children[0]?.layoutOptions).toMatchObject({
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'spacing.baseValue': '30',
      'nodeLabels.placement': '[H_CENTER V_TOP, INSIDE]',
      'elk.hierarchyHandling': 'SEPARATE_CHILDREN',
    });
    expect(graph.children[0]?.children?.[0]?.layoutOptions).toMatchObject({
      'elk.algorithm': 'layered',
      'spacing.baseValue': '30',
      'nodeLabels.placement': '[H_CENTER V_TOP, INSIDE]',
      'elk.direction': 'RIGHT',
      'elk.hierarchyHandling': 'SEPARATE_CHILDREN',
    });
    expect(graph.children[0]?.layoutOptions?.['org.eclipse.elk.nodeSize.constraints']).toBeUndefined();
    expect(graph.children[0]?.layoutOptions?.['org.eclipse.elk.nodeSize.minimum']).toBeUndefined();
  });

  it('lets top-level compounds inherit root elk.direction overrides while nested rows keep local direction', () => {
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
              { id: 'issuer', ...BOX },
              {
                id: 'services_row',
                kind: 'ordering-cluster',
                width: 0,
                height: 0,
                direction: 'LR',
                children: [
                  {
                    id: 'service_group',
                    kind: 'compound',
                    width: 0,
                    height: 0,
                    direction: 'TB',
                    children: [
                      { id: 'service_a', ...BOX },
                      { id: 'service_b', ...BOX },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        edges: [],
      },
      buildLayeredLayoutOptions({
        direction: 'TB',
        spacingProfile: 'normal',
        optionOverrides: {
          'elk.direction': 'RIGHT',
          'elk.spacing.nodeNode': '120',
        },
      }),
    );

    expect(graph.children[0]?.layoutOptions).toMatchObject({
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '120',
    });
    expect(graph.children[0]?.children?.[1]?.layoutOptions).toMatchObject({
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '120',
    });
    expect(graph.children[0]?.children?.[1]?.children?.[0]?.layoutOptions).toMatchObject({
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '120',
      'spacing.baseValue': '30',
      'nodeLabels.placement': '[H_CENTER V_TOP, INSIDE]',
      'elk.hierarchyHandling': 'SEPARATE_CHILDREN',
    });
  });

  it('preserves authored compound widths and heights in the ELK graph', () => {
    const graph = buildElkGraph(
      {
        id: 'root',
        direction: 'TB',
        spacingProfile: 'normal',
        nodes: [
          {
            id: 'provider',
            kind: 'compound',
            width: 1536,
            height: 232,
            direction: 'TB',
            contentAlignment: 'top-center',
            children: [
              { id: 'vault', ...BOX },
              { id: 'issuer', width: 304, height: 64 },
            ],
          },
        ],
        edges: [],
      },
      buildLayeredLayoutOptions({ direction: 'TB', spacingProfile: 'normal' }),
    );

    expect(graph.children[0]).toMatchObject({
      id: 'provider',
      width: 1536,
      height: 232,
    });
    expect(graph.children[0]?.layoutOptions).toMatchObject({
      'org.eclipse.elk.contentAlignment': '[V_TOP, H_CENTER]',
      'org.eclipse.elk.nodeSize.constraints': 'MINIMUM_SIZE',
      'org.eclipse.elk.nodeSize.minimum': '(232,1536)',
    });
    expect(graph.children[0]?.children?.[0]?.layoutOptions?.['org.eclipse.elk.nodeSize.constraints']).toBeUndefined();
    expect(graph.children[0]?.children?.[0]?.layoutOptions?.['org.eclipse.elk.nodeSize.minimum']).toBeUndefined();
  });

  it('routes cluster-lowered cross-hierarchy edges to borders instead of fixed implicit ports', () => {
    const graph = buildElkGraph(
      {
        id: 'root',
        direction: 'TB',
        routeCrossHierarchyEdgesToBorders: true,
        nodes: [
          {
            id: 'provider',
            kind: 'compound',
            width: 1536,
            height: 232,
            direction: 'TB',
            children: [
              { id: 'manual', width: 304, height: 80 },
            ],
          },
          {
            id: 'openstack',
            kind: 'compound',
            width: 640,
            height: 160,
            direction: 'TB',
            children: [
              { id: 'octavia', width: 304, height: 80 },
            ],
          },
        ],
        edges: [
          { id: 'edge-1', source: 'manual', target: 'octavia' },
        ],
      },
      buildLayeredLayoutOptions({ direction: 'TB', spacingProfile: 'normal' }),
    );

    const provider = graph.children[0];
    const openstack = graph.children[1];
    expect(provider?.children?.[0]?.ports).toBeUndefined();
    expect(openstack?.children?.[0]?.ports).toBeUndefined();
    expect(provider?.layoutOptions?.['elk.hierarchyHandling']).toBe('INCLUDE_CHILDREN');
    expect(openstack?.layoutOptions?.['elk.hierarchyHandling']).toBe('INCLUDE_CHILDREN');
    expect(provider?.layoutOptions?.['elk.layered.considerModelOrder.strategy']).toBeUndefined();
    expect(openstack?.layoutOptions?.['elk.layered.considerModelOrder.strategy']).toBeUndefined();
    expect(graph.edges[0]).toMatchObject({
      id: 'edge-1',
      sources: ['manual'],
      targets: ['octavia'],
    });
  });

  it('suppresses implicit fixed ports on promoted cross-hierarchy endpoints', () => {
    const graph = buildElkGraph(
      {
        id: 'root',
        direction: 'TB',
        nodes: [
          {
            id: 'planning',
            kind: 'compound',
            width: 0,
            height: 0,
            direction: 'TB',
            children: [
              { id: 'define', ...BOX },
            ],
          },
          {
            id: 'implementation',
            kind: 'compound',
            width: 0,
            height: 0,
            direction: 'TB',
            children: [
              {
                id: 'devteam',
                kind: 'compound',
                width: 0,
                height: 0,
                direction: 'TB',
                ports: [
                  {
                    id: 'devteam__boundary_target_implement_edge-1_left',
                    anchor: { kind: 'point', side: 'left', x: 0, y: 32 },
                    width: 0,
                    height: 0,
                  },
                ],
                children: [
                  { id: 'implement', ...BOX },
                ],
              },
            ],
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'define',
            target: 'devteam',
            targetPort: 'devteam__boundary_target_implement_edge-1_left',
          },
        ],
      },
      buildLayeredLayoutOptions({ direction: 'TB', spacingProfile: 'normal' }),
    );

    const planning = graph.children[0];
    const implementation = graph.children[1];
    expect(planning?.children?.[0]?.ports).toBeUndefined();
    expect(implementation?.children?.[0]?.ports?.map((port) => port.id)).toEqual([
      'devteam__boundary_target_implement_edge-1_left',
    ]);
    expect(graph.edges[0]).toMatchObject({
      id: 'edge-1',
      sources: ['define'],
      targets: ['devteam__boundary_target_implement_edge-1_left'],
    });
  });
});
