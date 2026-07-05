import { describe, expect, it } from 'vitest';
import {
  getPreviewEngine,
  listHostableLayoutEngineKeys,
  registerPreviewEngine,
} from '../src/preview-engine/registry.js';

function createSyntheticManifest(
  overrides: Partial<Parameters<typeof registerPreviewEngine>[0]> = {},
): Parameters<typeof registerPreviewEngine>[0] {
  return {
    id: 'test-stack',
    label: 'Test stack layout',
    algorithmClass: 'test-stack',
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
    ...overrides,
  };
}

describe('preview-engine registry contract', () => {
  it('normalizes algorithmClass before registration', () => {
    const unregister = registerPreviewEngine(createSyntheticManifest({
      id: 'test-trimmed',
      layoutEngineKey: 'test-trimmed',
      algorithmClass: '  test-trimmed  ',
    }));

    try {
      expect(getPreviewEngine('test-trimmed')?.algorithmClass).toBe('test-trimmed');
      expect(listHostableLayoutEngineKeys()).toContain('test-trimmed');
    } finally {
      unregister();
    }
  });

  it('rejects missing or blank preview-engine algorithm classes', () => {
    const missingAlgorithmClass = createSyntheticManifest({
      id: 'test-missing-algorithm',
      layoutEngineKey: 'test-missing-algorithm',
    }) as unknown as Record<string, unknown>;
    delete missingAlgorithmClass.algorithmClass;

    expect(() => registerPreviewEngine(
      missingAlgorithmClass as unknown as Parameters<typeof registerPreviewEngine>[0],
    )).toThrow(/non-empty algorithm class/);
    expect(() => registerPreviewEngine(createSyntheticManifest({
      id: 'test-blank-algorithm',
      layoutEngineKey: 'test-blank-algorithm',
      algorithmClass: '   ',
    }))).toThrow(/non-empty algorithm class/);
  });
});
