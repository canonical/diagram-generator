import { describe, expect, it } from 'vitest';
import {
  resolvePreviewOverridePatchRestorePlan,
  resolvePreviewSerializedStateRestorePlan,
  restorePreviewOverrideEntries,
  snapshotNeedsPreviewRelayout,
} from '../src/preview-shell/app-state-restore.js';

describe('preview state restore helpers', () => {
  it('flags snapshots that contain relayout-owned frame overrides', () => {
    expect(snapshotNeedsPreviewRelayout({
      snapshot: {
        root: { gap: 24 },
        arrowA: { dx: 10 },
      },
      getNode: (cid) => ({ type: cid === 'arrowA' ? 'arrow' : 'box' }),
      hasRelayoutFrameOverride: (entry) => Boolean(entry && typeof entry === 'object' && 'gap' in entry),
    })).toBe(true);
  });

  it('restores override entries without sharing references and prunes cleared ids', () => {
    const restored = restorePreviewOverrideEntries({
      currentOverrides: {
        keep: { text: ['before'] },
        clear: { gap: 8 },
      },
      entries: {
        keep: { text: ['after'] },
        clear: null,
      },
    });

    expect(restored).toEqual({
      keep: { text: ['after'] },
    });
    (restored.keep as { text: string[] }).text[0] = 'mutated';
    expect((restored.keep as { text: string[] }).text[0]).toBe('mutated');
  });

  it('chooses rerender-stage when snapshot restore changes frame tree or removals', () => {
    const plan = resolvePreviewSerializedStateRestorePlan({
      serializedState: JSON.stringify({
        o: { root: { gap: 12 } },
        g: { cols: 6 },
        r: ['old-node'],
        f: { id: 'root' },
      }),
      currentOverrides: {},
      currentGridOverrides: {},
      currentRemovedIds: [],
      rootId: 'root',
      getNode: () => ({ type: 'box' }),
      hasRelayoutFrameOverride: (entry) => Boolean(entry && typeof entry === 'object' && 'gap' in entry),
    });

    expect(plan.execution).toBe('rerender-stage');
    expect(plan.needsRelayout).toBe(true);
    expect(plan.removalsChanged).toBe(true);
    expect(plan.frameTreeChanged).toBe(true);
    expect(plan.shouldPruneLinkedRootOverrides).toBe(true);
  });

  it('chooses request-relayout for grid changes and local reapply for cosmetic-only snapshots', () => {
    const relayoutPlan = resolvePreviewSerializedStateRestorePlan({
      serializedState: JSON.stringify({
        o: {},
        g: { cols: 8 },
      }),
      currentOverrides: {},
      currentGridOverrides: { cols: 6 },
      currentRemovedIds: [],
      rootId: 'root',
      getNode: () => ({ type: 'box' }),
      hasRelayoutFrameOverride: () => false,
    });
    expect(relayoutPlan.execution).toBe('request-relayout');
    expect(relayoutPlan.gridChanged).toBe(true);

    const localPlan = resolvePreviewSerializedStateRestorePlan({
      serializedState: JSON.stringify({
        o: { note: { text: ['hello'] } },
        g: {},
      }),
      currentOverrides: { note: { text: ['hello'] } },
      currentGridOverrides: {},
      currentRemovedIds: [],
      rootId: 'root',
      getNode: () => ({ type: 'box' }),
      hasRelayoutFrameOverride: () => false,
    });
    expect(localPlan.execution).toBe('local-reapply');
    expect(localPlan.needsRelayout).toBe(false);
  });

  it('plans override-patch restore relayout from touched ids only when needed', () => {
    const relayoutPlan = resolvePreviewOverridePatchRestorePlan({
      entries: { root: { gap: 12 } },
      beforeEntries: { root: { text: ['before'] } },
      rootId: 'root',
      getNode: () => ({ type: 'box' }),
      hasRelayoutFrameOverride: (entry) => Boolean(entry && typeof entry === 'object' && 'gap' in entry),
    });
    expect(relayoutPlan.needsRelayout).toBe(true);
    expect(relayoutPlan.relayoutTargetId).toBe('root');

    const localPlan = resolvePreviewOverridePatchRestorePlan({
      entries: { note: { text: ['after'] } },
      beforeEntries: { note: { text: ['before'] } },
      rootId: 'root',
      getNode: () => ({ type: 'box' }),
      hasRelayoutFrameOverride: () => false,
    });
    expect(localPlan.needsRelayout).toBe(false);
  });
});
