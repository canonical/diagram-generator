import { describe, expect, it } from 'vitest';

import {
  createPreviewEditorBootstrapFacadeFromEditorHost,
  type CreatePreviewEditorBootstrapFacadeFromEditorHostOptions,
} from '../src/preview-shell/app-editor-bootstrap-facade.js';

type TestWindow = Window & typeof globalThis;

function createTestFacadeOptions(): CreatePreviewEditorBootstrapFacadeFromEditorHostOptions {
  const previewWindow = {
    location: {
      pathname: '/view/alpha',
      origin: 'http://127.0.0.1:8100',
      assign() {},
    },
    confirm() {
      return true;
    },
    setTimeout(callback: () => void) {
      callback();
      return 0;
    },
    dispatchEvent() {
      return true;
    },
  } as unknown as TestWindow;

  return {
    document: {
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
    },
    previewWindow,
    slug: 'demo',
    componentTree: {
      fetchTree: async () => ({
        ok: true,
        json: async () => [],
      }),
      model: {
        loadTree() {},
        loadArrows() {},
      },
    },
    svgLoad: {
      stage: {
        innerHTML: '',
        replaceChildren() {},
      },
      engine: 'v3',
      gridEnabled: true,
      deselectAll() {},
      previewBridgeHost: {
        async initLayoutBridge() {},
        setFrameTreeJson() {},
      },
      isEngineLayoutActive: () => false,
      resetOverrideState() {},
      initEnginePanel() {},
      getLocalRelayoutStatus: () => ({ ready: true }),
      escapeHtml: (value) => value,
      loadGridInfo: async () => {},
      gridState: {
        getGridInfo: () => null,
        setDiagramGrid() {},
        getGridOverrides: () => null,
        pruneLinkedRootGridOverrides() {},
      },
      populateGridControls() {},
      applyWaypointOverrides() {},
      applyAllOverrides() {},
      bindInteraction() {},
      renderGridOverlay() {},
      selectionState: {
        selectedIds: new Set<string>(),
        reapplySelection() {},
      },
      runConstraints() {},
      previewSaveClient: {
        markSaved() {},
      },
      dirtyStateSerializer: {
        serializeDirtyState() {
          return '{}';
        },
      },
      previewBridgeRender: {
        async renderFreshPreviewSvg() {
          return { svg: { tagName: 'svg' }, width: 640, height: 480 };
        },
      },
      overrides: {},
      model: {},
    },
    navigation: {
      isDirty: () => false,
      setAllowInternalDirtyNavigation() {},
      dirtyConfirmMessage: 'Leave?',
    },
  };
}

describe('app-editor-bootstrap-facade', () => {
  it('resolves whenDiagramLoaded from the facade-owned load signal state', async () => {
    const originalCustomEvent = globalThis.CustomEvent;
    globalThis.CustomEvent = class CustomEventShim {
      type: string;
      detail: unknown;

      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type;
        this.detail = init?.detail;
      }
    } as unknown as typeof CustomEvent;

    try {
      const facade = createPreviewEditorBootstrapFacadeFromEditorHost(createTestFacadeOptions());
      const pending = facade.whenDiagramLoaded();
      expect(facade.signalDiagramLoaded()).toBe(1);
      await expect(pending).resolves.toBe(1);
    } finally {
      globalThis.CustomEvent = originalCustomEvent;
    }
  });

  it('syncs browse links against the current pathname', () => {
    const activeClasses = new Set<string>();
    const inactiveClasses = new Set<string>();
    const activeLink = {
      getAttribute(name: string) {
        return name === 'href' ? '/view/alpha' : null;
      },
      classList: {
        toggle(name: string, enabled: boolean) {
          if (enabled) activeClasses.add(name);
        },
      },
      setAttribute() {},
      removeAttribute() {},
    };
    const inactiveLink = {
      getAttribute(name: string) {
        return name === 'href' ? '/view/beta' : null;
      },
      classList: {
        toggle(name: string, enabled: boolean) {
          if (!enabled) inactiveClasses.add(name);
        },
      },
      setAttribute() {},
      removeAttribute() {},
    };

    const facade = createPreviewEditorBootstrapFacadeFromEditorHost({
      ...createTestFacadeOptions(),
      document: {
        querySelector() {
          return null;
        },
        querySelectorAll() {
          return [activeLink, inactiveLink];
        },
      },
    });

    facade.syncBrowseNavToLocation();
    expect(activeClasses.has('is-active')).toBe(true);
    expect(inactiveClasses.has('is-active')).toBe(true);
  });

  it('navigates through the current window state and dirty flag owner', () => {
    let allowStates: boolean[] = [];
    let assignedPath = '';
    const facade = createPreviewEditorBootstrapFacadeFromEditorHost({
      ...createTestFacadeOptions(),
      previewWindow: {
        location: {
          pathname: '/view/alpha',
          origin: 'http://127.0.0.1:8100',
          assign(nextPath: string) {
            assignedPath = nextPath;
          },
        },
        confirm() {
          return true;
        },
        setTimeout(callback: () => void) {
          callback();
          return 0;
        },
        dispatchEvent() {
          return true;
        },
      } as unknown as TestWindow,
      navigation: {
        isDirty: () => true,
        setAllowInternalDirtyNavigation(allowed: boolean) {
          allowStates.push(allowed);
        },
        dirtyConfirmMessage: 'Leave?',
      },
    });

    expect(facade.attemptDiagramNavigation('/view/beta', () => {})).toBe(true);
    expect(assignedPath).toBe('/view/beta');
    expect(allowStates).toEqual([true, false]);
  });

  it('fails fast when bootstrapEditorRuntime is called without runtime bootstrap host options', () => {
    const facade = createPreviewEditorBootstrapFacadeFromEditorHost(createTestFacadeOptions());
    expect(() => facade.bootstrapEditorRuntime()).toThrow(
      'preview editor bootstrap facade requires runtime bootstrap host options',
    );
  });
});
