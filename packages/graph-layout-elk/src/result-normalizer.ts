import type {
  GraphPortSide,
  GraphEdgeInput,
  GraphLayoutInput,
  GraphLayoutResult,
  PlacedEdge,
  PlacedEdgeLabel,
  PlacedNode,
  Point2,
  RoutedEdgeSection,
} from '@diagram-generator/graph-layout-core';
import { roundToGrid as snap } from '@diagram-generator/graph-layout-core';
import { indexPlacedNodes, toAbsolutePlacedNodes } from './node-bounds.js';

interface ElkLayoutPoint {
  x?: number;
  y?: number;
}

interface ElkLayoutSection {
  startPoint?: ElkLayoutPoint;
  endPoint?: ElkLayoutPoint;
  bendPoints?: ElkLayoutPoint[];
}

interface ElkLayoutLabel {
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface ElkLayoutPort {
  id: string;
  x?: number;
  y?: number;
}

interface ElkLayoutEdge {
  id: string;
  sources?: string[];
  targets?: string[];
  sourcePort?: string;
  targetPort?: string;
  sections?: ElkLayoutSection[];
  labels?: ElkLayoutLabel[];
  /** ELK: edge path coordinates are relative to this compound node (or root graph id). */
  container?: string;
}

interface ElkLayoutNode {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  ports?: ElkLayoutPort[];
  children?: ElkLayoutNode[];
  edges?: ElkLayoutEdge[];
}

interface PortPlacement {
  point: Point2;
  side: GraphPortSide;
  nodeId: string;
}

function snapPoint(p: Point2): Point2 {
  return { x: snap(p.x), y: snap(p.y) };
}

function mapSection(section: ElkLayoutSection): RoutedEdgeSection | null {
  if (section.startPoint?.x == null || section.startPoint?.y == null) return null;
  if (section.endPoint?.x == null || section.endPoint?.y == null) return null;

  const bendPoints = section.bendPoints
    ?.filter((bp) => bp.x != null && bp.y != null)
    .map((bp) => snapPoint({ x: bp.x!, y: bp.y! }));

  return {
    startPoint: snapPoint({ x: section.startPoint.x, y: section.startPoint.y }),
    endPoint: snapPoint({ x: section.endPoint.x, y: section.endPoint.y }),
    ...(bendPoints?.length ? { bendPoints } : {}),
  };
}

function mapPlacedNode(node: ElkLayoutNode): PlacedNode {
  return {
    id: node.id,
    x: snap(node.x ?? 0),
    y: snap(node.y ?? 0),
    width: node.width ?? 0,
    height: node.height ?? 0,
    ...(node.children?.length
      ? { children: node.children.map(mapPlacedNode) }
      : {}),
  };
}

function collectEdges(root: ElkLayoutNode, containerId = root.id): ElkLayoutEdge[] {
  const out: ElkLayoutEdge[] = (root.edges ?? []).map((edge) => ({
    ...edge,
    container: edge.container ?? containerId,
  }));
  for (const child of root.children ?? []) {
    out.push(...collectEdges(child, child.id));
  }
  return out;
}

function collectAbsolutePortPositions(
  nodes: ElkLayoutNode[],
  parentX = 0,
  parentY = 0,
  out = new Map<string, PortPlacement>(),
): Map<string, PortPlacement> {
  for (const node of nodes) {
    const nodeX = snap(parentX + (node.x ?? 0));
    const nodeY = snap(parentY + (node.y ?? 0));
    for (const port of node.ports ?? []) {
      if (port.x == null || port.y == null) continue;
      const point = snapPoint({ x: nodeX + port.x, y: nodeY + port.y });
      const width = node.width ?? 0;
      const height = node.height ?? 0;
      const side: GraphPortSide =
        port.y === 0 ? 'top'
          : port.y === height ? 'bottom'
            : port.x === 0 ? 'left'
              : 'right';
      out.set(port.id, { point, side, nodeId: node.id });
    }
    if (node.children?.length) {
      collectAbsolutePortPositions(node.children, nodeX, nodeY, out);
    }
  }
  return out;
}

function offsetSection(section: RoutedEdgeSection, dx: number, dy: number): RoutedEdgeSection {
  if (dx === 0 && dy === 0) return section;
  return {
    startPoint: snapPoint({ x: section.startPoint.x + dx, y: section.startPoint.y + dy }),
    endPoint: snapPoint({ x: section.endPoint.x + dx, y: section.endPoint.y + dy }),
    ...(section.bendPoints?.length
      ? {
          bendPoints: section.bendPoints.map((bp: Point2) =>
            snapPoint({ x: bp.x + dx, y: bp.y + dy }),
          ),
        }
      : {}),
  };
}

function containerOffset(
  containerId: string | undefined,
  rootId: string,
  nodesById: Map<string, PlacedNode>,
): Point2 {
  if (!containerId || containerId === rootId) return { x: 0, y: 0 };
  const node = nodesById.get(containerId);
  if (!node) return { x: 0, y: 0 };
  return { x: node.x, y: node.y };
}

function mapEdgeLabels(
  labels: ElkLayoutLabel[] | undefined,
  offset: Point2,
): PlacedEdgeLabel[] {
  if (!labels?.length) return [];
  return labels
    .filter((label) => label.text != null && label.x != null && label.y != null)
    .map((label) => ({
      text: label.text!,
      x: snap(label.x! + offset.x),
      y: snap(label.y! + offset.y),
      width: label.width ?? 0,
      height: label.height ?? 0,
    }));
}

function indexInputEdges(
  inputEdges: GraphLayoutInput['edges'],
): {
  byId: Map<string, GraphEdgeInput>;
  byEndpoints: Map<string, GraphEdgeInput>;
} {
  const byId = new Map<string, GraphEdgeInput>();
  const byEndpoints = new Map<string, GraphEdgeInput>();
  for (const edge of inputEdges) {
    byId.set(edge.id, edge);
    byEndpoints.set(`${edge.source}->${edge.target}`, edge);
  }
  return { byId, byEndpoints };
}

function alignSectionsToPortPlacements(
  sections: RoutedEdgeSection[],
  sourcePortPlacement: PortPlacement | undefined,
  targetPortPlacement: PortPlacement | undefined,
): RoutedEdgeSection[] {
  if (sections.length < 1) return sections;

  const alignToPortSide = (point: Point2, placement: PortPlacement): Point2 => {
    switch (placement.side) {
      case 'top':
      case 'bottom':
        return snapPoint({ x: point.x, y: placement.point.y });
      case 'left':
      case 'right':
        return snapPoint({ x: placement.point.x, y: point.y });
    }
  };

  return sections.map((section, index) => ({
    ...section,
    ...(index === 0 && sourcePortPlacement
      ? { startPoint: alignToPortSide(section.startPoint, sourcePortPlacement) }
      : {}),
    ...(index === sections.length - 1 && targetPortPlacement
      ? { endPoint: alignToPortSide(section.endPoint, targetPortPlacement) }
      : {}),
  }));
}

function normalizeEdges(
  edges: ElkLayoutEdge[],
  rootId: string,
  nodesById: Map<string, PlacedNode>,
  portPositions: Map<string, PortPlacement>,
  inputEdges: ReturnType<typeof indexInputEdges>,
): PlacedEdge[] {
  return edges.map((edge) => {
    const offset = containerOffset(edge.container, rootId, nodesById);
    const sections = (edge.sections ?? [])
      .map(mapSection)
      .filter((s): s is RoutedEdgeSection => s != null)
      .map((section) => offsetSection(section, offset.x, offset.y));

    const inputEdge = inputEdges.byId.get(edge.id)
      ?? inputEdges.byEndpoints.get(`${edge.sources?.[0] ?? ''}->${edge.targets?.[0] ?? ''}`);
    const sourceRef = edge.sourcePort ?? edge.sources?.[0] ?? '';
    const targetRef = edge.targetPort ?? edge.targets?.[0] ?? '';
    const sourcePortPlacement = sourceRef ? portPositions.get(sourceRef) : undefined;
    const targetPortPlacement = targetRef ? portPositions.get(targetRef) : undefined;
    const sourcePortId = sourcePortPlacement ? sourceRef : inputEdge?.sourcePort;
    const targetPortId = targetPortPlacement ? targetRef : inputEdge?.targetPort;
    const sourceId = inputEdge?.source ?? sourcePortPlacement?.nodeId ?? edge.sources?.[0] ?? '';
    const targetId = inputEdge?.target ?? targetPortPlacement?.nodeId ?? edge.targets?.[0] ?? '';
    const normalizedSections = alignSectionsToPortPlacements(
      sections,
      sourcePortPlacement,
      targetPortPlacement,
    );

    return {
      id: edge.id,
      source: sourceId,
      target: targetId,
      ...(sourcePortId ? { sourcePort: sourcePortId } : {}),
      ...(targetPortId ? { targetPort: targetPortId } : {}),
      ...(sourcePortPlacement?.side ? { sourcePortSide: sourcePortPlacement.side } : {}),
      ...(targetPortPlacement?.side ? { targetPortSide: targetPortPlacement.side } : {}),
      sections: normalizedSections,
      labels: mapEdgeLabels(edge.labels, offset),
    };
  });
}

function walkPlacedNodes(nodes: PlacedNode[], visit: (node: PlacedNode) => void): void {
  for (const node of nodes) {
    visit(node);
    if (node.children?.length) {
      walkPlacedNodes(node.children, visit);
    }
  }
}

function shiftPlacedNodes(nodes: PlacedNode[], dx: number, dy: number): PlacedNode[] {
  if (dx === 0 && dy === 0) return nodes;
  return nodes.map((node) => ({
    ...node,
    x: snap(node.x - dx),
    y: snap(node.y - dy),
    ...(node.children?.length
      ? { children: shiftPlacedNodes(node.children, dx, dy) }
      : {}),
  }));
}

function shiftEdges(edges: PlacedEdge[], dx: number, dy: number): PlacedEdge[] {
  if (dx === 0 && dy === 0) return edges;
  return edges.map((edge) => ({
    ...edge,
    sections: edge.sections.map((section) => ({
      startPoint: snapPoint({ x: section.startPoint.x - dx, y: section.startPoint.y - dy }),
      endPoint: snapPoint({ x: section.endPoint.x - dx, y: section.endPoint.y - dy }),
      ...(section.bendPoints?.length
        ? {
            bendPoints: section.bendPoints.map((bp) =>
              snapPoint({ x: bp.x - dx, y: bp.y - dy }),
            ),
          }
        : {}),
    })),
    labels: edge.labels?.map((label) => ({
      ...label,
      x: snap(label.x - dx),
      y: snap(label.y - dy),
    })),
  }));
}

function normalizedGraphBounds(
  nodes: PlacedNode[],
  edges: PlacedEdge[],
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  walkPlacedNodes(nodes, (node) => {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  });

  for (const edge of edges) {
    for (const section of edge.sections) {
      const points = [
        section.startPoint,
        ...(section.bendPoints ?? []),
        section.endPoint,
      ];
      for (const point of points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    }
    for (const label of edge.labels ?? []) {
      minX = Math.min(minX, label.x);
      minY = Math.min(minY, label.y);
      maxX = Math.max(maxX, label.x + label.width);
      maxY = Math.max(maxY, label.y + label.height);
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return { minX, minY, maxX, maxY };
}

export function normalizeElkLayoutResult(
  input: GraphLayoutInput,
  elkRoot: ElkLayoutNode,
  engine: GraphLayoutResult['engine'] = 'elk-layered',
): GraphLayoutResult {
  const nodes = toAbsolutePlacedNodes((elkRoot.children ?? []).map(mapPlacedNode));
  const nodesById = indexPlacedNodes(nodes);
  const portPositions = collectAbsolutePortPositions(elkRoot.children ?? []);
  const edges = normalizeEdges(
    collectEdges(elkRoot),
    input.id,
    nodesById,
    portPositions,
    indexInputEdges(input.edges),
  );
  const bounds = normalizedGraphBounds(nodes, edges);
  const shiftedNodes = shiftPlacedNodes(nodes, bounds.minX, bounds.minY);
  const shiftedEdges = shiftEdges(edges, bounds.minX, bounds.minY);
  const width = snap(Math.max(0, bounds.maxX - bounds.minX));
  const height = snap(Math.max(0, bounds.maxY - bounds.minY));

  return {
    width,
    height,
    nodes: shiftedNodes,
    edges: shiftedEdges,
    engine,
    direction: input.direction,
  };
}

/** Flat index of placed nodes by id (includes nested). Re-export from node-bounds. */
export { indexPlacedNodes } from './node-bounds.js';
