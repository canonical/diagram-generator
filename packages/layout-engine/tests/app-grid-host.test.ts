import { describe, expect, it, vi } from 'vitest';
import {
  bindPreviewGridControls,
  cyclePreviewGuideModeHost,
  dispatchPreviewGridControlChangeHost,
  dispatchPreviewGridControlChange,
  populatePreviewGridControlsHost,
  populatePreviewGridControls,
  readPreviewGridControlStateFromDom,
  resolvePreviewGridControlRuntimeUpdateHost,
  type PreviewGridHostControlElement,
} from '../src/preview-shell/app-grid-host.js';

type GridControlListeners = Record<string, Array<(event?: any) => void>>;

function createControl(initial: Partial<PreviewGridHostControlElement> = {}) {
  const listeners: GridControlListeners = {};
  const control: PreviewGridHostControlElement = {
    value: '',
    checked: false,
    readOnly: false,
    select: vi.fn(),
    addEventListener(type, listener) {
      listeners[type] ??= [];
      listeners[type].push(listener);
    },
    ...initial,
  };

  return {
    control,
    listeners,
  };
}

describe('preview grid host helpers', () => {
  it('populates grid controls from grid info unless a grid input is active', () => {
    const controls = new Map<string, PreviewGridHostControlElement>();
    const gridRows = createControl({ id: 'grid-rows' });
    const gridCols = createControl({ id: 'grid-cols' });
    const gridMargin = createControl({ id: 'grid-margin' });
    const gridLink = createControl({ id: 'grid-link-root' });
    controls.set('grid-rows', gridRows.control);
    controls.set('grid-cols', gridCols.control);
    controls.set('grid-margin', gridMargin.control);
    controls.set('grid-link-root', gridLink.control);

    expect(populatePreviewGridControls({
      gridInfo: {
        _cols: 3,
        _rows: 4,
        col_gap: 24,
        row_gap: 16,
        margin_top: 20,
        margin_right: 20,
        margin_bottom: 20,
        margin_left: 20,
        _link_to_root: false,
        _slack_absorption: true,
      },
      gridOverrides: {
        rows: 6,
      },
      hasSplitMargins: false,
      getElementById(id) {
        return controls.get(id) ?? null;
      },
    })).toBe(true);

    expect(gridCols.control.value).toBe(3);
    expect(gridRows.control.value).toBe(6);
    expect(gridMargin.control.value).toBe(20);
    expect(gridLink.control.checked).toBe(false);

    gridRows.control.value = 'editing';
    expect(populatePreviewGridControls({
      gridInfo: {
        _cols: 2,
        _rows: 2,
      },
      activeElementId: 'grid-rows',
      getElementById(id) {
        return controls.get(id) ?? null;
      },
    })).toBe(false);
    expect(gridRows.control.value).toBe('editing');
  });

  it('reads grid control state from DOM-style controls', () => {
    const controls = new Map<string, PreviewGridHostControlElement>([
      ['grid-cols', { value: '5' }],
      ['grid-rows', { value: '-2' }],
      ['grid-col-gap', { value: '24.1' }],
      ['grid-row-gap', { value: '' }],
      ['grid-margin-top', { value: '17.2' }],
      ['grid-margin-right', { value: 12 }],
      ['grid-margin-bottom', { value: null }],
      ['grid-margin-left', { value: '7' }],
      ['grid-link-root', { checked: false }],
      ['grid-slack', { checked: true }],
    ]);

    expect(readPreviewGridControlStateFromDom({
      hasSplitMargins: true,
      fallbackMargin: 24,
      getElementById(id) {
        return controls.get(id) ?? null;
      },
    })).toEqual({
      cols: 5,
      rows: 0,
      colGap: 24,
      rowGap: 0,
      marginTop: 17,
      marginRight: 12,
      marginBottom: 0,
      marginLeft: 7,
      linkToRoot: false,
      slackAbsorption: true,
    });
  });

  it('dispatches grid control changes through pending-action, timer, and overlay callbacks', async () => {
    const actions: unknown[] = [];
    const dirtied: boolean[] = [];
    const clearedTimers: unknown[] = [];
    const relayoutRequests: string[] = [];
    const overlayRows: unknown[] = [];
    const gridInfos: unknown[] = [];
    let pruned = false;
    let nextTimer: unknown = null;
    let scheduledCallback: (() => Promise<void>) | null = null;
    let pendingAction: unknown = null;
    let gridOverrides: Record<string, unknown> | null = null;

    const result = dispatchPreviewGridControlChange({
      gridInfo: { _rows: 2 } as any,
      resolveRuntimeUpdate() {
        return {
          controlState: {
            cols: 3,
            rows: 9,
            colGap: 24,
            rowGap: 16,
            marginTop: 20,
            marginRight: 20,
            marginBottom: 20,
            marginLeft: 20,
            linkToRoot: true,
            slackAbsorption: false,
          },
          gridOverrides: {
            rows: 9,
          },
          overlayGridInfo: {
            _rows: 11,
          } as any,
          relayoutRootId: 'root-1',
          shouldPruneLinkedRootOverrides: true,
        };
      },
      getPendingAction() {
        return pendingAction;
      },
      beginPendingAction() {
        return { label: 'Adjust grid' };
      },
      setPendingAction(action) {
        pendingAction = action;
        actions.push(action);
      },
      setGridOverrides(value) {
        gridOverrides = value;
      },
      pruneLinkedRootOverrides() {
        pruned = true;
      },
      setDirty(value) {
        dirtied.push(value);
      },
      relayoutTimer: 41,
      clearRelayoutTimer(timerId) {
        clearedTimers.push(timerId);
      },
      scheduleRelayout(callback) {
        scheduledCallback = callback;
        return 42;
      },
      setRelayoutTimer(timerId) {
        nextTimer = timerId;
      },
      async requestRelayout(rootId) {
        relayoutRequests.push(rootId);
      },
      commitPendingAction(action) {
        actions.push({ committed: action });
      },
      setOverlayGridInfo(gridInfo) {
        gridInfos.push(gridInfo);
      },
      setRowsControlValue(value) {
        overlayRows.push(value);
      },
      renderGridOverlay() {
        actions.push('render-overlay');
      },
    });

    expect(result.kind).toBe('applied');
    expect(gridOverrides).toEqual({ rows: 9 });
    expect(pruned).toBe(true);
    expect(dirtied).toEqual([true]);
    expect(clearedTimers).toEqual([41]);
    expect(nextTimer).toBe(42);
    expect(gridInfos).toEqual([{ _rows: 11 }]);
    expect(overlayRows).toEqual([11]);
    expect(actions).toContain('render-overlay');

    expect(scheduledCallback).not.toBeNull();
    await scheduledCallback?.();
    expect(relayoutRequests).toEqual(['root-1']);
    expect(actions).toContainEqual({ committed: { label: 'Adjust grid' } });
    expect(actions.at(-1)).toBeNull();
  });

  it('binds grid controls and auto-selects numeric inputs on focus', () => {
    const gridCols = createControl({ id: 'grid-cols' });
    const gridRows = createControl({ id: 'grid-rows' });
    const gridLink = createControl({ id: 'grid-link-root' });
    const controls = new Map<string, PreviewGridHostControlElement>([
      ['grid-cols', gridCols.control],
      ['grid-rows', gridRows.control],
      ['grid-link-root', gridLink.control],
    ]);
    let activeElement: unknown = null;
    const inputCalls: string[] = [];
    const changeCalls: string[] = [];
    let scheduledSelection: (() => void) | null = null;

    bindPreviewGridControls({
      getElementById(id) {
        return controls.get(id) ?? null;
      },
      onInput() {
        inputCalls.push('input');
      },
      onChange() {
        changeCalls.push('change');
      },
      getActiveElement() {
        return activeElement;
      },
      setTimeoutFn(callback) {
        scheduledSelection = callback;
        return 1;
      },
    });

    expect(gridCols.listeners.input).toHaveLength(1);
    expect(gridRows.listeners.focus).toHaveLength(1);
    expect(gridLink.listeners.change).toHaveLength(1);

    gridCols.listeners.input[0]();
    gridLink.listeners.change[0]();
    expect(inputCalls).toEqual(['input']);
    expect(changeCalls).toEqual(['change']);

    activeElement = gridRows.control;
    gridRows.listeners.focus[0]();
    scheduledSelection?.();
    expect(gridRows.control.select).toHaveBeenCalledTimes(1);

    const preventDefault = vi.fn();
    gridCols.listeners.focus[0]();
    gridCols.listeners.mouseup[0]({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('populates grid controls through the document host wrapper', () => {
    const controls = new Map<string, PreviewGridHostControlElement>();
    const gridRows = createControl({ id: 'grid-rows' });
    const gridCols = createControl({ id: 'grid-cols' });
    controls.set('grid-rows', gridRows.control);
    controls.set('grid-cols', gridCols.control);

    expect(populatePreviewGridControlsHost({
      document: {
        activeElement: null,
        getElementById(id) {
          return controls.get(id) ?? null;
        },
      },
      gridInfo: {
        _cols: 6,
        _rows: 5,
      },
      gridOverrides: {},
    })).toBe(true);

    expect(gridCols.control.value).toBe(6);
    expect(gridRows.control.value).toBe(5);
  });

  it('resolves runtime updates and dispatches host-level grid changes from the document wrapper', async () => {
    const actions: unknown[] = [];
    let pendingAction: unknown = null;
    const controls = new Map<string, PreviewGridHostControlElement>([
      ['grid-cols', { value: '4' }],
      ['grid-rows', { value: '3' }],
      ['grid-col-gap', { value: '24' }],
      ['grid-row-gap', { value: '16' }],
      ['grid-margin', { value: '20' }],
      ['grid-link-root', { checked: true }],
      ['grid-slack', { checked: false }],
    ]);

    const svg = {
      viewBox: { baseVal: { width: 320, height: 240 } },
      getAttribute(name: string) {
        if (name === 'width') return '320';
        if (name === 'height') return '240';
        return null;
      },
    } as unknown as SVGSVGElement;

    const runtimeUpdate = resolvePreviewGridControlRuntimeUpdateHost({
      document: {
        getElementById(id) {
          return controls.get(id) ?? null;
        },
        querySelector(selector: string) {
          return selector === '#stage svg' ? svg : null;
        },
      },
      baselineStep: 8,
      rootId: 'root-1',
      fallbackMargin: 24,
    });
    expect(runtimeUpdate).not.toBeNull();
    expect(runtimeUpdate?.controlState).toEqual({
      cols: 4,
      rows: 3,
      colGap: 24,
      rowGap: 16,
      marginTop: 20,
      marginRight: 20,
      marginBottom: 20,
      marginLeft: 20,
      linkToRoot: true,
      slackAbsorption: false,
    });
    expect(runtimeUpdate?.gridOverrides).toMatchObject({
      cols: 4,
      rows: 3,
      col_gap: 24,
      row_gap: 16,
      link_to_root: true,
      slack_absorption: false,
    });
    expect(runtimeUpdate?.overlayGridInfo?._cols).toBe(4);
    expect(runtimeUpdate?.overlayGridInfo?._rows).toBe(3);
    expect(runtimeUpdate?.relayoutRootId).toBe('root-1');

    let scheduledCallback: (() => Promise<void>) | null = null;
    const result = dispatchPreviewGridControlChangeHost({
      document: {
        getElementById(id) {
          return controls.get(id) ?? null;
        },
        querySelector(selector: string) {
          return selector === '#stage svg' ? svg : null;
        },
      },
      gridInfo: { _rows: 2 } as any,
      baselineStep: 8,
      rootId: 'root-1',
      getPendingAction() {
        return pendingAction;
      },
      beginPendingAction() {
        return { label: 'Adjust grid' };
      },
      setPendingAction(action) {
        pendingAction = action;
        actions.push(action);
      },
      setGridOverrides(value) {
        actions.push({ setGridOverrides: value });
      },
      pruneLinkedRootOverrides() {
        actions.push('pruned');
      },
      setDirty(value) {
        actions.push({ setDirty: value });
      },
      relayoutTimer: null,
      clearRelayoutTimer(timerId) {
        actions.push({ clearTimer: timerId });
      },
      scheduleRelayout(callback) {
        scheduledCallback = callback;
        return 123;
      },
      setRelayoutTimer(timerId) {
        actions.push({ setTimer: timerId });
      },
      async requestRelayout(rootId) {
        actions.push({ requestRelayout: rootId });
      },
      commitPendingAction(action) {
        actions.push({ commitPendingAction: action });
      },
      setOverlayGridInfo(gridInfo) {
        actions.push({ setOverlayGridInfo: gridInfo });
      },
      setRowsControlValue(value) {
        actions.push({ setRowsControlValue: value });
      },
      renderGridOverlay() {
        actions.push('renderGridOverlay');
      },
    });

    expect(result.kind).toBe('applied');
    await scheduledCallback?.();
    expect(actions).toContain('renderGridOverlay');
    expect(actions).toContainEqual({ requestRelayout: 'root-1' });
  });

  it('cycles guide mode and updates the badge through the host wrapper', () => {
    const badge = {
      className: '',
      textContent: '',
    };
    const actions: string[] = [];
    let guideMode = 'off';

    expect(cyclePreviewGuideModeHost({
      guideMode,
      guideModes: ['off', 'all'],
      document: {
        getElementById(id) {
          return id === 'guide-badge' ? badge : null;
        },
      },
      setGuideMode(value) {
        guideMode = value;
        actions.push(`set:${value}`);
      },
      renderGridOverlay() {
        actions.push('render');
      },
    })).toBe('all');

    expect(guideMode).toBe('all');
    expect(badge.className).toBe('guide-badge all');
    expect(badge.textContent).toBe('Grid: on (W)');
    expect(actions).toEqual(['set:all', 'render']);
  });
});
