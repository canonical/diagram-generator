import {
  DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE,
  getSupportedFrameYamlControlSpecsForNamespace,
  isSupportedFrameYamlEngineLayoutNamespace,
  listFrameYamlEngineLayoutCandidateIds,
  resolveFrameYamlEngineLayoutCandidateId,
  type FrameYamlPersistedControlSpec,
} from "@diagram-generator/layout-engine";

export interface FrameYamlEngineLayoutNamespaceDescriptor {
  readonly namespace: string;
  applyOverrides(document: Record<string, unknown>, overrides: Record<string, unknown>): void;
}

const frameYamlEngineLayoutNamespaces = new Map<string, FrameYamlEngineLayoutNamespaceDescriptor>();

function supportedSpecsForNamespace(namespace: string): Map<string, FrameYamlPersistedControlSpec> {
  return getSupportedFrameYamlControlSpecsForNamespace(namespace);
}

function supportedKeysForNamespace(namespace: string): Set<string> {
  return new Set(supportedSpecsForNamespace(namespace).keys());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertSupportedFrameYamlElkOverrides(
  overrides: Record<string, unknown>,
  source: string,
): void {
  assertSupportedFrameYamlEngineLayoutOverrides(
    DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE,
    overrides,
    source,
    "ELK",
  );
}

export function assertSupportedFrameYamlEngineLayoutOverrides(
  namespace: string,
  overrides: Record<string, unknown>,
  source: string,
  label = namespace,
  preferredLayoutEngine?: string | null,
): void {
  const supportedKeys = supportedKeysForNamespace(namespace);
  if (supportedKeys.size === 0) {
    return;
  }
  const unsupported = Object.keys(overrides)
    .filter((key) => !supportedKeys.has(key))
    .sort();
  if (unsupported.length > 0) {
    throw new Error(`${source} contains unsupported ${label} keys: ${unsupported.join(", ")}`);
  }
  const keys = Object.keys(overrides);
  if (keys.length === 0) {
    return;
  }
  const candidateEngines = listFrameYamlEngineLayoutCandidateIds(namespace, overrides);
  if (candidateEngines.length === 0) {
    throw new Error(
      `${source} mixes ${label} keys that do not belong to any single supported engine in '${namespace}'`,
    );
  }
  if (
    candidateEngines.length > 1
    && !resolveFrameYamlEngineLayoutCandidateId(namespace, overrides, preferredLayoutEngine)
  ) {
    throw new Error(
      `${source} is ambiguous across supported engines in '${namespace}'; set meta.layout_engine before saving`,
    );
  }
}

function metaKeyFromNamespace(namespace: string): string {
  if (!namespace.startsWith("meta.") || namespace.length <= "meta.".length) {
    throw new Error(`Frame YAML engine layout namespace '${namespace}' cannot be persisted under meta`);
  }
  return namespace.slice("meta.".length);
}

function coercePersistedControlValue(
  value: unknown,
  kind: string | undefined,
): unknown {
  if (kind === "boolean") {
    if (typeof value === "boolean") {
      return value;
    }
    const trimmed = String(value).trim().toLowerCase();
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    return Boolean(value);
  }

  if (kind === "number") {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    const trimmed = String(value).trim();
    if (!trimmed) {
      return "";
    }
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : trimmed;
  }

  return typeof value === "string" ? value.trim() : value;
}

function createBuiltInNamespaceDescriptor(
  namespace: string,
): FrameYamlEngineLayoutNamespaceDescriptor | undefined {
  if (!namespace.startsWith("meta.")) {
    return undefined;
  }
  if (!isSupportedFrameYamlEngineLayoutNamespace(namespace)) {
    return undefined;
  }

  return {
    namespace,
    applyOverrides(document, overrides) {
      const label = namespace === DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE
        ? "ELK"
        : namespace.slice("meta.".length);
      const source = namespace === DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE
        ? "elk_layout_overrides"
        : `engine_layout_overrides.${namespace}`;
      applyEngineLayoutNamespaceOverrides(namespace, document, overrides, source, label);
    },
  };
}

function applyEngineLayoutNamespaceOverrides(
  namespace: string,
  document: Record<string, unknown>,
  overrides: Record<string, unknown>,
  source: string,
  label = namespace,
): void {
  if (Object.keys(overrides).length === 0) return;
  const meta = isRecord(document.meta) ? document.meta : {};
  document.meta = meta;
  const preferredLayoutEngine = typeof meta.layout_engine === "string"
    ? meta.layout_engine.trim()
    : null;
  assertSupportedFrameYamlEngineLayoutOverrides(namespace, overrides, source, label, preferredLayoutEngine);
  const metaKey = metaKeyFromNamespace(namespace);
  const supportedSpecs = supportedSpecsForNamespace(namespace);
  const next: Record<string, unknown> = isRecord(meta[metaKey])
    ? Object.fromEntries(Object.entries(meta[metaKey]).map(([key, value]) => [String(key), value]))
    : {};
  for (const [key, value] of Object.entries(overrides)) {
    const spec = supportedSpecs.get(key);
    const coerced = coercePersistedControlValue(value, spec?.kind);
    if (coerced == null || coerced === "") {
      delete next[String(key)];
    } else {
      next[String(key)] = coerced;
    }
  }
  if (Object.keys(next).length > 0) {
    meta[metaKey] = next;
  } else {
    delete meta[metaKey];
  }
}

export function assertSupportedFrameYamlDagreOverrides(
  overrides: Record<string, unknown>,
  source: string,
): void {
  assertSupportedFrameYamlEngineLayoutOverrides("meta.dagre", overrides, source, "dagre");
}

export function registerFrameYamlEngineLayoutNamespace(
  descriptor: FrameYamlEngineLayoutNamespaceDescriptor,
): () => void {
  if (frameYamlEngineLayoutNamespaces.has(descriptor.namespace)) {
    throw new Error(`Frame YAML engine layout namespace '${descriptor.namespace}' is already registered`);
  }
  frameYamlEngineLayoutNamespaces.set(descriptor.namespace, descriptor);
  return () => {
    frameYamlEngineLayoutNamespaces.delete(descriptor.namespace);
  };
}

export function getFrameYamlEngineLayoutNamespace(
  namespace: string,
): FrameYamlEngineLayoutNamespaceDescriptor | undefined {
  const registered = frameYamlEngineLayoutNamespaces.get(namespace);
  if (registered) {
    return registered;
  }
  return createBuiltInNamespaceDescriptor(namespace);
}
