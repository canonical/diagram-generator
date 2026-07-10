import type { ElkParamSpec } from './layered-options.js';

const FORCE_FR_MODEL_VISIBILITY = [{ key: 'elk.force.model', equals: 'FRUCHTERMAN_REINGOLD' }] as const;
const FORCE_EADES_MODEL_VISIBILITY = [{ key: 'elk.force.model', equals: 'EADES' }] as const;

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
    key: 'elk.spacing.edgeLabel',
    label: 'Edge label spacing',
    group: 'Spacing',
    kind: 'number',
    defaultValue: '5',
    min: 0,
    max: 128,
    step: 1,
    description: 'Clearance between force-layout edge labels and their associated edges.',
  },
  {
    key: 'elk.edgeLabels.inline',
    label: 'Inline edge labels',
    group: 'Edges',
    kind: 'boolean',
    defaultValue: 'false',
    description:
      'Place force edge labels directly on routed edges. Keep this off unless label rendering prevents edge/text crossings.',
  },
  {
    key: 'elk.force.model',
    label: 'Force model',
    group: 'Graph',
    kind: 'enum',
    defaultValue: 'FRUCHTERMAN_REINGOLD',
    enumValues: [
      { value: 'FRUCHTERMAN_REINGOLD', label: 'Fruchterman-Reingold' },
      { value: 'EADES', label: 'Eades' },
    ],
    description: 'Determines the force calculation model used by ELK.',
  },
  {
    key: 'elk.force.iterations',
    label: 'Iterations',
    group: 'Graph',
    kind: 'number',
    defaultValue: '300',
    min: 1,
    max: 10000,
    step: 10,
    description: 'Number of iterations used by the force simulation.',
  },
  {
    key: 'elk.aspectRatio',
    label: 'Aspect ratio',
    group: 'Graph',
    kind: 'number',
    defaultValue: '1.6',
    min: 0.1,
    max: 10,
    step: 0.1,
    description: 'Preferred width-to-height ratio for the resulting graph bounds.',
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
  {
    key: 'elk.force.temperature',
    label: 'FR temperature',
    group: 'Graph',
    kind: 'number',
    defaultValue: '0.001',
    min: 0.000001,
    max: 10,
    step: 0.001,
    visibleWhen: FORCE_FR_MODEL_VISIBILITY,
    description: 'Scaling factor for particle displacement in the Fruchterman-Reingold model.',
  },
  {
    key: 'elk.force.repulsion',
    label: 'Eades repulsion',
    group: 'Graph',
    kind: 'number',
    defaultValue: '5',
    min: 0,
    max: 100,
    step: 0.5,
    visibleWhen: FORCE_EADES_MODEL_VISIBILITY,
    description: 'Repulsive-force factor used only by the Eades model.',
  },
  {
    key: 'elk.force.repulsivePower',
    label: 'Repulsive power',
    group: 'Graph',
    kind: 'number',
    defaultValue: '0',
    min: 0,
    max: 16,
    step: 1,
    description:
      'Exponent used by ELK force repulsion. Zero keeps the force model default behavior.',
  },
];

export function elkForceParamDefaults(): Record<string, string> {
  const out: Record<string, string> = { 'elk.algorithm': 'force' };
  for (const spec of ELK_FORCE_PARAM_SPECS) {
    out[spec.key] = spec.defaultValue;
  }
  return out;
}
