import type { PreviewGridInfo } from './grid-resolution.js';

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
