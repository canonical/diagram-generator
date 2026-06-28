import { getPreviewEngineByLayoutKey } from '../preview-engine/registry.js';
import {
  createPreviewEngineWorkspaceState,
  persistPreviewEngineWorkspaceActiveEngine,
  setPreviewEngineWorkspaceActiveEngine,
  type PreviewEngineWorkspaceState,
} from './preview-engine-workspace.js';

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
  __DG_previewEngineWorkspaceState?: PreviewEngineWorkspaceRuntimeState | null;
  __DG_syncPreviewEngineWorkspaceChrome?: (() => void) | null;
  __DG_syncPreviewEngineWorkspacePanels?: (() => void) | null;
  __DG_rerenderPreviewEngineWorkspaceStage?: (() => Promise<unknown> | unknown) | null;
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

function setHelpText(help: HTMLElement | null, message: string, isError: boolean): void {
  if (!help) {
    return;
  }
  help.textContent = message;
  help.classList.toggle('is-error', isError);
}

function setActiveEngineLabel(
  labelEl: HTMLElement | null,
  workspace: PreviewEngineWorkspaceState,
  fallbackLabel: string | null | undefined,
): void {
  if (!labelEl) {
    return;
  }
  const label = String(fallbackLabel ?? '').trim()
    || workspace.activeEngine?.label
    || workspace.activeEngineId
    || '';
  labelEl.textContent = label ? `Engine: ${label}` : '';
  labelEl.hidden = !label;
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
  setActiveEngineLabel(labelEl, workspace, config?.active_engine_label);

  if (!section || !tabs) {
    return workspace;
  }

  const shouldShowSwitcher = Boolean(config?.show_engine_switcher)
    || workspace.invalidPersistedEngine;
  if (!shouldShowSwitcher || workspace.compatibleEngineIds.length <= 1) {
    section.hidden = true;
    return workspace;
  }

  section.hidden = false;
  const setPending = (pending: boolean) => {
    getTabButtons(tabs).forEach((control) => setControlDisabled(control, pending));
  };
  const defaultHelp = help?.textContent ?? '';
  const updateNavigation = () => {
    setActiveEngineLabel(
      labelEl,
      workspace,
      options.previewWindow.__DG_CONFIG?.active_engine_label ?? config?.active_engine_label,
    );
    if (tabs) {
      getTabButtons(tabs).forEach((button) => {
        const engineId = button.getAttribute('data-engine-id') ?? '';
        const active = engineId === workspace.activeEngineId;
        button.className = `bf-tabs-link${active ? ' is-active' : ''}`;
        button.setAttribute('aria-selected', active ? 'true' : 'false');
        button.tabIndex = active ? 0 : -1;
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
    if (!nextEngineId || nextEngineId === workspace.activeEngineId) {
      return;
    }
    setPending(true);
    const previousWorkspace = workspace;
    try {
      workspace = setPreviewEngineWorkspaceActiveEngine(workspace, nextEngineId);
      syncWorkspaceUi();
      await options.previewWindow.__DG_rerenderPreviewEngineWorkspaceStage?.();
      options.previewWindow.__DG_syncPreviewEngineWorkspacePanels?.();
      options.previewWindow.PreviewSaveClient?.syncSaveButton?.();
    } catch (error) {
      workspace = previousWorkspace;
      syncWorkspaceUi();
      setHelpText(
        help,
        error instanceof Error ? error.message : 'Failed to switch preview engine.',
        true,
      );
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
    button.addEventListener('click', async () => {
      const engineId = button.getAttribute('data-engine-id') ?? '';
      await switchTo(engineId);
    });
  });

  return workspace;
}
