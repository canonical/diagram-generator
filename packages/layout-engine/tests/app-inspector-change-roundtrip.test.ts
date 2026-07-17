import { describe, expect, it, vi } from 'vitest';
import { Frame, FrameDiagram, createLine } from '../src/frame-model.js';
import { createPreviewInspectorMutationRuntime } from '../src/preview-shell/app-inspector-mutation-runtime.js';
import { applyPreviewOverridesToFrameTree } from '../src/preview-shell/app-relayout.js';
import { PERSIST_FRAME_KEYS } from '../src/preview-shell/frame-override-manifest.js';

/**
 * T023 - one assertion-rich round-trip proving that a representative inspector
 * change and a text edit thread correctly through all five outcomes:
 *   1. model state    - the live override store records the change
 *   2. SVG state      - applyPreviewOverridesToFrameTree mutates the frame tree
 *   3. dirty state    - the editor is flagged dirty
 *   4. undo state     - an undo patch captures before/after override entries
 *   5. persist payload - the change is expressible through PERSIST_FRAME_KEYS
 */
describe('inspector + text change round-trip', () => {
  const PERSIST_KEY_SET = new Set<string>(PERSIST_FRAME_KEYS);

  function buildRuntimeHarness() {
    const overrides: Record<string, Record<string, unknown>> = {};
    const dirtyCalls: boolean[] = [];
    const undoPatches: Array<{ label: string; before: unknown; after: unknown }> = [];
    const captureOverrideEntries = (ids: string[]) => (
      Object.fromEntries(ids.map((id) => [id, { ...(overrides[id] || {}) }]))
    );
    const runtime = createPreviewInspectorMutationRuntime({
      captureOverrideEntries,
      commitOverridePatchAction: (label, before, after) => {
        undoPatches.push({ label, before, after });
      },
      getOverrides: () => overrides,
      coercedKeys: new Set<string>(),
      getNode: () => ({ type: 'box', data: { id: 'planning' } }),
      snapToGrid: (value) => value,
      setDirty: (dirty) => { dirtyCalls.push(dirty); },
      scheduleRelayout: vi.fn(),
      requestRelayoutNow: vi.fn(),
      renderSelectionInspector: vi.fn(),
      cleanOverride: vi.fn(),
      shouldShowAutolayoutInspector: () => true,
      getGridInfo: () => null,
      getWidthUnit: () => 'px',
      getHeightUnit: () => 'px',
      baselineStep: 8,
    });
    return { runtime, overrides, dirtyCalls, undoPatches };
  }

  function buildDiagram() {
    const define = new Frame({ id: 'define', label: [createLine('Define')] });
    const headingChild = new Frame({ id: 'planning__heading', role: 'heading' });
    const bodyChild = new Frame({ id: 'planning__body', children: [define] });
    const planning = new Frame({
      id: 'planning',
      heading: createLine('Planning'),
      children: [headingChild, bodyChild],
    });
    const root = new Frame({ id: 'page', children: [planning] });
    return { diagram: new FrameDiagram({ root }), planning, headingChild };
  }

  it('threads an inspector min-width change and a heading text edit through model, SVG, dirty, undo, and persist', () => {
    const { runtime, overrides, dirtyCalls, undoPatches } = buildRuntimeHarness();

    // 1) Inspector change: set a minimum width on the container frame.
    runtime.setFrameProp('planning', 'min_width', 200);
    // 2) Text edit: rewrite the container heading.
    runtime.setFrameProp('planning', 'text', { heading: 'Fresh heading' });

    // --- Model state: the live override store records both changes. ---
    expect(overrides.planning).toEqual({
      min_width: 200,
      text: { heading: 'Fresh heading' },
    });

    // --- Dirty state: each mutation flags the editor dirty. ---
    expect(dirtyCalls).toEqual([true, true]);

    // --- Undo state: each mutation pushes a before/after patch. ---
    expect(undoPatches).toHaveLength(2);
    expect(undoPatches[0]).toEqual({
      label: 'Change min_width',
      before: { planning: {} },
      after: { planning: { min_width: 200 } },
    });
    expect(undoPatches[1]).toEqual({
      label: 'Change text',
      before: { planning: { min_width: 200 } },
      after: { planning: { min_width: 200, text: { heading: 'Fresh heading' } } },
    });

    // --- SVG state: the same overrides mutate the rendered frame tree. ---
    const { diagram, planning, headingChild } = buildDiagram();
    applyPreviewOverridesToFrameTree(diagram, {
      planning: { ...overrides.planning },
    });
    expect(planning.minWidth).toBe(200);
    expect(headingChild.label.map((line) => line.content)).toEqual(['Fresh heading']);

    // --- Persist payload: every recorded key is on the persist allowlist, so
    //     the change survives a YAML save round-trip with nothing dropped. ---
    const persistedPayload = Object.fromEntries(
      Object.entries(overrides.planning).filter(([key]) => PERSIST_KEY_SET.has(key)),
    );
    expect(persistedPayload).toEqual(overrides.planning);
  });
});
