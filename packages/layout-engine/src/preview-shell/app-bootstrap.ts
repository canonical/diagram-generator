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
  type PreviewOverrideExportEntry,
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

export interface PreviewRuntimeSaveClientApi extends PreviewSaveClientApi {
  saveOverrides: () => unknown;
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
  onmessage: ((this: EventSource, event: { data: string }) => unknown) | null;
  onerror: ((this: EventSource, event?: unknown) => unknown) | null;
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
  getOverrides: () => Record<string, PreviewOverrideExportEntry>;
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

export interface PreviewBootstrapRuntimeModelLike {
  roots?: Array<{ id?: string | null }>;
  gridOverrides?: unknown;
  elkLayoutOverrides?: Record<string, unknown>;
  removedIds?: unknown;
  [key: string]: unknown;
}

export interface CreatePreviewOverrideToolbarHostOptions {
  document: Pick<Document, 'getElementById'>;
  slug: string;
  getOverrides: () => Record<string, PreviewOverrideExportEntry>;
  writeClipboardText: (text: string) => Promise<unknown>;
  alert: (message: string) => void;
  confirmClearAll: (message: string) => boolean;
  onClearAllOverrides: () => void;
  confirmClearAllMessage?: string;
}

export interface BootstrapPreviewEditorRuntimeOptions {
  document: Document;
  previewWindow: PreviewGlobalWindow;
  slug: string;
  model: PreviewBootstrapRuntimeModelLike;
  selectedIds: Set<string>;
  reapplySelection: () => void;
  onDocumentKeyDown: (event: KeyboardEvent) => void;
  undo: () => unknown;
  redo: () => unknown;
  saveOverrides: () => unknown;
  canUndo: () => boolean;
  canRedo: () => boolean;
  syncBrowseNav: () => void;
  fetchIndexHtml: () => Promise<string | null>;
  attemptNavigation: (nextUrl: string | null | undefined, syncUi: () => void) => boolean;
  initNavTabs: () => void;
  getOverrides: () => Record<string, PreviewOverrideExportEntry>;
  getFrameTree: () => unknown;
  requestV3Relayout: (cid: string) => Promise<unknown> | unknown;
  previewSaveClient: PreviewSaveClientApi;
  serializeDirtyState: () => string;
  reloadDiagram: (options?: unknown) => unknown;
  getV3RelayoutStatus: () => unknown;
  getV3RelayoutRuntime: () => unknown;
  getConstraintSummary: () => unknown;
  getConstraintErrorCount?: (() => number) | null;
  runConstraints: () => unknown;
  clearCoercedKeys: () => void;
  setStatus: (message: string, kind?: string) => void;
  sanitizeSvgCloneForExport: (clone: SVGElement) => void;
  allowInternalDirtyNavigation: () => boolean;
  writeClipboardText: (text: string) => Promise<unknown>;
  alert: (message: string) => void;
  confirmClearAll: (message: string) => boolean;
  onClearAllOverrides: () => void;
  getGeneration: () => number;
  setGeneration: (value: number) => void;
  scheduleReconnect?: (callback: () => void, delayMs: number) => unknown;
  reconnectDelayMs?: number;
}

export interface PreviewEditorUndoStateApi {
  undo: (applyUndoCommand: (...args: unknown[]) => unknown) => unknown;
  redo: (applyUndoCommand: (...args: unknown[]) => unknown) => unknown;
  canUndo: () => boolean;
  canRedo: () => boolean;
  serializeDirtyState: () => string;
}

export interface PreviewBootstrapBooleanState {
  get: () => boolean;
}

export interface PreviewBootstrapNumericState {
  get: () => number;
  set: (value: number) => void;
}

export interface PreviewBootstrapConstraintSummaryHost {
  summarise: (violations: unknown) => unknown;
}

export interface CreateBootstrapPreviewEditorRuntimeOptionsFromHostOptions {
  document: BootstrapPreviewEditorRuntimeOptions['document'];
  previewWindow: BootstrapPreviewEditorRuntimeOptions['previewWindow'];
  slug: BootstrapPreviewEditorRuntimeOptions['slug'];
  model: BootstrapPreviewEditorRuntimeOptions['model'];
  selectedIds: BootstrapPreviewEditorRuntimeOptions['selectedIds'];
  reapplySelection: BootstrapPreviewEditorRuntimeOptions['reapplySelection'];
  onDocumentKeyDown: BootstrapPreviewEditorRuntimeOptions['onDocumentKeyDown'];
  editorState: PreviewEditorUndoStateApi;
  applyUndoCommand: (...args: unknown[]) => unknown;
  syncBrowseNav: BootstrapPreviewEditorRuntimeOptions['syncBrowseNav'];
  fetchIndexHtml?: BootstrapPreviewEditorRuntimeOptions['fetchIndexHtml'] | null;
  attemptNavigation: BootstrapPreviewEditorRuntimeOptions['attemptNavigation'];
  initNavTabs: BootstrapPreviewEditorRuntimeOptions['initNavTabs'];
  getOverrides: BootstrapPreviewEditorRuntimeOptions['getOverrides'];
  getFrameTree: BootstrapPreviewEditorRuntimeOptions['getFrameTree'];
  requestV3Relayout: BootstrapPreviewEditorRuntimeOptions['requestV3Relayout'];
  previewSaveClient: PreviewRuntimeSaveClientApi;
  reloadDiagram: BootstrapPreviewEditorRuntimeOptions['reloadDiagram'];
  getV3RelayoutStatus: BootstrapPreviewEditorRuntimeOptions['getV3RelayoutStatus'];
  getV3RelayoutRuntime: BootstrapPreviewEditorRuntimeOptions['getV3RelayoutRuntime'];
  constraints: PreviewBootstrapConstraintSummaryHost;
  lastViolations: unknown;
  runConstraints: BootstrapPreviewEditorRuntimeOptions['runConstraints'];
  clearCoercedKeys: BootstrapPreviewEditorRuntimeOptions['clearCoercedKeys'];
  setStatus: BootstrapPreviewEditorRuntimeOptions['setStatus'];
  sanitizeSvgCloneForExport: BootstrapPreviewEditorRuntimeOptions['sanitizeSvgCloneForExport'];
  allowInternalDirtyNavigationState: PreviewBootstrapBooleanState;
  writeClipboardText: BootstrapPreviewEditorRuntimeOptions['writeClipboardText'];
  alert: BootstrapPreviewEditorRuntimeOptions['alert'];
  confirmClearAll: BootstrapPreviewEditorRuntimeOptions['confirmClearAll'];
  onClearAllOverrides: BootstrapPreviewEditorRuntimeOptions['onClearAllOverrides'];
  generationState: PreviewBootstrapNumericState;
  scheduleReconnect?: BootstrapPreviewEditorRuntimeOptions['scheduleReconnect'];
  reconnectDelayMs?: BootstrapPreviewEditorRuntimeOptions['reconnectDelayMs'];
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

export function restorePreviewSelectionIds(
  selectedIds: Set<string>,
  ids: string[],
  reapplySelection: () => void,
): void {
  selectedIds.clear();
  ids.forEach((id) => selectedIds.add(id));
  reapplySelection();
}

export function createPreviewBuildStatusUpdater(
  document: Pick<Document, 'getElementById'>,
): (update: PreviewBuildStatusUpdate) => void {
  return ({ message, kind }) => {
    const statusEl = document.getElementById('build-status');
    if (!statusEl) {
      return;
    }
    statusEl.className = kind === 'error' ? 'build-status build-err' : 'build-status build-ok';
    statusEl.textContent = message;
  };
}

export function createPreviewOverrideToolbarHostOptions(
  options: CreatePreviewOverrideToolbarHostOptions,
): InitPreviewOverrideToolbarOptions {
  return {
    exportButton: options.document.getElementById('btn-export'),
    clearAllButton: options.document.getElementById('btn-clear-all'),
    slug: options.slug,
    getOverrides: options.getOverrides,
    writeClipboardText: options.writeClipboardText,
    alert: options.alert,
    confirmClearAll: options.confirmClearAll,
    confirmClearAllMessage: options.confirmClearAllMessage
      ?? `Clear all overrides for ${options.slug}?`,
    onClearAll: options.onClearAllOverrides,
  };
}

function resolvePreviewBootstrapRootId(
  model: PreviewBootstrapRuntimeModelLike,
): string {
  return model.roots?.[0]?.id || 'root';
}

function createPreviewEventSourceFactory(
  previewWindow: PreviewGlobalWindow,
): (url: string) => PreviewEventSourceLike {
  return (url) => {
    const EventSourceCtor = previewWindow.EventSource ?? EventSource;
    return new EventSourceCtor(url) as PreviewEventSourceLike;
  };
}

async function fetchPreviewBootstrapIndexHtml(): Promise<string | null> {
  if (typeof globalThis.fetch !== 'function') {
    return null;
  }
  const response = await globalThis.fetch('/', { credentials: 'same-origin' });
  if (!response.ok) {
    return null;
  }
  return response.text();
}

export function createBootstrapPreviewEditorRuntimeOptionsFromHost(
  options: CreateBootstrapPreviewEditorRuntimeOptionsFromHostOptions,
): BootstrapPreviewEditorRuntimeOptions {
  return {
    document: options.document,
    previewWindow: options.previewWindow,
    slug: options.slug,
    model: options.model,
    selectedIds: options.selectedIds,
    reapplySelection: options.reapplySelection,
    onDocumentKeyDown: options.onDocumentKeyDown,
    undo: () => options.editorState.undo(options.applyUndoCommand),
    redo: () => options.editorState.redo(options.applyUndoCommand),
    saveOverrides: () => options.previewSaveClient.saveOverrides(),
    canUndo: options.editorState.canUndo,
    canRedo: options.editorState.canRedo,
    syncBrowseNav: options.syncBrowseNav,
    fetchIndexHtml: options.fetchIndexHtml ?? fetchPreviewBootstrapIndexHtml,
    attemptNavigation: options.attemptNavigation,
    initNavTabs: options.initNavTabs,
    getOverrides: options.getOverrides,
    getFrameTree: options.getFrameTree,
    requestV3Relayout: options.requestV3Relayout,
    previewSaveClient: options.previewSaveClient,
    serializeDirtyState: options.editorState.serializeDirtyState,
    reloadDiagram: options.reloadDiagram,
    getV3RelayoutStatus: options.getV3RelayoutStatus,
    getV3RelayoutRuntime: options.getV3RelayoutRuntime,
    getConstraintSummary: () => options.constraints.summarise(options.lastViolations),
    runConstraints: options.runConstraints,
    clearCoercedKeys: options.clearCoercedKeys,
    setStatus: options.setStatus,
    sanitizeSvgCloneForExport: options.sanitizeSvgCloneForExport,
    allowInternalDirtyNavigation: options.allowInternalDirtyNavigationState.get,
    writeClipboardText: options.writeClipboardText,
    alert: options.alert,
    confirmClearAll: options.confirmClearAll,
    onClearAllOverrides: options.onClearAllOverrides,
    getGeneration: options.generationState.get,
    setGeneration: options.generationState.set,
    scheduleReconnect: options.scheduleReconnect,
    reconnectDelayMs: options.reconnectDelayMs,
  };
}

export function createBootstrapPreviewEditorHostOptionsFromRuntime(
  options: BootstrapPreviewEditorRuntimeOptions,
): BootstrapPreviewEditorHostOptions {
  return {
    document: options.document,
    previewWindow: options.previewWindow,
    slug: options.slug,
    onDocumentKeyDown: options.onDocumentKeyDown,
    undo: options.undo,
    redo: options.redo,
    saveOverrides: options.saveOverrides,
    canUndo: options.canUndo,
    canRedo: options.canRedo,
    getCurrentPath: () => options.previewWindow.location?.pathname || '',
    syncBrowseNav: options.syncBrowseNav,
    fetchIndexHtml: options.fetchIndexHtml,
    attemptNavigation: options.attemptNavigation,
    initNavTabs: options.initNavTabs,
    getOverrides: options.getOverrides,
    getGridOverrides: () => options.model.gridOverrides,
    getElkLayoutOverrides: () => options.model.elkLayoutOverrides || {},
    getRemovedIds: () => options.model.removedIds,
    getFrameTree: options.getFrameTree,
    setElkLayoutOverrides: (value) => {
      options.model.elkLayoutOverrides = { ...value };
    },
    getRootId: () => resolvePreviewBootstrapRootId(options.model),
    requestV3Relayout: options.requestV3Relayout,
    previewSaveClient: options.previewSaveClient,
    getModel: () => options.model,
    getSelectedIds: () => [...options.selectedIds],
    restoreSelectionIds: (ids) => {
      restorePreviewSelectionIds(options.selectedIds, ids, options.reapplySelection);
    },
    serializeDirtyState: options.serializeDirtyState,
    reloadDiagram: options.reloadDiagram,
    getV3RelayoutStatus: options.getV3RelayoutStatus,
    getV3RelayoutRuntime: options.getV3RelayoutRuntime,
    getConstraintSummary: options.getConstraintSummary,
    getConstraintErrorCount: options.getConstraintErrorCount
      ?? (() => {
        const summary = options.getConstraintSummary() as { errors?: unknown } | null;
        return typeof summary?.errors === 'number' ? summary.errors : 0;
      }),
    runConstraints: options.runConstraints,
    clearCoercedKeys: options.clearCoercedKeys,
    setStatus: options.setStatus,
    sanitizeSvgCloneForExport: options.sanitizeSvgCloneForExport,
    allowInternalDirtyNavigation: options.allowInternalDirtyNavigation,
    overrideToolbar: createPreviewOverrideToolbarHostOptions({
      document: options.document,
      slug: options.slug,
      getOverrides: options.getOverrides,
      writeClipboardText: options.writeClipboardText,
      alert: options.alert,
      confirmClearAll: options.confirmClearAll,
      onClearAllOverrides: options.onClearAllOverrides,
    }),
    eventSourceFactory: createPreviewEventSourceFactory(options.previewWindow),
    getGeneration: options.getGeneration,
    setGeneration: options.setGeneration,
    setBuildStatus: createPreviewBuildStatusUpdater(options.document),
    scheduleReconnect: options.scheduleReconnect,
    reconnectDelayMs: options.reconnectDelayMs,
  };
}

export function bootstrapPreviewEditorRuntime(
  options: BootstrapPreviewEditorRuntimeOptions,
): void {
  bootstrapPreviewEditorHost(
    createBootstrapPreviewEditorHostOptionsFromRuntime(options),
  );
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
