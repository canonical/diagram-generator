import type { SingleSelectionAutolayoutState } from './inspector-single.js';
import {
  escapePreviewHtml,
  renderPreviewDataAttrs,
  renderPreviewPanelGroup,
} from './inline-actions.js';

/**
 * Auto-layout inspector panel renderer (spec 043 slice K).
 *
 * The legacy shell still computes field values and owns DOM hooks, but the
 * large HTML assembly block now lives in a typed browser helper.
 */

export interface SingleSelectionAutolayoutPanelRenderOptions {
  cid: string;
  panelState: SingleSelectionAutolayoutState;
  widthFixedValue?: string | number | null;
  widthFixedStep?: number;
  widthUnit?: 'px' | 'cols';
  showWidthColsOption?: boolean;
  widthMinValue?: string | number | null;
  widthMaxValue?: string | number | null;
  widthMaxCharsValue?: string | number | null;
  widthMaxCharsDisabled?: boolean;
  widthFillWeightValue?: string | number | null;
  heightFixedValue?: string | number | null;
  heightFixedStep?: number;
  heightUnit?: 'px' | 'rows';
  heightMinValue?: string | number | null;
  heightMaxValue?: string | number | null;
  positionXValue?: string | number | null;
  positionYValue?: string | number | null;
}

function valueText(value: unknown): string {
  return value == null ? '' : String(value);
}

function renderSingleSelectionAutolayoutLayoutGroup(
  options: SingleSelectionAutolayoutPanelRenderOptions,
): string {
  const { cid, panelState } = options;
  if (!panelState.isContainer) {
    return '';
  }

  let html = `<span class="label" style="margin-bottom:4px;display:block">Auto-layout · ${escapePreviewHtml(cid)}</span>`;
  html += '<div class="field"><span class="label">Direction</span>';
  html += `<select class="bf-input"${renderPreviewDataAttrs({
    'data-dg-change-action': 'single-prop',
    'data-dg-cid': cid,
    'data-dg-prop': 'direction',
  })}>`;
  html += `<option value="VERTICAL"${panelState.direction === 'VERTICAL' ? ' selected' : ''}>Vertical</option>`;
  html += `<option value="HORIZONTAL"${panelState.direction === 'HORIZONTAL' ? ' selected' : ''}>Horizontal</option>`;
  html += '</select></div>';

  html += '<div class="field"><span class="label">Gap bump</span>';
  html += `<input class="bf-input" type="number" step="8" value="${panelState.currentGapDelta}" style="width:64px;margin-left:4px"${renderPreviewDataAttrs({
    'data-dg-change-action': 'single-prop',
    'data-dg-cid': cid,
    'data-dg-prop': 'gap_delta',
    'data-dg-enter-commit': '1',
  })}>`;
  html += '<span class="label" style="margin-left:4px">px</span></div>';
  html += `<div class="hint">Effective gap ${panelState.effectiveGap}px = auto ${panelState.automaticGap}px + delta ${panelState.currentGapDelta}px. Set 0 to clear the manual bump.</div>`;
  html += '<div class="hint">Padding now derives from frame defaults: 8px for non-root frames, with annotation side padding collapsed to 0.</div>';

  return renderPreviewPanelGroup('layout', 'single-autolayout-layout', html, {
    className: 'dg-autolayout-section',
  });
}

function renderSingleSelectionAutolayoutSizingGroup(
  options: SingleSelectionAutolayoutPanelRenderOptions,
): string {
  const { cid, panelState } = options;
  let html = '<span class="label" style="margin-bottom:4px;display:block">Sizing</span>';

  html += '<div class="field"><span class="label">Width</span>';
  html += `<select class="bf-input${panelState.wCoerced ? ' dg-coerced' : ''}"${renderPreviewDataAttrs({
    'data-dg-change-action': 'single-prop',
    'data-dg-cid': cid,
    'data-dg-prop': 'sizing_w',
  })}>`;
  html += `<option value="HUG"${panelState.sizingW === 'HUG' ? ' selected' : ''}>Hug</option>`;
  html += `<option value="FILL"${panelState.sizingW === 'FILL' ? ' selected' : ''}>Fill</option>`;
  html += `<option value="FIXED"${panelState.sizingW === 'FIXED' ? ' selected' : ''}>${panelState.wCoerced ? 'Fixed (auto)' : 'Fixed'}</option>`;
  html += '</select>';

  if (panelState.showWidthFixedInput) {
    html += `<input class="bf-input" type="number" min="0" step="${options.widthFixedStep ?? 8}" value="${valueText(options.widthFixedValue)}" style="width:60px;margin-left:4px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'single-size',
      'data-dg-cid': cid,
      'data-dg-dimension': 'width',
      'data-dg-value-type': 'float',
      'data-dg-enter-commit': '1',
    })}>`;
    html += `<select class="bf-input" style="width:50px;margin-left:2px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'single-width-unit',
      'data-dg-cid': cid,
    })}>`;
    html += `<option value="px"${options.widthUnit !== 'cols' ? ' selected' : ''}>px</option>`;
    if (options.showWidthColsOption) {
      html += `<option value="cols"${options.widthUnit === 'cols' ? ' selected' : ''}>cols</option>`;
    }
    html += '</select>';
  }
  html += '</div>';

  if (panelState.showWidthMinMax) {
    html += '<div class="field dg-constraint-row"><span class="label">Min W</span>';
    html += `<input class="bf-input" type="number" min="0" step="8" value="${valueText(options.widthMinValue)}" placeholder="—" style="width:52px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'single-prop',
      'data-dg-cid': cid,
      'data-dg-prop': 'min_width',
      'data-dg-enter-commit': '1',
    })}>`;
    html += '<span class="label" style="margin-left:4px">Max W</span>';
    html += `<input class="bf-input" type="number" min="0" step="8" value="${valueText(options.widthMaxValue)}" placeholder="—" style="width:52px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'single-prop',
      'data-dg-cid': cid,
      'data-dg-prop': 'max_width',
      'data-dg-enter-commit': '1',
    })}>`;
    html += '</div>';
  }

  if (panelState.showWidthTextMeasure) {
    html += '<div class="field dg-constraint-row"><span class="label">Min W</span>';
    html += `<input class="bf-input" type="number" min="0" step="8" value="${valueText(options.widthMinValue)}" placeholder="—" style="width:52px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'single-prop',
      'data-dg-cid': cid,
      'data-dg-prop': 'min_width',
      'data-dg-enter-commit': '1',
    })}>`;
    html += '<span class="label" style="margin-left:4px">Max W</span>';
    html += `<input class="bf-input" type="number" min="0" step="8" value="${valueText(options.widthMaxValue)}" placeholder="—" style="width:52px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'single-prop',
      'data-dg-cid': cid,
      'data-dg-prop': 'max_width',
      'data-dg-enter-commit': '1',
    })}>`;
    html += '</div>';
    html += '<div class="field"><span class="label">Max chars</span>';
    html += `<input class="bf-input" type="number" min="0" step="1" value="${valueText(options.widthMaxCharsValue)}"`;
    if (options.widthMaxCharsDisabled) {
      html += ' disabled title="Clear Max W (px) to edit character measure"';
    }
    html += ` style="width:52px" title="0 = unbounded single line"${renderPreviewDataAttrs({
      'data-dg-change-action': 'single-prop',
      'data-dg-cid': cid,
      'data-dg-prop': 'max_width_chars',
      'data-dg-enter-commit': '1',
    })}>`;
    html += '<span class="label" style="margin-left:4px;font-size:11px;color:#666">0=off</span>';
    html += '</div>';
  }

  if (panelState.showWidthFillWeight) {
    html += '<div class="field"><span class="label">Weight</span>';
    html += `<input class="bf-input" type="number" min="0" step="0.5" value="${valueText(options.widthFillWeightValue)}" style="width:52px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'single-prop',
      'data-dg-cid': cid,
      'data-dg-prop': 'fill_weight',
      'data-dg-value-type': 'float',
      'data-dg-enter-commit': '1',
    })}>`;
    html += '</div>';
  }

  html += '<div class="field"><span class="label">Height</span>';
  html += `<select class="bf-input${panelState.hCoerced ? ' dg-coerced' : ''}"${renderPreviewDataAttrs({
    'data-dg-change-action': 'single-prop',
    'data-dg-cid': cid,
    'data-dg-prop': 'sizing_h',
  })}>`;
  html += `<option value="HUG"${panelState.sizingH === 'HUG' ? ' selected' : ''}>Hug</option>`;
  html += `<option value="FILL"${panelState.sizingH === 'FILL' ? ' selected' : ''}>Fill</option>`;
  html += `<option value="FIXED"${panelState.sizingH === 'FIXED' ? ' selected' : ''}>${panelState.hCoerced ? 'Fixed (auto)' : 'Fixed'}</option>`;
  html += '</select>';

  if (panelState.showHeightFixedInput) {
    html += `<input class="bf-input" type="number" min="0" step="${options.heightFixedStep ?? 8}" value="${valueText(options.heightFixedValue)}" style="width:60px;margin-left:4px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'single-size',
      'data-dg-cid': cid,
      'data-dg-dimension': 'height',
      'data-dg-value-type': 'float',
      'data-dg-enter-commit': '1',
    })}>`;
    html += `<select class="bf-input" style="width:50px;margin-left:2px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'single-height-unit',
      'data-dg-cid': cid,
    })}>`;
    html += `<option value="px"${options.heightUnit !== 'rows' ? ' selected' : ''}>px</option>`;
    html += `<option value="rows"${options.heightUnit === 'rows' ? ' selected' : ''}>rows</option>`;
    html += '</select>';
  }
  html += '</div>';

  if (panelState.showHeightMinMax) {
    html += '<div class="field dg-constraint-row"><span class="label">Min H</span>';
    html += `<input class="bf-input" type="number" min="0" step="8" value="${valueText(options.heightMinValue)}" placeholder="—" style="width:52px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'single-prop',
      'data-dg-cid': cid,
      'data-dg-prop': 'min_height',
      'data-dg-enter-commit': '1',
    })}>`;
    html += '<span class="label" style="margin-left:4px">Max</span>';
    html += `<input class="bf-input" type="number" min="0" step="8" value="${valueText(options.heightMaxValue)}" placeholder="—" style="width:52px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'single-prop',
      'data-dg-cid': cid,
      'data-dg-prop': 'max_height',
      'data-dg-enter-commit': '1',
    })}>`;
    html += '</div>';
  }

  return renderPreviewPanelGroup('sizing', 'single-autolayout-sizing', html, {
    className: 'dg-autolayout-section',
  });
}

function renderSingleSelectionAutolayoutPositionGroup(
  options: SingleSelectionAutolayoutPanelRenderOptions,
): string {
  const { cid, panelState } = options;
  if (!panelState.showPositionType) {
    return '';
  }

  let html = '<div class="field"><span class="label">Position</span>';
  html += `<select class="bf-input"${renderPreviewDataAttrs({
    'data-dg-change-action': 'single-prop',
    'data-dg-cid': cid,
    'data-dg-prop': 'position',
  })}>`;
  html += `<option value="AUTO"${panelState.positionType !== 'ABSOLUTE' ? ' selected' : ''}>Auto</option>`;
  html += `<option value="ABSOLUTE"${panelState.positionType === 'ABSOLUTE' ? ' selected' : ''}>Absolute</option>`;
  html += '</select></div>';
  if (panelState.showAbsoluteOffsetControls) {
    html += '<div class="field"><span class="label">Offset</span>';
    html += '<span style="color:#888;font-size:11px">X</span>';
    html += `<input class="bf-input" type="number" step="8" value="${valueText(options.positionXValue)}" style="width:52px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'single-prop',
      'data-dg-cid': cid,
      'data-dg-prop': 'x',
      'data-dg-value-type': 'int',
      'data-dg-enter-commit': '1',
    })}>`;
    html += '<span style="color:#888;font-size:11px;margin-left:4px">Y</span>';
    html += `<input class="bf-input" type="number" step="8" value="${valueText(options.positionYValue)}" style="width:52px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'single-prop',
      'data-dg-cid': cid,
      'data-dg-prop': 'y',
      'data-dg-value-type': 'int',
      'data-dg-enter-commit': '1',
    })}>`;
    html += '</div>';
  }

  return renderPreviewPanelGroup('position', 'single-autolayout-position', html, {
    className: 'dg-autolayout-section',
  });
}

export function renderSingleSelectionAutolayoutPanel(
  options: SingleSelectionAutolayoutPanelRenderOptions,
): string {
  return renderSingleSelectionAutolayoutLayoutGroup(options)
    + renderSingleSelectionAutolayoutSizingGroup(options)
    + renderSingleSelectionAutolayoutPositionGroup(options);
}
