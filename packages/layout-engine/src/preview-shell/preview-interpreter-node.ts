import {
  listPreviewEngines,
} from '../preview-engine/registry.js';
import type {
  PreviewEngineManifest,
} from '../preview-engine/types.js';

export interface PreviewInterpreterNode<TParams extends Record<string, unknown> = Record<string, unknown>> {
  readonly nodeId: string;
  readonly engineId: string;
  readonly layoutEngineKey: string;
  readonly manifest: PreviewEngineManifest;
  readonly params: TParams | null;
}

export interface PreviewInterpreterNodeRegistration {
  readonly manifest: PreviewEngineManifest;
  readonly nodeId?: string | null;
}

export interface PreviewInterpreterNodeRegistry<
  TParams extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly nodeIds: readonly string[];
  readonly nodes: readonly PreviewInterpreterNode<TParams>[];
  readonly paramsByNodeId: Readonly<Record<string, TParams>>;
}

export interface CreatePreviewInterpreterNodeRegistryOptions<
  TParams extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly registrations?: readonly PreviewInterpreterNodeRegistration[] | null;
  readonly paramsByNodeId?: Readonly<Record<string, TParams>> | null;
}

function normalizeIdentifier(value: string | null | undefined): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0 ? normalized : null;
}

function cloneParams<TParams extends Record<string, unknown>>(
  value: TParams | null | undefined,
): TParams | null {
  return value ? { ...value } : null;
}

function normalizeParamsByNodeId<TParams extends Record<string, unknown>>(
  value: Readonly<Record<string, TParams>> | null | undefined,
): Record<string, TParams> {
  const normalized: Record<string, TParams> = {};
  for (const [nodeId, params] of Object.entries(value ?? {})) {
    const normalizedNodeId = normalizeIdentifier(nodeId);
    const clonedParams = cloneParams(params);
    if (!normalizedNodeId || !clonedParams) {
      continue;
    }
    normalized[normalizedNodeId] = clonedParams;
  }
  return normalized;
}

export function resolvePreviewInterpreterNodeId(
  manifest: Pick<PreviewEngineManifest, 'id' | 'layoutEngineKey'>,
  preferredNodeId?: string | null,
): string {
  return normalizeIdentifier(preferredNodeId)
    ?? normalizeIdentifier(manifest.layoutEngineKey)
    ?? normalizeIdentifier(manifest.id)
    ?? (() => {
      throw new Error('Preview interpreter nodes require a non-empty id');
    })();
}

function resolveLayoutEngineKey(
  manifest: Pick<PreviewEngineManifest, 'id' | 'layoutEngineKey'>,
): string {
  return normalizeIdentifier(manifest.layoutEngineKey)
    ?? normalizeIdentifier(manifest.id)
    ?? (() => {
      throw new Error('Preview interpreter nodes require a non-empty engine id');
    })();
}

function normalizeRegistrations(
  registrations: readonly PreviewInterpreterNodeRegistration[] | null | undefined,
): PreviewInterpreterNodeRegistration[] {
  return (registrations ?? []).map((registration) => ({
    manifest: registration.manifest,
    nodeId: resolvePreviewInterpreterNodeId(registration.manifest, registration.nodeId),
  }));
}

function requireKnownPreviewInterpreterNode(
  registry: PreviewInterpreterNodeRegistry,
  nodeId: string,
): string {
  const normalizedNodeId = normalizeIdentifier(nodeId);
  if (!normalizedNodeId || !registry.nodeIds.includes(normalizedNodeId)) {
    throw new Error(`Unknown preview interpreter node '${nodeId}'`);
  }
  return normalizedNodeId;
}

export function createPreviewInterpreterNodeRegistry<
  TParams extends Record<string, unknown> = Record<string, unknown>,
>(
  options: CreatePreviewInterpreterNodeRegistryOptions<TParams>,
): PreviewInterpreterNodeRegistry<TParams> {
  const registrations = normalizeRegistrations(options.registrations);
  const paramsByNodeId = normalizeParamsByNodeId(options.paramsByNodeId);
  const nodeIds = new Set<string>();
  const nodes: PreviewInterpreterNode<TParams>[] = [];

  for (const registration of registrations) {
    const nodeId = resolvePreviewInterpreterNodeId(registration.manifest, registration.nodeId);
    if (nodeIds.has(nodeId)) {
      throw new Error(`Preview interpreter node '${nodeId}' is already registered`);
    }
    nodeIds.add(nodeId);
    nodes.push({
      nodeId,
      engineId: registration.manifest.id,
      layoutEngineKey: resolveLayoutEngineKey(registration.manifest),
      manifest: registration.manifest,
      params: cloneParams(paramsByNodeId[nodeId]),
    });
  }

  const filteredParamsByNodeId: Record<string, TParams> = {};
  for (const node of nodes) {
    const params = cloneParams(paramsByNodeId[node.nodeId]);
    if (params) {
      filteredParamsByNodeId[node.nodeId] = params;
    }
  }

  return {
    nodeIds: nodes.map((node) => node.nodeId),
    nodes,
    paramsByNodeId: filteredParamsByNodeId,
  };
}

export function createRegisteredPreviewInterpreterNodeRegistry<
  TParams extends Record<string, unknown> = Record<string, unknown>,
>(
  options: Omit<CreatePreviewInterpreterNodeRegistryOptions<TParams>, 'registrations'> = {},
): PreviewInterpreterNodeRegistry<TParams> {
  return createPreviewInterpreterNodeRegistry({
    registrations: listPreviewEngines().map((manifest) => ({ manifest })),
    paramsByNodeId: options.paramsByNodeId,
  });
}

export function listPreviewInterpreterNodes<
  TParams extends Record<string, unknown> = Record<string, unknown>,
>(
  registry: PreviewInterpreterNodeRegistry<TParams>,
): PreviewInterpreterNode<TParams>[] {
  return registry.nodes.map((node) => ({
    ...node,
    params: cloneParams(node.params),
  }));
}

export function getPreviewInterpreterNode<
  TParams extends Record<string, unknown> = Record<string, unknown>,
>(
  registry: PreviewInterpreterNodeRegistry<TParams>,
  nodeId: string,
): PreviewInterpreterNode<TParams> | undefined {
  const normalizedNodeId = normalizeIdentifier(nodeId);
  const node = registry.nodes.find((entry) => entry.nodeId === normalizedNodeId);
  return node
    ? {
      ...node,
      params: cloneParams(node.params),
    }
    : undefined;
}

export function getPreviewInterpreterNodeParams<
  TParams extends Record<string, unknown> = Record<string, unknown>,
>(
  registry: PreviewInterpreterNodeRegistry<TParams>,
  nodeId: string,
): TParams | null {
  const normalizedNodeId = requireKnownPreviewInterpreterNode(registry, nodeId);
  return cloneParams(registry.paramsByNodeId[normalizedNodeId]);
}

export function setPreviewInterpreterNodeParams<
  TParams extends Record<string, unknown> = Record<string, unknown>,
>(
  registry: PreviewInterpreterNodeRegistry<TParams>,
  nodeId: string,
  params: TParams,
): PreviewInterpreterNodeRegistry<TParams> {
  const normalizedNodeId = requireKnownPreviewInterpreterNode(registry, nodeId);
  return createPreviewInterpreterNodeRegistry({
    registrations: registry.nodes.map((node) => ({
      manifest: node.manifest,
      nodeId: node.nodeId,
    })),
    paramsByNodeId: {
      ...registry.paramsByNodeId,
      [normalizedNodeId]: cloneParams(params) ?? params,
    },
  });
}

export function clearPreviewInterpreterNodeParams<
  TParams extends Record<string, unknown> = Record<string, unknown>,
>(
  registry: PreviewInterpreterNodeRegistry<TParams>,
  nodeId: string,
): PreviewInterpreterNodeRegistry<TParams> {
  const normalizedNodeId = requireKnownPreviewInterpreterNode(registry, nodeId);
  const paramsByNodeId = { ...registry.paramsByNodeId };
  delete paramsByNodeId[normalizedNodeId];
  return createPreviewInterpreterNodeRegistry({
    registrations: registry.nodes.map((node) => ({
      manifest: node.manifest,
      nodeId: node.nodeId,
    })),
    paramsByNodeId,
  });
}
