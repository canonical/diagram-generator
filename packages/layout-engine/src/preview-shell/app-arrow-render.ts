import { resolveArrowRenderPlan } from '../arrow-render-plan.js';
import {
  collectPreviewArrowComponentEntries,
  createPreviewArrowComponentId,
  isPreviewArrowComponentId,
} from '../preview-arrow-component-ids.js';
import { routeArrows, type RoutedArrow } from '../arrow-routing.js';
import { type Arrow, createLine } from '../frame-model.js';
import { emitRoutedArrowDisplayListItems } from '../render-adapter/display-list.js';
import {
  annotationTextToSpec,
} from '../resolved-spec-typography.js';
import {
  ARROW_COLOR,
  ARROW_HEAD_HALF_WIDTH,
  ARROW_HEAD_LENGTH,
  BODY_SIZE,
  GRID_GUTTER,
  sizeToPx,
} from '../tokens.js';
import { lineTopToBaseline } from '../text-render-geometry.js';
import { appendPreviewDisplayListItems } from './app-display-list-dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

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

function arrowheadPolygonPoints(plan: ReturnType<typeof resolveArrowRenderPlan>): string | null {
  if (!plan.head) {
    return null;
  }
  return [
    `${plan.head.left[0]},${plan.head.left[1]}`,
    `${plan.head.tip[0]},${plan.head.tip[1]}`,
    `${plan.head.right[0]},${plan.head.right[1]}`,
  ].join(' ');
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
  plan: ReturnType<typeof resolveArrowRenderPlan>,
): SVGTextElement | DocumentFragment | null {
  const elkLabels = buildArrowLabelsFromElk(ownerDocument, arrow);
  if (elkLabels) {
    return elkLabels;
  }
  if (!plan.label) {
    return null;
  }

  const text = ownerDocument.createElementNS(SVG_NS, 'text');
  text.setAttribute('font-family', 'Ubuntu Sans');
  text.setAttribute('text-anchor', plan.label.textAnchor);
  text.setAttribute('dominant-baseline', plan.label.dominantBaseline);

  for (const line of plan.label.lines) {
    const tspan = ownerDocument.createElementNS(SVG_NS, 'tspan');
    tspan.setAttribute('x', fmtSvgNumber(line.x));
    tspan.setAttribute('y', fmtSvgNumber(line.y));
    tspan.setAttribute('font-size', line.size);
    tspan.setAttribute('font-weight', line.weight);
    tspan.setAttribute('fill', line.fill);
    if (line.spec.letterSpacing) {
      tspan.setAttribute('letter-spacing', String(line.spec.letterSpacing));
    }
    if (line.spec.fontFamily) {
      tspan.setAttribute('font-family', line.spec.fontFamily);
    }
    if (line.spec.smallCaps) {
      tspan.setAttribute('font-variant-caps', 'small-caps');
    }
    tspan.textContent = line.spec.content;
    text.appendChild(tspan);
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
    plan: ReturnType<typeof resolveArrowRenderPlan>;
  },
): void {
  options.group.querySelectorAll(':scope > text').forEach((element) => element.remove());
  const labelElement = buildArrowLabelElement(options.group.ownerDocument, options.arrow, options.plan);
  if (!labelElement) {
    return;
  }
  options.group.appendChild(labelElement);
}

export function previewArrowComponentId(
  arrow: Pick<Arrow, 'id' | 'source' | 'target'>,
): string {
  if (isPreviewArrowComponentId(arrow.id)) {
    return arrow.id;
  }
  return createPreviewArrowComponentId(arrow);
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
    collectPreviewArrowComponentEntries(arrows).map(({ arrow, componentId }) => {
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
  const authoredEntries = collectPreviewArrowComponentEntries(arrows);
  const authoredByComponentId = new Map(authoredEntries.map(({ arrow, componentId }) => [componentId, arrow]));
  const normalizedArrows = authoredEntries.map(({ arrow, componentId }) => ({
    ...arrow,
    // Keep authored arrow ids intact so arrow:<id> / @id refs still route
    // correctly; preview selection/save ids travel separately.
    componentId,
  }));

  return routeArrows(normalizedArrows, boundsMap)
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
  appendPreviewDisplayListItems({
    ownerDocument: options.ownerDocument,
    parent: fragment,
    items: emitRoutedArrowDisplayListItems(options.routedArrows, options.boundsMap, {
      headLength: options.headLen ?? ARROW_HEAD_LENGTH,
      headHalfWidth: options.headHalf ?? ARROW_HEAD_HALF_WIDTH,
    }),
    allowedLayers: ['arrow'],
  });
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
    const plan = resolveArrowRenderPlan({
      arrow,
      boundsMap: options.boundsMap,
      headLength: headLen,
      headHalfWidth: headHalf,
    });
    const segmentCount = plan.shaftSegments.length;

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

    if (visibleLines.length > 0) {
      for (let index = 0; index < visibleLines.length && index < plan.shaftSegments.length; index += 1) {
        const segment = plan.shaftSegments[index]!;
        visibleLines[index]!.setAttribute('x1', segment.x1.toFixed(1));
        visibleLines[index]!.setAttribute('y1', segment.y1.toFixed(1));
        visibleLines[index]!.setAttribute('x2', segment.x2.toFixed(1));
        visibleLines[index]!.setAttribute('y2', segment.y2.toFixed(1));
      }

      for (let index = 0; index < hitLines.length && index < plan.shaftSegments.length; index += 1) {
        hitLines[index]!.setAttribute('x1', visibleLines[index]!.getAttribute('x1') || '0');
        hitLines[index]!.setAttribute('y1', visibleLines[index]!.getAttribute('y1') || '0');
        hitLines[index]!.setAttribute('x2', visibleLines[index]!.getAttribute('x2') || '0');
        hitLines[index]!.setAttribute('y2', visibleLines[index]!.getAttribute('y2') || '0');
      }
    }

    const polygon = group.querySelector('polygon');
    const headPoints = arrowheadPolygonPoints(plan);
    if (polygon && headPoints) {
      polygon.setAttribute('points', headPoints);
    }

    replacePreviewArrowLabels({
      group,
      arrow,
      plan,
    });
    syncPreviewArrowOriginGeometry(group);
  }
}
