import { describe, expect, it } from 'vitest';
import { MockTextAdapter } from '../src/text-measure.js';
import { DEFAULT_MAX_WIDTH_CHARS } from '../src/text-layout.js';
import {
  resolvePreviewRuntimeSizingValue,
  resolveSingleSelectionAutolayoutPanelOptions,
} from '../src/preview-shell/inspector-autolayout-options.js';

describe('inspector autolayout option helpers', () => {
  it('prefers coerced runtime sizing over authored or override sizing', () => {
    expect(resolvePreviewRuntimeSizingValue({
      cid: 'frame',
      axis: 'w',
      override: { sizing_w: 'FILL' },
      node: { sizing_w: 'HUG' },
      isCoerced: true,
    })).toBe('FIXED');
    expect(resolvePreviewRuntimeSizingValue({
      cid: 'frame',
      axis: 'h',
      override: { sizing_h: 'FILL' },
      node: { sizing_h: 'HUG' },
      isCoerced: false,
    })).toBe('FILL');
  });

  it('resolves fixed-size and absolute-position panel options from runtime state', () => {
    const options = resolveSingleSelectionAutolayoutPanelOptions({
      cid: 'frame',
      node: {
        layout: 'horizontal',
        children: [{}],
        parent: { id: 'parent' },
        data: { width: 264, height: 96 },
        layoutColGap: 40,
      },
      override: {
        direction: 'HORIZONTAL',
        gap_delta: 16,
        sizing_w: 'FIXED',
        min_width: 80,
        max_width: 240,
        position: 'ABSOLUTE',
        x: 24,
        y: 40,
      },
      widthUnit: 'cols',
      heightUnit: 'px',
      gridInfo: {
        col_widths: [96],
        col_gap: 24,
        row_heights: [64],
        row_gap: 16,
      },
      baselineStep: 8,
    });

    expect(options?.panelState.effectiveGap).toBe(40);
    expect(options?.widthFixedValue).toBe(2.4);
    expect(options?.widthFixedStep).toBe(1);
    expect(options?.widthMinValue).toBe(80);
    expect(options?.widthMaxValue).toBe(240);
    expect(options?.positionXValue).toBe(24);
    expect(options?.positionYValue).toBe(40);
    expect(options?.showWidthColsOption).toBe(true);
  });

  it('derives text-measure preview values and explicit max-width disabling', () => {
    const adapter = new MockTextAdapter();
    const inferred = resolveSingleSelectionAutolayoutPanelOptions({
      cid: 'note',
      node: {
        label_text: ['Hello world'],
        data: {},
      },
      override: {},
      widthCoerced: false,
      widthUnit: 'px',
      heightUnit: 'px',
      baselineStep: 8,
      textAdapter: adapter,
    });

    expect(inferred?.panelState.showWidthTextMeasure).toBe(true);
    expect(inferred?.widthMaxCharsValue).toBe(DEFAULT_MAX_WIDTH_CHARS);
    expect(inferred?.widthMaxValue).toBe(720);
    expect(inferred?.widthMaxCharsDisabled).toBe(false);

    const explicit = resolveSingleSelectionAutolayoutPanelOptions({
      cid: 'note',
      node: {
        label_text: ['Hello world'],
        max_width_chars: 40,
        data: {},
      },
      override: {
        max_width: 320,
      },
      widthUnit: 'px',
      heightUnit: 'px',
      baselineStep: 8,
      textAdapter: adapter,
    });

    expect(explicit?.widthMaxValue).toBe(320);
    expect(explicit?.widthMaxCharsValue).toBe(40);
    expect(explicit?.widthMaxCharsDisabled).toBe(true);
  });
});
