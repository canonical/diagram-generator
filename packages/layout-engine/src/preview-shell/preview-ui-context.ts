import type {
  PreviewDocumentKind,
  PreviewEngineCapabilities,
  PreviewEngineHostView,
  PreviewEngineManifest,
  PreviewShellMode,
  PreviewViewerSidebarSection,
} from '../preview-engine/types.js';

export type PreviewTemplateSectionKey =
  | 'grid-layers-tab'
  | 'grid-layers-pane'
  | 'grid-engine-switcher'
  | 'grid-controls'
  | 'grid-overrides'
  | 'grid-constraints'
  | 'grid-guide-badge'
  | 'force-nodes-tab'
  | 'force-nodes-pane'
  | 'force-solver'
  | 'force-simulation'
  | 'force-guidance'
  | PreviewViewerSidebarSection
  | (string & {});

export type PreviewAsidePanelGroup =
  | 'selection'
  | 'arrangement'
  | 'layout'
  | 'sizing'
  | 'position'
  | 'appearance'
  | 'engine'
  | 'document'
  | 'diagnostics';

export const PREVIEW_ASIDE_PANEL_GROUPS = [
  'selection',
  'arrangement',
  'layout',
  'sizing',
  'position',
  'appearance',
  'engine',
  'document',
  'diagnostics',
] as const satisfies readonly PreviewAsidePanelGroup[];

export type PreviewSelectionKind =
  | 'empty'
  | 'frame'
  | 'container'
  | 'arrow'
  | 'root'
  | 'multi'
  | 'force-node'
  | (string & {});

export interface PreviewUiSelectionContext {
  readonly count?: number | null;
  readonly kind?: PreviewSelectionKind | null;
  readonly allBounded?: boolean | null;
  readonly sameParent?: boolean | null;
  readonly hasUnsupported?: boolean | null;
}

export interface PreviewUiDocumentState {
  readonly dirty?: boolean | null;
  readonly canUndo?: boolean | null;
  readonly canRedo?: boolean | null;
  readonly hasConstraintRegistry?: boolean | null;
  readonly violationCount?: number | null;
  readonly hasReference?: boolean | null;
}

export interface PreviewUiContext {
  readonly shellMode?: PreviewShellMode | null;
  readonly documentKind?: PreviewDocumentKind | null;
  readonly activeEngine?: Pick<
    PreviewEngineManifest,
    'id' | 'shellMode' | 'layoutEngineKey' | 'capabilities' | 'hostView'
  > | null;
  readonly compatibleEngines?: readonly string[] | null;
  readonly persistedLayoutEngine?: string | null;
  readonly invalidPersistedLayoutEngine?: boolean | null;
  readonly selection?: PreviewUiSelectionContext | null;
  readonly documentState?: PreviewUiDocumentState | null;
}

export interface PreviewPanelVisibility {
  readonly id: PreviewTemplateSectionKey;
  readonly owner: string;
  readonly group?: PreviewAsidePanelGroup;
  readonly visible: boolean;
  readonly disabled: boolean;
  readonly reason: string;
}

export interface PreviewPanelRegistryEntry {
  readonly id: PreviewTemplateSectionKey;
  readonly owner: string;
  readonly group?: PreviewAsidePanelGroup;
  isVisible(context: PreviewUiContext): boolean;
  isDisabled?: (context: PreviewUiContext) => boolean;
  reason(context: PreviewUiContext, visible: boolean, disabled: boolean): string;
}

function capabilities(context: PreviewUiContext): Partial<PreviewEngineCapabilities> {
  return context.activeEngine?.capabilities ?? {};
}

function hostView(context: PreviewUiContext): PreviewEngineHostView | undefined {
  return context.activeEngine?.hostView;
}

function shellMode(context: PreviewUiContext): string {
  return String(context.shellMode ?? context.activeEngine?.shellMode ?? '');
}

function documentKind(context: PreviewUiContext): string {
  return String(context.documentKind ?? '');
}

function isGridShell(context: PreviewUiContext): boolean {
  return shellMode(context) === 'grid';
}

function isForceShell(context: PreviewUiContext): boolean {
  return shellMode(context) === 'force';
}

function isFrameDiagram(context: PreviewUiContext): boolean {
  return documentKind(context) === 'frame-diagram';
}

function hasCapability<K extends keyof PreviewEngineCapabilities>(
  context: PreviewUiContext,
  key: K,
): boolean {
  return Boolean(capabilities(context)[key]);
}

export function previewEngineSupportsSidebarSection(
  context: PreviewUiContext,
  section: string,
): boolean {
  return hostView(context)?.sidebarSections?.includes(section) ?? false;
}

function hasMultipleCompatibleEngines(context: PreviewUiContext): boolean {
  const keys = new Set(
    (context.compatibleEngines ?? [])
      .map((key) => String(key || '').trim())
      .filter(Boolean),
  );
  return keys.size > 1;
}

export function hasInvalidPreviewPersistedLayoutEngine(
  context: PreviewUiContext,
): boolean {
  if (typeof context.invalidPersistedLayoutEngine === 'boolean') {
    return context.invalidPersistedLayoutEngine;
  }
  const persisted = String(context.persistedLayoutEngine ?? '').trim();
  if (!persisted) return false;
  return !(context.compatibleEngines ?? []).includes(persisted);
}

export function shouldShowPreviewEngineSwitcher(context: PreviewUiContext): boolean {
  return isGridShell(context)
    && isFrameDiagram(context)
    && (hasMultipleCompatibleEngines(context) || hasInvalidPreviewPersistedLayoutEngine(context));
}

function frameTreeVisible(context: PreviewUiContext): boolean {
  return isGridShell(context) && isFrameDiagram(context) && hasCapability(context, 'nodeInspector');
}

function frameDocumentActionsVisible(context: PreviewUiContext): boolean {
  return isGridShell(context) && isFrameDiagram(context) && hasCapability(context, 'nodeInspector');
}

function constraintDiagnosticsVisible(context: PreviewUiContext): boolean {
  return frameDocumentActionsVisible(context)
    && context.documentState?.hasConstraintRegistry === true
    && (context.documentState.violationCount ?? 0) > 0;
}

function rootSelectionVisible(context: PreviewUiContext): boolean {
  const selection = context.selection;
  return selection?.kind === 'root' && (selection.count ?? 1) === 1;
}

function elkLayoutVisible(context: PreviewUiContext): boolean {
  return isGridShell(context)
    && previewEngineSupportsSidebarSection(context, 'elk-layout')
    && hasCapability(context, 'layoutControls');
}

function gridControlsVisible(context: PreviewUiContext): boolean {
  return isGridShell(context)
    && isFrameDiagram(context)
    && hasCapability(context, 'gridEditing')
    && rootSelectionVisible(context);
}

function forceNodesVisible(context: PreviewUiContext): boolean {
  return isForceShell(context) && hasCapability(context, 'nodeInspector');
}

function forceSimulationVisible(context: PreviewUiContext): boolean {
  return isForceShell(context) && hasCapability(context, 'simulationControls');
}

function visibilityReason(
  visible: boolean,
  showReason: string,
  hideReason: string,
): string {
  return visible ? showReason : hideReason;
}

export const PREVIEW_PANEL_REGISTRY: readonly PreviewPanelRegistryEntry[] = [
  {
    id: 'grid-layers-tab',
    owner: 'viewer-unified.html#nav-tab-layers',
    isVisible: frameTreeVisible,
    reason: (_context, visible) => visibilityReason(
      visible,
      'frame diagram exposes a selectable frame tree',
      'active document does not expose a selectable frame tree',
    ),
  },
  {
    id: 'grid-layers-pane',
    owner: 'viewer-unified.html#nav-pane-layers',
    isVisible: frameTreeVisible,
    reason: (_context, visible) => visibilityReason(
      visible,
      'frame diagram exposes a selectable frame tree',
      'active document does not expose a selectable frame tree',
    ),
  },
  {
    id: 'grid-engine-switcher',
    owner: 'viewer-unified.html#engine-switcher-section',
    group: 'engine',
    isVisible: shouldShowPreviewEngineSwitcher,
    reason: (context, visible) => visibilityReason(
      visible,
      hasInvalidPreviewPersistedLayoutEngine(context)
        ? 'persisted layout engine needs repair'
        : 'multiple compatible frame engines are available',
      'current frame document has a single valid compatible engine',
    ),
  },
  {
    id: 'grid-controls',
    owner: 'viewer-unified.html#grid-controls-section',
    group: 'layout',
    isVisible: gridControlsVisible,
    reason: (_context, visible) => visibilityReason(
      visible,
      'root selection exposes native grid editing',
      'native grid editing requires root selection and engine support',
    ),
  },
  {
    id: 'elk-layout',
    owner: 'viewer-unified.html#elk-layout-section',
    group: 'engine',
    isVisible: elkLayoutVisible,
    reason: (_context, visible) => visibilityReason(
      visible,
      'active engine exposes the elk-layout sidebar section',
      'active engine does not expose the elk-layout sidebar section',
    ),
  },
  {
    id: 'grid-overrides',
    owner: 'viewer-unified.html#document-actions-section',
    group: 'document',
    isVisible: frameDocumentActionsVisible,
    reason: (_context, visible) => visibilityReason(
      visible,
      'interactive frame editor exposes document actions',
      'active document is not an interactive frame editor',
    ),
  },
  {
    id: 'grid-constraints',
    owner: 'viewer-unified.html#constraints-section',
    group: 'diagnostics',
    isVisible: constraintDiagnosticsVisible,
    reason: (_context, visible) => visibilityReason(
      visible,
      'active constraint registry has violations to report',
      'no active constraint violations to report',
    ),
  },
  {
    id: 'grid-guide-badge',
    owner: 'viewer-unified.html#guide-badge',
    isVisible: gridControlsVisible,
    reason: (_context, visible) => visibilityReason(
      visible,
      'root selection exposes native grid guides',
      'native grid guides require root selection and engine support',
    ),
  },
  {
    id: 'force-nodes-tab',
    owner: 'viewer-unified.html#nav-tab-nodes',
    isVisible: forceNodesVisible,
    reason: (_context, visible) => visibilityReason(
      visible,
      'force shell exposes node inspector',
      'active shell is not a force node editor',
    ),
  },
  {
    id: 'force-nodes-pane',
    owner: 'viewer-unified.html#nav-pane-nodes',
    isVisible: forceNodesVisible,
    reason: (_context, visible) => visibilityReason(
      visible,
      'force shell exposes node inspector',
      'active shell is not a force node editor',
    ),
  },
  {
    id: 'force-solver',
    owner: 'viewer-unified.html#force-solver-section',
    group: 'engine',
    isVisible: forceSimulationVisible,
    reason: (_context, visible) => visibilityReason(
      visible,
      'force shell exposes simulation controls',
      'active shell does not expose force simulation controls',
    ),
  },
  {
    id: 'force-simulation',
    owner: 'viewer-unified.html#force-simulation-section',
    group: 'engine',
    isVisible: forceSimulationVisible,
    reason: (_context, visible) => visibilityReason(
      visible,
      'force shell exposes simulation controls',
      'active shell does not expose force simulation controls',
    ),
  },
  {
    id: 'force-guidance',
    owner: 'viewer-unified.html#force-guidance-section',
    group: 'diagnostics',
    isVisible: isForceShell,
    reason: (_context, visible) => visibilityReason(
      visible,
      'force shell exposes force guidance',
      'active shell is not force',
    ),
  },
] as const;

export function resolvePreviewPanelVisibility(
  context: PreviewUiContext,
  registry: readonly PreviewPanelRegistryEntry[] = PREVIEW_PANEL_REGISTRY,
): PreviewPanelVisibility[] {
  return registry.map((entry) => {
    const visible = entry.isVisible(context);
    const disabled = entry.isDisabled?.(context) ?? false;
    return {
      id: entry.id,
      owner: entry.owner,
      ...(entry.group ? { group: entry.group } : {}),
      visible,
      disabled,
      reason: entry.reason(context, visible, disabled),
    };
  });
}

export function resolvePreviewVisibleTemplateSections(
  context: PreviewUiContext,
  registry: readonly PreviewPanelRegistryEntry[] = PREVIEW_PANEL_REGISTRY,
): PreviewTemplateSectionKey[] {
  const visibleSections = resolvePreviewPanelVisibility(context, registry)
    .filter((entry) => entry.visible)
    .map((entry) => entry.id);
  return [...new Set(visibleSections)];
}
