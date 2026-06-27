import '../preview-engine/install-builtins.js';
import { listPreviewEngines } from '../preview-engine/registry.js';
import type { PreviewControlKind } from '../preview-engine/types.js';

export const DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE = 'meta.elk' as const;
export const FRAME_YAML_ENGINE_LAYOUT_NAMESPACE_PREFIX = 'meta.' as const;

export interface FrameYamlPersistedControlSpec {
  readonly key: string;
  readonly kind?: PreviewControlKind;
}

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
    for (const spec of engine.controlSpecs ?? []) {
      const namespace = spec.persistNamespace?.trim();
      if (!namespace || !isFrameYamlEngineLayoutNamespace(namespace)) {
        continue;
      }
      const supported = namespaces.get(namespace) ?? new Map<string, FrameYamlPersistedControlSpec>();
      supported.set(spec.key, { key: spec.key, kind: spec.kind });
      namespaces.set(namespace, supported);
    }
  }
  return namespaces;
}

function normalizeNamespace(namespace: string | null | undefined): string | null {
  const trimmed = typeof namespace === 'string' ? namespace.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
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
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (supported.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
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
