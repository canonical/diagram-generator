import {
  resolvePreviewPanelVisibility,
  type PreviewPanelVisibility,
  type PreviewUiContext,
} from './preview-ui-context.js';
import { LAYOUT_PARAMS_SIDEBAR_SECTION_ALIASES } from '../preview-engine/sidebar-sections.js';

/**
 * Preview shell panel helpers (spec 043 shell coordinator slice J).
 *
 * These helpers own the tree/sidebar rendering and small status-panel view
 * logic so editor.js does not keep accumulating inline UI assembly code.
 */

export interface PreviewShellTreeNode {
  id: string;
  children?: PreviewShellTreeNode[] | null;
}

export interface PreviewShellTreeEntry {
  id: string;
  depth: number;
  isOverridden: boolean;
  isSelected: boolean;
}

export interface PreviewOverrideExportEntry {
  dx?: number | null;
  dy?: number | null;
  dw?: number | null;
  dh?: number | null;
  waypoints?: unknown[] | null;
}

export interface PreviewConstraintSummary {
  total: number;
  errors: number;
  warnings: number;
}

export interface PreviewConstraintViolationDetail {
  constraintId: string;
  componentId: string;
  message: string;
  severity: string;
  selected: boolean;
  hint: string;
}

export interface PreviewConstraintStatus {
  className: string;
  text: string;
  backgroundColor: string;
  color: string;
  hidden: boolean;
}

export interface RenderPreviewTreePanelOptions {
  container: HTMLElement;
  nodes: PreviewShellTreeNode[];
  overrides: Record<string, unknown>;
  selectedIds?: Iterable<string>;
  onSelect: (id: string, additive: boolean) => void;
  onContextMenu: (event: MouseEvent, id: string) => void;
}

export interface ShowPreviewContextMenuAction {
  label: string;
  onSelect: () => void;
}

export interface ShowPreviewContextMenuOptions {
  document: Document;
  clientX: number;
  clientY: number;
  actions: ShowPreviewContextMenuAction[];
  menuId?: string;
  menuClassName?: string;
  buttonClassName?: string;
}

export interface InitPreviewOverrideToolbarOptions {
  exportButton?: HTMLElement | null;
  clearAllButton?: HTMLElement | null;
  slug: string;
  getOverrides: () => Record<string, PreviewOverrideExportEntry>;
  getGridOverrides?: (() => Record<string, unknown> | null | undefined) | null;
  getLayoutOverrides?: (() => Record<string, unknown> | null | undefined) | null;
  getRemovedIds?: (() => Iterable<string> | { size?: number } | null | undefined) | null;
  isDiagnosticsMode?: (() => boolean) | null;
  writeClipboardText: (text: string) => Promise<unknown>;
  alert: (message: string) => void;
  confirmClearAll: (message: string) => boolean;
  confirmClearAllMessage: string;
  onClearAll: () => void | Promise<void>;
  emptyExportMessage?: string;
  copiedExportMessage?: string;
}

export interface PreviewDocumentActionStateSource {
  frameOverrideCount?: number | null;
  gridOverrides?: Record<string, unknown> | null;
  layoutOverrides?: Record<string, unknown> | null;
  removedIds?: Iterable<string> | { size?: number } | null;
  diagnosticsMode?: boolean | null;
}

export interface PreviewDocumentActionState {
  hasFrameOverrides: boolean;
  hasGridOverrides: boolean;
  hasLayoutOverrides: boolean;
  hasRemovedFrames: boolean;
  hasClearableState: boolean;
  showCopyOverrides: boolean;
  disableClearAll: boolean;
  disableCopyOverrides: boolean;
}

export interface SyncPreviewConstraintStatusOptions {
  violations?: unknown;
  selectedIds?: Iterable<string> | null;
}

export interface PreviewPanelVisibilityDocumentLike {
  getElementById: (id: string) => HTMLElement | null;
}

const LAYOUT_PARAMS_PANEL_IDS = Object.fromEntries(
  LAYOUT_PARAMS_SIDEBAR_SECTION_ALIASES.map((section) => [section, 'layout-params-section']),
) as Record<string, string>;

const PANEL_ELEMENT_IDS: Record<string, string> = {
  'grid-layers-tab': 'nav-tab-layers',
  'grid-layers-pane': 'nav-pane-layers',
  'grid-engine-switcher': 'engine-switcher-section',
  'grid-controls': 'grid-controls-section',
  ...LAYOUT_PARAMS_PANEL_IDS,
  'grid-overrides': 'document-actions-section',
  'grid-constraints': 'constraints-section',
  'grid-guide-badge': 'guide-badge',
  'force-nodes-tab': 'nav-tab-nodes',
  'force-nodes-pane': 'nav-pane-nodes',
  'force-solver': 'force-solver-section',
  'force-simulation': 'force-simulation-section',
  'force-guidance': 'force-guidance-section',
};

function hasOwnOverride(overrides: Record<string, unknown>, id: string): boolean {
  return Object.prototype.hasOwnProperty.call(overrides, id) && Boolean(overrides[id]);
}

function isHtmlElementWithDataset(
  value: unknown,
): value is HTMLElement & { dataset: DOMStringMap } {
  if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) {
    return true;
  }
  return Boolean(value && typeof value === 'object' && 'dataset' in value);
}

type PreviewTreeRowLike = HTMLElement & {
  focus?: () => void;
  tabIndex: number;
};

function setPreviewTreeTabStop(
  items: PreviewTreeRowLike[],
  activeIndex: number,
): void {
  items.forEach((item, index) => {
    item.tabIndex = index === activeIndex ? 0 : -1;
  });
}

export function flattenPreviewTreeEntries(
  nodes: PreviewShellTreeNode[],
  overrides: Record<string, unknown>,
  selectedIds: Iterable<string> = [],
): PreviewShellTreeEntry[] {
  const entries: PreviewShellTreeEntry[] = [];
  const selectedIdSet = new Set(selectedIds);

  function visit(nextNodes: PreviewShellTreeNode[], depth: number) {
    for (const node of nextNodes) {
      entries.push({
        id: node.id,
        depth,
        isOverridden: hasOwnOverride(overrides, node.id),
        isSelected: selectedIdSet.has(node.id),
      });
      if (node.children?.length) {
        visit(node.children, depth + 1);
      }
    }
  }

  visit(nodes, 0);
  return entries;
}

export function renderPreviewTreePanel(
  options: RenderPreviewTreePanelOptions,
): void {
  const entries = flattenPreviewTreeEntries(
    options.nodes,
    options.overrides,
    options.selectedIds,
  );
  options.container.replaceChildren();
  const items: PreviewTreeRowLike[] = [];
  let activeIndex = entries.findIndex((entry) => entry.isSelected);
  if (activeIndex < 0) {
    activeIndex = 0;
  }

  entries.forEach((entry, index) => {
    const item = options.container.ownerDocument.createElement('div');
    item.className = `tree-item${entry.isSelected ? ' selected' : ''}${entry.isOverridden ? ' overridden' : ''}`;
    item.style.paddingLeft = `${8 + (entry.depth * 12)}px`;
    item.textContent = entry.id;
    item.dataset.nodeId = entry.id;
    item.tabIndex = index === activeIndex ? 0 : -1;
    item.addEventListener('click', (event) => {
      event.stopPropagation();
      setPreviewTreeTabStop(items, index);
      item.focus?.();
      options.onSelect(entry.id, event.shiftKey);
    });
    item.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      options.onContextMenu(event, entry.id);
    });
    item.addEventListener('focus', () => {
      setPreviewTreeTabStop(items, index);
    });
    item.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }
      const nextIndex = index + (event.shiftKey ? -1 : 1);
      const target = items[nextIndex];
      if (!target) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setPreviewTreeTabStop(items, nextIndex);
      target.focus?.();
      options.onSelect(entries[nextIndex]!.id, false);
    });
    options.container.appendChild(item);
    items.push(item as PreviewTreeRowLike);
  });
}

export function syncPreviewTreeSelectionState(
  container: ParentNode,
  selectedIds: Iterable<string>,
): void {
  const selectedIdSet = new Set(selectedIds);
  container.querySelectorAll('.tree-item[data-node-id]').forEach((element) => {
    if (!isHtmlElementWithDataset(element)) {
      return;
    }
    element.classList.toggle('selected', selectedIdSet.has(element.dataset.nodeId || ''));
  });
}

export function syncPreviewTreeOverrideState(
  container: ParentNode,
  overrides: Record<string, unknown>,
): void {
  container.querySelectorAll('.tree-item[data-node-id]').forEach((element) => {
    if (!isHtmlElementWithDataset(element)) {
      return;
    }
    element.classList.toggle('overridden', hasOwnOverride(overrides, element.dataset.nodeId || ''));
  });
}

export function previewTreeHasFrameId(
  container: ParentNode,
  frameId: string,
): boolean {
  return Array.from(container.querySelectorAll('.tree-item[data-node-id]'))
    .some((element) => isHtmlElementWithDataset(element) && element.dataset.nodeId === frameId);
}

export function showPreviewContextMenu(
  options: ShowPreviewContextMenuOptions,
): void {
  const menuId = options.menuId || 'dg-tree-context-menu';
  const menuClassName = options.menuClassName || 'dg-context-menu';
  const buttonClassName = options.buttonClassName || 'dg-context-menu__button';
  options.document.getElementById(menuId)?.remove();

  const menu = options.document.createElement('div');
  menu.id = menuId;
  menu.className = menuClassName;
  menu.style.left = `${options.clientX}px`;
  menu.style.top = `${options.clientY}px`;

  for (const action of options.actions) {
    const button = options.document.createElement('button');
    button.className = buttonClassName;
    button.type = 'button';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      menu.remove();
      action.onSelect();
    });
    menu.appendChild(button);
  }

  options.document.body.appendChild(menu);

  const dismiss = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Node) || !menu.contains(target)) {
      menu.remove();
      options.document.removeEventListener('mousedown', dismiss, true);
    }
  };

  setTimeout(() => {
    options.document.addEventListener('mousedown', dismiss, true);
  }, 0);
}

export function formatPreviewOverrideSummary(count: number): string {
  if (count <= 0) {
    return 'No overrides.';
  }
  return `${count} override${count === 1 ? '' : 's'}`;
}

export function createPreviewOverrideExportText(
  slug: string,
  overrides: Record<string, PreviewOverrideExportEntry>,
): string | null {
  const entries = Object.entries(overrides).filter(([, value]) =>
    (value.dx || 0) !== 0
    || (value.dy || 0) !== 0
    || (value.dw || 0) !== 0
    || (value.dh || 0) !== 0
    || Boolean(value.waypoints?.length),
  );

  if (entries.length === 0) {
    return null;
  }

  const lines = [`# Overrides for ${slug}`, ''];
  for (const [cid, value] of entries) {
    const parts: string[] = [];
    if (value.dx || value.dy) {
      parts.push(`move x+${value.dx || 0} y+${value.dy || 0}`);
    }
    if (value.dw || value.dh) {
      parts.push(`resize w+${value.dw || 0} h+${value.dh || 0}`);
    }
    if (value.waypoints?.length) {
      parts.push(`waypoints: ${value.waypoints.length}`);
    }
    lines.push(`# ${cid}: ${parts.join(', ')}`);
  }

  return lines.join('\n');
}

function recordEntryCount(value: Record<string, unknown> | null | undefined): number {
  return value ? Object.keys(value).length : 0;
}

function removedIdCount(value: Iterable<string> | { size?: number } | null | undefined): number {
  if (!value) {
    return 0;
  }
  if (typeof (value as { size?: unknown }).size === 'number') {
    return Math.max(0, (value as { size: number }).size);
  }
  if (typeof (value as Iterable<string>)[Symbol.iterator] === 'function') {
    return Array.from(value as Iterable<string>).length;
  }
  return 0;
}

export function resolvePreviewDocumentActionState(
  source: PreviewDocumentActionStateSource,
): PreviewDocumentActionState {
  const hasFrameOverrides = (source.frameOverrideCount ?? 0) > 0;
  const hasGridOverrides = recordEntryCount(source.gridOverrides) > 0;
  const hasLayoutOverrides = recordEntryCount(source.layoutOverrides) > 0;
  const hasRemovedFrames = removedIdCount(source.removedIds) > 0;
  const hasClearableState = hasFrameOverrides
    || hasGridOverrides
    || hasLayoutOverrides
    || hasRemovedFrames;
  const showCopyOverrides = Boolean(source.diagnosticsMode) || hasFrameOverrides;

  return {
    hasFrameOverrides,
    hasGridOverrides,
    hasLayoutOverrides,
    hasRemovedFrames,
    hasClearableState,
    showCopyOverrides,
    disableClearAll: !hasClearableState,
    disableCopyOverrides: !hasFrameOverrides,
  };
}

function setElementHiddenFromDocumentActionState(
  element: HTMLElement,
  hidden: boolean,
): void {
  element.hidden = hidden;
  if (hidden) {
    element.setAttribute?.('aria-hidden', 'true');
    element.setAttribute?.('tabindex', '-1');
    return;
  }
  element.removeAttribute?.('aria-hidden');
  element.removeAttribute?.('tabindex');
}

function setPanelElementHidden(
  element: HTMLElement,
  hidden: boolean,
): void {
  element.hidden = hidden;
  if ('style' in element && element.style) {
    element.style.display = hidden ? 'none' : '';
  }
  if ('inert' in element) {
    (element as HTMLElement & { inert: boolean }).inert = hidden;
  }
  if (hidden) {
    element.setAttribute('aria-hidden', 'true');
  } else {
    element.removeAttribute('aria-hidden');
  }

  element
    .querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]')
    .forEach((control) => {
      if (hidden) {
        if (!control.hasAttribute('data-dg-prev-tabindex')) {
          control.setAttribute(
            'data-dg-prev-tabindex',
            control.getAttribute('tabindex') ?? '',
          );
        }
        control.setAttribute('tabindex', '-1');
        if ('disabled' in control && !(control as HTMLButtonElement).disabled) {
          control.setAttribute('data-dg-panel-disabled', '1');
          (control as HTMLButtonElement).disabled = true;
        }
        return;
      }

      if (control.hasAttribute('data-dg-prev-tabindex')) {
        const previous = control.getAttribute('data-dg-prev-tabindex');
        if (previous) {
          control.setAttribute('tabindex', previous);
        } else {
          control.removeAttribute('tabindex');
        }
        control.removeAttribute('data-dg-prev-tabindex');
      }
      if (control.getAttribute('data-dg-panel-disabled') === '1') {
        if ('disabled' in control) {
          (control as HTMLButtonElement).disabled = false;
        }
        control.removeAttribute('data-dg-panel-disabled');
      }
    });
}

export function syncPreviewPanelVisibility(options: {
  document: PreviewPanelVisibilityDocumentLike;
  visibility: Iterable<PreviewPanelVisibility>;
}): void {
  const applied = new Set<string>();
  for (const entry of options.visibility) {
    const elementId = PANEL_ELEMENT_IDS[entry.id];
    if (!elementId || applied.has(elementId)) {
      continue;
    }
    const element = options.document.getElementById(elementId);
    if (!element) {
      continue;
    }
    applied.add(elementId);
    setPanelElementHidden(element, !entry.visible);
  }
}

export function syncPreviewPanelVisibilityFromContext(options: {
  document: PreviewPanelVisibilityDocumentLike;
  context: PreviewUiContext;
}): PreviewPanelVisibility[] {
  const visibility = resolvePreviewPanelVisibility(options.context);
  syncPreviewPanelVisibility({
    document: options.document,
    visibility,
  });
  return visibility;
}

function setButtonDisabled(
  element: HTMLElement | null | undefined,
  disabled: boolean,
): void {
  if (element && 'disabled' in element) {
    (element as HTMLButtonElement).disabled = disabled;
  }
}

export function syncPreviewDocumentActionControls(options: {
  document: Pick<Document, 'getElementById'>;
  source: PreviewDocumentActionStateSource;
}): PreviewDocumentActionState {
  const state = resolvePreviewDocumentActionState(options.source);
  const clearAllButton = options.document.getElementById('btn-clear-all') as HTMLElement | null;
  const exportButton = options.document.getElementById('btn-export') as HTMLElement | null;

  setButtonDisabled(clearAllButton, state.disableClearAll);
  if (exportButton) {
    setButtonDisabled(exportButton, state.disableCopyOverrides);
    setElementHiddenFromDocumentActionState(exportButton, !state.showCopyOverrides);
  }

  return state;
}

function resolveToolbarDocumentActionStateSource(
  options: InitPreviewOverrideToolbarOptions,
): PreviewDocumentActionStateSource {
  return {
    frameOverrideCount: Object.keys(options.getOverrides()).length,
    gridOverrides: options.getGridOverrides?.() ?? null,
    layoutOverrides: options.getLayoutOverrides?.() ?? null,
    removedIds: options.getRemovedIds?.() ?? null,
    diagnosticsMode: options.isDiagnosticsMode?.() ?? false,
  };
}

export function initPreviewOverrideToolbar(
  options: InitPreviewOverrideToolbarOptions,
): void {
  const emptyExportMessage = options.emptyExportMessage || 'No overrides to export.';
  const copiedExportMessage = options.copiedExportMessage || 'Copied to clipboard.';
  const syncDocumentActions = () => {
    if (!options.exportButton && !options.clearAllButton) {
      return;
    }
    syncPreviewDocumentActionControls({
      document: {
        getElementById(id: string) {
          if (id === 'btn-export') return options.exportButton ?? null;
          if (id === 'btn-clear-all') return options.clearAllButton ?? null;
          return null;
        },
      } as Pick<Document, 'getElementById'>,
      source: resolveToolbarDocumentActionStateSource(options),
    });
  };

  syncDocumentActions();

  options.exportButton?.addEventListener('click', () => {
    const text = createPreviewOverrideExportText(options.slug, options.getOverrides());
    if (!text) {
      options.alert(emptyExportMessage);
      return;
    }

    void options.writeClipboardText(text).then(() => {
      options.alert(copiedExportMessage);
    });
  });

  options.clearAllButton?.addEventListener('click', () => {
    const actionState = resolvePreviewDocumentActionState(resolveToolbarDocumentActionStateSource(options));
    if (!actionState.hasClearableState) {
      syncDocumentActions();
      return;
    }
    if (!options.confirmClearAll(options.confirmClearAllMessage)) {
      return;
    }
    void Promise.resolve(options.onClearAll()).finally(syncDocumentActions);
  });
}

export function resolvePreviewConstraintStatus(
  summary: PreviewConstraintSummary,
): PreviewConstraintStatus {
  if (summary.total === 0) {
    return {
      className: 'build-status build-ok',
      text: 'No violations',
      backgroundColor: '',
      color: '',
      hidden: true,
    };
  }

  if (summary.errors > 0) {
    return {
      className: 'build-status build-err',
      text: `${summary.errors} error(s), ${summary.warnings} warning(s)`,
      backgroundColor: '',
      color: '',
      hidden: false,
    };
  }

  return {
    className: 'build-status',
    text: `${summary.warnings} warning(s)`,
    backgroundColor: '#3a3a1a',
    color: '#cc6',
    hidden: false,
  };
}

function escapePreviewText(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizedSeverity(value: unknown): string {
  const severity = String(value || 'warning').toLowerCase();
  return severity === 'error' ? 'error' : 'warning';
}

function constraintHintForRule(rule: string): string {
  if (rule === 'grid-align') return 'Snap position and size to the 8px baseline.';
  if (rule === 'override-grid') return 'Adjust overrides to 8px increments or clear the override.';
  if (rule === 'approved-fill') return 'Use a supported box variant instead of a custom fill.';
  if (rule === 'highlight-limit') return 'Keep only one highlight variant in the diagram.';
  if (rule === 'no-orange-fill') return 'Use the arrow color only for connectors.';
  if (rule === 'containment') return 'Move or resize the child back within its parent.';
  return 'Inspect the affected frame and adjust authored values or overrides.';
}

export function resolvePreviewConstraintViolationDetails(
  violations: unknown,
  selectedIds: Iterable<string> | null = null,
): PreviewConstraintViolationDetail[] {
  const selectedIdSet = new Set(selectedIds ?? []);
  if (!Array.isArray(violations)) {
    return [];
  }
  return violations
    .map((violation): PreviewConstraintViolationDetail | null => {
      if (!violation || typeof violation !== 'object') {
        return null;
      }
      const record = violation as Record<string, unknown>;
      const message = String(record.message ?? '').trim();
      if (!message) {
        return null;
      }
      const constraintId = String(record.constraintId ?? record.rule ?? 'constraint').trim();
      const componentId = String(record.componentId ?? record.frameId ?? record.id ?? 'diagram').trim();
      return {
        constraintId,
        componentId,
        message,
        severity: normalizedSeverity(record.severity),
        selected: selectedIdSet.has(componentId),
        hint: constraintHintForRule(constraintId),
      };
    })
    .filter((detail): detail is PreviewConstraintViolationDetail => detail !== null);
}

function renderPreviewConstraintDetailsHtml(details: readonly PreviewConstraintViolationDetail[]): string {
  if (details.length === 0) {
    return '';
  }
  const visibleDetails = details.slice(0, 12);
  let html = '<div class="dg-constraint-details" id="constraint-details">';
  for (const detail of visibleDetails) {
    const selectedClass = detail.selected ? ' is-selected' : '';
    html += `<div class="dg-constraint-detail${selectedClass}" data-dg-constraint-severity="${escapePreviewText(detail.severity)}" data-dg-component-id="${escapePreviewText(detail.componentId)}">`;
    html += '<div class="dg-constraint-detail__meta">';
    html += `<span class="dg-constraint-detail__severity">${escapePreviewText(detail.severity)}</span>`;
    html += `<span class="dg-constraint-detail__component">${escapePreviewText(detail.componentId)}</span>`;
    html += `<span class="dg-constraint-detail__rule">${escapePreviewText(detail.constraintId)}</span>`;
    if (detail.selected) {
      html += '<span class="dg-constraint-detail__selected">selected</span>';
    }
    html += '</div>';
    html += `<div class="dg-constraint-detail__message">${escapePreviewText(detail.message)}</div>`;
    html += `<div class="dg-constraint-detail__hint">${escapePreviewText(detail.hint)}</div>`;
    html += '</div>';
  }
  if (details.length > visibleDetails.length) {
    html += `<div class="dg-constraint-detail__more">${details.length - visibleDetails.length} more violation(s)</div>`;
  }
  html += '</div>';
  return html;
}

export function syncPreviewConstraintStatus(
  element: HTMLElement,
  summary: PreviewConstraintSummary,
  options: SyncPreviewConstraintStatusOptions = {},
): void {
  const status = resolvePreviewConstraintStatus(summary);
  element.textContent = status.text;
  element.className = status.className;
  element.style.background = status.backgroundColor;
  element.style.color = status.color;
  element.hidden = status.hidden;
  const section = element.closest?.('#constraints-section, [data-dg-panel-id="diagnostics-constraints"]');
  if (typeof HTMLElement !== 'undefined' && section instanceof HTMLElement) {
    setPanelElementHidden(section, status.hidden);
    let details = section.querySelector<HTMLElement>('#constraint-details');
    if (status.hidden) {
      details?.remove();
      return;
    }
    const detailHtml = renderPreviewConstraintDetailsHtml(
      resolvePreviewConstraintViolationDetails(options.violations, options.selectedIds ?? null),
    );
    if (!detailHtml) {
      details?.remove();
      return;
    }
    if (!details) {
      details = section.ownerDocument.createElement('div');
      details.id = 'constraint-details';
      section.appendChild(details);
    }
    details.outerHTML = detailHtml;
  }
}
