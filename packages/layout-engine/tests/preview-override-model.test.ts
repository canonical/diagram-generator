import { describe, expect, it } from 'vitest';
import {
  collectPreviewTopLevelRemovalIds,
  createPreviewOverridePayload,
} from '../src/preview-shell/preview-override-model.js';

describe('preview override payload model', () => {
  it('collects top-level removals and drops transient grid keys', () => {
    const model = {
      overrides: {
        alpha: { dx: 8, debug: true },
        'arrow:id:edge-1': {
          waypoints: [[24, 32]],
          color: '#E95420',
          selected: true,
        },
      },
      gridOverrides: {
        col_gap: 24,
        rows: 6,
        slack_absorption: 'stretch',
      },
      removedIds: new Set(['root', 'child', 'orphan']),
      get(id: string) {
        if (id === 'root') {
          return { ancestorIds: [] };
        }
        if (id === 'child') {
          return { ancestorIds: ['root'] };
        }
        return null;
      },
    };

    expect(collectPreviewTopLevelRemovalIds(model)).toEqual(['root', 'orphan']);
    expect(createPreviewOverridePayload(model)).toEqual({
      overrides: {
        alpha: { dx: 8 },
        'arrow:id:edge-1': {
          waypoints: [[24, 32]],
        },
      },
      format_version: 1,
      removed_ids: ['root', 'orphan'],
      grid_overrides: {
        col_gap: 24,
      },
    });
  });

  it('persists the active layout override owner without emitting a duplicate ELK alias payload', () => {
    const model = {
      overrides: {},
      layoutOverrides: {
        'elk.direction': 'RIGHT',
      },
      removedIds: new Set<string>(),
    };

    expect(createPreviewOverridePayload(model)).toEqual({
      overrides: {},
      format_version: 1,
      engine_layout_overrides: {
        'meta.elk': {
          'elk.direction': 'RIGHT',
        },
      },
    });
    expect(model.layoutOverrides).toEqual({
      'elk.direction': 'RIGHT',
    });
  });

  it('does not fall back to a removed ELK-only alias lane', () => {
    const model = {
      overrides: {},
      layoutOverrides: {},
      removedIds: new Set<string>(),
    };

    expect(createPreviewOverridePayload(model).engine_layout_overrides).toBeUndefined();
    expect(model.layoutOverrides).toEqual({});
  });

  it('routes canonical engine layout namespaces through the shared persistence contract', () => {
    const model = {
      overrides: {},
      layoutOverrides: {
        'elk.direction': 'RIGHT',
        transient: 'ignored',
      },
      layoutOverrideNamespace: 'meta.elk',
      removedIds: new Set<string>(),
    };

    expect(createPreviewOverridePayload(model)).toEqual({
      overrides: {},
      format_version: 1,
      engine_layout_overrides: {
        'meta.elk': {
          'elk.direction': 'RIGHT',
        },
      },
    });
    expect(model.layoutOverrideNamespace).toBe('meta.elk');
    expect(model.layoutOverrides).toEqual({
      'elk.direction': 'RIGHT',
      transient: 'ignored',
    });
  });

  it('persists only the active operator manifest keys instead of a shared namespace union', () => {
    const model = {
      overrides: {},
      layoutOverrides: {
        'elk.spacing.nodeNode': 96,
        'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      },
      layoutOverrideNamespace: 'meta.elk',
      layoutOperatorOverrides: {
        activeOperatorKey: 'elk-force',
        byOperator: {
          'elk-force': {
            'elk.spacing.nodeNode': 96,
            'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
          },
        },
      },
      removedIds: new Set<string>(),
    };

    expect(createPreviewOverridePayload(model)).toEqual({
      overrides: {},
      format_version: 1,
      engine_layout_overrides: {
        'meta.elk': {
          'elk.spacing.nodeNode': 96,
        },
      },
    });
  });

  it('persists per-node interpreter buckets under family-scoped node namespaces', () => {
    const model = {
      overrides: {},
      layoutOverrides: {
        'elk.direction': 'RIGHT',
      },
      layoutOverrideNamespace: 'meta.elk',
      layoutOperatorOverrides: {
        activeOperatorKey: 'elk-layered',
        byOperator: {
          'elk-layered': {
            'elk.direction': 'RIGHT',
          },
          'elk-radial': {
            'elk.spacing.edgeNode': 56,
          },
        },
      },
      previewInterpreterNodeRegistry: {
        nodeIds: ['elk-layered', 'elk-radial'],
        nodes: [
          {
            nodeId: 'elk-layered',
            engineId: 'elk-layered',
            layoutEngineKey: 'elk-layered',
            manifest: {
              id: 'elk-layered',
              label: 'ELK Layered',
              layoutEngineKey: 'elk-layered',
              shellMode: 'grid',
              capabilities: {} as never,
              controlSpecs: [
                {
                  key: 'elk.direction',
                  label: 'Direction',
                  group: 'Graph',
                  kind: 'enum',
                  defaultValue: 'DOWN',
                  persistNamespace: 'meta.elk',
                },
              ],
              scripts: [],
              compatibility: { documentKinds: ['frame-diagram'] },
            },
            params: {
              'elk.direction': 'RIGHT',
            },
          },
          {
            nodeId: 'elk-radial',
            engineId: 'elk-radial',
            layoutEngineKey: 'elk-radial',
            manifest: {
              id: 'elk-radial',
              label: 'ELK Radial',
              layoutEngineKey: 'elk-radial',
              shellMode: 'grid',
              capabilities: {} as never,
              controlSpecs: [
                {
                  key: 'elk.spacing.edgeNode',
                  label: 'Edge gap',
                  group: 'Spacing',
                  kind: 'number',
                  defaultValue: '40',
                  persistNamespace: 'meta.elk',
                },
              ],
              scripts: [],
              compatibility: { documentKinds: ['frame-diagram'] },
            },
            params: {
              'elk.spacing.edgeNode': 56,
            },
          },
        ],
        paramsByNodeId: {
          'elk-layered': {
            'elk.direction': 'RIGHT',
          },
          'elk-radial': {
            'elk.spacing.edgeNode': 56,
          },
        },
      },
      removedIds: new Set<string>(),
    };

    expect(createPreviewOverridePayload(model)).toEqual({
      overrides: {},
      format_version: 1,
      engine_layout_overrides: {
        'meta.elk': {
          'elk.direction': 'RIGHT',
        },
        'meta.elk_nodes': {
          'elk-layered': {
            'elk.direction': 'RIGHT',
          },
          'elk-radial': {
            'elk.spacing.edgeNode': 56,
          },
        },
      },
    });
  });

  it('emits empty node namespaces so saves can clear fully emptied non-active buckets', () => {
    const model = {
      overrides: {},
      layoutOverrides: {
        'elk.direction': 'RIGHT',
      },
      layoutOverrideNamespace: 'meta.elk',
      previewInterpreterNodeRegistry: {
        nodeIds: ['elk-layered', 'elk-radial'],
        nodes: [
          {
            nodeId: 'elk-layered',
            engineId: 'elk-layered',
            layoutEngineKey: 'elk-layered',
            manifest: {
              id: 'elk-layered',
              label: 'ELK Layered',
              layoutEngineKey: 'elk-layered',
              shellMode: 'grid',
              capabilities: {} as never,
              controlSpecs: [
                {
                  key: 'elk.direction',
                  label: 'Direction',
                  group: 'Graph',
                  kind: 'enum',
                  defaultValue: 'DOWN',
                  persistNamespace: 'meta.elk',
                },
              ],
              scripts: [],
              compatibility: { documentKinds: ['frame-diagram'] },
            },
            params: {
              'elk.direction': 'RIGHT',
            },
          },
          {
            nodeId: 'elk-radial',
            engineId: 'elk-radial',
            layoutEngineKey: 'elk-radial',
            manifest: {
              id: 'elk-radial',
              label: 'ELK Radial',
              layoutEngineKey: 'elk-radial',
              shellMode: 'grid',
              capabilities: {} as never,
              controlSpecs: [
                {
                  key: 'elk.radial.radius',
                  label: 'Radius',
                  group: 'Spacing',
                  kind: 'number',
                  defaultValue: '120',
                  persistNamespace: 'meta.elk',
                },
              ],
              scripts: [],
              compatibility: { documentKinds: ['frame-diagram'] },
            },
            params: null,
          },
        ],
        paramsByNodeId: {
          'elk-layered': {
            'elk.direction': 'RIGHT',
          },
        },
      },
      removedIds: new Set<string>(),
    };

    expect(createPreviewOverridePayload(model)).toEqual({
      overrides: {},
      format_version: 1,
      engine_layout_overrides: {
        'meta.elk': {
          'elk.direction': 'RIGHT',
        },
        'meta.elk_nodes': {
          'elk-layered': {
            'elk.direction': 'RIGHT',
          },
        },
      },
    });
  });

  it('synthesizes arrow waypoint clears for authored arrows after reroute-bearing frame edits', () => {
    const model = {
      overrides: {
        root: {
          direction: 'right',
        },
      },
      removedIds: new Set<string>(),
      allIds: ['root', 'arrow:id:edge-1'],
      get(id: string) {
        if (id === 'root') {
          return {
            type: 'frame',
            data: {},
          };
        }
        if (id === 'arrow:id:edge-1') {
          return {
            type: 'arrow',
            data: {
              authoredWaypoints: [[480, 192], [640, 192]],
            },
          };
        }
        return null;
      },
    };

    expect(createPreviewOverridePayload(model)).toEqual({
      overrides: {
        root: {
          direction: 'right',
        },
        'arrow:id:edge-1': {
          waypoints: [],
        },
      },
      format_version: 1,
    });
  });

  it('clears persisted arrow waypoint overrides when reroute-bearing frame edits are pending', () => {
    const model = {
      overrides: {
        root: {
          width: 480,
        },
        'arrow:id:edge-1': {
          waypoints: [[24, 32]],
        },
      },
      removedIds: new Set<string>(),
      allIds: ['root', 'arrow:id:edge-1'],
      get(id: string) {
        if (id === 'root') {
          return {
            type: 'frame',
            data: {},
          };
        }
        if (id === 'arrow:id:edge-1') {
          return {
            type: 'arrow',
            data: {},
          };
        }
        return null;
      },
    };

    expect(createPreviewOverridePayload(model)).toEqual({
      overrides: {
        root: {
          width: 480,
        },
        'arrow:id:edge-1': {
          waypoints: [],
        },
      },
      format_version: 1,
    });
  });
});
