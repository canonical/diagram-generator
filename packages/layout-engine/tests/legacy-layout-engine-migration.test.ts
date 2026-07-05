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
});
