import { describe, expect, it, vi } from 'vitest';
import { createPreviewGridEditorBrowserStateFromBrowserHost } from '../src/preview-shell/app-grid-editor-browser-state.js';

describe('createPreviewGridEditorBrowserStateFromBrowserHost', () => {
  it('replaces overrides and prunes linked root grid fields through typed host state', () => {
    let overrides = {
      page: {
        gap: 24,
        gap_delta: 8,
        padding: 12,
        keep: true,
      },
    } satisfies Record<string, Record<string, unknown>>;
    const invalidateOverrideBoundFacades = vi.fn();
    const model = {
      overrides,
      gridOverrides: { cols: 4 },
      roots: [{ id: 'page' }],
      get: vi.fn(),
      getParent: vi.fn(),
      getType: vi.fn(),
      cleanOverride: vi.fn(),
      setOverride: vi.fn(),
      setWaypointOverride: vi.fn(),
    };
    const state = createPreviewGridEditorBrowserStateFromBrowserHost({
      model,
      editorState: {
        setPendingGridAction: vi.fn(),
      },
      previewSaveClient: {
        setDirty: vi.fn(),
      },
      constraints: {
        forComponent: vi.fn(),
      },
      lastViolationsState: {
        get: vi.fn(),
      },
      overridesState: {
        get: () => overrides,
        set: (nextOverrides) => {
          overrides = nextOverrides;
        },
      },
      invalidateOverrideBoundFacades,
      multiActionGapState: {
        get: () => 24,
        set: vi.fn(),
      },
      baselineStep: 8,
      getPreviewBridgeRelayoutContract: () => ({
        restorePreviewOverrideEntries: ({ currentOverrides }) => currentOverrides,
      }),
      getPreviewShellInteractionContract: () => ({
        normalizeSelectionGap: (gap) => gap,
      }),
      getSceneFacade: () => ({
        clearPendingRelayout: vi.fn(),
        applyLocalRestoreRefresh: vi.fn(),
      }),
      getRequestLayoutRelayout: () => vi.fn(),
      getMultiActionGapInput: () => null,
      setTimeoutFn: vi.fn(),
      clearTimeoutFn: vi.fn(),
    });

    const nextOverrides = state.replaceOverrides({
      page: {
        gap: 12,
        padding_left: 16,
        keep: true,
      },
    });

    expect(nextOverrides).toEqual({
      page: {
        gap: 12,
        padding_left: 16,
        keep: true,
      },
    });
    expect(model.overrides).toBe(nextOverrides);
    expect(invalidateOverrideBoundFacades).toHaveBeenCalledTimes(1);

    state.pruneLinkedRootGridOverrides();

    expect(overrides).toEqual({
      page: {
        keep: true,
      },
    });
  });

  it('restores override entries, normalizes multi-gap input, and persists dirty state through typed callbacks', () => {
    let overrides = {
      alpha: { dx: 4 },
    } satisfies Record<string, Record<string, unknown>>;
    const previewSaveClient = {
      setDirty: vi.fn(),
    };
    const multiActionGapInput = { value: '' };
    const model = {
      overrides,
      gridOverrides: null,
      roots: [{ id: 'page' }],
      get: vi.fn((cid: string) => (
        cid === 'arrow'
          ? { type: 'arrow', data: { waypoints: [{ x: 1, y: 2 }] } }
          : { type: 'box', data: { id: cid } }
      )),
      getParent: vi.fn(),
      getType: vi.fn((cid: string) => (cid === 'arrow' ? 'arrow' : 'box')),
      cleanOverride: vi.fn(),
      setOverride: vi.fn(),
      setWaypointOverride: vi.fn(),
    };
    const state = createPreviewGridEditorBrowserStateFromBrowserHost({
      model,
      editorState: {
        setPendingGridAction: vi.fn(),
      },
      previewSaveClient,
      constraints: {
        forComponent: vi.fn(),
      },
      lastViolationsState: {
        get: vi.fn(),
      },
      overridesState: {
        get: () => overrides,
        set: (nextOverrides) => {
          overrides = nextOverrides;
        },
      },
      invalidateOverrideBoundFacades: vi.fn(),
      multiActionGapState: {
        get: () => 24,
        set: vi.fn(),
      },
      baselineStep: 8,
      getPreviewBridgeRelayoutContract: () => ({
        restorePreviewOverrideEntries: ({ currentOverrides, entries }) => ({
          ...currentOverrides,
          ...entries as Record<string, Record<string, unknown>>,
        }),
      }),
      getPreviewShellInteractionContract: () => ({
        normalizeSelectionGap: (gap, snapStep) => Math.ceil(gap / snapStep) * snapStep,
      }),
      getSceneFacade: () => ({
        clearPendingRelayout: vi.fn(),
        applyLocalRestoreRefresh: vi.fn(),
      }),
      getRequestLayoutRelayout: () => vi.fn(),
      getMultiActionGapInput: () => multiActionGapInput,
      setTimeoutFn: vi.fn(),
      clearTimeoutFn: vi.fn(),
    });

    state.restoreOverrideEntries({
      beta: { dy: 12 },
    });
    state.setMultiActionGap('17');
    state.setOverride('alpha', { dx: 8 });
    state.setWaypointOverride('arrow');

    expect(overrides).toEqual({
      alpha: { dx: 4 },
      beta: { dy: 12 },
    });
    expect(model.cleanOverride).toHaveBeenCalledWith('beta');
    expect(state.getArrowNode('arrow')).toEqual({ waypoints: [{ x: 1, y: 2 }] });
    expect(model.setOverride).toHaveBeenCalledWith('alpha', { dx: 8 });
    expect(model.setWaypointOverride).toHaveBeenCalledWith('arrow', [{ x: 1, y: 2 }]);
    expect(previewSaveClient.setDirty).toHaveBeenCalledTimes(2);
    expect(multiActionGapInput.value).toBe('24');
  });

  it('owns relayout timer, pending-restore clearing, and model accessors through a typed host object', () => {
    const clearPendingRelayout = vi.fn();
    const applyLocalRestoreRefresh = vi.fn();
    const setPendingGridAction = vi.fn();
    const requestLayoutRelayout = vi.fn();
    const clearTimeoutFn = vi.fn();
    let scheduledCallback: (() => void) | null = null;
    const timerToken = { id: 'timer' };
    const state = createPreviewGridEditorBrowserStateFromBrowserHost({
      model: {
        overrides: {},
        gridOverrides: null,
        roots: [{ id: 'page' }],
        get: (cid: string) => ({
          type: cid === 'arrow' ? 'arrow' : 'box',
          layout: cid === 'parent' ? 'horizontal' : null,
          children: cid === 'parent' ? [{ id: 'child' }] : [],
          data: { id: cid },
        }),
        getParent: () => ({ data: { id: 'parent' } }),
        getType: () => 'box',
        cleanOverride: vi.fn(),
        setOverride: vi.fn(),
        setWaypointOverride: vi.fn(),
      },
      editorState: {
        setPendingGridAction,
      },
      previewSaveClient: {
        setDirty: vi.fn(),
      },
      constraints: {
        forComponent: vi.fn((_violations, cid: string) => ({ cid })),
      },
      lastViolationsState: {
        get: () => ['violation'],
      },
      overridesState: {
        get: () => ({}),
        set: vi.fn(),
      },
      invalidateOverrideBoundFacades: vi.fn(),
      multiActionGapState: {
        get: () => 24,
        set: vi.fn(),
      },
      baselineStep: 8,
      getPreviewBridgeRelayoutContract: () => ({
        restorePreviewOverrideEntries: ({ currentOverrides }) => currentOverrides,
      }),
      getPreviewShellInteractionContract: () => ({
        normalizeSelectionGap: (gap) => gap,
      }),
      getSceneFacade: () => ({
        clearPendingRelayout,
        applyLocalRestoreRefresh,
      }),
      getRequestLayoutRelayout: () => requestLayoutRelayout,
      getMultiActionGapInput: () => null,
      setTimeoutFn: (callback) => {
        scheduledCallback = callback;
        return timerToken;
      },
      clearTimeoutFn,
    });

    state.scheduleLayoutRelayout('alpha');
    state.clearPendingRestoreRuntime();
    state.applyLocalRestoreRefresh(true);
    scheduledCallback?.();

    expect(clearPendingRelayout).toHaveBeenCalledTimes(1);
    expect(clearTimeoutFn).toHaveBeenCalledWith(timerToken);
    expect(setPendingGridAction).toHaveBeenCalledWith(null);
    expect(applyLocalRestoreRefresh).toHaveBeenCalledWith(true);
    expect(requestLayoutRelayout).toHaveBeenCalledWith('alpha');
    expect(state.getParentNode('child')).toEqual({ id: 'parent' });
    expect(state.getComponentNode('alpha')).toEqual({ id: 'alpha' });
    expect(state.hasLayoutChildren('parent')).toBe(true);
    expect(state.getComponentType('alpha')).toBe('box');
    expect(state.getViolationsForComponent('alpha')).toEqual({ cid: 'alpha' });
  });
});
