import { BODY_SIZE } from '../tokens.js';
import { DEFAULT_MAX_WIDTH_CHARS, maxWidthPxFromChars } from '../text-layout.js';
import type { TextMeasureAdapter } from '../text-measure.js';
import {
  pxToColSpan,
  pxToRowSpan,
  type PreviewGridInfo,
} from './grid-resolution.js';
import type { SingleSelectionAutolayoutPanelRenderOptions } from './inspector-autolayout-panel.js';
import { createSingleSelectionAutolayoutState } from './inspector-single.js';

/**
 * Preview autolayout inspector option helpers (spec 043 slice N).
 *
 * The legacy shell still owns DOM access and text-adapter lookup, but the
 * panel option/value shaping now lives in TypeScript with the rest of the
 * preview-shell inspector logic.
 */

export interface PreviewAutolayoutInspectorNodeData extends Record<string, unknown> {
  width?: unknown;
  height?: unknown;
  gapDelta?: unknown;
  gap_delta?: unknown;
}

export interface PreviewAutolayoutInspectorNode extends Record<string, unknown> {
  layout?: string | null;
  children?: Array<unknown> | null;
  parent?: unknown;
  data?: PreviewAutolayoutInspectorNodeData | null;
  layoutGap?: number | null;
  layoutRowGap?: number | null;
  layoutColGap?: number | null;
  label_text?: unknown;
}

export type PreviewSizingAxis = 'w' | 'h';

function readNodeProp(
  node: PreviewAutolayoutInspectorNode | null | undefined,
  key: string,
): unknown {
  if (!node) return undefined;
  if (node[key] !== undefined && node[key] !== null && node[key] !== '') return node[key];
  if (node.data && node.data[key] !== undefined && node.data[key] !== null) return node.data[key];
  return undefined;
}

function nodeHeadingText(node: PreviewAutolayoutInspectorNode | null | undefined): string {
  const text = readNodeProp(node, 'heading_text');
  return text ? String(text) : '';
}

export function hasPreviewNodeTextContent(
  node: PreviewAutolayoutInspectorNode | null | undefined,
): boolean {
  if (!node) return false;
  if (nodeHeadingText(node).trim()) return true;
  return Array.isArray(node.label_text)
    && node.label_text.some((text) => String(text || '').trim());
}

export function resolvePreviewRuntimeSizingValue(options: {
  cid: string;
  axis: PreviewSizingAxis;
  override?: Record<string, unknown> | null;
  node?: PreviewAutolayoutInspectorNode | null;
  isCoerced?: boolean;
}): string | null {
  const key = options.axis === 'w' ? 'sizing_w' : 'sizing_h';
  if (options.isCoerced) return 'FIXED';
  const override = options.override ?? {};
  return String(override[key] || options.node?.[key] || '') || null;
}

function resolveMaxWidthCharsValue(
  node: PreviewAutolayoutInspectorNode,
  override: Record<string, unknown>,
): string | number {
  if (override.max_width_chars != null && override.max_width_chars !== '') {
    return override.max_width_chars as string | number;
  }
  if (node.max_width_chars != null) return node.max_width_chars as string | number;
  if (hasPreviewNodeTextContent(node)) return DEFAULT_MAX_WIDTH_CHARS;
  return '';
}

function hasExplicitMaxWidthPx(
  node: PreviewAutolayoutInspectorNode,
  override: Record<string, unknown>,
): boolean {
  if (override.max_width !== undefined && override.max_width !== '') return true;
  return node.max_width != null && node.max_width !== '';
}

function resolveMaxWidthPxPreview(
  chars: string | number,
  node: PreviewAutolayoutInspectorNode,
  textAdapter: TextMeasureAdapter | null | undefined,
): number | string {
  if (!chars || chars === 0 || chars === '0' || !textAdapter) return '';
  let reference: { content: string; size: string; weight: string } | undefined;
  if (Array.isArray(node.label_text) && node.label_text.length > 0) {
    reference = {
      content: String(node.label_text[0]),
      size: String(BODY_SIZE),
      weight: '400',
    };
  }
  return Math.round(maxWidthPxFromChars(Number(chars), textAdapter, reference));
}

function resolveDisplayMaxWidth(
  node: PreviewAutolayoutInspectorNode,
  override: Record<string, unknown>,
  textAdapter: TextMeasureAdapter | null | undefined,
): string | number {
  if (override.max_width !== undefined && override.max_width !== '') {
    return override.max_width as string | number;
  }
  if (node.max_width != null && node.max_width !== '') {
    return node.max_width as string | number;
  }
  if (hasExplicitMaxWidthPx(node, override)) return '';
  const chars = resolveMaxWidthCharsValue(node, override);
  if (chars !== '' && chars !== 0 && chars !== '0') {
    return resolveMaxWidthPxPreview(chars, node, textAdapter);
  }
  return '';
}

function roundFixedValue(value: unknown): string | number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : '';
}

function roundSpanValue(value: number | null): string | number {
  if (value == null || !Number.isFinite(value)) return '';
  return Math.round(value * 100) / 100;
}

export function resolveSingleSelectionAutolayoutPanelOptions(options: {
  cid: string;
  node: PreviewAutolayoutInspectorNode | null | undefined;
  override?: Record<string, unknown> | null;
  widthCoerced?: boolean;
  heightCoerced?: boolean;
  widthUnit?: 'px' | 'cols';
  heightUnit?: 'px' | 'rows';
  gridInfo?: Pick<PreviewGridInfo, 'col_widths' | 'col_gap' | 'row_heights' | 'row_gap'> | null;
  baselineStep: number;
  textAdapter?: TextMeasureAdapter | null;
}): SingleSelectionAutolayoutPanelRenderOptions | null {
  if (!options.node) return null;

  const override = options.override ?? {};
  const sizingW = resolvePreviewRuntimeSizingValue({
    cid: options.cid,
    axis: 'w',
    override,
    node: options.node,
    isCoerced: options.widthCoerced,
  }) || 'HUG';
  const sizingH = resolvePreviewRuntimeSizingValue({
    cid: options.cid,
    axis: 'h',
    override,
    node: options.node,
    isCoerced: options.heightCoerced,
  }) || 'HUG';
  const panelState = createSingleSelectionAutolayoutState({
    nodeLayout: options.node.layout,
    childCount: options.node.children ? options.node.children.length : 0,
    hasParent: Boolean(options.node.parent),
    overrideDirection: override.direction as string | null | undefined,
    overrideGapDeltaPresent: Object.prototype.hasOwnProperty.call(override, 'gap_delta'),
    overrideGapDelta: override.gap_delta,
    nodeGapDelta: options.node.data?.gapDelta ?? options.node.data?.gap_delta,
    layoutGap: options.node.layoutGap,
    layoutRowGap: options.node.layoutRowGap,
    layoutColGap: options.node.layoutColGap,
    sizingW,
    sizingH,
    wCoerced: Boolean(options.widthCoerced),
    hCoerced: Boolean(options.heightCoerced),
    hasTextContent: hasPreviewNodeTextContent(options.node),
    positionType: override.position as string | null | undefined,
  });

  let widthFixedValue: string | number = '';
  const widthFixedStep = options.widthUnit === 'cols' ? 1 : options.baselineStep;
  if (panelState.showWidthFixedInput) {
    const rawWidth = override.width !== undefined ? override.width : options.node.data?.width;
    widthFixedValue = options.widthUnit === 'cols'
      ? roundSpanValue(pxToColSpan(options.gridInfo, Number(rawWidth)))
      : roundFixedValue(rawWidth);
  }

  let widthMinValue: string | number = '';
  let widthMaxValue: string | number = '';
  if (panelState.showWidthMinMax) {
    widthMinValue = override.min_width !== undefined ? override.min_width as string | number : (readNodeProp(options.node, 'min_width') as string | number ?? '');
    widthMaxValue = override.max_width !== undefined ? override.max_width as string | number : (readNodeProp(options.node, 'max_width') as string | number ?? '');
  }

  let widthMaxCharsValue: string | number = '';
  let widthMaxCharsDisabled = false;
  if (panelState.showWidthTextMeasure) {
    widthMinValue = override.min_width !== undefined ? override.min_width as string | number : (readNodeProp(options.node, 'min_width') as string | number ?? '');
    widthMaxValue = resolveDisplayMaxWidth(options.node, override, options.textAdapter);
    widthMaxCharsValue = resolveMaxWidthCharsValue(options.node, override);
    widthMaxCharsDisabled = hasExplicitMaxWidthPx(options.node, override);
  }

  let heightFixedValue: string | number = '';
  const heightFixedStep = options.heightUnit === 'rows' ? 1 : options.baselineStep;
  if (panelState.showHeightFixedInput) {
    const rawHeight = override.height !== undefined ? override.height : options.node.data?.height;
    heightFixedValue = options.heightUnit === 'rows'
      ? roundSpanValue(pxToRowSpan(options.gridInfo, Number(rawHeight)))
      : roundFixedValue(rawHeight);
  }

  let heightMinValue: string | number = '';
  let heightMaxValue: string | number = '';
  if (panelState.showHeightMinMax) {
    heightMinValue = override.min_height !== undefined ? override.min_height as string | number : (readNodeProp(options.node, 'min_height') as string | number ?? '');
    heightMaxValue = override.max_height !== undefined ? override.max_height as string | number : (readNodeProp(options.node, 'max_height') as string | number ?? '');
  }

  const positionXValue = panelState.showAbsoluteOffsetControls
    ? (override.x !== undefined ? override.x as string | number : 0)
    : 0;
  const positionYValue = panelState.showAbsoluteOffsetControls
    ? (override.y !== undefined ? override.y as string | number : 0)
    : 0;

  return {
    cid: options.cid,
    panelState,
    widthFixedValue,
    widthFixedStep,
    widthUnit: options.widthUnit ?? 'px',
    showWidthColsOption: Boolean(options.gridInfo?.col_widths?.length),
    widthMinValue,
    widthMaxValue,
    widthMaxCharsValue,
    widthMaxCharsDisabled,
    heightFixedValue,
    heightFixedStep,
    heightUnit: options.heightUnit ?? 'px',
    showHeightRowsOption: Boolean(options.gridInfo?.row_heights?.length),
    heightMinValue,
    heightMaxValue,
    positionXValue,
    positionYValue,
  };
}
