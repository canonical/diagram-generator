import { describe, expect, it, vi } from 'vitest';
import { createPreviewSelectionRuntime } from '../src/preview-shell/app-selection-runtime.js';

describe('createPreviewSelectionRuntime', () => {
  it('updates selection state and refreshes selection UI through typed callbacks', () => {
    const selectedIds = new Set<string>();
    let selectionDepth = 0;
    const syncTreeSelectionState = vi.fn();
    const removeResizeHandles = vi.fn();
    const showResizeHandles = vi.fn();
    const renderEmptyInspector = vi.fn();
    const renderSelectionInspector = vi.fn();
    const runtime = createPreviewSelectionRuntime({
      document: {
        querySelector: () => null,
      } as unknown as Document,
      selectedIds,
      getSelectionDepth: () => selectionDepth,
      setSelectionDepth: (depth) => {
        selectionDepth = depth;
      },
      getPrimarySelectedId: (preferredId) => preferredId ?? [...selectedIds][0] ?? null,
      getAncestorDepth: (cid) => (cid === 'child' ? 2 : 0),
      syncTreeSelectionState,
      removeResizeHandles,
      showResizeHandles,
      renderEmptyInspector,
      renderSelectionInspector,
    });

    runtime.selectComponent('child', false);

    expect([...selectedIds]).toEqual(['child']);
    expect(selectionDepth).toBe(2);
    expect(syncTreeSelectionState).toHaveBeenCalledTimes(1);
    expect(removeResizeHandles).toHaveBeenCalledTimes(1);
    expect(showResizeHandles).toHaveBeenCalledWith('child');
    expect(renderSelectionInspector).toHaveBeenCalledWith('child');
    expect(renderEmptyInspector).not.toHaveBeenCalled();
  });
});
