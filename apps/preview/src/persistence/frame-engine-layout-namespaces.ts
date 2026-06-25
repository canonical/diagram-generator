import { listPreviewEngines } from "@diagram-generator/layout-engine";

export interface FrameYamlEngineLayoutNamespaceDescriptor {
  readonly namespace: string;
  applyOverrides(document: Record<string, unknown>, overrides: Record<string, unknown>): void;
}

const frameYamlEngineLayoutNamespaces = new Map<string, FrameYamlEngineLayoutNamespaceDescriptor>();

function supportedKeysByNamespace(): Map<string, Set<string>> {
  const namespaces = new Map<string, Set<string>>();
  for (const engine of listPreviewEngines()) {
    for (const spec of engine.controlSpecs ?? []) {
      const namespace = spec.persistNamespace?.trim();
      if (!namespace) continue;
      const supported = namespaces.get(namespace) ?? new Set<string>();
      supported.add(spec.key);
      namespaces.set(namespace, supported);
    }
  }
  return namespaces;
}

function supportedKeysForNamespace(namespace: string): Set<string> {
  return supportedKeysByNamespace().get(namespace) ?? new Set<string>();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertSupportedFrameYamlElkOverrides(
  overrides: Record<string, unknown>,
  source: string,
): void {
  assertSupportedFrameYamlEngineLayoutOverrides("meta.elk", overrides, source, "ELK");
}

export function assertSupportedFrameYamlEngineLayoutOverrides(
  namespace: string,
  overrides: Record<string, unknown>,
  source: string,
  label = namespace,
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
}

function metaKeyFromNamespace(namespace: string): string {
  if (!namespace.startsWith("meta.") || namespace.length <= "meta.".length) {
    throw new Error(`Frame YAML engine layout namespace '${namespace}' cannot be persisted under meta`);
  }
  return namespace.slice("meta.".length);
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
  const metaKey = metaKeyFromNamespace(namespace);
  const next: Record<string, string> = isRecord(meta[metaKey])
    ? Object.fromEntries(Object.entries(meta[metaKey]).map(([key, value]) => [String(key), String(value)]))
    : {};
  for (const [key, value] of Object.entries(overrides)) {
    if (value == null || String(value) === "") {
      delete next[String(key)];
    } else {
      next[String(key)] = String(value);
    }
  }
  assertSupportedFrameYamlEngineLayoutOverrides(namespace, next, source, label);
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
  return frameYamlEngineLayoutNamespaces.get(namespace);
}

for (const namespace of supportedKeysByNamespace().keys()) {
  if (!namespace.startsWith("meta.")) continue;
  registerFrameYamlEngineLayoutNamespace({
    namespace,
    applyOverrides(document, overrides) {
      const label = namespace === "meta.elk"
        ? "ELK"
        : namespace.slice("meta.".length);
      const source = namespace === "meta.elk"
        ? "elk_layout_overrides"
        : `engine_layout_overrides.${namespace}`;
      applyEngineLayoutNamespaceOverrides(namespace, document, overrides, source, label);
    },
  });
}
