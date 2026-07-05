import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadFrameYaml } from '../src/frame-yaml-loader.js';
import { MockTextAdapter } from '../src/text-measure.js';
import {
  ELK_LAYERED_PREVIEW_ENGINE,
  V3_PREVIEW_ENGINE,
  getPreviewDocumentSvgRenderer,
  getPreviewFrameDiagramRenderAdapter,
  installMindmapLitePreviewEngine,
  layoutPreviewFrameDiagramForEngine,
  renderPreviewDocumentToSvg,
  registerPreviewEngine,
  registerPreviewDocumentSvgRenderer,
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

  it('renders registered non-frame preview documents through the shared document seam', async () => {
    const rendered = await renderPreviewDocumentToSvg({
      kind: 'sequence',
      title: 'Handshake',
      sequence: {
        participants: [
          { id: 'client', label: [{ text: 'Client' }], kind: 'participant' },
          { id: 'server', label: [{ text: 'Server' }], kind: 'participant' },
        ],
        messages: [
          {
            id: 'm1',
            from: 'client',
            to: 'server',
            label: [{ text: 'Hello' }],
          },
        ],
        notes: [],
        groups: [],
      },
    });

    expect(rendered).toMatchObject({
      width: expect.any(Number),
      height: expect.any(Number),
    });
    expect(rendered?.svgMarkup).toContain('<svg');
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

  it('registers custom preview-document renderers without editing the shared helper', async () => {
    const unregister = registerPreviewDocumentSvgRenderer('bespoke-doc-test', async () => ({
      svgMarkup: '<svg viewBox="0 0 10 10"></svg>',
      width: 10,
      height: 10,
    }));

    try {
      expect(getPreviewDocumentSvgRenderer('bespoke-doc-test')).toBeTypeOf('function');
      await expect(
        renderPreviewDocumentToSvg({
          kind: 'bespoke-doc-test',
        }),
      ).resolves.toMatchObject({
        width: 10,
        height: 10,
      });
    } finally {
      unregister();
    }

    expect(getPreviewDocumentSvgRenderer('bespoke-doc-test')).toBeUndefined();
  });

  it('supports one durable install-unit shape for future preview-engine packages', async () => {
    const unregisterEngine = registerPreviewEngine({
      id: 'install-unit-grid',
      label: 'Install unit grid',
      algorithmClass: 'install-unit-proof',
      layoutEngineKey: 'install-unit-grid',
      shellMode: 'grid',
      renderFamily: 'frame-install-unit',
      hostView: {
        sidebarSections: ['install-unit'],
      },
      capabilities: {
        layoutControls: false,
        localRelayout: true,
        serverRelayout: false,
        engineBackedSave: false,
        nodeInspector: true,
        gridEditing: false,
        referenceImage: true,
        simulationControls: false,
        rawDebugView: false,
      },
      controlSpecs: [],
      scripts: ['install-unit-grid.js'],
      compatibility: {
        documentKinds: ['frame-diagram', 'install-unit-doc'],
        description: 'Synthetic install unit used to lock the 046 onboarding pattern',
      },
    });
    const unregisterFrameAdapter = registerPreviewFrameDiagramRenderAdapter(
      'frame-install-unit',
      async () => ({
        width: 123,
        height: 45,
        coerced: new Map(),
      }),
    );
    const unregisterDocumentRenderer = registerPreviewDocumentSvgRenderer(
      'install-unit-doc',
      async () => ({
        svgMarkup: '<svg viewBox="0 0 1 1"></svg>',
        width: 1,
        height: 1,
      }),
    );

    try {
      const diagram = loadFrameYaml(join(FRAMES_DIR, 'support-engineering-flow.yaml'));
      await expect(
        layoutPreviewFrameDiagramForEngine({
          diagram,
          textAdapter: new MockTextAdapter(),
          engine: { renderFamily: 'frame-install-unit' },
        }),
      ).resolves.toMatchObject({
        width: 123,
        height: 45,
      });
      await expect(
        renderPreviewDocumentToSvg({
          kind: 'install-unit-doc',
        }),
      ).resolves.toMatchObject({
        width: 1,
        height: 1,
      });
      expect(resolvePreviewRenderFamily({ renderFamily: 'frame-install-unit' }, 'frame-diagram'))
        .toBe('frame-install-unit');
    } finally {
      unregisterDocumentRenderer();
      unregisterFrameAdapter();
      unregisterEngine();
    }
  });

  it('installs the foreign-shaped mindmap-lite preview engine without central render branching', async () => {
    const uninstall = installMindmapLitePreviewEngine();

    try {
      const renderer = getPreviewDocumentSvgRenderer('mindmap-lite');
      expect(renderer).toBeTypeOf('function');
      await expect(
        renderPreviewDocumentToSvg({
          kind: 'mindmap-lite',
          slug: 'mindmap-proof',
          title: 'Mindmap proof',
          layoutEngine: 'mindmap-tree',
          shellMode: 'grid',
          mindmap: {
            root: 'Platform',
            children: ['Preview host', 'Renderer', 'Save flow'],
          },
        } as never),
      ).resolves.toMatchObject({
        width: expect.any(Number),
        height: expect.any(Number),
      });
    } finally {
      uninstall();
    }

    expect(getPreviewDocumentSvgRenderer('mindmap-lite')).toBeUndefined();
  });
});
