import { describe, expect, it } from 'vitest';
import {
  colSpanToPx,
  pxToColSpan,
  pxToRowSpan,
  resolvePreviewGridInfo,
  rowSpanToPx,
} from '../src/preview-shell/grid-resolution.js';

describe('preview-shell grid resolution helpers', () => {
  it('resolves snapped per-side margins and auto row counts', () => {
    expect(resolvePreviewGridInfo({
      canvasWidth: 320,
      canvasHeight: 240,
      baselineStep: 8,
      marginTop: 20,
      marginRight: 28,
      marginBottom: 12,
      marginLeft: 36,
      columnCount: 3,
      columnGutter: 18,
      rowCount: 0,
      rowGutter: 18,
      slackAbsorption: true,
    })).toEqual({
      col_xs: [40, 128, 216],
      col_widths: [72, 72, 72],
      row_ys: [24, 128],
      row_heights: [88, 88],
      col_gap: 16,
      row_gap: 16,
      margin_top: 24,
      margin_right: 32,
      margin_bottom: 16,
      margin_left: 40,
      outer_margin: 24,
      _resolved_bottom_margin: 24,
      _resolved_right_margin: 32,
      _baseline_step: 8,
      _cols: 3,
      _rows: 2,
    });
  });

  it('clamps row gutters when slack absorption is enabled', () => {
    expect(resolvePreviewGridInfo({
      canvasWidth: 200,
      canvasHeight: 56,
      baselineStep: 8,
      marginTop: 8,
      marginRight: 8,
      marginBottom: 8,
      marginLeft: 8,
      columnCount: 2,
      columnGutter: 24,
      rowCount: 3,
      rowGutter: 32,
      slackAbsorption: true,
    }).row_gap).toBe(16);
  });

  it('converts between spans and pixels using resolved grid tracks', () => {
    const info = {
      col_widths: [52],
      col_gap: 16,
      row_heights: [36],
      row_gap: 12,
    };

    expect(colSpanToPx(info, 2)).toBe(120);
    expect(rowSpanToPx(info, 2)).toBe(84);
    expect(pxToColSpan(info, 120)).toBe(2);
    expect(pxToRowSpan(info, 84)).toBe(2);
  });

  it('returns null conversions when track sizes are unavailable', () => {
    expect(colSpanToPx(null, 2)).toBeNull();
    expect(rowSpanToPx(undefined, 2)).toBeNull();
    expect(pxToColSpan({ col_widths: [], col_gap: 16 }, 120)).toBeNull();
    expect(pxToRowSpan({ row_heights: [], row_gap: 16 }, 120)).toBeNull();
  });
});
