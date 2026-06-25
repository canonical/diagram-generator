import {
  ELK_FORCE_PARAM_SPECS,
  ELK_LAYERED_PARAM_SPECS,
  ELK_MRTREE_PARAM_SPECS,
  ELK_RADIAL_PARAM_SPECS,
  ELK_RECTPACKING_PARAM_SPECS,
  ELK_STRESS_PARAM_SPECS,
} from "@diagram-generator/layout-engine";

const SUPPORTED_ELK_KEYS = new Set<string>([
  ...ELK_LAYERED_PARAM_SPECS.map((spec) => spec.key),
  ...ELK_FORCE_PARAM_SPECS.map((spec) => spec.key),
  ...ELK_STRESS_PARAM_SPECS.map((spec) => spec.key),
  ...ELK_MRTREE_PARAM_SPECS.map((spec) => spec.key),
  ...ELK_RADIAL_PARAM_SPECS.map((spec) => spec.key),
  ...ELK_RECTPACKING_PARAM_SPECS.map((spec) => spec.key),
]);

export interface FrameYamlEngineLayoutNamespaceDescriptor {
  readonly namespace: string;
  applyOverrides(document: Record<string, unknown>, overrides: Record<string, unknown>): void;
}

const frameYamlEngineLayoutNamespaces = new Map<string, FrameYamlEngineLayoutNamespaceDescriptor>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertSupportedFrameYamlElkOverrides(
  overrides: Record<string, unknown>,
  source: string,
): void {
  const unsupported = Object.keys(overrides)
    .filter((key) => !SUPPORTED_ELK_KEYS.has(key))
    .sort();
  if (unsupported.length > 0) {
    throw new Error(`${source} contains unsupported ELK keys: ${unsupported.join(", ")}`);
  }
}

function applyElkLayoutOverrides(document: Record<string, unknown>, elkOverrides: Record<string, unknown>): void {
  if (Object.keys(elkOverrides).length === 0) return;
  const meta = isRecord(document.meta) ? document.meta : {};
  document.meta = meta;
  const elk: Record<string, string> = isRecord(meta.elk)
    ? Object.fromEntries(Object.entries(meta.elk).map(([key, value]) => [String(key), String(value)]))
    : {};
  for (const [key, value] of Object.entries(elkOverrides)) {
    if (value == null || String(value) === "") {
      delete elk[String(key)];
    } else {
      elk[String(key)] = String(value);
    }
  }
  assertSupportedFrameYamlElkOverrides(elk, "elk_layout_overrides");
  if (Object.keys(elk).length > 0) {
    meta.elk = elk;
  } else {
    delete meta.elk;
  }
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

registerFrameYamlEngineLayoutNamespace({
  namespace: "meta.elk",
  applyOverrides: applyElkLayoutOverrides,
});
