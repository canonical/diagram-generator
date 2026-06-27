import {
  createSingleSelectionInspectorViewModel,
  type InspectorDeltaState,
  type InspectorEffectiveDeltaState,
} from './inspector-single.js';
import type {
  SingleSelectionInspectorPanelRenderOptions,
  SingleSelectionInspectorViolation,
} from './inspector-single-panel.js';
import {
  DEFAULT_PREVIEW_BOX_STYLES,
  formatPreviewVariantName,
  resolveSingleSelectionPreviewStyleState,
  isPreviewStructuralWrapper,
  type PreviewRenderedStyleFields,
  type PreviewStyleNode,
} from './frame-style.js';
import {
  hasPreviewNodeTextContent,
} from './inspector-autolayout-options.js';

/**
 * Single-selection inspector option helpers (spec 043 slice Q).
 *
 * The legacy shell still owns DOM lookup and final insertion, but the
 * single-selection panel state assembly now lives in TypeScript.
 */

export interface PreviewSingleSelectionInspectorNode extends PreviewStyleNode {
  id?: string | null;
  align?: string | null;
  layout?: string | null;
  parent?: unknown;
  data?: {
    id?: string | null;
    [key: string]: unknown;
  } | null;
}

function previewNodeId(
  node: PreviewSingleSelectionInspectorNode | null | undefined,
): string {
  const nodeId = node?.id ?? node?.data?.id;
  return typeof nodeId === 'string' ? nodeId : '';
}

function resolveSingleSelectionAlignOwner(options: {
  cid: string;
  node?: PreviewSingleSelectionInspectorNode | null;
  parentNode?: PreviewSingleSelectionInspectorNode | null;
  override?: Record<string, unknown> | null;
  parentOverride?: Record<string, unknown> | null;
  isAutolayoutChild: boolean;
  isAutolayoutContainer: boolean;
}): { currentAlign: string; targetCid: string } {
  if (options.isAutolayoutChild && !options.isAutolayoutContainer) {
    const parentId = previewNodeId(options.parentNode);
    if (parentId) {
      const parentAlign = typeof options.parentOverride?.align === 'string'
        ? options.parentOverride.align
        : options.parentNode?.align;
      return {
        currentAlign: parentAlign || 'TOP_LEFT',
        targetCid: parentId,
      };
    }
  }

  const currentAlign = (
    typeof options.override?.align === 'string'
      ? options.override.align
      : options.node?.align
  ) || 'TOP_LEFT';
  return {
    currentAlign,
    targetCid: options.cid,
  };
}

function normalizeInspectorErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === 'string') return error.message;
  return String(error);
}

export function resolveSingleSelectionInspectorPanelRenderOptions(options: {
  cid: string;
  node?: PreviewSingleSelectionInspectorNode | null;
  parentNode?: PreviewSingleSelectionInspectorNode | null;
  override?: Record<string, unknown> | null;
  parentOverride?: Record<string, unknown> | null;
  ownDelta: InspectorDeltaState;
  effectiveDelta: InspectorEffectiveDeltaState;
  hasWaypointOverride?: boolean;
  waypointCount?: number;
  componentType?: string | null;
  parentLayout?: string | null;
  renderedStyle?: PreviewRenderedStyleFields | null;
  violations?: SingleSelectionInspectorViolation[] | null;
  renderAutolayoutPanel?: (() => string) | null;
  formatControlErrorMessage?: ((message: string) => string) | null;
  renderStyleOptions?: ((currentStyle: string, originalStyleName: string) => string) | null;
}): SingleSelectionInspectorPanelRenderOptions {
  const override = options.override ?? {};
  const isArrowComponent = String(options.componentType || '').toLowerCase() === 'arrow';
  const nodeId = String(options.node?.id ?? options.node?.data?.id ?? options.cid);
  const hasParentField = Boolean(
    options.node && Object.prototype.hasOwnProperty.call(options.node, 'parent'),
  );
  const isTopLevelFrame = Boolean(
    options.node
      && !isArrowComponent
      && (
        (hasParentField && !options.node.parent)
        || nodeId === 'root'
        || nodeId === 'page'
      ),
  );
  const viewModel = createSingleSelectionInspectorViewModel({
    align: (override.align as string | null | undefined) || options.node?.align || 'TOP_LEFT',
    ownDelta: options.ownDelta,
    effectiveDelta: options.effectiveDelta,
    hasWaypointOverride: options.hasWaypointOverride,
    waypointCount: options.waypointCount,
    componentType: options.componentType,
    parentLayout: options.parentLayout,
    isRoot: isTopLevelFrame,
    nodeLayout: options.node?.layout,
    childCount: options.node?.children?.length ?? 0,
    hasTextContent: hasPreviewNodeTextContent(options.node),
    isStructuralWrapper: isPreviewStructuralWrapper(options.node),
  });

  let autolayoutPanelHtml = '';
  let controlsErrorMessage: string | null = null;
  if (options.renderAutolayoutPanel) {
    try {
      autolayoutPanelHtml = options.renderAutolayoutPanel();
    } catch (error) {
      const message = normalizeInspectorErrorMessage(error);
      controlsErrorMessage = options.formatControlErrorMessage
        ? options.formatControlErrorMessage(message)
        : message;
    }
  }

  const styleState = resolveSingleSelectionPreviewStyleState({
    componentType: options.componentType,
    node: options.node,
    overrideStyle: override.style,
    renderedFill: options.renderedStyle?.fill ?? null,
    renderedStroke: options.renderedStyle?.stroke ?? null,
  });

  const styleOptionsHtml = styleState.mode === 'picker' && options.renderStyleOptions
    ? options.renderStyleOptions(styleState.currentStyle, styleState.originalStyleName)
    : '';
  const styleLabel = styleState.mode === 'picker'
    ? formatPreviewVariantName(DEFAULT_PREVIEW_BOX_STYLES, styleState.currentStyle)
    : '';
  const alignOwner = resolveSingleSelectionAlignOwner({
    cid: options.cid,
    node: options.node,
    parentNode: options.parentNode,
    override,
    parentOverride: options.parentOverride ?? {},
    isAutolayoutChild: viewModel.isAutolayoutChild,
    isAutolayoutContainer: viewModel.isAutolayoutContainer,
  });
  viewModel.currentAlign = alignOwner.currentAlign;

  return {
    cid: options.cid,
    alignTargetCid: alignOwner.targetCid,
    viewModel,
    ownDelta: options.ownDelta,
    effectiveDelta: options.effectiveDelta,
    autolayoutPanelHtml,
    controlsErrorMessage,
    styleMode: styleState.mode,
    styleOptionsHtml,
    styleLabel,
    violations: options.violations ?? [],
  };
}
