import ELK from 'elkjs/lib/elk.bundled.js';
import type { GraphLayoutInput, GraphLayoutResult } from '@diagram-generator/graph-layout-core';

import { buildElkGraph } from './elk-graph-builder.js';
import {
  buildElkAlgorithmLayoutOptions,
  type ElkAlgorithmLayoutConfig,
  type ElkPreviewAlgorithm,
} from './elk-algorithm-options.js';
import { normalizeElkLayoutResult } from './result-normalizer.js';

let sharedElk: InstanceType<typeof ELK> | null = null;

function getElk(): InstanceType<typeof ELK> {
  if (!sharedElk) {
    sharedElk = new ELK();
  }
  return sharedElk;
}

export interface LayoutElkAlgorithmOptions {
  algorithm: ElkPreviewAlgorithm;
  engineId?: GraphLayoutResult['engine'];
  optionOverrides?: Record<string, string>;
}

export async function layoutElkAlgorithm(
  input: GraphLayoutInput,
  options: LayoutElkAlgorithmOptions,
): Promise<GraphLayoutResult> {
  const config: ElkAlgorithmLayoutConfig = {
    algorithm: options.algorithm,
    direction: input.direction,
    spacingProfile: input.spacingProfile ?? 'normal',
    optionOverrides: options.optionOverrides,
  };
  const layoutOptions = buildElkAlgorithmLayoutOptions(config);
  const elkGraph = buildElkGraph(input, layoutOptions);
  const laidOut = await getElk().layout(elkGraph);
  return normalizeElkLayoutResult(
    input,
    laidOut as Parameters<typeof normalizeElkLayoutResult>[1],
    options.engineId ?? `elk-${options.algorithm}`,
  );
}

export { buildElkAlgorithmLayoutOptions, type ElkPreviewAlgorithm };
