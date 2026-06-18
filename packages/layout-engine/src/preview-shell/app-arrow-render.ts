import { routeArrows, type RoutedArrow } from '../arrow-routing.js';
import { type Arrow, createLine } from '../frame-model.js';
import {
  annotationTextToSpec,
} from '../resolved-spec-typography.js';
import {
  ARROW_COLOR,
  ARROW_HEAD_HALF_WIDTH,
  ARROW_HEAD_LENGTH,
  BODY_LINE_STEP,
  BODY_SIZE,
  GRID_GUTTER,
  sizeToPx,
} from '../tokens.js';
import { resolvePreviewArrowhead } from './app-arrow-waypoints.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ASCENT_RATIO = 0.94;

export interface PreviewArrowFrameBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PreviewArrowBoundsMap = Record<string, PreviewArrowFrameBounds>;

export interface PreviewRoutedArrow extends RoutedArrow {
  start: [number, number];
  end: [number, number];
  waypoints: [number, number][];
  elkLabels?: Arrow['elkLabels'];
}

export interface PreviewArrowModelLike {
  loadArrows?: ((arrows: Array<{
    id: string;
    source: string;
    target: string;
    color?: string | null;
    waypoints: Array<[number, number]>;
  }>) => void) | null;
}

function fmtSvgNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function lineTopToBaseline(top: number, size: string | number): number {
  return top + sizeToPx(size) * ASCENT_RATIO;
}

function isArrowGroupElement(element: Element | null | undefined): element is Element {
  return Boolean(
    element
    && (
      element.getAttribute('data-dg-arrow') === 'true'
      || element.querySelector('line, polygon') !== null
    ),
  );
}

function findArrowGroups(root: ParentNode, componentId: string): Element[] {
  return Array.from(root.querySelectorAll('[data-component-id]'))
    .filter((element): element is Element => (
      (typeof Element !== 'undefined' && element instanceof Element)
      || typeof element?.getAttribute === 'function'
    ))
    .filter((element) => element.getAttribute('data-component-id') === componentId)
    .filter((element) => isArrowGroupElement(element));
}

function arrowLabelLines(arrow: PreviewRoutedArrow) {
  if (!arrow.label || arrow.label.length === 0) {
    return [];
  }
  return arrow.label.map((line) => {
    if (typeof line === 'string') {
      return createLine(line);
    }
    return createLine(line.content || '', {
      size: line.size,
      weight: line.weight,
      fill: line.fill,
      smallCaps: line.smallCaps,
      letterSpacing: line.letterSpacing,
      lineStep: line.lineStep,
    });
  });
}

function minDistanceToBounds(x: number, y: number, boundsList: PreviewArrowFrameBounds[]): number {
  let minDistance = Number.POSITIVE_INFINITY;
  for (const bounds of boundsList) {
    const clampedX = Math.max(bounds.x, Math.min(x, bounds.x + bounds.w));
    const clampedY = Math.max(bounds.y, Math.min(y, bounds.y + bounds.h));
    minDistance = Math.min(minDistance, Math.hypot(x - clampedX, y - clampedY));
  }
  return minDistance;
}

function labelAnchorForSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  labelGap: number,
  boundsMap: PreviewArrowBoundsMap,
): { lx: number; ly: number } {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const boundsList = Object.values(boundsMap);
  const candidates = [
    { lx: mx + nx * labelGap, ly: my + ny * labelGap },
    { lx: mx - nx * labelGap, ly: my - ny * labelGap },
  ];
  let best = candidates[0]!;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const candidate of candidates) {
    const score = minDistanceToBounds(candidate.lx, candidate.ly, boundsList);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function buildArrowLabelsFromElk(
  ownerDocument: Document,
  arrow: PreviewRoutedArrow,
): DocumentFragment | null {
  if (!arrow.elkLabels || arrow.elkLabels.length === 0) {
    return null;
  }
  const fragment = ownerDocument.createDocumentFragment();
  for (const label of arrow.elkLabels) {
    const spec = annotationTextToSpec(createLine(label.text));
    const size = spec.size ?? BODY_SIZE;
    const centerX = label.x + label.width / 2;
    const centerY = label.y + label.height / 2;
    const text = ownerDocument.createElementNS(SVG_NS, 'text');
    text.setAttribute('font-family', 'Ubuntu Sans');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    const tspan = ownerDocument.createElementNS(SVG_NS, 'tspan');
    tspan.setAttribute('x', fmtSvgNumber(centerX));
    tspan.setAttribute('y', fmtSvgNumber(lineTopToBaseline(centerY - sizeToPx(size) / 2, size)));
    tspan.setAttribute('font-size', String(size));
    tspan.setAttribute('font-weight', String(spec.weight ?? '400'));
    tspan.setAttribute('fill', spec.fill ?? '#666666');
    tspan.textContent = label.text;
    text.appendChild(tspan);
    fragment.appendChild(text);
  }
  return fragment;
}

function buildArrowLabelElement(
  ownerDocument: Document,
  arrow: PreviewRoutedArrow,
  shaftPoints: [number, number][],
  labelGap: number,
  boundsMap: PreviewArrowBoundsMap,
): SVGTextElement | DocumentFragment | null {
  const elkLabels = buildArrowLabelsFromElk(ownerDocument, arrow);
  if (elkLabels) {
    return elkLabels;
  }

  const lines = arrowLabelLines(arrow);
  if (lines.length === 0) {
    return null;
  }

  let bestIndex = 0;
  let bestLength = 0;
  for (let index = 0; index < shaftPoints.length - 1; index += 1) {
    const [x1, y1] = shaftPoints[index]!;
    const [x2, y2] = shaftPoints[index + 1]!;
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length > bestLength) {
      bestLength = length;
      bestIndex = index;
    }
  }

  const [sx1, sy1] = shaftPoints[bestIndex]!;
  const [sx2, sy2] = shaftPoints[bestIndex + 1]!;
  const { lx, ly } = labelAnchorForSegment(sx1, sy1, sx2, sy2, labelGap, boundsMap);

  const text = ownerDocument.createElementNS(SVG_NS, 'text');
  text.setAttribute('font-family', 'Ubuntu Sans');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');

  const specs = lines.map((line) => annotationTextToSpec(line));
  const totalHeight = specs.reduce((sum, spec, index) => {
    const lineStep = sizeToPx(spec.lineStep ?? BODY_LINE_STEP);
    return sum + (index === 0 ? 0 : lineStep);
  }, 0);
  let top = ly - totalHeight / 2;

  for (const spec of specs) {
    const size = spec.size ?? BODY_SIZE;
    const lineStep = sizeToPx(spec.lineStep ?? BODY_LINE_STEP);
    const tspan = ownerDocument.createElementNS(SVG_NS, 'tspan');
    tspan.setAttribute('x', fmtSvgNumber(lx));
    tspan.setAttribute('y', fmtSvgNumber(lineTopToBaseline(top, size)));
    tspan.setAttribute('font-size', String(size));
    tspan.setAttribute('font-weight', String(spec.weight ?? '400'));
    tspan.setAttribute('fill', spec.fill ?? '#666666');
    if (spec.letterSpacing) {
      tspan.setAttribute('letter-spacing', String(spec.letterSpacing));
    }
    if (spec.smallCaps) {
      tspan.setAttribute('font-variant-caps', 'small-caps');
    }
    tspan.textContent = spec.content;
    text.appendChild(tspan);
    top += lineStep;
  }

  return text;
}

function syncPreviewArrowOriginGeometry(group: Element): void {
  const maybeStyled = group as Element & { style?: { transform?: string } };
  if (maybeStyled.style) {
    maybeStyled.style.transform = '';
  }

  group.querySelectorAll('line').forEach((line) => {
    line.setAttribute('data-orig-x1', line.getAttribute('x1') || '0');
    line.setAttribute('data-orig-y1', line.getAttribute('y1') || '0');
    line.setAttribute('data-orig-x2', line.getAttribute('x2') || '0');
    line.setAttribute('data-orig-y2', line.getAttribute('y2') || '0');
  });

  group.querySelectorAll('polygon').forEach((polygon) => {
    polygon.setAttribute('data-orig-points', polygon.getAttribute('points') || '');
  });
}

function replacePreviewArrowLabels(
  options: {
    group: Element;
    arrow: PreviewRoutedArrow;
    boundsMap: PreviewArrowBoundsMap;
    headLen: number;
    headHalf: number;
  },
): void {
  options.group.querySelectorAll(':scope > text').forEach((element) => element.remove());
  const replacement = createPreviewArrowSvgFragment({
    ownerDocument: options.group.ownerDocument,
    routedArrows: [options.arrow],
    boundsMap: options.boundsMap,
    headLen: options.headLen,
    headHalf: options.headHalf,
  }).firstChild;
  if (!replacement) {
    return;
  }
  Array.from(replacement.childNodes).forEach((child) => {
    if (child.nodeName.toLowerCase() === 'text') {
      options.group.appendChild(child);
    }
  });
}

export function previewArrowComponentId(
  arrow: Pick<Arrow, 'id' | 'source' | 'target'>,
): string {
  return arrow.id ?? `${arrow.source}->${arrow.target}`;
}

export function syncPreviewArrowsInModel<TModel extends PreviewArrowModelLike>(
  model: TModel | null | undefined,
  arrows: Arrow[],
  routedArrows: PreviewRoutedArrow[],
): void {
  if (!model || typeof model.loadArrows !== 'function') {
    return;
  }

  const routedById = new Map<string | undefined, PreviewRoutedArrow>();
  for (const routedArrow of routedArrows) {
    routedById.set(routedArrow.componentId, routedArrow);
  }

  model.loadArrows(
    arrows.map((arrow) => {
      const componentId = previewArrowComponentId(arrow);
      const routedArrow = routedById.get(componentId);
      return {
        id: componentId,
        source: arrow.source,
        target: arrow.target,
        color: arrow.color,
        waypoints: routedArrow ? routedArrow.waypoints : (arrow.waypoints || []),
      };
    }),
  );
}

export function routePreviewArrows(
  arrows: Arrow[],
  boundsMap: PreviewArrowBoundsMap,
): PreviewRoutedArrow[] {
  const authoredByComponentId = new Map(arrows.map((arrow) => [previewArrowComponentId(arrow), arrow]));
  return routeArrows(arrows, boundsMap)
    .map((routed) => {
      const points = routed.points || [];
      const authored = authoredByComponentId.get(routed.componentId || '') || null;
      return {
        ...routed,
        start: points[0]!,
        end: points[points.length - 1]!,
        waypoints: points.slice(1, -1),
        componentId: routed.componentId || (authored ? previewArrowComponentId(authored) : undefined),
        color: routed.color || authored?.color || ARROW_COLOR,
        label: routed.label ?? authored?.label,
        labelGap: routed.labelGap ?? authored?.labelGap ?? GRID_GUTTER,
        elkLabels: authored?.elkLabels,
      };
    })
    .filter((arrow) => arrow.start && arrow.end);
}

export function createPreviewArrowSvgFragment(
  options: {
    ownerDocument: Document;
    routedArrows: PreviewRoutedArrow[];
    boundsMap: PreviewArrowBoundsMap;
    headLen?: number | null;
    headHalf?: number | null;
  },
): DocumentFragment {
  const fragment = options.ownerDocument.createDocumentFragment();
  const headLen = options.headLen ?? ARROW_HEAD_LENGTH;
  const headHalf = options.headHalf ?? ARROW_HEAD_HALF_WIDTH;

  for (const arrow of options.routedArrows) {
    const group = options.ownerDocument.createElementNS(SVG_NS, 'g');
    group.setAttribute('data-dg-arrow', 'true');
    group.setAttribute('data-component-id', arrow.componentId || '');

    const points = arrow.points || [];
    if (points.length < 2) {
      fragment.appendChild(group);
      continue;
    }

    let headPoints: string | null = null;
    let shaftPoints = points;
    const head = resolvePreviewArrowhead({
      tip: points[points.length - 1]!,
      previous: points[points.length - 2]!,
      headLen,
      headHalf,
    });
    if (head) {
      headPoints = head.points;
      shaftPoints = [...points.slice(0, -1), head.base];
    }

    const color = arrow.color || ARROW_COLOR;
    for (let index = 0; index < shaftPoints.length - 1; index += 1) {
      const [x1, y1] = shaftPoints[index]!;
      const [x2, y2] = shaftPoints[index + 1]!;

      const line = options.ownerDocument.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', x1.toFixed(1));
      line.setAttribute('y1', y1.toFixed(1));
      line.setAttribute('x2', x2.toFixed(1));
      line.setAttribute('y2', y2.toFixed(1));
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-miterlimit', '10');
      group.appendChild(line);

      const hit = options.ownerDocument.createElementNS(SVG_NS, 'line');
      hit.setAttribute('x1', x1.toFixed(1));
      hit.setAttribute('y1', y1.toFixed(1));
      hit.setAttribute('x2', x2.toFixed(1));
      hit.setAttribute('y2', y2.toFixed(1));
      hit.setAttribute('stroke', 'transparent');
      hit.setAttribute('stroke-width', '12');
      hit.style.pointerEvents = 'stroke';
      group.appendChild(hit);
    }

    if (headPoints) {
      const polygon = options.ownerDocument.createElementNS(SVG_NS, 'polygon');
      polygon.setAttribute('points', headPoints);
      polygon.setAttribute('fill', color);
      group.appendChild(polygon);
    }

    const labelElement = buildArrowLabelElement(
      options.ownerDocument,
      arrow,
      shaftPoints,
      arrow.labelGap ?? GRID_GUTTER,
      options.boundsMap,
    );
    if (labelElement) {
      group.appendChild(labelElement);
    }

    fragment.appendChild(group);
  }
  return fragment;
}

export function patchPreviewArrowSvg(
  options: {
    svg: ParentNode | null | undefined;
    routedArrows: PreviewRoutedArrow[];
    boundsMap: PreviewArrowBoundsMap;
    headLen?: number | null;
    headHalf?: number | null;
  },
): void {
  if (!options.svg) {
    return;
  }

  const headLen = options.headLen ?? ARROW_HEAD_LENGTH;
  const headHalf = options.headHalf ?? ARROW_HEAD_HALF_WIDTH;

  for (const arrow of options.routedArrows) {
    const componentId = arrow.componentId || '';
    const group = findArrowGroups(options.svg, componentId)[0] || null;
    if (!group) {
      continue;
    }

    const allLines = Array.from(group.querySelectorAll('line'));
    const visibleLines = allLines.filter((line) => line.getAttribute('stroke') !== 'transparent');
    const hitLines = allLines.filter((line) => line.getAttribute('stroke') === 'transparent');
    const points = [arrow.start, ...arrow.waypoints, arrow.end];
    const segmentCount = Math.max(0, points.length - 1);

    if (visibleLines.length !== segmentCount || hitLines.length !== segmentCount) {
      const replacement = createPreviewArrowSvgFragment({
        ownerDocument: group.ownerDocument,
        routedArrows: [arrow],
        boundsMap: options.boundsMap,
        headLen,
        headHalf,
      }).firstChild;
      if (replacement) {
        group.querySelectorAll('line, polygon, text').forEach((element) => element.remove());
        Array.from(replacement.childNodes).forEach((child) => group.appendChild(child));
        syncPreviewArrowOriginGeometry(group);
      }
      continue;
    }

    if (visibleLines.length > 0 && points.length >= 2) {
      let basePoint: [number, number] | null = null;
      const head = resolvePreviewArrowhead({
        tip: points[points.length - 1]!,
        previous: points[points.length - 2]!,
        headLen,
        headHalf,
      });
      if (head) {
        basePoint = head.base;
      }

      for (let index = 0; index < visibleLines.length && index < points.length - 1; index += 1) {
        visibleLines[index]!.setAttribute('x1', points[index]![0].toFixed(1));
        visibleLines[index]!.setAttribute('y1', points[index]![1].toFixed(1));
        const isLastSegment = index === points.length - 2;
        const endPoint = isLastSegment && basePoint ? basePoint : points[index + 1]!;
        visibleLines[index]!.setAttribute('x2', endPoint[0].toFixed(1));
        visibleLines[index]!.setAttribute('y2', endPoint[1].toFixed(1));
      }

      for (let index = 0; index < hitLines.length && index < visibleLines.length; index += 1) {
        hitLines[index]!.setAttribute('x1', visibleLines[index]!.getAttribute('x1') || '0');
        hitLines[index]!.setAttribute('y1', visibleLines[index]!.getAttribute('y1') || '0');
        hitLines[index]!.setAttribute('x2', visibleLines[index]!.getAttribute('x2') || '0');
        hitLines[index]!.setAttribute('y2', visibleLines[index]!.getAttribute('y2') || '0');
      }
    }

    const polygon = group.querySelector('polygon');
    if (polygon && points.length >= 2) {
      const head = resolvePreviewArrowhead({
        tip: points[points.length - 1]!,
        previous: points[points.length - 2]!,
        headLen,
        headHalf,
      });
      if (head) {
        polygon.setAttribute('points', head.points);
      }
    }

    replacePreviewArrowLabels({
      group,
      arrow,
      boundsMap: options.boundsMap,
      headLen,
      headHalf,
    });
    syncPreviewArrowOriginGeometry(group);
  }
}
