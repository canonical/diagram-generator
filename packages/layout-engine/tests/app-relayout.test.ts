import { describe, expect, it, vi } from 'vitest';
import { Align, Border, Fill, Frame, FrameDiagram, createLine } from '../src/frame-model.js';
import {
  applyPreviewOverridesToFrameTree,
  clearPreviewTransientLayoutOverrides,
  clearPreviewCoercedOverrides,
  collectPreviewRelayoutFrameOverrides,
  collectPreviewCoercedKeys,
  createPreviewRelayoutRuntimeState,
  dispatchPreviewRelayoutFailureHost,
  dispatchPreviewClearOverride,
  dispatchPreviewRelayoutSuccessHost,
  formatPreviewRelayoutStatusMessage,
  isPreviewFrameManagedTarget,
  markPreviewRelayoutExecution,
  resolvePreviewLayoutRelayoutStatus,
  resolvePreviewV3RelayoutStatus,
  runPreviewRelayout,
} from '../src/preview-shell/app-relayout.js';

describe('preview relayout helpers', () => {
  it('clears runtime-only coerced overrides and empty entries', () => {
    const overrides = {
      root: { sizing_w: 'FIXED', width: 200, keep: true },
      alpha: { sizing_h: 'FIXED', height: 120 },
      beta: { gap: 24 },
    };
    const coercedKeys = new Set(['root:sizing_w', 'alpha:sizing_h', 'beta:gap']);

    clearPreviewCoercedOverrides(overrides, coercedKeys);

    expect(overrides).toEqual({
      root: { keep: true },
    });
    expect(coercedKeys.size).toBe(0);
  });

  it('collects only supported runtime coercion keys from relayout results', () => {
    expect(collectPreviewCoercedKeys({
      coerced: new Map([
        ['root', { sizingW: true, width: 200 }],
        ['alpha', { sizingH: true, gap: 24 }],
      ]),
    })).toEqual(['root:sizing_w', 'alpha:sizing_h']);
  });

  it('collects relayout frame overrides through the shared manifest filter', () => {
    expect(collectPreviewRelayoutFrameOverrides({
      root: { gap_delta: null, style: 'parent' },
      alpha: { style: 'child' },
      beta: {},
    })).toEqual({
      root: { gap_delta: null },
    });
  });

  it('creates and resolves layout relayout runtime status through the shared helpers', () => {
    const runtimeState = createPreviewRelayoutRuntimeState();

    markPreviewRelayoutExecution(runtimeState, 'local', 'ready');

    expect(
      resolvePreviewLayoutRelayoutStatus({
        runtimeState,
        getLocalRelayoutStatus: () => ({
          ready: true,
          reason: 'ready',
          overrideMode: 'auto',
          frameTreeLoaded: true,
          textAdapterReady: true,
          textAdapterBackend: 'harfbuzz',
          textAdapterError: null,
        }),
      }),
    ).toEqual({
      engine: 'grid',
      interactiveExecutor: 'local-only',
      interactiveFallbackAvailable: false,
      local: {
        ready: true,
        reason: 'ready',
        overrideMode: 'auto',
        frameTreeLoaded: true,
        textAdapterReady: true,
        textAdapterBackend: 'harfbuzz',
        textAdapterError: null,
      },
      localReady: true,
      frameManaged: true,
      fallbackActive: false,
      lastMode: 'local',
      lastReason: 'ready',
      sequence: 1,
    });
    expect(resolvePreviewV3RelayoutStatus).toBe(resolvePreviewLayoutRelayoutStatus);
  });

  it('dispatches relayout failure and success host callbacks through the shared runtime owner', () => {
    const runtimeState = createPreviewRelayoutRuntimeState();
    const failureEvents: unknown[] = [];
    const successEvents: string[] = [];
    const overrides = {
      alpha: { dx: 8, dy: 4, keep: true },
      beta: { dw: 6 },
    };

    expect(formatPreviewRelayoutStatusMessage('missing-frame-tree')).toContain('frame tree');
    expect(
      dispatchPreviewRelayoutFailureHost({
        runtimeState,
        reason: 'missing-frame-tree',
        triggerCid: 'alpha',
        setStatus(message, kind) {
          failureEvents.push({ setStatus: { message, kind } });
        },
        renderSelectionInspector(cid) {
          failureEvents.push({ renderSelectionInspector: cid });
        },
        updateOverrideSummary() {
          failureEvents.push('updateOverrideSummary');
        },
        refreshTreeColors() {
          failureEvents.push('refreshTreeColors');
        },
        runConstraints() {
          failureEvents.push('runConstraints');
        },
      }),
    ).toBe(false);
    expect(failureEvents).toEqual([
      {
        setStatus: {
          message: 'Local relayout unavailable: frame tree not loaded',
          kind: 'error',
        },
      },
      { renderSelectionInspector: 'alpha' },
      'updateOverrideSummary',
      'refreshTreeColors',
      'runConstraints',
    ]);

    expect(
      dispatchPreviewRelayoutSuccessHost({
        triggerCid: 'alpha',
        result: { coerced: null },
        executionLabel: 'local',
        runtimeState,
        getRelayoutStatus: () => resolvePreviewLayoutRelayoutStatus({
          runtimeState,
          getLocalRelayoutStatus: () => ({ ready: true, reason: 'ready' }),
        }),
        failRelayout: vi.fn(),
        overrides,
        buildTreeUi() {
          successEvents.push('buildTreeUi');
        },
        applyWaypointOverrides() {
          successEvents.push('applyWaypointOverrides');
        },
        bindInteraction() {
          successEvents.push('bindInteraction');
        },
        applyAllOverrides() {
          successEvents.push('applyAllOverrides');
        },
        reapplySelection() {
          successEvents.push('reapplySelection');
        },
        refreshGridInfo() {
          successEvents.push('refreshGridInfo');
        },
        renderGridOverlay() {
          successEvents.push('renderGridOverlay');
        },
        renderSelectionInspector() {
          successEvents.push('renderSelectionInspector');
        },
        updateOverrideSummary() {
          successEvents.push('updateOverrideSummary');
        },
        refreshTreeColors() {
          successEvents.push('refreshTreeColors');
        },
        runConstraints() {
          successEvents.push('runConstraints');
        },
        setStatus(message, kind) {
          successEvents.push(`setStatus:${message}:${kind}`);
        },
      }),
    ).toBe(true);
    expect(overrides).toEqual({
      alpha: { keep: true },
    });
    expect(successEvents).toEqual([
      'buildTreeUi',
      'applyWaypointOverrides',
      'bindInteraction',
      'applyAllOverrides',
      'reapplySelection',
      'refreshGridInfo',
      'renderGridOverlay',
      'renderSelectionInspector',
      'updateOverrideSummary',
      'refreshTreeColors',
      'runConstraints',
      'setStatus:Ready:ok',
    ]);
  });

  it('filters frame-managed targets through the shared relayout helper', () => {
    const target = {
      closest() {
        return {
          getAttribute(name: string) {
            return name === 'data-component-id' ? 'alpha' : null;
          },
        };
      },
    };

    expect(
      isPreviewFrameManagedTarget({
        target,
        relayoutStatus: { frameManaged: true },
        getNode: (cid) => (cid === 'alpha' ? { type: 'frame' } : null),
      }),
    ).toBe(true);
    expect(
      isPreviewFrameManagedTarget({
        target,
        relayoutStatus: { frameManaged: true },
        getNode: () => ({ type: 'arrow' }),
      }),
    ).toBe(false);

    const transientOverrides = {
      alpha: { dx: 8, dy: 4 },
      beta: { keep: true },
    };
    clearPreviewTransientLayoutOverrides(transientOverrides);
    expect(transientOverrides).toEqual({
      beta: { keep: true },
    });
  });

  it('dispatches clear-override relayout fallback for waypoint overrides', async () => {
    const actions: unknown[] = [];

    dispatchPreviewClearOverride({
      cid: 'arrow-1',
      hasWaypointOverride: true,
      relayoutStatus: { localReady: true },
      clearOverride(cid) {
        actions.push({ clearOverride: cid });
      },
      setDirty() {
        actions.push('setDirty');
      },
      applyAllOverrides() {
        actions.push('applyAllOverrides');
      },
      isSelected() {
        return true;
      },
      updateInspector(cid) {
        actions.push({ updateInspector: cid });
      },
      requestRelayout() {
        actions.push('requestRelayout');
        return Promise.resolve(false);
      },
      restoreArrowFromTree(cid) {
        actions.push({ restoreArrowFromTree: cid });
      },
      captureOverrideEntries(ids) {
        return { ids };
      },
      commitOverridePatchAction(label, beforeEntries, afterEntries) {
        actions.push({ commit: { label, beforeEntries, afterEntries } });
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(actions).toEqual([
      { clearOverride: 'arrow-1' },
      'setDirty',
      'requestRelayout',
      {
        commit: {
          label: 'Clear override',
          beforeEntries: { ids: ['arrow-1'] },
          afterEntries: { ids: ['arrow-1'] },
        },
      },
      { restoreArrowFromTree: 'arrow-1' },
    ]);
  });

  it('applies linked grid spacing before explicit root overrides', () => {
    const diagram = new FrameDiagram({
      root: new Frame({
        id: 'root',
        gap: 24,
        padding: 8,
        paddingTop: 8,
        paddingRight: 8,
        paddingBottom: 8,
        paddingLeft: 8,
        children: [],
      }),
    });

    applyPreviewOverridesToFrameTree(
      diagram,
      {
        root: {
          gap: 18,
          padding_left: 12,
          padding_top: 10,
        },
      },
      {
        col_gap: '40',
        row_gap: '64',
        outer_margin: '48',
        margin_left: '22',
        margin_top: '26',
        link_to_root: true,
      },
    );

    expect(diagram.gridColGap).toBe(40);
    expect(diagram.gridRowGap).toBe(64);
    expect(diagram.gridOuterMargin).toBe(40);
    expect(diagram.root.gap).toBe(18);
    expect(diagram.root.paddingTop).toBe(10);
    expect(diagram.root.paddingLeft).toBe(12);
    expect(diagram.root.paddingRight).toBe(40);
    expect(diagram.root.paddingBottom).toBe(40);
  });

  it('applies child order, heading, label, and frame property overrides', () => {
    const alpha = new Frame({ id: 'alpha' });
    const beta = new Frame({ id: 'beta' });
    const headingChild = new Frame({
      id: 'gamma__heading',
      role: 'heading',
      label: [createLine('Before')],
    });
    const bodyChild = new Frame({
      id: 'gamma__body',
      align: Align.TOP_LEFT,
    });
    const gamma = new Frame({
      id: 'gamma',
      gap: 30,
      gapDelta: 6,
      align: Align.BOTTOM_RIGHT,
      heading: createLine('Old heading'),
      label: [createLine('Old label')],
      children: [headingChild, bodyChild],
    });
    const root = new Frame({
      id: 'root',
      children: [alpha, beta, gamma],
    });
    const diagram = new FrameDiagram({ root });

    applyPreviewOverridesToFrameTree(diagram, {
      root: {
        children_order: ['beta', 'alpha'],
      },
      gamma: {
        direction: 'HORIZONTAL',
        gap_delta: null,
        fill: 'GREY',
        border: 'DASHED',
        position: 'absolute',
        width: '320',
        min_width: '200',
        max_width_chars: '42',
        text: {
          heading: 'Fresh heading',
          label: ['One', 'Two'],
        },
      },
    });

    expect(diagram.root.children.map((child) => child.id)).toEqual(['beta', 'alpha', 'gamma']);
    expect(gamma.direction).toBe('HORIZONTAL');
    expect(gamma.gap).toBe(24);
    expect(gamma.gapDelta).toBeUndefined();
    expect(gamma.fill).toBe(Fill.GREY);
    expect(gamma.border).toBe(Border.DASHED);
    expect(gamma.positionType).toBe('ABSOLUTE');
    expect(gamma.width).toBe(320);
    expect(gamma.minWidth).toBe(200);
    expect(gamma.maxWidthChars).toBe(42);
    expect(gamma.label.map((line) => line.content)).toEqual(['One', 'Two']);
    expect(headingChild.label.map((line) => line.content)).toEqual(['Fresh heading']);
    expect(bodyChild.align).toBe(Align.BOTTOM_RIGHT);
  });

  it('fails fast when local relayout is unavailable', async () => {
    const failRelayout = vi.fn(() => false);

    await runPreviewRelayout({
      triggerCid: 'alpha',
      overrides: {},
      coercedKeys: new Set(),
      gridOverrides: {},
      normalizeGridOverrides: vi.fn((value) => value),
      relayoutStatus: { localReady: false, local: { reason: 'missing-frame-tree' } },
      isEngineLayoutActive: false,
      isElkLayeredDiagram: false,
      performLocalRelayout: vi.fn(() => null),
      failRelayout,
      finishRelayout: vi.fn(),
      logError: vi.fn(),
    });

    expect(failRelayout).toHaveBeenCalledWith('missing-frame-tree', 'alpha');
  });

  it('prefers ELK relayout when the diagram is layered and otherwise records local coercion keys', async () => {
    const finishRelayout = vi.fn((triggerCid, result, label) => ({ triggerCid, result, label }));
    const performElkRelayout = vi.fn(async () => ({ coerced: null }));
    const performLocalRelayout = vi.fn(() => ({
      coerced: new Map([
        ['root', { sizingW: true }],
      ]),
    }));
    const elkCoercedKeys = new Set<string>();
    const localCoercedKeys = new Set<string>();

    const elkResult = await runPreviewRelayout({
      triggerCid: 'root',
      overrides: {},
      coercedKeys: elkCoercedKeys,
      gridOverrides: {},
      normalizeGridOverrides: vi.fn((value) => value),
      relayoutStatus: { localReady: true, local: { reason: null } },
      isEngineLayoutActive: true,
      isElkLayeredDiagram: true,
      performEngineRelayout: performElkRelayout,
      performElkRelayout,
      performLocalRelayout,
      failRelayout: vi.fn(),
      finishRelayout,
      logError: vi.fn(),
    });
    const localResult = await runPreviewRelayout({
      triggerCid: 'root',
      overrides: {},
      coercedKeys: localCoercedKeys,
      gridOverrides: {},
      normalizeGridOverrides: vi.fn((value) => value),
      relayoutStatus: { localReady: true, local: { reason: null } },
      isEngineLayoutActive: false,
      isElkLayeredDiagram: false,
      performLocalRelayout,
      failRelayout: vi.fn(),
      finishRelayout,
      logError: vi.fn(),
    });

    expect(performElkRelayout).toHaveBeenCalledTimes(1);
    expect(elkResult).toEqual({
      triggerCid: 'root',
      result: { coerced: null },
      label: 'elk',
    });
    expect(localCoercedKeys.has('root:sizing_w')).toBe(true);
    expect(localResult).toEqual({
      triggerCid: 'root',
      result: {
        coerced: new Map([
          ['root', { sizingW: true }],
        ]),
      },
      label: 'local',
    });
  });
});
