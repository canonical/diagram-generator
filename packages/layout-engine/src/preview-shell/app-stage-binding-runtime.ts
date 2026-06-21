import {
  bindPreviewStageSvgInteractionHost,
  type BindPreviewStageSvgInteractionHostOptions,
} from './app-stage-svg.js';
import {
  renderPreviewTreeSelectionHost,
  type RenderPreviewTreeSelectionHostOptions,
} from './app-selection-host.js';
import type { PreviewShellTreeNode } from './app-shell-panels.js';

export interface CreatePreviewStageBindingRuntimeOptions {
  document: Document;
  getTreeNodes: () => PreviewShellTreeNode[];
  getOverrides: () => Record<string, unknown>;
  getSelectedIds: () => Iterable<string>;
  selectComponent: RenderPreviewTreeSelectionHostOptions['selectComponent'];
  onDeleteSelection: () => void;
  getSuppressHover: () => boolean;
  getSelectionDepth: () => number;
  onMouseDown: BindPreviewStageSvgInteractionHostOptions['onMouseDown'];
  onDoubleClick: BindPreviewStageSvgInteractionHostOptions['onDoubleClick'];
  findArrowAtPoint: BindPreviewStageSvgInteractionHostOptions['findArrowAtPoint'];
  findComponentAtDepth: BindPreviewStageSvgInteractionHostOptions['findComponentAtDepth'];
  syncHoverState: BindPreviewStageSvgInteractionHostOptions['syncHoverState'];
  clearHoverState: BindPreviewStageSvgInteractionHostOptions['clearHoverState'];
}

export interface CreatePreviewStageBindingRuntimeFromHostOptions {
  document: Document;
  model: {
    _roots: Array<{ data: PreviewShellTreeNode }>;
  };
  getOverrides: () => Record<string, unknown>;
  selectedIds: Set<string>;
  selectComponent: RenderPreviewTreeSelectionHostOptions['selectComponent'];
  deleteSelectedFrames: () => unknown;
  interactionManager: {
    suppressHover?: boolean;
  };
  selectionDepthState: {
    get: () => number;
  };
  onMouseDown: BindPreviewStageSvgInteractionHostOptions['onMouseDown'];
  onDoubleClick: BindPreviewStageSvgInteractionHostOptions['onDoubleClick'];
  findArrowAtPoint: BindPreviewStageSvgInteractionHostOptions['findArrowAtPoint'];
  findComponentAtDepth: BindPreviewStageSvgInteractionHostOptions['findComponentAtDepth'];
  syncHoverState: BindPreviewStageSvgInteractionHostOptions['syncHoverState'];
  clearHoverState: BindPreviewStageSvgInteractionHostOptions['clearHoverState'];
}

export interface PreviewStageBindingRuntime {
  buildTreeUi: () => boolean;
  bindInteraction: () => SVGSVGElement | null;
}

export function createPreviewStageBindingRuntime(
  options: CreatePreviewStageBindingRuntimeOptions,
): PreviewStageBindingRuntime {
  let previousSvg: SVGSVGElement | null = null;

  const runtime: PreviewStageBindingRuntime = {
    buildTreeUi() {
      return renderPreviewTreeSelectionHost({
        document: options.document,
        container: options.document.getElementById('tree'),
        nodes: options.getTreeNodes(),
        overrides: options.getOverrides(),
        selectedIds: options.getSelectedIds(),
        selectComponent: options.selectComponent,
        onDeleteSelection: options.onDeleteSelection,
      });
    },
    bindInteraction() {
      previousSvg = bindPreviewStageSvgInteractionHost({
        document: options.document,
        previousSvg,
        suppressHover: options.getSuppressHover(),
        selectionDepth: options.getSelectionDepth(),
        onMouseDown: options.onMouseDown,
        onDoubleClick: options.onDoubleClick,
        findArrowAtPoint: options.findArrowAtPoint,
        findComponentAtDepth: options.findComponentAtDepth,
        syncHoverState: options.syncHoverState,
        clearHoverState: options.clearHoverState,
        rebuildTreeUi: () => runtime.buildTreeUi(),
      });
      return previousSvg;
    },
  };

  return runtime;
}

export function createPreviewStageBindingRuntimeFromHost(
  options: CreatePreviewStageBindingRuntimeFromHostOptions,
): PreviewStageBindingRuntime {
  return createPreviewStageBindingRuntime({
    document: options.document,
    getTreeNodes: () => options.model._roots.map((node) => node.data),
    getOverrides: options.getOverrides,
    getSelectedIds: () => options.selectedIds,
    selectComponent: options.selectComponent,
    onDeleteSelection: () => {
      void options.deleteSelectedFrames();
    },
    getSuppressHover: () => Boolean(options.interactionManager.suppressHover),
    getSelectionDepth: options.selectionDepthState.get,
    onMouseDown: options.onMouseDown,
    onDoubleClick: options.onDoubleClick,
    findArrowAtPoint: options.findArrowAtPoint,
    findComponentAtDepth: options.findComponentAtDepth,
    syncHoverState: options.syncHoverState,
    clearHoverState: options.clearHoverState,
  });
}
