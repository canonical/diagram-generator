import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bootstrapPreviewEditorRuntime,
  bootstrapPreviewEditorHost,
  collectPreviewEngineSavePayload,
  connectPreviewSse,
  createBootstrapPreviewEditorRuntimeOptionsFromHost,
  createBootstrapPreviewEditorHostOptionsFromRuntime,
  createPreviewBuildStatusUpdater,
  createPreviewDiagramLoadSignalState,
  createPreviewOverrideToolbarHostOptions,
  createPreviewSaveClientInitConfig,
  ensurePreviewEditorState,
  ensurePreviewEngineShellController,
  ensurePreviewElkPreviewController,
  getPreviewEngineShellController,
  initPreviewEngineShellPanel,
  initPreviewEditorRuntimeHost,
  isPreviewEngineShellLayoutActive,
  installPreviewEditorTestFacadeHost,
  registerPreviewEditorDocumentBindingsHost,
  registerPreviewPageshowReload,
  restorePreviewSelectionIds,
  signalPreviewDiagramLoaded,
  whenPreviewDiagramLoaded,
} from '../src/preview-shell/app-bootstrap.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('preview bootstrap helpers', () => {
  it('installs fallback editor-state and elk controller globals when absent', () => {
    const previewWindow = {} as Window & typeof globalThis;
    const editorInit = {
      getOverrides: vi.fn(),
      getGridOverrides: vi.fn(),
      getElkLayoutOverrides: vi.fn(),
      getRemovedIds: vi.fn(),
      getFrameTree: vi.fn(),
    };
    const elkInit = {
      getElkLayoutOverrides: vi.fn(() => ({})),
      setElkLayoutOverrides: vi.fn(),
      getRootId: vi.fn(() => 'root'),
      requestV3Relayout: vi.fn(async () => undefined),
    };

    const editorState = ensurePreviewEditorState(previewWindow, editorInit);
    const elkController = ensurePreviewElkPreviewController(previewWindow, elkInit);

    expect(previewWindow.EditorState).toBe(editorState);
    expect(
      (previewWindow as Window & typeof globalThis & {
        PreviewEngineShellController?: unknown;
      }).PreviewEngineShellController,
    ).toBe(elkController);
    expect(previewWindow.ElkPreviewController).toBe(elkController);
    expect(editorState.init).toBeTypeOf('function');
    expect(elkController.init).toBeTypeOf('function');
  });

  it('builds beforeunload protection from preview save-client state', () => {
    const config = createPreviewSaveClientInitConfig({
      slug: 'demo',
      previewSaveClient: {
        init: vi.fn(),
        isDirty: () => true,
      },
      getModel: vi.fn(),
      getSelectedIds: vi.fn(() => []),
      restoreSelectionIds: vi.fn(),
      serializeDirtyState: vi.fn(() => '{}'),
      reloadDiagram: vi.fn(),
      collectEngineSavePayload: vi.fn((payload) => payload),
      getV3RelayoutStatus: vi.fn(),
      getV3RelayoutRuntime: vi.fn(),
      getConstraintSummary: vi.fn(),
      getConstraintErrorCount: vi.fn(() => 0),
      runConstraints: vi.fn(),
      clearCoercedKeys: vi.fn(),
      setStatus: vi.fn(),
      sanitizeSvgCloneForExport: vi.fn(),
      allowInternalDirtyNavigation: () => false,
    });
    const event = {
      returnValue: undefined,
      preventDefault: vi.fn(),
    } as unknown as BeforeUnloadEvent;

    expect(config.onBeforeUnload(event)).toBe('');
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.returnValue).toBe('');
  });

  it('reloads on newer sse generations and schedules reconnects on error', () => {
    let source: { onmessage: ((event: { data: string }) => void) | null; onerror: (() => void) | null } | null = null;
    let generation = 2;
    const reloadDiagram = vi.fn();
    const setBuildStatus = vi.fn();
    const scheduleReconnect = vi.fn((callback: () => void) => {
      callback();
    });

    connectPreviewSse({
      eventSourceFactory: vi.fn(() => {
        source = { onmessage: null, onerror: null };
        return source;
      }),
      getGeneration: () => generation,
      setGeneration: (value) => {
        generation = value;
      },
      reloadDiagram,
      setBuildStatus,
      scheduleReconnect,
      reconnectDelayMs: 250,
    });

    source?.onmessage?.({ data: JSON.stringify({ generation: 3, error: true }) });
    source?.onerror?.();

    expect(generation).toBe(3);
    expect(reloadDiagram).toHaveBeenCalledTimes(1);
    expect(setBuildStatus).toHaveBeenCalledWith({
      kind: 'error',
      message: 'Build error',
    });
    expect(scheduleReconnect).toHaveBeenCalledTimes(1);
    expect(scheduleReconnect).toHaveBeenCalledWith(expect.any(Function), 250);
  });

  it('reloads persisted pageshow restores and ignores fresh navigations', () => {
    const reloadDiagram = vi.fn();
    let listener: ((event: PageTransitionEvent) => void) | null = null;

    registerPreviewPageshowReload({
      addPageshowListener: (nextListener) => {
        listener = nextListener;
      },
      reloadDiagram,
    });

    listener?.({ persisted: false } as PageTransitionEvent);
    listener?.({ persisted: true } as PageTransitionEvent);

    expect(reloadDiagram).toHaveBeenCalledTimes(1);
  });

  it('registers keydown and undo-redo document bindings through the bootstrap host', () => {
    const keydownListeners: Array<(event: KeyboardEvent) => void> = [];
    const undoClick = vi.fn();
    const redoClick = vi.fn();
    const buttons = new Map<string, { addEventListener: (type: 'click', listener: () => void) => void }>();

    registerPreviewEditorDocumentBindingsHost({
      document: {
        addEventListener(_type, listener) {
          keydownListeners.push(listener);
        },
        getElementById(id: string) {
          if (buttons.has(id)) {
            return buttons.get(id) || null;
          }
          const element = {
            addEventListener(_type: 'click', listener: () => void) {
              if (id === 'btn-undo') {
                undoClick.mockImplementation(listener);
              } else if (id === 'btn-redo') {
                redoClick.mockImplementation(listener);
              }
            },
          };
          buttons.set(id, element);
          return element;
        },
      },
      onDocumentKeyDown: vi.fn(),
      onUndoClick: vi.fn(),
      onRedoClick: vi.fn(),
    });

    expect(keydownListeners).toHaveLength(1);
    expect(buttons.has('btn-undo')).toBe(true);
    expect(buttons.has('btn-redo')).toBe(true);
  });

  it('installs the preview test facade and preserves bootstrap ordering', () => {
    const previewWindow = {} as Window & typeof globalThis;
    const orderedCalls: string[] = [];

    installPreviewEditorTestFacadeHost({
      previewWindow,
      saveOverrides: () => {
        orderedCalls.push('saveOverrides');
      },
      undo: () => {
        orderedCalls.push('undo');
      },
      redo: () => {
        orderedCalls.push('redo');
      },
      canUndo: () => true,
      canRedo: () => false,
    });

    expect((previewWindow as { __DG_TEST_preview?: Record<string, () => unknown> }).__DG_TEST_preview).toMatchObject({
      saveOverrides: expect.any(Function),
      undo: expect.any(Function),
      redo: expect.any(Function),
      canUndo: expect.any(Function),
      canRedo: expect.any(Function),
    });

    initPreviewEditorRuntimeHost({
      registerDocumentBindings: () => orderedCalls.push('registerDocumentBindings'),
      installTestFacade: () => orderedCalls.push('installTestFacade'),
      initShellCoordinator: () => orderedCalls.push('initShellCoordinator'),
      initNavTabs: () => orderedCalls.push('initNavTabs'),
      ensureEditorState: () => orderedCalls.push('ensureEditorState'),
      ensureElkPreviewController: () => orderedCalls.push('ensureElkPreviewController'),
      initSaveClient: () => orderedCalls.push('initSaveClient'),
      initOverrideToolbar: () => orderedCalls.push('initOverrideToolbar'),
      registerPageshowReload: () => orderedCalls.push('registerPageshowReload'),
      loadDiagram: () => {
        orderedCalls.push('loadDiagram');
      },
      connectSse: () => orderedCalls.push('connectSse'),
    });

    expect(orderedCalls).toEqual([
      'registerDocumentBindings',
      'installTestFacade',
      'initShellCoordinator',
      'initNavTabs',
      'ensureEditorState',
      'ensureElkPreviewController',
      'initSaveClient',
      'initOverrideToolbar',
      'registerPageshowReload',
      'loadDiagram',
      'connectSse',
    ]);
  });

  it('bootstraps the editor runtime through one high-level host owner', () => {
    const orderedCalls: string[] = [];
    const keydownListeners: Array<(event: KeyboardEvent) => void> = [];
    class FakeSelectElement {}
    const previewWindow = {
      addEventListener(type: string, listener: (event: PageTransitionEvent) => void) {
        orderedCalls.push(`window:${type}`);
        if (type === 'pageshow') {
          listener({ persisted: false } as PageTransitionEvent);
        }
      },
      matchMedia: () => null,
      requestAnimationFrame: undefined,
      HTMLSelectElement: FakeSelectElement,
    } as unknown as Window & typeof globalThis;
    const button = {
      addEventListener(type: 'click', _listener: () => void) {
        orderedCalls.push(`button:${type}`);
      },
    };
    const document = {
      addEventListener(_type: 'keydown', listener: (event: KeyboardEvent) => void) {
        keydownListeners.push(listener);
      },
      getElementById(id: string) {
        if (id === 'btn-undo' || id === 'btn-redo' || id === 'btn-export' || id === 'btn-clear-all') {
          return button;
        }
        if (id === 'diagram-picker') {
          return null;
        }
        return null;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
    } as unknown as Document;

    bootstrapPreviewEditorHost({
      document,
      previewWindow,
      slug: 'demo',
      onDocumentKeyDown: vi.fn(),
      undo() {
        orderedCalls.push('undo');
      },
      redo() {
        orderedCalls.push('redo');
      },
      saveOverrides() {
        orderedCalls.push('saveOverrides');
      },
      canUndo() {
        return true;
      },
      canRedo() {
        return false;
      },
      getCurrentPath() {
        return '/view/v3:demo';
      },
      syncBrowseNav() {
        orderedCalls.push('syncBrowseNav');
      },
      async fetchIndexHtml() {
        orderedCalls.push('fetchIndexHtml');
        return null;
      },
      attemptNavigation() {
        orderedCalls.push('attemptNavigation');
        return true;
      },
      initNavTabs() {
        orderedCalls.push('initNavTabs');
      },
      getOverrides() {
        return {};
      },
      getGridOverrides() {
        return {};
      },
      getElkLayoutOverrides() {
        return {};
      },
      getRemovedIds() {
        return new Set();
      },
      getFrameTree() {
        return null;
      },
      setElkLayoutOverrides() {
        orderedCalls.push('setElkLayoutOverrides');
      },
      getRootId() {
        return 'root';
      },
      requestV3Relayout() {
        orderedCalls.push('requestV3Relayout');
      },
      previewSaveClient: {
        init() {
          orderedCalls.push('previewSaveClient.init');
        },
        isDirty() {
          return false;
        },
      },
      getModel() {
        return {};
      },
      getSelectedIds() {
        return [];
      },
      restoreSelectionIds() {
        orderedCalls.push('restoreSelectionIds');
      },
      serializeDirtyState() {
        return '{}';
      },
      reloadDiagram() {
        orderedCalls.push('reloadDiagram');
      },
      getV3RelayoutStatus() {
        return {};
      },
      getV3RelayoutRuntime() {
        return {};
      },
      getConstraintSummary() {
        return {};
      },
      getConstraintErrorCount() {
        return 0;
      },
      runConstraints() {
        orderedCalls.push('runConstraints');
      },
      clearCoercedKeys() {
        orderedCalls.push('clearCoercedKeys');
      },
      setStatus() {
        orderedCalls.push('setStatus');
      },
      sanitizeSvgCloneForExport() {
        orderedCalls.push('sanitizeSvgCloneForExport');
      },
      allowInternalDirtyNavigation() {
        return false;
      },
      overrideToolbar: {
        exportButton: button as unknown as HTMLElement,
        clearAllButton: button as unknown as HTMLElement,
        slug: 'demo',
        getOverrides() {
          return {};
        },
        writeClipboardText() {
          orderedCalls.push('writeClipboardText');
          return Promise.resolve();
        },
        alert() {
          orderedCalls.push('alert');
        },
        confirmClearAll() {
          orderedCalls.push('confirmClearAll');
          return true;
        },
        confirmClearAllMessage: 'clear demo?',
        onClearAll() {
          orderedCalls.push('onClearAll');
        },
      },
      eventSourceFactory() {
        orderedCalls.push('eventSourceFactory');
        return { onmessage: null, onerror: null };
      },
      getGeneration() {
        return 0;
      },
      setGeneration() {
        orderedCalls.push('setGeneration');
      },
      setBuildStatus() {
        orderedCalls.push('setBuildStatus');
      },
      scheduleReconnect() {
        orderedCalls.push('scheduleReconnect');
      },
    });

    expect(keydownListeners).toHaveLength(1);
    expect(orderedCalls).toContain('initNavTabs');
    expect(orderedCalls).toContain('previewSaveClient.init');
    expect(orderedCalls).toContain('reloadDiagram');
    expect(orderedCalls).toContain('eventSourceFactory');
  });

  it('derives host bootstrap options from a thinner runtime context', () => {
    const selectedIds = new Set(['alpha', 'beta']);
    const model = {
      roots: [{ id: 'root' }],
      gridOverrides: { cols: 6 },
      elkLayoutOverrides: { root: { spacing: 24 } },
      removedIds: new Set(['stale']),
    };
    const options = createBootstrapPreviewEditorHostOptionsFromRuntime({
      document: {
        getElementById(id: string) {
          return id === 'build-status' ? { className: '', textContent: '' } as unknown as HTMLElement : null;
        },
      } as Document,
      previewWindow: {
        location: { pathname: '/view/v3:demo' },
        EventSource: class FakeEventSource {
          onmessage = null;
          onerror = null;
          constructor(_url: string) {}
        } as unknown as typeof EventSource,
      } as unknown as Window & typeof globalThis,
      slug: 'demo',
      model,
      selectedIds,
      reapplySelection: vi.fn(),
      onDocumentKeyDown: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      saveOverrides: vi.fn(),
      canUndo: () => true,
      canRedo: () => false,
      syncBrowseNav: vi.fn(),
      fetchIndexHtml: vi.fn(async () => null),
      attemptNavigation: vi.fn(() => true),
      initNavTabs: vi.fn(),
      getOverrides: () => ({ alpha: { dx: 8 } }),
      getFrameTree: () => ({ frames: [] }),
      requestV3Relayout: vi.fn(async () => undefined),
      previewSaveClient: {
        init: vi.fn(),
        isDirty: () => false,
      },
      serializeDirtyState: () => '{}',
      reloadDiagram: vi.fn(),
      getV3RelayoutStatus: () => ({ localReady: true }),
      getV3RelayoutRuntime: () => ({ sequence: 1 }),
      getConstraintSummary: () => ({ errors: 0 }),
      runConstraints: vi.fn(),
      clearCoercedKeys: vi.fn(),
      setStatus: vi.fn(),
      sanitizeSvgCloneForExport: vi.fn(),
      allowInternalDirtyNavigation: () => false,
      writeClipboardText: vi.fn(),
      alert: vi.fn(),
      confirmClearAll: vi.fn(() => true),
      onClearAllOverrides: vi.fn(),
      getGeneration: () => 2,
      setGeneration: vi.fn(),
      scheduleReconnect: vi.fn(),
    });

    expect(options.getCurrentPath()).toBe('/view/v3:demo');
    expect(options.getGridOverrides()).toEqual({ cols: 6 });
    expect(options.getElkLayoutOverrides()).toEqual({ root: { spacing: 24 } });
    expect(Array.from(options.getRemovedIds() as Set<string>)).toEqual(['stale']);
    expect(options.getRootId()).toBe('root');
    expect(options.getSelectedIds()).toEqual(['alpha', 'beta']);
    expect(options.overrideToolbar.slug).toBe('demo');
    expect(options.eventSourceFactory('/events')).toBeInstanceOf((options.previewWindow.EventSource as typeof EventSource));
  });

  it('derives runtime bootstrap options from thinner host-owned editor state', async () => {
    let generation = 3;
    const applyUndoCommand = vi.fn();
    const fetchIndexHtml = vi.fn(async () => '<html></html>');
    const undo = vi.fn(() => 'undo-result');
    const redo = vi.fn(() => 'redo-result');
    const saveOverrides = vi.fn(() => 'save-result');
    const summarise = vi.fn((violations) => ({ errors: Array.isArray(violations) ? violations.length : 0 }));
    const options = createBootstrapPreviewEditorRuntimeOptionsFromHost({
      document: {
        getElementById: vi.fn(() => null),
      } as unknown as Document,
      previewWindow: {
        location: { pathname: '/view/v3:demo' },
      } as unknown as Window & typeof globalThis,
      slug: 'demo',
      model: { roots: [{ id: 'root' }] },
      selectedIds: new Set(['alpha']),
      reapplySelection: vi.fn(),
      onDocumentKeyDown: vi.fn(),
      editorState: {
        undo,
        redo,
        canUndo: () => true,
        canRedo: () => false,
        serializeDirtyState: () => '{}',
      },
      applyUndoCommand,
      syncBrowseNav: vi.fn(),
      fetchIndexHtml,
      attemptNavigation: vi.fn(() => true),
      initNavTabs: vi.fn(),
      getOverrides: () => ({ alpha: { dx: 8 } }),
      getFrameTree: () => ({ frames: [] }),
      requestV3Relayout: vi.fn(async () => undefined),
      previewSaveClient: {
        init: vi.fn(),
        isDirty: () => false,
        saveOverrides,
      },
      reloadDiagram: vi.fn(),
      getV3RelayoutStatus: () => ({ localReady: true }),
      getV3RelayoutRuntime: () => ({ sequence: 1 }),
      constraints: {
        summarise,
      },
      lastViolations: ['a', 'b'],
      runConstraints: vi.fn(),
      clearCoercedKeys: vi.fn(),
      setStatus: vi.fn(),
      sanitizeSvgCloneForExport: vi.fn(),
      allowInternalDirtyNavigationState: {
        get: () => false,
      },
      writeClipboardText: vi.fn(),
      alert: vi.fn(),
      confirmClearAll: vi.fn(() => true),
      onClearAllOverrides: vi.fn(),
      generationState: {
        get: () => generation,
        set: (value) => {
          generation = value;
        },
      },
      scheduleReconnect: vi.fn(),
    });

    expect(options.undo()).toBe('undo-result');
    expect(options.redo()).toBe('redo-result');
    expect(options.saveOverrides()).toBe('save-result');
    expect(undo).toHaveBeenCalledWith(applyUndoCommand);
    expect(redo).toHaveBeenCalledWith(applyUndoCommand);
    expect(saveOverrides).toHaveBeenCalledTimes(1);
    expect(options.canUndo()).toBe(true);
    expect(options.canRedo()).toBe(false);
    expect(options.serializeDirtyState()).toBe('{}');
    expect(options.getConstraintSummary()).toEqual({ errors: 2 });
    expect(summarise).toHaveBeenCalledWith(['a', 'b']);
    expect(options.allowInternalDirtyNavigation()).toBe(false);
    expect(options.getGeneration()).toBe(3);
    options.setGeneration(4);
    expect(options.getGeneration()).toBe(4);
    expect(await options.fetchIndexHtml()).toBe('<html></html>');
    expect(Array.from(options.selectedIds)).toEqual(['alpha']);
  });

  it('restores selection ids and exposes document-owned build / toolbar helpers', () => {
    const selectedIds = new Set(['stale']);
    const reapplySelection = vi.fn();
    restorePreviewSelectionIds(selectedIds, ['alpha', 'beta'], reapplySelection);
    expect(Array.from(selectedIds)).toEqual(['alpha', 'beta']);
    expect(reapplySelection).toHaveBeenCalledTimes(1);

    const buildStatusEl = { className: '', textContent: '' };
    const setBuildStatus = createPreviewBuildStatusUpdater({
      getElementById(id: string) {
        return id === 'build-status' ? buildStatusEl as unknown as HTMLElement : null;
      },
    } as Pick<Document, 'getElementById'>);
    setBuildStatus({ kind: 'ok', message: 'Rebuilt #2' });
    expect(buildStatusEl.className).toBe('build-status build-ok');
    expect(buildStatusEl.textContent).toBe('Rebuilt #2');

    const toolbarOptions = createPreviewOverrideToolbarHostOptions({
      document: {
        getElementById: vi.fn(() => null),
      } as Pick<Document, 'getElementById'>,
      slug: 'demo',
      getOverrides: () => ({}),
      writeClipboardText: vi.fn(),
      alert: vi.fn(),
      confirmClearAll: vi.fn(() => true),
      onClearAllOverrides: vi.fn(),
    });
    expect(toolbarOptions.slug).toBe('demo');
    expect(toolbarOptions.confirmClearAllMessage).toBe('Clear all overrides for demo?');
  });

  it('bootstraps through the runtime-owned entrypoint without editor.js assembling host-only glue', () => {
    const previewWindow = {
      location: { pathname: '/view/v3:demo' },
      EventSource: class FakeEventSource {
        onmessage = null;
        onerror = null;
        constructor(_url: string) {}
      } as unknown as typeof EventSource,
      addEventListener: vi.fn(),
      matchMedia: () => null,
      HTMLSelectElement: class FakeSelectElement {},
    } as unknown as Window & typeof globalThis;
    const button = { addEventListener: vi.fn() };
    const document = {
      addEventListener: vi.fn(),
      getElementById(id: string) {
        if (id === 'btn-undo' || id === 'btn-redo' || id === 'btn-export' || id === 'btn-clear-all') {
          return button;
        }
        if (id === 'build-status') {
          return { className: '', textContent: '' } as unknown as HTMLElement;
        }
        return null;
      },
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
    } as unknown as Document;

    expect(() => bootstrapPreviewEditorRuntime({
      document,
      previewWindow,
      slug: 'demo',
      model: { roots: [{ id: 'root' }] },
      selectedIds: new Set<string>(),
      reapplySelection: vi.fn(),
      onDocumentKeyDown: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      saveOverrides: vi.fn(),
      canUndo: () => true,
      canRedo: () => false,
      syncBrowseNav: vi.fn(),
      fetchIndexHtml: vi.fn(async () => null),
      attemptNavigation: vi.fn(() => true),
      initNavTabs: vi.fn(),
      getOverrides: () => ({}),
      getFrameTree: () => null,
      requestV3Relayout: vi.fn(async () => undefined),
      previewSaveClient: { init: vi.fn(), isDirty: () => false },
      serializeDirtyState: () => '{}',
      reloadDiagram: vi.fn(),
      getV3RelayoutStatus: () => ({}),
      getV3RelayoutRuntime: () => ({}),
      getConstraintSummary: () => ({ errors: 0 }),
      runConstraints: vi.fn(),
      clearCoercedKeys: vi.fn(),
      setStatus: vi.fn(),
      sanitizeSvgCloneForExport: vi.fn(),
      allowInternalDirtyNavigation: () => false,
      writeClipboardText: vi.fn(),
      alert: vi.fn(),
      confirmClearAll: vi.fn(() => true),
      onClearAllOverrides: vi.fn(),
      getGeneration: () => 0,
      setGeneration: vi.fn(),
      scheduleReconnect: vi.fn(),
    })).not.toThrow();
  });

  it('resolves generic preview-engine shell helpers through the registered controller', () => {
    const init = vi.fn();
    const initializePanel = vi.fn();
    const applyLayoutOverrides = vi.fn();
    const collectPersistedPayload = vi.fn((payload: Record<string, unknown>) => ({
      ...payload,
      lane: 'engine',
    }));
    const previewWindow = {
      PreviewEngineShellController: {
        init,
        isActiveLayoutEngine() {
          return true;
        },
        initializePanel,
        applyLayoutOverrides,
        collectPersistedPayload,
        isElkLayeredDiagram() {
          return true;
        },
        wirePanel() {},
        syncPanel() {},
        initPanel() {},
        applyElkLayoutOverrides() {},
        requestRelayout() {
          return Promise.resolve();
        },
      },
    } as unknown as Window & typeof globalThis;

    const controller = ensurePreviewEngineShellController(previewWindow, {
      getElkLayoutOverrides: () => ({}),
      setElkLayoutOverrides: () => {},
      getRootId: () => 'root',
      requestV3Relayout: async () => undefined,
    });

    expect(getPreviewEngineShellController(previewWindow)).toBe(controller);
    expect(isPreviewEngineShellLayoutActive(previewWindow)).toBe(true);
    initPreviewEngineShellPanel(previewWindow);
    expect(initializePanel).toHaveBeenCalledTimes(1);
    expect(collectPreviewEngineSavePayload(previewWindow, { saved: true }, { elkLayoutOverrides: {} })).toEqual({
      saved: true,
      lane: 'engine',
    });
    expect(collectPersistedPayload).toHaveBeenCalledTimes(1);
  });

  it('supports representative non-ELK engine classes through the same generic shell-controller seam', () => {
    const engineCases = [
      {
        id: 'mermaid-flowchart',
        classLabel: 'ported-diagram-family',
        persistedPayload: { mermaid_layout_overrides: { rankdir: 'LR' } },
      },
      {
        id: 'bespoke-grid',
        classLabel: 'bespoke-in-house',
        persistedPayload: { bespoke_layout_overrides: { laneSpacing: 24 } },
      },
    ] as const;

    for (const engineCase of engineCases) {
      const init = vi.fn();
      const initializePanel = vi.fn();
      const collectPersistedPayload = vi.fn((payload: Record<string, unknown>) => ({
        ...payload,
        engine: engineCase.id,
        classLabel: engineCase.classLabel,
        ...engineCase.persistedPayload,
      }));
      const previewWindow = {
        PreviewEngineShellController: {
          init,
          isActiveLayoutEngine(frameTreeJson?: unknown) {
            return (frameTreeJson as { layoutEngine?: string } | undefined)?.layoutEngine === engineCase.id;
          },
          initializePanel,
          collectPersistedPayload,
          wirePanel() {},
          syncPanel() {},
          initPanel() {},
          applyElkLayoutOverrides() {},
          requestRelayout() {
            return Promise.resolve();
          },
        },
      } as unknown as Window & typeof globalThis;

      ensurePreviewEngineShellController(previewWindow, {
        getElkLayoutOverrides: () => ({}),
        setElkLayoutOverrides: () => {},
        getRootId: () => 'root',
        requestV3Relayout: async () => undefined,
      });

      expect(isPreviewEngineShellLayoutActive(previewWindow, { layoutEngine: engineCase.id })).toBe(true);
      initPreviewEngineShellPanel(previewWindow);
      expect(initializePanel).toHaveBeenCalledTimes(1);
      expect(
        collectPreviewEngineSavePayload(previewWindow, { saved: true }, { elkLayoutOverrides: {} }),
      ).toMatchObject({
        saved: true,
        engine: engineCase.id,
        classLabel: engineCase.classLabel,
      });
    }
  });

  it('tracks diagram-load generations and resolves waiters when the stage becomes ready', async () => {
    const state = createPreviewDiagramLoadSignalState();
    const dispatchEvent = vi.fn();
    const previewWindow = {
      dispatchEvent,
    } as unknown as Window & typeof globalThis;

    const pending = whenPreviewDiagramLoaded(state, () => false);
    const generation = signalPreviewDiagramLoaded(state, previewWindow, 'demo');

    await expect(pending).resolves.toBe(1);
    expect(generation).toBe(1);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);

    await expect(whenPreviewDiagramLoaded(state, () => true)).resolves.toBe(1);
  });
});
