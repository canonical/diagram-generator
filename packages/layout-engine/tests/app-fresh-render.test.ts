import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { routePreviewArrowsMock } = vi.hoisted(() => ({
  routePreviewArrowsMock: vi.fn(() => []),
}));

vi.mock('../src/preview-shell/app-arrow-render.js', async () => {
  const actual = await vi.importActual<typeof import('../src/preview-shell/app-arrow-render.js')>(
    '../src/preview-shell/app-arrow-render.js',
  );
  return {
    ...actual,
    routePreviewArrows: routePreviewArrowsMock,
  };
});

import {
  filterPreviewEngineLayoutOptionOverrides,
  renderFreshPreviewSvg,
} from '../src/preview-shell/app-fresh-render.js';
import { commitPreviewSwitchNode } from '../src/preview-shell/preview-switch-node.js';
import { loadFrameYaml } from '../src/frame-yaml-loader.js';
import { serializeFrameDiagram } from '../src/frame-serialize.js';
import { MockTextAdapter } from '../src/text-measure.js';
import { loadNormalizedFrameFixture } from './helpers/frame-fixture-normalization.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FRAMES_DIR = join(__dirname, '../../..', 'scripts/diagrams/frames');

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

describe('renderFreshPreviewSvg', () => {
  beforeEach(() => {
    routePreviewArrowsMock.mockClear();
  });

  it('filters persisted layout overrides to the active engine control manifest', () => {
    const filtered = filterPreviewEngineLayoutOptionOverrides(
      {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.randomSeed': '17',
        'elk.separateConnectedComponents': 'true',
      },
      {
        controlSpecs: [
          {
            key: 'elk.algorithm',
            label: 'Algorithm',
            group: 'ELK',
            kind: 'text',
            defaultValue: 'layered',
          },
          {
            key: 'elk.direction',
            label: 'Direction',
            group: 'ELK',
            kind: 'text',
            defaultValue: 'RIGHT',
          },
        ],
      },
    );

    expect(filtered).toEqual({
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
    });
  });

  it('drops hidden dependency-gated overrides from the active engine control manifest', () => {
    const filtered = filterPreviewEngineLayoutOptionOverrides(
      {
        'elk.force.model': 'EADES',
        'elk.force.temperature': '0.02',
        'elk.force.repulsion': '7',
      },
      {
        controlSpecs: [
          {
            key: 'elk.force.model',
            label: 'Force model',
            group: 'Graph',
            kind: 'enum',
            defaultValue: 'FRUCHTERMAN_REINGOLD',
            enumValues: [
              { value: 'FRUCHTERMAN_REINGOLD', label: 'Fruchterman-Reingold' },
              { value: 'EADES', label: 'Eades' },
            ],
          },
          {
            key: 'elk.force.temperature',
            label: 'FR temperature',
            group: 'Graph',
            kind: 'number',
            defaultValue: '0.001',
            visibleWhen: [{ key: 'elk.force.model', equals: 'FRUCHTERMAN_REINGOLD' }],
          },
          {
            key: 'elk.force.repulsion',
            label: 'Eades repulsion',
            group: 'Graph',
            kind: 'number',
            defaultValue: '5',
            visibleWhen: [{ key: 'elk.force.model', equals: 'EADES' }],
          },
        ],
      },
    );

    expect(filtered).toEqual({
      'elk.force.model': 'EADES',
      'elk.force.repulsion': '7',
    });
  });

  it('clears stale authored arrow geometry before reroute-bearing fresh renders', async () => {
    const ownerDocument = new FakeDocument();
    const model = {};

    await renderFreshPreviewSvg({
      ownerDocument: ownerDocument as unknown as Document,
      frameTreeJson: {
        title: 'Fresh reroute invalidation',
        root: {
          id: 'page',
          direction: 'HORIZONTAL',
          width: 720,
          sizingW: 'FIXED',
          sizingH: 'HUG',
          children: [
            {
              id: 'alpha',
              heading: { content: 'Alpha' },
              label: [{ content: 'One' }],
              sizingW: 'HUG',
              sizingH: 'HUG',
            },
            {
              id: 'beta',
              heading: { content: 'Beta' },
              label: [{ content: 'Two' }],
              sizingW: 'HUG',
              sizingH: 'HUG',
            },
          ],
        },
        arrows: [
          {
            source: 'alpha',
            target: 'beta',
            waypoints: [[200, 160], [200, -8]],
            layoutPath: [[100, 120], [180, 120], [180, 64]],
          },
        ],
        gridCols: 2,
      },
      overrides: {
        alpha: { sizing_w: 'FIXED', width: 480 },
      },
      gridOverrides: {},
      model,
      textAdapter: new MockTextAdapter(),
      applySessionRemovalsToDiagramJson: null,
      applyOverridesToFrameTree: vi.fn(),
      collectRelayoutFrameOverrides: (overrides) => overrides,
      resolveEngineLayoutOptionOverrides: () => ({}),
      updateModelFromLayout: vi.fn(),
      syncArrowsInModel: vi.fn(),
    });

    expect(routePreviewArrowsMock).toHaveBeenCalledTimes(1);
    const routedArrowInput = routePreviewArrowsMock.mock.calls[0]?.[0]?.[0];
    expect(routedArrowInput?.source).toBe('alpha');
    expect(routedArrowInput?.target).toBe('beta');
    expect(routedArrowInput?.waypoints).toBeUndefined();
    expect(routedArrowInput?.layoutPath).toBeUndefined();
  });

  it('stamps the engine that actually drives an authored-engine fresh render', async () => {
    const ownerDocument = new FakeDocument();
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'mongo-octavia-ha.yaml'));
    expect(diagram.layoutEngine).toBe('elk-layered');
    const frameTreeJson = serializeFrameDiagram(diagram);
    frameTreeJson.layoutEngine = 'v3';

    const result = await renderFreshPreviewSvg({
      ownerDocument: ownerDocument as unknown as Document,
      frameTreeJson,
      overrides: {},
      gridOverrides: {},
      model: {},
      textAdapter: new MockTextAdapter(),
      applySessionRemovalsToDiagramJson: null,
      applyOverridesToFrameTree: vi.fn(),
      collectRelayoutFrameOverrides: (overrides) => overrides,
      resolveEngineLayoutOptionOverrides: () => ({}),
      updateModelFromLayout: vi.fn(),
      syncArrowsInModel: vi.fn(),
    });

    expect(result.svg.getAttribute('data-layout-engine')).toBe('v3');
  });

  it('reads a committed render intent over the authored frame-tree engine', async () => {
    const ownerDocument = new FakeDocument();
    const diagram = loadNormalizedFrameFixture('mongo-octavia-ha', { engine: 'elk-layered' });
    expect(diagram.layoutEngine).toBe('elk-layered');
    const frameTreeJson = serializeFrameDiagram(diagram);
    const previewWindow = {
      __DG_CONFIG: {
        active_engine_id: 'elk-layered',
        layout_engine: 'elk-layered',
      },
    };
    commitPreviewSwitchNode(previewWindow, {
      activeEngineId: 'v3',
      frameTreeJson,
    });

    const result = await renderFreshPreviewSvg({
      ownerDocument: ownerDocument as unknown as Document,
      frameTreeJson,
      renderIntent: previewWindow.__DG_previewRenderIntent,
      overrides: {},
      gridOverrides: {},
      model: {},
      textAdapter: new MockTextAdapter(),
      applySessionRemovalsToDiagramJson: null,
      applyOverridesToFrameTree: vi.fn(),
      collectRelayoutFrameOverrides: (overrides) => overrides,
      resolveEngineLayoutOptionOverrides: () => ({}),
      updateModelFromLayout: vi.fn(),
      syncArrowsInModel: vi.fn(),
    });

    expect(previewWindow.__DG_previewRenderIntent?.engineId).toBe('v3');
    expect(result.svg.getAttribute('data-layout-engine')).toBe('v3');
  });

  it('stamps native v3 when an incompatible authored engine is withheld from render resolution', async () => {
    const ownerDocument = new FakeDocument();
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'tiered-network-architecture.author-v1.yaml'));
    expect(diagram.layoutEngine).toBe('elk-layered');

    const result = await renderFreshPreviewSvg({
      ownerDocument: ownerDocument as unknown as Document,
      frameTreeJson: serializeFrameDiagram(diagram),
      overrides: {},
      gridOverrides: {},
      model: {},
      textAdapter: new MockTextAdapter(),
      applySessionRemovalsToDiagramJson: null,
      applyOverridesToFrameTree: vi.fn(),
      collectRelayoutFrameOverrides: (overrides) => overrides,
      resolveEngineLayoutOptionOverrides: () => ({}),
      updateModelFromLayout: vi.fn(),
      syncArrowsInModel: vi.fn(),
    });

    expect(result.svg.getAttribute('data-layout-engine')).toBe('v3');
  });
});
