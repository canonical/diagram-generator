import type {
  PreviewRenderedBounds,
  PreviewResizeHandlePlan,
} from './app-interaction-host.js';
import type { PreviewResizeSelection } from './interaction-resize-dispatch.js';

export interface PreviewSelectionChromeDocument {
  querySelector: (selector: string) => SVGSVGElement | null;
}

export interface PreviewSelectionChromeBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface PreviewSelectionChromeHandleRenderOptions {
  handleClass: string;
  nodeAttr: string;
  dirAttr: string;
}

export interface RenderPreviewSelectionChromeHandlesOptions {
  svg: SVGSVGElement;
  left: number;
  top: number;
  right: number;
  bottom: number;
  nodeId: string;
  options: PreviewSelectionChromeHandleRenderOptions;
}

export interface ShowPreviewResizeHandlesHostOptions {
  document: PreviewSelectionChromeDocument;
  componentId: string;
  selectedCount: number;
  multiSelection?: PreviewResizeSelection | null;
  singleBounds?: PreviewRenderedBounds | null;
  componentType?: string | null;
  clearHandlesByClass: (className: string) => void;
  resolveHandlePlan: (options: {
    selectedCount: number;
    multiSelection?: PreviewResizeSelection | null;
    singleBounds?: PreviewRenderedBounds | null;
    componentType?: string | null;
  }) => PreviewResizeHandlePlan;
  renderResizeHandles: (options: RenderPreviewSelectionChromeHandlesOptions) => void;
  showArrowWaypointHandles: (componentId: string) => void;
  handleSize: number;
}

export interface RemovePreviewHandlesHostOptions {
  clearHandlesByClass: (className: string) => void;
}

export interface PreviewSelectionChromeArrowNode {
  waypoints?: [number, number][] | null;
}

export interface ReadPreviewArrowPointsHostOptions {
  document: PreviewSelectionChromeDocument;
  componentId: string;
  hasArrowNode: boolean;
  readArrowEndpoints: (options: {
    svg: SVGSVGElement;
    componentId: string;
  }) => {
    start: [number, number];
    end: [number, number];
  } | null;
}

export interface UpdatePreviewArrowVisualHostOptions {
  document: PreviewSelectionChromeDocument;
  componentId: string;
  node?: PreviewSelectionChromeArrowNode | null;
  delta: {
    dx?: number;
    dy?: number;
  } | null;
  headLen: number;
  headHalf: number;
  updateArrowSvg: (options: {
    svg: SVGSVGElement;
    componentId: string;
    waypoints: [number, number][];
    delta: {
      dx?: number;
      dy?: number;
    } | null;
    headLen: number;
    headHalf: number;
  }) => void;
}

export interface RebuildPreviewArrowSvgHostOptions {
  document: PreviewSelectionChromeDocument;
  componentId: string;
  node?: PreviewSelectionChromeArrowNode | null;
  headLen: number;
  headHalf: number;
  color: string;
  rebuildArrowSvg: (options: {
    svg: SVGSVGElement;
    componentId: string;
    waypoints: [number, number][];
    headLen: number;
    headHalf: number;
    color: string;
  }) => void;
}

function renderPreviewSelectionSeparatorHandles(
  svg: SVGSVGElement,
  componentId: string,
  bounds: PreviewSelectionChromeBounds,
  handleSize: number,
): void {
  const svgNs = 'http://www.w3.org/2000/svg';
  const ownerDocument = svg.ownerDocument;
  const midY = (bounds.top + bounds.bottom) / 2;

  const outline = ownerDocument.createElementNS(svgNs, 'line');
  outline.setAttribute('x1', String(bounds.left));
  outline.setAttribute('y1', String(midY));
  outline.setAttribute('x2', String(bounds.right));
  outline.setAttribute('y2', String(midY));
  outline.setAttribute('class', 'dg-handle-outline');
  outline.setAttribute('pointer-events', 'none');
  svg.appendChild(outline);

  const makeEdgeHandle = (cx: number, axis: 'l' | 'r') => {
    const handle = ownerDocument.createElementNS(svgNs, 'rect');
    handle.setAttribute('x', String(cx - (handleSize / 2)));
    handle.setAttribute('y', String(midY - (handleSize / 2)));
    handle.setAttribute('width', String(handleSize));
    handle.setAttribute('height', String(handleSize));
    handle.setAttribute('class', `dg-handle dg-handle-${axis}`);
    handle.setAttribute('data-resize-cid', componentId);
    handle.setAttribute('data-resize-axis', axis);
    svg.appendChild(handle);
  };

  makeEdgeHandle(bounds.left, 'l');
  makeEdgeHandle(bounds.right, 'r');
}

export function showPreviewResizeHandlesHost(
  options: ShowPreviewResizeHandlesHostOptions,
): boolean {
  const svg = options.document.querySelector('#stage svg');
  if (!svg) {
    return false;
  }

  options.clearHandlesByClass('dg-handle');

  const handlePlan = options.resolveHandlePlan({
    selectedCount: options.selectedCount,
    multiSelection: options.multiSelection ?? null,
    singleBounds: options.singleBounds ?? null,
    componentType: options.componentType ?? null,
  });

  if (handlePlan.kind === 'none') {
    return false;
  }

  if (handlePlan.kind === 'multi') {
    options.renderResizeHandles({
      svg,
      left: handlePlan.bounds.left,
      top: handlePlan.bounds.top,
      right: handlePlan.bounds.right,
      bottom: handlePlan.bounds.bottom,
      nodeId: 'multi',
      options: {
        handleClass: 'dg-handle',
        nodeAttr: 'data-resize-selection',
        dirAttr: 'data-resize-axis',
      },
    });
    return true;
  }

  if (handlePlan.kind === 'separator') {
    renderPreviewSelectionSeparatorHandles(
      svg,
      options.componentId,
      handlePlan.bounds,
      options.handleSize,
    );
    return true;
  }

  if (handlePlan.kind === 'arrow') {
    options.showArrowWaypointHandles(options.componentId);
    return true;
  }

  options.renderResizeHandles({
    svg,
    left: handlePlan.bounds.left,
    top: handlePlan.bounds.top,
    right: handlePlan.bounds.right,
    bottom: handlePlan.bounds.bottom,
    nodeId: options.componentId,
    options: {
      handleClass: 'dg-handle',
      nodeAttr: 'data-resize-cid',
      dirAttr: 'data-resize-axis',
    },
  });
  return true;
}

export function removePreviewHandlesHost(
  options: RemovePreviewHandlesHostOptions,
): void {
  options.clearHandlesByClass('dg-handle');
  options.clearHandlesByClass('dg-wp-handle');
}

export function readPreviewArrowPointsHost(
  options: ReadPreviewArrowPointsHostOptions,
): [number, number][] {
  const svg = options.document.querySelector('#stage svg');
  if (!svg || !options.hasArrowNode) {
    return [];
  }
  const endpoints = options.readArrowEndpoints({
    svg,
    componentId: options.componentId,
  });
  if (!endpoints) {
    return [];
  }
  return [endpoints.start, endpoints.end];
}

export function updatePreviewArrowVisualHost(
  options: UpdatePreviewArrowVisualHostOptions,
): boolean {
  const svg = options.document.querySelector('#stage svg');
  const node = options.node ?? null;
  if (!svg || !node) {
    return false;
  }
  options.updateArrowSvg({
    svg,
    componentId: options.componentId,
    waypoints: node.waypoints ?? [],
    delta: options.delta,
    headLen: options.headLen,
    headHalf: options.headHalf,
  });
  return true;
}

export function rebuildPreviewArrowSvgHost(
  options: RebuildPreviewArrowSvgHostOptions,
): boolean {
  const svg = options.document.querySelector('#stage svg');
  const node = options.node ?? null;
  if (!svg || !node) {
    return false;
  }
  options.rebuildArrowSvg({
    svg,
    componentId: options.componentId,
    waypoints: node.waypoints ?? [],
    headLen: options.headLen,
    headHalf: options.headHalf,
    color: options.color,
  });
  return true;
}
