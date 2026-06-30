import { describe, expect, it } from 'vitest';
import { renderSingleSelectionAutolayoutPanel } from '../src/preview-shell/inspector-autolayout-panel.js';

describe('inspector autolayout panel renderer', () => {
  it('renders container controls with gap bump and fixed width units', () => {
    const html = renderSingleSelectionAutolayoutPanel({
      cid: 'frame-1',
      panelState: {
        isContainer: true,
        direction: 'HORIZONTAL',
        currentGapDelta: 16,
        automaticGap: 24,
        effectiveGap: 40,
        sizingW: 'FIXED',
        sizingH: 'HUG',
        wCoerced: false,
        hCoerced: false,
        showGapDeltaControls: true,
        showWidthFixedInput: true,
        showWidthMinMax: true,
        showWidthTextMeasure: false,
        showHeightFixedInput: false,
        showHeightMinMax: false,
        showPositionType: false,
        positionType: 'AUTO',
        showAbsoluteOffsetControls: false,
      },
      widthFixedValue: 12,
      widthFixedStep: 1,
      widthUnit: 'cols',
      showWidthColsOption: true,
      widthMinValue: 80,
      widthMaxValue: 240,
    });

    expect(html).toContain('data-dg-panel-group="layout" data-dg-panel-id="single-autolayout-layout"');
    expect(html).toContain('data-dg-panel-group="sizing" data-dg-panel-id="single-autolayout-sizing"');
    expect(html).toContain('Auto-layout · frame-1');
    expect(html).toContain('data-dg-change-action="single-prop"');
    expect(html).toContain('data-dg-cid="frame-1"');
    expect(html).toContain('data-dg-prop="direction"');
    expect(html).toContain('Effective gap 40px = auto 24px + delta 16px');
    expect(html).toContain('<option value="cols" selected>cols</option>');
    expect(html).toContain('data-dg-prop="min_width"');
    expect(html).not.toContain('data-dg-prop="fill_weight"');
    expect(html).not.toContain('<span class="label">Weight</span>');
    expect(html).not.toContain('onchange=');
    expect(html).not.toContain('onkeydown=');
  });

  it('renders text-measure controls and disables max chars when px max width is active', () => {
    const html = renderSingleSelectionAutolayoutPanel({
      cid: 'note',
      panelState: {
        isContainer: false,
        direction: 'VERTICAL',
        currentGapDelta: 0,
        automaticGap: 24,
        effectiveGap: 24,
        sizingW: 'HUG',
        sizingH: 'HUG',
        wCoerced: true,
        hCoerced: false,
        showGapDeltaControls: false,
        showWidthFixedInput: false,
        showWidthMinMax: false,
        showWidthTextMeasure: true,
        showHeightFixedInput: false,
        showHeightMinMax: false,
        showPositionType: false,
        positionType: 'AUTO',
        showAbsoluteOffsetControls: false,
      },
      widthMinValue: 96,
      widthMaxValue: 320,
      widthMaxCharsValue: 40,
      widthMaxCharsDisabled: true,
    });

    expect(html).toContain('Sizing</span>');
    expect(html).toContain('data-dg-panel-group="sizing" data-dg-panel-id="single-autolayout-sizing"');
    expect(html).not.toContain('data-dg-panel-id="single-autolayout-layout"');
    expect(html).toContain('dg-coerced');
    expect(html).toContain('Max chars');
    expect(html).toContain('disabled title="Clear Max W (px) to edit character measure"');
    expect(html).toContain('data-dg-prop="max_width_chars"');
  });

  it('renders absolute positioning offsets when the node is absolute', () => {
    const html = renderSingleSelectionAutolayoutPanel({
      cid: 'child',
      panelState: {
        isContainer: false,
        direction: 'VERTICAL',
        currentGapDelta: 0,
        automaticGap: 24,
        effectiveGap: 24,
        sizingW: 'HUG',
        sizingH: 'FIXED',
        wCoerced: false,
        hCoerced: true,
        showGapDeltaControls: false,
        showWidthFixedInput: false,
        showWidthMinMax: false,
        showWidthTextMeasure: false,
        showHeightFixedInput: true,
        showHeightMinMax: true,
        showPositionType: true,
        positionType: 'ABSOLUTE',
        showAbsoluteOffsetControls: true,
      },
      heightFixedValue: 64,
      heightFixedStep: 8,
      heightUnit: 'rows',
      showHeightRowsOption: true,
      heightMinValue: 32,
      heightMaxValue: 128,
      positionXValue: 24,
      positionYValue: 40,
    });

    expect(html).toContain('<option value="ABSOLUTE" selected>Absolute</option>');
    expect(html).toContain('data-dg-panel-group="position" data-dg-panel-id="single-autolayout-position"');
    expect(html).toContain('data-dg-prop="x"');
    expect(html).toContain('data-dg-prop="y"');
    expect(html).toContain('data-dg-value-type="int"');
    expect(html).toContain('<option value="rows" selected>rows</option>');
    expect(html).toContain('value="64"');
  });
});
