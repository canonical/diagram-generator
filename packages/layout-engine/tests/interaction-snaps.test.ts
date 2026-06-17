import { describe, expect, it, vi } from 'vitest';
import {
  collectPreviewSnapTargets,
  resolvePreviewDragSnap,
} from '../src/preview-shell/interaction-snaps.js';

describe('preview snap helpers', () => {
  it('collects peer and grid snap targets for sibling drags', () => {
    const root = {
      id: 'root',
      type: 'box',
      data: { id: 'root', x: 0, y: 0, width: 400, height: 300 },
      children: [],
    };
    const drag = {
      id: 'drag',
      type: 'box',
      data: { id: 'drag', x: 20, y: 30, width: 80, height: 60 },
      parent: root,
      children: [],
    };
    const peer = {
      id: 'peer',
      type: 'box',
      data: { id: 'peer', x: 120, y: 40, width: 100, height: 80 },
      parent: root,
      children: [],
    };
    root.children = [drag, peer];

    const peerTargetSpy = vi.fn(() => ({ xs: [120, 220], ys: [40, 120] }));
    const gridTargetSpy = vi.fn(() => ({ xs: [0, 400], ys: [0, 300] }));

    expect(collectPreviewSnapTargets({
      dragId: 'drag',
      gridInfo: { col_xs: [], col_widths: [], row_ys: [], row_heights: [], col_gap: 0, row_gap: 0, margin_top: 0, margin_right: 0, margin_bottom: 0, margin_left: 0, outer_margin: 0, _resolved_bottom_margin: 0, _resolved_right_margin: 0, _baseline_step: 8, _cols: 0, _rows: 0 },
      getNode: (id) => (id === 'drag' ? drag : id === 'peer' ? peer : null),
      getRootNodes: () => [drag, peer],
      getOwnDelta: () => ({ dw: 0, dh: 0 }),
      getEffectiveDelta: () => ({ dx: 0, dy: 0 }),
      collectPeerSnapTargets: peerTargetSpy,
      collectGridSnapTargets: gridTargetSpy,
    })).toEqual({
      xs: [120, 220, 0, 400],
      ys: [40, 120, 0, 300],
    });
    expect(peerTargetSpy).toHaveBeenCalledWith([
      { x: 120, y: 40, width: 100, height: 80 },
    ]);
  });

  it('rounds snapped drag deltas to the shell grid and returns final guide lines', () => {
    const snapRectToTargets = vi
      .fn()
      .mockReturnValueOnce({ adjX: 6, adjY: -5, lines: [] })
      .mockReturnValueOnce({
        adjX: 0,
        adjY: 0,
        lines: [{ x1: 100, y1: 0, x2: 100, y2: 300 }],
      });

    expect(resolvePreviewDragSnap({
      cid: 'box',
      proposedDx: 10,
      proposedDy: 18,
      targets: { xs: [100], ys: [200] },
      getNode: () => ({
        id: 'box',
        type: 'box',
        data: { id: 'box', x: 20, y: 30, width: 80, height: 60 },
        children: [],
      }),
      getOwnDelta: () => ({ dw: 0, dh: 0 }),
      snapRectToTargets,
      snapStep: 8,
    })).toEqual({
      dx: 16,
      dy: 16,
      lines: [{ x1: 100, y1: 0, x2: 100, y2: 300 }],
    });
    expect(snapRectToTargets).toHaveBeenNthCalledWith(
      1,
      30,
      48,
      110,
      108,
      { xs: [100], ys: [200] },
    );
    expect(snapRectToTargets).toHaveBeenNthCalledWith(
      2,
      36,
      46,
      116,
      106,
      { xs: [100], ys: [200] },
    );
  });
});
