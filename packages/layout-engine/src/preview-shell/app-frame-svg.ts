import { effectiveResolvedStrokeWidth } from '../frame-classes.js';
import { type Frame } from '../frame-model.js';
import { frameOwnedTextBlockGap, frameOwnedTextBlockRole, frameOwnedTextBlocks } from '../resolved-spec-typography.js';
import { BODY_LINE_STEP, BODY_SIZE, ICON_SIZE, INSET, sizeToPx } from '../tokens.js';
import { type TextMeasureAdapter, wrapTextLines } from '../text-measure.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ASCENT_RATIO = 0.94;

export interface PreviewPlacedFrameBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PreviewPlacedFrameBoundsMap = Record<string, PreviewPlacedFrameBounds>;

export interface FitPreviewSvgToRenderedContentOptions {
  svg: SVGSVGElement | null | undefined;
  padding?: number;
  minWidth?: number;
  minHeight?: number;
}

export interface PatchPreviewSvgFromLayoutOptions {
  svg: SVGSVGElement | null | undefined;
  oldBounds: PreviewPlacedFrameBoundsMap;
  newBounds: PreviewPlacedFrameBoundsMap;
  framesById: Record<string, Frame>;
  textAdapter: TextMeasureAdapter;
}

interface PreviewSvgBbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function fmtSvgNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function hasSvgBBox(value: unknown): value is Element & { getBBox: () => PreviewSvgBbox } {
  return Boolean(value && typeof value === 'object' && 'getBBox' in value);
}

function lineTopToBaseline(top: number, size: string | number): number {
  return top + sizeToPx(size) * ASCENT_RATIO;
}

function frameBoxRenderState(frame: Frame, textAdapter: TextMeasureAdapter) {
  const fill = frame.resolvedFill ?? 'transparent';
  const stroke = frame.resolvedStroke ?? 'none';
  const iconColumn = frame.icon ? ICON_SIZE + INSET : 0;
  const textMaxWidth = frame._layout.placedW - frame.paddingLeft - frame.paddingRight - iconColumn;
  let textBlocks = frameOwnedTextBlocks(frame);
  if (textBlocks.length > 0 && textMaxWidth > 0) {
    textBlocks = textBlocks
      .map((block) => wrapTextLines(block, textMaxWidth, textAdapter))
      .filter((block) => block.length > 0);
  }

  const strokeWidth = effectiveResolvedStrokeWidth(frame);
  return {
    fill,
    stroke,
    strokeWidth,
    dashed: frame.border === 'DASHED',
    padTop: frame.paddingTop,
    padRight: frame.paddingRight,
    padBottom: frame.paddingBottom,
    padLeft: frame.paddingLeft,
    textBlocks,
  };
}

function buildFrameTextElements(
  ownerDocument: Document,
  frame: Frame,
  textAdapter: TextMeasureAdapter,
) {
  const renderState = frameBoxRenderState(frame, textAdapter);
  if (renderState.textBlocks.length === 0) {
    return { renderState, elements: [] as SVGTextElement[] };
  }

  const elements: SVGTextElement[] = [];
  let top = frame._layout.placedY + renderState.padTop;
  const x = frame._layout.placedX + renderState.padLeft;

  for (const [blockIndex, block] of renderState.textBlocks.entries()) {
    const text = ownerDocument.createElementNS(SVG_NS, 'text');
    text.setAttribute('font-family', 'Ubuntu Sans');
    text.setAttribute('data-dg-text-role', frameOwnedTextBlockRole(frame, blockIndex));
    text.setAttribute('data-dg-text-block-index', String(blockIndex));

    for (const spec of block) {
      const size = spec.size ?? BODY_SIZE;
      const lineStep = sizeToPx(spec.lineStep ?? BODY_LINE_STEP);
      const tspan = ownerDocument.createElementNS(SVG_NS, 'tspan');
      tspan.setAttribute('x', fmtSvgNumber(x));
      tspan.setAttribute('y', fmtSvgNumber(lineTopToBaseline(top, size)));
      tspan.setAttribute('font-size', String(size));
      tspan.setAttribute('font-weight', String(spec.weight ?? '400'));
      tspan.setAttribute('fill', spec.fill ?? '#000000');
      if (spec.letterSpacing) {
        tspan.setAttribute('letter-spacing', String(spec.letterSpacing));
      }
      if (spec.fontFamily) {
        tspan.setAttribute('font-family', spec.fontFamily);
      }
      if (spec.smallCaps) {
        tspan.setAttribute('font-variant-caps', 'small-caps');
      }
      tspan.textContent = spec.content;
      text.appendChild(tspan);
      top += lineStep;
    }

    text.setAttribute('data-orig-inner', text.innerHTML);
    elements.push(text);
    top += frameOwnedTextBlockGap(frame, blockIndex, renderState.textBlocks.length);
  }

  return { renderState, elements };
}

export function patchPreviewFrameGroup(options: {
  ownerDocument: Document;
  group: SVGGElement;
  frame: Frame;
  textAdapter: TextMeasureAdapter;
  iconElement?: Element | null;
}): void {
  const { renderState, elements } = buildFrameTextElements(
    options.ownerDocument,
    options.frame,
    options.textAdapter,
  );
  const existingIcon = options.group.querySelector(':scope > .dg-icon');
  const children: Element[] = [];

  if (options.frame.role === 'separator') {
    const line = options.ownerDocument.createElementNS(SVG_NS, 'line');
    line.setAttribute('class', 'dg-separator');
    line.setAttribute('x1', fmtSvgNumber(options.frame._layout.placedX));
    line.setAttribute('y1', fmtSvgNumber(options.frame._layout.placedY));
    line.setAttribute('x2', fmtSvgNumber(options.frame._layout.placedX + options.frame._layout.placedW));
    line.setAttribute('y2', fmtSvgNumber(options.frame._layout.placedY));
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#000000');
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-miterlimit', '10');
    line.setAttribute('stroke-dasharray', '8 8');
    children.push(line);
  }

  const rect = options.ownerDocument.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', fmtSvgNumber(options.frame._layout.placedX));
  rect.setAttribute('y', fmtSvgNumber(options.frame._layout.placedY));
  rect.setAttribute('width', fmtSvgNumber(options.frame._layout.placedW));
  rect.setAttribute('height', fmtSvgNumber(options.frame._layout.placedH));
  rect.setAttribute('fill', renderState.fill);
  rect.setAttribute('stroke', renderState.stroke);
  rect.setAttribute('stroke-width', String(renderState.strokeWidth));
  rect.setAttribute('stroke-miterlimit', '10');
  rect.setAttribute('data-orig-width', fmtSvgNumber(options.frame._layout.placedW));
  rect.setAttribute('data-orig-height', fmtSvgNumber(options.frame._layout.placedH));
  if (renderState.dashed) {
    rect.setAttribute('stroke-dasharray', '8 8');
  }
  if (renderState.fill === 'transparent' && renderState.stroke === 'none' && renderState.textBlocks.length === 0) {
    rect.setAttribute('pointer-events', 'none');
  }
  children.push(rect);
  children.push(...elements);

  const iconToUse = (options.frame.icon ? options.iconElement : null) ?? existingIcon;
  if (options.frame.icon && iconToUse) {
    const iconX = options.frame._layout.placedX + options.frame._layout.placedW - renderState.padRight - ICON_SIZE;
    const iconY = options.frame._layout.placedY + renderState.padTop;
    iconToUse.setAttribute('transform', `translate(${fmtSvgNumber(iconX)} ${fmtSvgNumber(iconY)})`);
    iconToUse.setAttribute('data-orig-tx', fmtSvgNumber(iconX));
    iconToUse.setAttribute('data-orig-ty', fmtSvgNumber(iconY));
    children.push(iconToUse);
  }

  options.group.replaceChildren(...children);
}

export function collectPreviewFramesById(
  frame: Frame,
  out: Record<string, Frame> = {},
): Record<string, Frame> {
  if (frame.id && !frame.id.startsWith('__')) {
    out[frame.id] = frame;
  }
  for (const child of frame.children) {
    collectPreviewFramesById(child, out);
  }
  return out;
}

export function collectPreviewPlacedBounds(
  frame: Frame,
  out: PreviewPlacedFrameBoundsMap = {},
): PreviewPlacedFrameBoundsMap {
  if (frame.id && !frame.id.startsWith('__')) {
    const layoutState = frame._layout;
    out[frame.id] = {
      x: layoutState.placedX,
      y: layoutState.placedY,
      w: layoutState.placedW,
      h: layoutState.placedH,
    };
  }
  for (const child of frame.children) {
    collectPreviewPlacedBounds(child, out);
  }
  return out;
}

export function fitPreviewSvgToRenderedContent(
  options: FitPreviewSvgToRenderedContentOptions,
): { x: number; y: number; width: number; height: number } | null {
  if (!options.svg) {
    return null;
  }

  const styledLayer = options.svg.querySelector('#dg-styled-layer');
  if (!hasSvgBBox(styledLayer)) {
    return null;
  }

  let bbox;
  try {
    bbox = styledLayer.getBBox();
  } catch {
    return null;
  }
  if (!bbox || !Number.isFinite(bbox.width) || !Number.isFinite(bbox.height)) {
    return null;
  }

  const padding = Number(options.padding) || 24;
  const minWidth = Math.max(0, Number(options.minWidth) || 0);
  const minHeight = Math.max(0, Number(options.minHeight) || 0);
  const minX = Math.min(0, Math.floor(bbox.x - padding));
  const minY = Math.min(0, Math.floor(bbox.y - padding));
  const maxX = Math.max(minWidth, Math.ceil(bbox.x + bbox.width + padding));
  const maxY = Math.max(minHeight, Math.ceil(bbox.y + bbox.height + padding));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  options.svg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
  options.svg.setAttribute('width', String(width));
  options.svg.setAttribute('height', String(height));

  const background = options.svg.querySelector(':scope > rect:first-of-type');
  if (background) {
    background.setAttribute('x', String(minX));
    background.setAttribute('y', String(minY));
    background.setAttribute('width', String(width));
    background.setAttribute('height', String(height));
  }

  return { x: minX, y: minY, width, height };
}

export function patchPreviewSvgFromLayout(
  options: PatchPreviewSvgFromLayoutOptions,
): void {
  if (!options.svg) {
    return;
  }

  const groups = options.svg.querySelectorAll('[data-component-id]');
  for (const group of groups) {
    const componentId = group.getAttribute('data-component-id') || '';
    const newBounds = options.newBounds[componentId];
    const frame = options.framesById[componentId];

    if (frame && newBounds) {
      patchPreviewFrameGroup({
        ownerDocument: options.svg.ownerDocument,
        group: group as SVGGElement,
        frame,
        textAdapter: options.textAdapter,
        iconElement: null,
      });
      continue;
    }

    const oldBounds = options.oldBounds[componentId];
    if (!oldBounds || !newBounds) {
      continue;
    }

    const dx = newBounds.x - oldBounds.x;
    const dy = newBounds.y - oldBounds.y;
    const dw = newBounds.w - oldBounds.w;
    const dh = newBounds.h - oldBounds.h;

    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      const existing = group.getAttribute('transform') || '';
      const cleaned = existing.replace(/translate\([^)]*\)\s*/, '').trim();
      group.setAttribute('transform', `translate(${dx.toFixed(1)}, ${dy.toFixed(1)}) ${cleaned}`.trim());
    }

    if (Math.abs(dw) > 0.1 || Math.abs(dh) > 0.1) {
      const rect = group.querySelector('rect:first-of-type');
      if (rect) {
        rect.setAttribute('width', String(newBounds.w));
        rect.setAttribute('height', String(newBounds.h));
        rect.setAttribute('data-orig-width', String(newBounds.w));
        rect.setAttribute('data-orig-height', String(newBounds.h));
      }
    }
  }

  const rootBounds = options.newBounds.root || Object.values(options.newBounds)[0];
  if (rootBounds) {
    options.svg.setAttribute('viewBox', `0 0 ${rootBounds.w} ${rootBounds.h}`);
    options.svg.setAttribute('width', String(rootBounds.w));
    options.svg.setAttribute('height', String(rootBounds.h));
    fitPreviewSvgToRenderedContent({
      svg: options.svg,
      minWidth: rootBounds.w,
      minHeight: rootBounds.h,
    });
  }
}
