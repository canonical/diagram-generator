export type DagreParamKind = 'number' | 'enum' | 'boolean' | 'text';

export interface DagreParamSpec {
  key: string;
  label: string;
  group: string;
  kind: DagreParamKind;
  defaultValue: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  enumValues?: { value: string; label: string }[];
}

export const DAGRE_PARAM_SPECS: DagreParamSpec[] = [
  {
    key: 'dagre.rankdir',
    label: 'Direction',
    group: 'Graph',
    kind: 'enum',
    defaultValue: '',
    enumValues: [
      { value: '', label: 'Auto (diagram)' },
      { value: 'TB', label: 'Top to bottom (TB)' },
      { value: 'LR', label: 'Left to right (LR)' },
      { value: 'BT', label: 'Bottom to top' },
      { value: 'RL', label: 'Right to left' },
    ],
    description: 'Dagre rank direction. Auto follows the diagram direction.',
  },
  {
    key: 'dagre.nodesep',
    label: 'Node gap',
    group: 'Spacing',
    kind: 'number',
    defaultValue: '72',
    min: 8,
    max: 512,
    step: 8,
    description: 'Minimum separation between nodes in the same rank.',
  },
  {
    key: 'dagre.ranksep',
    label: 'Rank gap',
    group: 'Spacing',
    kind: 'number',
    defaultValue: '96',
    min: 8,
    max: 512,
    step: 8,
    description: 'Minimum separation between adjacent ranks.',
  },
  {
    key: 'dagre.edgesep',
    label: 'Edge gap',
    group: 'Spacing',
    kind: 'number',
    defaultValue: '24',
    min: 0,
    max: 256,
    step: 4,
    description: 'Minimum separation between adjacent edges.',
  },
];

export function dagreParamDefaults(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const spec of DAGRE_PARAM_SPECS) {
    out[spec.key] = spec.defaultValue;
  }
  return out;
}
