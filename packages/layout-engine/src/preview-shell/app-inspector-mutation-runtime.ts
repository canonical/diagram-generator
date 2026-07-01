import {
  dispatchPreviewSingleFrameAlignHost,
  dispatchPreviewSingleFramePropHost,
  dispatchPreviewSingleFrameSizeHost,
  type PreviewMutationHostResult,
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
  previewStyleChangeRequiresRelayout,
  type PreviewStyleNode,
} from './frame-style.js';
import {
  resolveEditorMutationTransaction,
  type EditorMutationTransactionResult,
} from './editor-mutation-transaction.js';
import type { PreviewGridInfo } from './grid-resolution.js';

const IMMEDIATE_RELAYOUT_PROPS = new Set([
  'align',
  'direction',
  'wrap',
  'justify',
  'sizing',
  'sizing_w',
  'sizing_h',
  'width',
  'height',
  'min_width',
  'max_width',
  'min_height',
  'max_height',
]);

const ALIGN_VALUES = new Set([
  'TOP_LEFT',
  'TOP_CENTER',
  'TOP_RIGHT',
  'CENTER_LEFT',
  'CENTER',
  'CENTER_RIGHT',
  'BOTTOM_LEFT',
  'BOTTOM_CENTER',
  'BOTTOM_RIGHT',
]);

function changedMutation(result: PreviewMutationHostResult): boolean {
  return result.kind === 'changed' || result.kind === 'clear';
}

export interface PreviewInspectorMutationContext {
  activeEngineId?: string | null;
  documentKind?: string | null;
}

export interface CreatePreviewInspectorMutationRuntimeOptions {
  captureOverrideEntries: (ids: string[]) => unknown;
  commitOverridePatchAction: (label: string, beforeEntries: unknown, afterEntries: unknown) => void;
  getOverrides: () => Record<string, Record<string, unknown>>;
  coercedKeys: Set<string>;
  getNode: (cid: string) => PreviewFrameMutationNode | PreviewStyleNode | null | undefined;
  snapToGrid: (value: number) => number;
  setDirty: (dirty: boolean) => void;
  scheduleRelayout: (cid: string) => void;
  requestRelayoutNow: (cid: string) => void;
  applyAllOverrides?: (() => void) | null;
  renderSelectionInspector: (cid?: string | null) => void;
  cleanOverride: (cid: string) => void;
  getGridInfo: () => PreviewGridInfo | null | undefined;
  getWidthUnit: () => string;
  getHeightUnit: () => string;
  baselineStep: number;
  shouldShowAutolayoutInspector?: (() => boolean) | null;
  getMutationContext?: (() => PreviewInspectorMutationContext | null | undefined) | null;
  onMutationTransaction?: ((result: EditorMutationTransactionResult) => void) | null;
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
  const layoutEditingEnabled = (): boolean => options.shouldShowAutolayoutInspector?.() ?? true;
  const resolveLayoutTransaction = (settings: {
    mutationKind?: 'inspector-layout' | 'geometry';
    sourceControl: string;
    capability: { applicable: boolean; reason: string };
    result?: PreviewMutationHostResult | null;
    relayoutPolicy: 'none' | 'local' | 'engine' | 'fresh-render';
  }): EditorMutationTransactionResult => {
    const changed = settings.result ? changedMutation(settings.result) : true;
    const context = options.getMutationContext?.() ?? null;
    return resolveEditorMutationTransaction({
      kind: settings.mutationKind ?? 'inspector-layout',
      sourceControl: settings.sourceControl,
      activeEngineId: context?.activeEngineId ?? null,
      documentKind: context?.documentKind ?? 'frame-diagram',
      capabilityGate: {
        applicable: settings.capability.applicable,
        reason: settings.capability.reason,
        capability: 'layoutEditing',
      },
      relayoutPolicy: changed ? settings.relayoutPolicy : 'none',
      dirtyPolicy: changed ? 'mark-dirty' : 'preserve',
      undoPolicy: changed ? 'record' : 'none',
      persistenceDelta: changed
        ? {
          frameOverridesChanged: true,
          savePayloadChanged: true,
        }
        : null,
    });
  };
  const emitLayoutTransaction = (settings: Parameters<typeof resolveLayoutTransaction>[0]): EditorMutationTransactionResult => {
    const result = resolveLayoutTransaction(settings);
    options.onMutationTransaction?.(result);
    return result;
  };

  return {
    applyStyle(cid, styleName) {
      const overrides = options.getOverrides();
      const ids = [cid];
      const beforeEntries = options.captureOverrideEntries(ids);
      const node = options.getNode(cid) as PreviewStyleNode | null | undefined;
      const requiresRelayout = previewStyleChangeRequiresRelayout({
        node,
        styleName,
      });
      const changed = applyVisiblePreviewStyleOverride({
        overrides,
        cid,
        node,
        styleName,
      });
      const context = options.getMutationContext?.() ?? null;
      const transaction = resolveEditorMutationTransaction({
        kind: 'inspector-appearance',
        sourceControl: 'single-style',
        activeEngineId: context?.activeEngineId ?? null,
        documentKind: context?.documentKind ?? 'frame-diagram',
        capabilityGate: {
          applicable: true,
          reason: changed ? 'style change is applicable to the selected frame' : 'style already matches selected frame',
          capability: 'appearance',
        },
        relayoutPolicy: changed && requiresRelayout ? 'engine' : 'none',
        dirtyPolicy: changed ? 'mark-dirty' : 'preserve',
        undoPolicy: changed ? 'record' : 'none',
        persistenceDelta: changed
          ? {
            frameOverridesChanged: true,
            savePayloadChanged: true,
          }
          : null,
      });
      if (!changed) {
        options.renderSelectionInspector(cid);
        options.onMutationTransaction?.(transaction);
        return;
      }
      options.cleanOverride(cid);
      options.setDirty(true);
      if (requiresRelayout) {
        options.scheduleRelayout(cid);
      } else {
        options.applyAllOverrides?.();
      }
      options.renderSelectionInspector(cid);
      options.commitOverridePatchAction(
        'Change style',
        beforeEntries,
        options.captureOverrideEntries(ids),
      );
      options.onMutationTransaction?.(transaction);
    },
    setFrameAlign(cid, align) {
      if (!layoutEditingEnabled()) {
        emitLayoutTransaction({
          sourceControl: 'single-align',
          capability: {
            applicable: false,
            reason: 'native layout inspector controls require an active grid-editing engine',
          },
          relayoutPolicy: 'engine',
        });
        options.renderSelectionInspector(cid);
        return;
      }
      if (!ALIGN_VALUES.has(align)) {
        emitLayoutTransaction({
          sourceControl: 'single-align',
          capability: {
            applicable: true,
            reason: 'alignment value produced no layout change',
          },
          result: { kind: 'none' },
          relayoutPolicy: 'engine',
        });
        options.renderSelectionInspector(cid);
        return;
      }
      const overrides = options.getOverrides();
      const result = dispatchPreviewSingleFrameAlignHost({
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
        overrides,
        coercedKeys: options.coercedKeys,
        getNode: (cid) => options.getNode(cid) as PreviewFrameMutationNode | null | undefined,
        align,
        snapToGrid: options.snapToGrid,
        setDirty: options.setDirty,
        commitOverridePatchAction: options.commitOverridePatchAction,
        scheduleRelayout: options.requestRelayoutNow,
        renderSelectionInspector: options.renderSelectionInspector,
      });
      emitLayoutTransaction({
        sourceControl: 'single-align',
        capability: {
          applicable: true,
          reason: changedMutation(result)
            ? 'alignment change is applicable to the selected frame'
            : 'alignment value produced no layout change',
        },
        result,
        relayoutPolicy: 'engine',
      });
    },
    setFrameProp(cid, prop, value) {
      if (!layoutEditingEnabled()) {
        emitLayoutTransaction({
          sourceControl: `single-prop:${prop}`,
          capability: {
            applicable: false,
            reason: 'native layout inspector controls require an active grid-editing engine',
          },
          relayoutPolicy: 'engine',
        });
        options.renderSelectionInspector(cid);
        return;
      }
      const overrides = options.getOverrides();
      const result = dispatchPreviewSingleFramePropHost({
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
        overrides,
        coercedKeys: options.coercedKeys,
        getNode: (cid) => options.getNode(cid) as PreviewFrameMutationNode | null | undefined,
        snapToGrid: options.snapToGrid,
        setDirty: options.setDirty,
        commitOverridePatchAction: options.commitOverridePatchAction,
        scheduleRelayout: IMMEDIATE_RELAYOUT_PROPS.has(prop)
          ? options.requestRelayoutNow
          : options.scheduleRelayout,
        renderSelectionInspector: options.renderSelectionInspector,
      });
      emitLayoutTransaction({
        sourceControl: `single-prop:${prop}`,
        capability: {
          applicable: true,
          reason: changedMutation(result)
            ? `${prop} change is applicable to the selected frame`
            : `${prop} change produced no layout change`,
        },
        result,
        relayoutPolicy: 'engine',
      });
    },
    setFrameSize(cid, dimension, value) {
      if (!layoutEditingEnabled()) {
        emitLayoutTransaction({
          mutationKind: 'geometry',
          sourceControl: `single-size:${dimension}`,
          capability: {
            applicable: false,
            reason: 'native size inspector controls require an active grid-editing engine',
          },
          relayoutPolicy: 'engine',
        });
        options.renderSelectionInspector(cid);
        return;
      }
      const overrides = options.getOverrides();
      const nextDimension = dimension as PreviewFrameSizeDimension;
      const px = resolvePreviewFrameSizePx({
        dimension: nextDimension,
        value: value as number,
        gridInfo: options.getGridInfo(),
        widthUnit: options.getWidthUnit() as 'px' | 'cols',
        heightUnit: options.getHeightUnit() as 'px' | 'rows',
        baselineStep: options.baselineStep,
      });
      if (px == null) {
        emitLayoutTransaction({
          mutationKind: 'geometry',
          sourceControl: `single-size:${nextDimension}`,
          capability: {
            applicable: true,
            reason: `${nextDimension} value produced no size change`,
          },
          result: { kind: 'none' },
          relayoutPolicy: 'engine',
        });
        options.renderSelectionInspector(cid);
        return;
      }
      const result = dispatchPreviewSingleFrameSizeHost({
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
        }).kind === 'change'
          ? { kind: 'changed' as const }
          : { kind: 'none' as const },
        overrides,
        coercedKeys: options.coercedKeys,
        setDirty: options.setDirty,
        commitOverridePatchAction: options.commitOverridePatchAction,
        requestRelayout: options.requestRelayoutNow,
        renderSelectionInspector: options.renderSelectionInspector,
      });
      emitLayoutTransaction({
        mutationKind: 'geometry',
        sourceControl: `single-size:${nextDimension}`,
        capability: {
          applicable: true,
          reason: changedMutation(result)
            ? `${nextDimension} change is applicable to the selected frame`
            : `${nextDimension} value produced no size change`,
        },
        result,
        relayoutPolicy: 'engine',
      });
    },
  };
}
