import type {
  PreviewAutolayoutDragContext,
  PreviewDragMoveState,
  PreviewDragSnapTargets,
} from './interaction-drag-dispatch.js';
import type {
  PreviewResizeMoveState,
  PreviewResizeSelection,
} from './interaction-resize-dispatch.js';
import type { InteractionDeltaPatch } from './interaction-resize.js';

/**
 * Preview interaction host helpers (spec 043 shell coordinator slice N).
 *
 * These helpers own the remaining drag/resize host planning so editor.js only
 * wires browser events, shell callbacks, and legacy globals.
 */

export interface PreviewInteractionNodeData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layout?: string | null;
  layout_gap?: number | null;
  padding_left?: number | null;
  padding_top?: number | null;
  pad?: number | null;
}

export interface PreviewInteractionParentRef {
  id: string;
  layout?: string | null;
}

export interface PreviewInteractionChildRef {
  id?: string | null;
  data?: PreviewInteractionNodeData | null;
}

export interface PreviewInteractionNode {
  id: string;
  type?: string | null;
  layout?: string | null;
  data: PreviewInteractionNodeData;
  parent?: PreviewInteractionParentRef | null;
  children: PreviewInteractionChildRef[];
}

export interface PreviewInteractionDeltaValue {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export interface PreviewRenderedBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ReadPreviewRenderedComponentBoundsOptions {
  svg: ParentNode;
  componentId: string;
  fallbackNodeBounds?: Pick<PreviewInteractionNodeData, 'x' | 'y' | 'width' | 'height'> | null;
  delta?: Partial<PreviewInteractionDeltaValue> | null;
}

export interface CollectPreviewMultiResizeSelectionOptions {
  ids?: Iterable<string> | null;
  getNode: (id: string) => PreviewInteractionNode | null | undefined;
  getAncestors: (id: string) => string[];
  getRenderedBounds: (id: string) => PreviewRenderedBounds | null;
  getOwnDelta: (id: string) => Partial<PreviewInteractionDeltaValue> | null | undefined;
  getEffectiveDelta: (id: string) => Partial<PreviewInteractionDeltaValue> | null | undefined;
  hasLayoutChildren: (id: string) => boolean;
  isAutolayoutChild: (id: string) => boolean;
  resolvePrimaryId: (preferredId?: string | null) => string | null | undefined;
  minNodeSize?: number;
}

export type PreviewResizeHandlePlan =
  | { kind: 'none' }
  | { kind: 'multi'; bounds: PreviewRenderedBounds }
  | { kind: 'separator'; bounds: PreviewRenderedBounds }
  | { kind: 'arrow' }
  | { kind: 'box'; bounds: PreviewRenderedBounds };

export interface ResolvePreviewResizeHandlePlanOptions {
  selectedCount: number;
  multiSelection?: PreviewResizeSelection | null;
  singleBounds?: PreviewRenderedBounds | null;
  componentType?: string | null;
}

export interface CreatePreviewResizeStartStateOptions {
  selectionToken?: string | null;
  componentId?: string | null;
  axis?: string | null;
  clientX: number;
  clientY: number;
  svg?: ParentNode | null;
  selectedIds: Iterable<string>;
  hasDiagramGrid?: boolean;
  getNode: (id: string) => PreviewInteractionNode | null | undefined;
  getSiblings: (id: string) => PreviewInteractionChildRef[];
  getAncestors: (id: string) => string[];
  getOwnDelta: (id: string) => Partial<PreviewInteractionDeltaValue> | null | undefined;
  getEffectiveDelta: (id: string) => Partial<PreviewInteractionDeltaValue> | null | undefined;
  hasLayoutChildren: (id: string) => boolean;
  isAutolayoutChild: (id: string) => boolean;
  resolvePrimaryId: (preferredId?: string | null) => string | null | undefined;
  minNodeSize?: number;
}

export type PreviewResizeStartPlan =
  | { kind: 'none' }
  | { kind: 'start'; state: PreviewResizeMoveState; touchedIds: string[] };

export interface CreatePreviewDragStartStateOptions {
  componentId?: string | null;
  selectedIds: Iterable<string>;
  clientX: number;
  clientY: number;
  getOwnDelta: (id: string) => Partial<PreviewInteractionDeltaValue> | null | undefined;
  collectSnapTargets?: ((id: string) => PreviewDragSnapTargets | null | undefined) | null;
  isAutolayoutChild: (id: string) => boolean;
}

export type PreviewDragStartPlan =
  | { kind: 'none' }
  | { kind: 'start'; captureIds: string[]; state: PreviewDragMoveState };

export interface PreviewAutolayoutParentNode {
  data: Pick<PreviewInteractionNodeData, 'id' | 'layout'>;
  children: Array<{
    data: Pick<PreviewInteractionNodeData, 'id' | 'x' | 'y' | 'width' | 'height'>;
  }>;
}

export interface ResolvePreviewAutolayoutDragContextOptions {
  componentId: string;
  svg?: SVGSVGElement | null;
  clientX: number;
  clientY: number;
  getParentNode: (id: string) => PreviewAutolayoutParentNode | null | undefined;
}

export interface RenderPreviewReorderIndicatorOptions {
  svg: SVGSVGElement;
  parent: PreviewInteractionNodeData;
  siblings: PreviewInteractionNodeData[];
  insertIndex: number;
  isVertical: boolean;
  attrName?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

function toDeltaValue(
  value?: Partial<PreviewInteractionDeltaValue> | null,
): PreviewInteractionDeltaValue {
  return {
    dx: Number(value?.dx ?? 0),
    dy: Number(value?.dy ?? 0),
    dw: Number(value?.dw ?? 0),
    dh: Number(value?.dh ?? 0),
  };
}

function getChildId(child: PreviewInteractionChildRef | null | undefined): string | null {
  return child?.id || child?.data?.id || null;
}

function hasSvgBBox(value: unknown): value is Element & {
  getBBox: () => { x: number; y: number; width: number; height: number };
} {
  return Boolean(value && typeof value === 'object' && 'getBBox' in value);
}

function readGroupTranslate(value: unknown): { x: number; y: number } {
  const transform = typeof value === 'object'
    && value
    && 'style' in value
    && value.style
    && typeof value.style === 'object'
    && 'transform' in value.style
    && typeof value.style.transform === 'string'
    ? value.style.transform
    : '';
  const match = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
  return {
    x: match ? parseFloat(match[1] || '0') : 0,
    y: match ? parseFloat(match[2] || '0') : 0,
  };
}

function fallbackBoundsFromNode(
  fallbackNodeBounds?: Pick<PreviewInteractionNodeData, 'x' | 'y' | 'width' | 'height'> | null,
  delta?: Partial<PreviewInteractionDeltaValue> | null,
): PreviewRenderedBounds | null {
  if (!fallbackNodeBounds) {
    return null;
  }
  const resolvedDelta = toDeltaValue(delta);
  const left = fallbackNodeBounds.x + resolvedDelta.dx;
  const top = fallbackNodeBounds.y + resolvedDelta.dy;
  const width = fallbackNodeBounds.width + resolvedDelta.dw;
  const height = fallbackNodeBounds.height + resolvedDelta.dh;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

export function readPreviewRenderedComponentBounds(
  options: ReadPreviewRenderedComponentBoundsOptions,
): PreviewRenderedBounds | null {
  const groups = Array.from(
    options.svg.querySelectorAll(`[data-component-id="${options.componentId}"]`),
  );
  if (groups.length === 0) {
    return fallbackBoundsFromNode(options.fallbackNodeBounds, options.delta);
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let validGroupCount = 0;

  for (const group of groups) {
    if (!hasSvgBBox(group)) {
      continue;
    }
    const bbox = group.getBBox();
    const translate = readGroupTranslate(group);
    minX = Math.min(minX, bbox.x + translate.x);
    minY = Math.min(minY, bbox.y + translate.y);
    maxX = Math.max(maxX, bbox.x + bbox.width + translate.x);
    maxY = Math.max(maxY, bbox.y + bbox.height + translate.y);
    validGroupCount += 1;
  }

  if (validGroupCount === 0 || !Number.isFinite(minX) || !Number.isFinite(minY)) {
    return fallbackBoundsFromNode(options.fallbackNodeBounds, options.delta);
  }

  return {
    left: minX,
    top: minY,
    right: maxX,
    bottom: maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function collectPreviewMultiResizeSelection(
  options: CollectPreviewMultiResizeSelectionOptions,
): PreviewResizeSelection | null {
  const ids = [...new Set(options.ids || [])];
  if (ids.length <= 1) {
    return null;
  }

  const selectedSet = new Set(ids);
  const members: PreviewResizeSelection['members'] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let minWidth = 0;
  let minHeight = 0;
  const memberSizes: Array<{ width: number; height: number }> = [];
  const sharedMinNodeSize = Math.max(1, options.minNodeSize ?? 8);

  for (const id of ids) {
    const node = options.getNode(id);
    if (!node) {
      return null;
    }
    if (String(node.type || '').toLowerCase() === 'arrow' || options.isAutolayoutChild(id)) {
      return null;
    }
    if (options.getAncestors(id).some((ancestorId) => selectedSet.has(ancestorId))) {
      return null;
    }

    const bounds = options.getRenderedBounds(id);
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
      return null;
    }

    const own = toDeltaValue(options.getOwnDelta(id));
    const effective = toDeltaValue(options.getEffectiveDelta(id));
    members.push({
      id,
      bounds,
      ancestorDx: effective.dx - own.dx,
      ancestorDy: effective.dy - own.dy,
      baseX: node.data.x,
      baseY: node.data.y,
      baseW: node.data.width,
      baseH: node.data.height,
      hasLayoutChildren: options.hasLayoutChildren(id),
    });
    memberSizes.push({ width: bounds.width, height: bounds.height });
    minX = Math.min(minX, bounds.left);
    minY = Math.min(minY, bounds.top);
    maxX = Math.max(maxX, bounds.right);
    maxY = Math.max(maxY, bounds.bottom);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  if (width <= 0 || height <= 0) {
    return null;
  }

  for (const size of memberSizes) {
    minWidth = Math.max(minWidth, width * (sharedMinNodeSize / size.width));
    minHeight = Math.max(minHeight, height * (sharedMinNodeSize / size.height));
  }

  const preferredId = ids[ids.length - 1] || null;
  return {
    ids,
    members,
    primaryId: options.resolvePrimaryId(preferredId) || preferredId || '',
    bounds: {
      left: minX,
      top: minY,
      right: maxX,
      bottom: maxY,
      width,
      height,
    },
    minWidth: Math.min(width, minWidth || sharedMinNodeSize),
    minHeight: Math.min(height, minHeight || sharedMinNodeSize),
  };
}

export function resolvePreviewResizeHandlePlan(
  options: ResolvePreviewResizeHandlePlanOptions,
): PreviewResizeHandlePlan {
  if (options.selectedCount > 1) {
    return options.multiSelection
      ? { kind: 'multi', bounds: options.multiSelection.bounds }
      : { kind: 'none' };
  }

  if (!options.singleBounds) {
    return { kind: 'none' };
  }

  if (options.componentType === 'Separator') {
    return { kind: 'separator', bounds: options.singleBounds };
  }
  if (options.componentType === 'arrow') {
    return { kind: 'arrow' };
  }
  return { kind: 'box', bounds: options.singleBounds };
}

export function createPreviewResizeStartState(
  options: CreatePreviewResizeStartStateOptions,
): PreviewResizeStartPlan {
  const axis = options.axis || '';
  const componentId = options.componentId || '';
  if (!axis || !componentId) {
    return { kind: 'none' };
  }

  const origOverrides: Record<string, InteractionDeltaPatch | undefined> = {};

  const captureSubtree = (nodeId: string) => {
    if (!nodeId || origOverrides[nodeId]) {
      return;
    }
    const own = toDeltaValue(options.getOwnDelta(nodeId));
    origOverrides[nodeId] = { dx: own.dx, dy: own.dy, dw: own.dw, dh: own.dh };
    const node = options.getNode(nodeId);
    if (!node) {
      return;
    }
    for (const child of node.children || []) {
      const childId = getChildId(child);
      if (childId) {
        captureSubtree(childId);
      }
    }
  };

  if (options.selectionToken === 'multi') {
    const selection = options.svg
      ? collectPreviewMultiResizeSelection({
        ids: options.selectedIds,
        getNode: options.getNode,
        getAncestors: options.getAncestors,
        getRenderedBounds: (id) => {
          const node = options.getNode(id);
          return readPreviewRenderedComponentBounds({
            svg: options.svg as ParentNode,
            componentId: id,
            fallbackNodeBounds: node?.data,
            delta: options.getEffectiveDelta(id),
          });
        },
        getOwnDelta: options.getOwnDelta,
        getEffectiveDelta: options.getEffectiveDelta,
        hasLayoutChildren: options.hasLayoutChildren,
        isAutolayoutChild: options.isAutolayoutChild,
        resolvePrimaryId: options.resolvePrimaryId,
        minNodeSize: options.minNodeSize,
      })
      : null;

    if (!selection) {
      return { kind: 'none' };
    }

    for (const member of selection.members) {
      captureSubtree(member.id);
    }

    return {
      kind: 'start',
      state: {
        cid: selection.primaryId,
        axis,
        startX: options.clientX,
        startY: options.clientY,
        origOverrides,
        hasMoved: false,
        snapshotRecorded: false,
        selection,
      },
      touchedIds: Object.keys(origOverrides),
    };
  }

  const own = toDeltaValue(options.getOwnDelta(componentId));
  const node = options.getNode(componentId);
  if (node) {
    captureSubtree(componentId);
    if (node.parent?.id) {
      const parentId = node.parent.id;
      origOverrides[parentId] = { ...toDeltaValue(options.getOwnDelta(parentId)) };
      for (const sibling of options.getSiblings(componentId)) {
        const siblingId = getChildId(sibling);
        if (siblingId) {
          captureSubtree(siblingId);
        }
      }
    } else if (options.hasDiagramGrid) {
      for (const sibling of options.getSiblings(componentId)) {
        const siblingId = getChildId(sibling);
        if (siblingId) {
          captureSubtree(siblingId);
        }
      }
    }
  }

  return {
    kind: 'start',
    state: {
      cid: componentId,
      axis,
      startX: options.clientX,
      startY: options.clientY,
      origDx: own.dx,
      origDy: own.dy,
      origDw: own.dw,
      origDh: own.dh,
      origOverrides,
      hasMoved: false,
      snapshotRecorded: false,
      v3BaseW: node?.data.width ?? 0,
      v3BaseH: node?.data.height ?? 0,
    },
    touchedIds: Object.keys(origOverrides),
  };
}

export function createPreviewDragStartState(
  options: CreatePreviewDragStartStateOptions,
): PreviewDragStartPlan {
  const componentId = options.componentId || '';
  if (!componentId) {
    return { kind: 'none' };
  }

  const selectedIds = new Set(options.selectedIds);
  const dragIds = selectedIds.has(componentId)
    ? [...selectedIds]
    : [componentId];
  const origDeltas: PreviewDragMoveState['origDeltas'] = {};

  for (const id of dragIds) {
    const own = toDeltaValue(options.getOwnDelta(id));
    origDeltas[id] = { dx: own.dx, dy: own.dy };
  }

  return {
    kind: 'start',
    captureIds: dragIds,
    state: {
      cid: componentId,
      cids: dragIds,
      startX: options.clientX,
      startY: options.clientY,
      origDeltas,
      hasMoved: false,
      snapTargets: dragIds.length === 1 ? (options.collectSnapTargets?.(componentId) || null) : null,
      autolayout: options.isAutolayoutChild(componentId),
      reorderTarget: null,
    },
  };
}

export function resolvePreviewAutolayoutDragContext(
  options: ResolvePreviewAutolayoutDragContextOptions,
): PreviewAutolayoutDragContext | null {
  const parentNode = options.getParentNode(options.componentId);
  const svg = options.svg;
  if (!parentNode || !svg) {
    return null;
  }

  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return null;
  }

  const point = svg.createSVGPoint();
  point.x = options.clientX;
  point.y = options.clientY;
  const svgPoint = point.matrixTransform(ctm.inverse());
  const isVertical = parentNode.data.layout === 'vertical';

  return {
    parentId: parentNode.data.id,
    isVertical,
    cursorPos: isVertical ? svgPoint.y : svgPoint.x,
    targets: parentNode.children.map((child) => ({
      cid: child.data.id,
      midpoint: isVertical
        ? (child.data.y + child.data.height / 2)
        : (child.data.x + child.data.width / 2),
    })),
  };
}

export function clearPreviewReorderIndicator(
  root: ParentNode,
  attrName = 'data-reorder-indicator',
): void {
  root.querySelectorAll(`[${attrName}]`).forEach((element) => {
    if ('remove' in element && typeof element.remove === 'function') {
      element.remove();
    }
  });
}

export function renderPreviewReorderIndicator(
  options: RenderPreviewReorderIndicatorOptions,
): void {
  clearPreviewReorderIndicator(options.svg, options.attrName);
  if (options.siblings.length === 0) {
    return;
  }

  let x1 = 0;
  let y1 = 0;
  let x2 = 0;
  let y2 = 0;
  const gap = options.parent.layout_gap ?? 24;

  if (options.isVertical) {
    const leftEdge = options.parent.x + (options.parent.padding_left ?? options.parent.pad ?? 0);
    const rightEdge = leftEdge + (options.siblings[0]?.width ?? 100);
    if (options.insertIndex <= 0) {
      const firstY = options.siblings[0]?.y ?? 0;
      y1 = firstY - gap / 2;
      y2 = y1;
    } else if (options.insertIndex >= options.siblings.length) {
      const last = options.siblings[options.siblings.length - 1];
      y1 = (last?.y ?? 0) + (last?.height ?? 0) + gap / 2;
      y2 = y1;
    } else {
      const prev = options.siblings[options.insertIndex - 1];
      const next = options.siblings[options.insertIndex];
      y1 = ((prev?.y ?? 0) + (prev?.height ?? 0) + (next?.y ?? 0)) / 2;
      y2 = y1;
    }
    x1 = leftEdge;
    x2 = rightEdge;
  } else {
    const topEdge = options.parent.y + (options.parent.padding_top ?? options.parent.pad ?? 0);
    const bottomEdge = topEdge + (options.siblings[0]?.height ?? 64);
    if (options.insertIndex <= 0) {
      const firstX = options.siblings[0]?.x ?? 0;
      x1 = firstX - gap / 2;
      x2 = x1;
    } else if (options.insertIndex >= options.siblings.length) {
      const last = options.siblings[options.siblings.length - 1];
      x1 = (last?.x ?? 0) + (last?.width ?? 0) + gap / 2;
      x2 = x1;
    } else {
      const prev = options.siblings[options.insertIndex - 1];
      const next = options.siblings[options.insertIndex];
      x1 = ((prev?.x ?? 0) + (prev?.width ?? 0) + (next?.x ?? 0)) / 2;
      x2 = x1;
    }
    y1 = topEdge;
    y2 = bottomEdge;
  }

  const line = options.svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', String(x1));
  line.setAttribute('y1', String(y1));
  line.setAttribute('x2', String(x2));
  line.setAttribute('y2', String(y2));
  line.setAttribute('stroke', options.stroke || '#E95420');
  line.setAttribute('stroke-width', String(options.strokeWidth ?? 3));
  line.setAttribute('stroke-dasharray', options.strokeDasharray || '6 4');
  line.setAttribute(options.attrName || 'data-reorder-indicator', 'true');
  options.svg.appendChild(line);
}
