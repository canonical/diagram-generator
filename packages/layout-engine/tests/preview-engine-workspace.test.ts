import { describe, expect, it } from 'vitest';
import {
  DAGRE_PREVIEW_ENGINE,
  ELK_LAYERED_PREVIEW_ENGINE,
  SEQUENCE_PREVIEW_ENGINE,
  V3_PREVIEW_ENGINE,
} from '../src/preview-engine/builtins.js';
import {
  clearPreviewEngineWorkspaceSessionState,
  createPreviewEngineWorkspaceState,
  persistPreviewEngineWorkspaceActiveEngine,
  reopenPreviewEngineWorkspace,
  setPreviewEngineWorkspaceActiveEngine,
  setPreviewEngineWorkspaceSessionState,
} from '../src/preview-shell/preview-engine-workspace.js';

describe('preview engine workspace state', () => {
  it('derives tabs and navigation from compatible engine manifests', () => {
    const workspace = createPreviewEngineWorkspaceState({
      activeEngine: ELK_LAYERED_PREVIEW_ENGINE,
      compatibleEngines: [V3_PREVIEW_ENGINE, ELK_LAYERED_PREVIEW_ENGINE, DAGRE_PREVIEW_ENGINE],
      persistedEngineId: 'elk-layered',
    });

    expect(workspace.activeEngineId).toBe('elk-layered');
    expect(workspace.persistedEngineId).toBe('elk-layered');
    expect(workspace.compatibleEngineIds).toEqual(['v3', 'elk-layered', 'dagre']);
    expect(workspace.navigation).toEqual({
      activeIndex: 1,
      total: 3,
      hasPrev: true,
      hasNext: true,
      prevEngineId: 'v3',
      nextEngineId: 'dagre',
    });
    expect(workspace.tabs.map((tab) => ({
      id: tab.engine.id,
      active: tab.active,
      persisted: tab.persisted,
    }))).toEqual([
      { id: 'v3', active: false, persisted: false },
      { id: 'elk-layered', active: true, persisted: true },
      { id: 'dagre', active: false, persisted: false },
    ]);
  });

  it('falls back to the first compatible tab when the persisted engine is invalid', () => {
    const workspace = createPreviewEngineWorkspaceState({
      activeEngine: SEQUENCE_PREVIEW_ENGINE,
      compatibleEngines: [V3_PREVIEW_ENGINE, ELK_LAYERED_PREVIEW_ENGINE],
      persistedEngineId: 'sequence',
    });

    expect(workspace.invalidPersistedEngine).toBe(true);
    expect(workspace.activeEngineId).toBe('v3');
    expect(workspace.activeEngine?.id).toBe('v3');
    expect(workspace.navigation.hasPrev).toBe(false);
    expect(workspace.navigation.nextEngineId).toBe('elk-layered');
  });

  it('resolves manifests from compatible engine ids and preserves per-engine session state', () => {
    const initial = createPreviewEngineWorkspaceState<{ dirtyState: string }>({
      activeEngineId: 'v3',
      compatibleEngineIds: ['v3', 'dagre'],
      getEngineById: (engineId) => {
        if (engineId === 'v3') return V3_PREVIEW_ENGINE;
        if (engineId === 'dagre') return DAGRE_PREVIEW_ENGINE;
        return null;
      },
      persistedEngineId: 'v3',
    });
    const withV3State = setPreviewEngineWorkspaceSessionState(initial, 'v3', {
      dirtyState: 'native-grid',
    });
    const switched = setPreviewEngineWorkspaceActiveEngine(withV3State, 'dagre');
    const withDagreState = setPreviewEngineWorkspaceSessionState(switched, 'dagre', {
      dirtyState: 'rankdir=LR',
    });

    expect(withDagreState.persistedEngineId).toBe('v3');
    expect(withDagreState.activeEngineId).toBe('dagre');
    expect(withDagreState.sessionStateByEngine).toEqual({
      v3: { dirtyState: 'native-grid' },
      dagre: { dirtyState: 'rankdir=LR' },
    });
    expect(withDagreState.tabs.map((tab) => tab.sessionState)).toEqual([
      { dirtyState: 'native-grid' },
      { dirtyState: 'rankdir=LR' },
    ]);

    const cleared = clearPreviewEngineWorkspaceSessionState(withDagreState, 'v3');
    expect(cleared.sessionStateByEngine).toEqual({
      dagre: { dirtyState: 'rankdir=LR' },
    });
  });

  it('reopens on the last persisted engine until the active tab is saved', () => {
    const persisted = createPreviewEngineWorkspaceState<{ dirtyState: string }>({
      activeEngine: V3_PREVIEW_ENGINE,
      compatibleEngines: [V3_PREVIEW_ENGINE, DAGRE_PREVIEW_ENGINE],
      persistedEngineId: 'v3',
    });
    const unsavedDagre = setPreviewEngineWorkspaceSessionState(
      setPreviewEngineWorkspaceActiveEngine(persisted, 'dagre'),
      'dagre',
      { dirtyState: 'rankdir=LR' },
    );

    expect(unsavedDagre.activeEngineId).toBe('dagre');
    expect(unsavedDagre.persistedEngineId).toBe('v3');
    expect(reopenPreviewEngineWorkspace(unsavedDagre).activeEngineId).toBe('v3');
    expect(reopenPreviewEngineWorkspace(unsavedDagre).sessionStateByEngine).toEqual({
      dagre: { dirtyState: 'rankdir=LR' },
    });

    const savedDagre = persistPreviewEngineWorkspaceActiveEngine(unsavedDagre);
    expect(savedDagre.persistedEngineId).toBe('dagre');
    expect(reopenPreviewEngineWorkspace(savedDagre).activeEngineId).toBe('dagre');
  });
});
