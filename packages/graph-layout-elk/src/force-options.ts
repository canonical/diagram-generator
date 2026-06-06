import type { ForceCorpusFamily } from '@diagram-generator/graph-layout-core';

export interface ForceLayoutConfig {
  spacingProfile: 'normal' | 'loose';
  optionOverrides?: Record<string, string>;
}

export type ElkForceLayoutOptions = Record<string, string>;

export function forceConfigForFamily(family: ForceCorpusFamily): ForceLayoutConfig {
  switch (family) {
    case 'system_architecture':
    case 'concept_and_relationship_mapping':
      return { spacingProfile: 'loose' };
    case 'infrastructure_and_network_topology':
    case 'data_model_and_relationships':
      return { spacingProfile: 'normal' };
  }
}

export function buildForceLayoutOptions(config: ForceLayoutConfig): ElkForceLayoutOptions {
  const spacing = config.spacingProfile === 'loose' ? 96 : 72;
  return {
    'elk.algorithm': 'force',
    'elk.spacing.nodeNode': String(spacing),
    'elk.separateConnectedComponents': 'false',
    'elk.randomSeed': '0',
    ...(config.optionOverrides ?? {}),
  };
}

export function resolvedElkForceOptionsForFamily(
  family: ForceCorpusFamily,
  optionOverrides?: Record<string, string>,
): ElkForceLayoutOptions {
  const config = forceConfigForFamily(family);
  if (optionOverrides) {
    config.optionOverrides = {
      ...config.optionOverrides,
      ...optionOverrides,
    };
  }
  return buildForceLayoutOptions(config);
}