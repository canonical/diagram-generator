import {
  resolveFrameRenderPlan,
} from '../frame-render-plan.js';
import { type Frame } from '../frame-model.js';
import { recolorIconElementShapes } from '../icon-markup.js';
import { type TextMeasureAdapter } from '../text-measure.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
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

function directElementChildren(parent: Element): Element[] {
  return Array.from(parent.childNodes).filter((child): child is Element => (
    typeof (child as Element).tagName === 'string'
  ));
}

function buildFrameTextElements(
  ownerDocument: Document,
  plan: ReturnType<typeof resolveFrameRenderPlan>,
) {
  if (plan.textBlocks.length === 0) {
    return { elements: [] as SVGTextElement[] };
  }

  const elements: SVGTextElement[] = [];
  for (const block of plan.textBlocks) {
    const text = ownerDocument.createElementNS(SVG_NS, 'text');
    text.setAttribute('font-family', 'Ubuntu Sans');
    text.setAttribute('data-dg-text-role', block.role);
    text.setAttribute('data-dg-text-block-index', String(block.blockIndex));

    for (const line of block.lines) {
      const tspan = ownerDocument.createElementNS(SVG_NS, 'tspan');
      tspan.setAttribute('x', fmtSvgNumber(line.x));
      tspan.setAttribute('y', fmtSvgNumber(line.y));
      tspan.setAttribute('font-size', line.size);
      tspan.setAttribute('font-weight', line.weight);
      tspan.setAttribute('fill', line.fill);
      if (line.spec.letterSpacing) {
        tspan.setAttribute('letter-spacing', String(line.spec.letterSpacing));
      }
      if (line.spec.fontFamily) {
        tspan.setAttribute('font-family', line.spec.fontFamily);
      }
      if (line.spec.smallCaps) {
        tspan.setAttribute('font-variant-caps', 'small-caps');
      }
      tspan.textContent = line.spec.content;
      text.appendChild(tspan);
    }

    text.setAttribute('data-orig-inner', text.innerHTML);
    elements.push(text);
  }

  return { elements };
}

export function patchPreviewFrameGroup(options: {
  ownerDocument: Document;
  group: SVGGElement;
  frame: Frame;
  textAdapter: TextMeasureAdapter;
  iconElement?: Element | null;
}): void {
  const plan = resolveFrameRenderPlan(options.frame, options.textAdapter);
  const { elements } = buildFrameTextElements(options.ownerDocument, plan);
  const existingIcon = options.group.querySelector(':scope > .dg-icon');
  const preservedChildFrameGroups = directElementChildren(options.group).filter((child) => (
    child !== existingIcon
    && child.tagName.toLowerCase() === 'g'
    && child.getAttribute('data-component-id') != null
  ));
  const children: Element[] = [];

  if (plan.separator) {
    const line = options.ownerDocument.createElementNS(SVG_NS, 'line');
    line.setAttribute('class', 'dg-separator');
    line.setAttribute('x1', fmtSvgNumber(plan.separator.x1));
    line.setAttribute('y1', fmtSvgNumber(plan.separator.y1));
    line.setAttribute('x2', fmtSvgNumber(plan.separator.x2));
    line.setAttribute('y2', fmtSvgNumber(plan.separator.y2));
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#000000');
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-miterlimit', '10');
    line.setAttribute('stroke-dasharray', '8 8');
    children.push(line);
  }

  const rect = options.ownerDocument.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', fmtSvgNumber(plan.box.x));
  rect.setAttribute('y', fmtSvgNumber(plan.box.y));
  rect.setAttribute('width', fmtSvgNumber(plan.box.width));
  rect.setAttribute('height', fmtSvgNumber(plan.box.height));
  rect.setAttribute('fill', plan.box.fill);
  rect.setAttribute('stroke', plan.box.stroke);
  rect.setAttribute('stroke-width', String(plan.box.strokeWidth));
  rect.setAttribute('stroke-miterlimit', '10');
  rect.setAttribute('data-orig-width', fmtSvgNumber(plan.box.width));
  rect.setAttribute('data-orig-height', fmtSvgNumber(plan.box.height));
  if (plan.box.dashed) {
    rect.setAttribute('stroke-dasharray', '8 8');
  }
  if (plan.box.disablePointerEvents) {
    rect.setAttribute('pointer-events', 'none');
  }
  children.push(rect);
  children.push(...elements);

  const iconToUse = (plan.icon ? options.iconElement : null) ?? existingIcon;
  if (plan.icon && iconToUse) {
    iconToUse.setAttribute('transform', `translate(${fmtSvgNumber(plan.icon.x)} ${fmtSvgNumber(plan.icon.y)})`);
    iconToUse.setAttribute('data-orig-tx', fmtSvgNumber(plan.icon.x));
    iconToUse.setAttribute('data-orig-ty', fmtSvgNumber(plan.icon.y));
    recolorIconElementShapes(iconToUse, plan.icon.fill);
    children.push(iconToUse);
  }

  options.group.replaceChildren(...children, ...preservedChildFrameGroups);
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
