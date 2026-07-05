import { describe, expect, it } from 'vitest';
import {
  ELK_FORCE_PARAM_SPECS,
  ELK_LAYERED_PARAM_SPECS,
  ELK_MRTREE_PARAM_SPECS,
  ELK_RADIAL_PARAM_SPECS,
  ELK_RECTPACKING_PARAM_SPECS,
  ELK_STRESS_PARAM_SPECS,
} from '@diagram-generator/graph-layout-elk';
import { ELK_FORCE_PREVIEW_ENGINE } from '../src/preview-engine/engines/elk-force.engine.js';
import { ELK_LAYERED_PREVIEW_ENGINE } from '../src/preview-engine/engines/elk-layered.engine.js';
import { ELK_MRTREE_PREVIEW_ENGINE } from '../src/preview-engine/engines/elk-mrtree.engine.js';
import { ELK_RADIAL_PREVIEW_ENGINE } from '../src/preview-engine/engines/elk-radial.engine.js';
import { ELK_RECTPACKING_PREVIEW_ENGINE } from '../src/preview-engine/engines/elk-rectpacking.engine.js';
import { ELK_STRESS_PREVIEW_ENGINE } from '../src/preview-engine/engines/elk-stress.engine.js';

function keys(specs: readonly { key: string }[]): string[] {
  return specs.map((spec) => spec.key);
}

describe('preview graph control inventory', () => {
  it('keeps implementation-owned ELK bridge keys out of author-facing graph controls', () => {
    const elkEngines = [
      ELK_FORCE_PREVIEW_ENGINE,
      ELK_STRESS_PREVIEW_ENGINE,
      ELK_MRTREE_PREVIEW_ENGINE,
      ELK_RADIAL_PREVIEW_ENGINE,
      ELK_RECTPACKING_PREVIEW_ENGINE,
    ];

    for (const engine of elkEngines) {
      expect(keys(engine.controlSpecs)).not.toContain('elk.padding');
      expect(keys(engine.controlSpecs)).not.toContain('elk.portConstraints');
    }
  });

  it('surfaces the approved ELK layered inventory through the layered preview manifest', () => {
    expect(keys(ELK_LAYERED_PREVIEW_ENGINE.controlSpecs)).toEqual(keys(ELK_LAYERED_PARAM_SPECS));
  });

  it('surfaces the approved ELK force inventory through the force preview manifest', () => {
    expect(keys(ELK_FORCE_PREVIEW_ENGINE.controlSpecs)).toEqual(keys(ELK_FORCE_PARAM_SPECS));
  });

  it('surfaces the approved ELK stress inventory through the stress preview manifest', () => {
    expect(keys(ELK_STRESS_PREVIEW_ENGINE.controlSpecs)).toEqual(keys(ELK_STRESS_PARAM_SPECS));
  });

  it('surfaces the approved ELK mrtree inventory through the tree preview manifest', () => {
    expect(keys(ELK_MRTREE_PREVIEW_ENGINE.controlSpecs)).toEqual(keys(ELK_MRTREE_PARAM_SPECS));
  });

  it('surfaces the approved ELK radial inventory through the radial preview manifest', () => {
    expect(keys(ELK_RADIAL_PREVIEW_ENGINE.controlSpecs)).toEqual(keys(ELK_RADIAL_PARAM_SPECS));
  });

  it('surfaces the approved ELK rectpacking inventory through the rectpacking preview manifest', () => {
    expect(keys(ELK_RECTPACKING_PREVIEW_ENGINE.controlSpecs)).toEqual(keys(ELK_RECTPACKING_PARAM_SPECS));
  });
});
