import { describe, expect, it, vi } from 'vitest';
import {
  applyFrameTreeRemovalsToPreviewTreeJson,
  createPreviewLayoutBridgeRuntime,
  createPreviewLayoutBridgeState,
  resolvePreviewLayoutBridgeLocalRelayoutStatus,
} from '../src/preview-shell/app-layout-bridge-runtime.js';

describe('preview layout bridge runtime', () => {
  it('removes frame subtrees and connected arrows from frame-tree JSON', () => {
    const treeJson = {
      root: {
        id: 'root',
        children: [
          {
            id: 'alpha',
            children: [
              { id: 'beta', children: [] },
            ],
          },
          {
            id: 'gamma',
            children: [],
          },
        ],
      },
      arrows: [
        { source: 'beta', target: 'gamma' },
        { source: 'alpha', target: 'gamma' },
        { source: 'gamma', target: 'root' },
      ],
    };

    const removed = applyFrameTreeRemovalsToPreviewTreeJson(treeJson, ['alpha']);

    expect(removed.sort()).toEqual(['alpha', 'beta']);
    expect(treeJson.root.children).toEqual([
      {
        id: 'gamma',
        children: [],
      },
    ]);
    expect(treeJson.arrows).toEqual([
      { source: 'gamma', target: 'root' },
    ]);
  });

  it('resolves readiness from typed bridge state', () => {
    const state = createPreviewLayoutBridgeState();
    expect(resolvePreviewLayoutBridgeLocalRelayoutStatus(state, () => null)).toMatchObject({
      ready: false,
      reason: 'missing-frame-tree',
    });

    state.previewDocumentJson = { kind: 'frame-diagram' };
    state.textAdapter = { measurementBackend: 'mock' } as never;
    expect(resolvePreviewLayoutBridgeLocalRelayoutStatus(state, (adapter) => (
      adapter && typeof adapter.measurementBackend === 'string'
        ? adapter.measurementBackend
        : null
    ))).toMatchObject({
      ready: false,
      reason: 'non-harfbuzz-text-adapter',
    });
  });

  it('delegates local and ELK relayout through the typed runtime', async () => {
    const state = createPreviewLayoutBridgeState<Record<string, unknown>, Record<string, unknown>>();
    state.previewDocumentJson = { kind: 'frame-diagram' };
    state.frameTreeJson = {
      root: {
        id: 'root',
        children: [],
      },
      arrows: [{ source: 'alpha', target: 'beta' }],
    };
    state.textAdapter = { measurementBackend: 'harfbuzz' } as never;

    const patchSvgFromLayout = vi.fn();
    const patchArrowsSvg = vi.fn();
    const updateModelFromLayout = vi.fn();
    const syncArrowsInModel = vi.fn();
    const refreshElkViewMode = vi.fn();
    const fitRenderedSvg = vi.fn();
    const replaceChildren = vi.fn();

    const runtime = createPreviewLayoutBridgeRuntime({
      state,
      fetchPreviewDocument: async () => null,
      extractFrameTreeFromPreviewDocument: () => null,
      createTextAdapter: async () => ({ measurementBackend: 'harfbuzz' } as never),
      getTextAdapterBackend: (adapter) => (
        adapter && typeof adapter.measurementBackend === 'string'
          ? adapter.measurementBackend
          : null
      ),
      isAuthoritativeTextAdapter: () => true,
      isElkLayeredDiagramJson: () => false,
      deserializeFrameDiagram: () => ({
        root: {
          id: 'root',
          label: [],
          children: [],
          _layout: { placedX: 1, placedY: 2, placedW: 3, placedH: 4 },
        },
        arrows: [{ source: 'alpha', target: 'beta' }],
      }) as never,
      collectRelayoutFrameOverrides: (overrides) => overrides,
      applyOverridesToFrameTree: vi.fn(),
      layoutLocalDiagram: () => ({
        coerced: new Map([['root', { sizingW: 'FIXED' }]]),
        width: 320,
        height: 180,
      }),
      collectPlacedBounds: () => ({ root: { x: 1, y: 2, w: 3, h: 4 } }),
      collectFramesById: () => ({ root: { id: 'root' } as never }),
      queryStageSvg: () => ({ tagName: 'svg' } as never),
      patchSvgFromLayout,
      routeArrows: () => [{ componentId: 'alpha->beta' } as never],
      patchArrowsSvg,
      updateModelFromLayout,
      syncArrowsInModel,
      renderFreshPreviewSvg: async () => ({
        svg: { tagName: 'svg' } as never,
        width: 640,
        height: 480,
        coerced: new Map(),
        elkSnapshot: { id: 'elk' } as never,
        elkFrameLabels: { root: 'Root' },
      }),
      ownerDocument: { tagName: 'document' } as never,
      getStageContainer: () => ({ replaceChildren } as never),
      fitRenderedSvg,
      resolveElkOptionOverrides: () => ({}),
      refreshElkViewMode,
      warn: vi.fn(),
      error: vi.fn(),
    });

    const model = {
      allIds: ['root'],
      get() {
        return {
          data: { x: 10, y: 20, width: 30, height: 40 },
        };
      },
      removedIds: new Set<string>(),
    };

    const local = runtime.performLocalRelayout(model, { root: { dx: 8 } }, { cols: 8 }, null);
    expect(local).toMatchObject({
      width: 320,
      height: 180,
    });
    expect(patchSvgFromLayout).toHaveBeenCalledTimes(1);
    expect(patchArrowsSvg).toHaveBeenCalledTimes(1);
    expect(updateModelFromLayout).toHaveBeenCalledTimes(1);
    expect(syncArrowsInModel).toHaveBeenCalledTimes(1);

    const elk = await runtime.performElkRelayout(model, { root: { dx: 8 } }, { cols: 8 });
    expect(elk).toMatchObject({
      width: 640,
      height: 480,
    });
    expect(replaceChildren).toHaveBeenCalledTimes(1);
    expect(fitRenderedSvg).toHaveBeenCalledTimes(1);
    expect(refreshElkViewMode).toHaveBeenCalledTimes(1);
    expect(runtime.getLastElkSnapshot()).toEqual({ id: 'elk' });
    expect(runtime.getLastElkFrameLabels()).toEqual({ root: 'Root' });
  });
});
