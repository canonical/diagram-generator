import {
  completePreviewResizeInteraction,
  dispatchPreviewResizeMoveHost,
  startPreviewResizeHost,
  type CompletePreviewResizeInteractionEditorHostOptions,
  type DispatchPreviewResizeMoveHostOptions,
  type StartPreviewResizeHostOptions,
} from './app-resize-host.js';
import type { EditorMutationRelayoutPolicy } from './editor-mutation-transaction.js';

export interface CreatePreviewResizeInteractionRuntimeOptions {
  document: Document;
  getSvg: () => SVGSVGElement | null;
  selectedIds: Set<string>;
  hasDiagramGrid: () => boolean;
  getNode: StartPreviewResizeHostOptions['getNode'];
  getSiblings: StartPreviewResizeHostOptions['getSiblings'];
  getAncestors: StartPreviewResizeHostOptions['getAncestors'];
  getOwnDelta: StartPreviewResizeHostOptions['getOwnDelta'];
  getEffectiveDelta: StartPreviewResizeHostOptions['getEffectiveDelta'];
  hasLayoutChildren: StartPreviewResizeHostOptions['hasLayoutChildren'];
  isAutolayoutChild: StartPreviewResizeHostOptions['isAutolayoutChild'];
  resolvePrimaryId: StartPreviewResizeHostOptions['resolvePrimaryId'];
  minNodeSize: number;
  captureOverrideEntries: (ids: string[]) => unknown;
  startInteraction: (state: Record<string, unknown>) => void;
  interactionManager: CompletePreviewResizeInteractionEditorHostOptions['interactionManager'] & {
    isMode: (mode: unknown) => boolean;
    startResize: (state: unknown) => void;
  };
  resizingMode: unknown;
  gridTargets: () => DispatchPreviewResizeMoveHostOptions['gridTargets'];
  snapStep: number;
  renderGuideLines: DispatchPreviewResizeMoveHostOptions['renderGuideLines'];
  clearGuideLines: () => void;
  applyInteractionOverrideEntries: DispatchPreviewResizeMoveHostOptions['applyInteractionOverrideEntries'];
  applyAllOverrides: () => void;
  renderSelectionInspector: () => void;
  updateInspector: (cid?: string | null) => void;
  setOverride: DispatchPreviewResizeMoveHostOptions['setOverride'];
  relayoutChildren: DispatchPreviewResizeMoveHostOptions['relayoutChildren'];
  relayoutSiblingsAfterChildResize:
    DispatchPreviewResizeMoveHostOptions['relayoutSiblingsAfterChildResize'];
  scheduleLayoutResizeRelayout:
    DispatchPreviewResizeMoveHostOptions['scheduleLayoutResizeRelayout'];
  scheduleV3ResizeRelayout:
    DispatchPreviewResizeMoveHostOptions['scheduleV3ResizeRelayout'];
  cancelLiveRelayout: () => void;
  clearPreviewSvgHoverState: (svg: unknown) => void;
  cleanOverride: (cid: string) => void;
  reapplySelection: () => void;
  selectComponent: (cid: string) => void;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: unknown,
    afterEntries: unknown,
  ) => void;
  persistResize: (
    resizedIds: string[],
    propagatedIds: string[],
    triggerCid: string,
    baseSizes?: Record<string, { width: number; height: number }> | null,
  ) => void;
  autoFitArtboard: () => void;
  getMutationContext?: (() => Pick<
    NonNullable<CompletePreviewResizeInteractionEditorHostOptions['transaction']>,
    'activeEngineId' | 'documentKind'
  > | null | undefined) | null;
  onMutationTransaction?:
    NonNullable<CompletePreviewResizeInteractionEditorHostOptions['transaction']>['onMutationTransaction'];
  getResizeCompletionRelayoutPolicy?: (() => EditorMutationRelayoutPolicy) | null;
}

export interface CreatePreviewResizeInteractionRuntimeFromHostOptions {
  document: Document;
  model: {
    diagramGrid?: unknown;
    get: (id: string) => unknown;
    getSiblings: (id: string) => unknown;
    relayoutChildren: (
      parentId: string,
      dx: number,
      dy: number,
      dw: number,
      dh: number,
      origOverrides: Record<string, unknown>,
    ) => Record<string, unknown>;
    relayoutSiblingsAfterChildResize: (
      cid: string,
      rightEdgeDelta: number,
      bottomEdgeDelta: number,
    ) => Record<string, unknown>;
  };
  interactionManager: CreatePreviewResizeInteractionRuntimeOptions['interactionManager'];
  interactionMode: {
    RESIZING: unknown;
  };
  selectedIds: Set<string>;
  getAncestors: StartPreviewResizeHostOptions['getAncestors'];
  getOwnDelta: StartPreviewResizeHostOptions['getOwnDelta'];
  getEffectiveDelta: StartPreviewResizeHostOptions['getEffectiveDelta'];
  hasLayoutChildren: StartPreviewResizeHostOptions['hasLayoutChildren'];
  isAutolayoutChild: StartPreviewResizeHostOptions['isAutolayoutChild'];
  resolvePrimaryId: StartPreviewResizeHostOptions['resolvePrimaryId'];
  minNodeSize: number;
  captureOverrideEntries: (ids: string[]) => unknown;
  gridTargets: () => DispatchPreviewResizeMoveHostOptions['gridTargets'];
  snapStep: number;
  renderGuideLines: DispatchPreviewResizeMoveHostOptions['renderGuideLines'];
  clearGuideLines: () => void;
  applyInteractionOverrideEntries: DispatchPreviewResizeMoveHostOptions['applyInteractionOverrideEntries'];
  applyAllOverrides: () => void;
  renderSelectionInspector: () => void;
  updateInspector: (cid?: string | null) => void;
  setOverride: DispatchPreviewResizeMoveHostOptions['setOverride'];
  scheduleLayoutResizeRelayout:
    DispatchPreviewResizeMoveHostOptions['scheduleLayoutResizeRelayout'];
  scheduleV3ResizeRelayout:
    DispatchPreviewResizeMoveHostOptions['scheduleV3ResizeRelayout'];
  cancelLiveRelayout: () => void;
  clearPreviewSvgHoverState: (svg: unknown) => void;
  cleanOverride: (cid: string) => void;
  reapplySelection: () => void;
  selectComponent: (cid: string) => void;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: unknown,
    afterEntries: unknown,
  ) => void;
  persistResize: (
    resizedIds: string[],
    propagatedIds: string[],
    triggerCid: string,
    baseSizes?: Record<string, { width: number; height: number }> | null,
  ) => void;
  autoFitArtboard: () => void;
  getMutationContext?: CreatePreviewResizeInteractionRuntimeOptions['getMutationContext'];
  onMutationTransaction?: CreatePreviewResizeInteractionRuntimeOptions['onMutationTransaction'];
  getResizeCompletionRelayoutPolicy?:
    CreatePreviewResizeInteractionRuntimeOptions['getResizeCompletionRelayoutPolicy'];
}

export interface PreviewResizeInteractionRuntime {
  startResize: (event: MouseEvent) => void;
  onResizeMove: (event: MouseEvent) => void;
  onResizeUp: () => void;
}

export function createPreviewResizeInteractionRuntime(
  options: CreatePreviewResizeInteractionRuntimeOptions,
): PreviewResizeInteractionRuntime {
  const runtime: PreviewResizeInteractionRuntime = {
    startResize(event) {
      startPreviewResizeHost({
        event: event as never,
        svg: options.getSvg(),
        selectedIds: options.selectedIds,
        hasDiagramGrid: options.hasDiagramGrid(),
        getNode: options.getNode,
        getSiblings: options.getSiblings,
        getAncestors: options.getAncestors,
        getOwnDelta: options.getOwnDelta,
        getEffectiveDelta: options.getEffectiveDelta,
        hasLayoutChildren: options.hasLayoutChildren,
        isAutolayoutChild: options.isAutolayoutChild,
        resolvePrimaryId: options.resolvePrimaryId,
        minNodeSize: options.minNodeSize,
        captureOverrideEntries: options.captureOverrideEntries,
        startInteraction: (state) => options.startInteraction(state as never),
        addDocumentListener: (type, handler) => {
          options.document.addEventListener(type, handler);
        },
        onResizeMove: runtime.onResizeMove,
        onResizeUp: runtime.onResizeUp,
      });
    },
    onResizeMove(event) {
      if (!options.interactionManager.isMode(options.resizingMode)) {
        return;
      }
      dispatchPreviewResizeMoveHost({
        state: options.interactionManager.state as DispatchPreviewResizeMoveHostOptions['state'],
        svg: options.getSvg(),
        hasDiagramGrid: options.hasDiagramGrid(),
        clientX: event.clientX,
        clientY: event.clientY,
        gridTargets: options.gridTargets(),
        snapStep: options.snapStep,
        getNode: options.getNode,
        hasLayoutChildrenForId: options.hasLayoutChildren,
        isSelected: options.selectedIds.has(
          String((options.interactionManager.state as { cid?: string } | null)?.cid ?? ''),
        ),
        renderGuideLines: options.renderGuideLines,
        clearGuideLines: options.clearGuideLines,
        applyInteractionOverrideEntries: options.applyInteractionOverrideEntries,
        applyAllOverrides: options.applyAllOverrides,
        renderSelectionInspector: options.renderSelectionInspector,
        updateInspector: options.updateInspector,
        setOverride: options.setOverride,
        relayoutChildren: options.relayoutChildren,
        relayoutSiblingsAfterChildResize: options.relayoutSiblingsAfterChildResize,
        scheduleLayoutResizeRelayout: options.scheduleLayoutResizeRelayout,
        scheduleV3ResizeRelayout: options.scheduleV3ResizeRelayout,
      });
    },
    onResizeUp() {
      completePreviewResizeInteraction({
        document: options.document,
        interactionManager: options.interactionManager,
        cancelLiveRelayout: options.cancelLiveRelayout,
        onResizeMove: runtime.onResizeMove,
        onResizeUp: runtime.onResizeUp,
        clearGuideLines: options.clearGuideLines,
        clearPreviewSvgHoverState: options.clearPreviewSvgHoverState,
        cleanOverride: options.cleanOverride,
        captureOverrideEntries: options.captureOverrideEntries,
        reapplySelection: options.reapplySelection,
        selectComponent: options.selectComponent,
        commitOverridePatchAction: options.commitOverridePatchAction,
        persistResize: (resizedIds, propagatedIds, triggerCid, baseSizes) => {
          options.persistResize(
            resizedIds,
            propagatedIds ? [...propagatedIds] : [],
            triggerCid,
            baseSizes ?? null,
          );
        },
        autoFitArtboard: options.autoFitArtboard,
        transaction: {
          ...(options.getMutationContext?.() ?? {}),
          relayoutPolicy: options.getResizeCompletionRelayoutPolicy?.() ?? 'local',
          onMutationTransaction: options.onMutationTransaction ?? null,
        },
      });
    },
  };

  return runtime;
}

export function createPreviewResizeInteractionRuntimeFromHost(
  options: CreatePreviewResizeInteractionRuntimeFromHostOptions,
): PreviewResizeInteractionRuntime {
  return createPreviewResizeInteractionRuntime({
    document: options.document,
    getSvg: () => options.document.querySelector('#stage svg') as SVGSVGElement | null,
    selectedIds: options.selectedIds,
    hasDiagramGrid: () => Boolean(options.model.diagramGrid),
    getNode: (id) => options.model.get(id) as never,
    getSiblings: (id) => options.model.getSiblings(id) as never,
    getAncestors: options.getAncestors,
    getOwnDelta: options.getOwnDelta,
    getEffectiveDelta: options.getEffectiveDelta,
    hasLayoutChildren: options.hasLayoutChildren,
    isAutolayoutChild: options.isAutolayoutChild,
    resolvePrimaryId: options.resolvePrimaryId,
    minNodeSize: options.minNodeSize,
    captureOverrideEntries: options.captureOverrideEntries,
    startInteraction: (state) => options.interactionManager.startResize(state),
    interactionManager: options.interactionManager,
    resizingMode: options.interactionMode.RESIZING,
    gridTargets: options.gridTargets,
    snapStep: options.snapStep,
    renderGuideLines: options.renderGuideLines,
    clearGuideLines: options.clearGuideLines,
    applyInteractionOverrideEntries: options.applyInteractionOverrideEntries,
    applyAllOverrides: options.applyAllOverrides,
    renderSelectionInspector: options.renderSelectionInspector,
    updateInspector: options.updateInspector,
    setOverride: options.setOverride,
    relayoutChildren: (parentId, parentDelta, origOverrides) => (
      options.model.relayoutChildren(
        parentId,
        parentDelta.dx,
        parentDelta.dy,
        parentDelta.dw,
        parentDelta.dh,
        origOverrides as never,
      ) as never
    ),
    relayoutSiblingsAfterChildResize: (
      (cid, rightEdgeDelta, bottomEdgeDelta) => options.model.relayoutSiblingsAfterChildResize(
        cid,
        rightEdgeDelta,
        bottomEdgeDelta,
      ) as never
    ),
    scheduleLayoutResizeRelayout: options.scheduleLayoutResizeRelayout,
    scheduleV3ResizeRelayout: options.scheduleV3ResizeRelayout,
    cancelLiveRelayout: options.cancelLiveRelayout,
    clearPreviewSvgHoverState: options.clearPreviewSvgHoverState,
    cleanOverride: options.cleanOverride,
    reapplySelection: options.reapplySelection,
    selectComponent: options.selectComponent,
    commitOverridePatchAction: options.commitOverridePatchAction,
    persistResize: options.persistResize,
    autoFitArtboard: options.autoFitArtboard,
    getMutationContext: options.getMutationContext ?? null,
    onMutationTransaction: options.onMutationTransaction ?? null,
    getResizeCompletionRelayoutPolicy: options.getResizeCompletionRelayoutPolicy ?? null,
  });
}
