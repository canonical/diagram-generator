import type {
  DisplayListItem,
  DisplayListLayer,
  GroupItem,
  LineItem,
  PathCommand,
  PathItem,
  RectItem,
  SvgFragmentItem,
  TextBlockItem,
} from '../render-ir.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface RenderPreviewDisplayListContext {
  ownerDocument: Document;
  currentLayer: DisplayListLayer | null;
  currentGroupId: string | null;
  frameIconsByComponentId: Map<string, Element> | null;
}

export interface AppendPreviewDisplayListItemsOptions {
  ownerDocument: Document;
  parent: SVGElement | DocumentFragment;
  items: readonly DisplayListItem[];
  allowedLayers?: readonly DisplayListLayer[];
  frameIconsByComponentId?: Map<string, Element> | null;
}

function fmtSvgNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function fmtPreviewArrowNumber(value: number): string {
  return value.toFixed(1);
}

function colorToCss(color: { r: number; g: number; b: number; a: number }): string {
  if (color.a === 0) return 'transparent';
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toUpperCase();
}

function setSharedAttributes(
  element: Element,
  item: {
    className?: string;
    attributes?: Readonly<Record<string, string>>;
    opacity?: number;
  },
): void {
  if (item.className) {
    element.setAttribute('class', item.className);
  }
  if (item.attributes) {
    for (const [name, value] of Object.entries(item.attributes)) {
      element.setAttribute(name, value);
    }
  }
  if (item.opacity != null) {
    element.setAttribute('opacity', String(item.opacity));
  }
}

function renderPathCommands(commands: readonly PathCommand[]): string {
  return commands
    .map((command) => {
      switch (command.kind) {
        case 'M':
        case 'L':
          return `${command.kind} ${fmtSvgNumber(command.x)} ${fmtSvgNumber(command.y)}`;
        case 'Z':
          return 'Z';
      }
    })
    .join(' ');
}

function arrowHeadPolygonPoints(commands: readonly PathCommand[]): string | null {
  if (commands.length !== 4) {
    return null;
  }
  const [first, second, third, fourth] = commands;
  if (first?.kind !== 'M' || second?.kind !== 'L' || third?.kind !== 'L' || fourth?.kind !== 'Z') {
    return null;
  }
  return [
    `${first.x},${first.y}`,
    `${second.x},${second.y}`,
    `${third.x},${third.y}`,
  ].join(' ');
}

function directChildElements(parent: Element): Element[] {
  return Array.from(parent.childNodes).filter((child): child is Element => (
    typeof (child as Element).tagName === 'string'
  ));
}

function finalizePreviewFrameGroup(group: SVGGElement): void {
  const children = directChildElements(group);
  const frameRect = children.find((child) => (
    child.tagName.toLowerCase() === 'rect'
    && !String(child.getAttribute('class') || '').split(/\s+/).includes('dg-icon')
  )) ?? null;
  if (!frameRect) {
    return;
  }

  if (!frameRect.hasAttribute('data-orig-width')) {
    frameRect.setAttribute('data-orig-width', frameRect.getAttribute('width') || '0');
  }
  if (!frameRect.hasAttribute('data-orig-height')) {
    frameRect.setAttribute('data-orig-height', frameRect.getAttribute('height') || '0');
  }

  const hasText = children.some((child) => child.tagName.toLowerCase() === 'text');
  const fill = frameRect.getAttribute('fill');
  const stroke = frameRect.getAttribute('stroke');
  if (!hasText && (fill === 'transparent' || fill === 'none') && (stroke === 'none' || stroke === null)) {
    frameRect.setAttribute('pointer-events', 'none');
  }
}

function renderPreviewRect(
  item: RectItem,
  context: RenderPreviewDisplayListContext,
): Element {
  const isFrameIcon = context.currentLayer === 'frame' && item.className === 'dg-icon';
  if (isFrameIcon) {
    const tx = fmtSvgNumber(item.x);
    const ty = fmtSvgNumber(item.y);
    const icon = context.currentGroupId
      ? context.frameIconsByComponentId?.get(context.currentGroupId) ?? null
      : null;
    if (icon) {
      const clone = icon.cloneNode(true) as Element;
      clone.setAttribute('class', 'dg-icon');
      clone.setAttribute('transform', `translate(${tx} ${ty})`);
      clone.setAttribute('data-orig-tx', tx);
      clone.setAttribute('data-orig-ty', ty);
      return clone;
    }

    const group = context.ownerDocument.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'dg-icon');
    group.setAttribute('transform', `translate(${tx} ${ty})`);
    group.setAttribute('data-orig-tx', tx);
    group.setAttribute('data-orig-ty', ty);

    const rect = context.ownerDocument.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '0');
    rect.setAttribute('width', fmtSvgNumber(item.width));
    rect.setAttribute('height', fmtSvgNumber(item.height));
    rect.setAttribute('fill', colorToCss(item.fill?.color ?? { r: 0, g: 0, b: 0, a: 0 }));
    rect.setAttribute('opacity', String(item.opacity ?? 0.15));
    group.appendChild(rect);
    return group;
  }

  const rect = context.ownerDocument.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', fmtSvgNumber(item.x));
  rect.setAttribute('y', fmtSvgNumber(item.y));
  rect.setAttribute('width', fmtSvgNumber(item.width));
  rect.setAttribute('height', fmtSvgNumber(item.height));
  rect.setAttribute('fill', colorToCss(item.fill?.color ?? { r: 0, g: 0, b: 0, a: 0 }));
  rect.setAttribute('stroke', item.stroke ? colorToCss(item.stroke.color) : 'none');
  if (item.strokeStyle) {
    rect.setAttribute('stroke-width', String(item.strokeStyle.width));
    rect.setAttribute('stroke-miterlimit', '10');
    if (item.strokeStyle.dashArray && item.strokeStyle.dashArray.length > 0) {
      rect.setAttribute('stroke-dasharray', item.strokeStyle.dashArray.join(' '));
    }
  }
  setSharedAttributes(rect, item);
  return rect;
}

function renderPreviewLine(item: LineItem, context: RenderPreviewDisplayListContext): SVGLineElement {
  const line = context.ownerDocument.createElementNS(SVG_NS, 'line');
  const fmt = context.currentLayer === 'arrow' ? fmtPreviewArrowNumber : fmtSvgNumber;
  line.setAttribute('x1', fmt(item.x1));
  line.setAttribute('y1', fmt(item.y1));
  line.setAttribute('x2', fmt(item.x2));
  line.setAttribute('y2', fmt(item.y2));
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', colorToCss(item.stroke.color));
  if (item.strokeStyle) {
    line.setAttribute('stroke-width', String(item.strokeStyle.width));
    line.setAttribute('stroke-miterlimit', '10');
    if (item.strokeStyle.dashArray && item.strokeStyle.dashArray.length > 0) {
      line.setAttribute('stroke-dasharray', item.strokeStyle.dashArray.join(' '));
    }
  }
  setSharedAttributes(line, item);
  return line;
}

function renderPreviewArrowHitLine(
  item: LineItem,
  context: RenderPreviewDisplayListContext,
): SVGLineElement {
  const line = context.ownerDocument.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', fmtPreviewArrowNumber(item.x1));
  line.setAttribute('y1', fmtPreviewArrowNumber(item.y1));
  line.setAttribute('x2', fmtPreviewArrowNumber(item.x2));
  line.setAttribute('y2', fmtPreviewArrowNumber(item.y2));
  line.setAttribute('stroke', 'transparent');
  line.setAttribute('stroke-width', '12');
  const maybeStyled = line as SVGElement & { style?: { pointerEvents?: string } };
  if (maybeStyled.style) {
    maybeStyled.style.pointerEvents = 'stroke';
  }
  line.setAttribute('data-orig-x1', line.getAttribute('x1') || '0');
  line.setAttribute('data-orig-y1', line.getAttribute('y1') || '0');
  line.setAttribute('data-orig-x2', line.getAttribute('x2') || '0');
  line.setAttribute('data-orig-y2', line.getAttribute('y2') || '0');
  return line;
}

function renderPreviewPath(item: PathItem, context: RenderPreviewDisplayListContext): SVGPathElement {
  const path = context.ownerDocument.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', renderPathCommands(item.commands));
  path.setAttribute('fill', item.fill ? colorToCss(item.fill.color) : 'none');
  path.setAttribute('stroke', item.stroke ? colorToCss(item.stroke.color) : 'none');
  if (item.strokeStyle) {
    path.setAttribute('stroke-width', String(item.strokeStyle.width));
    path.setAttribute('stroke-miterlimit', '10');
    if (item.strokeStyle.dashArray && item.strokeStyle.dashArray.length > 0) {
      path.setAttribute('stroke-dasharray', item.strokeStyle.dashArray.join(' '));
    }
  }
  setSharedAttributes(path, item);
  return path;
}

function renderPreviewArrowHead(
  item: PathItem,
  context: RenderPreviewDisplayListContext,
): Element {
  const points = arrowHeadPolygonPoints(item.commands);
  if (!points) {
    return renderPreviewPath(item, context);
  }
  const polygon = context.ownerDocument.createElementNS(SVG_NS, 'polygon');
  polygon.setAttribute('points', points);
  polygon.setAttribute('fill', item.fill ? colorToCss(item.fill.color) : 'none');
  polygon.setAttribute('data-orig-points', points);
  setSharedAttributes(polygon, item);
  return polygon;
}

function renderPreviewTextBlock(
  item: TextBlockItem,
  context: RenderPreviewDisplayListContext,
): SVGTextElement {
  const text = context.ownerDocument.createElementNS(SVG_NS, 'text');
  text.setAttribute('font-family', item.fontFamily ?? 'Ubuntu Sans');
  if (item.textAnchor) {
    text.setAttribute('text-anchor', item.textAnchor);
  }
  if (item.dominantBaseline) {
    text.setAttribute('dominant-baseline', item.dominantBaseline);
  }
  setSharedAttributes(text, item);
  for (const span of item.spans) {
    const tspan = context.ownerDocument.createElementNS(SVG_NS, 'tspan');
    tspan.setAttribute('x', fmtSvgNumber(span.x));
    tspan.setAttribute('y', fmtSvgNumber(span.y));
    tspan.setAttribute('font-size', String(span.fontSize));
    tspan.setAttribute('font-weight', String(span.fontWeight ?? 400));
    tspan.setAttribute('fill', colorToCss(span.fill?.color ?? { r: 0, g: 0, b: 0, a: 1 }));
    if (span.letterSpacing) {
      tspan.setAttribute('letter-spacing', span.letterSpacing);
    }
    if (span.fontFamily) {
      tspan.setAttribute('font-family', span.fontFamily);
    }
    if (span.smallCaps) {
      tspan.setAttribute('font-variant-caps', 'small-caps');
    }
    tspan.textContent = span.text;
    text.appendChild(tspan);
  }
  if (context.currentLayer === 'frame') {
    text.setAttribute('data-orig-inner', text.innerHTML);
  }
  return text;
}

function renderPreviewSvgFragment(
  item: SvgFragmentItem,
  context: RenderPreviewDisplayListContext,
): SVGGElement {
  const group = context.ownerDocument.createElementNS(SVG_NS, 'g');
  setSharedAttributes(group, item);
  const maybeInnerHtml = group as SVGGElement & { innerHTML?: string };
  if (typeof maybeInnerHtml.innerHTML === 'string') {
    maybeInnerHtml.innerHTML = item.markup;
  }
  return group;
}

function renderPreviewGroup(
  item: GroupItem,
  context: RenderPreviewDisplayListContext,
): SVGGElement {
  const group = context.ownerDocument.createElementNS(SVG_NS, 'g');
  if (item.id) {
    group.setAttribute('data-component-id', item.id);
  }
  if ((item.layer ?? context.currentLayer) === 'arrow') {
    group.setAttribute('data-dg-arrow', 'true');
  }
  setSharedAttributes(group, item);
  const nextContext: RenderPreviewDisplayListContext = {
    ownerDocument: context.ownerDocument,
    currentLayer: item.layer ?? context.currentLayer,
    currentGroupId: item.id ?? context.currentGroupId,
    frameIconsByComponentId: context.frameIconsByComponentId,
  };
  for (const child of item.children) {
    appendPreviewGroupChild(group, child, nextContext);
  }
  if (nextContext.currentLayer === 'frame') {
    finalizePreviewFrameGroup(group);
  }
  return group;
}

function appendPreviewGroupChild(
  parent: SVGGElement,
  item: DisplayListItem,
  context: RenderPreviewDisplayListContext,
): void {
  if (context.currentLayer === 'arrow' && item.kind === 'line') {
    const visible = renderPreviewLine(item, context);
    visible.setAttribute('data-orig-x1', visible.getAttribute('x1') || '0');
    visible.setAttribute('data-orig-y1', visible.getAttribute('y1') || '0');
    visible.setAttribute('data-orig-x2', visible.getAttribute('x2') || '0');
    visible.setAttribute('data-orig-y2', visible.getAttribute('y2') || '0');
    parent.appendChild(visible);
    parent.appendChild(renderPreviewArrowHitLine(item, context));
    return;
  }
  if (context.currentLayer === 'arrow' && item.kind === 'path') {
    parent.appendChild(renderPreviewArrowHead(item, context));
    return;
  }
  parent.appendChild(renderPreviewItem(item, context));
}

function renderPreviewItem(
  item: DisplayListItem,
  context: RenderPreviewDisplayListContext,
): Element {
  switch (item.kind) {
    case 'rect':
      return renderPreviewRect(item, context);
    case 'line':
      return renderPreviewLine(item, context);
    case 'path':
      return renderPreviewPath(item, context);
    case 'text-block':
      return renderPreviewTextBlock(item, context);
    case 'svg-fragment':
      return renderPreviewSvgFragment(item, context);
    case 'glyph-run': {
      const textBlock: TextBlockItem = {
        kind: 'text-block',
        fontFamily: item.run.fontFamily ?? 'Ubuntu Sans',
        spans: [{
          x: item.x,
          y: item.y,
          text: item.run.text,
          fontSize: item.run.fontSize,
          fontWeight: item.run.fontWeight,
          fill: item.fill,
          letterSpacing: item.run.letterSpacing ?? null,
          fontFamily: item.run.fontFamily ?? null,
          smallCaps: item.run.smallCaps ?? false,
        }],
      };
      return renderPreviewTextBlock(textBlock, context);
    }
    case 'group':
      return renderPreviewGroup(item, context);
  }
}

export function appendPreviewDisplayListItems(
  options: AppendPreviewDisplayListItemsOptions,
): void {
  const allowedLayers = options.allowedLayers ?? null;
  for (const item of options.items) {
    if (allowedLayers && item.layer && !allowedLayers.includes(item.layer)) {
      continue;
    }
    if (allowedLayers && !item.layer) {
      continue;
    }
    options.parent.appendChild(renderPreviewItem(item, {
      ownerDocument: options.ownerDocument,
      currentLayer: item.layer ?? null,
      currentGroupId: "id" in item ? item.id ?? null : null,
      frameIconsByComponentId: options.frameIconsByComponentId ?? null,
    }));
  }
}
