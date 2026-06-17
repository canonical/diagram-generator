import type {
  PreviewInteractionDeltaValue,
  PreviewInteractionNode,
} from './app-interaction-host.js';
import type { PreviewGridInfo } from './grid-resolution.js';
import type { ResizeGuideLine } from './interaction-geometry.js';

/**
 * Preview snap-target helpers (spec 043 shell coordinator slice Q).
 *
 * These helpers own peer/grid snap-target collection and final drag snap
 * resolution while the shell still provides the shared snap primitives from
 * editor-base.js.
 */

export interface PreviewSnapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreviewSnapTargets {
  xs: number[];
  ys: number[];
}

export interface PreviewSnapComputation {
  adjX: number;
  adjY: number;
  lines: ResizeGuideLine[];
}

export interface CollectPreviewSnapTargetsOptions {
  dragId: string;
  gridInfo?: PreviewGridInfo | null;
  getNode: (id: string) => PreviewInteractionNode | null | undefined;
  getRootNodes: () => PreviewInteractionNode[];
  getOwnDelta: (id: string) => Partial<PreviewInteractionDeltaValue> | null | undefined;
  getEffectiveDelta: (id: string) => Partial<PreviewInteractionDeltaValue> | null | undefined;
  collectPeerSnapTargets: (peerRects: PreviewSnapRect[]) => PreviewSnapTargets;
  collectGridSnapTargets: (gridInfo?: PreviewGridInfo | null) => PreviewSnapTargets;
}

export interface ResolvePreviewDragSnapOptions {
  cid: string;
  proposedDx: number;
  proposedDy: number;
  targets: PreviewSnapTargets;
  getNode: (id: string) => PreviewInteractionNode | null | undefined;
  getOwnDelta: (id: string) => Partial<PreviewInteractionDeltaValue> | null | undefined;
  snapRectToTargets: (
    left: number,
    top: number,
    right: number,
    bottom: number,
    targets: PreviewSnapTargets,
  ) => PreviewSnapComputation;
  snapStep?: number;
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

export function collectPreviewSnapTargets(
  options: CollectPreviewSnapTargetsOptions,
): PreviewSnapTargets {
  const node = options.getNode(options.dragId);
  if (!node) {
    return { xs: [], ys: [] };
  }

  const parentNode = node.parent?.id ? options.getNode(node.parent.id) : null;
  const peerNodes = parentNode
    ? parentNode.children
      .map((peer) => options.getNode(peer.id || peer.data?.id || ''))
      .filter((peer): peer is PreviewInteractionNode => Boolean(peer && peer.id !== options.dragId && peer.type !== 'arrow'))
    : options.getRootNodes().filter((peer) => peer.id !== options.dragId && peer.type !== 'arrow');

  const peerRects = peerNodes.map((peer) => {
    const effective = toDeltaValue(options.getEffectiveDelta(peer.id));
    const own = toDeltaValue(options.getOwnDelta(peer.id));
    return {
      x: peer.data.x + effective.dx,
      y: peer.data.y + effective.dy,
      width: peer.data.width + own.dw,
      height: peer.data.height + own.dh,
    };
  });

  const peerTargets = options.collectPeerSnapTargets(peerRects);
  const gridTargets = options.collectGridSnapTargets(options.gridInfo ?? null);
  return {
    xs: [...peerTargets.xs, ...gridTargets.xs],
    ys: [...peerTargets.ys, ...gridTargets.ys],
  };
}

export function resolvePreviewDragSnap(
  options: ResolvePreviewDragSnapOptions,
): { dx: number; dy: number; lines: ResizeGuideLine[] } {
  const node = options.getNode(options.cid);
  if (!node) {
    return {
      dx: options.proposedDx,
      dy: options.proposedDy,
      lines: [],
    };
  }

  const own = toDeltaValue(options.getOwnDelta(options.cid));
  const width = node.data.width + own.dw;
  const height = node.data.height + own.dh;
  const left = node.data.x + options.proposedDx;
  const top = node.data.y + options.proposedDy;
  const step = Math.max(1, options.snapStep ?? 8);

  const initial = options.snapRectToTargets(
    left,
    top,
    left + width,
    top + height,
    options.targets,
  );
  const snappedDx = Math.round((options.proposedDx + initial.adjX) / step) * step;
  const snappedDy = Math.round((options.proposedDy + initial.adjY) / step) * step;

  const finalLeft = node.data.x + snappedDx;
  const finalTop = node.data.y + snappedDy;
  const finalSnap = options.snapRectToTargets(
    finalLeft,
    finalTop,
    finalLeft + width,
    finalTop + height,
    options.targets,
  );

  return {
    dx: snappedDx,
    dy: snappedDy,
    lines: finalSnap.lines,
  };
}
