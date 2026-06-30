import type { TextMeasureAdapter } from '../text-measure.js';
import {
  normalizePreviewInspectorWidthUnit,
  renderPreviewEmptyInspectorHost,
  renderPreviewMultiSelectionInspectorRuntimeHost,
  renderPreviewSelectionInspectorHost,
  renderPreviewSingleSelectionInspectorRuntimeHost,
  type PreviewInspectorArrowNode,
  type PreviewInspectorGridInfo,
  type PreviewInspectorHostElement,
  type PreviewMultiSelectionInspectorRuntimeNode,
} from './app-inspector-host.js';
import type {
  PreviewAutolayoutInspectorNode,
} from './inspector-autolayout-options.js';
import type {
  MultiSelectionInspectorRuntimeItem,
} from './inspector-multi-options.js';
import type {
  SingleSelectionInspectorViolation,
} from './inspector-single-panel.js';
import type { SelectionActionInfo } from './inspector-selection.js';
import type {
  PreviewSingleSelectionInspectorNode,
} from './inspector-single-options.js';
import type {
  InspectorDeltaState,
  InspectorEffectiveDeltaState,
} from './inspector-single.js';
import type {
  PreviewUiSelectionContext,
} from './preview-ui-context.js';
import {
  resolveMultiSelectionPreviewStyleState,
  type MultiSelectionPreviewStyleItem,
  type MultiSelectionPreviewStyleState,
  type PreviewRenderedStyleFields,
} from './frame-style.js';
import type { PreviewSelectionActionInfo } from './selection-action-items.js';

export type PreviewInspectorDisplayRuntimeNode = Record<string, unknown>;

export interface CreatePreviewInspectorDisplayRuntimeOptions {
  getInspector: () => PreviewInspectorHostElement | null | undefined;
  selectedIds: Set<string>;
  getPrimarySelectedId: (preferredId?: string | null) => string | null | undefined;
  getSelectionActionInfo: () => PreviewSelectionActionInfo;
  getNode: (cid: string) => PreviewInspectorDisplayRuntimeNode | null | undefined;
  getArrowNode: (cid: string) => PreviewInspectorArrowNode | null | undefined;
  getOverride: (cid: string) => Record<string, unknown> | null | undefined;
  getOwnDelta: (cid: string) => InspectorDeltaState;
  getEffectiveDelta: (cid: string) => InspectorEffectiveDeltaState;
  getComponentType: (cid: string) => string | null | undefined;
  getParentNode: (cid: string) => PreviewInspectorDisplayRuntimeNode | null | undefined;
  getParentLayout: (cid: string) => string | null;
  getRenderedStyle: (cid: string) => PreviewRenderedStyleFields | null;
  getViolations: (cid: string) => SingleSelectionInspectorViolation[] | null | undefined;
  isWidthCoerced: (cid: string) => boolean;
  isHeightCoerced: (cid: string) => boolean;
  getGridInfo: () => PreviewInspectorGridInfo | null | undefined;
  shouldShowAutolayoutInspector?: (() => boolean) | null;
  baselineStep?: number;
  fallbackGap: number;
  snapStep?: number;
  setMultiActionGap: (gap: number) => void;
  getTextAdapter?: (() => TextMeasureAdapter | null | undefined) | null;
  formatControlErrorMessage?: ((message: string) => string) | null;
  renderSingleStyleOptions?: ((currentStyle: string, originalStyleName: string) => string) | null;
  renderMultiStyleOptions: (styleState: MultiSelectionPreviewStyleState) => string;
  syncPanelVisibility?: ((selection: PreviewUiSelectionContext) => void) | null;
}

export interface PreviewInspectorDisplayRuntime {
  getWidthUnit: () => 'px' | 'cols';
  getHeightUnit: () => 'px' | 'rows';
  setWidthUnit: (unit: 'px' | 'cols' | string | null | undefined, cid?: string | null) => void;
  setHeightUnit: (unit: 'px' | 'rows' | string | null | undefined, cid?: string | null) => void;
  renderEmptyInspector: () => void;
  renderSelectionInspector: (preferredId?: string | null) => void;
  renderMultiSelectionInspector: () => void;
  updateInspector: (cid: string) => void;
}

function normalizePreviewInspectorHeightUnit(
  unit: 'px' | 'rows' | string | null | undefined,
): 'px' | 'rows' {
  return unit === 'rows' ? 'rows' : 'px';
}

function hasOwnProp(value: unknown, key: string): boolean {
  return Boolean(value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key));
}

function resolveSingleInspectorSelectionContext(options: {
  cid: string;
  node?: PreviewInspectorDisplayRuntimeNode | null;
  arrowNode?: PreviewInspectorArrowNode | null;
  componentType?: string | null;
}): PreviewUiSelectionContext {
  const isArrow = String(options.componentType || '').toLowerCase() === 'arrow'
    || Boolean(options.arrowNode);
  if (isArrow) {
    return { count: 1, kind: 'arrow' };
  }
  const nodeId = String(
    (options.node as { id?: unknown } | null | undefined)?.id
      ?? (options.node as { data?: { id?: unknown } } | null | undefined)?.data?.id
      ?? options.cid,
  );
  const parent = (options.node as { parent?: unknown } | null | undefined)?.parent;
  const isTopLevel = Boolean(
    options.node
      && (
        (hasOwnProp(options.node, 'parent') && !parent)
        || nodeId === 'root'
        || nodeId === 'page'
      ),
  );
  if (isTopLevel) {
    return { count: 1, kind: 'root' };
  }
  const children = (options.node as { children?: unknown[] | null } | null | undefined)?.children;
  const layout = (options.node as { layout?: unknown } | null | undefined)?.layout;
  if (layout || (Array.isArray(children) && children.length > 0)) {
    return { count: 1, kind: 'container' };
  }
  return { count: 1, kind: 'frame' };
}

export function createPreviewInspectorDisplayRuntime(
  options: CreatePreviewInspectorDisplayRuntimeOptions,
): PreviewInspectorDisplayRuntime {
  let widthUnit: 'px' | 'cols' = 'px';
  let heightUnit: 'px' | 'rows' = 'px';

  const resolveMultiStyleState = (
    items: PreviewSelectionActionInfo['items'],
  ): MultiSelectionPreviewStyleState | null => resolveMultiSelectionPreviewStyleState(
    items.map((item) => {
      const renderedStyle = options.getRenderedStyle(item.id);
      const override = options.getOverride(item.id) ?? null;
      return {
        componentType: options.getComponentType(item.id) ?? null,
        node: item.node as unknown as MultiSelectionPreviewStyleItem['node'],
        overrideStyle: override?.style,
        renderedFill: renderedStyle?.fill ?? null,
        renderedStroke: renderedStyle?.stroke ?? null,
      };
    }),
  );

  const renderEmptyInspector = (): void => {
    options.syncPanelVisibility?.({ count: 0, kind: 'empty' });
    renderPreviewEmptyInspectorHost(options.getInspector() ?? null);
  };

  const updateInspector = (cid: string): void => {
    const node = options.getNode(cid) ?? null;
    const arrowNode = options.getArrowNode(cid) ?? null;
    const componentType = options.getComponentType(cid) ?? null;
    options.syncPanelVisibility?.(resolveSingleInspectorSelectionContext({
      cid,
      node,
      arrowNode,
      componentType,
    }));
    const showLayoutEditingControls = options.shouldShowAutolayoutInspector?.() ?? true;
    renderPreviewSingleSelectionInspectorRuntimeHost({
      inspector: options.getInspector() ?? null,
      cid,
      getNode: ((nextCid: string) => (
        nextCid === cid
          ? node
          : options.getNode(nextCid)
      )) as (cid: string) => (
        PreviewSingleSelectionInspectorNode & PreviewAutolayoutInspectorNode
      ) | null | undefined,
      getArrowNode: ((nextCid: string) => (
        nextCid === cid
          ? arrowNode
          : options.getArrowNode(nextCid)
      )),
      getOverride: options.getOverride,
      getOwnDelta: options.getOwnDelta,
      getEffectiveDelta: options.getEffectiveDelta,
      getComponentType: ((nextCid: string) => (
        nextCid === cid
          ? componentType
          : options.getComponentType(nextCid)
      )),
      getParentNode: options.getParentNode as (cid: string) => (
        PreviewSingleSelectionInspectorNode & PreviewAutolayoutInspectorNode
      ) | null | undefined,
      getParentLayout: options.getParentLayout,
      getRenderedStyle: options.getRenderedStyle,
      getViolations: options.getViolations,
      widthCoerced: options.isWidthCoerced(cid),
      heightCoerced: options.isHeightCoerced(cid),
      widthUnit,
      heightUnit,
      gridInfo: options.getGridInfo() ?? null,
      showAutolayoutInspector: showLayoutEditingControls,
      showLayoutEditingControls,
      baselineStep: options.baselineStep,
      textAdapter: options.getTextAdapter?.() ?? null,
      formatControlErrorMessage: options.formatControlErrorMessage ?? null,
      renderStyleOptions: options.renderSingleStyleOptions ?? null,
    });
  };

  const renderMultiSelectionInspector = (): void => {
    const info = options.getSelectionActionInfo();
    const showLayoutEditingControls = options.shouldShowAutolayoutInspector?.() ?? true;
    options.syncPanelVisibility?.({
      count: options.selectedIds.size,
      kind: 'multi',
      allBounded: info.items.length === options.selectedIds.size,
      sameParent: info.sameParent,
      hasUnsupported: info.hasUnsupported,
    });
    const items = info.items.map((item) => ({
      id: item.id,
      node: item.node,
      override: options.getOverride(item.id) ?? {},
      widthCoerced: options.isWidthCoerced(item.id),
      heightCoerced: options.isHeightCoerced(item.id),
    }));
    const nextGridInfo = options.getGridInfo() ?? null;
    const result = renderPreviewMultiSelectionInspectorRuntimeHost({
      inspector: options.getInspector() ?? null,
      selectedCount: options.selectedIds.size,
      info,
      getNode: options.getNode as (cid: string) => PreviewMultiSelectionInspectorRuntimeNode | null | undefined,
      fallbackGap: options.fallbackGap,
      snapStep: options.snapStep,
      items: items.map((item) => ({
        ...item,
        node: item.node as unknown as MultiSelectionInspectorRuntimeItem['node'],
      })),
      widthUnit,
      heightUnit,
      showWidthColsOption: Boolean(nextGridInfo?.col_widths?.length),
      showLayoutEditingControls,
      resolveMultiStyleState: (items) => resolveMultiStyleState(
        items as unknown as PreviewSelectionActionInfo['items'],
      ),
      renderStyleOptions: options.renderMultiStyleOptions,
    });
    if (showLayoutEditingControls && result.inferredGap != null) {
      options.setMultiActionGap(result.inferredGap);
    }
  };

  const renderSelectionInspector = (preferredId?: string | null): void => {
    renderPreviewSelectionInspectorHost({
      preferredId,
      resolvePrimaryId: options.getPrimarySelectedId,
      selectedCount: options.selectedIds.size,
      renderEmptyInspector,
      renderSingleSelectionInspector: updateInspector,
      renderMultiSelectionInspector,
    });
  };

  return {
    getWidthUnit() {
      return widthUnit;
    },
    getHeightUnit() {
      return heightUnit;
    },
    setWidthUnit(unit, cid) {
      widthUnit = normalizePreviewInspectorWidthUnit(
        unit,
        options.getGridInfo() ?? null,
      );
      if (cid) {
        renderSelectionInspector(cid);
      }
    },
    setHeightUnit(unit, cid) {
      heightUnit = normalizePreviewInspectorHeightUnit(unit);
      if (cid) {
        renderSelectionInspector(cid);
      }
    },
    renderEmptyInspector,
    renderSelectionInspector,
    renderMultiSelectionInspector,
    updateInspector,
  };
}
