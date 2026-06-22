/**
 * SVG string renderer for batch export (Node + browser).
 * Mirrors scripts/preview/layout-bridge.js DOM renderer.
 */

import {
  Frame,
  FrameDiagram,
  type Arrow,
  type DiagramOverlay,
} from './frame-model.js';
import { resolveArrowPolylineGeometry, type ResolvedArrowheadGeometry } from './arrow-geometry.js';
import { lineTopToBaseline, resolveFrameRenderPlan } from './frame-render-plan.js';
import {
  ICON_SIZE,
  BODY_SIZE,
  BODY_LINE_STEP,
  ARROW_HEAD_LENGTH,
  ARROW_HEAD_HALF_WIDTH,
  ARROW_COLOR,
  sizeToPx,
} from './tokens.js';
import {
  type TextMeasureAdapter,
} from './text-measure.js';
import {
  annotationTextToSpec,
} from './resolved-spec-typography.js';
import type { LayoutOutput } from './layout.js';
import { tintIconInnerMarkup } from './icon-embed.js';
import { routeArrows, type RoutedArrow } from './arrow-routing.js';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(n: number): string {
  return String(Math.round(n * 100) / 100);
}
function renderFrameText(plan: ReturnType<typeof resolveFrameRenderPlan>): string {
  if (!plan.textBlocks.length) return '';
  const parts: string[] = [];
  for (const block of plan.textBlocks) {
    const blockParts: string[] = [];
    for (const line of block.lines) {
      const attrs = [
        `x="${fmt(line.x)}"`,
        `y="${fmt(line.y)}"`,
        `font-size="${esc(line.size)}"`,
        `font-weight="${esc(line.weight)}"`,
        `fill="${esc(line.fill)}"`,
      ];
      if (line.spec.letterSpacing) attrs.push(`letter-spacing="${esc(String(line.spec.letterSpacing))}"`);
      if (line.spec.fontFamily) attrs.push(`font-family="${esc(String(line.spec.fontFamily))}"`);
      if (line.spec.smallCaps) attrs.push('font-variant-caps="small-caps"');
      blockParts.push(`<tspan ${attrs.join(' ')}>${esc(line.spec.content)}</tspan>`);
    }
    parts.push(
      `<text font-family="Ubuntu Sans" data-dg-text-role="${esc(block.role)}" data-dg-text-block-index="${block.blockIndex}">` +
      `${blockParts.join('')}</text>`,
    );
  }
  return parts.join('');
}

function renderIconPlaceholder(plan: ReturnType<typeof resolveFrameRenderPlan>): string {
  if (!plan.icon) return '';
  return `<rect class="dg-icon" x="${fmt(plan.icon.x)}" y="${fmt(plan.icon.y)}" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="${esc(plan.icon.fill)}" opacity="0.15"/>`;
}

function renderIcon(
  plan: ReturnType<typeof resolveFrameRenderPlan>,
  frame: Frame,
  iconMarkupByName: Map<string, string> | undefined,
): string {
  if (!frame.icon || !plan.icon) return '';
  const inner = iconMarkupByName?.get(frame.icon);
  if (!inner) return renderIconPlaceholder(plan);
  const tinted = tintIconInnerMarkup(inner, plan.icon.fill);
  return `<g class="dg-icon" transform="translate(${fmt(plan.icon.x)} ${fmt(plan.icon.y)})">${tinted}</g>`;
}

export interface SvgRenderOptions {
  /** Inner SVG markup per icon file name (from assets/icons). */
  iconMarkupByName?: Map<string, string>;
}

function renderFrameGroup(
  frame: Frame,
  adapter: TextMeasureAdapter,
  iconMarkupByName?: Map<string, string>,
): string {
  const plan = resolveFrameRenderPlan(frame, adapter);
  const parts: string[] = [];
  const cid = plan.componentId ? ` data-component-id="${esc(plan.componentId)}"` : '';

  if (plan.separator) {
    parts.push(
      `<line class="dg-separator" x1="${fmt(plan.separator.x1)}" y1="${fmt(plan.separator.y1)}"` +
      ` x2="${fmt(plan.separator.x2)}" y2="${fmt(plan.separator.y2)}"` +
      ` fill="none" stroke="#000000" stroke-width="1" stroke-miterlimit="10" stroke-dasharray="8 8"/>`,
    );
  }

  const rectAttrs = [
    `x="${fmt(plan.box.x)}"`,
    `y="${fmt(plan.box.y)}"`,
    `width="${fmt(plan.box.width)}"`,
    `height="${fmt(plan.box.height)}"`,
    `fill="${esc(plan.box.fill)}"`,
    `stroke="${esc(plan.box.stroke)}"`,
    `stroke-width="${plan.box.strokeWidth}"`,
    'stroke-miterlimit="10"',
  ];
  if (plan.box.dashed) rectAttrs.push('stroke-dasharray="8 8"');
  parts.push(`<rect ${rectAttrs.join(' ')}/>`);

  const text = renderFrameText(plan);
  if (text) parts.push(text);
  parts.push(renderIcon(plan, frame, iconMarkupByName));

  let inner = parts.join('');
  for (const child of frame.children) {
    inner += renderFrameGroup(child, adapter, iconMarkupByName);
  }
  return `<g${cid}>${inner}</g>`;
}

function arrowheadPolygonPoints(head: ResolvedArrowheadGeometry): string {
  return [
    `${fmt(head.left[0])},${fmt(head.left[1])}`,
    `${fmt(head.tip[0])},${fmt(head.tip[1])}`,
    `${fmt(head.right[0])},${fmt(head.right[1])}`,
  ].join(' ');
}

function labelAnchorForSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  labelGap: number,
): { lx: number; ly: number } {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return { lx: mx + nx * labelGap, ly: my + ny * labelGap };
}

function renderArrows(routed: RoutedArrow[], adapter: TextMeasureAdapter): string {
  const parts: string[] = [];
  for (const arrow of routed) {
    const { points, color, label, labelGap, componentId } = arrow;
    if (points.length < 2) continue;

    const { head, shaftPoints } = resolveArrowPolylineGeometry({
      points,
      headLength: ARROW_HEAD_LENGTH,
      headHalfWidth: ARROW_HEAD_HALF_WIDTH,
    });

    const cid = componentId ? ` data-component-id="${esc(componentId)}"` : '';
    const inner: string[] = [];
    for (let i = 0; i < shaftPoints.length - 1; i++) {
      const [x1, y1] = shaftPoints[i]!;
      const [x2, y2] = shaftPoints[i + 1]!;
      inner.push(
        `<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}"` +
        ` fill="none" stroke="${esc(color)}" stroke-width="1" stroke-miterlimit="10"/>`,
      );
    }
    if (head) inner.push(`<polygon points="${arrowheadPolygonPoints(head)}" fill="${esc(color)}"/>`);

    // Arrow label on longest shaft segment — annotation typography, offset from line.
    if (label && label.length > 0) {
      let bestIdx = 0;
      let bestLen = 0;
      for (let i = 0; i < shaftPoints.length - 1; i++) {
        const [x1, y1] = shaftPoints[i]!;
        const [x2, y2] = shaftPoints[i + 1]!;
        const len = Math.hypot(x2 - x1, y2 - y1);
        if (len > bestLen) {
          bestLen = len;
          bestIdx = i;
        }
      }
      const [mx1, my1] = shaftPoints[bestIdx]!;
      const [mx2, my2] = shaftPoints[bestIdx + 1]!;
      const { lx, ly } = labelAnchorForSegment(mx1, my1, mx2, my2, labelGap);
      const specs = label.map(annotationTextToSpec);
      if (specs.length > 0) {
        const totalHeight = specs.reduce((sum, spec, index) => {
          const lineStep = sizeToPx(spec.lineStep ?? BODY_LINE_STEP);
          return sum + (index === 0 ? 0 : lineStep);
        }, 0);
        let top = ly - totalHeight / 2;
        const tspans: string[] = [];
        for (const spec of specs) {
          const size = String(spec.size ?? BODY_SIZE);
          const weight = spec.weight ?? '400';
          const fill = spec.fill ?? '#666666';
          const lineStep = sizeToPx(spec.lineStep ?? BODY_LINE_STEP);
          const attrs = [
            `x="${fmt(lx)}"`,
            `y="${fmt(lineTopToBaseline(top, size))}"`,
            `font-size="${esc(size)}"`,
            `font-weight="${esc(String(weight))}"`,
            `fill="${esc(fill)}"`,
          ];
          if (spec.letterSpacing) attrs.push(`letter-spacing="${esc(String(spec.letterSpacing))}"`);
          tspans.push(`<tspan ${attrs.join(' ')}>${esc(spec.content)}</tspan>`);
          top += lineStep;
        }
        inner.push(
          `<text font-family="Ubuntu Sans" text-anchor="middle" dominant-baseline="middle">${tspans.join('')}</text>`,
        );
      }
    }

    parts.push(`<g data-dg-arrow="true"${cid}>${inner.join('')}</g>`);
  }
  return parts.join('');
}

// ---------------------------------------------------------------------------
// Overlay rendering (port from layout-bridge.js renderOverlaysSvg)
// ---------------------------------------------------------------------------

function renderOverlays(
  overlays: DiagramOverlay[],
  bounds: Record<string, { x: number; y: number; w: number; h: number }>,
): string {
  const OVERLAY_PAD = 8;
  const parts: string[] = [];
  for (const ov of overlays) {
    const memberBounds = ov.members.filter(m => bounds[m]).map(m => bounds[m]!);
    if (memberBounds.length === 0) continue;

    const minX = Math.min(...memberBounds.map(b => b.x));
    const minY = Math.min(...memberBounds.map(b => b.y));
    const maxX = Math.max(...memberBounds.map(b => b.x + b.w));
    const maxY = Math.max(...memberBounds.map(b => b.y + b.h));

    const rx = minX - OVERLAY_PAD;
    const ry = minY - OVERLAY_PAD;
    const rw = (maxX - minX) + 2 * OVERLAY_PAD;
    const rh = (maxY - minY) + 2 * OVERLAY_PAD;

    const cid = ov.id ? ` data-component-id="${esc(ov.id)}"` : '';
    const inner: string[] = [
      `<rect x="${fmt(rx)}" y="${fmt(ry)}" width="${fmt(rw)}" height="${fmt(rh)}"` +
      ` fill="transparent" stroke="#000000" stroke-width="1" stroke-dasharray="2 4"/>`,
    ];
    if (ov.label) {
      inner.push(
        `<text font-family="Ubuntu Sans" font-size="14" font-weight="400" fill="#000000">` +
        `<tspan x="${fmt(rx + OVERLAY_PAD)}" y="${fmt(ry - 4)}">${esc(ov.label)}</tspan></text>`,
      );
    }
    parts.push(`<g${cid}>${inner.join('')}</g>`);
  }
  return parts.join('');
}

function collectBounds(frame: Frame, out: Record<string, { x: number; y: number; w: number; h: number }> = {}) {
  if (frame.id && !frame.id.startsWith('__')) {
    out[frame.id] = {
      x: frame._layout.placedX,
      y: frame._layout.placedY,
      w: frame._layout.placedW,
      h: frame._layout.placedH,
    };
  }
  for (const child of frame.children) collectBounds(child, out);
  return out;
}

export function renderFrameDiagramToSvg(
  diagram: FrameDiagram,
  result: LayoutOutput,
  adapter: TextMeasureAdapter,
  options?: SvgRenderOptions,
): string {
  const w = result.width || 400;
  const h = result.height || 200;
  const body = renderFrameGroup(diagram.root, adapter, options?.iconMarkupByName);
  const bounds = collectBounds(diagram.root);
  const routed = routeArrows(diagram.arrows, bounds);
  const arrows = renderArrows(routed, adapter);
  const overlays = renderOverlays(diagram.overlays, bounds);
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xml:space="preserve">` +
    `<rect width="${w}" height="${h}" fill="#FFFFFF"/>` +
    arrows +
    body +
    overlays +
    `</svg>\n`
  );
}
