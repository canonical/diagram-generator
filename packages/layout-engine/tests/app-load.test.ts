import { describe, expect, it } from 'vitest';
import {
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
});
