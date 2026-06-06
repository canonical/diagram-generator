import { describe, expect, it } from 'vitest';

import { indexPlacedNodes } from '../src/node-bounds.js';
import { layoutForceForFamily } from '../src/index.js';

const BOX = { width: 192, height: 64 };

describe('ELK force', () => {
  it('runs ELK force for force-directed corpus families', async () => {
    const result = await layoutForceForFamily('system_architecture', {
      id: 'root',
      nodes: [
        { id: 'gateway', ...BOX },
        { id: 'api', ...BOX },
        { id: 'worker', ...BOX },
      ],
      edges: [
        { id: 'gateway-api', source: 'gateway', target: 'api' },
        { id: 'api-worker', source: 'api', target: 'worker' },
      ],
    });

    const nodes = indexPlacedNodes(result.nodes);
    expect(result.engine).toBe('elk-force');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(nodes.get('gateway')).toBeDefined();
    expect(nodes.get('api')).toBeDefined();
    expect(nodes.get('worker')).toBeDefined();
    expect(nodes.get('gateway')!.x === nodes.get('api')!.x && nodes.get('gateway')!.y === nodes.get('api')!.y).toBe(false);
  });
});