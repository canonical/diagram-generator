import { describe, expect, it, vi } from 'vitest';
import {
  applyFrameTreeRemovalsToPreviewTreeJson,
  createPreviewElkViewModeRuntimeFromBrowserHost,
  createPreviewElkViewModeRuntime,
  createPreviewLayoutBridgeRuntimeFromBrowserHost,
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

  it('delegates local and engine relayout through the typed runtime', async () => {
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
      isEngineLayoutDiagramJson: () => false,
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
      resolveEngineLayoutOptionOverrides: () => ({}),
      refreshElkViewMode,
      warn: vi.fn(),
      error: vi.fn(),
    });

    const model = {
      allIds: ['root'],
      _index: {
        root: {
          data: { x: 10, y: 20, width: 30, height: 40 },
        },
      },
      get(id: 'root') {
        return this._index[id];
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

    const engine = await runtime.performEngineRelayout(model, { root: { dx: 8 } }, { cols: 8 });
    expect(engine).toMatchObject({
      width: 640,
      height: 480,
    });
    expect(replaceChildren).toHaveBeenCalledTimes(1);
    expect(fitRenderedSvg).toHaveBeenCalledTimes(1);
    expect(refreshElkViewMode).toHaveBeenCalledTimes(1);
    expect(runtime.getLastElkSnapshot()).toEqual({ id: 'elk' });
    expect(runtime.getLastElkFrameLabels()).toEqual({ root: 'Root' });

    updateModelFromLayout.mockClear();
    syncArrowsInModel.mockClear();
    replaceChildren.mockClear();

    const liveEngine = await runtime.performEngineRelayout(
      model,
      { root: { width: 720 } as never },
      { cols: 8 },
      { skipModelUpdate: true },
    );
    expect(liveEngine).toMatchObject({
      width: 640,
      height: 480,
    });
    expect(replaceChildren).toHaveBeenCalledTimes(1);
    expect(updateModelFromLayout).not.toHaveBeenCalled();
    expect(syncArrowsInModel).not.toHaveBeenCalled();
  });

  it('owns the ELK raw/debug overlay view mode outside layout-bridge.js', () => {
    const appendChild = vi.fn();
    const setAttribute = vi.fn();
    const removeRawView = vi.fn();
    const removeDebugOverlay = vi.fn();
    const svg = {
      querySelector(selector: string) {
        if (selector === '#dg-styled-layer') {
          return { setAttribute };
        }
        if (selector === '#dg-elk-raw-view') {
          return { remove: removeRawView };
        }
        if (selector === '#dg-elk-debug-overlay') {
          return { remove: removeDebugOverlay };
        }
        return null;
      },
      appendChild,
    } as unknown as SVGSVGElement;
    const previewWindow = {
      __DG_previewEngineDebugOverlay: 'truthy' as unknown as boolean,
      __DG_previewEngineRawView: false,
      __DG_elkDebugOverlay: 'truthy' as unknown as boolean,
      __DG_elkRawView: false,
    };
    const runtime = createPreviewElkViewModeRuntime({
      previewWindow,
      getStageSvg: () => svg,
      ownerDocument: {} as Document,
      getLastElkSnapshot: () => ({ id: 'elk' } as never),
      getLastElkFrameLabels: () => ({ root: 'Root' }),
      renderPreviewElkRawView: vi.fn(() => ({ id: 'raw' } as never)),
      renderPreviewElkDebugOverlay: vi.fn(() => ({ id: 'overlay' } as never)),
      svgNs: 'http://www.w3.org/2000/svg',
      headLen: 8,
      headHalf: 4,
    });

    runtime.initializeWindowState();
    runtime.setDebugOverlay(true);
    runtime.setRawView(true);

    expect(previewWindow.__DG_previewEngineDebugOverlay).toBe(true);
    expect(previewWindow.__DG_previewEngineRawView).toBe(true);
    expect(previewWindow.__DG_elkDebugOverlay).toBe(true);
    expect(previewWindow.__DG_elkRawView).toBe(true);
    expect(setAttribute).toHaveBeenCalledWith('display', 'none');
    expect(removeRawView).toHaveBeenCalled();
    expect(removeDebugOverlay).toHaveBeenCalled();
    expect(appendChild).toHaveBeenCalledTimes(2);
  });

  it('builds the browser host bridge runtime without leaving host assembly in layout-bridge.js', async () => {
    const state = createPreviewLayoutBridgeState<Record<string, unknown>, Record<string, unknown>>();
    state.previewDocumentJson = { kind: 'frame-diagram' };
    state.frameTreeJson = {
      root: { id: 'root', children: [] },
      arrows: [{ source: 'alpha', target: 'beta' }],
    };
    state.textAdapter = { measurementBackend: 'harfbuzz' } as never;

    const patchPreviewSvgFromLayout = vi.fn();
    const patchPreviewArrowSvg = vi.fn();
    const syncPreviewArrowsInModel = vi.fn();
    const fitPreviewSvgToRenderedContent = vi.fn();
    const renderFreshPreviewSvg = vi.fn(async () => ({
      svg: { tagName: 'svg' } as never,
      width: 640,
      height: 480,
      coerced: new Map(),
      elkSnapshot: { id: 'elk' } as never,
      elkFrameLabels: { root: 'Root' },
    }));

    const runtime = createPreviewLayoutBridgeRuntimeFromBrowserHost({
      state,
      slug: 'demo',
      ownerDocument: {
        querySelector() {
          return { tagName: 'svg' };
        },
        getElementById() {
          return { replaceChildren() {} };
        },
      } as never,
      previewWindow: {
        __DG_CONFIG: {
          head_len: 8,
          head_half: 4,
        },
      },
      previewCore: {
        deserializeFrameDiagramWire: () => ({
          root: {
            id: 'root',
            label: [],
            children: [],
            _layout: { placedX: 1, placedY: 2, placedW: 3, placedH: 4 },
          },
          arrows: [{ source: 'alpha', target: 'beta' }],
          elkLayout: {},
        }) as never,
        resolveStyles: vi.fn(),
        layoutFrameTree: vi.fn(() => ({ coerced: null, width: 320, height: 200 })),
      },
      previewBridgeRender: {
        collectPreviewFramesById: () => ({ root: { id: 'root' } as never }),
        collectPreviewPlacedBounds: () => ({ root: { x: 1, y: 2, w: 3, h: 4 } }),
        fitPreviewSvgToRenderedContent,
        patchPreviewSvgFromLayout,
        routePreviewArrows: () => [{ componentId: 'alpha->beta' } as never],
        patchPreviewArrowSvg,
        syncPreviewArrowsInModel,
      },
      previewBridgeBundleRender: {
        renderFreshPreviewSvg,
      },
      previewBridgeRelayout: {
        collectPreviewRelayoutFrameOverrides: (overrides) => overrides,
        applyPreviewOverridesToFrameTree: vi.fn(),
      },
      previewBridgeHost: {
        updatePreviewComponentModelFromLayout: vi.fn(),
      },
      resolvePreviewEngineManifest: () => ({ capabilities: { serverRelayout: false } }),
      createTextAdapter: async () => ({ measurementBackend: 'harfbuzz' } as never),
      getTextAdapterBackend: (adapter) => (
        adapter && typeof adapter.measurementBackend === 'string'
          ? adapter.measurementBackend
          : null
      ),
      isAuthoritativeTextAdapter: () => true,
      refreshElkViewMode: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    });

    const local = runtime.performLocalRelayout({
      removedIds: new Set<string>(),
      topLevelRemovalIds: () => [],
      loadTree() {},
    }, {}, {}, null);
    const engine = await runtime.performEngineRelayout({
      removedIds: new Set<string>(),
      topLevelRemovalIds: () => [],
      loadTree() {},
    }, {}, {});

    expect(local).toMatchObject({ width: 320, height: 200 });
    expect(engine).toMatchObject({ width: 640, height: 480 });
    expect(patchPreviewSvgFromLayout).toHaveBeenCalledTimes(1);
    expect(patchPreviewArrowSvg).toHaveBeenCalledTimes(1);
    expect(syncPreviewArrowsInModel).toHaveBeenCalledTimes(1);
    expect(fitPreviewSvgToRenderedContent).toHaveBeenCalledTimes(1);
    expect(renderFreshPreviewSvg).toHaveBeenCalledTimes(1);
  });

  it('derives ELK view-mode bindings from the browser host runtime', () => {
    const runtime = createPreviewElkViewModeRuntimeFromBrowserHost({
      previewWindow: {
        __DG_previewEngineDebugOverlay: true,
        __DG_previewEngineRawView: false,
      },
      ownerDocument: {
        querySelector() {
          return {
            querySelector() {
              return { setAttribute() {}, remove() {} };
            },
            appendChild() {},
          };
        },
      } as never,
      previewWindowConfig: {
        headLen: 12,
        headHalf: 6,
      },
      getLayoutBridgeRuntime: () => ({
        getLastElkSnapshot: () => ({ id: 'elk' } as never),
        getLastElkFrameLabels: () => ({ root: 'Root' }),
      }),
      renderPreviewElkRawView: vi.fn(() => ({ id: 'raw' } as never)),
      renderPreviewElkDebugOverlay: vi.fn(() => ({ id: 'overlay' } as never)),
    });

    runtime.initializeWindowState();
    runtime.refreshViewMode();

    expect(runtime).toBeTruthy();
  });
});
