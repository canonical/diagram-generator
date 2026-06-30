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

function starInput(): GraphLayoutInput {
  return {
    id: 'root',
    direction: 'TB',
    nodes: [
      { id: 'rootNode', ...BOX },
      { id: 'left', width: 160, height: 56 },
      { id: 'right', width: 160, height: 56 },
      { id: 'top', width: 160, height: 56 },
      { id: 'bottom', width: 160, height: 56 },
    ],
    edges: [
      { id: 'root-left', source: 'rootNode', target: 'left' },
      { id: 'root-right', source: 'rootNode', target: 'right' },
      { id: 'root-top', source: 'rootNode', target: 'top' },
      { id: 'root-bottom', source: 'rootNode', target: 'bottom' },
    ],
  };
}

function rectpackingInput(): GraphLayoutInput {
  return {
    id: 'root',
    direction: 'TB',
    nodes: [
      { id: 'alpha', width: 240, height: 72 },
      { id: 'beta', width: 220, height: 88 },
      { id: 'gamma', width: 180, height: 96 },
      { id: 'delta', width: 160, height: 104 },
      { id: 'epsilon', width: 140, height: 120 },
      { id: 'zeta', width: 120, height: 136 },
    ],
    edges: [],
  };
}

function centerDistance(
  nodes: ReturnType<typeof indexPlacedNodes>,
  leftId: string,
  rightId: string,
): number {
  const left = nodes.get(leftId)!;
  const right = nodes.get(rightId)!;
  return Math.hypot(
    (left.x + left.width / 2) - (right.x + right.width / 2),
    (left.y + left.height / 2) - (right.y + right.height / 2),
  );
}

function sampleOverrideValue(
  spec: {
    kind: 'number' | 'enum' | 'boolean' | 'text';
    defaultValue: string;
    enumValues?: ReadonlyArray<{ value: string }>;
  },
): string {
  if (spec.kind === 'boolean') {
    return spec.defaultValue === 'true' ? 'false' : 'true';
  }
  if (spec.kind === 'enum') {
    const nonDefault = spec.enumValues?.find((entry) => entry.value !== spec.defaultValue);
    return nonDefault?.value ?? spec.defaultValue;
  }
  if (spec.kind === 'number') {
    const numeric = Number(spec.defaultValue);
    return Number.isFinite(numeric) ? String(numeric + 1) : '1';
  }
  return spec.defaultValue || 'sample';
}

describe('additional ELK algorithms', () => {
  it('publishes focused parameter specs for each previewed algorithm', () => {
    expect(ELK_STRESS_PARAM_SPECS.map((spec) => spec.key)).toEqual([
      'elk.stress.dimension',
      'elk.stress.epsilon',
      'elk.stress.iterationLimit',
      'elk.stress.desiredEdgeLength',
      'elk.edgeLabels.inline',
    ]);
    expect(ELK_MRTREE_PARAM_SPECS.map((spec) => spec.key)).toEqual([
      'elk.direction',
      'elk.spacing.nodeNode',
      'elk.spacing.edgeNode',
      'elk.separateConnectedComponents',
      'elk.aspectRatio',
      'elk.mrtree.compaction',
      'elk.mrtree.weighting',
      'elk.mrtree.searchOrder',
      'elk.mrtree.edgeRoutingMode',
      'elk.mrtree.edgeEndTextureLength',
    ]);
    expect(ELK_RADIAL_PARAM_SPECS.map((spec) => spec.key)).toEqual([
      'elk.spacing.nodeNode',
      'elk.radial.centerOnRoot',
      'elk.radial.radius',
      'elk.radial.rotate',
      'elk.radial.compactor',
      'elk.radial.compactionStepSize',
      'elk.radial.sorter',
      'elk.radial.wedgeCriteria',
      'elk.radial.optimizationCriteria',
      'elk.radial.rotation.targetAngle',
      'elk.radial.rotation.computeAdditionalWedgeSpace',
      'elk.radial.rotation.outgoingEdgeAngles',
    ]);
    expect(ELK_RECTPACKING_PARAM_SPECS.map((spec) => spec.key)).toEqual([
      'elk.spacing.nodeNode',
      'elk.aspectRatio',
      'elk.rectpacking.trybox',
      'elk.rectpacking.orderBySize',
      'elk.rectpacking.widthApproximation.strategy',
      'elk.rectpacking.widthApproximation.targetWidth',
      'elk.rectpacking.widthApproximation.optimizationGoal',
      'elk.rectpacking.widthApproximation.lastPlaceShift',
      'elk.rectpacking.packing.strategy',
      'elk.rectpacking.packing.compaction.rowHeightReevaluation',
      'elk.rectpacking.packing.compaction.iterations',
      'elk.rectpacking.whiteSpaceElimination.strategy',
    ]);
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

  it('forwards every surfaced stress/mrtree/radial/rectpacking control into the ELK option map', () => {
    const stressOverrides = Object.fromEntries(
      ELK_STRESS_PARAM_SPECS.map((spec) => [spec.key, sampleOverrideValue(spec)]),
    );
    const mrtreeOverrides = Object.fromEntries(
      ELK_MRTREE_PARAM_SPECS.map((spec) => [spec.key, sampleOverrideValue(spec)]),
    );
    const radialOverrides = Object.fromEntries(
      ELK_RADIAL_PARAM_SPECS.map((spec) => [spec.key, sampleOverrideValue(spec)]),
    );
    const rectpackingOverrides = Object.fromEntries(
      ELK_RECTPACKING_PARAM_SPECS.map((spec) => [spec.key, sampleOverrideValue(spec)]),
    );

    expect(buildElkAlgorithmLayoutOptions({
      algorithm: 'stress',
      direction: 'TB',
      spacingProfile: 'normal',
      optionOverrides: stressOverrides,
    })).toMatchObject(stressOverrides);
    expect(buildElkAlgorithmLayoutOptions({
      algorithm: 'mrtree',
      direction: 'TB',
      spacingProfile: 'normal',
      optionOverrides: mrtreeOverrides,
    })).toMatchObject(mrtreeOverrides);
    expect(buildElkAlgorithmLayoutOptions({
      algorithm: 'radial',
      direction: 'TB',
      spacingProfile: 'normal',
      optionOverrides: radialOverrides,
    })).toMatchObject(radialOverrides);
    expect(buildElkAlgorithmLayoutOptions({
      algorithm: 'rectpacking',
      direction: 'TB',
      spacingProfile: 'normal',
      optionOverrides: rectpackingOverrides,
    })).toMatchObject(rectpackingOverrides);
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

  it('measurably changes stress layout separation when desired edge length grows', async () => {
    const compact = await layoutElkAlgorithm(chainInput(), {
      algorithm: 'stress',
      engineId: 'elk-stress',
      optionOverrides: {
        'elk.stress.desiredEdgeLength': '80',
      },
    });
    const loose = await layoutElkAlgorithm(chainInput(), {
      algorithm: 'stress',
      engineId: 'elk-stress',
      optionOverrides: {
        'elk.stress.desiredEdgeLength': '240',
      },
    });

    const compactNodes = indexPlacedNodes(compact.nodes);
    const looseNodes = indexPlacedNodes(loose.nodes);

    expect(centerDistance(looseNodes, 'alpha', 'beta')).toBeGreaterThan(
      centerDistance(compactNodes, 'alpha', 'beta'),
    );
  });

  it('measurably changes mrtree node separation when the surfaced node spacing grows', async () => {
    const compact = await layoutElkAlgorithm(chainInput(), {
      algorithm: 'mrtree',
      engineId: 'elk-mrtree',
      optionOverrides: {
        'elk.spacing.nodeNode': '24',
      },
    });
    const loose = await layoutElkAlgorithm(chainInput(), {
      algorithm: 'mrtree',
      engineId: 'elk-mrtree',
      optionOverrides: {
        'elk.spacing.nodeNode': '160',
      },
    });

    const compactNodes = indexPlacedNodes(compact.nodes);
    const looseNodes = indexPlacedNodes(loose.nodes);

    expect(centerDistance(looseNodes, 'alpha', 'beta')).toBeGreaterThan(
      centerDistance(compactNodes, 'alpha', 'beta'),
    );
  });

  it('treats radial spacing as a graph-wide separation control rather than a sibling-only gap', async () => {
    const compact = await layoutElkAlgorithm(starInput(), {
      algorithm: 'radial',
      engineId: 'elk-radial',
      optionOverrides: {
        'elk.spacing.nodeNode': '24',
      },
    });
    const loose = await layoutElkAlgorithm(starInput(), {
      algorithm: 'radial',
      engineId: 'elk-radial',
      optionOverrides: {
        'elk.spacing.nodeNode': '160',
      },
    });

    const compactNodes = indexPlacedNodes(compact.nodes);
    const looseNodes = indexPlacedNodes(loose.nodes);

    expect(loose.width).toBeGreaterThan(compact.width);
    expect(centerDistance(looseNodes, 'rootNode', 'left')).toBeGreaterThan(
      centerDistance(compactNodes, 'rootNode', 'left'),
    );
    expect(centerDistance(looseNodes, 'left', 'right')).toBeGreaterThan(
      centerDistance(compactNodes, 'left', 'right'),
    );
  });

  it('changes rectpacking canvas shape when the surfaced target width changes', async () => {
    const narrow = await layoutElkAlgorithm(rectpackingInput(), {
      algorithm: 'rectpacking',
      engineId: 'elk-rectpacking',
      optionOverrides: {
        'elk.rectpacking.widthApproximation.strategy': 'TARGET_WIDTH',
        'elk.rectpacking.widthApproximation.targetWidth': '320',
      },
    });
    const wide = await layoutElkAlgorithm(rectpackingInput(), {
      algorithm: 'rectpacking',
      engineId: 'elk-rectpacking',
      optionOverrides: {
        'elk.rectpacking.widthApproximation.strategy': 'TARGET_WIDTH',
        'elk.rectpacking.widthApproximation.targetWidth': '960',
      },
    });

    expect(wide.width).toBeGreaterThan(narrow.width);
    expect(wide.height).toBeLessThan(narrow.height);
  });
});
