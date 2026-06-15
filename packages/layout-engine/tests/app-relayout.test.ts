import { describe, expect, it, vi } from 'vitest';
import {
  clearPreviewCoercedOverrides,
  collectPreviewCoercedKeys,
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

  it('fails fast when local relayout is unavailable', async () => {
    const failRelayout = vi.fn(() => false);

    await runPreviewRelayout({
      triggerCid: 'alpha',
      overrides: {},
      coercedKeys: new Set(),
      gridOverrides: {},
      normalizeGridOverrides: vi.fn((value) => value),
      relayoutStatus: { localReady: false, local: { reason: 'missing-frame-tree' } },
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
      isElkLayeredDiagram: true,
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
