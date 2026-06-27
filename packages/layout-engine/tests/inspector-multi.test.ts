import { describe, expect, it } from 'vitest';
import {
  createMultiSelectionAlignState,
  createMultiSelectionContainerState,
  createMultiSelectionSizingState,
} from '../src/preview-shell/inspector-multi.js';

describe('multi-selection inspector helpers', () => {
  it('resolves shared sizing state and coercion flags', () => {
    const state = createMultiSelectionSizingState([
      { sizingW: 'FIXED', sizingH: 'HUG', wCoerced: true, hCoerced: false },
      { sizingW: 'FIXED', sizingH: 'HUG', wCoerced: true, hCoerced: false },
    ]);

    expect(state).toEqual({
      sizingW: 'FIXED',
      sizingH: 'HUG',
      wMixed: false,
      hMixed: false,
      wCoerced: true,
      hCoerced: false,
    });
  });

  it('marks mixed sizing state across a heterogeneous selection', () => {
    const state = createMultiSelectionSizingState([
      { sizingW: 'HUG', sizingH: 'FILL' },
      { sizingW: 'FILL', sizingH: 'FIXED' },
    ]);

    expect(state?.sizingW).toBe('');
    expect(state?.sizingH).toBe('');
    expect(state?.wMixed).toBe(true);
    expect(state?.hMixed).toBe(true);
  });

  it('resolves shared container direction and wrap defaults', () => {
    const state = createMultiSelectionContainerState([
      { isContainer: true, direction: 'VERTICAL', wrap: true },
      { isContainer: true, direction: 'VERTICAL', wrap: false },
    ]);

    expect(state).toEqual({
      containerCount: 2,
      direction: 'VERTICAL',
      dirMixed: false,
      wrap: true,
    });
  });

  it('hides container controls when any actionable item is not a container', () => {
    expect(createMultiSelectionContainerState([
      { isContainer: true, direction: 'VERTICAL', wrap: true },
      { isContainer: false, direction: 'HORIZONTAL', wrap: true },
    ])).toBeNull();
  });

  it('marks mixed frame alignment values', () => {
    const state = createMultiSelectionAlignState([
      { hasFrameAlignment: true, align: 'TOP_LEFT' },
      { hasFrameAlignment: true, align: 'CENTER' },
    ]);

    expect(state?.align).toBe('');
    expect(state?.mixed).toBe(true);
  });

  it('hides alignment and sizing when any actionable item lacks support', () => {
    expect(createMultiSelectionAlignState([
      { hasFrameAlignment: true, align: 'TOP_LEFT' },
      { hasFrameAlignment: false, align: 'CENTER' },
    ])).toBeNull();
    expect(createMultiSelectionSizingState([
      { sizingW: 'FIXED', sizingH: 'HUG' },
      {},
    ])).toBeNull();
  });
});
