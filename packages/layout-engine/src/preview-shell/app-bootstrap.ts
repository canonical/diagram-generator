/**
 * Preview shell bootstrap helpers (spec 043 shell coordinator slice H).
 *
 * These helpers own the repetitive shell setup at the bottom of editor.js so
 * the legacy script stays focused on wiring repo-specific callbacks together.
 */

import { initPreviewDiagramNavigation } from './app-diagram-navigation.js';
import { initPreviewShellResizeBindings } from './app-shell-resize.js';

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
  isElkLayeredDiagram: () => boolean;
  wirePanel: () => void;
  syncPanel: () => void;
  initPanel: () => void;
  applyElkLayoutOverrides: (overrides: Record<string, unknown>) => void;
  requestRelayout: () => Promise<void>;
  [key: string]: unknown;
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
  isElkLayeredDiagram: () => boolean;
  wireElkLayoutPanel: () => void;
  applyElkLayoutOverrides: (overrides: Record<string, unknown>) => void;
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
  isElkLayeredDiagram: () => boolean;
  wireElkLayoutPanel: () => void;
  applyElkLayoutOverrides: (overrides: Record<string, unknown>) => void;
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

type PreviewGlobalWindow = Window & typeof globalThis & {
  EditorState?: PreviewEditorStateApi;
  ElkPreviewController?: PreviewElkControllerApi;
};

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
  const elkController = previewWindow.ElkPreviewController ?? createPreviewElkControllerFallback();
  previewWindow.ElkPreviewController = elkController;
  elkController.init(initOptions);
  return elkController;
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
    isElkLayeredDiagram: options.isElkLayeredDiagram,
    wireElkLayoutPanel: options.wireElkLayoutPanel,
    applyElkLayoutOverrides: options.applyElkLayoutOverrides,
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
