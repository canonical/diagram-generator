import type {
  PreviewDocumentKind,
  PreviewEngineCapabilities,
  PreviewEngineHostView,
  PreviewEngineManifest,
  PreviewShellMode,
  PreviewViewerSidebarSection,
} from '../preview-engine/types.js';
import { hostViewUsesLayoutParamsSection } from '../preview-engine/sidebar-sections.js';
import {
  isFramePreviewShellMode,
  normalizePreviewShellMode,
} from '../preview-engine/shell-mode.js';
import type { PreviewEngineWorkspaceState } from './preview-engine-workspace.js';

export type PreviewTemplateSectionKey =
  | 'grid-layers-tab'
  | 'grid-layers-pane'
  | 'grid-engine-switcher'
  | 'grid-controls'
  | 'layout-params'
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
  readonly engineWorkspace?: PreviewEngineWorkspaceState | null;
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

type PreviewUiActiveEngineDescriptor = Pick<
  PreviewEngineManifest,
  'id' | 'shellMode' | 'layoutEngineKey' | 'capabilities' | 'hostView'
>;

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
  readonly visibilityPlaceholder?: string;
  readonly group?: PreviewAsidePanelGroup;
  isVisible(context: PreviewUiContext): boolean;
  isDisabled?: (context: PreviewUiContext) => boolean;
  reason(context: PreviewUiContext, visible: boolean, disabled: boolean): string;
}

export interface PreviewTemplateSectionVisibilityPlaceholder {
  readonly section: PreviewTemplateSectionKey;
  readonly placeholder: string;
}

function workspace(context: PreviewUiContext): PreviewEngineWorkspaceState | null {
  return context.engineWorkspace ?? null;
}

function activeEngine(context: PreviewUiContext): PreviewUiActiveEngineDescriptor | null {
  return workspace(context)?.activeEngine ?? context.activeEngine ?? null;
}

function compatibleEngineIds(context: PreviewUiContext): readonly string[] {
  return workspace(context)?.compatibleEngineIds ?? context.compatibleEngines ?? [];
}

function persistedLayoutEngine(context: PreviewUiContext): string | null {
  return workspace(context)?.persistedEngineId ?? context.persistedLayoutEngine ?? null;
}

function capabilities(context: PreviewUiContext): Partial<PreviewEngineCapabilities> {
  return activeEngine(context)?.capabilities ?? {};
}

function hostView(context: PreviewUiContext): PreviewEngineHostView | undefined {
  return activeEngine(context)?.hostView;
}

function shellMode(context: PreviewUiContext): string {
  return normalizePreviewShellMode(context.shellMode ?? activeEngine(context)?.shellMode ?? '') ?? '';
}

function documentKind(context: PreviewUiContext): string {
  return String(context.documentKind ?? '');
}

function matchesPreviewShellMode(context: PreviewUiContext, expectedShellMode: string): boolean {
  const normalizedExpected = normalizePreviewShellMode(expectedShellMode);
  if (!normalizedExpected) {
    return false;
  }
  if (normalizedExpected === 'force') {
    return normalizePreviewShellMode(shellMode(context)) === 'force';
  }
  if (isFramePreviewShellMode(normalizedExpected)) {
    return isFramePreviewShellMode(shellMode(context));
  }
  return normalizePreviewShellMode(shellMode(context)) === normalizedExpected;
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

/**
 * Returns whether the active preview state owns the native frame grid model.
 *
 * Grid affordances (including the inspector's 9-dot alignment widget) must
 * share this gate so non-grid engines cannot enter the native relayout path.
 */
export function previewContextSupportsGridEditing(context: PreviewUiContext): boolean {
  return matchesPreviewShellMode(context, 'frame')
    && isFrameDiagram(context)
    && hasCapability(context, 'gridEditing');
}

export function previewEngineSupportsSidebarSection(
  context: PreviewUiContext,
  section: string,
): boolean {
  return hostView(context)?.sidebarSections?.includes(section) ?? false;
}

function hasCompatibleEngines(context: PreviewUiContext): boolean {
  const keys = new Set(
    compatibleEngineIds(context)
      .map((key) => String(key || '').trim())
      .filter(Boolean),
  );
  return keys.size > 0;
}

export function hasInvalidPreviewPersistedLayoutEngine(
  context: PreviewUiContext,
): boolean {
  const workspaceState = workspace(context);
  if (workspaceState) {
    return workspaceState.invalidPersistedEngine;
  }
  if (typeof context.invalidPersistedLayoutEngine === 'boolean') {
    return context.invalidPersistedLayoutEngine;
  }
  const persisted = String(persistedLayoutEngine(context) ?? '').trim();
  if (!persisted) return false;
  return !compatibleEngineIds(context).includes(persisted);
}

export function shouldShowPreviewEngineSwitcher(context: PreviewUiContext): boolean {
  return matchesPreviewShellMode(context, 'frame')
    && isFrameDiagram(context)
    && (hasCompatibleEngines(context) || hasInvalidPreviewPersistedLayoutEngine(context));
}

function frameTreeVisible(context: PreviewUiContext): boolean {
  return matchesPreviewShellMode(context, 'frame')
    && isFrameDiagram(context)
    && hasCapability(context, 'nodeInspector');
}

function frameDocumentActionsVisible(context: PreviewUiContext): boolean {
  return matchesPreviewShellMode(context, 'frame')
    && isFrameDiagram(context)
    && hasCapability(context, 'nodeInspector');
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

function layoutParamsVisible(context: PreviewUiContext): boolean {
  return hostViewUsesLayoutParamsSection(hostView(context) ?? null)
    && hasCapability(context, 'layoutControls');
}

function gridControlsVisible(context: PreviewUiContext): boolean {
  return previewContextSupportsGridEditing(context)
    && rootSelectionVisible(context);
}

function forceNodesVisible(context: PreviewUiContext): boolean {
  return matchesPreviewShellMode(context, 'force') && hasCapability(context, 'nodeInspector');
}

function forceSimulationVisible(context: PreviewUiContext): boolean {
  return matchesPreviewShellMode(context, 'force') && hasCapability(context, 'simulationControls');
}

function visibilityReason(
  visible: boolean,
  showReason: string,
  hideReason: string,
): string {
  return visible ? showReason : hideReason;
}

const previewPanelRegistry: PreviewPanelRegistryEntry[] = [];

export const PREVIEW_PANEL_REGISTRY: readonly PreviewPanelRegistryEntry[] = previewPanelRegistry;

export function registerPreviewPanelRegistryEntries(
  entries: readonly PreviewPanelRegistryEntry[],
): () => void {
  const duplicateId = entries.find((entry) => previewPanelRegistry.some((existing) => existing.id === entry.id));
  if (duplicateId) {
    throw new Error(`Preview panel '${duplicateId.id}' is already registered`);
  }
  previewPanelRegistry.push(...entries);
  return () => {
    const ids = new Set(entries.map((entry) => entry.id));
    for (let index = previewPanelRegistry.length - 1; index >= 0; index -= 1) {
      if (ids.has(previewPanelRegistry[index]!.id)) {
        previewPanelRegistry.splice(index, 1);
      }
    }
  };
}

const FRAME_PREVIEW_PANEL_REGISTRY_ENTRIES: readonly PreviewPanelRegistryEntry[] = [
  {
    id: 'grid-layers-tab',
    owner: 'viewer-unified.html#nav-tab-layers',
    visibilityPlaceholder: '%GRID_LAYERS_TAB_HIDDEN%',
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
    visibilityPlaceholder: '%GRID_LAYERS_PANE_HIDDEN%',
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
    visibilityPlaceholder: '%GRID_ENGINE_SWITCHER_HIDDEN%',
    group: 'engine',
    isVisible: shouldShowPreviewEngineSwitcher,
    reason: (context, visible) => visibilityReason(
      visible,
      hasInvalidPreviewPersistedLayoutEngine(context)
        ? 'persisted layout engine needs repair'
        : 'compatible frame engines are available',
      'current frame document has no compatible engines',
    ),
  },
  {
    id: 'grid-controls',
    owner: 'viewer-unified.html#grid-controls-section',
    visibilityPlaceholder: '%GRID_CONTROLS_HIDDEN%',
    group: 'layout',
    isVisible: gridControlsVisible,
    reason: (_context, visible) => visibilityReason(
      visible,
      'root selection exposes native grid editing',
      'native grid editing requires root selection and engine support',
    ),
  },
  {
    id: 'layout-params',
    owner: 'viewer-unified.html#layout-params-section',
    visibilityPlaceholder: '%LAYOUT_PARAMS_SECTION_HIDDEN%',
    group: 'engine',
    isVisible: layoutParamsVisible,
    reason: (_context, visible) => visibilityReason(
      visible,
      'active engine exposes graph layout parameters',
      'active engine does not expose graph layout parameters',
    ),
  },
  {
    id: 'grid-overrides',
    owner: 'viewer-unified.html#document-actions-section',
    visibilityPlaceholder: '%GRID_OVERRIDES_HIDDEN%',
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
    visibilityPlaceholder: '%GRID_CONSTRAINTS_HIDDEN%',
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
    visibilityPlaceholder: '%GRID_GUIDE_BADGE_HIDDEN%',
    isVisible: gridControlsVisible,
    reason: (_context, visible) => visibilityReason(
      visible,
      'root selection exposes native grid guides',
      'native grid guides require root selection and engine support',
    ),
  },
];

const FORCE_PREVIEW_PANEL_REGISTRY_ENTRIES: readonly PreviewPanelRegistryEntry[] = [
  {
    id: 'force-nodes-tab',
    owner: 'viewer-unified.html#nav-tab-nodes',
    visibilityPlaceholder: '%FORCE_NODES_TAB_HIDDEN%',
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
    visibilityPlaceholder: '%FORCE_NODES_PANE_HIDDEN%',
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
    visibilityPlaceholder: '%FORCE_SOLVER_HIDDEN%',
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
    visibilityPlaceholder: '%FORCE_SIMULATION_HIDDEN%',
    group: 'engine',
    isVisible: () => false,
    reason: (_context, visible) => visibilityReason(
      visible,
      'legacy force simulation pane remains intentionally hidden',
      'force parameters render through the shared layout params pane',
    ),
  },
  {
    id: 'force-guidance',
    owner: 'viewer-unified.html#force-guidance-section',
    visibilityPlaceholder: '%FORCE_GUIDANCE_HIDDEN%',
    group: 'diagnostics',
    isVisible: (context) => matchesPreviewShellMode(context, 'force'),
    reason: (_context, visible) => visibilityReason(
      visible,
      'force shell exposes force guidance',
      'active shell is not force',
    ),
  },
] as const;

registerPreviewPanelRegistryEntries(FRAME_PREVIEW_PANEL_REGISTRY_ENTRIES);
registerPreviewPanelRegistryEntries(FORCE_PREVIEW_PANEL_REGISTRY_ENTRIES);

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

export function resolvePreviewTemplateSectionVisibilityPlaceholders(
  registry: readonly PreviewPanelRegistryEntry[] = PREVIEW_PANEL_REGISTRY,
): PreviewTemplateSectionVisibilityPlaceholder[] {
  return registry
    .filter((entry): entry is PreviewPanelRegistryEntry & { visibilityPlaceholder: string } =>
      typeof entry.visibilityPlaceholder === 'string' && entry.visibilityPlaceholder.length > 0,
    )
    .map((entry) => ({
      section: entry.id,
      placeholder: entry.visibilityPlaceholder,
    }));
}
