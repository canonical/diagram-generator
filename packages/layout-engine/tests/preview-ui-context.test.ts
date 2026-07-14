import { describe, expect, it } from 'vitest';
import {
  ELK_LAYERED_PREVIEW_ENGINE,
  FORCE_PREVIEW_ENGINE,
  SEQUENCE_PREVIEW_ENGINE,
  V3_PREVIEW_ENGINE,
} from '../src/preview-engine/builtins.js';
import {
  PREVIEW_ASIDE_PANEL_GROUPS,
  PREVIEW_PANEL_REGISTRY,
  hasInvalidPreviewPersistedLayoutEngine,
  registerPreviewPanelRegistryEntries,
  resolvePreviewPanelVisibility,
  resolvePreviewTemplateSectionVisibilityPlaceholders,
  resolvePreviewVisibleTemplateSections,
  previewContextSupportsGridEditing,
  shouldShowPreviewEngineSwitcher,
  type PreviewUiContext,
} from '../src/preview-shell/preview-ui-context.js';
import { createPreviewEngineWorkspaceState } from '../src/preview-shell/preview-engine-workspace.js';

function visibleSections(context: PreviewUiContext): Set<string> {
  return new Set(resolvePreviewVisibleTemplateSections(context));
}

describe('preview UI context registry', () => {
  it('uses the active engine/document capability as the single grid gate', () => {
    expect(previewContextSupportsGridEditing({
      shellMode: 'grid',
      documentKind: 'frame-diagram',
      activeEngine: V3_PREVIEW_ENGINE,
    })).toBe(true);

    expect(previewContextSupportsGridEditing({
      shellMode: 'grid',
      documentKind: 'frame-diagram',
      activeEngine: ELK_LAYERED_PREVIEW_ENGINE,
    })).toBe(false);
    expect(previewContextSupportsGridEditing({
      shellMode: 'grid',
      documentKind: 'sequence',
      activeEngine: SEQUENCE_PREVIEW_ENGINE,
    })).toBe(false);
    expect(previewContextSupportsGridEditing({
      shellMode: 'force',
      documentKind: 'frame-diagram',
      activeEngine: V3_PREVIEW_ENGINE,
    })).toBe(false);
  });

  it('covers every static template section with a typed owner', () => {
    expect(PREVIEW_PANEL_REGISTRY.map((entry) => entry.id).sort()).toEqual([
      'force-guidance',
      'force-nodes-pane',
      'force-nodes-tab',
      'force-simulation',
      'force-solver',
      'grid-constraints',
      'grid-controls',
      'grid-engine-switcher',
      'grid-guide-badge',
      'grid-layers-pane',
      'grid-layers-tab',
      'grid-overrides',
      'layout-params',
    ]);
    expect(PREVIEW_PANEL_REGISTRY.every((entry) => entry.owner.length > 0)).toBe(true);
    expect(PREVIEW_ASIDE_PANEL_GROUPS).toEqual([
      'selection',
      'arrangement',
      'layout',
      'sizing',
      'position',
      'appearance',
      'engine',
      'document',
      'diagnostics',
    ]);
    const groupsById = new Map(PREVIEW_PANEL_REGISTRY.map((entry) => [entry.id, entry.group]));
    expect(groupsById.get('grid-engine-switcher')).toBe('engine');
    expect(groupsById.get('grid-controls')).toBe('layout');
    expect(groupsById.get('layout-params')).toBe('engine');
    expect(groupsById.get('grid-overrides')).toBe('document');
    expect(groupsById.get('grid-constraints')).toBe('diagnostics');
    expect(groupsById.get('force-solver')).toBe('engine');
    expect(groupsById.get('force-simulation')).toBe('engine');
    expect(groupsById.get('force-guidance')).toBe('diagnostics');
    expect(resolvePreviewTemplateSectionVisibilityPlaceholders()).toEqual([
      { section: 'grid-layers-tab', placeholder: '%GRID_LAYERS_TAB_HIDDEN%' },
      { section: 'grid-layers-pane', placeholder: '%GRID_LAYERS_PANE_HIDDEN%' },
      { section: 'grid-engine-switcher', placeholder: '%GRID_ENGINE_SWITCHER_HIDDEN%' },
      { section: 'grid-controls', placeholder: '%GRID_CONTROLS_HIDDEN%' },
      { section: 'layout-params', placeholder: '%LAYOUT_PARAMS_SECTION_HIDDEN%' },
      { section: 'grid-overrides', placeholder: '%GRID_OVERRIDES_HIDDEN%' },
      { section: 'grid-constraints', placeholder: '%GRID_CONSTRAINTS_HIDDEN%' },
      { section: 'grid-guide-badge', placeholder: '%GRID_GUIDE_BADGE_HIDDEN%' },
      { section: 'force-nodes-tab', placeholder: '%FORCE_NODES_TAB_HIDDEN%' },
      { section: 'force-nodes-pane', placeholder: '%FORCE_NODES_PANE_HIDDEN%' },
      { section: 'force-solver', placeholder: '%FORCE_SOLVER_HIDDEN%' },
      { section: 'force-simulation', placeholder: '%FORCE_SIMULATION_HIDDEN%' },
      { section: 'force-guidance', placeholder: '%FORCE_GUIDANCE_HIDDEN%' },
    ]);
  });

  it('hides native v3 grid controls until a root selection is active', () => {
    const visible = visibleSections({
      shellMode: 'grid',
      documentKind: 'frame-diagram',
      activeEngine: V3_PREVIEW_ENGINE,
      compatibleEngines: ['v3'],
      persistedLayoutEngine: 'v3',
    });

    expect(visible.has('grid-layers-tab')).toBe(true);
    expect(visible.has('grid-controls')).toBe(false);
    expect(visible.has('grid-overrides')).toBe(true);
    expect(visible.has('grid-constraints')).toBe(false);
    expect(visible.has('grid-guide-badge')).toBe(false);
    expect(visible.has('layout-params')).toBe(false);
    expect(visible.has('grid-engine-switcher')).toBe(true);
    expect(shouldShowPreviewEngineSwitcher({
      shellMode: 'grid',
      documentKind: 'frame-diagram',
      activeEngine: V3_PREVIEW_ENGINE,
      compatibleEngines: ['v3'],
      persistedLayoutEngine: 'v3',
    })).toBe(true);

    const rootVisible = visibleSections({
      shellMode: 'grid',
      documentKind: 'frame-diagram',
      activeEngine: V3_PREVIEW_ENGINE,
      compatibleEngines: ['v3'],
      persistedLayoutEngine: 'v3',
      selection: { count: 1, kind: 'root' },
    });
    expect(rootVisible.has('grid-controls')).toBe(true);
    expect(rootVisible.has('grid-guide-badge')).toBe(true);

    const childVisible = visibleSections({
      shellMode: 'grid',
      documentKind: 'frame-diagram',
      activeEngine: V3_PREVIEW_ENGINE,
      compatibleEngines: ['v3'],
      persistedLayoutEngine: 'v3',
      selection: { count: 1, kind: 'frame' },
    });
    expect(childVisible.has('grid-controls')).toBe(false);
  });

  it('shows constraint diagnostics only when a registry has violations', () => {
    const clean = visibleSections({
      shellMode: 'grid',
      documentKind: 'frame-diagram',
      activeEngine: V3_PREVIEW_ENGINE,
      compatibleEngines: ['v3'],
      persistedLayoutEngine: 'v3',
      documentState: {
        hasConstraintRegistry: true,
        violationCount: 0,
      },
    });
    expect(clean.has('grid-constraints')).toBe(false);

    const violated = visibleSections({
      shellMode: 'grid',
      documentKind: 'frame-diagram',
      activeEngine: V3_PREVIEW_ENGINE,
      compatibleEngines: ['v3'],
      persistedLayoutEngine: 'v3',
      documentState: {
        hasConstraintRegistry: true,
        violationCount: 2,
      },
    });
    expect(violated.has('grid-constraints')).toBe(true);
    expect(
      resolvePreviewPanelVisibility({
        shellMode: 'grid',
        documentKind: 'frame-diagram',
        activeEngine: V3_PREVIEW_ENGINE,
        compatibleEngines: ['v3'],
        persistedLayoutEngine: 'v3',
        documentState: {
          hasConstraintRegistry: true,
          violationCount: 2,
        },
      }).find((entry) => entry.id === 'grid-constraints')?.reason,
    ).toBe('active constraint registry has violations to report');
  });

  it('shows the engine switcher when multiple compatible frame engines are available', () => {
    const context: PreviewUiContext = {
      shellMode: 'grid',
      documentKind: 'frame-diagram',
      activeEngine: V3_PREVIEW_ENGINE,
      compatibleEngines: ['v3', 'elk-layered'],
      persistedLayoutEngine: 'v3',
    };

    expect(shouldShowPreviewEngineSwitcher(context)).toBe(true);
    expect(visibleSections(context).has('grid-engine-switcher')).toBe(true);
  });

  it('accepts both grid and frame shell names for frame-lane panel visibility', () => {
    const frameVisible = visibleSections({
      shellMode: 'frame',
      documentKind: 'frame-diagram',
      activeEngine: ELK_LAYERED_PREVIEW_ENGINE,
      compatibleEngines: ['v3', 'elk-layered'],
      persistedLayoutEngine: 'elk-layered',
    });
    const gridVisible = visibleSections({
      shellMode: 'grid',
      documentKind: 'frame-diagram',
      activeEngine: ELK_LAYERED_PREVIEW_ENGINE,
      compatibleEngines: ['v3', 'elk-layered'],
      persistedLayoutEngine: 'elk-layered',
    });

    expect(frameVisible).toEqual(gridVisible);
    expect(frameVisible.has('layout-params')).toBe(true);
  });

  it('shows panels from a registered shell lane without editing the builtin panel list', () => {
    const unregister = registerPreviewPanelRegistryEntries([
      {
        id: 'synthetic-lane-panel',
        owner: 'synthetic-owner',
        group: 'diagnostics',
        isVisible: (context) => context.shellMode === 'synthetic-lane',
        reason: (_context, visible) => visible
          ? 'synthetic lane contributed its own panel'
          : 'synthetic lane panel hidden',
      },
    ]);

    try {
      const visible = visibleSections({
        shellMode: 'synthetic-lane',
        documentKind: 'synthetic-doc',
      });
      expect(visible.has('synthetic-lane-panel')).toBe(true);
      expect(PREVIEW_PANEL_REGISTRY.some((entry) => entry.id === 'synthetic-lane-panel')).toBe(true);
    } finally {
      unregister();
    }

    expect(PREVIEW_PANEL_REGISTRY.some((entry) => entry.id === 'synthetic-lane-panel')).toBe(false);
  });

  it('accepts the typed engine workspace as the engine source of truth', () => {
    const context: PreviewUiContext = {
      shellMode: 'grid',
      documentKind: 'frame-diagram',
      engineWorkspace: createPreviewEngineWorkspaceState({
        activeEngine: ELK_LAYERED_PREVIEW_ENGINE,
        compatibleEngines: [V3_PREVIEW_ENGINE, ELK_LAYERED_PREVIEW_ENGINE],
        persistedEngineId: 'elk-layered',
      }),
    };

    expect(shouldShowPreviewEngineSwitcher(context)).toBe(true);
    expect(visibleSections(context).has('layout-params')).toBe(true);
    expect(visibleSections(context).has('grid-engine-switcher')).toBe(true);
  });

  it('shows ELK controls and hides native grid controls for the current ELK manifest', () => {
    const visible = visibleSections({
      shellMode: 'grid',
      documentKind: 'frame-diagram',
      activeEngine: ELK_LAYERED_PREVIEW_ENGINE,
      compatibleEngines: ['v3', 'elk-layered'],
      persistedLayoutEngine: 'elk-layered',
    });

    expect(visible.has('grid-layers-tab')).toBe(true);
    expect(visible.has('layout-params')).toBe(true);
    expect(visible.has('grid-controls')).toBe(false);
    expect(visible.has('grid-guide-badge')).toBe(false);
    expect(visible.has('grid-engine-switcher')).toBe(true);
  });

  it('shows graph layout controls and hides native grid controls for layered ELK engines', () => {
    const visible = visibleSections({
      shellMode: 'grid',
      documentKind: 'frame-diagram',
      activeEngine: ELK_LAYERED_PREVIEW_ENGINE,
      compatibleEngines: ['v3', 'elk-layered'],
      persistedLayoutEngine: 'elk-layered',
    });

    expect(visible.has('grid-layers-tab')).toBe(true);
    expect(visible.has('layout-params')).toBe(true);
    expect(visible.has('grid-controls')).toBe(false);
    expect(visible.has('grid-guide-badge')).toBe(false);
    expect(visible.has('grid-engine-switcher')).toBe(true);
  });

  it('shows force-only controls for the force shell', () => {
    const visible = visibleSections({
      shellMode: 'force',
      documentKind: 'force-spec',
      activeEngine: FORCE_PREVIEW_ENGINE,
    });

    expect(visible.has('force-nodes-tab')).toBe(true);
    expect(visible.has('force-nodes-pane')).toBe(true);
    expect(visible.has('force-solver')).toBe(true);
    expect(visible.has('force-simulation')).toBe(false);
    expect(visible.has('force-guidance')).toBe(true);
    expect(visible.has('grid-controls')).toBe(false);
    expect(visible.has('layout-params')).toBe(true);
  });

  it('hides frame editing panels for sequence output-only documents', () => {
    const visible = visibleSections({
      shellMode: 'grid',
      documentKind: 'sequence',
      activeEngine: SEQUENCE_PREVIEW_ENGINE,
      compatibleEngines: ['sequence'],
      persistedLayoutEngine: 'sequence',
    });

    expect([...visible].sort()).toEqual([]);
  });

  it('shows the switcher when a persisted layout engine is incompatible with the frame', () => {
    const context: PreviewUiContext = {
      shellMode: 'grid',
      documentKind: 'frame-diagram',
      activeEngine: V3_PREVIEW_ENGINE,
      compatibleEngines: ['v3'],
      persistedLayoutEngine: 'elk-layered',
    };

    expect(hasInvalidPreviewPersistedLayoutEngine(context)).toBe(true);
    expect(shouldShowPreviewEngineSwitcher(context)).toBe(true);
    expect(
      resolvePreviewPanelVisibility(context)
        .find((entry) => entry.id === 'grid-engine-switcher')?.reason,
    ).toBe('persisted layout engine needs repair');
  });

  it('fails closed when no active engine manifest is available', () => {
    const visible = visibleSections({
      shellMode: 'grid',
      documentKind: 'frame-diagram',
      activeEngine: null,
      compatibleEngines: [],
    });

    expect([...visible].sort()).toEqual([]);
  });
});
