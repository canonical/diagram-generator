import {
  removePreviewHandlesHost,
  showPreviewResizeHandlesHost,
  type ShowPreviewResizeHandlesHostOptions,
} from './app-selection-chrome.js';
import type { PreviewRenderedBounds } from './app-interaction-host.js';
import type { PreviewResizeSelection } from './interaction-resize-dispatch.js';

export interface CreatePreviewSelectionChromeRuntimeOptions {
  document: Document;
  getSelectedIds: () => Set<string>;
  getMultiResizeSelection: (
    svg: SVGSVGElement,
    idsOverride?: Iterable<string> | null,
  ) => PreviewResizeSelection | null;
  getRenderedComponentBounds: (
    cid: string,
    svg: SVGSVGElement,
  ) => PreviewRenderedBounds | null;
  getComponentType: (cid: string) => string | null | undefined;
  clearHandlesByClass: (className: string) => void;
  resolveHandlePlan: ShowPreviewResizeHandlesHostOptions['resolveHandlePlan'];
  renderResizeHandles: (options: {
    svg: SVGSVGElement;
    left: number;
    top: number;
    right: number;
    bottom: number;
    nodeId: string;
    options: {
      nodeAttr: string;
      dirAttr: string;
    };
  }) => void;
  showArrowWaypointHandles: (cid: string) => void;
  handleSize: number;
  getArrowPoints: (cid: string) => [number, number][];
  updateArrowVisual: (cid: string) => void;
  rebuildArrowSvg: (cid: string) => void;
}

export interface CreatePreviewSelectionChromeRuntimeFromHostOptions {
  document: Document;
  selectedIds: Set<string>;
  getMultiResizeSelection: CreatePreviewSelectionChromeRuntimeOptions['getMultiResizeSelection'];
  getRenderedComponentBounds: CreatePreviewSelectionChromeRuntimeOptions['getRenderedComponentBounds'];
  getComponentType: CreatePreviewSelectionChromeRuntimeOptions['getComponentType'];
  clearHandlesByClass: (className: string) => void;
  resolveHandlePlan: ShowPreviewResizeHandlesHostOptions['resolveHandlePlan'];
  renderResizeHandles: CreatePreviewSelectionChromeRuntimeOptions['renderResizeHandles'];
  showArrowWaypointHandles: (cid: string) => void;
  handleSize: number;
  getArrowWaypointRuntime: () => {
    getArrowPoints: (cid: string) => [number, number][];
    updateArrowVisual: (cid: string) => void;
    rebuildArrowSvg: (cid: string) => void;
  };
}

export interface PreviewSelectionChromeRuntime {
  showResizeHandles: (cid: string) => boolean;
  removeResizeHandles: () => void;
  getArrowPoints: (cid: string) => [number, number][];
  updateArrowVisual: (cid: string) => void;
  rebuildArrowSvg: (cid: string) => void;
}

export function createPreviewSelectionChromeRuntime(
  options: CreatePreviewSelectionChromeRuntimeOptions,
): PreviewSelectionChromeRuntime {
  return {
    showResizeHandles(cid) {
      const svg = options.document.querySelector('#stage svg') as SVGSVGElement | null;
      const selectedCount = options.getSelectedIds().size;
      const multiSelection = svg ? options.getMultiResizeSelection(svg) : null;
      return showPreviewResizeHandlesHost({
        document: options.document,
        componentId: cid,
        selectedCount,
        multiSelection,
        singleBounds: svg && selectedCount <= 1
          ? options.getRenderedComponentBounds(cid, svg)
          : null,
        componentType: selectedCount > 1 ? null : options.getComponentType(cid),
        clearHandlesByClass: options.clearHandlesByClass,
        resolveHandlePlan: options.resolveHandlePlan,
        renderResizeHandles: ({ svg, left, top, right, bottom, nodeId, options: renderOptions }) => {
          options.renderResizeHandles({
            svg,
            left,
            top,
            right,
            bottom,
            nodeId,
            options: {
              nodeAttr: renderOptions.nodeAttr,
              dirAttr: renderOptions.dirAttr,
            },
          });
        },
        showArrowWaypointHandles: options.showArrowWaypointHandles,
        handleSize: options.handleSize,
      });
    },
    removeResizeHandles() {
      removePreviewHandlesHost({
        clearHandlesByClass: options.clearHandlesByClass,
      });
    },
    getArrowPoints: options.getArrowPoints,
    updateArrowVisual: options.updateArrowVisual,
    rebuildArrowSvg: options.rebuildArrowSvg,
  };
}

export function createPreviewSelectionChromeRuntimeFromHost(
  options: CreatePreviewSelectionChromeRuntimeFromHostOptions,
): PreviewSelectionChromeRuntime {
  return createPreviewSelectionChromeRuntime({
    document: options.document,
    getSelectedIds: () => options.selectedIds,
    getMultiResizeSelection: options.getMultiResizeSelection,
    getRenderedComponentBounds: options.getRenderedComponentBounds,
    getComponentType: options.getComponentType,
    clearHandlesByClass: options.clearHandlesByClass,
    resolveHandlePlan: options.resolveHandlePlan,
    renderResizeHandles: options.renderResizeHandles,
    showArrowWaypointHandles: options.showArrowWaypointHandles,
    handleSize: options.handleSize,
    getArrowPoints: (cid) => options.getArrowWaypointRuntime().getArrowPoints(cid),
    updateArrowVisual: (cid) => options.getArrowWaypointRuntime().updateArrowVisual(cid),
    rebuildArrowSvg: (cid) => options.getArrowWaypointRuntime().rebuildArrowSvg(cid),
  });
}
