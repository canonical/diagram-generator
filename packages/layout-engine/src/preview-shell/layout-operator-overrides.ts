import {
  previewControlDisplayValues,
  visiblePreviewControlSpecs,
} from '../preview-engine/control-specs.js';
import {
  getPreviewEngine,
  getPreviewEngineByLayoutKey,
} from '../preview-engine/registry.js';
import type {
  PreviewControlSpec,
  PreviewEngineManifest,
} from '../preview-engine/types.js';
import { resolveFrameYamlEngineLayoutCandidateId } from './frame-yaml-engine-layout-contract.js';

export interface LayoutOperatorOverrideState {
  activeOperatorKey: string | null;
  byOperator: Record<string, Record<string, unknown>>;
}

export interface LayoutOperatorOverrideModelLike {
  layoutOverrides?: Record<string, unknown> | null;
  layoutOverrideNamespace?: string | null;
  layoutOperatorOverrides?: LayoutOperatorOverrideState | null;
}

export interface ResolveLayoutOperatorOverrideViewModelOptions {
  manifest: Pick<PreviewEngineManifest, 'id' | 'layoutEngineKey' | 'controlSpecs'>;
  engineLayout?: Record<string, Record<string, unknown>> | null;
  elkLayout?: Record<string, unknown> | null;
  sessionOverrides?: Record<string, unknown> | null;
  sessionState?: LayoutOperatorOverrideState | null;
  persistNamespace?: string | null;
}

export interface ResolvedLayoutOperatorOverrideViewModel {
  specs: PreviewControlSpec[];
  display: Record<string, unknown>;
  visibleSpecs: PreviewControlSpec[];
  effective: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneRecord(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }
  return { ...value };
}

function normalizeOperatorKey(value: string | null | undefined): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
}

function manifestPersistNamespace(
  manifest: Pick<PreviewEngineManifest, 'controlSpecs'> | null | undefined,
  preferredNamespace?: string | null,
): string | null {
  const preferred = normalizeOperatorKey(preferredNamespace);
  if (preferred) {
    return preferred;
  }
  for (const spec of manifest?.controlSpecs ?? []) {
    const namespace = normalizeOperatorKey(spec.persistNamespace);
    if (namespace) {
      return namespace;
    }
  }
  return null;
}

function activeAliasOverrides(
  model: LayoutOperatorOverrideModelLike | null | undefined,
): Record<string, unknown> | null {
  return cloneRecord(model?.layoutOverrides);
}

export function resolveLayoutOperatorManifestForOperatorKey(
  operatorKey: string | null | undefined,
): PreviewEngineManifest | null {
  const normalized = normalizeOperatorKey(operatorKey);
  if (!normalized) {
    return null;
  }
  return getPreviewEngineByLayoutKey(normalized) ?? getPreviewEngine(normalized) ?? null;
}

export function cloneLayoutOperatorOverrideState(
  state: LayoutOperatorOverrideState | null | undefined,
): LayoutOperatorOverrideState {
  const byOperator: Record<string, Record<string, unknown>> = {};
  if (state?.byOperator && isRecord(state.byOperator)) {
    for (const [operatorKey, bucket] of Object.entries(state.byOperator)) {
      const normalizedKey = normalizeOperatorKey(operatorKey);
      const clonedBucket = cloneRecord(bucket);
      if (!normalizedKey || !clonedBucket) {
        continue;
      }
      byOperator[normalizedKey] = clonedBucket;
    }
  }
  return {
    activeOperatorKey: normalizeOperatorKey(state?.activeOperatorKey) ?? null,
    byOperator,
  };
}

export function layoutOperatorKeyForManifest(
  manifest: Pick<PreviewEngineManifest, 'id' | 'layoutEngineKey'>,
): string {
  return normalizeOperatorKey(manifest.layoutEngineKey) ?? manifest.id;
}

export function readLayoutOperatorOverrideState(
  model: LayoutOperatorOverrideModelLike | null | undefined,
): LayoutOperatorOverrideState {
  return cloneLayoutOperatorOverrideState(model?.layoutOperatorOverrides ?? null);
}

export function resolveActiveLayoutOperatorManifest(
  model: LayoutOperatorOverrideModelLike | null | undefined,
): PreviewEngineManifest | null {
  const state = readLayoutOperatorOverrideState(model);
  const activeManifest = resolveLayoutOperatorManifestForOperatorKey(state.activeOperatorKey);
  if (activeManifest) {
    return activeManifest;
  }

  const rawLayoutOverrides = activeAliasOverrides(model);
  const namespace = normalizeOperatorKey(model?.layoutOverrideNamespace);
  if (!rawLayoutOverrides || !namespace) {
    return null;
  }

  const candidateLayoutEngine = resolveFrameYamlEngineLayoutCandidateId(
    namespace,
    rawLayoutOverrides,
    state.activeOperatorKey,
  );
  return resolveLayoutOperatorManifestForOperatorKey(candidateLayoutEngine);
}

export function readActiveLayoutOperatorOverrideBucket(
  model: LayoutOperatorOverrideModelLike | null | undefined,
): Record<string, unknown> {
  const state = readLayoutOperatorOverrideState(model);
  const activeKey = state.activeOperatorKey;
  if (activeKey) {
    const bucket = cloneRecord(state.byOperator[activeKey]);
    if (bucket) {
      return bucket;
    }
  }
  return activeAliasOverrides(model) ?? {};
}

export function readLayoutOperatorOverrideBucketForManifest(
  model: LayoutOperatorOverrideModelLike | null | undefined,
  manifest: Pick<PreviewEngineManifest, 'id' | 'layoutEngineKey'>,
): Record<string, unknown> {
  const operatorKey = layoutOperatorKeyForManifest(manifest);
  const state = readLayoutOperatorOverrideState(model);
  const bucket = cloneRecord(state.byOperator[operatorKey]);
  if (bucket) {
    return bucket;
  }
  if (state.activeOperatorKey === operatorKey || Object.keys(state.byOperator).length === 0) {
    return activeAliasOverrides(model) ?? {};
  }
  return {};
}

export function writeLayoutOperatorOverrideState(
  model: LayoutOperatorOverrideModelLike | null | undefined,
  state: LayoutOperatorOverrideState,
  preferredNamespace?: string | null,
): void {
  if (!model) {
    return;
  }
  const nextState = cloneLayoutOperatorOverrideState(state);
  model.layoutOperatorOverrides = nextState;
  const activeKey = nextState.activeOperatorKey;
  const activeBucket = activeKey
    ? cloneRecord(nextState.byOperator[activeKey]) ?? {}
    : {};
  model.layoutOverrides = { ...activeBucket };
  if (preferredNamespace !== undefined) {
    model.layoutOverrideNamespace = preferredNamespace;
  }
}

export function writeActiveLayoutOperatorOverrides(
  model: LayoutOperatorOverrideModelLike | null | undefined,
  overrides: Record<string, unknown>,
  preferredNamespace?: string | null,
): void {
  if (!model) {
    return;
  }
  const activeManifest = resolveActiveLayoutOperatorManifest(model);
  if (activeManifest) {
    writeLayoutOperatorOverrideBucketForManifest(
      model,
      activeManifest,
      overrides,
      preferredNamespace,
    );
    return;
  }

  model.layoutOverrides = { ...(overrides || {}) };
  if (preferredNamespace !== undefined) {
    model.layoutOverrideNamespace = preferredNamespace;
  }
}

export function activateLayoutOperatorOverrideBucket(
  model: LayoutOperatorOverrideModelLike | null | undefined,
  manifest: Pick<PreviewEngineManifest, 'id' | 'layoutEngineKey' | 'controlSpecs'>,
  options: {
    fallbackOverrides?: Record<string, unknown> | null;
    persistNamespace?: string | null;
  } = {},
): Record<string, unknown> {
  if (!model) {
    return {};
  }
  const operatorKey = layoutOperatorKeyForManifest(manifest);
  const namespace = manifestPersistNamespace(manifest, options.persistNamespace);
  const state = readLayoutOperatorOverrideState(model);
  let bucket = cloneRecord(state.byOperator[operatorKey]);
  if (!bucket) {
    const activeAlias = (
      state.activeOperatorKey === operatorKey
      || (
        Object.keys(state.byOperator).length === 0
        && normalizeOperatorKey(model.layoutOverrideNamespace) === namespace
      )
    )
      ? activeAliasOverrides(model)
      : null;
    bucket = activeAlias ?? cloneRecord(options.fallbackOverrides) ?? {};
    state.byOperator[operatorKey] = { ...bucket };
  }
  state.activeOperatorKey = operatorKey;
  writeLayoutOperatorOverrideState(model, state, namespace ?? model.layoutOverrideNamespace ?? null);
  return cloneRecord(state.byOperator[operatorKey]) ?? {};
}

export function deactivateLayoutOperatorOverrideBucket(
  model: LayoutOperatorOverrideModelLike | null | undefined,
  preferredNamespace?: string | null,
): void {
  if (!model) {
    return;
  }
  const state = readLayoutOperatorOverrideState(model);
  state.activeOperatorKey = null;
  writeLayoutOperatorOverrideState(model, state, preferredNamespace ?? null);
}

export function writeLayoutOperatorOverrideBucketForManifest(
  model: LayoutOperatorOverrideModelLike | null | undefined,
  manifest: Pick<PreviewEngineManifest, 'id' | 'layoutEngineKey' | 'controlSpecs'>,
  overrides: Record<string, unknown>,
  preferredNamespace?: string | null,
): void {
  if (!model) {
    return;
  }
  const operatorKey = layoutOperatorKeyForManifest(manifest);
  const state = readLayoutOperatorOverrideState(model);
  state.activeOperatorKey = operatorKey;
  state.byOperator[operatorKey] = { ...(overrides || {}) };
  const namespace = manifestPersistNamespace(manifest, preferredNamespace);
  writeLayoutOperatorOverrideState(model, state, namespace ?? model.layoutOverrideNamespace ?? null);
}

function sessionBucketForManifest(
  options: ResolveLayoutOperatorOverrideViewModelOptions,
): Record<string, unknown> {
  if (options.sessionOverrides) {
    return { ...options.sessionOverrides };
  }
  const operatorKey = layoutOperatorKeyForManifest(options.manifest);
  const bucket = cloneRecord(options.sessionState?.byOperator?.[operatorKey]);
  return bucket ?? {};
}

function yamlOverridesForManifest(
  options: ResolveLayoutOperatorOverrideViewModelOptions,
): Record<string, unknown> {
  const namespaces = new Set<string>();
  const preferredNamespace = manifestPersistNamespace(options.manifest, options.persistNamespace);
  if (preferredNamespace) {
    namespaces.add(preferredNamespace);
  }
  for (const spec of options.manifest.controlSpecs ?? []) {
    const namespace = manifestPersistNamespace(options.manifest, spec.persistNamespace);
    if (namespace) {
      namespaces.add(namespace);
    }
  }
  const merged: Record<string, unknown> = {};
  for (const namespace of namespaces) {
    Object.assign(merged, options.engineLayout?.[namespace] ?? {});
    if (namespace === 'meta.elk') {
      Object.assign(merged, options.elkLayout ?? {});
    }
  }
  return merged;
}

export function resolveLayoutOperatorOverrideViewModel(
  options: ResolveLayoutOperatorOverrideViewModelOptions,
): ResolvedLayoutOperatorOverrideViewModel {
  const specs = [...(options.manifest.controlSpecs ?? [])];
  const merged = {
    ...yamlOverridesForManifest(options),
    ...sessionBucketForManifest(options),
  };
  if (specs.length === 0) {
    return {
      specs,
      display: { ...merged },
      visibleSpecs: [],
      effective: { ...merged },
    };
  }
  const display = previewControlDisplayValues(merged, specs);
  const visibleSpecs = visiblePreviewControlSpecs(specs, display);
  const allowedKeys = new Set(visibleSpecs.map((spec) => spec.key));
  const effective = Object.fromEntries(
    Object.entries(merged).filter(([key]) => allowedKeys.has(key)),
  );
  return {
    specs,
    display,
    visibleSpecs,
    effective,
  };
}

export function resolveEffectiveLayoutOperatorOverrides(
  options: ResolveLayoutOperatorOverrideViewModelOptions,
): Record<string, unknown> {
  return resolveLayoutOperatorOverrideViewModel(options).effective;
}

export function pruneSessionBucketForManifest(
  manifest: Pick<PreviewEngineManifest, 'id' | 'layoutEngineKey' | 'controlSpecs'>,
  bucket: Record<string, unknown> | null | undefined,
  options: Omit<ResolveLayoutOperatorOverrideViewModelOptions, 'manifest' | 'sessionOverrides'> = {},
): Record<string, unknown> {
  const nextBucket = { ...(bucket || {}) };
  if ((manifest.controlSpecs ?? []).length === 0) {
    return {};
  }
  const view = resolveLayoutOperatorOverrideViewModel({
    manifest,
    ...options,
    sessionOverrides: nextBucket,
  });
  if (view.visibleSpecs.length === 0) {
    return {};
  }
  const allowedKeys = new Set(view.visibleSpecs.map((spec) => spec.key));
  return Object.fromEntries(
    Object.entries(nextBucket).filter(([key]) => allowedKeys.has(key)),
  );
}

export function collectNamespacedLayoutOperatorOverrides(
  options: ResolveLayoutOperatorOverrideViewModelOptions,
): Record<string, Record<string, unknown>> {
  const view = resolveLayoutOperatorOverrideViewModel(options);
  const byNamespace: Record<string, Record<string, unknown>> = {};
  for (const spec of view.visibleSpecs) {
    if (!(spec.key in view.effective)) {
      continue;
    }
    const namespace = manifestPersistNamespace(options.manifest, spec.persistNamespace)
      ?? 'meta.elk';
    byNamespace[namespace] = byNamespace[namespace] ?? {};
    byNamespace[namespace]![spec.key] = view.effective[spec.key];
  }
  return byNamespace;
}
