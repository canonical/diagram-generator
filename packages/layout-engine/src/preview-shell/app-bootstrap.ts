/**
 * Preview shell bootstrap helpers (spec 043 shell coordinator slice H).
 *
 * These helpers own the repetitive shell setup at the bottom of editor.js so
 * the legacy script stays focused on wiring repo-specific callbacks together.
 */

import { initPreviewDiagramNavigation } from './app-diagram-navigation.js';
import { initPreviewShellResizeBindings } from './app-shell-resize.js';
import {
  initPreviewOverrideToolbar,
  type InitPreviewOverrideToolbarOptions,
} from './app-shell-panels.js';

export interface PreviewEditorStateInitOptions {
  getOverrides: () => unknown;
  getGridOverrides: () => unknown;
  getElkLayoutOverrides: () => unknown;
  getRemovedIds: () => unknown;
  getFrameTree: () => unknown;
}

export interface PreviewEditorStateApi {
  init: (options: PreviewEditorStateInitOptions) => void;
  [key: string]: unknown;
}

export interface PreviewElkControllerInitOptions {
  getElkLayoutOverrides: () => Record<string, unknown>;
  setElkLayoutOverrides: (value: Record<string, unknown>) => void;
  getRootId: () => string;
  requestV3Relayout: (cid: string) => Promise<unknown>;
}

export interface PreviewElkControllerApi {
  init: (options: PreviewElkControllerInitOptions) => void;
  isElkLayeredDiagram: (frameTreeJson?: unknown) => boolean;
  wirePanel: () => void;
  syncPanel: () => void;
  initPanel: () => void;
  applyElkLayoutOverrides: (overrides: Record<string, unknown>) => void;
  requestRelayout: () => Promise<void>;
  [key: string]: unknown;
}

export interface PreviewEnginePayloadModelLike {
  elkLayoutOverrides?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PreviewEngineShellControllerApi extends PreviewElkControllerApi {
  isActiveLayoutEngine?: (frameTreeJson?: unknown) => boolean;
  initializePanel?: () => void;
  applyLayoutOverrides?: (overrides: Record<string, unknown>) => void;
  collectPersistedPayload?: (
    basePayload: Record<string, unknown>,
    model: PreviewEnginePayloadModelLike,
  ) => Record<string, unknown>;
}

export interface PreviewShellCoordinatorInitOptions {
  document: Document;
  window: Window & typeof globalThis;
  getCurrentPath: () => string;
  syncBrowseNav: () => void;
  fetchIndexHtml: () => Promise<string | null>;
  attemptNavigation: (nextUrl: string | null | undefined, syncUi: () => void) => boolean;
}

export interface PreviewSaveClientApi {
  init: (options: PreviewSaveClientInitConfig) => void;
  isDirty: () => boolean;
}

export interface PreviewSaveClientInitOptions {
  slug: string;
  previewSaveClient: PreviewSaveClientApi;
  getModel: () => unknown;
  getSelectedIds: () => string[];
  restoreSelectionIds: (ids: string[]) => void;
  serializeDirtyState: () => string;
  reloadDiagram: (options?: unknown) => unknown;
  collectEngineSavePayload?: (
    basePayload: Record<string, unknown>,
    model: PreviewEnginePayloadModelLike,
  ) => Record<string, unknown>;
  getV3RelayoutStatus: () => unknown;
  getV3RelayoutRuntime: () => unknown;
  getConstraintSummary: () => unknown;
  getConstraintErrorCount: () => number;
  runConstraints: () => unknown;
  clearCoercedKeys: () => void;
  setStatus: (message: string, kind?: string) => void;
  sanitizeSvgCloneForExport: (clone: SVGElement) => void;
  allowInternalDirtyNavigation: () => boolean;
}

export interface PreviewSaveClientInitConfig {
  slug: string;
  getModel: () => unknown;
  getSelectedIds: () => string[];
  restoreSelectionIds: (ids: string[]) => void;
  serializeDirtyState: () => string;
  reloadDiagram: (options?: unknown) => unknown;
  collectEngineSavePayload?: (
    basePayload: Record<string, unknown>,
    model: PreviewEnginePayloadModelLike,
  ) => Record<string, unknown>;
  getV3RelayoutStatus: () => unknown;
  getV3RelayoutRuntime: () => unknown;
  getConstraintSummary: () => unknown;
  getConstraintErrorCount: () => number;
  runConstraints: () => unknown;
  clearCoercedKeys: () => void;
  setStatus: (message: string, kind?: string) => void;
  sanitizeSvgCloneForExport: (clone: SVGElement) => void;
  onBeforeUnload: (event: BeforeUnloadEvent) => string | void;
}

export interface PreviewPageshowReloadOptions {
  addPageshowListener: (listener: (event: PageTransitionEvent) => void) => void;
  reloadDiagram: () => unknown;
}

export interface PreviewBuildStatusUpdate {
  message: string;
  kind: 'error' | 'ok';
}

export interface PreviewEventSourceLike {
  onmessage: ((event: { data: string }) => void) | null;
  onerror: (() => void) | null;
}

export interface ConnectPreviewSseOptions {
  eventSourceFactory: (url: string) => PreviewEventSourceLike;
  getGeneration: () => number;
  setGeneration: (value: number) => void;
  reloadDiagram: () => unknown;
  setBuildStatus: (update: PreviewBuildStatusUpdate) => void;
  scheduleReconnect?: (callback: () => void, delayMs: number) => unknown;
  reconnectDelayMs?: number;
}

export interface PreviewEditorBindingButtonLike {
  addEventListener: (type: 'click', listener: () => void) => void;
}

export interface PreviewEditorDocumentBindingsHostOptions {
  document: {
    addEventListener: (type: 'keydown', listener: (event: KeyboardEvent) => void) => void;
    getElementById: (id: string) => PreviewEditorBindingButtonLike | null;
  };
  onDocumentKeyDown: (event: KeyboardEvent) => void;
  onUndoClick: () => void;
  onRedoClick: () => void;
}

export interface PreviewEditorTestFacadeHostOptions {
  previewWindow: Window & typeof globalThis & {
    __DG_TEST_preview?: unknown;
  };
  saveOverrides: () => unknown;
  undo: () => unknown;
  redo: () => unknown;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export interface InitPreviewEditorRuntimeHostOptions {
  registerDocumentBindings?: (() => void) | null;
  installTestFacade?: (() => void) | null;
  initShellCoordinator: () => void;
  initNavTabs: () => void;
  ensureEditorState: () => void;
  ensureElkPreviewController: () => void;
  initSaveClient: () => void;
  initOverrideToolbar: () => void;
  registerPageshowReload: () => void;
  loadDiagram: () => unknown;
  connectSse: () => void;
}

export interface BootstrapPreviewEditorHostOptions {
  document: Document;
  previewWindow: PreviewGlobalWindow;
  slug: string;
  onDocumentKeyDown: (event: KeyboardEvent) => void;
  undo: () => unknown;
  redo: () => unknown;
  saveOverrides: () => unknown;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getCurrentPath: () => string;
  syncBrowseNav: () => void;
  fetchIndexHtml: () => Promise<string | null>;
  attemptNavigation: (nextUrl: string | null | undefined, syncUi: () => void) => boolean;
  initNavTabs: () => void;
  getOverrides: () => unknown;
  getGridOverrides: () => unknown;
  getElkLayoutOverrides: () => Record<string, unknown>;
  getRemovedIds: () => unknown;
  getFrameTree: () => unknown;
  setElkLayoutOverrides: (value: Record<string, unknown>) => void;
  getRootId: () => string;
  requestV3Relayout: (cid: string) => Promise<unknown> | unknown;
  previewSaveClient: PreviewSaveClientApi;
  getModel: () => unknown;
  getSelectedIds: () => string[];
  restoreSelectionIds: (ids: string[]) => void;
  serializeDirtyState: () => string;
  reloadDiagram: (options?: unknown) => unknown;
  getV3RelayoutStatus: () => unknown;
  getV3RelayoutRuntime: () => unknown;
  getConstraintSummary: () => unknown;
  getConstraintErrorCount: () => number;
  runConstraints: () => unknown;
  clearCoercedKeys: () => void;
  setStatus: (message: string, kind?: string) => void;
  sanitizeSvgCloneForExport: (clone: SVGElement) => void;
  allowInternalDirtyNavigation: () => boolean;
  overrideToolbar: InitPreviewOverrideToolbarOptions;
  eventSourceFactory: (url: string) => PreviewEventSourceLike;
  getGeneration: () => number;
  setGeneration: (value: number) => void;
  setBuildStatus: (update: PreviewBuildStatusUpdate) => void;
  scheduleReconnect?: (callback: () => void, delayMs: number) => unknown;
  reconnectDelayMs?: number;
}

export interface PreviewDiagramLoadSignalState {
  generation: number;
  resolvers: Array<(generation: number) => void>;
}

type PreviewGlobalWindow = Window & typeof globalThis & {
  EditorState?: PreviewEditorStateApi;
  ElkPreviewController?: PreviewElkControllerApi;
  PreviewEngineShellController?: PreviewEngineShellControllerApi;
  ElkLayoutControls?: {
    collectOverrides?: () => Record<string, unknown>;
  };
  __DG_DIAGRAM_LOAD_GENERATION?: number;
  whenDiagramLoaded?: () => Promise<number>;
};

export function createPreviewDiagramLoadSignalState(): PreviewDiagramLoadSignalState {
  return {
    generation: 0,
    resolvers: [],
  };
}

export function signalPreviewDiagramLoaded(
  state: PreviewDiagramLoadSignalState,
  previewWindow: PreviewGlobalWindow,
  slug: string,
): number {
  state.generation += 1;
  previewWindow.__DG_DIAGRAM_LOAD_GENERATION = state.generation;
  const resolvers = state.resolvers;
  state.resolvers = [];
  for (const resolve of resolvers) {
    resolve(state.generation);
  }
  previewWindow.dispatchEvent(new CustomEvent('dg-diagram-loaded', {
    detail: { generation: state.generation, slug },
  }));
  return state.generation;
}

export function whenPreviewDiagramLoaded(
  state: PreviewDiagramLoadSignalState,
  hasRenderedStageSvg: () => boolean,
): Promise<number> {
  return new Promise((resolve) => {
    if (hasRenderedStageSvg()) {
      resolve(state.generation);
      return;
    }
    state.resolvers.push(resolve);
  });
}

function createPreviewEditorStateFallback(): PreviewEditorStateApi {
  return {
    init() {},
    cloneValue(value: unknown) {
      return JSON.parse(JSON.stringify(value || {}));
    },
    serializeDirtyState() {
      return '{}';
    },
    normalizeGridOverrides(value: unknown) {
      return value || {};
    },
    beginUndoableAction(label: string) {
      return { label, before: '{}' };
    },
    commitUndoableAction() {
      return false;
    },
    commitOverridePatchAction() {
      return false;
    },
    runUndoableAction<T>(_label: string, mutate: () => T) {
      return mutate();
    },
    pushUndoCommand() {
      return false;
    },
    captureOverrideEntries() {
      return {};
    },
    canUndo() {
      return false;
    },
    canRedo() {
      return false;
    },
    undo() {
      return Promise.resolve(null);
    },
    redo() {
      return Promise.resolve(null);
    },
    clearUndoHistory() {},
    getPendingGridAction() {
      return null;
    },
    setPendingGridAction() {},
    updateUndoRedoButtons() {},
  };
}

function createPreviewElkControllerFallback(): PreviewElkControllerApi {
  return {
    init() {},
    isElkLayeredDiagram() {
      return false;
    },
    wirePanel() {},
    syncPanel() {},
    initPanel() {},
    applyElkLayoutOverrides() {},
    requestRelayout() {
      return Promise.resolve();
    },
  };
}

function createPreviewEngineShellControllerFallback(): PreviewEngineShellControllerApi {
  const fallback = createPreviewElkControllerFallback() as PreviewEngineShellControllerApi;
  fallback.isActiveLayoutEngine = () => false;
  fallback.initializePanel = () => {};
  fallback.applyLayoutOverrides = () => {};
  fallback.collectPersistedPayload = (basePayload) => ({ ...basePayload });
  return fallback;
}

export function getPreviewEngineShellController(
  previewWindow: PreviewGlobalWindow,
): PreviewEngineShellControllerApi | null {
  const controller = previewWindow.PreviewEngineShellController
    ?? previewWindow.ElkPreviewController
    ?? null;
  return controller as PreviewEngineShellControllerApi | null;
}

export function isPreviewEngineShellLayoutActive(
  previewWindow: PreviewGlobalWindow,
  frameTreeJson?: unknown,
): boolean {
  const controller = getPreviewEngineShellController(previewWindow);
  if (!controller) {
    return false;
  }
  if (typeof controller.isActiveLayoutEngine === 'function') {
    return Boolean(controller.isActiveLayoutEngine(frameTreeJson));
  }
  if (typeof controller.isElkLayeredDiagram === 'function') {
    return Boolean(controller.isElkLayeredDiagram(frameTreeJson));
  }
  return false;
}

export function initPreviewEngineShellPanel(
  previewWindow: PreviewGlobalWindow,
): void {
  const controller = getPreviewEngineShellController(previewWindow);
  if (!controller) {
    return;
  }
  if (typeof controller.initializePanel === 'function') {
    controller.initializePanel();
    return;
  }
  if (typeof controller.initPanel === 'function') {
    controller.initPanel();
    return;
  }
  if (typeof controller.wirePanel === 'function') {
    controller.wirePanel();
  }
}

export function collectPreviewEngineSavePayload(
  previewWindow: PreviewGlobalWindow,
  basePayload: Record<string, unknown>,
  model: PreviewEnginePayloadModelLike,
): Record<string, unknown> {
  const controller = getPreviewEngineShellController(previewWindow);
  if (!controller) {
    return basePayload;
  }

  if (typeof controller.collectPersistedPayload === 'function') {
    return controller.collectPersistedPayload(basePayload, model);
  }

  if (!isPreviewEngineShellLayoutActive(previewWindow)) {
    return basePayload;
  }

  const collectOverrides = previewWindow.ElkLayoutControls?.collectOverrides;
  if (typeof collectOverrides !== 'function') {
    return basePayload;
  }

  initPreviewEngineShellPanel(previewWindow);
  const domOverrides = collectOverrides();
  const layoutOverrides = {
    ...(model.elkLayoutOverrides || {}),
    ...(domOverrides || {}),
  };

  if (typeof controller.applyLayoutOverrides === 'function') {
    controller.applyLayoutOverrides(layoutOverrides);
  } else if (typeof controller.applyElkLayoutOverrides === 'function') {
    controller.applyElkLayoutOverrides(layoutOverrides);
  }

  return {
    ...basePayload,
    elk_layout_overrides: { ...layoutOverrides },
  };
}

function isHtmlSelectElement(
  value: Element | null,
  previewWindow: Window & typeof globalThis,
): value is HTMLSelectElement {
  return value instanceof previewWindow.HTMLSelectElement;
}

export function initPreviewShellCoordinator(
  options: PreviewShellCoordinatorInitOptions,
): void {
  const navigation = options.document.getElementById('dg-component-navigation');
  const aside = options.document.getElementById('dg-preview-aside');

  initPreviewShellResizeBindings({
    application: options.document.querySelector('.dg-preview-app'),
    navigation,
    navigationHandle: navigation?.querySelector('.bf-application-navigation-resize-handle'),
    aside,
    asideHandle: aside?.querySelector('.bf-application-aside-resize-handle'),
    desktopMedia: options.window.matchMedia
      ? options.window.matchMedia('(min-width: 48rem)')
      : null,
  });

  const picker = options.document.getElementById('diagram-picker');
  if (!isHtmlSelectElement(picker, options.window)) {
    return;
  }

  initPreviewDiagramNavigation({
    picker,
    prevButton: options.document.getElementById('diagram-prev'),
    nextButton: options.document.getElementById('diagram-next'),
    browseLinks: Array.from(options.document.querySelectorAll('.dg-browse-link')),
    getCurrentPath: options.getCurrentPath,
    syncBrowseNav: options.syncBrowseNav,
    fetchIndexHtml: options.fetchIndexHtml,
    attemptNavigation: options.attemptNavigation,
    requestAnimationFrameFn: options.window.requestAnimationFrame
      ? (callback) => options.window.requestAnimationFrame(callback)
      : null,
    addPageshowListener: (handler) => {
      options.window.addEventListener('pageshow', () => {
        handler();
      });
    },
  });
}

export function ensurePreviewEditorState(
  previewWindow: PreviewGlobalWindow,
  initOptions: PreviewEditorStateInitOptions,
): PreviewEditorStateApi {
  const editorState = previewWindow.EditorState ?? createPreviewEditorStateFallback();
  previewWindow.EditorState = editorState;
  editorState.init(initOptions);
  return editorState;
}

export function ensurePreviewElkPreviewController(
  previewWindow: PreviewGlobalWindow,
  initOptions: PreviewElkControllerInitOptions,
): PreviewElkControllerApi {
  return ensurePreviewEngineShellController(previewWindow, initOptions);
}

export function ensurePreviewEngineShellController(
  previewWindow: PreviewGlobalWindow,
  initOptions: PreviewElkControllerInitOptions,
): PreviewEngineShellControllerApi {
  const controller = getPreviewEngineShellController(previewWindow)
    ?? createPreviewEngineShellControllerFallback();
  previewWindow.PreviewEngineShellController = controller;
  previewWindow.ElkPreviewController = controller;
  controller.init(initOptions);
  return controller;
}

export function createPreviewSaveClientInitConfig(
  options: PreviewSaveClientInitOptions,
): PreviewSaveClientInitConfig {
  return {
    slug: options.slug,
    getModel: options.getModel,
    getSelectedIds: options.getSelectedIds,
    restoreSelectionIds: options.restoreSelectionIds,
    serializeDirtyState: options.serializeDirtyState,
    reloadDiagram: options.reloadDiagram,
    collectEngineSavePayload: options.collectEngineSavePayload,
    getV3RelayoutStatus: options.getV3RelayoutStatus,
    getV3RelayoutRuntime: options.getV3RelayoutRuntime,
    getConstraintSummary: options.getConstraintSummary,
    getConstraintErrorCount: options.getConstraintErrorCount,
    runConstraints: options.runConstraints,
    clearCoercedKeys: options.clearCoercedKeys,
    setStatus: options.setStatus,
    sanitizeSvgCloneForExport: options.sanitizeSvgCloneForExport,
    onBeforeUnload: (event) => {
      if (options.previewSaveClient.isDirty() && !options.allowInternalDirtyNavigation()) {
        event.preventDefault();
        event.returnValue = '';
        return '';
      }
      return undefined;
    },
  };
}

export function initPreviewSaveClient(options: PreviewSaveClientInitOptions): void {
  options.previewSaveClient.init(createPreviewSaveClientInitConfig(options));
}

export function registerPreviewPageshowReload(
  options: PreviewPageshowReloadOptions,
): void {
  options.addPageshowListener((event) => {
    if (event.persisted) {
      void options.reloadDiagram();
    }
  });
}

export function registerPreviewEditorDocumentBindingsHost(
  options: PreviewEditorDocumentBindingsHostOptions,
): void {
  options.document.addEventListener('keydown', options.onDocumentKeyDown);
  options.document.getElementById('btn-undo')?.addEventListener('click', options.onUndoClick);
  options.document.getElementById('btn-redo')?.addEventListener('click', options.onRedoClick);
}

export function installPreviewEditorTestFacadeHost(
  options: PreviewEditorTestFacadeHostOptions,
): void {
  options.previewWindow.__DG_TEST_preview = Object.freeze({
    saveOverrides: () => options.saveOverrides(),
    undo: () => options.undo(),
    redo: () => options.redo(),
    canUndo: () => options.canUndo(),
    canRedo: () => options.canRedo(),
  });
}

export function initPreviewEditorRuntimeHost(
  options: InitPreviewEditorRuntimeHostOptions,
): void {
  options.registerDocumentBindings?.();
  options.installTestFacade?.();
  options.initShellCoordinator();
  options.initNavTabs();
  options.ensureEditorState();
  options.ensureElkPreviewController();
  options.initSaveClient();
  options.initOverrideToolbar();
  options.registerPageshowReload();
  void options.loadDiagram();
  options.connectSse();
}

export function bootstrapPreviewEditorHost(
  options: BootstrapPreviewEditorHostOptions,
): void {
  initPreviewEditorRuntimeHost({
    registerDocumentBindings: () => {
      registerPreviewEditorDocumentBindingsHost({
        document: options.document,
        onDocumentKeyDown: options.onDocumentKeyDown,
        onUndoClick: () => {
          void options.undo();
        },
        onRedoClick: () => {
          void options.redo();
        },
      });
    },
    installTestFacade: () => {
      installPreviewEditorTestFacadeHost({
        previewWindow: options.previewWindow,
        saveOverrides: options.saveOverrides,
        undo: options.undo,
        redo: options.redo,
        canUndo: options.canUndo,
        canRedo: options.canRedo,
      });
    },
    initShellCoordinator: () => {
      initPreviewShellCoordinator({
        document: options.document,
        window: options.previewWindow,
        getCurrentPath: options.getCurrentPath,
        syncBrowseNav: options.syncBrowseNav,
        fetchIndexHtml: options.fetchIndexHtml,
        attemptNavigation: options.attemptNavigation,
      });
    },
    initNavTabs: options.initNavTabs,
    ensureEditorState: () => {
      ensurePreviewEditorState(options.previewWindow, {
        getOverrides: options.getOverrides,
        getGridOverrides: options.getGridOverrides,
        getElkLayoutOverrides: options.getElkLayoutOverrides,
        getRemovedIds: options.getRemovedIds,
        getFrameTree: options.getFrameTree,
      });
    },
    ensureElkPreviewController: () => {
      ensurePreviewEngineShellController(options.previewWindow, {
        getElkLayoutOverrides: options.getElkLayoutOverrides,
        setElkLayoutOverrides: options.setElkLayoutOverrides,
        getRootId: options.getRootId,
        requestV3Relayout: (cid) => Promise.resolve(options.requestV3Relayout(cid)),
      });
    },
    initSaveClient: () => {
      initPreviewSaveClient({
        slug: options.slug,
        previewSaveClient: options.previewSaveClient,
        getModel: options.getModel,
        getSelectedIds: options.getSelectedIds,
        restoreSelectionIds: options.restoreSelectionIds,
        serializeDirtyState: options.serializeDirtyState,
        reloadDiagram: options.reloadDiagram,
        collectEngineSavePayload: (basePayload, model) => (
          collectPreviewEngineSavePayload(options.previewWindow, basePayload, model)
        ),
        getV3RelayoutStatus: options.getV3RelayoutStatus,
        getV3RelayoutRuntime: options.getV3RelayoutRuntime,
        getConstraintSummary: options.getConstraintSummary,
        getConstraintErrorCount: options.getConstraintErrorCount,
        runConstraints: options.runConstraints,
        clearCoercedKeys: options.clearCoercedKeys,
        setStatus: options.setStatus,
        sanitizeSvgCloneForExport: options.sanitizeSvgCloneForExport,
        allowInternalDirtyNavigation: options.allowInternalDirtyNavigation,
      });
    },
    initOverrideToolbar: () => {
      initPreviewOverrideToolbar(options.overrideToolbar);
    },
    registerPageshowReload: () => {
      registerPreviewPageshowReload({
        addPageshowListener: (listener) => {
          options.previewWindow.addEventListener('pageshow', listener);
        },
        reloadDiagram: () => options.reloadDiagram(),
      });
    },
    loadDiagram: () => options.reloadDiagram(),
    connectSse: () => {
      connectPreviewSse({
        eventSourceFactory: options.eventSourceFactory,
        getGeneration: options.getGeneration,
        setGeneration: options.setGeneration,
        reloadDiagram: () => options.reloadDiagram(),
        setBuildStatus: options.setBuildStatus,
        scheduleReconnect: options.scheduleReconnect,
        reconnectDelayMs: options.reconnectDelayMs,
      });
    },
  });
}

export function connectPreviewSse(
  options: ConnectPreviewSseOptions,
): PreviewEventSourceLike {
  const eventSource = options.eventSourceFactory('/events');
  const reconnectDelayMs = options.reconnectDelayMs ?? 2000;
  const scheduleReconnect = options.scheduleReconnect
    ?? ((callback: () => void, delayMs: number) => setTimeout(callback, delayMs));

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data) as { generation?: number; error?: boolean };
    if (typeof data.generation !== 'number' || data.generation <= options.getGeneration()) {
      return;
    }

    options.setGeneration(data.generation);
    void options.reloadDiagram();
    options.setBuildStatus({
      kind: data.error ? 'error' : 'ok',
      message: data.error ? 'Build error' : `Rebuilt #${data.generation}`,
    });
  };

  eventSource.onerror = () => {
    scheduleReconnect(() => {
      connectPreviewSse(options);
    }, reconnectDelayMs);
  };

  return eventSource;
}
