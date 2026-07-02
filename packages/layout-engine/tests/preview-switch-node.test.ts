import { describe, expect, it } from 'vitest';
import {
  commitPreviewSwitchNode,
  createPreviewSwitchNodeCookKey,
  createPreviewSwitchNodeState,
  markPreviewSwitchNodeDirty,
  runPreviewSwitchNodeCook,
  selectPreviewSwitchNode,
} from '../src/preview-shell/preview-switch-node.js';

describe('preview switch node', () => {
  it('is the sole typed owner of render-intent commits and frame-tree engine selection', () => {
    const frameTreeJson = {
      layoutEngine: 'dagre',
      root: {
        id: 'root',
        direction: 'HORIZONTAL',
      },
    };
    const previewWindow = {
      __DG_CONFIG: {
        active_engine_id: 'dagre',
        layout_engine: 'dagre',
      },
      __DG_previewRenderIntent: null,
      getFrameTreeJson() {
        return frameTreeJson;
      },
    };

    const intent = commitPreviewSwitchNode(previewWindow, {
      activeEngineId: 'elk-layered',
      frameTreeJson,
      frameOverrides: {
        root: {
          direction: 'VERTICAL',
        },
      },
    });

    expect(intent.engineId).toBe('elk-layered');
    expect(previewWindow.__DG_previewRenderIntent?.engineId).toBe('elk-layered');
    expect(previewWindow.__DG_CONFIG?.active_engine_id).toBe('elk-layered');
    expect(previewWindow.__DG_CONFIG?.layout_engine).toBe('elk-layered');
    expect(frameTreeJson.layoutEngine).toBe('elk-layered');
    expect(frameTreeJson.root.direction).toBe('VERTICAL');
  });

  it('keeps per-node cooked output cached until that node is marked dirty', async () => {
    let cookCalls = 0;
    let state = createPreviewSwitchNodeState<number>({
      activeNodeId: 'elk-layered',
    });

    const layeredKey = createPreviewSwitchNodeCookKey({
      engineId: 'elk-layered',
      frameTree: { layoutEngine: 'elk-layered' },
    });
    const dagreKey = createPreviewSwitchNodeCookKey({
      engineId: 'dagre',
      frameTree: { layoutEngine: 'dagre' },
    });

    const layeredFirst = await runPreviewSwitchNodeCook(state, {
      nodeId: 'elk-layered',
      cookKey: layeredKey,
      cook: async () => {
        cookCalls += 1;
        return cookCalls;
      },
    });
    state = layeredFirst.state;

    const dagreCook = await runPreviewSwitchNodeCook(
      selectPreviewSwitchNode(state, 'dagre'),
      {
        nodeId: 'dagre',
        cookKey: dagreKey,
        cook: async () => {
          cookCalls += 1;
          return cookCalls;
        },
      },
    );
    state = dagreCook.state;

    const layeredCached = await runPreviewSwitchNodeCook(
      selectPreviewSwitchNode(state, 'elk-layered'),
      {
        nodeId: 'elk-layered',
        cookKey: layeredKey,
        cook: async () => {
          cookCalls += 1;
          return cookCalls;
        },
      },
    );
    state = layeredCached.state;

    expect(layeredFirst.didCook).toBe(true);
    expect(dagreCook.didCook).toBe(true);
    expect(layeredCached.didCook).toBe(false);
    expect(layeredCached.cooked).toBe(layeredFirst.cooked);
    expect(cookCalls).toBe(2);

    const dirtyState = markPreviewSwitchNodeDirty(state, ['elk-layered']);
    const layeredRecook = await runPreviewSwitchNodeCook(dirtyState, {
      nodeId: 'elk-layered',
      cookKey: layeredKey,
      cook: async () => {
        cookCalls += 1;
        return cookCalls;
      },
    });

    expect(layeredRecook.didCook).toBe(true);
    expect(layeredRecook.cooked).toBe(3);
    expect(cookCalls).toBe(3);
  });
});
