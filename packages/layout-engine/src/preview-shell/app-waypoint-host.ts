import {
  bindPreviewArrowSegmentInsertHandles,
  createPreviewWaypointDragState,
  insertPreviewWaypoint,
  prunePreviewCollinearWaypoints,
  renderPreviewArrowWaypointHandles,
  removePreviewWaypoint as removePreviewWaypointAtIndex,
  type PreviewArrowEndpoints,
  type PreviewArrowDelta,
  type PreviewArrowPoint,
  type PreviewWaypointDragMoveResolution,
  type PreviewWaypointDragState,
  resolvePreviewWaypointDragMove,
} from './app-arrow-waypoints.js';

/**
 * Preview waypoint host helpers (spec 043 shell coordinator slice O2).
 *
 * These helpers keep waypoint mutation commit flow and drag-end cleanup in
 * TypeScript so `editor.js` only wires browser events and live model access.
 */

export interface PreviewWaypointHostNode {
  waypoints?: PreviewArrowPoint[] | null;
}

export interface PreviewWaypointOverrideSnapshot {
  [key: string]: unknown;
}

export interface PreviewWaypointHandleRenderSvgLike {
  querySelectorAll: (selector: string) => ArrayLike<{ remove: () => void }>;
}

export interface RenderPreviewWaypointHandlesHostOptions {
  svg?: SVGSVGElement | null;
  componentId: string;
  waypoints: PreviewArrowPoint[];
  delta: PreviewArrowDelta;
  isSelected: boolean;
  onAddWaypoint: (segmentIndex: number, x: number, y: number) => void;
  onHandleMouseDown: (event: MouseEvent) => void;
  onHandleDoubleClick: (index: number) => void;
}

export interface PreviewWaypointDragHostEvent {
  target: {
    getAttribute: (name: string) => string | null;
  };
  clientX: number;
  clientY: number;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export interface StartPreviewWaypointDragHostOptions {
  event: PreviewWaypointDragHostEvent;
  getNode: (cid: string) => PreviewWaypointHostNode | null | undefined;
  startInteraction: (state: PreviewWaypointDragState) => void;
  addDocumentListener: (
    type: 'mousemove' | 'mouseup',
    handler: ((event?: any) => void),
  ) => void;
  onWaypointDragMove: (event?: any) => void;
  onWaypointDragUp: (event?: any) => void;
}

export interface DispatchPreviewWaypointDragMoveHostOptions {
  state?: PreviewWaypointDragState | null;
  clientX: number;
  clientY: number;
  getNode: (cid: string) => PreviewWaypointHostNode | null | undefined;
  readEndpoints: (cid: string) => PreviewArrowEndpoints | null;
  updateArrowVisual: (cid: string) => void;
}

export interface CompletePreviewWaypointDragInteractionOptions {
  state?: PreviewWaypointDragState | null;
  removeDocumentListener: (
    type: 'mousemove' | 'mouseup',
    handler: ((event?: any) => void),
  ) => void;
  onWaypointDragMove: (event?: any) => void;
  onWaypointDragUp: (event?: any) => void;
  getNode: (cid: string) => PreviewWaypointHostNode | null | undefined;
  readEndpoints: (cid: string) => PreviewArrowEndpoints | null;
  rebuildArrowSvg: (cid: string) => void;
  showArrowWaypointHandles: (cid: string) => void;
  persistWaypointOverride: (cid: string) => void;
  refreshInspector: (cid: string) => void;
  captureOverrideEntries: (ids: string[]) => PreviewWaypointOverrideSnapshot;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: PreviewWaypointOverrideSnapshot,
    afterEntries: PreviewWaypointOverrideSnapshot,
  ) => void;
  endInteraction: () => void;
}

export interface CommitPreviewWaypointInsertOptions {
  cid: string;
  segmentIndex: number;
  x: number;
  y: number;
  getNode: (cid: string) => PreviewWaypointHostNode | null | undefined;
  rebuildArrowSvg: (cid: string) => void;
  showArrowWaypointHandles: (cid: string) => void;
  persistWaypointOverride: (cid: string) => void;
  refreshInspector: (cid: string) => void;
  captureOverrideEntries: (ids: string[]) => PreviewWaypointOverrideSnapshot;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: PreviewWaypointOverrideSnapshot,
    afterEntries: PreviewWaypointOverrideSnapshot,
  ) => void;
}

export interface CommitPreviewWaypointRemovalOptions {
  cid: string;
  index: number;
  getNode: (cid: string) => PreviewWaypointHostNode | null | undefined;
  rebuildArrowSvg: (cid: string) => void;
  showArrowWaypointHandles: (cid: string) => void;
  persistWaypointOverride: (cid: string) => void;
  refreshInspector: (cid: string) => void;
  captureOverrideEntries: (ids: string[]) => PreviewWaypointOverrideSnapshot;
  commitOverridePatchAction: (
    label: string,
    beforeEntries: PreviewWaypointOverrideSnapshot,
    afterEntries: PreviewWaypointOverrideSnapshot,
  ) => void;
}

export interface PreviewWaypointHostResult {
  kind: 'noop' | 'committed';
  cid: string | null;
}

export interface PreviewWaypointDragHostResult {
  kind: 'noop' | 'started' | 'moved';
  cid: string | null;
}

function cloneWaypoints(waypoints: PreviewArrowPoint[] | null | undefined): PreviewArrowPoint[] {
  return Array.isArray(waypoints)
    ? waypoints.map((point) => [...point] as PreviewArrowPoint)
    : [];
}

export function renderPreviewWaypointHandlesHost(
  options: RenderPreviewWaypointHandlesHostOptions,
): boolean {
  const svg = options.svg;
  if (!svg) {
    return false;
  }

  svg.querySelectorAll('.dg-wp-handle').forEach((handle) => handle.remove());
  svg.querySelectorAll('.dg-wp-add').forEach((handle) => handle.remove());

  bindPreviewArrowSegmentInsertHandles({
    svg,
    componentId: options.componentId,
    delta: options.delta,
    isSelected: options.isSelected,
    onAddWaypoint: options.onAddWaypoint,
  });

  if (options.waypoints.length === 0) {
    return true;
  }

  renderPreviewArrowWaypointHandles({
    svg,
    componentId: options.componentId,
    waypoints: options.waypoints,
    delta: options.delta,
    onHandleMouseDown: options.onHandleMouseDown,
    onHandleDoubleClick: (index) => {
      options.onHandleDoubleClick(index);
    },
  });
  return true;
}

export function startPreviewWaypointDragHost(
  options: StartPreviewWaypointDragHostOptions,
): PreviewWaypointDragHostResult {
  const cid = options.event.target.getAttribute('data-wp-cid') || '';
  const idx = Number.parseInt(options.event.target.getAttribute('data-wp-idx') || '', 10);
  const node = options.getNode(cid);
  if (!node || !node.waypoints || !node.waypoints[idx]) {
    return {
      kind: 'noop',
      cid: cid || null,
    };
  }

  options.startInteraction(createPreviewWaypointDragState({
    cid,
    index: idx,
    startX: options.event.clientX,
    startY: options.event.clientY,
    origX: node.waypoints[idx]![0],
    origY: node.waypoints[idx]![1],
  }));
  options.addDocumentListener('mousemove', options.onWaypointDragMove);
  options.addDocumentListener('mouseup', options.onWaypointDragUp);
  options.event.preventDefault();
  options.event.stopPropagation();

  return {
    kind: 'started',
    cid,
  };
}

export function dispatchPreviewWaypointDragMoveHost(
  options: DispatchPreviewWaypointDragMoveHostOptions,
): PreviewWaypointDragHostResult {
  const state = options.state ?? null;
  if (!state) {
    return {
      kind: 'noop',
      cid: null,
    };
  }

  const node = options.getNode(state.cid);
  if (!node || !node.waypoints) {
    return {
      kind: 'noop',
      cid: state.cid,
    };
  }

  const move: PreviewWaypointDragMoveResolution = resolvePreviewWaypointDragMove({
    state,
    clientX: options.clientX,
    clientY: options.clientY,
    endpoints: options.readEndpoints(state.cid),
    waypoints: node.waypoints,
  });
  state.hasMoved = move.hasMoved;
  state.axis = move.axis;
  if (!move.hasMoved || !move.waypoint) {
    return {
      kind: 'noop',
      cid: state.cid,
    };
  }

  node.waypoints[state.idx] = move.waypoint;
  options.updateArrowVisual(state.cid);
  return {
    kind: 'moved',
    cid: state.cid,
  };
}

export function completePreviewWaypointDragInteraction(
  options: CompletePreviewWaypointDragInteractionOptions,
): PreviewWaypointHostResult {
  options.removeDocumentListener('mousemove', options.onWaypointDragMove);
  options.removeDocumentListener('mouseup', options.onWaypointDragUp);

  const state = options.state ?? null;
  if (!state?.hasMoved) {
    options.endInteraction();
    return {
      kind: 'noop',
      cid: state?.cid ?? null,
    };
  }

  const node = options.getNode(state.cid);
  const currentWaypoints = cloneWaypoints(node?.waypoints);
  const waypointIds = [state.cid];
  const beforeEntries = options.captureOverrideEntries(waypointIds);
  const pruned = prunePreviewCollinearWaypoints({
    waypoints: currentWaypoints,
    endpoints: options.readEndpoints(state.cid),
  });

  if (pruned.changed && node) {
    node.waypoints = pruned.waypoints;
    options.rebuildArrowSvg(state.cid);
    options.showArrowWaypointHandles(state.cid);
  }

  options.persistWaypointOverride(state.cid);
  options.refreshInspector(state.cid);
  options.commitOverridePatchAction(
    'Move waypoint',
    beforeEntries,
    options.captureOverrideEntries(waypointIds),
  );
  options.endInteraction();

  return {
    kind: 'committed',
    cid: state.cid,
  };
}

export function commitPreviewWaypointInsert(
  options: CommitPreviewWaypointInsertOptions,
): PreviewWaypointHostResult {
  const node = options.getNode(options.cid);
  if (!node) {
    return {
      kind: 'noop',
      cid: options.cid,
    };
  }

  const waypointIds = [options.cid];
  const beforeEntries = options.captureOverrideEntries(waypointIds);
  node.waypoints = insertPreviewWaypoint(
    cloneWaypoints(node.waypoints),
    options.segmentIndex,
    options.x,
    options.y,
  );
  options.rebuildArrowSvg(options.cid);
  options.showArrowWaypointHandles(options.cid);
  options.persistWaypointOverride(options.cid);
  options.refreshInspector(options.cid);
  options.commitOverridePatchAction(
    'Add waypoint',
    beforeEntries,
    options.captureOverrideEntries(waypointIds),
  );

  return {
    kind: 'committed',
    cid: options.cid,
  };
}

export function commitPreviewWaypointRemoval(
  options: CommitPreviewWaypointRemovalOptions,
): PreviewWaypointHostResult {
  const node = options.getNode(options.cid);
  const nextWaypoints = removePreviewWaypointAtIndex(
    cloneWaypoints(node?.waypoints),
    options.index,
  );
  if (!node || !nextWaypoints) {
    return {
      kind: 'noop',
      cid: options.cid,
    };
  }

  const waypointIds = [options.cid];
  const beforeEntries = options.captureOverrideEntries(waypointIds);
  node.waypoints = nextWaypoints;
  options.rebuildArrowSvg(options.cid);
  options.showArrowWaypointHandles(options.cid);
  options.persistWaypointOverride(options.cid);
  options.refreshInspector(options.cid);
  options.commitOverridePatchAction(
    'Remove waypoint',
    beforeEntries,
    options.captureOverrideEntries(waypointIds),
  );

  return {
    kind: 'committed',
    cid: options.cid,
  };
}
