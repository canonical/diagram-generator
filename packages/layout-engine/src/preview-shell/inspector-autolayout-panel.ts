import type { SingleSelectionAutolayoutState } from './inspector-single.js';

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

export function renderSingleSelectionAutolayoutPanel(
  options: SingleSelectionAutolayoutPanelRenderOptions,
): string {
  const { cid, panelState } = options;
  let html = '<div class="dg-autolayout-section">';

  if (panelState.isContainer) {
    html += `<span class="label" style="margin-bottom:4px;display:block">Auto-layout · ${cid}</span>`;
    html += '<div class="field"><span class="label">Direction</span>';
    html += `<select class="bf-input" onchange="setFrameProp('${cid}','direction',this.value)">`;
    html += `<option value="VERTICAL"${panelState.direction === 'VERTICAL' ? ' selected' : ''}>Vertical</option>`;
    html += `<option value="HORIZONTAL"${panelState.direction === 'HORIZONTAL' ? ' selected' : ''}>Horizontal</option>`;
    html += '</select></div>';

    html += '<div class="field"><span class="label">Gap bump</span>';
    html += `<input class="bf-input" type="number" step="8" value="${panelState.currentGapDelta}"`;
    html += ` onchange="setFrameProp('${cid}','gap_delta',this.value)"`;
    html += ` onkeydown="if(event.key==='Enter'){event.preventDefault();event.stopPropagation();this.blur();}"`;
    html += ' style="width:64px;margin-left:4px">';
    html += '<span class="label" style="margin-left:4px">px</span></div>';
    html += `<div class="hint">Effective gap ${panelState.effectiveGap}px = auto ${panelState.automaticGap}px + delta ${panelState.currentGapDelta}px. Set 0 to clear the manual bump.</div>`;
    html += '<div class="hint">Padding now derives from frame defaults: 8px for non-root frames, with annotation side padding collapsed to 0.</div>';
  } else {
    html += '<span class="label" style="margin-bottom:4px;display:block">Sizing</span>';
  }

  html += '<div class="field"><span class="label">Width</span>';
  html += `<select class="bf-input${panelState.wCoerced ? ' dg-coerced' : ''}" onchange="setFrameProp('${cid}','sizing_w',this.value)">`;
  html += `<option value="HUG"${panelState.sizingW === 'HUG' ? ' selected' : ''}>Hug</option>`;
  html += `<option value="FILL"${panelState.sizingW === 'FILL' ? ' selected' : ''}>Fill</option>`;
  html += `<option value="FIXED"${panelState.sizingW === 'FIXED' ? ' selected' : ''}>${panelState.wCoerced ? 'Fixed (auto)' : 'Fixed'}</option>`;
  html += '</select>';

  if (panelState.showWidthFixedInput) {
    html += `<input class="bf-input" type="number" min="0" step="${options.widthFixedStep ?? 8}" value="${valueText(options.widthFixedValue)}"`;
    html += ` onchange="setFrameSize('${cid}','width',parseFloat(this.value))"`;
    html += ' style="width:60px;margin-left:4px">';
    html += `<select class="bf-input" style="width:50px;margin-left:2px" onchange="setWidthUnit(this.value,'${cid}')">`;
    html += `<option value="px"${options.widthUnit !== 'cols' ? ' selected' : ''}>px</option>`;
    if (options.showWidthColsOption) {
      html += `<option value="cols"${options.widthUnit === 'cols' ? ' selected' : ''}>cols</option>`;
    }
    html += '</select>';
  }
  html += '</div>';

  if (panelState.showWidthMinMax) {
    html += '<div class="field dg-constraint-row"><span class="label">Min W</span>';
    html += `<input class="bf-input" type="number" min="0" step="8" value="${valueText(options.widthMinValue)}"`;
    html += ' placeholder="—"';
    html += ` onchange="setFrameProp('${cid}','min_width',this.value)"`;
    html += ' style="width:52px">';
    html += '<span class="label" style="margin-left:4px">Max W</span>';
    html += `<input class="bf-input" type="number" min="0" step="8" value="${valueText(options.widthMaxValue)}"`;
    html += ' placeholder="—"';
    html += ` onchange="setFrameProp('${cid}','max_width',this.value)"`;
    html += ' style="width:52px">';
    html += '</div>';
  }

  if (panelState.showWidthTextMeasure) {
    html += '<div class="field dg-constraint-row"><span class="label">Min W</span>';
    html += `<input class="bf-input" type="number" min="0" step="8" value="${valueText(options.widthMinValue)}"`;
    html += ' placeholder="—"';
    html += ` onchange="setFrameProp('${cid}','min_width',this.value)"`;
    html += ' style="width:52px">';
    html += '<span class="label" style="margin-left:4px">Max W</span>';
    html += `<input class="bf-input" type="number" min="0" step="8" value="${valueText(options.widthMaxValue)}"`;
    html += ' placeholder="—"';
    html += ` onchange="setFrameProp('${cid}','max_width',this.value)"`;
    html += ' style="width:52px">';
    html += '</div>';
    html += '<div class="field"><span class="label">Max chars</span>';
    html += `<input class="bf-input" type="number" min="0" step="1" value="${valueText(options.widthMaxCharsValue)}"`;
    if (options.widthMaxCharsDisabled) {
      html += ' disabled title="Clear Max W (px) to edit character measure"';
    }
    html += ` onchange="setFrameProp('${cid}','max_width_chars',this.value)"`;
    html += ' style="width:52px" title="0 = unbounded single line">';
    html += '<span class="label" style="margin-left:4px;font-size:11px;color:#666">0=off</span>';
    html += '</div>';
  }

  if (panelState.showWidthFillWeight) {
    html += '<div class="field"><span class="label">Weight</span>';
    html += `<input class="bf-input" type="number" min="0" step="0.5" value="${valueText(options.widthFillWeightValue)}"`;
    html += ` onchange="setFrameProp('${cid}','fill_weight',parseFloat(this.value))"`;
    html += ' style="width:52px">';
    html += '</div>';
  }

  html += '<div class="field"><span class="label">Height</span>';
  html += `<select class="bf-input${panelState.hCoerced ? ' dg-coerced' : ''}" onchange="setFrameProp('${cid}','sizing_h',this.value)">`;
  html += `<option value="HUG"${panelState.sizingH === 'HUG' ? ' selected' : ''}>Hug</option>`;
  html += `<option value="FILL"${panelState.sizingH === 'FILL' ? ' selected' : ''}>Fill</option>`;
  html += `<option value="FIXED"${panelState.sizingH === 'FIXED' ? ' selected' : ''}>${panelState.hCoerced ? 'Fixed (auto)' : 'Fixed'}</option>`;
  html += '</select>';

  if (panelState.showHeightFixedInput) {
    html += `<input class="bf-input" type="number" min="0" step="${options.heightFixedStep ?? 8}" value="${valueText(options.heightFixedValue)}"`;
    html += ` onchange="setFrameSize('${cid}','height',parseFloat(this.value))"`;
    html += ' style="width:60px;margin-left:4px">';
    html += `<select class="bf-input" style="width:50px;margin-left:2px" onchange="setHeightUnit(this.value,'${cid}')">`;
    html += `<option value="px"${options.heightUnit !== 'rows' ? ' selected' : ''}>px</option>`;
    html += `<option value="rows"${options.heightUnit === 'rows' ? ' selected' : ''}>rows</option>`;
    html += '</select>';
  }
  html += '</div>';

  if (panelState.showHeightMinMax) {
    html += '<div class="field dg-constraint-row"><span class="label">Min H</span>';
    html += `<input class="bf-input" type="number" min="0" step="8" value="${valueText(options.heightMinValue)}"`;
    html += ' placeholder="—"';
    html += ` onchange="setFrameProp('${cid}','min_height',this.value)"`;
    html += ' style="width:52px">';
    html += '<span class="label" style="margin-left:4px">Max</span>';
    html += `<input class="bf-input" type="number" min="0" step="8" value="${valueText(options.heightMaxValue)}"`;
    html += ' placeholder="—"';
    html += ` onchange="setFrameProp('${cid}','max_height',this.value)"`;
    html += ' style="width:52px">';
    html += '</div>';
  }

  if (panelState.showPositionType) {
    html += '<div class="field"><span class="label">Position</span>';
    html += `<select class="bf-input" onchange="setFrameProp('${cid}','position',this.value)">`;
    html += `<option value="AUTO"${panelState.positionType !== 'ABSOLUTE' ? ' selected' : ''}>Auto</option>`;
    html += `<option value="ABSOLUTE"${panelState.positionType === 'ABSOLUTE' ? ' selected' : ''}>Absolute</option>`;
    html += '</select></div>';
    if (panelState.showAbsoluteOffsetControls) {
      html += '<div class="field"><span class="label">Offset</span>';
      html += '<span style="color:#888;font-size:11px">X</span>';
      html += `<input class="bf-input" type="number" step="8" value="${valueText(options.positionXValue)}"`;
      html += ` onchange="setFrameProp('${cid}','x',parseInt(this.value))"`;
      html += ' style="width:52px">';
      html += '<span style="color:#888;font-size:11px;margin-left:4px">Y</span>';
      html += `<input class="bf-input" type="number" step="8" value="${valueText(options.positionYValue)}"`;
      html += ` onchange="setFrameProp('${cid}','y',parseInt(this.value))"`;
      html += ' style="width:52px">';
      html += '</div>';
    }
  }

  html += '</div>';
  return html;
}
