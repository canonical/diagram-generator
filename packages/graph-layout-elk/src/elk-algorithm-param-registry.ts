import type { ElkParamSpec } from './elk-param-registry.js';

const NODE_SPACING_SPEC: ElkParamSpec = {
  key: 'elk.spacing.nodeNode',
  label: 'Node gap',
  group: 'Spacing',
  kind: 'number',
  defaultValue: '72',
  min: 8,
  max: 512,
  step: 8,
  description: 'Preferred gap between nodes for this ELK algorithm.',
};

const RANDOM_SEED_SPEC: ElkParamSpec = {
  key: 'elk.randomSeed',
  label: 'Random seed',
  group: 'Graph',
  kind: 'number',
  defaultValue: '0',
  min: 0,
  max: 999999,
  step: 1,
  description: 'Deterministic seed used by stochastic ELK passes.',
};

const MRTREE_DIRECTION_SPEC: ElkParamSpec = {
  key: 'elk.direction',
  label: 'Direction',
  group: 'Graph',
  kind: 'enum',
  defaultValue: '',
  enumValues: [
    { value: '', label: 'Auto (diagram)' },
    { value: 'DOWN', label: 'Top to bottom (TB)' },
    { value: 'RIGHT', label: 'Left to right (LR)' },
    { value: 'UP', label: 'Bottom to top' },
    { value: 'LEFT', label: 'Right to left' },
  ],
  description: 'Tree growth direction. Auto follows the diagram direction.',
};

export const ELK_STRESS_PARAM_SPECS: ElkParamSpec[] = [
  NODE_SPACING_SPEC,
  RANDOM_SEED_SPEC,
];

export const ELK_MRTREE_PARAM_SPECS: ElkParamSpec[] = [
  MRTREE_DIRECTION_SPEC,
  NODE_SPACING_SPEC,
];

export const ELK_RADIAL_PARAM_SPECS: ElkParamSpec[] = [
  NODE_SPACING_SPEC,
];

export const ELK_RECTPACKING_PARAM_SPECS: ElkParamSpec[] = [
  NODE_SPACING_SPEC,
];

export const ELK_ADDITIONAL_ALGORITHM_PARAM_SPECS: ElkParamSpec[] = [
  ...ELK_STRESS_PARAM_SPECS,
  ...ELK_MRTREE_PARAM_SPECS,
  ...ELK_RADIAL_PARAM_SPECS,
  ...ELK_RECTPACKING_PARAM_SPECS,
];
