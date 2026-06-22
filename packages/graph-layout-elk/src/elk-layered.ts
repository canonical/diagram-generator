import ELK from 'elkjs/lib/elk.bundled.js';
import type {
  GraphLayoutInput,
  GraphLayoutResult,
  GraphNodeInput,
  GraphPortSide,
  LayeredCorpusFamily,
  PlacedNode,
} from '@diagram-generator/graph-layout-core';

import { buildElkGraphFromInput, buildElkGraph, portIdForSide } from './elk-graph-builder.js';
import {
  buildLayeredLayoutOptions,
  layeredConfigForFamily,
  resolvedElkOptionsForFamily,
  elkParamGroups,
  type LayeredLayoutConfig,
} from './layered-options.js';
import { normalizeElkLayoutResult } from './result-normalizer.js';
import { indexPlacedNodes } from './node-bounds.js';

let sharedElk: InstanceType<typeof ELK> | null = null;

function getElk(): InstanceType<typeof ELK> {
  if (!sharedElk) {
    // Bundled build runs ELK in-process (no Web Worker). Same algorithm as Eclipse ELK Java.
    sharedElk = new ELK();
  }
  return sharedElk;
}

export interface LayoutLayeredOptions {
  /** Override direction/spacing instead of input fields. */
  config?: LayeredLayoutConfig;
  /** Shorthand: merge into config.optionOverrides */
  optionOverrides?: Record<string, string>;
}

export interface LayoutLayeredForFamilyOptions {
  /** Override the family's default flow axis while keeping its other defaults. */
  direction?: LayeredLayoutConfig['direction'];
  /** Override the family's default spacing profile. */
  spacingProfile?: LayeredLayoutConfig['spacingProfile'];
  /** Merge extra ELK options over the family defaults. */
  optionOverrides?: Record<string, string>;
}

type ElkDirection = 'DOWN' | 'RIGHT' | 'UP' | 'LEFT';

function resolveElkDirection(
  input: GraphLayoutInput,
  layoutOptions: Record<string, string>,
): ElkDirection {
  const raw = layoutOptions['elk.direction'];
  if (raw === 'DOWN' || raw === 'RIGHT' || raw === 'UP' || raw === 'LEFT') {
    return raw;
  }
  return input.direction === 'LR' ? 'RIGHT' : 'DOWN';
}

function indexInputNodes(
  nodes: GraphNodeInput[],
  out = new Map<string, GraphNodeInput>(),
): Map<string, GraphNodeInput> {
  for (const node of nodes) {
    out.set(node.id, node);
    if (node.children?.length) {
      indexInputNodes(node.children, out);
    }
  }
  return out;
}

function chooseSidesForPlacedNodes(
  defaultDirection: ElkDirection,
  source: PlacedNode,
  target: PlacedNode,
): [GraphPortSide, GraphPortSide] {
  const sourceCx = source.x + source.width / 2;
  const sourceCy = source.y + source.height / 2;
  const targetCx = target.x + target.width / 2;
  const targetCy = target.y + target.height / 2;
  const dx = targetCx - sourceCx;
  const dy = targetCy - sourceCy;
  const horizontalBias = Math.min(source.width, target.width) / 4;
  const verticalBias = Math.min(source.height, target.height) / 4;

  if (
    Math.abs(dy) > verticalBias &&
    (defaultDirection === 'DOWN' || defaultDirection === 'UP' || Math.abs(dy) >= Math.abs(dx))
  ) {
    return dy >= 0 ? ['bottom', 'top'] : ['top', 'bottom'];
  }
  if (
    Math.abs(dx) > horizontalBias &&
    (defaultDirection === 'RIGHT' || defaultDirection === 'LEFT' || Math.abs(dx) >= Math.abs(dy))
  ) {
    return dx >= 0 ? ['right', 'left'] : ['left', 'right'];
  }

  switch (defaultDirection) {
    case 'DOWN':
      return dy >= 0 ? ['bottom', 'top'] : ['top', 'bottom'];
    case 'UP':
      return dy <= 0 ? ['top', 'bottom'] : ['bottom', 'top'];
    case 'RIGHT':
      return dx >= 0 ? ['right', 'left'] : ['left', 'right'];
    case 'LEFT':
      return dx <= 0 ? ['left', 'right'] : ['right', 'left'];
  }
}

function chooseAlternateSidesForPlacedNodes(
  source: PlacedNode,
  target: PlacedNode,
  primarySides: [GraphPortSide, GraphPortSide],
): [GraphPortSide, GraphPortSide] {
  const sourceCx = source.x + source.width / 2;
  const sourceCy = source.y + source.height / 2;
  const targetCx = target.x + target.width / 2;
  const targetCy = target.y + target.height / 2;
  const dx = targetCx - sourceCx;
  const dy = targetCy - sourceCy;
  const isVerticalPrimary =
    (primarySides[0] === 'top' || primarySides[0] === 'bottom') &&
    (primarySides[1] === 'top' || primarySides[1] === 'bottom');

  if (isVerticalPrimary) {
    return dx < 0 ? ['left', 'left'] : ['right', 'right'];
  }
  return dy < 0 ? ['top', 'top'] : ['bottom', 'bottom'];
}

function withRelationshipAwarePortRefs(
  input: GraphLayoutInput,
  firstPass: GraphLayoutResult,
  layoutOptions: Record<string, string>,
): GraphLayoutInput {
  const placedById = indexPlacedNodes(firstPass.nodes);
  const inputNodesById = indexInputNodes(input.nodes);
  const effectiveDirection = resolveElkDirection(input, layoutOptions);

  return {
    ...input,
    edges: input.edges.map((edge, index) => {
      if (edge.sourcePort || edge.targetPort) return edge;
      const sourcePlaced = placedById.get(edge.source);
      const targetPlaced = placedById.get(edge.target);
      const sourceInput = inputNodesById.get(edge.source);
      const targetInput = inputNodesById.get(edge.target);
      if (!sourcePlaced || !targetPlaced || !sourceInput || !targetInput) {
        return edge;
      }

      const primarySides = chooseSidesForPlacedNodes(
        effectiveDirection,
        sourcePlaced,
        targetPlaced,
      );
      const hasEarlierReciprocal = input.edges.slice(0, index).some((candidate) => (
        !candidate.sourcePort &&
        !candidate.targetPort &&
        candidate.source === edge.target &&
        candidate.target === edge.source
      ));
      const [sourceSide, targetSide] = hasEarlierReciprocal
        ? chooseAlternateSidesForPlacedNodes(sourcePlaced, targetPlaced, primarySides)
        : primarySides;

      return {
        ...edge,
        sourcePort: portIdForSide(sourceInput, sourceSide),
        targetPort: portIdForSide(targetInput, targetSide),
      };
    }),
  };
}

/**
 * Run ELK Layered (Sugiyama) on a graph IR document.
 * Does not touch frame autolayout or preview — integration is a separate phase.
 */
export async function layoutLayered(
  input: GraphLayoutInput,
  options: LayoutLayeredOptions = {},
): Promise<GraphLayoutResult> {
  const familyDirection = input.direction;
  const baseConfig: LayeredLayoutConfig = options.config ?? {
    direction: familyDirection,
    spacingProfile: input.spacingProfile ?? 'normal',
    optionOverrides: options.optionOverrides,
  };
  if (options.optionOverrides) {
    baseConfig.optionOverrides = {
      ...baseConfig.optionOverrides,
      ...options.optionOverrides,
    };
  }
  const layoutOptions = buildLayeredLayoutOptions(baseConfig);

  const elkGraph = buildElkGraph(input, layoutOptions);
  const elk = getElk();
  const laidOut = await elk.layout(elkGraph);
  const firstPass = normalizeElkLayoutResult(
    input,
    laidOut as Parameters<typeof normalizeElkLayoutResult>[1],
  );
  if (input.edges.length === 0) {
    return firstPass;
  }

  const secondPassInput = withRelationshipAwarePortRefs(input, firstPass, layoutOptions);
  const changed = secondPassInput.edges.some((edge, index) => (
    edge.sourcePort !== input.edges[index]?.sourcePort ||
    edge.targetPort !== input.edges[index]?.targetPort
  ));
  if (!changed) {
    return firstPass;
  }

  const refinedGraph = buildElkGraph(secondPassInput, layoutOptions);
  const refined = await elk.layout(refinedGraph);
  return normalizeElkLayoutResult(
    secondPassInput,
    refined as Parameters<typeof normalizeElkLayoutResult>[1],
  );
}

export async function layoutLayeredForFamily(
  family: LayeredCorpusFamily,
  input: Omit<GraphLayoutInput, 'direction' | 'spacingProfile'>,
  options?: LayoutLayeredForFamilyOptions | Record<string, string>,
): Promise<GraphLayoutResult> {
  const familyConfig = layeredConfigForFamily(family);
  const resolvedOptions =
    options && (
      'direction' in options
      || 'spacingProfile' in options
      || 'optionOverrides' in options
    )
      ? options as LayoutLayeredForFamilyOptions
      : { optionOverrides: options as Record<string, string> | undefined };
  const config: LayeredLayoutConfig = {
    ...familyConfig,
    direction: resolvedOptions.direction ?? familyConfig.direction,
    spacingProfile: resolvedOptions.spacingProfile ?? familyConfig.spacingProfile,
    optionOverrides: {
      ...(familyConfig.optionOverrides ?? {}),
      ...(resolvedOptions.optionOverrides ?? {}),
    },
  };
  return layoutLayered(
    {
      ...input,
      direction: config.direction,
      spacingProfile: config.spacingProfile,
    },
    { config },
  );
}

export { buildElkGraphFromInput, layeredConfigForFamily, buildLayeredLayoutOptions, resolvedElkOptionsForFamily, elkParamGroups };
