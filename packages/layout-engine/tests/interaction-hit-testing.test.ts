import { describe, expect, it } from 'vitest';
import {
  findDeepestPreviewComponent,
  findPreviewComponentAtDepth,
  type PreviewHitNodeBounds,
  type PreviewHitTestNode,
} from '../src/preview-shell/interaction-hit-testing.js';

const nodeBounds = new Map<string, PreviewHitNodeBounds>();

function createNode(
  id: string,
  bounds: PreviewHitNodeBounds,
  children: PreviewHitTestNode[] = [],
): PreviewHitTestNode {
  nodeBounds.set(id, bounds);
  return {
    id,
    x: bounds.nx,
    y: bounds.ny,
    width: bounds.nw,
    height: bounds.nh,
    children,
  };
}

function getNodeBounds(node: PreviewHitTestNode): PreviewHitNodeBounds {
  const bounds = nodeBounds.get(node.id);
  if (!bounds) {
    throw new Error(`missing bounds for ${node.id}`);
  }
  return bounds;
}

describe('preview interaction hit-testing', () => {
  it('returns the direct child or descendant when depth zero hits a nested top-level node', () => {
    nodeBounds.clear();
    const nested = createNode('nested', { nx: 20, ny: 20, nw: 20, nh: 20, hasRenderedRect: true });
    const child = createNode('child', { nx: 10, ny: 10, nw: 60, nh: 60, hasRenderedRect: true }, [nested]);
    const root = createNode('root', { nx: 0, ny: 0, nw: 100, nh: 100, hasRenderedRect: true }, [child]);

    const hitId = findPreviewComponentAtDepth({
      x: 25,
      y: 25,
      targetDepth: 0,
      roots: [root],
      getNodeBounds,
    });

    expect(hitId).toBe('nested');
  });

  it('falls through to a rendered descendant when the target node has no rendered rect', () => {
    nodeBounds.clear();
    const rendered = createNode('rendered', { nx: 15, ny: 15, nw: 20, nh: 20, hasRenderedRect: true });
    const proxy = createNode('proxy', { nx: 0, ny: 0, nw: 60, nh: 60, hasRenderedRect: false }, [rendered]);

    const hitId = findPreviewComponentAtDepth({
      x: 20,
      y: 20,
      targetDepth: 0,
      roots: [proxy],
      getNodeBounds,
    });

    expect(hitId).toBe('rendered');
  });

  it('picks the nearest center when overlapping nodes share the target depth', () => {
    nodeBounds.clear();
    const left = createNode('left', { nx: 0, ny: 0, nw: 40, nh: 40, hasRenderedRect: true });
    const right = createNode('right', { nx: 10, ny: 0, nw: 40, nh: 40, hasRenderedRect: true });

    const hitId = findPreviewComponentAtDepth({
      x: 35,
      y: 20,
      targetDepth: 0,
      roots: [left, right],
      getNodeBounds,
    });

    expect(hitId).toBe('right');
  });

  it('returns the deepest nested component for ctrl-click hit testing', () => {
    nodeBounds.clear();
    const grandchild = createNode('grandchild', { nx: 30, ny: 30, nw: 20, nh: 20, hasRenderedRect: true });
    const child = createNode('child', { nx: 10, ny: 10, nw: 60, nh: 60, hasRenderedRect: true }, [grandchild]);
    const root = createNode('root', { nx: 0, ny: 0, nw: 100, nh: 100, hasRenderedRect: true }, [child]);

    const hitId = findDeepestPreviewComponent({
      x: 35,
      y: 35,
      roots: [root],
      getNodeBounds,
    });

    expect(hitId).toBe('grandchild');
  });
});
