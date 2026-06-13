import type {
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

interface ElkLayoutEdge {
  id: string;
  sources?: string[];
  targets?: string[];
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
  children?: ElkLayoutNode[];
  edges?: ElkLayoutEdge[];
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

function collectEdges(root: ElkLayoutNode): ElkLayoutEdge[] {
  const out: ElkLayoutEdge[] = [...(root.edges ?? [])];
  for (const child of root.children ?? []) {
    out.push(...collectEdges(child));
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

function normalizeEdges(
  edges: ElkLayoutEdge[],
  rootId: string,
  nodesById: Map<string, PlacedNode>,
): PlacedEdge[] {
  return edges.map((edge) => {
    const offset = containerOffset(edge.container, rootId, nodesById);
    const sections = (edge.sections ?? [])
      .map(mapSection)
      .filter((s): s is RoutedEdgeSection => s != null)
      .map((section) => offsetSection(section, offset.x, offset.y));

    return {
      id: edge.id,
      source: edge.sources?.[0] ?? '',
      target: edge.targets?.[0] ?? '',
      sections,
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
  const edges = normalizeEdges(collectEdges(elkRoot), input.id, nodesById);
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
