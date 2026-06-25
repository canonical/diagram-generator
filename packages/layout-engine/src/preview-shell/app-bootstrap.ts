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
  getLayoutOverrides?: () => unknown;
  /** @deprecated Prefer `getLayoutOverrides`. */
  getElkLayoutOverrides?: () => unknown;
  getRemovedIds: () => unknown;
  getFrameTree: () => unknown;
}

export interface PreviewEditorStateApi {
  init: (options: PreviewEditorStateInitOptions) => void;
  [key: string]: unknown;
}

export interface PreviewEngineShellControllerInitOptions {
  getLayoutOverrides: () => Record<string, unknown>;
  setLayoutOverrides: (value: Record<string, unknown>) => void;
  getRootId: () => string;
  requestLayoutRelayout?: (cid: string) => Promise<unknown>;
  /** @deprecated Prefer `requestLayoutRelayout`. */
  requestV3Relayout?: (cid: string) => Promise<unknown>;
  /** @deprecated Prefer `getLayoutOverrides`. */
  getElkLayoutOverrides?: () => Record<string, unknown>;
  /** @deprecated Prefer `setLayoutOverrides`. */
  setElkLayoutOverrides?: (value: Record<string, unknown>) => void;
}

export interface PreviewEngineShellControllerApi {
  init: (options: PreviewEngineShellControllerInitOptions) => void;
  isActiveLayoutEngine?: (frameTreeJson?: unknown) => boolean;
  wirePanel: () => void;
  syncPanel: () => void;
  initPanel: () => void;
  initializePanel?: () => void;
  getLayoutOverrides?: () => Record<string, unknown>;
  applyLayoutOverrides?: (overrides: Record<string, unknown>) => void;
  collectPersistedPayload?: (
    basePayload: Record<string, unknown>,
    model: PreviewEnginePayloadModelLike,
  ) => Record<string, unknown>;
  requestRelayout: () => Promise<void>;
  /** @deprecated Compatibility alias for the legacy ELK controller name. */
  isElkLayeredDiagram?: (frameTreeJson?: unknown) => boolean;
  /** @deprecated Compatibility alias for the legacy ELK override applier. */
  applyElkLayoutOverrides?: (overrides: Record<string, unknown>) => void;
  [key: string]: unknown;
}

export interface PreviewEngineLayoutControlsApi {
  init?: (options?: {
    getOverrides?: () => Record<string, unknown>;
    setOverrides?: (value: Record<string, unknown>) => void;
  } | null) => void;
  buildPanel?: (frameTreeJson?: unknown) => void;
  refresh?: () => void;
  collectOverrides?: () => Record<string, unknown>;
  [key: string]: unknown;
}

export interface PreviewEnginePayloadModelLike {
  layoutOverrides?: Record<string, unknown>;
  /** @deprecated Prefer `layoutOverrides`. */
  elkLayoutOverrides?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PreviewEngineShellCompatControllerInitOptions extends PreviewEngineShellControllerInitOptions {
}

export interface PreviewEngineShellCompatControllerApi extends PreviewEngineShellControllerApi {
  isElkLayeredDiagram: (frameTreeJson?: unknown) => boolean;
  applyElkLayoutOverrides: (overrides: Record<string, unknown>) => void;
}

/** @deprecated Prefer `PreviewEngineShellCompatControllerInitOptions`. */
export type PreviewElkControllerInitOptions = PreviewEngineShellCompatControllerInitOptions;

/** @deprecated Prefer `PreviewEngineShellCompatControllerApi`. */
export type PreviewElkControllerApi = PreviewEngineShellCompatControllerApi;

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
  getLayoutRelayoutStatus: () => unknown;
  /** @deprecated Prefer `getLayoutRelayoutStatus`. */
  getV3RelayoutStatus?: () => unknown;
  getLayoutRelayoutRuntime: () => unknown;
  /** @deprecated Prefer `getLayoutRelayoutRuntime`. */
  getV3RelayoutRuntime?: () => unknown;
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
  getLayoutRelayoutStatus: () => unknown;
  /** @deprecated Prefer `getLayoutRelayoutStatus`. */
  getV3RelayoutStatus?: () => unknown;
  getLayoutRelayoutRuntime: () => unknown;
  /** @deprecated Prefer `getLayoutRelayoutRuntime`. */
  getV3RelayoutRuntime?: () => unknown;
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
  ensurePreviewEngineShellController?: (() => void) | null;
  /** @deprecated Prefer `ensurePreviewEngineShellController`. */
  ensureElkPreviewController?: (() => void) | null;
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
  getLayoutOverrides?: () => Record<string, unknown>;
  /** @deprecated Prefer `getLayoutOverrides`. */
  getElkLayoutOverrides?: () => Record<string, unknown>;
  getRemovedIds: () => unknown;
  getFrameTree: () => unknown;
  setLayoutOverrides?: (value: Record<string, unknown>) => void;
  /** @deprecated Prefer `setLayoutOverrides`. */
  setElkLayoutOverrides?: (value: Record<string, unknown>) => void;
  getRootId: () => string;
  requestLayoutRelayout?: (cid: string) => Promise<unknown> | unknown;
  /** @deprecated Prefer `requestLayoutRelayout`. */
  requestV3Relayout?: (cid: string) => Promise<unknown> | unknown;
  previewSaveClient: PreviewSaveClientApi;
  getModel: () => unknown;
  getSelectedIds: () => string[];
  restoreSelectionIds: (ids: string[]) => void;
  serializeDirtyState: () => string;
  reloadDiagram: (options?: unknown) => unknown;
  getLayoutRelayoutStatus: () => unknown;
  /** @deprecated Prefer `getLayoutRelayoutStatus`. */
  getV3RelayoutStatus?: () => unknown;
  getLayoutRelayoutRuntime: () => unknown;
  /** @deprecated Prefer `getLayoutRelayoutRuntime`. */
  getV3RelayoutRuntime?: () => unknown;
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
  layoutOverrides?: Record<string, unknown>;
  /** @deprecated Prefer `layoutOverrides`. */
  elkLayoutOverrides?: Record<string, unknown>;
  removedIds?: unknown;
  [key: string]: unknown;
}

export interface CreatePreviewOverrideToolbarHostOptions {
  document: Pick<Document, 'getElementById'>;
  slug: string;
  getOverrides: () => Record<string, PreviewOverrideExportEntry>;
  getGridOverrides?: (() => Record<string, unknown> | null | undefined) | null;
  getLayoutOverrides?: (() => Record<string, unknown> | null | undefined) | null;
  getRemovedIds?: (() => Iterable<string> | { size?: number } | null | undefined) | null;
  isDiagnosticsMode?: (() => boolean) | null;
  writeClipboardText: (text: string) => Promise<unknown>;
  alert: (message: string) => void;
  confirmClearAll: (message: string) => boolean;
  onClearAllOverrides: () => void | Promise<void>;
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
  requestLayoutRelayout?: (cid: string) => Promise<unknown> | unknown;
  /** @deprecated Prefer `requestLayoutRelayout`. */
  requestV3Relayout?: (cid: string) => Promise<unknown> | unknown;
  previewSaveClient: PreviewSaveClientApi;
  serializeDirtyState: () => string;
  reloadDiagram: (options?: unknown) => unknown;
  getLayoutRelayoutStatus: () => unknown;
  /** @deprecated Prefer `getLayoutRelayoutStatus`. */
  getV3RelayoutStatus?: () => unknown;
  getLayoutRelayoutRuntime: () => unknown;
  /** @deprecated Prefer `getLayoutRelayoutRuntime`. */
  getV3RelayoutRuntime?: () => unknown;
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
  onClearAllOverrides: () => void | Promise<void>;
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
  requestLayoutRelayout?: BootstrapPreviewEditorRuntimeOptions['requestLayoutRelayout'];
  /** @deprecated Prefer `requestLayoutRelayout`. */
  requestV3Relayout?: BootstrapPreviewEditorRuntimeOptions['requestV3Relayout'];
  previewSaveClient: PreviewRuntimeSaveClientApi;
  reloadDiagram: BootstrapPreviewEditorRuntimeOptions['reloadDiagram'];
  getLayoutRelayoutStatus: BootstrapPreviewEditorRuntimeOptions['getLayoutRelayoutStatus'];
  getV3RelayoutStatus?: BootstrapPreviewEditorRuntimeOptions['getV3RelayoutStatus'];
  getLayoutRelayoutRuntime: BootstrapPreviewEditorRuntimeOptions['getLayoutRelayoutRuntime'];
  getV3RelayoutRuntime?: BootstrapPreviewEditorRuntimeOptions['getV3RelayoutRuntime'];
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
  PreviewEngineLayoutControls?: PreviewEngineLayoutControlsApi;
  ElkPreviewController?: PreviewEngineShellCompatControllerApi;
  PreviewEngineShellController?: PreviewEngineShellControllerApi;
  ElkLayoutControls?: PreviewEngineLayoutControlsApi;
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

function resolvePreviewLayoutRelayoutRequest(
  options: {
    requestLayoutRelayout?: ((cid: string) => Promise<unknown> | unknown) | null;
    requestV3Relayout?: ((cid: string) => Promise<unknown> | unknown) | null;
  },
): (cid: string) => Promise<unknown> | unknown {
  const requestRelayout = options.requestLayoutRelayout ?? options.requestV3Relayout;
  if (typeof requestRelayout !== 'function') {
    throw new Error('preview shell bootstrap requires a layout relayout callback');
  }
  return requestRelayout;
}

function resolvePreviewLayoutRelayoutStatusGetter(
  options: {
    getLayoutRelayoutStatus: () => unknown;
    getV3RelayoutStatus?: (() => unknown) | null;
  },
): () => unknown {
  return options.getLayoutRelayoutStatus ?? options.getV3RelayoutStatus ?? (() => ({}));
}

function resolvePreviewLayoutRelayoutRuntimeGetter(
  options: {
    getLayoutRelayoutRuntime: () => unknown;
    getV3RelayoutRuntime?: (() => unknown) | null;
  },
): () => unknown {
  return options.getLayoutRelayoutRuntime ?? options.getV3RelayoutRuntime ?? (() => ({}));
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

function createPreviewEngineShellControllerFallback(): PreviewEngineShellControllerApi {
  const controller: PreviewEngineShellControllerApi = {
    init() {},
    isActiveLayoutEngine() {
      return false;
    },
    wirePanel() {},
    syncPanel() {},
    initPanel() {},
    initializePanel() {},
    getLayoutOverrides() {
      return {};
    },
    applyLayoutOverrides() {},
    applyElkLayoutOverrides(overrides: Record<string, unknown>) {
      controller.applyLayoutOverrides?.(overrides);
    },
    isElkLayeredDiagram(frameTreeJson?: unknown) {
      return Boolean(controller.isActiveLayoutEngine?.(frameTreeJson));
    },
    collectPersistedPayload(basePayload) {
      return { ...(basePayload || {}) };
    },
    requestRelayout() {
      return Promise.resolve();
    },
  };
  return controller;
}

function createPreviewEngineShellCompatControllerFallback(): PreviewEngineShellCompatControllerApi {
  return createPreviewEngineShellCompatController(createPreviewEngineShellControllerFallback());
}

function createPreviewEngineShellCompatController(
  controller: PreviewEngineShellControllerApi,
): PreviewEngineShellCompatControllerApi {
  return {
    ...controller,
    isElkLayeredDiagram(frameTreeJson?: unknown) {
      if (typeof controller.isElkLayeredDiagram === 'function') {
        return controller.isElkLayeredDiagram(frameTreeJson);
      }
      return Boolean(controller.isActiveLayoutEngine?.(frameTreeJson));
    },
    applyElkLayoutOverrides(overrides: Record<string, unknown>) {
      if (typeof controller.applyElkLayoutOverrides === 'function') {
        controller.applyElkLayoutOverrides(overrides);
        return;
      }
      controller.applyLayoutOverrides?.(overrides);
    },
  };
}

function readModelLayoutOverrides(
  model: PreviewEnginePayloadModelLike | PreviewBootstrapRuntimeModelLike,
): Record<string, unknown> {
  return model.layoutOverrides || model.elkLayoutOverrides || {};
}

function writeModelLayoutOverrides(
  model: PreviewEnginePayloadModelLike | PreviewBootstrapRuntimeModelLike,
  value: Record<string, unknown>,
): void {
  const nextValue = { ...value };
  model.layoutOverrides = nextValue;
  model.elkLayoutOverrides = nextValue;
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
    getGridOverrides: options.getGridOverrides,
    getLayoutOverrides: options.getLayoutOverrides,
    getRemovedIds: options.getRemovedIds,
    isDiagnosticsMode: options.isDiagnosticsMode,
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
  const requestLayoutRelayout = resolvePreviewLayoutRelayoutRequest(options);
  const getLayoutRelayoutStatus = resolvePreviewLayoutRelayoutStatusGetter(options);
  const getLayoutRelayoutRuntime = resolvePreviewLayoutRelayoutRuntimeGetter(options);
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
    requestLayoutRelayout,
    requestV3Relayout: requestLayoutRelayout,
    previewSaveClient: options.previewSaveClient,
    serializeDirtyState: options.editorState.serializeDirtyState,
    reloadDiagram: options.reloadDiagram,
    getLayoutRelayoutStatus,
    getV3RelayoutStatus: getLayoutRelayoutStatus,
    getLayoutRelayoutRuntime,
    getV3RelayoutRuntime: getLayoutRelayoutRuntime,
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
  const requestLayoutRelayout = resolvePreviewLayoutRelayoutRequest(options);
  const getLayoutRelayoutStatus = resolvePreviewLayoutRelayoutStatusGetter(options);
  const getLayoutRelayoutRuntime = resolvePreviewLayoutRelayoutRuntimeGetter(options);
  const getLayoutOverrides = () => readModelLayoutOverrides(options.model);
  const setLayoutOverrides = (value: Record<string, unknown>) => {
    writeModelLayoutOverrides(options.model, value);
  };
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
    getLayoutOverrides,
    getElkLayoutOverrides: getLayoutOverrides,
    getRemovedIds: () => options.model.removedIds,
    getFrameTree: options.getFrameTree,
    setLayoutOverrides,
    setElkLayoutOverrides: setLayoutOverrides,
    getRootId: () => resolvePreviewBootstrapRootId(options.model),
    requestLayoutRelayout,
    requestV3Relayout: requestLayoutRelayout,
    previewSaveClient: options.previewSaveClient,
    getModel: () => options.model,
    getSelectedIds: () => [...options.selectedIds],
    restoreSelectionIds: (ids) => {
      restorePreviewSelectionIds(options.selectedIds, ids, options.reapplySelection);
    },
    serializeDirtyState: options.serializeDirtyState,
    reloadDiagram: options.reloadDiagram,
    getLayoutRelayoutStatus,
    getV3RelayoutStatus: getLayoutRelayoutStatus,
    getLayoutRelayoutRuntime,
    getV3RelayoutRuntime: getLayoutRelayoutRuntime,
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
      getGridOverrides: () => (
        options.model.gridOverrides && typeof options.model.gridOverrides === 'object'
          ? options.model.gridOverrides as Record<string, unknown>
          : null
      ),
      getLayoutOverrides,
      getRemovedIds: () => options.model.removedIds ?? null,
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
  return basePayload;
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
  initOptions: PreviewEngineShellControllerInitOptions,
): PreviewEngineShellCompatControllerApi {
  return ensurePreviewEngineShellCompatController(previewWindow, initOptions);
}

export function ensurePreviewEngineShellCompatController(
  previewWindow: PreviewGlobalWindow,
  initOptions: PreviewEngineShellControllerInitOptions,
): PreviewEngineShellCompatControllerApi {
  const controller = ensurePreviewEngineShellController(previewWindow, initOptions);
  const compatController = createPreviewEngineShellCompatController(controller);
  previewWindow.ElkPreviewController = compatController;
  return compatController;
}

export function ensurePreviewEngineShellController(
  previewWindow: PreviewGlobalWindow,
  initOptions: PreviewEngineShellControllerInitOptions,
): PreviewEngineShellControllerApi {
  const controller = getPreviewEngineShellController(previewWindow)
    ?? createPreviewEngineShellControllerFallback();
  previewWindow.PreviewEngineShellController = controller;
  controller.init(initOptions);
  return controller;
}

export function createPreviewSaveClientInitConfig(
  options: PreviewSaveClientInitOptions,
): PreviewSaveClientInitConfig {
  const getLayoutRelayoutStatus = resolvePreviewLayoutRelayoutStatusGetter(options);
  const getLayoutRelayoutRuntime = resolvePreviewLayoutRelayoutRuntimeGetter(options);
  return {
    slug: options.slug,
    getModel: options.getModel,
    getSelectedIds: options.getSelectedIds,
    restoreSelectionIds: options.restoreSelectionIds,
    serializeDirtyState: options.serializeDirtyState,
    reloadDiagram: options.reloadDiagram,
    collectEngineSavePayload: options.collectEngineSavePayload,
    getLayoutRelayoutStatus,
    getV3RelayoutStatus: getLayoutRelayoutStatus,
    getLayoutRelayoutRuntime,
    getV3RelayoutRuntime: getLayoutRelayoutRuntime,
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
  (options.ensurePreviewEngineShellController ?? options.ensureElkPreviewController)?.();
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
        getLayoutOverrides: options.getLayoutOverrides ?? options.getElkLayoutOverrides,
        getElkLayoutOverrides: options.getElkLayoutOverrides ?? options.getLayoutOverrides,
        getRemovedIds: options.getRemovedIds,
        getFrameTree: options.getFrameTree,
      });
    },
    ensurePreviewEngineShellController: () => {
      ensurePreviewEngineShellController(options.previewWindow, {
        getLayoutOverrides: () => (
          (options.getLayoutOverrides ?? options.getElkLayoutOverrides)?.() ?? {}
        ),
        setLayoutOverrides: (value) => {
          (options.setLayoutOverrides ?? options.setElkLayoutOverrides)?.(value);
        },
        getElkLayoutOverrides: options.getElkLayoutOverrides ?? options.getLayoutOverrides,
        setElkLayoutOverrides: options.setElkLayoutOverrides ?? options.setLayoutOverrides,
        getRootId: options.getRootId,
        requestLayoutRelayout: (cid) =>
          Promise.resolve(resolvePreviewLayoutRelayoutRequest(options)(cid)),
        requestV3Relayout: (cid) =>
          Promise.resolve(resolvePreviewLayoutRelayoutRequest(options)(cid)),
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
        getLayoutRelayoutStatus: options.getLayoutRelayoutStatus,
        getV3RelayoutStatus: options.getV3RelayoutStatus,
        getLayoutRelayoutRuntime: options.getLayoutRelayoutRuntime,
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
