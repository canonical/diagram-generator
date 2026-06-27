import { describe, expect, it } from 'vitest';
import {
  collectPreviewTopLevelRemovalIds,
  createPreviewOverridePayload,
} from '../src/preview-shell/preview-override-model.js';

describe('preview override payload model', () => {
  it('collects top-level removals and drops transient grid keys', () => {
    const model = {
      overrides: {
        alpha: { dx: 8 },
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
      },
      format_version: 1,
      removed_ids: ['root', 'orphan'],
      grid_overrides: {
        col_gap: 24,
      },
    });
  });

  it('syncs legacy ELK aliases and prefers the generic layout override owner', () => {
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
      'elk.direction': 'RIGHT',
    });
  });

  it('hydrates generic layout overrides from the legacy ELK alias when needed', () => {
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
    expect(model.layoutOverrides).toEqual({
      'elk.layered.spacing.nodeNodeBetweenLayers': 48,
    });
  });
});
