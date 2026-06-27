import { describe, expect, it } from 'vitest';

import type { GraphLayoutInput } from '@diagram-generator/graph-layout-core';
import {
  ELK_MRTREE_PARAM_SPECS,
  ELK_RADIAL_PARAM_SPECS,
  ELK_RECTPACKING_PARAM_SPECS,
  ELK_STRESS_PARAM_SPECS,
  buildElkAlgorithmLayoutOptions,
  indexPlacedNodes,
  layoutElkAlgorithm,
  type ElkPreviewAlgorithm,
} from '../src/index.js';

const BOX = { width: 192, height: 64 };

function chainInput(direction: GraphLayoutInput['direction'] = 'TB'): GraphLayoutInput {
  return {
    id: 'root',
    direction,
    nodes: [
      { id: 'alpha', ...BOX },
      { id: 'beta', ...BOX },
      { id: 'gamma', ...BOX },
    ],
    edges: [
      { id: 'alpha-beta', source: 'alpha', target: 'beta' },
      { id: 'beta-gamma', source: 'beta', target: 'gamma' },
    ],
  };
}

describe('additional ELK algorithms', () => {
  it('publishes focused parameter specs for each previewed algorithm', () => {
    expect(ELK_STRESS_PARAM_SPECS.map((spec) => spec.key)).toEqual([
      'elk.spacing.nodeNode',
      'elk.randomSeed',
    ]);
    expect(ELK_MRTREE_PARAM_SPECS.map((spec) => spec.key)).toEqual([
      'elk.direction',
      'elk.spacing.nodeNode',
    ]);
    expect(ELK_RADIAL_PARAM_SPECS.map((spec) => spec.key)).toEqual(['elk.spacing.nodeNode']);
    expect(ELK_RECTPACKING_PARAM_SPECS.map((spec) => spec.key)).toEqual(['elk.spacing.nodeNode']);
  });

  it('builds generic ELK layout options without exposing no-op direction controls', () => {
    expect(buildElkAlgorithmLayoutOptions({
      algorithm: 'stress',
      direction: 'LR',
      spacingProfile: 'normal',
    })).toEqual({
      'elk.algorithm': 'stress',
      'elk.spacing.nodeNode': '72',
    });
    expect(buildElkAlgorithmLayoutOptions({
      algorithm: 'mrtree',
      direction: 'LR',
      spacingProfile: 'normal',
    })).toEqual({
      'elk.algorithm': 'mrtree',
      'elk.spacing.nodeNode': '72',
      'elk.direction': 'RIGHT',
    });
  });

  it.each([
    ['stress', 'elk-stress'],
    ['mrtree', 'elk-mrtree'],
    ['radial', 'elk-radial'],
    ['rectpacking', 'elk-rectpacking'],
  ] as const)('runs ELK %s through the shared graph-layout adapter', async (algorithm, engineId) => {
    const result = await layoutElkAlgorithm(chainInput(), { algorithm, engineId });
    const nodes = indexPlacedNodes(result.nodes);

    expect(result.engine).toBe(engineId);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(nodes.get('alpha')).toBeDefined();
    expect(nodes.get('beta')).toBeDefined();
    expect(nodes.get('gamma')).toBeDefined();
  });

  it('uses diagram direction for mrtree auto-direction', async () => {
    const result = await layoutElkAlgorithm(chainInput('LR'), {
      algorithm: 'mrtree' satisfies ElkPreviewAlgorithm,
      engineId: 'elk-mrtree',
    });
    const nodes = indexPlacedNodes(result.nodes);

    expect(nodes.get('alpha')!.x).toBeLessThan(nodes.get('beta')!.x);
    expect(nodes.get('beta')!.x).toBeLessThan(nodes.get('gamma')!.x);
  });
});
