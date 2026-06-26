import { describe, expect, it, vi } from 'vitest';
import {
  collectPreviewRecursiveRelayoutEntries,
  completePreviewResizeInteraction,
  dispatchPreviewResizeMoveHost,
  persistPreviewResizeToFrameOverrides,
  restorePreviewPropagatedResizeOverrides,
  startPreviewResizeHost,
} from '../src/preview-shell/app-resize-host.js';

describe('preview resize host helpers', () => {
  it('starts a resize interaction and records the touched override snapshot', () => {
    const actions: unknown[] = [];
    const event = {
      target: {
        getAttribute(name: string) {
          const map: Record<string, string> = {
            'data-resize-cid': 'alpha',
            'data-resize-axis': 'e',
            'data-resize-selection': 'single',
          };
          return map[name] ?? null;
        },
      },
      clientX: 120,
      clientY: 80,
      preventDefault() {
        actions.push('preventDefault');
      },
      stopPropagation() {
        actions.push('stopPropagation');
      },
    };

    const result = startPreviewResizeHost({
      event,
      svg: null,
      selectedIds: new Set(['alpha']),
      hasDiagramGrid: false,
      getNode(id) {
        return id === 'alpha'
          ? { data: { id, width: 120, height: 64 }, children: [] }
          : null;
      },
      getSiblings() {
        return [];
      },
      getAncestors() {
        return [];
      },
      getOwnDelta() {
        return { dx: 4, dy: 2, dw: 0, dh: 0 };
      },
      getEffectiveDelta() {
        return { dx: 4, dy: 2, dw: 0, dh: 0 };
      },
      hasLayoutChildren() {
        return false;
      },
      isAutolayoutChild() {
        return false;
      },
      resolvePrimaryId() {
        return 'alpha';
      },
      minNodeSize: 8,
      captureOverrideEntries(ids) {
        actions.push({ capture: ids });
        return { before: ids };
      },
      startInteraction(state) {
        actions.push({ startInteraction: state });
      },
      addDocumentListener(type, handler) {
        actions.push({ addListener: [type, handler.name] });
      },
      onResizeMove() {},
      onResizeUp() {},
    });

    expect(result).toEqual({ kind: 'started' });
    expect(actions).toEqual([
      { capture: ['alpha'] },
      {
        startInteraction: expect.objectContaining({
          cid: 'alpha',
          axis: 'e',
          startX: 120,
          startY: 80,
          overrideSnapshotBefore: { before: ['alpha'] },
        }),
      },
      { addListener: ['mousemove', 'onResizeMove'] },
      { addListener: ['mouseup', 'onResizeUp'] },
      'preventDefault',
      'stopPropagation',
    ]);
  });

  it('collects recursive resize relayout entries through nested layout children', () => {
    expect(collectPreviewRecursiveRelayoutEntries({
      parentId: 'alpha',
      parentDelta: { dx: 0, dy: 0, dw: 24, dh: 0 },
      relayoutChildren(parentId) {
        if (parentId === 'alpha') {
          return {
            beta: { dx: 12, dy: 0, dw: 0, dh: 0 },
            gamma: { dx: 24, dy: 0, dw: 0, dh: 0 },
          };
        }
        if (parentId === 'beta') {
          return {
            betaChild: { dx: 6, dy: 4, dw: 0, dh: 0 },
          };
        }
        return {};
      },
      hasLayoutChildren(id) {
        return id === 'beta';
      },
    })).toEqual([
      { id: 'beta', dx: 12, dy: 0, dw: 0, dh: 0 },
      { id: 'betaChild', dx: 6, dy: 4, dw: 0, dh: 0 },
      { id: 'gamma', dx: 24, dy: 0, dw: 0, dh: 0 },
    ]);
  });

  it('restores propagated resize overrides from the original interaction snapshot', () => {
    const applied = vi.fn();
    const propagatedIds = new Set(['alpha', 'beta']);

    restorePreviewPropagatedResizeOverrides({
      state: {
        propagatedIds,
        origOverrides: {
          alpha: { dx: 4, dy: 2, dw: 0, dh: 0 },
          beta: { dx: 0, dy: 0, dw: 8, dh: 6 },
        },
      },
      applyInteractionOverrideEntries: applied,
    });

    expect(applied).toHaveBeenCalledWith([
      { id: 'alpha', dx: 4, dy: 2, dw: 0, dh: 0 },
      { id: 'beta', dx: 0, dy: 0, dw: 8, dh: 6 },
    ]);
    expect(propagatedIds.size).toBe(0);
  });

  it('dispatches resize move updates through the host wrapper', () => {
    const actions: unknown[] = [];
    const svg = {
      getAttribute(name: string) {
        return name === 'width' ? '640' : '480';
      },
      querySelectorAll() {
        return [{
          style: { display: '' },
        }];
      },
    } as unknown as SVGSVGElement;

    const result = dispatchPreviewResizeMoveHost({
      state: {
        cid: 'alpha',
        axis: 'e',
        startX: 100,
        startY: 100,
        origDx: 0,
        origDy: 0,
        origDw: 0,
        origDh: 0,
        origOverrides: {
          alpha: { dx: 0, dy: 0, dw: 0, dh: 0 },
        },
        hasMoved: false,
      },
      svg,
      hasDiagramGrid: true,
      clientX: 132,
      clientY: 100,
      gridTargets: { xs: [132], ys: [] },
      snapStep: 8,
      getNode(id) {
        return id === 'alpha'
          ? { data: { x: 20, y: 40, width: 120, height: 64 }, children: [] }
          : null;
      },
      hasLayoutChildrenForId() {
        return false;
      },
      isSelected: true,
      renderGuideLines(lines) {
        actions.push({ renderGuides: lines.length });
      },
      clearGuideLines() {
        actions.push('clearGuides');
      },
      applyInteractionOverrideEntries(entries) {
        actions.push({ applyInteractionEntries: entries });
      },
      applyAllOverrides() {
        actions.push('applyAllOverrides');
      },
      renderSelectionInspector(cid) {
        actions.push({ renderSelectionInspector: cid });
      },
      updateInspector(cid) {
        actions.push({ updateInspector: cid });
      },
      setOverride(cid, patch) {
        actions.push({ setOverride: [cid, patch] });
      },
      relayoutChildren() {
        return {};
      },
      relayoutSiblingsAfterChildResize() {
        return {};
      },
      scheduleV3ResizeRelayout(cid, newW, newH) {
        actions.push({ scheduleRelayout: [cid, newW, newH] });
      },
    });

    expect(result).toEqual({
      kind: 'single',
      moved: true,
      hidHandles: true,
      scheduledRelayout: false,
    });
    expect(actions.some((entry) => (
      typeof entry === 'object'
      && entry !== null
      && 'setOverride' in entry
      && Array.isArray((entry as { setOverride: unknown[] }).setOverride)
      && (entry as { setOverride: unknown[] }).setOverride[0] === 'alpha'
    ))).toBe(true);
    expect(actions).not.toContainEqual({ updateInspector: 'alpha' });
  });

  it('persists resize overrides as fixed sizing and resets temporary deltas', () => {
    const setOverride = vi.fn();
    const requestRelayout = vi.fn();
    const nodes = new Map([
      ['alpha', { data: { width: 120, height: 64 } }],
      ['beta', { data: { width: 80, height: 48 } }],
    ]);

    persistPreviewResizeToFrameOverrides({
      resizeIds: ['alpha', 'beta'],
      propagatedIds: ['beta'],
      triggerCid: 'alpha',
      getNode(cid) {
        return nodes.get(cid) ?? null;
      },
      getOwnDelta(cid) {
        if (cid === 'alpha') return { dw: 24, dh: 16 };
        return { dw: 0, dh: 0 };
      },
      setOverride,
      requestRelayout,
      minSize: 8,
    });

    expect(setOverride).toHaveBeenCalledWith('alpha', {
      dx: 0,
      dy: 0,
      dw: 0,
      dh: 0,
      width: 144,
      height: 80,
      sizing_w: 'FIXED',
      sizing_h: 'FIXED',
    });
    expect(setOverride).toHaveBeenCalledWith('beta', { dx: 0, dy: 0, dw: 0, dh: 0 });
    expect(requestRelayout).toHaveBeenCalledWith('alpha');
  });

  it('persists resize overrides from the drag-start baseline when the rendered size differs from model width', () => {
    const setOverride = vi.fn();
    const requestRelayout = vi.fn();
    const nodes = new Map([
      ['alpha', { data: { width: 288, height: 64 } }],
    ]);

    persistPreviewResizeToFrameOverrides({
      resizeIds: ['alpha'],
      triggerCid: 'alpha',
      baseSizes: {
        alpha: { width: 224, height: 64 },
      },
      getNode(cid) {
        return nodes.get(cid) ?? null;
      },
      getOwnDelta() {
        return { dw: 64, dh: 0 };
      },
      setOverride,
      requestRelayout,
      minSize: 8,
    });

    expect(setOverride).toHaveBeenCalledWith('alpha', {
      dx: 0,
      dy: 0,
      dw: 0,
      dh: 0,
      width: 288,
      sizing_w: 'FIXED',
    });
    expect(requestRelayout).toHaveBeenCalledWith('alpha');
  });

  it('rounds persisted fixed sizes back to integer pixels when rendered baselines are fractional', () => {
    const setOverride = vi.fn();
    const requestRelayout = vi.fn();
    const nodes = new Map([
      ['alpha', { data: { width: 288, height: 80 } }],
    ]);

    persistPreviewResizeToFrameOverrides({
      resizeIds: ['alpha'],
      triggerCid: 'alpha',
      baseSizes: {
        alpha: { width: 223.5, height: 63.5 },
      },
      getNode(cid) {
        return nodes.get(cid) ?? null;
      },
      getOwnDelta() {
        return { dw: 64, dh: 16 };
      },
      setOverride,
      requestRelayout,
      minSize: 8,
    });

    expect(setOverride).toHaveBeenCalledWith('alpha', {
      dx: 0,
      dy: 0,
      dw: 0,
      dh: 0,
      width: 288,
      height: 80,
      sizing_w: 'FIXED',
      sizing_h: 'FIXED',
    });
    expect(requestRelayout).toHaveBeenCalledWith('alpha');
  });

  it('runs resize teardown before dispatching completion callbacks', () => {
    const actions: unknown[] = [];
    const onResizeMove = () => {};
    const onResizeUp = () => {};

    const result = completePreviewResizeInteraction({
      cancelLiveRelayout() {
        actions.push('cancel-live-relayout');
      },
      removeDocumentListener(type, handler) {
        actions.push({ removeListener: [type, handler.name] });
      },
      onResizeMove,
      onResizeUp,
      clearGuideLines() {
        actions.push('clear-guides');
      },
      clearSvgHoverState() {
        actions.push('clear-hover');
      },
      state: {
        hasMoved: true,
        cid: 'primary',
        selectionIds: ['a', 'b'],
        origOverrideIds: ['a', 'b', 'parent'],
        propagatedIds: ['parent'],
        overrideSnapshotBefore: { before: true },
      },
      cleanOverride(id) {
        actions.push({ cleanOverride: id });
      },
      captureOverrideEntries(ids) {
        actions.push({ captureAfter: ids });
        return { after: ids };
      },
      reapplySelection() {
        actions.push('reapply-selection');
      },
      selectComponent(id) {
        actions.push({ selectComponent: id });
      },
      commitOverridePatchAction(label, beforeEntries, afterEntries) {
        actions.push({
          commit: {
            label,
            beforeEntries,
            afterEntries,
          },
        });
      },
      persistResize(resizedIds, propagatedIds, triggerCid) {
        actions.push({
          persistResize: {
            resizedIds,
            propagatedIds: [...(propagatedIds ?? [])],
            triggerCid,
          },
        });
      },
      showHandles() {
        actions.push('show-handles');
      },
      endInteraction() {
        actions.push('end-interaction');
      },
      autoFitArtboard() {
        actions.push('auto-fit-artboard');
      },
    });

    expect(result).toEqual({
      kind: 'commit-resize',
      selectedId: 'primary',
      resizedIds: ['a', 'b'],
      cleanIds: ['a', 'b'],
      propagatedIdsToClean: ['parent'],
      captureAfterIds: ['a', 'b', 'parent'],
      actionLabel: 'Resize selection',
      reapplySelection: true,
      autoFit: true,
    });
    expect(actions).toEqual([
      'cancel-live-relayout',
      { removeListener: ['mousemove', 'onResizeMove'] },
      { removeListener: ['mouseup', 'onResizeUp'] },
      'clear-guides',
      'clear-hover',
      { cleanOverride: 'a' },
      { cleanOverride: 'b' },
      { cleanOverride: 'parent' },
      { captureAfter: ['a', 'b', 'parent'] },
      'reapply-selection',
      {
        commit: {
          label: 'Resize selection',
          beforeEntries: { before: true },
          afterEntries: { after: ['a', 'b', 'parent'] },
        },
      },
      {
        persistResize: {
          resizedIds: ['a', 'b'],
          propagatedIds: ['parent'],
          triggerCid: 'primary',
        },
      },
      'end-interaction',
      'auto-fit-artboard',
    ]);
  });

  it('accepts the live resize interaction state without a JS-side copy wrapper', () => {
    const persisted: Array<Record<string, unknown>> = [];

    const result = completePreviewResizeInteraction({
      cancelLiveRelayout() {},
      removeDocumentListener() {},
      onResizeMove() {},
      onResizeUp() {},
      clearGuideLines() {},
      clearSvgHoverState() {},
      state: {
        hasMoved: true,
        cid: 'alpha',
        selection: { ids: ['alpha', 'beta'] },
        origOverrides: {
          alpha: { dw: 16 },
          beta: { dx: 8 },
        },
        propagatedIds: new Set(['beta']),
        overrideSnapshotBefore: { before: true },
        axis: 'e',
        startX: 10,
        startY: 20,
      },
      cleanOverride() {},
      captureOverrideEntries(ids) {
        return ids;
      },
      reapplySelection() {},
      selectComponent() {},
      commitOverridePatchAction() {},
      persistResize(resizedIds, propagatedIds, triggerCid) {
        persisted.push({
          resizedIds,
          propagatedIds: [...(propagatedIds ?? [])],
          triggerCid,
        });
      },
      showHandles() {},
      endInteraction() {},
      autoFitArtboard() {},
    });

    expect(result).toEqual({
      kind: 'commit-resize',
      selectedId: 'alpha',
      resizedIds: ['alpha', 'beta'],
      cleanIds: ['alpha', 'beta'],
      propagatedIdsToClean: ['beta'],
      captureAfterIds: ['alpha', 'beta'],
      actionLabel: 'Resize selection',
      reapplySelection: true,
      autoFit: true,
    });
    expect(persisted).toEqual([
      {
        resizedIds: ['alpha', 'beta'],
        propagatedIds: ['beta'],
        triggerCid: 'alpha',
      },
    ]);
  });
});
