import { describe, expect, it } from 'vitest';
import {
  createPreviewGridOverrides,
  isGridControlInputId,
  resolvePreviewGridControlDomPatch,
  resolvePreviewGridControlInputState,
  resolvePreviewGridControlRuntimeUpdate,
  resolvePreviewGridControlState,
  resolvePreviewGridControlStateFromDomState,
  resolvePreviewGridInfoFromControlState,
  resolvePreviewGridInfoFromRuntimeState,
  resolvePreviewGridMarginsFromInputState,
} from '../src/preview-shell/grid-controls.js';

describe('preview-shell grid control helpers', () => {
  it('recognizes editable grid control ids', () => {
    expect(isGridControlInputId('grid-cols')).toBe(true);
    expect(isGridControlInputId('grid-margin-left')).toBe(true);
    expect(isGridControlInputId('grid-link-root')).toBe(false);
  });

  it('resolves control state from overrides before falling back to grid info', () => {
    expect(resolvePreviewGridControlState({
      gridInfo: {
        _cols: 2,
        _rows: 3,
        col_xs: [24, 160],
        row_ys: [24, 120, 216],
        col_gap: 24,
        row_gap: 16,
        outer_margin: 24,
        margin_top: 24,
        margin_right: 24,
        margin_bottom: 24,
        margin_left: 24,
        _link_to_root: true,
        _slack_absorption: true,
      },
      gridOverrides: {
        cols: 4,
        row_gap: 32,
        margin_right: 40,
        link_to_root: false,
      },
    })).toEqual({
      cols: 4,
      rows: 3,
      colGap: 24,
      rowGap: 32,
      marginTop: 24,
      marginRight: 40,
      marginBottom: 24,
      marginLeft: 24,
      linkToRoot: false,
      slackAbsorption: true,
    });
  });

  it('creates canonical runtime grid overrides with legacy outer_margin compat', () => {
    expect(createPreviewGridOverrides({
      cols: 3.4,
      rows: 2.8,
      colGap: 20.1,
      rowGap: 15.5,
      marginTop: 32.2,
      marginRight: 40.9,
      marginBottom: 24.1,
      marginLeft: 16.7,
      linkToRoot: true,
      slackAbsorption: false,
    })).toEqual({
      cols: 3,
      rows: 3,
      col_gap: 20,
      row_gap: 16,
      margin_top: 32,
      margin_right: 41,
      margin_bottom: 24,
      margin_left: 17,
      outer_margin: 32,
      link_to_root: true,
      slack_absorption: false,
    });
  });

  it('normalizes raw grid control inputs into stable control state', () => {
    expect(resolvePreviewGridControlInputState({
      cols: '4',
      rows: '-2',
      colGap: '23.9',
      rowGap: '',
      marginTop: 17.2,
      marginRight: 'abc',
      marginBottom: 40.6,
      marginLeft: null,
      linkToRoot: false,
      slackAbsorption: true,
    })).toEqual({
      cols: 4,
      rows: 0,
      colGap: 24,
      rowGap: 0,
      marginTop: 17,
      marginRight: 24,
      marginBottom: 41,
      marginLeft: 0,
      linkToRoot: false,
      slackAbsorption: true,
    });
  });

  it('resolves split and legacy margin inputs into stable per-side margins', () => {
    expect(resolvePreviewGridMarginsFromInputState({
      hasSplitMargins: true,
      marginTop: '17.2',
      marginRight: '-9',
      marginBottom: 'abc',
      marginLeft: 40.8,
      fallbackMargin: 32,
    })).toEqual({
      top: 17,
      right: 0,
      bottom: 0,
      left: 41,
    });

    expect(resolvePreviewGridMarginsFromInputState({
      hasSplitMargins: false,
      legacyMargin: '',
      fallbackMargin: 32.4,
    })).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  it('normalizes grid control DOM state, including legacy margin fallback', () => {
    expect(resolvePreviewGridControlStateFromDomState({
      cols: '5',
      rows: -1,
      colGap: '23.6',
      rowGap: null,
      hasSplitMargins: false,
      legacyMargin: '18.9',
      fallbackMargin: 24,
      linkToRoot: false,
      slackAbsorption: 'yes',
    })).toEqual({
      cols: 5,
      rows: 0,
      colGap: 24,
      rowGap: 0,
      marginTop: 19,
      marginRight: 19,
      marginBottom: 19,
      marginLeft: 19,
      linkToRoot: false,
      slackAbsorption: true,
    });
  });

  it('builds DOM patches for split and legacy margin control layouts', () => {
    expect(resolvePreviewGridControlDomPatch({
      controlState: {
        cols: 3,
        rows: 4,
        colGap: 24,
        rowGap: 16,
        marginTop: 20,
        marginRight: 28,
        marginBottom: 36,
        marginLeft: 44,
        linkToRoot: true,
        slackAbsorption: false,
      },
      hasSplitMargins: true,
    })).toEqual({
      values: {
        'grid-cols': 3,
        'grid-rows': 4,
        'grid-col-gap': 24,
        'grid-row-gap': 16,
        'grid-margin-top': 20,
        'grid-margin-right': 28,
        'grid-margin-bottom': 36,
        'grid-margin-left': 44,
      },
      checked: {
        'grid-link-root': true,
        'grid-slack': false,
      },
    });

    expect(resolvePreviewGridControlDomPatch({
      controlState: {
        cols: 2,
        rows: 1,
        colGap: 8,
        rowGap: 12,
        marginTop: 30,
        marginRight: 30,
        marginBottom: 30,
        marginLeft: 30,
        linkToRoot: false,
        slackAbsorption: true,
      },
      hasSplitMargins: false,
    })).toEqual({
      values: {
        'grid-cols': 2,
        'grid-rows': 1,
        'grid-col-gap': 8,
        'grid-row-gap': 12,
        'grid-margin': 30,
      },
      checked: {
        'grid-link-root': false,
        'grid-slack': true,
      },
    });
  });

  it('builds a grid runtime update plan from normalized control state', () => {
    expect(resolvePreviewGridControlRuntimeUpdate({
      canvasWidth: 480,
      canvasHeight: 360,
      baselineStep: 8,
      rootId: '',
      controlState: {
        cols: 4,
        rows: 3,
        colGap: 24,
        rowGap: 16,
        marginTop: 20,
        marginRight: 28,
        marginBottom: 36,
        marginLeft: 44,
        linkToRoot: true,
        slackAbsorption: false,
      },
    })).toMatchObject({
      controlState: {
        cols: 4,
        rows: 3,
        colGap: 24,
        rowGap: 16,
        marginTop: 20,
        marginRight: 28,
        marginBottom: 36,
        marginLeft: 44,
        linkToRoot: true,
        slackAbsorption: false,
      },
      gridOverrides: {
        cols: 4,
        rows: 3,
        col_gap: 24,
        row_gap: 16,
        margin_top: 20,
        margin_right: 28,
        margin_bottom: 36,
        margin_left: 44,
        outer_margin: 20,
        link_to_root: true,
        slack_absorption: false,
      },
      relayoutRootId: 'root',
      shouldPruneLinkedRootOverrides: true,
    });
  });

  it('resolves preview grid info directly from normalized control state', () => {
    const info = resolvePreviewGridInfoFromControlState({
      canvasWidth: 400,
      canvasHeight: 320,
      baselineStep: 8,
      controlState: {
        cols: 2,
        rows: 3,
        colGap: 24,
        rowGap: 16,
        marginTop: 24,
        marginRight: 24,
        marginBottom: 24,
        marginLeft: 24,
        linkToRoot: true,
        slackAbsorption: false,
      },
    });

    expect(info._cols).toBe(2);
    expect(info._rows).toBe(3);
    expect(info.margin_left).toBe(24);
    expect(info.col_gap).toBe(24);
    expect(info.row_gap).toBe(16);
  });

  it('rebuilds runtime grid info from overrides with fallback info and booleans', () => {
    const info = resolvePreviewGridInfoFromRuntimeState({
      canvasWidth: 480,
      canvasHeight: 360,
      baselineStep: 8,
      gridOverrides: {
        cols: 4,
        row_gap: 32,
        margin_left: 40,
        link_to_root: false,
      },
      fallbackGridInfo: {
        _cols: 2,
        _rows: 3,
        col_xs: [24, 160],
        row_ys: [24, 120, 216],
        col_gap: 24,
        row_gap: 16,
        margin_top: 24,
        margin_right: 24,
        margin_bottom: 24,
        margin_left: 24,
        outer_margin: 24,
        _slack_absorption: true,
      },
    });

    expect(info._cols).toBe(4);
    expect(info.row_gap).toBe(32);
    expect(info.margin_left).toBe(40);
    expect(info._link_to_root).toBe(false);
    expect(info._slack_absorption).toBe(true);
  });
});
