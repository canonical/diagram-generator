export interface BindPreviewEditorInspectorActionsFromBrowserHostOptions {
  bindPreviewInspectorActions: (options: Record<string, unknown>) => boolean;
  inspector: unknown;
  alreadyBound: boolean;
  warnUnknownAction: (kind: string, action: string, actionEl: unknown) => void;
  clearOverride: (cid: string) => void;
  setMultiActionGap: (value: string | number | undefined) => void;
  getInspectorDisplayRuntime: () => {
    renderEmptyInspector?: () => void;
    renderSelectionInspector: (preferredCid?: string | null) => void;
    renderMultiSelectionInspector?: () => void;
    setWidthUnit: (value: string, cid?: string) => void;
    setHeightUnit: (value: string, cid?: string) => void;
  };
  getInspectorMutationRuntime: () => {
    setFrameAlign: (cid: string, align: string) => void;
    applyStyle: (cid: string, styleName: string) => void;
    setFrameProp: (cid: string, prop: string, value: unknown) => void;
    setFrameSize: (cid: string, dimension: string, value: unknown) => void;
  };
  getInspectorSelectionRuntime: () => {
    alignSelection: (mode: string) => void;
    distributeSelection: (axis: string) => void;
    setMultiFrameAlign: (align: string) => void;
    applyMultiStyleOverride: (styleName: string) => void;
    setMultiFrameProp: (prop: string, value: unknown) => void;
    setMultiFrameSize: (dimension: string, value: unknown) => void;
  };
}

export function bindPreviewEditorInspectorActionsFromBrowserHost(
  options: BindPreviewEditorInspectorActionsFromBrowserHostOptions,
): boolean {
  const inspectorDisplay = options.getInspectorDisplayRuntime();
  const inspectorMutation = options.getInspectorMutationRuntime();
  const inspectorSelection = options.getInspectorSelectionRuntime();
  return options.bindPreviewInspectorActions({
    inspector: options.inspector,
    alreadyBound: options.alreadyBound,
    warnUnknownAction: options.warnUnknownAction,
    setFrameAlign: inspectorMutation.setFrameAlign,
    clearOverride: options.clearOverride,
    alignSelection: inspectorSelection.alignSelection,
    distributeSelection: inspectorSelection.distributeSelection,
    setMultiFrameAlign: inspectorSelection.setMultiFrameAlign,
    applyStyleOverride: inspectorMutation.applyStyle,
    setFrameProp: inspectorMutation.setFrameProp,
    setFrameSize: inspectorMutation.setFrameSize,
    setWidthUnit: inspectorDisplay.setWidthUnit,
    setHeightUnit: inspectorDisplay.setHeightUnit,
    applyMultiStyleOverride: inspectorSelection.applyMultiStyleOverride,
    setMultiFrameProp: inspectorSelection.setMultiFrameProp,
    setMultiFrameSize: inspectorSelection.setMultiFrameSize,
    setMultiActionGap: options.setMultiActionGap,
  });
}
