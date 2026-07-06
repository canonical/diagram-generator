import { describe, expect, it } from 'vitest';
import { migrateLegacyFrameDiagramEngineState } from '../src/preview-engine/legacy-layout-engine-migration.js';

describe('legacy layout engine migration', () => {
  it('strips unsupported legacy dagre buckets from runtime engine-layout state', () => {
    const migrated = migrateLegacyFrameDiagramEngineState({
      layoutEngine: 'dagre',
      engineLayout: {
        'meta.dagre': {
          'dagre.unsupported': 'x',
        },
        'meta.dagre_nodes': {
          dagre: {
            'dagre.unknown': 'y',
          },
        },
      },
    });

    expect(migrated.layoutEngine).toBe('elk-layered');
    expect(migrated.engineLayout).toEqual({});
    expect(migrated.engineLayout).not.toHaveProperty('meta.dagre');
    expect(migrated.engineLayout).not.toHaveProperty('meta.dagre_nodes');
  });

  it('keeps authored ELK overrides when legacy dagre keys collide with the canonical namespace', () => {
    const migrated = migrateLegacyFrameDiagramEngineState({
      layoutEngine: 'dagre',
      engineLayout: {
        'meta.elk': {
          'elk.direction': 'DOWN',
          'elk.spacing.nodeNode': 96,
        },
        'meta.dagre': {
          'dagre.rankdir': 'LR',
          'dagre.nodesep': 64,
          'dagre.unsupported': 'drop-me',
        },
      },
    });

    expect(migrated.engineLayout?.['meta.elk']).toEqual({
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': 96,
    });
  });

  it('migrates supported dagre keys while dropping unsupported ones from mixed payloads', () => {
    const migrated = migrateLegacyFrameDiagramEngineState({
      layoutEngine: 'dagre',
      engineLayout: {
        'meta.dagre': {
          'dagre.rankdir': 'LR',
          'dagre.unsupported': 'drop-me',
        },
      },
    });

    expect(migrated.engineLayout?.['meta.elk']).toEqual({
      'elk.direction': 'RIGHT',
    });
  });

  it('preserves node bucket ids instead of alias-mapping them as engine keys', () => {
    const migrated = migrateLegacyFrameDiagramEngineState({
      layoutEngine: 'dagre',
      engineLayout: {
        'meta.dagre_nodes': {
          dagre: {
            'dagre.rankdir': 'LR',
          },
        },
      },
    });

    expect(migrated.engineLayout?.['meta.elk_nodes']).toEqual({
      dagre: {
        'elk.direction': 'RIGHT',
      },
    });
  });
});
