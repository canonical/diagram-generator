import { describe, expect, it } from 'vitest';
import { SEQUENCE_PREVIEW_ENGINE } from '../src/preview-engine/builtins.js';
import {
  collectPreviewEngineWorkspaceSavePayload,
  hasUnsavedPreviewEngineWorkspaceChange,
  initPreviewEngineWorkspaceChrome,
  persistPreviewEngineWorkspaceRuntimeState,
} from '../src/preview-shell/preview-engine-workspace-chrome.js';

class FakeClassList {
  private readonly names = new Set<string>();

  toggle(name: string, force?: boolean): boolean {
    if (force === true) {
      this.names.add(name);
      return true;
    }
    if (force === false) {
      this.names.delete(name);
      return false;
    }
    if (this.names.has(name)) {
      this.names.delete(name);
      return false;
    }
    this.names.add(name);
    return true;
  }
}

class FakeKeyboardEvent {
  defaultPrevented = false;

  constructor(readonly key: string) {}

  preventDefault(): void {
    this.defaultPrevented = true;
  }
}

type FakeListener = (event?: FakeKeyboardEvent) => void | Promise<void>;

class FakeElement {
  hidden = false;
  disabled = false;
  tabIndex = -1;
  value = '';
  textContent = '';
  className = '';
  readonly children: FakeElement[] = [];
  readonly classList = new FakeClassList();
  private readonly attributes = new Map<string, string>();
  private readonly listeners = new Map<string, FakeListener[]>();

  constructor(
    readonly tagName: string,
    readonly id = '',
    readonly ownerDocument?: FakeDocument,
  ) {}

  append(child: FakeElement): void {
    this.children.push(child);
  }

  appendChild(child: FakeElement): FakeElement {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children: FakeElement[]): void {
    this.children.length = 0;
    this.children.push(...children);
  }

  addEventListener(type: string, listener: FakeListener): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  async click(): Promise<void> {
    for (const listener of this.listeners.get('click') ?? []) {
      await listener();
    }
  }

  focus(): void {
    this.ownerDocument?.setActiveElement(this);
    for (const listener of this.listeners.get('focus') ?? []) {
      void listener();
    }
  }

  async dispatchKeydown(key: string): Promise<FakeKeyboardEvent> {
    const event = new FakeKeyboardEvent(key);
    for (const listener of this.listeners.get('keydown') ?? []) {
      await listener(event);
    }
    return event;
  }

  async dispatchChange(): Promise<void> {
    for (const listener of this.listeners.get('change') ?? []) {
      await listener();
    }
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    if (selector === 'button[data-engine-id]') {
      const matches: FakeElement[] = [];
      const walk = (element: FakeElement) => {
        for (const child of element.children) {
          if (child.tagName.toLowerCase() === 'button' && child.getAttribute('data-engine-id')) {
            matches.push(child);
          }
          walk(child);
        }
      };
      walk(this);
      return matches;
    }
    return [];
  }
}

class FakeDocument {
  private readonly elements = new Map<string, FakeElement>();
  activeElement: FakeElement | null = null;
  renderedEngine: string | null = null;
  renderedViewBox: string | null = null;
  stageGeometry: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];

  register(element: FakeElement): FakeElement {
    if (element.id) {
      this.elements.set(element.id, element);
    }
    return element;
  }

  getElementById(id: string): FakeElement | null {
    return this.elements.get(id) ?? null;
  }

  createElement(tagName: string): FakeElement {
    return new FakeElement(tagName, '', this);
  }

  querySelector(selector: string): { getAttribute: (name: string) => string | null } | null {
    if (selector === '#stage svg' && this.renderedEngine) {
      return {
        getAttribute: (name: string) => {
          if (name === 'data-layout-engine') {
            return this.renderedEngine;
          }
          if (name === 'viewBox') {
            return this.renderedViewBox;
          }
          return null;
        },
      };
    }
    return null;
  }

  querySelectorAll(selector: string): Array<{
    getAttribute: (name: string) => string | null;
    getBBox: () => { x: number; y: number; width: number; height: number };
  }> {
    if (selector === '#dg-frame-layer [data-component-id]') {
      return this.stageGeometry.map((entry) => ({
        getAttribute: (name: string) => (name === 'data-component-id' ? entry.id : null),
        getBBox: () => ({
          x: entry.x,
          y: entry.y,
          width: entry.w,
          height: entry.h,
        }),
      }));
    }
    return [];
  }

  setActiveElement(element: FakeElement): void {
    this.activeElement = element;
  }
}

function createChromeHarness() {
  const document = new FakeDocument();
  const section = document.register(new FakeElement('section', 'engine-switcher-section', document));
  const help = document.register(new FakeElement('p', 'engine-switcher-help', document));
  const label = document.register(new FakeElement('span', 'active-engine-label', document));
  const tabs = document.register(new FakeElement('ul', 'engine-switcher-tabs', document));
  const panelSyncCalls: string[] = [];
  const saveButtonSyncCalls: string[] = [];
  const rerenderCalls: string[] = [];
  const geometryByEngine: Record<string, Array<{ id: string; x: number; y: number; w: number; h: number }>> = {
    'elk-layered': [
      { id: 'alpha', x: 0, y: 0, w: 100, h: 40 },
      { id: 'beta', x: 0, y: 80, w: 100, h: 40 },
    ],
    dagre: [
      { id: 'alpha', x: 0, y: 0, w: 100, h: 40 },
      { id: 'beta', x: 140, y: 0, w: 100, h: 40 },
    ],
    v3: [
      { id: 'alpha', x: 0, y: 0, w: 100, h: 40 },
      { id: 'beta', x: 0, y: 80, w: 100, h: 40 },
    ],
  };
  const viewBoxByEngine: Record<string, string> = {
    'elk-layered': '-24 -24 148 168',
    dagre: '-24 -24 288 88',
    v3: '-24 -24 148 168',
  };
  const frameTreeJson = {
    layoutEngine: 'elk-layered' as string | undefined,
  };
  document.renderedEngine = frameTreeJson.layoutEngine;
  document.renderedViewBox = viewBoxByEngine[frameTreeJson.layoutEngine] ?? null;
  document.stageGeometry = geometryByEngine[frameTreeJson.layoutEngine] ?? [];
  const previewWindow = {
    __DG_CONFIG: null as Record<string, unknown> | null,
   getFrameTreeJson() {
     return { ...frameTreeJson };
   },
   setFrameTreeLayoutEngine(layoutEngine: string | null | undefined) {
     if (layoutEngine) {
       frameTreeJson.layoutEngine = layoutEngine;
       return layoutEngine;
     }
     delete frameTreeJson.layoutEngine;
     return null;
   },
   __DG_syncPreviewEngineWorkspacePanels() {
     panelSyncCalls.push('sync');
   },
   async __DG_rerenderPreviewEngineWorkspaceStage() {
     rerenderCalls.push('rerender');
     previewWindow.__DG_activeLayoutOperatorKey = frameTreeJson.layoutEngine ?? null;
      document.renderedEngine = frameTreeJson.layoutEngine ?? null;
      document.renderedViewBox = viewBoxByEngine[frameTreeJson.layoutEngine ?? ''] ?? null;
      document.stageGeometry = geometryByEngine[frameTreeJson.layoutEngine ?? ''] ?? [];
   },
   PreviewSaveClient: {
     syncSaveButton() {
       saveButtonSyncCalls.push('sync');
     },
   },
  } as Window & typeof globalThis & {
   __DG_CONFIG?: Record<string, unknown> | null;
   getFrameTreeJson?: (() => unknown) | null;
   setFrameTreeLayoutEngine?: ((layoutEngine: string | null | undefined) => string | null) | null;
   __DG_syncPreviewEngineWorkspacePanels?: (() => void) | null;
   __DG_activeLayoutOperatorKey?: string | null;
   PreviewSaveClient?: {
     syncSaveButton?: () => void;
   };
  };
  return {
   document,
   section,
   help,
   label,
   tabs,
   previewWindow,
   panelSyncCalls,
   saveButtonSyncCalls,
   rerenderCalls,
   frameTreeJson,
   geometryByEngine,
   viewBoxByEngine,
  };
}

describe('preview engine workspace chrome', () => {
  it('switches engines browser-locally until save persists the active tab', async () => {
   const harness = createChromeHarness();
   harness.previewWindow.__DG_CONFIG = {
     slug: 'support-engineering-flow',
      active_engine_id: 'elk-layered',
      active_engine_label: 'ELK layered layout',
      persisted_layout_engine: 'elk-layered',
      compatible_engines: ['v3', 'elk-layered', 'dagre'],
      show_engine_switcher: true,
    };

    const workspace = initPreviewEngineWorkspaceChrome({
      document: harness.document as unknown as Document,
      previewWindow: harness.previewWindow,
    });

    expect(workspace.activeEngineId).toBe('elk-layered');
    expect(harness.section.hidden).toBe(false);
    expect(harness.label.hidden).toBe(true);
    expect((harness.previewWindow as any).__DG_previewRenderIntent?.engineId).toBe('elk-layered');
    expect(harness.tabs.children).toHaveLength(3);
    const tabButtons = harness.tabs.querySelectorAll('button[data-engine-id]');
    expect(tabButtons).toHaveLength(3);
    expect(tabButtons[0]?.getAttribute('role')).toBe('tab');
    expect(harness.tabs.getAttribute('role')).toBe('tablist');
    expect(tabButtons.map((button) => button.tabIndex)).toEqual([-1, 0, -1]);

    await tabButtons[2]?.click();
    expect(harness.previewWindow.__DG_CONFIG?.active_engine_id).toBe('dagre');
    expect(harness.previewWindow.__DG_CONFIG?.layout_engine).toBe('dagre');
    expect((harness.previewWindow as any).__DG_previewRenderIntent?.engineId).toBe('dagre');
    expect(harness.frameTreeJson.layoutEngine).toBe('dagre');
    expect(harness.previewWindow.__DG_activeLayoutOperatorKey).toBe('dagre');
    expect(harness.help.textContent).toBe('Selected engine is unsaved until you save this document.');
    expect(harness.panelSyncCalls).toEqual(['sync', 'sync', 'sync']);
    expect(harness.saveButtonSyncCalls).toEqual(['sync', 'sync', 'sync']);
    expect(harness.rerenderCalls).toEqual(['rerender']);
    expect((harness.previewWindow as any).__DG_lastEditorMutationTransactionResult).toEqual(
      expect.objectContaining({
        kind: 'committed',
        mutationKind: 'engine-tab',
        sourceControl: 'engine-switcher-tabs',
        relayoutPolicy: 'fresh-render',
        dirtyPolicy: 'mark-dirty',
        undoPolicy: 'none',
      }),
    );
    expect((harness.previewWindow as any).__DG_lastEditorMutationStateViolations).toEqual([]);
    expect(hasUnsavedPreviewEngineWorkspaceChange(harness.previewWindow as never)).toBe(true);
    expect(
      collectPreviewEngineWorkspaceSavePayload(
        harness.previewWindow as never,
        { overrides: { alpha: { dx: 8 } } },
      ),
    ).toEqual({
      overrides: { alpha: { dx: 8 } },
      layout_engine: 'dagre',
    });

    persistPreviewEngineWorkspaceRuntimeState(harness.previewWindow as never);
    expect(harness.previewWindow.__DG_CONFIG?.persisted_layout_engine).toBe('dagre');
    expect(harness.panelSyncCalls).toEqual(['sync', 'sync', 'sync', 'sync']);
    expect(harness.saveButtonSyncCalls).toEqual(['sync', 'sync', 'sync', 'sync']);
    expect(hasUnsavedPreviewEngineWorkspaceChange(harness.previewWindow as never)).toBe(false);
  });

  it('reports rejected transaction state when engine rerender fails and rolls back', async () => {
    const harness = createChromeHarness();
    harness.previewWindow.__DG_CONFIG = {
      slug: 'support-engineering-flow',
      active_engine_id: 'elk-layered',
      active_engine_label: 'ELK layered layout',
      persisted_layout_engine: 'elk-layered',
      compatible_engines: ['v3', 'elk-layered', 'dagre'],
      show_engine_switcher: true,
    };
    harness.previewWindow.__DG_activeLayoutOperatorKey = 'elk-layered';
    harness.previewWindow.__DG_rerenderPreviewEngineWorkspaceStage = async () => {
      harness.rerenderCalls.push('rerender');
      harness.previewWindow.__DG_activeLayoutOperatorKey = 'dagre';
      throw new Error('rerender failed');
    };

    initPreviewEngineWorkspaceChrome({
      document: harness.document as unknown as Document,
      previewWindow: harness.previewWindow,
    });

    const tabButtons = harness.tabs.querySelectorAll('button[data-engine-id]');
    await tabButtons[2]?.click();

    expect(harness.previewWindow.__DG_CONFIG?.active_engine_id).toBe('elk-layered');
    expect(harness.frameTreeJson.layoutEngine).toBe('elk-layered');
    expect(harness.previewWindow.__DG_activeLayoutOperatorKey).toBe('elk-layered');
    expect((harness.previewWindow as any).__DG_lastEditorMutationTransactionResult).toEqual(
      expect.objectContaining({
        kind: 'rejected',
        mutationKind: 'engine-tab',
        reason: 'rerender failed',
      }),
    );
    expect((harness.previewWindow as any).__DG_lastEditorMutationStateViolations).toEqual([]);
  });

  it('surfaces a help hint when the selected engine commits but keeps equivalent geometry', async () => {
    const harness = createChromeHarness();
    harness.frameTreeJson.layoutEngine = 'v3';
    const equivalentGeometry = [
      { id: 'commit', x: 0, y: 0, w: 224, h: 64 },
      { id: 'build', x: 0, y: 88, w: 224, h: 64 },
    ];
    harness.geometryByEngine.v3 = equivalentGeometry;
    harness.geometryByEngine['elk-layered'] = [...equivalentGeometry];
    harness.previewWindow.__DG_activeLayoutOperatorKey = null;
    harness.document.renderedEngine = 'v3';
    harness.document.renderedViewBox = '-24 -24 272 200';
    harness.document.stageGeometry = harness.geometryByEngine.v3;
    harness.previewWindow.__DG_CONFIG = {
      slug: 'example-deployment-pipeline',
      active_engine_id: 'v3',
      active_engine_label: 'Autolayout',
      persisted_layout_engine: 'v3',
      compatible_engines: ['v3', 'elk-layered'],
      show_engine_switcher: true,
    };

    initPreviewEngineWorkspaceChrome({
      document: harness.document as unknown as Document,
      previewWindow: harness.previewWindow,
    });

    const tabButtons = harness.tabs.querySelectorAll('button[data-engine-id]');
    await tabButtons[1]?.click();

    expect(harness.previewWindow.__DG_CONFIG?.active_engine_id).toBe('elk-layered');
    expect(harness.document.renderedEngine).toBe('elk-layered');
    expect(harness.help.textContent).toContain('Geometry matches');
    expect(harness.help.textContent).toContain('adjust engine parameters to force divergence.');
  });

  it('records a canvas-divergence violation when equivalent geometry rerenders without the fitted canvas', async () => {
    const harness = createChromeHarness();
    const equivalentGeometry = [
      { id: 'alpha', x: 0, y: 0, w: 100, h: 40 },
      { id: 'beta', x: 0, y: 80, w: 100, h: 40 },
    ];
    harness.geometryByEngine['elk-layered'] = equivalentGeometry;
    harness.geometryByEngine.v3 = [...equivalentGeometry];
    harness.viewBoxByEngine['elk-layered'] = '-24 -24 148 168';
    harness.viewBoxByEngine.v3 = '0 0 100 120';
    harness.frameTreeJson.layoutEngine = 'v3';
    harness.document.renderedEngine = 'v3';
    harness.document.renderedViewBox = harness.viewBoxByEngine.v3;
    harness.document.stageGeometry = harness.geometryByEngine.v3;
    harness.previewWindow.__DG_CONFIG = {
      slug: 'example-deployment-pipeline',
      active_engine_id: 'v3',
      active_engine_label: 'Autolayout',
      persisted_layout_engine: 'v3',
      compatible_engines: ['v3', 'elk-layered'],
      show_engine_switcher: true,
    };

    initPreviewEngineWorkspaceChrome({
      document: harness.document as unknown as Document,
      previewWindow: harness.previewWindow,
    });

    const tabButtons = harness.tabs.querySelectorAll('button[data-engine-id]');
    await tabButtons[1]?.click();

    expect((harness.previewWindow as any).__DG_lastEditorMutationStateViolations).toEqual([
      expect.objectContaining({
        code: 'canvas-divergence',
        expected: {
          activeNodeId: 'v3',
          fittedViewBox: '0 0 100 120',
        },
        actual: {
          activeNodeId: 'elk-layered',
          fittedViewBox: '-24 -24 148 168',
        },
      }),
    ]);
  });

  it('supports roving tab focus and keyboard activation', async () => {
    const harness = createChromeHarness();
    harness.previewWindow.__DG_CONFIG = {
      slug: 'support-engineering-flow',
      active_engine_id: 'elk-layered',
      active_engine_label: 'ELK layered layout',
      persisted_layout_engine: 'elk-layered',
      compatible_engines: ['v3', 'elk-layered', 'dagre'],
      show_engine_switcher: true,
    };

    initPreviewEngineWorkspaceChrome({
      document: harness.document as unknown as Document,
      previewWindow: harness.previewWindow,
    });

    const tabButtons = harness.tabs.querySelectorAll('button[data-engine-id]');
    const arrowEvent = await tabButtons[1]?.dispatchKeydown('ArrowRight');
    expect(arrowEvent?.defaultPrevented).toBe(true);
    expect(harness.document.activeElement).toBe(tabButtons[2]);
    expect(tabButtons.map((button) => button.tabIndex)).toEqual([-1, -1, 0]);
    expect(tabButtons.map((button) => button.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(harness.rerenderCalls).toEqual([]);

    const enterEvent = await tabButtons[2]?.dispatchKeydown('Enter');
    expect(enterEvent?.defaultPrevented).toBe(true);
    expect(harness.frameTreeJson.layoutEngine).toBe('dagre');
    expect(harness.previewWindow.__DG_CONFIG?.active_engine_id).toBe('dagre');
    expect((harness.previewWindow as any).__DG_previewRenderIntent?.engineId).toBe('dagre');
    expect(tabButtons.map((button) => button.tabIndex)).toEqual([-1, -1, 0]);
    expect(tabButtons.map((button) => button.getAttribute('aria-selected'))).toEqual(['false', 'false', 'true']);
    expect(harness.rerenderCalls).toEqual(['rerender']);
  });

  it('keeps the switcher hidden for sequence documents while still surfacing engine identity', () => {
    const harness = createChromeHarness();
    harness.previewWindow.__DG_CONFIG = {
      slug: 'service-handshake-sequence',
      active_engine_id: 'sequence',
      active_engine_label: SEQUENCE_PREVIEW_ENGINE.label,
      persisted_layout_engine: 'sequence',
      compatible_engines: ['sequence'],
      show_engine_switcher: false,
    };

    const workspace = initPreviewEngineWorkspaceChrome({
      document: harness.document as unknown as Document,
      previewWindow: harness.previewWindow,
    });

    expect(workspace.activeEngineId).toBe('sequence');
    expect(harness.section.hidden).toBe(true);
    expect(harness.label.hidden).toBe(false);
    expect(harness.label.textContent).toBe(`Engine: ${SEQUENCE_PREVIEW_ENGINE.label}`);
  });
});
