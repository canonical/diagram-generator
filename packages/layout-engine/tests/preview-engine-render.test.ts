import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadFrameYaml } from '../src/frame-yaml-loader.js';
import { MockTextAdapter } from '../src/text-measure.js';
import {
  ELK_LAYERED_PREVIEW_ENGINE,
  V3_PREVIEW_ENGINE,
  getPreviewFrameDiagramRenderAdapter,
  layoutPreviewFrameDiagramForEngine,
  registerPreviewFrameDiagramRenderAdapter,
  resolvePreviewRenderFamily,
} from '../src/preview-engine/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FRAMES_DIR = join(__dirname, '../../..', 'scripts/diagrams/frames');

describe('preview-engine render helpers', () => {
  it('resolves render families from the manifest or document fallback', () => {
    expect(resolvePreviewRenderFamily(V3_PREVIEW_ENGINE, 'frame-diagram')).toBe('frame-native');
    expect(resolvePreviewRenderFamily(ELK_LAYERED_PREVIEW_ENGINE, 'frame-diagram')).toBe('frame-elk');
    expect(resolvePreviewRenderFamily(null, 'frame-diagram')).toBe('frame-native');
    expect(resolvePreviewRenderFamily(null, 'sequence')).toBe('sequence');
    expect(resolvePreviewRenderFamily(null, 'force-spec')).toBe('force');
  });

  it('layouts native frame diagrams through the shared render-family seam', async () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'support-engineering-flow.yaml'));
    const result = await layoutPreviewFrameDiagramForEngine({
      diagram,
      textAdapter: new MockTextAdapter(),
      engine: V3_PREVIEW_ENGINE,
    });

    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(diagram.root._layout.placedW).toBeGreaterThan(0);
    expect(diagram.root._layout.placedH).toBeGreaterThan(0);
  });

  it('registers custom frame-diagram render adapters without editing the shared helper', async () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'support-engineering-flow.yaml'));
    const unregister = registerPreviewFrameDiagramRenderAdapter('frame-bespoke-test', async () => ({
      width: 777,
      height: 333,
      coerced: new Map(),
    }));

    try {
      expect(getPreviewFrameDiagramRenderAdapter('frame-bespoke-test')).toBeTypeOf('function');
      await expect(
        layoutPreviewFrameDiagramForEngine({
          diagram,
          textAdapter: new MockTextAdapter(),
          engine: { renderFamily: 'frame-bespoke-test' },
        }),
      ).resolves.toMatchObject({
        width: 777,
        height: 333,
      });
    } finally {
      unregister();
    }

    expect(getPreviewFrameDiagramRenderAdapter('frame-bespoke-test')).toBeUndefined();
  });

  it('rejects duplicate render-family registration unless replacement is explicit', () => {
    const original = getPreviewFrameDiagramRenderAdapter('frame-native');
    expect(original).toBeTypeOf('function');

    expect(() =>
      registerPreviewFrameDiagramRenderAdapter('frame-native', async () => ({
        width: 1,
        height: 1,
        coerced: new Map(),
      })),
    ).toThrow(/already registered/);

    const unregister = registerPreviewFrameDiagramRenderAdapter(
      'frame-native',
      async () => ({
        width: 2,
        height: 2,
        coerced: new Map(),
      }),
      { replace: true },
    );

    try {
      expect(getPreviewFrameDiagramRenderAdapter('frame-native')).not.toBe(original);
    } finally {
      unregister();
    }

    expect(getPreviewFrameDiagramRenderAdapter('frame-native')).toBe(original);
  });

  it('rejects render families that have no registered frame adapter', async () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'support-engineering-flow.yaml'));

    await expect(
      layoutPreviewFrameDiagramForEngine({
        diagram,
        textAdapter: new MockTextAdapter(),
        engine: { renderFamily: 'sequence' },
      }),
    ).rejects.toThrow("No frame-diagram render adapter is registered for preview render family 'sequence'");
  });
});
