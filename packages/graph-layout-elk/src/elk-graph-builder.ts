import type {
  GraphEdgeInput,
  GraphInsetsInput,
  GraphLayoutInput,
  LayoutDirection,
  GraphNodeInput,
  GraphPortInput,
  GraphPortSide,
} from '@diagram-generator/graph-layout-core';
import { resolveGraphPortPlacement } from '@diagram-generator/graph-layout-core';
import type { ElkLayoutOptions } from './layered-options.js';
import { buildLayeredLayoutOptions } from './layered-options.js';

const ELK_PORT_SIDE_KEY = 'org.eclipse.elk.port.side';
const IMPLICIT_PORT_SIDES: GraphPortSide[] = ['top', 'right', 'bottom', 'left'];
const ORDERING_EDGE_PREFIX = '__dg_order__';
const ELK_SIDE_BY_PORT_SIDE = {
  top: 'NORTH',
  right: 'EAST',
  bottom: 'SOUTH',
  left: 'WEST',
} satisfies Record<GraphPortSide, string>;

type ElkDirection = 'DOWN' | 'RIGHT' | 'UP' | 'LEFT';

/** Minimal ElkNode shape for building; elkjs types are permissive. */
export interface ElkGraphPort {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  layoutOptions?: ElkLayoutOptions;
}

export interface ElkGraphNode {
  id: string;
  width: number;
  height: number;
  children?: ElkGraphNode[];
  ports?: ElkGraphPort[];
  layoutOptions?: ElkLayoutOptions;
  labels?: { text: string }[];
}

export interface ElkGraphEdge {
  id: string;
  sources: string[];
  targets: string[];
  sourcePort?: string;
  targetPort?: string;
  labels?: { text: string; width: number; height: number }[];
}

export interface ElkGraphRoot {
  id: string;
  layoutOptions: ElkLayoutOptions;
  children: ElkGraphNode[];
  edges: ElkGraphEdge[];
}

export function implicitPortId(nodeId: string, side: GraphPortSide): string {
  return `${nodeId}__${side}`;
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

function createImplicitPorts(node: GraphNodeInput): GraphPortInput[] {
  return IMPLICIT_PORT_SIDES.map((side) => {
    return {
      id: implicitPortId(node.id, side),
      anchor: { kind: 'side', side },
      width: 0,
      height: 0,
    };
  });
}

export function portIdForSide(node: GraphNodeInput, side: GraphPortSide): string {
  const explicit = node.ports?.find((port: GraphPortInput) => port.anchor.side === side);
  if (explicit) return explicit.id;
  return implicitPortId(node.id, side);
}

function portsForNode(
  node: GraphNodeInput,
  endpointIds: Set<string>,
  enableImplicitPorts: boolean,
): GraphPortInput[] {
  const explicit = node.ports ?? [];
  const shouldFillMissingSides = enableImplicitPorts && endpointIds.has(node.id);
  if (!shouldFillMissingSides) {
    return explicit;
  }

  const byId = new Map<string, GraphPortInput>();
  const sides = new Set<GraphPortSide>();
  for (const port of explicit) {
    byId.set(port.id, port);
    sides.add(port.anchor.side);
  }
  for (const synthesized of createImplicitPorts(node)) {
    if (sides.has(synthesized.anchor.side)) continue;
    byId.set(synthesized.id, synthesized);
  }
  return [...byId.values()];
}

function mapPort(node: Pick<GraphNodeInput, 'width' | 'height'>, port: GraphPortInput): ElkGraphPort {
  const placement = resolveGraphPortPlacement(node, port);

  return {
    id: port.id,
    x: placement.x,
    y: placement.y,
    ...(placement.width !== 0 ? { width: placement.width } : {}),
    ...(placement.height !== 0 ? { height: placement.height } : {}),
    layoutOptions: {
      [ELK_PORT_SIDE_KEY]: ELK_SIDE_BY_PORT_SIDE[placement.side],
    },
  };
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

function resolveElkDirection(input: GraphLayoutInput, layoutOptions: ElkLayoutOptions): ElkDirection {
  const raw = layoutOptions['elk.direction'];
  if (raw === 'DOWN' || raw === 'RIGHT' || raw === 'UP' || raw === 'LEFT') {
    return raw;
  }
  switch (input.direction) {
    case 'LR':
      return 'RIGHT';
    case 'BT':
      return 'UP';
    case 'RL':
      return 'LEFT';
    case 'TB':
    default:
      return 'DOWN';
  }
}

function elkDirectionForNodeDirection(direction: LayoutDirection): ElkDirection {
  switch (direction) {
    case 'LR':
      return 'RIGHT';
    case 'BT':
      return 'UP';
    case 'RL':
      return 'LEFT';
    case 'TB':
    default:
      return 'DOWN';
  }
}

function formatElkPadding(insets: GraphInsetsInput): string {
  return `[top=${insets.top},left=${insets.left},bottom=${insets.bottom},right=${insets.right}]`;
}

function parseElkPadding(value: string | undefined): GraphInsetsInput | undefined {
  if (!value) return undefined;
  const match = /^\[top=(?<top>-?\d+(?:\.\d+)?),left=(?<left>-?\d+(?:\.\d+)?),bottom=(?<bottom>-?\d+(?:\.\d+)?),right=(?<right>-?\d+(?:\.\d+)?)\]$/u.exec(
    value.trim(),
  );
  if (!match?.groups) {
    throw new Error(`Unsupported ELK padding format: ${value}`);
  }

  return {
    top: Number(match.groups.top),
    left: Number(match.groups.left),
    bottom: Number(match.groups.bottom),
    right: Number(match.groups.right),
  };
}

function collectEndpointNodeIds(edges: GraphEdgeInput[]): Set<string> {
  const ids = new Set<string>();
  for (const edge of edges) {
    if (edge.id.startsWith(ORDERING_EDGE_PREFIX)) {
      continue;
    }
    ids.add(edge.source);
    ids.add(edge.target);
  }
  return ids;
}

function mapNode(
  node: GraphNodeInput,
  endpointIds: Set<string>,
  enableImplicitPorts: boolean,
  enableCompoundDirections: boolean,
  compoundPadding?: GraphInsetsInput,
): ElkGraphNode {
  const hasChildren = Boolean(node.children?.length);
  const ports = portsForNode(node, endpointIds, enableImplicitPorts);

  const layoutOptions: ElkLayoutOptions = {};
  if (hasChildren) {
    const resolvedPadding = node.padding ?? compoundPadding;
    if (resolvedPadding) {
      layoutOptions['elk.padding'] = formatElkPadding(resolvedPadding);
    }
    if (enableCompoundDirections && node.direction) {
      layoutOptions['elk.direction'] = elkDirectionForNodeDirection(node.direction);
      layoutOptions['elk.hierarchyHandling'] = 'SEPARATE_CHILDREN';
    }
  }
  if (ports.length > 0) {
    layoutOptions['elk.portConstraints'] = 'FIXED_POS';
  }

  return {
    id: node.id,
    width: node.width,
    height: node.height,
    ...(hasChildren
      ? {
          children: node.children!.map((child: GraphNodeInput) => (
            mapNode(child, endpointIds, enableImplicitPorts, enableCompoundDirections, compoundPadding)
          )),
        }
      : {}),
    ...(ports.length > 0 ? { ports: ports.map((port) => mapPort(node, port)) } : {}),
    ...(Object.keys(layoutOptions).length > 0 ? { layoutOptions } : {}),
  };
}

function resolvePortIdForSide(node: GraphNodeInput, side: GraphPortSide): string | undefined {
  return portIdForSide(node, side);
}

function indexNodesById(nodes: GraphNodeInput[], out = new Map<string, GraphNodeInput>()): Map<string, GraphNodeInput> {
  for (const node of nodes) {
    out.set(node.id, node);
    if (node.children?.length) {
      indexNodesById(node.children, out);
    }
  }
  return out;
}

function indexInputParentIds(
  nodes: GraphNodeInput[],
  rootId: string,
  parents = new Map<string, string>(),
): Map<string, string> {
  for (const node of nodes) {
    parents.set(node.id, rootId);
    if (node.children?.length) {
      indexInputParentIds(node.children, node.id, parents);
    }
  }
  return parents;
}

function indexElkNodesById(
  nodes: ElkGraphNode[],
  out = new Map<string, ElkGraphNode>(),
): Map<string, ElkGraphNode> {
  for (const node of nodes) {
    out.set(node.id, node);
    if (node.children?.length) {
      indexElkNodesById(node.children, out);
    }
  }
  return out;
}

function findCommonAncestor(
  sourceId: string,
  targetId: string,
  parentById: Map<string, string>,
  rootId: string,
): string {
  if (sourceId === targetId) {
    return parentById.get(sourceId) ?? rootId;
  }
  const visited = new Set<string>();
  let currentId: string | undefined = sourceId;
  while (currentId) {
    visited.add(currentId);
    currentId = parentById.get(currentId);
  }
  currentId = targetId;
  while (currentId) {
    if (visited.has(currentId)) {
      return currentId;
    }
    currentId = parentById.get(currentId);
  }
  return rootId;
}

function setIncludeChildrenPolicy(
  nodeId: string | undefined,
  ancestorId: string,
  parentById: Map<string, string>,
  nodesById: Map<string, ElkGraphNode>,
): void {
  if (!nodeId) return;
  const node = nodesById.get(nodeId);
  if (!node) return;
  node.layoutOptions = {
    ...(node.layoutOptions ?? {}),
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  };
  if (node.id !== ancestorId) {
    setIncludeChildrenPolicy(parentById.get(nodeId), ancestorId, parentById, nodesById);
  }
}

function hasNestedChildren(nodes: GraphNodeInput[]): boolean {
  return nodes.some((node) => Boolean(node.children?.length));
}

export function buildElkGraph(
  input: GraphLayoutInput,
  layoutOptions: ElkLayoutOptions,
): ElkGraphRoot {
  const rootOptions = { ...layoutOptions };
  const compoundPadding = parseElkPadding(rootOptions['elk.padding']);
  delete rootOptions['elk.padding'];
  delete rootOptions['elk.portConstraints'];

  const endpointIds = collectEndpointNodeIds(input.edges);
  const nodesById = indexNodesById(input.nodes);
  const effectiveDirection = resolveElkDirection(input, rootOptions);
  const hasOrderingEdges = input.edges.some((edge) => edge.id.startsWith(ORDERING_EDGE_PREFIX));
  const enableImplicitPorts = rootOptions['elk.algorithm'] === 'layered' && !hasOrderingEdges;
  const enableCompoundDirections = rootOptions['elk.algorithm'] === 'layered';
  const sourceSide = sourceSideForDirection(effectiveDirection);
  const targetSide = oppositeSide(sourceSide);

  const edges: ElkGraphEdge[] = input.edges.map((edge: GraphEdgeInput) => {
    const sourceNode = nodesById.get(edge.source);
    const targetNode = nodesById.get(edge.target);
    const isOrderingEdge = edge.id.startsWith(ORDERING_EDGE_PREFIX);
    const resolvedSourcePort = edge.sourcePort
      ?? (!isOrderingEdge && enableImplicitPorts && sourceNode ? resolvePortIdForSide(sourceNode, sourceSide) : undefined);
    const resolvedTargetPort = edge.targetPort
      ?? (!isOrderingEdge && enableImplicitPorts && targetNode ? resolvePortIdForSide(targetNode, targetSide) : undefined);

    return {
      id: edge.id,
      sources: [resolvedSourcePort ?? edge.source],
      targets: [resolvedTargetPort ?? edge.target],
      ...(edge.labels?.length
        ? {
            labels: edge.labels.map((label: NonNullable<GraphEdgeInput["labels"]>[number]) => ({
              text: label.text,
              width: label.width,
              height: label.height,
            })),
          }
        : {}),
    };
  });

  if (enableCompoundDirections && hasNestedChildren(input.nodes) && !rootOptions['elk.hierarchyHandling']) {
    rootOptions['elk.hierarchyHandling'] = 'INCLUDE_CHILDREN';
  }

  const mappedChildren = input.nodes.map((node: GraphNodeInput) => (
    mapNode(node, endpointIds, enableImplicitPorts, enableCompoundDirections, compoundPadding)
  ));

  if (enableCompoundDirections && hasNestedChildren(input.nodes)) {
    const parentById = indexInputParentIds(input.nodes, input.id);
    const elkNodesById = indexElkNodesById(mappedChildren);
    for (const edge of input.edges) {
      const sourceParentId = parentById.get(edge.source);
      const targetParentId = parentById.get(edge.target);
      if (!sourceParentId || !targetParentId || sourceParentId === targetParentId) {
        continue;
      }
      const ancestorId = findCommonAncestor(edge.source, edge.target, parentById, input.id);
      setIncludeChildrenPolicy(edge.source, ancestorId, parentById, elkNodesById);
      setIncludeChildrenPolicy(edge.target, ancestorId, parentById, elkNodesById);
    }
  }

  return {
    id: input.id,
    layoutOptions: rootOptions,
    children: mappedChildren,
    edges,
  };
}

export function buildElkGraphFromInput(input: GraphLayoutInput): ElkGraphRoot {
  const layoutOptions = buildLayeredLayoutOptions({
    direction: input.direction,
    spacingProfile: input.spacingProfile ?? 'normal',
  });
  return buildElkGraph(input, layoutOptions);
}
