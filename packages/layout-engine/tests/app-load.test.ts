import { describe, expect, it } from 'vitest';
import {
  createLoadPreviewSvgHostOptionsFromRuntime,
  createLoadPreviewSvgHostOptions,
  loadPreviewSvg,
  resolvePreviewFrameTreeSeed,
  type LoadPreviewSvgOptions,
} from '../src/preview-shell/app-load.js';

type HarnessOptions = {
  canonicalState?: { frameTree?: unknown; previewDocument?: { kind?: string | null } | null } | null;
  preservedSelectionIds?: string[] | null;
  readiness?: { ready: boolean; reason?: string | null; textAdapterError?: string | null };
  isElkLayeredDiagram?: boolean;
  gridInfo?: unknown;
  gridOverrides?: Record<string, unknown> | null | undefined;
  fallbackResponse?: {
    ok: boolean;
    status: number;
    markup?: string;
  };
};

function createLoadHarness(config: HarnessOptions = {}) {
  const calls: string[] = [];
  const stageHtml: string[] = [];
  const frameTreeValues: unknown[] = [];
  const markedSaved: string[] = [];
  const renderResult = { svg: { tag: 'svg' }, width: 640, height: 480 };

  const options: LoadPreviewSvgOptions = {
    invocation: {
      canonicalState: config.canonicalState ?? null,
      preserveSelectionIds: config.preservedSelectionIds ?? null,
    },
    deselectAll: () => calls.push('deselectAll'),
    initLayoutBridge: async () => {
      calls.push('initLayoutBridge');
    },
    setFrameTreeJson: (frameTree) => {
      calls.push('setFrameTreeJson');
      frameTreeValues.push(frameTree);
    },
    isElkLayeredDiagram: () => Boolean(config.isElkLayeredDiagram),
    resetOverrideState: () => calls.push('resetOverrideState'),
    initElkPanel: () => calls.push('initElkPanel'),
    getLocalRelayoutStatus: () => config.readiness ?? { ready: true },
    escapeHtml: (value) => value.replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
    setStageHtml: (html) => {
      calls.push('setStageHtml');
      stageHtml.push(html);
    },
    loadTree: async () => {
      calls.push('loadTree');
    },
    loadGridInfo: async () => {
      calls.push('loadGridInfo');
    },
    getGridInfo: () => config.gridInfo,
    setDiagramGrid: () => calls.push('setDiagramGrid'),
    populateGridControls: () => calls.push('populateGridControls'),
    applyWaypointOverrides: () => calls.push('applyWaypointOverrides'),
    applyAllOverrides: () => calls.push('applyAllOverrides'),
    bindInteraction: () => calls.push('bindInteraction'),
    renderGridOverlay: () => calls.push('renderGridOverlay'),
    restoreSelection: (ids) => calls.push(`restoreSelection:${(ids || []).join(',')}`),
    runConstraints: () => calls.push('runConstraints'),
    markSaved: (serializedState) => {
      calls.push('markSaved');
      markedSaved.push(serializedState);
    },
    serializeDirtyState: () => 'dirty-state',
    signalDiagramLoaded: () => calls.push('signalDiagramLoaded'),
    getGridOverrides: () => config.gridOverrides,
    pruneLinkedRootGridOverrides: () => calls.push('pruneLinkedRootGridOverrides'),
    renderFreshSvg: async () => {
      calls.push('renderFreshSvg');
      return renderResult;
    },
    replaceStageWithRenderedSvg: (result) => {
      calls.push(`replaceStageWithRenderedSvg:${String(result.width)}x${String(result.height)}`);
    },
    fitRenderedSvg: (result) => {
      calls.push(`fitRenderedSvg:${String(result.width)}x${String(result.height)}`);
    },
    fetchFallbackSvg: async () => ({
      ok: config.fallbackResponse?.ok ?? true,
      status: config.fallbackResponse?.status ?? 200,
      text: async () => config.fallbackResponse?.markup ?? '<svg />',
    }),
  };

  return {
    calls,
    frameTreeValues,
    markedSaved,
    options,
    stageHtml,
  };
}

describe('preview load helpers', () => {
  it('seeds a null frame tree for sequence canonical state', () => {
    expect(resolvePreviewFrameTreeSeed({
      previewDocument: { kind: 'sequence' },
    })).toEqual({
      shouldSet: true,
      frameTree: null,
    });
  });

  it('falls back to server SVG and replays the shared follow-up path', async () => {
    const harness = createLoadHarness({
      canonicalState: {
        previewDocument: { kind: 'sequence' },
      },
      fallbackResponse: {
        ok: true,
        status: 200,
        markup: '<svg id="fallback" />',
      },
      gridInfo: { cols: 6 },
      isElkLayeredDiagram: true,
      preservedSelectionIds: ['a', 'b'],
      readiness: {
        ready: false,
        reason: 'bridge <down>',
      },
    });

    const mode = await loadPreviewSvg(harness.options);

    expect(mode).toBe('fallback-server-svg');
    expect(harness.frameTreeValues).toEqual([null]);
    expect(harness.stageHtml[0]).toContain('Loading...');
    expect(harness.stageHtml[1]).toContain('bridge &lt;down&gt;');
    expect(harness.stageHtml[2]).toBe('<svg id="fallback" />');
    expect(harness.calls.filter((call) => call === 'resetOverrideState')).toHaveLength(2);
    expect(harness.calls).toContain('restoreSelection:a,b');
    expect(harness.calls).toContain('signalDiagramLoaded');
    expect(harness.markedSaved).toEqual(['dirty-state']);
    expect(harness.calls).not.toContain('renderFreshSvg');
  });

  it('returns a fallback error without running the post-load path when the server SVG fails', async () => {
    const harness = createLoadHarness({
      fallbackResponse: {
        ok: false,
        status: 503,
      },
      readiness: {
        ready: false,
        reason: 'offline',
      },
    });

    const mode = await loadPreviewSvg(harness.options);

    expect(mode).toBe('fallback-error');
    expect(harness.stageHtml.at(-1)).toContain('503');
    expect(harness.calls).not.toContain('loadTree');
    expect(harness.calls).not.toContain('signalDiagramLoaded');
  });

  it('re-initializes ELK after client render and prunes linked root grid overrides', async () => {
    const harness = createLoadHarness({
      gridInfo: { cols: 8 },
      gridOverrides: { cols: 8 },
      isElkLayeredDiagram: true,
    });

    const mode = await loadPreviewSvg(harness.options);

    expect(mode).toBe('client-render');
    expect(harness.calls.filter((call) => call === 'initElkPanel')).toHaveLength(2);
    expect(harness.calls.filter((call) => call === 'resetOverrideState')).toHaveLength(1);
    expect(harness.calls).toContain('pruneLinkedRootGridOverrides');
    expect(harness.calls).toContain('renderFreshSvg');
    expect(harness.calls).toContain('replaceStageWithRenderedSvg:640x480');
    expect(harness.calls).toContain('fitRenderedSvg:640x480');
  });

  it('resets overrides after grid load for non-ELK client renders', async () => {
    const harness = createLoadHarness({
      gridOverrides: null,
      isElkLayeredDiagram: false,
    });

    const mode = await loadPreviewSvg(harness.options);

    expect(mode).toBe('client-render');
    expect(harness.calls.filter((call) => call === 'resetOverrideState')).toHaveLength(1);
    expect(harness.calls).not.toContain('initElkPanel');
    expect(harness.calls).toContain('restoreSelection:');
  });

  it('builds typed load options from host-owned bridge contracts', async () => {
    const calls: string[] = [];
    let fetchedUrl = '';
    const stage = {
      innerHTML: '',
      replaceChildren(svg: { tag: string }) {
        calls.push(`replace:${svg.tag}`);
      },
    };
    const options = createLoadPreviewSvgHostOptions({
      invocation: {
        preserveSelectionIds: ['alpha'],
      },
      stage,
      slug: 'demo',
      engine: 'mermaid',
      gridEnabled: false,
      deselectAll: () => calls.push('deselectAll'),
      previewBridgeHost: {
        async initLayoutBridge(slug: string) {
          calls.push(`init:${slug}`);
        },
        setFrameTreeJson(frameTree: unknown) {
          calls.push(`frameTree:${String(frameTree)}`);
        },
      },
      isEngineLayoutActive: () => true,
      resetOverrideState: () => calls.push('resetOverrideState'),
      initEnginePanel: () => calls.push('initEnginePanel'),
      getLocalRelayoutStatus: () => ({ ready: true }),
      escapeHtml: (value) => value,
      loadTree: async () => {
        calls.push('loadTree');
      },
      loadGridInfo: async () => {
        calls.push('loadGridInfo');
      },
      getGridInfo: () => null,
      setDiagramGrid: () => calls.push('setDiagramGrid'),
      populateGridControls: () => calls.push('populateGridControls'),
      applyWaypointOverrides: () => calls.push('applyWaypointOverrides'),
      applyAllOverrides: () => calls.push('applyAllOverrides'),
      bindInteraction: () => calls.push('bindInteraction'),
      renderGridOverlay: () => calls.push('renderGridOverlay'),
      restoreSelection: (ids) => calls.push(`restore:${(ids || []).join(',')}`),
      runConstraints: () => calls.push('runConstraints'),
      markSaved: (serializedState) => calls.push(`markSaved:${serializedState}`),
      serializeDirtyState: () => 'state',
      signalDiagramLoaded: () => calls.push('signalDiagramLoaded'),
      getGridOverrides: () => ({ cols: 8 }),
      pruneLinkedRootGridOverrides: () => calls.push('pruneLinkedRootGridOverrides'),
      previewBridgeRender: {
        async renderFreshPreviewSvg(renderOptions) {
          calls.push(`render:${JSON.stringify(renderOptions.gridOverrides)}`);
          return { svg: { tag: 'svg' }, width: 320, height: 200 };
        },
      },
      overrides: { alpha: { dx: 8 } },
      model: { id: 'model' },
      fitRenderedSvgToContent: (_svg, fitOptions) => {
        calls.push(`fit:${fitOptions.minWidth}x${fitOptions.minHeight}`);
      },
    });

    await options.initLayoutBridge();
    options.setFrameTreeJson?.('seed');
    await options.renderFreshSvg();
    options.replaceStageWithRenderedSvg({ svg: { tag: 'svg' }, width: 320, height: 200 });
    options.fitRenderedSvg?.({ svg: { tag: 'svg' }, width: 320, height: 200 });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      fetchedUrl = url;
      return {
        ok: true,
        status: 200,
        text: async () => '<svg />',
      };
    }) as typeof fetch;
    try {
      await options.fetchFallbackSvg();
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls).toEqual([
      'init:demo',
      'frameTree:seed',
      'render:{"cols":8}',
      'replace:svg',
      'fit:320x200',
    ]);
    expect(fetchedUrl).toMatch(/^\/svg\/demo-onbrand-mermaid\.svg\?t=\d+$/);
  });

  it('derives typed load options from thinner runtime-owned state', async () => {
    const calls: string[] = [];
    const selectedIds = new Set(['stale']);
    const stage = {
      innerHTML: '',
      replaceChildren(svg: { tag: string }) {
        calls.push(`replace:${svg.tag}`);
      },
    };
    const options = createLoadPreviewSvgHostOptionsFromRuntime({
      invocation: {
        preserveSelectionIds: ['alpha', 'beta'],
      },
      stage,
      slug: 'demo',
      engine: 'mermaid',
      gridEnabled: true,
      deselectAll: () => calls.push('deselectAll'),
      previewBridgeHost: {
        async initLayoutBridge(slug: string) {
          calls.push(`init:${slug}`);
        },
      },
      isEngineLayoutActive: () => false,
      resetOverrideState: () => calls.push('resetOverrideState'),
      initEnginePanel: () => calls.push('initEnginePanel'),
      getLocalRelayoutStatus: () => ({ ready: true }),
      escapeHtml: (value) => value,
      loadTree: async () => {
        calls.push('loadTree');
      },
      loadGridInfo: async () => {
        calls.push('loadGridInfo');
      },
      gridState: {
        getGridInfo: () => ({ cols: 8 }),
        setDiagramGrid: () => calls.push('setDiagramGrid'),
        getGridOverrides: () => ({ cols: 8 }),
        pruneLinkedRootGridOverrides: () => calls.push('pruneLinkedRootGridOverrides'),
      },
      populateGridControls: () => calls.push('populateGridControls'),
      applyWaypointOverrides: () => calls.push('applyWaypointOverrides'),
      applyAllOverrides: () => calls.push('applyAllOverrides'),
      bindInteraction: () => calls.push('bindInteraction'),
      renderGridOverlay: () => calls.push('renderGridOverlay'),
      selectionState: {
        selectedIds,
        reapplySelection: () => calls.push('reapplySelection'),
      },
      runConstraints: () => calls.push('runConstraints'),
      previewSaveClient: {
        markSaved: (serializedState) => calls.push(`markSaved:${serializedState}`),
      },
      dirtyStateSerializer: {
        serializeDirtyState: () => 'dirty-state',
      },
      signalDiagramLoaded: () => calls.push('signalDiagramLoaded'),
      previewBridgeRender: {
        async renderFreshPreviewSvg(renderOptions) {
          calls.push(`render:${JSON.stringify(renderOptions.gridOverrides)}`);
          return { svg: { tag: 'svg' }, width: 320, height: 200 };
        },
      },
      overrides: { alpha: { dx: 8 } },
      model: { id: 'model' },
      fitRenderedSvgToContent: (_svg, fitOptions) => {
        calls.push(`fit:${fitOptions.minWidth}x${fitOptions.minHeight}`);
      },
    });

    await options.initLayoutBridge();
    await options.renderFreshSvg();
    options.restoreSelection(['alpha', 'beta']);
    options.markSaved(options.serializeDirtyState());
    options.replaceStageWithRenderedSvg({ svg: { tag: 'svg' }, width: 320, height: 200 });
    options.fitRenderedSvg?.({ svg: { tag: 'svg' }, width: 320, height: 200 });

    expect(Array.from(selectedIds)).toEqual(['alpha', 'beta']);
    expect(calls).toEqual([
      'init:demo',
      'render:{"cols":8}',
      'reapplySelection',
      'markSaved:dirty-state',
      'replace:svg',
      'fit:320x200',
    ]);
  });
});
