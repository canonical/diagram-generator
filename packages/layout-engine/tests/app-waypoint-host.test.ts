import { describe, expect, it } from 'vitest';
import {
  commitPreviewWaypointInsert,
  commitPreviewWaypointRemoval,
  completePreviewWaypointDragInteraction,
  dispatchPreviewWaypointDragMoveHost,
  renderPreviewWaypointHandlesHost,
  startPreviewWaypointDragHost,
} from '../src/preview-shell/app-waypoint-host.js';

describe('preview waypoint host helpers', () => {
  it('renders waypoint handles and starts drag wiring through the host helpers', () => {
    const actions: unknown[] = [];
    const svg = {
      querySelectorAll(selector: string) {
        if (selector === '.dg-wp-handle' || selector === '.dg-wp-add') {
          return [{ remove() { actions.push({ removed: selector }); } }];
        }
        return [];
      },
      ownerDocument: {
        createElementNS() {
          return {
            setAttribute() {},
            addEventListener() {},
          };
        },
      },
      appendChild() {
        actions.push('appendChild');
      },
    } as unknown as SVGSVGElement;

    expect(renderPreviewWaypointHandlesHost({
      svg,
      componentId: 'arrow-1',
      waypoints: [[10, 20]],
      delta: { dx: 4, dy: 8 },
      isSelected: true,
      onAddWaypoint(segmentIndex, x, y) {
        actions.push({ addWaypoint: [segmentIndex, x, y] });
      },
      onHandleMouseDown() {},
      onHandleDoubleClick(index) {
        actions.push({ removeWaypoint: index });
      },
    })).toBe(true);
    expect(actions).toContain('appendChild');

    actions.length = 0;
    expect(startPreviewWaypointDragHost({
      event: {
        target: {
          getAttribute(name: string) {
            const map: Record<string, string> = {
              'data-wp-cid': 'arrow-1',
              'data-wp-idx': '0',
            };
            return map[name] ?? null;
          },
        },
        clientX: 100,
        clientY: 140,
        preventDefault() {
          actions.push('preventDefault');
        },
        stopPropagation() {
          actions.push('stopPropagation');
        },
      },
      getNode() {
        return { waypoints: [[10, 20]] };
      },
      startInteraction(state) {
        actions.push({ startInteraction: state });
      },
      addDocumentListener(type, handler) {
        actions.push({ addListener: [type, handler.name] });
      },
      onWaypointDragMove() {},
      onWaypointDragUp() {},
    })).toEqual({
      kind: 'started',
      cid: 'arrow-1',
    });
    expect(actions).toEqual([
      {
        startInteraction: {
          cid: 'arrow-1',
          idx: 0,
          startX: 100,
          startY: 140,
          origX: 10,
          origY: 20,
          hasMoved: false,
          axis: null,
        },
      },
      { addListener: ['mousemove', 'onWaypointDragMove'] },
      { addListener: ['mouseup', 'onWaypointDragUp'] },
      'preventDefault',
      'stopPropagation',
    ]);
  });

  it('updates waypoint drag state and arrow visuals through the host wrapper', () => {
    const actions: unknown[] = [];
    const state = {
      cid: 'arrow-1',
      idx: 0,
      startX: 0,
      startY: 0,
      origX: 8,
      origY: 8,
      hasMoved: false,
      axis: null as 'x' | 'y' | 'free' | null,
    };
    const node = {
      waypoints: [[8, 8]] as [number, number][],
    };

    expect(dispatchPreviewWaypointDragMoveHost({
      state,
      clientX: 21,
      clientY: 0,
      getNode() {
        return node;
      },
      readEndpoints() {
        return {
          start: [8, 0],
          end: [8, 40],
        };
      },
      updateArrowVisual(cid) {
        actions.push({ updateArrowVisual: cid, waypoints: [...node.waypoints] });
      },
    })).toEqual({
      kind: 'moved',
      cid: 'arrow-1',
    });
    expect(node.waypoints).toEqual([[32, 8]]);
    expect(actions).toEqual([
      { updateArrowVisual: 'arrow-1', waypoints: [[32, 8]] },
    ]);
  });

  it('tears down waypoint drag and commits the pruned waypoint override', () => {
    const actions: unknown[] = [];
    const transactions: unknown[] = [];
    const node = {
      waypoints: [[20, 0], [40, 0]] as [number, number][],
    };
    const onWaypointDragMove = () => {};
    const onWaypointDragUp = () => {};

    const result = completePreviewWaypointDragInteraction({
      removeDocumentListener(type, handler) {
        actions.push({ removeListener: [type, handler.name] });
      },
      onWaypointDragMove,
      onWaypointDragUp,
      state: {
        cid: 'arrow-1',
        idx: 1,
        startX: 0,
        startY: 0,
        origX: 40,
        origY: 0,
        hasMoved: true,
        axis: 'free',
      },
      getNode() {
        return node;
      },
      readEndpoints() {
        return {
          start: [0, 0],
          end: [60, 0],
        };
      },
      rebuildArrowSvg(cid) {
        actions.push({ rebuildArrowSvg: cid });
      },
      showArrowWaypointHandles(cid) {
        actions.push({ showArrowWaypointHandles: cid });
      },
      persistWaypointOverride(cid) {
        expect(transactions).toHaveLength(1);
        actions.push({ persistWaypointOverride: cid, waypoints: node.waypoints });
      },
      refreshInspector(cid) {
        actions.push({ refreshInspector: cid });
      },
      captureOverrideEntries(ids) {
        return { ids };
      },
      commitOverridePatchAction(label, beforeEntries, afterEntries) {
        actions.push({ commit: { label, beforeEntries, afterEntries } });
      },
      endInteraction() {
        actions.push('endInteraction');
      },
      transaction: {
        activeEngineId: 'v3',
        documentKind: 'frame-diagram',
        onMutationTransaction(result) {
          transactions.push(result);
        },
      },
    });

    expect(result).toEqual({
      kind: 'committed',
      cid: 'arrow-1',
    });
    expect(node.waypoints).toEqual([]);
    expect(transactions).toEqual([
      expect.objectContaining({
        kind: 'committed',
        mutationKind: 'waypoint',
        sourceControl: 'waypoint-drag',
        activeEngineId: 'v3',
        documentKind: 'frame-diagram',
        relayoutPolicy: 'local',
        dirtyPolicy: 'mark-dirty',
        undoPolicy: 'record',
      }),
    ]);
    expect(actions).toEqual([
      { removeListener: ['mousemove', 'onWaypointDragMove'] },
      { removeListener: ['mouseup', 'onWaypointDragUp'] },
      { rebuildArrowSvg: 'arrow-1' },
      { showArrowWaypointHandles: 'arrow-1' },
      { persistWaypointOverride: 'arrow-1', waypoints: [] },
      { refreshInspector: 'arrow-1' },
      {
        commit: {
          label: 'Move waypoint',
          beforeEntries: { ids: ['arrow-1'] },
          afterEntries: { ids: ['arrow-1'] },
        },
      },
      'endInteraction',
    ]);
  });

  it('commits add/remove waypoint mutations through host callbacks', () => {
    const actions: unknown[] = [];
    const transactions: unknown[] = [];
    const node = {
      waypoints: [[8, 8]] as [number, number][],
    };

    const shared = {
      getNode() {
        return node;
      },
      rebuildArrowSvg(cid: string) {
        actions.push({ rebuildArrowSvg: cid, waypoints: [...node.waypoints] });
      },
      showArrowWaypointHandles(cid: string) {
        actions.push({ showArrowWaypointHandles: cid, waypoints: [...node.waypoints] });
      },
      persistWaypointOverride(cid: string) {
        expect(transactions.length).toBeGreaterThan(0);
        actions.push({ persistWaypointOverride: cid, waypoints: [...node.waypoints] });
      },
      refreshInspector(cid: string) {
        actions.push({ refreshInspector: cid });
      },
      captureOverrideEntries(ids: string[]) {
        return { ids };
      },
      commitOverridePatchAction(label: string, beforeEntries: unknown, afterEntries: unknown) {
        actions.push({ commit: { label, beforeEntries, afterEntries } });
      },
      transaction: {
        activeEngineId: 'v3',
        documentKind: 'frame-diagram',
        onMutationTransaction(result) {
          transactions.push(result);
        },
      },
    };

    expect(commitPreviewWaypointInsert({
      cid: 'arrow-1',
      segmentIndex: 1,
      x: 22,
      y: 30,
      ...shared,
    })).toEqual({
      kind: 'committed',
      cid: 'arrow-1',
    });
    expect(node.waypoints).toEqual([[8, 8], [24, 32]]);

    expect(commitPreviewWaypointRemoval({
      cid: 'arrow-1',
      index: 0,
      ...shared,
    })).toEqual({
      kind: 'committed',
      cid: 'arrow-1',
    });
    expect(node.waypoints).toEqual([[24, 32]]);
    expect(transactions).toEqual([
      expect.objectContaining({
        kind: 'committed',
        mutationKind: 'waypoint',
        sourceControl: 'waypoint-insert',
        activeEngineId: 'v3',
        documentKind: 'frame-diagram',
        relayoutPolicy: 'local',
        dirtyPolicy: 'mark-dirty',
        undoPolicy: 'record',
      }),
      expect.objectContaining({
        kind: 'committed',
        mutationKind: 'waypoint',
        sourceControl: 'waypoint-remove',
        activeEngineId: 'v3',
        documentKind: 'frame-diagram',
        relayoutPolicy: 'local',
        dirtyPolicy: 'mark-dirty',
        undoPolicy: 'record',
      }),
    ]);

    expect(actions).toEqual([
      { rebuildArrowSvg: 'arrow-1', waypoints: [[8, 8], [24, 32]] },
      { showArrowWaypointHandles: 'arrow-1', waypoints: [[8, 8], [24, 32]] },
      { persistWaypointOverride: 'arrow-1', waypoints: [[8, 8], [24, 32]] },
      { refreshInspector: 'arrow-1' },
      {
        commit: {
          label: 'Add waypoint',
          beforeEntries: { ids: ['arrow-1'] },
          afterEntries: { ids: ['arrow-1'] },
        },
      },
      { rebuildArrowSvg: 'arrow-1', waypoints: [[24, 32]] },
      { showArrowWaypointHandles: 'arrow-1', waypoints: [[24, 32]] },
      { persistWaypointOverride: 'arrow-1', waypoints: [[24, 32]] },
      { refreshInspector: 'arrow-1' },
      {
        commit: {
          label: 'Remove waypoint',
          beforeEntries: { ids: ['arrow-1'] },
          afterEntries: { ids: ['arrow-1'] },
        },
      },
    ]);
  });
});
