/**
 * Catalog of ELK layered layout options exposed to preview UI and YAML meta.elk.
 * Keys match elkjs / Eclipse ELK (prefix `elk.`).
 */

export type ElkParamKind = 'number' | 'enum' | 'boolean' | 'text';

export interface ElkParamSpec {
  /** Full ELK option key, e.g. elk.spacing.nodeNode */
  key: string;
  label: string;
  group: string;
  kind: ElkParamKind;
  defaultValue: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  enumValues?: { value: string; label: string }[];
}

/** User-facing layered options we intentionally expose — defaults match buildLayeredLayoutOptions(). */
export const ELK_LAYERED_PARAM_SPECS: ElkParamSpec[] = [
  {
    key: 'elk.direction',
    label: 'Direction',
    group: 'Graph',
    kind: 'enum',
    defaultValue: 'DOWN',
    enumValues: [
      { value: 'DOWN', label: 'Top → bottom (TB)' },
      { value: 'RIGHT', label: 'Left → right (LR)' },
      { value: 'UP', label: 'Bottom → top' },
      { value: 'LEFT', label: 'Right → left' },
    ],
    description: 'Primary flow direction for layered layout.',
  },
  {
    key: 'elk.layered.spacing.nodeNodeBetweenLayers',
    label: 'Layer gap',
    group: 'Spacing',
    kind: 'number',
    defaultValue: '24',
    min: 8,
    max: 512,
    step: 8,
    description: 'Vertical gap between layers — main control for arrow length (TB).',
  },
  {
    key: 'elk.spacing.nodeNode',
    label: 'Same-layer gap',
    group: 'Spacing',
    kind: 'number',
    defaultValue: '24',
    min: 8,
    max: 256,
    step: 8,
    description: 'Horizontal gap between nodes in the same layer.',
  },
  {
    key: 'elk.spacing.edgeNode',
    label: 'Edge ↔ node',
    group: 'Spacing',
    kind: 'number',
    defaultValue: '24',
    min: 0,
    max: 128,
    step: 4,
    description: 'Clearance between edge routes and node boxes during ELK routing (does not move step labels).',
  },
  {
    key: 'elk.spacing.edgeEdge',
    label: 'Edge ↔ edge',
    group: 'Spacing',
    kind: 'number',
    defaultValue: '24',
    min: 0,
    max: 128,
    step: 4,
    description: 'Gap between parallel edges — reduces overlap.',
  },
  {
    key: 'elk.layered.spacing.edgeEdgeBetweenLayers',
    label: 'Edge gap (layers)',
    group: 'Spacing',
    kind: 'number',
    defaultValue: '24',
    min: 0,
    max: 128,
    step: 4,
    description: 'Gap between edges that span adjacent layers; most visible when several layer-crossing routes run in parallel.',
  },
  {
    key: 'elk.layered.unnecessaryBendpoints',
    label: 'Remove extra bends',
    group: 'Edges',
    kind: 'boolean',
    defaultValue: 'true',
    description: 'Drop bend points that do not change routing.',
  },
  {
    key: 'elk.layered.nodePlacement.favorStraightEdges',
    label: 'Favor straight edges',
    group: 'Edges',
    kind: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'elk.layered.layering.strategy',
    label: 'Layering strategy',
    group: 'Layering',
    kind: 'enum',
    defaultValue: 'NETWORK_SIMPLEX',
    enumValues: [
      { value: 'NETWORK_SIMPLEX', label: 'Network simplex' },
      { value: 'LONGEST_PATH', label: 'Longest path' },
    ],
    description: 'Batch layout strategies only. Interactive layering needs explicit layer constraints that this preview does not author.',
  },
  {
    key: 'elk.layered.crossingMinimization.strategy',
    label: 'Crossing minimization',
    group: 'Layering',
    kind: 'enum',
    defaultValue: 'LAYER_SWEEP',
    enumValues: [
      { value: 'LAYER_SWEEP', label: 'Layer sweep' },
    ],
    description: 'Layer sweep is the supported batch mode here. Interactive crossing minimization needs in-layer order constraints and is invalid for these compound preview graphs.',
  },
  {
    key: 'elk.layered.nodePlacement.strategy',
    label: 'Node placement',
    group: 'Layering',
    kind: 'enum',
    defaultValue: 'BRANDES_KOEPF',
    enumValues: [
      { value: 'NETWORK_SIMPLEX', label: 'Network simplex' },
      { value: 'BRANDES_KOEPF', label: 'Brandes-Köpf' },
      { value: 'LINEAR_SEGMENTS', label: 'Linear segments' },
      { value: 'SIMPLE', label: 'Simple' },
    ],
  },
  {
    key: 'elk.hierarchyHandling',
    label: 'Hierarchy handling',
    group: 'Compound',
    kind: 'enum',
    defaultValue: 'INCLUDE_CHILDREN',
    enumValues: [
      { value: 'INCLUDE_CHILDREN', label: 'Include children' },
      { value: 'SEPARATE_CHILDREN', label: 'Separate children' },
      { value: 'CHILDREN_ON', label: 'Children on' },
    ],
    description:
      'Only affects compounds that survive the selective flattening pass before ELK. Structural carrier wrappers are flattened first, so changes can be subtle.',
  },
];

const ELK_LAYERED_PARAM_KEY_SET = new Set(ELK_LAYERED_PARAM_SPECS.map((spec) => spec.key));

function unsupportedElkLayeredOverrideKeys(
  overrides: Record<string, string | null | undefined>,
): string[] {
  return Object.keys(overrides)
    .filter((key) => !ELK_LAYERED_PARAM_KEY_SET.has(key))
    .sort();
}

export function elkParamDefaults(): Record<string, string> {
  const out: Record<string, string> = { 'elk.algorithm': 'layered' };
  for (const spec of ELK_LAYERED_PARAM_SPECS) {
    out[spec.key] = spec.defaultValue;
  }
  return out;
}

export function elkParamSpecByKey(): Map<string, ElkParamSpec> {
  return new Map(ELK_LAYERED_PARAM_SPECS.map((s) => [s.key, s]));
}

/** Merge family defaults + YAML/session overrides into ELK layoutOptions map. */
export function resolveElkLayoutOptions(
  baseOptions: Record<string, string>,
  userOverrides?: Record<string, string | null | undefined>,
): Record<string, string> {
  const merged = { ...baseOptions };
  if (!userOverrides) return merged;
  const unsupported = unsupportedElkLayeredOverrideKeys(userOverrides);
  if (unsupported.length > 0) {
    throw new Error(`Unsupported ELK layered override keys: ${unsupported.join(', ')}`);
  }
  for (const [key, raw] of Object.entries(userOverrides)) {
    if (raw == null || raw === '') {
      delete merged[key];
      continue;
    }
    merged[key] = String(raw);
  }
  return merged;
}
