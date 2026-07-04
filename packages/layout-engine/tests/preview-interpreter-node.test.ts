import { describe, expect, it } from 'vitest';
import '../src/preview-engine/index.js';
import {
  DAGRE_PREVIEW_ENGINE,
  ELK_LAYERED_PREVIEW_ENGINE,
} from '../src/preview-engine/builtins.js';
import {
  clearPreviewInterpreterNodeParams,
  createPreviewInterpreterNodeRegistry,
  createRegisteredPreviewInterpreterNodeRegistry,
  getPreviewInterpreterNode,
  getPreviewInterpreterNodeParams,
  listPreviewInterpreterNodes,
  setPreviewInterpreterNodeParams,
} from '../src/preview-shell/preview-interpreter-node.js';

describe('preview interpreter node registry', () => {
  it('wraps registered preview engine manifests as interpreter nodes', () => {
    const registry = createRegisteredPreviewInterpreterNodeRegistry();
    const nodeIds = registry.nodeIds;

    expect(nodeIds).toContain('v3');
    expect(nodeIds).toContain('elk-layered');
    expect(nodeIds).toContain('dagre');
    expect(nodeIds).toContain('force');
    expect(nodeIds).toContain('sequence');
    expect(getPreviewInterpreterNode(registry, 'elk-layered')).toMatchObject({
      nodeId: 'elk-layered',
      engineId: 'elk-layered',
      layoutEngineKey: 'elk-layered',
    });
  });

  it("keeps node A's params unreadable from node B", () => {
    const initial = createPreviewInterpreterNodeRegistry<{
      rankdir?: string;
      spacing?: number;
    }>({
      registrations: [
        { nodeId: 'alpha', manifest: ELK_LAYERED_PREVIEW_ENGINE },
        { nodeId: 'beta', manifest: DAGRE_PREVIEW_ENGINE },
      ],
    });

    const withAlphaParams = setPreviewInterpreterNodeParams(initial, 'alpha', {
      spacing: 96,
    });
    const withBoth = setPreviewInterpreterNodeParams(withAlphaParams, 'beta', {
      rankdir: 'LR',
    });

    expect(getPreviewInterpreterNodeParams(withBoth, 'alpha')).toEqual({
      spacing: 96,
    });
    expect(getPreviewInterpreterNodeParams(withBoth, 'beta')).toEqual({
      rankdir: 'LR',
    });
    expect(getPreviewInterpreterNode(withBoth, 'alpha')?.params).toEqual({
      spacing: 96,
    });
    expect(getPreviewInterpreterNode(withBoth, 'beta')?.params).toEqual({
      rankdir: 'LR',
    });
    expect(listPreviewInterpreterNodes(withBoth).map((node) => ({
      nodeId: node.nodeId,
      params: node.params,
    }))).toEqual([
      { nodeId: 'alpha', params: { spacing: 96 } },
      { nodeId: 'beta', params: { rankdir: 'LR' } },
    ]);
  });

  it('clears only the targeted node bucket', () => {
    const registry = createPreviewInterpreterNodeRegistry<{
      radius?: number;
      spacing?: number;
    }>({
      registrations: [
        { nodeId: 'alpha', manifest: ELK_LAYERED_PREVIEW_ENGINE },
        { nodeId: 'beta', manifest: DAGRE_PREVIEW_ENGINE },
      ],
      paramsByNodeId: {
        alpha: { spacing: 64 },
        beta: { radius: 120 },
      },
    });

    const cleared = clearPreviewInterpreterNodeParams(registry, 'alpha');

    expect(getPreviewInterpreterNodeParams(cleared, 'alpha')).toBeNull();
    expect(getPreviewInterpreterNodeParams(cleared, 'beta')).toEqual({
      radius: 120,
    });
  });

  it('rejects duplicate node ids even when manifests differ', () => {
    expect(() => createPreviewInterpreterNodeRegistry({
      registrations: [
        { nodeId: 'alpha', manifest: ELK_LAYERED_PREVIEW_ENGINE },
        { nodeId: 'alpha', manifest: DAGRE_PREVIEW_ENGINE },
      ],
    })).toThrow(/already registered/);
  });
});
