import { type ResolvedArrowheadGeometry, resolveArrowPolylineGeometry } from './arrow-geometry.js';
import { createLine, type Arrow, type Line } from './frame-model.js';
import { annotationTextToSpec } from './resolved-spec-typography.js';
import type { PathCommand } from './render-ir.js';
import {
  ARROW_COLOR,
  ARROW_HEAD_HALF_WIDTH,
  ARROW_HEAD_LENGTH,
  BODY_LINE_STEP,
  BODY_SIZE,
  GRID_GUTTER,
  sizeToPx,
} from './tokens.js';
import type { LineSpec } from './text-measure.js';
import { lineTopToBaseline } from './text-render-geometry.js';

export interface ArrowRenderBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ArrowRenderBoundsMap = Record<string, ArrowRenderBounds>;

export interface ArrowRenderPlanArrow {
  componentId?: string;
  points: readonly [number, number][];
  color?: string | null;
  label?: readonly (Line | string)[] | null;
  labelGap?: number | null;
}

export interface ArrowRenderSegmentPlan {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ArrowRenderLabelLinePlan {
  x: number;
  y: number;
  size: string;
  weight: string;
  fill: string;
  spec: LineSpec;
}

export interface ArrowRenderLabelPlan {
  textAnchor: 'middle';
  dominantBaseline: 'middle';
  lines: ArrowRenderLabelLinePlan[];
}

export interface ArrowRenderPlan {
  componentId?: string;
  color: string;
  shaftPoints: readonly [number, number][];
  shaftSegments: ArrowRenderSegmentPlan[];
  head: ResolvedArrowheadGeometry | null;
  label: ArrowRenderLabelPlan | null;
}

function normalizeArrowLabelLines(
  label: ArrowRenderPlanArrow['label'],
): Line[] {
  if (!label || label.length === 0) {
    return [];
  }
  return label.map((line) => (
    typeof line === 'string'
      ? createLine(line)
      : createLine(line.content || '', {
        size: line.size,
        weight: line.weight,
        fill: line.fill,
        smallCaps: line.smallCaps,
        letterSpacing: line.letterSpacing,
        lineStep: line.lineStep,
        fontFamily: line.fontFamily,
      })
  ));
}

function minDistanceToBounds(
  x: number,
  y: number,
  boundsList: readonly ArrowRenderBounds[],
): number {
  let minDistance = Number.POSITIVE_INFINITY;
  for (const bounds of boundsList) {
    const clampedX = Math.max(bounds.x, Math.min(x, bounds.x + bounds.w));
    const clampedY = Math.max(bounds.y, Math.min(y, bounds.y + bounds.h));
    minDistance = Math.min(minDistance, Math.hypot(x - clampedX, y - clampedY));
  }
  return minDistance;
}

export function resolveArrowLabelAnchor(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  labelGap: number,
  boundsMap?: ArrowRenderBoundsMap | null,
): { x: number; y: number } {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const candidates = [
    { x: mx + nx * labelGap, y: my + ny * labelGap },
    { x: mx - nx * labelGap, y: my - ny * labelGap },
  ];
  const boundsList = boundsMap ? Object.values(boundsMap) : [];
  if (boundsList.length === 0) {
    return candidates[0]!;
  }

  let best = candidates[0]!;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const candidate of candidates) {
    const score = minDistanceToBounds(candidate.x, candidate.y, boundsList);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

export function arrowheadPathCommands(
  head: ResolvedArrowheadGeometry,
): readonly PathCommand[] {
  return [
    { kind: 'M', x: head.left[0], y: head.left[1] },
    { kind: 'L', x: head.tip[0], y: head.tip[1] },
    { kind: 'L', x: head.right[0], y: head.right[1] },
    { kind: 'Z' },
  ];
}

export function resolveArrowRenderPlan(options: {
  arrow: ArrowRenderPlanArrow;
  boundsMap?: ArrowRenderBoundsMap | null;
  headLength?: number | null;
  headHalfWidth?: number | null;
}): ArrowRenderPlan {
  const color = options.arrow.color ?? ARROW_COLOR;
  const labelGap = options.arrow.labelGap ?? GRID_GUTTER;
  const { head, shaftPoints } = resolveArrowPolylineGeometry({
    points: options.arrow.points,
    headLength: options.headLength ?? ARROW_HEAD_LENGTH,
    headHalfWidth: options.headHalfWidth ?? ARROW_HEAD_HALF_WIDTH,
  });
  const shaftSegments = shaftPoints.slice(0, -1).map((point, index) => {
    const [x1, y1] = point;
    const [x2, y2] = shaftPoints[index + 1]!;
    return { x1, y1, x2, y2 };
  });

  const labelLines = normalizeArrowLabelLines(options.arrow.label);
  if (labelLines.length === 0 || shaftPoints.length < 2) {
    return {
      componentId: options.arrow.componentId,
      color,
      shaftPoints,
      shaftSegments,
      head,
      label: null,
    };
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

  const [x1, y1] = shaftPoints[bestIndex]!;
  const [x2, y2] = shaftPoints[bestIndex + 1]!;
  const anchor = resolveArrowLabelAnchor(x1, y1, x2, y2, labelGap, options.boundsMap);
  const specs = labelLines.map(annotationTextToSpec);
  const totalHeight = specs.reduce((sum, spec, index) => {
    const lineStep = sizeToPx(spec.lineStep ?? BODY_LINE_STEP);
    return sum + (index === 0 ? 0 : lineStep);
  }, 0);
  let top = anchor.y - totalHeight / 2;
  const lines: ArrowRenderLabelLinePlan[] = [];
  for (const spec of specs) {
    const size = String(spec.size ?? BODY_SIZE);
    const lineStep = sizeToPx(spec.lineStep ?? BODY_LINE_STEP);
    lines.push({
      x: anchor.x,
      y: lineTopToBaseline(top, size),
      size,
      weight: String(spec.weight ?? '400'),
      fill: spec.fill ?? '#666666',
      spec,
    });
    top += lineStep;
  }

  return {
    componentId: options.arrow.componentId,
    color,
    shaftPoints,
    shaftSegments,
    head,
    label: {
      textAnchor: 'middle',
      dominantBaseline: 'middle',
      lines,
    },
  };
}
