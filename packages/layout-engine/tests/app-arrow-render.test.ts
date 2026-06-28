import { describe, expect, it, vi } from 'vitest';
import {
  createPreviewArrowSvgFragment,
  patchPreviewArrowSvg,
  routePreviewArrows,
  syncPreviewArrowsInModel,
} from '../src/preview-shell/app-arrow-render.js';
import { createArrow } from '../src/frame-model.js';

class FakeNode {
  ownerDocument: FakeDocument;
  parentNode: FakeNode | null = null;
  childNodes: FakeNode[] = [];
  nodeName: string;

  constructor(ownerDocument: FakeDocument, nodeName: string) {
    this.ownerDocument = ownerDocument;
    this.nodeName = nodeName;
  }

  appendChild<TNode extends FakeNode>(node: TNode): TNode {
    if (node.parentNode) {
      node.remove();
    }
    this.childNodes.push(node);
    node.parentNode = this;
    return node;
  }

  remove(): void {
    if (!this.parentNode) {
      return;
    }
    const siblings = this.parentNode.childNodes;
    const index = siblings.indexOf(this);
    if (index >= 0) {
      siblings.splice(index, 1);
    }
    this.parentNode = null;
  }

  get firstChild(): FakeNode | null {
    return this.childNodes[0] ?? null;
  }
}

class FakeElement extends FakeNode {
  tagName: string;
  attrs: Record<string, string> = {};
  style: Record<string, string> = {};

  constructor(ownerDocument: FakeDocument, tagName: string) {
    super(ownerDocument, tagName);
    this.tagName = tagName;
  }

  setAttribute(name: string, value: string): void {
    this.attrs[name] = value;
  }

  getAttribute(name: string): string | null {
    return this.attrs[name] ?? null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const selectors = selector.split(',').map((value) => value.trim());
    const results: FakeElement[] = [];
    const seen = new Set<FakeElement>();
    for (const entry of selectors) {
      for (const match of collectMatches(this, entry)) {
        if (!seen.has(match)) {
          seen.add(match);
          results.push(match);
        }
      }
    }
    return results;
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

class FakeFragment extends FakeNode {
  constructor(ownerDocument: FakeDocument) {
    super(ownerDocument, '#document-fragment');
  }
}

class FakeDocument {
  createElementNS(_namespace: string, tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }

  createDocumentFragment(): FakeFragment {
    return new FakeFragment(this);
  }
}

function collectMatches(root: FakeNode, selector: string): FakeElement[] {
  if (selector === ':scope > text') {
    return root.childNodes
      .filter((node): node is FakeElement => node instanceof FakeElement)
      .filter((node) => node.tagName === 'text');
  }

  const matches: FakeElement[] = [];
  const visit = (node: FakeNode): void => {
    for (const child of node.childNodes) {
      if (child instanceof FakeElement) {
        if (
          selector === child.tagName
          || (selector === '[data-component-id]' && child.getAttribute('data-component-id') !== null)
          || (selector === 'line' && child.tagName === 'line')
          || (selector === 'polygon' && child.tagName === 'polygon')
          || (selector === 'text' && child.tagName === 'text')
        ) {
          matches.push(child);
        }
      }
      visit(child);
    }
  };

  visit(root);
  return matches;
}

describe('preview arrow render helpers', () => {
  it('creates canonical arrow svg groups with data-dg-arrow markers', () => {
    const ownerDocument = new FakeDocument();

    const fragment = createPreviewArrowSvgFragment({
      ownerDocument: ownerDocument as unknown as Document,
      routedArrows: [{
        componentId: 'edge-1',
        points: [[0, 0], [20, 0]],
        start: [0, 0],
        end: [20, 0],
        waypoints: [],
        color: '#E95420',
      } as any],
      boundsMap: {},
    });

    const group = fragment.firstChild as unknown as FakeElement;
    const lines = group.querySelectorAll('line');
    const polygon = group.querySelector('polygon');

    expect(group.getAttribute('data-dg-arrow')).toBe('true');
    expect(group.getAttribute('data-component-id')).toBe('edge-1');
    expect(lines).toHaveLength(2);
    expect(lines[0]?.getAttribute('x2')).toBe('9.2');
    expect(lines[1]?.getAttribute('stroke')).toBe('transparent');
    expect(lines[1]?.style.pointerEvents).toBe('stroke');
    expect(polygon?.getAttribute('points')).toBe('9.1592,2.9053 20,0 9.1592,-2.9053');
  });

  it('patches existing arrow groups through the shared render owner', () => {
    const ownerDocument = new FakeDocument();
    const svg = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const initialGroup = createPreviewArrowSvgFragment({
      ownerDocument: ownerDocument as unknown as Document,
      routedArrows: [{
        componentId: 'edge-1',
        points: [[0, 0], [20, 0]],
        start: [0, 0],
        end: [20, 0],
        waypoints: [],
        color: '#E95420',
      } as any],
      boundsMap: {},
      headLen: 10,
      headHalf: 5,
    }).firstChild as FakeElement;
    svg.appendChild(initialGroup);

    patchPreviewArrowSvg({
      svg: svg as unknown as ParentNode,
      routedArrows: [{
        componentId: 'edge-1',
        points: [[0, 0], [10, 0], [20, 0]],
        start: [0, 0],
        end: [20, 0],
        waypoints: [[10, 0]],
        color: '#E95420',
      } as any],
      boundsMap: {},
      headLen: 10,
      headHalf: 5,
    });

    const lines = initialGroup.querySelectorAll('line');
    const polygon = initialGroup.querySelector('polygon');

    expect(lines).toHaveLength(4);
    expect(lines[0]?.getAttribute('x2')).toBe('10.0');
    expect(lines[2]?.getAttribute('x2')).toBe('10.0');
    expect(lines[0]?.getAttribute('data-orig-x1')).toBe('0.0');
    expect(lines[2]?.getAttribute('data-orig-x2')).toBe('10.0');
    expect(polygon?.getAttribute('points')).toBe('10,5 20,0 10,-5');
    expect(polygon?.getAttribute('data-orig-points')).toBe('10,5 20,0 10,-5');
  });

  it('patches legacy-rendered arrow groups when routed arrows use canonical preview ids', () => {
    const ownerDocument = new FakeDocument();
    const svg = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const initialGroup = createPreviewArrowSvgFragment({
      ownerDocument: ownerDocument as unknown as Document,
      routedArrows: [{
        componentId: 'public_repo->global_server',
        points: [[396, 64], [396, 88]],
        start: [396, 64],
        end: [396, 88],
        waypoints: [],
        color: '#E95420',
      } as any],
      boundsMap: {},
      headLen: 10,
      headHalf: 5,
    }).firstChild as FakeElement;
    svg.appendChild(initialGroup);

    patchPreviewArrowSvg({
      svg: svg as unknown as ParentNode,
      routedArrows: [{
        componentId: 'arrow:edge:public_repo->global_server',
        legacyComponentId: 'public_repo->global_server',
        points: [[378.67, 144], [402.67, 144]],
        start: [378.67, 144],
        end: [402.67, 144],
        waypoints: [],
        color: '#E95420',
      } as any],
      boundsMap: {},
      headLen: 10,
      headHalf: 5,
    });

    const line = initialGroup.querySelectorAll('line')[0];
    expect(line?.getAttribute('x1')).toBe('378.7');
    expect(line?.getAttribute('y1')).toBe('144.0');
    expect(line?.getAttribute('x2')).toBe('392.7');
    expect(line?.getAttribute('y2')).toBe('144.0');
    expect(line?.getAttribute('data-orig-x1')).toBe('378.7');
    expect(line?.getAttribute('data-orig-y1')).toBe('144.0');
  });

  it('renders authored arrow labels through the shared arrow plan while keeping preview hit lines', () => {
    const ownerDocument = new FakeDocument();

    const fragment = createPreviewArrowSvgFragment({
      ownerDocument: ownerDocument as unknown as Document,
      routedArrows: [{
        componentId: 'edge-2',
        points: [[0, 50], [100, 50]],
        start: [0, 50],
        end: [100, 50],
        waypoints: [],
        color: '#E95420',
        label: [{ content: 'Fast path' }],
        labelGap: 24,
      } as any],
      boundsMap: {
        obstacle: { x: 40, y: 0, w: 20, h: 40 },
      },
    });

    const group = fragment.firstChild as unknown as FakeElement;
    const lines = group.querySelectorAll('line');
    const text = group.querySelector('text');
    const tspan = text?.childNodes[0] as FakeElement | undefined;

    expect(lines).toHaveLength(2);
    expect(lines[1]?.getAttribute('stroke')).toBe('transparent');
    expect(text).not.toBeNull();
    expect(text?.getAttribute('text-anchor')).toBe('middle');
    expect(tspan?.getAttribute('fill')).toBe('#666666');
    expect(Number(tspan?.getAttribute('y') || '0')).toBeGreaterThan(50);
  });

  it('syncs routed arrow payloads back into the preview model with stable ids', () => {
    const loaded: unknown[] = [];
    const model = {
      loadArrows(payload: unknown) {
        loaded.push(payload);
      },
    };

    syncPreviewArrowsInModel(
      model,
      [{ source: 'alpha', target: 'beta', color: '#f60' }] as any,
      [{ componentId: 'arrow:edge:alpha->beta', waypoints: [[8, 16]] }] as any,
    );

    expect(loaded).toEqual([[
      {
        id: 'arrow:edge:alpha->beta',
        source: 'alpha',
        target: 'beta',
        color: '#f60',
        waypoints: [[8, 16]],
        authoredWaypoints: [],
      },
    ]]);
  });

  it('routes arrow:<id> preview attachments without clobbering authored arrow ids', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const routed = routePreviewArrows(
        [
          createArrow('source.bottom', 'target.top', { id: 'stem' }),
          createArrow('arrow:stem', 'branch.left'),
        ],
        {
          source: { x: 100, y: 0, w: 60, h: 40 },
          target: { x: 100, y: 140, w: 60, h: 40 },
          branch: { x: 220, y: 60, w: 60, h: 40 },
        },
      );

      expect(warn).not.toHaveBeenCalled();
      expect(routed).toHaveLength(2);
      expect(routed[0]?.componentId).toBe('arrow:id:stem');
      expect(routed[1]?.componentId).toBe('arrow:edge:arrow%3Astem->branch.left');
      expect(routed[1]?.start).toEqual([130, 80]);
      expect(routed[1]?.end).toEqual([220, 80]);
    } finally {
      warn.mockRestore();
    }
  });
});
