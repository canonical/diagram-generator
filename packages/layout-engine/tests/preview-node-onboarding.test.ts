import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { serializeFrameDiagram } from '../src/frame-serialize.js';
import { MockTextAdapter } from '../src/text-measure.js';
import {
  getPreviewFrameDiagramRenderAdapter,
  registerPreviewEngine,
  registerPreviewFrameDiagramRenderAdapter,
} from '../src/preview-engine/index.js';
import {
  createRegisteredPreviewInterpreterNodeRegistry,
  getPreviewInterpreterNode,
} from '../src/preview-shell/preview-interpreter-node.js';
import { renderFreshPreviewSvg } from '../src/preview-shell/app-fresh-render.js';
import { mountPreviewRenderNode } from '../src/preview-shell/preview-render-node.js';
import { commitPreviewSwitchNodeLayoutEngine } from '../src/preview-shell/preview-switch-node.js';
import { loadNormalizedFrameFixture } from './helpers/frame-fixture-normalization.js';

const DUMMY_ENGINE_ID = 'dummy-onboarding-grid';
const DUMMY_RENDER_FAMILY = 'frame-dummy-onboarding';

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

function createFrameTreeJson(): Record<string, unknown> {
  return serializeFrameDiagram(loadNormalizedFrameFixture('support-engineering-flow', {
    engine: 'v3',
  })) as Record<string, unknown>;
}

function createPreviewWindow(frameTreeJson: Record<string, unknown>) {
  return {
    __DG_CONFIG: {
      active_engine_id: 'v3',
      layout_engine: 'v3',
    },
    __DG_previewRenderIntent: null as
      | ReturnType<typeof commitPreviewSwitchNodeLayoutEngine>
      | null,
    getFrameTreeJson() {
      return frameTreeJson;
    },
    setFrameTreeLayoutEngine(layoutEngine: string | null | undefined) {
      frameTreeJson.layoutEngine = layoutEngine ?? null;
      return (frameTreeJson.layoutEngine as string | null) ?? null;
    },
  };
}

async function renderFrameTreeForActiveEngine(
  ownerDocument: Document,
  frameTreeJson: Record<string, unknown>,
  renderIntent: Record<string, unknown> | null,
) {
  return renderFreshPreviewSvg({
    ownerDocument,
    frameTreeJson,
    renderIntent: renderIntent as never,
    overrides: {},
    gridOverrides: {},
    model: {},
    textAdapter: new MockTextAdapter(),
    applySessionRemovalsToDiagramJson: null,
    applyOverridesToFrameTree: () => {},
    collectRelayoutFrameOverrides: (overrides) => overrides,
    resolveEngineLayoutOptionOverrides: () => ({}),
    updateModelFromLayout: () => {},
    syncArrowsInModel: () => {},
  });
}

describe('preview node onboarding', () => {
  it('registers a dummy interpreter node that switches and renders without central owner edits', async () => {
    const nativeRenderAdapter = getPreviewFrameDiagramRenderAdapter('frame-native');
    expect(nativeRenderAdapter).toBeTypeOf('function');

    const unregisterEngine = registerPreviewEngine({
      id: DUMMY_ENGINE_ID,
      label: 'Dummy onboarding node',
      layoutEngineKey: DUMMY_ENGINE_ID,
      shellMode: 'grid',
      renderFamily: DUMMY_RENDER_FAMILY,
      hostView: {
        sidebarSections: ['layout-params'],
      },
      capabilities: {
        layoutControls: true,
        localRelayout: true,
        serverRelayout: false,
        engineBackedSave: false,
        nodeInspector: true,
        gridEditing: true,
        referenceImage: true,
        simulationControls: false,
        rawDebugView: false,
      },
      controlSpecs: [
        {
          key: 'dummy.spacing',
          label: 'Dummy spacing',
          group: 'Dummy',
          kind: 'number',
          defaultValue: '24',
          persistNamespace: 'dummy',
        },
      ],
      scripts: ['dummy-onboarding.js'],
      compatibility: {
        documentKinds: ['frame-diagram'],
        requiredLayoutEngineKey: DUMMY_ENGINE_ID,
        description: 'Synthetic interpreter node used to lock registration-only onboarding',
      },
    });
    const unregisterRenderAdapter = registerPreviewFrameDiagramRenderAdapter(
      DUMMY_RENDER_FAMILY,
      async (options) => nativeRenderAdapter!(options),
    );

    try {
      const registry = createRegisteredPreviewInterpreterNodeRegistry();
      expect(registry.nodeIds).toContain(DUMMY_ENGINE_ID);
      expect(getPreviewInterpreterNode(registry, DUMMY_ENGINE_ID)).toMatchObject({
        nodeId: DUMMY_ENGINE_ID,
        engineId: DUMMY_ENGINE_ID,
        layoutEngineKey: DUMMY_ENGINE_ID,
        manifest: {
          renderFamily: DUMMY_RENDER_FAMILY,
        },
      });

      const frameTreeJson = createFrameTreeJson();
      const previewWindow = createPreviewWindow(frameTreeJson);
      const ownerDocument = new FakeDocument() as unknown as Document;
      const fitCalls: string[] = [];
      const mountedEngines: string[] = [];
      let refreshCount = 0;

      expect(commitPreviewSwitchNodeLayoutEngine(previewWindow, DUMMY_ENGINE_ID)).toBe(DUMMY_ENGINE_ID);
      expect(frameTreeJson.layoutEngine).toBe(DUMMY_ENGINE_ID);
      const dummyRender = await renderFrameTreeForActiveEngine(
        ownerDocument,
        frameTreeJson,
        previewWindow.__DG_previewRenderIntent as never,
      );

      expect(dummyRender.svg.getAttribute('data-layout-engine')).toBe(DUMMY_ENGINE_ID);
      expect(dummyRender.width).toBeGreaterThan(0);
      expect(dummyRender.height).toBeGreaterThan(0);

      mountPreviewRenderNode({
        stage: {
          replaceChildren(svg) {
            mountedEngines.push((svg as FakeElement).getAttribute('data-layout-engine') ?? 'missing');
          },
        },
        renderResult: dummyRender,
        fitSvgToContent: ({ minWidth, minHeight }) => {
          fitCalls.push(`${minWidth}x${minHeight}`);
        },
        refreshScene: () => {
          refreshCount += 1;
        },
      });

      expect(commitPreviewSwitchNodeLayoutEngine(previewWindow, 'v3')).toBe('v3');
      expect(frameTreeJson.layoutEngine).toBe('v3');
      const v3Render = await renderFrameTreeForActiveEngine(
        ownerDocument,
        frameTreeJson,
        previewWindow.__DG_previewRenderIntent as never,
      );

      expect(v3Render.svg.getAttribute('data-layout-engine')).toBe('v3');

      mountPreviewRenderNode({
        stage: {
          replaceChildren(svg) {
            mountedEngines.push((svg as FakeElement).getAttribute('data-layout-engine') ?? 'missing');
          },
        },
        renderResult: v3Render,
        fitSvgToContent: ({ minWidth, minHeight }) => {
          fitCalls.push(`${minWidth}x${minHeight}`);
        },
        refreshScene: () => {
          refreshCount += 1;
        },
      });

      expect(mountedEngines).toEqual([DUMMY_ENGINE_ID, 'v3']);
      expect(fitCalls).toEqual([
        `${dummyRender.width}x${dummyRender.height}`,
        `${v3Render.width}x${v3Render.height}`,
      ]);
      expect(refreshCount).toBe(2);

      const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..');
      const centralOwnerFiles = [
        path.join(repoRoot, 'packages', 'layout-engine', 'src', 'preview-shell', 'preview-render-node.ts'),
        path.join(repoRoot, 'packages', 'layout-engine', 'src', 'preview-shell', 'preview-switch-node.ts'),
        path.join(repoRoot, 'scripts', 'preview', 'editor.js'),
        path.join(repoRoot, 'scripts', 'preview', 'layout-bridge.js'),
      ];

      for (const filePath of centralOwnerFiles) {
        const source = fs.readFileSync(filePath, 'utf8');
        expect(source).not.toContain(DUMMY_ENGINE_ID);
        expect(source).not.toContain(DUMMY_RENDER_FAMILY);
      }
    } finally {
      unregisterRenderAdapter();
      unregisterEngine();
    }
  });
});
