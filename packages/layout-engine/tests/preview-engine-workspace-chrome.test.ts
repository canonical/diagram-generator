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

  setActiveElement(element: FakeElement): void {
    this.activeElement = element;
  }
}

function createChromeHarness() {
  const document = new FakeDocument();
  const section = document.register(new FakeElement('section', 'engine-switcher-section', document));
  const help = null as FakeElement | null;
  const label = document.register(new FakeElement('span', 'active-engine-label', document));
  const tabs = document.register(new FakeElement('ul', 'engine-switcher-tabs', document));
  const panelSyncCalls: string[] = [];
  const saveButtonSyncCalls: string[] = [];
  const rerenderCalls: string[] = [];
  const frameTreeJson = {
    layoutEngine: 'elk-layered' as string | undefined,
  };
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
    expect(harness.panelSyncCalls).toEqual(['sync', 'sync', 'sync']);
    expect(harness.saveButtonSyncCalls).toEqual(['sync', 'sync', 'sync']);
    expect(harness.rerenderCalls).toEqual(['rerender']);
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
