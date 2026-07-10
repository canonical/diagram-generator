/** Canonical graph layout input/output IR (engine-agnostic). */

export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL';

export type SpacingProfile = 'compact' | 'normal' | 'loose';

export type GraphPortSide = 'top' | 'right' | 'bottom' | 'left';

export type GraphLabelPlacement = 'center' | 'source' | 'target';

export type GraphConstraintAxis = 'horizontal' | 'vertical';

export type GraphNodeKind = 'node' | 'compound' | 'ordering-cluster';

export type GraphContentAlignment =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/** Matches planning `layout_mapping.py` layered families. */
export type LayeredCorpusFamily =
  | 'deployment_and_runtime_topology'
  | 'process_and_workflow'
  | 'data_flow_and_integration';

/** Matches planning `layout_mapping.py` ELK force-directed families. */
export type ForceCorpusFamily =
  | 'system_architecture'
  | 'infrastructure_and_network_topology'
  | 'data_model_and_relationships'
  | 'concept_and_relationship_mapping';

export interface GraphInsetsInput {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type GraphPortAnchorOffset = number | 'center';

export interface GraphPortSideAnchorInput {
  kind: 'side';
  side: GraphPortSide;
  offset?: GraphPortAnchorOffset;
}

export interface GraphPortPointAnchorInput {
  kind: 'point';
  side: GraphPortSide;
  x: number;
  y: number;
}

export type GraphPortAnchorInput =
  | GraphPortSideAnchorInput
  | GraphPortPointAnchorInput;

export interface GraphPortInput {
  id: string;
  anchor: GraphPortAnchorInput;
  width?: number;
  height?: number;
}

export interface GraphNodeInput {
  id: string;
  /** Structural node role for layout lowering. */
  kind?: GraphNodeKind;
  /** Input box size before the algorithm runs. */
  width: number;
  height: number;
  /** Optional local flow direction for nested compound children. */
  direction?: LayoutDirection;
  /** Optional content alignment for compound children inside a sized parent. */
  contentAlignment?: GraphContentAlignment;
  /** Optional compound insets for layout engines that support child padding. */
  padding?: GraphInsetsInput;
  /** Optional explicit ports; layout adapters may also synthesize implicit ports. */
  ports?: GraphPortInput[];
  /** Nested compound nodes. */
  children?: GraphNodeInput[];
}

export function resolveGraphNodeKind(
  node: Pick<GraphNodeInput, 'kind' | 'children'>,
): GraphNodeKind {
  if (node.kind === 'ordering-cluster') {
    return 'ordering-cluster';
  }
  if (node.kind === 'compound' || (node.children?.length ?? 0) > 0) {
    return 'compound';
  }
  return 'node';
}

export function isGraphCompoundNode(
  node: Pick<GraphNodeInput, 'kind' | 'children'>,
): boolean {
  return resolveGraphNodeKind(node) !== 'node';
}

export interface GraphEdgeLabelInput {
  text: string;
  width: number;
  height: number;
  placement?: GraphLabelPlacement;
}

export interface GraphOrderConstraintInput {
  kind: 'order';
  axis: GraphConstraintAxis;
  before: string;
  after: string;
}

export interface GraphAlignmentConstraintInput {
  kind: 'alignment';
  axis: GraphConstraintAxis;
  nodeIds: string[];
  anchor?: 'start' | 'center' | 'end';
}

export type GraphConstraintInput =
  | GraphOrderConstraintInput
  | GraphAlignmentConstraintInput;

export interface GraphEdgeInput {
  id: string;
  source: string;
  target: string;
  /** Optional explicit source port id. */
  sourcePort?: string;
  /** Optional explicit target port id. */
  targetPort?: string;
  /** Pre-measured label boxes — ELK places these; we must supply dimensions. */
  labels?: GraphEdgeLabelInput[];
}

export interface GraphLayoutInput {
  id: string;
  direction: LayoutDirection;
  spacingProfile?: SpacingProfile;
  /**
   * Routes cross-hierarchy edges to node borders instead of synthesizing
   * implicit fixed-position ports on their leaf endpoints.
   */
  routeCrossHierarchyEdgesToBorders?: boolean;
  nodes: GraphNodeInput[];
  edges: GraphEdgeInput[];
  constraints?: GraphConstraintInput[];
}

export interface Point2 {
  x: number;
  y: number;
}

export interface GraphPortPlacement {
  side: GraphPortSide;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacedNode {
  id: string;
  x: number;
  y: number;
  /** Resolved box size after the algorithm runs. */
  width: number;
  height: number;
  children?: PlacedNode[];
}

export interface RoutedEdgeSection {
  startPoint: Point2;
  endPoint: Point2;
  bendPoints?: Point2[];
}

export interface PlacedEdgeLabel {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  placement?: GraphLabelPlacement;
}

export interface PlacedEdge {
  id: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
  sourcePortSide?: GraphPortSide;
  targetPortSide?: GraphPortSide;
  sections: RoutedEdgeSection[];
  /** Label geometry returned by ELK (absolute, after normalisation). */
  labels?: PlacedEdgeLabel[];
}

export type GraphLayoutEngineId = string;

export interface GraphLayoutSizingCapabilities {
  requiresInputNodeSizes: boolean;
  returnsPlacedNodeSizes: boolean;
}

export interface GraphLayoutPortCapabilities {
  explicitPorts: boolean;
  sideAnchors: boolean;
  pointAnchors: boolean;
  implicitEndpointPorts: boolean;
}

export interface GraphLayoutLabelCapabilities {
  measuredBoxes: boolean;
  placementHints: boolean;
}

export interface GraphLayoutConstraintCapabilities {
  order: boolean;
  alignment: boolean;
}

export interface GraphLayoutCompoundCapabilities {
  nestedChildren: boolean;
  paddingInsets: boolean;
}

export interface GraphLayoutCapabilities {
  directions: LayoutDirection[];
  honorsDirectionHints: boolean;
  sizing: GraphLayoutSizingCapabilities;
  ports: GraphLayoutPortCapabilities;
  edgeLabels: GraphLayoutLabelCapabilities;
  constraints: GraphLayoutConstraintCapabilities;
  compounds: GraphLayoutCompoundCapabilities;
}

export interface GraphLayoutEngineDescriptor {
  id: GraphLayoutEngineId;
  capabilities: GraphLayoutCapabilities;
}

export interface GraphLayoutResult {
  width: number;
  height: number;
  nodes: PlacedNode[];
  edges: PlacedEdge[];
  engine: GraphLayoutEngineId;
  direction: LayoutDirection;
}

/** 8px baseline grid — aligns with diagram-generator `BASELINE_UNIT`. */
export const GRID_BASELINE_PX = 8;

export function roundToGrid(value: number, baseline = GRID_BASELINE_PX): number {
  return Math.round(value / baseline) * baseline;
}

export function resolveGraphPortPlacement(
  node: Pick<GraphNodeInput, 'width' | 'height'>,
  port: GraphPortInput,
): GraphPortPlacement {
  if (port.anchor.kind === 'point') {
    return {
      side: port.anchor.side,
      x: port.anchor.x,
      y: port.anchor.y,
      width: port.width ?? 0,
      height: port.height ?? 0,
    };
  }

  const offset = port.anchor.offset ?? 'center';
  const centeredX = offset === 'center' ? node.width / 2 : offset;
  const centeredY = offset === 'center' ? node.height / 2 : offset;

  switch (port.anchor.side) {
    case 'top':
      return {
        side: 'top',
        x: centeredX,
        y: 0,
        width: port.width ?? 0,
        height: port.height ?? 0,
      };
    case 'right':
      return {
        side: 'right',
        x: node.width,
        y: centeredY,
        width: port.width ?? 0,
        height: port.height ?? 0,
      };
    case 'bottom':
      return {
        side: 'bottom',
        x: centeredX,
        y: node.height,
        width: port.width ?? 0,
        height: port.height ?? 0,
      };
    case 'left':
      return {
        side: 'left',
        x: 0,
        y: centeredY,
        width: port.width ?? 0,
        height: port.height ?? 0,
      };
  }
}
