export interface PreviewGridEditorBrowserStateModel {
  overrides?: Record<string, Record<string, unknown>>;
  gridOverrides?: Record<string, unknown> | null;
  roots: Array<{ id?: string | null }>;
  get: (cid: string) => any;
  getParent: (cid: string) => any;
  getType: (cid: string) => string | null | undefined;
  cleanOverride: (cid: string) => void;
  setOverride: (cid: string, partial: Record<string, unknown>) => void;
  setWaypointOverride: (cid: string, waypoints: unknown[]) => void;
}

export interface PreviewGridEditorBrowserStateEditorState {
  setPendingGridAction: (action: unknown) => void;
}

export interface PreviewGridEditorBrowserStatePreviewSaveClient {
  setDirty: (dirty: boolean) => void;
}

export interface PreviewGridEditorBrowserStateConstraints {
  forComponent: (violations: unknown, cid: string) => unknown;
}

export interface PreviewGridEditorBrowserStateSceneFacade {
  clearPendingRelayout: () => void;
  applyLocalRestoreRefresh: (syncGridControls?: boolean) => void;
}

export interface PreviewGridEditorBrowserStateRelayoutContract {
  restorePreviewOverrideEntries: (options: {
    currentOverrides: Record<string, Record<string, unknown>>;
    entries: Record<string, unknown>;
  }) => Record<string, Record<string, unknown>>;
}

export interface PreviewGridEditorBrowserStateInteractionContract {
  normalizeSelectionGap: (gap: number, snapStep: number) => number;
}

export interface CreatePreviewGridEditorBrowserStateFromBrowserHostOptions {
  model: PreviewGridEditorBrowserStateModel;
  editorState: PreviewGridEditorBrowserStateEditorState;
  previewSaveClient: PreviewGridEditorBrowserStatePreviewSaveClient;
  constraints: PreviewGridEditorBrowserStateConstraints;
  lastViolationsState: {
    get: () => unknown;
  };
  overridesState: {
    get: () => Record<string, Record<string, unknown>>;
    set: (nextOverrides: Record<string, Record<string, unknown>>) => void;
  };
  invalidateOverrideBoundFacades: () => void;
  multiActionGapState: {
    get: () => number;
    set: (value: number) => void;
  };
  baselineStep: number;
  relayoutDelayMs?: number;
  getPreviewBridgeRelayoutContract: () => PreviewGridEditorBrowserStateRelayoutContract;
  getPreviewShellInteractionContract: () => PreviewGridEditorBrowserStateInteractionContract;
  getSceneFacade: () => PreviewGridEditorBrowserStateSceneFacade;
  getRequestLayoutRelayout: () => (cid: string) => void;
  getMultiActionGapInput: () => { value?: string | number } | null;
  setTimeoutFn: (callback: () => void, delayMs: number) => unknown;
  clearTimeoutFn: (timerId: unknown) => void;
}

export interface PreviewGridEditorBrowserState {
  replaceOverrides: (nextOverrides: Record<string, Record<string, unknown>> | null | undefined) => Record<string, Record<string, unknown>>;
  setDirty: (dirty: boolean) => void;
  pruneLinkedRootGridOverrides: () => void;
  restoreOverrideEntries: (entries: Record<string, unknown>) => void;
  clearPendingRestoreRuntime: () => void;
  applyLocalRestoreRefresh: (syncGridControls?: boolean) => void;
  setMultiActionGap: (value: string | number | undefined) => void;
  setOverride: (cid: string, partial: Record<string, unknown>) => void;
  setWaypointOverride: (cid: string) => void;
  cleanOverride: (cid: string) => void;
  getParentNode: (cid: string) => Record<string, unknown> | null;
  getComponentNode: (cid: string) => Record<string, unknown> | null;
  hasLayoutChildren: (cid: string) => boolean;
  getArrowNode: (cid: string) => Record<string, unknown> | null;
  getComponentType: (cid: string) => string;
  getViolationsForComponent: (cid: string) => unknown;
  scheduleLayoutRelayout: (cid: string) => void;
  clearScheduledLayoutRelayout: () => void;
}

export function createPreviewGridEditorBrowserStateFromBrowserHost(
  options: CreatePreviewGridEditorBrowserStateFromBrowserHostOptions,
): PreviewGridEditorBrowserState {
  let layoutRelayoutTimer: unknown = null;

  const clearScheduledLayoutRelayout = (): void => {
    if (layoutRelayoutTimer == null) {
      return;
    }
    options.clearTimeoutFn(layoutRelayoutTimer);
    layoutRelayoutTimer = null;
  };

  const replaceOverrides: PreviewGridEditorBrowserState['replaceOverrides'] = (nextOverrides) => {
    const resolvedOverrides = nextOverrides ?? {};
    options.overridesState.set(resolvedOverrides);
    options.model.overrides = resolvedOverrides;
    options.invalidateOverrideBoundFacades();
    return resolvedOverrides;
  };

  return {
    replaceOverrides,
    setDirty(dirty) {
      options.previewSaveClient.setDirty(dirty);
    },
    pruneLinkedRootGridOverrides() {
      if (!options.model.gridOverrides || Object.keys(options.model.gridOverrides).length === 0) {
        return;
      }
      const rootId = options.model.roots[0]?.id || 'root';
      const currentOverrides = options.overridesState.get();
      const rootOverrides = currentOverrides[rootId];
      if (!rootOverrides) {
        return;
      }

      delete rootOverrides.gap;
      delete rootOverrides.gap_delta;
      delete rootOverrides.padding;
      delete rootOverrides.padding_top;
      delete rootOverrides.padding_right;
      delete rootOverrides.padding_bottom;
      delete rootOverrides.padding_left;

      if (Object.keys(rootOverrides).length === 0) {
        delete currentOverrides[rootId];
      }
    },
    restoreOverrideEntries(entries) {
      replaceOverrides(options.getPreviewBridgeRelayoutContract().restorePreviewOverrideEntries({
        currentOverrides: options.overridesState.get(),
        entries,
      }));
      Object.keys(entries || {}).forEach((cid) => options.model.cleanOverride(cid));
    },
    clearPendingRestoreRuntime() {
      options.getSceneFacade().clearPendingRelayout();
      clearScheduledLayoutRelayout();
      options.editorState.setPendingGridAction(null);
    },
    applyLocalRestoreRefresh(syncGridControls = false) {
      options.getSceneFacade().applyLocalRestoreRefresh(syncGridControls);
    },
    setMultiActionGap(value) {
      const parsed = Number.parseInt(String(value ?? ''), 10);
      const nextGap = options.getPreviewShellInteractionContract().normalizeSelectionGap(
        Number.isFinite(parsed) ? parsed : 0,
        options.baselineStep,
      );
      options.multiActionGapState.set(nextGap);
      const input = options.getMultiActionGapInput();
      if (input) {
        input.value = String(nextGap);
      }
    },
    setOverride(cid, partial) {
      options.model.setOverride(cid, partial);
      options.previewSaveClient.setDirty(true);
    },
    setWaypointOverride(cid) {
      const node = options.model.get(cid);
      if (!node || node.type !== 'arrow') {
        return;
      }
      const waypoints = node.data?.waypoints
        ? JSON.parse(JSON.stringify(node.data.waypoints))
        : [];
      options.model.setWaypointOverride(cid, waypoints);
      options.previewSaveClient.setDirty(true);
    },
    cleanOverride(cid) {
      options.model.cleanOverride(cid);
    },
    getParentNode(cid) {
      return options.model.getParent(cid)?.data ?? null;
    },
    getComponentNode(cid) {
      return options.model.get(cid)?.data ?? null;
    },
    hasLayoutChildren(cid) {
      const node = options.model.get(cid);
      return Boolean(node && node.layout && Array.isArray(node.children) && node.children.length > 0);
    },
    getArrowNode(cid) {
      const node = options.model.get(cid);
      return node && node.type === 'arrow' ? node.data : null;
    },
    getComponentType(cid) {
      return options.model.getType(cid) || 'Box';
    },
    getViolationsForComponent(cid) {
      return options.constraints.forComponent(options.lastViolationsState.get(), cid);
    },
    scheduleLayoutRelayout(cid) {
      clearScheduledLayoutRelayout();
      layoutRelayoutTimer = options.setTimeoutFn(() => {
        layoutRelayoutTimer = null;
        options.getRequestLayoutRelayout()(cid);
      }, options.relayoutDelayMs ?? 300);
    },
    clearScheduledLayoutRelayout,
  };
}
