import { elkLayeredPreviewControlSpecs } from './elk-controls.js';
import { FORCE_PREVIEW_PARAM_SPECS } from './force-param-registry.js';
import type { FrameDiagram } from '../frame-model.js';
import type {
  CompatibilityResult,
  FrameDiagramCompatibilitySummary,
  PreviewEngineContext,
  PreviewEngineManifest,
} from './types.js';


export const V3_PREVIEW_ENGINE: PreviewEngineManifest = {
  id: 'v3',
  label: 'Native v3 autolayout',
  layoutEngineKey: 'v3',
  shellMode: 'grid',
  capabilities: {
    layoutControls: false,
    localRelayout: true,
    serverRelayout: false,
    engineBackedSave: false,
    nodeInspector: true,
    gridEditing: true,
    referenceImage: true,
    simulationControls: false,
    rawDebugView: false,
  },
  controlSpecs: [],
  scripts: [],
  compatibility: {
    documentKinds: ['frame-diagram'],
    description: 'Canonical native v3 autolayout for authored frame diagrams',
  },
};


export const ELK_LAYERED_PREVIEW_ENGINE: PreviewEngineManifest = {
  id: 'elk-layered',
  label: 'ELK layered layout',
  layoutEngineKey: 'elk-layered',
  shellMode: 'grid',
  capabilities: {
    layoutControls: true,
    localRelayout: false,
    serverRelayout: true,
    engineBackedSave: true,
    nodeInspector: true,
    gridEditing: false,
    referenceImage: true,
    simulationControls: false,
    rawDebugView: false,
  },
  controlSpecs: elkLayeredPreviewControlSpecs(),
  scripts: ['elk-layout-controls.js', 'elk-controller.js'],
  compatibility: {
    documentKinds: ['frame-diagram'],
    requiredLayoutEngineKey: 'elk-layered',
    description: 'Hierarchical layered layout for directed graphs and flowcharts',
  },
};

export const FORCE_PREVIEW_ENGINE: PreviewEngineManifest = {
  id: 'force',
  label: 'Force-directed layout',
  shellMode: 'force',
  capabilities: {
    layoutControls: false,
    localRelayout: true,
    serverRelayout: false,
    engineBackedSave: true,
    nodeInspector: true,
    gridEditing: false,
    referenceImage: true,
    simulationControls: true,
    rawDebugView: false,
  },
  controlSpecs: FORCE_PREVIEW_PARAM_SPECS,
  scripts: ['force.js'],
  apiRoutes: {
    save: '/api/force-save/{slug}',
    spec: '/api/force-spec/{slug}',
  },
  compatibility: {
    documentKinds: ['force-spec'],
    description: 'Physics-based force-directed layout for organic graph structures',
  },
};

export const SEQUENCE_PREVIEW_ENGINE: PreviewEngineManifest = {
  id: 'sequence',
  label: 'Sequence layout',
  layoutEngineKey: 'sequence',
  shellMode: 'grid',
  capabilities: {
    layoutControls: false,
    localRelayout: true,
    serverRelayout: false,
    engineBackedSave: false,
    nodeInspector: false,
    gridEditing: false,
    referenceImage: true,
    simulationControls: false,
    rawDebugView: false,
  },
  controlSpecs: [],
  scripts: [],
  compatibility: {
    documentKinds: ['sequence'],
    requiredLayoutEngineKey: 'sequence',
    description: 'Timeline-based layout for sequence diagrams and message flows',
  },
};

/** Registered preview engines — extend here when onboarding new packages. */
export const PREVIEW_ENGINE_REGISTRY: readonly PreviewEngineManifest[] = [
  V3_PREVIEW_ENGINE,
  ELK_LAYERED_PREVIEW_ENGINE,
  FORCE_PREVIEW_ENGINE,
  SEQUENCE_PREVIEW_ENGINE,
] as const;

export function listPreviewEngines(): PreviewEngineManifest[] {
  return PREVIEW_ENGINE_REGISTRY.map((entry) => entry);
}

export function getPreviewEngine(id: string): PreviewEngineManifest | undefined {
  return PREVIEW_ENGINE_REGISTRY.find((entry) => entry.id === id);
}

/**
 * Look up a preview engine by its hostable `layoutEngineKey` (the value persisted
 * in `meta.layout_engine`), NOT by its `id`. These coincide for some engines today
 * (e.g. `elk-layered`) but are semantically distinct: `id` is the manifest identity,
 * `layoutEngineKey` is the document-facing engine selector. Callers validating a
 * persisted/requested `layout_engine` value must use this, not `getPreviewEngine`.
 */
export function getPreviewEngineByLayoutKey(
  layoutEngineKey: string,
): PreviewEngineManifest | undefined {
  const key = layoutEngineKey.trim();
  if (!key) return undefined;
  return PREVIEW_ENGINE_REGISTRY.find((entry) => entry.layoutEngineKey === key);
}

export function resolvePreviewEngine(
  context: PreviewEngineContext,
): PreviewEngineManifest | undefined {
  const layoutEngine = context.layoutEngine?.trim();
  if (layoutEngine) {
    const explicit = PREVIEW_ENGINE_REGISTRY.find(
      (entry) => entry.layoutEngineKey === layoutEngine,
    );
    if (explicit) {
      if (evaluatePreviewEngineCompatibility(explicit, context).compatible) {
        return explicit;
      }
      return listCompatiblePreviewEngines(context)[0];
    }
    return undefined;
  }

  if (!context.shellMode && !context.previewDocumentKind) {
    return undefined;
  }

  // With no explicit `layout_engine`, the first compatible manifest is the
  // default lane. Registry order therefore defines default precedence.
  return listCompatiblePreviewEngines(context)[0];
}

function walkFrames(frame: FrameDiagram['root'], visit: (frame: FrameDiagram['root']) => void): void {
  visit(frame);
  for (const child of frame.children) {
    walkFrames(child, visit);
  }
}

function collectEndpointIds(diagram: FrameDiagram): Set<string> {
  const ids = new Set<string>();
  for (const arrow of diagram.arrows) {
    ids.add(arrow.source.split('.')[0]!);
    ids.add(arrow.target.split('.')[0]!);
  }
  return ids;
}

function isSyntheticHeadingFrame(frame: FrameDiagram['root']): boolean {
  return frame.role === 'heading' || Boolean(frame.id?.endsWith('__heading'));
}

function isSyntheticBodyFrame(frame: FrameDiagram['root']): boolean {
  return Boolean(frame.id?.endsWith('__body'));
}

function isSyntheticLayoutFrame(frame: FrameDiagram['root']): boolean {
  return isSyntheticHeadingFrame(frame) || isSyntheticBodyFrame(frame);
}

function isHeadedContainer(frame: FrameDiagram['root']): boolean {
  return !frame.isLeaf && frame.children.some((child) => isSyntheticBodyFrame(child));
}

function collectLeafDescendantIds(frame: FrameDiagram['root']): string[] {
  if (isSyntheticLayoutFrame(frame)) {
    return frame.children.flatMap((child) => collectLeafDescendantIds(child));
  }
  if (frame.isLeaf) return frame.id ? [frame.id] : [];
  return frame.children.flatMap((child) => collectLeafDescendantIds(child));
}

function buildArrowAdjacency(diagram: FrameDiagram): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  for (const arrow of diagram.arrows) {
    const source = arrow.source.split('.')[0]!;
    const target = arrow.target.split('.')[0]!;
    const next = adjacency.get(source) ?? new Set<string>();
    next.add(target);
    adjacency.set(source, next);
  }
  return adjacency;
}

function hasDirectedPath(
  source: string,
  target: string,
  adjacency: Map<string, Set<string>>,
): boolean {
  if (source === target) return true;
  const seen = new Set<string>([source]);
  const queue = [source];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (next === target) return true;
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return false;
}

export function summarizeFrameDiagramCompatibility(
  diagram: FrameDiagram,
): FrameDiagramCompatibilitySummary {
  const endpointIds = collectEndpointIds(diagram);
  const adjacency = buildArrowAdjacency(diagram);
  const unsupportedElkCarrierIds: string[] = [];

  walkFrames(diagram.root, (frame) => {
    if (!frame.id || !isHeadedContainer(frame) || endpointIds.has(frame.id)) return;

    const leafIds = [...new Set(collectLeafDescendantIds(frame))];
    const endpointLeaves = leafIds.filter((id) => endpointIds.has(id));
    if (endpointLeaves.length === 0) return;

    const nonEndpointLeaves = leafIds.filter((id) => !endpointIds.has(id));
    if (nonEndpointLeaves.length > 0) {
      unsupportedElkCarrierIds.push(frame.id);
      return;
    }

    for (let i = 0; i < endpointLeaves.length; i += 1) {
      for (let j = i + 1; j < endpointLeaves.length; j += 1) {
        const left = endpointLeaves[i]!;
        const right = endpointLeaves[j]!;
        const comparable =
          hasDirectedPath(left, right, adjacency) || hasDirectedPath(right, left, adjacency);
        if (!comparable) {
          unsupportedElkCarrierIds.push(frame.id);
          return;
        }
      }
    }
  });

  return {
    arrowCount: diagram.arrows.length,
    unsupportedElkCarrierIds,
  };
}

export function listHostableLayoutEngineKeys(): string[] {
  return PREVIEW_ENGINE_REGISTRY
    .map((entry) => entry.layoutEngineKey)
    .filter((key): key is string => typeof key === 'string' && key.length > 0);
}

/**
 * Evaluate whether an engine is compatible with the given context.
 * Returns a detailed result with a reason when incompatible.
 */
export function evaluatePreviewEngineCompatibility(
  engine: PreviewEngineManifest,
  context: PreviewEngineContext,
): CompatibilityResult {
  const shellMode = context.shellMode ?? null;
  if (shellMode && engine.shellMode !== shellMode) {
    return {
      compatible: false,
      reason: `Engine requires shell mode '${engine.shellMode}' but document uses '${shellMode}'`,
    };
  }

  const previewDocumentKind = context.previewDocumentKind ?? null;
  if (previewDocumentKind && !engine.compatibility.documentKinds.includes(previewDocumentKind)) {
    return {
      compatible: false,
      reason: `Engine cannot render document kind '${previewDocumentKind}'`,
    };
  }

  if (
    engine.id === 'elk-layered' &&
    previewDocumentKind === 'frame-diagram' &&
    context.frameDiagramSummary &&
    context.frameDiagramSummary.arrowCount < 1
  ) {
    return {
      compatible: false,
      reason: 'Engine requires at least one authored arrow',
    };
  }

  if (
    engine.id === 'elk-layered' &&
    previewDocumentKind === 'frame-diagram' &&
    context.frameDiagramSummary &&
    context.frameDiagramSummary.unsupportedElkCarrierIds.length > 0
  ) {
    return {
      compatible: false,
      reason:
        `Engine cannot natively represent headed non-endpoint groups: ` +
        context.frameDiagramSummary.unsupportedElkCarrierIds.slice(0, 3).join(', '),
    };
  }

  // `requiredLayoutEngineKey` is an OFFER filter, not an ACTIVE-resolution gate.
  // When a document has not yet chosen an engine (`layoutEngine` empty), this
  // engine is still offerable for its document kind — the switcher needs to be
  // able to propose it. The key is only enforced when the document already
  // declares a *conflicting* layout engine. Picking the active engine for a
  // chosen key is `resolvePreviewEngine`'s job, not this predicate's.
  const requiredLayoutEngineKey = engine.compatibility.requiredLayoutEngineKey;
  const layoutEngine = context.layoutEngine?.trim() ?? '';
  if (requiredLayoutEngineKey && layoutEngine && layoutEngine !== requiredLayoutEngineKey) {
    return {
      compatible: false,
      reason: `Engine requires layout engine '${requiredLayoutEngineKey}' but document uses '${layoutEngine}'`,
    };
  }

  return { compatible: true };
}

export function isPreviewEngineCompatible(
  engine: PreviewEngineManifest,
  context: PreviewEngineContext,
): boolean {
  return evaluatePreviewEngineCompatibility(engine, context).compatible;
}

export function listCompatiblePreviewEngines(
  context: PreviewEngineContext,
): PreviewEngineManifest[] {
  return PREVIEW_ENGINE_REGISTRY.filter((entry) => isPreviewEngineCompatible(entry, context));
}

/**
 * List all engines with their compatibility status for the given context.
 * Useful for building a switcher UI that shows disabled engines with reasons.
 */
export function listPreviewEnginesWithCompatibility(
  context: PreviewEngineContext,
): Array<{ engine: PreviewEngineManifest; compatibility: CompatibilityResult }> {
  return PREVIEW_ENGINE_REGISTRY.map((engine) => ({
    engine,
    compatibility: evaluatePreviewEngineCompatibility(engine, context),
  }));
}

/** JSON-serializable manifest list for preview-server consumption. */
export function serializePreviewEngineManifest(): PreviewEngineManifest[] {
  return listPreviewEngines();
}
