import { BASELINE_UNIT } from '../tokens.js';

/**
 * Preview-shell grid math helpers (spec 043 grid slice A).
 *
 * These helpers own the pure Brockman-style grid calculations and span/pixel
 * conversions while the legacy shell still owns DOM reads, writes, and overlay
 * drawing.
 */

export interface PreviewGridInfo {
  col_xs: number[];
  col_widths: number[];
  row_ys: number[];
  row_heights: number[];
  col_gap: number;
  row_gap: number;
  margin_top: number;
  margin_right: number;
  margin_bottom: number;
  margin_left: number;
  outer_margin: number;
  _resolved_bottom_margin: number;
  _resolved_right_margin: number;
  _baseline_step: number;
  _cols: number;
  _rows: number;
}

export interface ResolvePreviewGridInfoParams {
  canvasWidth: number;
  canvasHeight: number;
  baselineStep?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  columnCount?: number;
  columnGutter?: number;
  rowCount?: number;
  rowGutter?: number;
  slackAbsorption?: boolean;
}

function snapToStep(value: number, step: number): number {
  return Math.max(0, Math.round(value / step)) * step;
}

export function resolvePreviewGridInfo(
  params: ResolvePreviewGridInfoParams,
): PreviewGridInfo {
  const {
    canvasWidth,
    canvasHeight,
    baselineStep = BASELINE_UNIT,
    marginTop = 24,
    marginRight = 24,
    marginBottom = 24,
    marginLeft = 24,
    columnCount = 2,
    columnGutter = 24,
    rowCount: requestedRowCount = 0,
    rowGutter: requestedRowGutter = 24,
    slackAbsorption = true,
  } = params;

  const step = Math.max(1, baselineStep);

  const mTop = snapToStep(marginTop, step);
  const mRight = snapToStep(marginRight, step);
  const mLeft = snapToStep(marginLeft, step);
  const requestedMBottom = snapToStep(marginBottom, step);
  const minMBottom = slackAbsorption
    ? Math.max(requestedMBottom, mTop)
    : requestedMBottom;

  const cols = Math.max(1, Math.round(columnCount));
  const colGutter = snapToStep(columnGutter, step);

  const contentW = Math.max(0, canvasWidth - mLeft - mRight);
  const contentHAvailable = Math.max(0, canvasHeight - mTop - minMBottom);

  const colWRaw = cols > 1
    ? (contentW - (cols - 1) * colGutter) / cols
    : contentW;
  const colW = colWRaw >= step
    ? Math.floor(colWRaw / step) * step
    : Math.max(step, Math.round(colWRaw));

  const col_xs: number[] = [];
  const col_widths: number[] = [];
  for (let c = 0; c < cols; c += 1) {
    col_xs.push(mLeft + c * (colW + colGutter));
    col_widths.push(colW);
  }

  let rows = requestedRowCount;
  const snappedRowGutter = snapToStep(requestedRowGutter, step);
  if (rows <= 0) {
    const targetRowH = Math.max(step * 10, 80);
    rows = Math.max(
      1,
      Math.floor((contentHAvailable + snappedRowGutter) / (targetRowH + snappedRowGutter)),
    );
  }

  const rowGapCount = Math.max(0, rows - 1);
  let row_gap: number;
  if (rowGapCount === 0) {
    row_gap = 0;
  } else if (slackAbsorption) {
    const maxRowGutter = Math.floor(contentHAvailable / (rowGapCount * step)) * step;
    row_gap = Math.min(snappedRowGutter, Math.max(0, maxRowGutter));
  } else {
    row_gap = snappedRowGutter;
  }

  const totalRowGutter = row_gap * rowGapCount;
  const maxRowHSpace = contentHAvailable - totalRowGutter;
  const rowH = Math.max(
    0,
    Math.floor(Math.max(0, maxRowHSpace) / (rows * step)) * step,
  );

  const _resolved_bottom_margin = slackAbsorption
    ? Math.max(minMBottom, canvasHeight - mTop - rowH * rows - totalRowGutter)
    : Math.max(0, canvasHeight - mTop - rowH * rows - totalRowGutter);

  const usedWidth = cols > 0 ? col_xs[cols - 1]! + colW : mLeft;
  const _resolved_right_margin = canvasWidth - usedWidth;

  const row_ys: number[] = [];
  const row_heights: number[] = [];
  for (let r = 0; r < rows; r += 1) {
    row_ys.push(mTop + r * (rowH + row_gap));
    row_heights.push(rowH);
  }

  return {
    col_xs,
    col_widths,
    row_ys,
    row_heights,
    col_gap: colGutter,
    row_gap,
    margin_top: mTop,
    margin_right: mRight,
    margin_bottom: requestedMBottom,
    margin_left: mLeft,
    outer_margin: mTop,
    _resolved_bottom_margin,
    _resolved_right_margin,
    _baseline_step: step,
    _cols: cols,
    _rows: rows,
  };
}

export function colSpanToPx(
  gridInfo: Pick<PreviewGridInfo, 'col_widths' | 'col_gap'> | null | undefined,
  span: number,
): number | null {
  if (!gridInfo?.col_widths?.length) return null;
  return gridInfo.col_widths[0]! * span + (gridInfo.col_gap || 0) * (span - 1);
}

export function rowSpanToPx(
  gridInfo: Pick<PreviewGridInfo, 'row_heights' | 'row_gap'> | null | undefined,
  span: number,
): number | null {
  if (!gridInfo?.row_heights?.length) return null;
  return gridInfo.row_heights[0]! * span + (gridInfo.row_gap || 0) * (span - 1);
}

export function pxToColSpan(
  gridInfo: Pick<PreviewGridInfo, 'col_widths' | 'col_gap'> | null | undefined,
  px: number,
): number | null {
  if (!gridInfo?.col_widths?.length) return null;
  const colW = gridInfo.col_widths[0]!;
  const gap = gridInfo.col_gap || 0;
  if (colW + gap <= 0) return null;
  return (px + gap) / (colW + gap);
}

export function pxToRowSpan(
  gridInfo: Pick<PreviewGridInfo, 'row_heights' | 'row_gap'> | null | undefined,
  px: number,
): number | null {
  if (!gridInfo?.row_heights?.length) return null;
  const rowH = gridInfo.row_heights[0]!;
  const gap = gridInfo.row_gap || 0;
  if (rowH + gap <= 0) return null;
  return (px + gap) / (rowH + gap);
}
