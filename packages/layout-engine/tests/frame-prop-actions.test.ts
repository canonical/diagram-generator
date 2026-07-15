import { describe, expect, it } from 'vitest';
import {
  applyMultiFramePropMutation,
  applyMultiFrameSizeMutation,
  applySingleFramePropMutation,
  applySingleFrameSizeMutation,
  resolvePreviewFrameSizePx,
} from '../src/preview-shell/frame-prop-actions.js';

describe('preview-shell frame prop actions', () => {
  it('normalizes single gap delta changes and clears legacy gap overrides', () => {
    const overrides = {
      frame: {
        gap: 16,
      },
    };

    expect(applySingleFramePropMutation({
      overrides,
      cid: 'frame',
      prop: 'gap_delta',
      value: '13',
      snapToGrid(value) {
        return Math.round(value / 8) * 8;
      },
    })).toEqual({ kind: 'change' });
    expect(overrides.frame).toEqual({
      gap_delta: 16,
    });

    expect(applySingleFramePropMutation({
      overrides,
      cid: 'frame',
      prop: 'gap_delta',
      value: '',
      snapToGrid(value) {
        return Math.round(value / 8) * 8;
      },
    })).toEqual({ kind: 'clear' });
    expect(overrides.frame).toEqual({
      gap_delta: null,
    });
  });

  it('clears conflicting single-frame padding and sizing overrides', () => {
    const overrides = {
      frame: {
        padding: 24,
        width: 200,
      },
    };
    const coercedKeys = new Set(['frame:sizing_w', 'frame:padding_top']);

    applySingleFramePropMutation({
      overrides,
      coercedKeys,
      cid: 'frame',
      prop: 'padding_top',
      value: 10,
      snapToGrid(value) {
        return value;
      },
    });
    expect(overrides.frame).toEqual({
      width: 200,
      padding_top: 10,
    });

    applySingleFramePropMutation({
      overrides,
      coercedKeys,
      cid: 'frame',
      prop: 'sizing_w',
      value: 'HUG',
      node: {
        data: { width: 312, height: 180 },
      },
      snapToGrid(value) {
        return value;
      },
    });
    expect(overrides.frame).toEqual({
      padding_top: 10,
      sizing_w: 'HUG',
    });
    expect(coercedKeys.has('frame:sizing_w')).toBe(false);
  });

  it('routes align mutations through the shared frame-prop helpers', () => {
    const overrides = {
      frame: {},
      arrow: {},
    };

    expect(applySingleFramePropMutation({
      overrides,
      cid: 'frame',
      prop: 'align',
      value: 'CENTER_RIGHT',
      snapToGrid(value) {
        return value;
      },
    })).toEqual({ kind: 'change' });
    expect(overrides.frame).toEqual({
      align: 'CENTER_RIGHT',
    });

    expect(applyMultiFramePropMutation({
      overrides,
      ids: ['frame', 'arrow'],
      prop: 'align',
      value: 'BOTTOM_CENTER',
      getNode(cid) {
        return cid === 'arrow'
          ? { type: 'arrow' }
          : { data: { width: 120, height: 64 } };
      },
    })).toEqual({ kind: 'change' });
    expect(overrides).toEqual({
      frame: {
        align: 'BOTTOM_CENTER',
      },
      arrow: {},
    });

    expect(applySingleFramePropMutation({
      overrides,
      cid: 'frame',
      prop: 'align',
      value: 'DIAGONAL',
      snapToGrid(value) {
        return value;
      },
    })).toEqual({ kind: 'none' });

    expect(applyMultiFramePropMutation({
      overrides,
      ids: ['frame'],
      prop: 'align',
      value: 'OFF_CENTER',
      getNode() {
        return { data: { width: 120, height: 64 } };
      },
    })).toEqual({ kind: 'none' });
    expect(overrides).toEqual({
      frame: {
        align: 'BOTTOM_CENTER',
      },
      arrow: {},
    });
  });

  it('clears single-frame constraints and keeps opposite bounds ordered', () => {
    const overrides = {
      frame: {
        max_width: '120',
        min_height: 80,
      },
    };
    const coercedKeys = new Set(['frame:min_width']);

    applySingleFramePropMutation({
      overrides,
      coercedKeys,
      cid: 'frame',
      prop: 'min_width',
      value: '140',
      snapToGrid(value) {
        return value;
      },
    });
    expect(overrides.frame).toEqual({
      max_width: 140,
      min_height: 80,
      min_width: 140,
    });

    expect(applySingleFramePropMutation({
      overrides,
      coercedKeys,
      cid: 'frame',
      prop: 'min_width',
      value: '',
      snapToGrid(value) {
        return value;
      },
    })).toEqual({ kind: 'clear' });
    expect(overrides.frame).toEqual({
      max_width: 140,
      min_height: 80,
      min_width: null,
    });
    expect(coercedKeys.has('frame:min_width')).toBe(false);
  });

  it('applies multi-frame mutations only to supported targets and clears empty entries', () => {
    const overrides = {
      a: {
        min_width: 80,
      },
      b: {
        min_width: 120,
      },
      arrow: {
        min_width: 40,
      },
    };
    const nodes = new Map([
      ['a', { layout: 'vertical', children: [{}], data: { width: 240, height: 120 } }],
      ['b', { type: 'arrow', data: { width: 64, height: 32 } }],
      ['c', { data: { width: 180, height: 96 } }],
      ['arrow', { type: 'arrow' }],
    ]);

    expect(applyMultiFramePropMutation({
      overrides,
      ids: ['a', 'b', 'c', 'arrow'],
      prop: 'direction',
      value: 'HORIZONTAL',
      getNode(cid) {
        return nodes.get(cid);
      },
    })).toEqual({ kind: 'change' });
    expect(overrides).toEqual({
      a: {
        min_width: 80,
        direction: 'HORIZONTAL',
      },
      b: {
        min_width: 120,
      },
      arrow: {
        min_width: 40,
      },
    });

    expect(applyMultiFramePropMutation({
      overrides,
      ids: ['a', 'b', 'arrow'],
      prop: 'min_width',
      value: '',
      getNode(cid) {
        return nodes.get(cid);
      },
    })).toEqual({ kind: 'clear' });
    expect(overrides).toEqual({
      a: {
        direction: 'HORIZONTAL',
        min_width: null,
      },
      b: {
        min_width: 120,
      },
      arrow: {
        min_width: 40,
      },
    });
  });

  it('ignores mixed multi-frame placeholders and resolves fixed-size px mutations', () => {
    const overrides = {
      a: {},
    };
    const coercedKeys = new Set(['a:sizing_w', 'a:width']);

    expect(applyMultiFramePropMutation({
      overrides,
      ids: ['a'],
      prop: 'sizing_w',
      value: '',
      getNode() {
        return { data: { width: 120, height: 64 } };
      },
    })).toEqual({ kind: 'none' });
    expect(overrides).toEqual({
      a: {},
    });

    expect(resolvePreviewFrameSizePx({
      dimension: 'width',
      value: 2.4,
      gridInfo: {
        col_widths: [96, 96, 96],
        col_gap: 24,
      },
      widthUnit: 'cols',
      baselineStep: 8,
    })).toBe(264);

    expect(resolvePreviewFrameSizePx({
      dimension: 'height',
      value: 19,
      heightUnit: 'px',
      baselineStep: 8,
    })).toBe(16);

    applySingleFrameSizeMutation({
      overrides,
      coercedKeys,
      cid: 'a',
      dimension: 'width',
      px: 304,
    });
    expect(overrides.a).toEqual({
      sizing_w: 'FIXED',
      width: 304,
    });
    expect(coercedKeys.has('a:sizing_w')).toBe(false);
    expect(coercedKeys.has('a:width')).toBe(false);

    applyMultiFrameSizeMutation({
      overrides,
      ids: ['a', 'b'],
      dimension: 'height',
      px: 160,
      getNode(cid) {
        if (cid === 'b') return { type: 'arrow' };
        return { data: { width: 120, height: 64 } };
      },
    });
    expect(overrides).toEqual({
      a: {
        sizing_w: 'FIXED',
        width: 304,
        sizing_h: 'FIXED',
        height: 160,
      },
    });
  });
});
