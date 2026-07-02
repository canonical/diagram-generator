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

  it('routes explicit non-ELK layout namespaces through the shared persistence contract', () => {
    const model = {
      overrides: {},
      layoutOverrides: {
        'dagre.rankdir': 'LR',
        transient: 'ignored',
      },
      layoutOverrideNamespace: 'meta.dagre',
      removedIds: new Set<string>(),
    };

    expect(createPreviewOverridePayload(model)).toEqual({
      overrides: {},
      format_version: 1,
      engine_layout_overrides: {
        'meta.dagre': {
          'dagre.rankdir': 'LR',
        },
      },
    });
    expect(model.layoutOverrideNamespace).toBe('meta.dagre');
    expect(model.layoutOverrides).toEqual({
      'dagre.rankdir': 'LR',
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
        'dagre.rankdir': 'LR',
      },
      layoutOverrideNamespace: 'meta.dagre',
      layoutOperatorOverrides: {
        activeOperatorKey: 'dagre',
        byOperator: {
          dagre: {
            'dagre.rankdir': 'LR',
          },
          'elk-layered': {
            'elk.spacing.edgeNode': 56,
          },
        },
      },
      previewInterpreterNodeRegistry: {
        nodeIds: ['dagre', 'elk-layered'],
        nodes: [
          {
            nodeId: 'dagre',
            engineId: 'dagre',
            layoutEngineKey: 'dagre',
            manifest: {
              id: 'dagre',
              label: 'Dagre',
              layoutEngineKey: 'dagre',
              shellMode: 'grid',
              capabilities: {} as never,
              controlSpecs: [
                {
                  key: 'dagre.rankdir',
                  label: 'Direction',
                  group: 'Graph',
                  kind: 'enum',
                  defaultValue: 'TB',
                  persistNamespace: 'meta.dagre',
                },
              ],
              scripts: [],
              compatibility: { documentKinds: ['frame-diagram'] },
            },
            params: {
              'dagre.rankdir': 'LR',
            },
          },
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
          dagre: {
            'dagre.rankdir': 'LR',
          },
          'elk-layered': {
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
        'meta.dagre': {
          'dagre.rankdir': 'LR',
        },
        'meta.dagre_nodes': {
          dagre: {
            'dagre.rankdir': 'LR',
          },
        },
        'meta.elk_nodes': {
          'elk-layered': {
            'elk.spacing.edgeNode': 56,
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
