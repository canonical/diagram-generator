import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { GraphLayoutInput } from '@diagram-generator/graph-layout-core';
import { GRID_BASELINE_PX } from '@diagram-generator/graph-layout-core';

import {
  ELK_LAYERED_PARAM_SPECS,
  edgeEndpointsTouchEndpointNodes,
  edgeEndpointsTouchLeaves,
  indexPlacedNodes,
  layoutLayered,
  layoutLayeredForFamily,
  layeredConfigForFamily,
  buildLayeredLayoutOptions,
  stripImplementationOwnedElkLayeredOverrides,
} from '../src/index.js';
import { buildElkGraph } from '../src/elk-graph-builder.js';

const BOX = { width: 192, height: 64 };

function chainInput(direction: GraphLayoutInput['direction'], ids: string[]): GraphLayoutInput {
  return {
    id: 'root',
    direction,
    nodes: ids.map((id) => ({ id, ...BOX })),
    edges: ids.slice(0, -1).map((id, i) => ({
      id: `${id}->${ids[i + 1]}`,
      source: id,
      target: ids[i + 1]!,
    })),
  };
}

function onGrid(n: number): boolean {
  return Math.abs(n % GRID_BASELINE_PX) < 1e-6 || Math.abs(n % GRID_BASELINE_PX - GRID_BASELINE_PX) < 1e-6;
}

describe('ELK layered (Sugiyama)', () => {
  it('lays out a TB chain with monotonic rank (increasing Y)', async () => {
    const result = await layoutLayered(chainInput('TB', ['a', 'b', 'c']));
    const nodes = indexPlacedNodes(result.nodes);

    expect(Math.min(...[...nodes.values()].map((node) => node.y))).toBe(0);
    expect(nodes.get('a')!.y).toBeLessThan(nodes.get('b')!.y);
    expect(nodes.get('b')!.y).toBeLessThan(nodes.get('c')!.y);

    for (const node of nodes.values()) {
      expect(onGrid(node.x)).toBe(true);
      expect(onGrid(node.y)).toBe(true);
    }
  });

  it('lays out an LR chain with monotonic rank (increasing X)', async () => {
    const result = await layoutLayered(chainInput('LR', ['ingress', 'service', 'store']));
    const nodes = indexPlacedNodes(result.nodes);

    expect(Math.min(...[...nodes.values()].map((node) => node.x))).toBe(0);
    expect(nodes.get('ingress')!.x).toBeLessThan(nodes.get('service')!.x);
    expect(nodes.get('service')!.x).toBeLessThan(nodes.get('store')!.x);
  });

  it('lays out a BT chain with monotonic rank (decreasing Y)', async () => {
    const result = await layoutLayered(chainInput('BT', ['a', 'b', 'c']));
    const nodes = indexPlacedNodes(result.nodes);

    expect(nodes.get('a')!.y).toBeGreaterThan(nodes.get('b')!.y);
    expect(nodes.get('b')!.y).toBeGreaterThan(nodes.get('c')!.y);
  });

  it('lays out an RL chain with monotonic rank (decreasing X)', async () => {
    const result = await layoutLayered(chainInput('RL', ['ingress', 'service', 'store']));
    const nodes = indexPlacedNodes(result.nodes);

    expect(nodes.get('ingress')!.x).toBeGreaterThan(nodes.get('service')!.x);
    expect(nodes.get('service')!.x).toBeGreaterThan(nodes.get('store')!.x);
  });

  it('places fork siblings on the same rank (equal Y for TB)', async () => {
    const result = await layoutLayered({
      id: 'root',
      direction: 'TB',
      nodes: [
        { id: 'root_node', ...BOX },
        { id: 'left', ...BOX },
        { id: 'right', ...BOX },
      ],
      edges: [
        { id: 'e1', source: 'root_node', target: 'left' },
        { id: 'e2', source: 'root_node', target: 'right' },
      ],
    });
    const nodes = indexPlacedNodes(result.nodes);

    expect(nodes.get('root_node')!.y).toBeLessThan(nodes.get('left')!.y);
    expect(nodes.get('left')!.y).toBe(nodes.get('right')!.y);
  });

  it('returns routed edge sections for orthogonal routing', async () => {
    const result = await layoutLayered(chainInput('TB', ['step1', 'step2']));
    expect(result.edges.length).toBe(1);
    const edge = result.edges[0]!;
    expect(edge.sections.length).toBeGreaterThan(0);
    expect(edge.sections[0]!.startPoint).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
  });

  it('routes explicit side-anchored ports through true midpoint coordinates', async () => {
    const result = await layoutLayered({
      id: 'root',
      direction: 'TB',
      nodes: [
        {
          id: 'a',
          ...BOX,
          ports: [
            { id: 'a__top', anchor: { kind: 'side', side: 'top' } },
            { id: 'a__right', anchor: { kind: 'side', side: 'right' } },
            { id: 'a__bottom', anchor: { kind: 'side', side: 'bottom' } },
            { id: 'a__left', anchor: { kind: 'side', side: 'left' } },
          ],
        },
        {
          id: 'b',
          ...BOX,
          ports: [
            { id: 'b__top', anchor: { kind: 'side', side: 'top' } },
            { id: 'b__right', anchor: { kind: 'side', side: 'right' } },
            { id: 'b__bottom', anchor: { kind: 'side', side: 'bottom' } },
            { id: 'b__left', anchor: { kind: 'side', side: 'left' } },
          ],
        },
      ],
      edges: [{
        id: 'e',
        source: 'a',
        target: 'b',
        sourcePort: 'a__bottom',
        targetPort: 'b__top',
      }],
    });

    expect(result.edges[0]?.sections[0]?.startPoint).toEqual({ x: BOX.width / 2, y: BOX.height });
    expect(result.edges[0]?.sections[0]?.endPoint).toEqual({ x: BOX.width / 2, y: BOX.height + 24 });
  });

  it('assigns a later reciprocal edge to alternate side ports without post-routing overrides', async () => {
    const result = await layoutLayered({
      id: 'root',
      direction: 'TB',
      nodes: [{ id: 'cloud', ...BOX }, { id: 'client', ...BOX }],
      edges: [
        { id: 'request', source: 'client', target: 'cloud' },
        { id: 'return', source: 'cloud', target: 'client' },
      ],
    });

    const request = result.edges.find((edge) => edge.id === 'request');
    const returning = result.edges.find((edge) => edge.id === 'return');

    expect(request).toMatchObject({
      sourcePortSide: 'bottom',
      targetPortSide: 'top',
    });
    expect(returning).toMatchObject({
      sourcePortSide: 'right',
      targetPortSide: 'right',
    });
  });

  it('maps corpus families to TB vs LR per layout_mapping.py', () => {
    expect(layeredConfigForFamily('deployment_and_runtime_topology').direction).toBe('TB');
    expect(layeredConfigForFamily('process_and_workflow').direction).toBe('TB');
    expect(layeredConfigForFamily('data_flow_and_integration').direction).toBe('LR');
  });

  it('layouts compound hierarchy (nested group)', async () => {
    const result = await layoutLayered({
      id: 'root',
      direction: 'TB',
      nodes: [
        {
          id: 'cluster',
          width: 400,
          height: 200,
          children: [
            { id: 'pod_a', ...BOX },
            { id: 'pod_b', ...BOX },
          ],
        },
        { id: 'downstream', ...BOX },
      ],
      edges: [{ id: 'e1', source: 'pod_a', target: 'downstream' }],
    });

    const nodes = indexPlacedNodes(result.nodes);
    expect(nodes.has('cluster')).toBe(true);
    expect(nodes.has('pod_a')).toBe(true);
    expect(nodes.has('downstream')).toBe(true);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);

    const cluster = nodes.get('cluster')!;
    const podA = nodes.get('pod_a')!;
    expect(podA.x).toBeGreaterThanOrEqual(cluster.x);
    expect(podA.y).toBeGreaterThanOrEqual(cluster.y);
    expect(podA.x + podA.width).toBeLessThanOrEqual(cluster.x + cluster.width + GRID_BASELINE_PX);
  });

  it('routes corpus ubuntu-pro edges to leaf node boundaries', async () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const raw = JSON.parse(
      readFileSync(join(__dirname, '../fixtures/corpus-ubuntu-pro-wsl-deployment.graph.json'), 'utf8'),
    ) as GraphLayoutInput & { meta?: { diagramType?: string } };

    const stripLabels = (nodes: GraphLayoutInput['nodes']): GraphLayoutInput['nodes'] =>
      nodes.map(({ id, width, height, children }) => ({
        id,
        width,
        height,
        ...(children?.length ? { children: stripLabels(children) } : {}),
      }));

    const input: GraphLayoutInput = {
      id: raw.id,
      direction: raw.direction,
      spacingProfile: raw.spacingProfile,
      nodes: stripLabels(raw.nodes),
      edges: raw.edges,
    };

    const family = raw.meta?.diagramType ?? 'deployment_and_runtime_topology';
    const result = await layoutLayeredForFamily(family as 'deployment_and_runtime_topology', input);
    const nodes = indexPlacedNodes(result.nodes);

    for (const edge of result.edges) {
      for (const section of edge.sections) {
        expect(
          edgeEndpointsTouchEndpointNodes(section, edge, nodes, GRID_BASELINE_PX),
          `edge ${edge.id} endpoints should touch source/target boxes`,
        ).toBe(true);
      }
    }
  });

  it('routes corpus juju edges including intra-compound step5', async () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const raw = JSON.parse(
      readFileSync(join(__dirname, '../fixtures/corpus-juju-bootstrap-machines-process.graph.json'), 'utf8'),
    ) as GraphLayoutInput & { meta?: { diagramType?: string } };

    const stripLabels = (nodes: GraphLayoutInput['nodes']): GraphLayoutInput['nodes'] =>
      nodes.map(({ id, width, height, children }) => ({
        id,
        width,
        height,
        ...(children?.length ? { children: stripLabels(children) } : {}),
      }));

    const input: GraphLayoutInput = {
      id: raw.id,
      direction: raw.direction,
      spacingProfile: raw.spacingProfile,
      nodes: stripLabels(raw.nodes),
      edges: raw.edges,
    };

    const result = await layoutLayeredForFamily('process_and_workflow', input);
    const nodes = indexPlacedNodes(result.nodes);

    for (const edge of result.edges) {
      for (const section of edge.sections) {
        expect(
          edgeEndpointsTouchEndpointNodes(section, edge, nodes, GRID_BASELINE_PX),
          `edge ${edge.id} endpoints should touch source/target boxes`,
        ).toBe(true);
      }
    }
  });

  it('returns edge label geometry when label boxes are supplied', async () => {
    const result = await layoutLayered({
      id: 'root',
      direction: 'TB',
      nodes: [{ id: 'a', ...BOX }, { id: 'b', ...BOX }],
      edges: [{
        id: 'e1',
        source: 'a',
        target: 'b',
        labels: [{ text: 'step 1', width: 96, height: 24 }],
      }],
    });
    expect(result.edges[0]?.labels?.length).toBe(1);
    expect(result.edges[0]?.labels?.[0]?.text).toBe('step 1');
    expect(result.edges[0]?.labels?.[0]?.width).toBeGreaterThan(0);
  });

  it('layoutLayeredForFamily applies data-flow LR defaults', async () => {
    const result = await layoutLayeredForFamily('data_flow_and_integration', {
      id: 'root',
      nodes: [{ id: 'source', ...BOX }, { id: 'sink', ...BOX }],
      edges: [{ id: 'flow', source: 'source', target: 'sink' }],
    });
    expect(result.direction).toBe('LR');
    const nodes = indexPlacedNodes(result.nodes);
    expect(nodes.get('source')!.x).toBeLessThan(nodes.get('sink')!.x);
  });

  it('layoutLayeredForFamily accepts caller direction hints over family defaults', async () => {
    const result = await layoutLayeredForFamily(
      'process_and_workflow',
      {
        id: 'root',
        nodes: [{ id: 'source', ...BOX }, { id: 'sink', ...BOX }],
        edges: [{ id: 'flow', source: 'source', target: 'sink' }],
      },
      { direction: 'LR' },
    );

    expect(result.direction).toBe('LR');
    const nodes = indexPlacedNodes(result.nodes);
    expect(nodes.get('source')!.x).toBeLessThan(nodes.get('sink')!.x);
    expect(nodes.get('source')!.y).toBe(nodes.get('sink')!.y);
  });

  it('applies node-owned compound padding without forwarding it to the root graph', () => {
    const layoutOptions = buildLayeredLayoutOptions({
      direction: 'TB',
      spacingProfile: 'normal',
    });
    const graph = buildElkGraph({
      id: 'root',
      direction: 'TB',
      spacingProfile: 'normal',
      nodes: [
        {
          id: 'cluster',
          width: 400,
          height: 200,
          padding: { top: 16, left: 16, bottom: 16, right: 16 },
          children: [{ id: 'a', ...BOX }, { id: 'b', ...BOX }],
        },
      ],
      edges: [{ id: 'edge', source: 'a', target: 'b' }],
    }, layoutOptions);

    expect(graph.layoutOptions['elk.padding']).toBeUndefined();
    expect(graph.children[0]?.layoutOptions?.['elk.padding']).toBe('[top=16,left=16,bottom=16,right=16]');
  });

  it('generates fixed-side midpoint ports for endpoint nodes and routes LR edges through them', () => {
    const layoutOptions = buildLayeredLayoutOptions({
      direction: 'LR',
      spacingProfile: 'normal',
    });
    const graph = buildElkGraph({
      id: 'root',
      direction: 'LR',
      spacingProfile: 'normal',
      nodes: [
        { id: 'source', ...BOX },
        { id: 'target', ...BOX },
        { id: 'unused', ...BOX },
      ],
      edges: [{ id: 'flow', source: 'source', target: 'target' }],
    }, layoutOptions);

    expect(graph.layoutOptions['elk.portConstraints']).toBeUndefined();
    expect(layoutOptions['elk.edgeLabels.inline']).toBe('false');
    expect(graph.children[0]?.layoutOptions?.['elk.portConstraints']).toBe('FIXED_POS');
    expect(graph.children[1]?.layoutOptions?.['elk.portConstraints']).toBe('FIXED_POS');
    expect(graph.children[2]?.ports).toBeUndefined();

    expect(graph.children[0]?.ports?.map((port) => port.id)).toEqual([
      'source__top',
      'source__right',
      'source__bottom',
      'source__left',
    ]);
    expect(graph.children[0]?.ports?.[1]).toMatchObject({
      id: 'source__right',
      x: BOX.width,
      y: BOX.height / 2,
      layoutOptions: { 'org.eclipse.elk.port.side': 'EAST' },
    });
    expect(graph.children[1]?.ports?.[3]).toMatchObject({
      id: 'target__left',
      x: 0,
      y: BOX.height / 2,
      layoutOptions: { 'org.eclipse.elk.port.side': 'WEST' },
    });
    expect(graph.edges[0]).toMatchObject({
      sources: ['source__right'],
      targets: ['target__left'],
    });
  });

  it('respects explicit elk.direction overrides', () => {
    const layoutOptions = buildLayeredLayoutOptions({
      direction: 'TB',
      spacingProfile: 'normal',
      optionOverrides: {
        'elk.direction': 'LEFT',
      },
    });
    const graph = buildElkGraph({
      id: 'root',
      direction: 'TB',
      spacingProfile: 'normal',
      nodes: [{ id: 'a', ...BOX }, { id: 'b', ...BOX }],
      edges: [{ id: 'edge', source: 'a', target: 'b' }],
    }, layoutOptions);

    expect(layoutOptions['elk.portConstraints']).toBeUndefined();
    expect(graph.layoutOptions['elk.portConstraints']).toBeUndefined();
    expect(graph.edges[0]).toMatchObject({
      sources: ['a__left'],
      targets: ['b__right'],
    });
  });

  it('rejects unsupported implementation-owned override keys instead of silently ignoring them', () => {
    expect(() => buildLayeredLayoutOptions({
      direction: 'TB',
      spacingProfile: 'normal',
      optionOverrides: {
        'elk.edgeRouting': 'SPLINES',
        'elk.padding': '[top=16,left=16,bottom=16,right=16]',
        'elk.portConstraints': 'FREE',
        'elk.spacing.nodeNode': '48',
      },
    })).toThrow(/Unsupported ELK layered override keys: elk\.edgeRouting, elk\.padding, elk\.portConstraints/);
  });

  it('strips only legacy implementation-owned keys before higher-level callers merge ELK overrides', () => {
    expect(stripImplementationOwnedElkLayeredOverrides({
      'elk.edgeRouting': 'SPLINES',
      'elk.padding': '[top=16,left=16,bottom=16,right=16]',
      'elk.portConstraints': 'FREE',
      'elk.spacing.nodeNode': '48',
      'elk.unknown': 'surprise',
    })).toEqual({
      'elk.spacing.nodeNode': '48',
      'elk.unknown': 'surprise',
    });
  });

  it('keeps orthogonal routing implementation-owned in resolved layered defaults', () => {
    const layoutOptions = buildLayeredLayoutOptions({
      direction: 'TB',
      spacingProfile: 'normal',
      optionOverrides: {
        'elk.spacing.nodeNode': '48',
      },
    });

    expect(layoutOptions['elk.edgeRouting']).toBe('ORTHOGONAL');
    expect(layoutOptions['elk.spacing.nodeNode']).toBe('48');
  });

  it('exposes only batch-safe layering controls in the preview registry', () => {
    const layering = ELK_LAYERED_PARAM_SPECS.find((spec) => spec.key === 'elk.layered.layering.strategy');
    const crossing = ELK_LAYERED_PARAM_SPECS.find((spec) => spec.key === 'elk.layered.crossingMinimization.strategy');
    const nodePlacement = ELK_LAYERED_PARAM_SPECS.find((spec) => spec.key === 'elk.layered.nodePlacement.strategy');
    const portConstraints = ELK_LAYERED_PARAM_SPECS.find((spec) => spec.key === 'elk.portConstraints');
    const edgeRouting = ELK_LAYERED_PARAM_SPECS.find((spec) => spec.key === 'elk.edgeRouting');
    const padding = ELK_LAYERED_PARAM_SPECS.find((spec) => spec.key === 'elk.padding');

    expect(layering?.enumValues?.map((value) => value.value)).toEqual(['NETWORK_SIMPLEX', 'LONGEST_PATH']);
    expect(crossing?.enumValues?.map((value) => value.value)).toEqual(['LAYER_SWEEP']);
    expect(nodePlacement?.enumValues?.map((value) => value.value)).toEqual([
      'BRANDES_KOEPF',
      'LINEAR_SEGMENTS',
      'SIMPLE',
    ]);
    expect(portConstraints).toBeUndefined();
    expect(edgeRouting).toBeUndefined();
    expect(padding).toBeUndefined();
  });
});
