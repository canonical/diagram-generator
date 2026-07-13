import type { Point2 } from '@diagram-generator/graph-layout-core';

export interface CenteredRectLike {
  x: number;
  y: number;
  width: number;
  height: number;
  padding?: number;
}

export interface IntersectableNodeLike {
  intersect?: (point: Point2) => Point2 | null;
}

const EPS = 1;
const PUSH_OUT = 10;

function intersection(node: CenteredRectLike, outsidePoint: Point2, insidePoint: Point2): Point2 {
  const { x, y } = node;
  const dx = Math.abs(x - insidePoint.x);
  const halfWidth = node.width / 2;
  let projectedRun = insidePoint.x < outsidePoint.x ? halfWidth - dx : halfWidth + dx;
  const halfHeight = node.height / 2;

  const deltaY = Math.abs(outsidePoint.y - insidePoint.y);
  const deltaX = Math.abs(outsidePoint.x - insidePoint.x);

  if (Math.abs(y - outsidePoint.y) * halfWidth > Math.abs(x - outsidePoint.x) * halfHeight) {
    const projectedRise = insidePoint.y < outsidePoint.y
      ? outsidePoint.y - halfHeight - y
      : y - halfHeight - outsidePoint.y;
    projectedRun = (deltaX * projectedRise) / deltaY;
    const result = {
      x: insidePoint.x < outsidePoint.x ? insidePoint.x + projectedRun : insidePoint.x - deltaX + projectedRun,
      y: insidePoint.y < outsidePoint.y ? insidePoint.y + deltaY - projectedRise : insidePoint.y - deltaY + projectedRise,
    };

    if (deltaX === 0) {
      result.x = outsidePoint.x;
    }
    if (deltaY === 0) {
      result.y = outsidePoint.y;
    }

    return result;
  }

  if (insidePoint.x < outsidePoint.x) {
    projectedRun = outsidePoint.x - halfWidth - x;
  } else {
    projectedRun = x - halfWidth - outsidePoint.x;
  }

  const projectedRise = (deltaY * projectedRun) / deltaX;
  let nextX = insidePoint.x < outsidePoint.x ? insidePoint.x + deltaX - projectedRun : insidePoint.x - deltaX + projectedRun;
  let nextY = insidePoint.y < outsidePoint.y ? insidePoint.y + projectedRise : insidePoint.y - projectedRise;

  if (deltaX === 0) {
    nextX = outsidePoint.x;
  }
  if (deltaY === 0) {
    nextY = outsidePoint.y;
  }

  return { x: nextX, y: nextY };
}

function ensureTrulyOutside(bounds: CenteredRectLike, point: Point2, push = PUSH_OUT): Point2 {
  const dx = Math.abs(point.x - bounds.x);
  const dy = Math.abs(point.y - bounds.y);
  const halfWidth = bounds.width / 2;
  const halfHeight = bounds.height / 2;
  if (Math.abs(dx - halfWidth) < EPS || Math.abs(dy - halfHeight) < EPS) {
    const dirX = point.x - bounds.x;
    const dirY = point.y - bounds.y;
    const length = Math.sqrt(dirX * dirX + dirY * dirY);
    if (length > 0) {
      return {
        x: bounds.x + (dirX / length) * (length + push),
        y: bounds.y + (dirY / length) * (length + push),
      };
    }
  }

  return point;
}

function makeInsidePoint(bounds: CenteredRectLike, outside: Point2, center: Point2): Point2 {
  const isVertical = Math.abs(outside.x - bounds.x) < EPS;
  const isHorizontal = Math.abs(outside.y - bounds.y) < EPS;

  return {
    x: isVertical
      ? outside.x
      : outside.x < bounds.x
        ? bounds.x - bounds.width / 4
        : bounds.x + bounds.width / 4,
    y: isHorizontal ? outside.y : center.y,
  };
}

function tryNodeIntersect(
  node: IntersectableNodeLike,
  bounds: CenteredRectLike,
  outside: Point2,
): Point2 | null {
  if (!node.intersect) {
    return null;
  }

  const result = node.intersect(outside);
  if (!result) {
    return null;
  }

  const wrongSide =
    (outside.x < bounds.x && result.x > bounds.x) || (outside.x > bounds.x && result.x < bounds.x);
  if (wrongSide) {
    return null;
  }

  const distance = Math.hypot(outside.x - result.x, outside.y - result.y);
  if (distance <= EPS) {
    return null;
  }

  return result;
}

function fallbackIntersection(bounds: CenteredRectLike, outside: Point2, center: Point2): Point2 {
  const inside = makeInsidePoint(bounds, outside, center);
  return intersection(bounds, outside, inside);
}

export function outsideNode(node: CenteredRectLike, point: Point2): boolean {
  const dx = Math.abs(point.x - node.x);
  const dy = Math.abs(point.y - node.y);
  const halfWidth = node.width / 2;
  const halfHeight = node.height / 2;

  return dx >= halfWidth || dy >= halfHeight;
}

export function computeNodeIntersection(
  node: IntersectableNodeLike,
  bounds: CenteredRectLike,
  outside: Point2,
  center: Point2,
): Point2 {
  const adjustedOutside = ensureTrulyOutside(bounds, outside);
  return tryNodeIntersect(node, bounds, adjustedOutside)
    ?? fallbackIntersection(bounds, adjustedOutside, center);
}

export function replaceEndpoint(
  points: Point2[],
  which: 'start' | 'end',
  value: Point2 | null | undefined,
  tolerance = 0.1,
): void {
  if (!value || points.length === 0) {
    return;
  }

  if (which === 'start') {
    if (
      Math.abs(points[0]!.x - value.x) < tolerance &&
      Math.abs(points[0]!.y - value.y) < tolerance
    ) {
      points.shift();
      return;
    }

    points[0] = value;
    return;
  }

  const lastIndex = points.length - 1;
  if (
    Math.abs(points[lastIndex]!.x - value.x) < tolerance &&
    Math.abs(points[lastIndex]!.y - value.y) < tolerance
  ) {
    points.pop();
    return;
  }

  points[lastIndex] = value;
}
