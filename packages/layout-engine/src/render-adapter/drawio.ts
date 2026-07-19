import type { FrameDiagram } from '../frame-model.js';
import { Fill } from '../frame-model.js';
import { MxGraphBuilder } from '../drawio/mxgraph-builder.js';
import { themedIconDataUri } from '../drawio/icon-uri.js';
import { richTextFromTextBlockSpans } from '../drawio/rich-text.js';
import {
  edgeStyle,
  imageStyle,
  labelStyle,
  rectStyle,
} from '../drawio/style-presets.js';
import type {
  Color,
  DisplayList,
  DisplayListItem,
  GroupItem,
  LineItem,
  RectItem,
  TextBlockItem,
} from '../render-ir.js';
import { ARROW_COLOR, BASELINE_UNIT, ICON_SIZE } from '../tokens.js';

const TEXT_ASCENT_RATIO = 0.94;

export interface DrawioRenderOptions {
  diagram?: FrameDiagram;
  diagramName?: string;
  diagramId?: string;
}

export interface DrawioRenderResult {
  xml: string;
  cellCount: number;
  frameCellIds: Record<string, string>;
  edgeCount: number;
}

interface DrawioRenderContext {
  builder: MxGraphBuilder;
  diagram?: FrameDiagram;
  frameCellById: Record<string, string>;
  edgeCount: number;
  parallelEdgeIndex: Map<string, number>;
}

function colorToCss(color: Color): string {
  if (color.a === 0) return 'transparent';
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toUpperCase();
}

function paintFill(item: { fill?: { color: Color } }): string {
  return item.fill ? colorToCss(item.fill.color) : 'none';
}

function paintStroke(item: { stroke?: { color: Color } }): string {
  return item.stroke ? colorToCss(item.stroke.color) : 'none';
}

function parseTranslate(transform: string | undefined): { x: number; y: number } | null {
  if (!transform) return null;
  const match = transform.match(/translate\(([-\d.]+)\s+([-\d.]+)\)/);
  if (!match) return null;
  return {
    x: Number(match[1] ?? '0'),
    y: Number(match[2] ?? '0'),
  };
}

function textBlockGeometry(
  item: TextBlockItem,
): { x: number; y: number; width: number; height: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const span of item.spans) {
    minX = Math.min(minX, span.x);
    minY = Math.min(minY, span.y - span.fontSize * TEXT_ASCENT_RATIO);
    maxX = Math.max(maxX, span.x + span.text.length * span.fontSize * 0.55);
    maxY = Math.max(maxY, span.y + span.fontSize * 0.25);
  }
  if (!Number.isFinite(minX)) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);
  return { x: minX, y: minY, width, height };
}

function emitRectVertex(
  item: RectItem,
  ctx: DrawioRenderContext,
  parent?: string,
): void {
  const fill = paintFill(item);
  const stroke = paintStroke(item);
  const dashed = Boolean(item.strokeStyle?.dashArray?.length);
  ctx.builder.addVertex({
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    style: rectStyle(fill, {
      stroke,
      dashed,
      strokeWidth: item.strokeStyle?.width,
    }),
    parent,
    connectable: false,
    ...(item.opacity != null ? {} : {}),
  });
}

function emitSeparatorLine(item: LineItem, ctx: DrawioRenderContext): void {
  ctx.builder.addVertex({
    x: item.x1,
    y: item.y1,
    width: Math.max(1, item.x2 - item.x1),
    height: 1,
    style: rectStyle(Fill.BLACK, { stroke: 'none' }),
    connectable: false,
  });
}

function emitTextBlockVertex(
  item: TextBlockItem,
  ctx: DrawioRenderContext,
): void {
  if (item.spans.length === 0) return;
  const geometry = textBlockGeometry(item);
  const firstSpan = item.spans[0]!;
  ctx.builder.addVertex({
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
    style: labelStyle({
      fontSize: Math.round(firstSpan.fontSize),
      align: item.textAnchor === 'middle' ? 'center' : 'left',
      verticalAlign: item.dominantBaseline === 'middle' ? 'middle' : 'top',
    }),
    value: richTextFromTextBlockSpans(item.spans),
    connectable: false,
  });
}

function emitIconRect(item: RectItem, ctx: DrawioRenderContext): void {
  ctx.builder.addVertex({
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    style: rectStyle(paintFill(item), { stroke: 'none' }),
    connectable: false,
  });
}

function emitIconFragment(
  item: Extract<DisplayListItem, { kind: 'svg-fragment' }>,
  ctx: DrawioRenderContext,
): void {
  const translate = parseTranslate(item.attributes?.transform);
  const x = translate?.x ?? 0;
  const y = translate?.y ?? 0;
  ctx.builder.addVertex({
    x,
    y,
    width: ICON_SIZE,
    height: ICON_SIZE,
    style: imageStyle(themedIconDataUri(item.markup)),
    connectable: false,
  });
}

function findBoxRect(children: readonly DisplayListItem[]): RectItem | null {
  for (const child of children) {
    if (child.kind === 'rect' && child.className !== 'dg-icon') {
      return child;
    }
  }
  return null;
}

function emitFrameGroup(group: GroupItem, ctx: DrawioRenderContext): void {
  const boxRect = findBoxRect(group.children);

  for (const child of group.children) {
    if (child.kind === 'line' && child.className === 'dg-separator') {
      emitSeparatorLine(child, ctx);
    }
  }

  if (boxRect) {
    const fill = paintFill(boxRect);
    const stroke = paintStroke(boxRect);
    const dashed = Boolean(boxRect.strokeStyle?.dashArray?.length);
    const cellId = ctx.builder.addVertex({
      x: boxRect.x,
      y: boxRect.y,
      width: boxRect.width,
      height: boxRect.height,
      style: rectStyle(fill, {
        stroke,
        dashed,
        strokeWidth: boxRect.strokeStyle?.width,
      }),
      connectable: Boolean(group.id),
    });
    if (group.id) {
      ctx.frameCellById[group.id] = cellId;
    }
  }

  for (const child of group.children) {
    switch (child.kind) {
      case 'line':
        if (child.className !== 'dg-separator') {
          emitSeparatorLine(child, ctx);
        }
        break;
      case 'rect':
        if (child.className === 'dg-icon') {
          emitIconRect(child, ctx);
        }
        break;
      case 'text-block':
        emitTextBlockVertex(child, ctx);
        break;
      case 'svg-fragment':
        if (child.className === 'dg-icon') {
          emitIconFragment(child, ctx);
        }
        break;
      case 'group':
        emitFrameGroup(child, ctx);
        break;
      default:
        break;
    }
  }
}

function findAuthoredArrow(diagram: FrameDiagram, componentId?: string) {
  if (!componentId) return undefined;
  return diagram.arrows.find((entry) => (
    entry.id === componentId || `${entry.source}->${entry.target}` === componentId
  ));
}

function collectShaftPoints(children: readonly DisplayListItem[]): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (const child of children) {
    if (child.kind !== 'line') continue;
    if (points.length === 0) {
      points.push([child.x1, child.y1]);
    }
    points.push([child.x2, child.y2]);
  }
  return points;
}

function sideFromDelta(dx: number, dy: number): { exitX: number; exitY: number } {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { exitX: 1, exitY: 0.5 } : { exitX: 0, exitY: 0.5 };
  }
  return dy >= 0 ? { exitX: 0.5, exitY: 1 } : { exitX: 0.5, exitY: 0 };
}

function sideFromPointOnRect(
  px: number,
  py: number,
  bounds: { x: number; y: number; w: number; h: number },
): { exitX: number; exitY: number } {
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  return sideFromDelta(px - cx, py - cy);
}

function arrowEdgeColor(children: readonly DisplayListItem[]): string {
  for (const child of children) {
    if (child.kind === 'line') {
      return colorToCss(child.stroke.color);
    }
  }
  return ARROW_COLOR;
}

function isFloatingArrowLabel(item: TextBlockItem): boolean {
  return item.textAnchor === 'middle' && item.dominantBaseline === 'middle';
}

function emitArrowGroup(group: GroupItem, ctx: DrawioRenderContext): void {
  if (!ctx.diagram) return;
  const shaftPoints = collectShaftPoints(group.children);
  if (shaftPoints.length < 2) return;

  const authored = findAuthoredArrow(ctx.diagram, group.id);
  const sourceCell = authored ? ctx.frameCellById[authored.source] : undefined;
  const targetCell = authored ? ctx.frameCellById[authored.target] : undefined;
  const [sx, sy] = shaftPoints[0]!;
  const [tx, ty] = shaftPoints[shaftPoints.length - 1]!;
  const waypoints = shaftPoints.slice(1, -1);
  const color = arrowEdgeColor(group.children);

  const labelBlocks = group.children.filter(
    (child): child is TextBlockItem => child.kind === 'text-block',
  );
  const edgeLabelBlock = labelBlocks.length === 1 && !isFloatingArrowLabel(labelBlocks[0]!)
    ? labelBlocks[0]
    : null;
  const floatingLabels = edgeLabelBlock ? [] : labelBlocks;

  let exit = { exitX: 0.5, exitY: 1 };
  let entry = { entryX: 0.5, entryY: 0 };
  if (authored && sourceCell && targetCell) {
    const sourceBounds = authored.source ? findFrameBounds(ctx, authored.source) : null;
    const targetBounds = authored.target ? findFrameBounds(ctx, authored.target) : null;
    if (sourceBounds) {
      exit = sideFromPointOnRect(sx, sy, sourceBounds);
    }
    if (targetBounds) {
      const side = sideFromPointOnRect(tx, ty, targetBounds);
      entry = { entryX: side.exitX, entryY: side.exitY };
    }
    const edgeKey = `${authored.source}->${authored.target}`;
    const edgeIndex = ctx.parallelEdgeIndex.get(edgeKey) ?? 0;
    ctx.parallelEdgeIndex.set(edgeKey, edgeIndex + 1);
    if (edgeIndex > 0) {
      exit = { ...exit, exitY: Math.max(0.1, Math.min(0.9, exit.exitY + edgeIndex * 0.12)) };
      entry = { ...entry, entryY: Math.max(0.1, Math.min(0.9, entry.entryY + edgeIndex * 0.12)) };
    }
  } else if (shaftPoints.length >= 2) {
    const startDelta = {
      dx: shaftPoints[1]![0] - sx,
      dy: shaftPoints[1]![1] - sy,
    };
    const endDelta = {
      dx: tx - shaftPoints[shaftPoints.length - 2]![0],
      dy: ty - shaftPoints[shaftPoints.length - 2]![1],
    };
    exit = sideFromDelta(startDelta.dx, startDelta.dy);
    const endSide = sideFromDelta(endDelta.dx, endDelta.dy);
    entry = { entryX: endSide.exitX, entryY: endSide.exitY };
  }

  ctx.builder.addEdge({
    style: edgeStyle(color, {
      exitX: exit.exitX,
      exitY: exit.exitY,
      entryX: entry.entryX,
      entryY: entry.entryY,
    }),
    source: sourceCell,
    target: targetCell,
    waypoints: waypoints.length > 0 ? waypoints : undefined,
    value: edgeLabelBlock ? richTextFromTextBlockSpans(edgeLabelBlock.spans) : '',
  });
  ctx.edgeCount += 1;

  for (const label of floatingLabels) {
    emitTextBlockVertex(label, ctx);
  }
}

function findFrameBounds(
  ctx: DrawioRenderContext,
  frameId: string,
): { x: number; y: number; w: number; h: number } | null {
  const diagram = ctx.diagram;
  if (!diagram) return null;
  const visit = (frame: FrameDiagram['root']): { x: number; y: number; w: number; h: number } | null => {
    if (frame.id === frameId) {
      return {
        x: frame._layout.placedX,
        y: frame._layout.placedY,
        w: frame._layout.placedW,
        h: frame._layout.placedH,
      };
    }
    for (const child of frame.children) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  return visit(diagram.root);
}

function emitOverlayGroup(group: GroupItem, ctx: DrawioRenderContext): void {
  for (const child of group.children) {
    switch (child.kind) {
      case 'rect':
        emitRectVertex(child, ctx);
        break;
      case 'text-block':
        emitTextBlockVertex(child, ctx);
        break;
      default:
        break;
    }
  }
}

function emitTopLevelItem(item: DisplayListItem, ctx: DrawioRenderContext): void {
  if (item.kind !== 'group') return;
  if (item.layer === 'arrow') {
    emitArrowGroup(item, ctx);
    return;
  }
  if (item.layer === 'overlay') {
    emitOverlayGroup(item, ctx);
    return;
  }
  emitFrameGroup(item, ctx);
}

export function renderDisplayListToDrawio(
  displayList: DisplayList,
  options?: DrawioRenderOptions,
): DrawioRenderResult {
  const diagram = options?.diagram;
  const slug = options?.diagramId
    ?? (diagram?.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'diagram');
  const pageWidth = Math.max(
    BASELINE_UNIT,
    Math.ceil((displayList.viewport.width || 400) / BASELINE_UNIT) * BASELINE_UNIT,
  );
  const pageHeight = Math.max(
    BASELINE_UNIT,
    Math.ceil((displayList.viewport.height || 200) / BASELINE_UNIT) * BASELINE_UNIT,
  );
  const builder = new MxGraphBuilder(
    options?.diagramName ?? diagram?.title ?? 'Diagram',
    slug,
    pageWidth,
    pageHeight,
  );
  const ctx: DrawioRenderContext = {
    builder,
    diagram,
    frameCellById: {},
    edgeCount: 0,
    parallelEdgeIndex: new Map(),
  };

  for (const item of displayList.items) {
    emitTopLevelItem(item, ctx);
  }

  return {
    xml: builder.toXml(),
    cellCount: builder.cellCount,
    frameCellIds: ctx.frameCellById,
    edgeCount: ctx.edgeCount,
  };
}
