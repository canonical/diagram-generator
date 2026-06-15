/**
 * Wire ELK layered positions into FrameDiagram using the same measure + render path
 * as box autolayout. ELK supplies coordinates only — styling comes from resolveStyles().
 */
import type { GraphLayoutInput, GraphLayoutResult, GraphNodeInput, LayeredCorpusFamily, PlacedEdge, PlacedNode } from '@diagram-generator/graph-layout-core';
import {
  layoutLayeredForFamily,
  stripImplementationOwnedElkLayeredOverrides,
} from '@diagram-generator/graph-layout-elk';

import { Frame, FrameDiagram, Border, createLine } from './frame-model.js';
import { measure, place, layoutFrameTree, type LayoutOutput } from './layout.js';
import { deserializeFrameDiagramWire, serializeFrameDiagram } from './frame-serialize.js';
import { resolveStyles } from './resolve-styles.js';
import { annotationTextToSpec } from './resolved-spec-typography.js';
import type { TextMeasureAdapter } from './text-measure.js';
import { lineSpecToMeasureRequest } from './text-measure.js';
import { INSET, roundUpToGrid, sizeToPx, BODY_LINE_STEP } from './tokens.js';

export interface ElkLayoutSnapshot extends GraphLayoutResult {
  originX: number;
  originY: number;
}

export interface ElkLayoutOptions {
  diagramType?: LayeredCorpusFamily;
  /** Extra offset applied after ELK (typically root page padding). */
  originX?: number;
  originY?: number;
  /** Session/YAML ELK option overrides (full elk.* keys). */
  elkOptionOverrides?: Record<string, string>;
}

export interface ElkLayoutOutput extends LayoutOutput {
  /** Raw ELK node/edge geometry for debug overlay (absolute coordinates). */
  elkSnapshot?: ElkLayoutSnapshot;
}

function findFrame(root: Frame, id: string): Frame | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findFrame(child, id);
    if (found) return found;
  }
  return null;
}

function walkFrames(root: Frame, visit: (f: Frame) => void): void {
  visit(root);
  for (const child of root.children) walkFrames(child, visit);
}

function collectEndpointIds(diagram: FrameDiagram): Set<string> {
  const ids = new Set<string>();
  for (const arrow of diagram.arrows) {
    if (arrow.source) ids.add(arrow.source.split('.')[0]!);
    if (arrow.target) ids.add(arrow.target.split('.')[0]!);
  }
  return ids;
}

function isSyntheticHeadingFrame(frame: Frame): boolean {
  return frame.role === 'heading' || Boolean(frame.id?.endsWith('__heading'));
}

function isSyntheticBodyFrame(frame: Frame): boolean {
  return Boolean(frame.id?.endsWith('__body'));
}

function isSyntheticLayoutFrame(frame: Frame): boolean {
  return isSyntheticHeadingFrame(frame) || isSyntheticBodyFrame(frame);
}

function authoredLayoutChildren(frame: Frame): Frame[] {
  const body = frame.children.find((child) => isSyntheticBodyFrame(child));
  const source = body?.children ?? frame.children;
  return source.filter((child) => !isSyntheticLayoutFrame(child));
}

function descendantLeafIds(frame: Frame): string[] {
  if (frame.isLeaf) return frame.id ? [frame.id] : [];
  const out: string[] = [];
  for (const child of authoredLayoutChildren(frame)) {
    out.push(...descendantLeafIds(child));
  }
  return out;
}

function hasEndpointDescendant(frame: Frame, endpoints: Set<string>): boolean {
  if (frame.id && endpoints.has(frame.id)) return true;
  return frame.children.some((child) => hasEndpointDescendant(child, endpoints));
}

function collectNativeCompoundIds(
  diagram: FrameDiagram,
  endpoints: Set<string>,
): Set<string> {
  const nativeCompoundIds = new Set<string>();

  walkFrames(diagram.root, (frame) => {
    if (frame.isLeaf || frame.children.length === 0 || !frame.id) return;
    const authoredChildren = authoredLayoutChildren(frame)
      .filter((child) => !isAnnotationFrame(child, endpoints));
    if (authoredChildren.length === 0) return;

    if (endpoints.has(frame.id)) {
      nativeCompoundIds.add(frame.id);
      return;
    }
    if (!frame.children.some((child) => isSyntheticBodyFrame(child))) return;

    const descendantEndpointIds = new Set(
      descendantLeafIds(frame).filter((id) => endpoints.has(id)),
    );
    if (descendantEndpointIds.size === 0) return;

    let hasInboundExternal = false;
    let hasOutboundExternal = false;
    for (const arrow of diagram.arrows) {
      const sourceId = arrow.source.split('.')[0]!;
      const targetId = arrow.target.split('.')[0]!;
      const sourceInside = descendantEndpointIds.has(sourceId);
      const targetInside = descendantEndpointIds.has(targetId);
      if (sourceInside && !targetInside) hasOutboundExternal = true;
      if (targetInside && !sourceInside) hasInboundExternal = true;
      if (hasInboundExternal && hasOutboundExternal) {
        return;
      }
    }

    nativeCompoundIds.add(frame.id);
  });

  return nativeCompoundIds;
}

/** Headed wrappers stay native compounds unless bidirectional external traffic makes ELK detour around the carrier boundary. */
function isElkCompound(frame: Frame, nativeCompoundIds: Set<string>): boolean {
  return Boolean(frame.id) && nativeCompoundIds.has(frame.id);
}

function isElkCarrier(frame: Frame, endpoints: Set<string>): boolean {
  if (frame.isLeaf || frame.children.length === 0) return false;
  if (isSyntheticLayoutFrame(frame)) return false;
  return hasEndpointDescendant(frame, endpoints);
}

function shouldIncludeElkNode(
  frame: Frame,
  endpoints: Set<string>,
  nativeCompoundIds: Set<string>,
  allowStructuralCarriers: boolean,
  includePassiveLeaves: boolean,
): boolean {
  if (isSyntheticLayoutFrame(frame) || isAnnotationFrame(frame, endpoints)) return false;
  if (isElkCompound(frame, nativeCompoundIds)) return true;
  if (includePassiveLeaves && frame.isLeaf) return true;
  return endpoints.has(frame.id) || (allowStructuralCarriers && isElkCarrier(frame, endpoints));
}

function measureSubtree(frame: Frame, adapter: TextMeasureAdapter): void {
  measure(frame, adapter, true);
}

function cloneFrameDiagram(diagram: FrameDiagram): FrameDiagram {
  return deserializeFrameDiagramWire(
    JSON.parse(JSON.stringify(serializeFrameDiagram(diagram))) as Record<string, unknown>,
  );
}

interface SemanticFramePlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

function semanticCompoundPadding(
  frame: Frame,
  semanticPlacements: Map<string, SemanticFramePlacement>,
): string | undefined {
  if (frame.children.length === 0 || !frame.id) return undefined;
  const framePlacement = semanticPlacements.get(frame.id);
  const body = frame.children.find((child) => isSyntheticBodyFrame(child) && child.id);
  const bodyPlacement = body?.id ? semanticPlacements.get(body.id) : undefined;
  if (!framePlacement || !bodyPlacement) return undefined;

  const top = Math.max(0, Math.round(bodyPlacement.y - framePlacement.y));
  const left = Math.max(0, Math.round(bodyPlacement.x - framePlacement.x));
  const right = Math.max(
    0,
    Math.round((framePlacement.x + framePlacement.width) - (bodyPlacement.x + bodyPlacement.width)),
  );
  const bottom = Math.max(0, Math.round(frame.paddingBottom));

  return `[top=${top},left=${left},bottom=${bottom},right=${right}]`;
}

function collectSemanticLayoutSnapshot(
  diagram: FrameDiagram,
  adapter: TextMeasureAdapter,
): {
  sizes: Map<string, { width: number; height: number }>;
  placements: Map<string, SemanticFramePlacement>;
} {
  const cloned = cloneFrameDiagram(diagram);
  resolveStyles(cloned.root);
  layoutFrameTree(cloned.root, adapter, {
    gridCols: cloned.gridCols,
    gridColGap: cloned.gridColGap,
    gridOuterMargin: cloned.gridOuterMargin,
    arrows: cloned.arrows,
  });

  const sizes = new Map<string, { width: number; height: number }>();
  const placements = new Map<string, SemanticFramePlacement>();
  walkFrames(cloned.root, (frame) => {
    if (!frame.id) return;
    sizes.set(frame.id, {
      width: frame._layout.placedW,
      height: frame._layout.placedH,
    });
    placements.set(frame.id, {
      x: frame._layout.placedX,
      y: frame._layout.placedY,
      width: frame._layout.placedW,
      height: frame._layout.placedH,
    });
  });
  return { sizes, placements };
}

function frameToGraphNode(
  frame: Frame,
  adapter: TextMeasureAdapter,
  endpoints: Set<string>,
  nativeCompoundIds: Set<string>,
  semanticSizes: Map<string, { width: number; height: number }>,
  semanticPlacements: Map<string, SemanticFramePlacement>,
  allowStructuralCarriers: boolean,
  includePassiveLeaves: boolean,
): GraphNodeInput {
  measureSubtree(frame, adapter);
  const semantic = semanticSizes.get(frame.id);
  const compound = isElkCompound(frame, nativeCompoundIds);
  const node: GraphNodeInput = {
    id: frame.id,
    width: semantic?.width ?? frame._layout.measuredW,
    height: semantic?.height ?? frame._layout.measuredH,
    ...(semanticCompoundPadding(frame, semanticPlacements)
      ? { padding: semanticCompoundPadding(frame, semanticPlacements) }
      : {}),
  };
  const childNodes = collectGraphChildNodes(
    authoredLayoutChildren(frame),
    adapter,
    endpoints,
    nativeCompoundIds,
    semanticSizes,
    semanticPlacements,
    allowStructuralCarriers || compound,
    includePassiveLeaves || compound,
  );
  if (childNodes.length > 0) {
    node.children = childNodes;
  }
  return node;
}

function collectGraphChildNodes(
  frames: Frame[],
  adapter: TextMeasureAdapter,
  endpoints: Set<string>,
  nativeCompoundIds: Set<string>,
  semanticSizes: Map<string, { width: number; height: number }>,
  semanticPlacements: Map<string, SemanticFramePlacement>,
  allowStructuralCarriers: boolean,
  includePassiveLeaves: boolean,
): GraphNodeInput[] {
  const nodes: GraphNodeInput[] = [];
  for (const frame of frames) {
    if (shouldIncludeElkNode(
      frame,
      endpoints,
      nativeCompoundIds,
      allowStructuralCarriers,
      includePassiveLeaves,
    )) {
      nodes.push(
        frameToGraphNode(
          frame,
          adapter,
          endpoints,
          nativeCompoundIds,
          semanticSizes,
          semanticPlacements,
          allowStructuralCarriers,
          includePassiveLeaves,
        ),
      );
      continue;
    }
    nodes.push(...collectGraphChildNodes(
      authoredLayoutChildren(frame),
      adapter,
      endpoints,
      nativeCompoundIds,
      semanticSizes,
      semanticPlacements,
      allowStructuralCarriers,
      includePassiveLeaves,
    ));
  }
  return nodes;
}

function buildElkGraphNodes(
  root: Frame,
  adapter: TextMeasureAdapter,
  endpoints: Set<string>,
  nativeCompoundIds: Set<string>,
  semanticSizes: Map<string, { width: number; height: number }>,
  semanticPlacements: Map<string, SemanticFramePlacement>,
): GraphNodeInput[] {
  return collectGraphChildNodes(
    authoredLayoutChildren(root),
    adapter,
    endpoints,
    nativeCompoundIds,
    semanticSizes,
    semanticPlacements,
    false,
    false,
  );
}

function indexPlaced(nodes: PlacedNode[], out = new Map<string, PlacedNode>()): Map<string, PlacedNode> {
  for (const n of nodes) {
    out.set(n.id, n);
    if (n.children?.length) indexPlaced(n.children, out);
  }
  return out;
}

function applyPlacedNode(frame: Frame, placed: PlacedNode, originX: number, originY: number): void {
  frame._layout.placedX = placed.x + originX;
  frame._layout.placedY = placed.y + originY;
  frame._layout.placedW = placed.width;
  frame._layout.placedH = placed.height;
  frame._layout.measuredW = placed.width;
  frame._layout.measuredH = placed.height;

  if (placed.children?.length) {
    for (const childPlaced of placed.children) {
      const childFrame = findFrame(frame, childPlaced.id);
      if (childFrame) applyPlacedNode(childFrame, childPlaced, originX, originY);
    }
  }
}

function bboxOfFrames(frames: Frame[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (!frames.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const f of frames) {
    const ls = f._layout;
    minX = Math.min(minX, ls.placedX);
    minY = Math.min(minY, ls.placedY);
    maxX = Math.max(maxX, ls.placedX + ls.placedW);
    maxY = Math.max(maxY, ls.placedY + ls.placedH);
  }
  return { minX, minY, maxX, maxY };
}

function wrapStructuralContainers(root: Frame, lockedIds: Set<string>): void {
  function visit(frame: Frame): void {
    for (const child of frame.children) {
      visit(child);
    }
    if (frame.isLeaf || lockedIds.has(frame.id)) return;

    const placedChildren = frame.children.filter(
      (child) => child._layout.placedW > 0 && child._layout.placedH > 0,
    );
    if (placedChildren.length === 0) return;

    const box = bboxOfFrames(placedChildren);
    if (!box) return;

    const x = box.minX - frame.paddingLeft;
    const y = box.minY - frame.paddingTop;
    const w = box.maxX - box.minX + frame.paddingLeft + frame.paddingRight;
    const h = box.maxY - box.minY + frame.paddingTop + frame.paddingBottom;
    frame._layout.placedX = x;
    frame._layout.placedY = y;
    frame._layout.placedW = w;
    frame._layout.placedH = h;
    frame._layout.measuredW = w;
    frame._layout.measuredH = h;
  }

  visit(root);
}

function collectPlacedFrames(root: Frame): Frame[] {
  const frames: Frame[] = [];
  walkFrames(root, (frame) => {
    if (frame._layout.placedW > 0 || frame._layout.placedH > 0) {
      frames.push(frame);
    }
  });
  return frames;
}

function hasPlacedGeometry(frame: Frame, placedIds: Set<string>): boolean {
  return placedIds.has(frame.id) || frame._layout.placedW > 0 || frame._layout.placedH > 0;
}

function placeFromSemanticAnchor(
  frame: Frame,
  semantic: SemanticFramePlacement,
  anchor: {
    placedX: number;
    placedY: number;
    semanticX: number;
    semanticY: number;
  },
): void {
  frame._layout.placedX = anchor.placedX + (semantic.x - anchor.semanticX);
  frame._layout.placedY = anchor.placedY + (semantic.y - anchor.semanticY);
  frame._layout.placedW = semantic.width;
  frame._layout.placedH = semantic.height;
  frame._layout.measuredW = semantic.width;
  frame._layout.measuredH = semantic.height;
}

function anchorSemanticDescendants(
  frame: Frame,
  placedIds: Set<string>,
  semanticPlacements: Map<string, SemanticFramePlacement>,
  endpoints: Set<string>,
  inheritedAnchor?: {
    placedX: number;
    placedY: number;
    semanticX: number;
    semanticY: number;
  },
): void {
  function findSubtreeAnchor(node: Frame): {
    placedX: number;
    placedY: number;
    semanticX: number;
    semanticY: number;
  } | undefined {
    const semantic = node.id ? semanticPlacements.get(node.id) : undefined;
    const hasPlacement = placedIds.has(node.id) || node._layout.placedW > 0 || node._layout.placedH > 0;
    if (semantic && hasPlacement) {
      return {
        placedX: node._layout.placedX,
        placedY: node._layout.placedY,
        semanticX: semantic.x,
        semanticY: semantic.y,
      };
    }
    for (const child of node.children) {
      const anchor = findSubtreeAnchor(child);
      if (anchor) return anchor;
    }
    return undefined;
  }

  const frameSemantic = frame.id ? semanticPlacements.get(frame.id) : undefined;
  const selfAnchor = frameSemantic && hasPlacedGeometry(frame, placedIds)
    ? {
        placedX: frame._layout.placedX,
        placedY: frame._layout.placedY,
        semanticX: frameSemantic.x,
        semanticY: frameSemantic.y,
      }
    : undefined;
  const subtreeAnchor = selfAnchor ?? inheritedAnchor;

  for (const child of frame.children) {
    if (isAnnotationFrame(child, endpoints)) continue;
    const childSemantic = child.id ? semanticPlacements.get(child.id) : undefined;
    const childAnchor = findSubtreeAnchor(child) ?? subtreeAnchor;
    if (!childSemantic) {
      anchorSemanticDescendants(child, placedIds, semanticPlacements, endpoints, childAnchor);
      continue;
    }

    if (isSyntheticLayoutFrame(child)) {
      if (child.id && !placedIds.has(child.id) && selfAnchor) {
        placeFromSemanticAnchor(child, childSemantic, selfAnchor);
      }
      anchorSemanticDescendants(child, placedIds, semanticPlacements, endpoints, childAnchor);
      continue;
    }

    if (child.isContainer && child.id && !placedIds.has(child.id)) {
      anchorSemanticDescendants(child, placedIds, semanticPlacements, endpoints, childAnchor);
      continue;
    }

    if (child.id && !placedIds.has(child.id) && childAnchor) {
      placeFromSemanticAnchor(child, childSemantic, childAnchor);
    }

    anchorSemanticDescendants(child, placedIds, semanticPlacements, endpoints, childAnchor);
  }
}

function anchorSyntheticLayoutDescendants(
  frame: Frame,
  placedIds: Set<string>,
  semanticPlacements: Map<string, SemanticFramePlacement>,
): void {
  for (const child of frame.children) {
    anchorSyntheticLayoutDescendants(child, placedIds, semanticPlacements);
  }

  const frameSemantic = frame.id ? semanticPlacements.get(frame.id) : undefined;
  const selfAnchor = frameSemantic && hasPlacedGeometry(frame, placedIds)
    ? {
        placedX: frame._layout.placedX,
        placedY: frame._layout.placedY,
        semanticX: frameSemantic.x,
        semanticY: frameSemantic.y,
      }
    : undefined;
  const syntheticBody = frame.children.find((child) => isSyntheticBodyFrame(child));
  const bodyBox = syntheticBody
    ? bboxOfFrames(syntheticBody.children.filter((child) => hasPlacedGeometry(child, placedIds)))
    : null;

  for (const child of frame.children) {
    const childSemantic = child.id ? semanticPlacements.get(child.id) : undefined;
    if (syntheticBody && bodyBox && child.id === syntheticBody.id) {
      child._layout.placedX = bodyBox.minX;
      child._layout.placedY = bodyBox.minY;
      child._layout.placedW = bodyBox.maxX - bodyBox.minX;
      child._layout.placedH = bodyBox.maxY - bodyBox.minY;
      child._layout.measuredW = child._layout.placedW;
      child._layout.measuredH = child._layout.placedH;
      continue;
    }
    if (bodyBox && isSyntheticHeadingFrame(child)) {
      const height = childSemantic?.height ?? child._layout.measuredH;
      const width = Math.max(bodyBox.maxX - bodyBox.minX, childSemantic?.width ?? child._layout.measuredW);
      const topGap = Math.max(0, Math.round(frame.paddingTop));
      child._layout.placedX = bodyBox.minX;
      child._layout.placedY = bodyBox.minY - height - topGap;
      child._layout.placedW = width;
      child._layout.placedH = height;
      child._layout.measuredW = width;
      child._layout.measuredH = height;
      continue;
    }
    if (isSyntheticLayoutFrame(child) && childSemantic && selfAnchor) {
      placeFromSemanticAnchor(child, childSemantic, selfAnchor);
    }
  }
}

function bboxOfElkEdges(
  edges: PlacedEdge[],
  originX: number,
  originY: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasGeometry = false;

  const includePoint = (x: number, y: number): void => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    hasGeometry = true;
  };

  for (const edge of edges) {
    for (const section of edge.sections) {
      includePoint(section.startPoint.x + originX, section.startPoint.y + originY);
      for (const bp of section.bendPoints ?? []) {
        includePoint(bp.x + originX, bp.y + originY);
      }
      includePoint(section.endPoint.x + originX, section.endPoint.y + originY);
    }
    for (const label of edge.labels ?? []) {
      includePoint(label.x + originX, label.y + originY);
      includePoint(label.x + originX + label.width, label.y + originY + label.height);
    }
  }

  return hasGeometry ? { minX, minY, maxX, maxY } : null;
}

function isAnnotationFrame(frame: Frame, endpoints: Set<string>): boolean {
  return frame.isLeaf &&
    frame.border === Border.NONE &&
    !endpoints.has(frame.id) &&
    !isSyntheticHeadingFrame(frame);
}

function layoutAnnotationsBelow(
  root: Frame,
  adapter: TextMeasureAdapter,
  elkBottom: number,
  originX: number,
  originY: number,
  endpoints: Set<string>,
): void {
  const gap = root.gap ?? 24;
  let cursorY = originY + elkBottom + gap;

  function placeAnnotation(frame: Frame): void {
    if (isAnnotationFrame(frame, endpoints)) {
      measureSubtree(frame, adapter);
      frame._layout.placedX = originX + frame.paddingLeft;
      frame._layout.placedY = cursorY;
      frame._layout.placedW = frame._layout.measuredW;
      frame._layout.placedH = frame._layout.measuredH;
      cursorY += frame._layout.placedH + gap;
    }
    for (const child of frame.children) placeAnnotation(child);
  }

  for (const child of root.children) placeAnnotation(child);
}

function translateDiagramGeometry(
  diagram: FrameDiagram,
  dx: number,
  dy: number,
): void {
  if (dx === 0 && dy === 0) return;
  walkFrames(diagram.root, (frame) => {
    if (frame === diagram.root) return;
    if (frame._layout.placedW <= 0 && frame._layout.placedH <= 0) return;
    frame._layout.placedX += dx;
    frame._layout.placedY += dy;
  });

  for (const arrow of diagram.arrows) {
    if (arrow.layoutPath) {
      arrow.layoutPath = arrow.layoutPath.map(([x, y]) => [x + dx, y + dy]);
    }
    if (arrow.waypoints) {
      arrow.waypoints = arrow.waypoints.map(([x, y]) => [x + dx, y + dy]);
    }
    if (arrow.elkLabels) {
      arrow.elkLabels = arrow.elkLabels.map((label) => ({
        ...label,
        x: label.x + dx,
        y: label.y + dy,
      }));
    }
  }
}

function familyFromDiagram(diagram: FrameDiagram): LayeredCorpusFamily {
  const t = diagram.diagramType;
  if (t === 'data_flow_and_integration' || t === 'process_and_workflow' || t === 'deployment_and_runtime_topology') {
    return t;
  }
  return 'process_and_workflow';
}

/** Full absolute canvas path from ELK edge sections (ports + bend points). */
function elkEdgeToLayoutPath(edge: PlacedEdge, originX: number, originY: number): [number, number][] {
  const points: [number, number][] = [];
  for (const section of edge.sections) {
    const start: [number, number] = [
      section.startPoint.x + originX,
      section.startPoint.y + originY,
    ];
    const last = points[points.length - 1];
    if (!last || last[0] !== start[0] || last[1] !== start[1]) {
      points.push(start);
    }
    for (const bp of section.bendPoints ?? []) {
      points.push([bp.x + originX, bp.y + originY]);
    }
    points.push([section.endPoint.x + originX, section.endPoint.y + originY]);
  }
  return points;
}

function dedupeConsecutivePoints(points: [number, number][]): [number, number][] {
  if (points.length <= 1) return points;
  const out: [number, number][] = [points[0]!];
  for (let i = 1; i < points.length; i += 1) {
    const prev = out[out.length - 1]!;
    const cur = points[i]!;
    if (prev[0] !== cur[0] || prev[1] !== cur[1]) {
      out.push(cur);
    }
  }
  return out;
}

function measureEdgeLabelBox(text: string, adapter: TextMeasureAdapter): { width: number; height: number } {
  const spec = annotationTextToSpec(createLine(text));
  const req = lineSpecToMeasureRequest(spec);
  const width = adapter.measureTextWidth(req);
  const height = sizeToPx(spec.lineStep ?? BODY_LINE_STEP);
  const pad = 4;
  return {
    width: roundUpToGrid(width + pad * 2),
    height: roundUpToGrid(height + pad * 2),
  };
}

function arrowLabelText(arrow: { label?: { content: string }[] }): string {
  if (!arrow.label?.length) return '';
  return arrow.label.map((line) => line.content).join(' ').trim();
}

function buildGraphEdges(
  diagram: FrameDiagram,
  adapter: TextMeasureAdapter,
): GraphLayoutInput['edges'] {
  return diagram.arrows.map((a, i) => {
    const edge: GraphLayoutInput['edges'][number] = {
      id: a.id ?? `edge-${i}`,
      source: a.source.split('.')[0]!,
      target: a.target.split('.')[0]!,
    };
    const text = arrowLabelText(a);
    if (text) {
      const dims = measureEdgeLabelBox(text, adapter);
      edge.labels = [{ text, width: dims.width, height: dims.height }];
    }
    return edge;
  });
}

function applyElkEdgeLabels(
  diagram: FrameDiagram,
  edges: PlacedEdge[],
  originX: number,
  originY: number,
): void {
  const byId = new Map<string, PlacedEdge>();
  const byEndpoints = new Map<string, PlacedEdge>();
  for (const edge of edges) {
    byId.set(edge.id, edge);
    byEndpoints.set(`${edge.source}->${edge.target}`, edge);
  }

  for (const arrow of diagram.arrows) {
    const src = arrow.source.split('.')[0]!;
    const tgt = arrow.target.split('.')[0]!;
    const edge = (arrow.id ? byId.get(arrow.id) : undefined) ?? byEndpoints.get(`${src}->${tgt}`);
    if (!edge?.labels?.length) {
      delete arrow.elkLabels;
      continue;
    }
    arrow.elkLabels = edge.labels.map((label: NonNullable<PlacedEdge["labels"]>[number]) => ({
      text: label.text,
      x: label.x + originX,
      y: label.y + originY,
      width: label.width,
      height: label.height,
    }));
  }
}

function applyElkEdgeRoutes(
  diagram: FrameDiagram,
  edges: PlacedEdge[],
  originX: number,
  originY: number,
): void {
  const byId = new Map<string, PlacedEdge>();
  const byEndpoints = new Map<string, PlacedEdge>();
  for (const edge of edges) {
    byId.set(edge.id, edge);
    byEndpoints.set(`${edge.source}->${edge.target}`, edge);
  }

  for (const arrow of diagram.arrows) {
    const src = arrow.source.split('.')[0]!;
    const tgt = arrow.target.split('.')[0]!;
    const edge = (arrow.id ? byId.get(arrow.id) : undefined) ?? byEndpoints.get(`${src}->${tgt}`);
    if (!edge) continue;
    const layoutPath = dedupeConsecutivePoints(elkEdgeToLayoutPath(edge, originX, originY));
    if (layoutPath.length >= 2) {
      arrow.layoutPath = layoutPath;
      arrow.waypoints = layoutPath.slice(1, -1);
    }
  }
}

/**
 * Measure frames, run ELK layered, write absolute placed bounds on endpoint frames.
 * Returns layout output sized to ELK canvas + annotations.
 */
export async function layoutElkFrameDiagram(
  diagram: FrameDiagram,
  adapter: TextMeasureAdapter,
  options: ElkLayoutOptions = {},
): Promise<ElkLayoutOutput> {
  if (adapter.measurementBackend !== 'harfbuzz' && adapter.measurementBackend !== 'mock') {
    throw new Error(
      `layoutElkFrameDiagram requires HarfBuzz measurement (got "${adapter.measurementBackend}")`,
    );
  }
  resolveStyles(diagram.root);

  const endpoints = collectEndpointIds(diagram);
  const nativeCompoundIds = collectNativeCompoundIds(diagram, endpoints);
  const originX = options.originX ?? diagram.root.paddingLeft;
  const originY = options.originY ?? diagram.root.paddingTop;
  const semanticLayout = collectSemanticLayoutSnapshot(diagram, adapter);
  const semanticSizes = semanticLayout.sizes;

  const nodes = buildElkGraphNodes(
    diagram.root,
    adapter,
    endpoints,
    nativeCompoundIds,
    semanticSizes,
    semanticLayout.placements,
  );
  const input: GraphLayoutInput = {
    id: diagram.title || 'diagram',
    direction: 'TB',
    spacingProfile: 'normal',
    nodes,
    edges: buildGraphEdges(diagram, adapter),
  };

  const family = options.diagramType ?? familyFromDiagram(diagram);
  const elkOverrides = {
    ...stripImplementationOwnedElkLayeredOverrides(diagram.elkLayout),
    ...stripImplementationOwnedElkLayeredOverrides(options.elkOptionOverrides),
  };
  const elk = await layoutLayeredForFamily(
    family,
    input,
    Object.keys(elkOverrides).length > 0 ? elkOverrides : undefined,
  );
  const placedById = indexPlaced(elk.nodes);
  const edgeBox = bboxOfElkEdges(elk.edges, originX, originY);
  applyElkEdgeRoutes(diagram, elk.edges, originX, originY);
  applyElkEdgeLabels(diagram, elk.edges, originX, originY);

  const placedFrames: Frame[] = [];
  const standaloneContainers: Frame[] = [];
  for (const [id, placed] of placedById) {
    const frame = findFrame(diagram.root, id);
    if (!frame) continue;
    applyPlacedNode(frame, placed, originX, originY);
    if (frame.children.length > 0 && (!placed.children || placed.children.length === 0)) {
      standaloneContainers.push(frame);
    }
    placedFrames.push(frame);
  }
  const placedIds = new Set(placedById.keys());

  for (const frame of standaloneContainers) {
    place(
      frame,
      frame._layout.placedX,
      frame._layout.placedY,
      frame._layout.placedW,
      frame._layout.placedH,
      adapter,
    );
  }

  anchorSemanticDescendants(diagram.root, placedIds, semanticLayout.placements, endpoints);
  wrapStructuralContainers(diagram.root, placedIds);
  anchorSyntheticLayoutDescendants(diagram.root, placedIds, semanticLayout.placements);
  wrapStructuralContainers(diagram.root, placedIds);

  layoutAnnotationsBelow(diagram.root, adapter, elk.height, originX, originY, endpoints);

  const allPlacedFrames = collectPlacedFrames(diagram.root).filter((frame) => frame !== diagram.root);
  const frameBox = bboxOfFrames(allPlacedFrames);
  const shiftX = frameBox && frameBox.minX < 0 ? -frameBox.minX : 0;
  const shiftY = frameBox && frameBox.minY < 0 ? -frameBox.minY : 0;
  translateDiagramGeometry(diagram, shiftX, shiftY);

  const normalizedFrameBox = bboxOfFrames(collectPlacedFrames(diagram.root).filter((frame) => frame !== diagram.root));
  const normalizedEdgeBox = edgeBox
    ? {
        minX: edgeBox.minX + shiftX,
        minY: edgeBox.minY + shiftY,
        maxX: edgeBox.maxX + shiftX,
        maxY: edgeBox.maxY + shiftY,
      }
    : null;
  const rootW = Math.max(
    diagram.root.width ?? 0,
    elk.width + originX * 2,
    normalizedFrameBox?.maxX ?? 0,
    normalizedEdgeBox?.maxX ?? 0,
  );
  let rootH = Math.max(
    diagram.root.height ?? 0,
    elk.height + originY * 2,
    normalizedFrameBox?.maxY ?? 0,
    normalizedEdgeBox?.maxY ?? 0,
  );
  walkFrames(diagram.root, (f) => {
    if (isAnnotationFrame(f, endpoints)) {
      rootH = Math.max(rootH, f._layout.placedY + f._layout.placedH + INSET);
    }
  });

  diagram.root._layout.placedX = 0;
  diagram.root._layout.placedY = 0;
  diagram.root._layout.placedW = rootW;
  diagram.root._layout.placedH = rootH;
  diagram.root._layout.measuredW = rootW;
  diagram.root._layout.measuredH = rootH;

  return {
    width: rootW,
    height: rootH,
    coerced: new Map(),
    elkSnapshot: { ...elk, originX, originY },
  };
}
