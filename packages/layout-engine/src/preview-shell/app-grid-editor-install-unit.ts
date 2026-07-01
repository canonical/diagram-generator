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
import {
  createPreviewEngineWorkspaceState,
} from './preview-engine-workspace.js';
import {
  commitPreviewRenderIntentToWindow,
  resolvePreviewRenderIntentLayoutEngine,
  type PreviewRenderIntent,
} from './preview-render-intent.js';
import {
  syncPreviewPanelVisibilityFromContext,
} from './app-shell-panels.js';
import type {
  PreviewUiDocumentState,
  PreviewUiSelectionContext,
} from './preview-ui-context.js';
import {
  getPreviewEngineByLayoutKey,
  resolvePreviewEngine,
} from '../preview-engine/registry.js';
import { sidebarSectionsUseLayoutParams } from '../preview-engine/sidebar-sections.js';
import type { PreviewEngineManifest } from '../preview-engine/types.js';
import {
  activateLayoutOperatorOverrideBucket,
  readLayoutOperatorOverrideBucketForManifest,
  resolveEffectiveLayoutOperatorOverrides,
  writeLayoutOperatorOverrideBucketForManifest,
  type LayoutOperatorOverrideState,
} from './layout-operator-overrides.js';

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

type PreviewGridEditorLegacyModel =
  & CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['model']
  & CreatePreviewGridEditorBrowserStateFromBrowserHostOptions['model'];

export interface PreviewGridEditorLegacyStateSeed {
  model: PreviewGridEditorLegacyModel;
  interactionManager:
    CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['interactionManager'];
  selectedIds: CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['selectedIds'];
  coercedKeys: CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['coercedKeys'];
  editorState: CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['editorState'];
  previewSaveClient:
    CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['previewSaveClient'];
  constraints: CreatePreviewGridEditorInstallUnitFromEditorHostOptions['shared']['constraints'];
  initialSelectionDepth?: number;
  initialGeneration?: number;
  initialAllowInternalDirtyNavigation?: boolean;
  initialLastViolations?: unknown;
  initialOverrides?: Record<string, Record<string, unknown>>;
  initialMultiActionGap?: number;
  initialLayoutRelayoutTimer?: unknown | null;
}

export interface PreviewGridEditorLegacyState {
  model: PreviewGridEditorLegacyModel;
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
    engine?: string;
    layout_engine?: string;
    active_engine_id?: string;
    persisted_layout_engine?: string;
    shell_mode?: string;
    document_kind?: string;
    compatible_engines?: string[];
    has_reference?: boolean;
    icon_size?: number;
    col_gap?: number;
    head_len?: number;
    head_half?: number;
  } | null;
  __DG_previewRenderIntent?: PreviewRenderIntent | null;
  __DG_syncPreviewEngineWorkspacePanels?: (() => void) | null;
  __DG_rerenderPreviewEngineWorkspaceStage?: (() => Promise<void>) | null;
  __DG_activeLayoutOperatorKey?: string | null;
  setFrameTreeLayoutEngine?: ((layoutEngine: string | null | undefined) => string | null) | null;
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

export interface CreatePreviewGridEditorInstallUnitFromLegacyEditorHostOptions {
  document: Document;
  previewWindow: PreviewGridEditorLegacyWindow;
  config: PreviewGridEditorLegacyConfig;
  state: PreviewGridEditorLegacyStateSeed;
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
  invalidateOverrideBoundFacades: () => void;
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

function finiteViolationCount(summary: unknown): number {
  if (!summary || typeof summary !== 'object') {
    return 0;
  }
  const record = summary as Record<string, unknown>;
  const total = Number(record.total);
  if (Number.isFinite(total)) {
    return Math.max(0, total);
  }
  const errors = Number(record.errors);
  const warnings = Number(record.warnings);
  return Math.max(
    0,
    (Number.isFinite(errors) ? errors : 0) + (Number.isFinite(warnings) ? warnings : 0),
  );
}

function resolvePreviewDocumentStateForPanelSync(
  state: PreviewGridEditorLegacyState,
  previewConfig: NonNullable<PreviewGridEditorLegacyWindow['__DG_CONFIG']>,
): PreviewUiDocumentState {
  const lastViolations = state.lastViolationsState.get();
  return {
    hasConstraintRegistry: true,
    violationCount: finiteViolationCount(state.constraints.summarise(lastViolations)),
    hasReference: Boolean(previewConfig.has_reference),
  };
}

function normalizeCompatibleEngines(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => String(entry || '').trim()).filter(Boolean)
    : [];
}

type PreviewEngineRuntimeInstallerLayoutEngineRoot = {
  previewEngines?: {
    registry?: {
      resolvePreviewEngine?: (context: {
        layoutEngine?: string | null;
        shellMode?: string | null;
      }) => {
        hostView?: { sidebarSections?: string[] };
        controlSpecs?: Array<{ persistNamespace?: string | null }>;
      } | null;
    };
    graph?: {
      createPreviewEngineLayoutControlsRuntime?: (options: Record<string, unknown>) => unknown;
      createPreviewEngineShellControllerRuntime?: (options: Record<string, unknown>) => unknown;
    };
  };
};

type PreviewEngineRuntimeInstallerWindow = PreviewGridEditorLegacyWindow & {
  LayoutEngine?: PreviewEngineRuntimeInstallerLayoutEngineRoot | null;
  getFrameTreeJson?: (() => unknown) | null;
  setDirty?: ((dirty: boolean) => void) | null;
  PreviewEngineLayoutControls?: unknown;
  PreviewEngineShellController?: {
    init?: (options: Record<string, unknown>) => void;
    syncPanel?: () => void;
  } | null;
};

type PreviewEngineRuntimeInstallerModel = {
  roots?: Array<{ id?: string | null }> | null;
  layoutOverrides?: Record<string, unknown> | null;
  layoutOverrideNamespace?: string | null;
  layoutOperatorOverrides?: LayoutOperatorOverrideState | null;
};

function installActivePreviewEngineRuntime(options: {
  document: Document;
  previewWindow: PreviewEngineRuntimeInstallerWindow;
  model: PreviewEngineRuntimeInstallerModel;
  fallbackEngineId: string | null;
  requestLayoutRelayout: (cid: string) => Promise<unknown> | unknown;
}): void {
  const previewConfig = options.previewWindow.__DG_CONFIG ?? null;
  const activeLayoutEngine = resolvePreviewRenderIntentLayoutEngine({
    intent: options.previewWindow.__DG_previewRenderIntent ?? null,
    activeEngineId: previewConfig?.active_engine_id ?? null,
    layoutEngine: previewConfig?.layout_engine ?? null,
    persistedEngineId: previewConfig?.persisted_layout_engine ?? null,
    fallbackEngineId: options.fallbackEngineId,
  });
  if (!activeLayoutEngine) {
    return;
  }

  const layoutEngineRoot = options.previewWindow.LayoutEngine ?? null;
  const resolveRootPreviewEngine = layoutEngineRoot?.previewEngines?.registry?.resolvePreviewEngine;
  const activeEngine: PreviewEngineManifest | null = typeof resolveRootPreviewEngine === 'function'
    ? (resolveRootPreviewEngine({
      layoutEngine: activeLayoutEngine,
      shellMode: previewConfig?.shell_mode ?? 'grid',
    }) as PreviewEngineManifest | null | undefined) ?? null
    : (resolvePreviewEngine({
      layoutEngine: activeLayoutEngine,
      shellMode: previewConfig?.shell_mode ?? 'grid',
      previewDocumentKind: previewConfig?.document_kind ?? 'frame-diagram',
    }) as PreviewEngineManifest | undefined) ?? null;
  if (!activeEngine || !layoutEngineRoot?.previewEngines) {
    return;
  }

  const sidebarSections = activeEngine.hostView?.sidebarSections ?? [];
  const usesLayoutParamsSection = sidebarSectionsUseLayoutParams(sidebarSections);
  if (!usesLayoutParamsSection) {
    return;
  }

  const defaultPersistNamespace = activeEngine.controlSpecs?.find(
    (spec: { persistNamespace?: string | null }) => spec.persistNamespace,
  )
    ?.persistNamespace ?? options.model.layoutOverrideNamespace ?? 'meta.elk';
  const frameTreeJson = typeof options.previewWindow.getFrameTreeJson === 'function'
    ? (options.previewWindow.getFrameTreeJson?.() as {
      elkLayout?: Record<string, unknown>;
      engineLayout?: Record<string, Record<string, unknown>>;
    } | null | undefined)
    : null;
  const persistedOverrides = resolveEffectiveLayoutOperatorOverrides({
    manifest: activeEngine,
    engineLayout: frameTreeJson?.engineLayout ?? null,
    elkLayout: frameTreeJson?.elkLayout ?? null,
    sessionOverrides: {},
    persistNamespace: defaultPersistNamespace,
  });
  activateLayoutOperatorOverrideBucket(options.model, activeEngine, {
    fallbackOverrides: persistedOverrides,
    persistNamespace: defaultPersistNamespace,
  });
  options.previewWindow.__DG_activeLayoutOperatorKey =
    options.model.layoutOperatorOverrides?.activeOperatorKey ?? null;
  const controlsFactory = layoutEngineRoot.previewEngines.graph?.createPreviewEngineLayoutControlsRuntime;
  const controllerFactory = layoutEngineRoot.previewEngines.graph?.createPreviewEngineShellControllerRuntime;
  if (typeof controlsFactory !== 'function' || typeof controllerFactory !== 'function') {
    return;
  }

  const controlsRuntime = controlsFactory({
    document: options.document,
    previewWindow: options.previewWindow,
    layoutEngineRoot,
    setTimeoutFn: (callback: () => void, delayMs: number) => (
      options.previewWindow.setTimeout(callback, delayMs)
    ),
    clearTimeoutFn: (token: unknown) => options.previewWindow.clearTimeout(token as never),
    getFrameTreeJson: typeof options.previewWindow.getFrameTreeJson === 'function'
      ? () => options.previewWindow.getFrameTreeJson?.()
      : null,
    getDirtySetter: () => options.previewWindow.setDirty,
    sidebarSectionId: 'layout-params',
    sectionId: 'layout-params-section',
    containerId: 'layout-params-controls',
    controlIdPrefix: 'layout-params',
    defaultPersistNamespace,
    enableRawViewToggles: activeEngine.capabilities?.rawDebugView === true,
    unavailableMessage: 'Graph layout parameter registry unavailable. Rebuild the browser bundle from packages/layout-engine.',
  });

  options.previewWindow.PreviewEngineLayoutControls = controlsRuntime;

  const controllerRuntime = controllerFactory({
    document: options.document,
    previewWindow: options.previewWindow,
    layoutEngineRoot,
    getFrameTreeJson: typeof options.previewWindow.getFrameTreeJson === 'function'
      ? () => options.previewWindow.getFrameTreeJson?.()
      : null,
    sidebarSectionId: 'layout-params',
    defaultPersistNamespace,
  }) as PreviewEngineRuntimeInstallerWindow['PreviewEngineShellController'];

  options.previewWindow.PreviewEngineShellController = controllerRuntime ?? null;

  controllerRuntime?.init?.({
    getLayoutOverrides: () => readLayoutOperatorOverrideBucketForManifest(options.model, activeEngine),
    setLayoutOverrides: (value: Record<string, unknown>) => {
      writeLayoutOperatorOverrideBucketForManifest(
        options.model,
        activeEngine,
        value,
        defaultPersistNamespace,
      );
    },
    getRootId: () => options.model.roots?.[0]?.id || 'root',
    requestLayoutRelayout: options.requestLayoutRelayout,
  });
  controllerRuntime?.syncPanel?.();
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

function createLegacyPreviewMutableState(
  options: CreatePreviewGridEditorInstallUnitFromLegacyEditorHostOptions,
): PreviewGridEditorLegacyState {
  let selectionDepth = options.state.initialSelectionDepth ?? 0;
  let generation = options.state.initialGeneration ?? 0;
  let allowInternalDirtyNavigation = options.state.initialAllowInternalDirtyNavigation ?? false;
  let lastViolations = (
    options.state.initialLastViolations ?? []
  ) as ReturnType<PreviewGridEditorLegacyState['lastViolationsState']['get']>;
  let overrides = options.state.initialOverrides ?? options.state.model.overrides ?? {};
  let multiActionGap = options.state.initialMultiActionGap ?? options.config.fallbackGap;
  let layoutRelayoutTimer = (
    options.state.initialLayoutRelayoutTimer ?? null
  ) as ReturnType<PreviewGridEditorLegacyState['layoutRelayoutTimerState']['get']>;

  options.state.model.overrides = overrides;

  return {
    model: options.state.model,
    interactionManager: options.state.interactionManager,
    selectedIds: options.state.selectedIds,
    selectionDepthState: {
      get: () => selectionDepth,
      set: (nextDepth) => {
        selectionDepth = nextDepth;
      },
    },
    coercedKeys: options.state.coercedKeys,
    editorState: options.state.editorState,
    previewSaveClient: options.state.previewSaveClient,
    generationState: {
      get: () => generation,
      set: (value) => {
        generation = value;
      },
    },
    allowInternalDirtyNavigationState: {
      get: () => allowInternalDirtyNavigation,
      set: (allowed) => {
        allowInternalDirtyNavigation = allowed;
      },
    },
    constraints: options.state.constraints,
    lastViolationsState: {
      get: () => lastViolations,
      set: (violations) => {
        lastViolations = violations;
      },
    },
    overridesState: {
      get: () => overrides,
      set: (nextOverrides) => {
        overrides = nextOverrides;
        options.state.model.overrides = nextOverrides;
      },
    },
    multiActionGapState: {
      get: () => multiActionGap,
      set: (gap) => {
        multiActionGap = gap;
      },
    },
    layoutRelayoutTimerState: {
      get: () => layoutRelayoutTimer,
      set: (timerId) => {
        layoutRelayoutTimer = timerId;
      },
    },
  };
}

export function createPreviewGridEditorInstallOptionsFromLegacyEditorHost(
  options: CreatePreviewGridEditorInstallOptionsFromLegacyEditorHostOptions,
): CreatePreviewGridEditorInstallUnitFromEditorHostOptions {
  const boxStyles = resolveLegacyPreviewBoxStyles(options.previewWindow);
  const previewConfig = options.previewWindow.__DG_CONFIG ?? {};
  commitPreviewRenderIntentToWindow(options.previewWindow, {
    activeEngineId: previewConfig.active_engine_id
      ?? previewConfig.layout_engine
      ?? options.config.engine
      ?? previewConfig.engine
      ?? null,
    persistedEngineId: previewConfig.persisted_layout_engine
      ?? previewConfig.layout_engine
      ?? options.config.engine
      ?? previewConfig.engine
      ?? null,
    fallbackEngineId: options.config.engine ?? null,
  });
  let lastSelectionContext: PreviewUiSelectionContext = { count: 0, kind: 'empty' };
  const resolveCurrentDocumentKind = () => previewConfig.document_kind || 'frame-diagram';
  const resolveCurrentShellMode = () => previewConfig.shell_mode || 'grid';
  const resolveCurrentConfiguredLayoutEngine = () => resolvePreviewRenderIntentLayoutEngine({
    activeEngineId: previewConfig.active_engine_id ?? null,
    layoutEngine: previewConfig.layout_engine ?? null,
    persistedEngineId: previewConfig.persisted_layout_engine ?? null,
    fallbackEngineId: options.config.engine ?? previewConfig.engine ?? null,
  });
  const resolveCurrentActiveLayoutEngine = () => (
    resolvePreviewRenderIntentLayoutEngine({
      intent: options.previewWindow.__DG_previewRenderIntent ?? null,
    }) ?? resolveCurrentConfiguredLayoutEngine()
  );
  const resolveCurrentActiveEngine = () => resolvePreviewEngine({
    layoutEngine: resolveCurrentActiveLayoutEngine(),
    shellMode: resolveCurrentShellMode(),
    previewDocumentKind: resolveCurrentDocumentKind(),
  }) ?? null;
  const shouldShowAutolayoutInspector = () => Boolean(
    resolveCurrentActiveEngine()?.capabilities?.gridEditing,
  );
  const syncPanelVisibility = (selection: PreviewUiSelectionContext) => {
    lastSelectionContext = selection;
    const shellMode = resolveCurrentShellMode();
    const activeLayoutEngine = resolveCurrentActiveLayoutEngine();
    const persistedLayoutEngine = previewConfig.persisted_layout_engine
      ?? previewConfig.layout_engine
      ?? options.config.engine
      ?? previewConfig.engine
      ?? null;
    const documentKind = resolveCurrentDocumentKind();
    const activeEngine = resolveCurrentActiveEngine();
    syncPreviewPanelVisibilityFromContext({
      document: options.document,
      context: {
        shellMode,
        documentKind,
        engineWorkspace: createPreviewEngineWorkspaceState({
          activeEngineId: activeLayoutEngine,
          compatibleEngineIds: normalizeCompatibleEngines(previewConfig.compatible_engines),
          getEngineById: (engineId) => getPreviewEngineByLayoutKey(engineId) ?? null,
          persistedEngineId: persistedLayoutEngine,
        }),
        activeEngine,
        compatibleEngines: normalizeCompatibleEngines(previewConfig.compatible_engines),
        persistedLayoutEngine,
        selection,
        documentState: resolvePreviewDocumentStateForPanelSync(options.state, previewConfig),
      },
    });
  };
  options.previewWindow.__DG_syncPreviewEngineWorkspacePanels = () => {
    syncPanelVisibility(lastSelectionContext);
  };

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
      syncPanelVisibility,
      shouldShowAutolayoutInspector,
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

export function createPreviewGridEditorInstallUnitFromLegacyEditorHost(
  options: CreatePreviewGridEditorInstallUnitFromLegacyEditorHostOptions,
): PreviewGridEditorInstallUnit {
  return createPreviewGridEditorInstallUnitFromEditorHost(
    createPreviewGridEditorInstallOptionsFromLegacyEditorHost({
      document: options.document,
      previewWindow: options.previewWindow,
      config: options.config,
      state: createLegacyPreviewMutableState(options),
      helpers: options.helpers,
      modelOps: options.modelOps,
      facades: options.facades,
    }),
  );
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
  options.shared.previewWindow.__DG_rerenderPreviewEngineWorkspaceStage = async () => {
    const previewWindow = options.shared.previewWindow as PreviewGridEditorLegacyWindow;
    const previewConfig = previewWindow.__DG_CONFIG ?? null;
    const activeLayoutEngine = resolvePreviewRenderIntentLayoutEngine({
      intent: previewWindow.__DG_previewRenderIntent ?? null,
    }) ?? resolvePreviewRenderIntentLayoutEngine({
      fallbackEngineId: options.shared.engine ?? null,
    });
    if (activeLayoutEngine) {
      const committedLayoutEngine = previewWindow.setFrameTreeLayoutEngine?.(
        activeLayoutEngine,
      );
      if (committedLayoutEngine !== activeLayoutEngine) {
        throw new Error(`Unable to commit preview layout engine '${activeLayoutEngine}' before render.`);
      }
      commitPreviewRenderIntentToWindow(previewWindow, {
        current: previewWindow.__DG_previewRenderIntent ?? null,
        activeEngineId: committedLayoutEngine,
        persistedEngineId: previewConfig?.persisted_layout_engine ?? null,
        fallbackEngineId: options.shared.engine ?? null,
      });
    }
    installActivePreviewEngineRuntime({
      document: options.shared.document,
      previewWindow: previewWindow as PreviewEngineRuntimeInstallerWindow,
      model: options.shared.model,
      fallbackEngineId: options.shared.engine ?? null,
      requestLayoutRelayout: (cid) => (
        getRuntime().getRelayoutFacade().getRelayoutRuntime().requestRelayout(cid)
      ),
    });
    await getRuntime().getSceneFacade().rerenderStageFromModel();
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

export function createPreviewGridEditorInstallUnitFromEditorHost(
  options: CreatePreviewGridEditorInstallUnitFromEditorHostOptions,
): PreviewGridEditorInstallUnit {
  return createPreviewGridEditorInstallUnitFromBrowserHost(
    createBrowserHostOptionsFromEditorHost(options),
  );
}
