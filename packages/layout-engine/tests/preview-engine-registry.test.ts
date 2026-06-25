import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DAGRE_PARAM_SPECS,
} from '@diagram-generator/graph-layout-dagre';
import {
  ELK_FORCE_PARAM_SPECS,
  ELK_LAYERED_PARAM_SPECS,
  ELK_MRTREE_PARAM_SPECS,
  ELK_RADIAL_PARAM_SPECS,
  ELK_RECTPACKING_PARAM_SPECS,
  ELK_STRESS_PARAM_SPECS,
} from '@diagram-generator/graph-layout-elk';
import { loadFrameYaml } from '../src/frame-yaml-loader.js';
import { Direction, Frame, FrameDiagram, createArrow } from '../src/frame-model.js';
import {
  DAGRE_PREVIEW_ENGINE,
  ELK_FORCE_PREVIEW_ENGINE,
  ELK_LAYERED_PREVIEW_ENGINE,
  ELK_MRTREE_PREVIEW_ENGINE,
  ELK_RADIAL_PREVIEW_ENGINE,
  ELK_RECTPACKING_PREVIEW_ENGINE,
  ELK_STRESS_PREVIEW_ENGINE,
  FORCE_PREVIEW_ENGINE,
  FORCE_PREVIEW_PARAM_SPECS,
  PREVIEW_ENGINE_REGISTRY,
  SEQUENCE_PREVIEW_ENGINE,
  V3_PREVIEW_ENGINE,
  evaluatePreviewEngineCompatibility,
  getPreviewEngine,
  isPreviewEngineCompatible,
  listCompatiblePreviewEngines,
  listHostableLayoutEngineKeys,
  listPreviewEnginesBySidebarSection,
  listPreviewEngines,
  listPreviewEnginesWithCompatibility,
  registerPreviewEngine,
  resolvePreviewEngine,
  serializePreviewEngineManifest,
  summarizeFrameDiagramCompatibility,
} from '../src/preview-engine/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FRAMES_DIR = join(__dirname, '../../..', 'scripts/diagrams/frames');
const ELK_ENGINE_IDS = [
  'elk-layered',
  'elk-force',
  'elk-stress',
  'elk-mrtree',
  'elk-radial',
  'elk-rectpacking',
] as const;
const GRAPH_FRAME_ENGINE_IDS = [
  ...ELK_ENGINE_IDS,
  'dagre',
] as const;

describe('preview-engine registry', () => {
  it('registers native v3, ELK, force, and sequence engines', () => {
    expect(PREVIEW_ENGINE_REGISTRY.map((entry) => entry.id)).toEqual([
      'v3',
      ...GRAPH_FRAME_ENGINE_IDS,
      'force',
      'sequence',
    ]);
  });

  it('exposes ELK control specs from the TS authority path', () => {
    const elk = getPreviewEngine('elk-layered');
    expect(elk).toBeDefined();
    expect(elk?.controlSpecs.length).toBeGreaterThan(5);
    expect(elk?.controlSpecs.map((spec) => spec.key).sort()).toEqual(
      ELK_LAYERED_PARAM_SPECS.map((spec) => spec.key).sort(),
    );
    expect(elk?.controlSpecs.some((spec) => spec.key === 'elk.direction')).toBe(true);
    expect(elk?.controlSpecs.some((spec) => spec.key === 'elk.portConstraints')).toBe(false);
    expect(elk?.controlSpecs.some((spec) => spec.key === 'elk.edgeRouting')).toBe(false);
    expect(elk?.controlSpecs.some((spec) => spec.key === 'elk.padding')).toBe(false);
    expect(elk?.controlSpecs.every((spec) => spec.persistNamespace === 'meta.elk')).toBe(true);
    expect(elk?.scripts).toEqual(['elk-layout-controls.js', 'elk-controller.js']);
    expect(elk?.compatibility.frameDiagramRequirements).toEqual({
      minArrowCount: 1,
    });
    expect(listPreviewEnginesBySidebarSection('elk-layout').map((entry) => entry.id)).toEqual([
      ...ELK_ENGINE_IDS,
    ]);
    expect(ELK_FORCE_PREVIEW_ENGINE.controlSpecs.map((spec) => spec.key).sort()).toEqual(
      ELK_FORCE_PARAM_SPECS.map((spec) => spec.key).sort(),
    );
    expect(ELK_FORCE_PREVIEW_ENGINE.controlSpecs.every((spec) => spec.persistNamespace === 'meta.elk')).toBe(true);
    expect(ELK_FORCE_PREVIEW_ENGINE.renderFamily).toBe('frame-elk-force');
    expect(ELK_STRESS_PREVIEW_ENGINE.controlSpecs.map((spec) => spec.key).sort()).toEqual(
      ELK_STRESS_PARAM_SPECS.map((spec) => spec.key).sort(),
    );
    expect(ELK_MRTREE_PREVIEW_ENGINE.controlSpecs.map((spec) => spec.key).sort()).toEqual(
      ELK_MRTREE_PARAM_SPECS.map((spec) => spec.key).sort(),
    );
    expect(ELK_RADIAL_PREVIEW_ENGINE.controlSpecs.map((spec) => spec.key).sort()).toEqual(
      ELK_RADIAL_PARAM_SPECS.map((spec) => spec.key).sort(),
    );
    expect(ELK_RECTPACKING_PREVIEW_ENGINE.controlSpecs.map((spec) => spec.key).sort()).toEqual(
      ELK_RECTPACKING_PARAM_SPECS.map((spec) => spec.key).sort(),
    );
    for (const engine of [
      ELK_STRESS_PREVIEW_ENGINE,
      ELK_MRTREE_PREVIEW_ENGINE,
      ELK_RADIAL_PREVIEW_ENGINE,
      ELK_RECTPACKING_PREVIEW_ENGINE,
    ]) {
      expect(engine.controlSpecs.every((spec) => spec.persistNamespace === 'meta.elk')).toBe(true);
    }
  });

  it('exposes force simulation/render control specs', () => {
    expect(FORCE_PREVIEW_PARAM_SPECS.some((spec) => spec.key === 'link_distance')).toBe(true);
    expect(FORCE_PREVIEW_ENGINE.controlSpecs).toEqual(FORCE_PREVIEW_PARAM_SPECS);
    expect(FORCE_PREVIEW_ENGINE.apiRoutes?.save).toBe('/api/force-save/{slug}');
    expect(FORCE_PREVIEW_ENGINE.apiRoutes?.spec).toBe('/api/force-spec/{slug}');
    expect(FORCE_PREVIEW_ENGINE.apiRoutes?.params).toBeUndefined();
  });

  it('exposes dagre graph control specs without joining the ELK sidebar', () => {
    expect(DAGRE_PREVIEW_ENGINE.controlSpecs.map((spec) => spec.key).sort()).toEqual(
      DAGRE_PARAM_SPECS.map((spec) => spec.key).sort(),
    );
    expect(DAGRE_PREVIEW_ENGINE.controlSpecs.every((spec) => spec.persistNamespace === 'meta.dagre')).toBe(true);
    expect(DAGRE_PREVIEW_ENGINE.renderFamily).toBe('frame-dagre');
    expect(DAGRE_PREVIEW_ENGINE.hostView?.sidebarSections ?? []).toEqual(['graph-layout']);
    expect(DAGRE_PREVIEW_ENGINE.capabilities.layoutControls).toBe(true);
    expect(DAGRE_PREVIEW_ENGINE.scripts).toEqual(['graph-layout-controls.js', 'graph-layout-controller.js']);
    expect(listPreviewEnginesBySidebarSection('graph-layout').map((entry) => entry.id)).toEqual(['dagre']);
  });

  it('resolves engines by layoutEngine key or shell mode', () => {
    expect(resolvePreviewEngine({ layoutEngine: 'elk-layered' })?.id).toBe('elk-layered');
    expect(resolvePreviewEngine({ layoutEngine: 'dagre' })?.id).toBe('dagre');
    expect(resolvePreviewEngine({ shellMode: 'force' })?.id).toBe('force');
    expect(resolvePreviewEngine({ shellMode: 'grid', layoutEngine: 'vertical-stack' })).toBeUndefined();
  });

  it('defaults blank frame-diagram docs to native v3 and offers elk as an alternative', () => {
    const context = {
      shellMode: 'grid' as const,
      previewDocumentKind: 'frame-diagram' as const,
      frameDiagramSummary: { arrowCount: 1, unsupportedElkCarrierIds: [] },
    };

    expect(resolvePreviewEngine(context)?.id).toBe('v3');
    expect(listCompatiblePreviewEngines(context).map((entry) => entry.id)).toEqual([
      'v3',
      ...GRAPH_FRAME_ENGINE_IDS,
    ]);
  });

  it('serializes a JSON-safe manifest list for preview-server consumption', () => {
    const serialized = serializePreviewEngineManifest();
    expect(serialized).toHaveLength(10);
    const roundTrip = JSON.parse(JSON.stringify(serialized));
    expect(roundTrip[0].id).toBe('v3');
    expect(roundTrip[1].id).toBe('elk-layered');
    expect(roundTrip[2].id).toBe('elk-force');
    expect(roundTrip[3].id).toBe('elk-stress');
    expect(roundTrip[4].id).toBe('elk-mrtree');
    expect(roundTrip[5].id).toBe('elk-radial');
    expect(roundTrip[6].id).toBe('elk-rectpacking');
    expect(roundTrip[7].id).toBe('dagre');
    expect(roundTrip[8].capabilities.simulationControls).toBe(true);
    expect(roundTrip[9].id).toBe('sequence');
    expect(roundTrip[0].compatibility.documentKinds).toEqual(['frame-diagram']);
    expect(roundTrip[9].compatibility.requiredLayoutEngineKey).toBe('sequence');
    expect(listPreviewEngines()).toEqual(serialized);
  });

  it('supports typed engine registration without editing a central array', () => {
    const unregister = registerPreviewEngine({
      id: 'test-stack',
      label: 'Test stack layout',
      layoutEngineKey: 'test-stack',
      shellMode: 'grid',
      renderFamily: 'frame-native',
      hostView: {
        sidebarSections: ['test-stack'],
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
      scripts: ['test-stack.js'],
      compatibility: {
        documentKinds: ['frame-diagram'],
        requiredLayoutEngineKey: 'test-stack',
        description: 'Synthetic engine used to verify registration seams',
      },
    });

    try {
      expect(getPreviewEngine('test-stack')?.layoutEngineKey).toBe('test-stack');
      expect(listHostableLayoutEngineKeys()).toContain('test-stack');
      expect(listPreviewEngines().map((entry) => entry.id)).toContain('test-stack');
    } finally {
      unregister();
    }

    expect(getPreviewEngine('test-stack')).toBeUndefined();
    expect(listHostableLayoutEngineKeys()).not.toContain('test-stack');
  });

  it('rejects duplicate preview-engine registration ids', () => {
    expect(() =>
      registerPreviewEngine({
        ...V3_PREVIEW_ENGINE,
      }),
    ).toThrow(/already registered/);
  });

  it('declares expected shell capabilities per engine lane', () => {
    expect(V3_PREVIEW_ENGINE.renderFamily).toBe('frame-native');
    expect(ELK_LAYERED_PREVIEW_ENGINE.renderFamily).toBe('frame-elk');
    expect(ELK_FORCE_PREVIEW_ENGINE.renderFamily).toBe('frame-elk-force');
    expect(ELK_STRESS_PREVIEW_ENGINE.renderFamily).toBe('frame-elk-stress');
    expect(ELK_MRTREE_PREVIEW_ENGINE.renderFamily).toBe('frame-elk-mrtree');
    expect(ELK_RADIAL_PREVIEW_ENGINE.renderFamily).toBe('frame-elk-radial');
    expect(ELK_RECTPACKING_PREVIEW_ENGINE.renderFamily).toBe('frame-elk-rectpacking');
    expect(DAGRE_PREVIEW_ENGINE.renderFamily).toBe('frame-dagre');
    expect(FORCE_PREVIEW_ENGINE.renderFamily).toBe('force');
    expect(SEQUENCE_PREVIEW_ENGINE.renderFamily).toBe('sequence');
    expect(V3_PREVIEW_ENGINE.hostView?.sidebarSections ?? []).toEqual([]);
    expect(ELK_LAYERED_PREVIEW_ENGINE.hostView?.sidebarSections ?? []).toEqual(['elk-layout']);
    expect(ELK_FORCE_PREVIEW_ENGINE.hostView?.sidebarSections ?? []).toEqual(['elk-layout']);
    expect(ELK_STRESS_PREVIEW_ENGINE.hostView?.sidebarSections ?? []).toEqual(['elk-layout']);
    expect(ELK_MRTREE_PREVIEW_ENGINE.hostView?.sidebarSections ?? []).toEqual(['elk-layout']);
    expect(ELK_RADIAL_PREVIEW_ENGINE.hostView?.sidebarSections ?? []).toEqual(['elk-layout']);
    expect(ELK_RECTPACKING_PREVIEW_ENGINE.hostView?.sidebarSections ?? []).toEqual(['elk-layout']);
    expect(DAGRE_PREVIEW_ENGINE.hostView?.sidebarSections ?? []).toEqual(['graph-layout']);
    expect(FORCE_PREVIEW_ENGINE.hostView?.sidebarSections ?? []).toEqual([]);
    expect(SEQUENCE_PREVIEW_ENGINE.hostView?.sidebarSections ?? []).toEqual([]);
    expect(V3_PREVIEW_ENGINE.capabilities.localRelayout).toBe(true);
    expect(V3_PREVIEW_ENGINE.capabilities.gridEditing).toBe(true);
    expect(ELK_LAYERED_PREVIEW_ENGINE.capabilities.serverRelayout).toBe(true);
    expect(ELK_LAYERED_PREVIEW_ENGINE.capabilities.localRelayout).toBe(false);
    expect(ELK_FORCE_PREVIEW_ENGINE.capabilities.serverRelayout).toBe(true);
    expect(ELK_FORCE_PREVIEW_ENGINE.capabilities.localRelayout).toBe(false);
    expect(ELK_STRESS_PREVIEW_ENGINE.capabilities.serverRelayout).toBe(true);
    expect(ELK_MRTREE_PREVIEW_ENGINE.capabilities.serverRelayout).toBe(true);
    expect(ELK_RADIAL_PREVIEW_ENGINE.capabilities.serverRelayout).toBe(true);
    expect(ELK_RECTPACKING_PREVIEW_ENGINE.capabilities.serverRelayout).toBe(true);
    expect(DAGRE_PREVIEW_ENGINE.capabilities.serverRelayout).toBe(true);
    expect(DAGRE_PREVIEW_ENGINE.capabilities.localRelayout).toBe(false);
    expect(FORCE_PREVIEW_ENGINE.capabilities.localRelayout).toBe(true);
    expect(FORCE_PREVIEW_ENGINE.capabilities.simulationControls).toBe(true);
    expect(SEQUENCE_PREVIEW_ENGINE.capabilities.localRelayout).toBe(true);
    expect(SEQUENCE_PREVIEW_ENGINE.capabilities.nodeInspector).toBe(false);
  });

  it('exposes hostable layout-engine keys and typed compatibility helpers', () => {
    expect(listHostableLayoutEngineKeys()).toEqual(['v3', ...GRAPH_FRAME_ENGINE_IDS, 'sequence']);
    expect(
      isPreviewEngineCompatible(ELK_LAYERED_PREVIEW_ENGINE, {
        previewDocumentKind: 'frame-diagram',
        layoutEngine: 'elk-layered',
        frameDiagramSummary: { arrowCount: 2, unsupportedElkCarrierIds: [] },
      }),
    ).toBe(true);
    expect(
      isPreviewEngineCompatible(ELK_FORCE_PREVIEW_ENGINE, {
        previewDocumentKind: 'frame-diagram',
        layoutEngine: 'elk-force',
        frameDiagramSummary: { arrowCount: 2, unsupportedElkCarrierIds: [] },
      }),
    ).toBe(true);
    expect(
      isPreviewEngineCompatible(DAGRE_PREVIEW_ENGINE, {
        previewDocumentKind: 'frame-diagram',
        layoutEngine: 'dagre',
        frameDiagramSummary: { arrowCount: 2, unsupportedElkCarrierIds: [] },
      }),
    ).toBe(true);
    expect(
      isPreviewEngineCompatible(ELK_LAYERED_PREVIEW_ENGINE, {
        previewDocumentKind: 'sequence',
      }),
    ).toBe(false);
    expect(
      listCompatiblePreviewEngines({
        previewDocumentKind: 'frame-diagram',
        frameDiagramSummary: { arrowCount: 2, unsupportedElkCarrierIds: [] },
      }).map((entry) => entry.id),
    ).toEqual(['v3', ...GRAPH_FRAME_ENGINE_IDS]);
    expect(
      listCompatiblePreviewEngines({ previewDocumentKind: 'force-spec' }).map((entry) => entry.id),
    ).toEqual(['force']);
    expect(
      listCompatiblePreviewEngines({
        previewDocumentKind: 'force-spec',
        shellMode: 'grid',
      }),
    ).toEqual([]);
  });

  it('evaluates compatibility with detailed reasons for incompatible engines', () => {
    // ELK engine incompatible with sequence document
    const elkResult = evaluatePreviewEngineCompatibility(ELK_LAYERED_PREVIEW_ENGINE, {
      previewDocumentKind: 'sequence',
    });
    expect(elkResult.compatible).toBe(false);
    expect(elkResult.reason).toContain('sequence');

    // Force engine incompatible with grid shell mode
    const forceResult = evaluatePreviewEngineCompatibility(FORCE_PREVIEW_ENGINE, {
      shellMode: 'grid',
    });
    expect(forceResult.compatible).toBe(false);
    expect(forceResult.reason).toContain('shell mode');

    // Sequence engine incompatible with wrong layout engine key
    const seqResult = evaluatePreviewEngineCompatibility(SEQUENCE_PREVIEW_ENGINE, {
      previewDocumentKind: 'sequence',
      layoutEngine: 'elk-layered',
    });
    expect(seqResult.compatible).toBe(false);
    expect(seqResult.reason).toContain('layout engine');

    const arrowlessElkResult = evaluatePreviewEngineCompatibility(ELK_LAYERED_PREVIEW_ENGINE, {
      previewDocumentKind: 'frame-diagram',
      frameDiagramSummary: { arrowCount: 0, unsupportedElkCarrierIds: [] },
    });
    expect(arrowlessElkResult.compatible).toBe(false);
    expect(arrowlessElkResult.reason).toContain('arrow');
  });

  it('returns compatible result for matching engines', () => {
    const elkResult = evaluatePreviewEngineCompatibility(ELK_LAYERED_PREVIEW_ENGINE, {
      previewDocumentKind: 'frame-diagram',
      layoutEngine: 'elk-layered',
      frameDiagramSummary: { arrowCount: 1, unsupportedElkCarrierIds: [] },
    });
    expect(elkResult.compatible).toBe(true);
    expect(elkResult.reason).toBeUndefined();

    const forceResult = evaluatePreviewEngineCompatibility(FORCE_PREVIEW_ENGINE, {
      previewDocumentKind: 'force-spec',
      shellMode: 'force',
    });
    expect(forceResult.compatible).toBe(true);
    expect(forceResult.reason).toBeUndefined();
  });

  it('lists all engines with compatibility status for switcher UI', () => {
    const results = listPreviewEnginesWithCompatibility({
      previewDocumentKind: 'frame-diagram',
      layoutEngine: 'elk-layered',
      frameDiagramSummary: { arrowCount: 2, unsupportedElkCarrierIds: [] },
    });
    expect(results).toHaveLength(10);
    expect(results.map((entry) => entry.engine.id)).toEqual([
      'v3',
      ...GRAPH_FRAME_ENGINE_IDS,
      'force',
      'sequence',
    ]);
    expect(results[0].engine.id).toBe('v3');
    expect(results[0].compatibility.compatible).toBe(true);
    expect(results[1].engine.id).toBe('elk-layered');
    expect(results[1].compatibility.compatible).toBe(true);
    expect(results[2].engine.id).toBe('elk-force');
    expect(results[2].compatibility.compatible).toBe(false);
    expect(results[2].compatibility.reason).toBeDefined();
    for (const entry of results.slice(2)) {
      expect(entry.compatibility.compatible).toBe(false);
      expect(entry.compatibility.reason).toBeDefined();
    }
  });

  it('lists elk force as compatible when it is the persisted frame engine', () => {
    const results = listPreviewEnginesWithCompatibility({
      previewDocumentKind: 'frame-diagram',
      layoutEngine: 'elk-force',
      frameDiagramSummary: { arrowCount: 2, unsupportedElkCarrierIds: [] },
    });
    expect(results.find((entry) => entry.engine.id === 'elk-force')?.compatibility.compatible).toBe(true);
    expect(resolvePreviewEngine({
      previewDocumentKind: 'frame-diagram',
      layoutEngine: 'elk-force',
      frameDiagramSummary: { arrowCount: 2, unsupportedElkCarrierIds: [] },
    })?.id).toBe('elk-force');
  });

  it('marks conflicting elk-family engines incompatible by layout key', () => {
    const results = listPreviewEnginesWithCompatibility({
      previewDocumentKind: 'frame-diagram',
      layoutEngine: 'elk-layered',
      frameDiagramSummary: { arrowCount: 2, unsupportedElkCarrierIds: [] },
    });
    const elkForce = results.find((entry) => entry.engine.id === 'elk-force');
    expect(elkForce?.compatibility.compatible).toBe(false);
    expect(elkForce?.compatibility.reason).toContain('layout engine');
    const elkStress = results.find((entry) => entry.engine.id === 'elk-stress');
    expect(elkStress?.compatibility.compatible).toBe(false);
    expect(elkStress?.compatibility.reason).toContain('layout engine');
    const dagre = results.find((entry) => entry.engine.id === 'dagre');
    expect(dagre?.compatibility.compatible).toBe(false);
    expect(dagre?.compatibility.reason).toContain('layout engine');
  });

  it('exposes engine descriptions for switcher UI', () => {
    expect(V3_PREVIEW_ENGINE.compatibility.description).toBeDefined();
    expect(V3_PREVIEW_ENGINE.compatibility.description).toContain('v3');
    expect(ELK_LAYERED_PREVIEW_ENGINE.compatibility.description).toBeDefined();
    expect(ELK_LAYERED_PREVIEW_ENGINE.compatibility.description).toContain('layered');
    expect(ELK_FORCE_PREVIEW_ENGINE.compatibility.description).toBeDefined();
    expect(ELK_FORCE_PREVIEW_ENGINE.compatibility.description).toContain('Force');
    expect(ELK_STRESS_PREVIEW_ENGINE.compatibility.description).toContain('Stress');
    expect(ELK_MRTREE_PREVIEW_ENGINE.compatibility.description).toContain('mrtree');
    expect(ELK_RADIAL_PREVIEW_ENGINE.compatibility.description).toContain('Radial');
    expect(ELK_RECTPACKING_PREVIEW_ENGINE.compatibility.description).toContain('Rectangle');
    expect(DAGRE_PREVIEW_ENGINE.compatibility.description).toContain('Dagre');
    expect(FORCE_PREVIEW_ENGINE.compatibility.description).toBeDefined();
    expect(FORCE_PREVIEW_ENGINE.compatibility.description).toContain('force');
    expect(SEQUENCE_PREVIEW_ENGINE.compatibility.description).toBeDefined();
    expect(SEQUENCE_PREVIEW_ENGINE.compatibility.description).toContain('sequence');
  });

  it('omits elk layered from arrowless frame diagrams', () => {
    const context = {
      shellMode: 'grid' as const,
      previewDocumentKind: 'frame-diagram' as const,
      frameDiagramSummary: { arrowCount: 0, unsupportedElkCarrierIds: [] },
    };

    expect(resolvePreviewEngine(context)?.id).toBe('v3');
    expect(listCompatiblePreviewEngines(context).map((entry) => entry.id)).toEqual(['v3']);
  });

  it('does not silently fall back from an explicitly persisted incompatible elk choice', () => {
    expect(
      resolvePreviewEngine({
        layoutEngine: 'elk-layered',
        shellMode: 'grid',
        previewDocumentKind: 'frame-diagram',
        frameDiagramSummary: { arrowCount: 0, unsupportedElkCarrierIds: [] },
      }),
    ).toBeUndefined();
  });

  it('keeps headed groups ELK-compatible when their headings stay decorative', () => {
    const complex = summarizeFrameDiagramCompatibility(
      loadFrameYaml(join(FRAMES_DIR, 'complex-routing-usecase.yaml')),
    );
    const juju = summarizeFrameDiagramCompatibility(
      loadFrameYaml(join(FRAMES_DIR, 'juju-bootstrap-machines-process.yaml')),
    );

    expect(complex.unsupportedElkCarrierIds).toEqual([]);
    expect(juju.unsupportedElkCarrierIds).toEqual([]);
  });

  it('keeps compound-aware elk layered compatible for container arrow endpoints while rejecting non-compound engines', () => {
    const summary = summarizeFrameDiagramCompatibility(new FrameDiagram({
      title: 'Container endpoint',
      root: new Frame({
        id: 'page',
        direction: Direction.VERTICAL,
        children: [
          new Frame({
            id: 'group',
            children: [
              new Frame({ id: 'child' }),
            ],
          }),
          new Frame({ id: 'target' }),
        ],
      }),
      arrows: [
        createArrow('group', 'target'),
      ],
    }));

    expect(summary.unsupportedCarrierIds).toEqual(['group']);
    expect(summary.unsupportedElkCarrierIds).toEqual(['group']);
    expect(evaluatePreviewEngineCompatibility(ELK_LAYERED_PREVIEW_ENGINE, {
      previewDocumentKind: 'frame-diagram',
      layoutEngine: 'elk-layered',
      frameDiagramSummary: summary,
    })).toEqual({ compatible: true });
    expect(evaluatePreviewEngineCompatibility(DAGRE_PREVIEW_ENGINE, {
      previewDocumentKind: 'frame-diagram',
      layoutEngine: 'dagre',
      frameDiagramSummary: summary,
    })).toMatchObject({
      compatible: false,
      reason: expect.stringContaining('group'),
    });
  });

  it('resolves real container-endpoint authored diagrams to elk-layered', () => {
    for (const slug of ['example-platform-architecture', 'request-to-hardware-stack']) {
      const diagram = loadFrameYaml(join(FRAMES_DIR, `${slug}.yaml`));
      const context = {
        layoutEngine: diagram.layoutEngine,
        shellMode: 'grid' as const,
        previewDocumentKind: 'frame-diagram' as const,
        frameDiagramSummary: summarizeFrameDiagramCompatibility(diagram),
      };

      expect(context.frameDiagramSummary.unsupportedCarrierIds.length, slug).toBeGreaterThan(0);
      expect(resolvePreviewEngine(context)?.id, slug).toBe('elk-layered');
    }
  });

  it('keeps elk layered available for headed frame diagrams', () => {
    const summary = summarizeFrameDiagramCompatibility(
      loadFrameYaml(join(FRAMES_DIR, 'complex-routing-usecase.yaml')),
    );
    const context = {
      shellMode: 'grid' as const,
      previewDocumentKind: 'frame-diagram' as const,
      frameDiagramSummary: summary,
    };

    expect(resolvePreviewEngine(context)?.id).toBe('v3');
    expect(listCompatiblePreviewEngines(context).map((entry) => entry.id)).toEqual([
      'v3',
      ...GRAPH_FRAME_ENGINE_IDS,
    ]);

    const elkResult = evaluatePreviewEngineCompatibility(ELK_LAYERED_PREVIEW_ENGINE, context);
    expect(elkResult.compatible).toBe(true);
  });
});
