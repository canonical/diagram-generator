import type { PreviewControlSpec, PreviewEngineManifest } from './types.js';

type PreviewEngineSidebarGroup = {
  group: string;
  specs: PreviewControlSpec[];
};

type PreviewControlElement = {
  id?: string;
  value?: string;
  checked?: boolean;
  dataset: Record<string, string>;
  addEventListener: (type: string, listener: () => void) => void;
};

export interface PreviewElkLayoutControlsDocumentLike {
  getElementById: (id: string) => (PreviewControlElement & {
    hidden?: boolean;
    textContent?: string;
    innerHTML?: string;
    hasAttribute?: (name: string) => boolean;
    querySelector?: (selector: string) => unknown;
    querySelectorAll?: (selector: string) => PreviewControlElement[];
  }) | null;
}

export interface PreviewElkLayoutControlsWindowLike {
  __DG_CONFIG?: { layout_engine?: string };
  __DG_previewEngineRawView?: boolean;
  __DG_previewEngineDebugOverlay?: boolean;
  __DG_setPreviewEngineRawView?: (enabled: boolean) => void;
  __DG_setPreviewEngineDebugOverlay?: (enabled: boolean) => void;
  __DG_elkRawView?: boolean;
  __DG_elkDebugOverlay?: boolean;
  __DG_setElkRawView?: (enabled: boolean) => void;
  __DG_setElkDebugOverlay?: (enabled: boolean) => void;
  PreviewEngineShellController?: {
    wirePanel?: () => void;
    applyLayoutOverrides?: (value: Record<string, unknown>) => void;
    applyElkLayoutOverrides?: (value: Record<string, unknown>) => void;
    requestRelayout?: () => Promise<unknown> | unknown;
    isActiveLayoutEngine?: (frameTreeJson?: unknown) => boolean;
    isElkLayeredDiagram?: (frameTreeJson?: unknown) => boolean;
  };
  ElkPreviewController?: {
    wirePanel?: () => void;
    applyElkLayoutOverrides?: (value: Record<string, unknown>) => void;
    requestRelayout?: () => Promise<unknown> | unknown;
    isElkLayeredDiagram?: (frameTreeJson?: unknown) => boolean;
  };
  requestPreviewEngineRelayout?: () => unknown;
  requestElkRelayout?: () => unknown;
  requestLayoutRelayout?: (rootId: string) => unknown;
  requestV3Relayout?: (rootId: string) => unknown;
  setDirty?: (dirty: boolean) => void;
}

export interface PreviewElkLayoutControlsRuntimeOptions {
  document: PreviewElkLayoutControlsDocumentLike;
  previewWindow: PreviewElkLayoutControlsWindowLike;
  layoutEngineRoot?: {
    previewEngines?: {
      registry?: {
        resolvePreviewEngine?: (context: { layoutEngine?: string | null; shellMode?: string | null }) => PreviewEngineManifest | null;
        listPreviewEnginesBySidebarSection?: (section: string) => PreviewEngineManifest[];
        listPreviewEngines?: () => PreviewEngineManifest[];
      };
      elk?: {
        elkParamGroups?: () => PreviewEngineSidebarGroup[];
        ELK_LAYERED_PARAM_SPECS?: PreviewControlSpec[];
      };
    };
    listPreviewEngines?: () => PreviewEngineManifest[];
    resolvePreviewEngine?: (context: { layoutEngine?: string | null; shellMode?: string | null }) => PreviewEngineManifest | null;
    elkParamGroups?: () => PreviewEngineSidebarGroup[];
    ELK_LAYERED_PARAM_SPECS?: PreviewControlSpec[];
  } | null;
  setTimeoutFn?: (callback: () => void, delayMs: number) => unknown;
  clearTimeoutFn?: (token: unknown) => void;
  getFrameTreeJson?: (() => unknown) | null;
  sidebarSectionId?: string;
  sectionId?: string;
  containerId?: string;
  controlIdPrefix?: string;
  defaultPersistNamespace?: string;
  enableElkViewToggles?: boolean;
  unavailableMessage?: string;
  getDirtySetter?: (() => ((dirty: boolean) => void) | undefined) | null;
}

export interface PreviewElkLayoutControlsRuntimeInitOptions {
  getOverrides?: () => Record<string, unknown>;
  setOverrides?: (value: Record<string, unknown>) => void;
}

export interface PreviewElkLayoutControlsRuntime {
  init: (options?: PreviewElkLayoutControlsRuntimeInitOptions | null) => void;
  buildPanel: (frameTreeJson?: unknown) => void;
  refresh: () => void;
  collectOverrides: () => Record<string, unknown>;
  collectNamespacedOverrides: () => Record<string, Record<string, unknown>>;
}

interface PreviewEngineShellControllerLike {
  wirePanel?: () => void;
  applyLayoutOverrides?: (value: Record<string, unknown>) => void;
  applyElkLayoutOverrides?: (value: Record<string, unknown>) => void;
  requestRelayout?: () => Promise<unknown> | unknown;
  isActiveLayoutEngine?: (frameTreeJson?: unknown) => boolean;
  isElkLayeredDiagram?: (frameTreeJson?: unknown) => boolean;
}

function engineSupportsSidebarSection(engine: PreviewEngineManifest | null | undefined, section: string): boolean {
  return Boolean(
    engine
    && engine.hostView
    && Array.isArray(engine.hostView.sidebarSections)
    && engine.hostView.sidebarSections.includes(section),
  );
}

function previewEngineShellController(
  previewWindow: PreviewElkLayoutControlsWindowLike,
): PreviewEngineShellControllerLike | null {
  return (previewWindow.PreviewEngineShellController
    ?? previewWindow.ElkPreviewController
    ?? null) as PreviewEngineShellControllerLike | null;
}

function readPreviewEngineDebugOverlay(
  previewWindow: PreviewElkLayoutControlsWindowLike,
): boolean {
  if (typeof previewWindow.__DG_previewEngineDebugOverlay === 'boolean') {
    return previewWindow.__DG_previewEngineDebugOverlay;
  }
  return previewWindow.__DG_elkDebugOverlay === true;
}

function readPreviewEngineRawView(
  previewWindow: PreviewElkLayoutControlsWindowLike,
): boolean {
  if (typeof previewWindow.__DG_previewEngineRawView === 'boolean') {
    return previewWindow.__DG_previewEngineRawView;
  }
  return previewWindow.__DG_elkRawView === true;
}

export function createPreviewElkLayoutControlsRuntime(
  options: PreviewElkLayoutControlsRuntimeOptions,
): PreviewElkLayoutControlsRuntime {
  const sidebarSectionId = options.sidebarSectionId ?? 'elk-layout';
  const sectionId = options.sectionId ?? 'elk-layout-section';
  const containerId = options.containerId ?? 'elk-layout-controls';
  const controlIdPrefix = options.controlIdPrefix ?? 'elk';
  const defaultPersistNamespace = options.defaultPersistNamespace ?? 'meta.elk';
  const enableElkViewToggles = options.enableElkViewToggles ?? true;
  const unavailableMessage = options.unavailableMessage
    ?? 'Engine parameter registry unavailable. Rebuild the browser bundle from packages/layout-engine.';
  const setTimeoutFn = options.setTimeoutFn ?? ((callback: () => void, delayMs: number) => setTimeout(callback, delayMs));
  const clearTimeoutFn = options.clearTimeoutFn ?? ((token: unknown) => clearTimeout(token as number));
  let relayoutTimer: unknown = null;
  let getOverrides = () => ({});
  let setOverrides = (_value: Record<string, unknown>) => {};

  function resolvePreviewEngine(context: {
    layoutEngine?: string | null;
    shellMode?: string | null;
  }): PreviewEngineManifest | null {
    const registry = options.layoutEngineRoot?.previewEngines?.registry;
    return registry?.resolvePreviewEngine?.(context)
      ?? options.layoutEngineRoot?.resolvePreviewEngine?.(context)
      ?? null;
  }

  function previewEnginesBySidebarSection(section: string): PreviewEngineManifest[] {
    const registry = options.layoutEngineRoot?.previewEngines?.registry;
    const listed = registry?.listPreviewEnginesBySidebarSection?.(section);
    if (Array.isArray(listed) && listed.length > 0) {
      return listed;
    }
    const allListed = registry?.listPreviewEngines?.()
      ?? options.layoutEngineRoot?.listPreviewEngines?.()
      ?? [];
    return allListed.filter((engine) => engineSupportsSidebarSection(engine, section));
  }

  function layoutEngineFromFrameTree(frameTreeJson?: unknown): string | null {
    const tree = frameTreeJson as { layoutEngine?: string | null } | null | undefined;
    return tree?.layoutEngine ?? options.previewWindow.__DG_CONFIG?.layout_engine ?? null;
  }

  function activePreviewEngine(frameTreeJson?: unknown): PreviewEngineManifest | null {
    const layoutEngine = layoutEngineFromFrameTree(frameTreeJson);
    const active = resolvePreviewEngine({ layoutEngine, shellMode: 'grid' });
    if (engineSupportsSidebarSection(active, sidebarSectionId)) {
      return active;
    }
    return previewEnginesBySidebarSection(sidebarSectionId)[0] ?? null;
  }

  function isActiveLayoutEngine(frameTreeJson?: unknown): boolean {
    const controller = previewEngineShellController(options.previewWindow);
    if (typeof controller?.isActiveLayoutEngine === 'function') {
      return Boolean(controller.isActiveLayoutEngine(frameTreeJson));
    }
    if (typeof controller?.isElkLayeredDiagram === 'function') {
      return Boolean(controller.isElkLayeredDiagram(frameTreeJson));
    }
    const layoutEngine = layoutEngineFromFrameTree(frameTreeJson);
    if (engineSupportsSidebarSection(resolvePreviewEngine({ layoutEngine, shellMode: 'grid' }), sidebarSectionId)) {
      return true;
    }
    return false;
  }

  function setElkSectionActive(
    section: HTMLElement,
    active: boolean,
  ): void {
    section.hidden = !active;
    if ('inert' in section) {
      (section as HTMLElement & { inert: boolean }).inert = !active;
    }
    if (active) {
      section.removeAttribute?.('aria-hidden');
    } else {
      section.setAttribute?.('aria-hidden', 'true');
    }
    section
      .querySelectorAll?.<HTMLElement>('button, input, select, textarea, [tabindex]')
      .forEach((control) => {
        if (!active) {
          if (!control.hasAttribute('data-dg-elk-prev-tabindex')) {
            control.setAttribute(
              'data-dg-elk-prev-tabindex',
              control.getAttribute('tabindex') ?? '',
            );
          }
          control.setAttribute('tabindex', '-1');
          if ('disabled' in control && !(control as HTMLButtonElement).disabled) {
            control.setAttribute('data-dg-elk-disabled', '1');
            (control as HTMLButtonElement).disabled = true;
          }
          return;
        }
        if (control.hasAttribute('data-dg-elk-prev-tabindex')) {
          const previous = control.getAttribute('data-dg-elk-prev-tabindex');
          if (previous) {
            control.setAttribute('tabindex', previous);
          } else {
            control.removeAttribute('tabindex');
          }
          control.removeAttribute('data-dg-elk-prev-tabindex');
        }
        if (control.getAttribute('data-dg-elk-disabled') === '1') {
          if ('disabled' in control) {
            (control as HTMLButtonElement).disabled = false;
          }
          control.removeAttribute('data-dg-elk-disabled');
        }
      });
  }

  function containerHasPlaceholder(container: { innerHTML?: string | null }): boolean {
    return /%ELK_LAYOUT_CONTROLS_HTML%/.test(container.innerHTML || '');
  }

  function paramSpecs(frameTreeJson?: unknown): PreviewControlSpec[] {
    const engine = activePreviewEngine(frameTreeJson);
    if (engine && Array.isArray(engine.controlSpecs) && engine.controlSpecs.length > 0) {
      return engine.controlSpecs;
    }
    const contract = options.layoutEngineRoot?.previewEngines?.elk?.ELK_LAYERED_PARAM_SPECS;
    if (Array.isArray(contract) && contract.length > 0) {
      return contract;
    }
    const legacy = options.layoutEngineRoot?.ELK_LAYERED_PARAM_SPECS;
    return Array.isArray(legacy) ? legacy : [];
  }

  function groups(specs = paramSpecs()): PreviewEngineSidebarGroup[] {
    const contractGroups = options.layoutEngineRoot?.previewEngines?.elk?.elkParamGroups?.()
      ?? options.layoutEngineRoot?.elkParamGroups?.();
    const contractGroupKeys = new Set(
      (contractGroups ?? []).flatMap((group) => group.specs.map((spec) => spec.key)),
    );
    if (
      Array.isArray(contractGroups) &&
      contractGroups.length > 0 &&
      specs.every((spec) => contractGroupKeys.has(spec.key))
    ) {
      return contractGroups;
    }
    const buckets = new Map<string, PreviewControlSpec[]>();
    for (const spec of specs) {
      const list = buckets.get(spec.group) || [];
      list.push(spec);
      buckets.set(spec.group, list);
    }
    const order = ['Graph', 'Spacing', 'Edges', 'Layering', 'Compound'];
    return order
      .filter((group) => buckets.has(group))
      .map((group) => ({ group, specs: buckets.get(group) || [] }));
  }

  function controlId(spec: PreviewControlSpec): string {
    return `${controlIdPrefix}-${spec.key.replace(/\./g, '-')}`;
  }

  function persistNamespace(spec: PreviewControlSpec): string {
    return spec.persistNamespace || defaultPersistNamespace;
  }

  function controlDataAttrs(spec: PreviewControlSpec): string {
    const escapedKey = spec.key.replace(/"/g, '&quot;');
    const escapedNamespace = persistNamespace(spec).replace(/"/g, '&quot;');
    return ` data-dg-engine-layout-key="${escapedKey}" data-dg-persist-namespace="${escapedNamespace}" data-elk-key="${escapedKey}"`;
  }

  function fieldHtml(spec: PreviewControlSpec, value: unknown): string {
    const id = controlId(spec);
    const title = spec.description ? ` title="${spec.description.replace(/"/g, '&quot;')}"` : '';
    if (spec.kind === 'boolean') {
      const checked = value === 'true' || value === true;
      return (
        `<label class="bf-switch is-full-span"${title}>` +
        `<input class="bf-switch-input" type="checkbox" id="${id}"${controlDataAttrs(spec)}${checked ? ' checked' : ''}>` +
        '<span class="bf-switch-slider"></span>' +
        `<span class="bf-switch-label">${spec.label}</span>` +
        '</label>'
      );
    }
    if (spec.kind === 'enum' && spec.enumValues && spec.enumValues.length > 0) {
      const opts = spec.enumValues
        .map((entry) => (
          `<option value="${entry.value}"${entry.value === value ? ' selected' : ''}>${entry.label}</option>`
        ))
        .join('');
      return (
        `<label class="bf-field dg-grid-field is-full-span"${title}>` +
        `<span class="bf-form-label">${spec.label}</span>` +
        '<span class="bf-control dg-grid-control">' +
        `<select class="bf-input" id="${id}"${controlDataAttrs(spec)}>${opts}</select>` +
        '</span></label>'
      );
    }
    const step = spec.step != null ? ` step="${spec.step}"` : '';
    const min = spec.min != null ? ` min="${spec.min}"` : '';
    const max = spec.max != null ? ` max="${spec.max}"` : '';
    const unit = spec.kind === 'number' ? '<span class="dg-grid-unit">px</span>' : '';
    const type = spec.kind === 'number' ? 'number' : 'text';
    return (
      `<label class="bf-field dg-grid-field is-full-span"${title}>` +
      `<span class="bf-form-label">${spec.label}</span>` +
      '<span class="bf-control dg-grid-control">' +
      `<input class="bf-input dg-number-input" type="${type}" id="${id}"${controlDataAttrs(spec)} value="${String(value ?? spec.defaultValue).replace(/"/g, '&quot;')}"${step}${min}${max}>` +
      `${unit}</span></label>`
    );
  }

  function readControlValue(element: PreviewControlElement, spec: PreviewControlSpec): string {
    if (spec.kind === 'boolean') {
      return element.checked ? 'true' : 'false';
    }
    return String(element.value ?? '').trim();
  }

  function collectOverridesFromDom(frameTreeJson?: unknown): Record<string, unknown> {
    const next: Record<string, unknown> = {};
    for (const spec of paramSpecs(frameTreeJson)) {
      const element = options.document.getElementById(controlId(spec)) as PreviewControlElement | null;
      if (!element) {
        continue;
      }
      next[spec.key] = readControlValue(element, spec);
    }
    return next;
  }

  function collectOverrides(): Record<string, unknown> {
    const frameTreeJson = options.getFrameTreeJson?.();
    if (!isActiveLayoutEngine(frameTreeJson)) {
      return {};
    }
    return collectOverridesFromDom(frameTreeJson);
  }

  function collectNamespacedOverrides(): Record<string, Record<string, unknown>> {
    const frameTreeJson = options.getFrameTreeJson?.();
    if (!isActiveLayoutEngine(frameTreeJson)) {
      return {};
    }
    const next: Record<string, Record<string, unknown>> = {};
    for (const spec of paramSpecs(frameTreeJson)) {
      const element = options.document.getElementById(controlId(spec)) as PreviewControlElement | null;
      if (!element) {
        continue;
      }
      const namespace = persistNamespace(spec);
      next[namespace] = next[namespace] ?? {};
      next[namespace]![spec.key] = readControlValue(element, spec);
    }
    return next;
  }

  function onControlInput(): void {
    const frameTreeJson = options.getFrameTreeJson?.();
    if (!isActiveLayoutEngine(frameTreeJson)) {
      return;
    }
    const controller = previewEngineShellController(options.previewWindow);
    controller?.wirePanel?.();
    const next = collectOverridesFromDom(frameTreeJson);
    setOverrides(next);
    if (typeof controller?.applyLayoutOverrides === 'function') {
      controller.applyLayoutOverrides(next);
    } else {
      controller?.applyElkLayoutOverrides?.(next);
    }
    const dirtySetter = options.getDirtySetter?.() ?? options.previewWindow.setDirty;
    dirtySetter?.(true);
    if (relayoutTimer) {
      clearTimeoutFn(relayoutTimer);
    }
    relayoutTimer = setTimeoutFn(() => {
      const scheduledController = previewEngineShellController(options.previewWindow);
      if (typeof scheduledController?.requestRelayout === 'function') {
        void scheduledController.requestRelayout();
        return;
      }
      if (typeof options.previewWindow.requestPreviewEngineRelayout === 'function') {
        options.previewWindow.requestPreviewEngineRelayout();
        return;
      }
      if (typeof options.previewWindow.requestElkRelayout === 'function') {
        options.previewWindow.requestElkRelayout();
        return;
      }
      if (typeof options.previewWindow.requestLayoutRelayout === 'function') {
        const frameTree = options.getFrameTreeJson?.() as { root?: { id?: string } } | null | undefined;
        options.previewWindow.requestLayoutRelayout(frameTree?.root?.id || 'root');
        return;
      }
      if (typeof options.previewWindow.requestV3Relayout === 'function') {
        const frameTree = options.getFrameTreeJson?.() as { root?: { id?: string } } | null | undefined;
        options.previewWindow.requestV3Relayout(frameTree?.root?.id || 'root');
      }
    }, 250);
  }

  function bindControls(container: { querySelectorAll?: (selector: string) => PreviewControlElement[] }): void {
    for (const element of container.querySelectorAll?.('[data-dg-engine-layout-key], [data-elk-key]') || []) {
      if (element.dataset.engineLayoutBound === '1' || element.dataset.elkBound === '1') {
        continue;
      }
      element.dataset.engineLayoutBound = '1';
      element.dataset.elkBound = '1';
      element.addEventListener('input', onControlInput);
      element.addEventListener('change', onControlInput);
    }
  }

  function syncExistingControls(
    container: { querySelectorAll?: (selector: string) => PreviewControlElement[] },
    resolved: Record<string, unknown>,
    specs = paramSpecs(options.getFrameTreeJson?.()),
  ): void {
    const activeId = (options.document as { activeElement?: { id?: string } }).activeElement?.id;
    for (const spec of specs) {
      const id = controlId(spec);
      const element = options.document.getElementById(id) as PreviewControlElement | null;
      if (!element || (activeId && activeId === id)) {
        continue;
      }
      const value = resolved[spec.key] ?? spec.defaultValue;
      if (spec.kind === 'boolean') {
        element.checked = value === 'true' || value === true;
      } else {
        element.value = String(value);
      }
    }
    bindControls(container);
  }

  function sidebarDisplayValues(
    merged: Record<string, unknown>,
    specs = paramSpecs(options.getFrameTreeJson?.()),
  ): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const spec of specs) {
      const raw = merged[spec.key];
      out[spec.key] = raw != null && String(raw) !== '' ? String(raw) : spec.defaultValue;
    }
    return out;
  }

  function bindElkViewToggles(section: {
    querySelector?: (selector: string) => unknown;
  }): void {
    const rawToggle = section.querySelector?.('#elk-raw-view-toggle') as (PreviewControlElement & {
      checked?: boolean;
    }) | null | undefined;
    if (!enableElkViewToggles) {
      return;
    }
    if (rawToggle && rawToggle.dataset.elkBound !== '1') {
      rawToggle.dataset.elkBound = '1';
      rawToggle.checked = readPreviewEngineRawView(options.previewWindow);
      rawToggle.addEventListener('change', () => {
        if (typeof options.previewWindow.__DG_setPreviewEngineRawView === 'function') {
          options.previewWindow.__DG_setPreviewEngineRawView(Boolean(rawToggle.checked));
          return;
        }
        options.previewWindow.__DG_setElkRawView?.(Boolean(rawToggle.checked));
      });
    }
    const debugToggle = section.querySelector?.('#elk-debug-overlay-toggle') as (PreviewControlElement & {
      checked?: boolean;
    }) | null | undefined;
    if (debugToggle && debugToggle.dataset.elkBound !== '1') {
      debugToggle.dataset.elkBound = '1';
      debugToggle.checked = readPreviewEngineDebugOverlay(options.previewWindow);
      debugToggle.addEventListener('change', () => {
        if (typeof options.previewWindow.__DG_setPreviewEngineDebugOverlay === 'function') {
          options.previewWindow.__DG_setPreviewEngineDebugOverlay(Boolean(debugToggle.checked));
          return;
        }
        options.previewWindow.__DG_setElkDebugOverlay?.(Boolean(debugToggle.checked));
      });
    }
  }

  function buildPanel(frameTreeJson?: unknown): void {
    const section = options.document.getElementById(sectionId) as {
      hidden?: boolean;
      querySelector?: (selector: string) => unknown;
      setAttribute?: (name: string, value: string) => void;
      removeAttribute?: (name: string) => void;
      querySelectorAll?: (selector: string) => PreviewControlElement[];
    } | null;
    const container = options.document.getElementById(containerId) as {
      innerHTML?: string;
      textContent?: string;
      querySelector?: (selector: string) => unknown;
      querySelectorAll?: (selector: string) => PreviewControlElement[];
    } | null;
    if (!section || !container) {
      return;
    }

    const active = isActiveLayoutEngine(frameTreeJson);
    setElkSectionActive(section as unknown as HTMLElement, active);
    if (!active) {
      return;
    }

    const hasServerControls = Boolean(container.querySelector?.('[data-dg-engine-layout-key], [data-elk-key]'));
    if (!frameTreeJson && hasServerControls) {
      bindControls(container);
      bindElkViewToggles(section);
      return;
    }
    if (!frameTreeJson) {
      return;
    }
    if (containerHasPlaceholder(container)) {
      container.textContent = '';
    }

    const specs = paramSpecs(frameTreeJson);
    if (specs.length === 0) {
      container.innerHTML = `<p class="bf-form-help">${unavailableMessage}</p>`;
      bindElkViewToggles(section);
      return;
    }

    const tree = frameTreeJson as {
      elkLayout?: Record<string, unknown>;
      engineLayout?: Record<string, Record<string, unknown>>;
    } | null;
    const namespaces = [...new Set(specs.map((spec) => persistNamespace(spec)))];
    const yamlEngine = namespaces.reduce<Record<string, unknown>>((acc, namespace) => ({
      ...acc,
      ...(tree?.engineLayout?.[namespace] || {}),
      ...(namespace === 'meta.elk' ? tree?.elkLayout || {} : {}),
    }), {});
    const session = getOverrides() || {};
    const merged = { ...yamlEngine, ...session };
    const display = sidebarDisplayValues(merged, specs);

    if (container.querySelector?.('[data-dg-engine-layout-key], [data-elk-key]')) {
      syncExistingControls(container, display, specs);
      bindElkViewToggles(section);
      return;
    }

    const parts: string[] = [];
    for (const group of groups(specs)) {
      parts.push(`<h3 class="dg-section-subheading bf-h6">${group.group}</h3>`);
      parts.push('<div class="grid-controls">');
      for (const spec of group.specs) {
        parts.push(fieldHtml(spec, display[spec.key] ?? spec.defaultValue));
      }
      parts.push('</div>');
    }
    container.innerHTML = parts.join('');
    bindControls(container);
    bindElkViewToggles(section);
  }

  return {
    init(initOptions) {
      getOverrides = initOptions?.getOverrides ?? (() => ({}));
      setOverrides = initOptions?.setOverrides ?? (() => {});
    },
    buildPanel,
    refresh() {
      buildPanel(options.getFrameTreeJson?.());
    },
    collectOverrides,
    collectNamespacedOverrides,
  };
}

export const createPreviewEngineLayoutControlsRuntime = createPreviewElkLayoutControlsRuntime;
