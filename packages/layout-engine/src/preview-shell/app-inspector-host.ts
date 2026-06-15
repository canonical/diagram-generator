/**
 * Preview inspector host helpers (spec 043 shell coordinator slice L).
 *
 * These helpers own the last single-selection inspector composition glue so
 * editor.js stays focused on DOM insertion and callback wiring.
 */

import type {
  SingleSelectionInspectorViolation,
} from './inspector-single-panel.js';
import {
  renderSingleSelectionInspectorPanel,
} from './inspector-single-panel.js';
import {
  resolveSingleSelectionInspectorPanelRenderOptions,
  type PreviewSingleSelectionInspectorNode,
} from './inspector-single-options.js';
import type { PreviewRenderedStyleFields } from './frame-style.js';
import {
  renderSingleSelectionAutolayoutPanel,
} from './inspector-autolayout-panel.js';
import {
  resolveSingleSelectionAutolayoutPanelOptions,
  type PreviewAutolayoutInspectorNode,
} from './inspector-autolayout-options.js';
import type { PreviewGridInfo } from './grid-resolution.js';
import type {
  InspectorDeltaState,
  InspectorEffectiveDeltaState,
} from './inspector-single.js';
import type { TextMeasureAdapter } from '../text-measure.js';

export interface PreviewInspectorArrowNode {
  waypoints?: unknown[] | null;
}

export type PreviewInspectorGridInfo =
  Pick<PreviewGridInfo, 'col_widths' | 'col_gap' | 'row_heights' | 'row_gap'>;

export interface RenderPreviewSingleSelectionInspectorOptions {
  cid: string;
  node?: (PreviewSingleSelectionInspectorNode & PreviewAutolayoutInspectorNode) | null;
  arrowNode?: PreviewInspectorArrowNode | null;
  override?: Record<string, unknown> | null;
  ownDelta: InspectorDeltaState;
  effectiveDelta: InspectorEffectiveDeltaState;
  componentType?: string | null;
  parentLayout?: string | null;
  renderedStyle?: PreviewRenderedStyleFields | null;
  violations?: SingleSelectionInspectorViolation[] | null;
  widthCoerced?: boolean;
  heightCoerced?: boolean;
  widthUnit?: 'px' | 'cols';
  heightUnit?: 'px' | 'rows';
  gridInfo?: PreviewInspectorGridInfo | null;
  baselineStep?: number;
  textAdapter?: TextMeasureAdapter | null;
  formatControlErrorMessage?: ((message: string) => string) | null;
  renderStyleOptions?: ((currentStyle: string, originalStyleName: string) => string) | null;
}

export function createPreviewMissingInspectorMarkup(cid: string): string {
  return '<p class="dg-empty-message bf-form-help">Component <strong>'
    + cid
    + '</strong> not found. Try reloading the preview.</p>';
}

export function normalizePreviewInspectorWidthUnit(
  unit: 'px' | 'cols' | string | null | undefined,
  gridInfo?: PreviewInspectorGridInfo | null,
): 'px' | 'cols' {
  if (unit === 'cols' && gridInfo?.col_widths?.length) {
    return 'cols';
  }
  return 'px';
}

export function resolvePreviewAutolayoutPanelHtml(
  options: RenderPreviewSingleSelectionInspectorOptions,
): string {
  if (!options.node) {
    return '';
  }
  const panelOptions = resolveSingleSelectionAutolayoutPanelOptions({
    cid: options.cid,
    node: options.node,
    override: options.override ?? {},
    widthCoerced: Boolean(options.widthCoerced),
    heightCoerced: Boolean(options.heightCoerced),
    widthUnit: options.widthUnit === 'cols' ? 'cols' : 'px',
    heightUnit: options.heightUnit === 'rows' ? 'rows' : 'px',
    gridInfo: options.gridInfo ?? null,
    baselineStep: options.baselineStep ?? 8,
    textAdapter: options.textAdapter ?? null,
  });
  return panelOptions
    ? renderSingleSelectionAutolayoutPanel(panelOptions)
    : '';
}

export function renderPreviewSingleSelectionInspector(
  options: RenderPreviewSingleSelectionInspectorOptions,
): string {
  if (!options.node && !options.arrowNode) {
    return createPreviewMissingInspectorMarkup(options.cid);
  }

  const panelOptions = resolveSingleSelectionInspectorPanelRenderOptions({
    cid: options.cid,
    node: options.node,
    override: options.override ?? {},
    ownDelta: options.ownDelta,
    effectiveDelta: options.effectiveDelta,
    hasWaypointOverride: Boolean((options.override ?? {}).waypoints),
    waypointCount: options.arrowNode?.waypoints?.length ?? 0,
    componentType: options.componentType,
    parentLayout: options.parentLayout,
    renderedStyle: options.renderedStyle,
    violations: options.violations,
    renderAutolayoutPanel: () => resolvePreviewAutolayoutPanelHtml(options),
    formatControlErrorMessage: options.formatControlErrorMessage ?? null,
    renderStyleOptions: options.renderStyleOptions ?? null,
  });
  return renderSingleSelectionInspectorPanel(panelOptions);
}
