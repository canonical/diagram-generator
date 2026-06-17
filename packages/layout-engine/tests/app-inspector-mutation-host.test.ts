import { describe, expect, it, vi } from 'vitest';
import {
  dispatchPreviewAlignSelectionHost,
  dispatchPreviewApplySelectionTargetsHost,
  dispatchPreviewDistributeSelectionHost,
  dispatchPreviewMultiFrameAlignHost,
  dispatchPreviewMultiFramePropHost,
  dispatchPreviewMultiFrameSizeHost,
  dispatchPreviewMultiStyleOverrideHost,
  dispatchPreviewSingleFrameAlignHost,
  dispatchPreviewSingleFramePropHost,
  dispatchPreviewSingleFrameSizeHost,
} from '../src/preview-shell/app-inspector-mutation-host.js';

describe('preview inspector mutation host helpers', () => {
  it('dispatches single-frame mutation flows through the shared host owner', () => {
    const events: string[] = [];

    dispatchPreviewSingleFrameAlignHost({
      cid: 'alpha',
      captureOverrideEntries: vi.fn(() => ({ ids: ['alpha'] })),
      applySingleFramePropMutation: vi.fn(),
      overrides: {},
      coercedKeys: new Set(),
      getNode: vi.fn(() => ({ id: 'alpha' })),
      align: 'CENTER',
      snapToGrid: (value) => value,
      setDirty: () => events.push('setDirty'),
      commitOverridePatchAction: (label) => events.push(label),
      scheduleRelayout: (cid) => events.push(`relayout:${cid}`),
      renderSelectionInspector: (cid) => events.push(`inspector:${cid}`),
    });

    dispatchPreviewSingleFramePropHost({
      cid: 'alpha',
      prop: 'gap',
      value: 24,
      captureOverrideEntries: vi.fn(() => ({ ids: ['alpha'] })),
      applySingleFramePropMutation: vi.fn(() => ({ kind: 'changed' })),
      overrides: {},
      coercedKeys: new Set(),
      getNode: vi.fn(() => ({ id: 'alpha' })),
      snapToGrid: (value) => value,
      setDirty: () => events.push('setDirty'),
      commitOverridePatchAction: (label) => events.push(label),
      scheduleRelayout: (cid) => events.push(`relayout:${cid}`),
      renderSelectionInspector: (cid) => events.push(`inspector:${cid}`),
    });

    dispatchPreviewSingleFrameSizeHost({
      cid: 'alpha',
      dimension: 'width',
      value: 320,
      gridInfo: {},
      widthUnit: 'px',
      heightUnit: 'px',
      baselineStep: 24,
      resolveFrameSizePx: vi.fn(() => 320),
      captureOverrideEntries: vi.fn(() => ({ ids: ['alpha'] })),
      applySingleFrameSizeMutation: vi.fn(),
      overrides: {},
      coercedKeys: new Set(),
      setDirty: () => events.push('setDirty'),
      commitOverridePatchAction: (label) => events.push(label),
      scheduleRelayout: (cid) => events.push(`relayout:${cid}`),
      renderSelectionInspector: (cid) => events.push(`inspector:${cid}`),
    });

    expect(events).toEqual([
      'setDirty',
      'Change alignment',
      'inspector:alpha',
      'relayout:alpha',
      'setDirty',
      'Change gap',
      'relayout:alpha',
      'inspector:alpha',
      'setDirty',
      'Set width',
      'relayout:alpha',
      'inspector:alpha',
    ]);
  });

  it('dispatches multi-frame mutation flows through the shared host owner', () => {
    const events: string[] = [];
    const selectedIds = ['alpha', 'beta'];

    dispatchPreviewMultiFrameAlignHost({
      selectedIds,
      align: 'CENTER',
      captureOverrideEntries: vi.fn(() => ({ ids: selectedIds })),
      applyMultiFramePropMutation: vi.fn(() => ({ kind: 'changed' })),
      overrides: {},
      coercedKeys: new Set(),
      getNode: vi.fn(),
      setDirty: () => events.push('setDirty'),
      commitOverridePatchAction: (label) => events.push(label),
      scheduleRelayout: (cid) => events.push(`relayout:${cid}`),
      renderMultiSelectionInspector: () => events.push('renderMulti'),
    });

    dispatchPreviewMultiStyleOverrideHost({
      selectedIds,
      styleName: 'box-default',
      captureOverrideEntries: vi.fn(() => ({ ids: selectedIds })),
      normalizeStyleName: (styleName) => styleName,
      getComponentType: () => 'box',
      isStyleableComponentType: () => true,
      applyVisibleStyleOverride: vi.fn(() => true),
      cleanOverride: (cid) => events.push(`clean:${cid}`),
      getNode: vi.fn(),
      overrides: {},
      setDirty: () => events.push('setDirty'),
      commitOverridePatchAction: (label) => events.push(label),
      requestRelayout: (cid) => events.push(`relayoutNow:${cid}`),
      renderMultiSelectionInspector: () => events.push('renderMulti'),
    });

    dispatchPreviewMultiFramePropHost({
      selectedIds,
      prop: 'gap',
      value: 24,
      captureOverrideEntries: vi.fn(() => ({ ids: selectedIds })),
      applyMultiFramePropMutation: vi.fn(() => ({ kind: 'clear' })),
      overrides: {},
      coercedKeys: new Set(),
      getNode: vi.fn(),
      setDirty: () => events.push('setDirty'),
      commitOverridePatchAction: (label) => events.push(label),
      scheduleRelayout: (cid) => events.push(`relayout:${cid}`),
      renderSelectionInspector: () => events.push('renderSelection'),
      renderMultiSelectionInspector: () => events.push('renderMulti'),
    });

    dispatchPreviewMultiFrameSizeHost({
      selectedIds,
      dimension: 'width',
      value: 320,
      gridInfo: {},
      widthUnit: 'px',
      heightUnit: 'px',
      baselineStep: 24,
      resolveFrameSizePx: vi.fn(() => 320),
      captureOverrideEntries: vi.fn(() => ({ ids: selectedIds })),
      applyMultiFrameSizeMutation: vi.fn(),
      overrides: {},
      coercedKeys: new Set(),
      getNode: vi.fn(),
      setDirty: () => events.push('setDirty'),
      commitOverridePatchAction: (label) => events.push(label),
      scheduleRelayout: (cid) => events.push(`relayout:${cid}`),
      renderMultiSelectionInspector: () => events.push('renderMulti'),
    });

    expect(events).toEqual([
      'setDirty',
      'Change alignment (multi)',
      'relayout:alpha',
      'renderMulti',
      'clean:alpha',
      'clean:beta',
      'setDirty',
      'Change style (multi)',
      'relayoutNow:alpha',
      'renderMulti',
      'setDirty',
      'Clear gap (multi)',
      'relayout:alpha',
      'renderSelection',
      'setDirty',
      'Set width (multi)',
      'relayout:alpha',
      'renderMulti',
    ]);
  });

  it('dispatches selection target/align/distribute flows through the shared host owner', () => {
    const events: string[] = [];
    const items = [{ id: 'alpha' }, { id: 'beta' }];

    dispatchPreviewApplySelectionTargetsHost({
      items,
      targets: {
        alpha: { dx: 8 },
      },
      captureOverrideEntries: vi.fn(() => ({ ids: ['alpha'] })),
      createSelectionTargetOverrideEntries: vi.fn(() => [{ id: 'alpha', dx: 8, dy: 0 }]),
      snapStep: 24,
      setOverride: (id) => events.push(`setOverride:${id}`),
      applyAllOverrides: () => events.push('applyAllOverrides'),
      reapplySelection: () => events.push('reapplySelection'),
      renderSelectionInspector: () => events.push('renderSelectionInspector'),
      updateOverrideSummary: () => events.push('updateOverrideSummary'),
      refreshTreeColors: () => events.push('refreshTreeColors'),
      runConstraints: () => events.push('runConstraints'),
      commitOverridePatchAction: (label) => events.push(label),
    });

    dispatchPreviewDistributeSelectionHost({
      info: {
        items,
        sameParent: true,
        hasUnsupported: false,
      },
      axis: 'x',
      currentGap: 17,
      snapStep: 24,
      normalizeSelectionGap: () => 24,
      setGap: (gap) => events.push(`gap:${gap}`),
      resolveSelectionDistributeTargets: vi.fn(() => ({ alpha: { dx: 8 } })),
      applySelectionTargets: () => events.push('applySelectionTargets'),
      alert: (message) => events.push(`alert:${message}`),
    });

    dispatchPreviewAlignSelectionHost({
      info: {
        items,
        hasUnsupported: false,
      },
      mode: 'left',
      snapStep: 24,
      resolveSelectionAlignTargets: vi.fn(() => ({ alpha: { dx: 0 } })),
      applySelectionTargets: () => events.push('applyAlignTargets'),
      alert: (message) => events.push(`alert:${message}`),
    });

    expect(events).toEqual([
      'setOverride:alpha',
      'applyAllOverrides',
      'reapplySelection',
      'renderSelectionInspector',
      'updateOverrideSummary',
      'refreshTreeColors',
      'runConstraints',
      'Reposition selection',
      'gap:24',
      'applySelectionTargets',
      'applyAlignTargets',
    ]);
  });
});
