/**
 * Preview SVG load helpers (spec 043 shell coordinator slice D).
 *
 * These helpers own the `loadSVG()` bootstrap decision tree so editor.js can
 * stay focused on DOM lookup, fetch wiring, and compatibility glue.
 */

import { mountPreviewRenderNode } from './preview-render-node.js';

export interface PreviewLoadCanonicalState {
  frameTree?: unknown;
  componentTree?: unknown[] | null;
  gridInfo?: unknown;
  previewDocument?: {
    kind?: string | null;
  } | null;
}

export interface PreviewLoadInvocationOptions {
  preserveSelectionIds?: string[] | null;
  canonicalState?: PreviewLoadCanonicalState | null;
}

export interface PreviewLoadNormalizedOptions {
  preservedSelectionIds: string[] | null;
  canonicalState: PreviewLoadCanonicalState | null;
}

export interface PreviewFrameTreeSeed {
  shouldSet: boolean;
  frameTree: unknown;
}

export interface PreviewLocalRelayoutStatus {
  ready: boolean;
  reason?: string | null;
  textAdapterError?: string | null;
}

export interface PreviewFallbackResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}

export interface PreviewLoadRenderResult<TSvg = unknown> {
  svg: TSvg;
  width: number;
  height: number;
}

export interface LoadPreviewSvgOptions<TSvg = unknown> {
  invocation?: PreviewLoadInvocationOptions | null;
  deselectAll: () => void;
  initLayoutBridge: () => Promise<void>;
  setFrameTreeJson?: ((frameTree: unknown) => void) | null;
  isEngineLayoutActive?: (() => boolean) | null;
  resetOverrideState: () => void;
  initEnginePanel?: (() => void) | null;
  /** @deprecated Prefer `initEnginePanel`. */
  initElkPanel?: (() => void) | null;
  getLocalRelayoutStatus: () => PreviewLocalRelayoutStatus;
  escapeHtml: (value: string) => string;
  setStageHtml: (html: string) => void;
  loadTree: (canonicalState: PreviewLoadCanonicalState | null) => Promise<void>;
  loadGridInfo: (canonicalState: PreviewLoadCanonicalState | null) => Promise<void>;
  getGridInfo: () => unknown;
  setDiagramGrid: (gridInfo: unknown) => void;
  populateGridControls: () => void;
  applyWaypointOverrides: () => void;
  applyAllOverrides: () => void;
  bindInteraction: () => void;
  renderGridOverlay: () => void;
  restoreSelection: (ids: string[] | null) => void;
  runConstraints: () => void;
  markSaved: (serializedState: string) => void;
  serializeDirtyState: () => string;
  signalDiagramLoaded: () => void;
  getGridOverrides: () => Record<string, unknown> | null | undefined;
  pruneLinkedRootGridOverrides: () => void;
  renderFreshSvg: () => Promise<PreviewLoadRenderResult<TSvg>>;
  mountRenderedSvg: (renderResult: PreviewLoadRenderResult<TSvg>) => boolean;
  fetchFallbackSvg: () => Promise<PreviewFallbackResponse>;
}

export interface CreateLoadPreviewSvgHostOptions<TSvg = unknown, TModel = unknown> {
  invocation?: PreviewLoadInvocationOptions | null;
  stage: {
    innerHTML: string;
    replaceChildren: (...nodes: TSvg[]) => void;
  };
  slug: string;
  engine: string;
  gridEnabled: boolean;
  deselectAll: () => void;
  previewBridgeHost: {
    initLayoutBridge?: ((slug: string) => Promise<unknown> | unknown) | null;
    setFrameTreeJson?: ((frameTree: unknown) => void) | null;
  };
  isEngineLayoutActive: () => boolean;
  resetOverrideState: () => void;
  initEnginePanel: () => void;
  getLocalRelayoutStatus: () => PreviewLocalRelayoutStatus;
  escapeHtml: (value: string) => string;
  loadTree: (canonicalState: PreviewLoadCanonicalState | null) => Promise<void>;
  loadGridInfo: (canonicalState: PreviewLoadCanonicalState | null) => Promise<void>;
  getGridInfo: () => unknown;
  setDiagramGrid: (gridInfo: unknown) => void;
  populateGridControls: () => void;
  applyWaypointOverrides: () => void;
  applyAllOverrides: () => void;
  bindInteraction: () => void;
  renderGridOverlay: () => void;
  restoreSelection: (ids: string[] | null) => void;
  runConstraints: () => void;
  markSaved: (serializedState: string) => void;
  serializeDirtyState: () => string;
  signalDiagramLoaded: () => void;
  getGridOverrides: () => Record<string, unknown> | null | undefined;
  pruneLinkedRootGridOverrides: () => void;
  previewBridgeRender: {
    renderFreshPreviewSvg?: ((options: {
      overrides: Record<string, unknown>;
      gridOverrides: Record<string, unknown> | null;
      model: TModel;
    }) => Promise<PreviewLoadRenderResult<TSvg>>) | null;
    fitPreviewSvgToRenderedContent?: ((options: {
      svg: TSvg;
      minWidth: number;
      minHeight: number;
    }) => unknown) | null;
  };
  overrides: Record<string, unknown>;
  model: TModel;
  fitRenderedSvgToContent?: ((
    svg: TSvg,
    options: { minWidth: number; minHeight: number },
  ) => unknown) | null;
}

export interface PreviewLoadSvgGridState<TGridInfo = unknown> {
  getGridInfo: () => TGridInfo;
  setDiagramGrid: (gridInfo: unknown) => void;
  getGridOverrides: () => Record<string, unknown> | null | undefined;
  pruneLinkedRootGridOverrides: () => void;
}

export interface PreviewLoadSvgSelectionState {
  selectedIds: Set<string>;
  reapplySelection: () => void;
}

export interface CreateLoadPreviewSvgHostOptionsFromRuntimeOptions<
  TSvg = unknown,
  TModel = unknown,
  TGridInfo = unknown,
> {
  invocation?: PreviewLoadInvocationOptions | null;
  stage: CreateLoadPreviewSvgHostOptions<TSvg, TModel>['stage'];
  slug: string;
  engine: string;
  gridEnabled: boolean;
  deselectAll: () => void;
  previewBridgeHost: CreateLoadPreviewSvgHostOptions<TSvg, TModel>['previewBridgeHost'];
  isEngineLayoutActive: () => boolean;
  resetOverrideState: () => void;
  initEnginePanel: () => void;
  getLocalRelayoutStatus: () => PreviewLocalRelayoutStatus;
  escapeHtml: (value: string) => string;
  loadTree: (canonicalState: PreviewLoadCanonicalState | null) => Promise<void>;
  loadGridInfo: (canonicalState: PreviewLoadCanonicalState | null) => Promise<void>;
  gridState: PreviewLoadSvgGridState<TGridInfo>;
  populateGridControls: () => void;
  applyWaypointOverrides: () => void;
  applyAllOverrides: () => void;
  bindInteraction: () => void;
  renderGridOverlay: () => void;
  selectionState: PreviewLoadSvgSelectionState;
  runConstraints: () => void;
  previewSaveClient: {
    markSaved: (serializedState: string) => void;
  };
  dirtyStateSerializer: {
    serializeDirtyState: () => string;
  };
  signalDiagramLoaded: () => void;
  previewBridgeRender: CreateLoadPreviewSvgHostOptions<TSvg, TModel>['previewBridgeRender'];
  overrides: Record<string, unknown>;
  model: TModel;
  fitRenderedSvgToContent?: CreateLoadPreviewSvgHostOptions<TSvg, TModel>['fitRenderedSvgToContent'];
}

export type PreviewLoadExecutionMode =
  | 'client-render'
  | 'fallback-error'
  | 'fallback-server-svg';

export function normalizePreviewLoadInvocation(
  invocation?: PreviewLoadInvocationOptions | null,
): PreviewLoadNormalizedOptions {
  return {
    preservedSelectionIds: Array.isArray(invocation?.preserveSelectionIds)
      ? invocation.preserveSelectionIds.slice()
      : null,
    canonicalState: invocation?.canonicalState && typeof invocation.canonicalState === 'object'
      ? invocation.canonicalState
      : null,
  };
}

export function resolvePreviewFrameTreeSeed(
  canonicalState: PreviewLoadCanonicalState | null,
): PreviewFrameTreeSeed {
  if (
    canonicalState
    && Object.prototype.hasOwnProperty.call(canonicalState, 'frameTree')
  ) {
    return {
      shouldSet: true,
      frameTree: canonicalState.frameTree,
    };
  }

  return {
    shouldSet: false,
    frameTree: null,
  };
}

export function createPreviewLoadLoadingMarkup(): string {
  return '<div style="padding:24px;color:#666;font-family:Ubuntu Sans,sans-serif">Loading...</div>';
}

export function createPreviewLoadUnavailableMarkup(
  reasonText: string,
  escapeHtml: (value: string) => string,
): string {
  return '<div style="padding:24px;font-family:Ubuntu Sans,sans-serif">'
    + '<div style="color:#c7162b;margin-bottom:12px">Client-side rendering unavailable: '
    + escapeHtml(reasonText)
    + '</div>'
    + '<div style="color:#666">Falling back to server-rendered SVG...</div></div>';
}

export function createPreviewLoadFailureMarkup(status: number): string {
  return '<div style="padding:24px;color:#c7162b;font-family:Ubuntu Sans,sans-serif">'
    + `Failed to load diagram: server returned ${status}</div>`;
}

export function createLoadPreviewSvgHostOptions<TSvg = unknown, TModel = unknown>(
  options: CreateLoadPreviewSvgHostOptions<TSvg, TModel>,
): LoadPreviewSvgOptions<TSvg> {
  const fitRenderedSvgToContent = options.fitRenderedSvgToContent
    ?? (
      typeof options.previewBridgeRender.fitPreviewSvgToRenderedContent === 'function'
        ? (svg: TSvg, fitOptions: { minWidth: number; minHeight: number }) => (
          options.previewBridgeRender.fitPreviewSvgToRenderedContent?.({
            svg,
            minWidth: fitOptions.minWidth,
            minHeight: fitOptions.minHeight,
          })
        )
        : null
    );

  return {
    invocation: options.invocation,
    deselectAll: options.deselectAll,
    initLayoutBridge: async () => {
      if (typeof options.previewBridgeHost.initLayoutBridge !== 'function') {
        throw new Error('preview layout bridge is required for the interactive grid shell');
      }
      await options.previewBridgeHost.initLayoutBridge(options.slug);
    },
    setFrameTreeJson: typeof options.previewBridgeHost.setFrameTreeJson === 'function'
      ? (frameTree) => options.previewBridgeHost.setFrameTreeJson?.(frameTree)
      : null,
    isEngineLayoutActive: options.isEngineLayoutActive,
    resetOverrideState: options.resetOverrideState,
    initEnginePanel: options.initEnginePanel,
    getLocalRelayoutStatus: options.getLocalRelayoutStatus,
    escapeHtml: options.escapeHtml,
    setStageHtml: (html) => {
      options.stage.innerHTML = html;
    },
    loadTree: options.loadTree,
    loadGridInfo: options.loadGridInfo,
    getGridInfo: options.getGridInfo,
    setDiagramGrid: options.setDiagramGrid,
    populateGridControls: options.populateGridControls,
    applyWaypointOverrides: options.applyWaypointOverrides,
    applyAllOverrides: options.applyAllOverrides,
    bindInteraction: options.bindInteraction,
    renderGridOverlay: options.renderGridOverlay,
    restoreSelection: options.restoreSelection,
    runConstraints: options.runConstraints,
    markSaved: options.markSaved,
    serializeDirtyState: options.serializeDirtyState,
    signalDiagramLoaded: options.signalDiagramLoaded,
    getGridOverrides: options.getGridOverrides,
    pruneLinkedRootGridOverrides: options.pruneLinkedRootGridOverrides,
    renderFreshSvg: async () => {
      if (typeof options.previewBridgeRender.renderFreshPreviewSvg !== 'function') {
        throw new Error('preview fresh-render bridge is required for the interactive grid shell');
      }
      const gridOverrides = options.getGridOverrides();
      return options.previewBridgeRender.renderFreshPreviewSvg({
        overrides: options.overrides,
        gridOverrides: gridOverrides && Object.keys(gridOverrides).length > 0
          ? gridOverrides
          : null,
        model: options.model,
      });
    },
    mountRenderedSvg: (renderResult) => mountPreviewRenderNode({
      stage: options.stage,
      renderResult,
      fitSvgToContent: ({ svg, minWidth, minHeight }) => {
        if (!fitRenderedSvgToContent) {
          throw new Error('load preview host requires fitRenderedSvgToContent when mounting a rendered svg');
        }
        return fitRenderedSvgToContent(svg, {
          minWidth,
          minHeight,
        });
      },
    }),
    fetchFallbackSvg: async () => {
      const suffix = options.gridEnabled
        ? `-${options.engine}-grid.svg`
        : `-${options.engine}.svg`;
      return fetch(`/svg/${options.slug}-onbrand${suffix}?t=${Date.now()}`);
    },
  };
}

export function createLoadPreviewSvgHostOptionsFromRuntime<
  TSvg = unknown,
  TModel = unknown,
  TGridInfo = unknown,
>(
  options: CreateLoadPreviewSvgHostOptionsFromRuntimeOptions<TSvg, TModel, TGridInfo>,
): LoadPreviewSvgOptions<TSvg> {
  return createLoadPreviewSvgHostOptions({
    invocation: options.invocation,
    stage: options.stage,
    slug: options.slug,
    engine: options.engine,
    gridEnabled: options.gridEnabled,
    deselectAll: options.deselectAll,
    previewBridgeHost: options.previewBridgeHost,
    isEngineLayoutActive: options.isEngineLayoutActive,
    resetOverrideState: options.resetOverrideState,
    initEnginePanel: options.initEnginePanel,
    getLocalRelayoutStatus: options.getLocalRelayoutStatus,
    escapeHtml: options.escapeHtml,
    loadTree: options.loadTree,
    loadGridInfo: options.loadGridInfo,
    getGridInfo: options.gridState.getGridInfo,
    setDiagramGrid: options.gridState.setDiagramGrid,
    populateGridControls: options.populateGridControls,
    applyWaypointOverrides: options.applyWaypointOverrides,
    applyAllOverrides: options.applyAllOverrides,
    bindInteraction: options.bindInteraction,
    renderGridOverlay: options.renderGridOverlay,
    restoreSelection: (ids) => {
      if (ids) {
        options.selectionState.selectedIds.clear();
        ids.forEach((id) => options.selectionState.selectedIds.add(id));
      }
      options.selectionState.reapplySelection();
    },
    runConstraints: options.runConstraints,
    markSaved: (serializedState) => options.previewSaveClient.markSaved(serializedState),
    serializeDirtyState: options.dirtyStateSerializer.serializeDirtyState,
    signalDiagramLoaded: options.signalDiagramLoaded,
    getGridOverrides: options.gridState.getGridOverrides,
    pruneLinkedRootGridOverrides: options.gridState.pruneLinkedRootGridOverrides,
    previewBridgeRender: options.previewBridgeRender,
    overrides: options.overrides,
    model: options.model,
    fitRenderedSvgToContent: options.fitRenderedSvgToContent ?? null,
  });
}

function shouldPrunePreviewRootGridOverrides(
  gridOverrides: Record<string, unknown> | null | undefined,
): boolean {
  return Boolean(
    gridOverrides
    && Object.keys(gridOverrides).length > 0
    && gridOverrides.link_to_root !== false,
  );
}

function finalizePreviewLoad(options: {
  applyWaypointOverrides: () => void;
  applyAllOverrides: () => void;
  bindInteraction: () => void;
  renderGridOverlay: () => void;
  restoreSelection: (ids: string[] | null) => void;
  preservedSelectionIds: string[] | null;
  runConstraints: () => void;
  markSaved: (serializedState: string) => void;
  serializeDirtyState: () => string;
  signalDiagramLoaded: () => void;
}): void {
  options.applyWaypointOverrides();
  options.applyAllOverrides();
  options.bindInteraction();
  options.renderGridOverlay();
  options.restoreSelection(options.preservedSelectionIds);
  options.runConstraints();
  options.markSaved(options.serializeDirtyState());
  options.signalDiagramLoaded();
}

export async function loadPreviewSvg<TSvg = unknown>(
  options: LoadPreviewSvgOptions<TSvg>,
): Promise<PreviewLoadExecutionMode> {
  const invocation = normalizePreviewLoadInvocation(options.invocation);

  options.deselectAll();
  options.setStageHtml(createPreviewLoadLoadingMarkup());

  await options.initLayoutBridge();

  const frameTreeSeed = resolvePreviewFrameTreeSeed(invocation.canonicalState);
  if (frameTreeSeed.shouldSet && options.setFrameTreeJson) {
    options.setFrameTreeJson(frameTreeSeed.frameTree);
  }

  const isEngineLayoutActive = options.isEngineLayoutActive ?? (() => false);
  const initEnginePanel = options.initEnginePanel
    ?? options.initElkPanel
    ?? (() => {});

  const engineLayoutActive = isEngineLayoutActive();
  if (engineLayoutActive) {
    options.resetOverrideState();
    initEnginePanel();
  }

  const readiness = options.getLocalRelayoutStatus();
  if (!readiness.ready) {
    const reasonText = readiness.textAdapterError || readiness.reason || 'unknown';
    options.setStageHtml(createPreviewLoadUnavailableMarkup(reasonText, options.escapeHtml));

    const response = await options.fetchFallbackSvg();
    if (!response.ok) {
      options.setStageHtml(createPreviewLoadFailureMarkup(response.status));
      return 'fallback-error';
    }

    options.setStageHtml(await response.text());
    await options.loadTree(invocation.canonicalState);
    await options.loadGridInfo(invocation.canonicalState);

    const gridInfo = options.getGridInfo();
    if (gridInfo) {
      options.setDiagramGrid(gridInfo);
    }

    options.populateGridControls();
    options.resetOverrideState();
    finalizePreviewLoad({
      applyWaypointOverrides: options.applyWaypointOverrides,
      applyAllOverrides: options.applyAllOverrides,
      bindInteraction: options.bindInteraction,
      renderGridOverlay: options.renderGridOverlay,
      restoreSelection: options.restoreSelection,
      preservedSelectionIds: invocation.preservedSelectionIds,
      runConstraints: options.runConstraints,
      markSaved: options.markSaved,
      serializeDirtyState: options.serializeDirtyState,
      signalDiagramLoaded: options.signalDiagramLoaded,
    });
    return 'fallback-server-svg';
  }

  await options.loadTree(invocation.canonicalState);
  await options.loadGridInfo(invocation.canonicalState);

  const gridInfo = options.getGridInfo();
  if (gridInfo) {
    options.setDiagramGrid(gridInfo);
  }

  options.populateGridControls();
  if (!engineLayoutActive) {
    options.resetOverrideState();
  }

  const gridOverrides = options.getGridOverrides();
  if (shouldPrunePreviewRootGridOverrides(gridOverrides)) {
    options.pruneLinkedRootGridOverrides();
  }

  const renderResult = await options.renderFreshSvg();
  options.mountRenderedSvg(renderResult);

  finalizePreviewLoad({
    applyWaypointOverrides: options.applyWaypointOverrides,
    applyAllOverrides: options.applyAllOverrides,
    bindInteraction: options.bindInteraction,
    renderGridOverlay: options.renderGridOverlay,
    restoreSelection: options.restoreSelection,
    preservedSelectionIds: invocation.preservedSelectionIds,
    runConstraints: options.runConstraints,
    markSaved: options.markSaved,
    serializeDirtyState: options.serializeDirtyState,
    signalDiagramLoaded: options.signalDiagramLoaded,
  });

  if (engineLayoutActive) {
    initEnginePanel();
  }

  return 'client-render';
}
