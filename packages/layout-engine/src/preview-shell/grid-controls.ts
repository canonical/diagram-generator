import {
  resolvePreviewGridInfo,
  type PreviewGridInfo,
} from './grid-resolution.js';

/**
 * Preview grid-control state helpers (spec 043 grid slice B).
 *
 * These helpers resolve the value state shown in the shell controls and shape
 * the runtime override object persisted back through the editor state store.
 */

export interface PreviewGridControlState {
  cols: number;
  rows: number;
  colGap: number;
  rowGap: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  linkToRoot: boolean;
  slackAbsorption: boolean;
}

export interface PreviewGridInfoState extends PreviewGridInfo {
  _link_to_root?: boolean;
  _slack_absorption?: boolean;
}

export interface PreviewGridControlInputState {
  cols?: unknown;
  rows?: unknown;
  colGap?: unknown;
  rowGap?: unknown;
  marginTop?: unknown;
  marginRight?: unknown;
  marginBottom?: unknown;
  marginLeft?: unknown;
  linkToRoot?: unknown;
  slackAbsorption?: unknown;
}

export interface PreviewGridMarginInputState {
  hasSplitMargins?: boolean;
  marginTop?: unknown;
  marginRight?: unknown;
  marginBottom?: unknown;
  marginLeft?: unknown;
  legacyMargin?: unknown;
  fallbackMargin?: number;
}

export interface PreviewGridControlDomState extends PreviewGridMarginInputState {
  cols?: unknown;
  rows?: unknown;
  colGap?: unknown;
  rowGap?: unknown;
  linkToRoot?: unknown;
  slackAbsorption?: unknown;
}

export interface PreviewGridControlDomPatch {
  checked: Record<string, boolean>;
  values: Record<string, number>;
}

export interface PreviewGridControlRuntimeUpdate {
  controlState: PreviewGridControlState;
  gridOverrides: Record<string, number | boolean>;
  overlayGridInfo: PreviewGridInfo;
  relayoutRootId: string;
  shouldPruneLinkedRootOverrides: boolean;
}

const GRID_CONTROL_INPUT_IDS = new Set([
  'grid-cols',
  'grid-rows',
  'grid-col-gap',
  'grid-row-gap',
  'grid-margin-top',
  'grid-margin-right',
  'grid-margin-bottom',
  'grid-margin-left',
]);

function finiteNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function isGridControlInputId(value: string | null | undefined): boolean {
  return GRID_CONTROL_INPUT_IDS.has(String(value || ''));
}

export function resolvePreviewGridMarginsFromInputState(
  input: PreviewGridMarginInputState,
): { top: number; right: number; bottom: number; left: number } {
  const fallbackMargin = Math.max(0, Math.round(input.fallbackMargin ?? 24));
  if (input.hasSplitMargins) {
    return {
      top: Math.max(0, Math.round(finiteNumber(input.marginTop) ?? 0)),
      right: Math.max(0, Math.round(finiteNumber(input.marginRight) ?? 0)),
      bottom: Math.max(0, Math.round(finiteNumber(input.marginBottom) ?? 0)),
      left: Math.max(0, Math.round(finiteNumber(input.marginLeft) ?? 0)),
    };
  }
  const uniform = Math.max(0, Math.round(finiteNumber(input.legacyMargin) ?? fallbackMargin));
  return { top: uniform, right: uniform, bottom: uniform, left: uniform };
}

export function resolvePreviewGridControlState(options: {
  gridInfo: Partial<PreviewGridInfoState>;
  gridOverrides?: Record<string, unknown> | null;
}): PreviewGridControlState {
  const gridInfo = options.gridInfo;
  const gridOverrides = options.gridOverrides ?? {};

  const fallbackCols = Array.isArray(gridInfo.col_xs) ? gridInfo.col_xs.length : 1;
  const fallbackRows = Array.isArray(gridInfo.row_ys) ? gridInfo.row_ys.length : 0;
  const fallbackMargin = finiteNumber(gridInfo.outer_margin)
    ?? finiteNumber(gridInfo.col_gap)
    ?? 24;

  return {
    cols: Math.max(
      1,
      finiteNumber(gridOverrides.cols)
      ?? finiteNumber(gridInfo._cols)
      ?? fallbackCols
      ?? 1,
    ),
    rows: Math.max(
      0,
      finiteNumber(gridOverrides.rows)
      ?? finiteNumber(gridInfo._rows)
      ?? fallbackRows
      ?? 0,
    ),
    colGap: Math.max(
      0,
      finiteNumber(gridOverrides.col_gap)
      ?? finiteNumber(gridInfo.col_gap)
      ?? 0,
    ),
    rowGap: Math.max(
      0,
      finiteNumber(gridOverrides.row_gap)
      ?? finiteNumber(gridInfo.row_gap)
      ?? 0,
    ),
    marginTop: Math.max(
      0,
      finiteNumber(gridOverrides.margin_top)
      ?? finiteNumber(gridInfo.margin_top)
      ?? fallbackMargin,
    ),
    marginRight: Math.max(
      0,
      finiteNumber(gridOverrides.margin_right)
      ?? finiteNumber(gridInfo.margin_right)
      ?? fallbackMargin,
    ),
    marginBottom: Math.max(
      0,
      finiteNumber(gridOverrides.margin_bottom)
      ?? finiteNumber(gridInfo.margin_bottom)
      ?? fallbackMargin,
    ),
    marginLeft: Math.max(
      0,
      finiteNumber(gridOverrides.margin_left)
      ?? finiteNumber(gridInfo.margin_left)
      ?? fallbackMargin,
    ),
    linkToRoot: typeof gridOverrides.link_to_root === 'boolean'
      ? gridOverrides.link_to_root
      : (typeof gridInfo._link_to_root === 'boolean' ? gridInfo._link_to_root : true),
    slackAbsorption: typeof gridOverrides.slack_absorption === 'boolean'
      ? gridOverrides.slack_absorption
      : (typeof gridInfo._slack_absorption === 'boolean' ? gridInfo._slack_absorption : true),
  };
}

export function createPreviewGridOverrides(
  state: PreviewGridControlState,
): Record<string, number | boolean> {
  return {
    cols: Math.max(1, Math.round(state.cols)),
    rows: Math.max(0, Math.round(state.rows)),
    col_gap: Math.max(0, Math.round(state.colGap)),
    row_gap: Math.max(0, Math.round(state.rowGap)),
    margin_top: Math.max(0, Math.round(state.marginTop)),
    margin_right: Math.max(0, Math.round(state.marginRight)),
    margin_bottom: Math.max(0, Math.round(state.marginBottom)),
    margin_left: Math.max(0, Math.round(state.marginLeft)),
    outer_margin: Math.max(0, Math.round(state.marginTop)),
    link_to_root: Boolean(state.linkToRoot),
    slack_absorption: Boolean(state.slackAbsorption),
  };
}

export function resolvePreviewGridControlInputState(
  input: PreviewGridControlInputState,
): PreviewGridControlState {
  return {
    cols: Math.max(1, Math.round(finiteNumber(input.cols) ?? 1)),
    rows: Math.max(0, Math.round(finiteNumber(input.rows) ?? 0)),
    colGap: Math.max(0, Math.round(finiteNumber(input.colGap) ?? 0)),
    rowGap: Math.max(0, Math.round(finiteNumber(input.rowGap) ?? 0)),
    marginTop: Math.max(0, Math.round(finiteNumber(input.marginTop) ?? 24)),
    marginRight: Math.max(0, Math.round(finiteNumber(input.marginRight) ?? 24)),
    marginBottom: Math.max(0, Math.round(finiteNumber(input.marginBottom) ?? 24)),
    marginLeft: Math.max(0, Math.round(finiteNumber(input.marginLeft) ?? 24)),
    linkToRoot: typeof input.linkToRoot === 'boolean' ? input.linkToRoot : true,
    slackAbsorption: typeof input.slackAbsorption === 'boolean' ? input.slackAbsorption : true,
  };
}

export function resolvePreviewGridControlStateFromDomState(
  input: PreviewGridControlDomState,
): PreviewGridControlState {
  const margins = resolvePreviewGridMarginsFromInputState(input);
  return resolvePreviewGridControlInputState({
    cols: input.cols,
    rows: input.rows,
    colGap: input.colGap,
    rowGap: input.rowGap,
    marginTop: margins.top,
    marginRight: margins.right,
    marginBottom: margins.bottom,
    marginLeft: margins.left,
    linkToRoot: input.linkToRoot,
    slackAbsorption: input.slackAbsorption,
  });
}

export function resolvePreviewGridControlDomPatch(options: {
  controlState: PreviewGridControlState;
  hasSplitMargins?: boolean;
}): PreviewGridControlDomPatch {
  const values: Record<string, number> = {
    'grid-cols': options.controlState.cols,
    'grid-rows': options.controlState.rows,
    'grid-col-gap': options.controlState.colGap,
    'grid-row-gap': options.controlState.rowGap,
  };
  if (options.hasSplitMargins) {
    values['grid-margin-top'] = options.controlState.marginTop;
    values['grid-margin-right'] = options.controlState.marginRight;
    values['grid-margin-bottom'] = options.controlState.marginBottom;
    values['grid-margin-left'] = options.controlState.marginLeft;
  } else {
    values['grid-margin'] = options.controlState.marginTop;
  }

  return {
    values,
    checked: {
      'grid-link-root': options.controlState.linkToRoot,
      'grid-slack': options.controlState.slackAbsorption,
    },
  };
}

export function resolvePreviewGridInfoFromControlState(options: {
  canvasWidth: number;
  canvasHeight: number;
  baselineStep: number;
  controlState: PreviewGridControlState;
}): PreviewGridInfo {
  return resolvePreviewGridInfo({
    canvasWidth: options.canvasWidth,
    canvasHeight: options.canvasHeight,
    baselineStep: options.baselineStep,
    columnCount: options.controlState.cols,
    columnGutter: options.controlState.colGap,
    rowCount: options.controlState.rows,
    rowGutter: options.controlState.rowGap,
    marginTop: options.controlState.marginTop,
    marginRight: options.controlState.marginRight,
    marginBottom: options.controlState.marginBottom,
    marginLeft: options.controlState.marginLeft,
    slackAbsorption: options.controlState.slackAbsorption,
  });
}

export function resolvePreviewGridControlRuntimeUpdate(options: {
  canvasWidth: number;
  canvasHeight: number;
  baselineStep: number;
  controlState: PreviewGridControlState;
  rootId?: string | null;
}): PreviewGridControlRuntimeUpdate {
  return {
    controlState: options.controlState,
    gridOverrides: createPreviewGridOverrides(options.controlState),
    overlayGridInfo: resolvePreviewGridInfoFromControlState({
      canvasWidth: options.canvasWidth,
      canvasHeight: options.canvasHeight,
      baselineStep: options.baselineStep,
      controlState: options.controlState,
    }),
    relayoutRootId: options.rootId ? String(options.rootId) : 'root',
    shouldPruneLinkedRootOverrides: Boolean(options.controlState.linkToRoot),
  };
}

export function resolvePreviewGridInfoFromRuntimeState(options: {
  canvasWidth: number;
  canvasHeight: number;
  baselineStep: number;
  gridOverrides?: Record<string, unknown> | null;
  fallbackGridInfo?: Partial<PreviewGridInfoState> | null;
  baseGridInfo?: Partial<PreviewGridInfoState> | null;
}): PreviewGridInfoState {
  const gridOverrides = options.gridOverrides ?? {};
  const fallback = options.baseGridInfo ?? options.fallbackGridInfo ?? {};
  const margin = finiteNumber(gridOverrides.outer_margin)
    ?? finiteNumber(gridOverrides.col_gap)
    ?? finiteNumber(fallback.outer_margin)
    ?? finiteNumber(fallback.col_gap)
    ?? 24;

  const controlState = resolvePreviewGridControlInputState({
    cols: gridOverrides.cols ?? finiteNumber(fallback._cols) ?? (fallback.col_xs?.length ?? 1),
    rows: gridOverrides.rows ?? finiteNumber(fallback._rows) ?? 0,
    colGap: gridOverrides.col_gap ?? finiteNumber(fallback.col_gap) ?? 24,
    rowGap: gridOverrides.row_gap ?? finiteNumber(fallback.row_gap) ?? 24,
    marginTop: gridOverrides.margin_top ?? finiteNumber(fallback.margin_top) ?? margin,
    marginRight: gridOverrides.margin_right ?? finiteNumber(fallback.margin_right) ?? margin,
    marginBottom: gridOverrides.margin_bottom ?? finiteNumber(fallback.margin_bottom) ?? margin,
    marginLeft: gridOverrides.margin_left ?? finiteNumber(fallback.margin_left) ?? margin,
    linkToRoot: typeof gridOverrides.link_to_root === 'boolean'
      ? gridOverrides.link_to_root
      : (typeof fallback._link_to_root === 'boolean' ? fallback._link_to_root : true),
    slackAbsorption: typeof gridOverrides.slack_absorption === 'boolean'
      ? gridOverrides.slack_absorption
      : (typeof fallback._slack_absorption === 'boolean' ? fallback._slack_absorption : true),
  });

  const gridInfo = resolvePreviewGridInfoFromControlState({
    canvasWidth: options.canvasWidth,
    canvasHeight: options.canvasHeight,
    baselineStep: options.baselineStep,
    controlState,
  }) as PreviewGridInfoState;

  gridInfo._link_to_root = controlState.linkToRoot;
  gridInfo._slack_absorption = controlState.slackAbsorption;
  return gridInfo;
}
