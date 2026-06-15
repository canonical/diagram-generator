/**
 * Preview stage SVG host helpers (spec 043 shell coordinator slice M).
 *
 * These helpers own hit-area insertion, hover-class updates, and stage SVG
 * event binding so editor.js stays focused on interaction callbacks.
 */

export interface PreviewStageInteractionHandlers {
  onMouseDown: (event: MouseEvent) => void;
  onDoubleClick: (event: MouseEvent) => void;
  onMouseOver: (event: MouseEvent) => void;
  onMouseOut: (event: MouseEvent) => void;
}

export interface BindPreviewStageSvgInteractionOptions {
  svg: SVGSVGElement;
  previousSvg?: SVGSVGElement | null;
  handlers: PreviewStageInteractionHandlers;
  ensureArrowHitAreas?: ((svg: SVGSVGElement) => void) | null;
  rebuildTreeUi?: (() => void) | null;
}

interface PreviewSvgBbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function hasSvgBBox(value: unknown): value is Element & { getBBox: () => PreviewSvgBbox } {
  return Boolean(value && typeof value === 'object' && 'getBBox' in value);
}

function isElementWithClassList(value: unknown): value is Element & {
  classList: DOMTokenList;
} {
  return Boolean(value && typeof value === 'object' && 'classList' in value);
}

export function ensurePreviewSvgHitAreas(svg: SVGSVGElement): void {
  const svgDocument = svg.ownerDocument;
  const svgNamespace = 'http://www.w3.org/2000/svg';

  svg.querySelectorAll('[data-component-id]').forEach((group) => {
    const hasRect = group.querySelector(':scope > rect');
    const lines = group.querySelectorAll('line');
    const icons = group.querySelectorAll('.dg-icon');

    if (lines.length > 0 && !hasRect) {
      lines.forEach((line) => {
        if (line.getAttribute('data-dg-hit-area') === '1') {
          return;
        }
        const hit = svgDocument.createElementNS(svgNamespace, 'line');
        hit.setAttribute('data-dg-hit-area', '1');
        hit.setAttribute('x1', line.getAttribute('x1') ?? '');
        hit.setAttribute('y1', line.getAttribute('y1') ?? '');
        hit.setAttribute('x2', line.getAttribute('x2') ?? '');
        hit.setAttribute('y2', line.getAttribute('y2') ?? '');
        hit.setAttribute('stroke', 'transparent');
        hit.setAttribute('stroke-width', '12');
        hit.style.pointerEvents = 'stroke';
        group.insertBefore(hit, group.firstChild);
      });
    }

    if (icons.length > 0 && !hasRect) {
      if (group.querySelector(':scope > rect[data-dg-hit-area="1"]')) {
        return;
      }
      if (!hasSvgBBox(group)) {
        return;
      }
      const bbox = group.getBBox();
      const hit = svgDocument.createElementNS(svgNamespace, 'rect');
      hit.setAttribute('data-dg-hit-area', '1');
      hit.setAttribute('x', String(bbox.x));
      hit.setAttribute('y', String(bbox.y));
      hit.setAttribute('width', String(bbox.width));
      hit.setAttribute('height', String(bbox.height));
      hit.setAttribute('fill', 'transparent');
      hit.style.pointerEvents = 'fill';
      group.insertBefore(hit, group.firstChild);
    }
  });
}

export function clearPreviewSvgHoverState(svg: ParentNode): void {
  svg.querySelectorAll('.dg-hover').forEach((element) => {
    if (isElementWithClassList(element)) {
      element.classList.remove('dg-hover');
    }
  });
}

export function syncPreviewSvgHoverState(
  svg: ParentNode,
  hoverCid: string | null | undefined,
): void {
  clearPreviewSvgHoverState(svg);
  if (!hoverCid) {
    return;
  }
  svg.querySelectorAll(`[data-component-id="${hoverCid}"]`).forEach((element) => {
    if (isElementWithClassList(element)) {
      element.classList.add('dg-hover');
    }
  });
}

export function teardownPreviewStageSvgInteraction(
  svg: SVGSVGElement | null | undefined,
  handlers: PreviewStageInteractionHandlers,
): void {
  if (!svg) {
    return;
  }
  svg.removeEventListener('mousedown', handlers.onMouseDown);
  svg.removeEventListener('dblclick', handlers.onDoubleClick);
  svg.removeEventListener('mouseover', handlers.onMouseOver);
  svg.removeEventListener('mouseout', handlers.onMouseOut);
}

export function bindPreviewStageSvgInteraction(
  options: BindPreviewStageSvgInteractionOptions,
): SVGSVGElement {
  ensurePreviewSvgHitAreas(options.svg);
  options.ensureArrowHitAreas?.(options.svg);
  options.rebuildTreeUi?.();

  if (options.previousSvg === options.svg) {
    return options.svg;
  }

  teardownPreviewStageSvgInteraction(options.previousSvg, options.handlers);
  options.svg.addEventListener('mousedown', options.handlers.onMouseDown);
  options.svg.addEventListener('dblclick', options.handlers.onDoubleClick);
  options.svg.addEventListener('mouseover', options.handlers.onMouseOver);
  options.svg.addEventListener('mouseout', options.handlers.onMouseOut);
  return options.svg;
}
