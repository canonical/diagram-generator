import type { GraphLayoutInput } from '@diagram-generator/graph-layout-core';
import type { ElkLayoutOptions } from './layered-options.js';

export type ElkPreviewAlgorithm =
  | 'stress'
  | 'mrtree'
  | 'radial'
  | 'rectpacking';

export interface ElkAlgorithmLayoutConfig {
  algorithm: ElkPreviewAlgorithm;
  direction?: GraphLayoutInput['direction'];
  spacingProfile?: GraphLayoutInput['spacingProfile'];
  optionOverrides?: Record<string, string>;
}

const ELK_DIRECTION_BY_GRAPH_DIRECTION = {
  TB: 'DOWN',
  LR: 'RIGHT',
  BT: 'UP',
  RL: 'LEFT',
} as const satisfies Record<GraphLayoutInput['direction'], string>;

function spacingForProfile(profile: GraphLayoutInput['spacingProfile']): string {
  switch (profile) {
    case 'compact':
      return '48';
    case 'loose':
      return '96';
    case 'normal':
    default:
      return '72';
  }
}

export function buildElkAlgorithmLayoutOptions(
  config: ElkAlgorithmLayoutConfig,
): ElkLayoutOptions {
  const layoutOptions: ElkLayoutOptions = {
    'elk.algorithm': config.algorithm,
    'elk.spacing.nodeNode': spacingForProfile(config.spacingProfile ?? 'normal'),
    ...(config.optionOverrides ?? {}),
  };
  if (
    config.algorithm === 'mrtree' &&
    config.direction &&
    !layoutOptions['elk.direction']
  ) {
    layoutOptions['elk.direction'] = ELK_DIRECTION_BY_GRAPH_DIRECTION[config.direction];
  }
  return layoutOptions;
}
