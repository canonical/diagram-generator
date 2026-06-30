export type DagreParamKind = 'number' | 'enum' | 'boolean' | 'text';

export interface DagreParamVisibilityRule {
  key: string;
  equals?: string | readonly string[];
  notEquals?: string | readonly string[];
}

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
  visibleWhen?: readonly DagreParamVisibilityRule[];
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
    key: 'dagre.align',
    label: 'Rank align',
    group: 'Graph',
    kind: 'enum',
    defaultValue: '',
    enumValues: [
      { value: '', label: 'Default' },
      { value: 'UL', label: 'Up-left (UL)' },
      { value: 'UR', label: 'Up-right (UR)' },
      { value: 'DL', label: 'Down-left (DL)' },
      { value: 'DR', label: 'Down-right (DR)' },
    ],
    description: 'Aligns nodes inside each rank when Dagre has multiple valid placements.',
  },
  {
    key: 'dagre.acyclicer',
    label: 'Cycle handling',
    group: 'Graph',
    kind: 'enum',
    defaultValue: '',
    enumValues: [
      { value: '', label: 'Default' },
      { value: 'greedy', label: 'Greedy' },
    ],
    description: 'Chooses the optional Dagre acyclicer used before ranking cyclic graphs.',
  },
  {
    key: 'dagre.ranker',
    label: 'Ranker',
    group: 'Graph',
    kind: 'enum',
    defaultValue: 'network-simplex',
    enumValues: [
      { value: 'network-simplex', label: 'Network simplex' },
      { value: 'tight-tree', label: 'Tight tree' },
      { value: 'longest-path', label: 'Longest path' },
    ],
    description: 'Ranking strategy with the largest effect on overlap, compactness, and edge length.',
  },
  {
    key: 'dagre.rankalign',
    label: 'Layer align',
    group: 'Graph',
    kind: 'enum',
    defaultValue: 'center',
    enumValues: [
      { value: 'top', label: 'Top' },
      { value: 'center', label: 'Center' },
      { value: 'bottom', label: 'Bottom' },
    ],
    description: 'Vertical alignment inside each rank after Dagre assigns layer positions.',
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
  {
    key: 'dagre.marginx',
    label: 'Canvas margin X',
    group: 'Spacing',
    kind: 'number',
    defaultValue: '0',
    min: 0,
    max: 512,
    step: 8,
    description: 'Horizontal margin Dagre adds around the laid out graph bounds.',
  },
  {
    key: 'dagre.marginy',
    label: 'Canvas margin Y',
    group: 'Spacing',
    kind: 'number',
    defaultValue: '0',
    min: 0,
    max: 512,
    step: 8,
    description: 'Vertical margin Dagre adds around the laid out graph bounds.',
  },
];

export function dagreParamDefaults(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const spec of DAGRE_PARAM_SPECS) {
    out[spec.key] = spec.defaultValue;
  }
  return out;
}
