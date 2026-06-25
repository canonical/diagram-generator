import dagre from '@dagrejs/dagre';
import type {
  GraphEdgeInput,
  GraphLayoutInput,
  GraphLayoutResult,
  GraphNodeInput,
  PlacedEdge,
  PlacedNode,
  Point2,
  RoutedEdgeSection,
} from '@diagram-generator/graph-layout-core';
import { roundToGrid as snap } from '@diagram-generator/graph-layout-core';

const { graphlib, layout: dagreLayout } = dagre;
type DagreGraph = InstanceType<typeof graphlib.Graph>;

export interface DagreLayoutOptions {
  optionOverrides?: Record<string, string>;
}

interface DagreNodeValue {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

interface DagreEdgeValue {
  points?: Point2[];
}

function numberOption(
  overrides: Record<string, string> | undefined,
  key: string,
  fallback: number,
): number {
  const raw = overrides?.[key];
  if (raw == null || raw === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function rankDirection(input: GraphLayoutInput, overrides?: Record<string, string>): GraphLayoutInput['direction'] {
  const raw = overrides?.['dagre.rankdir'];
  if (raw === 'TB' || raw === 'LR' || raw === 'BT' || raw === 'RL') return raw;
  return input.direction;
}

function flattenNodes(nodes: readonly GraphNodeInput[], out: GraphNodeInput[] = []): GraphNodeInput[] {
  for (const node of nodes) {
    out.push(node);
    if (node.children?.length) {
      flattenNodes(node.children, out);
    }
  }
  return out;
}

function snapPoint(point: Point2): Point2 {
  return { x: snap(point.x), y: snap(point.y) };
}

function edgeSection(points: Point2[] | undefined): RoutedEdgeSection[] {
  if (!points || points.length < 2) {
    return [];
  }
  const snapped = points.map(snapPoint);
  return [{
    startPoint: snapped[0]!,
    endPoint: snapped[snapped.length - 1]!,
    ...(snapped.length > 2 ? { bendPoints: snapped.slice(1, -1) } : {}),
  }];
}

function mapPlacedNodes(
  nodes: readonly GraphNodeInput[],
  graph: DagreGraph,
): PlacedNode[] {
  return nodes.map((inputNode) => {
    const node = graph.node(inputNode.id) as DagreNodeValue | undefined;
    const width = node?.width ?? inputNode.width;
    const height = node?.height ?? inputNode.height;
    return {
      id: inputNode.id,
      x: snap((node?.x ?? 0) - width / 2),
      y: snap((node?.y ?? 0) - height / 2),
      width,
      height,
    };
  });
}

function mapPlacedEdges(
  input: GraphLayoutInput,
  graph: DagreGraph,
): PlacedEdge[] {
  return input.edges.map((edge: GraphEdgeInput) => {
    const edgeValue = graph.edge(edge.source, edge.target, edge.id) as DagreEdgeValue | undefined;
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sections: edgeSection(edgeValue?.points),
    };
  });
}

function bounds(
  nodes: readonly PlacedNode[],
  edges: readonly PlacedEdge[],
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  for (const edge of edges) {
    for (const section of edge.sections) {
      for (const point of [
        section.startPoint,
        ...(section.bendPoints ?? []),
        section.endPoint,
      ]) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return { minX, minY, maxX, maxY };
}

function shiftNodes(nodes: readonly PlacedNode[], dx: number, dy: number): PlacedNode[] {
  return nodes.map((node) => ({
    ...node,
    x: snap(node.x - dx),
    y: snap(node.y - dy),
  }));
}

function shiftEdges(edges: readonly PlacedEdge[], dx: number, dy: number): PlacedEdge[] {
  return edges.map((edge) => ({
    ...edge,
    sections: edge.sections.map((section) => ({
      startPoint: snapPoint({ x: section.startPoint.x - dx, y: section.startPoint.y - dy }),
      endPoint: snapPoint({ x: section.endPoint.x - dx, y: section.endPoint.y - dy }),
      ...(section.bendPoints?.length
        ? {
            bendPoints: section.bendPoints.map((point) => snapPoint({
              x: point.x - dx,
              y: point.y - dy,
            })),
          }
        : {}),
    })),
  }));
}

export function layoutDagre(
  input: GraphLayoutInput,
  options: DagreLayoutOptions = {},
): GraphLayoutResult {
  const flatNodes = flattenNodes(input.nodes);
  const graph = new graphlib.Graph({ directed: true, multigraph: true });
  graph.setGraph({
    rankdir: rankDirection(input, options.optionOverrides),
    nodesep: numberOption(options.optionOverrides, 'dagre.nodesep', 72),
    ranksep: numberOption(options.optionOverrides, 'dagre.ranksep', 96),
    edgesep: numberOption(options.optionOverrides, 'dagre.edgesep', 24),
    marginx: 0,
    marginy: 0,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of flatNodes) {
    graph.setNode(node.id, { width: node.width, height: node.height });
  }
  for (const edge of input.edges) {
    graph.setEdge(edge.source, edge.target, {}, edge.id);
  }

  dagreLayout(graph);

  const placedNodes = mapPlacedNodes(flatNodes, graph);
  const placedEdges = mapPlacedEdges(input, graph);
  const graphBounds = bounds(placedNodes, placedEdges);
  const nodes = shiftNodes(placedNodes, graphBounds.minX, graphBounds.minY);
  const edges = shiftEdges(placedEdges, graphBounds.minX, graphBounds.minY);

  return {
    width: snap(Math.max(0, graphBounds.maxX - graphBounds.minX)),
    height: snap(Math.max(0, graphBounds.maxY - graphBounds.minY)),
    nodes,
    edges,
    engine: 'dagre',
    direction: rankDirection(input, options.optionOverrides),
  };
}
