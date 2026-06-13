import type {
  GraphEdgeInput,
  GraphLayoutInput,
  GraphNodeInput,
  GraphPortInput,
  GraphPortSide,
} from '@diagram-generator/graph-layout-core';
import type { ElkLayoutOptions } from './layered-options.js';
import { buildLayeredLayoutOptions } from './layered-options.js';

const ELK_PORT_SIDE_KEY = 'org.eclipse.elk.port.side';
const IMPLICIT_PORT_SIDES: GraphPortSide[] = ['top', 'right', 'bottom', 'left'];

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

function portPointForSide(
  width: number,
  height: number,
  side: GraphPortSide,
): Pick<GraphPortInput, 'x' | 'y'> {
  switch (side) {
    case 'top':
      return { x: width / 2, y: 0 };
    case 'right':
      return { x: width, y: height / 2 };
    case 'bottom':
      return { x: width / 2, y: height };
    case 'left':
      return { x: 0, y: height / 2 };
  }
}

function createImplicitPorts(node: GraphNodeInput): GraphPortInput[] {
  return IMPLICIT_PORT_SIDES.map((side) => {
    const point = portPointForSide(node.width, node.height, side);
    return {
      id: implicitPortId(node.id, side),
      side,
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    };
  });
}

export function portIdForSide(node: GraphNodeInput, side: GraphPortSide): string {
  const explicit = node.ports?.find((port: GraphPortInput) => port.side === side);
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
    sides.add(port.side);
  }
  for (const synthesized of createImplicitPorts(node)) {
    if (sides.has(synthesized.side)) continue;
    byId.set(synthesized.id, synthesized);
  }
  return [...byId.values()];
}

function mapPort(port: GraphPortInput): ElkGraphPort {
  const elkSide = {
    top: 'NORTH',
    right: 'EAST',
    bottom: 'SOUTH',
    left: 'WEST',
  } satisfies Record<GraphPortSide, string>;

  return {
    id: port.id,
    x: port.x,
    y: port.y,
    ...(port.width != null ? { width: port.width } : {}),
    ...(port.height != null ? { height: port.height } : {}),
    layoutOptions: {
      [ELK_PORT_SIDE_KEY]: elkSide[port.side],
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
  return input.direction === 'LR' ? 'RIGHT' : 'DOWN';
}

function collectEndpointNodeIds(edges: GraphEdgeInput[]): Set<string> {
  const ids = new Set<string>();
  for (const edge of edges) {
    ids.add(edge.source);
    ids.add(edge.target);
  }
  return ids;
}

function mapNode(
  node: GraphNodeInput,
  endpointIds: Set<string>,
  enableImplicitPorts: boolean,
  compoundPadding?: string,
): ElkGraphNode {
  const hasChildren = Boolean(node.children?.length);
  const ports = portsForNode(node, endpointIds, enableImplicitPorts);

  const layoutOptions: ElkLayoutOptions = {};
  if (hasChildren) {
    const resolvedPadding = node.padding ?? compoundPadding;
    if (resolvedPadding) {
      layoutOptions['elk.padding'] = resolvedPadding;
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
            mapNode(child, endpointIds, enableImplicitPorts, compoundPadding)
          )),
        }
      : {}),
    ...(ports.length > 0 ? { ports: ports.map(mapPort) } : {}),
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

export function buildElkGraph(
  input: GraphLayoutInput,
  layoutOptions: ElkLayoutOptions,
): ElkGraphRoot {
  const rootOptions = { ...layoutOptions };
  const compoundPadding = rootOptions['elk.padding'];
  delete rootOptions['elk.padding'];
  delete rootOptions['elk.portConstraints'];

  const endpointIds = collectEndpointNodeIds(input.edges);
  const nodesById = indexNodesById(input.nodes);
  const effectiveDirection = resolveElkDirection(input, rootOptions);
  const enableImplicitPorts = rootOptions['elk.algorithm'] === 'layered';
  const sourceSide = sourceSideForDirection(effectiveDirection);
  const targetSide = oppositeSide(sourceSide);

  const edges: ElkGraphEdge[] = input.edges.map((edge: GraphEdgeInput) => {
    const sourceNode = nodesById.get(edge.source);
    const targetNode = nodesById.get(edge.target);
    const resolvedSourcePort = edge.sourcePort
      ?? (enableImplicitPorts && sourceNode ? resolvePortIdForSide(sourceNode, sourceSide) : undefined);
    const resolvedTargetPort = edge.targetPort
      ?? (enableImplicitPorts && targetNode ? resolvePortIdForSide(targetNode, targetSide) : undefined);

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

  return {
    id: input.id,
    layoutOptions: rootOptions,
    children: input.nodes.map((node: GraphNodeInput) => (
      mapNode(node, endpointIds, enableImplicitPorts, compoundPadding)
    )),
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
