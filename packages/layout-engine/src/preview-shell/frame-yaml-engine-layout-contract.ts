import '../preview-engine/install-builtins.js';
import { canonicalPreviewLayoutEngineKey } from '../preview-engine/legacy-layout-engine-migration.js';
import {
  listPreviewEngines,
  resolvePreviewEngine,
} from '../preview-engine/registry.js';
import {
  FRAME_PREVIEW_SHELL_MODE,
  normalizePreviewShellMode,
} from '../preview-engine/shell-mode.js';
import type {
  PreviewControlKind,
  PreviewControlSpec,
  PreviewEngineManifest,
} from '../preview-engine/types.js';

export const DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE = 'meta.elk' as const;
export const FRAME_YAML_ENGINE_LAYOUT_NAMESPACE_PREFIX = 'meta.' as const;

export interface FrameYamlPersistedControlSpec {
  readonly key: string;
  readonly kind?: PreviewControlKind;
  readonly emptyStringIsValue?: boolean;
}

interface FrameYamlEngineControlManifest {
  readonly engineId: string;
  readonly layoutEngineKey: string | null;
  readonly namespace: string;
  readonly supported: Map<string, FrameYamlPersistedControlSpec>;
}

const FRAME_YAML_ENGINE_LAYOUT_NODE_NAMESPACE_SUFFIX = '_nodes' as const;

/**
 * Frame-diagram YAML persists engine-backed controls under `document.meta.<engine>`.
 * Spec 052 requires frame-YAML persist namespaces to stay inside that `meta.*`
 * lane; non-`meta.*` namespaces remain session-only and must not flow through
 * the frame-YAML save path.
 */
export function isFrameYamlEngineLayoutNamespace(namespace: string): boolean {
  return namespace.startsWith(FRAME_YAML_ENGINE_LAYOUT_NAMESPACE_PREFIX)
    && namespace.length > FRAME_YAML_ENGINE_LAYOUT_NAMESPACE_PREFIX.length;
}

function supportedFrameYamlControlSpecsByNamespace(): Map<string, Map<string, FrameYamlPersistedControlSpec>> {
  const namespaces = new Map<string, Map<string, FrameYamlPersistedControlSpec>>();
  for (const engine of listPreviewEngines()) {
    for (const [namespace, spec] of supportedFrameYamlControlSpecsByEngine(engine)) {
      const supported = namespaces.get(namespace) ?? new Map<string, FrameYamlPersistedControlSpec>();
      for (const [key, value] of spec.entries()) {
        supported.set(key, value);
      }
      namespaces.set(namespace, supported);
    }
  }
  return namespaces;
}

function supportedFrameYamlControlSpecsByEngine(
  engine: Pick<PreviewEngineManifest, 'controlSpecs'> | null | undefined,
): Map<string, Map<string, FrameYamlPersistedControlSpec>> {
  const namespaces = new Map<string, Map<string, FrameYamlPersistedControlSpec>>();
  for (const spec of engine?.controlSpecs ?? []) {
    const namespace = spec.persistNamespace?.trim();
    if (!namespace || !isFrameYamlEngineLayoutNamespace(namespace)) {
      continue;
    }
    const supported = namespaces.get(namespace) ?? new Map<string, FrameYamlPersistedControlSpec>();
    supported.set(spec.key, {
      key: spec.key,
      kind: spec.kind,
      emptyStringIsValue: spec.kind === 'enum'
        && Array.isArray(spec.enumValues)
        && spec.enumValues.some((entry) => entry.value === ''),
    });
    namespaces.set(namespace, supported);
  }
  return namespaces;
}

function frameYamlEngineControlManifestsByNamespace(): Map<string, FrameYamlEngineControlManifest[]> {
  const manifests = new Map<string, FrameYamlEngineControlManifest[]>();
  for (const engine of listPreviewEngines()) {
    for (const [namespace, supported] of supportedFrameYamlControlSpecsByEngine(engine)) {
      const list = manifests.get(namespace) ?? [];
      list.push({
        engineId: engine.id,
        layoutEngineKey: engine.layoutEngineKey ?? null,
        namespace,
        supported,
      });
      manifests.set(namespace, list);
    }
  }
  return manifests;
}

function normalizeNamespace(namespace: string | null | undefined): string | null {
  const trimmed = typeof namespace === 'string' ? namespace.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeLayoutEngineKey(layoutEngine: string | null | undefined): string | null {
  return canonicalPreviewLayoutEngineKey(layoutEngine);
}

function filterOverridesToSupportedSpecs(
  overrides: Record<string, unknown>,
  supported: Map<string, FrameYamlPersistedControlSpec>,
): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(overrides)) {
    const spec = supported.get(key);
    if (!spec) {
      continue;
    }
    filtered[key] = coercePersistedControlValue(value, spec.kind);
  }
  return filtered;
}

function coercePersistedControlValue(
  value: unknown,
  kind: PreviewControlKind | undefined,
): unknown {
  if (kind === 'boolean') {
    if (typeof value === 'boolean') {
      return value;
    }
    const trimmed = String(value).trim().toLowerCase();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    return Boolean(value);
  }

  if (kind === 'number') {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    const trimmed = String(value).trim();
    if (!trimmed) {
      return '';
    }
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : trimmed;
  }

  return typeof value === 'string' ? value.trim() : value;
}

function resolveFrameYamlPersistNamespaceForEngine(
  engine: Pick<PreviewEngineManifest, 'controlSpecs'> | null | undefined,
): string | null {
  for (const spec of engine?.controlSpecs ?? []) {
    const namespace = spec.persistNamespace?.trim();
    if (namespace && isFrameYamlEngineLayoutNamespace(namespace)) {
      return namespace;
    }
  }
  return null;
}

function resolveFrameYamlNodePersistNamespace(
  namespace: string | null | undefined,
): string | null {
  const normalized = normalizeNamespace(namespace);
  if (!normalized || !isFrameYamlEngineLayoutNamespace(normalized)) {
    return null;
  }
  return `${normalized}${FRAME_YAML_ENGINE_LAYOUT_NODE_NAMESPACE_SUFFIX}`;
}

function resolveFrameYamlBaseNamespaceFromNodeNamespace(
  namespace: string | null | undefined,
): string | null {
  const normalized = normalizeNamespace(namespace);
  if (
    !normalized
    || !normalized.endsWith(FRAME_YAML_ENGINE_LAYOUT_NODE_NAMESPACE_SUFFIX)
  ) {
    return null;
  }
  return normalized.slice(0, -FRAME_YAML_ENGINE_LAYOUT_NODE_NAMESPACE_SUFFIX.length);
}

function resolveFrameYamlEngineControlManifest(
  layoutEngine: string | null | undefined,
  shellMode: string | null | undefined = FRAME_PREVIEW_SHELL_MODE,
): FrameYamlEngineControlManifest | null {
  const normalizedLayoutEngine = normalizeLayoutEngineKey(layoutEngine);
  if (!normalizedLayoutEngine) {
    return null;
  }
  const engine = resolvePreviewEngine({
    layoutEngine: normalizedLayoutEngine,
    shellMode: normalizePreviewShellMode(shellMode) ?? FRAME_PREVIEW_SHELL_MODE,
  });
  if (!engine) {
    return null;
  }
  const namespace = resolveFrameYamlPersistNamespaceForEngine(engine);
  if (!namespace) {
    return null;
  }
  const supported = supportedFrameYamlControlSpecsByEngine(engine).get(namespace);
  if (!supported || supported.size === 0) {
    return null;
  }
  return {
    engineId: engine.id,
    layoutEngineKey: engine.layoutEngineKey ?? null,
    namespace,
    supported,
  };
}

export function getSupportedFrameYamlControlSpecsForNamespace(
  namespace: string,
): Map<string, FrameYamlPersistedControlSpec> {
  const normalized = normalizeNamespace(namespace);
  if (!normalized) {
    return new Map<string, FrameYamlPersistedControlSpec>();
  }
  return supportedFrameYamlControlSpecsByNamespace().get(normalized) ?? new Map<string, FrameYamlPersistedControlSpec>();
}

export function isSupportedFrameYamlEngineLayoutNamespace(namespace: string): boolean {
  return getSupportedFrameYamlControlSpecsForNamespace(namespace).size > 0;
}

export function filterSupportedFrameYamlEngineLayoutOverrides(
  namespace: string,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const supported = getSupportedFrameYamlControlSpecsForNamespace(namespace);
  if (supported.size === 0) {
    return {};
  }
  return filterOverridesToSupportedSpecs(overrides, supported);
}

export function collectUnsupportedFrameYamlEngineLayoutOverrideKeys(
  namespace: string,
  overrides: Record<string, unknown>,
): string[] {
  const supported = getSupportedFrameYamlControlSpecsForNamespace(namespace);
  if (supported.size === 0) {
    return Object.keys(overrides).sort();
  }
  return Object.keys(overrides)
    .filter((key) => !supported.has(key))
    .sort();
}

export function resolveFrameYamlEngineLayoutNamespaceForOverrides(
  overrides: Record<string, unknown>,
  preferredNamespace?: string | null,
): string {
  const preferred = normalizeNamespace(preferredNamespace);
  if (preferred && isSupportedFrameYamlEngineLayoutNamespace(preferred)) {
    return preferred;
  }

  const keys = Object.keys(overrides);
  if (keys.length === 0) {
    return DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE;
  }

  const candidates = [...supportedFrameYamlControlSpecsByNamespace().entries()]
    .filter(([, supported]) => keys.every((key) => supported.has(key)))
    .map(([namespace]) => namespace)
    .sort();

  if (candidates.includes(DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE)) {
    return DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE;
  }
  return candidates[0] ?? DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE;
}

export function readFrameYamlEngineLayoutOverridesForLayoutEngine(
  diagram: {
    layoutEngine?: string | null;
    elkLayout?: Record<string, unknown> | null;
    engineLayout?: Record<string, Record<string, unknown>> | null;
  } | null | undefined,
  shellMode: string | null | undefined = FRAME_PREVIEW_SHELL_MODE,
): { namespace: string; overrides: Record<string, unknown> } | null {
  const manifest = resolveFrameYamlEngineControlManifest(diagram?.layoutEngine, shellMode);
  if (!manifest) {
    return null;
  }
  const raw = {
    ...(diagram?.engineLayout?.[manifest.namespace] ?? {}),
    ...(manifest.namespace === DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE
      ? (diagram?.elkLayout ?? {})
      : {}),
  };
  const overrides = filterOverridesToSupportedSpecs(raw, manifest.supported);
  if (Object.keys(overrides).length === 0) {
    return null;
  }
  return { namespace: manifest.namespace, overrides };
}

export function readFrameYamlEngineLayoutNodeBuckets(
  diagram: {
    engineLayout?: Record<string, Record<string, unknown>> | null;
  } | null | undefined,
): Record<string, Record<string, Record<string, unknown>>> {
  const byNamespace: Record<string, Record<string, Record<string, unknown>>> = {};
  for (const [namespace, rawBuckets] of Object.entries(diagram?.engineLayout ?? {})) {
    const baseNamespace = resolveFrameYamlBaseNamespaceFromNodeNamespace(namespace);
    if (!baseNamespace || typeof rawBuckets !== 'object' || rawBuckets == null || Array.isArray(rawBuckets)) {
      continue;
    }
    for (const [nodeId, bucketValue] of Object.entries(rawBuckets)) {
      const manifest = resolvePreviewEngine({ layoutEngine: nodeId, shellMode: FRAME_PREVIEW_SHELL_MODE })
        ?? listPreviewEngines().find((entry) => entry.id === nodeId)
        ?? null;
      if (!manifest) {
        continue;
      }
      const manifestNamespace = resolveFrameYamlPersistNamespaceForEngine(manifest);
      if (manifestNamespace !== baseNamespace) {
        continue;
      }
      if (typeof bucketValue !== 'object' || bucketValue == null || Array.isArray(bucketValue)) {
        continue;
      }
      const supported = supportedFrameYamlControlSpecsByEngine(manifest).get(baseNamespace);
      if (!supported || supported.size === 0) {
        continue;
      }
      const bucket = filterOverridesToSupportedSpecs(
        bucketValue as Record<string, unknown>,
        supported,
      );
      if (Object.keys(bucket).length === 0) {
        continue;
      }
      byNamespace[baseNamespace] = byNamespace[baseNamespace] ?? {};
      byNamespace[baseNamespace]![nodeId] = bucket;
    }
  }
  return byNamespace;
}

export function listFrameYamlEngineLayoutCandidateIds(
  namespace: string,
  overrides: Record<string, unknown>,
): string[] {
  const normalized = normalizeNamespace(namespace);
  if (!normalized) {
    return [];
  }
  const keys = Object.keys(overrides);
  if (keys.length === 0) {
    return [];
  }
  return (frameYamlEngineControlManifestsByNamespace().get(normalized) ?? [])
    .filter((manifest) => keys.every((key) => manifest.supported.has(key)))
    .map((manifest) => manifest.layoutEngineKey ?? manifest.engineId)
    .sort();
}

export function resolveFrameYamlEngineLayoutCandidateId(
  namespace: string,
  overrides: Record<string, unknown>,
  preferredLayoutEngine?: string | null,
): string | null {
  const matches = listFrameYamlEngineLayoutCandidateIds(namespace, overrides);
  if (matches.length === 0) {
    return null;
  }
  if (matches.length === 1) {
    return matches[0] ?? null;
  }
  const preferred = normalizeLayoutEngineKey(preferredLayoutEngine);
  if (preferred && matches.includes(preferred)) {
    return preferred;
  }
  return null;
}
