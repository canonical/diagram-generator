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

const EDGE_NODE_SPACING_SPEC: ElkParamSpec = {
  key: 'elk.spacing.edgeNode',
  label: 'Edge to node gap',
  group: 'Spacing',
  kind: 'number',
  defaultValue: '3',
  min: 0,
  max: 256,
  step: 1,
  description: 'Clearance between routed edges and node bounds for this ELK algorithm.',
};

const SEPARATE_COMPONENTS_SPEC: ElkParamSpec = {
  key: 'elk.separateConnectedComponents',
  label: 'Separate components',
  group: 'Graph',
  kind: 'boolean',
  defaultValue: 'true',
  description: 'Splits disconnected graph components before running the algorithm.',
};

const ASPECT_RATIO_SPEC: ElkParamSpec = {
  key: 'elk.aspectRatio',
  label: 'Aspect ratio',
  group: 'Graph',
  kind: 'number',
  defaultValue: '1.6',
  min: 0.1,
  max: 10,
  step: 0.1,
  description: 'Preferred width-to-height ratio for the overall drawing bounds.',
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

const MRTREE_COMPACTION_SPEC: ElkParamSpec = {
  key: 'elk.mrtree.compaction',
  label: 'Tree compaction',
  group: 'Graph',
  kind: 'boolean',
  defaultValue: 'false',
  description: 'Places nodes from multiple levels into larger compacted bands to shrink the tree.',
};

const MRTREE_WEIGHTING_SPEC: ElkParamSpec = {
  key: 'elk.mrtree.weighting',
  label: 'Node weighting',
  group: 'Graph',
  kind: 'enum',
  defaultValue: 'MODEL_ORDER',
  enumValues: [
    { value: 'MODEL_ORDER', label: 'Model order' },
    { value: 'DESCENDANTS', label: 'Descendants' },
    { value: 'FAN', label: 'Fan-out' },
    { value: 'CONSTRAINT', label: 'Constraint' },
  ],
  description: 'How Mr. Tree weighs nodes while computing sibling order.',
};

const MRTREE_SEARCH_ORDER_SPEC: ElkParamSpec = {
  key: 'elk.mrtree.searchOrder',
  label: 'Search order',
  group: 'Graph',
  kind: 'enum',
  defaultValue: 'DFS',
  enumValues: [
    { value: 'DFS', label: 'Depth-first (DFS)' },
    { value: 'BFS', label: 'Breadth-first (BFS)' },
  ],
  description: 'Search order used when building the spanning tree.',
};

const MRTREE_EDGE_ROUTING_MODE_SPEC: ElkParamSpec = {
  key: 'elk.mrtree.edgeRoutingMode',
  label: 'Edge routing',
  group: 'Edges',
  kind: 'enum',
  defaultValue: 'AVOID_OVERLAP',
  enumValues: [
    { value: 'NONE', label: 'None' },
    { value: 'MIDDLE_TO_MIDDLE', label: 'Middle to middle' },
    { value: 'AVOID_OVERLAP', label: 'Avoid overlap' },
  ],
  description: 'Routing algorithm used for tree edges after the spanning tree is built.',
};

const MRTREE_EDGE_END_TEXTURE_LENGTH_SPEC: ElkParamSpec = {
  key: 'elk.mrtree.edgeEndTextureLength',
  label: 'Edge end texture',
  group: 'Edges',
  kind: 'number',
  defaultValue: '7',
  min: 0,
  max: 128,
  step: 1,
  description: 'Length reserved for edge-end texture when Mr. Tree computes routing.',
};

const STRESS_DESIRED_EDGE_LENGTH_SPEC: ElkParamSpec = {
  key: 'elk.stress.desiredEdgeLength',
  label: 'Desired edge length',
  group: 'Spacing',
  kind: 'number',
  defaultValue: '100',
  min: 1,
  max: 1024,
  step: 4,
  description: 'Target edge length used by stress majorization.',
};

const STRESS_DIMENSION_SPEC: ElkParamSpec = {
  key: 'elk.stress.dimension',
  label: 'Layout dimension',
  group: 'Graph',
  kind: 'enum',
  defaultValue: 'XY',
  enumValues: [
    { value: 'XY', label: 'X and Y' },
    { value: 'X', label: 'X only' },
    { value: 'Y', label: 'Y only' },
  ],
  description: 'Axes that stress layout is allowed to change during optimization.',
};

const STRESS_EPSILON_SPEC: ElkParamSpec = {
  key: 'elk.stress.epsilon',
  label: 'Stress epsilon',
  group: 'Graph',
  kind: 'number',
  defaultValue: '0.001',
  min: 0.000001,
  max: 1,
  step: 0.001,
  description: 'Termination threshold for the iterative stress solver.',
};

const STRESS_ITERATION_LIMIT_SPEC: ElkParamSpec = {
  key: 'elk.stress.iterationLimit',
  label: 'Iteration limit',
  group: 'Graph',
  kind: 'number',
  defaultValue: '2147483647',
  min: 1,
  max: 2147483647,
  step: 1,
  description: 'Maximum number of stress iterations. Takes precedence over epsilon when reached.',
};

const STRESS_EDGE_LABELS_INLINE_SPEC: ElkParamSpec = {
  key: 'elk.edgeLabels.inline',
  label: 'Inline edge labels',
  group: 'Edges',
  kind: 'boolean',
  defaultValue: 'true',
  description: 'Keeps edge labels inline with the routed edge geometry during stress layout.',
};

const RADIAL_ROTATE_VISIBILITY = [{ key: 'elk.radial.rotate', equals: 'true' }] as const;
const RADIAL_COMPACTOR_VISIBILITY = [{ key: 'elk.radial.compactor', notEquals: 'NONE' }] as const;

const RADIAL_CENTER_ON_ROOT_SPEC: ElkParamSpec = {
  key: 'elk.radial.centerOnRoot',
  label: 'Center on root',
  group: 'Graph',
  kind: 'boolean',
  defaultValue: 'false',
  description: 'Centers the final layout on the root node, which can introduce extra whitespace.',
};

const RADIAL_NODE_SPACING_SPEC: ElkParamSpec = {
  key: 'elk.spacing.nodeNode',
  label: 'Radial spacing',
  group: 'Spacing',
  kind: 'number',
  defaultValue: '72',
  min: 8,
  max: 512,
  step: 8,
  description: 'Preferred radial graph spacing. In practice this changes annulus spacing and overall node separation more than a local sibling-only gap.',
};

const RADIAL_RADIUS_SPEC: ElkParamSpec = {
  key: 'elk.radial.radius',
  label: 'Initial radius',
  group: 'Graph',
  kind: 'number',
  defaultValue: '0',
  min: 0,
  max: 4096,
  step: 8,
  description: 'Initial radius used by the radial layouter before compaction and translation.',
};

const RADIAL_ROTATE_SPEC: ElkParamSpec = {
  key: 'elk.radial.rotate',
  label: 'Rotate layout',
  group: 'Graph',
  kind: 'boolean',
  defaultValue: 'false',
  description: 'Enables a post-layout rotation pass for the radial drawing.',
};

const RADIAL_COMPACTOR_SPEC: ElkParamSpec = {
  key: 'elk.radial.compactor',
  label: 'Compaction',
  group: 'Compaction',
  kind: 'enum',
  defaultValue: 'NONE',
  enumValues: [
    { value: 'NONE', label: 'None' },
    { value: 'RADIAL_COMPACTION', label: 'Radial compaction' },
    { value: 'WEDGE_COMPACTION', label: 'Wedge compaction' },
  ],
  description: 'Chooses how radial compaction is applied after initial node placement.',
};

const RADIAL_COMPACTION_STEP_SIZE_SPEC: ElkParamSpec = {
  key: 'elk.radial.compactionStepSize',
  label: 'Compaction step size',
  group: 'Compaction',
  kind: 'number',
  defaultValue: '1',
  min: 1,
  max: 128,
  step: 1,
  visibleWhen: RADIAL_COMPACTOR_VISIBILITY,
  description: 'Step size used by the radial compactor. One step corresponds to one pixel per iteration.',
};

const RADIAL_SORTER_SPEC: ElkParamSpec = {
  key: 'elk.radial.sorter',
  label: 'Sorter',
  group: 'Graph',
  kind: 'enum',
  defaultValue: 'NONE',
  enumValues: [
    { value: 'NONE', label: 'None' },
    { value: 'POLAR_COORDINATE', label: 'Polar coordinate' },
    { value: 'ID', label: 'Order id' },
  ],
  description: 'Sorts nodes within each radius by none, authored order id, or polar coordinate.',
};

const RADIAL_WEDGE_CRITERIA_SPEC: ElkParamSpec = {
  key: 'elk.radial.wedgeCriteria',
  label: 'Wedge criteria',
  group: 'Graph',
  kind: 'enum',
  defaultValue: 'NODE_SIZE',
  enumValues: [
    { value: 'LEAF_NUMBER', label: 'Leaf count' },
    { value: 'NODE_SIZE', label: 'Node size' },
  ],
  description: 'Chooses whether annulus wedges are sized by leaf count or node-size diagonals.',
};

const RADIAL_OPTIMIZATION_CRITERIA_SPEC: ElkParamSpec = {
  key: 'elk.radial.optimizationCriteria',
  label: 'Translation optimization',
  group: 'Translation',
  kind: 'enum',
  defaultValue: 'NONE',
  enumValues: [
    { value: 'NONE', label: 'None' },
    { value: 'EDGE_LENGTH', label: 'Edge length' },
    { value: 'EDGE_LENGTH_BY_POSITION', label: 'Edge length by position' },
    { value: 'CROSSING_MINIMIZATION_BY_POSITION', label: 'Crossing minimization by position' },
  ],
  description: 'Optimizes translation of inner radii after radial placement.',
};

const RADIAL_TARGET_ANGLE_SPEC: ElkParamSpec = {
  key: 'elk.radial.rotation.targetAngle',
  label: 'Target angle',
  group: 'Rotation',
  kind: 'number',
  defaultValue: '0',
  min: -6.283185307179586,
  max: 6.283185307179586,
  step: 0.1,
  visibleWhen: RADIAL_ROTATE_VISIBILITY,
  description: 'Angle in radians to rotate the radial layout to after placement.',
};

const RADIAL_ADDITIONAL_WEDGE_SPACE_SPEC: ElkParamSpec = {
  key: 'elk.radial.rotation.computeAdditionalWedgeSpace',
  label: 'Additional wedge space',
  group: 'Rotation',
  kind: 'boolean',
  defaultValue: 'false',
  visibleWhen: RADIAL_ROTATE_VISIBILITY,
  description: 'Rotates further to leave space for an incoming edge between nodes. Intended for top-down radial modes.',
};

const RADIAL_OUTGOING_EDGE_ANGLES_SPEC: ElkParamSpec = {
  key: 'elk.radial.rotation.outgoingEdgeAngles',
  label: 'Outgoing edge angles',
  group: 'Rotation',
  kind: 'boolean',
  defaultValue: 'false',
  visibleWhen: RADIAL_ROTATE_VISIBILITY,
  description: 'Calculates outgoing edge angles to leave room for incoming edges. Intended for top-down radial modes.',
};

const RECTPACKING_TARGET_WIDTH_VISIBILITY = [
  { key: 'elk.rectpacking.widthApproximation.strategy', equals: 'TARGET_WIDTH' },
] as const;
const RECTPACKING_COMPACTION_VISIBILITY = [
  { key: 'elk.rectpacking.packing.strategy', equals: 'COMPACTION' },
] as const;

const RECTPACKING_ASPECT_RATIO_SPEC: ElkParamSpec = {
  key: 'elk.aspectRatio',
  label: 'Aspect ratio',
  group: 'Graph',
  kind: 'number',
  defaultValue: '1.3',
  min: 0.1,
  max: 10,
  step: 0.1,
  description: 'Preferred aspect ratio used while approximating the packed drawing bounds.',
};

const RECTPACKING_TRYBOX_SPEC: ElkParamSpec = {
  key: 'elk.rectpacking.trybox',
  label: 'Try box layout first',
  group: 'Graph',
  kind: 'boolean',
  defaultValue: 'false',
  description: 'Checks whether a simpler box layout is sufficient before the full packing algorithm runs.',
};

const RECTPACKING_ORDER_BY_SIZE_SPEC: ElkParamSpec = {
  key: 'elk.rectpacking.orderBySize',
  label: 'Order by height',
  group: 'Graph',
  kind: 'boolean',
  defaultValue: 'false',
  description: 'Sorts nodes by height before packing so larger boxes are placed earlier.',
};

const RECTPACKING_WIDTH_STRATEGY_SPEC: ElkParamSpec = {
  key: 'elk.rectpacking.widthApproximation.strategy',
  label: 'Width approximation',
  group: 'Width Approximation',
  kind: 'enum',
  defaultValue: 'GREEDY',
  enumValues: [
    { value: 'GREEDY', label: 'Greedy' },
    { value: 'TARGET_WIDTH', label: 'Target width' },
  ],
  description: 'Chooses how rectpacking finds the initial drawing width.',
};

const RECTPACKING_TARGET_WIDTH_SPEC: ElkParamSpec = {
  key: 'elk.rectpacking.widthApproximation.targetWidth',
  label: 'Target width',
  group: 'Width Approximation',
  kind: 'number',
  defaultValue: '-1',
  min: -1,
  max: 8192,
  step: 8,
  visibleWhen: RECTPACKING_TARGET_WIDTH_VISIBILITY,
  description: 'Explicit target width for packing. `-1` falls back to aspect-ratio approximation.',
};

const RECTPACKING_OPTIMIZATION_GOAL_SPEC: ElkParamSpec = {
  key: 'elk.rectpacking.widthApproximation.optimizationGoal',
  label: 'Optimization goal',
  group: 'Width Approximation',
  kind: 'enum',
  defaultValue: 'MAX_SCALE_DRIVEN',
  enumValues: [
    { value: 'ASPECT_RATIO_DRIVEN', label: 'Aspect ratio' },
    { value: 'MAX_SCALE_DRIVEN', label: 'Max scale' },
    { value: 'AREA_DRIVEN', label: 'Area' },
  ],
  description: 'Chooses which measure drives width approximation candidate selection.',
};

const RECTPACKING_LAST_PLACE_SHIFT_SPEC: ElkParamSpec = {
  key: 'elk.rectpacking.widthApproximation.lastPlaceShift',
  label: 'Shift last placed',
  group: 'Width Approximation',
  kind: 'boolean',
  defaultValue: 'true',
  description: 'Allows the first pass to shift the last placed rectangle to reduce whitespace.',
};

const RECTPACKING_PACKING_STRATEGY_SPEC: ElkParamSpec = {
  key: 'elk.rectpacking.packing.strategy',
  label: 'Packing strategy',
  group: 'Packing',
  kind: 'enum',
  defaultValue: 'COMPACTION',
  enumValues: [
    { value: 'COMPACTION', label: 'Compaction' },
    { value: 'SIMPLE', label: 'Simple' },
    { value: 'NONE', label: 'None' },
  ],
  description: 'Strategy used for the initial rectangle placement phase.',
};

const RECTPACKING_ROW_HEIGHT_REEVALUATION_SPEC: ElkParamSpec = {
  key: 'elk.rectpacking.packing.compaction.rowHeightReevaluation',
  label: 'Row height reevaluation',
  group: 'Packing',
  kind: 'boolean',
  defaultValue: 'false',
  visibleWhen: RECTPACKING_COMPACTION_VISIBILITY,
  description: 'Re-packs rows when compaction causes blocks from other rows to exceed the original row height.',
};

const RECTPACKING_COMPACTION_ITERATIONS_SPEC: ElkParamSpec = {
  key: 'elk.rectpacking.packing.compaction.iterations',
  label: 'Compaction iterations',
  group: 'Packing',
  kind: 'number',
  defaultValue: '1',
  min: 1,
  max: 100,
  step: 1,
  visibleWhen: RECTPACKING_COMPACTION_VISIBILITY,
  description: 'Number of compaction passes to compare while searching for the best packing.',
};

const RECTPACKING_WHITESPACE_STRATEGY_SPEC: ElkParamSpec = {
  key: 'elk.rectpacking.whiteSpaceElimination.strategy',
  label: 'Whitespace elimination',
  group: 'Whitespace',
  kind: 'enum',
  defaultValue: 'NONE',
  enumValues: [
    { value: 'EQUAL_BETWEEN_STRUCTURES', label: 'Equal between structures' },
    { value: 'TO_ASPECT_RATIO', label: 'To aspect ratio' },
    { value: 'NONE', label: 'None' },
  ],
  description: 'Strategy for expanding nodes after packing to eliminate unused whitespace.',
};

export const ELK_STRESS_PARAM_SPECS: ElkParamSpec[] = [
  STRESS_DIMENSION_SPEC,
  STRESS_EPSILON_SPEC,
  STRESS_ITERATION_LIMIT_SPEC,
  STRESS_DESIRED_EDGE_LENGTH_SPEC,
  STRESS_EDGE_LABELS_INLINE_SPEC,
];

export const ELK_MRTREE_PARAM_SPECS: ElkParamSpec[] = [
  MRTREE_DIRECTION_SPEC,
  NODE_SPACING_SPEC,
  EDGE_NODE_SPACING_SPEC,
  SEPARATE_COMPONENTS_SPEC,
  ASPECT_RATIO_SPEC,
  MRTREE_COMPACTION_SPEC,
  MRTREE_WEIGHTING_SPEC,
  MRTREE_SEARCH_ORDER_SPEC,
  MRTREE_EDGE_ROUTING_MODE_SPEC,
  MRTREE_EDGE_END_TEXTURE_LENGTH_SPEC,
];

export const ELK_RADIAL_PARAM_SPECS: ElkParamSpec[] = [
  RADIAL_NODE_SPACING_SPEC,
  RADIAL_CENTER_ON_ROOT_SPEC,
  RADIAL_RADIUS_SPEC,
  RADIAL_ROTATE_SPEC,
  RADIAL_COMPACTOR_SPEC,
  RADIAL_COMPACTION_STEP_SIZE_SPEC,
  RADIAL_SORTER_SPEC,
  RADIAL_WEDGE_CRITERIA_SPEC,
  RADIAL_OPTIMIZATION_CRITERIA_SPEC,
  RADIAL_TARGET_ANGLE_SPEC,
  RADIAL_ADDITIONAL_WEDGE_SPACE_SPEC,
  RADIAL_OUTGOING_EDGE_ANGLES_SPEC,
];

export const ELK_RECTPACKING_PARAM_SPECS: ElkParamSpec[] = [
  NODE_SPACING_SPEC,
  RECTPACKING_ASPECT_RATIO_SPEC,
  RECTPACKING_TRYBOX_SPEC,
  RECTPACKING_ORDER_BY_SIZE_SPEC,
  RECTPACKING_WIDTH_STRATEGY_SPEC,
  RECTPACKING_TARGET_WIDTH_SPEC,
  RECTPACKING_OPTIMIZATION_GOAL_SPEC,
  RECTPACKING_LAST_PLACE_SHIFT_SPEC,
  RECTPACKING_PACKING_STRATEGY_SPEC,
  RECTPACKING_ROW_HEIGHT_REEVALUATION_SPEC,
  RECTPACKING_COMPACTION_ITERATIONS_SPEC,
  RECTPACKING_WHITESPACE_STRATEGY_SPEC,
];

export const ELK_ADDITIONAL_ALGORITHM_PARAM_SPECS: ElkParamSpec[] = [
  ...ELK_STRESS_PARAM_SPECS,
  ...ELK_MRTREE_PARAM_SPECS,
  ...ELK_RADIAL_PARAM_SPECS,
  ...ELK_RECTPACKING_PARAM_SPECS,
];
