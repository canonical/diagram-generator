import {
  commitPreviewWaypointInsert,
  commitPreviewWaypointRemoval,
  completePreviewWaypointDragInteraction,
  dispatchPreviewWaypointDragMoveHost,
  renderPreviewWaypointHandlesHost,
  startPreviewWaypointDragHost,
  type PreviewWaypointOverrideSnapshot,
  type PreviewWaypointHostNode,
  type PreviewWaypointMutationTransactionOptions,
} from './app-waypoint-host.js';
import {
  readPreviewArrowPointsHost,
  rebuildPreviewArrowSvgHost,
  updatePreviewArrowVisualHost,
} from './app-selection-chrome.js';

export interface CreatePreviewArrowWaypointRuntimeOptions {
  document: Document;
  interactionManager: {
    state?: unknown;
    startWaypointDrag: (state: unknown) => void;
    endInteraction: () => void;
    isMode: (mode: unknown) => boolean;
  };
  waypointDraggingMode: unknown;
  getArrowNode: (cid: string) => PreviewWaypointHostNode | null | undefined;
  getEffectiveDelta: (cid: string) => { dx?: number; dy?: number } | null;
  isSelected: (cid: string) => boolean;
  captureOverrideEntries: (ids: string[]) => PreviewWaypointOverrideSnapshot;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: PreviewWaypointOverrideSnapshot,
    afterEntries: PreviewWaypointOverrideSnapshot,
  ) => void;
  persistWaypointOverride: (cid: string) => void;
  refreshInspector: (cid: string) => void;
  readArrowEndpoints: (options: {
    svg: SVGSVGElement;
    componentId: string;
  }) => { start: [number, number]; end: [number, number] } | null;
  updateArrowSvg: (options: {
    svg: SVGSVGElement;
    componentId: string;
    waypoints: [number, number][];
    delta: { dx?: number; dy?: number } | null;
    headLen: number;
    headHalf: number;
  }) => void;
  rebuildArrowSvg: (options: {
    svg: SVGSVGElement;
    componentId: string;
    waypoints: [number, number][];
    headLen: number;
    headHalf: number;
    color: string;
  }) => void;
  headLen: number;
  headHalf: number;
  color: string;
  getMutationContext?: (() => Pick<PreviewWaypointMutationTransactionOptions, 'activeEngineId' | 'documentKind'> | null | undefined) | null;
  onMutationTransaction?: PreviewWaypointMutationTransactionOptions['onMutationTransaction'];
}

export interface PreviewArrowWaypointRuntime {
  showArrowWaypointHandles: (cid: string) => void;
  startWaypointDrag: (event: MouseEvent) => void;
  onWaypointDragMove: (event: MouseEvent) => void;
  onWaypointDragUp: () => void;
  addWaypoint: (cid: string, segmentIndex: number, x: number, y: number) => void;
  removeWaypoint: (cid: string, index: number) => void;
  getArrowPoints: (cid: string) => [number, number][];
  updateArrowVisual: (cid: string) => void;
  rebuildArrowSvg: (cid: string) => void;
}

export function createPreviewArrowWaypointRuntime(
  options: CreatePreviewArrowWaypointRuntimeOptions,
): PreviewArrowWaypointRuntime {
  const refreshSelectedArrowInspector = (cid: string): void => {
    if (options.isSelected(cid)) {
      options.refreshInspector(cid);
    }
  };

  const getArrowPoints = (cid: string): [number, number][] => readPreviewArrowPointsHost({
    document: options.document,
    componentId: cid,
    hasArrowNode: Boolean(options.getArrowNode(cid)),
    readArrowEndpoints: options.readArrowEndpoints,
  });

  const readArrowEndpoints = (cid: string): { start: [number, number]; end: [number, number] } | null => {
    const svg = options.document.querySelector('#stage svg') as SVGSVGElement | null;
    if (!svg) {
      return null;
    }
    return options.readArrowEndpoints({
      svg,
      componentId: cid,
    });
  };

  const updateArrowVisual = (cid: string): void => {
    const delta = options.getEffectiveDelta(cid) ?? { dx: 0, dy: 0 };
    updatePreviewArrowVisualHost({
      document: options.document,
      componentId: cid,
      node: options.getArrowNode(cid),
      delta: { dx: delta.dx ?? 0, dy: delta.dy ?? 0 },
      headLen: options.headLen,
      headHalf: options.headHalf,
      updateArrowSvg: options.updateArrowSvg,
    });
  };

  const rebuildArrowSvg = (cid: string): void => {
    rebuildPreviewArrowSvgHost({
      document: options.document,
      componentId: cid,
      node: options.getArrowNode(cid),
      headLen: options.headLen,
      headHalf: options.headHalf,
      color: options.color,
      rebuildArrowSvg: options.rebuildArrowSvg,
    });
  };

  const waypointTransaction = (sourceControl: string): PreviewWaypointMutationTransactionOptions => ({
    ...(options.getMutationContext?.() ?? {}),
    sourceControl,
    onMutationTransaction: options.onMutationTransaction ?? null,
  });

  const showArrowWaypointHandles = (cid: string): void => {
    const node = options.getArrowNode(cid);
    if (!node) {
      return;
    }
    renderPreviewWaypointHandlesHost({
      svg: options.document.querySelector('#stage svg') as SVGSVGElement | null,
      componentId: cid,
      waypoints: node.waypoints || [],
      delta: (() => {
        const delta = options.getEffectiveDelta(cid) ?? { dx: 0, dy: 0 };
        return { dx: delta.dx ?? 0, dy: delta.dy ?? 0 };
      })(),
      isSelected: options.isSelected(cid),
      onAddWaypoint: (segmentIndex, x, y) => {
        addWaypoint(cid, segmentIndex, x, y);
      },
      onHandleMouseDown: startWaypointDrag,
      onHandleDoubleClick: (index) => {
        removeWaypoint(cid, index);
      },
    });
  };

  const startWaypointDrag = (event: MouseEvent): void => {
    startPreviewWaypointDragHost({
      event: event as never,
      getNode: options.getArrowNode,
      startInteraction: (state) => options.interactionManager.startWaypointDrag(state),
      addDocumentListener: (type, handler) => {
        options.document.addEventListener(type, handler);
      },
      onWaypointDragMove,
      onWaypointDragUp,
    });
  };

  const onWaypointDragMove = (event: MouseEvent): void => {
    if (!options.interactionManager.isMode(options.waypointDraggingMode)) {
      return;
    }
    const result = dispatchPreviewWaypointDragMoveHost({
      state: options.interactionManager.state as never,
      clientX: event.clientX,
      clientY: event.clientY,
      getNode: options.getArrowNode,
      readEndpoints: readArrowEndpoints,
      updateArrowVisual,
    });
    if (result.kind !== 'moved') {
      return;
    }
    event.preventDefault();
  };

  const onWaypointDragUp = (): void => {
    completePreviewWaypointDragInteraction({
      document: options.document,
      interactionManager: options.interactionManager as never,
      onWaypointDragMove,
      onWaypointDragUp,
      getNode: options.getArrowNode,
      readEndpoints: readArrowEndpoints,
      rebuildArrowSvg,
      showArrowWaypointHandles,
      persistWaypointOverride: options.persistWaypointOverride,
      refreshInspector: refreshSelectedArrowInspector,
      captureOverrideEntries: options.captureOverrideEntries,
      commitOverridePatchAction: options.commitOverridePatchAction,
      transaction: waypointTransaction('waypoint-drag'),
    });
  };

  const addWaypoint = (
    cid: string,
    segmentIndex: number,
    x: number,
    y: number,
  ): void => {
    commitPreviewWaypointInsert({
      cid,
      segmentIndex,
      x,
      y,
      getNode: options.getArrowNode,
      rebuildArrowSvg,
      showArrowWaypointHandles,
      persistWaypointOverride: options.persistWaypointOverride,
      refreshInspector: refreshSelectedArrowInspector,
      captureOverrideEntries: options.captureOverrideEntries,
      commitOverridePatchAction: options.commitOverridePatchAction,
      transaction: waypointTransaction('waypoint-insert'),
    });
  };

  const removeWaypoint = (cid: string, index: number): void => {
    commitPreviewWaypointRemoval({
      cid,
      index,
      getNode: options.getArrowNode,
      rebuildArrowSvg,
      showArrowWaypointHandles,
      persistWaypointOverride: options.persistWaypointOverride,
      refreshInspector: refreshSelectedArrowInspector,
      captureOverrideEntries: options.captureOverrideEntries,
      commitOverridePatchAction: options.commitOverridePatchAction,
      transaction: waypointTransaction('waypoint-remove'),
    });
  };

  return {
    showArrowWaypointHandles,
    startWaypointDrag,
    onWaypointDragMove,
    onWaypointDragUp,
    addWaypoint,
    removeWaypoint,
    getArrowPoints,
    updateArrowVisual,
    rebuildArrowSvg,
  };
}
