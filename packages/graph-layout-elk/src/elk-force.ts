import ELK from 'elkjs/lib/elk.bundled.js';
import type { ForceCorpusFamily, GraphLayoutInput, GraphLayoutResult } from '@diagram-generator/graph-layout-core';

import { buildElkGraph } from './elk-graph-builder.js';
import {
  buildForceLayoutOptions,
  forceConfigForFamily,
  resolvedElkForceOptionsForFamily,
  type ForceLayoutConfig,
} from './force-options.js';
import { normalizeElkLayoutResult } from './result-normalizer.js';

let sharedElk: InstanceType<typeof ELK> | null = null;

function getElk(): InstanceType<typeof ELK> {
  if (!sharedElk) {
    sharedElk = new ELK();
  }
  return sharedElk;
}

export interface LayoutForceOptions {
  config?: ForceLayoutConfig;
  optionOverrides?: Record<string, string>;
}

export async function layoutForce(
  input: GraphLayoutInput,
  options: LayoutForceOptions = {},
): Promise<GraphLayoutResult> {
  const baseConfig: ForceLayoutConfig = options.config ?? {
    spacingProfile: input.spacingProfile === 'loose' ? 'loose' : 'normal',
    optionOverrides: options.optionOverrides,
  };
  if (options.optionOverrides) {
    baseConfig.optionOverrides = {
      ...baseConfig.optionOverrides,
      ...options.optionOverrides,
    };
  }

  const layoutOptions = buildForceLayoutOptions(baseConfig);
  const elkGraph = buildElkGraph(input, layoutOptions);
  const laidOut = await getElk().layout(elkGraph);
  return normalizeElkLayoutResult(
    input,
    laidOut as Parameters<typeof normalizeElkLayoutResult>[1],
    'elk-force',
  );
}

export async function layoutForceForFamily(
  family: ForceCorpusFamily,
  input: Omit<GraphLayoutInput, 'direction' | 'spacingProfile'>,
  optionOverrides?: Record<string, string>,
): Promise<GraphLayoutResult> {
  const config = forceConfigForFamily(family);
  if (optionOverrides) {
    config.optionOverrides = {
      ...config.optionOverrides,
      ...optionOverrides,
    };
  }

  return layoutForce(
    {
      ...input,
      direction: 'TB',
      spacingProfile: config.spacingProfile,
    },
    { config },
  );
}

export { buildForceLayoutOptions, forceConfigForFamily, resolvedElkForceOptionsForFamily };