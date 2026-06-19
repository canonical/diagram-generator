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
