/**
 * Preview inspector mutation host helpers (spec 046 slice T013).
 *
 * These helpers own the repeated shell-side mutation orchestration for
 * single/multi selection inspector changes so editor.js stops repeating the
 * same dirty/undo/relayout/update sequence.
 */

export interface PreviewMutationHostResult {
  kind: 'none' | 'changed' | 'clear';
}

export interface DispatchPreviewSingleFrameAlignHostOptions {
  cid: string;
  captureOverrideEntries: (ids: string[]) => unknown;
  applySingleFramePropMutation: (options: {
    overrides: Record<string, Record<string, unknown>>;
    coercedKeys: Set<string>;
    cid: string;
    prop: string;
    value: unknown;
    node: unknown;
    snapToGrid: (value: number) => number;
  }) => unknown;
  overrides: Record<string, Record<string, unknown>>;
  coercedKeys: Set<string>;
  getNode: (cid: string) => unknown;
  align: string;
  snapToGrid: (value: number) => number;
  setDirty: (dirty: boolean) => void;
  commitOverridePatchAction: (label: string, beforeEntries: unknown, afterEntries: unknown) => void;
  scheduleRelayout: (cid: string) => void;
  renderSelectionInspector: (cid?: string | null) => void;
}

export interface DispatchPreviewSingleFramePropHostOptions {
  cid: string;
  prop: string;
  value: unknown;
  captureOverrideEntries: (ids: string[]) => unknown;
  applySingleFramePropMutation: (options: {
    overrides: Record<string, Record<string, unknown>>;
    coercedKeys: Set<string>;
    cid: string;
    prop: string;
    value: unknown;
    node: unknown;
    snapToGrid: (value: number) => number;
  }) => PreviewMutationHostResult;
  overrides: Record<string, Record<string, unknown>>;
  coercedKeys: Set<string>;
  getNode: (cid: string) => unknown;
  snapToGrid: (value: number) => number;
  setDirty: (dirty: boolean) => void;
  commitOverridePatchAction: (label: string, beforeEntries: unknown, afterEntries: unknown) => void;
  scheduleRelayout: (cid: string) => void;
  renderSelectionInspector: (cid?: string | null) => void;
}

export interface DispatchPreviewSingleFrameSizeHostOptions {
  cid: string;
  dimension: string;
  value: unknown;
  gridInfo: unknown;
  widthUnit: string;
  heightUnit: string;
  baselineStep: number;
  resolveFrameSizePx: (options: {
    dimension: string;
    value: unknown;
    gridInfo: unknown;
    widthUnit: string;
    heightUnit: string;
    baselineStep: number;
  }) => number | null | undefined;
  captureOverrideEntries: (ids: string[]) => unknown;
  applySingleFrameSizeMutation: (options: {
    overrides: Record<string, Record<string, unknown>>;
    coercedKeys: Set<string>;
    cid: string;
    dimension: string;
    px: number;
  }) => unknown;
  overrides: Record<string, Record<string, unknown>>;
  coercedKeys: Set<string>;
  setDirty: (dirty: boolean) => void;
  commitOverridePatchAction: (label: string, beforeEntries: unknown, afterEntries: unknown) => void;
  requestRelayout: (cid: string) => void;
  renderSelectionInspector: (cid?: string | null) => void;
}

export interface DispatchPreviewMultiFrameAlignHostOptions {
  selectedIds: Iterable<string>;
  align: string;
  captureOverrideEntries: (ids: string[]) => unknown;
  applyMultiFramePropMutation: (options: {
    overrides: Record<string, Record<string, unknown>>;
    coercedKeys: Set<string>;
    ids: string[];
    prop: string;
    value: unknown;
    getNode: (cid: string) => unknown;
  }) => PreviewMutationHostResult;
  overrides: Record<string, Record<string, unknown>>;
  coercedKeys: Set<string>;
  getNode: (cid: string) => unknown;
  setDirty: (dirty: boolean) => void;
  commitOverridePatchAction: (label: string, beforeEntries: unknown, afterEntries: unknown) => void;
  scheduleRelayout: (cid: string) => void;
  renderMultiSelectionInspector: () => void;
}

export interface DispatchPreviewMultiStyleOverrideHostOptions {
  selectedIds: Iterable<string>;
  styleName: string;
  captureOverrideEntries: (ids: string[]) => unknown;
  normalizeStyleName: (styleName: string) => string;
  getComponentType: (cid: string) => string | null | undefined;
  isStyleableComponentType: (componentType: string | null | undefined) => boolean;
  applyVisibleStyleOverride: (options: {
    overrides: Record<string, Record<string, unknown>>;
    cid: string;
    node: unknown;
    styleName: string;
  }) => boolean;
  cleanOverride: (cid: string) => void;
  getNode: (cid: string) => unknown;
  overrides: Record<string, Record<string, unknown>>;
  setDirty: (dirty: boolean) => void;
  commitOverridePatchAction: (label: string, beforeEntries: unknown, afterEntries: unknown) => void;
  requestRelayout: (cid: string) => void;
  renderMultiSelectionInspector: () => void;
}

export interface DispatchPreviewMultiFramePropHostOptions {
  selectedIds: Iterable<string>;
  prop: string;
  value: unknown;
  captureOverrideEntries: (ids: string[]) => unknown;
  applyMultiFramePropMutation: (options: {
    overrides: Record<string, Record<string, unknown>>;
    coercedKeys: Set<string>;
    ids: string[];
    prop: string;
    value: unknown;
    getNode: (cid: string) => unknown;
  }) => PreviewMutationHostResult;
  overrides: Record<string, Record<string, unknown>>;
  coercedKeys: Set<string>;
  getNode: (cid: string) => unknown;
  setDirty: (dirty: boolean) => void;
  commitOverridePatchAction: (label: string, beforeEntries: unknown, afterEntries: unknown) => void;
  scheduleRelayout: (cid: string) => void;
  renderSelectionInspector: () => void;
  renderMultiSelectionInspector: () => void;
}

export interface DispatchPreviewMultiFrameSizeHostOptions {
  selectedIds: Iterable<string>;
  dimension: string;
  value: unknown;
  gridInfo: unknown;
  widthUnit: string;
  heightUnit: string;
  baselineStep: number;
  resolveFrameSizePx: (options: {
    dimension: string;
    value: unknown;
    gridInfo: unknown;
    widthUnit: string;
    heightUnit: string;
    baselineStep: number;
  }) => number | null | undefined;
  captureOverrideEntries: (ids: string[]) => unknown;
  applyMultiFrameSizeMutation: (options: {
    overrides: Record<string, Record<string, unknown>>;
    coercedKeys: Set<string>;
    ids: string[];
    dimension: string;
    px: number;
    getNode: (cid: string) => unknown;
  }) => unknown;
  overrides: Record<string, Record<string, unknown>>;
  coercedKeys: Set<string>;
  getNode: (cid: string) => unknown;
  setDirty: (dirty: boolean) => void;
  commitOverridePatchAction: (label: string, beforeEntries: unknown, afterEntries: unknown) => void;
  requestRelayout: (cid: string) => void;
  renderMultiSelectionInspector: () => void;
}

export interface PreviewSelectionTargetEntry {
  id: string;
  dx: number;
  dy: number;
}

export interface DispatchPreviewApplySelectionTargetsHostOptions<TItem> {
  items: TItem[];
  targets: Record<string, unknown>;
  captureOverrideEntries: (ids: string[]) => unknown;
  createSelectionTargetOverrideEntries: (options: {
    items: TItem[];
    targets: Record<string, unknown>;
    snapStep: number;
  }) => PreviewSelectionTargetEntry[];
  snapStep: number;
  setOverride: (id: string, partial: { dx: number; dy: number }) => void;
  applyAllOverrides: () => void;
  reapplySelection: () => void;
  renderSelectionInspector: () => void;
  updateOverrideSummary: () => void;
  refreshTreeColors: () => void;
  runConstraints: () => void;
  commitOverridePatchAction: (label: string, beforeEntries: unknown, afterEntries: unknown) => void;
}

export interface DispatchPreviewDistributeSelectionHostOptions<TItem> {
  info: {
    items: TItem[];
    sameParent: boolean;
    hasUnsupported: boolean;
  };
  axis: string;
  currentGap: number;
  snapStep: number;
  normalizeSelectionGap: (gap: number, snapStep: number) => number;
  setGap: (gap: number) => void;
  resolveSelectionDistributeTargets: (options: {
    items: TItem[];
    axis: string;
    gap: number;
    snapStep: number;
  }) => Record<string, unknown>;
  applySelectionTargets: (items: TItem[], targets: Record<string, unknown>) => void;
  alert: (message: string) => void;
}

export interface DispatchPreviewAlignSelectionHostOptions<TItem> {
  info: {
    items: TItem[];
    hasUnsupported: boolean;
  };
  mode: string;
  snapStep: number;
  resolveSelectionAlignTargets: (options: {
    items: TItem[];
    mode: string;
    snapStep: number;
  }) => Record<string, unknown>;
  applySelectionTargets: (items: TItem[], targets: Record<string, unknown>) => void;
  alert: (message: string) => void;
}

function selectionIds(selectedIds: Iterable<string>): string[] {
  return [...selectedIds];
}

export function dispatchPreviewSingleFrameAlignHost(
  options: DispatchPreviewSingleFrameAlignHostOptions,
): void {
  const ids = [options.cid];
  const beforeEntries = options.captureOverrideEntries(ids);
  options.applySingleFramePropMutation({
    overrides: options.overrides,
    coercedKeys: options.coercedKeys,
    cid: options.cid,
    prop: 'align',
    value: options.align,
    node: options.getNode(options.cid),
    snapToGrid: options.snapToGrid,
  });
  options.setDirty(true);
  options.commitOverridePatchAction(
    'Change alignment',
    beforeEntries,
    options.captureOverrideEntries(ids),
  );
  options.renderSelectionInspector(options.cid);
  options.scheduleRelayout(options.cid);
}

export function dispatchPreviewSingleFramePropHost(
  options: DispatchPreviewSingleFramePropHostOptions,
): void {
  const ids = [options.cid];
  const beforeEntries = options.captureOverrideEntries(ids);
  const result = options.applySingleFramePropMutation({
    overrides: options.overrides,
    coercedKeys: options.coercedKeys,
    cid: options.cid,
    prop: options.prop,
    value: options.value,
    node: options.getNode(options.cid),
    snapToGrid: options.snapToGrid,
  });
  options.setDirty(true);
  const label = result.kind === 'clear' && options.prop !== 'gap_delta'
    ? `Clear ${options.prop}`
    : `Change ${options.prop}`;
  options.commitOverridePatchAction(label, beforeEntries, options.captureOverrideEntries(ids));
  options.scheduleRelayout(options.cid);
  options.renderSelectionInspector(options.cid);
}

export function dispatchPreviewSingleFrameSizeHost(
  options: DispatchPreviewSingleFrameSizeHostOptions,
): void {
  const px = options.resolveFrameSizePx({
    dimension: options.dimension,
    value: options.value,
    gridInfo: options.gridInfo,
    widthUnit: options.widthUnit,
    heightUnit: options.heightUnit,
    baselineStep: options.baselineStep,
  });
  if (px == null) {
    return;
  }
  const ids = [options.cid];
  const beforeEntries = options.captureOverrideEntries(ids);
  options.applySingleFrameSizeMutation({
    overrides: options.overrides,
    coercedKeys: options.coercedKeys,
    cid: options.cid,
    dimension: options.dimension,
    px,
  });
  options.setDirty(true);
  options.commitOverridePatchAction(
    `Set ${options.dimension}`,
    beforeEntries,
    options.captureOverrideEntries(ids),
  );
  options.requestRelayout(options.cid);
  options.renderSelectionInspector(options.cid);
}

export function dispatchPreviewMultiFrameAlignHost(
  options: DispatchPreviewMultiFrameAlignHostOptions,
): void {
  const ids = selectionIds(options.selectedIds);
  const beforeEntries = options.captureOverrideEntries(ids);
  const result = options.applyMultiFramePropMutation({
    overrides: options.overrides,
    coercedKeys: options.coercedKeys,
    ids,
    prop: 'align',
    value: options.align,
    getNode: options.getNode,
  });
  if (result.kind === 'none') {
    return;
  }
  options.setDirty(true);
  options.commitOverridePatchAction(
    'Change alignment (multi)',
    beforeEntries,
    options.captureOverrideEntries(ids),
  );
  if (ids.length > 0) {
    options.scheduleRelayout(ids[0]!);
  }
  options.renderMultiSelectionInspector();
}

export function dispatchPreviewMultiStyleOverrideHost(
  options: DispatchPreviewMultiStyleOverrideHostOptions,
): void {
  const styleName = options.normalizeStyleName(options.styleName);
  const ids = selectionIds(options.selectedIds);
  const beforeEntries = options.captureOverrideEntries(ids);
  let changedAny = false;
  for (const cid of ids) {
    if (!options.isStyleableComponentType(options.getComponentType(cid))) {
      continue;
    }
    const changed = options.applyVisibleStyleOverride({
      overrides: options.overrides,
      cid,
      node: options.getNode(cid),
      styleName,
    });
    if (changed) {
      options.cleanOverride(cid);
      changedAny = true;
    }
  }
  if (!changedAny) {
    options.renderMultiSelectionInspector();
    return;
  }
  options.setDirty(true);
  options.commitOverridePatchAction(
    'Change style (multi)',
    beforeEntries,
    options.captureOverrideEntries(ids),
  );
  if (ids.length > 0) {
    options.requestRelayout(ids[0]!);
  }
  options.renderMultiSelectionInspector();
}

export function dispatchPreviewMultiFramePropHost(
  options: DispatchPreviewMultiFramePropHostOptions,
): void {
  const ids = selectionIds(options.selectedIds);
  const beforeEntries = options.captureOverrideEntries(ids);
  const result = options.applyMultiFramePropMutation({
    overrides: options.overrides,
    coercedKeys: options.coercedKeys,
    ids,
    prop: options.prop,
    value: options.value,
    getNode: options.getNode,
  });
  if (result.kind === 'none') {
    return;
  }
  options.setDirty(true);
  const labelPrefix = result.kind === 'clear' ? 'Clear ' : 'Change ';
  options.commitOverridePatchAction(
    `${labelPrefix}${options.prop} (multi)`,
    beforeEntries,
    options.captureOverrideEntries(ids),
  );
  if (ids.length > 0) {
    options.scheduleRelayout(ids[0]!);
  }
  if (result.kind === 'clear') {
    options.renderSelectionInspector();
    return;
  }
  options.renderMultiSelectionInspector();
}

export function dispatchPreviewMultiFrameSizeHost(
  options: DispatchPreviewMultiFrameSizeHostOptions,
): void {
  const px = options.resolveFrameSizePx({
    dimension: options.dimension,
    value: options.value,
    gridInfo: options.gridInfo,
    widthUnit: options.widthUnit,
    heightUnit: options.heightUnit,
    baselineStep: options.baselineStep,
  });
  if (px == null) {
    return;
  }
  const ids = selectionIds(options.selectedIds);
  const beforeEntries = options.captureOverrideEntries(ids);
  options.applyMultiFrameSizeMutation({
    overrides: options.overrides,
    coercedKeys: options.coercedKeys,
    ids,
    dimension: options.dimension,
    px,
    getNode: options.getNode,
  });
  options.setDirty(true);
  options.commitOverridePatchAction(
    `Set ${options.dimension} (multi)`,
    beforeEntries,
    options.captureOverrideEntries(ids),
  );
  if (ids.length > 0) {
    options.requestRelayout(ids[0]!);
  }
  options.renderMultiSelectionInspector();
}

export function dispatchPreviewApplySelectionTargetsHost<TItem>(
  options: DispatchPreviewApplySelectionTargetsHostOptions<TItem>,
): void {
  if (Object.keys(options.targets).length === 0) {
    return;
  }
  const ids = Object.keys(options.targets);
  const beforeEntries = options.captureOverrideEntries(ids);
  const entries = options.createSelectionTargetOverrideEntries({
    items: options.items,
    targets: options.targets,
    snapStep: options.snapStep,
  });
  for (const entry of entries) {
    options.setOverride(entry.id, { dx: entry.dx, dy: entry.dy });
  }
  options.applyAllOverrides();
  options.reapplySelection();
  options.renderSelectionInspector();
  options.updateOverrideSummary();
  options.refreshTreeColors();
  options.runConstraints();
  options.commitOverridePatchAction(
    'Reposition selection',
    beforeEntries,
    options.captureOverrideEntries(ids),
  );
}

export function dispatchPreviewDistributeSelectionHost<TItem>(
  options: DispatchPreviewDistributeSelectionHostOptions<TItem>,
): void {
  if (options.info.items.length < 2) {
    return;
  }
  if (!options.info.sameParent) {
    options.alert('Distribute works on sibling components under one parent.');
    return;
  }
  if (options.info.hasUnsupported) {
    options.alert('Distribute currently supports boxes, panels, terminals, and other non-arrow components only.');
    return;
  }
  const gap = options.normalizeSelectionGap(options.currentGap, options.snapStep);
  options.setGap(gap);
  const targets = options.resolveSelectionDistributeTargets({
    items: options.info.items,
    axis: options.axis,
    gap,
    snapStep: options.snapStep,
  });
  options.applySelectionTargets(options.info.items, targets);
}

export function dispatchPreviewAlignSelectionHost<TItem>(
  options: DispatchPreviewAlignSelectionHostOptions<TItem>,
): void {
  if (options.info.items.length < 2) {
    return;
  }
  if (options.info.hasUnsupported) {
    options.alert('Align currently supports boxes, panels, terminals, and other non-arrow components only.');
    return;
  }
  const targets = options.resolveSelectionAlignTargets({
    items: options.info.items,
    mode: options.mode,
    snapStep: options.snapStep,
  });
  options.applySelectionTargets(options.info.items, targets);
}
