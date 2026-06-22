import { describe, expect, it } from 'vitest';
import {
  patchPreviewFrameGroup,
} from '../src/preview-shell/app-frame-svg.js';
import { Frame, createLine } from '../src/frame-model.js';
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

  replaceChildren(...nodes: FakeNode[]): void {
    for (const child of this.childNodes) {
      child.parentNode = null;
    }
    this.childNodes = [];
    for (const node of nodes) {
      this.appendChild(node);
    }
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
  style: Record<string, string> = {};
  textContent = '';

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

  querySelectorAll(selector: string): FakeElement[] {
    if (selector === ':scope > .dg-icon') {
      return this.childNodes
        .filter((child): child is FakeElement => child instanceof FakeElement)
        .filter((child) => child.getAttribute('class') === 'dg-icon');
    }

    const selectors = selector.split(',').map((value) => value.trim());
    const matches: FakeElement[] = [];
    const seen = new Set<FakeElement>();

    for (const currentSelector of selectors) {
      const visit = (node: FakeNode): void => {
        for (const child of node.childNodes) {
          if (child instanceof FakeElement) {
            if (child.tagName === currentSelector) {
              if (!seen.has(child)) {
                seen.add(child);
                matches.push(child);
              }
            }
            visit(child);
          }
        }
      };
      visit(this);
    }

    return matches;
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

class FakeDocument {
  createElementNS(_namespace: string, tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }
}

function tspanCount(group: FakeElement): number {
  return group.querySelectorAll('tspan').length;
}

describe('preview frame svg helpers', () => {
  it('reruns text wrapping when a relayout changes the frame width', () => {
    const ownerDocument = new FakeDocument();
    const group = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g');
    const frame = new Frame({
      id: 'alpha',
      label: [createLine('Wider width should unwrap this label during preview relayout.')],
    });
    frame._layout.placedX = 0;
    frame._layout.placedY = 0;
    frame._layout.placedW = 120;
    frame._layout.placedH = 96;

    patchPreviewFrameGroup({
      ownerDocument: ownerDocument as unknown as Document,
      group: group as unknown as SVGGElement,
      frame,
      textAdapter: new MockTextAdapter(),
    });
    const narrowLineCount = tspanCount(group);

    frame._layout.placedW = 320;
    frame._layout.placedH = 64;
    patchPreviewFrameGroup({
      ownerDocument: ownerDocument as unknown as Document,
      group: group as unknown as SVGGElement,
      frame,
      textAdapter: new MockTextAdapter(),
    });
    const wideLineCount = tspanCount(group);

    expect(narrowLineCount).toBeGreaterThan(1);
    expect(wideLineCount).toBeLessThan(narrowLineCount);
  });

  it('preserves preview text and icon metadata while patching a frame group', () => {
    const ownerDocument = new FakeDocument();
    const group = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g');
    const icon = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g');
    icon.setAttribute('class', 'dg-icon');

    const frame = new Frame({
      id: 'alpha',
      icon: 'shield',
      label: [createLine('Preview metadata should survive shared frame planning.')],
    });
    frame._layout.placedX = 8;
    frame._layout.placedY = 16;
    frame._layout.placedW = 240;
    frame._layout.placedH = 72;

    patchPreviewFrameGroup({
      ownerDocument: ownerDocument as unknown as Document,
      group: group as unknown as SVGGElement,
      frame,
      textAdapter: new MockTextAdapter(),
      iconElement: icon as unknown as Element,
    });

    const text = group.querySelector('text');
    const rect = group.querySelector('rect');
    const renderedIcon = group.querySelector(':scope > .dg-icon');

    expect(text?.getAttribute('data-dg-text-role')).toBe('label');
    expect(text?.getAttribute('data-dg-text-block-index')).toBe('0');
    expect(text?.getAttribute('data-orig-inner')).toContain('<tspan');
    expect(rect?.getAttribute('data-orig-width')).toBe('240');
    expect(rect?.getAttribute('data-orig-height')).toBe('72');
    expect(renderedIcon?.getAttribute('data-orig-tx')).toBeTruthy();
    expect(renderedIcon?.getAttribute('data-orig-ty')).toBeTruthy();
  });
});
