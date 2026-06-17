import type { PreviewRenderedBounds } from './app-interaction-host.js';

/**
 * Preview artboard helpers (spec 043 shell coordinator slice P).
 *
 * These helpers own the "expand when content would clip" policy so editor.js
 * only supplies the current SVG, tree walk roots, and rendered-bounds reader.
 */

export interface PreviewArtboardNode {
  id: string;
  type?: string | null;
  children?: PreviewArtboardNode[] | null;
}

export interface PreviewArtboardBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface PreviewArtboardViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CollectPreviewArtboardBoundsOptions {
  roots?: PreviewArtboardNode[] | null;
  readBounds: (componentId: string) => PreviewRenderedBounds | null | undefined;
}

export interface ResolvePreviewArtboardFitOptions {
  current: PreviewArtboardViewBox;
  contentBounds?: PreviewArtboardBounds | null;
  padding?: number;
}

export interface ResolvePreviewArtboardFitResult extends PreviewArtboardViewBox {
  changed: boolean;
}

export interface AutoFitPreviewArtboardOptions {
  svg: SVGSVGElement;
  roots?: PreviewArtboardNode[] | null;
  readBounds: (componentId: string) => PreviewRenderedBounds | null | undefined;
  padding?: number;
}

function visitArtboardNodes(
  nodes: PreviewArtboardNode[] | null | undefined,
  readBounds: (componentId: string) => PreviewRenderedBounds | null | undefined,
  acc: PreviewArtboardBounds,
): void {
  for (const node of nodes || []) {
    if (node.type !== 'arrow') {
      const bounds = readBounds(node.id);
      if (bounds) {
        acc.minX = Math.min(acc.minX, bounds.left);
        acc.minY = Math.min(acc.minY, bounds.top);
        acc.maxX = Math.max(acc.maxX, bounds.right);
        acc.maxY = Math.max(acc.maxY, bounds.bottom);
      }
    }
    if (node.children?.length) {
      visitArtboardNodes(node.children, readBounds, acc);
    }
  }
}

export function collectPreviewArtboardBounds(
  options: CollectPreviewArtboardBoundsOptions,
): PreviewArtboardBounds | null {
  const acc: PreviewArtboardBounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
  visitArtboardNodes(options.roots || [], options.readBounds, acc);
  if (!Number.isFinite(acc.minX) || !Number.isFinite(acc.minY)) {
    return null;
  }
  return acc;
}

export function resolvePreviewArtboardFit(
  options: ResolvePreviewArtboardFitOptions,
): ResolvePreviewArtboardFitResult {
  const padding = Math.max(0, options.padding ?? 24);
  const current = options.current;
  const bounds = options.contentBounds;
  if (!bounds) {
    return {
      ...current,
      changed: false,
    };
  }

  let nextX = current.x;
  let nextY = current.y;
  let nextRight = current.x + current.width;
  let nextBottom = current.y + current.height;

  if (bounds.minX < current.x) {
    nextX = bounds.minX - padding;
  }
  if (bounds.minY < current.y) {
    nextY = bounds.minY - padding;
  }
  if (bounds.maxX > current.x + current.width) {
    nextRight = bounds.maxX + padding;
  }
  if (bounds.maxY > current.y + current.height) {
    nextBottom = bounds.maxY + padding;
  }

  const nextWidth = nextRight - nextX;
  const nextHeight = nextBottom - nextY;
  const changed = nextX < current.x
    || nextY < current.y
    || nextWidth > current.width
    || nextHeight > current.height;

  return {
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
    changed,
  };
}

export function autoFitPreviewArtboard(
  options: AutoFitPreviewArtboardOptions,
): boolean {
  const contentBounds = collectPreviewArtboardBounds({
    roots: options.roots,
    readBounds: options.readBounds,
  });
  if (!contentBounds) {
    return false;
  }

  const svg = options.svg;
  const viewBox = svg.viewBox.baseVal;
  const current = {
    x: Number(viewBox.x || 0),
    y: Number(viewBox.y || 0),
    width: Number(viewBox.width || parseFloat(svg.getAttribute('width') || '0')),
    height: Number(viewBox.height || parseFloat(svg.getAttribute('height') || '0')),
  };
  const next = resolvePreviewArtboardFit({
    current,
    contentBounds,
    padding: options.padding,
  });
  if (!next.changed) {
    return false;
  }

  svg.setAttribute('viewBox', `${next.x} ${next.y} ${next.width} ${next.height}`);
  svg.setAttribute('width', String(next.width));
  svg.setAttribute('height', String(next.height));
  return true;
}
