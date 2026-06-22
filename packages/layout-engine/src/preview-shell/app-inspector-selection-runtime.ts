import {
  dispatchPreviewAlignSelectionHost,
  dispatchPreviewApplySelectionTargetsHost,
  dispatchPreviewDistributeSelectionHost,
  dispatchPreviewMultiFrameAlignHost,
  dispatchPreviewMultiFramePropHost,
  dispatchPreviewMultiFrameSizeHost,
  dispatchPreviewMultiStyleOverrideHost,
} from './app-inspector-mutation-host.js';
import {
  applyMultiFramePropMutation,
  applyMultiFrameSizeMutation,
  resolvePreviewFrameSizePx,
  type PreviewFrameMutationNode,
  type PreviewFrameSizeDimension,
} from './frame-prop-actions.js';
import {
  applyVisiblePreviewStyleOverride,
  isPreviewStyleableComponentType,
  type PreviewStyleNode,
} from './frame-style.js';
import type { PreviewGridInfo } from './grid-resolution.js';
import type {
  PreviewSelectionActionInfo,
  PreviewSelectionActionItem,
} from './selection-action-items.js';

export interface CreatePreviewInspectorSelectionRuntimeOptions {
  selectedIds: Set<string>;
  getSelectionActionInfo: () => PreviewSelectionActionInfo;
  getMultiActionGap: () => number;
  setMultiActionGap: (gap: number) => void;
  captureOverrideEntries: (ids: string[]) => unknown;
  commitOverridePatchAction: (label: string, beforeEntries: unknown, afterEntries: unknown) => void;
  getOverrides: () => Record<string, Record<string, unknown>>;
  coercedKeys: Set<string>;
  getNode: (cid: string) => PreviewFrameMutationNode | PreviewStyleNode | null | undefined;
  cleanOverride: (cid: string) => void;
  setDirty: (dirty: boolean) => void;
  scheduleRelayout: (cid: string) => void;
  requestRelayoutNow: (cid: string) => void;
  renderSelectionInspector: () => void;
  renderMultiSelectionInspector: () => void;
  applyAllOverrides: () => void;
  reapplySelection: () => void;
  updateOverrideSummary: () => void;
  refreshTreeColors: () => void;
  runConstraints: () => void;
  setOverride: (id: string, partial: { dx: number; dy: number }) => void;
  getGridInfo: () => PreviewGridInfo | null | undefined;
  getWidthUnit: () => string;
  getHeightUnit: () => string;
  baselineStep: number;
  normalizeSelectionGap: (gap: number, snapStep: number) => number;
  resolveSelectionDistributeTargets: (options: {
    items: PreviewSelectionActionItem[];
    axis: string;
    gap: number;
    snapStep: number;
  }) => Record<string, unknown>;
  resolveSelectionAlignTargets: (options: {
    items: PreviewSelectionActionItem[];
    mode: string;
    snapStep: number;
  }) => Record<string, unknown>;
  createSelectionTargetOverrideEntries: (options: {
    items: PreviewSelectionActionItem[];
    targets: Record<string, unknown>;
    snapStep: number;
  }) => Array<{ id: string; dx: number; dy: number }>;
  alert: (message: string) => void;
  getComponentType: (cid: string) => string | null | undefined;
  normalizeStyleName: (styleName: string) => string;
}

export interface PreviewInspectorSelectionRuntime {
  applySelectionTargets: (
    items: PreviewSelectionActionItem[],
    targets: Record<string, unknown>,
  ) => void;
  distributeSelection: (axis: string) => void;
  alignSelection: (mode: string) => void;
  setMultiFrameAlign: (align: string) => void;
  applyMultiStyleOverride: (styleName: string) => void;
  setMultiFrameProp: (prop: string, value: unknown) => void;
  setMultiFrameSize: (dimension: string, value: unknown) => void;
}

export function createPreviewInspectorSelectionRuntime(
  options: CreatePreviewInspectorSelectionRuntimeOptions,
): PreviewInspectorSelectionRuntime {
  const applySelectionTargets = (
    items: PreviewSelectionActionItem[],
    targets: Record<string, unknown>,
  ): void => {
    dispatchPreviewApplySelectionTargetsHost({
      items,
      targets,
      captureOverrideEntries: options.captureOverrideEntries,
      createSelectionTargetOverrideEntries: options.createSelectionTargetOverrideEntries,
      snapStep: options.baselineStep,
      setOverride: options.setOverride,
      applyAllOverrides: options.applyAllOverrides,
      reapplySelection: options.reapplySelection,
      renderSelectionInspector: options.renderSelectionInspector,
      updateOverrideSummary: options.updateOverrideSummary,
      refreshTreeColors: options.refreshTreeColors,
      runConstraints: options.runConstraints,
      commitOverridePatchAction: options.commitOverridePatchAction,
    });
  };

  return {
    applySelectionTargets,
    distributeSelection(axis) {
      const info = options.getSelectionActionInfo();
      dispatchPreviewDistributeSelectionHost({
        info,
        axis,
        currentGap: options.getMultiActionGap(),
        snapStep: options.baselineStep,
        normalizeSelectionGap: options.normalizeSelectionGap,
        setGap: options.setMultiActionGap,
        resolveSelectionDistributeTargets: options.resolveSelectionDistributeTargets,
        applySelectionTargets,
        alert: options.alert,
      });
    },
    alignSelection(mode) {
      const info = options.getSelectionActionInfo();
      dispatchPreviewAlignSelectionHost({
        info,
        mode,
        snapStep: options.baselineStep,
        resolveSelectionAlignTargets: options.resolveSelectionAlignTargets,
        applySelectionTargets,
        alert: options.alert,
      });
    },
    setMultiFrameAlign(align) {
      const overrides = options.getOverrides();
      dispatchPreviewMultiFrameAlignHost({
        selectedIds: options.selectedIds,
        align,
        captureOverrideEntries: options.captureOverrideEntries,
        applyMultiFramePropMutation: (hostOptions) => {
          const result = applyMultiFramePropMutation({
            overrides: hostOptions.overrides,
            coercedKeys: hostOptions.coercedKeys,
            ids: hostOptions.ids,
            prop: hostOptions.prop,
            value: hostOptions.value,
            getNode: hostOptions.getNode as (cid: string) => PreviewFrameMutationNode | null | undefined,
          });
          if (result.kind === 'change') {
            return { kind: 'changed' as const };
          }
          if (result.kind === 'clear') {
            return { kind: 'clear' as const };
          }
          return { kind: 'none' as const };
        },
        overrides,
        coercedKeys: options.coercedKeys,
        getNode: (cid) => options.getNode(cid) as PreviewFrameMutationNode | null | undefined,
        setDirty: options.setDirty,
        commitOverridePatchAction: options.commitOverridePatchAction,
        scheduleRelayout: options.scheduleRelayout,
        renderMultiSelectionInspector: options.renderMultiSelectionInspector,
      });
    },
    applyMultiStyleOverride(styleName) {
      const overrides = options.getOverrides();
      dispatchPreviewMultiStyleOverrideHost({
        selectedIds: options.selectedIds,
        styleName,
        captureOverrideEntries: options.captureOverrideEntries,
        normalizeStyleName: options.normalizeStyleName,
        getComponentType: options.getComponentType,
        isStyleableComponentType: isPreviewStyleableComponentType,
        applyVisibleStyleOverride: (hostOptions) => applyVisiblePreviewStyleOverride({
          overrides: hostOptions.overrides,
          cid: hostOptions.cid,
          node: hostOptions.node as PreviewStyleNode | null | undefined,
          styleName: hostOptions.styleName,
        }),
        cleanOverride: options.cleanOverride,
        getNode: (cid) => options.getNode(cid) as PreviewStyleNode | null | undefined,
        overrides,
        setDirty: options.setDirty,
        commitOverridePatchAction: options.commitOverridePatchAction,
        requestRelayout: options.requestRelayoutNow,
        renderMultiSelectionInspector: options.renderMultiSelectionInspector,
      });
    },
    setMultiFrameProp(prop, value) {
      const overrides = options.getOverrides();
      dispatchPreviewMultiFramePropHost({
        selectedIds: options.selectedIds,
        prop,
        value,
        captureOverrideEntries: options.captureOverrideEntries,
        applyMultiFramePropMutation: (hostOptions) => {
          const result = applyMultiFramePropMutation({
            overrides: hostOptions.overrides,
            coercedKeys: hostOptions.coercedKeys,
            ids: hostOptions.ids,
            prop: hostOptions.prop,
            value: hostOptions.value,
            getNode: hostOptions.getNode as (cid: string) => PreviewFrameMutationNode | null | undefined,
          });
          if (result.kind === 'change') {
            return { kind: 'changed' as const };
          }
          if (result.kind === 'clear') {
            return { kind: 'clear' as const };
          }
          return { kind: 'none' as const };
        },
        overrides,
        coercedKeys: options.coercedKeys,
        getNode: (cid) => options.getNode(cid) as PreviewFrameMutationNode | null | undefined,
        setDirty: options.setDirty,
        commitOverridePatchAction: options.commitOverridePatchAction,
        scheduleRelayout: options.scheduleRelayout,
        renderSelectionInspector: options.renderSelectionInspector,
        renderMultiSelectionInspector: options.renderMultiSelectionInspector,
      });
    },
    setMultiFrameSize(dimension, value) {
      const overrides = options.getOverrides();
      dispatchPreviewMultiFrameSizeHost({
        selectedIds: options.selectedIds,
        dimension,
        value,
        gridInfo: options.getGridInfo(),
        widthUnit: options.getWidthUnit(),
        heightUnit: options.getHeightUnit(),
        baselineStep: options.baselineStep,
        resolveFrameSizePx: (hostOptions) => resolvePreviewFrameSizePx({
          dimension: hostOptions.dimension as PreviewFrameSizeDimension,
          value: hostOptions.value as number,
          gridInfo: hostOptions.gridInfo as PreviewGridInfo | null | undefined,
          widthUnit: hostOptions.widthUnit as 'px' | 'cols',
          heightUnit: hostOptions.heightUnit as 'px' | 'rows',
          baselineStep: hostOptions.baselineStep,
        }),
        captureOverrideEntries: options.captureOverrideEntries,
        applyMultiFrameSizeMutation: (hostOptions) => applyMultiFrameSizeMutation({
          overrides: hostOptions.overrides,
          coercedKeys: hostOptions.coercedKeys,
          ids: hostOptions.ids,
          dimension: hostOptions.dimension as PreviewFrameSizeDimension,
          px: hostOptions.px,
          getNode: hostOptions.getNode as (cid: string) => PreviewFrameMutationNode | null | undefined,
        }),
        overrides,
        coercedKeys: options.coercedKeys,
        getNode: (cid) => options.getNode(cid) as PreviewFrameMutationNode | null | undefined,
        setDirty: options.setDirty,
        commitOverridePatchAction: options.commitOverridePatchAction,
        scheduleRelayout: options.scheduleRelayout,
        renderMultiSelectionInspector: options.renderMultiSelectionInspector,
      });
    },
  };
}
