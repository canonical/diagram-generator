/**
 * Preview inline text editing helpers (spec 043 app slice F).
 *
 * These helpers own text-block targeting, textarea layout planning, and commit
 * patch shaping so editor.js only coordinates live DOM creation and events.
 */

export type PreviewTextEditorRole = 'heading' | 'label' | 'helper';

export interface PreviewTextEditorBlockStyle {
  fontSize: number;
  fontWeight: string;
  fill: string;
  fontFamily: string;
  letterSpacing: string;
  fontVariantCaps: string;
  lineHeight: number;
}

export interface PreviewTextEditStartState {
  textEl: Element;
  blockRole: PreviewTextEditorRole;
  hasHeading: boolean;
  helperText: string[];
  semanticLines: string[];
  style: PreviewTextEditorBlockStyle;
  editorLeft: number;
  editorTop: number;
  editorWidth: number;
  editorMinHeight: number;
  backgroundColor: string;
}

export interface PreviewTextEditCommitResolution {
  changed: boolean;
  normalizedValue: string;
  nextTextOverride: Record<string, unknown> | null;
}

interface RectLike {
  left: number;
  top: number;
  right?: number;
  bottom?: number;
  width: number;
  height: number;
}

function getAttributeString(
  element: Pick<Element, 'getAttribute'> | null | undefined,
  name: string,
  fallback = '',
): string {
  if (!element || typeof element.getAttribute !== 'function') {
    return fallback;
  }
  const value = element.getAttribute(name);
  return typeof value === 'string' ? value : fallback;
}

function parseFiniteNumber(value: string, fallback: number): number {
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getBoundingRect(element: { getBoundingClientRect?: () => RectLike } | null | undefined): RectLike | null {
  if (!element || typeof element.getBoundingClientRect !== 'function') {
    return null;
  }
  return element.getBoundingClientRect();
}

function rectContainsPoint(rect: RectLike, clientX: number, clientY: number, pad = 0): boolean {
  const right = Number.isFinite(rect.right) ? rect.right! : rect.left + rect.width;
  const bottom = Number.isFinite(rect.bottom) ? rect.bottom! : rect.top + rect.height;
  return clientX >= rect.left - pad
    && clientX <= right + pad
    && clientY >= rect.top - pad
    && clientY <= bottom + pad;
}

function isTextOwnedByGroup(text: Element, group: Element): boolean {
  const owner = text.closest?.('[data-component-id]');
  return owner === group;
}

function collectTextElementsForGroup(group: Element): Element[] {
  return Array.from(group.querySelectorAll('text')).filter((text) => isTextOwnedByGroup(text, group));
}

function collectPreviewTextElements(groups: Iterable<Element>): Element[] {
  const seen = new Set<Element>();
  const textElements: Element[] = [];

  for (const group of groups) {
    for (const text of collectTextElementsForGroup(group)) {
      if (!seen.has(text)) {
        seen.add(text);
        textElements.push(text);
      }
    }
  }

  return textElements;
}

export function resolvePreviewTextEditorBlockStyle(textEl: Element | null | undefined): PreviewTextEditorBlockStyle {
  const tspans = Array.from(textEl?.querySelectorAll?.('tspan') || []);
  const first = tspans[0] || null;
  const second = tspans[1] || null;
  const firstY = parseFiniteNumber(getAttributeString(first, 'y', 'NaN'), Number.NaN);
  const secondY = parseFiniteNumber(getAttributeString(second, 'y', 'NaN'), Number.NaN);

  return {
    fontSize: parseFiniteNumber(getAttributeString(first, 'font-size', '14'), 14),
    fontWeight: getAttributeString(first, 'font-weight', '400'),
    fill: getAttributeString(first, 'fill', '#000'),
    fontFamily: getAttributeString(first, 'font-family')
      || getAttributeString(textEl || null, 'font-family')
      || "'Ubuntu Sans', sans-serif",
    letterSpacing: getAttributeString(first, 'letter-spacing'),
    fontVariantCaps: getAttributeString(first, 'font-variant-caps'),
    lineHeight: Number.isFinite(firstY) && Number.isFinite(secondY) && secondY > firstY
      ? (secondY - firstY)
      : 24,
  };
}

export function renderPreviewTextLines(textEl: Element | null | undefined): string[] {
  return Array.from(textEl?.querySelectorAll?.('tspan') || []).map((tspan) => tspan.textContent || '');
}

export function resolvePreviewTextBlockRole(
  textEl: Element | null | undefined,
  hasHeading: boolean,
  fallbackIndex: number,
): PreviewTextEditorRole {
  const explicit = getAttributeString(textEl || null, 'data-dg-text-role');
  if (explicit === 'heading' || explicit === 'label' || explicit === 'helper') {
    return explicit;
  }
  return hasHeading && fallbackIndex === 0 ? 'heading' : 'label';
}

export function findPreviewTextBlockAtPoint(
  textElements: Element[],
  clientX: number,
  clientY: number,
  pad = 2,
): Element | null {
  const hits = textElements
    .map((candidate) => ({ candidate, rect: getBoundingRect(candidate) }))
    .filter((entry): entry is { candidate: Element; rect: RectLike } => Boolean(entry.rect))
    .filter(({ rect }) => rectContainsPoint(rect, clientX, clientY, pad));

  if (hits.length === 0) {
    return null;
  }

  hits.sort((left, right) => left.rect.top - right.rect.top || left.rect.left - right.rect.left);
  return hits[0]!.candidate;
}

export function findPreviewEditableTextTarget(
  target: Element | null | undefined,
  clientX: number,
  clientY: number,
): Element | null {
  if (!target || typeof target.closest !== 'function') {
    return null;
  }

  const directText = target.closest('text[data-dg-text-role], text');
  if (directText) {
    const owner = directText.closest?.('[data-component-id]');
    if (owner) {
      return directText;
    }
  }

  const owner = target.closest('[data-component-id]');
  if (!owner) {
    return null;
  }

  const directTextElements = collectTextElementsForGroup(owner);
  return findPreviewTextBlockAtPoint(directTextElements, clientX, clientY);
}

export function collectPreviewTextEditingGroups(
  root: ParentNode | null | undefined,
  componentId: string,
): Element[] {
  if (!root || !componentId) {
    return [];
  }

  const selectors = [
    `[data-component-id="${componentId}"]`,
    `[data-component-id="${componentId}__heading"]`,
  ];
  const seen = new Set<Element>();
  const groups: Element[] = [];

  for (const selector of selectors) {
    root.querySelectorAll(selector).forEach((group) => {
      if (seen.has(group)) {
        return;
      }
      seen.add(group);
      groups.push(group);
    });
  }

  return groups;
}

export function resolvePreviewEditableComponentId(
  textEl: Element | null | undefined,
  hasComponent: (id: string) => boolean,
): string {
  if (!textEl || typeof textEl.closest !== 'function') {
    return '';
  }

  const owner = textEl.closest('[data-component-id]');
  if (!owner) {
    return '';
  }

  const ownerId = getAttributeString(owner, 'data-component-id');
  if (!ownerId) {
    return '';
  }

  if (hasComponent(ownerId)) {
    return ownerId;
  }

  const authoredParentId = ownerId.replace(/__(heading|body)$/, '');
  if (authoredParentId !== ownerId && hasComponent(authoredParentId)) {
    return authoredParentId;
  }

  return ownerId;
}

export function resolvePreviewTextEditorSurface(fill: string | null | undefined): string {
  if (!fill) {
    return '#FFFFFF';
  }
  const normalized = String(fill).trim().toLowerCase();
  if (!normalized || normalized === 'none' || normalized === 'transparent') {
    return '#FFFFFF';
  }
  return fill;
}

export function resolvePreviewTextEditStartState(options: {
  groups: Element[];
  headingText: string;
  labelText: string[];
  helperText?: string[];
  targetedTextEl?: Element | null;
  iconSize: number;
  columnGap: number;
  insetPx?: number;
  svgScale: number;
}): PreviewTextEditStartState | null {
  const textElements = collectPreviewTextElements(options.groups);
  if (textElements.length === 0) {
    return null;
  }

  const targetedTextEl = options.targetedTextEl && textElements.includes(options.targetedTextEl)
    ? options.targetedTextEl
    : textElements[0]!;
  const hasHeading = Boolean(options.headingText);
  const blockIndex = Math.max(0, textElements.indexOf(targetedTextEl));
  const blockRole = resolvePreviewTextBlockRole(targetedTextEl, hasHeading, blockIndex);
  const renderedLines = renderPreviewTextLines(targetedTextEl);
  const helperText = options.helperText ?? [];
  const semanticLines = blockRole === 'heading'
    ? (options.headingText ? [options.headingText] : renderedLines)
    : blockRole === 'helper'
      ? (helperText.length > 0 ? helperText.slice() : renderedLines)
      : (options.labelText.length > 0 ? options.labelText.slice() : renderedLines);

  if (semanticLines.length === 0) {
    return null;
  }

  let containerRect = getBoundingRect(textElements[0]) || {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  };
  let hasIcon = false;
  let containerFill = '#FFFFFF';

  for (const group of options.groups) {
    const rect = group.querySelector(':scope > rect');
    const rectBounds = getBoundingRect(rect);
    if (rectBounds) {
      containerRect = rectBounds;
      containerFill = getAttributeString(rect, 'fill', containerFill) || containerFill;
    }
    if (group.querySelector(':scope > .dg-icon')) {
      hasIcon = true;
    }
  }

  const blockRect = getBoundingRect(targetedTextEl);
  if (!blockRect) {
    return null;
  }

  const style = resolvePreviewTextEditorBlockStyle(targetedTextEl);
  const insetPx = (options.insetPx ?? 8) * options.svgScale;
  const iconGutter = hasIcon ? (options.iconSize + options.columnGap) * options.svgScale : 0;
  const editorWidth = Math.max(containerRect.width - (insetPx * 2) - iconGutter, 60);

  return {
    textEl: targetedTextEl,
    blockRole,
    hasHeading,
    helperText: helperText.slice(),
    semanticLines,
    style,
    editorLeft: containerRect.left + insetPx,
    editorTop: blockRect.top,
    editorWidth,
    editorMinHeight: Math.max(blockRect.height, semanticLines.length * style.lineHeight * options.svgScale),
    backgroundColor: resolvePreviewTextEditorSurface(containerFill),
  };
}

export function resolvePreviewTextEditCommit(options: {
  currentValue: string;
  originalValue: string;
  existingText: Record<string, unknown> | null | undefined;
  role: PreviewTextEditorRole;
}): PreviewTextEditCommitResolution {
  const normalizedValue = String(options.currentValue || '').replace(/\r/g, '');
  const changed = normalizedValue !== String(options.originalValue || '');
  if (!changed) {
    return {
      changed: false,
      normalizedValue,
      nextTextOverride: null,
    };
  }

  const nextTextOverride = {
    ...(options.existingText && typeof options.existingText === 'object' ? options.existingText : {}),
  };
  if (options.role === 'heading') {
    nextTextOverride.heading = normalizedValue;
  } else if (options.role === 'helper') {
    nextTextOverride.helper = normalizedValue === '' ? [] : normalizedValue.split('\n');
  } else {
    nextTextOverride.label = normalizedValue === '' ? [] : normalizedValue.split('\n');
  }

  return {
    changed: true,
    normalizedValue,
    nextTextOverride,
  };
}
