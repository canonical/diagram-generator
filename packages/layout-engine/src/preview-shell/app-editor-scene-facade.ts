import {
  autoFitPreviewArtboard,
  type PreviewArtboardNode,
} from './app-artboard.js';
import {
  deletePreviewSelectedFramesHost,
  type DeletePreviewSelectedFramesHostOptions,
  type DispatchPreviewDeleteFramesResult,
  type PreviewFrameDeleteNode,
} from './app-frame-delete.js';
import {
  createPreviewGridRuntimeFromEditorHost,
  type CreatePreviewGridRuntimeFromEditorHostOptions,
  type PreviewGridRuntimeEditorHostModel,
  type PreviewGridRuntimeHost,
} from './app-grid-runtime.js';
import {
  applyPreviewSvgOverridesHost,
  type ApplyPreviewSvgOverridesHostOptions,
  type PreviewOverrideEntry,
  type PreviewOverrideRelayoutStatus,
  type PreviewOverrideRootNode,
  type PreviewOverrideTreeNode,
} from './app-override-application.js';
import type {
  PreviewRenderedBounds,
  ReadPreviewRenderedComponentBoundsOptions,
} from './app-interaction-host.js';
import {
  applyPreviewWaypointOverridesHost,
  refreshPreviewSceneHost,
  refreshPreviewTreeOverrideStateHost,
  rerenderPreviewStageFromModelHost,
  runPreviewConstraintValidationHost,
  updatePreviewOverrideSummaryHost,
  type PreviewSceneHostDocumentLike,
  type PreviewSceneHostTextElementLike,
  type PreviewWaypointNode,
  type PreviewWaypointOverrideEntry,
} from './app-scene-host.js';
import type { PreviewDocumentActionStateSource } from './app-shell-panels.js';

export interface PreviewEditorSceneRefreshCallbacks {
  buildTreeUi?: (() => void) | null;
  bindInteraction?: (() => void) | null;
  reapplySelection?: (() => void) | null;
  renderSelectionInspector?: (() => void) | null;
}

export interface PreviewEditorSceneWaypointOptions {
  getOverrides: () => Record<string, PreviewWaypointOverrideEntry>;
  getArrowNode: (cid: string) => PreviewWaypointNode | null | undefined;
  rebuildArrowSvg: (cid: string) => void;
}

export interface PreviewEditorSceneOverrideApplicationOptions {
  document: ApplyPreviewSvgOverridesHostOptions['document'];
  getSelectedIds: () => Iterable<string>;
  getComponentTree: () => PreviewOverrideTreeNode[];
  getRootNodes: () => PreviewOverrideRootNode[];
  getOverrides: () => Record<string, PreviewOverrideEntry | undefined>;
  getRelayoutStatus?: (() => PreviewOverrideRelayoutStatus | null) | null;
  boxStyles: ApplyPreviewSvgOverridesHostOptions['boxStyles'];
  inset: number;
  iconSize: number;
  gridStep: number;
  hasDiagramGrid: () => boolean;
  getNode: ApplyPreviewSvgOverridesHostOptions['getNode'];
  getOwnDelta: ApplyPreviewSvgOverridesHostOptions['getOwnDelta'];
  getEffectiveDelta: ApplyPreviewSvgOverridesHostOptions['getEffectiveDelta'];
  isFrameManagedTarget: ApplyPreviewSvgOverridesHostOptions['isFrameManagedTarget'];
  showResizeHandles?: ApplyPreviewSvgOverridesHostOptions['showResizeHandles'];
}

export interface PreviewEditorSceneRerenderOptions<
  TModel = PreviewGridRuntimeEditorHostModel,
  TOverrides = Record<string, unknown>,
  TSvg = unknown,
> {
  document: {
    getElementById: (id: string) => {
      replaceChildren: (child: TSvg) => void;
    } | null;
  };
  model: TModel & {
    gridOverrides?: Record<string, unknown> | null;
  };
  getOverrides: () => TOverrides;
  renderFreshSvg?: ((options: {
    overrides: TOverrides;
    gridOverrides: Record<string, unknown> | null;
    model: TModel;
  }) => Promise<{
    svg: TSvg;
    width: number;
    height: number;
  }>) | null;
  fitRenderedSvgToContent?: ((svg: TSvg, options: { minWidth: number; minHeight: number }) => unknown) | null;
}

export interface PreviewEditorSceneOverrideSummaryOptions {
  document: Pick<PreviewSceneHostDocumentLike, 'getElementById'>;
  getOverrideCount: () => number;
  formatSummary: (count: number) => string;
  documentActions?: (() => Omit<PreviewDocumentActionStateSource, 'frameOverrideCount'>) | null;
}

export interface PreviewEditorSceneTreeOverrideStateOptions {
  document: Document | PreviewSceneHostDocumentLike;
  getOverrides: () => Record<string, unknown>;
  syncTreeOverrideState: (
    container: Document | PreviewSceneHostDocumentLike,
    overrides: Record<string, unknown>,
  ) => void;
}

export interface PreviewEditorSceneConstraintOptions<
  TViolations = unknown,
  TSummary extends { errors?: number } = { errors?: number },
> {
  document: Pick<PreviewSceneHostDocumentLike, 'getElementById' | 'querySelector'>;
  model: unknown;
  validateConstraints: (model: unknown, svg: unknown) => TViolations;
  summarizeViolations: (violations: TViolations) => TSummary;
  setLastViolations: (violations: TViolations) => void;
  syncSaveButton: (errorCount: number) => void;
  syncConstraintStatus: (
    element: PreviewSceneHostTextElementLike,
    summary: TSummary,
    options?: {
      violations?: unknown;
      selectedIds?: Iterable<string> | null;
    },
  ) => void;
}

export interface PreviewEditorSceneArtboardOptions {
  document: {
    querySelector: (selector: string) => SVGSVGElement | null;
  };
  getRoots: () => PreviewArtboardNode[];
  readBounds: (componentId: string) => PreviewRenderedBounds | null | undefined;
  padding?: number;
}

export interface CreatePreviewEditorSceneFacadeFromEditorHostOptions<
  TGridInfo = unknown,
  TModel extends PreviewGridRuntimeEditorHostModel<TGridInfo> =
    PreviewGridRuntimeEditorHostModel<TGridInfo>,
  TOverrides = Record<string, unknown>,
  TSvg = unknown,
  TViolations = unknown,
  TSummary extends { errors?: number } = { errors?: number },
  TDeleteNode extends PreviewFrameDeleteNode = PreviewFrameDeleteNode,
  TRootNode extends { id?: string | null } = { id?: string | null },
> {
  gridRuntime: CreatePreviewGridRuntimeFromEditorHostOptions<TGridInfo, TModel>;
  sceneRefresh: PreviewEditorSceneRefreshCallbacks;
  waypointOverrides: PreviewEditorSceneWaypointOptions;
  overrideApplication: PreviewEditorSceneOverrideApplicationOptions;
  rerenderStageFromModel: PreviewEditorSceneRerenderOptions<TModel, TOverrides, TSvg>;
  frameDelete: Omit<
    DeletePreviewSelectedFramesHostOptions<unknown, TDeleteNode, TRootNode>,
    'isTextEditing' | 'rootNodes' | 'rerenderStage'
  > & {
    isTextEditing?: boolean | (() => boolean);
    getRootNodes: () => Iterable<TRootNode>;
  };
  artboard: PreviewEditorSceneArtboardOptions;
  overrideSummary: PreviewEditorSceneOverrideSummaryOptions;
  treeOverrideState: PreviewEditorSceneTreeOverrideStateOptions;
  constraints: PreviewEditorSceneConstraintOptions<TViolations, TSummary>;
}

type RuntimeGridRuntimeOptions<
  TGridInfo,
  TModel extends PreviewGridRuntimeEditorHostModel<TGridInfo>,
> = Omit<
  CreatePreviewEditorSceneFacadeFromEditorHostOptions<TGridInfo, TModel>['gridRuntime'],
  'document' | 'guideModes' | 'baselineStep' | 'slug' | 'model' | 'editorState'
  | 'resolvePreviewGridInfo' | 'resolvePreviewGridInfoFromRuntimeState' | 'createGridOverlayScene'
>;

type RuntimeOverrideApplicationOptions = Omit<
  PreviewEditorSceneOverrideApplicationOptions,
  'document' | 'getSelectedIds' | 'getOverrides'
>;

type RuntimeRerenderOptions<
  TModel extends PreviewGridRuntimeEditorHostModel<TGridInfo>,
  TOverrides,
  TSvg,
  TGridInfo,
> = Omit<
  PreviewEditorSceneRerenderOptions<TModel, TOverrides, TSvg>,
  'document' | 'model' | 'getOverrides' | 'renderFreshSvg'
>;

type RuntimeOverrideSummaryOptions = Omit<
  PreviewEditorSceneOverrideSummaryOptions,
  'document' | 'formatSummary'
>;

type RuntimeTreeOverrideStateOptions = Omit<
  PreviewEditorSceneTreeOverrideStateOptions,
  'document' | 'getOverrides' | 'syncTreeOverrideState'
>;

type RuntimeConstraintOptions<TViolations, TSummary extends { errors?: number }> = Omit<
  PreviewEditorSceneConstraintOptions<TViolations, TSummary>,
  'document' | 'model' | 'syncConstraintStatus'
>;

type RuntimeArtboardOptions = Omit<
  PreviewEditorSceneArtboardOptions,
  'document' | 'readBounds'
>;

export interface PreviewEditorSceneSharedOptions<
  TGridInfo = unknown,
  TModel extends PreviewGridRuntimeEditorHostModel<TGridInfo> =
    PreviewGridRuntimeEditorHostModel<TGridInfo>,
  TOverrides = Record<string, unknown>,
> {
  document: Document;
  guideModes: CreatePreviewEditorSceneFacadeFromEditorHostOptions<TGridInfo, TModel>['gridRuntime']['guideModes'];
  baselineStep: CreatePreviewEditorSceneFacadeFromEditorHostOptions<TGridInfo, TModel>['gridRuntime']['baselineStep'];
  slug: CreatePreviewEditorSceneFacadeFromEditorHostOptions<TGridInfo, TModel>['gridRuntime']['slug'];
  model: TModel;
  selectedIds: Iterable<string>;
  editorState: CreatePreviewEditorSceneFacadeFromEditorHostOptions<TGridInfo, TModel>['gridRuntime']['editorState'];
  getOverrides: () => TOverrides;
}

export interface PreviewEditorSceneContractOptions<
  TGridInfo = unknown,
  TModel extends PreviewGridRuntimeEditorHostModel<TGridInfo> =
    PreviewGridRuntimeEditorHostModel<TGridInfo>,
  TOverrides = Record<string, unknown>,
  TSvg = unknown,
  TViolations = unknown,
  TSummary extends { errors?: number } = { errors?: number },
> {
  previewShellScene: {
    resolvePreviewGridInfo:
      CreatePreviewEditorSceneFacadeFromEditorHostOptions<TGridInfo, TModel>['gridRuntime']['resolvePreviewGridInfo'];
    resolvePreviewGridInfoFromRuntimeState:
      CreatePreviewEditorSceneFacadeFromEditorHostOptions<TGridInfo, TModel>['gridRuntime']['resolvePreviewGridInfoFromRuntimeState'];
    createGridOverlayScene:
      CreatePreviewEditorSceneFacadeFromEditorHostOptions<TGridInfo, TModel>['gridRuntime']['createGridOverlayScene'];
    formatPreviewOverrideSummary: PreviewEditorSceneOverrideSummaryOptions['formatSummary'];
    syncPreviewTreeOverrideState: PreviewEditorSceneTreeOverrideStateOptions['syncTreeOverrideState'];
    syncPreviewConstraintStatus: PreviewEditorSceneConstraintOptions<TViolations, TSummary>['syncConstraintStatus'];
  };
  previewBridgeRender: {
    renderFreshPreviewSvg?: PreviewEditorSceneRerenderOptions<TModel, TOverrides, TSvg>['renderFreshSvg'];
    readPreviewRenderedComponentBounds: (
      options: ReadPreviewRenderedComponentBoundsOptions,
    ) => PreviewRenderedBounds | null;
  };
}

export interface CreatePreviewEditorSceneFacadeFromRuntimeOptions<
  TGridInfo = unknown,
  TModel extends PreviewGridRuntimeEditorHostModel<TGridInfo> =
    PreviewGridRuntimeEditorHostModel<TGridInfo>,
  TOverrides = Record<string, unknown>,
  TSvg = unknown,
  TViolations = unknown,
  TSummary extends { errors?: number } = { errors?: number },
  TDeleteNode extends PreviewFrameDeleteNode = PreviewFrameDeleteNode,
  TRootNode extends { id?: string | null } = { id?: string | null },
> {
  shared: PreviewEditorSceneSharedOptions<TGridInfo, TModel, TOverrides>;
  contracts: PreviewEditorSceneContractOptions<
    TGridInfo,
    TModel,
    TOverrides,
    TSvg,
    TViolations,
    TSummary
  >;
  gridRuntime: RuntimeGridRuntimeOptions<TGridInfo, TModel>;
  sceneRefresh: PreviewEditorSceneRefreshCallbacks;
  waypointOverrides: PreviewEditorSceneWaypointOptions;
  overrideApplication: RuntimeOverrideApplicationOptions;
  rerenderStageFromModel: RuntimeRerenderOptions<TModel, TOverrides, TSvg, TGridInfo>;
  frameDelete: CreatePreviewEditorSceneFacadeFromEditorHostOptions<
    TGridInfo,
    TModel,
    TOverrides,
    TSvg,
    TViolations,
    TSummary,
    TDeleteNode,
    TRootNode
  >['frameDelete'];
  artboard: RuntimeArtboardOptions;
  overrideSummary: RuntimeOverrideSummaryOptions;
  treeOverrideState: RuntimeTreeOverrideStateOptions;
  constraints: RuntimeConstraintOptions<TViolations, TSummary>;
}

export interface PreviewEditorSceneFacade<TGridInfo = unknown> {
  getGridRuntime: () => PreviewGridRuntimeHost<TGridInfo>;
  clearPendingRelayout: () => void;
  loadGridInfo: PreviewGridRuntimeHost<TGridInfo>['loadGridInfo'];
  cycleGuideMode: PreviewGridRuntimeHost<TGridInfo>['cycleGuideMode'];
  renderGridOverlay: PreviewGridRuntimeHost<TGridInfo>['renderGridOverlay'];
  populateGridControls: PreviewGridRuntimeHost<TGridInfo>['populateGridControls'];
  onGridControlChange: PreviewGridRuntimeHost<TGridInfo>['onGridControlChange'];
  refreshGridInfoFromLayout: PreviewGridRuntimeHost<TGridInfo>['refreshGridInfoFromLayout'];
  bindGridControls: () => void;
  applyWaypointOverrides: () => number;
  applyAllOverrides: () => boolean;
  updateOverrideSummary: () => boolean;
  refreshTreeColors: () => void;
  runConstraints: () => unknown;
  applyLocalRestoreRefresh: (syncGridControls?: boolean) => void;
  refreshScene: () => void;
  rerenderStageFromModel: () => Promise<boolean>;
  deleteSelectedFrames: () => Promise<DispatchPreviewDeleteFramesResult>;
  autoFitArtboard: () => boolean;
}

export function createPreviewEditorSceneFacadeFromEditorHost<
  TGridInfo = unknown,
  TModel extends PreviewGridRuntimeEditorHostModel<TGridInfo> =
    PreviewGridRuntimeEditorHostModel<TGridInfo>,
  TOverrides = Record<string, unknown>,
  TSvg = unknown,
  TViolations = unknown,
  TSummary extends { errors?: number } = { errors?: number },
  TDeleteNode extends PreviewFrameDeleteNode = PreviewFrameDeleteNode,
  TRootNode extends { id?: string | null } = { id?: string | null },
>(
  options: CreatePreviewEditorSceneFacadeFromEditorHostOptions<
    TGridInfo,
    TModel,
    TOverrides,
    TSvg,
    TViolations,
    TSummary,
    TDeleteNode,
    TRootNode
  >,
): PreviewEditorSceneFacade<TGridInfo> {
  let gridRuntime: PreviewGridRuntimeHost<TGridInfo> | null = null;

  const runtime: PreviewEditorSceneFacade<TGridInfo> = {
    getGridRuntime() {
      if (gridRuntime) {
        return gridRuntime;
      }
      gridRuntime = createPreviewGridRuntimeFromEditorHost(options.gridRuntime);
      return gridRuntime;
    },
    clearPendingRelayout() {
      runtime.getGridRuntime().clearPendingRelayout();
    },
    loadGridInfo(canonicalState) {
      return runtime.getGridRuntime().loadGridInfo(canonicalState);
    },
    cycleGuideMode() {
      return runtime.getGridRuntime().cycleGuideMode();
    },
    renderGridOverlay() {
      return runtime.getGridRuntime().renderGridOverlay();
    },
    populateGridControls() {
      return runtime.getGridRuntime().populateGridControls();
    },
    onGridControlChange() {
      return runtime.getGridRuntime().onGridControlChange();
    },
    refreshGridInfoFromLayout() {
      return runtime.getGridRuntime().refreshGridInfoFromLayout();
    },
    bindGridControls() {
      runtime.getGridRuntime().bindControls();
    },
    applyWaypointOverrides() {
      return applyPreviewWaypointOverridesHost({
        overrides: options.waypointOverrides.getOverrides(),
        getArrowNode: options.waypointOverrides.getArrowNode,
        rebuildArrowSvg: options.waypointOverrides.rebuildArrowSvg,
      });
    },
    applyAllOverrides() {
      return applyPreviewSvgOverridesHost({
        document: options.overrideApplication.document,
        selectedIds: options.overrideApplication.getSelectedIds(),
        componentTree: options.overrideApplication.getComponentTree(),
        rootNodes: options.overrideApplication.getRootNodes(),
        overrides: options.overrideApplication.getOverrides(),
        relayoutStatus: options.overrideApplication.getRelayoutStatus?.() ?? null,
        boxStyles: options.overrideApplication.boxStyles,
        inset: options.overrideApplication.inset,
        iconSize: options.overrideApplication.iconSize,
        gridStep: options.overrideApplication.gridStep,
        hasDiagramGrid: options.overrideApplication.hasDiagramGrid(),
        getNode: options.overrideApplication.getNode,
        getOwnDelta: options.overrideApplication.getOwnDelta,
        getEffectiveDelta: options.overrideApplication.getEffectiveDelta,
        isFrameManagedTarget: options.overrideApplication.isFrameManagedTarget,
        showResizeHandles: options.overrideApplication.showResizeHandles,
      });
    },
    updateOverrideSummary() {
      return updatePreviewOverrideSummaryHost({
        document: options.overrideSummary.document,
        overrideCount: options.overrideSummary.getOverrideCount(),
        formatSummary: options.overrideSummary.formatSummary,
        documentActions: options.overrideSummary.documentActions?.() ?? null,
      });
    },
    refreshTreeColors() {
      refreshPreviewTreeOverrideStateHost({
        document: options.treeOverrideState.document,
        overrides: options.treeOverrideState.getOverrides(),
        syncTreeOverrideState: options.treeOverrideState.syncTreeOverrideState,
      });
    },
    runConstraints() {
      return runPreviewConstraintValidationHost({
        document: options.constraints.document,
        model: options.constraints.model,
        validateConstraints: options.constraints.validateConstraints,
        summarizeViolations: options.constraints.summarizeViolations,
        setLastViolations: options.constraints.setLastViolations,
        selectedIds: options.overrideApplication.getSelectedIds(),
        syncSaveButton: options.constraints.syncSaveButton,
        syncConstraintStatus: options.constraints.syncConstraintStatus,
      });
    },
    applyLocalRestoreRefresh(syncGridControls = false) {
      refreshPreviewSceneHost({
        applyWaypointOverrides: () => {
          runtime.applyWaypointOverrides();
        },
        applyAllOverrides: () => {
          runtime.applyAllOverrides();
        },
        reapplySelection: options.sceneRefresh.reapplySelection ?? null,
        renderSelectionInspector: options.sceneRefresh.renderSelectionInspector ?? null,
        updateOverrideSummary: () => {
          runtime.updateOverrideSummary();
        },
        refreshTreeColors: () => {
          runtime.refreshTreeColors();
        },
        runConstraints: () => {
          runtime.runConstraints();
        },
        populateGridControls: (
          syncGridControls && runtime.getGridRuntime().getGridInfo()
            ? () => {
              runtime.populateGridControls();
            }
            : null
        ),
      });
    },
    refreshScene() {
      refreshPreviewSceneHost({
        applyWaypointOverrides: () => {
          runtime.applyWaypointOverrides();
        },
        buildTreeUi: options.sceneRefresh.buildTreeUi ?? null,
        bindInteraction: options.sceneRefresh.bindInteraction ?? null,
        applyAllOverrides: () => {
          runtime.applyAllOverrides();
        },
        renderGridOverlay: () => {
          runtime.renderGridOverlay();
        },
        reapplySelection: options.sceneRefresh.reapplySelection ?? null,
        refreshGridInfo: () => {
          runtime.refreshGridInfoFromLayout();
        },
        renderSelectionInspector: options.sceneRefresh.renderSelectionInspector ?? null,
        updateOverrideSummary: () => {
          runtime.updateOverrideSummary();
        },
        refreshTreeColors: () => {
          runtime.refreshTreeColors();
        },
        runConstraints: () => {
          runtime.runConstraints();
        },
      });
    },
    rerenderStageFromModel() {
      return rerenderPreviewStageFromModelHost({
        document: options.rerenderStageFromModel.document,
        model: options.rerenderStageFromModel.model,
        overrides: options.rerenderStageFromModel.getOverrides(),
        renderFreshSvg: options.rerenderStageFromModel.renderFreshSvg,
        fitRenderedSvgToContent: options.rerenderStageFromModel.fitRenderedSvgToContent ?? null,
        refreshScene: {
          applyWaypointOverrides: () => {
            runtime.applyWaypointOverrides();
          },
          buildTreeUi: options.sceneRefresh.buildTreeUi ?? null,
          bindInteraction: options.sceneRefresh.bindInteraction ?? null,
          applyAllOverrides: () => {
            runtime.applyAllOverrides();
          },
          renderGridOverlay: () => {
            runtime.renderGridOverlay();
          },
          reapplySelection: options.sceneRefresh.reapplySelection ?? null,
          refreshGridInfo: () => {
            runtime.refreshGridInfoFromLayout();
          },
          renderSelectionInspector: options.sceneRefresh.renderSelectionInspector ?? null,
          updateOverrideSummary: () => {
            runtime.updateOverrideSummary();
          },
          refreshTreeColors: () => {
            runtime.refreshTreeColors();
          },
          runConstraints: () => {
            runtime.runConstraints();
          },
        },
      });
    },
    deleteSelectedFrames() {
      return deletePreviewSelectedFramesHost({
        ...options.frameDelete,
        isTextEditing: typeof options.frameDelete.isTextEditing === 'function'
          ? options.frameDelete.isTextEditing()
          : options.frameDelete.isTextEditing,
        rootNodes: options.frameDelete.getRootNodes(),
        rerenderStage: () => runtime.rerenderStageFromModel(),
      });
    },
    autoFitArtboard() {
      const svg = options.artboard.document.querySelector('#stage svg');
      const roots = options.artboard.getRoots();
      if (!svg || roots.length === 0) {
        return false;
      }
      autoFitPreviewArtboard({
        svg,
        roots,
        readBounds: options.artboard.readBounds,
        padding: options.artboard.padding ?? 24,
      });
      return true;
    },
  };

  return runtime;
}

export function createPreviewEditorSceneFacadeFromRuntime<
  TGridInfo = unknown,
  TModel extends PreviewGridRuntimeEditorHostModel<TGridInfo> =
    PreviewGridRuntimeEditorHostModel<TGridInfo>,
  TOverrides = Record<string, unknown>,
  TSvg = unknown,
  TViolations = unknown,
  TSummary extends { errors?: number } = { errors?: number },
  TDeleteNode extends PreviewFrameDeleteNode = PreviewFrameDeleteNode,
  TRootNode extends { id?: string | null } = { id?: string | null },
>(
  options: CreatePreviewEditorSceneFacadeFromRuntimeOptions<
    TGridInfo,
    TModel,
    TOverrides,
    TSvg,
    TViolations,
    TSummary,
    TDeleteNode,
    TRootNode
  >,
): PreviewEditorSceneFacade<TGridInfo> {
  return createPreviewEditorSceneFacadeFromEditorHost({
    gridRuntime: {
      ...options.gridRuntime,
      document: options.shared.document as CreatePreviewEditorSceneFacadeFromEditorHostOptions<
        TGridInfo,
        TModel,
        TOverrides,
        TSvg,
        TViolations,
        TSummary,
        TDeleteNode,
        TRootNode
      >['gridRuntime']['document'],
      guideModes: options.shared.guideModes,
      baselineStep: options.shared.baselineStep,
      slug: options.shared.slug,
      model: options.shared.model,
      editorState: options.shared.editorState,
      resolvePreviewGridInfo: options.contracts.previewShellScene.resolvePreviewGridInfo,
      resolvePreviewGridInfoFromRuntimeState:
        options.contracts.previewShellScene.resolvePreviewGridInfoFromRuntimeState,
      createGridOverlayScene: options.contracts.previewShellScene.createGridOverlayScene,
    },
    sceneRefresh: options.sceneRefresh,
    waypointOverrides: options.waypointOverrides,
    overrideApplication: {
      ...options.overrideApplication,
      document: options.shared.document,
      getSelectedIds: () => options.shared.selectedIds,
      getOverrides: options.shared.getOverrides as PreviewEditorSceneOverrideApplicationOptions['getOverrides'],
    },
    rerenderStageFromModel: {
      ...options.rerenderStageFromModel,
      document: options.shared.document,
      model: options.shared.model,
      getOverrides: options.shared.getOverrides as PreviewEditorSceneRerenderOptions<
        TModel,
        TOverrides,
        TSvg
      >['getOverrides'],
      renderFreshSvg: options.contracts.previewBridgeRender.renderFreshPreviewSvg as never,
      fitRenderedSvgToContent: options.rerenderStageFromModel.fitRenderedSvgToContent as never,
    },
    frameDelete: options.frameDelete,
    artboard: {
      ...options.artboard,
      document: options.shared.document,
      readBounds: (componentId) => {
        const svg = options.shared.document.querySelector('#stage svg');
        if (!svg) {
          return null;
        }
        return options.contracts.previewBridgeRender.readPreviewRenderedComponentBounds({
          svg,
          componentId,
        });
      },
    },
    overrideSummary: {
      ...options.overrideSummary,
      document: options.shared.document,
      formatSummary: options.contracts.previewShellScene.formatPreviewOverrideSummary,
    },
    treeOverrideState: {
      ...options.treeOverrideState,
      document: options.shared.document,
      getOverrides: options.shared.getOverrides as PreviewEditorSceneTreeOverrideStateOptions['getOverrides'],
      syncTreeOverrideState: options.contracts.previewShellScene.syncPreviewTreeOverrideState,
    },
    constraints: {
      ...options.constraints,
      document: options.shared.document,
      model: options.shared.model,
      syncConstraintStatus: options.contracts.previewShellScene.syncPreviewConstraintStatus,
    },
  });
}
