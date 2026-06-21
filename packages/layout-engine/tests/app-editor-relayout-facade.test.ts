import { describe, expect, it, vi } from 'vitest';
import {
  createPreviewEditorRelayoutFacadeFromEditorHost,
  createPreviewEditorRelayoutFacadeFromRuntime,
} from '../src/preview-shell/app-editor-relayout-facade.js';

describe('preview editor relayout facade', () => {
  it('composes relayout, restore, and live-resize runtimes behind one typed host seam', async () => {
    const events: string[] = [];
    const performLocalRelayout = vi.fn(() => ({ coerced: null }));
    const model = {
      roots: [{ id: 'root' }],
      gridOverrides: { cols: 4 },
      layoutOverrides: {},
      elkLayoutOverrides: {},
      removedIds: new Set<string>(),
      get() {
        return {
          type: 'box',
          data: { width: 200, height: 120 },
        };
      },
      clearOverride() {
        events.push('clearOverride');
      },
      cleanOverride() {
        events.push('cleanOverride');
      },
    };
    const facade = createPreviewEditorRelayoutFacadeFromEditorHost({
      getOverrides: () => ({ alpha: { waypoints: [[24, 32]] } }),
      coercedKeys: new Set<string>(),
      model,
      editorState: {
        cloneValue: <T>(value: T) => value,
        captureOverrideEntries: () => ({ alpha: { waypoints: [[24, 32]] } }),
        serializeDirtyState: () => '{"ok":true}',
        normalizeGridOverrides: (value) => value,
        commitOverridePatchAction() {},
      },
      previewBridgeHost: {
        performLocalRelayout,
        setFrameTreeJson() {
          events.push('setFrameTreeJson');
        },
      },
      selectedIds: new Set<string>(['alpha']),
      getLocalRelayoutStatus: () => ({ ready: true, reason: 'ready' }),
      isEngineLayoutActive: () => false,
      hasRelayoutFrameOverride: (entry) => Boolean(entry && typeof entry === 'object' && 'gap' in entry),
      replaceOverrides() {
        events.push('replaceOverrides');
      },
      pruneLinkedRootOverrides() {
        events.push('pruneLinkedRootOverrides');
      },
      clearPendingRuntime() {
        events.push('clearPendingRuntime');
      },
      rerenderStageFromModel: async () => {
        events.push('rerenderStageFromModel');
      },
      applyLocalRefresh() {
        events.push('applyLocalRefresh');
      },
      syncGridControls() {
        events.push('syncGridControls');
      },
      syncDirtyFromSerialized() {
        events.push('syncDirtyFromSerialized');
      },
      buildTreeUi() {
        events.push('buildTreeUi');
      },
      applyWaypointOverrides() {
        events.push('applyWaypointOverrides');
      },
      bindInteraction() {
        events.push('bindInteraction');
      },
      applyAllOverrides() {
        events.push('applyAllOverrides');
      },
      reapplySelection() {
        events.push('reapplySelection');
      },
      refreshGridInfo() {
        events.push('refreshGridInfo');
      },
      renderGridOverlay() {
        events.push('renderGridOverlay');
      },
      renderSelectionInspector() {
        events.push('renderSelectionInspector');
      },
      updateOverrideSummary() {
        events.push('updateOverrideSummary');
      },
      refreshTreeColors() {
        events.push('refreshTreeColors');
      },
      runConstraints() {
        events.push('runConstraints');
      },
      setStatus() {},
      logError() {},
      setDirty() {
        events.push('setDirty');
      },
      updateInspector() {
        events.push('updateInspector');
      },
      reloadTreeAfterArrowRestore: async () => {
        events.push('reloadTreeAfterArrowRestore');
      },
      rebuildArrowSvg() {
        events.push('rebuildArrowSvg');
      },
      getOwnDelta() {
        return { dw: 0, dh: 0 };
      },
      setOverride() {
        events.push('setOverride');
      },
      requestAnimationFrameFn(callback) {
        callback();
        return 1;
      },
      cancelAnimationFrameFn() {},
    });

    expect(facade.getLayoutRelayoutStatus()).toMatchObject({
      localReady: true,
      local: { reason: 'ready' },
      sequence: 0,
    });
    expect(facade.getRelayoutRuntime()).toBe(facade.getRelayoutRuntime());
    expect(facade.getStateRestoreRuntime()).toBe(facade.getStateRestoreRuntime());
    expect(facade.getLiveResizeRuntime()).toBe(facade.getLiveResizeRuntime());

    await facade.getRelayoutRuntime().requestRelayout('alpha');
    await facade.applyUndoCommand({
      kind: 'override-patch',
      beforeEntries: { alpha: { gap: 12 } },
      afterEntries: { note: { text: ['after'] } },
    }, 'redo');

    expect(performLocalRelayout).toHaveBeenCalledWith(
      model,
      { alpha: { waypoints: [[24, 32]] } },
      { cols: 4 },
    );
    expect(facade.layoutRuntimeState.sequence).toBe(1);
    expect(events).toContain('buildTreeUi');
    expect(events).toContain('applyWaypointOverrides');
    expect(events).toContain('bindInteraction');
    expect(events).toContain('replaceOverrides');
    expect(events).toContain('cleanOverride');
    expect(events).toContain('applyLocalRefresh');
    expect(events).toContain('syncDirtyFromSerialized');
  });

  it('normalizes raw browser animation callbacks passed through the runtime adapter', () => {
    let scheduledCallback: (() => void) | null = null;
    const callbackEvents: string[] = [];
    const performLocalRelayout = vi.fn(() => ({ coerced: null }));
    const schedulerHost = {
      requestAnimationFrame(callback: () => void) {
        if (this !== globalThis) {
          throw new TypeError('Illegal invocation');
        }
        scheduledCallback = callback;
        return 17;
      },
      cancelAnimationFrame(id: number) {
        if (this !== globalThis) {
          throw new TypeError('Illegal invocation');
        }
        callbackEvents.push(`cancel:${id}`);
      },
    };
    const model = {
      roots: [{ id: 'root' }],
      gridOverrides: { cols: 4 },
      layoutOverrides: {},
      elkLayoutOverrides: {},
      removedIds: new Set<string>(),
      get() {
        return {
          type: 'box',
          data: { width: 200, height: 120 },
        };
      },
      clearOverride() {},
      cleanOverride() {},
    };

    const facade = createPreviewEditorRelayoutFacadeFromRuntime({
      shared: {
        getOverrides: () => ({}),
        coercedKeys: new Set<string>(),
        model,
        editorState: {
          cloneValue: <T>(value: T) => value,
          captureOverrideEntries: () => ({}),
          serializeDirtyState: () => '{"ok":true}',
          normalizeGridOverrides: (value: { cols: number }) => value,
          commitOverridePatchAction() {},
        },
        previewBridgeHost: {
          performLocalRelayout,
        },
        selectedIds: new Set<string>(),
      },
      runtime: {
        getLocalRelayoutStatus: () => ({ ready: true, reason: 'ready' }),
        isEngineLayoutActive: () => false,
        hasRelayoutFrameOverride: () => false,
        replaceOverrides() {},
        pruneLinkedRootOverrides() {},
        clearPendingRuntime() {},
        rerenderStageFromModel: async () => {},
        applyLocalRefresh() {},
        syncGridControls() {},
        syncDirtyFromSerialized() {},
        buildTreeUi() {},
        applyWaypointOverrides() {},
        bindInteraction() {},
        applyAllOverrides() {},
        reapplySelection() {},
        refreshGridInfo() {},
        renderGridOverlay() {},
        renderSelectionInspector() {},
        updateOverrideSummary() {},
        refreshTreeColors() {},
        runConstraints() {},
        setStatus() {},
        logError() {},
        setDirty() {},
        updateInspector() {},
        reloadTreeAfterArrowRestore: async () => {},
        rebuildArrowSvg() {},
        getOwnDelta() {
          return { dw: 0, dh: 0 };
        },
        setOverride() {},
        requestAnimationFrameFn: schedulerHost.requestAnimationFrame,
        cancelAnimationFrameFn: schedulerHost.cancelAnimationFrame,
        minSize: 8,
      },
    });

    expect(facade.scheduleResizeRelayout('alpha', 320, 200, true, false)).toBe(true);
    expect(scheduledCallback).not.toBeNull();

    facade.cancelResizeRelayout();

    expect(callbackEvents).toEqual(['cancel:17']);
  });
});
