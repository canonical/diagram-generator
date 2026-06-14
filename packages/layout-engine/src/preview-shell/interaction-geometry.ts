/**
 * Interaction geometry helpers (spec 043 interaction slice C).
 */

export interface ReorderTargetPoint {
  cid: string;
  midpoint: number;
}

export interface ReorderResolution {
  insertIndex: number;
  currentIndex: number;
  isNoop: boolean;
}

export interface ResizeGuideLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ResizeBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  resizeLines: ResizeGuideLine[];
}

export interface ResizeBoundsInput {
  bounds: Pick<ResizeBounds, 'left' | 'top' | 'right' | 'bottom'>;
  axis: string;
  dx: number;
  dy: number;
  gridTargets: { xs?: number[]; ys?: number[] };
  svgW: number;
  svgH: number;
  minWidth: number;
  minHeight: number;
  snapStep?: number;
  snapThreshold?: number;
}

export interface SingleResizeOverrideInput {
  axis: string;
  dx: number;
  dy: number;
  baseX: number;
  baseY: number;
  baseW: number;
  baseH: number;
  origDx: number;
  origDy: number;
  origDw: number;
  origDh: number;
  gridTargets: { xs?: number[]; ys?: number[] };
  svgW: number;
  svgH: number;
  snapStep?: number;
  snapThreshold?: number;
}

export interface SingleResizeOverride {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  resizeLines: ResizeGuideLine[];
}

function snapRoundedDelta(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function snapEdge(
  edge: number,
  targets: number[],
  threshold: number,
): { value: number; snapped: boolean; target: number | null } {
  let best = edge;
  let bestDist = threshold + 1;
  let snappedTarget: number | null = null;
  for (const target of targets) {
    const dist = Math.abs(edge - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = target;
      snappedTarget = target;
    }
  }
  return { value: best, snapped: bestDist <= threshold, target: snappedTarget };
}

export function resolveAutolayoutReorderTarget(options: {
  cid: string;
  cursorPos: number;
  targets: ReorderTargetPoint[];
}): ReorderResolution {
  let insertIndex = options.targets.length;
  for (let i = 0; i < options.targets.length; i += 1) {
    const target = options.targets[i];
    if (target && options.cursorPos < target.midpoint) {
      insertIndex = i;
      break;
    }
  }
  const currentIndex = options.targets.findIndex((target) => target.cid === options.cid);
  const isNoop = insertIndex === currentIndex || insertIndex === currentIndex + 1;
  return {
    insertIndex,
    currentIndex,
    isNoop,
  };
}

export function applyReorderOrder(
  currentOrder: string[],
  cid: string,
  insertIndex: number,
): string[] | null {
  const currentIdx = currentOrder.indexOf(cid);
  if (currentIdx === -1) return null;

  const newOrder = currentOrder.filter((id) => id !== cid);
  const adjustedIdx = insertIndex > currentIdx ? insertIndex - 1 : insertIndex;
  newOrder.splice(adjustedIdx, 0, cid);

  if (newOrder.length !== currentOrder.length) return null;
  if (newOrder.every((id, index) => id === currentOrder[index])) return null;
  return newOrder;
}

export function resizeBoundsFromHandle(input: ResizeBoundsInput): ResizeBounds {
  const step = Math.max(1, input.snapStep ?? 8);
  const threshold = Math.max(0, input.snapThreshold ?? 6);
  const xs = input.gridTargets.xs ?? [];
  const ys = input.gridTargets.ys ?? [];

  let left = input.bounds.left;
  let top = input.bounds.top;
  let right = input.bounds.right;
  let bottom = input.bounds.bottom;
  const resizeLines: ResizeGuideLine[] = [];

  if (input.axis === 'l' || input.axis === 'tl' || input.axis === 'bl') {
    const rawLeft = input.bounds.left + snapRoundedDelta(input.dx, step);
    const snapL = snapEdge(rawLeft, xs, threshold);
    const nextLeft = Math.min(snapL.snapped ? snapL.value : rawLeft, input.bounds.right - input.minWidth);
    if (snapL.snapped && nextLeft === snapL.value && snapL.target != null) {
      resizeLines.push({ x1: snapL.target, y1: 0, x2: snapL.target, y2: input.svgH });
    }
    left = nextLeft;
  } else if (input.axis === 'r' || input.axis === 'tr' || input.axis === 'br') {
    const rawRight = input.bounds.right + snapRoundedDelta(input.dx, step);
    const snapR = snapEdge(rawRight, xs, threshold);
    const nextRight = Math.max(snapR.snapped ? snapR.value : rawRight, input.bounds.left + input.minWidth);
    if (snapR.snapped && nextRight === snapR.value && snapR.target != null) {
      resizeLines.push({ x1: snapR.target, y1: 0, x2: snapR.target, y2: input.svgH });
    }
    right = nextRight;
  }

  if (input.axis === 't' || input.axis === 'tl' || input.axis === 'tr') {
    const rawTop = input.bounds.top + snapRoundedDelta(input.dy, step);
    const snapT = snapEdge(rawTop, ys, threshold);
    const nextTop = Math.min(snapT.snapped ? snapT.value : rawTop, input.bounds.bottom - input.minHeight);
    if (snapT.snapped && nextTop === snapT.value && snapT.target != null) {
      resizeLines.push({ x1: 0, y1: snapT.target, x2: input.svgW, y2: snapT.target });
    }
    top = nextTop;
  } else if (input.axis === 'b' || input.axis === 'bl' || input.axis === 'br') {
    const rawBottom = input.bounds.bottom + snapRoundedDelta(input.dy, step);
    const snapB = snapEdge(rawBottom, ys, threshold);
    const nextBottom = Math.max(snapB.snapped ? snapB.value : rawBottom, input.bounds.top + input.minHeight);
    if (snapB.snapped && nextBottom === snapB.value && snapB.target != null) {
      resizeLines.push({ x1: 0, y1: snapB.target, x2: input.svgW, y2: snapB.target });
    }
    bottom = nextBottom;
  }

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    resizeLines,
  };
}

export function resolveSingleResizeOverride(input: SingleResizeOverrideInput): SingleResizeOverride {
  const step = Math.max(1, input.snapStep ?? 8);
  const threshold = Math.max(0, input.snapThreshold ?? 6);
  const xs = input.gridTargets.xs ?? [];
  const ys = input.gridTargets.ys ?? [];

  let nextDx = input.origDx;
  let nextDy = input.origDy;
  let nextDw = input.origDw;
  let nextDh = input.origDh;
  const resizeLines: ResizeGuideLine[] = [];

  if (input.axis === 'l' || input.axis === 'tl' || input.axis === 'bl') {
    const delta = snapRoundedDelta(input.dx, step);
    nextDx = input.origDx + delta;
    nextDw = input.origDw - delta;
    const leftEdge = input.baseX + nextDx;
    const snapL = snapEdge(leftEdge, xs, threshold);
    if (snapL.snapped) {
      const adjustment = snapL.value - leftEdge;
      nextDx += adjustment;
      nextDw -= adjustment;
      if (snapL.target != null) {
        resizeLines.push({ x1: snapL.target, y1: 0, x2: snapL.target, y2: input.svgH });
      }
    }
  } else if (input.axis === 'r' || input.axis === 'tr' || input.axis === 'br') {
    nextDw = snapRoundedDelta(input.origDw + input.dx, step);
    const rightEdge = input.baseX + input.origDx + input.baseW + nextDw;
    const snapR = snapEdge(rightEdge, xs, threshold);
    if (snapR.snapped) {
      nextDw += snapR.value - rightEdge;
      if (snapR.target != null) {
        resizeLines.push({ x1: snapR.target, y1: 0, x2: snapR.target, y2: input.svgH });
      }
    }
  }

  if (input.axis === 't' || input.axis === 'tl' || input.axis === 'tr') {
    const delta = snapRoundedDelta(input.dy, step);
    nextDy = input.origDy + delta;
    nextDh = input.origDh - delta;
    const topEdge = input.baseY + nextDy;
    const snapT = snapEdge(topEdge, ys, threshold);
    if (snapT.snapped) {
      const adjustment = snapT.value - topEdge;
      nextDy += adjustment;
      nextDh -= adjustment;
      if (snapT.target != null) {
        resizeLines.push({ x1: 0, y1: snapT.target, x2: input.svgW, y2: snapT.target });
      }
    }
  } else if (input.axis === 'b' || input.axis === 'bl' || input.axis === 'br') {
    nextDh = snapRoundedDelta(input.origDh + input.dy, step);
    const bottomEdge = input.baseY + input.origDy + input.baseH + nextDh;
    const snapB = snapEdge(bottomEdge, ys, threshold);
    if (snapB.snapped) {
      nextDh += snapB.value - bottomEdge;
      if (snapB.target != null) {
        resizeLines.push({ x1: 0, y1: snapB.target, x2: input.svgW, y2: snapB.target });
      }
    }
  }

  return {
    dx: nextDx,
    dy: nextDy,
    dw: nextDw,
    dh: nextDh,
    resizeLines,
  };
}
