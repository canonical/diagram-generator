import { getPreviewEngineByLayoutKey } from '../preview-engine/registry.js';
import {
  createPreviewEngineWorkspaceState,
  type PreviewEngineWorkspaceState,
} from './preview-engine-workspace.js';

export interface PreviewEngineWorkspaceChromeConfig {
  readonly slug?: string | null;
  readonly layout_engine?: string | null;
  readonly active_engine_id?: string | null;
  readonly active_engine_label?: string | null;
  readonly persisted_layout_engine?: string | null;
  readonly compatible_engines?: readonly string[] | null;
  readonly show_engine_switcher?: boolean | null;
}

export interface InitPreviewEngineWorkspaceChromeOptions {
  readonly document: Document;
  readonly previewWindow: Window & typeof globalThis & {
    __DG_CONFIG?: PreviewEngineWorkspaceChromeConfig | null;
  };
  readonly fetchFn?: typeof fetch;
}

function asHtmlButtonElement(
  value: HTMLElement | null,
): HTMLButtonElement | null {
  return value && value.tagName.toLowerCase() === 'button' ? value as HTMLButtonElement : null;
}

function asHtmlSelectElement(
  value: HTMLElement | null,
): HTMLSelectElement | null {
  return value && value.tagName.toLowerCase() === 'select' ? value as HTMLSelectElement : null;
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

function setControlDisabled(control: HTMLElement | null, disabled: boolean): void {
  if (control && 'disabled' in control) {
    (control as HTMLButtonElement | HTMLSelectElement).disabled = disabled;
  }
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

async function postLayoutEngineChoice(options: {
  slug: string;
  engineId: string;
  fetchFn: typeof fetch;
}): Promise<void> {
  const response = await options.fetchFn(`/api/overrides/${encodeURIComponent(options.slug)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ layout_engine: options.engineId }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText || 'Unknown error');
  }
}

export function initPreviewEngineWorkspaceChrome(
  options: InitPreviewEngineWorkspaceChromeOptions,
): PreviewEngineWorkspaceState {
  const config = options.previewWindow.__DG_CONFIG ?? null;
  const workspace = resolveWorkspace(config);
  const section = options.document.getElementById('engine-switcher-section');
  const help = options.document.getElementById('engine-switcher-help');
  const labelEl = options.document.getElementById('active-engine-label');
  const select = asHtmlSelectElement(
    options.document.getElementById('engine-switcher'),
  );
  const prevButton = asHtmlButtonElement(
    options.document.getElementById('engine-switcher-prev'),
  );
  const nextButton = asHtmlButtonElement(
    options.document.getElementById('engine-switcher-next'),
  );
  const tabs = options.document.getElementById('engine-switcher-tabs');

  setActiveEngineLabel(labelEl, workspace, config?.active_engine_label);

  if (!section || !select) {
    return workspace;
  }

  const shouldShowSwitcher = Boolean(config?.show_engine_switcher)
    || workspace.invalidPersistedEngine;
  if (!shouldShowSwitcher || workspace.compatibleEngineIds.length === 0) {
    section.hidden = true;
    return workspace;
  }

  section.hidden = false;
  select.replaceChildren();
  tabs?.replaceChildren();

  for (const tab of workspace.tabs) {
    const option = options.document.createElement('option');
    option.value = tab.engineId;
    option.textContent = tab.engine.label;
    option.selected = tab.active;
    select.append(option);

    if (tabs) {
      const tabButton = options.document.createElement('button');
      tabButton.type = 'button';
      tabButton.className = `bf-button is-base${tab.active ? ' is-active' : ''}`;
      tabButton.textContent = tab.engine.label;
      tabButton.setAttribute('data-engine-id', tab.engineId);
      tabButton.setAttribute('aria-pressed', tab.active ? 'true' : 'false');
      tabs.appendChild(tabButton);
    }
  }

  const controls = [
    select,
    prevButton,
    nextButton,
    ...Array.from(tabs?.querySelectorAll?.('button[data-engine-id]') ?? []),
  ].filter((value): value is HTMLElement => Boolean(value));
  const setPending = (pending: boolean) => {
    controls.forEach((control) => setControlDisabled(control, pending));
  };
  const defaultHelp = help?.textContent ?? '';
  const updateNavigation = () => {
    setControlDisabled(prevButton, workspace.navigation.prevEngineId == null);
    setControlDisabled(nextButton, workspace.navigation.nextEngineId == null);
    if (workspace.compatibleEngineIds.length === 1) {
      setHelpText(help, 'This document has a single compatible engine.', false);
      setControlDisabled(select, true);
    } else if (defaultHelp) {
      setHelpText(help, defaultHelp, false);
    }
  };
  const switchTo = async (engineId: string) => {
    const nextEngineId = String(engineId || '').trim();
    if (!nextEngineId || nextEngineId === workspace.activeEngineId) {
      return;
    }
    setPending(true);
    setHelpText(help, 'Switching engine...', false);
    try {
      await postLayoutEngineChoice({
        slug: String(config?.slug ?? ''),
        engineId: nextEngineId,
        fetchFn: options.fetchFn ?? options.previewWindow.fetch.bind(options.previewWindow),
      });
      options.previewWindow.location.reload();
    } catch (error) {
      select.value = workspace.activeEngineId ?? '';
      updateNavigation();
      setHelpText(help, `Switch failed: ${String(error)}`, true);
    } finally {
      setPending(false);
    }
  };

  updateNavigation();
  select.value = workspace.activeEngineId ?? '';
  select.addEventListener('change', () => {
    void switchTo(select.value);
  });
  prevButton?.addEventListener('click', () => {
    if (workspace.navigation.prevEngineId) {
      void switchTo(workspace.navigation.prevEngineId);
    }
  });
  nextButton?.addEventListener('click', () => {
    if (workspace.navigation.nextEngineId) {
      void switchTo(workspace.navigation.nextEngineId);
    }
  });
  tabs?.querySelectorAll('button[data-engine-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const engineId = button.getAttribute('data-engine-id') ?? '';
      void switchTo(engineId);
    });
  });

  return workspace;
}
