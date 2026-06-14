import { describe, expect, it } from 'vitest';
import {
  createMultiSelectionInspectorViewModel,
  createSelectionActionInfo,
  resolvePrimarySelectedId,
} from '../src/preview-shell/inspector-selection.js';

describe('inspector selection helpers', () => {
  it('prefers the requested primary selection when it is still selected', () => {
    expect(resolvePrimarySelectedId(new Set(['a', 'b', 'c']), 'b')).toBe('b');
    expect(resolvePrimarySelectedId(new Set(['a', 'b', 'c']), 'missing')).toBe('c');
    expect(resolvePrimarySelectedId([], null)).toBeNull();
  });

  it('groups multi-selection items by parent and preserves unsupported state', () => {
    const info = createSelectionActionInfo(
      [
        { id: 'a', parentId: 'root', x: 0, y: 0, width: 40, height: 20 },
        { id: 'b', parentId: 'root', x: 64, y: 0, width: 40, height: 20 },
      ],
      true,
    );

    expect(info.sameParent).toBe(true);
    expect(info.parentId).toBe('root');
    expect(info.hasUnsupported).toBe(true);
  });

  it('derives stack spacing and hint state from the parent layout when available', () => {
    const info = createSelectionActionInfo([
      { id: 'a', parentId: 'stack', x: 0, y: 0, width: 80, height: 24 },
      { id: 'b', parentId: 'stack', x: 0, y: 48, width: 80, height: 24 },
    ]);

    const viewModel = createMultiSelectionInspectorViewModel({
      selectedCount: 2,
      info,
      fallbackGap: 24,
      snapStep: 8,
      parentLayout: { layout: 'vertical', layoutRowGap: 16 },
    });

    expect(viewModel.inferredGap).toBe(16);
    expect(viewModel.showDistributeControls).toBe(true);
    expect(viewModel.showAlignOnlyHint).toBe(false);
    expect(viewModel.showStackSpacingHint).toBe(true);
  });

  it('falls back to align-only messaging for cross-parent selections', () => {
    const info = createSelectionActionInfo([
      { id: 'a', parentId: 'left', x: 0, y: 0, width: 40, height: 20 },
      { id: 'b', parentId: 'right', x: 80, y: 0, width: 40, height: 20 },
    ]);

    const viewModel = createMultiSelectionInspectorViewModel({
      selectedCount: 2,
      info,
      fallbackGap: 24,
      snapStep: 8,
    });

    expect(viewModel.sameParent).toBe(false);
    expect(viewModel.inferredGap).toBe(24);
    expect(viewModel.showDistributeControls).toBe(false);
    expect(viewModel.showAlignOnlyHint).toBe(true);
    expect(viewModel.showStackSpacingHint).toBe(false);
  });
});
