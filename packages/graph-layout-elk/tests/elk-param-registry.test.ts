import { describe, expect, it } from 'vitest';
import { ELK_LAYERED_PARAM_SPECS } from '../src/elk-param-registry.js';

describe('ELK layered param registry', () => {
  it('treats direction as an optional override so diagram flow stays authoritative by default', () => {
    const directionSpec = ELK_LAYERED_PARAM_SPECS.find((spec) => spec.key === 'elk.direction');

    expect(directionSpec).toMatchObject({
      defaultValue: '',
    });
    expect(directionSpec?.enumValues?.[0]).toEqual({
      value: '',
      label: 'Auto (diagram)',
    });
  });
});
