import {
  renderPreviewTreePanel,
  showPreviewContextMenu,
  type PreviewShellTreeNode,
} from './app-shell-panels.js';
import {
  applySelectionStateMutation,
  type SelectionStateSnapshot,
} from './interaction-selection-state.js';
import {
  resolveDoubleClickSelection,
} from './interaction-selection.js';

/**
 * Preview selection host helpers (spec 046 slice B).
 *
 * These helpers own the remaining selection-UI synchronization so editor.js
 * only mutates state and forwards shell callbacks.
 */

export interface ApplyPreviewSelectionStateSnapshotOptions {
  selectedIds: Set<string>;
  nextState: SelectionStateSnapshot;
  setSelectionDepth: (depth: number) => void;
  preferredId?: string | null;
  syncSelectionUi: (preferredId?: string | null) => void;
}

export interface SyncPreviewSelectionUiOptions {
  document: Document;
  selectedIds: Iterable<string>;
  preferredId?: string | null;
  resolvePrimaryId: (preferredId?: string | null) => string | null | undefined;
  syncTreeSelectionState: (container: ParentNode, selectedIds: Iterable<string>) => void;
  removeResizeHandles: () => void;
  showResizeHandles: (cid: string) => void;
  renderEmptyInspector: () => void;
  renderSelectionInspector: (cid?: string | null) => void;
}

export interface ClearPreviewSelectionStateOptions {
  selectedIds: Iterable<string>;
  selectionDepth: number;
}

export interface ResolvePreviewComponentSelectionStateOptions {
  selectedIds: Iterable<string>;
  selectionDepth: number;
  cid: string;
  additive: boolean;
  getAncestorDepth: (cid: string) => number;
}

export interface RenderPreviewTreeSelectionHostOptions {
  document: Document;
  container?: HTMLElement | null;
  nodes: PreviewShellTreeNode[];
  overrides: Record<string, unknown>;
  selectedIds: Iterable<string>;
  selectComponent: (cid: string, additive: boolean) => void;
  onDeleteSelection: () => void;
}

export interface PreviewSelectionHostClassList {
  contains: (name: string) => boolean;
}

export interface PreviewSelectionHostDoubleClickEvent {
  target: {
    classList: PreviewSelectionHostClassList;
  };
  clientX: number;
  clientY: number;
}

export interface PreviewSelectionHostSvgPointLike {
  x: number;
  y: number;
  matrixTransform: (matrix: unknown) => { x: number; y: number };
}

export interface PreviewSelectionHostSvgLike {
  createSVGPoint: () => PreviewSelectionHostSvgPointLike;
  getScreenCTM: () => {
    inverse: () => unknown;
  } | null;
}

export interface HandlePreviewDoubleClickSelectionHostOptions {
  event: PreviewSelectionHostDoubleClickEvent;
  isTextEditing: boolean;
  svg?: PreviewSelectionHostSvgLike | null;
  selectionDepth: number;
  selectedIds: Iterable<string>;
  findEditableTextTarget: (target: unknown, clientX: number, clientY: number) => Element | null;
  resolveEditableComponentId: (textEl: Element | null | undefined) => string;
  getAncestors: (cid: string) => string[];
  setSelectionDepth: (depth: number) => void;
  selectComponent: (cid: string, additive: boolean) => void;
  startTextEdit: (cid: string, event: PreviewSelectionHostDoubleClickEvent, options?: Record<string, unknown>) => void;
  findComponentAtDepth: (x: number, y: number, depth: number) => string | null | undefined;
  getChildIds: (cid: string) => string[];
  applySelectionState: (nextState: SelectionStateSnapshot) => void;
}

export interface PreviewDoubleClickSelectionHostResult {
  kind: 'noop' | 'text-edit' | 'select-children' | 'select-deeper';
}

type PreviewClassListElement = {
  classList: {
    add: (name: string) => void;
    remove: (name: string) => void;
  };
};

function canToggleClassList(value: unknown): value is PreviewClassListElement {
  const classList = value && typeof value === 'object'
    ? (value as { classList?: { add?: unknown; remove?: unknown } }).classList
    : null;
  return Boolean(
    value
    && typeof value === 'object'
    && classList
    && typeof classList.remove === 'function'
    && typeof classList.add === 'function',
  );
}

export function applyPreviewSelectionStateSnapshot(
  options: ApplyPreviewSelectionStateSnapshotOptions,
): void {
  options.selectedIds.clear();
  options.nextState.selectedIds.forEach((id) => options.selectedIds.add(id));
  options.setSelectionDepth(options.nextState.selectionDepth);
  options.syncSelectionUi(options.preferredId);
}

export function clearPreviewSelectionState(
  options: ClearPreviewSelectionStateOptions,
): SelectionStateSnapshot {
  return applySelectionStateMutation({
    selectedIds: [...options.selectedIds],
    selectionDepth: options.selectionDepth,
  }, { kind: 'clear' });
}

export function resolvePreviewComponentSelectionState(
  options: ResolvePreviewComponentSelectionStateOptions,
): SelectionStateSnapshot {
  return options.additive
    ? applySelectionStateMutation({
      selectedIds: [...options.selectedIds],
      selectionDepth: options.selectionDepth,
    }, { kind: 'toggle', targetId: options.cid })
    : applySelectionStateMutation({
      selectedIds: [...options.selectedIds],
      selectionDepth: options.selectionDepth,
    }, {
      kind: 'replace',
      targetId: options.cid,
      nextSelectionDepth: options.getAncestorDepth(options.cid),
    });
}

export function renderPreviewTreeSelectionHost(
  options: RenderPreviewTreeSelectionHostOptions,
): boolean {
  const container = options.container
    || options.document.getElementById('tree');
  if (!container) {
    return false;
  }

  const selectedIdSet = new Set(options.selectedIds);
  renderPreviewTreePanel({
    container,
    nodes: options.nodes,
    overrides: options.overrides,
    selectedIds: selectedIdSet,
    onSelect: (id, additive) => {
      options.selectComponent(id, additive);
    },
    onContextMenu: (event, id) => {
      if (!selectedIdSet.has(id)) {
        options.selectComponent(id, false);
      }
      showPreviewContextMenu({
        document: options.document,
        clientX: event.clientX,
        clientY: event.clientY,
        actions: [
          {
            label: 'Delete frame',
            onSelect: options.onDeleteSelection,
          },
        ],
      });
    },
  });
  return true;
}

export function handlePreviewDoubleClickSelectionHost(
  options: HandlePreviewDoubleClickSelectionHostOptions,
): PreviewDoubleClickSelectionHostResult {
  if (options.event.target.classList.contains('dg-handle')) {
    return { kind: 'noop' };
  }
  if (options.event.target.classList.contains('dg-wp-handle')) {
    return { kind: 'noop' };
  }
  if (options.isTextEditing) {
    return { kind: 'noop' };
  }

  const svg = options.svg;
  if (!svg) {
    return { kind: 'noop' };
  }

  const editableText = options.findEditableTextTarget(
    options.event.target,
    options.event.clientX,
    options.event.clientY,
  );
  if (editableText) {
    const cid = options.resolveEditableComponentId(editableText);
    if (cid) {
      options.setSelectionDepth(options.getAncestors(cid).length);
      options.selectComponent(cid, false);
      options.startTextEdit(cid, options.event, { textEl: editableText });
      return { kind: 'text-edit' };
    }
  }

  const point = svg.createSVGPoint();
  point.x = options.event.clientX;
  point.y = options.event.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return { kind: 'noop' };
  }
  const svgPoint = point.matrixTransform(ctm.inverse());

  const current = options.findComponentAtDepth(
    svgPoint.x,
    svgPoint.y,
    options.selectionDepth,
  ) || null;
  const childIds = current ? options.getChildIds(current) : [];
  const doubleClickResolution = resolveDoubleClickSelection({
    currentSelectionDepth: options.selectionDepth,
    currentHitId: current,
    currentHitIsSelected: Boolean(current && new Set(options.selectedIds).has(current)),
    currentHitChildIds: childIds,
    deeperHitId: options.findComponentAtDepth(
      svgPoint.x,
      svgPoint.y,
      options.selectionDepth + 1,
    ) || null,
  });

  if (doubleClickResolution.kind === 'select-children') {
    options.applySelectionState(applySelectionStateMutation({
      selectedIds: [...options.selectedIds],
      selectionDepth: options.selectionDepth,
    }, {
      kind: 'replace-many',
      targetIds: childIds,
      nextSelectionDepth: doubleClickResolution.nextSelectionDepth ?? options.selectionDepth,
    }));
    return { kind: 'select-children' };
  }

  if (current && new Set(options.selectedIds).has(current) && doubleClickResolution.kind === 'none') {
    options.startTextEdit(current, options.event);
    return { kind: 'text-edit' };
  }

  if (doubleClickResolution.kind === 'select-deeper' && doubleClickResolution.targetId) {
    options.setSelectionDepth(doubleClickResolution.nextSelectionDepth ?? options.selectionDepth);
    options.selectComponent(doubleClickResolution.targetId, false);
    return { kind: 'select-deeper' };
  }

  return { kind: 'noop' };
}

export function syncPreviewSelectionUi(
  options: SyncPreviewSelectionUiOptions,
): void {
  const svg = options.document.querySelector('#stage svg');
  if (svg) {
    svg.querySelectorAll('.dg-selected').forEach((element) => {
      if (canToggleClassList(element)) {
        const classList = element.classList;
        classList.remove('dg-selected');
      }
    });
    for (const id of options.selectedIds) {
      svg.querySelectorAll(`[data-component-id="${id}"]`).forEach((element) => {
        if (canToggleClassList(element)) {
          const classList = element.classList;
          classList.add('dg-selected');
        }
      });
    }
  }

  options.syncTreeSelectionState(options.document, options.selectedIds);

  options.removeResizeHandles();
  const primary = options.resolvePrimaryId(options.preferredId) || null;
  if (!primary) {
    options.renderEmptyInspector();
    return;
  }

  options.showResizeHandles(primary);
  options.renderSelectionInspector(primary);
}
