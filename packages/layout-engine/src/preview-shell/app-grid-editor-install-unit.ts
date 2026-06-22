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
  type PreviewGridEditorRuntimeValueState,
} from './app-grid-editor-runtime.js';

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
