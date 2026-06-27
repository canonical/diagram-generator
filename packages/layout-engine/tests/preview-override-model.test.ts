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

  it('prefers the generic layout override owner without mutating model aliases', () => {
    const model = {
      overrides: {},
      layoutOverrides: {
        'elk.direction': 'RIGHT',
      },
      elkLayoutOverrides: {
        'elk.direction': 'DOWN',
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
      elk_layout_overrides: {
        'elk.direction': 'RIGHT',
      },
    });
    expect(model.layoutOverrides).toEqual({
      'elk.direction': 'RIGHT',
    });
    expect(model.elkLayoutOverrides).toEqual({
      'elk.direction': 'DOWN',
    });
  });

  it('reads the legacy ELK alias when the generic override owner is empty', () => {
    const model = {
      overrides: {},
      layoutOverrides: {},
      elkLayoutOverrides: {
        'elk.layered.spacing.nodeNodeBetweenLayers': 48,
      },
      removedIds: new Set<string>(),
    };

    expect(createPreviewOverridePayload(model).engine_layout_overrides).toEqual({
      'meta.elk': {
        'elk.layered.spacing.nodeNodeBetweenLayers': 48,
      },
    });
    expect(model.layoutOverrides).toEqual({});
    expect(model.elkLayoutOverrides).toEqual({
      'elk.layered.spacing.nodeNodeBetweenLayers': 48,
    });
  });

  it('routes explicit non-ELK layout namespaces through the shared persistence contract', () => {
    const model = {
      overrides: {},
      layoutOverrides: {
        'dagre.rankdir': 'LR',
        transient: 'ignored',
      },
      layoutOverrideNamespace: 'meta.dagre',
      elkLayoutOverrides: {
        stale: true,
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
      },
    });
    expect(model.layoutOverrideNamespace).toBe('meta.dagre');
    expect(model.layoutOverrides).toEqual({
      'dagre.rankdir': 'LR',
      transient: 'ignored',
    });
    expect(model.elkLayoutOverrides).toEqual({
      stale: true,
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
