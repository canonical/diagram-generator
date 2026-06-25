import type {
  MultiSelectionAlignState,
  MultiSelectionContainerState,
  MultiSelectionSizingState,
} from './inspector-multi.js';
import {
  renderPreviewDataAttrs,
  renderPreviewPanelGroup,
} from './inline-actions.js';

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
  TOP_LEFT: 'Top Left',
  TOP_CENTER: 'Top Center',
  TOP_RIGHT: 'Top Right',
  CENTER_LEFT: 'Center Left',
  CENTER: 'Center',
  CENTER_RIGHT: 'Center Right',
  BOTTOM_LEFT: 'Bottom Left',
  BOTTOM_CENTER: 'Bottom Center',
  BOTTOM_RIGHT: 'Bottom Right',
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
): string {
  let html = '<div class="dg-align-grid">';
  for (const point of ALIGN_POINTS) {
    const active = !mixed && point === activeAlign ? ' active' : '';
    html += `<button type="button" class="${active}" title="${ALIGN_LABELS[point]}"${renderPreviewDataAttrs({
      'data-dg-click-action': 'multi-align',
      'data-dg-align': point,
    })}></button>`;
  }
  html += '</div>';
  return html;
}

function renderAlignActionGrid(): string {
  return '<div class="multi-action-grid">'
    + `<button class="bf-button is-base" type="button"${renderPreviewDataAttrs({ 'data-dg-click-action': 'align-selection', 'data-dg-mode': 'left' })}>Align left</button>`
    + `<button class="bf-button is-base" type="button"${renderPreviewDataAttrs({ 'data-dg-click-action': 'align-selection', 'data-dg-mode': 'center' })}>Align center</button>`
    + `<button class="bf-button is-base" type="button"${renderPreviewDataAttrs({ 'data-dg-click-action': 'align-selection', 'data-dg-mode': 'right' })}>Align right</button>`
    + `<button class="bf-button is-base" type="button"${renderPreviewDataAttrs({ 'data-dg-click-action': 'align-selection', 'data-dg-mode': 'top' })}>Align top</button>`
    + `<button class="bf-button is-base" type="button"${renderPreviewDataAttrs({ 'data-dg-click-action': 'align-selection', 'data-dg-mode': 'middle' })}>Align middle</button>`
    + `<button class="bf-button is-base" type="button"${renderPreviewDataAttrs({ 'data-dg-click-action': 'align-selection', 'data-dg-mode': 'bottom' })}>Align bottom</button>`
    + '</div>';
}

function renderMultiSelectionSummaryGroup(
  options: MultiSelectionInspectorPanelRenderOptions,
): string {
  let html = '<div class="field"><span class="label">Selection</span><br>'
    + `<span class="value">${options.selectedCount} components</span></div>`;
  html += '<div class="hint">Shift+click adds to the selection. Drag still moves the group together.</div>';
  if (options.hasUnsupported) {
    html += '<div class="field"><div class="hint">Arrow selections are ignored by these actions.</div></div>';
  }

  return renderPreviewPanelGroup('selection', 'multi-selection', html);
}

function renderMultiSelectionArrangementGroup(
  options: MultiSelectionInspectorPanelRenderOptions,
): string {
  let html = '';
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
    html += `<input class="bf-input" type="number" id="multi-action-gap" min="0" step="8" value="${options.multiActionGap}"${renderPreviewDataAttrs({
      'data-dg-input-action': 'multi-gap',
      'data-dg-enter-commit': '1',
    })}>`;
    html += '<span class="unit">px</span>';
    html += '</div>';
    html += '<div class="multi-action-grid">';
    html += `<button class="bf-button" type="button"${renderPreviewDataAttrs({ 'data-dg-click-action': 'distribute-selection', 'data-dg-axis': 'x' })}>Distribute H</button>`;
    html += `<button class="bf-button" type="button"${renderPreviewDataAttrs({ 'data-dg-click-action': 'distribute-selection', 'data-dg-axis': 'y' })}>Distribute V</button>`;
    html += `<button class="bf-button is-base" type="button"${renderPreviewDataAttrs({ 'data-dg-click-action': 'align-selection', 'data-dg-mode': 'left' })}>Align left</button>`;
    html += `<button class="bf-button is-base" type="button"${renderPreviewDataAttrs({ 'data-dg-click-action': 'align-selection', 'data-dg-mode': 'center' })}>Align center</button>`;
    html += `<button class="bf-button is-base" type="button"${renderPreviewDataAttrs({ 'data-dg-click-action': 'align-selection', 'data-dg-mode': 'right' })}>Align right</button>`;
    html += `<button class="bf-button is-base" type="button"${renderPreviewDataAttrs({ 'data-dg-click-action': 'align-selection', 'data-dg-mode': 'top' })}>Align top</button>`;
    html += `<button class="bf-button is-base" type="button"${renderPreviewDataAttrs({ 'data-dg-click-action': 'align-selection', 'data-dg-mode': 'middle' })}>Align middle</button>`;
    html += `<button class="bf-button is-base" type="button"${renderPreviewDataAttrs({ 'data-dg-click-action': 'align-selection', 'data-dg-mode': 'bottom' })}>Align bottom</button>`;
    html += '</div></div>';
  }

  if (options.alignState) {
    html += '<div class="field"><span class="label">Alignment</span>';
    html += '<div class="dg-align-field">';
    html += renderAlignmentButtons(
      options.alignState.align,
      options.alignState.mixed,
    );
    html += `<span class="value">${options.alignState.mixed ? 'Mixed' : ALIGN_LABELS[options.alignState.align] ?? options.alignState.align}</span>`;
    html += '</div></div>';
  }

  html += '<p class="dg-selection-note">All actions snap to the 8px baseline and remain undoable.</p>';
  return renderPreviewPanelGroup('arrangement', 'multi-arrangement', html);
}

function renderMultiSelectionLayoutGroup(
  options: MultiSelectionInspectorPanelRenderOptions,
): string {
  if (options.containerState) {
    let html = `<span class="label" style="margin-bottom:4px;display:block">Auto-layout (${options.containerState.containerCount} containers)</span>`;
    html += '<div class="field"><span class="label">Direction</span>';
    html += `<select class="bf-input"${renderPreviewDataAttrs({
      'data-dg-change-action': 'multi-prop',
      'data-dg-prop': 'direction',
    })}>`;
    if (options.containerState.dirMixed) {
      html += '<option value="" selected>Mixed</option>';
    }
    html += `<option value="VERTICAL"${options.containerState.direction === 'VERTICAL' ? ' selected' : ''}>Vertical</option>`;
    html += `<option value="HORIZONTAL"${options.containerState.direction === 'HORIZONTAL' ? ' selected' : ''}>Horizontal</option>`;
    html += '</select></div>';
    if (options.containerState.direction === 'HORIZONTAL') {
      html += '<div class="field"><span class="label">Wrap</span>';
      html += `<input type="checkbox"${options.containerState.wrap ? ' checked' : ''}${renderPreviewDataAttrs({
        'data-dg-change-action': 'multi-prop',
        'data-dg-prop': 'wrap',
        'data-dg-value-type': 'checked',
      })}>`;
      html += '</div>';
    }
    html += '<div class="hint">Padding now derives from frame defaults: 8px for non-root frames, with annotation side padding collapsed to 0.</div>';
    return renderPreviewPanelGroup('layout', 'multi-layout', html, {
      className: 'dg-autolayout-section',
    });
  }

  return '';
}

function renderMultiSelectionSizingGroup(
  options: MultiSelectionInspectorPanelRenderOptions,
): string {
  if (!options.sizingState) {
    return '';
  }

  const widthUnit = options.widthUnit === 'cols' ? 'cols' : 'px';
  const heightUnit = options.heightUnit === 'rows' ? 'rows' : 'px';
  let html = '<span class="label" style="margin-bottom:4px;display:block">Sizing</span>';
  html += '<div class="field"><span class="label">Width</span>';
  html += `<select class="bf-input${options.sizingState.wCoerced ? ' dg-coerced' : ''}"${renderPreviewDataAttrs({
    'data-dg-change-action': 'multi-prop',
    'data-dg-prop': 'sizing_w',
  })}>`;
  if (options.sizingState.wMixed) {
    html += '<option value="" selected>Mixed</option>';
  }
  html += `<option value="HUG"${options.sizingState.sizingW === 'HUG' ? ' selected' : ''}>Hug</option>`;
  html += `<option value="FILL"${options.sizingState.sizingW === 'FILL' ? ' selected' : ''}>Fill</option>`;
  html += `<option value="FIXED"${options.sizingState.sizingW === 'FIXED' ? ' selected' : ''}>${options.sizingState.wCoerced ? 'Fixed (auto)' : 'Fixed'}</option>`;
  html += '</select>';
  if (options.sizingState.sizingW === 'FIXED' && !options.sizingState.wMixed) {
    html += `<input class="bf-input" type="number" min="0" step="${widthUnit === 'cols' ? 1 : 8}" value="" placeholder="${widthUnit}" style="width:60px;margin-left:4px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'multi-size',
      'data-dg-dimension': 'width',
      'data-dg-value-type': 'float',
      'data-dg-enter-commit': '1',
    })}>`;
    html += `<select class="bf-input" style="width:50px;margin-left:2px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'multi-width-unit',
    })}>`;
    html += `<option value="px"${widthUnit === 'px' ? ' selected' : ''}>px</option>`;
    if (options.showWidthColsOption) {
      html += `<option value="cols"${widthUnit === 'cols' ? ' selected' : ''}>cols</option>`;
    }
    html += '</select>';
  }
  html += '</div>';

  if (options.sizingState.sizingW === 'FILL' || options.sizingState.sizingW === 'FIXED') {
    html += '<div class="field dg-constraint-row"><span class="label">Min W</span>';
    html += `<input class="bf-input" type="number" min="0" step="8" value="" placeholder="—" style="width:52px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'multi-prop',
      'data-dg-prop': 'min_width',
      'data-dg-enter-commit': '1',
    })}>`;
    html += '<span class="label" style="margin-left:4px">Max W</span>';
    html += `<input class="bf-input" type="number" min="0" step="8" value="" placeholder="—" style="width:52px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'multi-prop',
      'data-dg-prop': 'max_width',
      'data-dg-enter-commit': '1',
    })}>`;
    html += '</div>';
  }

  if (options.sizingState.sizingW === 'FILL') {
    html += '<div class="field"><span class="label">Weight</span>';
    html += `<input class="bf-input" type="number" min="0" step="0.5" value="" placeholder="—" style="width:52px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'multi-prop',
      'data-dg-prop': 'fill_weight',
      'data-dg-value-type': 'float',
      'data-dg-enter-commit': '1',
    })}>`;
    html += '</div>';
  }

  html += '<div class="field"><span class="label">Height</span>';
  html += `<select class="bf-input${options.sizingState.hCoerced ? ' dg-coerced' : ''}"${renderPreviewDataAttrs({
    'data-dg-change-action': 'multi-prop',
    'data-dg-prop': 'sizing_h',
  })}>`;
  if (options.sizingState.hMixed) {
    html += '<option value="" selected>Mixed</option>';
  }
  html += `<option value="HUG"${options.sizingState.sizingH === 'HUG' ? ' selected' : ''}>Hug</option>`;
  html += `<option value="FILL"${options.sizingState.sizingH === 'FILL' ? ' selected' : ''}>Fill</option>`;
  html += `<option value="FIXED"${options.sizingState.sizingH === 'FIXED' ? ' selected' : ''}>${options.sizingState.hCoerced ? 'Fixed (auto)' : 'Fixed'}</option>`;
  html += '</select>';
  if (options.sizingState.sizingH === 'FIXED' && !options.sizingState.hMixed) {
    html += `<input class="bf-input" type="number" min="0" step="${heightUnit === 'rows' ? 1 : 8}" value="" placeholder="${heightUnit}" style="width:60px;margin-left:4px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'multi-size',
      'data-dg-dimension': 'height',
      'data-dg-value-type': 'float',
      'data-dg-enter-commit': '1',
    })}>`;
    html += `<select class="bf-input" style="width:50px;margin-left:2px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'multi-height-unit',
    })}>`;
    html += `<option value="px"${heightUnit === 'px' ? ' selected' : ''}>px</option>`;
    html += `<option value="rows"${heightUnit === 'rows' ? ' selected' : ''}>rows</option>`;
    html += '</select>';
  }
  html += '</div>';

  if (options.sizingState.sizingH === 'FILL' || options.sizingState.sizingH === 'FIXED') {
    html += '<div class="field dg-constraint-row"><span class="label">Min H</span>';
    html += `<input class="bf-input" type="number" min="0" step="8" value="" placeholder="—" style="width:52px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'multi-prop',
      'data-dg-prop': 'min_height',
      'data-dg-enter-commit': '1',
    })}>`;
    html += '<span class="label" style="margin-left:4px">Max H</span>';
    html += `<input class="bf-input" type="number" min="0" step="8" value="" placeholder="—" style="width:52px"${renderPreviewDataAttrs({
      'data-dg-change-action': 'multi-prop',
      'data-dg-prop': 'max_height',
      'data-dg-enter-commit': '1',
    })}>`;
    html += '</div>';
  }

  return renderPreviewPanelGroup('sizing', 'multi-sizing', html, {
    className: 'dg-autolayout-section',
  });
}

function renderMultiSelectionAppearanceGroup(
  options: MultiSelectionInspectorPanelRenderOptions,
): string {
  if (!options.styleState) {
    return '';
  }

  let html = `<div class="field" style="margin-top:6px"><span class="label">Style (${options.styleState.count} boxes)</span><br>`;
  html += `<select class="style-picker bf-input"${renderPreviewDataAttrs({
    'data-dg-change-action': 'multi-style',
  })}>`;
  if (options.styleState.mixed) {
    html += '<option value="__mixed__" selected>Mixed</option>';
  }
  html += options.styleOptionsHtml || '';
  html += '</select></div>';

  return renderPreviewPanelGroup('appearance', 'multi-appearance', html);
}

export function renderMultiSelectionInspectorPanel(
  options: MultiSelectionInspectorPanelRenderOptions,
): string {
  return renderMultiSelectionSummaryGroup(options)
    + renderMultiSelectionArrangementGroup(options)
    + renderMultiSelectionLayoutGroup(options)
    + renderMultiSelectionSizingGroup(options)
    + renderMultiSelectionAppearanceGroup(options);
}
