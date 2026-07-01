import { getPreviewEngineByLayoutKey } from '../preview-engine/registry.js';
import {
  createPreviewEngineWorkspaceState,
  persistPreviewEngineWorkspaceActiveEngine,
  setPreviewEngineWorkspaceActiveEngine,
  type PreviewEngineWorkspaceState,
} from './preview-engine-workspace.js';
import {
  commitPreviewRenderIntentToWindow,
  resolvePreviewRenderIntentLayoutEngine,
  type PreviewRenderIntent,
  type PreviewRenderIntentFrameTree,
} from './preview-render-intent.js';
import {
  compareEditorMutationStateVector,
  resolveEditorMutationTransaction,
  type EditorMutationStateVectorViolation,
  type EditorMutationTransactionResult,
} from './editor-mutation-transaction.js';

export interface PreviewEngineWorkspaceChromeConfig {
  slug?: string | null;
  document_kind?: string | null;
  layout_engine?: string | null;
  active_engine_id?: string | null;
  active_engine_label?: string | null;
  persisted_layout_engine?: string | null;
  compatible_engines?: readonly string[] | null;
  show_engine_switcher?: boolean | null;
}

export interface PreviewEngineWorkspaceRuntimeState {
  readonly workspace: PreviewEngineWorkspaceState;
}

export type PreviewEngineWorkspaceRuntimeWindow = Window & typeof globalThis & {
  __DG_CONFIG?: PreviewEngineWorkspaceChromeConfig | null;
  __DG_previewRenderIntent?: PreviewRenderIntent | null;
  __DG_previewEngineWorkspaceState?: PreviewEngineWorkspaceRuntimeState | null;
  __DG_lastEditorMutationTransactionResult?: EditorMutationTransactionResult | null;
  __DG_lastEditorMutationStateViolations?: readonly EditorMutationStateVectorViolation[] | null;
  __DG_previewBridgeHostRuntime?: {
    getFrameTreeJson?: (() => unknown) | null;
    setFrameTreeLayoutEngine?: ((layoutEngine: string | null | undefined) => string | null) | null;
  } | null;
  __DG_syncPreviewEngineWorkspaceChrome?: (() => void) | null;
  __DG_syncPreviewEngineWorkspacePanels?: (() => void) | null;
  __DG_rerenderPreviewEngineWorkspaceStage?: (() => Promise<unknown> | unknown) | null;
  getFrameTreeJson?: (() => unknown) | null;
  setFrameTreeLayoutEngine?: ((layoutEngine: string | null | undefined) => string | null) | null;
  PreviewSaveClient?: {
    isDirty?: () => boolean;
    syncSaveButton?: () => void;
  } | null;
};

export interface InitPreviewEngineWorkspaceChromeOptions {
  readonly document: Document;
  readonly previewWindow: PreviewEngineWorkspaceRuntimeWindow;
  readonly fetchFn?: typeof fetch;
}

function asHtmlButtonElement(
  value: HTMLElement | null,
): HTMLButtonElement | null {
  return value && value.tagName.toLowerCase() === 'button' ? value as HTMLButtonElement : null;
}

function normalizeEngineIds(value: readonly string[] | null | undefined): string[] {
  const ids = new Set<string>();
  for (const entry of value ?? []) {
    const normalized = String(entry || '').trim();
    if (normalized) {
      ids.add(normalized);
    }
  }
  return [...ids];
}

function resolveWorkspace(
  config: PreviewEngineWorkspaceChromeConfig | null | undefined,
): PreviewEngineWorkspaceState {
  return createPreviewEngineWorkspaceState({
    activeEngineId: config?.active_engine_id ?? config?.layout_engine ?? null,
    compatibleEngineIds: normalizeEngineIds(config?.compatible_engines),
    getEngineById: (engineId) => getPreviewEngineByLayoutKey(engineId) ?? null,
    persistedEngineId: config?.persisted_layout_engine ?? config?.layout_engine ?? null,
  });
}

function setRuntimeWorkspaceState(
  previewWindow: PreviewEngineWorkspaceRuntimeWindow,
  workspace: PreviewEngineWorkspaceState,
): PreviewEngineWorkspaceState {
  const config = previewWindow.__DG_CONFIG ?? {};
  const existingLabel = typeof config.active_engine_label === 'string'
    ? config.active_engine_label.trim()
    : '';
  const nextLabel = existingLabel && config.active_engine_id === workspace.activeEngineId
    ? existingLabel
    : (workspace.activeEngine?.label ?? workspace.activeEngineId ?? null);
  config.active_engine_id = workspace.activeEngineId;
  config.active_engine_label = nextLabel;
  config.persisted_layout_engine = workspace.persistedEngineId;
  config.layout_engine = workspace.activeEngineId ?? workspace.persistedEngineId ?? null;
  previewWindow.__DG_CONFIG = config;
  commitPreviewRenderIntentToWindow(previewWindow, {
    activeEngineId: workspace.activeEngineId,
    persistedEngineId: workspace.persistedEngineId,
    fallbackEngineId: workspace.activeEngineId ?? workspace.persistedEngineId ?? null,
  });
  previewWindow.__DG_previewEngineWorkspaceState = { workspace };
  return workspace;
}

export function getPreviewEngineWorkspaceRuntimeState(
  previewWindow: PreviewEngineWorkspaceRuntimeWindow,
): PreviewEngineWorkspaceState | null {
  const current = previewWindow.__DG_previewEngineWorkspaceState?.workspace;
  if (current) {
    return current;
  }
  const config = previewWindow.__DG_CONFIG ?? null;
  if (!config) {
    return null;
  }
  return setRuntimeWorkspaceState(previewWindow, resolveWorkspace(config));
}

function readFrameTreeLayoutEngine(
  previewWindow: PreviewEngineWorkspaceRuntimeWindow,
): string | null {
  const frameTreeJson = (
    previewWindow.getFrameTreeJson?.()
    ?? previewWindow.__DG_previewBridgeHostRuntime?.getFrameTreeJson?.()
    ?? null
  ) as PreviewRenderIntentFrameTree | null;
  return resolvePreviewRenderIntentLayoutEngine({
    intent: previewWindow.__DG_previewRenderIntent ?? null,
    frameTreeJson,
  });
}

function renderedStageLayoutEngine(document: Document): string | null {
  const querySelector = (document as Document & {
    querySelector?: (selector: string) => Element | null;
  }).querySelector;
  return querySelector?.call(document, '#stage svg')?.getAttribute('data-layout-engine') ?? null;
}

function fittedStageViewBox(document: Document): string | null {
  const querySelector = (document as Document & {
    querySelector?: (selector: string) => Element | null;
  }).querySelector;
  const value = querySelector?.call(document, '#stage svg')?.getAttribute('viewBox') ?? null;
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : null;
}

function stageGeometrySignature(document: Document): string | null {
  const querySelectorAll = (document as Document & {
    querySelectorAll?: (selector: string) => ArrayLike<Element>;
  }).querySelectorAll;
  const elements = querySelectorAll?.call(document, '#dg-frame-layer [data-component-id]');
  if (!elements || elements.length === 0) {
    return null;
  }
  const signature = Array.from(elements)
    .map((element) => {
      const graphicsElement = element as Element & {
        getBBox?: () => { x: number; y: number; width: number; height: number };
      };
      if (typeof graphicsElement.getBBox !== 'function') {
        return null;
      }
      const box = graphicsElement.getBBox();
      const round = (value: number) => Math.round(value * 1000) / 1000;
      return {
        id: element.getAttribute('data-component-id') ?? '',
        x: round(box.x),
        y: round(box.y),
        w: round(box.width),
        h: round(box.height),
      };
    })
    .filter((entry): entry is { id: string; x: number; y: number; w: number; h: number } => {
      if (!entry) {
        return false;
      }
      return Boolean(entry.id) && entry.w > 0 && entry.h > 0;
    })
    .sort((left, right) => left.id.localeCompare(right.id));
  return signature.length > 0 ? JSON.stringify(signature) : null;
}

function selectedEngineTab(tabs: HTMLElement | null): string | null {
  const selected = getTabButtons(tabs)
    .find((button) => button.getAttribute('aria-selected') === 'true');
  return selected?.getAttribute('data-engine-id') ?? null;
}

function commitFrameTreeLayoutEngine(
  previewWindow: PreviewEngineWorkspaceRuntimeWindow,
  layoutEngine: string | null | undefined,
): string | null {
  const setter = previewWindow.setFrameTreeLayoutEngine
    ?? previewWindow.__DG_previewBridgeHostRuntime?.setFrameTreeLayoutEngine
    ?? null;
  const committed = typeof setter === 'function' ? setter(layoutEngine) : null;
  commitPreviewRenderIntentToWindow(previewWindow, {
    current: previewWindow.__DG_previewRenderIntent ?? null,
    activeEngineId: committed,
  });
  return committed;
}

export function hasUnsavedPreviewEngineWorkspaceChange(
  previewWindow: PreviewEngineWorkspaceRuntimeWindow,
): boolean {
  const workspace = getPreviewEngineWorkspaceRuntimeState(previewWindow);
  return Boolean(workspace && workspace.activeEngineId !== workspace.persistedEngineId);
}

export function collectPreviewEngineWorkspaceSavePayload(
  previewWindow: PreviewEngineWorkspaceRuntimeWindow,
  basePayload: Record<string, unknown>,
): Record<string, unknown> {
  const workspace = getPreviewEngineWorkspaceRuntimeState(previewWindow);
  if (!workspace?.activeEngineId) {
    return { ...basePayload };
  }
  return {
    ...basePayload,
    layout_engine: workspace.activeEngineId,
  };
}

export function persistPreviewEngineWorkspaceRuntimeState(
  previewWindow: PreviewEngineWorkspaceRuntimeWindow,
): PreviewEngineWorkspaceState | null {
  const workspace = getPreviewEngineWorkspaceRuntimeState(previewWindow);
  if (!workspace) {
    return null;
  }
  const nextWorkspace = setRuntimeWorkspaceState(
    previewWindow,
    persistPreviewEngineWorkspaceActiveEngine(workspace),
  );
  previewWindow.__DG_syncPreviewEngineWorkspaceChrome?.();
  return nextWorkspace;
}

function setControlDisabled(control: HTMLElement | null, disabled: boolean): void {
  if (control && 'disabled' in control) {
    (control as HTMLButtonElement | HTMLSelectElement).disabled = disabled;
  }
}

function getTabButtons(tabs: HTMLElement | null): HTMLButtonElement[] {
  return (tabs
    ? Array.from(tabs.querySelectorAll('button[data-engine-id]'))
    : []
  ).filter(
    (value): value is HTMLButtonElement =>
      Boolean(value)
      && typeof (value as { tagName?: unknown }).tagName === 'string'
      && String((value as { tagName: string }).tagName).toLowerCase() === 'button',
  );
}

function tabButtonEngineId(button: HTMLButtonElement | null | undefined): string {
  return String(button?.getAttribute('data-engine-id') ?? '').trim();
}

function resolveRelativeTabIndex(
  buttons: readonly HTMLButtonElement[],
  currentIndex: number,
  offset: number,
): number {
  if (!buttons.length) {
    return -1;
  }
  const boundedCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
  return (boundedCurrentIndex + offset + buttons.length) % buttons.length;
}

function setHelpText(help: HTMLElement | null, message: string, isError: boolean): void {
  if (!help) {
    return;
  }
  help.textContent = message;
  help.classList.toggle('is-error', isError);
}

function equivalentGeometryHelpMessage(
  previousWorkspace: PreviewEngineWorkspaceState,
  nextWorkspace: PreviewEngineWorkspaceState,
): string {
  const previousLabel = previousWorkspace.activeEngine?.label
    ?? previousWorkspace.activeEngineId
    ?? 'the previous engine';
  const nextLabel = nextWorkspace.activeEngine?.label
    ?? nextWorkspace.activeEngineId
    ?? 'the selected engine';
  return `Switched to ${nextLabel}. Geometry matches ${previousLabel} at current settings; adjust engine parameters to force divergence.`;
}

function setActiveEngineLabel(
  labelEl: HTMLElement | null,
  workspace: PreviewEngineWorkspaceState,
  fallbackLabel: string | null | undefined,
  visible: boolean,
): void {
  if (!labelEl) {
    return;
  }
  const label = String(fallbackLabel ?? '').trim()
    || workspace.activeEngine?.label
    || workspace.activeEngineId
    || '';
  labelEl.textContent = label ? `Engine: ${label}` : '';
  labelEl.hidden = !visible || !label;
}

export function initPreviewEngineWorkspaceChrome(
  options: InitPreviewEngineWorkspaceChromeOptions,
): PreviewEngineWorkspaceState {
  const config = options.previewWindow.__DG_CONFIG ?? null;
  let workspace = setRuntimeWorkspaceState(options.previewWindow, resolveWorkspace(config));
  const section = options.document.getElementById('engine-switcher-section');
  const help = options.document.getElementById('engine-switcher-help');
  const labelEl = options.document.getElementById('active-engine-label');
  const tabs = options.document.getElementById('engine-switcher-tabs');

  if (!section || !tabs) {
    setActiveEngineLabel(labelEl, workspace, config?.active_engine_label, true);
    return workspace;
  }

  const shouldShowSwitcher = Boolean(config?.show_engine_switcher)
    || workspace.invalidPersistedEngine;
  const hasTabRail = shouldShowSwitcher && workspace.compatibleEngineIds.length > 1;
  if (!hasTabRail) {
    section.hidden = true;
    setActiveEngineLabel(labelEl, workspace, config?.active_engine_label, true);
    return workspace;
  }

  section.hidden = false;
  setActiveEngineLabel(labelEl, workspace, config?.active_engine_label, false);
  tabs.setAttribute('role', 'tablist');
  let keyboardFocusEngineId: string | null = workspace.activeEngineId;
  const setPending = (pending: boolean) => {
    getTabButtons(tabs).forEach((control) => setControlDisabled(control, pending));
  };
  const defaultHelp = help?.textContent ?? '';
  const updateNavigation = () => {
    setActiveEngineLabel(
      labelEl,
      workspace,
      options.previewWindow.__DG_CONFIG?.active_engine_label ?? config?.active_engine_label,
      !hasTabRail,
    );
    if (tabs) {
      const compatibleIds = new Set(workspace.compatibleEngineIds);
      if (keyboardFocusEngineId && !compatibleIds.has(keyboardFocusEngineId)) {
        keyboardFocusEngineId = workspace.activeEngineId;
      }
      const rovingEngineId = keyboardFocusEngineId ?? workspace.activeEngineId;
      getTabButtons(tabs).forEach((button) => {
        const engineId = tabButtonEngineId(button);
        const active = engineId === workspace.activeEngineId;
        button.className = `bf-tabs-link${active ? ' is-active' : ''}`;
        button.setAttribute('aria-selected', active ? 'true' : 'false');
        button.tabIndex = engineId === rovingEngineId ? 0 : -1;
      });
    }
    if (workspace.activeEngineId !== workspace.persistedEngineId) {
      setHelpText(help, 'Selected engine is unsaved until you save this document.', false);
    } else if (defaultHelp) {
      setHelpText(help, defaultHelp, false);
    }
  };
  const syncWorkspaceUi = () => {
    setRuntimeWorkspaceState(options.previewWindow, workspace);
    options.previewWindow.__DG_syncPreviewEngineWorkspacePanels?.();
    options.previewWindow.PreviewSaveClient?.syncSaveButton?.();
    updateNavigation();
  };
  options.previewWindow.__DG_syncPreviewEngineWorkspaceChrome = () => {
    const nextWorkspace = getPreviewEngineWorkspaceRuntimeState(options.previewWindow);
    if (!nextWorkspace) {
      return;
    }
    workspace = nextWorkspace;
    syncWorkspaceUi();
  };
  const switchTo = async (engineId: string) => {
    const nextEngineId = String(engineId || '').trim();
    workspace = getPreviewEngineWorkspaceRuntimeState(options.previewWindow) ?? workspace;
    if (!nextEngineId || nextEngineId === workspace.activeEngineId) {
      return;
    }
    const tabEngineIds = new Set(workspace.tabs.map((tab) => tab.engineId));
    const engineIsSelectable = tabEngineIds.has(nextEngineId);
    const transaction = resolveEditorMutationTransaction({
      kind: 'engine-tab',
      sourceControl: 'engine-switcher-tabs',
      activeEngineId: workspace.activeEngineId,
      documentKind: options.previewWindow.__DG_CONFIG?.document_kind ?? null,
      capabilityGate: {
        applicable: engineIsSelectable,
        reason: engineIsSelectable
          ? 'engine is compatible with this preview document'
          : `engine '${nextEngineId}' is not compatible with this preview document`,
        capability: 'layoutEngine',
      },
      renderIntentDelta: {
        engineId: nextEngineId,
        changed: true,
      },
      persistenceDelta: {
        frameTreeChanged: true,
        savePayloadChanged: true,
      },
      relayoutPolicy: 'fresh-render',
      dirtyPolicy: 'mark-dirty',
      undoPolicy: 'none',
    });
    options.previewWindow.__DG_lastEditorMutationStateViolations = [];
    if (transaction.kind !== 'committed') {
      options.previewWindow.__DG_lastEditorMutationTransactionResult = transaction;
      setHelpText(help, transaction.reason, transaction.kind === 'rejected');
      return;
    }
    setPending(true);
    const previousWorkspace = workspace;
    const previousFrameTreeLayoutEngine = readFrameTreeLayoutEngine(options.previewWindow)
      ?? previousWorkspace.activeEngineId;
    const previousGeometrySignature = stageGeometrySignature(options.document);
    const previousFittedViewBox = fittedStageViewBox(options.document);
    try {
      workspace = setPreviewEngineWorkspaceActiveEngine(workspace, nextEngineId);
      keyboardFocusEngineId = nextEngineId;
      const committedLayoutEngine = commitFrameTreeLayoutEngine(options.previewWindow, nextEngineId);
      if (committedLayoutEngine !== nextEngineId) {
        throw new Error(`Unable to commit preview layout engine '${nextEngineId}' before render.`);
      }
      syncWorkspaceUi();
      await options.previewWindow.__DG_rerenderPreviewEngineWorkspaceStage?.();
      options.previewWindow.__DG_syncPreviewEngineWorkspacePanels?.();
      options.previewWindow.PreviewSaveClient?.syncSaveButton?.();
      options.previewWindow.__DG_lastEditorMutationTransactionResult = transaction;
      const nextGeometrySignature = stageGeometrySignature(options.document);
      const nextRenderedEngine = renderedStageLayoutEngine(options.document);
      options.previewWindow.__DG_lastEditorMutationStateViolations = compareEditorMutationStateVector({
        transaction,
        before: {
          activeNodeId: previousWorkspace.activeEngineId,
          fittedViewBox: previousFittedViewBox,
        },
        after: {
          activeTab: selectedEngineTab(tabs),
          activeNodeId: workspace.activeEngineId,
          renderIntentEngineId: resolvePreviewRenderIntentLayoutEngine({
            intent: options.previewWindow.__DG_previewRenderIntent ?? null,
          }),
          frameTreeLayoutEngine: readFrameTreeLayoutEngine(options.previewWindow),
          activeOptionBucket: resolvePreviewRenderIntentLayoutEngine({
            intent: options.previewWindow.__DG_previewRenderIntent ?? null,
          }),
          renderedEngine: nextRenderedEngine,
          fittedViewBox: fittedStageViewBox(options.document),
          dirty: options.previewWindow.PreviewSaveClient?.isDirty?.() ?? null,
        },
        expectStableCanvas: Boolean(
          previousGeometrySignature
          && nextGeometrySignature
          && previousGeometrySignature === nextGeometrySignature,
        ),
      });
      if (
        previousGeometrySignature
        && nextGeometrySignature
        && previousGeometrySignature === nextGeometrySignature
        && nextRenderedEngine === nextEngineId
      ) {
        setHelpText(help, equivalentGeometryHelpMessage(previousWorkspace, workspace), false);
      }
    } catch (error) {
      workspace = previousWorkspace;
      keyboardFocusEngineId = previousWorkspace.activeEngineId;
      commitFrameTreeLayoutEngine(options.previewWindow, previousFrameTreeLayoutEngine);
      syncWorkspaceUi();
      setHelpText(
        help,
        error instanceof Error ? error.message : 'Failed to switch preview engine.',
        true,
      );
      options.previewWindow.__DG_lastEditorMutationTransactionResult = resolveEditorMutationTransaction({
        kind: 'engine-tab',
        sourceControl: 'engine-switcher-tabs',
        activeEngineId: previousWorkspace.activeEngineId,
        documentKind: options.previewWindow.__DG_CONFIG?.document_kind ?? null,
        capabilityGate: {
          applicable: true,
          reason: 'engine switch rolled back after commit failure',
          capability: 'layoutEngine',
        },
        relayoutPolicy: 'fresh-render',
        dirtyPolicy: 'preserve',
        undoPolicy: 'none',
        rejectReason: error instanceof Error ? error.message : 'Failed to switch preview engine.',
      });
      options.previewWindow.__DG_lastEditorMutationStateViolations = [];
    } finally {
      setPending(false);
    }
  };

  tabs.replaceChildren();
  for (const tab of workspace.tabs) {
    const tabItem = options.document.createElement('li');
    tabItem.className = 'bf-tabs-item';
    const tabButton = options.document.createElement('button');
    tabButton.type = 'button';
    tabButton.className = `bf-tabs-link${tab.active ? ' is-active' : ''}`;
    tabButton.textContent = tab.engine.label;
    tabButton.setAttribute('data-engine-id', tab.engineId);
    tabButton.setAttribute('role', 'tab');
    tabButton.setAttribute('aria-selected', tab.active ? 'true' : 'false');
    tabButton.tabIndex = tab.active ? 0 : -1;
    tabItem.appendChild(tabButton);
    tabs.appendChild(tabItem);
  }
  syncWorkspaceUi();
  getTabButtons(tabs).forEach((button) => {
    button.addEventListener('focus', () => {
      keyboardFocusEngineId = tabButtonEngineId(button) || keyboardFocusEngineId;
      updateNavigation();
    });
    button.addEventListener('keydown', (event) => {
      const keyboardEvent = event as KeyboardEvent;
      const buttons = getTabButtons(tabs);
      const currentIndex = buttons.indexOf(button);
      let nextIndex = -1;
      if (keyboardEvent.key === 'ArrowRight' || keyboardEvent.key === 'ArrowDown') {
        nextIndex = resolveRelativeTabIndex(buttons, currentIndex, 1);
      } else if (keyboardEvent.key === 'ArrowLeft' || keyboardEvent.key === 'ArrowUp') {
        nextIndex = resolveRelativeTabIndex(buttons, currentIndex, -1);
      } else if (keyboardEvent.key === 'Home') {
        nextIndex = buttons.length ? 0 : -1;
      } else if (keyboardEvent.key === 'End') {
        nextIndex = buttons.length ? buttons.length - 1 : -1;
      } else if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
        keyboardEvent.preventDefault();
        void switchTo(tabButtonEngineId(button));
        return;
      } else {
        return;
      }
      keyboardEvent.preventDefault();
      const nextButton = nextIndex >= 0 ? buttons[nextIndex] : null;
      keyboardFocusEngineId = tabButtonEngineId(nextButton) || keyboardFocusEngineId;
      updateNavigation();
      nextButton?.focus();
    });
    button.addEventListener('click', async () => {
      const engineId = tabButtonEngineId(button);
      await switchTo(engineId);
    });
  });

  return workspace;
}
