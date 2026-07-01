import { describe, expect, it } from 'vitest';

import { loadNormalizedFrameFixture } from './helpers/frame-fixture-normalization.js';

describe('loadNormalizedFrameFixture', () => {
  it('selects an explicit engine and clears unrelated authored option metadata', () => {
    const diagram = loadNormalizedFrameFixture('example-deployment-pipeline', {
      engine: 'elk-layered',
      engineLayout: {
        'meta.elk': {
          'elk.algorithm': 'layered',
        },
      },
    });

    expect(diagram.layoutEngine).toBe('elk-layered');
    expect(diagram.elkLayout).toBeUndefined();
    expect(diagram.engineLayout).toEqual({
      'meta.elk': {
        'elk.algorithm': 'layered',
      },
    });
  });
});
