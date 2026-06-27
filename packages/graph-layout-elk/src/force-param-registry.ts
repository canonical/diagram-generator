import type { ElkParamSpec } from './layered-options.js';

export const ELK_FORCE_PARAM_SPECS: ElkParamSpec[] = [
  {
    key: 'elk.spacing.nodeNode',
    label: 'Node spacing',
    group: 'Spacing',
    kind: 'number',
    defaultValue: '72',
    min: 0,
    max: 512,
    step: 8,
    description: 'Preferred spacing between nodes in the force layout.',
  },
  {
    key: 'elk.separateConnectedComponents',
    label: 'Separate components',
    group: 'Graph',
    kind: 'boolean',
    defaultValue: 'false',
    description: 'Split disconnected components before running the force algorithm.',
  },
  {
    key: 'elk.randomSeed',
    label: 'Random seed',
    group: 'Graph',
    kind: 'number',
    defaultValue: '0',
    min: 0,
    max: 999999,
    step: 1,
    description: 'Deterministic seed for force-layout initialization.',
  },
];

export function elkForceParamDefaults(): Record<string, string> {
  const out: Record<string, string> = { 'elk.algorithm': 'force' };
  for (const spec of ELK_FORCE_PARAM_SPECS) {
    out[spec.key] = spec.defaultValue;
  }
  return out;
}
