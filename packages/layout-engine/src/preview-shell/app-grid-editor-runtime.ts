import {
  createPreviewEditorBootstrapFacadeFromRuntime,
  type CreatePreviewEditorBootstrapFacadeFromRuntimeOptions,
  type PreviewEditorBootstrapFacade,
} from './app-editor-bootstrap-facade.js';
import {
  createPreviewEditorInteractionFacadeFromBrowserHost,
  type CreatePreviewEditorInteractionFacadeFromBrowserHostOptions,
  type PreviewEditorInteractionFacade,
} from './app-editor-interaction-facade.js';
import {
  createPreviewEditorRelayoutFacadeFromRuntime,
  type CreatePreviewEditorRelayoutFacadeFromRuntimeOptions,
  type PreviewEditorRelayoutFacade,
} from './app-editor-relayout-facade.js';
import {
  createPreviewEditorSceneFacadeFromRuntime,
  type CreatePreviewEditorSceneFacadeFromRuntimeOptions,
  type PreviewEditorSceneFacade,
} from './app-editor-scene-facade.js';
import {
  readFrameYamlEngineLayoutOverridesForLayoutEngine,
} from './frame-yaml-engine-layout-contract.js';
import {
  activateLayoutOperatorOverrideBucket,
  writeLayoutOperatorOverrideState,
  type LayoutOperatorOverrideState,
} from './layout-operator-overrides.js';
import { resolvePreviewEngine } from '../preview-engine/registry.js';

export interface PreviewGridEditorRuntimeNumericState {
  get: () => number;
  set: (value: number) => void;
}

export interface PreviewGridEditorRuntimeBooleanState {
  get: () => boolean;
  set: (value: boolean) => void;
}

export interface PreviewGridEditorRuntimeValueState<TValue = unknown> {
  get: () => TValue;
  set: (value: TValue) => void;
}

export interface PreviewGridEditorRuntimePreviewSaveClient {
  isDirty: () => boolean;
  trySaveIfDirty: () => void;
  syncSaveButton: (errorCount: number) => void;
  syncDirtyFromSerialized: (serializedState: string) => void;
  markSaved: (serializedState: string) => void;
}

export interface PreviewGridEditorRuntimeConstraints<
  TViolations = unknown,
  TSummary extends { errors?: number } = { errors?: number },
> {
  validate: (model: unknown, svg: unknown) => TViolations;
  summarise: (violations: TViolations) => TSummary;
}

export interface PreviewGridEditorRuntimeModel {
  _roots: Array<{
    data: Record<string, unknown>;
    id?: string | null;
    type?: string | null;
    gridRow?: number | null;
  }>;
  roots: Array<{ id?: string | null }>;
  diagramGrid?: unknown;
  gridOverrides?: Record<string, unknown> | null;
  layoutOverrides?: Record<string, unknown> | null;
  layoutOverrideNamespace?: string | null;
  layoutOperatorOverrides?: LayoutOperatorOverrideState | null;
  removedIds: Set<string>;
  setDiagramGrid: (value: unknown) => void;
  clearOverride: (cid: string) => void;
  get: (cid: string) => any;
}

export interface PreviewGridEditorRuntimeInteractionManager {
  state?: { cid?: string } | null;
  isMode: (mode: unknown) => boolean;
}

export interface PreviewGridEditorRuntimeEditorState {
  cloneValue: <T>(value: T) => T;
  captureOverrideEntries: (ids: Iterable<string> | null | undefined) => Record<string, unknown | null>;
  serializeDirtyState: () => string;
  normalizeGridOverrides: <T>(value: T) => T;
  commitOverridePatchAction: (label: string, beforeEntries: unknown, afterEntries: unknown) => void;
  beginUndoableAction: (label: string) => unknown;
  commitUndoableAction: (action: unknown) => void;
  runUndoableAction: <T>(label: string, mutate: () => T) => T;
  clearUndoHistory: () => void;
  getPendingGridAction: () => unknown;
  setPendingGridAction: (action: unknown) => void;
  undo: (applyUndoCommand: (command: unknown, direction: 'undo' | 'redo') => void) => Promise<unknown>;
  redo: (applyUndoCommand: (command: unknown, direction: 'undo' | 'redo') => void) => Promise<unknown>;
}

type PreviewGridEditorBridgeHostContract =
  CreatePreviewEditorBootstrapFacadeFromRuntimeOptions['contracts']['previewBridgeHost']
  & CreatePreviewEditorRelayoutFacadeFromRuntimeOptions['shared']['previewBridgeHost']
  & {
    getPreviewDocumentJson?: (() => unknown) | null;
    getFrameTreeJson?: (() => unknown) | null;
    getLocalRelayoutStatus?: (() => unknown) | null;
  };

type PreviewGridEditorBridgeRenderContract =
  CreatePreviewEditorBootstrapFacadeFromRuntimeOptions['contracts']['previewBridgeRender']
  & CreatePreviewEditorSceneFacadeFromRuntimeOptions['contracts']['previewBridgeRender']
  & CreatePreviewEditorInteractionFacadeFromBrowserHostOptions['contracts']['previewBridgeRender'];

type PreviewGridEditorShellSceneContract =
  CreatePreviewEditorSceneFacadeFromRuntimeOptions['contracts']['previewShellScene']
  & CreatePreviewEditorInteractionFacadeFromBrowserHostOptions['contracts']['previewShellScene'];

type PreviewGridEditorShellInspectorContract =
  CreatePreviewEditorInteractionFacadeFromBrowserHostOptions['contracts']['previewShellInspector'];

type PreviewGridEditorShellInteractionContract =
  CreatePreviewEditorInteractionFacadeFromBrowserHostOptions['contracts']['previewShellInteraction'];

interface PreviewGridEditorBridgeRelayoutContract {
  isPreviewFrameManagedTarget: (options: {
    target: unknown;
    relayoutStatus: unknown;
    getNode: (cid: string) => unknown;
  }) => boolean;
  hasPreviewRelayoutFrameOverride?: ((entry: unknown) => boolean) | null;
  hasV3FrameOverride?: ((entry: unknown) => boolean) | null;
}

interface PreviewGridEditorShellBootstrapContract {
  isPreviewEngineShellLayoutActive: (
    previewWindow: Window & typeof globalThis,
    frameTreeJson?: unknown,
  ) => boolean;
  initPreviewEngineShellPanel: (previewWindow: Window & typeof globalThis) => void;
}

export type PreviewGridEditorRuntimeWindow = Window & typeof globalThis & {
  __DG_getPreviewBridgeHostContract: () => PreviewGridEditorBridgeHostContract;
  __DG_getPreviewBridgeRenderContract: () => PreviewGridEditorBridgeRenderContract;
  __DG_getPreviewBridgeRelayoutContract: () => PreviewGridEditorBridgeRelayoutContract;
  __DG_getPreviewShellBootstrapContract: () => PreviewGridEditorShellBootstrapContract;
  __DG_getPreviewShellSceneContract: () => PreviewGridEditorShellSceneContract;
  __DG_getPreviewShellInspectorContract: () => PreviewGridEditorShellInspectorContract;
  __DG_getPreviewShellInteractionContract: () => PreviewGridEditorShellInteractionContract;
  __DG_rerenderPreviewEngineWorkspaceStage?: (() => Promise<void>) | null;
};

export interface PreviewGridEditorRuntimeSharedOptions {
  document: Document;
  previewWindow: PreviewGridEditorRuntimeWindow;
  slug: string;
  engine: string;
  gridEnabled: boolean;
  guideModes: string[];
  baselineStep: number;
  model: PreviewGridEditorRuntimeModel;
  interactionManager: PreviewGridEditorRuntimeInteractionManager;
  selectedIds: Set<string>;
  selectionDepthState: PreviewGridEditorRuntimeNumericState;
  coercedKeys: Set<string>;
  editorState: PreviewGridEditorRuntimeEditorState;
  previewSaveClient: PreviewGridEditorRuntimePreviewSaveClient;
  generationState: PreviewGridEditorRuntimeNumericState;
  allowInternalDirtyNavigationState: PreviewGridEditorRuntimeBooleanState;
  constraints: PreviewGridEditorRuntimeConstraints;
  lastViolationsState: PreviewGridEditorRuntimeValueState;
}

export interface PreviewGridEditorRuntimeBrowserOptions {
  getOverrides: () => Record<string, Record<string, unknown>>;
  replaceOverrides: (nextOverrides: Record<string, unknown>) => void;
  syncArrowsInModel?: ((...args: any[]) => void) | null;
  arrowComponentId?: ((...args: any[]) => string | null | undefined) | null;
  pruneLinkedRootGridOverrides: () => void;
  clearPendingRestoreRuntime: () => void;
  applyLocalRestoreRefresh: (syncGridControls?: boolean) => void;
  buildTreeUi: () => unknown;
  bindInteraction: () => unknown;
  deselectAll: () => void;
  reapplySelection: () => void;
  renderEmptyInspector: () => void;
  renderSelectionInspector: (preferredCid?: string | null) => void;
  renderMultiSelectionInspector: () => void;
  selectComponent: (cid: string, additive?: boolean) => void;
  applySelectionStateSnapshot: (nextState: unknown, preferredCid?: string | null) => void;
  getPrimarySelectedId: (preferredCid?: string | null) => string | null | undefined;
  deleteSelectedFrames: () => Promise<unknown> | unknown;
  getOwnDelta: (cid: string) => Record<string, unknown>;
  getEffectiveDelta: (cid: string) => Record<string, unknown>;
  getAncestors: (cid: string) => string[];
  getParentNode: (cid: string) => Record<string, any> | null;
  getComponentNode: (cid: string) => Record<string, unknown> | null;
  getComponentType: (cid: string) => string | null | undefined;
  getArrowNode: (cid: string) => Record<string, unknown> | null;
  getViolationsForComponent: (cid: string) => unknown;
  readRenderedStyleFields: (
    cid: string,
  ) => { fill?: string | null; stroke?: string | null } | null;
  renderGuideLines: (lines: unknown) => void;
  clearGuideLines: () => void;
  clearHandlesByClass: (className: string) => void;
  renderResizeHandles: CreatePreviewEditorInteractionFacadeFromBrowserHostOptions['browser']['renderResizeHandles'];
  collectPeerSnapTargets: (...args: any[]) => unknown;
  collectGridSnapTargets: (gridInfo: unknown) => { xs?: number[]; ys?: number[] };
  snapRectToTargets: (...args: any[]) => unknown;
  fitRenderedSvgToContent?: ((svg: SVGSVGElement, options?: unknown) => void) | null;
  escapeHtml?: ((value: string) => string) | null;
  initNavTabs: () => void;
  setDirty: (dirty: boolean) => void;
  setStatus?: ((message: string, kind?: string) => void) | null;
  sanitizeSvgCloneForExport: (...args: any[]) => unknown;
  applyInteractionOverrideEntries: (entries: unknown) => void;
  setOverride: (cid: string, patch: Record<string, unknown>) => void;
  cleanOverride: (cid: string) => void;
  setWaypointOverride: (cid: string) => void;
  setFrameProp: (cid: string, prop: string, value: unknown) => void;
  scheduleTextRelayout: (cid: string) => void;
  scheduleLayoutResizeRelayout: (
    cid: string,
    newW: number,
    newH: number,
    resizedW: boolean,
    resizedH: boolean,
  ) => boolean;
  scheduleV3ResizeRelayout: (
    cid: string,
    newW: number,
    newH: number,
    resizedW: boolean,
    resizedH: boolean,
  ) => boolean;
  cancelLiveRelayout: () => void;
  persistResize: (
    resizeIds: string[],
    propagatedIds: string[],
    triggerCid: string,
    baseSizes?: Record<string, { width: number; height: number }> | null,
  ) => void;
  save: () => void;
  undo: () => void;
  redo: () => void;
  onResizeUp: () => void;
  cycleGuideMode: () => void;
  requestLayoutRelayout: (triggerCid: string) => Promise<unknown> | unknown;
  interactionMode: Record<string, unknown>;
  boxStyles: Record<string, unknown>;
  inset: number;
  iconSize: number;
  handleSize: number;
  textEditingMode: unknown;
  columnGap: number;
  hasLayoutChildren: (cid: string) => boolean;
  minNodeSize: number;
  fallbackGap: number;
  multiActionGapState: PreviewGridEditorRuntimeNumericState;
  getInspector: () => unknown;
  getTextAdapter?: (() => unknown) | null;
  renderBoxStyleOptions: (selectedValue: unknown, options?: unknown) => string;
  formatAsDefinedStyleLabel: (styleName?: string | null, mixed?: boolean) => string;
  syncPanelVisibility?: CreatePreviewEditorInteractionFacadeFromBrowserHostOptions['browser']['syncPanelVisibility'];
  shouldShowAutolayoutInspector?: CreatePreviewEditorInteractionFacadeFromBrowserHostOptions['browser']['shouldShowAutolayoutInspector'];
  snapToGrid: (value: number) => number;
  scheduleRelayout: (cid: string) => void;
  requestRelayoutNow: (cid: string) => void;
  updateOverrideSummary: () => void;
  refreshTreeColors: () => void;
  runConstraints: () => unknown;
  alert: (message: string) => void;
  normalizeStyleName: (styleName: string) => string;
  waypointDraggingMode: unknown;
  writeClipboardText: (text: string) => Promise<unknown> | unknown;
  requestAnimationFrameFn: (callback: () => void) => number;
  cancelAnimationFrameFn: (id: number) => void;
  theme: {
    headLen: number;
    headHalf: number;
    color: string;
  };
}

export interface CreatePreviewGridEditorRuntimeFromBrowserHostOptions {
  shared: PreviewGridEditorRuntimeSharedOptions;
  browser: PreviewGridEditorRuntimeBrowserOptions;
}

export interface PreviewGridEditorRuntime {
  getSceneFacade: () => PreviewEditorSceneFacade;
  getBootstrapFacade: () => PreviewEditorBootstrapFacade;
  getRelayoutFacade: () => PreviewEditorRelayoutFacade;
  getInteractionFacade: () => PreviewEditorInteractionFacade;
  invalidateOverrideBoundFacades: () => void;
}

export function createPreviewGridEditorRuntimeFromBrowserHost(
  options: CreatePreviewGridEditorRuntimeFromBrowserHostOptions,
): PreviewGridEditorRuntime {
  let sceneFacade: PreviewEditorSceneFacade | null = null;
  let bootstrapFacade: PreviewEditorBootstrapFacade | null = null;
  let relayoutFacade: PreviewEditorRelayoutFacade | null = null;
  let interactionFacade: PreviewEditorInteractionFacade | null = null;

  const getPreviewBridgeHostContract = (): PreviewGridEditorBridgeHostContract => (
    options.shared.previewWindow.__DG_getPreviewBridgeHostContract()
  );
  const getPreviewBridgeRenderContract = (): PreviewGridEditorBridgeRenderContract => (
    options.shared.previewWindow.__DG_getPreviewBridgeRenderContract()
  );
  const getPreviewBridgeRelayoutContract = (): PreviewGridEditorBridgeRelayoutContract => (
    options.shared.previewWindow.__DG_getPreviewBridgeRelayoutContract()
  );
  const getPreviewShellBootstrapContract = (): PreviewGridEditorShellBootstrapContract => (
    options.shared.previewWindow.__DG_getPreviewShellBootstrapContract()
  );
  const getPreviewShellSceneContract = (): PreviewGridEditorShellSceneContract => (
    options.shared.previewWindow.__DG_getPreviewShellSceneContract()
  );
  const getPreviewShellInspectorContract = (): PreviewGridEditorShellInspectorContract => (
    options.shared.previewWindow.__DG_getPreviewShellInspectorContract()
  );
  const getPreviewShellInteractionContract = (): PreviewGridEditorShellInteractionContract => (
    options.shared.previewWindow.__DG_getPreviewShellInteractionContract()
  );
  const readPreviewDocumentJson = (): unknown => (
    getPreviewBridgeHostContract().getPreviewDocumentJson?.() ?? null
  );
  const readFrameTreeJson = (): unknown => (
    getPreviewBridgeHostContract().getFrameTreeJson?.() ?? null
  );
  const readLocalRelayoutStatus = (): unknown => (
    getPreviewBridgeHostContract().getLocalRelayoutStatus?.() ?? null
  );

  const runtime: PreviewGridEditorRuntime = {
    getSceneFacade() {
      if (sceneFacade) {
        return sceneFacade;
      }

      const previewShellScene = getPreviewShellSceneContract();
      sceneFacade = createPreviewEditorSceneFacadeFromRuntime({
        shared: {
          document: options.shared.document,
          guideModes: options.shared.guideModes,
          baselineStep: options.shared.baselineStep,
          slug: options.shared.slug,
          model: options.shared.model as never,
          selectedIds: options.shared.selectedIds,
          editorState: options.shared.editorState as never,
          getOverrides: options.browser.getOverrides,
        },
        contracts: {
          previewShellScene,
          previewBridgeRender: getPreviewBridgeRenderContract() as never,
        },
        gridRuntime: {
          pruneLinkedRootOverrides: options.browser.pruneLinkedRootGridOverrides,
          setDirty: () => {
            options.browser.setDirty(true);
          },
          requestRelayout: (triggerCid) => {
            void options.browser.requestLayoutRelayout(triggerCid);
          },
          scheduleRelayout: (callback, delayMs) => (
            options.shared.previewWindow.setTimeout(callback, delayMs)
          ),
          clearRelayoutTimer: (timerId) => {
            options.shared.previewWindow.clearTimeout(timerId as any);
          },
          setTimeoutFn: (callback, delayMs) => (
            options.shared.previewWindow.setTimeout(callback, delayMs)
          ),
        },
        sceneRefresh: {
          buildTreeUi: options.browser.buildTreeUi,
          bindInteraction: options.browser.bindInteraction,
          reapplySelection: options.browser.reapplySelection,
          renderSelectionInspector: options.browser.renderSelectionInspector,
        },
        waypointOverrides: {
          getOverrides: options.browser.getOverrides as never,
          getArrowNode: options.browser.getArrowNode as never,
          rebuildArrowSvg: (cid) => {
            const arrowRuntime = runtime.getInteractionFacade().getArrowWaypointRuntime();
            arrowRuntime.rebuildArrowSvg(cid);
          },
        },
        overrideApplication: {
          getComponentTree: () => options.shared.model._roots.map((node) => node.data) as never,
          getRootNodes: () => options.shared.model._roots
            .filter((node) => node.type !== 'arrow')
            .map((node) => ({ id: String(node.id ?? ''), gridRow: node.gridRow })) as never,
          getRelayoutStatus: () => runtime.getRelayoutFacade().getLayoutRelayoutStatus() as never,
          boxStyles: options.browser.boxStyles as never,
          inset: options.browser.inset,
          iconSize: options.browser.iconSize,
          gridStep: options.shared.baselineStep,
          hasDiagramGrid: () => Boolean(options.shared.model.diagramGrid),
          getNode: (cid) => options.shared.model.get(cid),
          getOwnDelta: options.browser.getOwnDelta as never,
          getEffectiveDelta: options.browser.getEffectiveDelta as never,
          isFrameManagedTarget: (target, nextRelayoutStatus) => (
            getPreviewBridgeRelayoutContract().isPreviewFrameManagedTarget({
              target,
              relayoutStatus:
                nextRelayoutStatus || runtime.getRelayoutFacade().getLayoutRelayoutStatus(),
              getNode: (cid) => options.shared.model.get(cid),
            })
          ),
          showResizeHandles: (cid) => runtime.getInteractionFacade().showResizeHandles(cid),
        },
        rerenderStageFromModel: {},
        frameDelete: {
          selectedIds: options.shared.selectedIds,
          isTextEditing: () => (
            options.shared.interactionManager.isMode(options.browser.textEditingMode)
          ),
          getFrameTreeJson: readFrameTreeJson as never,
          getRootNodes: () => options.shared.model.roots,
          fallbackRootId: 'page',
          getNode: (id) => options.shared.model.get(id),
          beginUndoableAction: (label) => options.shared.editorState.beginUndoableAction(label),
          markRemoved: (id) => {
            options.shared.model.removedIds.add(id);
          },
          clearOverride: (id) => options.shared.model.clearOverride(id),
          unselect: (id) => {
            options.shared.selectedIds.delete(id);
          },
          setDirty: options.browser.setDirty,
          deselectAll: options.browser.deselectAll,
          commitUndoableAction: (action) => options.shared.editorState.commitUndoableAction(action),
          alert: options.browser.alert,
        },
        artboard: {
          getRoots: () => options.shared.model.roots as never,
          padding: 24,
        },
        overrideSummary: {
          getOverrideCount: () => Object.keys(options.browser.getOverrides()).length,
          documentActions: () => ({
            gridOverrides: options.shared.model.gridOverrides ?? null,
            layoutOverrides: options.shared.model.layoutOverrides ?? null,
            removedIds: options.shared.model.removedIds,
          }),
        },
        treeOverrideState: {},
        constraints: {
          validateConstraints: (nextModel, svg) => options.shared.constraints.validate(nextModel, svg),
          summarizeViolations: (violations) => options.shared.constraints.summarise(violations),
          setLastViolations: (violations) => {
            options.shared.lastViolationsState.set(violations);
          },
          syncSaveButton: (errorCount) => options.shared.previewSaveClient.syncSaveButton(errorCount),
        },
      });

      return sceneFacade;
    },

    getBootstrapFacade() {
      if (bootstrapFacade) {
        return bootstrapFacade;
      }

      const previewShellBootstrap = getPreviewShellBootstrapContract();
      bootstrapFacade = createPreviewEditorBootstrapFacadeFromRuntime({
        shared: {
          document: options.shared.document,
          previewWindow: options.shared.previewWindow,
          slug: options.shared.slug,
          stage: options.shared.document.getElementById('stage') as never,
          engine: options.shared.engine,
          gridEnabled: options.shared.gridEnabled,
          model: options.shared.model as never,
          selectedIds: options.shared.selectedIds,
          getOverrides: options.browser.getOverrides,
          getFrameTree: readFrameTreeJson,
          previewSaveClient: options.shared.previewSaveClient as never,
          editorState: options.shared.editorState as never,
        },
        contracts: {
          previewBridgeHost: getPreviewBridgeHostContract() as never,
          previewBridgeRender: getPreviewBridgeRenderContract() as never,
        },
        componentTree: {
          readPreviewDocument: readPreviewDocumentJson as never,
          fetchTree: () => fetch(`/api/tree/${options.shared.slug}?t=${Date.now()}`, {
            cache: 'no-store',
          }),
          readFrameTreeJson: readFrameTreeJson as never,
          syncArrowsInModel: options.browser.syncArrowsInModel ?? null,
          arrowComponentId: options.browser.arrowComponentId ?? null,
        },
        svgLoad: {
          deselectAll: options.browser.deselectAll,
          isEngineLayoutActive: () => (
            previewShellBootstrap.isPreviewEngineShellLayoutActive(
              options.shared.previewWindow,
              readFrameTreeJson(),
            )
          ),
          resetOverrideState: () => {
            options.browser.replaceOverrides({});
            options.shared.model.gridOverrides = {};
            const tree = readFrameTreeJson() as {
              layoutEngine?: string | null;
              elkLayout?: Record<string, unknown>;
              engineLayout?: Record<string, Record<string, unknown>>;
            } | null;
            const engineLayoutState = readFrameYamlEngineLayoutOverridesForLayoutEngine(tree);
            const nextLayoutOverrides = engineLayoutState?.overrides
              ? { ...engineLayoutState.overrides }
              : {};
            const manifest = resolvePreviewEngine({
              layoutEngine: tree?.layoutEngine ?? null,
              shellMode: 'grid',
            });
            if (manifest) {
              activateLayoutOperatorOverrideBucket(options.shared.model, manifest, {
                fallbackOverrides: nextLayoutOverrides,
                persistNamespace: engineLayoutState?.namespace ?? null,
              });
            } else {
              options.shared.model.layoutOverrides = nextLayoutOverrides;
              options.shared.model.layoutOverrideNamespace = engineLayoutState?.namespace ?? null;
              options.shared.model.layoutOperatorOverrides = null;
            }
            options.shared.model.removedIds = new Set<string>();
            options.browser.updateOverrideSummary();
            options.shared.editorState.clearUndoHistory();
            options.shared.previewSaveClient.markSaved(
              options.shared.editorState.serializeDirtyState(),
            );
          },
          initEnginePanel: () => {
            previewShellBootstrap.initPreviewEngineShellPanel(options.shared.previewWindow);
          },
          getLocalRelayoutStatus: readLocalRelayoutStatus as never,
          escapeHtml: options.browser.escapeHtml ?? ((value: string) => value),
          loadGridInfo: async (canonicalState) => {
            await runtime.getSceneFacade().loadGridInfo(canonicalState);
          },
          gridState: {
            getGridInfo: () => runtime.getSceneFacade().getGridRuntime().getGridInfo(),
            setDiagramGrid: (nextGridInfo) => options.shared.model.setDiagramGrid(nextGridInfo),
            getGridOverrides: () => options.shared.model.gridOverrides,
            pruneLinkedRootGridOverrides: options.browser.pruneLinkedRootGridOverrides,
          },
          populateGridControls: () => runtime.getSceneFacade().populateGridControls(),
          applyWaypointOverrides: () => runtime.getSceneFacade().applyWaypointOverrides(),
          applyAllOverrides: () => runtime.getSceneFacade().applyAllOverrides(),
          bindInteraction: options.browser.bindInteraction,
          renderGridOverlay: () => runtime.getSceneFacade().renderGridOverlay(),
          selectionState: {
            selectedIds: options.shared.selectedIds,
            reapplySelection: options.browser.reapplySelection,
          },
          runConstraints: () => options.browser.runConstraints(),
          fitRenderedSvgToContent: options.browser.fitRenderedSvgToContent ?? null,
        },
        navigation: {
          isDirty: () => options.shared.previewSaveClient.isDirty(),
          setAllowInternalDirtyNavigation: (allowed) => {
            options.shared.allowInternalDirtyNavigationState.set(allowed);
          },
          dirtyConfirmMessage: 'You have unsaved changes. Leave this diagram without saving?',
        },
        runtimeBootstrap: {
          reapplySelection: options.browser.reapplySelection,
          onDocumentKeyDown: (event) => runtime.getInteractionFacade().onDocumentKeyDown(event as never),
          applyUndoCommand: (command, direction) => (
            runtime.getRelayoutFacade().applyUndoCommand(command as never, direction as never)
          ),
          initNavTabs: options.browser.initNavTabs,
          requestLayoutRelayout: (triggerCid) => options.browser.requestLayoutRelayout(triggerCid),
          getLayoutRelayoutStatus: () => runtime.getRelayoutFacade().getLayoutRelayoutStatus(),
          getLayoutRelayoutRuntime: () => runtime.getRelayoutFacade().layoutRuntimeState,
          constraints: options.shared.constraints as never,
          lastViolations: options.shared.lastViolationsState.get(),
          runConstraints: () => options.browser.runConstraints(),
          clearCoercedKeys: () => options.shared.coercedKeys.clear(),
          setStatus: options.browser.setStatus ?? (() => {}),
          sanitizeSvgCloneForExport: options.browser.sanitizeSvgCloneForExport as never,
          allowInternalDirtyNavigationState: options.shared.allowInternalDirtyNavigationState,
          writeClipboardText: async (text) => {
            await options.browser.writeClipboardText(text);
          },
          alert: options.browser.alert,
          confirmClearAll: (message) => options.shared.previewWindow.confirm(message),
          onClearAllOverrides: () => {
            options.shared.editorState.runUndoableAction('Clear all overrides', () => {
              options.browser.replaceOverrides({});
              options.shared.model.gridOverrides = {};
              options.shared.model.layoutOverrides = {};
              writeLayoutOperatorOverrideState(options.shared.model, {
                activeOperatorKey: options.shared.model.layoutOperatorOverrides?.activeOperatorKey ?? null,
                byOperator: {},
              }, null);
              options.shared.model.removedIds = new Set<string>();
              options.shared.coercedKeys.clear();
              options.browser.setDirty(true);
            });
            return runtime.getSceneFacade().rerenderStageFromModel().then(() => undefined);
          },
          generationState: options.shared.generationState,
          scheduleReconnect: (callback, delayMs) => (
            options.shared.previewWindow.setTimeout(callback, delayMs)
          ),
        },
      });

      return bootstrapFacade;
    },

    getRelayoutFacade() {
      if (relayoutFacade) {
        return relayoutFacade;
      }

      relayoutFacade = createPreviewEditorRelayoutFacadeFromRuntime({
        shared: {
          getOverrides: options.browser.getOverrides,
          coercedKeys: options.shared.coercedKeys,
          model: options.shared.model as never,
          editorState: options.shared.editorState as never,
          previewBridgeHost: getPreviewBridgeHostContract() as never,
          selectedIds: options.shared.selectedIds,
        },
        runtime: {
          getLocalRelayoutStatus: readLocalRelayoutStatus as never,
          isEngineLayoutActive: () => (
            getPreviewShellBootstrapContract().isPreviewEngineShellLayoutActive(
              options.shared.previewWindow,
            )
          ),
          hasRelayoutFrameOverride: (entry) => {
            const relayout = getPreviewBridgeRelayoutContract();
            const hasRelayoutFrameOverride =
              relayout.hasPreviewRelayoutFrameOverride
              ?? relayout.hasV3FrameOverride
              ?? null;
            return typeof hasRelayoutFrameOverride === 'function'
              && hasRelayoutFrameOverride(entry);
          },
          replaceOverrides: options.browser.replaceOverrides,
          pruneLinkedRootOverrides: options.browser.pruneLinkedRootGridOverrides,
          clearPendingRuntime: options.browser.clearPendingRestoreRuntime,
          rerenderStageFromModel: async () => {
            await runtime.getSceneFacade().rerenderStageFromModel();
          },
          applyLocalRefresh: ({ syncGridControls }) => {
            options.browser.applyLocalRestoreRefresh(syncGridControls);
          },
          syncGridControls: () => {
            if (runtime.getSceneFacade().getGridRuntime().getGridInfo()) {
              runtime.getSceneFacade().populateGridControls();
            }
          },
          syncDirtyFromSerialized: (currentStateStr) => (
            options.shared.previewSaveClient.syncDirtyFromSerialized(currentStateStr)
          ),
          buildTreeUi: options.browser.buildTreeUi,
          applyWaypointOverrides: () => runtime.getSceneFacade().applyWaypointOverrides(),
          bindInteraction: options.browser.bindInteraction,
          applyAllOverrides: () => runtime.getSceneFacade().applyAllOverrides(),
          reapplySelection: options.browser.reapplySelection,
          refreshGridInfo: () => runtime.getSceneFacade().refreshGridInfoFromLayout(),
          renderGridOverlay: () => runtime.getSceneFacade().renderGridOverlay(),
          renderSelectionInspector: options.browser.renderSelectionInspector,
          updateOverrideSummary: () => runtime.getSceneFacade().updateOverrideSummary(),
          refreshTreeColors: () => runtime.getSceneFacade().refreshTreeColors(),
          runConstraints: () => runtime.getSceneFacade().runConstraints(),
          setStatus: options.browser.setStatus ?? null,
          logError: (message) => console.error(message),
          setDirty: () => {
            options.browser.setDirty(true);
          },
          updateInspector: (cid) => {
            runtime.getInteractionFacade().getInspectorDisplayRuntime().updateInspector(cid);
          },
          reloadTreeAfterArrowRestore: () => runtime.getBootstrapFacade().loadTree(),
          rebuildArrowSvg: (cid) => runtime.getInteractionFacade().getArrowWaypointRuntime().rebuildArrowSvg(cid),
          getOwnDelta: options.browser.getOwnDelta,
          setOverride: options.browser.setOverride,
          requestAnimationFrameFn: options.browser.requestAnimationFrameFn,
          cancelAnimationFrameFn: options.browser.cancelAnimationFrameFn,
          minSize: 8,
        },
      });

      return relayoutFacade;
    },

    getInteractionFacade() {
      if (interactionFacade) {
        return interactionFacade;
      }

      const previewShellScene = getPreviewShellSceneContract();
      const previewShellInspector = getPreviewShellInspectorContract();
      const previewShellInteraction = getPreviewShellInteractionContract() as any;
      interactionFacade = createPreviewEditorInteractionFacadeFromBrowserHost({
        shared: {
          document: options.shared.document,
          model: options.shared.model as never,
          interactionManager: options.shared.interactionManager as never,
          selectedIds: options.shared.selectedIds,
          selectionDepthState: options.shared.selectionDepthState,
        },
        contracts: {
          previewShellInspector: previewShellInspector,
          previewShellInteraction: previewShellInteraction,
          previewShellScene: previewShellScene as never,
          previewBridgeRender: getPreviewBridgeRenderContract() as never,
        },
        browser: {
          getOverrides: options.browser.getOverrides,
          selectComponent: options.browser.selectComponent as never,
          deleteSelectedFrames: options.browser.deleteSelectedFrames,
          interactionMode: options.browser.interactionMode as never,
          getAncestors: options.browser.getAncestors,
          applySelectionState: options.browser.applySelectionStateSnapshot as never,
          deselectAll: options.browser.deselectAll,
          getOwnDelta: options.browser.getOwnDelta,
          collectSnapTargets: (dragCid) => (
            previewShellInteraction.collectPreviewSnapTargets({
              dragId: dragCid,
              gridInfo: runtime.getSceneFacade().getGridRuntime().getGridInfo(),
              getNode: (id: string) => options.shared.model.get(id),
              getRootNodes: () => options.shared.model.roots,
              getOwnDelta: (id: string) => options.browser.getOwnDelta(id),
              getEffectiveDelta: (id: string) => options.browser.getEffectiveDelta(id),
              collectPeerSnapTargets: options.browser.collectPeerSnapTargets,
              collectGridSnapTargets: options.browser.collectGridSnapTargets,
            })
          ) as never,
          isAutolayoutChild: (cid) => (
            previewShellInteraction.isAutolayoutParentLayout(
              options.browser.getParentNode(cid)?.layout ?? null,
            )
          ),
          captureOverrideEntries: (ids) => options.shared.editorState.captureOverrideEntries(ids),
          baselineStep: options.shared.baselineStep,
          resolveSnap: (cid, proposedDx, proposedDy, targets) => {
            const snap = previewShellInteraction.resolvePreviewDragSnap({
              cid,
              proposedDx,
              proposedDy,
              targets,
              getNode: (id: string) => options.shared.model.get(id),
              getOwnDelta: (id: string) => options.browser.getOwnDelta(id),
              snapRectToTargets: options.browser.snapRectToTargets,
              snapStep: options.shared.baselineStep,
            });
            return { dx: snap.dx, dy: snap.dy, lines: snap.lines };
          },
          renderGuideLines: options.browser.renderGuideLines as never,
          setOverride: options.browser.setOverride,
          setFrameProp: options.browser.setFrameProp,
          applyAllOverrides: () => runtime.getSceneFacade().applyAllOverrides(),
          updateInspector: (cid) => {
            runtime.getInteractionFacade().getInspectorDisplayRuntime().updateInspector(cid);
          },
          shouldUpdateInspector: () => (
            options.shared.selectedIds.has(
              String(options.shared.interactionManager.state?.cid ?? ''),
            ) && options.shared.selectedIds.size === 1
          ),
          getParentNode: options.browser.getParentNode as never,
          getComponentNode: options.browser.getComponentNode as never,
          getEffectiveDelta: options.browser.getEffectiveDelta,
          inset: options.browser.inset,
          getComponentType: options.browser.getComponentType as never,
          clearHandlesByClass: options.browser.clearHandlesByClass,
          renderResizeHandles: options.browser.renderResizeHandles,
          handleSize: options.browser.handleSize,
          textEditingMode: options.browser.textEditingMode,
          iconSize: options.browser.iconSize,
          columnGap: options.browser.columnGap,
          setTextOverride: (cid, nextTextOverride) => {
            options.browser.setOverride(cid, { text: nextTextOverride });
          },
          commitOverridePatchAction: (label, beforeEntries, afterEntries) => {
            options.shared.editorState.commitOverridePatchAction(label, beforeEntries, afterEntries);
          },
          reapplySelection: options.browser.reapplySelection,
          scheduleTextRelayout: options.browser.scheduleTextRelayout,
          hasLayoutChildren: options.browser.hasLayoutChildren as never,
          minNodeSize: options.browser.minNodeSize,
          gridTargets: () => (
            options.browser.collectGridSnapTargets(
              runtime.getSceneFacade().getGridRuntime().getGridInfo(),
            )
          ),
          clearGuideLines: options.browser.clearGuideLines,
          applyInteractionOverrideEntries: options.browser.applyInteractionOverrideEntries as never,
          renderEmptyInspector: options.browser.renderEmptyInspector,
          renderSelectionInspector: options.browser.renderSelectionInspector as never,
          renderMultiSelectionInspector: options.browser.renderMultiSelectionInspector,
          scheduleLayoutResizeRelayout: options.browser.scheduleLayoutResizeRelayout,
          scheduleV3ResizeRelayout: options.browser.scheduleV3ResizeRelayout,
          cancelLiveRelayout: options.browser.cancelLiveRelayout,
          cleanOverride: options.browser.cleanOverride,
          persistResize: options.browser.persistResize,
          autoFitArtboard: () => runtime.getSceneFacade().autoFitArtboard(),
          save: options.browser.save,
          undo: options.browser.undo,
          redo: options.browser.redo,
          deleteSelection: () => {
            void options.browser.deleteSelectedFrames();
          },
          onResizeUp: options.browser.onResizeUp,
          cycleGuideMode: options.browser.cycleGuideMode,
          getPrimarySelectedId: options.browser.getPrimarySelectedId,
          getPreviewGridInfo: () => (
            runtime.getSceneFacade().getGridRuntime().getGridInfo() as never
          ),
          coercedKeys: options.shared.coercedKeys,
          fallbackGap: options.browser.fallbackGap,
          multiActionGapState: options.browser.multiActionGapState,
          getInspector: options.browser.getInspector as never,
          getArrowNode: options.browser.getArrowNode as never,
          getViolations: options.browser.getViolationsForComponent as never,
          readRenderedStyleFields: options.browser.readRenderedStyleFields as never,
          getTextAdapter: options.browser.getTextAdapter
            ? (() => options.browser.getTextAdapter?.() as never)
            : null,
          escapeHtml: options.browser.escapeHtml ?? null,
          renderBoxStyleOptions: options.browser.renderBoxStyleOptions,
          formatAsDefinedStyleLabel: options.browser.formatAsDefinedStyleLabel,
          syncPanelVisibility: options.browser.syncPanelVisibility ?? null,
          shouldShowAutolayoutInspector: options.browser.shouldShowAutolayoutInspector ?? null,
          snapToGrid: options.browser.snapToGrid,
          setDirty: options.browser.setDirty,
          scheduleRelayout: options.browser.scheduleRelayout,
          requestRelayoutNow: options.browser.requestRelayoutNow,
          updateOverrideSummary: options.browser.updateOverrideSummary,
          refreshTreeColors: options.browser.refreshTreeColors,
          runConstraints: options.browser.runConstraints,
          alert: options.browser.alert,
          normalizeStyleName: options.browser.normalizeStyleName,
          waypointDraggingMode: options.browser.waypointDraggingMode,
          persistWaypointOverride: options.browser.setWaypointOverride,
          theme: options.browser.theme,
        },
      });

      return interactionFacade;
    },

    invalidateOverrideBoundFacades() {
      bootstrapFacade = null;
      interactionFacade = null;
      relayoutFacade = null;
    },
  };

  return runtime;
}
