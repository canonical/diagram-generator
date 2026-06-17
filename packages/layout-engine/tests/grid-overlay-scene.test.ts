import { describe, expect, it } from 'vitest';
import { createPreviewGridOverlayScene } from '../src/preview-shell/grid-overlay-scene.js';

describe('preview grid overlay scene helpers', () => {
  it('returns null when guides are off or grid info is missing', () => {
    expect(createPreviewGridOverlayScene({
      guideMode: 'off',
      gridInfo: {
        col_xs: [24],
        col_widths: [100],
        row_ys: [24],
        row_heights: [80],
        col_gap: 24,
        row_gap: 24,
        margin_top: 24,
        margin_right: 24,
        margin_bottom: 24,
        margin_left: 24,
        outer_margin: 24,
        _resolved_bottom_margin: 24,
        _resolved_right_margin: 24,
        _baseline_step: 8,
        _cols: 1,
        _rows: 1,
      },
      svgWidth: 400,
      svgHeight: 300,
      baselineStep: 8,
    })).toBeNull();
  });

  it('builds margin, column, row, baseline, and slack absorption shapes', () => {
    const scene = createPreviewGridOverlayScene({
      guideMode: 'all',
      gridInfo: {
        col_xs: [24, 148],
        col_widths: [100, 100],
        row_ys: [24, 120],
        row_heights: [80, 80],
        col_gap: 24,
        row_gap: 16,
        margin_top: 24,
        margin_right: 24,
        margin_bottom: 24,
        margin_left: 24,
        outer_margin: 24,
        _resolved_bottom_margin: 48,
        _resolved_right_margin: 40,
        _baseline_step: 8,
        _cols: 2,
        _rows: 2,
      },
      svgWidth: 320,
      svgHeight: 240,
      baselineStep: 8,
    });

    expect(scene).not.toBeNull();
    const shapes = scene?.shapes ?? [];
    expect(shapes.some((shape) => shape.kind === 'rect' && shape.fill === 'rgba(235,180,65,0.06)')).toBe(true);
    expect(shapes.some((shape) => shape.kind === 'rect' && shape.fill === 'rgba(100,160,255,0.04)')).toBe(true);
    expect(shapes.some((shape) => shape.kind === 'rect' && shape.fill === 'rgba(255,100,100,0.06)')).toBe(true);
    expect(shapes.some((shape) => shape.kind === 'line' && shape.strokeDasharray === '6 4')).toBe(true);
    expect(shapes.some((shape) => shape.kind === 'line' && shape.stroke === 'rgba(100,255,160,0.15)')).toBe(true);
    expect(shapes.some((shape) => shape.kind === 'line' && shape.stroke === 'rgba(255,100,100,0.08)')).toBe(true);
    expect(shapes.some((shape) => shape.kind === 'rect' && shape.fill === 'rgba(235,180,65,0.10)' && shape.height === 48)).toBe(true);
    expect(shapes.some((shape) => shape.kind === 'rect' && shape.fill === 'rgba(235,180,65,0.10)' && shape.width === 40)).toBe(true);
  });
});
