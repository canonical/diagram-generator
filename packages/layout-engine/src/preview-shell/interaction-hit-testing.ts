/**
 * Preview selection hit-testing helpers (spec 043 interaction slice D).
 *
 * These helpers own the depth-aware component search logic so editor.js only
 * supplies rendered bounds from the current SVG DOM.
 */

export interface PreviewHitTestNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type?: string | null;
  children?: PreviewHitTestNode[];
}

export interface PreviewHitNodeBounds {
  nx: number;
  ny: number;
  nw: number;
  nh: number;
  hasRenderedRect: boolean;
}

export interface PreviewHitTestOptions {
  x: number;
  y: number;
  roots: PreviewHitTestNode[];
  getNodeBounds: (node: PreviewHitTestNode) => PreviewHitNodeBounds;
}

export interface PreviewHitTestDeltaLike {
  dx?: number | null;
  dy?: number | null;
  dw?: number | null;
  dh?: number | null;
}

export interface PreviewArrowHitTestHostElementLike {
  closest: (selector: string) => PreviewArrowHitTestHostAttributeElementLike | null;
}

export interface PreviewArrowHitTestHostAttributeElementLike {
  getAttribute: (name: string) => string | null;
}

export interface PreviewArrowHitTestHostSvgLike {
  contains: (node: unknown) => boolean;
}

export interface PreviewArrowHitTestHostDocumentLike {
  querySelector: (selector: string) => PreviewArrowHitTestHostSvgLike | null;
  elementFromPoint: (x: number, y: number) => PreviewArrowHitTestHostElementLike | null;
}

export interface FindPreviewArrowAtPointHostOptions<TNode = unknown> {
  document: PreviewArrowHitTestHostDocumentLike;
  clientX: number;
  clientY: number;
  getNode: (id: string) => TNode | null | undefined;
  getNodeType?: (node: TNode | null | undefined) => string | null | undefined;
}

export interface PreviewHitBoundsHostRectLike {
  getAttribute: (name: string) => string | null;
}

export interface PreviewHitBoundsHostGroupLike {
  querySelector: (selector: string) => PreviewHitBoundsHostRectLike | null;
  style?: {
    transform?: string | null;
  } | null;
}

export interface PreviewHitBoundsHostSvgLike {
  querySelector: (selector: string) => PreviewHitBoundsHostGroupLike | null;
}

export interface ReadPreviewHitNodeBoundsHostOptions {
  svg: PreviewHitBoundsHostSvgLike;
  node: PreviewHitTestNode;
  getEffectiveDelta: (id: string) => PreviewHitTestDeltaLike | null | undefined;
  getOwnDelta: (id: string) => PreviewHitTestDeltaLike | null | undefined;
}

export interface FindPreviewComponentAtDepthHostOptions {
  document: {
    querySelector: (selector: string) => PreviewHitBoundsHostSvgLike | null;
  };
  x: number;
  y: number;
  targetDepth: number;
  roots: PreviewHitTestNode[];
  getEffectiveDelta: (id: string) => PreviewHitTestDeltaLike | null | undefined;
  getOwnDelta: (id: string) => PreviewHitTestDeltaLike | null | undefined;
}

export interface FindDeepestPreviewComponentHostOptions {
  document: {
    querySelector: (selector: string) => PreviewHitBoundsHostSvgLike | null;
  };
  x: number;
  y: number;
  roots: PreviewHitTestNode[];
  getEffectiveDelta: (id: string) => PreviewHitTestDeltaLike | null | undefined;
  getOwnDelta: (id: string) => PreviewHitTestDeltaLike | null | undefined;
}

function numberOrZero(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function pointWithinBounds(
  x: number,
  y: number,
  bounds: PreviewHitNodeBounds,
): boolean {
  return x >= bounds.nx
    && x <= bounds.nx + bounds.nw
    && y >= bounds.ny
    && y <= bounds.ny + bounds.nh;
}

function pointDistanceFromBoundsCenter(
  x: number,
  y: number,
  bounds: PreviewHitNodeBounds,
): number {
  const cx = bounds.nx + bounds.nw / 2;
  const cy = bounds.ny + bounds.nh / 2;
  return (x - cx) * (x - cx) + (y - cy) * (y - cy);
}

function findPreviewComponentAtDepthCore(
  options: PreviewHitTestOptions & { targetDepth: number },
): string | null {
  function findRenderedDescendant(nodes: PreviewHitTestNode[]): string | null {
    let bestId: string | null = null;
    let bestDistance = Infinity;

    for (const node of nodes) {
      const bounds = options.getNodeBounds(node);
      if (!pointWithinBounds(options.x, options.y, bounds)) {
        continue;
      }

      if (bounds.hasRenderedRect) {
        const distance = pointDistanceFromBoundsCenter(options.x, options.y, bounds);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = node.id;
        }
        continue;
      }

      if (node.children && node.children.length > 0) {
        const childId = findRenderedDescendant(node.children);
        if (childId) {
          return childId;
        }
      }
    }

    return bestId;
  }

  function findContainingImmediateChild(nodes: PreviewHitTestNode[]): PreviewHitTestNode | null {
    let bestNode: PreviewHitTestNode | null = null;
    let bestDistance = Infinity;

    for (const node of nodes) {
      const bounds = options.getNodeBounds(node);
      if (!pointWithinBounds(options.x, options.y, bounds)) {
        continue;
      }

      const distance = pointDistanceFromBoundsCenter(options.x, options.y, bounds);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestNode = node;
      }
    }

    return bestNode;
  }

  function findContainingDescendant(nodes: PreviewHitTestNode[]): PreviewHitTestNode | null {
    let bestNode: PreviewHitTestNode | null = null;
    let bestDistance = Infinity;

    for (const node of nodes) {
      const bounds = options.getNodeBounds(node);
      if (!pointWithinBounds(options.x, options.y, bounds)) {
        continue;
      }

      if (node.children && node.children.length > 0) {
        const nestedNode = findContainingDescendant(node.children);
        if (nestedNode) {
          return nestedNode;
        }
      }

      const distance = pointDistanceFromBoundsCenter(options.x, options.y, bounds);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestNode = node;
      }
    }

    return bestNode;
  }

  function walk(nodes: PreviewHitTestNode[], depth: number): string | null {
    let bestId: string | null = null;
    let bestDistance = Infinity;

    for (const node of nodes) {
      const bounds = options.getNodeBounds(node);
      if (!pointWithinBounds(options.x, options.y, bounds)) {
        continue;
      }

      if (depth === options.targetDepth) {
        if (depth === 0 && node.children && node.children.length > 0) {
          const directChild = findContainingImmediateChild(node.children);
          if (directChild) {
            if (directChild.children && directChild.children.length > 0) {
              const descendant = findContainingDescendant(directChild.children);
              if (descendant) {
                return descendant.id;
              }
            }
            return directChild.id;
          }
        }

        if (!bounds.hasRenderedRect && node.children && node.children.length > 0) {
          const renderedChild = findRenderedDescendant(node.children);
          if (renderedChild) {
            return renderedChild;
          }
        }

        const distance = pointDistanceFromBoundsCenter(options.x, options.y, bounds);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = node.id;
        }
      } else if (node.children && node.children.length > 0 && depth < options.targetDepth) {
        const childId = walk(node.children, depth + 1);
        if (childId) {
          return childId;
        }
      }
    }

    return bestId;
  }

  return walk(options.roots, 0);
}

function findDeepestPreviewComponentCore(
  options: PreviewHitTestOptions,
): string | null {
  function walk(nodes: PreviewHitTestNode[]): string | null {
    for (const node of nodes) {
      const bounds = options.getNodeBounds(node);
      if (!pointWithinBounds(options.x, options.y, bounds)) {
        continue;
      }

      if (node.children && node.children.length > 0) {
        const deeperId = walk(node.children);
        if (deeperId) {
          return deeperId;
        }
      }

      return node.id;
    }

    return null;
  }

  return walk(options.roots);
}

export function findPreviewArrowAtPoint<TNode = unknown>(
  options: FindPreviewArrowAtPointHostOptions<TNode>,
): string | null {
  const svg = options.document.querySelector('#stage svg');
  if (!svg) {
    return null;
  }

  const element = options.document.elementFromPoint(options.clientX, options.clientY);
  if (!element || !svg.contains(element)) {
    return null;
  }

  const host = element.closest('[data-component-id]');
  if (!host || !svg.contains(host)) {
    return null;
  }

  const componentId = host.getAttribute('data-component-id');
  if (!componentId) {
    return null;
  }

  const node = options.getNode(componentId);
  const nodeType = options.getNodeType
    ? options.getNodeType(node)
    : (node as { type?: string | null } | null | undefined)?.type;
  return nodeType === 'arrow' ? componentId : null;
}

export function readPreviewHitNodeBoundsHost(
  options: ReadPreviewHitNodeBoundsHostOptions,
): PreviewHitNodeBounds {
  let nx: number;
  let ny: number;
  let nw: number;
  let nh: number;

  const group = options.svg.querySelector(`[data-component-id="${options.node.id}"]`);
  const rect = group?.querySelector(':scope > rect:first-of-type') ?? null;
  if (rect) {
    nx = numberOrZero(rect.getAttribute('x'));
    ny = numberOrZero(rect.getAttribute('y'));
    nw = numberOrZero(rect.getAttribute('width'));
    nh = numberOrZero(rect.getAttribute('height'));
  } else {
    const effective = options.getEffectiveDelta(options.node.id);
    const own = options.getOwnDelta(options.node.id);
    nx = options.node.x + numberOrZero(effective?.dx);
    ny = options.node.y + numberOrZero(effective?.dy);
    nw = options.node.width + numberOrZero(own?.dw);
    nh = options.node.height + numberOrZero(own?.dh);
  }

  const transform = group?.style?.transform ?? '';
  const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(transform);
  if (match) {
    nx += numberOrZero(match[1]);
    ny += numberOrZero(match[2]);
  }

  return {
    nx,
    ny,
    nw,
    nh,
    hasRenderedRect: Boolean(rect),
  };
}

export function findPreviewComponentAtDepth(
  options: PreviewHitTestOptions & { targetDepth: number },
): string | null;
export function findPreviewComponentAtDepth(
  options: FindPreviewComponentAtDepthHostOptions,
): string | null;
export function findPreviewComponentAtDepth(
  options: (PreviewHitTestOptions & { targetDepth: number }) | FindPreviewComponentAtDepthHostOptions,
): string | null {
  if (!('document' in options)) {
    return findPreviewComponentAtDepthCore(options);
  }

  const svg = options.document.querySelector('#stage svg');
  if (!svg) {
    return null;
  }

  return findPreviewComponentAtDepthCore({
    x: options.x,
    y: options.y,
    targetDepth: options.targetDepth,
    roots: options.roots,
    getNodeBounds: (node) => readPreviewHitNodeBoundsHost({
      svg,
      node,
      getEffectiveDelta: options.getEffectiveDelta,
      getOwnDelta: options.getOwnDelta,
    }),
  });
}

export function findDeepestPreviewComponent(
  options: PreviewHitTestOptions,
): string | null;
export function findDeepestPreviewComponent(
  options: FindDeepestPreviewComponentHostOptions,
): string | null;
export function findDeepestPreviewComponent(
  options: PreviewHitTestOptions | FindDeepestPreviewComponentHostOptions,
): string | null {
  if (!('document' in options)) {
    return findDeepestPreviewComponentCore(options);
  }

  const svg = options.document.querySelector('#stage svg');
  if (!svg) {
    return null;
  }

  return findDeepestPreviewComponentCore({
    x: options.x,
    y: options.y,
    roots: options.roots,
    getNodeBounds: (node) => readPreviewHitNodeBoundsHost({
      svg,
      node,
      getEffectiveDelta: options.getEffectiveDelta,
      getOwnDelta: options.getOwnDelta,
    }),
  });
}
