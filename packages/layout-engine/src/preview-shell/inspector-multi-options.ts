import {
  createMultiSelectionInspectorViewModel,
  type InspectorSelectionParentLayout,
  type MultiSelectionInspectorViewModel,
  type SelectionActionInfo,
} from './inspector-selection.js';
import {
  createMultiSelectionAlignState,
  createMultiSelectionContainerState,
  createMultiSelectionSizingState,
  type MultiSelectionAlignState,
  type MultiSelectionContainerState,
  type MultiSelectionSizingState,
} from './inspector-multi.js';
import {
  resolvePreviewRuntimeSizingValue,
  type PreviewAutolayoutInspectorNode,
} from './inspector-autolayout-options.js';

/**
 * Multi-selection inspector option helpers (spec 043 slice O).
 *
 * These keep the remaining selection-to-panel state shaping in TypeScript
 * while the shell still owns DOM lookups and style-picker HTML.
 */

export interface MultiSelectionInspectorRuntimeItem {
  id: string;
  node?: PreviewAutolayoutInspectorNode | null;
  override?: Record<string, unknown> | null;
  widthCoerced?: boolean;
  heightCoerced?: boolean;
}

export interface MultiSelectionInspectorResolvedState {
  viewModel: MultiSelectionInspectorViewModel;
  alignState: MultiSelectionAlignState | null;
  containerState: MultiSelectionContainerState | null;
  sizingState: MultiSelectionSizingState | null;
}

export function resolveMultiSelectionInspectorState(options: {
  selectedCount: number;
  info: SelectionActionInfo;
  parentLayout?: InspectorSelectionParentLayout | null;
  fallbackGap: number;
  snapStep?: number;
  items: MultiSelectionInspectorRuntimeItem[];
}): MultiSelectionInspectorResolvedState {
  const viewModel = createMultiSelectionInspectorViewModel({
    selectedCount: options.selectedCount,
    info: options.info,
    fallbackGap: options.fallbackGap,
    parentLayout: options.parentLayout,
    snapStep: options.snapStep,
  });

  const alignState = options.info.hasUnsupported ? null : createMultiSelectionAlignState(options.items.map((item) => {
    const node = item.node;
    if (!node) return { hasFrameAlignment: false };
    const overrideAlign = item.override?.align;
    const nodeAlign = typeof node.align === 'string' ? node.align : null;
    return {
      hasFrameAlignment: true,
      align: typeof overrideAlign === 'string'
        ? overrideAlign
        : (nodeAlign || 'TOP_LEFT'),
    };
  }));

  const containerState = options.info.hasUnsupported ? null : createMultiSelectionContainerState(options.items.map((item) => {
    const node = item.node;
    if (!node) return { isContainer: false };
    const override = item.override || {};
    return {
      isContainer: Boolean(node.layout || (node.children && node.children.length > 0)),
      direction: override.direction as string | null | undefined
        || (node.layout === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL'),
      wrap: override.wrap != null ? Boolean(override.wrap) : Boolean(node.wrap),
    };
  }));

  const sizingState = options.info.hasUnsupported ? null : createMultiSelectionSizingState(options.items.map((item) => {
    const node = item.node;
    if (!node) return {};
    return {
      sizingW: resolvePreviewRuntimeSizingValue({
        cid: item.id,
        axis: 'w',
        override: item.override,
        node,
        isCoerced: item.widthCoerced,
      }) || 'HUG',
      sizingH: resolvePreviewRuntimeSizingValue({
        cid: item.id,
        axis: 'h',
        override: item.override,
        node,
        isCoerced: item.heightCoerced,
      }) || 'HUG',
      wCoerced: Boolean(item.widthCoerced),
      hCoerced: Boolean(item.heightCoerced),
    };
  }));

  return {
    viewModel,
    alignState,
    containerState,
    sizingState,
  };
}
