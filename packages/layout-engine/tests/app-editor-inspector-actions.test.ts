import { describe, expect, it, vi } from 'vitest';

import { bindPreviewEditorInspectorActionsFromBrowserHost } from '../src/preview-shell/app-editor-inspector-actions.js';

describe('bindPreviewEditorInspectorActionsFromBrowserHost', () => {
  it('dispatches inspector actions through the latest runtimes instead of eager snapshots', () => {
    const bindPreviewInspectorActions = vi.fn((options: Record<string, unknown>) => {
      boundOptions = options;
      return true;
    });
    let boundOptions: Record<string, unknown> | null = null;

    const firstInspectorDisplay = {
      setWidthUnit: vi.fn(),
      setHeightUnit: vi.fn(),
    };
    const secondInspectorDisplay = {
      setWidthUnit: vi.fn(),
      setHeightUnit: vi.fn(),
    };
    const firstInspectorMutation = {
      setFrameAlign: vi.fn(),
      applyStyle: vi.fn(),
      setFrameProp: vi.fn(),
      setFrameSize: vi.fn(),
    };
    const secondInspectorMutation = {
      setFrameAlign: vi.fn(),
      applyStyle: vi.fn(),
      setFrameProp: vi.fn(),
      setFrameSize: vi.fn(),
    };
    const firstInspectorSelection = {
      alignSelection: vi.fn(),
      distributeSelection: vi.fn(),
      setMultiFrameAlign: vi.fn(),
      applyMultiStyleOverride: vi.fn(),
      setMultiFrameProp: vi.fn(),
      setMultiFrameSize: vi.fn(),
    };
    const secondInspectorSelection = {
      alignSelection: vi.fn(),
      distributeSelection: vi.fn(),
      setMultiFrameAlign: vi.fn(),
      applyMultiStyleOverride: vi.fn(),
      setMultiFrameProp: vi.fn(),
      setMultiFrameSize: vi.fn(),
    };

    let generation = 0;
    const getInspectorDisplayRuntime = vi.fn(() => (
      generation === 0 ? firstInspectorDisplay : secondInspectorDisplay
    ));
    const getInspectorMutationRuntime = vi.fn(() => (
      generation === 0 ? firstInspectorMutation : secondInspectorMutation
    ));
    const getInspectorSelectionRuntime = vi.fn(() => (
      generation === 0 ? firstInspectorSelection : secondInspectorSelection
    ));

    expect(bindPreviewEditorInspectorActionsFromBrowserHost({
      bindPreviewInspectorActions,
      inspector: { addEventListener() {} },
      alreadyBound: false,
      warnUnknownAction: vi.fn(),
      clearOverride: vi.fn(),
      setMultiActionGap: vi.fn(),
      getInspectorDisplayRuntime,
      getInspectorMutationRuntime,
      getInspectorSelectionRuntime,
    })).toBe(true);

    expect(getInspectorDisplayRuntime).not.toHaveBeenCalled();
    expect(getInspectorMutationRuntime).not.toHaveBeenCalled();
    expect(getInspectorSelectionRuntime).not.toHaveBeenCalled();
    expect(boundOptions).toBeTruthy();

    generation = 1;

    (boundOptions!.setFrameProp as (cid: string, prop: string, value: unknown) => void)(
      'alpha',
      'sizing_w',
      'FIXED',
    );
    (boundOptions!.setWidthUnit as (value: unknown, cid?: string) => void)('cols', 'alpha');
    (boundOptions!.alignSelection as (mode: string) => void)('left');

    expect(firstInspectorMutation.setFrameProp).not.toHaveBeenCalled();
    expect(firstInspectorDisplay.setWidthUnit).not.toHaveBeenCalled();
    expect(firstInspectorSelection.alignSelection).not.toHaveBeenCalled();
    expect(secondInspectorMutation.setFrameProp).toHaveBeenCalledWith('alpha', 'sizing_w', 'FIXED');
    expect(secondInspectorDisplay.setWidthUnit).toHaveBeenCalledWith('cols', 'alpha');
    expect(secondInspectorSelection.alignSelection).toHaveBeenCalledWith('left');
  });
});
