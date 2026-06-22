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

  it('requires non-behavior-covered controls to carry user-facing caveat copy', () => {
    const behaviorCoveredKeys = new Set([
      'elk.direction',
      'elk.layered.spacing.nodeNodeBetweenLayers',
      'elk.spacing.nodeNode',
      'elk.layered.layering.strategy',
    ]);

    for (const spec of ELK_LAYERED_PARAM_SPECS) {
      if (behaviorCoveredKeys.has(spec.key)) {
        continue;
      }
      expect(spec.description, `missing caveat/usage copy for ${spec.key}`).toBeTruthy();
    }
  });
});
