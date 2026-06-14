import type { PreviewGridInfo } from './grid-resolution.js';

/**
 * Preview-grid overlay scene helpers (spec 043 grid slice C).
 *
 * These helpers own the pure overlay geometry while the shell still performs
 * SVG DOM creation and teardown.
 */

export interface PreviewGridOverlayRect {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

export interface PreviewGridOverlayLine {
  kind: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
}

export type PreviewGridOverlayShape = PreviewGridOverlayRect | PreviewGridOverlayLine;

export interface PreviewGridOverlayScene {
  shapes: PreviewGridOverlayShape[];
}

function addRect(
  shapes: PreviewGridOverlayShape[],
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
) {
  shapes.push({ kind: 'rect', x, y, width, height, fill });
}

function addLine(
  shapes: PreviewGridOverlayShape[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke: string,
  strokeWidth: number,
  strokeDasharray?: string,
) {
  shapes.push({ kind: 'line', x1, y1, x2, y2, stroke, strokeWidth, strokeDasharray });
}

export function createPreviewGridOverlayScene(options: {
  guideMode: string;
  gridInfo?: Partial<PreviewGridInfo> | null;
  svgWidth: number;
  svgHeight: number;
  baselineStep: number;
}): PreviewGridOverlayScene | null {
  const gridInfo = options.gridInfo;
  if (options.guideMode === 'off' || !gridInfo) return null;

  const shapes: PreviewGridOverlayShape[] = [];
  const svgW = options.svgWidth;
  const svgH = options.svgHeight;
  const colXs = gridInfo.col_xs || [];
  const colWidths = gridInfo.col_widths || [];
  const rowYs = gridInfo.row_ys || [];
  const rowHeights = gridInfo.row_heights || [];
  const colGap = gridInfo.col_gap || 0;
  const rowGap = gridInfo.row_gap || 0;
  const legacyMargin = gridInfo.outer_margin || 0;
  const mTop = gridInfo.margin_top ?? legacyMargin;
  const mRight = gridInfo.margin_right ?? legacyMargin;
  const mBottom = gridInfo.margin_bottom ?? legacyMargin;
  const mLeft = gridInfo.margin_left ?? legacyMargin;

  if (options.guideMode === 'all') {
    const marginColor = 'rgba(235,180,65,0.06)';
    if (mTop > 0) addRect(shapes, 0, 0, svgW, mTop, marginColor);
    if (mBottom > 0) addRect(shapes, 0, svgH - mBottom, svgW, mBottom, marginColor);
    if (mLeft > 0) addRect(shapes, 0, mTop, mLeft, svgH - mTop - mBottom, marginColor);
    if (mRight > 0) addRect(shapes, svgW - mRight, mTop, mRight, svgH - mTop - mBottom, marginColor);

    const contentX = mLeft;
    const contentY = mTop;
    const contentW = Math.max(0, svgW - mLeft - mRight);
    const contentH = Math.max(0, svgH - mTop - mBottom);
    shapes.push({
      kind: 'line',
      x1: contentX,
      y1: contentY,
      x2: contentX + contentW,
      y2: contentY,
      stroke: 'rgba(255,255,255,0.18)',
      strokeWidth: 1,
      strokeDasharray: '6 4',
    });
    shapes.push({
      kind: 'line',
      x1: contentX + contentW,
      y1: contentY,
      x2: contentX + contentW,
      y2: contentY + contentH,
      stroke: 'rgba(255,255,255,0.18)',
      strokeWidth: 1,
      strokeDasharray: '6 4',
    });
    shapes.push({
      kind: 'line',
      x1: contentX + contentW,
      y1: contentY + contentH,
      x2: contentX,
      y2: contentY + contentH,
      stroke: 'rgba(255,255,255,0.18)',
      strokeWidth: 1,
      strokeDasharray: '6 4',
    });
    shapes.push({
      kind: 'line',
      x1: contentX,
      y1: contentY + contentH,
      x2: contentX,
      y2: contentY,
      stroke: 'rgba(255,255,255,0.18)',
      strokeWidth: 1,
      strokeDasharray: '6 4',
    });

    const colFill = 'rgba(100,160,255,0.04)';
    const keylineColor = 'rgba(100,160,255,0.22)';
    for (let c = 0; c < colXs.length; c += 1) {
      const cx = colXs[c]!;
      const cw = c < colWidths.length ? colWidths[c]! : colWidths[colWidths.length - 1]!;
      addRect(shapes, cx, mTop, cw, svgH - mTop - mBottom, colFill);
      addLine(shapes, cx, mTop, cx, svgH - mBottom, keylineColor, 0.5);
      addLine(shapes, cx + cw, mTop, cx + cw, svgH - mBottom, keylineColor, 0.5);
      if (c < colXs.length - 1 && colGap > 0) {
        addRect(shapes, cx + cw, mTop, colGap, svgH - mTop - mBottom, 'rgba(255,100,100,0.06)');
      }
    }

    const rowLine = 'rgba(100,255,160,0.15)';
    for (let r = 0; r < rowYs.length; r += 1) {
      const ry = rowYs[r]!;
      const rh = r < rowHeights.length ? rowHeights[r]! : rowHeights[rowHeights.length - 1]!;
      addLine(shapes, mLeft, ry, svgW - mRight, ry, rowLine, 0.5);
      addLine(shapes, mLeft, ry + rh, svgW - mRight, ry + rh, rowLine, 0.5);
      if (r < rowYs.length - 1 && rowGap > 0) {
        addRect(shapes, mLeft, ry + rh, svgW - mLeft - mRight, rowGap, 'rgba(255,100,100,0.06)');
      }
    }

    const baselineColor = 'rgba(255,100,100,0.08)';
    for (let y = mTop; y <= svgH - mBottom; y += options.baselineStep) {
      addLine(shapes, mLeft, y, svgW - mRight, y, baselineColor, 0.5);
    }
    for (let x = mLeft; x <= svgW - mRight; x += options.baselineStep) {
      addLine(shapes, x, mTop, x, svgH - mBottom, baselineColor, 0.25);
    }

    const resolvedBottom = (gridInfo as Record<string, unknown>).resolved_bottom_margin ?? gridInfo._resolved_bottom_margin;
    if (typeof resolvedBottom === 'number' && resolvedBottom > mBottom + 1) {
      addRect(shapes, 0, svgH - resolvedBottom, svgW, resolvedBottom, 'rgba(235,180,65,0.10)');
    }

    const resolvedRight = (gridInfo as Record<string, unknown>).resolved_right_margin ?? gridInfo._resolved_right_margin;
    if (typeof resolvedRight === 'number' && resolvedRight > mRight + 1) {
      addRect(shapes, svgW - resolvedRight, 0, resolvedRight, svgH, 'rgba(235,180,65,0.10)');
    }
  }

  return { shapes };
}
