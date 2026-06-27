import { describe, expect, it } from 'vitest';
import type { GraphLayoutInput } from '@diagram-generator/graph-layout-core';
import { DAGRE_PARAM_SPECS, dagreParamDefaults, layoutDagre } from '../src/index.js';

const BOX = { width: 120, height: 64 };

function chain(direction: GraphLayoutInput['direction']): GraphLayoutInput {
  return {
    id: 'root',
    direction,
    nodes: [
      { id: 'a', ...BOX },
      { id: 'b', ...BOX },
      { id: 'c', ...BOX },
    ],
    edges: [
      { id: 'a-b', source: 'a', target: 'b' },
      { id: 'b-c', source: 'b', target: 'c' },
    ],
  };
}

describe('dagre layout', () => {
  it('publishes dagre parameter specs for preview controls', () => {
    expect(DAGRE_PARAM_SPECS.map((spec) => spec.key)).toEqual([
      'dagre.rankdir',
      'dagre.nodesep',
      'dagre.ranksep',
      'dagre.edgesep',
    ]);
    expect(dagreParamDefaults()).toMatchObject({
      'dagre.rankdir': '',
      'dagre.nodesep': '72',
      'dagre.ranksep': '96',
      'dagre.edgesep': '24',
    });
  });

  it('lays out a TB chain with monotonic ranks', () => {
    const result = layoutDagre(chain('TB'));
    const nodes = new Map(result.nodes.map((node) => [node.id, node]));

    expect(result.engine).toBe('dagre');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(nodes.get('a')!.y).toBeLessThan(nodes.get('b')!.y);
    expect(nodes.get('b')!.y).toBeLessThan(nodes.get('c')!.y);
    expect(result.edges[0]?.sections.length).toBeGreaterThan(0);
  });

  it('lays out an LR chain when direction requests it', () => {
    const result = layoutDagre(chain('LR'));
    const nodes = new Map(result.nodes.map((node) => [node.id, node]));

    expect(result.direction).toBe('LR');
    expect(nodes.get('a')!.x).toBeLessThan(nodes.get('b')!.x);
    expect(nodes.get('b')!.x).toBeLessThan(nodes.get('c')!.x);
  });

  it('accepts explicit dagre option overrides', () => {
    const result = layoutDagre(chain('TB'), {
      optionOverrides: {
        'dagre.rankdir': 'LR',
        'dagre.ranksep': '160',
      },
    });
    const nodes = new Map(result.nodes.map((node) => [node.id, node]));

    expect(result.direction).toBe('LR');
    expect(nodes.get('a')!.x).toBeLessThan(nodes.get('b')!.x);
  });
});
