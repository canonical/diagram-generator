import { describe, expect, it, vi } from 'vitest';
import {
  clampPreviewDragDeltaWithinParent,
  completePreviewDragInteraction,
  dispatchPreviewDragMoveHost,
  startPreviewPointerInteractionHost,
} from '../src/preview-shell/app-drag-host.js';

describe('preview drag host helpers', () => {
  it('starts a drag interaction through pointer-selection host wiring', () => {
    const actions: unknown[] = [];
    const svg = {
      createSVGPoint() {
        return {
          x: 0,
          y: 0,
          matrixTransform() {
            return { x: 120, y: 80 };
          },
        };
      },
      getScreenCTM() {
        return {
          inverse() {
            return {};
          },
        };
      },
    };

    const result = startPreviewPointerInteractionHost({
      event: {
        target: {
          classList: {
            contains() {
              return false;
            },
          },
        },
        button: 0,
        clientX: 120,
        clientY: 80,
        preventDefault() {
          actions.push('preventDefault');
        },
      },
      svg,
      currentSelectionDepth: 0,
      selectedIds: new Set<string>(),
      commitTextEditIfActive() {
        actions.push('commitTextEditIfActive');
      },
      startResize() {
        actions.push('startResize');
      },
      findArrowAtPoint() {
        return null;
      },
      findDeepestComponent() {
        return null;
      },
      findComponentAtDepth(_x, _y, depth) {
        return depth === 0 ? 'alpha' : null;
      },
      getAncestors() {
        return [];
      },
      deselectAll() {
        actions.push('deselectAll');
      },
      setSelectionDepth(depth) {
        actions.push({ setSelectionDepth: depth });
      },
      selectComponent(id, additive) {
        actions.push({ selectComponent: [id, additive] });
      },
      getOwnDelta() {
        return { dx: 0, dy: 0 };
      },
      collectSnapTargets() {
        return null;
      },
      isAutolayoutChild() {
        return false;
      },
      captureOverrideEntries(ids) {
        actions.push({ captureOverrideEntries: ids });
        return { before: ids };
      },
      startDragInteraction(state) {
        actions.push({ startDragInteraction: state });
      },
      addDocumentListener(type, handler) {
        actions.push({ addListener: [type, handler.name] });
      },
      onDragMove() {},
      onDragUp() {},
    });

    expect(result).toEqual({ kind: 'drag-start' });
    expect(actions).toEqual([
      'commitTextEditIfActive',
      { captureOverrideEntries: ['alpha'] },
      {
        startDragInteraction: expect.objectContaining({
          cid: 'alpha',
          cids: ['alpha'],
          overrideSnapshotBefore: { before: ['alpha'] },
        }),
      },
      { addListener: ['mousemove', 'onDragMove'] },
      { addListener: ['mouseup', 'onDragUp'] },
      'preventDefault',
    ]);
  });

  it('clamps drag deltas to the padded parent bounds', () => {
    const parent = {
      id: 'parent',
      x: 100,
      y: 200,
      width: 300,
      height: 180,
      type: 'Box',
    };
    const node = {
      x: 140,
      y: 240,
      width: 80,
      height: 40,
      type: 'Box',
    };

    expect(clampPreviewDragDeltaWithinParent({
      cid: 'child',
      proposedDx: -80,
      proposedDy: -80,
      inset: 8,
      getParentNode() {
        return parent;
      },
      getComponentNode() {
        return node;
      },
      getOwnDelta(cid) {
        return cid === 'parent'
          ? { dw: 16, dh: 8 }
          : { dw: 24, dh: 16 };
      },
      getEffectiveDelta() {
        return { dx: 12, dy: 20 };
      },
    })).toEqual({
      dx: -20,
      dy: -12,
    });

    expect(clampPreviewDragDeltaWithinParent({
      cid: 'child',
      proposedDx: 300,
      proposedDy: 220,
      inset: 8,
      getParentNode() {
        return parent;
      },
      getComponentNode() {
        return node;
      },
      getOwnDelta(cid) {
        return cid === 'parent'
          ? { dw: 16, dh: 8 }
          : { dw: 24, dh: 16 };
      },
      getEffectiveDelta() {
        return { dx: 12, dy: 20 };
      },
    })).toEqual({
      dx: 176,
      dy: 104,
    });
  });

  it('runs drag teardown before dispatching completion callbacks', () => {
    const actions: unknown[] = [];
    const onDragMove = () => {};
    const onDragUp = () => {};

    const result = completePreviewDragInteraction({
      removeDocumentListener(type, handler) {
        actions.push({ removeListener: [type, handler.name] });
      },
      onDragMove,
      onDragUp,
      clearGuideLines() {
        actions.push('clear-guides');
      },
      clearReorderIndicator() {
        actions.push('clear-reorder');
      },
      state: {
        hasMoved: true,
        autolayout: false,
        cid: 'alpha',
        cids: ['alpha', 'beta'],
        reorderTarget: null,
        overrideSnapshotBefore: { before: true },
      },
      applyReorder(parentId, cid, insertIndex) {
        actions.push({ applyReorder: [parentId, cid, insertIndex] });
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
      endInteraction() {
        actions.push('end-interaction');
      },
      autoFitArtboard() {
        actions.push('auto-fit-artboard');
      },
    });

    expect(result).toEqual({
      kind: 'commit-free-drag',
      selectedId: 'alpha',
      cleanIds: ['alpha', 'beta'],
      captureAfterIds: ['alpha', 'beta'],
      actionLabel: 'Move selection',
      reapplySelection: true,
      autoFit: true,
    });
    expect(actions).toEqual([
      { removeListener: ['mousemove', 'onDragMove'] },
      { removeListener: ['mouseup', 'onDragUp'] },
      'clear-guides',
      'clear-reorder',
      { cleanOverride: 'alpha' },
      { cleanOverride: 'beta' },
      { captureAfter: ['alpha', 'beta'] },
      'reapply-selection',
      {
        commit: {
          label: 'Move selection',
          beforeEntries: { before: true },
          afterEntries: { after: ['alpha', 'beta'] },
        },
      },
      'end-interaction',
      'auto-fit-artboard',
    ]);
  });

  it('resolves autolayout drag context and dispatches drag move through the host wrapper', () => {
    const actions: unknown[] = [];
    const svg = {
      createSVGPoint() {
        return {
          x: 0,
          y: 0,
          matrixTransform() {
            return { x: 160, y: 80 };
          },
        };
      },
      getScreenCTM() {
        return {
          inverse() {
            return {};
          },
        };
      },
    } as unknown as SVGSVGElement;

    const result = dispatchPreviewDragMoveHost({
      state: {
        cid: 'alpha',
        cids: ['alpha'],
        startX: 10,
        startY: 20,
        hasMoved: true,
        autolayout: true,
        origDeltas: {},
      },
      svg,
      clientX: 160,
      clientY: 80,
      getParentNodeForAutolayout() {
        return {
          data: { id: 'parent', layout: 'VERTICAL' },
          children: [
            { data: { id: 'alpha', x: 0, y: 0, width: 40, height: 20 } },
            { data: { id: 'beta', x: 0, y: 40, width: 40, height: 20 } },
          ],
        };
      },
      snapStep: 8,
      showReorderIndicator(parentId, insertIndex, isVertical) {
        actions.push({ showReorderIndicator: [parentId, insertIndex, isVertical] });
      },
      clearReorderIndicator() {
        actions.push('clearReorderIndicator');
      },
      renderGuideLines() {
        actions.push('renderGuideLines');
      },
      clampDragDelta() {
        return { dx: 0, dy: 0 };
      },
      setOverride() {
        actions.push('setOverride');
      },
      applyAllOverrides() {
        actions.push('applyAllOverrides');
      },
      updateInspector() {
        actions.push('updateInspector');
      },
      shouldUpdateInspector: true,
    });

    expect(result.kind).toBe('autolayout');
    expect(result.moved).toBe(true);
    expect(actions).toEqual([
      { showReorderIndicator: ['parent', 2, false] },
    ]);
  });
});
