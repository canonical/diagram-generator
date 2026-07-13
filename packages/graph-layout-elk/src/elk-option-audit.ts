import {
  ELK_ADDITIONAL_ALGORITHM_PARAM_SPECS,
  ELK_MRTREE_PARAM_SPECS,
  ELK_RADIAL_PARAM_SPECS,
  ELK_RECTPACKING_PARAM_SPECS,
  ELK_STRESS_PARAM_SPECS,
} from './elk-algorithm-param-registry.js';
import { ELK_LAYERED_PARAM_SPECS, type ElkParamSpec } from './elk-param-registry.js';
import { ELK_FORCE_PARAM_SPECS } from './force-param-registry.js';

export type ElkOptionAuditCategory =
  | 'authorable-and-exposed'
  | 'implementation-owned'
  | 'invalid-for-current-ir'
  | 'unsafe-or-too-low-level'
  | 'unsupported-by-elkjs'
  | 'needs-follow-up';

export interface ElkOptionAuditClassification {
  category: ElkOptionAuditCategory;
  reason: string;
}

export const ELK_OPTION_AUDITED_ALGORITHM_IDS = [
  'org.eclipse.elk.layered',
  'org.eclipse.elk.force',
  'org.eclipse.elk.stress',
  'org.eclipse.elk.mrtree',
  'org.eclipse.elk.radial',
  'org.eclipse.elk.rectpacking',
] as const;

export type AuditedElkAlgorithmId = typeof ELK_OPTION_AUDITED_ALGORITHM_IDS[number];

export const ELK_OPTION_AUDIT_REGISTRY_SPECS: Record<AuditedElkAlgorithmId, readonly ElkParamSpec[]> = {
  'org.eclipse.elk.layered': ELK_LAYERED_PARAM_SPECS,
  'org.eclipse.elk.force': ELK_FORCE_PARAM_SPECS,
  'org.eclipse.elk.stress': ELK_STRESS_PARAM_SPECS,
  'org.eclipse.elk.mrtree': ELK_MRTREE_PARAM_SPECS,
  'org.eclipse.elk.radial': ELK_RADIAL_PARAM_SPECS,
  'org.eclipse.elk.rectpacking': ELK_RECTPACKING_PARAM_SPECS,
};

export function normalizeOfficialElkOptionId(key: string): string {
  if (key.startsWith('org.eclipse.elk.')) {
    return key;
  }
  if (key.startsWith('elk.')) {
    return `org.eclipse.${key}`;
  }
  return key;
}

function exposedOptionIdsForAlgorithm(algorithmId: AuditedElkAlgorithmId): Set<string> {
  return new Set(
    ELK_OPTION_AUDIT_REGISTRY_SPECS[algorithmId].map((spec) => normalizeOfficialElkOptionId(spec.key)),
  );
}

export function allExposedOfficialElkOptionIds(): Set<string> {
  return new Set([
    ...ELK_LAYERED_PARAM_SPECS,
    ...ELK_FORCE_PARAM_SPECS,
    ...ELK_ADDITIONAL_ALGORITHM_PARAM_SPECS,
  ].map((spec) => normalizeOfficialElkOptionId(spec.key)));
}

const IMPLEMENTATION_OWNED_EXACT = new Set([
  'org.eclipse.elk.algorithm',
  'org.eclipse.elk.resolvedAlgorithm',
  'org.eclipse.elk.padding',
  'org.eclipse.elk.edgeRouting',
  'org.eclipse.elk.portConstraints',
  'org.eclipse.elk.contentAlignment',
  'org.eclipse.elk.margins',
  'org.eclipse.elk.edge.thickness',
  'org.eclipse.elk.junctionPoints',
  'org.eclipse.elk.bendPoints',
  'org.eclipse.elk.position',
  'org.eclipse.elk.alignment',
  'org.eclipse.elk.noLayout',
  'org.eclipse.elk.omitNodeMicroLayout',
]);

const IMPLEMENTATION_OWNED_PREFIXES = [
  'org.eclipse.elk.nodeSize.',
  'org.eclipse.elk.nodeLabels.',
  'org.eclipse.elk.port.',
  'org.eclipse.elk.portAlignment.',
  'org.eclipse.elk.portLabels.',
  'org.eclipse.elk.spacing.portsSurrounding',
] as const;

const INVALID_FOR_CURRENT_IR_EXACT = new Set([
  'org.eclipse.elk.commentBox',
  'org.eclipse.elk.hypernode',
  'org.eclipse.elk.insideSelfLoops.activate',
  'org.eclipse.elk.insideSelfLoops.yo',
  'org.eclipse.elk.spacing.commentComment',
  'org.eclipse.elk.spacing.commentNode',
  'org.eclipse.elk.spacing.individual',
  'org.eclipse.elk.spacing.labelLabel',
  'org.eclipse.elk.spacing.labelNode',
  'org.eclipse.elk.spacing.labelPortHorizontal',
  'org.eclipse.elk.spacing.labelPortVertical',
  'org.eclipse.elk.spacing.portPort',
  'org.eclipse.elk.stress.fixed',
  'org.eclipse.elk.mrtree.positionConstraint',
  'org.eclipse.elk.mrtree.treeLevel',
  'org.eclipse.elk.radial.orderId',
  'org.eclipse.elk.rectpacking.currentPosition',
  'org.eclipse.elk.rectpacking.desiredPosition',
  'org.eclipse.elk.rectpacking.inNewRow',
]);

const NEEDS_FOLLOW_UP_EXACT = new Set([
  'org.eclipse.elk.topdownLayout',
  'org.eclipse.elk.layered.cycleBreaking.strategy',
  'org.eclipse.elk.layered.layering.nodePromotion.strategy',
  'org.eclipse.elk.layered.nodePlacement.bk.edgeStraightening',
  'org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment',
  'org.eclipse.elk.layered.considerModelOrder.longEdgeStrategy',
]);

const NEEDS_FOLLOW_UP_PREFIXES = [
  'org.eclipse.elk.topdown.',
] as const;

const UNSAFE_OR_TOO_LOW_LEVEL_EXACT = new Set([
  'org.eclipse.elk.debugMode',
  'org.eclipse.elk.interactive',
  'org.eclipse.elk.interactiveLayout',
  'org.eclipse.elk.priority',
  'org.eclipse.elk.layered.allowNonFlowPortsToSwitchSides',
  'org.eclipse.elk.layered.crossingMinimization.greedySwitch.type',
  'org.eclipse.elk.layered.crossingMinimization.greedySwitchHierarchical.type',
  'org.eclipse.elk.layered.crossingMinimization.inLayerPredOf',
  'org.eclipse.elk.layered.crossingMinimization.inLayerSuccOf',
  'org.eclipse.elk.layered.crossingMinimization.positionChoiceConstraint',
  'org.eclipse.elk.layered.crossingMinimization.positionId',
  'org.eclipse.elk.layered.crossingMinimization.semiInteractive',
  'org.eclipse.elk.layered.directionCongruency',
  'org.eclipse.elk.layered.edgeRouting.polyline.slopedEdgeZoneWidth',
  'org.eclipse.elk.layered.edgeRouting.selfLoopDistribution',
  'org.eclipse.elk.layered.edgeRouting.selfLoopOrdering',
  'org.eclipse.elk.layered.feedbackEdges',
  'org.eclipse.elk.layered.generatePositionAndLayerIds',
  'org.eclipse.elk.layered.interactiveReferencePoint',
  'org.eclipse.elk.layered.layering.layerChoiceConstraint',
  'org.eclipse.elk.layered.layering.layerConstraint',
  'org.eclipse.elk.layered.layering.layerId',
  'org.eclipse.elk.layered.portSortingStrategy',
  'org.eclipse.elk.partitioning.activate',
  'org.eclipse.elk.partitioning.partition',
]);

const UNSAFE_OR_TOO_LOW_LEVEL_PREFIXES = [
  'org.eclipse.elk.layered.compaction.postCompaction.',
  'org.eclipse.elk.layered.edgeRouting.splines.',
  'org.eclipse.elk.layered.layering.minWidth.',
  'org.eclipse.elk.layered.layering.coffmanGraham.',
  'org.eclipse.elk.layered.layerUnzipping.',
  'org.eclipse.elk.layered.nodePlacement.networkSimplex.',
  'org.eclipse.elk.layered.priority.',
  'org.eclipse.elk.layered.wrapping.',
] as const;

function hasKnownPrefix(id: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => id.startsWith(prefix));
}

export function classifyOfficialElkOption(
  optionId: string,
  algorithmId: AuditedElkAlgorithmId,
): ElkOptionAuditClassification | null {
  const id = normalizeOfficialElkOptionId(optionId);
  if (exposedOptionIdsForAlgorithm(algorithmId).has(id)) {
    return {
      category: 'authorable-and-exposed',
      reason: 'Typed registry entry renders in the shared preview layout-params UI and persists through meta.elk.',
    };
  }
  if (IMPLEMENTATION_OWNED_EXACT.has(id) || hasKnownPrefix(id, IMPLEMENTATION_OWNED_PREFIXES)) {
    return {
      category: 'implementation-owned',
      reason:
        'Owned by the graph builder, renderer, or measured frame/port model; exposing it would bypass repo geometry invariants.',
    };
  }
  if (INVALID_FOR_CURRENT_IR_EXACT.has(id)) {
    return {
      category: 'invalid-for-current-ir',
      reason:
        'The current graph IR does not author the corresponding ELK concept as a user-facing layout parameter.',
    };
  }
  if (NEEDS_FOLLOW_UP_EXACT.has(id) || hasKnownPrefix(id, NEEDS_FOLLOW_UP_PREFIXES)) {
    return {
      category: 'needs-follow-up',
      reason:
        'Potentially useful, but needs dedicated enum/default validation or IR support before becoming author-facing.',
    };
  }
  if (UNSAFE_OR_TOO_LOW_LEVEL_EXACT.has(id) || hasKnownPrefix(id, UNSAFE_OR_TOO_LOW_LEVEL_PREFIXES)) {
    return {
      category: 'unsafe-or-too-low-level',
      reason:
        'Advanced ELK internal heuristic or constraint surface that is too easy to misuse without a narrower UI contract.',
    };
  }
  return null;
}
