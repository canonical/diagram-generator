/**
 * Multi-selection inspector field-state helpers (spec 043 Slice 3).
 */

export interface MultiSelectionSizingItem {
  sizingW?: string | null;
  sizingH?: string | null;
  wCoerced?: boolean;
  hCoerced?: boolean;
}

export interface MultiSelectionContainerItem {
  isContainer: boolean;
  direction?: string | null;
  wrap?: boolean;
}

export interface MultiSelectionAlignItem {
  hasFrameAlignment: boolean;
  align?: string | null;
}

export interface MultiSelectionSizingState {
  sizingW: string;
  sizingH: string;
  wMixed: boolean;
  hMixed: boolean;
  wCoerced: boolean;
  hCoerced: boolean;
}

export interface MultiSelectionContainerState {
  containerCount: number;
  direction: string;
  dirMixed: boolean;
  wrap: boolean;
}

export interface MultiSelectionAlignState {
  align: string;
  mixed: boolean;
}

export function createMultiSelectionSizingState(
  items: Iterable<MultiSelectionSizingItem>,
): MultiSelectionSizingState | null {
  let firstW: string | null = null;
  let firstH: string | null = null;
  let wMixed = false;
  let hMixed = false;
  let hasAny = false;
  let allWCoerced = true;
  let allHCoerced = true;
  let anyW = false;
  let anyH = false;
  let total = 0;
  let unsupported = false;

  for (const item of items) {
    total += 1;
    const sw = item.sizingW || null;
    const sh = item.sizingH || null;
    if (!sw && !sh) {
      unsupported = true;
      continue;
    }
    hasAny = true;
    if (firstW === null) firstW = sw || 'HUG';
    else if (firstW !== (sw || 'HUG')) wMixed = true;
    if (firstH === null) firstH = sh || 'HUG';
    else if (firstH !== (sh || 'HUG')) hMixed = true;
    if (sw) {
      anyW = true;
      if (!item.wCoerced) allWCoerced = false;
    }
    if (sh) {
      anyH = true;
      if (!item.hCoerced) allHCoerced = false;
    }
  }

  if (!hasAny || unsupported || total === 0) return null;
  return {
    sizingW: wMixed ? '' : (firstW || 'HUG'),
    sizingH: hMixed ? '' : (firstH || 'HUG'),
    wMixed,
    hMixed,
    wCoerced: anyW && allWCoerced,
    hCoerced: anyH && allHCoerced,
  };
}

export function createMultiSelectionContainerState(
  items: Iterable<MultiSelectionContainerItem>,
): MultiSelectionContainerState | null {
  let firstDir: string | null = null;
  let dirMixed = false;
  let containerCount = 0;
  let firstWrap = false;
  let total = 0;

  for (const item of items) {
    total += 1;
    if (!item.isContainer) continue;
    containerCount += 1;
    const dir = item.direction || 'VERTICAL';
    if (firstDir === null) firstDir = dir;
    else if (firstDir !== dir) dirMixed = true;
    if (containerCount === 1) firstWrap = Boolean(item.wrap);
  }

  if (containerCount === 0 || containerCount !== total) return null;
  return {
    containerCount,
    direction: dirMixed ? '' : (firstDir || 'VERTICAL'),
    dirMixed,
    wrap: firstWrap,
  };
}

export function createMultiSelectionAlignState(
  items: Iterable<MultiSelectionAlignItem>,
): MultiSelectionAlignState | null {
  let first: string | null = null;
  let mixed = false;
  let hasAny = false;
  let unsupported = false;
  let total = 0;

  for (const item of items) {
    total += 1;
    if (!item.hasFrameAlignment) {
      unsupported = true;
      continue;
    }
    hasAny = true;
    const align = item.align || 'TOP_LEFT';
    if (first === null) first = align;
    else if (first !== align) mixed = true;
  }

  if (!hasAny || unsupported || total === 0) return null;
  return {
    align: mixed ? '' : (first || 'TOP_LEFT'),
    mixed,
  };
}
