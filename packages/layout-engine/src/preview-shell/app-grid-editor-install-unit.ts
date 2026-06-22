import {
  createPreviewGridEditorBrowserStateFromBrowserHost,
  type CreatePreviewGridEditorBrowserStateFromBrowserHostOptions,
  type PreviewGridEditorBrowserState,
} from './app-grid-editor-browser-state.js';
import {
  createPreviewGridEditorRuntimeFromBrowserHost,
  type CreatePreviewGridEditorRuntimeFromBrowserHostOptions,
  type PreviewGridEditorRuntimeBrowserOptions,
  type PreviewGridEditorRuntime,
  type PreviewGridEditorRuntimeWindow,
  type PreviewGridEditorRuntimeValueState,
} from './app-grid-editor-runtime.js';
import {
  DEFAULT_PREVIEW_BOX_STYLES,
  formatPreviewDefinedStyleLabel,
  normalizePreviewStyleName,
  renderPreviewBoxStyleOptions,
  type PreviewBoxStyleMap,
} from './frame-style.js';

type BrowserStateBackedRuntimeBrowserKey =
  | 'getOverrides'
  | 'replaceOverrides'
  | 'pruneLinkedRootGridOverrides'
  | 'clearPendingRestoreRuntime'
  | 'applyLocalRestoreRefresh'
  | 'setDirty'
  | 'setOverride'
  | 'cleanOverride'
  | 'setWaypointOverride'
  | 'getParentNode'
  | 'getComponentNode'
  | 'hasLayoutChildren'
  | 'getArrowNode'
  | 'getComponentType'
  | 'getViolationsForComponent'
  | 'scheduleRelayout';

type PreviewGridEditorInstallUnitBrowserStateOptions = Pick<
  CreatePreviewGridEditorBrowserStateFromBrowserHostOptions,
  'overridesState' | 'getMultiActionGapInput' | 'setTimeoutFn' | 'clearTimeoutFn' | 'relayoutDelayMs'
>;

type PreviewGridEditorInstallUnitRelayoutContract = ReturnType<
  CreatePreviewGridEditorBrowserStateFromBrowserHostOptions['getPreviewBridgeRelayoutContract']
>;

type PreviewGridEditorInstallUnitInteractionContract = ReturnType<
  CreatePreviewGridEditorBrowserStateFromBrowserHostOptions['getPreviewShellInteractionContract']
>;

export interface CreatePreviewGridEditorInstallUnitFromBrowserHostOptions {
  shared: CreatePreviewGridEditorRuntimeFromBrowserHostOptions['shared'];
  browser: Omit<
    CreatePreviewGridEditorRuntimeFromBrowserHostOptions['browser'],
    BrowserStateBackedRuntimeBrowserKey
  > & PreviewGridEditorInstallUnitBrowserStateOptions;
}

type EditorHostDerivedBrowserKey =
  | BrowserStateBackedRuntimeBrowserKey
  | 'buildTreeUi'
  | 'bindInteraction'
  | 'deselectAll'
  | 'reapplySelection'
  | 'renderEmptyInspector'
  | 'renderSelectionInspector'
  | 'renderMultiSelectionInspector'
  | 'selectComponent'
  | 'applySelectionStateSnapshot'
  | 'getPrimarySelectedId'
  | 'deleteSelectedFrames'
  | 'getOwnDelta'
  | 'getEffectiveDelta'
  | 'getAncestors'
  | 'setFrameProp'
  | 'scheduleTextRelayout'
  | 'scheduleLayoutResizeRelayout'
  | 'scheduleV3ResizeRelayout'
  | 'cancelLiveRelayout'
  | 'persistResize'
  | 'save'
  | 'undo'
  | 'redo'
  | 'onResizeUp'
  | 'cycleGuideMode'
  | 'requestLayoutRelayout'
  | 'requestV3Relayout'
  | 'requestRelayoutNow'
  | 'updateOverrideSummary'
  | 'refreshTreeColors'
  | 'runConstraints'
  | 'multiActionGapState';

type PreviewGridEditorInstallUnitRawBrowserOptions = Omit<
  PreviewGridEditorRuntimeBrowserOptions,
  EditorHostDerivedBrowserKey
>;

interface PreviewGridEditorInstallUnitStageBindingRuntime {
  buildTreeUi: () => unknown;
  bindInteraction: () => unknown;
}

interface PreviewGridEditorInstallUnitSelectionRuntime {
  deselectAll: () => void;
  reapplySelection: () => void;
  selectComponent: (cid: string, additive?: boolean) => void;
  applySelectionStateSnapshot: (nextState: unknown, preferredCid?: string | null) => void;
}

interface PreviewGridEditorInstallUnitInspectorDisplayRuntime {
  renderEmptyInspector: () => void;
  renderSelectionInspector: (preferredCid?: string | null) => void;
  renderMultiSelectionInspector: () => void;
}

interface PreviewGridEditorInstallUnitInspectorMutationRuntime {
  setFrameProp: (cid: string, prop: string, value: unknown) => void;
}

interface PreviewGridEditorInstallUnitResizeInteractionRuntime {
  onResizeUp: () => void;
}

interface PreviewGridEditorInstallUnitRelayoutRuntime {
  requestRelayout: (triggerCid: string) => Promise<unknown> | unknown;
}

interface PreviewGridEditorInstallUnitEditorSceneFacade {
  deleteSelectedFrames: () => Promise<{ rerendered?: boolean } | unknown>;
  cycleGuideMode: () => unknown;
  updateOverrideSummary: () => void;
  refreshTreeColors: () => void;
  runConstraints: () => unknown;
}

interface PreviewGridEditorInstallUnitEditorRelayoutFacade {
  applyUndoCommand: (command: unknown, direction: 'undo' | 'redo') => void;
  getRelayoutRuntime: () => PreviewGridEditorInstallUnitRelayoutRuntime;
  scheduleResizeRelayout: (
    cid: string,
    newW: number,
    newH: number,
    resizedW: boolean,
    resizedH: boolean,
  ) => boolean;
  cancelResizeRelayout: () => void;
  persistResize: (
    resizeIds: Iterable<string>,
    propagatedIds: Iterable<string>,
    triggerCid: string,
    baseSizes?: Record<string, { width: number; height: number }> | null,
  ) => void;
}

interface PreviewGridEditorInstallUnitEditorInteractionFacade {
  getStageBindingRuntime: () => PreviewGridEditorInstallUnitStageBindingRuntime;
  getSelectionRuntime: () => PreviewGridEditorInstallUnitSelectionRuntime;
  getInspectorDisplayRuntime: () => PreviewGridEditorInstallUnitInspectorDisplayRuntime;
  getInspectorMutationRuntime: () => PreviewGridEditorInstallUnitInspectorMutationRuntime;
  getResizeInteractionRuntime: () => PreviewGridEditorInstallUnitResizeInteractionRuntime;
}

export interface CreatePreviewGridEditorInstallUnitFromEditorHostOptions {
  shared: CreatePreviewGridEditorRuntimeFromBrowserHostOptions['shared'];
  state: PreviewGridEditorInstallUnitBrowserStateOptions & {
    multiActionGapState: PreviewGridEditorRuntimeBrowserOptions['multiActionGapState'];
    layoutRelayoutTimerState: PreviewGridEditorRuntimeValueState<unknown | null>;
  };
  browser: PreviewGridEditorInstallUnitRawBrowserOptions;
  modelOps: Pick<
    PreviewGridEditorRuntimeBrowserOptions,
    'getOwnDelta' | 'getEffectiveDelta' | 'getAncestors'
  >;
  facades: {
    getEditorSceneFacade: () => PreviewGridEditorInstallUnitEditorSceneFacade;
    getEditorRelayoutFacade: () => PreviewGridEditorInstallUnitEditorRelayoutFacade;
    getEditorInteractionFacade: () => PreviewGridEditorInstallUnitEditorInteractionFacade;
  };
}

export interface PreviewGridEditorLegacyConfig {
  slug: string;
  engine: string;
  gridEnabled: boolean;
  guideModes: string[];
  baselineStep: number;
  inset: number;
  guideColor: string;
  guideOpacity: string;
  interactionMode: PreviewGridEditorRuntimeBrowserOptions['interactionMode'];
  handleSize: number;
  minNodeSize: number;
  fallbackGap: number;
  snapToGrid: PreviewGridEditorRuntimeBrowserOptions['snapToGrid'];
}

export interface PreviewGridEditorLegacyState {
  model: CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['model'];
  interactionManager:
    CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['interactionManager'];
  selectedIds: CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['selectedIds'];
  selectionDepthState:
    CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['selectionDepthState'];
  coercedKeys: CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['coercedKeys'];
  editorState: CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['editorState'];
  previewSaveClient:
    CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['previewSaveClient'];
  generationState:
    CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['generationState'];
  allowInternalDirtyNavigationState:
    CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['allowInternalDirtyNavigationState'];
  constraints: CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['constraints'];
  lastViolationsState:
    CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['lastViolationsState'];
  overridesState: CreatePreviewGridEditorInstallUnitFromEditorHostOptions['state']['overridesState'];
  multiActionGapState:
    CreatePreviewGridEditorInstallUnitFromEditorHostOptions['state']['multiActionGapState'];
  layoutRelayoutTimerState:
    CreatePreviewGridEditorInstallUnitFromEditorHostOptions['state']['layoutRelayoutTimerState'];
}

interface PreviewGridEditorLegacyHelpers {
  applyInteractionOverrideEntries:
    PreviewGridEditorRuntimeBrowserOptions['applyInteractionOverrideEntries'];
}

export type PreviewGridEditorLegacyWindow = PreviewGridEditorRuntimeWindow & {
  __DG_CONFIG?: {
    icon_size?: number;
    col_gap?: number;
    head_len?: number;
    head_half?: number;
  } | null;
  __DG_BOX_STYLES?: PreviewBoxStyleMap | null;
  syncArrowsInModel?: PreviewGridEditorRuntimeBrowserOptions['syncArrowsInModel'];
  arrowComponentId?: PreviewGridEditorRuntimeBrowserOptions['arrowComponentId'];
  renderGuideLines?: ((lines: unknown, color?: string, opacity?: string) => void) | null;
  clearGuideLines?: (() => void) | null;
  clearHandlesByClass?: ((className: string) => void) | null;
  renderResizeHandles?: ((
    svg: SVGSVGElement,
    left: number,
    top: number,
    right: number,
    bottom: number,
    nodeId: string,
    options: {
      handleClass?: string;
      nodeAttr?: string;
      dirAttr?: string;
    },
  ) => void) | null;
  collectPeerSnapTargets?: PreviewGridEditorRuntimeBrowserOptions['collectPeerSnapTargets'];
  collectGridSnapTargets?: PreviewGridEditorRuntimeBrowserOptions['collectGridSnapTargets'];
  snapRectToTargets?: PreviewGridEditorRuntimeBrowserOptions['snapRectToTargets'];
  fitSvgToRenderedContent?: PreviewGridEditorRuntimeBrowserOptions['fitRenderedSvgToContent'];
  escapeHtml?: PreviewGridEditorRuntimeBrowserOptions['escapeHtml'];
  initNavTabs?: PreviewGridEditorRuntimeBrowserOptions['initNavTabs'];
  setStatus?: PreviewGridEditorRuntimeBrowserOptions['setStatus'];
  sanitizeSvgCloneForExport?:
    PreviewGridEditorRuntimeBrowserOptions['sanitizeSvgCloneForExport'];
  getLayoutTextAdapter?: (() => unknown) | null;
};

export interface CreatePreviewGridEditorInstallOptionsFromLegacyEditorHostOptions {
  document: Document;
  previewWindow: PreviewGridEditorLegacyWindow;
  config: PreviewGridEditorLegacyConfig;
  state: PreviewGridEditorLegacyState;
  helpers: PreviewGridEditorLegacyHelpers;
  modelOps: CreatePreviewGridEditorInstallUnitFromEditorHostOptions['modelOps'];
  facades: CreatePreviewGridEditorInstallUnitFromEditorHostOptions['facades'];
}

export interface PreviewGridEditorInstallUnit {
  getRuntime: () => PreviewGridEditorRuntime;
  getBrowserState: () => PreviewGridEditorBrowserState;
  getSceneFacade: () => ReturnType<PreviewGridEditorRuntime['getSceneFacade']>;
  getBootstrapFacade: () => ReturnType<PreviewGridEditorRuntime['getBootstrapFacade']>;
  getRelayoutFacade: () => ReturnType<PreviewGridEditorRuntime['getRelayoutFacade']>;
  getInteractionFacade: () => ReturnType<PreviewGridEditorRuntime['getInteractionFacade']>;
  getCompatFacade: () => PreviewGridEditorCompatFacade;
  invalidateOverrideBoundFacades: () => void;
}

type PreviewGridEditorBootstrapFacade = ReturnType<PreviewGridEditorRuntime['getBootstrapFacade']>;
type PreviewGridEditorSceneFacade = ReturnType<PreviewGridEditorRuntime['getSceneFacade']>;
type PreviewGridEditorRelayoutFacade = ReturnType<PreviewGridEditorRuntime['getRelayoutFacade']>;
type PreviewGridEditorInteractionFacade = ReturnType<PreviewGridEditorRuntime['getInteractionFacade']>;
type PreviewGridEditorSelectionRuntime =
  ReturnType<PreviewGridEditorInteractionFacade['getSelectionRuntime']>;
type PreviewGridEditorInspectorDisplayRuntime =
  ReturnType<PreviewGridEditorInteractionFacade['getInspectorDisplayRuntime']>;
type PreviewGridEditorInspectorMutationRuntime =
  ReturnType<PreviewGridEditorInteractionFacade['getInspectorMutationRuntime']>;
type PreviewGridEditorInspectorSelectionRuntime =
  ReturnType<PreviewGridEditorInteractionFacade['getInspectorSelectionRuntime']>;
type PreviewGridEditorArrowWaypointRuntime =
  ReturnType<PreviewGridEditorInteractionFacade['getArrowWaypointRuntime']>;
type PreviewGridEditorRelayoutRuntime =
  ReturnType<PreviewGridEditorRelayoutFacade['getRelayoutRuntime']>;

export interface PreviewGridEditorCompatFacade {
  loadSvg: PreviewGridEditorBootstrapFacade['loadSvg'];
  finishRelayout: PreviewGridEditorRelayoutFacade['finishRelayout'];
  signalDiagramLoaded: PreviewGridEditorBootstrapFacade['signalDiagramLoaded'];
  whenDiagramLoaded: PreviewGridEditorBootstrapFacade['whenDiagramLoaded'];
  syncBrowseNavToLocation: PreviewGridEditorBootstrapFacade['syncBrowseNavToLocation'];
  attemptDiagramNavigation: PreviewGridEditorBootstrapFacade['attemptDiagramNavigation'];
  loadTree: PreviewGridEditorBootstrapFacade['loadTree'];
  loadGridInfo: PreviewGridEditorSceneFacade['loadGridInfo'];
  cycleGuideMode: PreviewGridEditorSceneFacade['cycleGuideMode'];
  renderGridOverlay: PreviewGridEditorSceneFacade['renderGridOverlay'];
  populateGridControls: PreviewGridEditorSceneFacade['populateGridControls'];
  onGridControlChange: PreviewGridEditorSceneFacade['onGridControlChange'];
  refreshGridInfoFromLayout: PreviewGridEditorSceneFacade['refreshGridInfoFromLayout'];
  bindGridControls: PreviewGridEditorSceneFacade['bindGridControls'];
  applyWaypointOverrides: PreviewGridEditorSceneFacade['applyWaypointOverrides'];
  renderEmptyInspector: PreviewGridEditorInspectorDisplayRuntime['renderEmptyInspector'];
  getPrimarySelectedId: (preferredCid?: string | null) => string | null | undefined;
  renderSelectionInspector: PreviewGridEditorInspectorDisplayRuntime['renderSelectionInspector'];
  applySelectionTargets: PreviewGridEditorInspectorSelectionRuntime['applySelectionTargets'];
  distributeSelection: PreviewGridEditorInspectorSelectionRuntime['distributeSelection'];
  alignSelection: PreviewGridEditorInspectorSelectionRuntime['alignSelection'];
  renderMultiSelectionInspector: PreviewGridEditorInspectorDisplayRuntime['renderMultiSelectionInspector'];
  setMultiFrameAlign: PreviewGridEditorInspectorSelectionRuntime['setMultiFrameAlign'];
  applyMultiStyleOverride: PreviewGridEditorInspectorSelectionRuntime['applyMultiStyleOverride'];
  setMultiFrameProp: PreviewGridEditorInspectorSelectionRuntime['setMultiFrameProp'];
  setMultiFrameSize: PreviewGridEditorInspectorSelectionRuntime['setMultiFrameSize'];
  failRelayout: PreviewGridEditorRelayoutFacade['failRelayout'];
  getLayoutRelayoutStatus: PreviewGridEditorRelayoutFacade['getLayoutRelayoutStatus'];
  applyAllOverrides: PreviewGridEditorSceneFacade['applyAllOverrides'];
  autoFitArtboard: PreviewGridEditorSceneFacade['autoFitArtboard'];
  rerenderStageFromModel: PreviewGridEditorSceneFacade['rerenderStageFromModel'];
  deleteSelectedFrames: () => Promise<boolean>;
  buildTreeUi: PreviewGridEditorInteractionFacade['buildTreeUi'];
  bindInteraction: PreviewGridEditorInteractionFacade['bindInteraction'];
  onSvgDoubleClick: PreviewGridEditorInteractionFacade['onSvgDoubleClick'];
  onSvgMouseDown: PreviewGridEditorInteractionFacade['onSvgMouseDown'];
  onDragMove: PreviewGridEditorInteractionFacade['onDragMove'];
  onDragUp: PreviewGridEditorInteractionFacade['onDragUp'];
  showResizeHandles: PreviewGridEditorInteractionFacade['showResizeHandles'];
  removeResizeHandles: PreviewGridEditorInteractionFacade['removeResizeHandles'];
  showArrowWaypointHandles: PreviewGridEditorArrowWaypointRuntime['showArrowWaypointHandles'];
  startWaypointDrag: PreviewGridEditorArrowWaypointRuntime['startWaypointDrag'];
  onWaypointDragMove: PreviewGridEditorArrowWaypointRuntime['onWaypointDragMove'];
  onWaypointDragUp: PreviewGridEditorArrowWaypointRuntime['onWaypointDragUp'];
  addWaypoint: PreviewGridEditorArrowWaypointRuntime['addWaypoint'];
  removeWaypoint: PreviewGridEditorArrowWaypointRuntime['removeWaypoint'];
  getArrowPoints: PreviewGridEditorArrowWaypointRuntime['getArrowPoints'];
  updateArrowVisual: PreviewGridEditorArrowWaypointRuntime['updateArrowVisual'];
  rebuildArrowSvg: PreviewGridEditorArrowWaypointRuntime['rebuildArrowSvg'];
  startTextEdit: PreviewGridEditorInteractionFacade['startTextEdit'];
  commitTextEdit: PreviewGridEditorInteractionFacade['commitTextEdit'];
  cancelTextEdit: PreviewGridEditorInteractionFacade['cancelTextEdit'];
  scheduleLayoutResizeRelayout: PreviewGridEditorRelayoutFacade['scheduleResizeRelayout'];
  cancelLiveRelayout: PreviewGridEditorRelayoutFacade['cancelResizeRelayout'];
  persistResize: PreviewGridEditorRelayoutFacade['persistResize'];
  startResize: PreviewGridEditorInteractionFacade['startResize'];
  onResizeMove: PreviewGridEditorInteractionFacade['onResizeMove'];
  onResizeUp: PreviewGridEditorInteractionFacade['onResizeUp'];
  applyStyle: PreviewGridEditorInspectorMutationRuntime['applyStyle'];
  deselectAll: PreviewGridEditorSelectionRuntime['deselectAll'];
  applySelectionStateSnapshot: PreviewGridEditorSelectionRuntime['applySelectionStateSnapshot'];
  syncSelectionUi: PreviewGridEditorSelectionRuntime['syncSelectionUi'];
  selectComponent: PreviewGridEditorSelectionRuntime['selectComponent'];
  reapplySelection: PreviewGridEditorSelectionRuntime['reapplySelection'];
  setFrameAlign: PreviewGridEditorInspectorMutationRuntime['setFrameAlign'];
  setFrameProp: PreviewGridEditorInspectorMutationRuntime['setFrameProp'];
  requestLayoutRelayout: PreviewGridEditorRelayoutRuntime['requestRelayout'];
  setFrameSize: PreviewGridEditorInspectorMutationRuntime['setFrameSize'];
  setWidthUnit: PreviewGridEditorInspectorDisplayRuntime['setWidthUnit'];
  setHeightUnit: PreviewGridEditorInspectorDisplayRuntime['setHeightUnit'];
  updateInspector: PreviewGridEditorInspectorDisplayRuntime['updateInspector'];
  clearOverride: PreviewGridEditorRelayoutRuntime['clearOverride'];
  updateOverrideSummary: PreviewGridEditorSceneFacade['updateOverrideSummary'];
  refreshTreeColors: PreviewGridEditorSceneFacade['refreshTreeColors'];
  runConstraints: PreviewGridEditorSceneFacade['runConstraints'];
  onDocumentKeyDown: PreviewGridEditorInteractionFacade['onDocumentKeyDown'];
  bootstrapEditorRuntime: PreviewGridEditorBootstrapFacade['bootstrapEditorRuntime'];
}

function readLegacyPreviewRenderedStyleFields(
  document: Document,
  cid: string,
): { fill?: string | null; stroke?: string | null } | null {
  const group = document.querySelector(`[data-component-id="${CSS.escape(cid)}"]`);
  const rect = group ? group.querySelector(':scope > rect:first-of-type') : null;
  if (!rect) {
    return null;
  }
  return {
    fill: rect.getAttribute('fill'),
    stroke: rect.getAttribute('stroke'),
  };
}

function resolveLegacyPreviewBoxStyles(
  previewWindow: PreviewGridEditorLegacyWindow,
): PreviewBoxStyleMap {
  return previewWindow.__DG_BOX_STYLES ?? DEFAULT_PREVIEW_BOX_STYLES;
}

function resolveLegacyPreviewClipboardWriter(
  previewWindow: PreviewGridEditorLegacyWindow,
): PreviewGridEditorRuntimeBrowserOptions['writeClipboardText'] {
  return (text) => previewWindow.navigator?.clipboard?.writeText?.(text) ?? Promise.resolve();
}

function createLegacyPreviewResizeHandleRenderer(
  previewWindow: PreviewGridEditorLegacyWindow,
): PreviewGridEditorRuntimeBrowserOptions['renderResizeHandles'] {
  return ({ svg, left, top, right, bottom, nodeId, options }) => {
    previewWindow.renderResizeHandles?.(svg, left, top, right, bottom, nodeId, {
      handleClass: 'dg-handle',
      nodeAttr: options.nodeAttr,
      dirAttr: options.dirAttr,
    });
  };
}

function createLegacyPreviewGuideRenderer(
  previewWindow: PreviewGridEditorLegacyWindow,
  config: PreviewGridEditorLegacyConfig,
): PreviewGridEditorRuntimeBrowserOptions['renderGuideLines'] {
  return (lines) => {
    previewWindow.renderGuideLines?.(lines, config.guideColor, config.guideOpacity);
  };
}

export function createPreviewGridEditorInstallOptionsFromLegacyEditorHost(
  options: CreatePreviewGridEditorInstallOptionsFromLegacyEditorHostOptions,
): CreatePreviewGridEditorInstallUnitFromEditorHostOptions {
  const boxStyles = resolveLegacyPreviewBoxStyles(options.previewWindow);
  const previewConfig = options.previewWindow.__DG_CONFIG ?? {};

  return {
    shared: {
      document: options.document,
      previewWindow: options.previewWindow,
      slug: options.config.slug,
      engine: options.config.engine,
      gridEnabled: options.config.gridEnabled,
      guideModes: options.config.guideModes,
      baselineStep: options.config.baselineStep,
      model: options.state.model,
      interactionManager: options.state.interactionManager,
      selectedIds: options.state.selectedIds,
      selectionDepthState: options.state.selectionDepthState,
      coercedKeys: options.state.coercedKeys,
      editorState: options.state.editorState,
      previewSaveClient: options.state.previewSaveClient,
      generationState: options.state.generationState,
      allowInternalDirtyNavigationState: options.state.allowInternalDirtyNavigationState,
      constraints: options.state.constraints,
      lastViolationsState: options.state.lastViolationsState,
    },
    state: {
      overridesState: options.state.overridesState,
      multiActionGapState: options.state.multiActionGapState,
      layoutRelayoutTimerState: options.state.layoutRelayoutTimerState,
      getMultiActionGapInput: () => (
        options.document.getElementById('multi-action-gap') as { value?: string | number } | null
      ),
      setTimeoutFn: (callback, delayMs) => options.previewWindow.setTimeout(callback, delayMs),
      clearTimeoutFn: (timerId) => options.previewWindow.clearTimeout(timerId as never),
    },
    browser: {
      syncArrowsInModel: options.previewWindow.syncArrowsInModel ?? null,
      arrowComponentId: options.previewWindow.arrowComponentId ?? null,
      readRenderedStyleFields: (cid) => readLegacyPreviewRenderedStyleFields(options.document, cid),
      renderGuideLines: createLegacyPreviewGuideRenderer(options.previewWindow, options.config),
      clearGuideLines: () => {
        options.previewWindow.clearGuideLines?.();
      },
      clearHandlesByClass: (className) => {
        options.previewWindow.clearHandlesByClass?.(className);
      },
      renderResizeHandles: createLegacyPreviewResizeHandleRenderer(options.previewWindow),
      collectPeerSnapTargets: ((...args: Parameters<NonNullable<
        PreviewGridEditorLegacyWindow['collectPeerSnapTargets']
      >>) => options.previewWindow.collectPeerSnapTargets?.(...args) ?? []) as
        PreviewGridEditorRuntimeBrowserOptions['collectPeerSnapTargets'],
      collectGridSnapTargets: ((gridInfo) => (
        options.previewWindow.collectGridSnapTargets?.(gridInfo) ?? {}
      )) as PreviewGridEditorRuntimeBrowserOptions['collectGridSnapTargets'],
      snapRectToTargets: ((...args: Parameters<NonNullable<
        PreviewGridEditorLegacyWindow['snapRectToTargets']
      >>) => (
        options.previewWindow.snapRectToTargets?.(...args)
        ?? { dx: 0, dy: 0, lines: [] }
      )) as PreviewGridEditorRuntimeBrowserOptions['snapRectToTargets'],
      fitRenderedSvgToContent: options.previewWindow.fitSvgToRenderedContent ?? null,
      escapeHtml: options.previewWindow.escapeHtml ?? null,
      initNavTabs: options.previewWindow.initNavTabs ?? (() => {}),
      setStatus: options.previewWindow.setStatus ?? null,
      sanitizeSvgCloneForExport: options.previewWindow.sanitizeSvgCloneForExport ?? (() => {}),
      applyInteractionOverrideEntries: options.helpers.applyInteractionOverrideEntries,
      interactionMode: options.config.interactionMode,
      boxStyles,
      inset: options.config.inset,
      iconSize: previewConfig.icon_size ?? 0,
      handleSize: options.config.handleSize,
      textEditingMode: options.config.interactionMode.TEXT_EDITING,
      columnGap: previewConfig.col_gap ?? 0,
      minNodeSize: options.config.minNodeSize,
      fallbackGap: options.config.fallbackGap,
      getInspector: () => options.document.getElementById('inspector'),
      getTextAdapter: typeof options.previewWindow.getLayoutTextAdapter === 'function'
        ? () => options.previewWindow.getLayoutTextAdapter?.()
        : null,
      renderBoxStyleOptions: (selectedValue, renderOptions = {}) => renderPreviewBoxStyleOptions({
        boxStyles,
        selectedValue,
        originalLabel: (renderOptions as { originalLabel?: string }).originalLabel,
      }),
      formatAsDefinedStyleLabel: (styleName, mixed) => formatPreviewDefinedStyleLabel({
        boxStyles,
        styleName,
        mixed,
      }),
      snapToGrid: options.config.snapToGrid,
      alert: (message) => options.previewWindow.alert(message),
      normalizeStyleName: normalizePreviewStyleName,
      waypointDraggingMode: options.config.interactionMode.WAYPOINT_DRAGGING,
      writeClipboardText: resolveLegacyPreviewClipboardWriter(options.previewWindow),
      requestAnimationFrameFn: (callback) => options.previewWindow.requestAnimationFrame(callback),
      cancelAnimationFrameFn: (id) => options.previewWindow.cancelAnimationFrame(id),
      theme: {
        headLen: previewConfig.head_len ?? 0,
        headHalf: previewConfig.head_half ?? 0,
        color: '#E95420',
      },
    },
    modelOps: options.modelOps,
    facades: options.facades,
  };
}

function requestLayoutRelayoutFromFacade(
  options: CreatePreviewGridEditorInstallUnitFromEditorHostOptions,
  triggerCid: string,
): Promise<unknown> | unknown {
  return options.facades.getEditorRelayoutFacade().getRelayoutRuntime().requestRelayout(triggerCid);
}

function schedulePreviewTextRelayoutFromEditorHost(
  options: CreatePreviewGridEditorInstallUnitFromEditorHostOptions,
  cid: string,
): void {
  const currentTimer = options.state.layoutRelayoutTimerState.get();
  if (currentTimer != null) {
    options.state.clearTimeoutFn(currentTimer);
  }
  const nextTimer = options.state.setTimeoutFn(() => {
    options.state.layoutRelayoutTimerState.set(null);
    void requestLayoutRelayoutFromFacade(options, cid);
  }, 100);
  options.state.layoutRelayoutTimerState.set(nextTimer);
}

function requestPreviewRelayoutNowFromEditorHost(
  options: CreatePreviewGridEditorInstallUnitFromEditorHostOptions,
  cid: string,
): void {
  const currentTimer = options.state.layoutRelayoutTimerState.get();
  if (currentTimer != null) {
    options.state.clearTimeoutFn(currentTimer);
    options.state.layoutRelayoutTimerState.set(null);
  }
  void requestLayoutRelayoutFromFacade(options, cid);
}

function createBrowserHostOptionsFromEditorHost(
  options: CreatePreviewGridEditorInstallUnitFromEditorHostOptions,
): CreatePreviewGridEditorInstallUnitFromBrowserHostOptions {
  return {
    shared: options.shared,
    browser: {
      ...options.browser,
      overridesState: options.state.overridesState,
      multiActionGapState: options.state.multiActionGapState,
      getMultiActionGapInput: options.state.getMultiActionGapInput,
      setTimeoutFn: options.state.setTimeoutFn,
      clearTimeoutFn: options.state.clearTimeoutFn,
      relayoutDelayMs: options.state.relayoutDelayMs,
      buildTreeUi: () => options.facades.getEditorInteractionFacade().getStageBindingRuntime().buildTreeUi(),
      bindInteraction: () => options.facades.getEditorInteractionFacade().getStageBindingRuntime().bindInteraction(),
      deselectAll: () => options.facades.getEditorInteractionFacade().getSelectionRuntime().deselectAll(),
      reapplySelection: () => options.facades.getEditorInteractionFacade().getSelectionRuntime().reapplySelection(),
      renderEmptyInspector: () => (
        options.facades.getEditorInteractionFacade().getInspectorDisplayRuntime().renderEmptyInspector()
      ),
      renderSelectionInspector: (preferredCid) => (
        options.facades.getEditorInteractionFacade()
          .getInspectorDisplayRuntime()
          .renderSelectionInspector(preferredCid)
      ),
      renderMultiSelectionInspector: () => (
        options.facades.getEditorInteractionFacade()
          .getInspectorDisplayRuntime()
          .renderMultiSelectionInspector()
      ),
      selectComponent: (cid, additive) => (
        options.facades.getEditorInteractionFacade().getSelectionRuntime().selectComponent(cid, additive)
      ),
      applySelectionStateSnapshot: (nextState, preferredCid) => (
        options.facades.getEditorInteractionFacade()
          .getSelectionRuntime()
          .applySelectionStateSnapshot(nextState, preferredCid)
      ),
      getPrimarySelectedId: (preferredCid) => {
        const interactionContract = (
          options.shared.previewWindow.__DG_getPreviewShellInteractionContract() as unknown
        ) as {
            resolvePrimarySelectedId: (
              selectedIds: Set<string>,
              preferredCid?: string | null,
            ) => string | null | undefined;
          };
        return interactionContract.resolvePrimarySelectedId(options.shared.selectedIds, preferredCid);
      },
      deleteSelectedFrames: async () => {
        const result = await options.facades.getEditorSceneFacade().deleteSelectedFrames();
        return Boolean((result as { rerendered?: boolean } | null | undefined)?.rerendered);
      },
      getOwnDelta: options.modelOps.getOwnDelta,
      getEffectiveDelta: options.modelOps.getEffectiveDelta,
      getAncestors: options.modelOps.getAncestors,
      setFrameProp: (cid, prop, value) => (
        options.facades.getEditorInteractionFacade().getInspectorMutationRuntime().setFrameProp(cid, prop, value)
      ),
      scheduleTextRelayout: (cid) => schedulePreviewTextRelayoutFromEditorHost(options, cid),
      scheduleLayoutResizeRelayout: (cid, newW, newH, resizedW, resizedH) => (
        options.facades.getEditorRelayoutFacade()
          .scheduleResizeRelayout(cid, newW, newH, resizedW, resizedH)
      ),
      scheduleV3ResizeRelayout: (cid, newW, newH, resizedW, resizedH) => (
        options.facades.getEditorRelayoutFacade()
          .scheduleResizeRelayout(cid, newW, newH, resizedW, resizedH)
      ),
      cancelLiveRelayout: () => options.facades.getEditorRelayoutFacade().cancelResizeRelayout(),
      persistResize: (resizeIds, propagatedIds, triggerCid, baseSizes) => (
        options.facades.getEditorRelayoutFacade()
          .persistResize(resizeIds, propagatedIds, triggerCid, baseSizes)
      ),
      save: () => options.shared.previewSaveClient.trySaveIfDirty(),
      undo: () => {
        void options.shared.editorState.undo(
          options.facades.getEditorRelayoutFacade().applyUndoCommand,
        );
      },
      redo: () => {
        void options.shared.editorState.redo(
          options.facades.getEditorRelayoutFacade().applyUndoCommand,
        );
      },
      onResizeUp: () => options.facades.getEditorInteractionFacade().getResizeInteractionRuntime().onResizeUp(),
      cycleGuideMode: () => options.facades.getEditorSceneFacade().cycleGuideMode(),
      requestLayoutRelayout: (triggerCid) => requestLayoutRelayoutFromFacade(options, triggerCid),
      requestV3Relayout: (triggerCid) => requestLayoutRelayoutFromFacade(options, triggerCid),
      requestRelayoutNow: (cid) => requestPreviewRelayoutNowFromEditorHost(options, cid),
      updateOverrideSummary: () => options.facades.getEditorSceneFacade().updateOverrideSummary(),
      refreshTreeColors: () => options.facades.getEditorSceneFacade().refreshTreeColors(),
      runConstraints: () => options.facades.getEditorSceneFacade().runConstraints(),
    },
  };
}

function createBrowserStateOptions(
  options: CreatePreviewGridEditorInstallUnitFromBrowserHostOptions,
  browserStateState: { current: PreviewGridEditorBrowserState | null },
  runtimeState: { current: PreviewGridEditorRuntime | null },
): CreatePreviewGridEditorBrowserStateFromBrowserHostOptions {
  return {
    model: options.shared.model as unknown as CreatePreviewGridEditorBrowserStateFromBrowserHostOptions['model'],
    editorState:
      options.shared.editorState as unknown as CreatePreviewGridEditorBrowserStateFromBrowserHostOptions['editorState'],
    previewSaveClient:
      options.shared.previewSaveClient as unknown as CreatePreviewGridEditorBrowserStateFromBrowserHostOptions['previewSaveClient'],
    constraints:
      options.shared.constraints as unknown as CreatePreviewGridEditorBrowserStateFromBrowserHostOptions['constraints'],
    lastViolationsState: options.shared.lastViolationsState,
    overridesState: options.browser.overridesState,
    invalidateOverrideBoundFacades: () => {
      runtimeState.current?.invalidateOverrideBoundFacades();
    },
    multiActionGapState: options.browser.multiActionGapState,
    baselineStep: options.shared.baselineStep,
    relayoutDelayMs: options.browser.relayoutDelayMs,
    getPreviewBridgeRelayoutContract: () => options.shared.previewWindow.__DG_getPreviewBridgeRelayoutContract() as unknown as PreviewGridEditorInstallUnitRelayoutContract,
    getPreviewShellInteractionContract: () => options.shared.previewWindow.__DG_getPreviewShellInteractionContract() as unknown as PreviewGridEditorInstallUnitInteractionContract,
    getSceneFacade: () => {
      if (!runtimeState.current) {
        runtimeState.current = createRuntime(options, browserStateState, runtimeState);
      }
      return runtimeState.current.getSceneFacade();
    },
    getRequestLayoutRelayout: () => options.browser.requestLayoutRelayout,
    getMultiActionGapInput: options.browser.getMultiActionGapInput,
    setTimeoutFn: options.browser.setTimeoutFn,
    clearTimeoutFn: options.browser.clearTimeoutFn,
  };
}

function createRuntime(
  options: CreatePreviewGridEditorInstallUnitFromBrowserHostOptions,
  browserStateState: { current: PreviewGridEditorBrowserState | null },
  runtimeState: { current: PreviewGridEditorRuntime | null },
): PreviewGridEditorRuntime {
  if (!browserStateState.current) {
    browserStateState.current = createPreviewGridEditorBrowserStateFromBrowserHost(
      createBrowserStateOptions(options, browserStateState, runtimeState),
    );
  }
  const browserState = browserStateState.current;
  const {
    overridesState,
    getMultiActionGapInput: _getMultiActionGapInput,
    setTimeoutFn: _setTimeoutFn,
    clearTimeoutFn: _clearTimeoutFn,
    relayoutDelayMs: _relayoutDelayMs,
    ...runtimeBrowser
  } = options.browser;
  return createPreviewGridEditorRuntimeFromBrowserHost({
    shared: options.shared,
    browser: {
      ...runtimeBrowser,
      getOverrides: overridesState.get,
      replaceOverrides: (nextOverrides) => {
        browserState.replaceOverrides(
          nextOverrides as Record<string, Record<string, unknown>> | null | undefined,
        );
      },
      pruneLinkedRootGridOverrides: browserState.pruneLinkedRootGridOverrides,
      clearPendingRestoreRuntime: browserState.clearPendingRestoreRuntime,
      applyLocalRestoreRefresh: browserState.applyLocalRestoreRefresh,
      setDirty: browserState.setDirty,
      setOverride: browserState.setOverride,
      cleanOverride: browserState.cleanOverride,
      setWaypointOverride: browserState.setWaypointOverride,
      getParentNode: browserState.getParentNode,
      getComponentNode: browserState.getComponentNode,
      hasLayoutChildren: browserState.hasLayoutChildren,
      getArrowNode: browserState.getArrowNode,
      getComponentType: browserState.getComponentType,
      getViolationsForComponent: browserState.getViolationsForComponent,
      scheduleRelayout: browserState.scheduleLayoutRelayout,
    },
  });
}

export function createPreviewGridEditorInstallUnitFromBrowserHost(
  options: CreatePreviewGridEditorInstallUnitFromBrowserHostOptions,
): PreviewGridEditorInstallUnit {
  const runtimeState = { current: null as PreviewGridEditorRuntime | null };
  const localBrowserStateState = { current: null as PreviewGridEditorBrowserState | null };
  const compatFacadeState = { current: null as PreviewGridEditorCompatFacade | null };

  const getRuntime = (): PreviewGridEditorRuntime => {
    if (!runtimeState.current) {
      runtimeState.current = createRuntime(options, localBrowserStateState, runtimeState);
    }
    return runtimeState.current;
  };

  const getBrowserState = (): PreviewGridEditorBrowserState => {
    if (!localBrowserStateState.current) {
      localBrowserStateState.current = createPreviewGridEditorBrowserStateFromBrowserHost(
        createBrowserStateOptions(options, localBrowserStateState, runtimeState),
      );
    }
    return localBrowserStateState.current;
  };

  const getCompatFacade = (): PreviewGridEditorCompatFacade => {
    if (compatFacadeState.current) {
      return compatFacadeState.current;
    }

    const getBootstrapFacade = (): PreviewGridEditorBootstrapFacade => getRuntime().getBootstrapFacade();
    const getSceneFacade = (): PreviewGridEditorSceneFacade => getRuntime().getSceneFacade();
    const getRelayoutFacade = (): PreviewGridEditorRelayoutFacade => getRuntime().getRelayoutFacade();
    const getInteractionFacade = (): PreviewGridEditorInteractionFacade => getRuntime().getInteractionFacade();
    const getSelectionRuntime = (): PreviewGridEditorSelectionRuntime => (
      getInteractionFacade().getSelectionRuntime()
    );
    const getInspectorDisplayRuntime = (): PreviewGridEditorInspectorDisplayRuntime => (
      getInteractionFacade().getInspectorDisplayRuntime()
    );
    const getInspectorMutationRuntime = (): PreviewGridEditorInspectorMutationRuntime => (
      getInteractionFacade().getInspectorMutationRuntime()
    );
    const getInspectorSelectionRuntime = (): PreviewGridEditorInspectorSelectionRuntime => (
      getInteractionFacade().getInspectorSelectionRuntime()
    );
    const getArrowWaypointRuntime = (): PreviewGridEditorArrowWaypointRuntime => (
      getInteractionFacade().getArrowWaypointRuntime()
    );
    const getRelayoutRuntime = (): PreviewGridEditorRelayoutRuntime => (
      getRelayoutFacade().getRelayoutRuntime()
    );
    const getPrimarySelectedId = (preferredCid?: string | null): string | null | undefined => {
      const interactionContract = (
        options.shared.previewWindow.__DG_getPreviewShellInteractionContract() as unknown
      ) as {
        resolvePrimarySelectedId: (
          selectedIds: Set<string>,
          preferredId?: string | null,
        ) => string | null | undefined;
      };
      return interactionContract.resolvePrimarySelectedId(options.shared.selectedIds, preferredCid);
    };

    compatFacadeState.current = {
      loadSvg: (invocation = null) => getBootstrapFacade().loadSvg(invocation),
      finishRelayout: (triggerCid, result, executionLabel) => (
        getRelayoutFacade().finishRelayout(triggerCid, result, executionLabel)
      ),
      signalDiagramLoaded: () => getBootstrapFacade().signalDiagramLoaded(),
      whenDiagramLoaded: () => getBootstrapFacade().whenDiagramLoaded(),
      syncBrowseNavToLocation: () => getBootstrapFacade().syncBrowseNavToLocation(),
      attemptDiagramNavigation: (nextUrl, syncUi) => (
        getBootstrapFacade().attemptDiagramNavigation(nextUrl, syncUi)
      ),
      loadTree: (canonicalState = null) => getBootstrapFacade().loadTree(canonicalState),
      loadGridInfo: (canonicalState = null) => getSceneFacade().loadGridInfo(canonicalState),
      cycleGuideMode: () => getSceneFacade().cycleGuideMode(),
      renderGridOverlay: () => getSceneFacade().renderGridOverlay(),
      populateGridControls: () => getSceneFacade().populateGridControls(),
      onGridControlChange: () => getSceneFacade().onGridControlChange(),
      refreshGridInfoFromLayout: () => getSceneFacade().refreshGridInfoFromLayout(),
      bindGridControls: () => getSceneFacade().bindGridControls(),
      applyWaypointOverrides: () => getSceneFacade().applyWaypointOverrides(),
      renderEmptyInspector: () => getInspectorDisplayRuntime().renderEmptyInspector(),
      getPrimarySelectedId,
      renderSelectionInspector: (preferredCid) => (
        getInspectorDisplayRuntime().renderSelectionInspector(preferredCid)
      ),
      applySelectionTargets: (items, targets) => (
        getInspectorSelectionRuntime().applySelectionTargets(items, targets)
      ),
      distributeSelection: (axis) => getInspectorSelectionRuntime().distributeSelection(axis),
      alignSelection: (mode) => getInspectorSelectionRuntime().alignSelection(mode),
      renderMultiSelectionInspector: () => (
        getInspectorDisplayRuntime().renderMultiSelectionInspector()
      ),
      setMultiFrameAlign: (align) => getInspectorSelectionRuntime().setMultiFrameAlign(align),
      applyMultiStyleOverride: (styleName) => (
        getInspectorSelectionRuntime().applyMultiStyleOverride(styleName)
      ),
      setMultiFrameProp: (prop, value) => (
        getInspectorSelectionRuntime().setMultiFrameProp(prop, value)
      ),
      setMultiFrameSize: (dimension, value) => (
        getInspectorSelectionRuntime().setMultiFrameSize(dimension, value)
      ),
      failRelayout: (reason, triggerCid) => getRelayoutFacade().failRelayout(reason, triggerCid),
      getLayoutRelayoutStatus: () => getRelayoutFacade().getLayoutRelayoutStatus(),
      applyAllOverrides: () => getSceneFacade().applyAllOverrides(),
      autoFitArtboard: () => getSceneFacade().autoFitArtboard(),
      rerenderStageFromModel: () => getSceneFacade().rerenderStageFromModel(),
      deleteSelectedFrames: async () => {
        const result = await getSceneFacade().deleteSelectedFrames();
        return Boolean((result as { rerendered?: boolean } | null | undefined)?.rerendered);
      },
      buildTreeUi: () => getInteractionFacade().buildTreeUi(),
      bindInteraction: () => getInteractionFacade().bindInteraction(),
      onSvgDoubleClick: (event) => getInteractionFacade().onSvgDoubleClick(event),
      onSvgMouseDown: (event) => getInteractionFacade().onSvgMouseDown(event),
      onDragMove: (event) => getInteractionFacade().onDragMove(event),
      onDragUp: () => getInteractionFacade().onDragUp(),
      showResizeHandles: (cid) => getInteractionFacade().showResizeHandles(cid),
      removeResizeHandles: () => getInteractionFacade().removeResizeHandles(),
      showArrowWaypointHandles: (cid) => getArrowWaypointRuntime().showArrowWaypointHandles(cid),
      startWaypointDrag: (event) => getArrowWaypointRuntime().startWaypointDrag(event),
      onWaypointDragMove: (event) => getArrowWaypointRuntime().onWaypointDragMove(event),
      onWaypointDragUp: () => getArrowWaypointRuntime().onWaypointDragUp(),
      addWaypoint: (cid, segmentIndex, x, y) => (
        getArrowWaypointRuntime().addWaypoint(cid, segmentIndex, x, y)
      ),
      removeWaypoint: (cid, index) => getArrowWaypointRuntime().removeWaypoint(cid, index),
      getArrowPoints: (cid) => getArrowWaypointRuntime().getArrowPoints(cid),
      updateArrowVisual: (cid) => getArrowWaypointRuntime().updateArrowVisual(cid),
      rebuildArrowSvg: (cid) => getArrowWaypointRuntime().rebuildArrowSvg(cid),
      startTextEdit: (cid, event, runtimeOptions) => (
        getInteractionFacade().startTextEdit(cid, event, runtimeOptions)
      ),
      commitTextEdit: () => getInteractionFacade().commitTextEdit(),
      cancelTextEdit: () => getInteractionFacade().cancelTextEdit(),
      scheduleLayoutResizeRelayout: (cid, newW, newH, resizedW, resizedH) => (
        getRelayoutFacade().scheduleResizeRelayout(cid, newW, newH, resizedW, resizedH)
      ),
      cancelLiveRelayout: () => getRelayoutFacade().cancelResizeRelayout(),
      persistResize: (resizeIds, propagatedIds, triggerCid, baseSizes) => (
        getRelayoutFacade().persistResize(resizeIds, propagatedIds, triggerCid, baseSizes)
      ),
      startResize: (event) => getInteractionFacade().startResize(event),
      onResizeMove: (event) => getInteractionFacade().onResizeMove(event),
      onResizeUp: () => getInteractionFacade().onResizeUp(),
      applyStyle: (cid, styleName) => getInspectorMutationRuntime().applyStyle(cid, styleName),
      deselectAll: () => getSelectionRuntime().deselectAll(),
      applySelectionStateSnapshot: (nextState, preferredCid) => (
        getSelectionRuntime().applySelectionStateSnapshot(nextState, preferredCid)
      ),
      syncSelectionUi: (preferredCid) => getSelectionRuntime().syncSelectionUi(preferredCid),
      selectComponent: (cid, additive) => getSelectionRuntime().selectComponent(cid, additive),
      reapplySelection: () => getSelectionRuntime().reapplySelection(),
      setFrameAlign: (cid, align) => getInspectorMutationRuntime().setFrameAlign(cid, align),
      setFrameProp: (cid, prop, value) => (
        getInspectorMutationRuntime().setFrameProp(cid, prop, value)
      ),
      requestLayoutRelayout: (triggerCid) => getRelayoutRuntime().requestRelayout(triggerCid),
      setFrameSize: (cid, dimension, value) => (
        getInspectorMutationRuntime().setFrameSize(cid, dimension, value)
      ),
      setWidthUnit: (unit, cid) => getInspectorDisplayRuntime().setWidthUnit(unit, cid),
      setHeightUnit: (unit, cid) => getInspectorDisplayRuntime().setHeightUnit(unit, cid),
      updateInspector: (cid) => getInspectorDisplayRuntime().updateInspector(cid),
      clearOverride: (cid) => getRelayoutRuntime().clearOverride(cid),
      updateOverrideSummary: () => getSceneFacade().updateOverrideSummary(),
      refreshTreeColors: () => getSceneFacade().refreshTreeColors(),
      runConstraints: () => getSceneFacade().runConstraints(),
      onDocumentKeyDown: (event) => getInteractionFacade().onDocumentKeyDown(event),
      bootstrapEditorRuntime: () => getBootstrapFacade().bootstrapEditorRuntime(),
    };
    return compatFacadeState.current!;
  };

  return {
    getRuntime,
    getBrowserState,
    getSceneFacade: () => getRuntime().getSceneFacade(),
    getBootstrapFacade: () => getRuntime().getBootstrapFacade(),
    getRelayoutFacade: () => getRuntime().getRelayoutFacade(),
    getInteractionFacade: () => getRuntime().getInteractionFacade(),
    getCompatFacade,
    invalidateOverrideBoundFacades: () => {
      runtimeState.current?.invalidateOverrideBoundFacades();
    },
  };
}

export function createPreviewGridEditorInstallUnitFromEditorHost(
  options: CreatePreviewGridEditorInstallUnitFromEditorHostOptions,
): PreviewGridEditorInstallUnit {
  return createPreviewGridEditorInstallUnitFromBrowserHost(
    createBrowserHostOptionsFromEditorHost(options),
  );
}
