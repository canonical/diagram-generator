import ELK from 'elkjs/lib/elk.bundled.js';
import type {
  GraphLayoutInput,
  GraphLayoutResult,
  GraphNodeInput,
  GraphPortInput,
  GraphPortSide,
  LayeredCorpusFamily,
  PlacedNode,
} from '@diagram-generator/graph-layout-core';

import {
  buildElkGraphFromInput,
  buildElkGraph,
  buildInputTreeData,
  portIdForSide,
} from './elk-graph-builder.js';
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

function oppositeSide(side: GraphPortSide): GraphPortSide {
  switch (side) {
    case 'top':
      return 'bottom';
    case 'right':
      return 'left';
    case 'bottom':
      return 'top';
    case 'left':
      return 'right';
  }
}

function sourceSideForDirection(direction: ElkDirection): GraphPortSide {
  switch (direction) {
    case 'DOWN':
      return 'bottom';
    case 'RIGHT':
      return 'right';
    case 'UP':
      return 'top';
    case 'LEFT':
      return 'left';
  }
}

function cloneGraphNodes(nodes: GraphNodeInput[]): GraphNodeInput[] {
  return nodes.map((node) => ({
    ...node,
    padding: node.padding ? { ...node.padding } : undefined,
    ports: node.ports?.map((port: GraphPortInput) => ({
      ...port,
      anchor: { ...port.anchor },
    })),
    children: node.children ? cloneGraphNodes(node.children) : undefined,
  }));
}

function authoredOrderPortId(
  nodeId: string,
  groupId: string,
  role: 'source' | 'target',
  side: GraphPortSide,
  index: number,
): string {
  return `${nodeId}__ordered_${groupId}_${role}_${side}_${index}`;
}

function offsetForOrderedPort(
  node: Pick<GraphNodeInput, 'width' | 'height'>,
  side: GraphPortSide,
  index: number,
  count: number,
): number {
  const span = side === 'top' || side === 'bottom' ? node.width : node.height;
  return Math.round((span * (index + 1)) / (count + 1));
}

function withAuthoredOrderPortRefs(
  input: GraphLayoutInput,
  layoutOptions: Record<string, string>,
): GraphLayoutInput {
  if (input.edges.length === 0) {
    return input;
  }

  const nodes = cloneGraphNodes(input.nodes);
  const edges = input.edges.map((edge) => ({
    ...edge,
    labels: edge.labels?.map((label) => ({ ...label })),
  }));
  const nodesById = indexInputNodes(nodes);
  const parentById = buildInputTreeData(nodes, input.id).parentById;
  const effectiveDirection = resolveElkDirection(input, layoutOptions);
  const sourceSide = sourceSideForDirection(effectiveDirection);
  const targetSide = oppositeSide(sourceSide);

  const unresolvedOutgoing = new Map<string, typeof edges>();
  const unresolvedIncoming = new Map<string, typeof edges>();
  for (const edge of edges) {
    if (!edge.sourcePort) {
      const bucket = unresolvedOutgoing.get(edge.source) ?? [];
      bucket.push(edge);
      unresolvedOutgoing.set(edge.source, bucket);
    }
    if (!edge.targetPort) {
      const bucket = unresolvedIncoming.get(edge.target) ?? [];
      bucket.push(edge);
      unresolvedIncoming.set(edge.target, bucket);
    }
  }

  const orderingClusterGroups = (
    groupedEdges: typeof edges,
    endpoint: 'source' | 'target',
  ): Array<{ groupId: string; edges: typeof edges }> => {
    const byGroup = new Map<string, typeof edges>();
    for (const edge of groupedEdges) {
      const peerNodeId = endpoint === 'source' ? edge.target : edge.source;
      const parentId = parentById[peerNodeId];
      if (!parentId || nodesById.get(parentId)?.kind !== 'ordering-cluster') {
        continue;
      }
      const bucket = byGroup.get(parentId) ?? [];
      bucket.push(edge);
      byGroup.set(parentId, bucket);
    }
    return [...byGroup.entries()]
      .filter(([, bucket]) => bucket.length > 1)
      .map(([groupId, bucket]) => ({ groupId, edges: bucket }));
  };

  const assignPorts = (
    nodeId: string,
    groupedEdges: typeof edges,
    groupId: string,
    role: 'source' | 'target',
    side: GraphPortSide,
  ): void => {
    if (groupedEdges.length <= 1) {
      return;
    }
    const node = nodesById.get(nodeId);
    if (!node) {
      return;
    }
    node.ports ??= [];
    groupedEdges.forEach((edge, index) => {
      const portId = authoredOrderPortId(nodeId, groupId, role, side, index);
      if (!node.ports!.some((port) => port.id === portId)) {
        node.ports!.push({
          id: portId,
          anchor: {
            kind: 'side',
            side,
            offset: offsetForOrderedPort(node, side, index, groupedEdges.length),
          },
        });
      }
      if (role === 'source') {
        edge.sourcePort = portId;
      } else {
        edge.targetPort = portId;
      }
    });
  };

  for (const [nodeId, groupedEdges] of unresolvedOutgoing) {
    for (const group of orderingClusterGroups(groupedEdges, 'source')) {
      assignPorts(nodeId, group.edges, group.groupId, 'source', sourceSide);
    }
  }
  for (const [nodeId, groupedEdges] of unresolvedIncoming) {
    for (const group of orderingClusterGroups(groupedEdges, 'target')) {
      assignPorts(nodeId, group.edges, group.groupId, 'target', targetSide);
    }
  }

  return {
    ...input,
    nodes,
    edges,
  };
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
  const authoredPortInput = withAuthoredOrderPortRefs(input, layoutOptions);

  const elkGraph = buildElkGraph(authoredPortInput, layoutOptions);
  const elk = getElk();
  const laidOut = await elk.layout(elkGraph);
  const firstPass = normalizeElkLayoutResult(
    authoredPortInput,
    laidOut as Parameters<typeof normalizeElkLayoutResult>[1],
  );
  if (authoredPortInput.edges.length === 0) {
    return firstPass;
  }

  const secondPassInput = withRelationshipAwarePortRefs(authoredPortInput, firstPass, layoutOptions);
  const changed = secondPassInput.edges.some((edge, index) => (
    edge.sourcePort !== authoredPortInput.edges[index]?.sourcePort ||
    edge.targetPort !== authoredPortInput.edges[index]?.targetPort
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
