/**
 * Catalog of ELK layered layout options exposed to preview UI and YAML meta.elk.
 * Keys match elkjs / Eclipse ELK (prefix `elk.`).
 */

import { ELK_ADDITIONAL_ALGORITHM_PARAM_SPECS } from './elk-algorithm-param-registry.js';
import { ELK_FORCE_PARAM_SPECS } from './force-param-registry.js';

export type ElkParamKind = 'number' | 'enum' | 'boolean' | 'text';

export interface ElkParamVisibilityRule {
  key: string;
  equals?: string | readonly string[];
  notEquals?: string | readonly string[];
}

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
  visibleWhen?: readonly ElkParamVisibilityRule[];
}

/**
 * User-facing layered options we intentionally expose.
 *
 * Most defaults mirror buildLayeredLayoutOptions(). `elk.direction` is the
 * exception: the sidebar defaults to `Auto` so diagram/root direction remains
 * the source of truth until the user explicitly asks ELK to override it.
 */
export const ELK_LAYERED_PARAM_SPECS: ElkParamSpec[] = [
  {
    key: 'elk.direction',
    label: 'Direction',
    group: 'Graph',
    kind: 'enum',
    defaultValue: '',
    enumValues: [
      { value: '', label: 'Auto (diagram)' },
      { value: 'DOWN', label: 'Top → bottom (TB)' },
      { value: 'RIGHT', label: 'Left → right (LR)' },
      { value: 'UP', label: 'Bottom → top' },
      { value: 'LEFT', label: 'Right → left' },
    ],
    description: 'Primary flow direction override for layered layout. Auto follows the diagram direction.',
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
    key: 'elk.layered.mergeEdges',
    label: 'Merge shared edge ports',
    group: 'Edges',
    kind: 'boolean',
    defaultValue: 'false',
    description:
      'Let no-port edges with the same endpoint share one node-side contact point before fanning out; useful for repeated consumer links from a common source.',
  },
  {
    key: 'elk.layered.mergeHierarchyEdges',
    label: 'Merge hierarchy edges',
    group: 'Edges',
    kind: 'boolean',
    defaultValue: 'true',
    description:
      'Let hierarchy-crossing edges share compound-boundary routing points where ELK can treat them as a common hyperedge.',
  },
  {
    key: 'elk.edgeLabels.inline',
    label: 'Inline edge labels',
    group: 'Edges',
    kind: 'boolean',
    defaultValue: 'true',
    description:
      'Place edge labels inline on the routed edge, matching Mermaid ELK so labels do not reserve separate layer space and distort routes.',
  },
  {
    key: 'elk.edgeLabels.placement',
    label: 'Edge label placement',
    group: 'Edges',
    kind: 'enum',
    defaultValue: 'CENTER',
    enumValues: [
      { value: 'CENTER', label: 'Center' },
      { value: 'HEAD', label: 'Near target' },
      { value: 'TAIL', label: 'Near source' },
    ],
    description:
      'Default placement for ELK-owned edge labels. Center is the Mermaid ELK oracle for flowchart labels.',
  },
  {
    key: 'elk.layered.nodePlacement.favorStraightEdges',
    label: 'Favor straight edges',
    group: 'Edges',
    kind: 'boolean',
    defaultValue: 'true',
    description: 'Biases placement toward straighter routed edges when the topology allows it; dense compounds can still force detours.',
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
    key: 'elk.layered.considerModelOrder.strategy',
    label: 'Model order strategy',
    group: 'Layering',
    kind: 'enum',
    defaultValue: '',
    enumValues: [
      { value: '', label: 'Auto' },
      { value: 'NODES_AND_EDGES', label: 'Nodes and edges' },
      { value: 'PREFER_EDGES', label: 'Prefer edge order' },
      { value: 'PREFER_NODES', label: 'Prefer node order' },
      { value: 'NONE', label: 'None' },
    ],
    description:
      'Controls how strongly ELK preserves authored node and edge order when reducing crossings.',
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
    key: 'elk.layered.crossingMinimization.forceNodeModelOrder',
    label: 'Force authored node order',
    group: 'Layering',
    kind: 'boolean',
    defaultValue: 'false',
    description:
      'Bias crossing minimization to keep siblings in authored order when edge routing optimizations would otherwise swap same-layer compounds.',
  },
  {
    key: 'elk.layered.nodePlacement.strategy',
    label: 'Node placement',
    group: 'Layering',
    kind: 'enum',
    defaultValue: 'BRANDES_KOEPF',
    enumValues: [
      { value: 'BRANDES_KOEPF', label: 'Brandes-Köpf' },
      { value: 'LINEAR_SEGMENTS', label: 'Linear segments' },
      { value: 'SIMPLE', label: 'Simple' },
    ],
    description: 'Changes layered node placement heuristics after ranking/crossing resolution. Differences are topology-dependent, so compare on real diagrams before keeping the override.',
  },
  {
    key: 'org.eclipse.elk.layered.considerModelOrder.components',
    label: 'Compound order',
    group: 'Compound',
    kind: 'enum',
    defaultValue: 'MODEL_ORDER',
    enumValues: [
      { value: 'MODEL_ORDER', label: 'Preserve authored order' },
      { value: '', label: 'Auto' },
    ],
    description:
      'Keeps top-level and compound siblings in authored order when layered layout would otherwise reorder whole components to shorten cross-hierarchy edges.',
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
const ELK_NON_LAYERED_KNOWN_PARAM_KEY_SET = new Set([
  ...ELK_FORCE_PARAM_SPECS,
  ...ELK_ADDITIONAL_ALGORITHM_PARAM_SPECS,
].map((spec) => spec.key));
const IMPLEMENTATION_OWNED_ELK_LAYERED_KEYS = new Set([
  'elk.edgeRouting',
  'elk.padding',
  'elk.portConstraints',
]);

function unsupportedElkLayeredOverrideKeys(
  overrides: Record<string, string | null | undefined>,
): string[] {
  return Object.keys(overrides)
    .filter((key) => !ELK_LAYERED_PARAM_KEY_SET.has(key))
    .filter((key) => !ELK_NON_LAYERED_KNOWN_PARAM_KEY_SET.has(key))
    .sort();
}

export function elkParamDefaults(): Record<string, string> {
  const out: Record<string, string> = { 'elk.algorithm': 'layered' };
  for (const spec of ELK_LAYERED_PARAM_SPECS) {
    if (spec.defaultValue === '') continue;
    out[spec.key] = spec.defaultValue;
  }
  return out;
}

export function elkParamSpecByKey(): Map<string, ElkParamSpec> {
  return new Map(ELK_LAYERED_PARAM_SPECS.map((s) => [s.key, s]));
}

/**
 * Legacy frame YAML may still carry implementation-owned ELK keys that are no
 * longer authorable. Strip only those keys before handing overrides to the
 * strict layered-option resolver so old diagrams still render while typos and
 * unknown keys continue to fail fast.
 */
export function stripImplementationOwnedElkLayeredOverrides<T extends string | null | undefined>(
  overrides?: Record<string, T> | null,
): Record<string, T> {
  if (!overrides) return {};
  return Object.fromEntries(
    Object.entries(overrides)
      .filter(([key]) => !IMPLEMENTATION_OWNED_ELK_LAYERED_KEYS.has(key)),
  ) as Record<string, T>;
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
    if (ELK_NON_LAYERED_KNOWN_PARAM_KEY_SET.has(key) && !ELK_LAYERED_PARAM_KEY_SET.has(key)) {
      continue;
    }
    if (raw == null || raw === '') {
      delete merged[key];
      continue;
    }
    merged[key] = String(raw);
  }
  return merged;
}
