import {
  bindPreviewGridControls,
  cyclePreviewGuideModeHost,
  dispatchPreviewGridControlChangeHost,
  populatePreviewGridControlsHost,
  type PreviewGridControlChangeDispatchResult,
  type PreviewGridHostControlElement,
  type PreviewGridHostDocumentLike,
} from './app-grid-host.js';
import {
  loadPreviewGridInfo,
  type LoadedPreviewGridInfoState,
  type PreviewDiagramBootstrapState,
  type PreviewGridInfoFallbackMetrics,
  type PreviewJsonFetchResponse,
  type ResolvePreviewGridInfoOptions,
} from './app-diagram-data.js';
import {
  refreshPreviewGridInfoFromLayoutHost,
  renderPreviewGridOverlayHost,
  type PreviewGridOverlaySceneHostResult,
  type PreviewSceneHostDocumentLike,
} from './app-scene-host.js';
import type { PreviewGridInfoState } from './grid-controls.js';
import type { PreviewGridInfo } from './grid-resolution.js';

export interface PreviewGridRuntimeDocumentLike {
  activeElement?: PreviewGridHostDocumentLike['activeElement'];
  getElementById: PreviewGridHostDocumentLike['getElementById'];
  querySelector: (selector: string) => unknown;
  createElementNS: PreviewSceneHostDocumentLike['createElementNS'];
}

export interface CreatePreviewGridRuntimeHostOptions<TGridInfo = unknown> {
  document: PreviewGridRuntimeDocumentLike;
  guideModes: readonly string[];
  baselineStep: number;
  initialGuideMode?: string;
  fallbackMargin?: number;
  fetchGridInfo: () => Promise<PreviewJsonFetchResponse<TGridInfo>>;
  cloneValue: (value: TGridInfo) => TGridInfo;
  readFallbackMetrics: () => PreviewGridInfoFallbackMetrics;
  resolvePreviewGridInfo: (options: ResolvePreviewGridInfoOptions) => TGridInfo;
  resolvePreviewGridInfoFromRuntimeState: (options: {
    canvasWidth: number;
    canvasHeight: number;
    baselineStep: number;
    gridOverrides: Record<string, unknown>;
    fallbackGridInfo: TGridInfo;
    baseGridInfo: TGridInfo;
  }) => TGridInfo;
  createGridOverlayScene: (options: {
    guideMode: string;
    gridInfo: unknown;
    svgWidth: number;
    svgHeight: number;
    baselineStep: number;
  }) => PreviewGridOverlaySceneHostResult | null;
  getGridOverrides: () => Record<string, unknown> | null | undefined;
  setGridOverrides: (value: Record<string, unknown>) => void;
  setDiagramGrid: (value: TGridInfo) => void;
  getRootId: () => string;
  getPendingAction: () => unknown;
  beginPendingAction: () => unknown;
  setPendingAction: (action: unknown) => void;
  canEditGridControls?: (() => { applicable: boolean; reason: string }) | null;
  getTransactionContext?: (() => {
    activeEngineId?: string | null;
    documentKind?: string | null;
    sourceControl?: string | null;
  }) | null;
  pruneLinkedRootOverrides: () => void;
  setDirty: (dirty: boolean) => void;
  requestRelayout: (rootId: string) => Promise<void> | void;
  commitPendingAction: (action: unknown) => void;
  scheduleRelayout?: (callback: () => Promise<void> | void, delayMs: number) => unknown;
  clearRelayoutTimer?: (timerId: unknown) => void;
  setTimeoutFn?: (callback: () => void, delayMs: number) => unknown;
}

export interface LoadedPreviewGridRuntimeState<TGridInfo = unknown> {
  gridInfo: TGridInfo;
  baseGridInfo: TGridInfo;
}

export interface PreviewGridRuntimeHost<TGridInfo = unknown> {
  getGuideMode: () => string;
  getGridInfo: () => TGridInfo | null;
  getBaseGridInfo: () => TGridInfo | null;
  clearPendingRelayout: () => void;
  loadGridInfo: (
    canonicalState?: PreviewDiagramBootstrapState | null,
  ) => Promise<LoadedPreviewGridInfoState<TGridInfo>>;
  cycleGuideMode: () => string;
  renderGridOverlay: () => boolean;
  populateGridControls: () => boolean;
  onGridControlChange: () => PreviewGridControlChangeDispatchResult;
  refreshGridInfoFromLayout: () => TGridInfo | null;
  bindControls: () => void;
}

export interface PreviewGridRuntimeEditorHostRootLike {
  id?: string | null;
  data?: {
    layout_gap?: number | null;
    padding_top?: number | null;
  } | null;
}

export interface PreviewGridRuntimeEditorHostModel<TGridInfo = unknown> {
  roots?: PreviewGridRuntimeEditorHostRootLike[] | null;
  gridOverrides?: Record<string, unknown> | null;
  setDiagramGrid: (value: TGridInfo) => void;
}

export interface PreviewGridRuntimeEditorStateLike {
  cloneValue: <T>(value: T) => T;
  getPendingGridAction: () => unknown;
  beginUndoableAction: (label: string) => unknown;
  setPendingGridAction: (action: unknown) => void;
  commitUndoableAction: (action: unknown) => void;
}

export interface CreatePreviewGridRuntimeFromEditorHostOptions<
  TGridInfo = unknown,
  TModel extends PreviewGridRuntimeEditorHostModel<TGridInfo> =
    PreviewGridRuntimeEditorHostModel<TGridInfo>,
> {
  document: PreviewGridRuntimeDocumentLike;
  guideModes: readonly string[];
  baselineStep: number;
  slug: string;
  model: TModel;
  editorState: PreviewGridRuntimeEditorStateLike;
  resolvePreviewGridInfo: CreatePreviewGridRuntimeHostOptions<TGridInfo>['resolvePreviewGridInfo'];
  resolvePreviewGridInfoFromRuntimeState:
    CreatePreviewGridRuntimeHostOptions<TGridInfo>['resolvePreviewGridInfoFromRuntimeState'];
  createGridOverlayScene: CreatePreviewGridRuntimeHostOptions<TGridInfo>['createGridOverlayScene'];
  pruneLinkedRootOverrides: () => void;
  setDirty: (dirty: boolean) => void;
  canEditGridControls?: CreatePreviewGridRuntimeHostOptions<TGridInfo>['canEditGridControls'];
  getTransactionContext?: CreatePreviewGridRuntimeHostOptions<TGridInfo>['getTransactionContext'];
  requestRelayout: (rootId: string) => Promise<void> | void;
  scheduleRelayout?: CreatePreviewGridRuntimeHostOptions<TGridInfo>['scheduleRelayout'];
  clearRelayoutTimer?: CreatePreviewGridRuntimeHostOptions<TGridInfo>['clearRelayoutTimer'];
  setTimeoutFn?: CreatePreviewGridRuntimeHostOptions<TGridInfo>['setTimeoutFn'];
  fetchGridInfo?: (() => Promise<PreviewJsonFetchResponse<TGridInfo>>) | null;
}

function readPreviewGridRuntimeSvgMetrics(svg: unknown): {
  canvasWidth: number;
  canvasHeight: number;
} {
  const hostSvg = svg as {
    viewBox?: { baseVal?: { width?: number; height?: number } };
    getAttribute?: (name: string) => string | null;
  } | null;
  const canvasWidth = hostSvg?.viewBox?.baseVal?.width
    || parseFloat(hostSvg?.getAttribute?.('width') || '840')
    || 840;
  const canvasHeight = hostSvg?.viewBox?.baseVal?.height
    || parseFloat(hostSvg?.getAttribute?.('height') || '840')
    || 840;
  return {
    canvasWidth,
    canvasHeight,
  };
}

export function createPreviewGridRuntimeFromEditorHost<
  TGridInfo = unknown,
  TModel extends PreviewGridRuntimeEditorHostModel<TGridInfo> =
    PreviewGridRuntimeEditorHostModel<TGridInfo>,
>(
  options: CreatePreviewGridRuntimeFromEditorHostOptions<TGridInfo, TModel>,
): PreviewGridRuntimeHost<TGridInfo> {
  return createPreviewGridRuntimeHost({
    document: options.document,
    guideModes: options.guideModes,
    baselineStep: options.baselineStep,
    fetchGridInfo: options.fetchGridInfo ?? (async () => {
      const response = await fetch(`/api/grid/${options.slug}?t=${Date.now()}`, {
        cache: 'no-store',
      });
      return response as PreviewJsonFetchResponse<TGridInfo>;
    }),
    cloneValue: options.editorState.cloneValue,
    readFallbackMetrics: () => {
      const rootNode = options.model.roots?.[0] || null;
      const gap = rootNode?.data?.layout_gap ?? 24;
      const pad = rootNode?.data?.padding_top ?? 24;
      const svgMetrics = readPreviewGridRuntimeSvgMetrics(
        options.document.querySelector('#stage svg'),
      );
      return {
        gap,
        pad,
        canvasWidth: svgMetrics.canvasWidth,
        canvasHeight: svgMetrics.canvasHeight,
        baselineStep: options.baselineStep,
      };
    },
    resolvePreviewGridInfo: options.resolvePreviewGridInfo,
    resolvePreviewGridInfoFromRuntimeState: options.resolvePreviewGridInfoFromRuntimeState,
    createGridOverlayScene: options.createGridOverlayScene,
    getGridOverrides: () => options.model.gridOverrides || {},
    setGridOverrides: (value) => {
      options.model.gridOverrides = value;
    },
    setDiagramGrid: (value) => options.model.setDiagramGrid(value),
    getRootId: () => options.model.roots?.[0]?.id || 'root',
    getPendingAction: options.editorState.getPendingGridAction,
    beginPendingAction: () => options.editorState.beginUndoableAction('Adjust grid'),
    setPendingAction: options.editorState.setPendingGridAction,
    canEditGridControls: options.canEditGridControls,
    getTransactionContext: options.getTransactionContext,
    pruneLinkedRootOverrides: options.pruneLinkedRootOverrides,
    setDirty: options.setDirty,
    requestRelayout: options.requestRelayout,
    commitPendingAction: options.editorState.commitUndoableAction,
    scheduleRelayout: options.scheduleRelayout,
    clearRelayoutTimer: options.clearRelayoutTimer,
    setTimeoutFn: options.setTimeoutFn,
  });
}

export function createPreviewGridRuntimeHost<TGridInfo = unknown>(
  options: CreatePreviewGridRuntimeHostOptions<TGridInfo>,
): PreviewGridRuntimeHost<TGridInfo> {
  let guideMode = options.initialGuideMode ?? 'off';
  let gridInfo: TGridInfo | null = null;
  let baseGridInfo: TGridInfo | null = null;
  let relayoutTimer: unknown = null;

  const scheduleRelayout = options.scheduleRelayout
    ?? ((callback: () => Promise<void> | void, delayMs: number) => setTimeout(() => {
      void callback();
    }, delayMs));
  const clearRelayoutTimer = options.clearRelayoutTimer
    ?? ((timerId: unknown) => clearTimeout(timerId as Parameters<typeof clearTimeout>[0]));
  const setTimeoutFn = options.setTimeoutFn
    ?? ((callback: () => void, delayMs: number) => setTimeout(callback, delayMs));

  const runtime: PreviewGridRuntimeHost<TGridInfo> = {
    getGuideMode: () => guideMode,
    getGridInfo: () => gridInfo,
    getBaseGridInfo: () => baseGridInfo,
    clearPendingRelayout() {
      if (relayoutTimer == null) {
        return;
      }
      clearRelayoutTimer(relayoutTimer);
      relayoutTimer = null;
    },
    async loadGridInfo(canonicalState = null) {
      const loaded = await loadPreviewGridInfo<TGridInfo>({
        canonicalState,
        fetchGridInfo: options.fetchGridInfo,
        cloneValue: options.cloneValue,
        readFallbackMetrics: options.readFallbackMetrics,
        resolvePreviewGridInfo: options.resolvePreviewGridInfo,
      });
      gridInfo = loaded.gridInfo;
      baseGridInfo = loaded.baseGridInfo;
      return loaded;
    },
    cycleGuideMode() {
      return cyclePreviewGuideModeHost({
        guideMode,
        guideModes: options.guideModes,
        document: options.document as unknown as PreviewGridHostDocumentLike,
        setGuideMode: (value) => {
          guideMode = value;
        },
        renderGridOverlay: () => {
          runtime.renderGridOverlay();
        },
      });
    },
    renderGridOverlay() {
      return renderPreviewGridOverlayHost({
        document: options.document as unknown as PreviewSceneHostDocumentLike,
        guideMode,
        gridInfo,
        baselineStep: options.baselineStep,
        createScene: options.createGridOverlayScene,
      });
    },
    populateGridControls() {
      return populatePreviewGridControlsHost({
        document: options.document as unknown as PreviewGridHostDocumentLike,
        gridInfo: gridInfo as Partial<PreviewGridInfoState> | null,
        gridOverrides: options.getGridOverrides() ?? {},
      });
    },
    onGridControlChange() {
      return dispatchPreviewGridControlChangeHost({
        document: options.document as unknown as PreviewGridHostDocumentLike,
        gridInfo: gridInfo as PreviewGridInfo | null,
        baselineStep: options.baselineStep,
        rootId: options.getRootId(),
        fallbackMargin: options.fallbackMargin ?? 24,
        getPendingAction: options.getPendingAction,
        beginPendingAction: options.beginPendingAction,
        setPendingAction: options.setPendingAction,
        capabilityGate: options.canEditGridControls,
        transactionContext: options.getTransactionContext?.() ?? null,
        setGridOverrides: options.setGridOverrides,
        pruneLinkedRootOverrides: options.pruneLinkedRootOverrides,
        setDirty: options.setDirty,
        relayoutTimer,
        clearRelayoutTimer,
        scheduleRelayout,
        setRelayoutTimer: (timerId) => {
          relayoutTimer = timerId;
        },
        requestRelayout: options.requestRelayout,
        commitPendingAction: options.commitPendingAction,
        setOverlayGridInfo: (value) => {
          gridInfo = value as TGridInfo;
        },
        setRowsControlValue: (value) => {
          const rowsInput = options.document.getElementById('grid-rows') as PreviewGridHostControlElement | null;
          if (rowsInput) {
            rowsInput.value = value;
          }
        },
        renderGridOverlay: () => {
          runtime.renderGridOverlay();
        },
      });
    },
    refreshGridInfoFromLayout() {
      return refreshPreviewGridInfoFromLayoutHost<TGridInfo>({
        document: options.document as unknown as Parameters<typeof refreshPreviewGridInfoFromLayoutHost<TGridInfo>>[0]['document'],
        baselineStep: options.baselineStep,
        gridOverrides: options.getGridOverrides() ?? {},
        fallbackGridInfo: (gridInfo ?? {}) as TGridInfo,
        baseGridInfo: (baseGridInfo ?? {}) as TGridInfo,
        resolveGridInfo: options.resolvePreviewGridInfoFromRuntimeState,
        setGridInfo: (value) => {
          gridInfo = value;
        },
        setDiagramGrid: options.setDiagramGrid,
        populateGridControls: () => {
          runtime.populateGridControls();
        },
      });
    },
    bindControls() {
      bindPreviewGridControls({
        getElementById: (id) => options.document.getElementById(id),
        onInput: () => {
          runtime.onGridControlChange();
        },
        onChange: () => {
          runtime.onGridControlChange();
        },
        getActiveElement: () => options.document.activeElement,
        setTimeoutFn,
      });
    },
  };

  return runtime;
}
