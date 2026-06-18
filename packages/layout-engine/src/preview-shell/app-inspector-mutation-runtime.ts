import {
  dispatchPreviewSingleFrameAlignHost,
  dispatchPreviewSingleFramePropHost,
  dispatchPreviewSingleFrameSizeHost,
} from './app-inspector-mutation-host.js';
import {
  applySingleFramePropMutation,
  applySingleFrameSizeMutation,
  resolvePreviewFrameSizePx,
  type PreviewFrameMutationNode,
  type PreviewFrameSizeDimension,
} from './frame-prop-actions.js';
import {
  applyVisiblePreviewStyleOverride,
  type PreviewStyleNode,
} from './frame-style.js';
import type { PreviewGridInfo } from './grid-resolution.js';

export interface CreatePreviewInspectorMutationRuntimeOptions {
  captureOverrideEntries: (ids: string[]) => unknown;
  commitOverridePatchAction: (label: string, beforeEntries: unknown, afterEntries: unknown) => void;
  overrides: Record<string, Record<string, unknown>>;
  coercedKeys: Set<string>;
  getNode: (cid: string) => PreviewFrameMutationNode | PreviewStyleNode | null | undefined;
  snapToGrid: (value: number) => number;
  setDirty: (dirty: boolean) => void;
  scheduleRelayout: (cid: string) => void;
  renderSelectionInspector: (cid?: string | null) => void;
  cleanOverride: (cid: string) => void;
  getGridInfo: () => PreviewGridInfo | null | undefined;
  getWidthUnit: () => string;
  getHeightUnit: () => string;
  baselineStep: number;
}

export interface PreviewInspectorMutationRuntime {
  applyStyle: (cid: string, styleName: string) => void;
  setFrameAlign: (cid: string, align: string) => void;
  setFrameProp: (cid: string, prop: string, value: unknown) => void;
  setFrameSize: (cid: string, dimension: string, value: unknown) => void;
}

export function createPreviewInspectorMutationRuntime(
  options: CreatePreviewInspectorMutationRuntimeOptions,
): PreviewInspectorMutationRuntime {
  return {
    applyStyle(cid, styleName) {
      const ids = [cid];
      const beforeEntries = options.captureOverrideEntries(ids);
      const changed = applyVisiblePreviewStyleOverride({
        overrides: options.overrides,
        cid,
        node: options.getNode(cid) as PreviewStyleNode | null | undefined,
        styleName,
      });
      if (!changed) {
        options.renderSelectionInspector(cid);
        return;
      }
      options.cleanOverride(cid);
      options.setDirty(true);
      options.scheduleRelayout(cid);
      options.renderSelectionInspector(cid);
      options.commitOverridePatchAction(
        'Change style',
        beforeEntries,
        options.captureOverrideEntries(ids),
      );
    },
    setFrameAlign(cid, align) {
      dispatchPreviewSingleFrameAlignHost({
        cid,
        captureOverrideEntries: options.captureOverrideEntries,
        applySingleFramePropMutation: (hostOptions) => {
          const result = applySingleFramePropMutation({
            overrides: hostOptions.overrides,
            coercedKeys: hostOptions.coercedKeys,
            cid: hostOptions.cid,
            prop: hostOptions.prop,
            value: hostOptions.value,
            node: hostOptions.node as PreviewFrameMutationNode | null | undefined,
            snapToGrid: hostOptions.snapToGrid,
          });
          if (result.kind === 'change') {
            return { kind: 'changed' as const };
          }
          if (result.kind === 'clear') {
            return { kind: 'clear' as const };
          }
          return { kind: 'none' as const };
        },
        overrides: options.overrides,
        coercedKeys: options.coercedKeys,
        getNode: (cid) => options.getNode(cid) as PreviewFrameMutationNode | null | undefined,
        align,
        snapToGrid: options.snapToGrid,
        setDirty: options.setDirty,
        commitOverridePatchAction: options.commitOverridePatchAction,
        scheduleRelayout: options.scheduleRelayout,
        renderSelectionInspector: options.renderSelectionInspector,
      });
    },
    setFrameProp(cid, prop, value) {
      dispatchPreviewSingleFramePropHost({
        cid,
        prop,
        value,
        captureOverrideEntries: options.captureOverrideEntries,
        applySingleFramePropMutation: (hostOptions) => {
          const result = applySingleFramePropMutation({
            overrides: hostOptions.overrides,
            coercedKeys: hostOptions.coercedKeys,
            cid: hostOptions.cid,
            prop: hostOptions.prop,
            value: hostOptions.value,
            node: hostOptions.node as PreviewFrameMutationNode | null | undefined,
            snapToGrid: hostOptions.snapToGrid,
          });
          if (result.kind === 'change') {
            return { kind: 'changed' as const };
          }
          if (result.kind === 'clear') {
            return { kind: 'clear' as const };
          }
          return { kind: 'none' as const };
        },
        overrides: options.overrides,
        coercedKeys: options.coercedKeys,
        getNode: (cid) => options.getNode(cid) as PreviewFrameMutationNode | null | undefined,
        snapToGrid: options.snapToGrid,
        setDirty: options.setDirty,
        commitOverridePatchAction: options.commitOverridePatchAction,
        scheduleRelayout: options.scheduleRelayout,
        renderSelectionInspector: options.renderSelectionInspector,
      });
    },
    setFrameSize(cid, dimension, value) {
      const nextDimension = dimension as PreviewFrameSizeDimension;
      dispatchPreviewSingleFrameSizeHost({
        cid,
        dimension: nextDimension,
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
        applySingleFrameSizeMutation: (hostOptions) => applySingleFrameSizeMutation({
          overrides: hostOptions.overrides,
          coercedKeys: hostOptions.coercedKeys,
          cid: hostOptions.cid,
          dimension: hostOptions.dimension as PreviewFrameSizeDimension,
          px: hostOptions.px,
        }),
        overrides: options.overrides,
        coercedKeys: options.coercedKeys,
        setDirty: options.setDirty,
        commitOverridePatchAction: options.commitOverridePatchAction,
        scheduleRelayout: options.scheduleRelayout,
        renderSelectionInspector: options.renderSelectionInspector,
      });
    },
  };
}
