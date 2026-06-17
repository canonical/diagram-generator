import { describe, expect, it } from 'vitest';
import {
  createSingleSelectionAutolayoutState,
  createSingleSelectionInspectorViewModel,
} from '../src/preview-shell/inspector-single.js';

describe('single-selection inspector helpers', () => {
  it('resolves override and note flags for autolayout children', () => {
    const viewModel = createSingleSelectionInspectorViewModel({
      align: 'CENTER',
      ownDelta: { dx: 8, dy: 0, dw: 0, dh: 16 },
      effectiveDelta: { dx: 16, dy: 0 },
      hasWaypointOverride: false,
      waypointCount: 0,
      componentType: 'box',
      parentLayout: 'vertical',
    });

    expect(viewModel.currentAlign).toBe('CENTER');
    expect(viewModel.hasMoveOverride).toBe(true);
    expect(viewModel.hasSizeOverride).toBe(true);
    expect(viewModel.hasAnyOverride).toBe(true);
    expect(viewModel.hasParentOverride).toBe(true);
    expect(viewModel.isAutolayoutChild).toBe(true);
    expect(viewModel.showStackSpacingHint).toBe(true);
    expect(viewModel.noteKind).toBe('reorder-child');
  });

  it('treats arrow waypoint overrides as clearable overrides', () => {
    const viewModel = createSingleSelectionInspectorViewModel({
      ownDelta: { dx: 0, dy: 0, dw: 0, dh: 0 },
      effectiveDelta: { dx: 0, dy: 0 },
      hasWaypointOverride: true,
      waypointCount: 3,
      componentType: 'arrow',
    });

    expect(viewModel.isArrowComponent).toBe(true);
    expect(viewModel.hasWaypointOverride).toBe(true);
    expect(viewModel.hasAnyOverride).toBe(true);
    expect(viewModel.waypointCount).toBe(3);
    expect(viewModel.noteKind).toBe('move-resize');
  });

  it('resolves container autolayout state and fixed/fill inspector branches', () => {
    const state = createSingleSelectionAutolayoutState({
      nodeLayout: 'horizontal',
      childCount: 2,
      hasParent: true,
      overrideDirection: 'HORIZONTAL',
      overrideGapDeltaPresent: true,
      overrideGapDelta: 8,
      layoutColGap: 24,
      sizingW: 'FILL',
      sizingH: 'FIXED',
      wCoerced: true,
      hCoerced: false,
      hasTextContent: true,
      positionType: 'ABSOLUTE',
    });

    expect(state.isContainer).toBe(true);
    expect(state.direction).toBe('HORIZONTAL');
    expect(state.currentGapDelta).toBe(8);
    expect(state.automaticGap).toBe(16);
    expect(state.effectiveGap).toBe(24);
    expect(state.showGapDeltaControls).toBe(true);
    expect(state.showWidthFillWeight).toBe(true);
    expect(state.showWidthMinMax).toBe(true);
    expect(state.showHeightFixedInput).toBe(true);
    expect(state.showHeightMinMax).toBe(true);
    expect(state.positionType).toBe('ABSOLUTE');
    expect(state.showAbsoluteOffsetControls).toBe(true);
  });

  it('resolves hug text controls and non-container defaults', () => {
    const state = createSingleSelectionAutolayoutState({
      childCount: 0,
      hasParent: false,
      sizingW: 'HUG',
      sizingH: 'HUG',
      hasTextContent: true,
    });

    expect(state.isContainer).toBe(false);
    expect(state.showGapDeltaControls).toBe(false);
    expect(state.showWidthTextMeasure).toBe(true);
    expect(state.showWidthMinMax).toBe(false);
    expect(state.showHeightMinMax).toBe(false);
    expect(state.showPositionType).toBe(false);
    expect(state.showAbsoluteOffsetControls).toBe(false);
  });

  it('treats a present null gap_delta override as an explicit cleared zero', () => {
    const state = createSingleSelectionAutolayoutState({
      nodeLayout: 'vertical',
      childCount: 2,
      overrideGapDeltaPresent: true,
      overrideGapDelta: null,
      nodeGapDelta: 16,
      layoutRowGap: 32,
    });

    expect(state.currentGapDelta).toBe(0);
    expect(state.automaticGap).toBe(32);
    expect(state.effectiveGap).toBe(32);
  });
});
