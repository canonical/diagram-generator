/**
 * Preview-shell style helpers (spec 043 slice P).
 *
 * These helpers centralize structural-wrapper detection, authored/rendered style
 * inference, and visible style mutation rules so the legacy browser shell no
 * longer owns the shared style heuristics.
 */

// Box-style semantics for the editor style picker. These MUST match the
// canonical design (DIAGRAM.md / docs/frame-classes.md) and the authored
// `variant:` semantics in frame-record-parser.ts, otherwise a box styled in
// the editor renders differently from the same box authored in YAML.
//
// Height rule (single source of truth): bordered leaves reserve the 64px
// box minimum (default, parent, section, highlight). `annotation` is the only
// intentionally borderless style, so it collapses to bare-text height. This is
// why some styles "maintain a height" and annotation does not — it is a
// borderless text label by design, not a box.
//
// Highlight is a black box with a 1px black border (invisible against the black
// fill, but structurally a bordered leaf). It must NOT be borderless, or it
// collapses to text height and clips its contents.
export const PREVIEW_STYLE_SEMANTICS = {
  default: { level: 1, fill: 'WHITE', border: 'SOLID', style: 'default' },
  parent: { level: 2, fill: 'GREY', border: 'SOLID', style: 'parent' },
  section: { level: 3, fill: 'WHITE', border: 'SOLID', style: 'section' },
  annotation: { fill: 'WHITE', border: 'NONE', style: 'annotation' },
  highlight: { fill: 'BLACK', border: 'SOLID', style: 'highlight' },
} as const;

const STYLEABLE_COMPONENT_TYPES = new Set(['box', 'panel', 'terminal']);

export type PreviewStyleMode = 'picker' | 'structural' | 'none';
export type PreviewStyleOverrideEntry = Record<string, unknown>;
export type PreviewStyleOverrideMap = Record<string, PreviewStyleOverrideEntry | undefined>;

export interface PreviewStyleNodeData extends Record<string, unknown> {
  level?: unknown;
  fill?: unknown;
  border?: unknown;
  heading_text?: unknown;
}

export interface PreviewStyleNode extends Record<string, unknown> {
  children?: Array<unknown> | null;
  data?: PreviewStyleNodeData | null;
  level?: unknown;
  fill?: unknown;
  border?: unknown;
  label_text?: unknown;
}

export interface PreviewRenderedStyleFields {
  fill?: unknown;
  stroke?: unknown;
}

export interface PreviewBoxStylePreset {
  label?: unknown;
}

export type PreviewBoxStyleMap = Record<string, PreviewBoxStylePreset | undefined>;

export const DEFAULT_PREVIEW_BOX_STYLES: PreviewBoxStyleMap = {
  default: { label: 'Child' },
  parent: { label: 'Parent' },
  section: { label: 'Section' },
  annotation: { label: 'Annotation' },
  highlight: { label: 'Highlight' },
};

export interface SingleSelectionPreviewStyleState {
  mode: PreviewStyleMode;
  currentStyle: string;
  originalStyleName: string;
}

export interface MultiSelectionPreviewStyleItem {
  node?: PreviewStyleNode | null;
  componentType?: string | null;
  overrideStyle?: unknown;
  renderedFill?: unknown;
  renderedStroke?: unknown;
}

export interface MultiSelectionPreviewStyleState {
  style: string;
  mixed: boolean;
  count: number;
  originalStyleName: string;
  originalStyleMixed: boolean;
}

function readPreviewStyleNodeProp(
  node: PreviewStyleNode | null | undefined,
  key: string,
): unknown {
  if (!node) return undefined;
  if (node[key] !== undefined && node[key] !== null && node[key] !== '') return node[key];
  if (node.data && node.data[key] !== undefined && node.data[key] !== null) return node.data[key];
  return undefined;
}

function previewNodeHeadingText(node: PreviewStyleNode | null | undefined): string {
  const text = readPreviewStyleNodeProp(node, 'heading_text');
  return text ? String(text) : '';
}

function isPreviewContainerNode(node: PreviewStyleNode | null | undefined): boolean {
  return Boolean(node && Array.isArray(node.children) && node.children.length > 0);
}

export function normalizePreviewStyleName(styleName: unknown): string {
  return typeof styleName === 'string' ? styleName : '';
}

export function resolvePreviewBoxStyleLabel(
  boxStyles: PreviewBoxStyleMap,
  styleName: unknown,
  fallback = 'As defined',
): string {
  const canonicalStyle = normalizePreviewStyleName(styleName);
  const label = boxStyles[canonicalStyle]?.label;
  return typeof label === 'string' && label ? label : fallback;
}

export function formatPreviewDefinedStyleLabel(options: {
  boxStyles: PreviewBoxStyleMap;
  styleName: unknown;
  mixed?: boolean;
}): string {
  if (options.mixed) {
    return '— as defined (mixed) —';
  }
  const canonicalStyle = normalizePreviewStyleName(options.styleName);
  if (canonicalStyle && options.boxStyles[canonicalStyle]) {
    return `— as defined (${resolvePreviewBoxStyleLabel(options.boxStyles, canonicalStyle)}) —`;
  }
  return '— as defined —';
}

export function renderPreviewBoxStyleOptions(options: {
  boxStyles: PreviewBoxStyleMap;
  selectedValue: unknown;
  originalLabel?: string;
}): string {
  const current = options.selectedValue == null ? '' : String(options.selectedValue);
  const resetLabel = options.originalLabel || '— as defined —';
  let html = `<option value=""${current === '' ? ' selected' : ''}>${resetLabel}</option>`;
  for (const key of Object.keys(options.boxStyles)) {
    html += `<option value="${key}"${current === key ? ' selected' : ''}>${resolvePreviewBoxStyleLabel(options.boxStyles, key)}</option>`;
  }
  return html;
}

export function normalizePreviewStyleFill(fill: unknown): string {
  const upper = String(fill || '').toUpperCase();
  if (upper === '#FFFFFF') return 'WHITE';
  if (upper === '#F3F3F3') return 'GREY';
  if (upper === '#000000') return 'BLACK';
  if (upper === 'TRANSPARENT') return 'TRANSPARENT';
  return upper;
}

export function normalizePreviewStyleStrokeOrBorder(value: unknown): string {
  const upper = String(value || '').toUpperCase();
  if (!upper || upper === 'NONE' || upper === 'TRANSPARENT') return 'NONE';
  return 'SOLID';
}

function hasExplicitVisibleContainerStyle(node: PreviewStyleNode | null | undefined): boolean {
  if (!node) return false;
  if (readPreviewStyleNodeProp(node, 'level') != null) return true;
  const fill = normalizePreviewStyleFill(readPreviewStyleNodeProp(node, 'fill'));
  const stroke = normalizePreviewStyleStrokeOrBorder(readPreviewStyleNodeProp(node, 'border'));
  return fill !== 'WHITE' || stroke !== 'NONE';
}

export function isPreviewStructuralWrapper(node: PreviewStyleNode | null | undefined): boolean {
  return isPreviewContainerNode(node)
    && !previewNodeHeadingText(node).trim()
    && !hasExplicitVisibleContainerStyle(node);
}

export function hasPreviewVisibleStylePicker(node: PreviewStyleNode | null | undefined): boolean {
  return !isPreviewStructuralWrapper(node);
}

export function isPreviewStyleableComponentType(componentType: unknown): boolean {
  return STYLEABLE_COMPONENT_TYPES.has(String(componentType || '').toLowerCase());
}

export function inferPreviewStyleFromFields(
  level: unknown,
  fill: unknown,
  strokeOrBorder: unknown,
): string {
  const resolvedFill = normalizePreviewStyleFill(fill);
  const resolvedStroke = normalizePreviewStyleStrokeOrBorder(strokeOrBorder);
  if (resolvedFill === 'BLACK') {
    return 'highlight';
  }
  if (level === 2 && resolvedFill === 'GREY') {
    return 'parent';
  }
  if (level === 3 && resolvedStroke !== 'NONE') {
    return 'section';
  }
  if (level === 1 && resolvedStroke !== 'NONE') {
    return 'default';
  }
  if (resolvedStroke === 'NONE') {
    return 'annotation';
  }
  return '';
}

export function inferPreviewStyleFromNode(node: PreviewStyleNode | null | undefined): string {
  if (!node) return '';
  const level = node.level ?? node.data?.level ?? null;
  const fill = node.fill ?? node.data?.fill;
  const strokeOrBorder = node.border ?? node.data?.border;
  return inferPreviewStyleFromFields(level, fill, strokeOrBorder);
}

export function resolveBasePreviewStyleName(node: PreviewStyleNode | null | undefined): string {
  if (isPreviewStructuralWrapper(node)) return '';
  return inferPreviewStyleFromNode(node);
}

export function resolveEffectivePreviewStyleName(options: {
  node?: PreviewStyleNode | null;
  overrideStyle?: unknown;
  renderedFill?: unknown;
  renderedStroke?: unknown;
}): string {
  const explicit = normalizePreviewStyleName(options.overrideStyle);
  if (explicit) return explicit;
  if (isPreviewStructuralWrapper(options.node)) return '';
  if (options.node) {
    const level = options.node.level ?? options.node.data?.level ?? null;
    const renderedStyle = inferPreviewStyleFromFields(
      level,
      options.renderedFill,
      options.renderedStroke,
    );
    if (renderedStyle) return renderedStyle;
  }
  return inferPreviewStyleFromNode(options.node);
}

export function resolveSingleSelectionPreviewStyleState(options: {
  componentType?: string | null;
  node?: PreviewStyleNode | null;
  overrideStyle?: unknown;
  renderedFill?: unknown;
  renderedStroke?: unknown;
}): SingleSelectionPreviewStyleState {
  if (!options.node || String(options.componentType || '').toLowerCase() === 'arrow') {
    return {
      mode: 'none',
      currentStyle: '',
      originalStyleName: '',
    };
  }
  if (hasPreviewVisibleStylePicker(options.node)) {
    return {
      mode: 'picker',
      currentStyle: resolveEffectivePreviewStyleName(options),
      originalStyleName: resolveBasePreviewStyleName(options.node),
    };
  }
  return {
    mode: 'structural',
    currentStyle: '',
    originalStyleName: '',
  };
}

export function resolveMultiSelectionPreviewStyleState(
  items: Iterable<MultiSelectionPreviewStyleItem>,
): MultiSelectionPreviewStyleState | null {
  let first: string | null = null;
  let mixed = false;
  let count = 0;
  let firstOriginal: string | null = null;
  let originalMixed = false;

  for (const item of items) {
    if (!isPreviewStyleableComponentType(item.componentType)) continue;
    if (!hasPreviewVisibleStylePicker(item.node)) continue;
    count += 1;
    const style = resolveEffectivePreviewStyleName({
      node: item.node,
      overrideStyle: item.overrideStyle,
      renderedFill: item.renderedFill,
      renderedStroke: item.renderedStroke,
    });
    if (first === null) {
      first = style;
    } else if (first !== style) {
      mixed = true;
    }

    const originalStyle = resolveBasePreviewStyleName(item.node);
    if (firstOriginal === null) {
      firstOriginal = originalStyle;
    } else if (firstOriginal !== originalStyle) {
      originalMixed = true;
    }
  }

  if (count === 0) return null;
  return {
    style: mixed ? '__mixed__' : (first || ''),
    mixed,
    count,
    originalStyleName: firstOriginal || '',
    originalStyleMixed: originalMixed,
  };
}

export function applyPreviewStyleFields(
  overrideEntry: PreviewStyleOverrideEntry,
  styleName: unknown,
): boolean {
  const canonicalStyle = normalizePreviewStyleName(styleName);
  const semantic = PREVIEW_STYLE_SEMANTICS[
    canonicalStyle as keyof typeof PREVIEW_STYLE_SEMANTICS
  ];
  if (!semantic) {
    delete overrideEntry.level;
    delete overrideEntry.fill;
    delete overrideEntry.border;
    delete overrideEntry.style;
    return false;
  }
  if (!('level' in semantic) || semantic.level == null) {
    delete overrideEntry.level;
  } else {
    overrideEntry.level = semantic.level;
  }
  overrideEntry.fill = semantic.fill;
  overrideEntry.border = semantic.border;
  overrideEntry.style = semantic.style;
  return true;
}

export function applyVisiblePreviewStyleOverride(options: {
  overrides: PreviewStyleOverrideMap;
  cid: string;
  node?: PreviewStyleNode | null;
  styleName: unknown;
}): boolean {
  if (!options.node) return false;
  const normalizedStyle = normalizePreviewStyleName(options.styleName);
  if (!hasPreviewVisibleStylePicker(options.node) && normalizedStyle) {
    return false;
  }
  if (!options.overrides[options.cid]) options.overrides[options.cid] = {};
  applyPreviewStyleFields(
    options.overrides[options.cid] as PreviewStyleOverrideEntry,
    normalizedStyle,
  );
  return true;
}
