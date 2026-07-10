import type {
  GraphEdgeInput,
  GraphContentAlignment,
  GraphInsetsInput,
  GraphLayoutInput,
  GraphNodeKind,
  LayoutDirection,
  GraphNodeInput,
  GraphPortInput,
  GraphPortSide,
} from '@diagram-generator/graph-layout-core';
import {
  resolveGraphNodeKind,
  resolveGraphPortPlacement,
} from '@diagram-generator/graph-layout-core';
import type { ElkLayoutOptions } from './layered-options.js';
import { buildLayeredLayoutOptions } from './layered-options.js';
import { findCommonAncestor, type TreeData } from './find-common-ancestor.js';

const ELK_PORT_SIDE_KEY = 'org.eclipse.elk.port.side';
const IMPLICIT_PORT_SIDES: GraphPortSide[] = ['top', 'right', 'bottom', 'left'];
const COMPOUND_SPACING_BASE = '30';
const COMPOUND_LABEL_PLACEMENT = '[H_CENTER V_TOP, INSIDE]';
const DEFAULT_MODEL_ORDER_STRATEGY = 'NODES_AND_EDGES';
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
  width?: number;
  height?: number;
  children?: ElkGraphNode[];
  edges?: ElkGraphEdge[];
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

function isLayeredAlgorithm(layoutOptions: ElkLayoutOptions): boolean {
  return layoutOptions['elk.algorithm'] === 'layered';
}

function resolveNodeKind(node: GraphNodeInput): GraphNodeKind {
  return resolveGraphNodeKind(node);
}

export function buildSubgraphLayoutOptions(
  node: Pick<GraphNodeInput, 'direction' | 'kind' | 'children'>,
  algorithm?: string,
  inheritedLayoutOptions?: ElkLayoutOptions,
  includeLocalDirection = Boolean(node.direction),
  activateNestedLayout = Boolean(node.direction),
): ElkLayoutOptions {
  const layoutOptions: ElkLayoutOptions = {
    'spacing.baseValue': COMPOUND_SPACING_BASE,
    'nodeLabels.placement': COMPOUND_LABEL_PLACEMENT,
    'elk.layered.considerModelOrder.strategy': DEFAULT_MODEL_ORDER_STRATEGY,
  };

  if (activateNestedLayout) {
    Object.assign(layoutOptions, inheritedLayoutOptions ?? {});
    if (algorithm) {
      layoutOptions['elk.algorithm'] = algorithm;
    }
    if (node.direction && includeLocalDirection) {
      layoutOptions['elk.direction'] = elkDirectionForNodeDirection(node.direction);
    }
    layoutOptions['elk.hierarchyHandling'] = 'SEPARATE_CHILDREN';
  }

  return layoutOptions;
}

function formatElkPadding(insets: GraphInsetsInput): string {
  return `[top=${insets.top},left=${insets.left},bottom=${insets.bottom},right=${insets.right}]`;
}

function formatElkMinimumSize(width: number, height: number): string {
  return `(${height},${width})`;
}

function formatElkContentAlignment(alignment: GraphContentAlignment): string {
  switch (alignment) {
    case 'top-center':
      return '[V_TOP, H_CENTER]';
    case 'top-right':
      return '[V_TOP, H_RIGHT]';
    case 'center-left':
      return '[V_CENTER, H_LEFT]';
    case 'center':
      return '[V_CENTER, H_CENTER]';
    case 'center-right':
      return '[V_CENTER, H_RIGHT]';
    case 'bottom-left':
      return '[V_BOTTOM, H_LEFT]';
    case 'bottom-center':
      return '[V_BOTTOM, H_CENTER]';
    case 'bottom-right':
      return '[V_BOTTOM, H_RIGHT]';
    case 'top-left':
    default:
      return '[V_TOP, H_LEFT]';
  }
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
    ids.add(edge.source);
    ids.add(edge.target);
  }
  return ids;
}

function collectCrossHierarchyEndpointIds(
  edges: GraphEdgeInput[],
  parentById: Map<string, string>,
): Set<string> {
  const ids = new Set<string>();
  for (const edge of edges) {
    const sourceParentId = parentById.get(edge.source);
    const targetParentId = parentById.get(edge.target);
    if (!sourceParentId || !targetParentId || sourceParentId === targetParentId) {
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
  crossHierarchyEndpointIds: Set<string>,
  enableImplicitPorts: boolean,
  enableCompoundDirections: boolean,
  compoundPadding?: GraphInsetsInput,
  inheritedCompoundLayoutOptions?: ElkLayoutOptions,
  depth = 0,
  rootDirection?: LayoutDirection,
): ElkGraphNode {
  const hasChildren = Boolean(node.children?.length);
  const nodeKind = resolveNodeKind(node);
  const isCompound = nodeKind === 'compound';
  const isNestedParent = nodeKind !== 'node';
  const ports = portsForNode(
    node,
    endpointIds,
    enableImplicitPorts && !crossHierarchyEndpointIds.has(node.id),
  );
  const hasExplicitSize = node.width > 0 || node.height > 0;

  const layoutOptions: ElkLayoutOptions = {};
  if (hasChildren) {
    const resolvedPadding = node.padding ?? compoundPadding;
    if (resolvedPadding) {
      layoutOptions['elk.padding'] = formatElkPadding(resolvedPadding);
    }
    if (node.contentAlignment) {
      layoutOptions['org.eclipse.elk.contentAlignment'] = formatElkContentAlignment(node.contentAlignment);
    }
    if (hasExplicitSize && isCompound) {
      layoutOptions['org.eclipse.elk.nodeSize.constraints'] = 'MINIMUM_SIZE';
      layoutOptions['org.eclipse.elk.nodeSize.minimum'] = formatElkMinimumSize(node.width, node.height);
    }
    if (enableCompoundDirections && isNestedParent) {
      const includeLocalDirection = !node.direction
        ? false
        : depth > 0 || !rootDirection || node.direction !== rootDirection;
      const activateNestedLayout = Boolean(node.direction) || (node.children?.length ?? 0) > 1;
      Object.assign(
        layoutOptions,
        buildSubgraphLayoutOptions(
          node,
          'layered',
          inheritedCompoundLayoutOptions,
          includeLocalDirection,
          activateNestedLayout,
        ),
      );
    }
  }
  if (ports.length > 0) {
    layoutOptions['elk.portConstraints'] = 'FIXED_POS';
  }

  return {
    id: node.id,
    ...(hasExplicitSize ? { width: node.width, height: node.height } : {}),
    ...(hasChildren
      ? {
          children: node.children!.map((child: GraphNodeInput) => (
            mapNode(
              child,
              endpointIds,
              crossHierarchyEndpointIds,
              enableImplicitPorts,
              enableCompoundDirections,
              compoundPadding,
              inheritedCompoundLayoutOptions,
              depth + 1,
              rootDirection,
            )
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

export function buildInputTreeData(
  nodes: GraphNodeInput[],
  rootId: string,
): TreeData {
  const parentById: TreeData['parentById'] = {};
  const childrenById: TreeData['childrenById'] = { [rootId]: [] };

  const visit = (list: GraphNodeInput[], parentId: string): void => {
    childrenById[parentId] ??= [];
    for (const node of list) {
      parentById[node.id] = parentId;
      childrenById[parentId]!.push(node.id);
      if (node.children?.length) {
        childrenById[node.id] ??= [];
        visit(node.children, node.id);
      }
    }
  };

  visit(nodes, rootId);
  return { parentById, childrenById };
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

function mapElkEdge(
  edge: GraphEdgeInput,
  nodesById: Map<string, GraphNodeInput>,
  crossHierarchyEndpointIds: Set<string>,
  enableImplicitPorts: boolean,
  sourceSide: GraphPortSide,
  targetSide: GraphPortSide,
): ElkGraphEdge {
  const sourceNode = nodesById.get(edge.source);
  const targetNode = nodesById.get(edge.target);
  const resolvedSourcePort = edge.sourcePort
    ?? (
      enableImplicitPorts
      && sourceNode
      && !crossHierarchyEndpointIds.has(edge.source)
        ? resolvePortIdForSide(sourceNode, sourceSide)
        : undefined
    );
  const resolvedTargetPort = edge.targetPort
    ?? (
      enableImplicitPorts
      && targetNode
      && !crossHierarchyEndpointIds.has(edge.target)
        ? resolvePortIdForSide(targetNode, targetSide)
        : undefined
    );

  return {
    id: edge.id,
    sources: [resolvedSourcePort ?? edge.source],
    targets: [resolvedTargetPort ?? edge.target],
    ...(edge.labels?.length
      ? {
          labels: edge.labels.map((label: NonNullable<GraphEdgeInput['labels']>[number]) => ({
            text: label.text,
            width: label.width,
            height: label.height,
          })),
        }
      : {}),
  };
}

function assignEdgeToAncestor(
  edge: ElkGraphEdge,
  ancestorId: string,
  rootId: string,
  rootEdges: ElkGraphEdge[],
  nodesById: Map<string, ElkGraphNode>,
): void {
  if (ancestorId === rootId) {
    rootEdges.push(edge);
    return;
  }

  const ancestor = nodesById.get(ancestorId);
  if (!ancestor) {
    rootEdges.push(edge);
    return;
  }

  if (!ancestor.edges) {
    ancestor.edges = [];
  }
  ancestor.edges.push(edge);
}

function setIncludeChildrenPolicy(
  nodeId: string | undefined,
  ancestorId: string,
  parentById: Map<string, string>,
  inputNodesById: Map<string, GraphNodeInput>,
  nodesById: Map<string, ElkGraphNode>,
  allowDirectOrderingCluster = false,
): void {
  if (!nodeId) return;
  const inputNode = inputNodesById.get(nodeId);
  const node = nodesById.get(nodeId);
  if (!node) return;
  if (
    inputNode
    && resolveNodeKind(inputNode) === 'ordering-cluster'
    && parentById.get(nodeId) === ancestorId
    && !allowDirectOrderingCluster
  ) {
    return;
  }
  const layoutOptions: ElkLayoutOptions = {
    ...(node.layoutOptions ?? {}),
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  };
  delete layoutOptions['elk.algorithm'];
  if (node.id !== ancestorId) {
    delete layoutOptions['elk.layered.considerModelOrder.strategy'];
  }
  node.layoutOptions = layoutOptions;
  if (node.id !== ancestorId) {
    setIncludeChildrenPolicy(
      parentById.get(nodeId),
      ancestorId,
      parentById,
      inputNodesById,
      nodesById,
      allowDirectOrderingCluster,
    );
  }
}

function hasNestedChildren(nodes: GraphNodeInput[]): boolean {
  return nodes.some((node) => Boolean(node.children?.length));
}

function hasCompoundNodes(nodes: GraphNodeInput[]): boolean {
  return nodes.some((node) => resolveGraphNodeKind(node) !== 'node' || hasCompoundNodes(node.children ?? []));
}

function edgeLayoutAncestorId(
  edge: GraphEdgeInput,
  rootId: string,
  treeData: TreeData,
): string {
  const ancestorId = findCommonAncestor(edge.source, edge.target, treeData);
  if (ancestorId === edge.source || ancestorId === edge.target) {
    return treeData.parentById[ancestorId] ?? rootId;
  }
  return ancestorId;
}

function hasRootLcaCrossHierarchyEdges(
  edges: GraphEdgeInput[],
  rootId: string,
  treeData: TreeData,
  parentById: Map<string, string>,
): boolean {
  return edges.some((edge) => {
    const sourceParentId = parentById.get(edge.source);
    const targetParentId = parentById.get(edge.target);
    return Boolean(
      sourceParentId
      && targetParentId
      && sourceParentId !== targetParentId
      && edgeLayoutAncestorId(edge, rootId, treeData) === rootId,
    );
  });
}

export function buildElkGraph(
  input: GraphLayoutInput,
  layoutOptions: ElkLayoutOptions,
): ElkGraphRoot {
  const rootOptions = { ...layoutOptions };
  const compoundPadding = parseElkPadding(rootOptions['elk.padding']);
  delete rootOptions['elk.padding'];
  delete rootOptions['elk.portConstraints'];
  delete rootOptions['elk.hierarchyHandling'];

  const endpointIds = collectEndpointNodeIds(input.edges);
  const nodesById = indexNodesById(input.nodes);
  const effectiveDirection = resolveElkDirection(input, rootOptions);
  const layeredAlgorithm = isLayeredAlgorithm(rootOptions);
  const enableImplicitPorts = layeredAlgorithm && !input.routeCrossHierarchyEdgesToBorders;
  const enableCompoundDirections = layeredAlgorithm;
  const inheritedCompoundLayoutOptions = layeredAlgorithm ? { ...rootOptions } : undefined;
  const sourceSide = sourceSideForDirection(effectiveDirection);
  const targetSide = oppositeSide(sourceSide);
  const parentById = indexInputParentIds(input.nodes, input.id);
  const crossHierarchyEndpointIds = collectCrossHierarchyEndpointIds(input.edges, parentById);
  const treeData = buildInputTreeData(input.nodes, input.id);
  if (layeredAlgorithm && hasCompoundNodes(input.nodes) && !rootOptions['elk.layered.considerModelOrder.strategy']) {
    rootOptions['elk.layered.considerModelOrder.strategy'] = DEFAULT_MODEL_ORDER_STRATEGY;
  }
  if (layeredAlgorithm && hasRootLcaCrossHierarchyEdges(input.edges, input.id, treeData, parentById)) {
    rootOptions['elk.hierarchyHandling'] = 'INCLUDE_CHILDREN';
  }

  const mappedChildren = input.nodes.map((node: GraphNodeInput) => (
    mapNode(
      node,
      endpointIds,
      crossHierarchyEndpointIds,
      enableImplicitPorts,
      enableCompoundDirections,
      compoundPadding,
      inheritedCompoundLayoutOptions,
      0,
      input.direction,
    )
  ));
  const edges: ElkGraphEdge[] = [];
  const elkNodesById = indexElkNodesById(mappedChildren);

  if (enableCompoundDirections && hasNestedChildren(input.nodes)) {
    for (const edge of input.edges) {
      const mappedEdge = mapElkEdge(
        edge,
        nodesById,
        crossHierarchyEndpointIds,
        enableImplicitPorts,
        sourceSide,
        targetSide,
      );
      const sourceParentId = parentById.get(edge.source);
      const targetParentId = parentById.get(edge.target);
      if (!sourceParentId || !targetParentId) {
        edges.push(mappedEdge);
        continue;
      }

      const ancestorId = edgeLayoutAncestorId(edge, input.id, treeData);
      assignEdgeToAncestor(mappedEdge, ancestorId, input.id, edges, elkNodesById);

      if (sourceParentId === targetParentId) {
        continue;
      }
      setIncludeChildrenPolicy(
        sourceParentId,
        ancestorId,
        parentById,
        nodesById,
        elkNodesById,
        true,
      );
      setIncludeChildrenPolicy(
        targetParentId,
        ancestorId,
        parentById,
        nodesById,
        elkNodesById,
        true,
      );
    }
  } else {
    edges.push(...input.edges.map((edge) => mapElkEdge(
      edge,
      nodesById,
      crossHierarchyEndpointIds,
      enableImplicitPorts,
      sourceSide,
      targetSide,
    )));
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
