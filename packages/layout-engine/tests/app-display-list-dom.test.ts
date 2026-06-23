import { describe, expect, it } from 'vitest';

import type { DisplayListItem, GroupItem } from '../src/render-ir.js';
import { appendPreviewDisplayListItems } from '../src/preview-shell/app-display-list-dom.js';
import { renderPreviewFrameTreeToSvg } from '../src/preview-shell/app-fresh-render.js';
import { createLine, Frame, FrameDiagram } from '../src/frame-model.js';
import { MockTextAdapter } from '../src/text-measure.js';

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
}

class FakeElement extends FakeNode {
  tagName: string;
  attrs: Record<string, string> = {};
  textContent = '';
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

  hasAttribute(name: string): boolean {
    return name in this.attrs;
  }

  set id(value: string) {
    this.setAttribute('id', value);
  }

  get id(): string {
    return this.getAttribute('id') || '';
  }

  get innerHTML(): string {
    return this.childNodes
      .map((child) => child instanceof FakeElement ? child.outerHTML : '')
      .join('');
  }

  get outerHTML(): string {
    const attrs = Object.entries(this.attrs)
      .map(([name, value]) => ` ${name}="${value}"`)
      .join('');
    const content = this.childNodes.length > 0
      ? this.childNodes.map((child) => child instanceof FakeElement ? child.outerHTML : '').join('')
      : this.textContent;
    return `<${this.tagName}${attrs}>${content}</${this.tagName}>`;
  }

  cloneNode(deep = false): FakeElement {
    const clone = new FakeElement(this.ownerDocument, this.tagName);
    clone.attrs = { ...this.attrs };
    clone.textContent = this.textContent;
    if (deep) {
      for (const child of this.childNodes) {
        if (child instanceof FakeElement) {
          clone.appendChild(child.cloneNode(true));
        }
      }
    }
    return clone;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const selectors = selector.split(',').map((value) => value.trim());
    const results: FakeElement[] = [];
    const seen = new Set<FakeElement>();
    for (const entry of selectors) {
      const visit = (node: FakeNode): void => {
        for (const child of node.childNodes) {
          if (child instanceof FakeElement) {
            if (matchesSelector(child, entry) && !seen.has(child)) {
              seen.add(child);
              results.push(child);
            }
            visit(child);
          }
        }
      };
      visit(this);
    }
    return results;
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

class FakeDocument {
  createElementNS(_namespace: string, tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }

  createDocumentFragment(): FakeElement {
    return new FakeElement(this, '#document-fragment');
  }
}

function matchesSelector(element: FakeElement, selector: string): boolean {
  if (selector.startsWith('#')) {
    return element.getAttribute('id') === selector.slice(1);
  }
  const componentIdMatch = selector.match(/^\[data-component-id="(.+)"\]$/);
  if (componentIdMatch) {
    return element.getAttribute('data-component-id') === componentIdMatch[1];
  }
  if (selector === 'text' || selector === 'rect' || selector === 'g' || selector === 'tspan' || selector === 'line' || selector === 'polygon') {
    return element.tagName === selector;
  }
  return false;
}

function findFirstByTag(root: FakeElement, tagName: string): FakeElement | null {
  if (root.tagName === tagName) {
    return root;
  }
  for (const child of root.childNodes) {
    if (child instanceof FakeElement) {
      const match = findFirstByTag(child, tagName);
      if (match) {
        return match;
      }
    }
  }
  return null;
}

function findByAttr(root: FakeElement, name: string, value: string): FakeElement | null {
  if (root.getAttribute(name) === value) {
    return root;
  }
  for (const child of root.childNodes) {
    if (child instanceof FakeElement) {
      const match = findByAttr(child, name, value);
      if (match) {
        return match;
      }
    }
  }
  return null;
}

describe('preview display-list dom', () => {
  it('preserves frame preview metadata when rendering shared IR into DOM', () => {
    const ownerDocument = new FakeDocument();
    const parent = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g');

    const items: DisplayListItem[] = [{
      kind: 'group',
      id: 'alpha',
      layer: 'frame',
      children: [
        {
          kind: 'rect',
          x: 8,
          y: 16,
          width: 240,
          height: 72,
          fill: { color: { r: 1, g: 1, b: 1, a: 1 } },
          stroke: { color: { r: 0, g: 0, b: 0, a: 1 } },
          strokeStyle: { width: 1 },
        },
        {
          kind: 'text-block',
          fontFamily: 'Ubuntu Sans',
          attributes: {
            'data-dg-text-role': 'label',
            'data-dg-text-block-index': '0',
          },
          spans: [{
            x: 16,
            y: 32.92,
            text: 'Shared preview text',
            fontSize: 18,
            fontWeight: 400,
            fill: { color: { r: 0, g: 0, b: 0, a: 1 } },
          }],
        },
        {
          kind: 'rect',
          className: 'dg-icon',
          x: 200,
          y: 24,
          width: 48,
          height: 48,
          fill: { color: { r: 0, g: 0, b: 0, a: 1 } },
          opacity: 0.15,
        },
      ],
    } satisfies GroupItem];

    appendPreviewDisplayListItems({
      ownerDocument: ownerDocument as unknown as Document,
      parent: parent as unknown as SVGGElement,
      items,
      allowedLayers: ['frame'],
    });

    const group = parent.childNodes[0] as FakeElement;
    const frameRect = group.childNodes[0] as FakeElement;
    const text = group.childNodes[1] as FakeElement;
    const icon = group.childNodes[2] as FakeElement;

    expect(group.getAttribute('data-component-id')).toBe('alpha');
    expect(frameRect.getAttribute('data-orig-width')).toBe('240');
    expect(frameRect.getAttribute('data-orig-height')).toBe('72');
    expect(text.getAttribute('data-dg-text-role')).toBe('label');
    expect(text.getAttribute('data-orig-inner')).toContain('<tspan');
    expect(icon.getAttribute('class')).toBe('dg-icon');
    expect(icon.getAttribute('data-orig-tx')).toBe('200');
    expect(icon.getAttribute('data-orig-ty')).toBe('24');
  });

  it('renders frame and overlay layers from shared display-list owners', () => {
    const ownerDocument = new FakeDocument();
    const child = new Frame({
      id: 'child',
      label: [createLine('Child node')],
    });
    child._layout.placedX = 32;
    child._layout.placedY = 40;
    child._layout.placedW = 120;
    child._layout.placedH = 64;

    const root = new Frame({
      id: 'root',
      children: [child],
    });
    root._layout.placedX = 0;
    root._layout.placedY = 0;
    root._layout.placedW = 240;
    root._layout.placedH = 140;

    const diagram = new FrameDiagram({
      root,
      arrows: [{
        source: 'root.bottom',
        target: 'child.top',
        id: 'root-child',
        elkLabels: [{
          text: 'ELK label',
          x: 96,
          y: 20,
          width: 48,
          height: 18,
        }],
      }],
      overlays: [{ id: 'focus', label: 'Focus', members: ['child'] }],
    });

    const svg = renderPreviewFrameTreeToSvg({
      ownerDocument: ownerDocument as unknown as Document,
      diagram,
      result: { width: 240, height: 140 } as never,
      textAdapter: new MockTextAdapter(),
      iconElements: new Map(),
    }) as unknown as FakeElement;

    const styledLayer = findByAttr(svg, 'id', 'dg-styled-layer');
    const frameLayer = findByAttr(svg, 'id', 'dg-frame-layer');
    const arrowLayer = findByAttr(svg, 'id', 'dg-arrow-layer');
    const overlayLayer = findByAttr(svg, 'id', 'dg-overlay-layer');
    const childGroup = frameLayer ? findByAttr(frameLayer, 'data-component-id', 'child') : null;
    const arrowGroup = arrowLayer ? findByAttr(arrowLayer, 'data-component-id', 'root-child') : null;
    const overlayGroup = overlayLayer ? findByAttr(overlayLayer, 'data-component-id', 'focus') : null;
    const frameText = childGroup ? findFirstByTag(childGroup, 'text') : null;
    const arrowLines = arrowGroup?.querySelectorAll('line') ?? [];
    const visibleArrowLines = arrowLines.filter((line) => line.getAttribute('stroke') !== 'transparent');
    const hitArrowLines = arrowLines.filter((line) => line.getAttribute('stroke') === 'transparent');
    const arrowPolygon = arrowGroup?.querySelector('polygon') ?? null;
    const arrowText = arrowGroup ? findFirstByTag(arrowGroup, 'text') : null;
    const overlayText = overlayGroup ? findFirstByTag(overlayGroup, 'text') : null;

    expect(styledLayer).not.toBeNull();
    expect(arrowLayer).not.toBeNull();
    expect(frameLayer).not.toBeNull();
    expect(overlayLayer).not.toBeNull();
    expect(arrowGroup?.getAttribute('data-dg-arrow')).toBe('true');
    expect(visibleArrowLines.length).toBeGreaterThan(0);
    expect(hitArrowLines.length).toBe(visibleArrowLines.length);
    expect(visibleArrowLines[0]?.getAttribute('data-orig-x1')).toBeTruthy();
    expect(hitArrowLines[0]?.style.pointerEvents).toBe('stroke');
    expect(arrowPolygon?.getAttribute('data-orig-points')).toBeTruthy();
    expect(arrowText?.outerHTML).toContain('ELK label');
    expect(childGroup).not.toBeNull();
    expect(frameText?.getAttribute('data-dg-text-role')).toBe('label');
    expect(frameText?.getAttribute('data-orig-inner')).toContain('<tspan');
    expect(overlayGroup).not.toBeNull();
    expect(overlayText?.outerHTML).toContain('Focus');
  });
});
