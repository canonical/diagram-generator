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
  const setFrameAlign: (cid: string, align: string) => void = (cid, align) => (
    options.getInspectorMutationRuntime().setFrameAlign(cid, align)
  );
  const alignSelection: (mode: string) => void = (mode) => (
    options.getInspectorSelectionRuntime().alignSelection(mode)
  );
  const distributeSelection: (axis: string) => void = (axis) => (
    options.getInspectorSelectionRuntime().distributeSelection(axis)
  );
  const setMultiFrameAlign: (align: string) => void = (align) => (
    options.getInspectorSelectionRuntime().setMultiFrameAlign(align)
  );
  const applyStyleOverride: (cid: string, styleName: string) => void = (cid, styleName) => (
    options.getInspectorMutationRuntime().applyStyle(cid, styleName)
  );
  const setFrameProp: (cid: string, prop: string, value: unknown) => void = (cid, prop, value) => (
    options.getInspectorMutationRuntime().setFrameProp(cid, prop, value)
  );
  const setFrameSize: (cid: string, dimension: string, value: unknown) => void = (cid, dimension, value) => (
    options.getInspectorMutationRuntime().setFrameSize(cid, dimension, value)
  );
  const setWidthUnit: (value: string, cid?: string) => void = (value, cid) => (
    options.getInspectorDisplayRuntime().setWidthUnit(value, cid)
  );
  const setHeightUnit: (value: string, cid?: string) => void = (value, cid) => (
    options.getInspectorDisplayRuntime().setHeightUnit(value, cid)
  );
  const applyMultiStyleOverride: (styleName: string) => void = (styleName) => (
    options.getInspectorSelectionRuntime().applyMultiStyleOverride(styleName)
  );
  const setMultiFrameProp: (prop: string, value: unknown) => void = (prop, value) => (
    options.getInspectorSelectionRuntime().setMultiFrameProp(prop, value)
  );
  const setMultiFrameSize: (dimension: string, value: unknown) => void = (dimension, value) => (
    options.getInspectorSelectionRuntime().setMultiFrameSize(dimension, value)
  );

  return options.bindPreviewInspectorActions({
    inspector: options.inspector,
    alreadyBound: options.alreadyBound,
    warnUnknownAction: options.warnUnknownAction,
    setFrameAlign,
    clearOverride: options.clearOverride,
    alignSelection,
    distributeSelection,
    setMultiFrameAlign,
    applyStyleOverride,
    setFrameProp,
    setFrameSize,
    setWidthUnit,
    setHeightUnit,
    applyMultiStyleOverride,
    setMultiFrameProp,
    setMultiFrameSize,
    setMultiActionGap: options.setMultiActionGap,
  });
}
