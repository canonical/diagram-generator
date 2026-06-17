import {
  colSpanToPx,
  rowSpanToPx,
  type PreviewGridInfo,
} from './grid-resolution.js';

/**
 * Preview shell frame-property mutation helpers (spec 043 slice M).
 *
 * These helpers keep the override normalization rules in TypeScript while the
 * legacy browser shell still owns undo, dirty state, and DOM refresh timing.
 * They intentionally mutate the provided override/coercion state in place so
 * `editor.js` can stay a thin coordinator.
 */

export type PreviewFramePropMutationKind = 'none' | 'change' | 'clear';
export type PreviewFrameSizeDimension = 'width' | 'height';

export interface PreviewFrameMutationNodeData {
  width?: number | null;
  height?: number | null;
}

export interface PreviewFrameMutationNode {
  type?: string | null;
  layout?: string | null;
  children?: Array<unknown> | null;
  data?: PreviewFrameMutationNodeData | null;
}

export interface PreviewFramePropMutationResult {
  kind: PreviewFramePropMutationKind;
}

export type PreviewFrameOverrideEntry = Record<string, unknown>;
export type PreviewFrameOverrideMap = Record<string, PreviewFrameOverrideEntry | undefined>;

const CONSTRAINT_PROPS = new Set([
  'min_width',
  'max_width',
  'max_width_chars',
  'min_height',
  'max_height',
]);

const CONTAINER_PROPS = new Set([
  'direction',
  'padding',
  'padding_top',
  'padding_right',
  'padding_bottom',
  'padding_left',
]);

const PADDING_PROPS = new Set([
  'padding',
  'padding_top',
  'padding_right',
  'padding_bottom',
  'padding_left',
]);

const PER_SIDE_PADDING_PROPS = new Set([
  'padding_top',
  'padding_right',
  'padding_bottom',
  'padding_left',
]);

const ALIGN_VALUES = new Set([
  'TOP_LEFT',
  'TOP_CENTER',
  'TOP_RIGHT',
  'CENTER_LEFT',
  'CENTER',
  'CENTER_RIGHT',
  'BOTTOM_LEFT',
  'BOTTOM_CENTER',
  'BOTTOM_RIGHT',
]);

function ensureOverrideEntry(
  overrides: PreviewFrameOverrideMap,
  cid: string,
): PreviewFrameOverrideEntry {
  if (!overrides[cid]) overrides[cid] = {};
  return overrides[cid] as PreviewFrameOverrideEntry;
}

function isConstraintProp(prop: string): boolean {
  return CONSTRAINT_PROPS.has(prop);
}

function isContainerNode(node: PreviewFrameMutationNode | null | undefined): boolean {
  return Boolean(node?.layout || (node?.children && node.children.length > 0));
}

function clearPaddingConflicts(entry: PreviewFrameOverrideEntry, prop: string): void {
  if (prop === 'padding') {
    delete entry.padding_top;
    delete entry.padding_right;
    delete entry.padding_bottom;
    delete entry.padding_left;
    return;
  }

  if (PER_SIDE_PADDING_PROPS.has(prop)) {
    delete entry.padding;
  }
}

function normalizeConstraintValue(value: unknown): number {
  const numeric = Number(value);
  return Math.max(0, Number.isFinite(numeric) ? numeric : 0);
}

function normalizeAlignValue(value: unknown): string | null {
  const nextValue = typeof value === 'string'
    ? value
    : String(value ?? '');
  return ALIGN_VALUES.has(nextValue) ? nextValue : null;
}

function applyConstraintBounds(
  entry: PreviewFrameOverrideEntry,
  prop: string,
  value: number,
): void {
  const maxWidth = Number(entry.max_width);
  const minWidth = Number(entry.min_width);
  const maxHeight = Number(entry.max_height);
  const minHeight = Number(entry.min_height);

  if (prop === 'min_width' && Number.isFinite(maxWidth) && value > maxWidth) {
    entry.max_width = value;
  }
  if (prop === 'max_width' && Number.isFinite(minWidth) && value < minWidth) {
    entry.min_width = value;
  }
  if (prop === 'min_height' && Number.isFinite(maxHeight) && value > maxHeight) {
    entry.max_height = value;
  }
  if (prop === 'max_height' && Number.isFinite(minHeight) && value < minHeight) {
    entry.min_height = value;
  }
}

function clearCoercionKey(
  coercedKeys: Set<string> | null | undefined,
  cid: string,
  key: string,
): void {
  coercedKeys?.delete(`${cid}:${key}`);
}

function clearSizingCoercion(
  coercedKeys: Set<string> | null | undefined,
  cid: string,
  sizingProp: 'sizing_w' | 'sizing_h',
  dimension: PreviewFrameSizeDimension,
): void {
  clearCoercionKey(coercedKeys, cid, sizingProp);
  clearCoercionKey(coercedKeys, cid, dimension);
}

function applySizingCapture(
  entry: PreviewFrameOverrideEntry,
  prop: string,
  value: unknown,
  node: PreviewFrameMutationNode | null | undefined,
): void {
  const nodeWidth = Number(node?.data?.width);
  const nodeHeight = Number(node?.data?.height);

  if ((prop === 'sizing_w' || prop === 'sizing_h') && value === 'FIXED' && node?.data) {
    if (prop === 'sizing_w' && entry.width === undefined && Number.isFinite(nodeWidth)) {
      entry.width = Math.round(nodeWidth);
    }
    if (prop === 'sizing_h' && entry.height === undefined && Number.isFinite(nodeHeight)) {
      entry.height = Math.round(nodeHeight);
    }
  }

  if (prop === 'sizing_w' && value !== 'FIXED') {
    delete entry.width;
  }
  if (prop === 'sizing_h' && value !== 'FIXED') {
    delete entry.height;
  }
}

export function resolvePreviewFrameSizePx(options: {
  dimension: PreviewFrameSizeDimension;
  value: number;
  gridInfo?: PreviewGridInfo | null;
  widthUnit?: 'px' | 'cols';
  heightUnit?: 'px' | 'rows';
  baselineStep: number;
}): number | null {
  if (!Number.isFinite(options.value) || options.value <= 0) return null;

  let px: number | null;
  if (options.dimension === 'width' && options.widthUnit === 'cols') {
    px = colSpanToPx(options.gridInfo, options.value);
  } else if (options.dimension === 'height' && options.heightUnit === 'rows') {
    px = rowSpanToPx(options.gridInfo, options.value);
  } else {
    px = Math.round(options.value / options.baselineStep) * options.baselineStep;
  }

  if (px == null || Number.isNaN(px) || px <= 0) return null;
  return Math.round(px);
}

export function applySingleFramePropMutation(options: {
  overrides: PreviewFrameOverrideMap;
  coercedKeys?: Set<string> | null;
  cid: string;
  prop: string;
  value: unknown;
  node?: PreviewFrameMutationNode | null;
  snapToGrid: (value: number) => number;
}): PreviewFramePropMutationResult {
  const entry = ensureOverrideEntry(options.overrides, options.cid);
  let value = options.value;

  if (options.prop === 'align') {
    const alignValue = normalizeAlignValue(value);
    if (!alignValue) {
      return { kind: 'none' };
    }
    value = alignValue;
  }

  if (options.prop === 'gap' || PADDING_PROPS.has(options.prop)) {
    value = Math.max(0, typeof value === 'number' && Number.isFinite(value) ? value : 0);
  }

  if (options.prop === 'gap_delta') {
    const numeric = Number(value);
    if (
      value === ''
      || value == null
      || !Number.isFinite(numeric)
      || options.snapToGrid(numeric) === 0
    ) {
      entry.gap_delta = null;
      return { kind: 'clear' };
    }
    value = options.snapToGrid(numeric);
    delete entry.gap;
  }

  clearPaddingConflicts(entry, options.prop);

  if (isConstraintProp(options.prop)) {
    if (value === '' || value == null) {
      delete entry[options.prop];
      clearCoercionKey(options.coercedKeys, options.cid, options.prop);
      return { kind: 'clear' };
    }

    const constraintValue = normalizeConstraintValue(value);
    value = constraintValue;
    applyConstraintBounds(entry, options.prop, constraintValue);
  }

  entry[options.prop] = value;
  clearCoercionKey(options.coercedKeys, options.cid, options.prop);
  applySizingCapture(entry, options.prop, value, options.node);
  return { kind: 'change' };
}

export function applyMultiFramePropMutation(options: {
  overrides: PreviewFrameOverrideMap;
  coercedKeys?: Set<string> | null;
  ids: Iterable<string>;
  prop: string;
  value: unknown;
  getNode: (cid: string) => PreviewFrameMutationNode | null | undefined;
}): PreviewFramePropMutationResult {
  const isConstraint = isConstraintProp(options.prop);
  let value = options.value;

  if (options.prop === 'align') {
    const alignValue = normalizeAlignValue(value);
    if (!alignValue) {
      return { kind: 'none' };
    }
    value = alignValue;
  }

  if (!isConstraint && (value === '' || value === null || value === undefined)) {
    return { kind: 'none' };
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return { kind: 'none' };
  }

  if (PADDING_PROPS.has(options.prop)) {
    value = Math.max(0, typeof value === 'number' && Number.isFinite(value) ? value : 0);
  }

  if (isConstraint) {
    if (value === '' || value == null) {
      for (const cid of options.ids) {
        const entry = options.overrides[cid];
        if (!entry) continue;
        delete entry[options.prop];
        if (Object.keys(entry).length === 0) delete options.overrides[cid];
      }
      return { kind: 'clear' };
    }

    value = normalizeConstraintValue(value);
  }

  const isContainerProp = CONTAINER_PROPS.has(options.prop);
  for (const cid of options.ids) {
    const node = options.getNode(cid);
    if (!node) continue;
    if (node.type === 'arrow') continue;
    if (isContainerProp && !isContainerNode(node)) continue;

    const entry = ensureOverrideEntry(options.overrides, cid);
    clearPaddingConflicts(entry, options.prop);

    if (isConstraint) {
      applyConstraintBounds(entry, options.prop, value as number);
    }

    entry[options.prop] = value;
    clearCoercionKey(options.coercedKeys, cid, options.prop);
    applySizingCapture(entry, options.prop, value, node);
  }

  return { kind: 'change' };
}

export function applySingleFrameSizeMutation(options: {
  overrides: PreviewFrameOverrideMap;
  coercedKeys?: Set<string> | null;
  cid: string;
  dimension: PreviewFrameSizeDimension;
  px: number;
}): PreviewFramePropMutationResult {
  const entry = ensureOverrideEntry(options.overrides, options.cid);
  const sizingProp = options.dimension === 'width' ? 'sizing_w' : 'sizing_h';
  clearSizingCoercion(options.coercedKeys, options.cid, sizingProp, options.dimension);
  entry[sizingProp] = 'FIXED';
  entry[options.dimension] = options.px;
  return { kind: 'change' };
}

export function applyMultiFrameSizeMutation(options: {
  overrides: PreviewFrameOverrideMap;
  coercedKeys?: Set<string> | null;
  ids: Iterable<string>;
  dimension: PreviewFrameSizeDimension;
  px: number;
  getNode: (cid: string) => PreviewFrameMutationNode | null | undefined;
}): PreviewFramePropMutationResult {
  const sizingProp = options.dimension === 'width' ? 'sizing_w' : 'sizing_h';

  for (const cid of options.ids) {
    const node = options.getNode(cid);
    if (!node || node.type === 'arrow') continue;

    const entry = ensureOverrideEntry(options.overrides, cid);
    clearSizingCoercion(options.coercedKeys, cid, sizingProp, options.dimension);
    entry[sizingProp] = 'FIXED';
    entry[options.dimension] = options.px;
  }

  return { kind: 'change' };
}
