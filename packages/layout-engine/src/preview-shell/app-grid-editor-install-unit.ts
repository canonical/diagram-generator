import {
  createPreviewGridEditorBrowserStateFromBrowserHost,
  type CreatePreviewGridEditorBrowserStateFromBrowserHostOptions,
  type PreviewGridEditorBrowserState,
} from './app-grid-editor-browser-state.js';
import {
  createPreviewGridEditorRuntimeFromBrowserHost,
  type CreatePreviewGridEditorRuntimeFromBrowserHostOptions,
  type PreviewGridEditorRuntime,
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

export interface PreviewGridEditorInstallUnit {
  getRuntime: () => PreviewGridEditorRuntime;
  getBrowserState: () => PreviewGridEditorBrowserState;
  getSceneFacade: () => ReturnType<PreviewGridEditorRuntime['getSceneFacade']>;
  getBootstrapFacade: () => ReturnType<PreviewGridEditorRuntime['getBootstrapFacade']>;
  getRelayoutFacade: () => ReturnType<PreviewGridEditorRuntime['getRelayoutFacade']>;
  getInteractionFacade: () => ReturnType<PreviewGridEditorRuntime['getInteractionFacade']>;
  invalidateOverrideBoundFacades: () => void;
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

  return {
    getRuntime,
    getBrowserState,
    getSceneFacade: () => getRuntime().getSceneFacade(),
    getBootstrapFacade: () => getRuntime().getBootstrapFacade(),
    getRelayoutFacade: () => getRuntime().getRelayoutFacade(),
    getInteractionFacade: () => getRuntime().getInteractionFacade(),
    invalidateOverrideBoundFacades: () => {
      runtimeState.current?.invalidateOverrideBoundFacades();
    },
  };
}
