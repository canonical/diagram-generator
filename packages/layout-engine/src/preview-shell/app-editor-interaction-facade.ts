import {
  createPreviewEditorRuntimeSetFromEditorHost,
  type CreatePreviewEditorRuntimeSetFromEditorHostOptions,
  type PreviewEditorRuntimeSet,
} from './app-editor-runtime-set.js';
import {
  createPreviewKeyboardRuntimeFromHost,
  type CreatePreviewKeyboardRuntimeFromHostOptions,
  type PreviewKeyboardRuntime,
} from './app-keyboard-runtime.js';
import {
  createPreviewPointerInteractionRuntimeFromHost,
  type CreatePreviewPointerInteractionRuntimeFromHostOptions,
  type PreviewPointerInteractionRuntime,
} from './app-pointer-interaction-runtime.js';
import {
  createPreviewResizeInteractionRuntimeFromHost,
  type CreatePreviewResizeInteractionRuntimeFromHostOptions,
  type PreviewResizeInteractionRuntime,
} from './app-resize-interaction-runtime.js';
import {
  createPreviewSelectionChromeRuntimeFromHost,
  type CreatePreviewSelectionChromeRuntimeFromHostOptions,
  type PreviewSelectionChromeRuntime,
} from './app-selection-chrome-runtime.js';
import {
  createPreviewStageBindingRuntimeFromHost,
  type CreatePreviewStageBindingRuntimeFromHostOptions,
  type PreviewStageBindingRuntime,
} from './app-stage-binding-runtime.js';
import {
  createPreviewTextEditRuntimeFromHost,
  type CreatePreviewTextEditRuntimeFromHostOptions,
  type PreviewTextEditRuntime,
} from './app-text-edit-runtime.js';

type PointerInteractionHostOptions = Omit<
  CreatePreviewPointerInteractionRuntimeFromHostOptions,
  'startTextEdit' | 'commitTextEdit' | 'startResize'
>;

type SelectionChromeHostOptions = Omit<
  CreatePreviewSelectionChromeRuntimeFromHostOptions,
  'showArrowWaypointHandles' | 'getArrowWaypointRuntime'
>;

type TextEditHostOptions = Omit<
  CreatePreviewTextEditRuntimeFromHostOptions,
  'removeResizeHandles'
>;

type KeyboardHostOptions = Omit<
  CreatePreviewKeyboardRuntimeFromHostOptions,
  'cancelTextEdit' | 'onDragMove' | 'onResizeMove' | 'showResizeHandles' | 'renderSelectionInspector'
>;

type EditorRuntimeSetHostOptions = Omit<
  CreatePreviewEditorRuntimeSetFromEditorHostOptions,
  'removeResizeHandles' | 'showResizeHandles'
>;

export interface CreatePreviewEditorInteractionFacadeFromEditorHostOptions {
  stageBinding: CreatePreviewStageBindingRuntimeFromHostOptions;
  pointerInteraction: PointerInteractionHostOptions;
  selectionChrome: SelectionChromeHostOptions;
  textEdit: TextEditHostOptions;
  resizeInteraction: CreatePreviewResizeInteractionRuntimeFromHostOptions;
  keyboard: KeyboardHostOptions;
  editorRuntimeSet: EditorRuntimeSetHostOptions;
}

type RuntimeStageBindingOptions = Omit<
  CreatePreviewEditorInteractionFacadeFromEditorHostOptions['stageBinding'],
  'document' | 'model' | 'selectedIds' | 'interactionManager' | 'selectionDepthState'
  | 'onMouseDown' | 'onDoubleClick'
>;

type RuntimePointerInteractionOptions = Omit<
  CreatePreviewEditorInteractionFacadeFromEditorHostOptions['pointerInteraction'],
  'document' | 'model' | 'interactionManager' | 'selectedIds' | 'selectionDepthState'
  | 'previewShellInspector' | 'previewShellInteraction'
>;

type RuntimeTextEditOptions = Omit<
  CreatePreviewEditorInteractionFacadeFromEditorHostOptions['textEdit'],
  'document' | 'model' | 'interactionManager'
>;

type RuntimeResizeInteractionOptions = Omit<
  CreatePreviewEditorInteractionFacadeFromEditorHostOptions['resizeInteraction'],
  'document' | 'model' | 'interactionManager' | 'selectedIds'
>;

type RuntimeKeyboardOptions = Omit<
  CreatePreviewEditorInteractionFacadeFromEditorHostOptions['keyboard'],
  'document' | 'selectedIds' | 'selectionDepthState' | 'interactionManager' | 'model'
>;

type RuntimeEditorRuntimeSetOptions = Omit<
  CreatePreviewEditorInteractionFacadeFromEditorHostOptions['editorRuntimeSet'],
  'document' | 'selectedIds' | 'selectionDepthState'
  | 'previewShellScene' | 'previewShellInteraction' | 'previewBridgeRender' | 'model'
>;

type PreviewEditorInteractionSharedModel =
  CreatePreviewEditorInteractionFacadeFromEditorHostOptions['stageBinding']['model']
  & CreatePreviewEditorInteractionFacadeFromEditorHostOptions['pointerInteraction']['model']
  & CreatePreviewEditorInteractionFacadeFromEditorHostOptions['textEdit']['model']
  & CreatePreviewEditorInteractionFacadeFromEditorHostOptions['resizeInteraction']['model']
  & CreatePreviewEditorInteractionFacadeFromEditorHostOptions['keyboard']['model']
  & CreatePreviewEditorInteractionFacadeFromEditorHostOptions['editorRuntimeSet']['model'];

type PreviewEditorInteractionManager =
  CreatePreviewEditorInteractionFacadeFromEditorHostOptions['stageBinding']['interactionManager']
  & CreatePreviewEditorInteractionFacadeFromEditorHostOptions['pointerInteraction']['interactionManager']
  & CreatePreviewEditorInteractionFacadeFromEditorHostOptions['textEdit']['interactionManager']
  & CreatePreviewEditorInteractionFacadeFromEditorHostOptions['resizeInteraction']['interactionManager']
  & CreatePreviewEditorInteractionFacadeFromEditorHostOptions['keyboard']['interactionManager']
  & CreatePreviewEditorInteractionFacadeFromEditorHostOptions['editorRuntimeSet']['interactionManager'];

export interface PreviewEditorInteractionSharedOptions {
  document: CreatePreviewEditorInteractionFacadeFromEditorHostOptions['stageBinding']['document'];
  model: PreviewEditorInteractionSharedModel;
  interactionManager: PreviewEditorInteractionManager;
  selectedIds: CreatePreviewEditorInteractionFacadeFromEditorHostOptions['stageBinding']['selectedIds'];
  selectionDepthState: {
    get: () => number;
    set: (depth: number) => void;
  };
}

type PreviewEditorInteractionBrowserHostCallback = (...args: any[]) => any;

export interface PreviewEditorInteractionContractOptions {
  previewShellInspector:
    CreatePreviewEditorInteractionFacadeFromEditorHostOptions['pointerInteraction']['previewShellInspector'];
  previewShellInteraction:
    CreatePreviewEditorInteractionFacadeFromEditorHostOptions['pointerInteraction']['previewShellInteraction']
    & CreatePreviewEditorInteractionFacadeFromEditorHostOptions['editorRuntimeSet']['previewShellInteraction']
    & {
      syncPreviewSvgHoverState: RuntimeStageBindingOptions['syncHoverState'];
      clearPreviewSvgHoverState: RuntimeStageBindingOptions['clearHoverState']
        & RuntimeResizeInteractionOptions['clearPreviewSvgHoverState'];
      resolvePreviewResizeHandlePlan:
        CreatePreviewEditorInteractionFacadeFromEditorHostOptions['selectionChrome']['resolveHandlePlan'];
      findPreviewArrowAtPoint: PreviewEditorInteractionBrowserHostCallback;
      findPreviewComponentAtDepth: PreviewEditorInteractionBrowserHostCallback;
      findDeepestPreviewComponent: PreviewEditorInteractionBrowserHostCallback;
      collectPreviewSelectionActionInfo: PreviewEditorInteractionBrowserHostCallback;
      renderPreviewReorderIndicator: PreviewEditorInteractionBrowserHostCallback;
      clearPreviewReorderIndicator: PreviewEditorInteractionBrowserHostCallback;
      applyReorderOrder: PreviewEditorInteractionBrowserHostCallback;
      completePreviewDragInteraction: PreviewEditorInteractionBrowserHostCallback;
      collectPreviewMultiResizeSelection: PreviewEditorInteractionBrowserHostCallback;
    };
  previewShellScene:
    CreatePreviewEditorInteractionFacadeFromEditorHostOptions['editorRuntimeSet']['previewShellScene'];
  previewBridgeRender:
    CreatePreviewEditorInteractionFacadeFromEditorHostOptions['editorRuntimeSet']['previewBridgeRender']
    & {
      readPreviewRenderedComponentBounds: PreviewEditorInteractionBrowserHostCallback;
    };
}

export interface CreatePreviewEditorInteractionFacadeFromRuntimeOptions {
  shared: PreviewEditorInteractionSharedOptions;
  contracts: PreviewEditorInteractionContractOptions;
  stageBinding: RuntimeStageBindingOptions;
  pointerInteraction: RuntimePointerInteractionOptions;
  selectionChrome: CreatePreviewEditorInteractionFacadeFromEditorHostOptions['selectionChrome'];
  textEdit: RuntimeTextEditOptions;
  resizeInteraction: RuntimeResizeInteractionOptions;
  keyboard: RuntimeKeyboardOptions;
  editorRuntimeSet: RuntimeEditorRuntimeSetOptions;
}

// Browser-host builders deliberately accept broad callback shapes at the
// compatibility edge so editor.js can stay small while concrete runtime owners
// continue to enforce the detailed contract shapes underneath.
export interface PreviewEditorInteractionBrowserHostOptions {
  getOverrides: RuntimeEditorRuntimeSetOptions['getOverrides'];
  selectComponent: PreviewEditorInteractionBrowserHostCallback;
  deleteSelectedFrames: () => unknown;
  getAncestors: (cid: string) => string[];
  applySelectionState: PreviewEditorInteractionBrowserHostCallback;
  deselectAll: () => void;
  getOwnDelta: PreviewEditorInteractionBrowserHostCallback;
  collectSnapTargets: PreviewEditorInteractionBrowserHostCallback;
  isAutolayoutChild: (cid: string) => boolean;
  captureOverrideEntries:
    RuntimePointerInteractionOptions['captureOverrideEntries']
    & RuntimeTextEditOptions['captureOverrideEntries']
    & RuntimeResizeInteractionOptions['captureOverrideEntries']
    & RuntimeKeyboardOptions['captureOverrideEntries']
    & RuntimeEditorRuntimeSetOptions['editorState']['captureOverrideEntries'];
  baselineStep: number;
  resolveSnap: PreviewEditorInteractionBrowserHostCallback;
  renderGuideLines: PreviewEditorInteractionBrowserHostCallback;
  setOverride: PreviewEditorInteractionBrowserHostCallback;
  setFrameProp: (cid: string, prop: string, value: unknown) => void;
  applyAllOverrides: () => void;
  updateInspector: PreviewEditorInteractionBrowserHostCallback;
  shouldUpdateInspector: () => boolean;
  getParentNode: PreviewEditorInteractionBrowserHostCallback;
  getComponentNode: PreviewEditorInteractionBrowserHostCallback;
  getEffectiveDelta: PreviewEditorInteractionBrowserHostCallback;
  inset: number;
  getComponentType: PreviewEditorInteractionBrowserHostCallback;
  clearHandlesByClass: (className: string) => void;
  renderResizeHandles: PreviewEditorInteractionBrowserHostCallback;
  handleSize: number;
  textEditingMode: unknown;
  iconSize: number;
  columnGap: number;
  setTextOverride: PreviewEditorInteractionBrowserHostCallback;
  commitOverridePatchAction:
    RuntimeTextEditOptions['commitOverridePatchAction']
    & RuntimeResizeInteractionOptions['commitOverridePatchAction']
    & RuntimeKeyboardOptions['commitOverridePatchAction']
    & RuntimeEditorRuntimeSetOptions['editorState']['commitOverridePatchAction'];
  reapplySelection: () => void;
  scheduleTextRelayout: (cid: string) => void;
  hasLayoutChildren: PreviewEditorInteractionBrowserHostCallback;
  minNodeSize: number;
  gridTargets: () => unknown;
  clearGuideLines: () => void;
  applyInteractionOverrideEntries: PreviewEditorInteractionBrowserHostCallback;
  renderEmptyInspector: () => void;
  renderSelectionInspector: PreviewEditorInteractionBrowserHostCallback;
  renderMultiSelectionInspector: () => void;
  scheduleLayoutResizeRelayout: PreviewEditorInteractionBrowserHostCallback;
  scheduleV3ResizeRelayout: PreviewEditorInteractionBrowserHostCallback;
  cancelLiveRelayout: () => void;
  cleanOverride: (cid: string) => void;
  persistResize: PreviewEditorInteractionBrowserHostCallback;
  autoFitArtboard: () => unknown;
  save: () => void;
  undo: () => void;
  redo: () => void;
  deleteSelection: () => void;
  onResizeUp: () => void;
  cycleGuideMode: () => void;
  interactionMode: RuntimePointerInteractionOptions['interactionMode']
    & RuntimeResizeInteractionOptions['interactionMode']
    & RuntimeKeyboardOptions['interactionModes'];
  getPrimarySelectedId: PreviewEditorInteractionBrowserHostCallback;
  getPreviewGridInfo: RuntimeEditorRuntimeSetOptions['previewGridRuntime']['getGridInfo'];
  fallbackGap: number;
  multiActionGapState: RuntimeEditorRuntimeSetOptions['multiActionGapState'];
  getInspector: PreviewEditorInteractionBrowserHostCallback;
  getArrowNode: PreviewEditorInteractionBrowserHostCallback;
  getViolations: PreviewEditorInteractionBrowserHostCallback;
  readRenderedStyleFields: PreviewEditorInteractionBrowserHostCallback;
  getTextAdapter?: RuntimeEditorRuntimeSetOptions['getTextAdapter'] | null;
  escapeHtml?: ((value: string) => string) | null;
  renderBoxStyleOptions: PreviewEditorInteractionBrowserHostCallback;
  formatAsDefinedStyleLabel: PreviewEditorInteractionBrowserHostCallback;
  syncPanelVisibility: RuntimeEditorRuntimeSetOptions['syncPanelVisibility'];
  shouldShowAutolayoutInspector?: RuntimeEditorRuntimeSetOptions['shouldShowAutolayoutInspector'];
  coercedKeys: RuntimeEditorRuntimeSetOptions['coercedKeys'];
  snapToGrid: PreviewEditorInteractionBrowserHostCallback;
  setDirty: (dirty: boolean) => void;
  scheduleRelayout: (cid: string) => void;
  requestRelayoutNow: PreviewEditorInteractionBrowserHostCallback;
  updateOverrideSummary: () => void;
  refreshTreeColors: () => void;
  runConstraints: () => void;
  alert: (message: string) => void;
  normalizeStyleName: (styleName: string) => string;
  waypointDraggingMode: unknown;
  persistWaypointOverride: (cid: string) => void;
  theme: RuntimeEditorRuntimeSetOptions['theme'];
}

export interface CreatePreviewEditorInteractionFacadeFromBrowserHostOptions {
  shared: PreviewEditorInteractionSharedOptions;
  contracts: PreviewEditorInteractionContractOptions;
  browser: PreviewEditorInteractionBrowserHostOptions;
}

export interface PreviewEditorInteractionFacade {
  getStageBindingRuntime: () => PreviewStageBindingRuntime;
  buildTreeUi: () => boolean;
  bindInteraction: () => SVGSVGElement | null;
  getPointerInteractionRuntime: () => PreviewPointerInteractionRuntime;
  onSvgDoubleClick: PreviewPointerInteractionRuntime['onSvgDoubleClick'];
  onSvgMouseDown: PreviewPointerInteractionRuntime['onSvgMouseDown'];
  onDragMove: PreviewPointerInteractionRuntime['onDragMove'];
  onDragUp: () => void;
  getSelectionChromeRuntime: () => PreviewSelectionChromeRuntime;
  showResizeHandles: (cid: string) => boolean;
  removeResizeHandles: () => void;
  getTextEditRuntime: () => PreviewTextEditRuntime;
  startTextEdit: PreviewTextEditRuntime['startTextEdit'];
  commitTextEdit: PreviewTextEditRuntime['commitTextEdit'];
  cancelTextEdit: PreviewTextEditRuntime['cancelTextEdit'];
  getResizeInteractionRuntime: () => PreviewResizeInteractionRuntime;
  startResize: PreviewResizeInteractionRuntime['startResize'];
  onResizeMove: PreviewResizeInteractionRuntime['onResizeMove'];
  onResizeUp: PreviewResizeInteractionRuntime['onResizeUp'];
  getKeyboardRuntime: () => PreviewKeyboardRuntime;
  onDocumentKeyDown: PreviewKeyboardRuntime['onDocumentKeyDown'];
  getEditorRuntimeSet: () => PreviewEditorRuntimeSet;
  getSelectionRuntime: () => PreviewEditorRuntimeSet['selection'];
  getInspectorDisplayRuntime: () => PreviewEditorRuntimeSet['inspectorDisplay'];
  getInspectorMutationRuntime: () => PreviewEditorRuntimeSet['inspectorMutation'];
  getInspectorSelectionRuntime: () => PreviewEditorRuntimeSet['inspectorSelection'];
  getArrowWaypointRuntime: () => PreviewEditorRuntimeSet['arrowWaypoint'];
}

export function createPreviewEditorInteractionFacadeFromEditorHost(
  options: CreatePreviewEditorInteractionFacadeFromEditorHostOptions,
): PreviewEditorInteractionFacade {
  let stageBindingRuntime: PreviewStageBindingRuntime | null = null;
  let pointerInteractionRuntime: PreviewPointerInteractionRuntime | null = null;
  let selectionChromeRuntime: PreviewSelectionChromeRuntime | null = null;
  let textEditRuntime: PreviewTextEditRuntime | null = null;
  let resizeInteractionRuntime: PreviewResizeInteractionRuntime | null = null;
  let keyboardRuntime: PreviewKeyboardRuntime | null = null;
  let editorRuntimeSet: PreviewEditorRuntimeSet | null = null;

  const runtime: PreviewEditorInteractionFacade = {
    getStageBindingRuntime() {
      if (stageBindingRuntime) {
        return stageBindingRuntime;
      }
      stageBindingRuntime = createPreviewStageBindingRuntimeFromHost(options.stageBinding);
      return stageBindingRuntime;
    },
    buildTreeUi() {
      return runtime.getStageBindingRuntime().buildTreeUi();
    },
    bindInteraction() {
      return runtime.getStageBindingRuntime().bindInteraction();
    },
    getPointerInteractionRuntime() {
      if (pointerInteractionRuntime) {
        return pointerInteractionRuntime;
      }
      pointerInteractionRuntime = createPreviewPointerInteractionRuntimeFromHost({
        ...options.pointerInteraction,
        startTextEdit: (cid, event, runtimeOptions) => runtime.startTextEdit(
          cid,
          event as unknown as Parameters<PreviewTextEditRuntime['startTextEdit']>[1],
          runtimeOptions,
        ),
        commitTextEdit: () => runtime.commitTextEdit(),
        startResize: (event) => runtime.startResize(event as unknown as MouseEvent),
      });
      return pointerInteractionRuntime;
    },
    onSvgDoubleClick(event) {
      runtime.getPointerInteractionRuntime().onSvgDoubleClick(event);
    },
    onSvgMouseDown(event) {
      runtime.getPointerInteractionRuntime().onSvgMouseDown(event);
    },
    onDragMove(event) {
      runtime.getPointerInteractionRuntime().onDragMove(event);
    },
    onDragUp() {
      options.pointerInteraction.onDragUp();
    },
    getSelectionChromeRuntime() {
      if (selectionChromeRuntime) {
        return selectionChromeRuntime;
      }
      selectionChromeRuntime = createPreviewSelectionChromeRuntimeFromHost({
        ...options.selectionChrome,
        showArrowWaypointHandles: (cid) => runtime.getArrowWaypointRuntime().showArrowWaypointHandles(cid),
        getArrowWaypointRuntime: () => runtime.getArrowWaypointRuntime(),
      });
      return selectionChromeRuntime;
    },
    showResizeHandles(cid) {
      return runtime.getSelectionChromeRuntime().showResizeHandles(cid);
    },
    removeResizeHandles() {
      runtime.getSelectionChromeRuntime().removeResizeHandles();
    },
    getTextEditRuntime() {
      if (textEditRuntime) {
        return textEditRuntime;
      }
      textEditRuntime = createPreviewTextEditRuntimeFromHost({
        ...options.textEdit,
        removeResizeHandles: () => runtime.removeResizeHandles(),
      });
      return textEditRuntime;
    },
    startTextEdit(...args) {
      runtime.getTextEditRuntime().startTextEdit(...args);
    },
    commitTextEdit() {
      runtime.getTextEditRuntime().commitTextEdit();
    },
    cancelTextEdit() {
      runtime.getTextEditRuntime().cancelTextEdit();
    },
    getResizeInteractionRuntime() {
      if (resizeInteractionRuntime) {
        return resizeInteractionRuntime;
      }
      resizeInteractionRuntime = createPreviewResizeInteractionRuntimeFromHost(
        options.resizeInteraction,
      );
      return resizeInteractionRuntime;
    },
    startResize(event) {
      runtime.getResizeInteractionRuntime().startResize(event);
    },
    onResizeMove(event) {
      runtime.getResizeInteractionRuntime().onResizeMove(event);
    },
    onResizeUp() {
      runtime.getResizeInteractionRuntime().onResizeUp();
    },
    getKeyboardRuntime() {
      if (keyboardRuntime) {
        return keyboardRuntime;
      }
      keyboardRuntime = createPreviewKeyboardRuntimeFromHost({
        ...options.keyboard,
        cancelTextEdit: () => runtime.cancelTextEdit(),
        onDragMove: (event) => runtime.onDragMove(event),
        onResizeMove: (event) => runtime.onResizeMove(event),
        showResizeHandles: (cid) => {
          void runtime.showResizeHandles(cid);
        },
        renderSelectionInspector: () => {
          options.resizeInteraction.renderSelectionInspector();
        },
      });
      return keyboardRuntime;
    },
    onDocumentKeyDown(event) {
      runtime.getKeyboardRuntime().onDocumentKeyDown(event);
    },
    getEditorRuntimeSet() {
      if (editorRuntimeSet) {
        return editorRuntimeSet;
      }
      editorRuntimeSet = createPreviewEditorRuntimeSetFromEditorHost({
        ...options.editorRuntimeSet,
        removeResizeHandles: () => runtime.removeResizeHandles(),
        showResizeHandles: (cid) => {
          void runtime.showResizeHandles(cid);
        },
      });
      return editorRuntimeSet;
    },
    getSelectionRuntime() {
      return runtime.getEditorRuntimeSet().selection;
    },
    getInspectorDisplayRuntime() {
      return runtime.getEditorRuntimeSet().inspectorDisplay;
    },
    getInspectorMutationRuntime() {
      return runtime.getEditorRuntimeSet().inspectorMutation;
    },
    getInspectorSelectionRuntime() {
      return runtime.getEditorRuntimeSet().inspectorSelection;
    },
    getArrowWaypointRuntime() {
      return runtime.getEditorRuntimeSet().arrowWaypoint;
    },
  };

  return runtime;
}

export function createPreviewEditorInteractionFacadeFromRuntime(
  options: CreatePreviewEditorInteractionFacadeFromRuntimeOptions,
): PreviewEditorInteractionFacade {
  let runtime!: PreviewEditorInteractionFacade;

  runtime = createPreviewEditorInteractionFacadeFromEditorHost({
    stageBinding: {
      ...options.stageBinding,
      document: options.shared.document,
      model: options.shared.model,
      selectedIds: options.shared.selectedIds,
      interactionManager: options.shared.interactionManager,
      selectionDepthState: {
        get: options.shared.selectionDepthState.get,
      },
      onMouseDown: (event) => runtime.onSvgMouseDown(
        event as unknown as Parameters<PreviewEditorInteractionFacade['onSvgMouseDown']>[0],
      ),
      onDoubleClick: (event) => runtime.onSvgDoubleClick(
        event as unknown as Parameters<PreviewEditorInteractionFacade['onSvgDoubleClick']>[0],
      ),
    },
    pointerInteraction: {
      ...options.pointerInteraction,
      document: options.shared.document,
      model: options.shared.model,
      interactionManager: options.shared.interactionManager,
      selectedIds: options.shared.selectedIds,
      selectionDepthState: options.shared.selectionDepthState,
      previewShellInspector: options.contracts.previewShellInspector,
      previewShellInteraction: options.contracts.previewShellInteraction,
    },
    selectionChrome: options.selectionChrome,
    textEdit: {
      ...options.textEdit,
      document: options.shared.document,
      model: options.shared.model,
      interactionManager: options.shared.interactionManager,
    },
    resizeInteraction: {
      ...options.resizeInteraction,
      document: options.shared.document,
      model: options.shared.model,
      interactionManager: options.shared.interactionManager,
      selectedIds: options.shared.selectedIds,
    },
    keyboard: {
      ...options.keyboard,
      document: options.shared.document,
      selectedIds: options.shared.selectedIds,
      selectionDepthState: {
        get: options.shared.selectionDepthState.get,
      },
      interactionManager: options.shared.interactionManager,
      model: options.shared.model,
    },
    editorRuntimeSet: {
      ...options.editorRuntimeSet,
      document: options.shared.document,
      selectedIds: options.shared.selectedIds,
      selectionDepthState: options.shared.selectionDepthState,
      previewShellScene: options.contracts.previewShellScene,
      previewShellInteraction: options.contracts.previewShellInteraction,
      previewBridgeRender: options.contracts.previewBridgeRender,
      model: options.shared.model,
    },
  });

  return runtime;
}

export function createPreviewEditorInteractionFacadeFromBrowserHost(
  options: CreatePreviewEditorInteractionFacadeFromBrowserHostOptions,
): PreviewEditorInteractionFacade {
  const browser = options.browser;
  const { document, model, interactionManager, selectedIds } = options.shared;
  const { previewShellInteraction, previewBridgeRender } = options.contracts;
  const getTreeRoots = () => model._roots.map((node) => node.data);
  const findArrowAtPoint = (clientX: number, clientY: number) => (
    previewShellInteraction.findPreviewArrowAtPoint({
      document,
      clientX,
      clientY,
      getNode: (id: string) => model.get(id),
    }) as ReturnType<RuntimePointerInteractionOptions['findArrowAtPoint']>
  );
  const findComponentAtDepth = (x: number, y: number, targetDepth: number) => (
    previewShellInteraction.findPreviewComponentAtDepth({
      document,
      x,
      y,
      targetDepth,
      roots: getTreeRoots(),
      getEffectiveDelta:
        browser.getEffectiveDelta as RuntimePointerInteractionOptions['getEffectiveDelta'],
      getOwnDelta: browser.getOwnDelta as RuntimePointerInteractionOptions['getOwnDelta'],
    }) as ReturnType<RuntimePointerInteractionOptions['findComponentAtDepth']>
  );
  const findDeepestComponent = (x: number, y: number) => (
    previewShellInteraction.findDeepestPreviewComponent({
      document,
      x,
      y,
      roots: getTreeRoots(),
      getEffectiveDelta:
        browser.getEffectiveDelta as RuntimePointerInteractionOptions['getEffectiveDelta'],
      getOwnDelta: browser.getOwnDelta as RuntimePointerInteractionOptions['getOwnDelta'],
    }) as ReturnType<RuntimePointerInteractionOptions['findDeepestComponent']>
  );
  const showReorderIndicator = (
    parentCid: string,
    insertIndex: number,
    isVertical: boolean,
  ) => {
    const svg = document.querySelector('#stage svg') as SVGSVGElement | null;
    const parentNode = model.get(parentCid) as {
      data: Record<string, unknown>;
      children?: Array<{ data: Record<string, unknown> }>;
    } | null;
    if (!svg || !parentNode) {
      return;
    }
    previewShellInteraction.renderPreviewReorderIndicator({
      svg,
      parent: parentNode.data,
      siblings: (parentNode.children ?? []).map((child) => child.data),
      insertIndex,
      isVertical,
    });
  };
  const clearReorderIndicator = () => {
    const svg = document.querySelector('#stage svg');
    if (svg) {
      previewShellInteraction.clearPreviewReorderIndicator(svg);
    }
  };
  const applyReorder = (parentId: string, cid: string, insertIndex: number) => {
    const parentNode = model.get(parentId) as {
      children?: Array<{ data: { id: string } }>;
    } | null;
    if (!parentNode) {
      return;
    }
    const currentOrder = (parentNode.children ?? []).map((child) => child.data.id);
    const newOrder = previewShellInteraction.applyReorderOrder(currentOrder, cid, insertIndex);
    if (!newOrder) {
      return;
    }
    browser.setFrameProp(parentId, 'children_order', newOrder);
  };
  const getRenderedComponentBounds = (cid: string, svg: SVGSVGElement) => {
    const node = model.get(cid) as {
      data: Record<string, unknown>;
    } | null;
    return previewBridgeRender.readPreviewRenderedComponentBounds({
      svg,
      componentId: cid,
      fallbackNodeBounds: node ? node.data : null,
      delta: browser.getEffectiveDelta(cid),
    }) as ReturnType<CreatePreviewSelectionChromeRuntimeFromHostOptions['getRenderedComponentBounds']>;
  };
  const getMultiResizeSelection = (svg: SVGSVGElement, idsOverride?: Iterable<string> | null) => (
    previewShellInteraction.collectPreviewMultiResizeSelection({
      ids: idsOverride || [...selectedIds],
      getNode: (id: string) => model.get(id),
      getAncestors: browser.getAncestors,
      getRenderedBounds: (id: string) => getRenderedComponentBounds(id, svg),
      getOwnDelta: browser.getOwnDelta as RuntimeResizeInteractionOptions['getOwnDelta'],
      getEffectiveDelta:
        browser.getEffectiveDelta as RuntimeResizeInteractionOptions['getEffectiveDelta'],
      hasLayoutChildren:
        browser.hasLayoutChildren as RuntimeResizeInteractionOptions['hasLayoutChildren'],
      isAutolayoutChild: browser.isAutolayoutChild,
      resolvePrimaryId:
        browser.getPrimarySelectedId as RuntimeResizeInteractionOptions['resolvePrimaryId'],
      minNodeSize: browser.minNodeSize,
    }) as ReturnType<CreatePreviewSelectionChromeRuntimeFromHostOptions['getMultiResizeSelection']>
  );
  const getSelectionActionInfo = () => (
    previewShellInteraction.collectPreviewSelectionActionInfo({
      selectedIds,
      getNode: (id: string) => model.get(id),
      getOwnDelta: browser.getOwnDelta,
      getEffectiveDelta: browser.getEffectiveDelta,
      inset: browser.inset,
    }) as ReturnType<RuntimeEditorRuntimeSetOptions['getSelectionActionInfo']>
  );
  const getEditorMutationContext = () => {
    const previewWindow = options.shared.document.defaultView as (
      Window & typeof globalThis & {
        __DG_previewRenderIntent?: { engineId?: string | null } | null;
        __DG_CONFIG?: {
          active_engine_id?: string | null;
          layout_engine?: string | null;
          document_kind?: string | null;
        } | null;
        __DG_getPreviewBridgeHostContract?: (() => {
          getFrameTreeJson?: (() => { layoutEngine?: string | null } | null) | null;
        }) | null;
      }
    ) | null;
    const frameTree = previewWindow?.__DG_getPreviewBridgeHostContract?.()?.getFrameTreeJson?.() ?? null;
    return {
      activeEngineId: previewWindow?.__DG_previewRenderIntent?.engineId
        ?? frameTree?.layoutEngine
        ?? previewWindow?.__DG_CONFIG?.active_engine_id
        ?? previewWindow?.__DG_CONFIG?.layout_engine
        ?? null,
      documentKind: previewWindow?.__DG_CONFIG?.document_kind ?? 'frame-diagram',
    };
  };
  const recordEditorMutationTransaction = (result: unknown): void => {
    const previewWindow = options.shared.document.defaultView as (
      Window & typeof globalThis & {
        __DG_lastEditorMutationTransactionResult?: unknown;
        __DG_lastEditorMutationStateViolations?: readonly unknown[] | null;
      }
    ) | null;
    if (!previewWindow) return;
    previewWindow.__DG_lastEditorMutationTransactionResult = result;
    previewWindow.__DG_lastEditorMutationStateViolations = null;
  };
  let runtime: PreviewEditorInteractionFacade | null = null;
  const onDragUp = () => {
    previewShellInteraction.completePreviewDragInteraction({
      document,
      onDragMove: (event?: unknown) => {
        runtime?.onDragMove(event as Parameters<PreviewEditorInteractionFacade['onDragMove']>[0]);
      },
      onDragUp,
      clearGuideLines: browser.clearGuideLines,
      clearReorderIndicator,
      interactionManager: interactionManager as {
        state?: unknown;
        endInteraction: () => void;
      },
      applyReorder,
      cleanOverride: browser.cleanOverride,
      captureOverrideEntries: browser.captureOverrideEntries,
      reapplySelection: browser.reapplySelection,
      selectComponent:
        browser.selectComponent as RuntimePointerInteractionOptions['selectComponent'],
      commitOverridePatchAction: browser.commitOverridePatchAction,
      autoFitArtboard: browser.autoFitArtboard,
    });
  };

  runtime = createPreviewEditorInteractionFacadeFromRuntime({
    shared: options.shared,
    contracts: options.contracts,
    stageBinding: {
      getOverrides: browser.getOverrides,
      selectComponent:
        browser.selectComponent as RuntimeStageBindingOptions['selectComponent'],
      deleteSelectedFrames: browser.deleteSelectedFrames,
      findArrowAtPoint,
      findComponentAtDepth,
      syncHoverState:
        options.contracts.previewShellInteraction.syncPreviewSvgHoverState as RuntimeStageBindingOptions['syncHoverState'],
      clearHoverState:
        options.contracts.previewShellInteraction.clearPreviewSvgHoverState as RuntimeStageBindingOptions['clearHoverState'],
    },
    pointerInteraction: {
      interactionMode: browser.interactionMode,
      getAncestors: browser.getAncestors,
      applySelectionState:
        browser.applySelectionState as RuntimePointerInteractionOptions['applySelectionState'],
      selectComponent:
        browser.selectComponent as RuntimePointerInteractionOptions['selectComponent'],
      onDragUp,
      findArrowAtPoint,
      findDeepestComponent,
      findComponentAtDepth,
      deselectAll: browser.deselectAll,
      getOwnDelta: browser.getOwnDelta as RuntimePointerInteractionOptions['getOwnDelta'],
      collectSnapTargets:
        browser.collectSnapTargets as RuntimePointerInteractionOptions['collectSnapTargets'],
      isAutolayoutChild: browser.isAutolayoutChild,
      captureOverrideEntries: browser.captureOverrideEntries,
      baselineStep: browser.baselineStep,
      showReorderIndicator,
      clearReorderIndicator,
      resolveSnap: browser.resolveSnap as RuntimePointerInteractionOptions['resolveSnap'],
      renderGuideLines:
        browser.renderGuideLines as RuntimePointerInteractionOptions['renderGuideLines'],
      setOverride: browser.setOverride as RuntimePointerInteractionOptions['setOverride'],
      applyAllOverrides: browser.applyAllOverrides,
      updateInspector:
        browser.updateInspector as RuntimePointerInteractionOptions['updateInspector'],
      shouldUpdateInspector: browser.shouldUpdateInspector,
      getParentNode:
        browser.getParentNode as RuntimePointerInteractionOptions['getParentNode'],
      getComponentNode:
        browser.getComponentNode as RuntimePointerInteractionOptions['getComponentNode'],
      getEffectiveDelta:
        browser.getEffectiveDelta as RuntimePointerInteractionOptions['getEffectiveDelta'],
      inset: browser.inset,
    },
    selectionChrome: {
      document: options.shared.document,
      selectedIds: options.shared.selectedIds,
      getMultiResizeSelection,
      getRenderedComponentBounds,
      getComponentType:
        browser.getComponentType as CreatePreviewEditorInteractionFacadeFromEditorHostOptions['selectionChrome']['getComponentType'],
      clearHandlesByClass: browser.clearHandlesByClass,
      resolveHandlePlan:
        options.contracts.previewShellInteraction.resolvePreviewResizeHandlePlan as CreatePreviewEditorInteractionFacadeFromEditorHostOptions['selectionChrome']['resolveHandlePlan'],
      renderResizeHandles:
        browser.renderResizeHandles as CreatePreviewEditorInteractionFacadeFromEditorHostOptions['selectionChrome']['renderResizeHandles'],
      handleSize: browser.handleSize,
    },
    textEdit: {
      textEditingMode: browser.textEditingMode,
      iconSize: browser.iconSize,
      columnGap: browser.columnGap,
      setTextOverride:
        browser.setTextOverride as RuntimeTextEditOptions['setTextOverride'],
      captureOverrideEntries: browser.captureOverrideEntries,
      commitOverridePatchAction:
        browser.commitOverridePatchAction as RuntimeTextEditOptions['commitOverridePatchAction'],
      reapplySelection: browser.reapplySelection,
      scheduleRelayout: browser.scheduleTextRelayout,
      getMutationContext: getEditorMutationContext,
      onMutationTransaction: recordEditorMutationTransaction,
    },
    resizeInteraction: {
      interactionMode: browser.interactionMode,
      getAncestors: browser.getAncestors,
      getOwnDelta:
        browser.getOwnDelta as RuntimeResizeInteractionOptions['getOwnDelta'],
      getEffectiveDelta:
        browser.getEffectiveDelta as RuntimeResizeInteractionOptions['getEffectiveDelta'],
      hasLayoutChildren:
        browser.hasLayoutChildren as RuntimeResizeInteractionOptions['hasLayoutChildren'],
      isAutolayoutChild: browser.isAutolayoutChild,
      resolvePrimaryId:
        browser.getPrimarySelectedId as RuntimeResizeInteractionOptions['resolvePrimaryId'],
      minNodeSize: browser.minNodeSize,
      captureOverrideEntries: browser.captureOverrideEntries,
      gridTargets: browser.gridTargets as RuntimeResizeInteractionOptions['gridTargets'],
      snapStep: browser.baselineStep,
      renderGuideLines:
        browser.renderGuideLines as RuntimeResizeInteractionOptions['renderGuideLines'],
      clearGuideLines: browser.clearGuideLines,
      applyInteractionOverrideEntries:
        browser.applyInteractionOverrideEntries as RuntimeResizeInteractionOptions['applyInteractionOverrideEntries'],
      applyAllOverrides: browser.applyAllOverrides,
      renderSelectionInspector:
        browser.renderSelectionInspector as RuntimeResizeInteractionOptions['renderSelectionInspector'],
      updateInspector:
        browser.updateInspector as RuntimeResizeInteractionOptions['updateInspector'],
      setOverride: browser.setOverride as RuntimeResizeInteractionOptions['setOverride'],
      scheduleLayoutResizeRelayout:
        browser.scheduleLayoutResizeRelayout as RuntimeResizeInteractionOptions['scheduleLayoutResizeRelayout'],
      scheduleV3ResizeRelayout:
        browser.scheduleV3ResizeRelayout as RuntimeResizeInteractionOptions['scheduleV3ResizeRelayout'],
      cancelLiveRelayout: browser.cancelLiveRelayout,
      clearPreviewSvgHoverState:
        options.contracts.previewShellInteraction.clearPreviewSvgHoverState as RuntimeResizeInteractionOptions['clearPreviewSvgHoverState'],
      cleanOverride: browser.cleanOverride,
      reapplySelection: browser.reapplySelection,
      selectComponent:
        browser.selectComponent as RuntimeResizeInteractionOptions['selectComponent'],
      commitOverridePatchAction:
        browser.commitOverridePatchAction as RuntimeResizeInteractionOptions['commitOverridePatchAction'],
      persistResize: browser.persistResize as RuntimeResizeInteractionOptions['persistResize'],
      autoFitArtboard: browser.autoFitArtboard as RuntimeResizeInteractionOptions['autoFitArtboard'],
    },
    keyboard: {
      interactionModes: browser.interactionMode,
      isAutolayoutChild: browser.isAutolayoutChild,
      save: browser.save,
      undo: browser.undo,
      redo: browser.redo,
      deleteSelection: browser.deleteSelection,
      clearGuideLines: browser.clearGuideLines,
      onDragUp,
      onResizeUp: browser.onResizeUp,
      cycleGuideMode: browser.cycleGuideMode,
      getParentId: (id) => {
        const parent = browser.getParentNode(id) as { id?: string | null } | null | undefined;
        return parent?.id ?? null;
      },
      getAncestorDepth: (id) => browser.getAncestors(id).length,
      selectComponent:
        browser.selectComponent as RuntimeKeyboardOptions['selectComponent'],
      applySelectionState:
        browser.applySelectionState as RuntimeKeyboardOptions['applySelectionState'],
      captureOverrideEntries: browser.captureOverrideEntries,
      commitOverridePatchAction:
        browser.commitOverridePatchAction as RuntimeKeyboardOptions['commitOverridePatchAction'],
      getOwnDelta: browser.getOwnDelta as RuntimeKeyboardOptions['getOwnDelta'],
      applyInteractionOverrideEntries:
        browser.applyInteractionOverrideEntries as RuntimeKeyboardOptions['applyInteractionOverrideEntries'],
      applyAllOverrides: browser.applyAllOverrides,
    },
    editorRuntimeSet: {
      getPrimarySelectedId:
        browser.getPrimarySelectedId as RuntimeEditorRuntimeSetOptions['getPrimarySelectedId'],
      getAncestors: browser.getAncestors,
      getOverrides: browser.getOverrides,
      coercedKeys: browser.coercedKeys,
      previewGridRuntime: {
        getGridInfo: browser.getPreviewGridInfo,
      },
      baselineStep: browser.baselineStep,
      fallbackGap: browser.fallbackGap,
      multiActionGapState: browser.multiActionGapState,
      getInspector:
        browser.getInspector as RuntimeEditorRuntimeSetOptions['getInspector'],
      getSelectionActionInfo,
      getArrowNode:
        browser.getArrowNode as RuntimeEditorRuntimeSetOptions['getArrowNode'],
      getOwnDelta: browser.getOwnDelta as RuntimeEditorRuntimeSetOptions['getOwnDelta'],
      getEffectiveDelta:
        browser.getEffectiveDelta as RuntimeEditorRuntimeSetOptions['getEffectiveDelta'],
      getComponentType:
        browser.getComponentType as RuntimeEditorRuntimeSetOptions['getComponentType'],
      getParentNode:
        browser.getParentNode as RuntimeEditorRuntimeSetOptions['getParentNode'],
      getViolations:
        browser.getViolations as RuntimeEditorRuntimeSetOptions['getViolations'],
      readRenderedStyleFields:
        browser.readRenderedStyleFields as RuntimeEditorRuntimeSetOptions['readRenderedStyleFields'],
      getTextAdapter: browser.getTextAdapter ?? null,
      escapeHtml: browser.escapeHtml ?? null,
      renderBoxStyleOptions:
        browser.renderBoxStyleOptions as RuntimeEditorRuntimeSetOptions['renderBoxStyleOptions'],
      formatAsDefinedStyleLabel:
        browser.formatAsDefinedStyleLabel as RuntimeEditorRuntimeSetOptions['formatAsDefinedStyleLabel'],
      syncPanelVisibility: browser.syncPanelVisibility ?? null,
      getMutationContext: getEditorMutationContext,
      onMutationTransaction: recordEditorMutationTransaction,
      shouldShowAutolayoutInspector: browser.shouldShowAutolayoutInspector ?? null,
      editorState: {
        captureOverrideEntries: browser.captureOverrideEntries,
        commitOverridePatchAction:
          browser.commitOverridePatchAction as RuntimeEditorRuntimeSetOptions['editorState']['commitOverridePatchAction'],
      },
      renderEmptyInspector: browser.renderEmptyInspector,
      renderSelectionInspector:
        browser.renderSelectionInspector as RuntimeEditorRuntimeSetOptions['renderSelectionInspector'],
      renderMultiSelectionInspector: browser.renderMultiSelectionInspector,
      snapToGrid:
        browser.snapToGrid as RuntimeEditorRuntimeSetOptions['snapToGrid'],
      setDirty: browser.setDirty,
      scheduleRelayout: browser.scheduleRelayout,
      requestRelayoutNow:
        browser.requestRelayoutNow as RuntimeEditorRuntimeSetOptions['requestRelayoutNow'],
      applyAllOverrides: browser.applyAllOverrides,
      reapplySelection: browser.reapplySelection,
      updateOverrideSummary: browser.updateOverrideSummary,
      refreshTreeColors: browser.refreshTreeColors,
      runConstraints: browser.runConstraints,
      setOverride:
        browser.setOverride as RuntimeEditorRuntimeSetOptions['setOverride'],
      alert: browser.alert,
      normalizeStyleName: browser.normalizeStyleName,
      interactionManager: options.shared.interactionManager,
      waypointDraggingMode: browser.waypointDraggingMode,
      persistWaypointOverride: browser.persistWaypointOverride,
      theme: browser.theme,
    },
  });

  return runtime;
}
