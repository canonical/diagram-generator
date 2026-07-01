import { describe, expect, it } from 'vitest';
import {
  compareEditorMutationStateVector,
  resolveEditorMutationTransaction,
  type EditorMutationTransaction,
} from '../src/preview-shell/editor-mutation-transaction.js';

function transaction(
  overrides: Partial<EditorMutationTransaction> = {},
): EditorMutationTransaction {
  return {
    kind: 'engine-tab',
    sourceControl: 'engine-switcher-tabs',
    activeEngineId: 'elk-layered',
    documentKind: 'frame-diagram',
    capabilityGate: {
      applicable: true,
      reason: 'active engine supports this mutation',
      capability: 'layoutEngine',
    },
    relayoutPolicy: 'fresh-render',
    dirtyPolicy: 'mark-dirty',
    undoPolicy: 'record',
    renderIntentDelta: { engineId: 'elk-layered', changed: true },
    persistenceDelta: { savePayloadChanged: true },
    diagnostics: [],
    ...overrides,
  };
}

describe('editor mutation transaction', () => {
  it('commits valid state-changing transactions', () => {
    const result = resolveEditorMutationTransaction(transaction());

    expect(result.kind).toBe('committed');
    expect(result.relayoutPolicy).toBe('fresh-render');
    expect(result.dirtyPolicy).toBe('mark-dirty');
    expect(result.undoPolicy).toBe('record');
    expect(result.renderIntentDelta).toEqual({ engineId: 'elk-layered', changed: true });
  });

  it('returns noop when an applicable transaction has no deltas or policies', () => {
    const result = resolveEditorMutationTransaction(transaction({
      kind: 'selection',
      sourceControl: 'stage',
      relayoutPolicy: 'none',
      dirtyPolicy: 'preserve',
      undoPolicy: 'none',
      renderIntentDelta: null,
      persistenceDelta: null,
    }));

    expect(result.kind).toBe('noop');
    expect(result.reason).toBe('active engine supports this mutation');
  });

  it('makes inapplicable controls inert before they can dirty or relayout', () => {
    const result = resolveEditorMutationTransaction(transaction({
      kind: 'grid-control',
      sourceControl: 'grid-cols',
      capabilityGate: {
        applicable: false,
        reason: 'native grid editing requires v3 root selection',
        capability: 'gridEditing',
      },
      relayoutPolicy: 'engine',
      dirtyPolicy: 'mark-dirty',
      undoPolicy: 'record',
      persistenceDelta: { gridOverridesChanged: true },
    }));

    expect(result.kind).toBe('inert');
    expect(result.reason).toBe('native grid editing requires v3 root selection');
    expect(result.relayoutPolicy).toBe('none');
    expect(result.dirtyPolicy).toBe('preserve');
    expect(result.undoPolicy).toBe('none');
    expect(result.persistenceDelta).toBeNull();
  });

  it('returns rejected for invalid mutations even when capability would pass', () => {
    const result = resolveEditorMutationTransaction(transaction({
      rejectReason: 'unknown engine tab',
    }));

    expect(result.kind).toBe('rejected');
    expect(result.reason).toBe('unknown engine tab');
    expect(result.relayoutPolicy).toBe('none');
  });

  it('preserves explicit relayout policy for committed geometry changes', () => {
    const result = resolveEditorMutationTransaction(transaction({
      kind: 'geometry',
      sourceControl: 'resize-handle',
      relayoutPolicy: 'engine',
      dirtyPolicy: 'mark-dirty',
      undoPolicy: 'record',
      persistenceDelta: { frameOverridesChanged: true },
    }));

    expect(result.kind).toBe('committed');
    expect(result.relayoutPolicy).toBe('engine');
    expect(result.persistenceDelta).toEqual({ frameOverridesChanged: true });
  });

  it('reports state-vector engine identity drift', () => {
    const violations = compareEditorMutationStateVector({
      after: {
        activeTab: 'elk-layered',
        activeNodeId: 'elk-layered',
        renderIntentEngineId: 'elk-layered',
        frameTreeLayoutEngine: 'elk-layered',
        renderedEngine: 'v3',
      },
    });

    expect(violations).toEqual([
      expect.objectContaining({
        code: 'engine-identity-drift',
        fields: ['activeTab', 'renderIntentEngineId', 'frameTreeLayoutEngine', 'renderedEngine'],
      }),
    ]);
  });

  it('reports inert mutations that changed dirty or undo state', () => {
    const inert = resolveEditorMutationTransaction(transaction({
      kind: 'grid-control',
      capabilityGate: {
        applicable: false,
        reason: 'not applicable',
      },
    }));

    const violations = compareEditorMutationStateVector({
      transaction: inert,
      before: {
        dirty: false,
        canUndo: false,
        canRedo: false,
        renderedEngine: 'elk-layered',
      },
      after: {
        dirty: true,
        canUndo: true,
        canRedo: false,
        renderedEngine: 'elk-layered',
      },
    });

    expect(violations).toEqual([
      expect.objectContaining({
        code: 'inert-mutation-changed-state',
        fields: ['dirty', 'canUndo', 'canRedo', 'renderedEngine', 'visibleControls'],
      }),
    ]);
  });

  it('reports selection and inspector target drift', () => {
    const violations = compareEditorMutationStateVector({
      after: {
        selectionType: 'single',
        selectionId: 'step_problem',
        inspectorTarget: 'step_solution',
      },
    });

    expect(violations).toEqual([
      expect.objectContaining({
        code: 'inspector-selection-drift',
        expected: 'step_problem',
        actual: 'step_solution',
      }),
    ]);
  });

  it('reports missing inspector target for a single selection', () => {
    const violations = compareEditorMutationStateVector({
      after: {
        selectionType: 'single',
        selectionId: 'step_problem',
        inspectorTarget: null,
      },
    });

    expect(violations).toEqual([
      expect.objectContaining({
        code: 'inspector-selection-drift',
        expected: 'step_problem',
        actual: null,
      }),
    ]);
  });

  it('reports committed dirty-policy drift', () => {
    const committed = resolveEditorMutationTransaction(transaction({
      dirtyPolicy: 'mark-dirty',
    }));

    const violations = compareEditorMutationStateVector({
      transaction: committed,
      after: {
        dirty: false,
      },
    });

    expect(violations).toEqual([
      expect.objectContaining({
        code: 'dirty-policy-not-applied',
        expected: true,
        actual: false,
      }),
    ]);
  });

  it('reports focused hidden or disabled controls', () => {
    const violations = compareEditorMutationStateVector({
      after: {
        focusedControl: 'grid-cols',
        controlApplicabilityReason: 'hidden',
      },
    });

    expect(violations).toEqual([
      expect.objectContaining({
        code: 'focused-inapplicable-control',
        expected: 'applicable',
        actual: 'hidden',
      }),
    ]);
  });

  it('reports active interpreter node drift from render intent', () => {
    const violations = compareEditorMutationStateVector({
      after: {
        activeNodeId: 'dagre',
        renderIntentEngineId: 'elk-layered',
      },
    });

    expect(violations).toEqual([
      expect.objectContaining({
        code: 'active-node-drift',
        expected: 'elk-layered',
        actual: 'dagre',
      }),
    ]);
  });

  it('reports fitted-canvas divergence when equivalent geometry should preserve the stage', () => {
    const violations = compareEditorMutationStateVector({
      before: {
        activeNodeId: 'elk-layered',
        fittedViewBox: '-24 -24 512 320',
      },
      after: {
        activeNodeId: 'dagre',
        fittedViewBox: '0 0 464 272',
      },
      expectStableCanvas: true,
    });

    expect(violations).toEqual([
      expect.objectContaining({
        code: 'canvas-divergence',
        fields: ['fittedViewBox', 'activeNodeId'],
        expected: {
          activeNodeId: 'elk-layered',
          fittedViewBox: '-24 -24 512 320',
        },
        actual: {
          activeNodeId: 'dagre',
          fittedViewBox: '0 0 464 272',
        },
      }),
    ]);
  });
});
