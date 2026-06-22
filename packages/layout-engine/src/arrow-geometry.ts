export type ArrowGeometryPoint = [number, number];

export interface ResolvedArrowheadGeometry {
  base: ArrowGeometryPoint;
  left: ArrowGeometryPoint;
  tip: ArrowGeometryPoint;
  right: ArrowGeometryPoint;
}

export interface ResolvedArrowPolylineGeometry {
  head: ResolvedArrowheadGeometry | null;
  shaftPoints: ArrowGeometryPoint[];
}

export function resolveArrowheadGeometry(options: {
  tip: ArrowGeometryPoint;
  previous: ArrowGeometryPoint;
  headLength: number;
  headHalfWidth: number;
}): ResolvedArrowheadGeometry | null {
  const dx = options.tip[0] - options.previous[0];
  const dy = options.tip[1] - options.previous[1];
  const segmentLength = Math.hypot(dx, dy);
  if (segmentLength <= 0) {
    return null;
  }

  const scale = Math.min(1, segmentLength / options.headLength);
  const scaledHeadLength = options.headLength * scale;
  const scaledHeadHalfWidth = options.headHalfWidth * scale;
  const ux = dx / segmentLength;
  const uy = dy / segmentLength;
  const baseX = options.tip[0] - ux * scaledHeadLength;
  const baseY = options.tip[1] - uy * scaledHeadLength;
  const perpX = -uy * scaledHeadHalfWidth;
  const perpY = ux * scaledHeadHalfWidth;

  return {
    base: [baseX, baseY],
    left: [baseX + perpX, baseY + perpY],
    tip: [options.tip[0], options.tip[1]],
    right: [baseX - perpX, baseY - perpY],
  };
}

export function resolveArrowPolylineGeometry(options: {
  points: readonly ArrowGeometryPoint[];
  headLength: number;
  headHalfWidth: number;
}): ResolvedArrowPolylineGeometry {
  const shaftPoints = options.points.map(([x, y]) => [x, y] as ArrowGeometryPoint);
  if (shaftPoints.length < 2) {
    return {
      head: null,
      shaftPoints,
    };
  }

  const head = resolveArrowheadGeometry({
    tip: shaftPoints[shaftPoints.length - 1]!,
    previous: shaftPoints[shaftPoints.length - 2]!,
    headLength: options.headLength,
    headHalfWidth: options.headHalfWidth,
  });
  if (head) {
    shaftPoints[shaftPoints.length - 1] = head.base;
  }

  return {
    head,
    shaftPoints,
  };
}
