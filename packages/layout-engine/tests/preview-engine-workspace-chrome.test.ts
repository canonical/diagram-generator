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

class FakeElement {
  hidden = false;
  disabled = false;
  value = '';
  textContent = '';
  className = '';
  readonly children: FakeElement[] = [];
  readonly classList = new FakeClassList();
  private readonly attributes = new Map<string, string>();
  private readonly listeners = new Map<string, Array<() => void>>();

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

  addEventListener(type: string, listener: () => void): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  click(): void {
    for (const listener of this.listeners.get('click') ?? []) {
      listener();
    }
  }

  dispatchChange(): void {
    for (const listener of this.listeners.get('change') ?? []) {
      listener();
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
      return this.children.filter((child) => (
        child.tagName.toLowerCase() === 'button' && child.getAttribute('data-engine-id')
      ));
    }
    return [];
  }
}

class FakeDocument {
  private readonly elements = new Map<string, FakeElement>();

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
}

function createChromeHarness() {
  const document = new FakeDocument();
  const section = document.register(new FakeElement('section', 'engine-switcher-section', document));
  const help = document.register(new FakeElement('p', 'engine-switcher-help', document));
  help.textContent = 'Only engines compatible with this document are listed.';
  const label = document.register(new FakeElement('span', 'active-engine-label', document));
  const select = document.register(new FakeElement('select', 'engine-switcher', document));
  const prev = document.register(new FakeElement('button', 'engine-switcher-prev', document));
  const next = document.register(new FakeElement('button', 'engine-switcher-next', document));
  const tabs = document.register(new FakeElement('div', 'engine-switcher-tabs', document));
  const panelSyncCalls: string[] = [];
  const saveButtonSyncCalls: string[] = [];
  const previewWindow = {
    __DG_CONFIG: null as Record<string, unknown> | null,
   __DG_syncPreviewEngineWorkspacePanels() {
     panelSyncCalls.push('sync');
   },
   PreviewSaveClient: {
     syncSaveButton() {
       saveButtonSyncCalls.push('sync');
     },
   },
  } as Window & typeof globalThis & {
   __DG_CONFIG?: Record<string, unknown> | null;
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
   select,
   prev,
   next,
   tabs,
   previewWindow,
   panelSyncCalls,
   saveButtonSyncCalls,
  };
}

describe('preview engine workspace chrome', () => {
  it('switches engines browser-locally until save persists the active tab', () => {
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
    expect(harness.label.hidden).toBe(false);
    expect(harness.label.textContent).toBe('Engine: ELK layered layout');
    expect(harness.select.children).toHaveLength(3);
    expect(harness.tabs.children).toHaveLength(3);
    expect(harness.prev.disabled).toBe(false);
    expect(harness.next.disabled).toBe(false);

    harness.next.click();
    expect(harness.previewWindow.__DG_CONFIG?.active_engine_id).toBe('dagre');
    expect(harness.help.textContent).toBe('Selected engine is unsaved until you save this document.');
    expect(harness.panelSyncCalls).toEqual(['sync', 'sync']);
    expect(harness.saveButtonSyncCalls).toEqual(['sync', 'sync']);
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
    expect(harness.panelSyncCalls).toEqual(['sync', 'sync', 'sync']);
    expect(harness.saveButtonSyncCalls).toEqual(['sync', 'sync', 'sync']);
    expect(harness.help.textContent).toBe('Only engines compatible with this document are listed.');
    expect(hasUnsavedPreviewEngineWorkspaceChange(harness.previewWindow as never)).toBe(false);
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
