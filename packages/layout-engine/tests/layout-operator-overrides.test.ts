import { describe, expect, it } from 'vitest';
import {
  activateLayoutOperatorOverrideBucket,
  collectNamespacedLayoutOperatorOverrides,
  pruneSessionBucketForManifest,
  readLayoutOperatorOverrideState,
  readLayoutOperatorOverrideBucketForManifest,
  resolveEffectiveLayoutOperatorOverrides,
  writeLayoutOperatorOverrideBucketForManifest,
} from '../src/preview-shell/layout-operator-overrides.js';

describe('layout operator overrides', () => {
  const forceManifest = {
    id: 'elk-force',
    layoutEngineKey: 'elk-force',
    controlSpecs: [
      {
        key: 'elk.force.model',
        label: 'Force model',
        group: 'Graph',
        kind: 'enum' as const,
        defaultValue: 'FRUCHTERMAN_REINGOLD',
        persistNamespace: 'meta.elk',
        enumValues: [
          { value: 'FRUCHTERMAN_REINGOLD', label: 'FR' },
          { value: 'EADES', label: 'Eades' },
        ],
      },
      {
        key: 'elk.force.temperature',
        label: 'Temperature',
        group: 'Graph',
        kind: 'number' as const,
        defaultValue: '0.01',
        persistNamespace: 'meta.elk',
        visibleWhen: [{ key: 'elk.force.model', equals: 'FRUCHTERMAN_REINGOLD' }],
      },
      {
        key: 'elk.force.repulsion',
        label: 'Repulsion',
        group: 'Graph',
        kind: 'number' as const,
        defaultValue: '5',
        persistNamespace: 'meta.elk',
        visibleWhen: [{ key: 'elk.force.model', equals: 'EADES' }],
      },
    ],
  };

  const layeredManifest = {
    id: 'elk-layered',
    layoutEngineKey: 'elk-layered',
    controlSpecs: [
      {
        key: 'elk.layered.spacing.nodeNodeBetweenLayers',
        label: 'Layer gap',
        group: 'Spacing',
        kind: 'number' as const,
        defaultValue: '48',
        persistNamespace: 'meta.elk',
      },
    ],
  };

  const radialManifest = {
    id: 'elk-radial',
    layoutEngineKey: 'elk-radial',
    controlSpecs: [
      {
        key: 'elk.radial.radius',
        label: 'Radius',
        group: 'Spacing',
        kind: 'number' as const,
        defaultValue: '120',
        persistNamespace: 'meta.elk',
      },
    ],
  };

  const legacyDagreAliasManifest = {
    id: 'dagre',
    layoutEngineKey: 'dagre',
    controlSpecs: [
      {
        key: 'elk.layered.spacing.nodeNodeBetweenLayers',
        label: 'Layer gap',
        group: 'Spacing',
        kind: 'number' as const,
        defaultValue: '64',
        persistNamespace: 'meta.elk',
      },
    ],
  };

  it('merges YAML and session overrides through the active manifest and prunes hidden branches', () => {
    expect(resolveEffectiveLayoutOperatorOverrides({
      manifest: forceManifest,
      engineLayout: {
        'meta.elk': {
          'elk.force.model': 'FRUCHTERMAN_REINGOLD',
          'elk.force.temperature': 0.03,
        },
      },
      sessionOverrides: {
        'elk.force.model': 'EADES',
        'elk.force.repulsion': 7,
      },
    })).toEqual({
      'elk.force.model': 'EADES',
      'elk.force.repulsion': 7,
    });
  });

  it('keeps per-operator buckets isolated when switching engines', () => {
    const model = {
      layoutOverrides: { stale: true },
      layoutOverrideNamespace: 'meta.dagre',
    };

    activateLayoutOperatorOverrideBucket(model, layeredManifest, {
      fallbackOverrides: {
        'elk.layered.spacing.nodeNodeBetweenLayers': 96,
      },
      persistNamespace: 'meta.elk',
    });

    expect(model.layoutOverrides).toEqual({
      'elk.layered.spacing.nodeNodeBetweenLayers': 96,
    });
    expect(model.layoutOverrideNamespace).toBe('meta.elk');
  });

  it('stores independent buckets for each operator while keeping the active alias in sync', () => {
    const model = {};

    writeLayoutOperatorOverrideBucketForManifest(model, forceManifest, {
      'elk.force.model': 'EADES',
      'elk.force.repulsion': 9,
    }, 'meta.elk');
    writeLayoutOperatorOverrideBucketForManifest(model, layeredManifest, {
      'elk.layered.spacing.nodeNodeBetweenLayers': 72,
    }, 'meta.elk');

    expect(readLayoutOperatorOverrideBucketForManifest(model, forceManifest)).toEqual({
      'elk.force.model': 'EADES',
      'elk.force.repulsion': 9,
    });
    expect(readLayoutOperatorOverrideBucketForManifest(model, layeredManifest)).toEqual({
      'elk.layered.spacing.nodeNodeBetweenLayers': 72,
    });
    expect(model).toMatchObject({
      layoutOverrides: {
        'elk.layered.spacing.nodeNodeBetweenLayers': 72,
      },
    });
    expect(readLayoutOperatorOverrideState(model)).toEqual({
      activeOperatorKey: 'elk-layered',
      byOperator: {
        'elk-force': {
          'elk.force.model': 'EADES',
          'elk.force.repulsion': 9,
        },
        'elk-layered': {
          'elk.layered.spacing.nodeNodeBetweenLayers': 72,
        },
      },
    });
    expect(model).toMatchObject({
      previewInterpreterActiveNodeId: 'elk-layered',
      previewInterpreterNodeRegistry: {
        paramsByNodeId: {
          'elk-force': {
            'elk.force.model': 'EADES',
            'elk.force.repulsion': 9,
          },
          'elk-layered': {
            'elk.layered.spacing.nodeNodeBetweenLayers': 72,
          },
        },
      },
    });
  });

  it('omits blank numeric defaults while retaining blank enum values', () => {
    const model = {};
    const manifest = {
      id: 'elk-layered',
      layoutEngineKey: 'elk-layered',
      controlSpecs: [
        {
          key: 'elk.aspectRatio',
          label: 'Aspect ratio',
          group: 'Layout',
          kind: 'number' as const,
          defaultValue: '',
          persistNamespace: 'meta.elk' as const,
        },
        {
          key: 'elk.direction',
          label: 'Direction',
          group: 'Layout',
          kind: 'enum' as const,
          defaultValue: '',
          persistNamespace: 'meta.elk' as const,
          enumValues: [{ value: '', label: 'Automatic' }],
        },
      ],
    };

    writeLayoutOperatorOverrideBucketForManifest(model, manifest, {
      'elk.aspectRatio': '',
      'elk.direction': '',
    }, 'meta.elk');

    expect(readLayoutOperatorOverrideBucketForManifest(model, manifest)).toEqual({
      'elk.direction': '',
    });
  });

  it('does not leak option buckets across layered to radial to layered switches', () => {
    const model = {};

    writeLayoutOperatorOverrideBucketForManifest(model, layeredManifest, {
      'elk.layered.spacing.nodeNodeBetweenLayers': 72,
    }, 'meta.elk');
    writeLayoutOperatorOverrideBucketForManifest(model, radialManifest, {
      'elk.radial.radius': 160,
    }, 'meta.elk');
    activateLayoutOperatorOverrideBucket(model, layeredManifest, {
      persistNamespace: 'meta.elk',
    });

    expect(readLayoutOperatorOverrideBucketForManifest(model, layeredManifest)).toEqual({
      'elk.layered.spacing.nodeNodeBetweenLayers': 72,
    });
    expect(readLayoutOperatorOverrideBucketForManifest(model, radialManifest)).toEqual({
      'elk.radial.radius': 160,
    });
    expect(model).toMatchObject({
      layoutOverrideNamespace: 'meta.elk',
      layoutOverrides: {
        'elk.layered.spacing.nodeNodeBetweenLayers': 72,
      },
    });
    expect(readLayoutOperatorOverrideState(model)).toEqual({
      activeOperatorKey: 'elk-layered',
      byOperator: {
        'elk-layered': {
          'elk.layered.spacing.nodeNodeBetweenLayers': 72,
        },
        'elk-radial': {
          'elk.radial.radius': 160,
        },
      },
    });
    expect(model).not.toMatchObject({
      layoutOverrides: {
        'elk.radial.radius': 160,
      },
    });
    expect(model).toMatchObject({
      previewInterpreterNodeRegistry: {
        paramsByNodeId: {
          'elk-layered': {
            'elk.layered.spacing.nodeNodeBetweenLayers': 72,
          },
          'elk-radial': {
            'elk.radial.radius': 160,
          },
        },
      },
    });
  });

  it('canonicalizes the legacy dagre alias onto the layered bucket', () => {
    const model = {};

    writeLayoutOperatorOverrideBucketForManifest(model, layeredManifest, {
      'elk.layered.spacing.nodeNodeBetweenLayers': 72,
    }, 'meta.elk');
    writeLayoutOperatorOverrideBucketForManifest(model, legacyDagreAliasManifest, {
      'elk.layered.spacing.nodeNodeBetweenLayers': 144,
    }, 'meta.elk');
    activateLayoutOperatorOverrideBucket(model, layeredManifest, {
      persistNamespace: 'meta.elk',
    });

    expect(readLayoutOperatorOverrideBucketForManifest(model, layeredManifest)).toEqual({
      'elk.layered.spacing.nodeNodeBetweenLayers': 144,
    });
    expect(readLayoutOperatorOverrideBucketForManifest(model, legacyDagreAliasManifest)).toEqual({
      'elk.layered.spacing.nodeNodeBetweenLayers': 144,
    });
    expect(model).toMatchObject({
      layoutOverrideNamespace: 'meta.elk',
      layoutOverrides: {
        'elk.layered.spacing.nodeNodeBetweenLayers': 144,
      },
      previewInterpreterActiveNodeId: 'elk-layered',
      previewInterpreterNodeRegistry: {
        paramsByNodeId: {
          'elk-layered': {
            'elk.layered.spacing.nodeNodeBetweenLayers': 144,
          },
        },
      },
    });
    expect(readLayoutOperatorOverrideState(model)).toEqual({
      activeOperatorKey: 'elk-layered',
      byOperator: {
        'elk-layered': {
          'elk.layered.spacing.nodeNodeBetweenLayers': 144,
        },
      },
    });
    expect(model).toMatchObject({
      layoutOverrides: {
        'elk.layered.spacing.nodeNodeBetweenLayers': 144,
      },
    });
  });

  it('clears node-owned params without leaving an empty bucket behind', () => {
    const model = {};

    writeLayoutOperatorOverrideBucketForManifest(model, radialManifest, {
      'elk.radial.radius': 160,
    }, 'meta.elk');
    writeLayoutOperatorOverrideBucketForManifest(model, radialManifest, {}, 'meta.elk');

    expect(readLayoutOperatorOverrideState(model)).toEqual({
      activeOperatorKey: 'elk-radial',
      byOperator: {},
    });
    expect(model).toMatchObject({
      previewInterpreterActiveNodeId: 'elk-radial',
      previewInterpreterNodeRegistry: {
        nodeIds: ['elk-radial'],
        paramsByNodeId: {},
      },
      layoutOverrides: {},
    });
  });

  it('derives legacy aliases from node-owned interpreter params', () => {
    const model = {
      layoutOperatorOverrides: {
        activeOperatorKey: 'elk-layered',
        byOperator: {
          'elk-layered': {
            'elk.layered.spacing.nodeNodeBetweenLayers': 64,
          },
        },
      },
      layoutOverrideNamespace: 'meta.elk',
    };

    writeLayoutOperatorOverrideBucketForManifest(model, radialManifest, {
      'elk.radial.radius': 180,
    }, 'meta.elk');
    activateLayoutOperatorOverrideBucket(model, layeredManifest, {
      persistNamespace: 'meta.elk',
    });

    expect(model).toMatchObject({
      previewInterpreterActiveNodeId: 'elk-layered',
      previewInterpreterNodeRegistry: {
        paramsByNodeId: {
          'elk-layered': {
            'elk.layered.spacing.nodeNodeBetweenLayers': 64,
          },
          'elk-radial': {
            'elk.radial.radius': 180,
          },
        },
      },
      layoutOverrides: {
        'elk.layered.spacing.nodeNodeBetweenLayers': 64,
      },
    });
    expect(readLayoutOperatorOverrideState(model)).toEqual({
      activeOperatorKey: 'elk-layered',
      byOperator: {
        'elk-layered': {
          'elk.layered.spacing.nodeNodeBetweenLayers': 64,
        },
        'elk-radial': {
          'elk.radial.radius': 180,
        },
      },
    });
  });

  it('collects namespaced overrides from the active manifest only', () => {
    expect(collectNamespacedLayoutOperatorOverrides({
      manifest: forceManifest,
      sessionOverrides: {
        'elk.force.model': 'EADES',
        'elk.force.repulsion': 11,
      },
    })).toEqual({
      'meta.elk': {
        'elk.force.model': 'EADES',
        'elk.force.repulsion': 11,
      },
    });
  });

  it('prunes hidden branches instead of preserving fully hidden keys', () => {
    expect(pruneSessionBucketForManifest(forceManifest, {
      'elk.force.model': 'FRUCHTERMAN_REINGOLD',
      'elk.force.repulsion': 11,
    })).toEqual({
      'elk.force.model': 'FRUCHTERMAN_REINGOLD',
    });
  });

  it('drops stale keys for engines with no surfaced control specs', () => {
    expect(pruneSessionBucketForManifest({
      id: 'empty',
      layoutEngineKey: 'empty',
      controlSpecs: [],
    }, {
      stale: true,
    })).toEqual({});
  });
});
