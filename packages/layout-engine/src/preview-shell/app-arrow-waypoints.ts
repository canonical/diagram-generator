/**
 * Preview arrow waypoint SVG helpers (spec 043 app slice E).
 *
 * These helpers own the DOM update/rebuild logic for arrow waypoint editing so
 * editor.js only wires pointer events and model mutations.
 */

export type PreviewArrowPoint = [number, number];

export interface PreviewArrowEndpoints {
  start: PreviewArrowPoint;
  end: PreviewArrowPoint;
}

export interface PreviewArrowDelta {
  dx: number;
  dy: number;
}

export interface PreviewArrowSegmentCoordinate {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PreviewArrowhead {
  base: PreviewArrowPoint;
  points: string;
}

export interface PreviewArrowSvgUpdatePlan {
  segments: PreviewArrowSegmentCoordinate[];
  polygonPoints: string | null;
}

export type PreviewWaypointDragAxis = 'x' | 'y' | 'free' | null;

export interface PreviewWaypointDragState {
  cid: string;
  idx: number;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  hasMoved: boolean;
  axis: PreviewWaypointDragAxis;
}

export interface PreviewWaypointDragMoveResolution {
  hasMoved: boolean;
  axis: PreviewWaypointDragAxis;
  waypoint: PreviewArrowPoint | null;
}

function numericAttribute(
  element: Element,
  primaryName: string,
  fallbackName?: string,
): number {
  const primaryValue = Number.parseFloat(element.getAttribute(primaryName) || '');
  if (Number.isFinite(primaryValue)) {
    return primaryValue;
  }
  if (fallbackName) {
    const fallbackValue = Number.parseFloat(element.getAttribute(fallbackName) || '');
    if (Number.isFinite(fallbackValue)) {
      return fallbackValue;
    }
  }
  return 0;
}

function firstArrowGroup(svg: SVGSVGElement, componentId: string): Element | null {
  return svg.querySelector(`[data-component-id="${componentId}"]`);
}

function allArrowGroups(svg: SVGSVGElement, componentId: string): Element[] {
  return Array.from(svg.querySelectorAll(`[data-component-id="${componentId}"]`));
}

function isSvgAttrElement(value: unknown): value is Element {
  return Boolean(
    value
    && typeof value === 'object'
    && typeof (value as { getAttribute?: unknown }).getAttribute === 'function',
  );
}

function visibleArrowLines(groups: Element[]): SVGLineElement[] {
  return groups.flatMap((group) => Array.from(group.querySelectorAll('line')))
    .filter((line): line is SVGLineElement => isSvgAttrElement(line))
    .filter((line) => line.getAttribute('stroke') !== 'transparent');
}

function hitAreaArrowLines(groups: Element[]): SVGLineElement[] {
  return groups.flatMap((group) => Array.from(group.querySelectorAll('line')))
    .filter((line): line is SVGLineElement => isSvgAttrElement(line))
    .filter((line) => line.getAttribute('stroke') === 'transparent');
}

function firstArrowPolygon(groups: Element[]): SVGPolygonElement | null {
  for (const group of groups) {
    const polygon = group.querySelector('polygon');
    if (isSvgAttrElement(polygon)) {
      return polygon;
    }
  }
  return null;
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function formatPointPairs(values: number[]): string {
  const pairs: string[] = [];
  for (let index = 0; index < values.length; index += 2) {
    pairs.push(`${values[index]},${values[index + 1]}`);
  }
  return pairs.join(' ');
}

function hasDataset(value: unknown): value is SVGElement & { dataset: DOMStringMap } {
  if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) {
    return true;
  }
  return Boolean(value && typeof value === 'object' && 'dataset' in value);
}

export function resolvePreviewArrowhead(options: {
  tip: PreviewArrowPoint;
  previous: PreviewArrowPoint;
  headLen: number;
  headHalf: number;
}): PreviewArrowhead | null {
  const dx = options.tip[0] - options.previous[0];
  const dy = options.tip[1] - options.previous[1];
  const segmentLength = Math.hypot(dx, dy);
  if (segmentLength <= 0) {
    return null;
  }

  const scale = Math.min(1, segmentLength / options.headLen);
  const scaledHeadLen = options.headLen * scale;
  const scaledHeadHalf = options.headHalf * scale;
  const ux = dx / segmentLength;
  const uy = dy / segmentLength;
  const baseX = options.tip[0] - ux * scaledHeadLen;
  const baseY = options.tip[1] - uy * scaledHeadLen;
  const perpX = -uy * scaledHeadHalf;
  const perpY = ux * scaledHeadHalf;

  return {
    base: [baseX, baseY],
    points: formatPointPairs([
      baseX + perpX,
      baseY + perpY,
      options.tip[0],
      options.tip[1],
      baseX - perpX,
      baseY - perpY,
    ]),
  };
}

export function resolvePreviewArrowSvgUpdatePlan(options: {
  start: PreviewArrowPoint;
  end: PreviewArrowPoint;
  waypoints: PreviewArrowPoint[];
  headLen: number;
  headHalf: number;
}): PreviewArrowSvgUpdatePlan {
  const points = [options.start, ...options.waypoints, options.end];
  const segments: PreviewArrowSegmentCoordinate[] = [];

  if (points.length < 2) {
    return {
      segments,
      polygonPoints: null,
    };
  }

  const head = resolvePreviewArrowhead({
    tip: points[points.length - 1]!,
    previous: points[points.length - 2]!,
    headLen: options.headLen,
    headHalf: options.headHalf,
  });

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]!;
    const next = points[index + 1]!;
    const isLast = index === points.length - 2;
    const end = isLast && head ? head.base : next;
    segments.push({
      x1: start[0],
      y1: start[1],
      x2: end[0],
      y2: end[1],
    });
  }

  return {
    segments,
    polygonPoints: head ? head.points : null,
  };
}

export function resolvePreviewArrowWaypointHandlePositions(options: {
  waypoints: PreviewArrowPoint[];
  delta: PreviewArrowDelta;
}): PreviewArrowPoint[] {
  return options.waypoints.map(([x, y]) => [
    x + options.delta.dx,
    y + options.delta.dy,
  ]);
}

export function bindPreviewArrowSegmentInsertHandles(options: {
  svg: SVGSVGElement;
  componentId: string;
  delta: PreviewArrowDelta;
  isSelected: boolean;
  onAddWaypoint: (segmentIndex: number, x: number, y: number) => void;
  snapStep?: number;
}): void {
  const snapStep = Math.max(1, options.snapStep ?? 8);
  const groups = options.svg.querySelectorAll(`[data-component-id="${options.componentId}"]`);
  let segmentIndex = 0;

  groups.forEach((group) => {
    group.querySelectorAll('line').forEach((line) => {
      if (line.style.pointerEvents !== 'stroke') {
        return;
      }
      const index = segmentIndex++;
      const bindingKey = `${options.componentId}:${index}`;
      line.setAttribute('data-wp-seg-cid', options.componentId);
      line.setAttribute('data-wp-seg-idx', String(index));
      if (hasDataset(line)) {
        if (line.dataset.wpSegBinding === bindingKey) {
          return;
        }
        line.dataset.wpSegBinding = bindingKey;
      }
      line.addEventListener('dblclick', (event) => {
        if (!options.isSelected) {
          return;
        }
        event.stopPropagation();
        const point = options.svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const svgPoint = point.matrixTransform(options.svg.getScreenCTM()?.inverse());
        const snapX = roundToStep(svgPoint.x, snapStep);
        const snapY = roundToStep(svgPoint.y, snapStep);
        options.onAddWaypoint(index, snapX - options.delta.dx, snapY - options.delta.dy);
      });
    });
  });
}

export function renderPreviewArrowWaypointHandles(options: {
  svg: SVGSVGElement;
  componentId: string;
  waypoints: PreviewArrowPoint[];
  delta: PreviewArrowDelta;
  onHandleMouseDown: (event: MouseEvent) => void;
  onHandleDoubleClick: (index: number, event: MouseEvent) => void;
}): void {
  options.svg.querySelectorAll('.dg-wp-handle').forEach((handle) => handle.remove());
  options.svg.querySelectorAll('.dg-wp-add').forEach((handle) => handle.remove());
  if (options.waypoints.length === 0) {
    return;
  }

  const svgNs = 'http://www.w3.org/2000/svg';
  const ownerDocument = options.svg.ownerDocument;
  const positions = resolvePreviewArrowWaypointHandlePositions({
    waypoints: options.waypoints,
    delta: options.delta,
  });

  positions.forEach(([cx, cy], index) => {
    const circle = ownerDocument.createElementNS(svgNs, 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', '5');
    circle.setAttribute('class', 'dg-wp-handle');
    circle.setAttribute('data-wp-cid', options.componentId);
    circle.setAttribute('data-wp-idx', String(index));
    circle.addEventListener('mousedown', options.onHandleMouseDown);
    circle.addEventListener('dblclick', (event) => {
      event.stopPropagation();
      options.onHandleDoubleClick(index, event);
    });
    options.svg.appendChild(circle);
  });
}

export function createPreviewWaypointDragState(options: {
  cid: string;
  index: number;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
}): PreviewWaypointDragState {
  return {
    cid: options.cid,
    idx: options.index,
    startX: options.startX,
    startY: options.startY,
    origX: options.origX,
    origY: options.origY,
    hasMoved: false,
    axis: null,
  };
}

export function resolvePreviewWaypointDragMove(options: {
  state: PreviewWaypointDragState;
  clientX: number;
  clientY: number;
  endpoints: PreviewArrowEndpoints | null;
  waypoints: PreviewArrowPoint[];
  snapStep?: number;
  movementThreshold?: number;
}): PreviewWaypointDragMoveResolution {
  const snapStep = Math.max(1, options.snapStep ?? 8);
  const movementThreshold = Math.max(0, options.movementThreshold ?? 2);
  const dx = options.clientX - options.state.startX;
  const dy = options.clientY - options.state.startY;
  const hasMoved = options.state.hasMoved || Math.abs(dx) > movementThreshold || Math.abs(dy) > movementThreshold;

  if (!hasMoved) {
    return {
      hasMoved: false,
      axis: options.state.axis,
      waypoint: null,
    };
  }

  let axis = options.state.axis;
  if (axis === null) {
    if (options.endpoints) {
      const allPoints = [options.endpoints.start, ...options.waypoints, options.endpoints.end];
      const allIndex = options.state.idx + 1;
      const previous = allPoints[allIndex - 1];
      const next = allPoints[allIndex + 1];
      if (previous && next) {
        const inHorizontal = Math.abs(previous[1] - options.state.origY) < 2;
        const inVertical = Math.abs(previous[0] - options.state.origX) < 2;
        const outHorizontal = Math.abs(next[1] - options.state.origY) < 2;
        const outVertical = Math.abs(next[0] - options.state.origX) < 2;
        if (inHorizontal && outHorizontal) {
          axis = 'y';
        } else if (inVertical && outVertical) {
          axis = 'x';
        } else {
          axis = 'free';
        }
      } else {
        axis = 'free';
      }
    } else {
      axis = 'free';
    }
  }

  let nextX = options.state.origX + dx;
  let nextY = options.state.origY + dy;
  if (axis === 'x') nextY = options.state.origY;
  if (axis === 'y') nextX = options.state.origX;

  return {
    hasMoved: true,
    axis,
    waypoint: [
      roundToStep(nextX, snapStep),
      roundToStep(nextY, snapStep),
    ],
  };
}

export function prunePreviewCollinearWaypoints(options: {
  waypoints: PreviewArrowPoint[];
  endpoints: PreviewArrowEndpoints | null;
  tolerance?: number;
}): { waypoints: PreviewArrowPoint[]; changed: boolean } {
  if (!options.endpoints || options.waypoints.length === 0) {
    return {
      waypoints: [...options.waypoints],
      changed: false,
    };
  }

  const tolerance = options.tolerance ?? 2;
  const nextWaypoints = options.waypoints.map((point) => [...point] as PreviewArrowPoint);
  const allPoints: PreviewArrowPoint[] = [
    options.endpoints.start,
    ...nextWaypoints,
    options.endpoints.end,
  ];
  let changed = false;

  for (let index = nextWaypoints.length - 1; index >= 0; index -= 1) {
    const allIndex = index + 1;
    const previous = allPoints[allIndex - 1];
    const current = allPoints[allIndex];
    const next = allPoints[allIndex + 1];
    if (!previous || !current || !next) {
      continue;
    }
    const dx = next[0] - previous[0];
    const dy = next[1] - previous[1];
    const length = Math.hypot(dx, dy);
    if (length === 0) {
      nextWaypoints.splice(index, 1);
      allPoints.splice(allIndex, 1);
      changed = true;
      continue;
    }
    const distance = Math.abs(dx * (previous[1] - current[1]) - dy * (previous[0] - current[0])) / length;
    if (distance < tolerance) {
      nextWaypoints.splice(index, 1);
      allPoints.splice(allIndex, 1);
      changed = true;
    }
  }

  return {
    waypoints: nextWaypoints,
    changed,
  };
}

export function insertPreviewWaypoint(
  waypoints: PreviewArrowPoint[],
  segmentIndex: number,
  x: number,
  y: number,
  snapStep = 8,
): PreviewArrowPoint[] {
  const nextWaypoints = waypoints.map((point) => [...point] as PreviewArrowPoint);
  nextWaypoints.splice(segmentIndex, 0, [
    roundToStep(x, snapStep),
    roundToStep(y, snapStep),
  ]);
  return nextWaypoints;
}

export function removePreviewWaypoint(
  waypoints: PreviewArrowPoint[],
  index: number,
): PreviewArrowPoint[] | null {
  if (waypoints.length <= 1) {
    return null;
  }
  const nextWaypoints = waypoints.map((point) => [...point] as PreviewArrowPoint);
  nextWaypoints.splice(index, 1);
  return nextWaypoints;
}

export function readPreviewArrowEndpoints(options: {
  svg: SVGSVGElement;
  componentId: string;
}): PreviewArrowEndpoints | null {
  const groups = allArrowGroups(options.svg, options.componentId);
  const visibleLines = visibleArrowLines(groups);
  if (visibleLines.length === 0) {
    return null;
  }

  const firstLine = visibleLines[0]!;
  const start: PreviewArrowPoint = [
    numericAttribute(firstLine, 'data-orig-x1', 'x1'),
    numericAttribute(firstLine, 'data-orig-y1', 'y1'),
  ];

  const polygon = firstArrowPolygon(groups);
  if (polygon) {
    const pointValues = String(polygon.getAttribute('data-orig-points') || polygon.getAttribute('points') || '')
      .trim()
      .split(/[\s,]+/)
      .map((value) => Number.parseFloat(value))
      .filter((value) => Number.isFinite(value));
    if (pointValues.length >= 6) {
      return {
        start,
        end: [pointValues[2]!, pointValues[3]!],
      };
    }
  }

  const lastLine = visibleLines[visibleLines.length - 1]!;
  return {
    start,
    end: [
      numericAttribute(lastLine, 'data-orig-x2', 'x2'),
      numericAttribute(lastLine, 'data-orig-y2', 'y2'),
    ],
  };
}

function setLineCoordinates(line: SVGLineElement, segment: PreviewArrowSegmentCoordinate): void {
  line.setAttribute('x1', String(segment.x1));
  line.setAttribute('y1', String(segment.y1));
  line.setAttribute('x2', String(segment.x2));
  line.setAttribute('y2', String(segment.y2));
}

export function updatePreviewArrowSvg(options: {
  svg: SVGSVGElement;
  componentId: string;
  waypoints: PreviewArrowPoint[];
  delta: PreviewArrowDelta;
  headLen: number;
  headHalf: number;
}): void {
  const endpoints = readPreviewArrowEndpoints({
    svg: options.svg,
    componentId: options.componentId,
  });
  if (!endpoints) {
    return;
  }

  const groups = allArrowGroups(options.svg, options.componentId);
  const visibleLines = visibleArrowLines(groups);
  const hitLines = hitAreaArrowLines(groups);
  const polygon = firstArrowPolygon(groups);
  const plan = resolvePreviewArrowSvgUpdatePlan({
    start: endpoints.start,
    end: endpoints.end,
    waypoints: options.waypoints,
    headLen: options.headLen,
    headHalf: options.headHalf,
  });

  if (visibleLines.length === plan.segments.length) {
    for (let index = 0; index < visibleLines.length; index += 1) {
      setLineCoordinates(visibleLines[index]!, plan.segments[index]!);
    }
    for (let index = 0; index < hitLines.length && index < plan.segments.length; index += 1) {
      setLineCoordinates(hitLines[index]!, plan.segments[index]!);
    }
    if (polygon && plan.polygonPoints) {
      polygon.setAttribute('points', plan.polygonPoints);
    }
  }

  const handlePositions = resolvePreviewArrowWaypointHandlePositions({
    waypoints: options.waypoints,
    delta: options.delta,
  });
  options.svg.querySelectorAll(`.dg-wp-handle[data-wp-cid="${options.componentId}"]`).forEach((handle) => {
    const index = Number.parseInt(handle.getAttribute('data-wp-idx') || '', 10);
    const position = Number.isFinite(index) ? handlePositions[index] : null;
    if (!position) {
      return;
    }
    handle.setAttribute('cx', String(position[0]));
    handle.setAttribute('cy', String(position[1]));
  });
}

export function rebuildPreviewArrowSvg(options: {
  svg: SVGSVGElement;
  componentId: string;
  waypoints: PreviewArrowPoint[];
  headLen: number;
  headHalf: number;
  color: string;
}): void {
  const endpoints = readPreviewArrowEndpoints({
    svg: options.svg,
    componentId: options.componentId,
  });
  if (!endpoints) {
    return;
  }

  const group = firstArrowGroup(options.svg, options.componentId);
  if (!group) {
    return;
  }

  const plan = resolvePreviewArrowSvgUpdatePlan({
    start: endpoints.start,
    end: endpoints.end,
    waypoints: options.waypoints,
    headLen: options.headLen,
    headHalf: options.headHalf,
  });

  group.querySelectorAll('line, polygon').forEach((element) => element.remove());
  const svgNs = 'http://www.w3.org/2000/svg';
  const ownerDocument = group.ownerDocument;

  for (const segment of plan.segments) {
    const visibleLine = ownerDocument.createElementNS(svgNs, 'line');
    setLineCoordinates(visibleLine, segment);
    visibleLine.setAttribute('stroke', options.color);
    visibleLine.setAttribute('stroke-width', '1');
    group.appendChild(visibleLine);

    const hitLine = ownerDocument.createElementNS(svgNs, 'line');
    setLineCoordinates(hitLine, segment);
    hitLine.setAttribute('stroke', 'transparent');
    hitLine.setAttribute('stroke-width', '12');
    hitLine.style.pointerEvents = 'stroke';
    group.appendChild(hitLine);
  }

  if (plan.polygonPoints) {
    const polygon = ownerDocument.createElementNS(svgNs, 'polygon');
    polygon.setAttribute('points', plan.polygonPoints);
    polygon.setAttribute('fill', options.color);
    group.appendChild(polygon);
  }
}
