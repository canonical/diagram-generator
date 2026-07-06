import {
  DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE,
  getPreviewEngine,
  getPreviewEngineByLayoutKey,
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
const FRAME_YAML_ENGINE_LAYOUT_NODE_NAMESPACE_SUFFIX = "_nodes" as const;

function supportedSpecsForNamespace(namespace: string): Map<string, FrameYamlPersistedControlSpec> {
  return getSupportedFrameYamlControlSpecsForNamespace(namespace);
}

function supportedKeysForNamespace(namespace: string): Set<string> {
  return new Set(supportedSpecsForNamespace(namespace).keys());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function specAllowsEmptyString(
  spec: FrameYamlPersistedControlSpec | undefined,
): boolean {
  return spec?.emptyStringIsValue === true;
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

export function sanitizeSupportedFrameYamlEngineLayoutOverrides(
  namespace: string,
  overrides: Record<string, unknown>,
  source: string,
  label = namespace,
  preferredLayoutEngine?: string | null,
): Record<string, unknown> {
  const supportedSpecs = supportedSpecsForNamespace(namespace);
  if (supportedSpecs.size === 0) {
    return { ...overrides };
  }

  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(overrides)) {
    const spec = supportedSpecs.get(key);
    if (!spec) {
      continue;
    }
    if (value == null || (value === "" && !specAllowsEmptyString(spec))) {
      continue;
    }
    next[String(key)] = value;
  }

  if (Object.keys(next).length === 0) {
    return {};
  }

  assertSupportedFrameYamlEngineLayoutOverrides(namespace, next, source, label, preferredLayoutEngine);
  return next;
}

export function frameYamlEngineLayoutAllowsEmptyStringValue(
  namespace: string,
  key: string,
): boolean {
  return specAllowsEmptyString(supportedSpecsForNamespace(namespace).get(key));
}

export function isFrameYamlEngineLayoutNodeNamespace(namespace: string): boolean {
  return namespace.startsWith("meta.")
    && namespace.endsWith(FRAME_YAML_ENGINE_LAYOUT_NODE_NAMESPACE_SUFFIX)
    && namespace.length > "meta.".length + FRAME_YAML_ENGINE_LAYOUT_NODE_NAMESPACE_SUFFIX.length;
}

function baseNamespaceFromNodeNamespace(namespace: string): string | null {
  if (!isFrameYamlEngineLayoutNodeNamespace(namespace)) {
    return null;
  }
  return namespace.slice(0, -FRAME_YAML_ENGINE_LAYOUT_NODE_NAMESPACE_SUFFIX.length);
}

function resolveNodePersistManifest(
  nodeId: string,
  baseNamespace: string,
) {
  const manifest = getPreviewEngineByLayoutKey(nodeId) ?? getPreviewEngine(nodeId) ?? null;
  if (!manifest) {
    return null;
  }
  const namespaces = new Set(
    (manifest.controlSpecs ?? [])
      .map((spec) => typeof spec.persistNamespace === "string" ? spec.persistNamespace.trim() : "")
      .filter((value) => value.length > 0),
  );
  return namespaces.has(baseNamespace) ? manifest : null;
}

export function sanitizeSupportedFrameYamlEngineLayoutNodeBuckets(
  namespace: string,
  nodeBuckets: Record<string, unknown>,
  source: string,
): Record<string, Record<string, unknown>> {
  const baseNamespace = baseNamespaceFromNodeNamespace(namespace);
  if (!baseNamespace) {
    return {};
  }
  const label = baseNamespace === DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE
    ? "ELK"
    : baseNamespace.slice("meta.".length);
  const sanitized: Record<string, Record<string, unknown>> = {};
  for (const [nodeId, rawBucket] of Object.entries(nodeBuckets)) {
    if (!isRecord(rawBucket)) {
      continue;
    }
    const manifest = resolveNodePersistManifest(nodeId, baseNamespace);
    if (!manifest) {
      continue;
    }
    const nextBucket = sanitizeSupportedFrameYamlEngineLayoutOverrides(
      baseNamespace,
      rawBucket,
      `${source}.${nodeId}`,
      label,
      nodeId,
    );
    if (Object.keys(nextBucket).length > 0) {
      sanitized[nodeId] = nextBucket;
    }
  }
  return sanitized;
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
  if (isFrameYamlEngineLayoutNodeNamespace(namespace)) {
    return {
      namespace,
      applyOverrides(document, overrides) {
        applyEngineLayoutNodeNamespaceOverrides(
          namespace,
          document,
          overrides,
          `engine_layout_overrides.${namespace}`,
        );
      },
    };
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

function applyEngineLayoutNodeNamespaceOverrides(
  namespace: string,
  document: Record<string, unknown>,
  overrides: Record<string, unknown>,
  source: string,
): void {
  const baseNamespace = baseNamespaceFromNodeNamespace(namespace);
  if (!baseNamespace) {
    throw new Error(`${source} is not a supported frame-YAML node namespace`);
  }
  const meta = isRecord(document.meta) ? document.meta : {};
  document.meta = meta;
  const metaKey = metaKeyFromNamespace(namespace);
  const next: Record<string, unknown> = {};
  const label = baseNamespace === DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE
    ? "ELK"
    : baseNamespace.slice("meta.".length);
  const supportedSpecs = supportedSpecsForNamespace(baseNamespace);
  for (const [nodeId, rawBucket] of Object.entries(overrides)) {
    if (!isRecord(rawBucket)) {
      throw new Error(`${source}.${nodeId} must be an object`);
    }
    const manifest = resolveNodePersistManifest(nodeId, baseNamespace);
    if (!manifest) {
      throw new Error(`${source}.${nodeId} references an unknown or foreign interpreter node`);
    }
    assertSupportedFrameYamlEngineLayoutOverrides(
      baseNamespace,
      rawBucket,
      `${source}.${nodeId}`,
      label,
      nodeId,
    );
    const bucket: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawBucket)) {
      const spec = supportedSpecs.get(key);
      const coerced = coercePersistedControlValue(value, spec?.kind);
      if (coerced == null || (coerced === "" && !specAllowsEmptyString(spec))) {
        continue;
      }
      bucket[key] = coerced;
    }
    const sanitizedBucket = sanitizeSupportedFrameYamlEngineLayoutOverrides(
      baseNamespace,
      bucket,
      `${source}.${nodeId}`,
      label,
      nodeId,
    );
    if (Object.keys(sanitizedBucket).length > 0) {
      next[nodeId] = sanitizedBucket;
    } else {
      delete next[nodeId];
    }
  }
  if (Object.keys(next).length > 0) {
    meta[metaKey] = next;
  } else {
    delete meta[metaKey];
  }
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
  const existing = isRecord(meta[metaKey])
    ? sanitizeSupportedFrameYamlEngineLayoutOverrides(
      namespace,
      meta[metaKey],
      `${source} existing`,
      label,
      preferredLayoutEngine,
    )
    : {};
  const existingCandidate = Object.keys(existing).length > 0
    ? resolveFrameYamlEngineLayoutCandidateId(namespace, existing, preferredLayoutEngine)
    : null;
  const next: Record<string, unknown> = preferredLayoutEngine
    && existingCandidate
    && existingCandidate !== preferredLayoutEngine
    ? {}
    : { ...existing };
  for (const [key, value] of Object.entries(overrides)) {
    const spec = supportedSpecs.get(key);
    const coerced = coercePersistedControlValue(value, spec?.kind);
    if (coerced == null || (coerced === "" && !specAllowsEmptyString(spec))) {
      delete next[String(key)];
    } else {
      next[String(key)] = coerced;
    }
  }
  const sanitizedNext = sanitizeSupportedFrameYamlEngineLayoutOverrides(
    namespace,
    next,
    source,
    label,
    preferredLayoutEngine,
  );
  if (Object.keys(sanitizedNext).length > 0) {
    meta[metaKey] = sanitizedNext;
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
