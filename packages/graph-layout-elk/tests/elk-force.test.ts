import { describe, expect, it } from 'vitest';

import { buildElkGraph } from '../src/elk-graph-builder.js';
import { ELK_FORCE_PARAM_SPECS, elkForceParamDefaults } from '../src/force-param-registry.js';
import { buildForceLayoutOptions } from '../src/force-options.js';
import { indexPlacedNodes } from '../src/node-bounds.js';
import { layoutForceForFamily } from '../src/index.js';

const BOX = { width: 192, height: 64 };

describe('ELK force', () => {
  it('publishes force parameter specs for preview controls', () => {
    expect(ELK_FORCE_PARAM_SPECS.map((spec) => spec.key)).toEqual([
      'elk.spacing.nodeNode',
      'elk.separateConnectedComponents',
      'elk.randomSeed',
    ]);
    expect(elkForceParamDefaults()).toMatchObject({
      'elk.algorithm': 'force',
      'elk.spacing.nodeNode': '72',
      'elk.separateConnectedComponents': 'false',
      'elk.randomSeed': '0',
    });
  });

  it('keeps force graphs on node endpoints when implicit layered ports are disabled', () => {
    const graph = buildElkGraph({
      id: 'root',
      direction: 'TB',
      spacingProfile: 'normal',
      nodes: [
        { id: 'gateway', ...BOX },
        { id: 'api', ...BOX },
      ],
      edges: [{ id: 'gateway-api', source: 'gateway', target: 'api' }],
    }, buildForceLayoutOptions({ spacingProfile: 'normal' }));

    expect(graph.children[0]?.ports).toBeUndefined();
    expect(graph.children[1]?.ports).toBeUndefined();
    expect(graph.edges[0]).toMatchObject({
      sources: ['gateway'],
      targets: ['api'],
    });
  });

  it('runs ELK force for force-directed corpus families', async () => {
    const result = await layoutForceForFamily('system_architecture', {
      id: 'root',
      nodes: [
        { id: 'gateway', ...BOX },
        { id: 'api', ...BOX },
        { id: 'worker', ...BOX },
      ],
      edges: [
        { id: 'gateway-api', source: 'gateway', target: 'api' },
        { id: 'api-worker', source: 'api', target: 'worker' },
      ],
    });

    const nodes = indexPlacedNodes(result.nodes);
    expect(result.engine).toBe('elk-force');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(nodes.get('gateway')).toBeDefined();
    expect(nodes.get('api')).toBeDefined();
    expect(nodes.get('worker')).toBeDefined();
    expect(nodes.get('gateway')!.x === nodes.get('api')!.x && nodes.get('gateway')!.y === nodes.get('api')!.y).toBe(false);
  });
});
