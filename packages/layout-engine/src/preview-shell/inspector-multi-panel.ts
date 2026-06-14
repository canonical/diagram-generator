import type {
  MultiSelectionAlignState,
  MultiSelectionContainerState,
  MultiSelectionSizingState,
} from './inspector-multi.js';

/**
 * Multi-selection inspector renderer (spec 043 slice L).
 *
 * The shell still computes selection facts and action handlers, but the large
 * HTML assembly block now lives in a typed browser helper.
 */

const ALIGN_POINTS = [
  'TOP_LEFT',
  'TOP_CENTER',
  'TOP_RIGHT',
  'CENTER_LEFT',
  'CENTER',
  'CENTER_RIGHT',
  'BOTTOM_LEFT',
  'BOTTOM_CENTER',
  'BOTTOM_RIGHT',
] as const;

const ALIGN_LABELS: Record<string, string> = {
  TOP_LEFT: 'Top-left',
  TOP_CENTER: 'Top-center',
  TOP_RIGHT: 'Top-right',
  CENTER_LEFT: 'Center-left',
  CENTER: 'Center',
  CENTER_RIGHT: 'Center-right',
  BOTTOM_LEFT: 'Bottom-left',
  BOTTOM_CENTER: 'Bottom-center',
  BOTTOM_RIGHT: 'Bottom-right',
};

export interface MultiSelectionStyleState {
  count: number;
  mixed: boolean;
  style: string;
}

export interface MultiSelectionInspectorPanelRenderOptions {
  selectedCount: number;
  multiActionGap: number;
  showStackSpacingHint: boolean;
  showAlignOnlyHint: boolean;
  hasUnsupported: boolean;
  alignState?: MultiSelectionAlignState | null;
  containerState?: MultiSelectionContainerState | null;
  sizingState?: MultiSelectionSizingState | null;
  styleState?: MultiSelectionStyleState | null;
  widthUnit?: 'px' | 'cols';
  heightUnit?: 'px' | 'rows';
  showWidthColsOption?: boolean;
  styleOptionsHtml?: string;
}

function renderAlignmentButtons(
  activeAlign: string,
  mixed: boolean,
  onClickPrefix: string,
): string {
  let html = '<div class="dg-align-grid">';
  for (const point of ALIGN_POINTS) {
    const active = !mixed && point === activeAlign ? ' active' : '';
    html += `<button class="${active}" title="${ALIGN_LABELS[point]}" onclick="${onClickPrefix}('${point}')"></button>`;
  }
  html += '</div>';
  return html;
}

function renderAlignActionGrid(): string {
  return '<div class="multi-action-grid">'
    + '<button class="bf-button is-base" type="button" onclick="alignSelection(\'left\')">Align left</button>'
    + '<button class="bf-button is-base" type="button" onclick="alignSelection(\'center\')">Align center</button>'
    + '<button class="bf-button is-base" type="button" onclick="alignSelection(\'right\')">Align right</button>'
    + '<button class="bf-button is-base" type="button" onclick="alignSelection(\'top\')">Align top</button>'
    + '<button class="bf-button is-base" type="button" onclick="alignSelection(\'middle\')">Align middle</button>'
    + '<button class="bf-button is-base" type="button" onclick="alignSelection(\'bottom\')">Align bottom</button>'
    + '</div>';
}

export function renderMultiSelectionInspectorPanel(
  options: MultiSelectionInspectorPanelRenderOptions,
): string {
  const widthUnit = options.widthUnit === 'cols' ? 'cols' : 'px';
  const heightUnit = options.heightUnit === 'rows' ? 'rows' : 'px';
  let html = '<div class="field"><span class="label">Selection</span><br>'
    + `<span class="value">${options.selectedCount} components</span></div>`;
  html += '<div class="hint">Shift+click adds to the selection. Drag still moves the group together.</div>';

  if (options.showStackSpacingHint) {
    html += '<div class="dg-autolayout-section" style="margin-top:8px">';
    html += '<span class="label" style="margin-bottom:4px;display:block">Stack spacing</span>';
    html += '<div class="hint">Frame gap now derives from composition. Use distribute for arrangement, or edit YAML only for true structural exceptions.</div>';
    html += '</div>';
  }

  if (options.showAlignOnlyHint) {
    html += '<div class="field" style="margin-top:8px"><span class="label">Actions</span><br>';
    html += '<div class="hint">Distribute is limited to sibling components under the same parent. Align still works across the current selection.</div>';
    html += renderAlignActionGrid();
    html += '</div>';
  } else {
    html += '<div class="field" style="margin-top:8px"><span class="label">Distribute</span>';
    html += '<div class="multi-action-row">';
    html += '<span class="value">Gap</span>';
    html += `<input class="bf-input" type="number" id="multi-action-gap" min="0" step="8" value="${options.multiActionGap}" oninput="setMultiActionGap(this.value)">`;
    html += '<span class="unit">px</span>';
    html += '</div>';
    html += '<div class="multi-action-grid">';
    html += '<button class="bf-button" type="button" onclick="distributeSelection(\'x\')">Distribute H</button>';
    html += '<button class="bf-button" type="button" onclick="distributeSelection(\'y\')">Distribute V</button>';
    html += '<button class="bf-button is-base" type="button" onclick="alignSelection(\'left\')">Align left</button>';
    html += '<button class="bf-button is-base" type="button" onclick="alignSelection(\'center\')">Align center</button>';
    html += '<button class="bf-button is-base" type="button" onclick="alignSelection(\'right\')">Align right</button>';
    html += '<button class="bf-button is-base" type="button" onclick="alignSelection(\'top\')">Align top</button>';
    html += '<button class="bf-button is-base" type="button" onclick="alignSelection(\'middle\')">Align middle</button>';
    html += '<button class="bf-button is-base" type="button" onclick="alignSelection(\'bottom\')">Align bottom</button>';
    html += '</div></div>';
  }

  if (options.hasUnsupported) {
    html += '<div class="field"><div class="hint">Arrow selections are ignored by these actions.</div></div>';
  }

  if (options.alignState) {
    html += '<div class="field"><span class="label">Alignment</span>';
    html += '<div class="dg-align-field">';
    html += renderAlignmentButtons(
      options.alignState.align,
      options.alignState.mixed,
      'setMultiFrameAlign',
    );
    html += `<span class="value">${options.alignState.mixed ? 'Mixed' : ALIGN_LABELS[options.alignState.align] ?? options.alignState.align}</span>`;
    html += '</div></div>';
  }

  if (options.containerState) {
    html += '<div class="dg-autolayout-section" style="margin-top:8px">';
    html += `<span class="label" style="margin-bottom:4px;display:block">Auto-layout (${options.containerState.containerCount} containers)</span>`;
    html += '<div class="field"><span class="label">Direction</span>';
    html += '<select class="bf-input" onchange="setMultiFrameProp(\'direction\',this.value)">';
    if (options.containerState.dirMixed) {
      html += '<option value="" selected>Mixed</option>';
    }
    html += `<option value="VERTICAL"${options.containerState.direction === 'VERTICAL' ? ' selected' : ''}>Vertical</option>`;
    html += `<option value="HORIZONTAL"${options.containerState.direction === 'HORIZONTAL' ? ' selected' : ''}>Horizontal</option>`;
    html += '</select></div>';
    if (options.containerState.direction === 'HORIZONTAL') {
      html += '<div class="field"><span class="label">Wrap</span>';
      html += `<input type="checkbox"${options.containerState.wrap ? ' checked' : ''} onchange="setMultiFrameProp('wrap',this.checked)">`;
      html += '</div>';
    }
    html += '<div class="hint">Padding now derives from frame defaults: 8px for non-root frames, with annotation side padding collapsed to 0.</div>';
    html += '</div>';
  }

  if (options.sizingState) {
    html += '<div class="dg-autolayout-section" style="margin-top:8px">';
    html += '<span class="label" style="margin-bottom:4px;display:block">Sizing</span>';
    html += '<div class="field"><span class="label">Width</span>';
    html += `<select class="bf-input${options.sizingState.wCoerced ? ' dg-coerced' : ''}" onchange="setMultiFrameProp('sizing_w',this.value)">`;
    if (options.sizingState.wMixed) {
      html += '<option value="" selected>Mixed</option>';
    }
    html += `<option value="HUG"${options.sizingState.sizingW === 'HUG' ? ' selected' : ''}>Hug</option>`;
    html += `<option value="FILL"${options.sizingState.sizingW === 'FILL' ? ' selected' : ''}>Fill</option>`;
    html += `<option value="FIXED"${options.sizingState.sizingW === 'FIXED' ? ' selected' : ''}>${options.sizingState.wCoerced ? 'Fixed (auto)' : 'Fixed'}</option>`;
    html += '</select>';
    if (options.sizingState.sizingW === 'FIXED' && !options.sizingState.wMixed) {
      html += `<input class="bf-input" type="number" min="0" step="${widthUnit === 'cols' ? 1 : 8}" value=""`;
      html += ` placeholder="${widthUnit}"`;
      html += ' onchange="setMultiFrameSize(\'width\',parseFloat(this.value))"';
      html += ' style="width:60px;margin-left:4px">';
      html += '<select class="bf-input" style="width:50px;margin-left:2px" onchange="setWidthUnit(this.value)">';
      html += `<option value="px"${widthUnit === 'px' ? ' selected' : ''}>px</option>`;
      if (options.showWidthColsOption) {
        html += `<option value="cols"${widthUnit === 'cols' ? ' selected' : ''}>cols</option>`;
      }
      html += '</select>';
    }
    html += '</div>';

    if (options.sizingState.sizingW === 'FILL' || options.sizingState.sizingW === 'FIXED') {
      html += '<div class="field dg-constraint-row"><span class="label">Min W</span>';
      html += '<input class="bf-input" type="number" min="0" step="8" value=""';
      html += ' placeholder="—"';
      html += ' onchange="setMultiFrameProp(\'min_width\',this.value)"';
      html += ' style="width:52px">';
      html += '<span class="label" style="margin-left:4px">Max W</span>';
      html += '<input class="bf-input" type="number" min="0" step="8" value=""';
      html += ' placeholder="—"';
      html += ' onchange="setMultiFrameProp(\'max_width\',this.value)"';
      html += ' style="width:52px">';
      html += '</div>';
    }

    if (options.sizingState.sizingW === 'FILL') {
      html += '<div class="field"><span class="label">Weight</span>';
      html += '<input class="bf-input" type="number" min="0" step="0.5" value=""';
      html += ' placeholder="—"';
      html += ' onchange="setMultiFrameProp(\'fill_weight\',parseFloat(this.value))"';
      html += ' style="width:52px">';
      html += '</div>';
    }

    html += '<div class="field"><span class="label">Height</span>';
    html += `<select class="bf-input${options.sizingState.hCoerced ? ' dg-coerced' : ''}" onchange="setMultiFrameProp('sizing_h',this.value)">`;
    if (options.sizingState.hMixed) {
      html += '<option value="" selected>Mixed</option>';
    }
    html += `<option value="HUG"${options.sizingState.sizingH === 'HUG' ? ' selected' : ''}>Hug</option>`;
    html += `<option value="FILL"${options.sizingState.sizingH === 'FILL' ? ' selected' : ''}>Fill</option>`;
    html += `<option value="FIXED"${options.sizingState.sizingH === 'FIXED' ? ' selected' : ''}>${options.sizingState.hCoerced ? 'Fixed (auto)' : 'Fixed'}</option>`;
    html += '</select>';
    if (options.sizingState.sizingH === 'FIXED' && !options.sizingState.hMixed) {
      html += `<input class="bf-input" type="number" min="0" step="${heightUnit === 'rows' ? 1 : 8}" value=""`;
      html += ` placeholder="${heightUnit}"`;
      html += ' onchange="setMultiFrameSize(\'height\',parseFloat(this.value))"';
      html += ' style="width:60px;margin-left:4px">';
      html += '<select class="bf-input" style="width:50px;margin-left:2px" onchange="setHeightUnit(this.value)">';
      html += `<option value="px"${heightUnit === 'px' ? ' selected' : ''}>px</option>`;
      html += `<option value="rows"${heightUnit === 'rows' ? ' selected' : ''}>rows</option>`;
      html += '</select>';
    }
    html += '</div>';

    if (options.sizingState.sizingH === 'FILL' || options.sizingState.sizingH === 'FIXED') {
      html += '<div class="field dg-constraint-row"><span class="label">Min H</span>';
      html += '<input class="bf-input" type="number" min="0" step="8" value=""';
      html += ' placeholder="—"';
      html += ' onchange="setMultiFrameProp(\'min_height\',this.value)"';
      html += ' style="width:52px">';
      html += '<span class="label" style="margin-left:4px">Max H</span>';
      html += '<input class="bf-input" type="number" min="0" step="8" value=""';
      html += ' placeholder="—"';
      html += ' onchange="setMultiFrameProp(\'max_height\',this.value)"';
      html += ' style="width:52px">';
      html += '</div>';
    }

    html += '</div>';
  }

  if (options.styleState) {
    html += `<div class="field" style="margin-top:6px"><span class="label">Style (${options.styleState.count} boxes)</span><br>`;
    html += '<select class="style-picker bf-input" onchange="applyMultiStyleOverride(this.value)">';
    if (options.styleState.mixed) {
      html += '<option value="__mixed__" selected>Mixed</option>';
    }
    html += options.styleOptionsHtml || '';
    html += '</select></div>';
  }

  html += '<p class="dg-selection-note">All actions snap to the 8px baseline and remain undoable.</p>';
  return html;
}
