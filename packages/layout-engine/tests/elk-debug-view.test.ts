import { describe, expect, it } from 'vitest';
import {
  renderPreviewElkRawView,
} from '../src/preview-engine/elk-debug-view.js';

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

  querySelectorAll(tagName: string): FakeElement[] {
    const matches: FakeElement[] = [];
    const visit = (node: FakeNode): void => {
      for (const child of node.childNodes) {
        if (child instanceof FakeElement) {
          if (child.tagName === tagName) {
            matches.push(child);
          }
          visit(child);
        }
      }
    };
    visit(this);
    return matches;
  }
}

class FakeDocument {
  createElementNS(_namespace: string, tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }
}

describe('ELK debug view helpers', () => {
  const snapshot = {
    originX: 8,
    originY: 8,
    width: 320,
    height: 200,
    engine: 'elk-layered',
    direction: 'TB',
    nodes: [{ id: 'alpha', x: 0, y: 0, width: 120, height: 64 }],
    edges: [],
    debug: {
      authoredTree: {
        id: 'root',
        kind: 'frame',
        status: 'graph-node',
        isEndpoint: false,
        isNativeCompound: false,
        children: [
          {
            id: 'wrapper',
            kind: 'frame',
            status: 'flattened',
            isEndpoint: false,
            isNativeCompound: false,
            children: [],
          },
        ],
      },
      inputGraph: {
        nodes: [{ id: 'alpha', width: 120, height: 64 }],
        edges: [],
      },
      flattenedFrameIds: ['wrapper'],
    },
  } as const;

  it('surfaces the structured debug payload through the raw ELK view toggle', () => {
    const group = renderPreviewElkRawView({
      ownerDocument: new FakeDocument() as unknown as Document,
      snapshot: snapshot as never,
      labelMap: { alpha: 'Alpha' },
    }) as unknown as FakeElement;

    const textContent = group.querySelectorAll('text')
      .map((element) => element.textContent)
      .join('\n');

    expect(group.getAttribute('data-dg-elk-authored-tree')).toContain('"flattened"');
    expect(group.getAttribute('data-dg-elk-input-graph')).toContain('"nodes"');
    expect(textContent).toContain('flattened: wrapper');
  });
});
