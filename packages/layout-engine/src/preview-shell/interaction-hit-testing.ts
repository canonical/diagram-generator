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

export function findPreviewComponentAtDepth(
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

export function findDeepestPreviewComponent(
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
