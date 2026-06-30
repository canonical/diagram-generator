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
  renderMultiSelectionInspectorPanel,
  type MultiSelectionInspectorPanelRenderOptions,
  type MultiSelectionStyleState,
} from './inspector-multi-panel.js';
import {
  renderSingleSelectionInspectorPanel,
} from './inspector-single-panel.js';
import {
  resolveSingleSelectionInspectorPanelRenderOptions,
  type PreviewSingleSelectionInspectorNode,
} from './inspector-single-options.js';
import type {
  MultiSelectionPreviewStyleState,
  PreviewRenderedStyleFields,
} from './frame-style.js';
import {
  renderSingleSelectionAutolayoutPanel,
} from './inspector-autolayout-panel.js';
import {
  resolveSingleSelectionAutolayoutPanelOptions,
  type PreviewAutolayoutInspectorNode,
} from './inspector-autolayout-options.js';
import {
  resolveMultiSelectionInspectorState,
  type MultiSelectionInspectorRuntimeItem,
} from './inspector-multi-options.js';
import type {
  InspectorSelectionParentLayout,
  SelectionActionInfo,
} from './inspector-selection.js';
import type { PreviewGridInfo } from './grid-resolution.js';
import type {
  InspectorDeltaState,
  InspectorEffectiveDeltaState,
} from './inspector-single.js';
import type { TextMeasureAdapter } from '../text-measure.js';
import { escapePreviewHtml } from './inline-actions.js';

export interface PreviewInspectorArrowNode {
  waypoints?: unknown[] | null;
}

export interface PreviewInspectorHostElement {
  innerHTML: string;
}

export type PreviewInspectorGridInfo =
  Pick<PreviewGridInfo, 'col_widths' | 'col_gap' | 'row_heights' | 'row_gap'>;

export interface RenderPreviewSingleSelectionInspectorOptions {
  cid: string;
  node?: (PreviewSingleSelectionInspectorNode & PreviewAutolayoutInspectorNode) | null;
  parentNode?: PreviewSingleSelectionInspectorNode | null;
  arrowNode?: PreviewInspectorArrowNode | null;
  override?: Record<string, unknown> | null;
  parentOverride?: Record<string, unknown> | null;
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
  showAutolayoutInspector?: boolean | null;
  showLayoutEditingControls?: boolean | null;
  baselineStep?: number;
  textAdapter?: TextMeasureAdapter | null;
  formatControlErrorMessage?: ((message: string) => string) | null;
  renderStyleOptions?: ((currentStyle: string, originalStyleName: string) => string) | null;
}

export interface RenderPreviewSingleSelectionInspectorHostOptions
  extends RenderPreviewSingleSelectionInspectorOptions {
  inspector?: PreviewInspectorHostElement | null;
}

export interface RenderPreviewMultiSelectionInspectorHostOptions {
  inspector?: PreviewInspectorHostElement | null;
  selectedCount: number;
  info: SelectionActionInfo;
  parentLayout?: InspectorSelectionParentLayout | null;
  fallbackGap: number;
  snapStep?: number;
  items: MultiSelectionInspectorRuntimeItem[];
  styleState?: MultiSelectionStyleState | null;
  widthUnit?: MultiSelectionInspectorPanelRenderOptions['widthUnit'];
  heightUnit?: MultiSelectionInspectorPanelRenderOptions['heightUnit'];
  showWidthColsOption?: boolean;
  showLayoutEditingControls?: boolean | null;
  styleOptionsHtml?: string;
}

export interface PreviewMultiSelectionInspectorHostResult {
  kind: 'missing' | 'empty' | 'rendered';
  inferredGap: number | null;
}

export interface RenderPreviewSelectionInspectorHostOptions {
  preferredId?: string | null;
  resolvePrimaryId: (preferredId?: string | null) => string | null | undefined;
  selectedCount: number;
  renderEmptyInspector: () => void;
  renderSingleSelectionInspector: (cid: string) => void;
  renderMultiSelectionInspector: () => void;
}

export interface PreviewMultiSelectionInspectorRuntimeNode {
  layout?: string | null;
  layoutGap?: number | null;
  layoutRowGap?: number | null;
  layoutColGap?: number | null;
}

export interface RenderPreviewMultiSelectionInspectorRuntimeHostOptions {
  inspector?: PreviewInspectorHostElement | null;
  selectedCount: number;
  info: SelectionActionInfo;
  getNode: (cid: string) => PreviewMultiSelectionInspectorRuntimeNode | null | undefined;
  fallbackGap: number;
  snapStep?: number;
  resolveMultiStyleState: (items: SelectionActionInfo['items']) => MultiSelectionPreviewStyleState | null;
  items: MultiSelectionInspectorRuntimeItem[];
  widthUnit?: MultiSelectionInspectorPanelRenderOptions['widthUnit'];
  heightUnit?: MultiSelectionInspectorPanelRenderOptions['heightUnit'];
  showWidthColsOption?: boolean;
  showLayoutEditingControls?: boolean | null;
  renderStyleOptions: (styleState: MultiSelectionPreviewStyleState) => string;
}

export interface RenderPreviewSingleSelectionInspectorRuntimeHostOptions {
  inspector?: PreviewInspectorHostElement | null;
  cid: string;
  getNode: (
    cid: string,
  ) => (PreviewSingleSelectionInspectorNode & PreviewAutolayoutInspectorNode) | null | undefined;
  getArrowNode: (cid: string) => PreviewInspectorArrowNode | null | undefined;
  getParentNode: (
    cid: string,
  ) => (PreviewSingleSelectionInspectorNode & PreviewAutolayoutInspectorNode) | null | undefined;
  getOverride: (cid: string) => Record<string, unknown> | null | undefined;
  getOwnDelta: (cid: string) => InspectorDeltaState;
  getEffectiveDelta: (cid: string) => InspectorEffectiveDeltaState;
  getComponentType: (cid: string) => string | null | undefined;
  getParentLayout: (cid: string) => string | null;
  getRenderedStyle: (cid: string) => PreviewRenderedStyleFields | null;
  getViolations: (cid: string) => SingleSelectionInspectorViolation[] | null | undefined;
  widthCoerced?: boolean;
  heightCoerced?: boolean;
  widthUnit?: 'px' | 'cols';
  heightUnit?: 'px' | 'rows';
  gridInfo?: PreviewInspectorGridInfo | null;
  showAutolayoutInspector?: boolean | null;
  showLayoutEditingControls?: boolean | null;
  baselineStep?: number;
  textAdapter?: TextMeasureAdapter | null;
  formatControlErrorMessage?: ((message: string) => string) | null;
  renderStyleOptions?: ((currentStyle: string, originalStyleName: string) => string) | null;
}

export function createPreviewMissingInspectorMarkup(cid: string): string {
  return '<p class="dg-empty-message bf-form-help">Component <strong>'
    + escapePreviewHtml(cid)
    + '</strong> not found. Try reloading the preview.</p>';
}

export function renderPreviewEmptyInspectorHost(
  inspector?: PreviewInspectorHostElement | null,
): boolean {
  if (!inspector) {
    return false;
  }
  inspector.innerHTML =
    '<p class="dg-empty-message bf-form-help">Click a component to inspect it.</p>';
  return true;
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
  if (options.showLayoutEditingControls === false) {
    return '';
  }
  if (options.showAutolayoutInspector === false) {
    return '';
  }
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
    parentNode: options.parentNode ?? null,
    override: options.override ?? {},
    parentOverride: options.parentOverride ?? {},
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
    showLayoutEditingControls: options.showLayoutEditingControls ?? true,
  });
  return renderSingleSelectionInspectorPanel(panelOptions);
}

export function renderPreviewSingleSelectionInspectorHost(
  options: RenderPreviewSingleSelectionInspectorHostOptions,
): boolean {
  if (!options.inspector) {
    return false;
  }
  options.inspector.innerHTML = renderPreviewSingleSelectionInspector(options);
  return true;
}

export function renderPreviewMultiSelectionInspectorHost(
  options: RenderPreviewMultiSelectionInspectorHostOptions,
): PreviewMultiSelectionInspectorHostResult {
  if (!options.inspector) {
    return {
      kind: 'missing',
      inferredGap: null,
    };
  }

  if (options.selectedCount < 2 || options.info.items.length === 0) {
    renderPreviewEmptyInspectorHost(options.inspector);
    return {
      kind: 'empty',
      inferredGap: null,
    };
  }

  const panelState = resolveMultiSelectionInspectorState({
    selectedCount: options.selectedCount,
    info: options.info,
    parentLayout: options.parentLayout,
    fallbackGap: options.fallbackGap,
    snapStep: options.snapStep,
    items: options.items,
  });

  options.inspector.innerHTML = renderMultiSelectionInspectorPanel({
    selectedCount: panelState.viewModel.selectedCount,
    multiActionGap: panelState.viewModel.inferredGap,
    showStackSpacingHint: panelState.viewModel.showStackSpacingHint,
    showDistributeControls: panelState.viewModel.showDistributeControls,
    showAlignOnlyHint: panelState.viewModel.showAlignOnlyHint,
    hasUnsupported: panelState.viewModel.hasUnsupported,
    alignState: panelState.alignState,
    containerState: panelState.containerState,
    sizingState: panelState.sizingState,
    styleState: options.info.hasUnsupported ? null : options.styleState ?? null,
    widthUnit: options.widthUnit,
    heightUnit: options.heightUnit,
    showWidthColsOption: options.showWidthColsOption,
    showLayoutEditingControls: options.showLayoutEditingControls ?? true,
    styleOptionsHtml: options.styleOptionsHtml,
  });

  return {
    kind: 'rendered',
    inferredGap: panelState.viewModel.inferredGap,
  };
}

export function renderPreviewSelectionInspectorHost(
  options: RenderPreviewSelectionInspectorHostOptions,
): void {
  const primary = options.resolvePrimaryId(options.preferredId) || null;
  if (!primary) {
    options.renderEmptyInspector();
    return;
  }
  if (options.selectedCount === 1) {
    options.renderSingleSelectionInspector(primary);
    return;
  }
  options.renderMultiSelectionInspector();
}

export function renderPreviewMultiSelectionInspectorRuntimeHost(
  options: RenderPreviewMultiSelectionInspectorRuntimeHostOptions,
): PreviewMultiSelectionInspectorHostResult {
  const parent = options.info.parentId
    ? options.getNode(options.info.parentId) ?? null
    : null;
  const styleState = options.info.items.length >= 2
    ? options.resolveMultiStyleState(options.info.items)
    : null;

  return renderPreviewMultiSelectionInspectorHost({
    inspector: options.inspector,
    selectedCount: options.selectedCount,
    info: options.info,
    parentLayout: parent ? {
      layout: parent.layout,
      layoutGap: parent.layoutGap,
      layoutRowGap: parent.layoutRowGap,
      layoutColGap: parent.layoutColGap,
    } : null,
    fallbackGap: options.fallbackGap,
    snapStep: options.snapStep,
    items: options.items,
    styleState,
    widthUnit: options.widthUnit,
    heightUnit: options.heightUnit,
    showWidthColsOption: options.showWidthColsOption,
    showLayoutEditingControls: options.showLayoutEditingControls ?? true,
    styleOptionsHtml: styleState
      ? options.renderStyleOptions(styleState)
      : '',
  });
}

export function renderPreviewSingleSelectionInspectorRuntimeHost(
  options: RenderPreviewSingleSelectionInspectorRuntimeHostOptions,
): boolean {
  const parentNode = options.getParentNode(options.cid) ?? null;
  const parentId = String(parentNode?.id ?? parentNode?.data?.id ?? '');
  return renderPreviewSingleSelectionInspectorHost({
    inspector: options.inspector,
    cid: options.cid,
    node: options.getNode(options.cid) ?? null,
    parentNode,
    arrowNode: options.getArrowNode(options.cid) ?? null,
    override: options.getOverride(options.cid) ?? {},
    parentOverride: parentId ? (options.getOverride(parentId) ?? {}) : {},
    ownDelta: options.getOwnDelta(options.cid),
    effectiveDelta: options.getEffectiveDelta(options.cid),
    componentType: options.getComponentType(options.cid) ?? null,
    parentLayout: options.getParentLayout(options.cid),
    renderedStyle: options.getRenderedStyle(options.cid),
    violations: options.getViolations(options.cid) ?? null,
    widthCoerced: options.widthCoerced,
    heightCoerced: options.heightCoerced,
    widthUnit: options.widthUnit,
    heightUnit: options.heightUnit,
    gridInfo: options.gridInfo ?? null,
    showAutolayoutInspector: options.showAutolayoutInspector ?? true,
    showLayoutEditingControls: options.showLayoutEditingControls ?? true,
    baselineStep: options.baselineStep,
    textAdapter: options.textAdapter ?? null,
    formatControlErrorMessage: options.formatControlErrorMessage ?? null,
    renderStyleOptions: options.renderStyleOptions ?? null,
  });
}
