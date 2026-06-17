import { describe, expect, it, vi } from 'vitest';
import {
  attemptPreviewDiagramNavigation,
  loadPreviewComponentTree,
  loadPreviewGridInfo,
  syncPreviewArrowModelFromFrameTree,
} from '../src/preview-shell/app-diagram-data.js';

describe('preview diagram bootstrap/data helpers', () => {
  it('confirms dirty navigation before assigning the next diagram path', () => {
    const calls: string[] = [];
    let scheduledReset: (() => void) | null = null;

    const navigated = attemptPreviewDiagramNavigation({
      nextUrl: 'http://127.0.0.1:8100/view/beta',
      currentPath: '/view/alpha',
      origin: 'http://127.0.0.1:8100',
      isDirty: true,
      confirmNavigation(message) {
        calls.push(`confirm:${message}`);
        return true;
      },
      dirtyConfirmMessage: 'Leave?',
      syncUi() {
        calls.push('syncUi');
      },
      setAllowInternalDirtyNavigation(allowed) {
        calls.push(`allow:${String(allowed)}`);
      },
      assignLocation(nextPath) {
        calls.push(`assign:${nextPath}`);
      },
      schedulePostNavigationReset(callback) {
        scheduledReset = callback;
      },
    });

    expect(navigated).toBe(true);
    expect(calls).toEqual([
      'confirm:Leave?',
      'allow:true',
      'assign:/view/beta',
    ]);

    scheduledReset?.();

    expect(calls).toEqual([
      'confirm:Leave?',
      'allow:true',
      'assign:/view/beta',
      'allow:false',
      'syncUi',
    ]);
  });

  it('keeps the current view when navigation is cancelled or unchanged', () => {
    const cancelledCalls: string[] = [];
    expect(attemptPreviewDiagramNavigation({
      nextUrl: '/view/beta',
      currentPath: '/view/alpha',
      origin: 'http://127.0.0.1:8100',
      isDirty: true,
      confirmNavigation() {
        cancelledCalls.push('confirm');
        return false;
      },
      dirtyConfirmMessage: 'Leave?',
      syncUi() {
        cancelledCalls.push('syncUi');
      },
      setAllowInternalDirtyNavigation() {
        cancelledCalls.push('allow');
      },
      assignLocation() {
        cancelledCalls.push('assign');
      },
      schedulePostNavigationReset() {
        cancelledCalls.push('reset');
      },
    })).toBe(false);
    expect(cancelledCalls).toEqual(['confirm', 'syncUi']);

    const noopCalls: string[] = [];
    expect(attemptPreviewDiagramNavigation({
      nextUrl: '/view/alpha',
      currentPath: '/view/alpha',
      origin: 'http://127.0.0.1:8100',
      isDirty: false,
      confirmNavigation() {
        noopCalls.push('confirm');
        return true;
      },
      dirtyConfirmMessage: 'Leave?',
      syncUi() {
        noopCalls.push('syncUi');
      },
      setAllowInternalDirtyNavigation() {
        noopCalls.push('allow');
      },
      assignLocation() {
        noopCalls.push('assign');
      },
      schedulePostNavigationReset() {
        noopCalls.push('reset');
      },
    })).toBe(false);
    expect(noopCalls).toEqual(['syncUi']);
  });

  it('syncs arrows from the authoritative frame-tree JSON', async () => {
    const loadedTrees: unknown[] = [];
    const arrowSyncCalls: unknown[] = [];

    const mode = await loadPreviewComponentTree({
      canonicalState: {
        componentTree: [{ id: 'root' }],
      },
      fetchTree: async () => ({
        ok: true,
        async json() {
          return [{ id: 'fetched-root' }];
        },
      }),
      model: {
        loadTree(tree) {
          loadedTrees.push(tree);
        },
        loadArrows() {
          throw new Error('fallback loadArrows should not be used');
        },
      },
      readFrameTreeJson: () => ({
        arrows: [{ source: 'a', target: 'b', color: '#f60' }],
      }),
      syncArrowsInModel(model, arrows, removedIds) {
        arrowSyncCalls.push({ model, arrows, removedIds });
      },
      arrowComponentId: () => 'arrow-1',
    });

    expect(mode).toBe('canonical');
    expect(loadedTrees).toEqual([[{ id: 'root' }]]);
    expect(arrowSyncCalls).toEqual([
      {
        model: expect.any(Object),
        arrows: [{ source: 'a', target: 'b', color: '#f60' }],
        removedIds: [],
      },
    ]);
  });

  it('falls back to arrow payload loading when no arrow sync function exists', () => {
    const loadedArrows: unknown[] = [];

    const payload = syncPreviewArrowModelFromFrameTree({
      frameTreeJson: {
        arrows: [{ source: 'alpha', target: 'beta', waypoints: [{ x: 1, y: 2 }] }],
      },
      model: {
        loadTree() {},
        loadArrows(arrows) {
          loadedArrows.push(arrows);
        },
      },
      arrowComponentId: (arrow) => `${arrow.source}->${arrow.target}`,
    });

    expect(payload).toEqual([
      {
        id: 'alpha->beta',
        source: 'alpha',
        target: 'beta',
        color: undefined,
        waypoints: [{ x: 1, y: 2 }],
      },
    ]);
    expect(loadedArrows).toEqual([payload]);
  });

  it('loads derived grid info when canonical and fetched grid state are unavailable', async () => {
    const cloneValue = vi.fn((value: Record<string, unknown>) => ({ ...value, cloned: true }));
    const resolvePreviewGridInfo = vi.fn((options: Record<string, unknown>) => ({
      derived: true,
      options,
    }));

    const loaded = await loadPreviewGridInfo({
      canonicalState: null,
      fetchGridInfo: async () => {
        throw new Error('offline');
      },
      cloneValue,
      readFallbackMetrics: () => ({
        gap: 24,
        pad: 32,
        canvasWidth: 900,
        canvasHeight: 700,
        baselineStep: 8,
      }),
      resolvePreviewGridInfo,
    });

    expect(loaded.mode).toBe('fallback');
    expect(resolvePreviewGridInfo).toHaveBeenCalledWith({
      canvasWidth: 900,
      canvasHeight: 700,
      baselineStep: 8,
      columnCount: 2,
      columnGutter: 24,
      rowGutter: 24,
      marginTop: 32,
      marginRight: 32,
      marginBottom: 32,
      marginLeft: 32,
    });
    expect(loaded.gridInfo).toEqual({
      derived: true,
      options: expect.any(Object),
    });
    expect(loaded.baseGridInfo).toEqual({
      derived: true,
      options: expect.any(Object),
      cloned: true,
    });
  });
});
