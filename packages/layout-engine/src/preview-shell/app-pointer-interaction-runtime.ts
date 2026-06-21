import {
  type ClampPreviewDragDeltaWithinParentOptions,
  dispatchPreviewDragMoveHost,
  startPreviewPointerInteractionHost,
  type DispatchPreviewDragMoveHostOptions,
  type StartPreviewPointerInteractionHostOptions,
  type PreviewPointerEventLike,
} from './app-drag-host.js';
import { handlePreviewDoubleClickSelectionHost } from './app-selection-host.js';
import type { SelectionStateSnapshot } from './interaction-selection-state.js';

export interface CreatePreviewPointerInteractionRuntimeOptions {
  document: Document;
  getSvg: () => SVGSVGElement | null;
  getSelectedIds: () => Set<string>;
  getSelectionDepth: () => number;
  setSelectionDepth: (depth: number) => void;
  isTextEditing: () => boolean;
  findEditableTextTarget: (
    target: unknown,
    clientX: number,
    clientY: number,
  ) => Element | null;
  resolveEditableComponentId: (textEl: Element | null | undefined) => string;
  getAncestors: (cid: string) => string[];
  selectComponent: (cid: string, additive: boolean) => void;
  startTextEdit: (
    cid: string,
    event: { target: { classList: { contains: (name: string) => boolean } }; clientX: number; clientY: number },
    options?: Record<string, unknown>,
  ) => void;
  findComponentAtDepth: (x: number, y: number, depth: number) => string | null | undefined;
  getChildIds: (cid: string) => string[];
  applySelectionState: (nextState: SelectionStateSnapshot) => void;
  commitTextEditIfActive: () => void;
  startResize: (event: PreviewPointerEventLike) => void;
  findArrowAtPoint: (clientX: number, clientY: number) => string | null | undefined;
  findDeepestComponent: (x: number, y: number) => string | null | undefined;
  deselectAll: () => void;
  getOwnDelta: StartPreviewPointerInteractionHostOptions['getOwnDelta'];
  collectSnapTargets: StartPreviewPointerInteractionHostOptions['collectSnapTargets'];
  isAutolayoutChild: (cid: string) => boolean;
  captureOverrideEntries: (ids: string[]) => unknown;
  startDragInteraction: (state: Record<string, unknown>) => void;
  interactionManager: {
    state?: unknown;
    isMode: (mode: unknown) => boolean;
    endInteraction?: () => void;
  };
  draggingMode: unknown;
  getParentNodeForAutolayout: DispatchPreviewDragMoveHostOptions['getParentNodeForAutolayout'];
  snapStep: number;
  showReorderIndicator: DispatchPreviewDragMoveHostOptions['showReorderIndicator'];
  clearReorderIndicator: DispatchPreviewDragMoveHostOptions['clearReorderIndicator'];
  resolveSnap: DispatchPreviewDragMoveHostOptions['resolveSnap'];
  renderGuideLines: DispatchPreviewDragMoveHostOptions['renderGuideLines'];
  clampDragDelta: DispatchPreviewDragMoveHostOptions['clampDragDelta'];
  setOverride: DispatchPreviewDragMoveHostOptions['setOverride'];
  applyAllOverrides: () => void;
  updateInspector: (cid?: string | null) => void;
  shouldUpdateInspector: () => boolean;
  onDragUp: (event?: unknown) => void;
}

export interface CreatePreviewPointerInteractionRuntimeFromHostOptions {
  document: Document;
  model: {
    get: (id: string) => {
      children?: Array<{ data: { id: string } }>;
    } | null | undefined;
    getParent: DispatchPreviewDragMoveHostOptions['getParentNodeForAutolayout'];
  };
  interactionManager: {
    state?: unknown;
    isMode: (mode: unknown) => boolean;
    startDrag: (state: Record<string, unknown>) => void;
  };
  interactionMode: {
    DRAGGING: unknown;
    TEXT_EDITING: unknown;
  };
  selectedIds: Set<string>;
  selectionDepthState: {
    get: () => number;
    set: (depth: number) => void;
  };
  previewShellInspector: {
    findPreviewEditableTextTarget: (
      target: unknown,
      clientX: number,
      clientY: number,
    ) => Element | null;
    resolvePreviewEditableComponentId: (
      textEl: Element | null | undefined,
      hasComponentId: (id: string) => boolean,
    ) => string;
  };
  previewShellInteraction: {
    clampPreviewDragDeltaWithinParent: (
      options: ClampPreviewDragDeltaWithinParentOptions,
    ) => { dx: number; dy: number };
  };
  startTextEdit: CreatePreviewPointerInteractionRuntimeOptions['startTextEdit'];
  commitTextEdit: () => void;
  startResize: (event: PreviewPointerEventLike) => void;
  findArrowAtPoint: CreatePreviewPointerInteractionRuntimeOptions['findArrowAtPoint'];
  findDeepestComponent: CreatePreviewPointerInteractionRuntimeOptions['findDeepestComponent'];
  findComponentAtDepth: CreatePreviewPointerInteractionRuntimeOptions['findComponentAtDepth'];
  getAncestors: CreatePreviewPointerInteractionRuntimeOptions['getAncestors'];
  applySelectionState: CreatePreviewPointerInteractionRuntimeOptions['applySelectionState'];
  selectComponent: CreatePreviewPointerInteractionRuntimeOptions['selectComponent'];
  deselectAll: () => void;
  getOwnDelta: StartPreviewPointerInteractionHostOptions['getOwnDelta'];
  collectSnapTargets: StartPreviewPointerInteractionHostOptions['collectSnapTargets'];
  isAutolayoutChild: (cid: string) => boolean;
  captureOverrideEntries: (ids: string[]) => unknown;
  onDragUp: (event?: unknown) => void;
  baselineStep: number;
  showReorderIndicator: DispatchPreviewDragMoveHostOptions['showReorderIndicator'];
  clearReorderIndicator: DispatchPreviewDragMoveHostOptions['clearReorderIndicator'];
  resolveSnap: DispatchPreviewDragMoveHostOptions['resolveSnap'];
  renderGuideLines: DispatchPreviewDragMoveHostOptions['renderGuideLines'];
  setOverride: DispatchPreviewDragMoveHostOptions['setOverride'];
  applyAllOverrides: () => void;
  updateInspector: (cid?: string | null) => void;
  shouldUpdateInspector: () => boolean;
  getParentNode: (cid: string) => unknown;
  getComponentNode: (cid: string) => unknown;
  getEffectiveDelta: (cid: string) => unknown;
  inset: number;
}

export interface PreviewPointerInteractionRuntime {
  onSvgDoubleClick: (event: {
    target: { classList: { contains: (name: string) => boolean } };
    clientX: number;
    clientY: number;
  }) => void;
  onSvgMouseDown: (event: PreviewPointerEventLike) => void;
  onDragMove: (event: { clientX: number; clientY: number }) => void;
}

export function createPreviewPointerInteractionRuntime(
  options: CreatePreviewPointerInteractionRuntimeOptions,
): PreviewPointerInteractionRuntime {
  const runtime: PreviewPointerInteractionRuntime = {
    onSvgDoubleClick(event) {
      handlePreviewDoubleClickSelectionHost({
        event,
        isTextEditing: options.isTextEditing(),
        svg: options.getSvg() as never,
        selectionDepth: options.getSelectionDepth(),
        selectedIds: options.getSelectedIds(),
        findEditableTextTarget: options.findEditableTextTarget,
        resolveEditableComponentId: options.resolveEditableComponentId,
        getAncestors: options.getAncestors,
        setSelectionDepth: options.setSelectionDepth,
        selectComponent: options.selectComponent,
        startTextEdit: options.startTextEdit,
        findComponentAtDepth: options.findComponentAtDepth,
        getChildIds: options.getChildIds,
        applySelectionState: options.applySelectionState,
      });
    },
    onSvgMouseDown(event) {
      startPreviewPointerInteractionHost({
        event,
        svg: options.getSvg() as never,
        currentSelectionDepth: options.getSelectionDepth(),
        selectedIds: options.getSelectedIds(),
        commitTextEditIfActive: options.commitTextEditIfActive,
        startResize: options.startResize,
        findArrowAtPoint: options.findArrowAtPoint,
        findDeepestComponent: options.findDeepestComponent,
        findComponentAtDepth: options.findComponentAtDepth,
        getAncestors: options.getAncestors,
        deselectAll: options.deselectAll,
        setSelectionDepth: options.setSelectionDepth,
        selectComponent: options.selectComponent,
        getOwnDelta: options.getOwnDelta,
        collectSnapTargets: options.collectSnapTargets,
        isAutolayoutChild: options.isAutolayoutChild,
        captureOverrideEntries: options.captureOverrideEntries,
        startDragInteraction: options.startDragInteraction,
        addDocumentListener: (type, handler) => {
          options.document.addEventListener(type, handler);
        },
        onDragMove: runtime.onDragMove,
        onDragUp: options.onDragUp,
      });
    },
    onDragMove(event) {
      if (!options.interactionManager.isMode(options.draggingMode)) {
        return;
      }
      dispatchPreviewDragMoveHost({
        state: options.interactionManager.state as DispatchPreviewDragMoveHostOptions['state'],
        svg: options.getSvg(),
        clientX: event.clientX,
        clientY: event.clientY,
        getParentNodeForAutolayout: options.getParentNodeForAutolayout,
        snapStep: options.snapStep,
        showReorderIndicator: options.showReorderIndicator,
        clearReorderIndicator: options.clearReorderIndicator,
        resolveSnap: options.resolveSnap,
        renderGuideLines: options.renderGuideLines,
        clampDragDelta: options.clampDragDelta,
        setOverride: options.setOverride,
        applyAllOverrides: options.applyAllOverrides,
        updateInspector: options.updateInspector,
        shouldUpdateInspector: options.shouldUpdateInspector(),
      });
    },
  };

  return runtime;
}

export function createPreviewPointerInteractionRuntimeFromHost(
  options: CreatePreviewPointerInteractionRuntimeFromHostOptions,
): PreviewPointerInteractionRuntime {
  return createPreviewPointerInteractionRuntime({
    document: options.document,
    getSvg: () => options.document.querySelector('#stage svg') as SVGSVGElement | null,
    getSelectedIds: () => options.selectedIds,
    getSelectionDepth: options.selectionDepthState.get,
    setSelectionDepth: options.selectionDepthState.set,
    isTextEditing: () => options.interactionManager.isMode(options.interactionMode.TEXT_EDITING),
    findEditableTextTarget: options.previewShellInspector.findPreviewEditableTextTarget,
    resolveEditableComponentId: (textEl) => (
      options.previewShellInspector.resolvePreviewEditableComponentId(
        textEl,
        (id) => Boolean(options.model.get(id)),
      )
    ),
    getAncestors: options.getAncestors,
    selectComponent: options.selectComponent,
    startTextEdit: options.startTextEdit,
    findComponentAtDepth: options.findComponentAtDepth,
    getChildIds: (cid) => {
      const node = options.model.get(cid);
      return node?.children ? node.children.map((child) => child.data.id) : [];
    },
    applySelectionState: options.applySelectionState,
    commitTextEditIfActive: () => {
      if (options.interactionManager.isMode(options.interactionMode.TEXT_EDITING)) {
        options.commitTextEdit();
      }
    },
    startResize: options.startResize,
    findArrowAtPoint: options.findArrowAtPoint,
    findDeepestComponent: options.findDeepestComponent,
    deselectAll: options.deselectAll,
    getOwnDelta: options.getOwnDelta,
    collectSnapTargets: options.collectSnapTargets,
    isAutolayoutChild: options.isAutolayoutChild,
    captureOverrideEntries: options.captureOverrideEntries,
    startDragInteraction: (state) => options.interactionManager.startDrag(state),
    interactionManager: options.interactionManager,
    draggingMode: options.interactionMode.DRAGGING,
    getParentNodeForAutolayout: (id) => options.model.getParent(id),
    snapStep: options.baselineStep,
    showReorderIndicator: options.showReorderIndicator,
    clearReorderIndicator: options.clearReorderIndicator,
    resolveSnap: options.resolveSnap,
    renderGuideLines: options.renderGuideLines,
    clampDragDelta: (cid, proposedDx, proposedDy) => (
      options.previewShellInteraction.clampPreviewDragDeltaWithinParent({
        cid,
        proposedDx,
        proposedDy,
        inset: options.inset,
        getParentNode: options.getParentNode as never,
        getComponentNode: options.getComponentNode as never,
        getOwnDelta: options.getOwnDelta,
        getEffectiveDelta: options.getEffectiveDelta as never,
      })
    ),
    setOverride: options.setOverride,
    applyAllOverrides: options.applyAllOverrides,
    updateInspector: options.updateInspector,
    shouldUpdateInspector: options.shouldUpdateInspector,
    onDragUp: options.onDragUp,
  });
}
