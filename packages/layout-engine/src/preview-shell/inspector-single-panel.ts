import type {
  InspectorDeltaState,
  InspectorEffectiveDeltaState,
  SingleSelectionInspectorViewModel,
} from './inspector-single.js';
import {
  escapePreviewHtml,
  renderPreviewDataAttrs,
  renderPreviewPanelGroup,
} from './inline-actions.js';

/**
 * Single-selection inspector renderer (spec 043 slice M).
 *
 * The shell still computes runtime values and style options, but the main
 * HTML assembly now lives in a typed browser helper.
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

export interface SingleSelectionInspectorViolation {
  message: string;
  severity?: string | null;
}

export interface SingleSelectionInspectorPanelRenderOptions {
  cid: string;
  viewModel: SingleSelectionInspectorViewModel;
  ownDelta: InspectorDeltaState;
  effectiveDelta: InspectorEffectiveDeltaState;
  autolayoutPanelHtml?: string;
  controlsErrorMessage?: string | null;
  styleMode?: 'picker' | 'structural' | 'none';
  styleOptionsHtml?: string;
  violations?: SingleSelectionInspectorViolation[];
}

function renderAlignWidget(cid: string, currentAlign: string): string {
  let html = '<div class="field"><span class="label">Alignment</span>';
  html += '<div class="dg-align-field">';
  html += '<div class="dg-align-grid">';
  for (const point of ALIGN_POINTS) {
    const active = point === currentAlign ? ' active' : '';
    html += `<button type="button" class="${active}" title="${ALIGN_LABELS[point]}"${renderPreviewDataAttrs({
      'data-dg-click-action': 'single-align',
      'data-dg-cid': cid,
      'data-dg-align': point,
    })}></button>`;
  }
  html += '</div>';
  html += `<span class="value">${ALIGN_LABELS[currentAlign] ?? currentAlign}</span>`;
  html += '</div></div>';
  return html;
}

function renderSingleSelectionLayoutGroup(
  options: SingleSelectionInspectorPanelRenderOptions,
): string {
  if (options.controlsErrorMessage) {
    return renderPreviewPanelGroup(
      'diagnostics',
      'single-controls-error',
      '<p class="bf-form-help" style="color:#c66">Inspector controls failed: '
        + escapePreviewHtml(options.controlsErrorMessage)
        + '</p>',
    );
  }

  return renderPreviewPanelGroup(
    'layout',
    'single-layout',
    renderAlignWidget(options.cid, options.viewModel.currentAlign),
  ) + (options.autolayoutPanelHtml || '');
}

function renderSingleSelectionPositionGroup(
  options: SingleSelectionInspectorPanelRenderOptions,
): string {
  let html = '';
  if (options.viewModel.hasMoveOverride) {
    html += '<div class="field"><span class="label">Position override</span><br>'
      + `<span class="value override">dx=${options.ownDelta.dx}  dy=${options.ownDelta.dy}</span></div>`;
  }
  if (options.viewModel.hasSizeOverride) {
    html += '<div class="field"><span class="label">Size override</span><br>'
      + `<span class="value override">dw=${options.ownDelta.dw}  dh=${options.ownDelta.dh}</span></div>`;
  }
  if (options.viewModel.hasParentOverride) {
    html += '<div class="field"><span class="label">Effective (incl. parents)</span><br>'
      + `<span class="value override">dx=${options.effectiveDelta.dx}  dy=${options.effectiveDelta.dy}</span></div>`;
  }
  if (options.viewModel.isArrowComponent) {
    html += '<div class="field"><span class="label">Waypoints</span><br>';
    html += `<span class="value${options.viewModel.hasWaypointOverride ? ' override' : ''}">${options.viewModel.waypointCount}`;
    if (options.viewModel.hasWaypointOverride) {
      html += ' (overridden)';
    }
    html += '</span></div>';
  }
  if (options.viewModel.hasAnyOverride) {
    html += `<button class="bf-button is-base danger" type="button"${renderPreviewDataAttrs({
      'data-dg-click-action': 'clear-override',
      'data-dg-cid': options.cid,
    })}>Clear override</button>`;
  }

  return renderPreviewPanelGroup('position', 'single-position', html);
}

function renderSingleSelectionAppearanceGroup(
  options: SingleSelectionInspectorPanelRenderOptions,
): string {
  let html = '';
  if (options.styleMode === 'picker') {
    html += '<div class="field" style="margin-top:6px"><span class="label">Style</span><br>';
    html += `<select class="style-picker bf-input"${renderPreviewDataAttrs({
      'data-dg-change-action': 'single-style',
      'data-dg-cid': options.cid,
    })}>`;
    html += options.styleOptionsHtml || '';
    html += '</select></div>';
  } else if (options.styleMode === 'structural') {
    html += '<div class="field" style="margin-top:6px"><span class="label">Style</span><div class="hint">Structural wrapper — no box style or default panel padding.</div></div>';
  }

  return renderPreviewPanelGroup('appearance', 'single-appearance', html);
}

function renderSingleSelectionDiagnosticsGroup(
  options: SingleSelectionInspectorPanelRenderOptions,
): string {
  let html = '';
  if (options.viewModel.showStackSpacingHint) {
    html += '<div class="dg-autolayout-section" style="margin-top:8px">';
    html += '<span class="label" style="margin-bottom:4px;display:block">Stack spacing</span>';
    html += '<div class="hint">Frame gap now derives from composition. Use distribute for arrangement, or edit YAML only for true structural exceptions.</div>';
    html += '</div>';
  }

  const violations = options.violations ?? [];
  if (violations.length > 0) {
    html += '<div style="margin-top:8px"><span class="label">Violations</span>';
    for (const violation of violations) {
      const color = violation.severity === 'error' ? '#c66' : '#cc6';
      html += `<div style="font-size:11px;color:${color}">&#x26a0; ${escapePreviewHtml(violation.message)}</div>`;
    }
    html += '</div>';
  }

  if (options.viewModel.noteKind === 'reorder-child') {
    html += '<p class="dg-inspector-note">Drag to reorder &#xb7; Shift+Enter to select parent &#xb7; W to toggle grid overlay.</p>';
  } else {
    html += '<p class="dg-inspector-note">Drag to move &#xb7; handles to resize (8px grid) &#xb7; W to toggle grid overlay.</p>';
  }

  return renderPreviewPanelGroup('diagnostics', 'single-diagnostics', html);
}

export function renderSingleSelectionInspectorPanel(
  options: SingleSelectionInspectorPanelRenderOptions,
): string {
  return renderSingleSelectionLayoutGroup(options)
    + renderSingleSelectionPositionGroup(options)
    + renderSingleSelectionAppearanceGroup(options)
    + renderSingleSelectionDiagnosticsGroup(options);
}
