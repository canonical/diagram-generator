import { describe, expect, it, vi } from 'vitest';
import {
  applyFrameTreeRemovalsToPreviewTreeJson,
  createPreviewElkViewModeRuntimeFromBrowserHost,
  createPreviewElkViewModeRuntime,
  createPreviewLayoutBridgeInstallRuntimeFromLegacyBrowserHost,
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
    const refreshLayoutControls = vi.fn();
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
      refreshLayoutControls,
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
    expect(refreshLayoutControls).toHaveBeenCalledTimes(1);
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
    expect(refreshLayoutControls).toHaveBeenCalledTimes(2);
    expect(updateModelFromLayout).not.toHaveBeenCalled();
    expect(syncArrowsInModel).not.toHaveBeenCalled();
  });

  it('invalidates authored arrow waypoint geometry before local reroute on direction changes', () => {
    const state = createPreviewLayoutBridgeState<Record<string, unknown>, Record<string, unknown>>();
    state.frameTreeJson = {
      root: { id: 'root', children: [] },
      arrows: [{ source: 'alpha', target: 'beta', waypoints: [[200, 160], [200, -8]] }],
    };
    state.textAdapter = { measurementBackend: 'harfbuzz' } as never;

    const routeArrows = vi.fn(() => []);
    const runtime = createPreviewLayoutBridgeRuntime({
      state,
      fetchPreviewDocument: async () => null,
      extractFrameTreeFromPreviewDocument: () => null,
      createTextAdapter: async () => ({ measurementBackend: 'harfbuzz' } as never),
      getTextAdapterBackend: () => 'harfbuzz',
      isAuthoritativeTextAdapter: () => true,
      isEngineLayoutDiagramJson: () => false,
      deserializeFrameDiagram: () => ({
        root: {
          id: 'root',
          label: [],
          children: [],
          _layout: { placedX: 0, placedY: 0, placedW: 100, placedH: 100 },
        },
        arrows: [{ source: 'alpha', target: 'beta', waypoints: [[200, 160], [200, -8]] }],
      }) as never,
      collectRelayoutFrameOverrides: (overrides) => overrides,
      applyOverridesToFrameTree: vi.fn(),
      layoutLocalDiagram: () => ({ coerced: new Map(), width: 320, height: 180 }),
      collectPlacedBounds: () => ({ root: { x: 0, y: 0, w: 100, h: 100 } }),
      collectFramesById: () => ({ root: { id: 'root' } as never }),
      queryStageSvg: () => null,
      patchSvgFromLayout: vi.fn(),
      routeArrows,
      patchArrowsSvg: vi.fn(),
      updateModelFromLayout: vi.fn(),
      syncArrowsInModel: vi.fn(),
      renderFreshPreviewSvg: async () => ({
        svg: { tagName: 'svg' } as never,
        width: 640,
        height: 480,
        coerced: new Map(),
        elkSnapshot: null,
        elkFrameLabels: null,
      }),
      ownerDocument: { tagName: 'document' } as never,
      getStageContainer: () => null,
      fitRenderedSvg: vi.fn(),
      resolveEngineLayoutOptionOverrides: () => ({}),
      refreshElkViewMode: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    });

    runtime.performLocalRelayout(
      { removedIds: new Set<string>() },
      { root: { direction: 'VERTICAL' } },
      {},
      null,
    );

    const routedArrowInput = routeArrows.mock.calls[0]?.[0]?.[0];
    expect(routedArrowInput?.source).toBe('alpha');
    expect(routedArrowInput?.target).toBe('beta');
    expect(routedArrowInput?.waypoints).toBeUndefined();
    expect(routedArrowInput?.layoutPath).toBeUndefined();
  });

  it('invalidates authored arrow waypoint geometry before local reroute on size changes', () => {
    const state = createPreviewLayoutBridgeState<Record<string, unknown>, Record<string, unknown>>();
    state.frameTreeJson = {
      root: { id: 'root', children: [] },
      arrows: [{ source: 'alpha', target: 'beta', waypoints: [[200, 160], [200, -8]] }],
    };
    state.textAdapter = { measurementBackend: 'harfbuzz' } as never;

    const routeArrows = vi.fn(() => []);
    const runtime = createPreviewLayoutBridgeRuntime({
      state,
      fetchPreviewDocument: async () => null,
      extractFrameTreeFromPreviewDocument: () => null,
      createTextAdapter: async () => ({ measurementBackend: 'harfbuzz' } as never),
      getTextAdapterBackend: () => 'harfbuzz',
      isAuthoritativeTextAdapter: () => true,
      isEngineLayoutDiagramJson: () => false,
      deserializeFrameDiagram: () => ({
        root: {
          id: 'root',
          label: [],
          children: [],
          _layout: { placedX: 0, placedY: 0, placedW: 100, placedH: 100 },
        },
        arrows: [{ source: 'alpha', target: 'beta', waypoints: [[200, 160], [200, -8]] }],
      }) as never,
      collectRelayoutFrameOverrides: (overrides) => overrides,
      applyOverridesToFrameTree: vi.fn(),
      layoutLocalDiagram: () => ({ coerced: new Map(), width: 320, height: 180 }),
      collectPlacedBounds: () => ({ root: { x: 0, y: 0, w: 100, h: 100 } }),
      collectFramesById: () => ({ root: { id: 'root' } as never }),
      queryStageSvg: () => null,
      patchSvgFromLayout: vi.fn(),
      routeArrows,
      patchArrowsSvg: vi.fn(),
      updateModelFromLayout: vi.fn(),
      syncArrowsInModel: vi.fn(),
      renderFreshPreviewSvg: async () => ({
        svg: { tagName: 'svg' } as never,
        width: 640,
        height: 480,
        coerced: new Map(),
        elkSnapshot: null,
        elkFrameLabels: null,
      }),
      ownerDocument: { tagName: 'document' } as never,
      getStageContainer: () => null,
      fitRenderedSvg: vi.fn(),
      resolveEngineLayoutOptionOverrides: () => ({}),
      refreshElkViewMode: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    });

    runtime.performLocalRelayout(
      { removedIds: new Set<string>() },
      { panel: { sizing_w: 'FIXED', width: 480 } },
      {},
      null,
    );

    const routedArrowInput = routeArrows.mock.calls[0]?.[0]?.[0];
    expect(routedArrowInput?.source).toBe('alpha');
    expect(routedArrowInput?.target).toBe('beta');
    expect(routedArrowInput?.waypoints).toBeUndefined();
    expect(routedArrowInput?.layoutPath).toBeUndefined();
  });

  it('keeps authored arrow waypoint geometry for non-route-bearing style relayouts', () => {
    const state = createPreviewLayoutBridgeState<Record<string, unknown>, Record<string, unknown>>();
    state.frameTreeJson = {
      root: { id: 'root', children: [] },
      arrows: [{ source: 'alpha', target: 'beta', waypoints: [[200, 160], [200, -8]] }],
    };
    state.textAdapter = { measurementBackend: 'harfbuzz' } as never;

    const routeArrows = vi.fn(() => []);
    const runtime = createPreviewLayoutBridgeRuntime({
      state,
      fetchPreviewDocument: async () => null,
      extractFrameTreeFromPreviewDocument: () => null,
      createTextAdapter: async () => ({ measurementBackend: 'harfbuzz' } as never),
      getTextAdapterBackend: () => 'harfbuzz',
      isAuthoritativeTextAdapter: () => true,
      isEngineLayoutDiagramJson: () => false,
      deserializeFrameDiagram: () => ({
        root: {
          id: 'root',
          label: [],
          children: [],
          _layout: { placedX: 0, placedY: 0, placedW: 100, placedH: 100 },
        },
        arrows: [{ source: 'alpha', target: 'beta', waypoints: [[200, 160], [200, -8]] }],
      }) as never,
      collectRelayoutFrameOverrides: (overrides) => overrides,
      applyOverridesToFrameTree: vi.fn(),
      layoutLocalDiagram: () => ({ coerced: new Map(), width: 320, height: 180 }),
      collectPlacedBounds: () => ({ root: { x: 0, y: 0, w: 100, h: 100 } }),
      collectFramesById: () => ({ root: { id: 'root' } as never }),
      queryStageSvg: () => null,
      patchSvgFromLayout: vi.fn(),
      routeArrows,
      patchArrowsSvg: vi.fn(),
      updateModelFromLayout: vi.fn(),
      syncArrowsInModel: vi.fn(),
      renderFreshPreviewSvg: async () => ({
        svg: { tagName: 'svg' } as never,
        width: 640,
        height: 480,
        coerced: new Map(),
        elkSnapshot: null,
        elkFrameLabels: null,
      }),
      ownerDocument: { tagName: 'document' } as never,
      getStageContainer: () => null,
      fitRenderedSvg: vi.fn(),
      resolveEngineLayoutOptionOverrides: () => ({}),
      refreshElkViewMode: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    });

    runtime.performLocalRelayout(
      { removedIds: new Set<string>() },
      { panel: { fill: 'BLACK' } },
      {},
      null,
    );

    const routedArrowInput = routeArrows.mock.calls[0]?.[0]?.[0];
    expect(routedArrowInput?.waypoints).toEqual([[200, 160], [200, -8]]);
  });

  it('reads Dagre YAML overrides from the active engine namespace during engine relayout', async () => {
    const state = createPreviewLayoutBridgeState<Record<string, unknown>, Record<string, unknown>>();
    state.previewDocumentJson = { kind: 'frame-diagram' };
    state.frameTreeJson = {
      layoutEngine: 'dagre',
      root: { id: 'root', children: [] },
      arrows: [],
    };
    state.textAdapter = { measurementBackend: 'harfbuzz' } as never;

    let capturedEngineOverrides: Record<string, unknown> | null = null;
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
        __DG_previewRenderIntent: null,
      },
      previewCore: {
        deserializeFrameDiagramWire: () => ({
          root: {
            id: 'root',
            label: [],
            children: [],
            _layout: { placedX: 1, placedY: 2, placedW: 3, placedH: 4 },
          },
          arrows: [],
          layoutEngine: 'dagre',
          elkLayout: {
            'elk.spacing.nodeNode': '64',
          },
          engineLayout: {
            'meta.dagre': {
              'dagre.rankdir': 'LR',
              'dagre.ranksep': '128',
            },
          },
        }) as never,
        resolveStyles: vi.fn(),
        layoutFrameTree: vi.fn(() => ({ coerced: null, width: 320, height: 200 })),
      },
      previewBridgeRender: {
        collectPreviewFramesById: () => ({ root: { id: 'root' } as never }),
        collectPreviewPlacedBounds: () => ({ root: { x: 1, y: 2, w: 3, h: 4 } }),
        fitPreviewSvgToRenderedContent: vi.fn(),
        patchPreviewSvgFromLayout: vi.fn(),
        routePreviewArrows: () => [],
        patchPreviewArrowSvg: vi.fn(),
        syncPreviewArrowsInModel: vi.fn(),
      },
      previewBridgeBundleRender: {
        renderFreshPreviewSvg: vi.fn(async (options: Record<string, any>) => {
          capturedEngineOverrides = options.resolveEngineLayoutOptionOverrides(
            {
              layoutEngine: 'dagre',
              elkLayout: { 'elk.spacing.nodeNode': '64' },
              engineLayout: {
                'meta.dagre': {
                  'dagre.rankdir': 'LR',
                  'dagre.ranksep': '128',
                },
              },
            },
            options.model,
          );
          return {
            svg: { tagName: 'svg' } as never,
            width: 640,
            height: 480,
            coerced: new Map(),
            elkSnapshot: null,
            elkFrameLabels: null,
          };
        }),
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
      getTextAdapterBackend: () => 'harfbuzz',
      isAuthoritativeTextAdapter: () => true,
      refreshElkViewMode: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    });

    await runtime.performEngineRelayout(
      {
        removedIds: new Set<string>(),
        topLevelRemovalIds: () => [],
        layoutOverrides: {},
        loadTree() {},
      } as never,
      {},
      {},
      { skipModelUpdate: true },
    );

    expect(capturedEngineOverrides).toEqual({
      'dagre.rankdir': 'LR',
      'dagre.ranksep': '128',
    });
  });

  it('falls back to the active operator manifest instead of flat-merging YAML and session overrides', async () => {
    const state = createPreviewLayoutBridgeState<Record<string, unknown>, Record<string, unknown>>();
    state.previewDocumentJson = { kind: 'frame-diagram' };
    state.frameTreeJson = {
      layoutEngine: null,
      root: { id: 'root', children: [] },
      arrows: [],
      engineLayout: {
        'meta.dagre': {
          'dagre.rankdir': 'LR',
        },
      },
    };
    state.textAdapter = { measurementBackend: 'harfbuzz' } as never;

    let capturedEngineOverrides: Record<string, unknown> | null = null;
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
        __DG_previewRenderIntent: null,
      },
      previewCore: {
        deserializeFrameDiagramWire: () => ({
          root: {
            id: 'root',
            label: [],
            children: [],
            _layout: { placedX: 1, placedY: 2, placedW: 3, placedH: 4 },
          },
          arrows: [],
          layoutEngine: null,
          engineLayout: {
            'meta.dagre': {
              'dagre.rankdir': 'LR',
            },
          },
        }) as never,
        resolveStyles: vi.fn(),
        layoutFrameTree: vi.fn(() => ({ coerced: null, width: 320, height: 200 })),
      },
      previewBridgeRender: {
        collectPreviewFramesById: () => ({ root: { id: 'root' } as never }),
        collectPreviewPlacedBounds: () => ({ root: { x: 1, y: 2, w: 3, h: 4 } }),
        fitPreviewSvgToRenderedContent: vi.fn(),
        patchPreviewSvgFromLayout: vi.fn(),
        routePreviewArrows: () => [],
        patchPreviewArrowSvg: vi.fn(),
        syncPreviewArrowsInModel: vi.fn(),
      },
      previewBridgeBundleRender: {
        renderFreshPreviewSvg: vi.fn(async (options: Record<string, any>) => {
          capturedEngineOverrides = options.resolveEngineLayoutOptionOverrides(
            {
              layoutEngine: null,
              engineLayout: {
                'meta.dagre': {
                  'dagre.rankdir': 'LR',
                },
              },
            },
            options.model,
          );
          return {
            svg: { tagName: 'svg' } as never,
            width: 640,
            height: 480,
            coerced: new Map(),
            elkSnapshot: null,
            elkFrameLabels: null,
          };
        }),
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
      getTextAdapterBackend: () => 'harfbuzz',
      isAuthoritativeTextAdapter: () => true,
      refreshElkViewMode: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    });

    await runtime.performEngineRelayout(
      {
        removedIds: new Set<string>(),
        topLevelRemovalIds: () => [],
        layoutOverrides: { stale: true },
        layoutOverrideNamespace: 'meta.dagre',
        layoutOperatorOverrides: {
          activeOperatorKey: 'dagre',
          byOperator: {
            dagre: {
              'dagre.ranksep': '128',
              'elk.spacing.nodeNode': '64',
            },
          },
        },
        loadTree() {},
      } as never,
      {},
      {},
      { skipModelUpdate: true },
    );

    expect(capturedEngineOverrides).toEqual({
      'dagre.rankdir': 'LR',
      'dagre.ranksep': '128',
    });
  });

  it('owns the ELK raw view mode outside layout-bridge.js', () => {
    const appendChild = vi.fn();
    const setAttribute = vi.fn();
    const removeRawView = vi.fn();
    const svg = {
      querySelector(selector: string) {
        if (selector === '#dg-styled-layer') {
          return { setAttribute };
        }
        if (selector === '#dg-elk-raw-view') {
          return { remove: removeRawView };
        }
        return null;
      },
      appendChild,
    } as unknown as SVGSVGElement;
    const previewWindow = {
      __DG_previewEngineRawView: false,
      __DG_elkRawView: false,
    };
    const runtime = createPreviewElkViewModeRuntime({
      previewWindow,
      getStageSvg: () => svg,
      ownerDocument: {} as Document,
      getLastElkSnapshot: () => ({ id: 'elk' } as never),
      getLastElkFrameLabels: () => ({ root: 'Root' }),
      renderPreviewElkRawView: vi.fn(() => ({ id: 'raw' } as never)),
      svgNs: 'http://www.w3.org/2000/svg',
      headLen: 8,
      headHalf: 4,
    });

    runtime.initializeWindowState();
    runtime.setRawView(true);

    expect(previewWindow.__DG_previewEngineRawView).toBe(true);
    expect(previewWindow.__DG_elkRawView).toBe(true);
    expect(setAttribute).toHaveBeenCalledWith('display', 'none');
    expect(removeRawView).toHaveBeenCalled();
    expect(appendChild).toHaveBeenCalledTimes(1);
  });

  it('builds the browser host bridge runtime without leaving host assembly in layout-bridge.js', async () => {
    const state = createPreviewLayoutBridgeState<Record<string, unknown>, Record<string, unknown>>();
    state.previewDocumentJson = { kind: 'frame-diagram' };
    state.frameTreeJson = {
      layoutEngine: 'v3',
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
    const previewWindow = {
      __DG_CONFIG: {
        head_len: 8,
        head_half: 4,
      },
      __DG_previewRenderIntent: null,
    };

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
      previewWindow,
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
    }, { root: { direction: 'HORIZONTAL' } }, {}, null);
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
    expect(previewWindow.__DG_previewRenderIntent).toMatchObject({
      engineId: 'v3',
      pageDirection: 'HORIZONTAL',
    });
  });

  it('reuses cached cooked output when the switch node returns to a previously selected engine', async () => {
    const state = createPreviewLayoutBridgeState<Record<string, unknown>, Record<string, unknown>>();
    state.previewDocumentJson = { kind: 'frame-diagram' };
    state.frameTreeJson = {
      layoutEngine: 'elk-layered',
      root: { id: 'root', children: [] },
      arrows: [],
    };
    state.textAdapter = { measurementBackend: 'harfbuzz' } as never;

    const cookedEngines: string[] = [];
    const renderFreshPreviewSvg = vi.fn(async (options: Record<string, any>) => {
      const engineId = options.renderIntent?.engineId ?? options.frameTreeJson?.layoutEngine ?? 'v3';
      cookedEngines.push(engineId);
      return {
        svg: { tagName: `svg-${engineId}` } as never,
        width: engineId === 'dagre' ? 720 : 640,
        height: 480,
        coerced: new Map(),
        elkSnapshot: null,
        elkFrameLabels: null,
      };
    });
    const previewWindow = {
      __DG_CONFIG: {
        active_engine_id: 'elk-layered',
        layout_engine: 'elk-layered',
        persisted_layout_engine: 'elk-layered',
        head_len: 8,
        head_half: 4,
      },
      __DG_previewRenderIntent: null,
    };

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
      previewWindow,
      previewCore: {
        deserializeFrameDiagramWire: () => ({
          root: {
            id: 'root',
            label: [],
            children: [],
            _layout: { placedX: 1, placedY: 2, placedW: 3, placedH: 4 },
          },
          arrows: [],
          elkLayout: {},
        }) as never,
        resolveStyles: vi.fn(),
        layoutFrameTree: vi.fn(() => ({ coerced: null, width: 320, height: 200 })),
      },
      previewBridgeRender: {
        collectPreviewFramesById: () => ({ root: { id: 'root' } as never }),
        collectPreviewPlacedBounds: () => ({ root: { x: 1, y: 2, w: 3, h: 4 } }),
        fitPreviewSvgToRenderedContent: vi.fn(),
        patchPreviewSvgFromLayout: vi.fn(),
        routePreviewArrows: () => [],
        patchPreviewArrowSvg: vi.fn(),
        syncPreviewArrowsInModel: vi.fn(),
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

    const model = {
      removedIds: new Set<string>(),
      loadTree() {},
    };

    const layeredFirst = await runtime.renderFreshSvg({}, {}, model as never, null);
    runtime.setFrameTreeLayoutEngine('dagre');
    const dagreRender = await runtime.renderFreshSvg({}, {}, model as never, null);
    runtime.setFrameTreeLayoutEngine('elk-layered');
    const layeredCached = await runtime.renderFreshSvg({}, {}, model as never, null);

    expect(layeredFirst.width).toBe(640);
    expect(dagreRender.width).toBe(720);
    expect(layeredCached.width).toBe(640);
    expect(renderFreshPreviewSvg).toHaveBeenCalledTimes(2);
    expect(cookedEngines).toEqual(['elk-layered', 'dagre']);
    expect(previewWindow.__DG_previewRenderIntent).toMatchObject({
      engineId: 'elk-layered',
    });
  });

  it('forces a fresh cook when active-engine params change and then return to their original values', async () => {
    const state = createPreviewLayoutBridgeState<Record<string, unknown>, Record<string, unknown>>();
    state.previewDocumentJson = { kind: 'frame-diagram' };
    state.frameTreeJson = {
      layoutEngine: 'elk-layered',
      root: { id: 'root', children: [] },
      arrows: [],
    };
    state.textAdapter = { measurementBackend: 'harfbuzz' } as never;

    const cookedLayeredOverrides: Record<string, unknown>[] = [];
    const renderFreshPreviewSvg = vi.fn(async (options: Record<string, any>) => {
      const activeLayeredOverrides = (
        options.model?.layoutOperatorOverrides?.byOperator?.['elk-layered']
        ?? {}
      ) as Record<string, unknown>;
      cookedLayeredOverrides.push({ ...activeLayeredOverrides });
      return {
        svg: { tagName: `svg-cook-${cookedLayeredOverrides.length}` } as never,
        width: 640,
        height: 480,
        coerced: new Map(),
        elkSnapshot: null,
        elkFrameLabels: null,
      };
    });
    const previewWindow = {
      __DG_CONFIG: {
        active_engine_id: 'elk-layered',
        layout_engine: 'elk-layered',
        persisted_layout_engine: 'elk-layered',
        head_len: 8,
        head_half: 4,
      },
      __DG_previewRenderIntent: null,
    };

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
      previewWindow,
      previewCore: {
        deserializeFrameDiagramWire: () => ({
          root: {
            id: 'root',
            label: [],
            children: [],
            _layout: { placedX: 1, placedY: 2, placedW: 3, placedH: 4 },
          },
          arrows: [],
          elkLayout: {},
        }) as never,
        resolveStyles: vi.fn(),
        layoutFrameTree: vi.fn(() => ({ coerced: null, width: 320, height: 200 })),
      },
      previewBridgeRender: {
        collectPreviewFramesById: () => ({ root: { id: 'root' } as never }),
        collectPreviewPlacedBounds: () => ({ root: { x: 1, y: 2, w: 3, h: 4 } }),
        fitPreviewSvgToRenderedContent: vi.fn(),
        patchPreviewSvgFromLayout: vi.fn(),
        routePreviewArrows: () => [],
        patchPreviewArrowSvg: vi.fn(),
        syncPreviewArrowsInModel: vi.fn(),
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

    const model = {
      removedIds: new Set<string>(),
      layoutOverrideNamespace: 'meta.elk',
      layoutOperatorOverrides: {
        activeOperatorKey: 'elk-layered',
        byOperator: {
          'elk-layered': {},
        },
      },
      loadTree() {},
    };

    const initial = await runtime.renderFreshSvg({}, {}, model as never, null);
    model.layoutOperatorOverrides = {
      activeOperatorKey: 'elk-layered',
      byOperator: {
        'elk-layered': {
          'elk.layered.spacing.nodeNodeBetweenLayers': '160',
        },
      },
    };
    const changed = await runtime.renderFreshSvg({}, {}, model as never, null);
    model.layoutOperatorOverrides = {
      activeOperatorKey: 'elk-layered',
      byOperator: {
        'elk-layered': {},
      },
    };
    const restored = await runtime.renderFreshSvg({}, {}, model as never, null);

    expect(initial.width).toBe(640);
    expect(changed.width).toBe(640);
    expect(restored.width).toBe(640);
    expect(renderFreshPreviewSvg).toHaveBeenCalledTimes(3);
    expect(cookedLayeredOverrides).toEqual([
      {},
      { 'elk.layered.spacing.nodeNodeBetweenLayers': '160' },
      {},
    ]);
    expect(previewWindow.__DG_previewRenderIntent).toMatchObject({
      engineId: 'elk-layered',
    });
  });

  it('derives ELK view-mode bindings from the browser host runtime', () => {
    const runtime = createPreviewElkViewModeRuntimeFromBrowserHost({
      previewWindow: {
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
    });

    runtime.initializeWindowState();
    runtime.refreshViewMode();

    expect(runtime).toBeTruthy();
  });

  it('installs the legacy browser bridge through a typed install runtime', async () => {
    let capturedEngineOverrides: Record<string, unknown> | null = null;
    const renderPreviewFrameTreeToSvg = vi.fn(() => ({ tagName: 'svg' } as never));
    const renderFreshPreviewSvg = vi.fn(async (options: Record<string, any>) => {
      capturedEngineOverrides = options.resolveEngineLayoutOptionOverrides(
        { elkLayout: { fromYaml: true } },
        options.model,
      );
      return {
        svg: { tagName: 'svg' } as never,
        width: 640,
        height: 480,
        coerced: new Map(),
        elkSnapshot: { id: 'elk' } as never,
        elkFrameLabels: { root: 'Root' },
      };
    });
    const syncPreviewArrowsInModel = vi.fn();
    const createPreviewArrowSvgFragment = vi.fn(() => ({ kind: 'fragment' } as never));
    const fitPreviewSvgToRenderedContent = vi.fn();
    const layoutControlsRefresh = vi.fn();
    const stage = {
      replaceChildren: vi.fn(),
    };
    const stageSvg = {
      querySelector() {
        return null;
      },
      appendChild() {},
    };
    const ownerDocument = {
      querySelector() {
        return stageSvg;
      },
      getElementById(id: string) {
        if (id === 'stage') return stage;
        return null;
      },
      createDocumentFragment() {
        return { kind: 'document-fragment' } as never;
      },
    } as never;
    const previewWindow = {
      __DG_CONFIG: {
        slug: 'demo',
        head_len: 8,
        head_half: 4,
        layout_engine: 'elk-layered',
      },
      __DG_getPreviewCoreContract: () => ({
        deserializeFrameDiagramWire: () => ({
          root: {
            id: 'root',
            label: [],
            children: [],
            _layout: { placedX: 1, placedY: 2, placedW: 3, placedH: 4 },
          },
          arrows: [],
          elkLayout: { fromYaml: true },
        }),
        resolveStyles: vi.fn(),
        layoutFrameTree: vi.fn(() => ({ coerced: null, width: 320, height: 200 })),
      }),
      __DG_getPreviewBridgeRenderContract: () => ({
        collectPreviewFramesById: () => ({ root: { id: 'root' } as never }),
        collectPreviewPlacedBounds: () => ({ root: { x: 1, y: 2, w: 3, h: 4 } }),
        fitPreviewSvgToRenderedContent,
        patchPreviewSvgFromLayout: vi.fn(),
        routePreviewArrows: () => [],
        patchPreviewArrowSvg: vi.fn(),
        syncPreviewArrowsInModel,
        previewArrowComponentId: () => 'arrow-alpha',
        createPreviewArrowSvgFragment,
      }),
      __DG_getPreviewBridgeBundleRenderContract: () => ({
        renderFreshPreviewSvg,
        renderPreviewFrameTreeToSvg,
      }),
      __DG_getPreviewBridgeRelayoutContract: () => ({
        collectPreviewRelayoutFrameOverrides: (overrides: Record<string, unknown>) => overrides,
        applyPreviewOverridesToFrameTree: vi.fn(),
      }),
      LayoutEngine: {
        previewEngines: {
          elk: {
            renderPreviewElkRawView: vi.fn(() => ({ id: 'raw' } as never)),
          },
        },
      },
      __DG_getPreviewShellBootstrapContract: () => ({
        getPreviewEngineShellController: () => ({
          getLayoutOverrides: () => ({ fromController: true }),
        }),
      }),
      __DG_previewEngineRawView: false,
      PreviewEngineLayoutControls: {
        refresh: layoutControlsRefresh,
      },
    } as never;

    const install = createPreviewLayoutBridgeInstallRuntimeFromLegacyBrowserHost({
      ownerDocument,
      previewWindow,
    });
    const runtime = install.getRuntime();
    runtime.state.previewDocumentJson = {
      kind: 'frame-diagram',
      layoutEngine: 'elk-layered',
      frameTree: {
        root: { id: 'root', children: [] },
        arrows: [],
        layoutEngine: 'elk-layered',
      },
    };
    runtime.state.frameTreeJson = {
      root: { id: 'root', children: [] },
      arrows: [],
      layoutEngine: 'elk-layered',
    };
    runtime.state.textAdapter = { measurementBackend: 'harfbuzz' } as never;

    const model = {
      removedIds: new Set<string>(),
      topLevelRemovalIds: () => [],
      layoutOverrides: { existing: true },
      loadTree() {},
    };

    await install.performEngineRelayout(model as never, {}, {}, { skipModelUpdate: true });
    expect(capturedEngineOverrides).toEqual({
      fromYaml: true,
      existing: true,
      fromController: true,
    });
    expect(layoutControlsRefresh).toHaveBeenCalledTimes(1);

    expect(install.renderFrameTreeToSvg(
      { root: { id: 'root' }, arrows: [] } as never,
      { width: 320, height: 200 },
      { iconElements: [{ id: 'icon' }] },
    )).toEqual({ tagName: 'svg' });
    expect(renderPreviewFrameTreeToSvg).toHaveBeenCalledTimes(1);

    expect(install.arrowComponentId({} as never)).toBe('arrow-alpha');
    expect(install.createArrowsSvg([], {})).toEqual({ kind: 'fragment' });
    install.syncArrowsInModel(model as never, [], []);
    expect(syncPreviewArrowsInModel).toHaveBeenCalledTimes(1);

    install.installCompatWindowBindings();
    ((previewWindow as Record<string, (enabled: boolean) => void>).__DG_setPreviewEngineRawView)(true);
    expect((previewWindow as { __DG_previewEngineRawView: boolean }).__DG_previewEngineRawView)
      .toBe(true);
    expect((previewWindow as Record<string, unknown>).__DG_previewBridgeHostRuntime).toBeTruthy();
    expect((previewWindow as Record<string, unknown>).__DG_previewBridgeRenderHost).toBeTruthy();
    expect(install.setFrameTreeLayoutEngine('v3')).toBe('v3');
    expect(install.getFrameTreeJson()).toMatchObject({ layoutEngine: 'v3' });
    expect(runtime.state.previewDocumentJson).toMatchObject({
      layoutEngine: 'v3',
      frameTree: { layoutEngine: 'v3' },
    });
    expect(
      (previewWindow as Record<string, (layoutEngine: string) => string | null>)
        .setFrameTreeLayoutEngine('dagre'),
    ).toBe('dagre');
    expect(install.getFrameTreeJson()).toMatchObject({ layoutEngine: 'dagre' });
    expect(
      (previewWindow as Record<string, () => unknown>).getLayoutTextAdapter(),
    ).toEqual({ measurementBackend: 'harfbuzz' });
  });
});
