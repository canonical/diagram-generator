/**
 * Multi-selection action item assembly helpers (spec 043 slice J).
 *
 * These helpers gather the geometry-rich selection action items used by the
 * inspector while the browser shell still owns model access and undo wiring.
 */

import {
  createSelectionActionInfo,
  type SelectionActionInfo,
} from './inspector-selection.js';
import type { SelectionParentBounds } from './selection-actions.js';

export interface PreviewSelectionDelta {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export interface PreviewSelectionActionNodeData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreviewSelectionActionNode {
  id: string;
  type?: string | null;
  data: PreviewSelectionActionNodeData;
  parent?: { id: string } | null;
}

export interface PreviewSelectionActionItem {
  id: string;
  node: PreviewSelectionActionNode;
  parentId: string;
  own: PreviewSelectionDelta;
  eff: PreviewSelectionDelta;
  baseX: number;
  baseY: number;
  ancestorDx: number;
  ancestorDy: number;
  parentBounds?: SelectionParentBounds | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreviewSelectionActionInfo
  extends Omit<SelectionActionInfo, 'items'> {
  items: PreviewSelectionActionItem[];
}

export interface CollectPreviewSelectionActionInfoOptions {
  selectedIds: Iterable<string>;
  getNode: (id: string) => PreviewSelectionActionNode | null | undefined;
  getOwnDelta: (id: string) => PreviewSelectionDelta;
  getEffectiveDelta: (id: string) => PreviewSelectionDelta;
  inset: number;
}

export function collectPreviewSelectionActionInfo(
  options: CollectPreviewSelectionActionInfoOptions,
): PreviewSelectionActionInfo {
  const items: PreviewSelectionActionItem[] = [];
  let hasUnsupported = false;

  for (const id of options.selectedIds) {
    const node = options.getNode(id);
    if (!node || node.type === 'arrow') {
      hasUnsupported = true;
      continue;
    }

    const own = options.getOwnDelta(id);
    const eff = options.getEffectiveDelta(id);
    const ancestorDx = eff.dx - own.dx;
    const ancestorDy = eff.dy - own.dy;
    let parentBounds: SelectionParentBounds | null = null;

    if (node.parent) {
      const parent = options.getNode(node.parent.id);
      if (parent) {
        const parentEff = options.getEffectiveDelta(parent.id);
        const parentOwn = options.getOwnDelta(parent.id);
        const minX = parent.data.x + parentEff.dx + options.inset;
        const minY = parent.data.y + parentEff.dy + options.inset;
        const maxX = minX + parent.data.width + parentOwn.dw - (2 * options.inset) - (node.data.width + own.dw);
        const maxY = minY + parent.data.height + parentOwn.dh - (2 * options.inset) - (node.data.height + own.dh);
        parentBounds = { minX, minY, maxX, maxY };
      }
    }

    items.push({
      id,
      node,
      parentId: node.parent ? node.parent.id : '',
      own,
      eff,
      baseX: node.data.x,
      baseY: node.data.y,
      ancestorDx,
      ancestorDy,
      parentBounds,
      x: node.data.x + eff.dx,
      y: node.data.y + eff.dy,
      width: node.data.width + own.dw,
      height: node.data.height + own.dh,
    });
  }

  return createSelectionActionInfo(items, hasUnsupported) as PreviewSelectionActionInfo;
}
