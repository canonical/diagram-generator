import type { FrameDiagram } from '../frame-model.js';
import type {
  CompatibilityResult,
  FrameDiagramCompatibilitySummary,
  PreviewEngineContext,
  PreviewEngineManifest,
} from './types.js';

const previewEngineRegistry: PreviewEngineManifest[] = [];

/** Registered preview engines. Prefer `registerPreviewEngine(...)` over editing a central list. */
export const PREVIEW_ENGINE_REGISTRY: readonly PreviewEngineManifest[] = previewEngineRegistry;

export function registerPreviewEngine(manifest: PreviewEngineManifest): () => void {
  if (previewEngineRegistry.some((entry) => entry.id === manifest.id)) {
    throw new Error(`Preview engine '${manifest.id}' is already registered`);
  }
  previewEngineRegistry.push(manifest);
  return () => {
    const index = previewEngineRegistry.findIndex((entry) => entry.id === manifest.id);
    if (index >= 0) {
      previewEngineRegistry.splice(index, 1);
    }
  };
}

export function listPreviewEngines(): PreviewEngineManifest[] {
  return PREVIEW_ENGINE_REGISTRY.map((entry) => entry);
}

export function getPreviewEngine(id: string): PreviewEngineManifest | undefined {
  return PREVIEW_ENGINE_REGISTRY.find((entry) => entry.id === id);
}

export function listPreviewEnginesBySidebarSection(
  section: string,
): PreviewEngineManifest[] {
  return PREVIEW_ENGINE_REGISTRY.filter((entry) => (
    entry.hostView?.sidebarSections?.includes(section) ?? false
  ));
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

export function summarizeFrameDiagramCompatibility(
  diagram: FrameDiagram,
): FrameDiagramCompatibilitySummary {
  const unsupportedCarrierIds = collectUnsupportedCarrierIds(diagram);
  return {
    arrowCount: diagram.arrows.length,
    unsupportedCarrierIds,
    unsupportedElkCarrierIds: unsupportedCarrierIds,
  };
}

function collectEndpointIds(diagram: FrameDiagram): Set<string> {
  const ids = new Set<string>();
  for (const arrow of diagram.arrows) {
    if (arrow.source) ids.add(arrow.source.split('.')[0]!);
    if (arrow.target) ids.add(arrow.target.split('.')[0]!);
  }
  return ids;
}

function collectUnsupportedCarrierIds(diagram: FrameDiagram): string[] {
  const endpoints = collectEndpointIds(diagram);
  const unsupported = new Set<string>();

  function visit(frame: FrameDiagram['root'], isRoot: boolean): void {
    if (
      !isRoot &&
      frame.children.length > 0 &&
      endpoints.has(frame.id) &&
      frame.id
    ) {
      unsupported.add(frame.id);
    }
    for (const child of frame.children) {
      visit(child, false);
    }
  }

  visit(diagram.root, true);
  return [...unsupported].sort();
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

  const frameDiagramRequirements = engine.compatibility.frameDiagramRequirements;
  if (
    previewDocumentKind === 'frame-diagram' &&
    frameDiagramRequirements?.minArrowCount &&
    context.frameDiagramSummary &&
    context.frameDiagramSummary.arrowCount < frameDiagramRequirements.minArrowCount
  ) {
    return {
      compatible: false,
      reason: `Engine requires at least ${frameDiagramRequirements.minArrowCount} authored arrow${frameDiagramRequirements.minArrowCount === 1 ? '' : 's'}`,
    };
  }

  if (
    previewDocumentKind === 'frame-diagram' &&
    frameDiagramRequirements?.rejectUnsupportedCarrierIds &&
    context.frameDiagramSummary &&
    (context.frameDiagramSummary.unsupportedCarrierIds ?? context.frameDiagramSummary.unsupportedElkCarrierIds).length > 0
  ) {
    const unsupportedCarrierIds = context.frameDiagramSummary.unsupportedCarrierIds
      ?? context.frameDiagramSummary.unsupportedElkCarrierIds;
    return {
      compatible: false,
      reason:
        `Engine cannot natively represent the current frame structure: ` +
        unsupportedCarrierIds.slice(0, 3).join(', '),
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
