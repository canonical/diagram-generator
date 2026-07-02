import { isPreviewArrowComponentId } from '../preview-arrow-component-ids.js';
import {
  PERSIST_ARROW_KEYS,
  UNSUPPORTED_PERSIST_FRAME_KEYS,
} from './frame-override-manifest.js';
import {
  DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE,
  collectUnsupportedFrameYamlEngineLayoutOverrideKeys,
  isFrameYamlEngineLayoutNamespace,
  isSupportedFrameYamlEngineLayoutNamespace,
  listFrameYamlEngineLayoutCandidateIds,
  resolveFrameYamlEngineLayoutCandidateId,
  resolveFrameYamlEngineLayoutNamespaceForOverrides,
} from './frame-yaml-engine-layout-contract.js';
import {
  baseLayoutOperatorNamespaceFromPersistNodeNamespace,
  readLayoutOperatorOverrideState,
} from './layout-operator-overrides.js';
import { getPreviewEngine, getPreviewEngineByLayoutKey } from '../preview-engine/registry.js';
import type {
  PreviewOverrideModelLike as PreviewSavePayloadModelLike,
  PreviewOverrideModelNode as PreviewSavePayloadModelNode,
} from './preview-override-model.js';

export type {
  PreviewOverrideModelLike as PreviewSavePayloadModelLike,
  PreviewOverrideModelNode as PreviewSavePayloadModelNode,
} from './preview-override-model.js';

export interface NormalizePreviewSavePayloadResult {
  payload: Record<string, unknown>;
  errors: string[];
  warnings: string[];
}

const TRANSIENT_FRAME_KEYS = new Set<string>(UNSUPPORTED_PERSIST_FRAME_KEYS);
const PERSISTABLE_ARROW_KEYS = new Set<string>(PERSIST_ARROW_KEYS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) && Object.keys(value).length > 0 ? value : null;
}

function normalizeNamespaceValue(value: unknown): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
}

function pushUniqueIssue(issues: string[], message: string): void {
  if (!issues.includes(message)) {
    issues.push(message);
  }
}

function engineLayoutOverrideSignature(
  namespace: string,
  overrides: Record<string, unknown>,
): string {
  const entries = Object.entries(overrides)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${JSON.stringify(value)}`);
  return `${namespace}|${entries.join(',')}`;
}

function syntheticComponentId(componentId: string): boolean {
  // Heading synthesis reserves these ids across the preview/runtime pipeline.
  return componentId === '__body'
    || componentId.endsWith('__body')
    || componentId === '__heading'
    || componentId.endsWith('__heading');
}

function arrowComponent(componentId: string, node: PreviewSavePayloadModelNode | null | undefined): boolean {
  return node?.type === 'arrow' || isPreviewArrowComponentId(componentId);
}

function normalizeArrowOverride(
  componentId: string,
  override: Record<string, unknown>,
  warnings: string[],
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(override)) {
    if (!PERSISTABLE_ARROW_KEYS.has(key)) {
      warnings.push(`${componentId} dropped unsupported arrow save key '${key}'`);
      continue;
    }
    normalized[key] = value;
  }

  return normalized;
}

function normalizeFrameOverride(
  componentId: string,
  override: Record<string, unknown>,
  errors: string[],
): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...override };
  const remainingTransientKeys = Object.keys(normalized)
    .filter((key) => TRANSIENT_FRAME_KEYS.has(key))
    .sort();
  if (remainingTransientKeys.length > 0) {
    errors.push(
      `${componentId} still has non-persistable transient keys: ${remainingTransientKeys.join(', ')}`,
    );
  }

  return normalized;
}

function validateFrameYamlEngineLayoutOverrideEntry(
  namespace: string,
  overrides: Record<string, unknown>,
  source: string,
  errors: string[],
  preferredLayoutEngine?: string | null,
): void {
  if (!isFrameYamlEngineLayoutNamespace(namespace)) {
    pushUniqueIssue(
      errors,
      `${source} uses non-frame-YAML persist namespace '${namespace}' (expected meta.<engine>)`,
    );
    return;
  }
  if (!isSupportedFrameYamlEngineLayoutNamespace(namespace)) {
    pushUniqueIssue(
      errors,
      `${source} uses unsupported frame-YAML engine layout namespace '${namespace}'`,
    );
    return;
  }
  const unsupportedKeys = collectUnsupportedFrameYamlEngineLayoutOverrideKeys(namespace, overrides);
  if (unsupportedKeys.length > 0) {
    pushUniqueIssue(
      errors,
      `${source} contains unsupported frame-YAML engine layout keys: ${unsupportedKeys.join(', ')}`,
    );
    return;
  }
  const candidateEngines = listFrameYamlEngineLayoutCandidateIds(namespace, overrides);
  if (Object.keys(overrides).length > 0 && candidateEngines.length === 0) {
    pushUniqueIssue(
      errors,
      `${source} mixes frame-YAML engine layout keys that do not belong to any single supported engine in '${namespace}'`,
    );
    return;
  }
  if (
    Object.keys(overrides).length > 0
    && candidateEngines.length > 1
    && !resolveFrameYamlEngineLayoutCandidateId(namespace, overrides, preferredLayoutEngine)
  ) {
    pushUniqueIssue(
      errors,
      `${source} is ambiguous across supported engines in '${namespace}'; set the active layout engine before saving`,
    );
  }
}

function validateFrameYamlEngineLayoutOverrides(
  payload: Record<string, unknown>,
  model: PreviewSavePayloadModelLike | null | undefined,
  errors: string[],
): void {
  const validatedEntries = new Set<string>();
  const validateUniqueEntry = (
    namespace: string,
    overrides: Record<string, unknown>,
    source: string,
    preferredLayoutEngine?: string | null,
  ): void => {
    const signature = engineLayoutOverrideSignature(namespace, overrides);
    if (validatedEntries.has(signature)) {
      return;
    }
    validatedEntries.add(signature);
    validateFrameYamlEngineLayoutOverrideEntry(namespace, overrides, source, errors, preferredLayoutEngine);
  };
  const modelLayoutOverrides = nonEmptyRecord(model?.layoutOverrides);
  const rawLayoutOverrides = modelLayoutOverrides;
  if (rawLayoutOverrides) {
    const preferredLayoutEngine = normalizeNamespaceValue(
      readLayoutOperatorOverrideState(model).activeOperatorKey,
    );
    const preferredNamespace = normalizeNamespaceValue(
      (model as (PreviewSavePayloadModelLike & { layoutOverrideNamespace?: unknown }) | null | undefined)
        ?.layoutOverrideNamespace,
    );
    const namespace = preferredNamespace
      ?? resolveFrameYamlEngineLayoutNamespaceForOverrides(rawLayoutOverrides, null);
    validateUniqueEntry(namespace, rawLayoutOverrides, 'model.layoutOverrides', preferredLayoutEngine);
  }

  const namespacedOverrides = payload.engine_layout_overrides;
  if (namespacedOverrides != null) {
    if (!isRecord(namespacedOverrides)) {
      pushUniqueIssue(errors, 'engine_layout_overrides must be an object');
    } else {
      for (const [namespace, value] of Object.entries(namespacedOverrides)) {
        if (!isRecord(value)) {
          pushUniqueIssue(errors, `engine_layout_overrides.${namespace} must be an object`);
          continue;
        }
        const baseNamespace = baseLayoutOperatorNamespaceFromPersistNodeNamespace(namespace);
        if (baseNamespace) {
          for (const [nodeId, nodeBucket] of Object.entries(value)) {
            if (!isRecord(nodeBucket)) {
              pushUniqueIssue(
                errors,
                `engine_layout_overrides.${namespace}.${nodeId} must be an object`,
              );
              continue;
            }
            const manifest = getPreviewEngineByLayoutKey(nodeId) ?? getPreviewEngine(nodeId) ?? null;
            if (!manifest) {
              pushUniqueIssue(
                errors,
                `engine_layout_overrides.${namespace}.${nodeId} references an unknown interpreter node`,
              );
              continue;
            }
            const manifestNamespaces = new Set(
              (manifest.controlSpecs ?? [])
                .map((spec: { persistNamespace?: string | null }) => normalizeNamespaceValue(spec.persistNamespace))
                .filter((entry: string | null): entry is string => Boolean(entry)),
            );
            if (!manifestNamespaces.has(baseNamespace)) {
              pushUniqueIssue(
                errors,
                `engine_layout_overrides.${namespace}.${nodeId} targets '${baseNamespace}' but node '${nodeId}' persists elsewhere`,
              );
              continue;
            }
            validateUniqueEntry(
              baseNamespace,
              nodeBucket,
              `engine_layout_overrides.${namespace}.${nodeId}`,
              nodeId,
            );
          }
          continue;
        }
        validateUniqueEntry(
          namespace,
          value,
          `engine_layout_overrides.${namespace}`,
          null,
        );
      }
    }
  }
}

export function normalizePreviewSavePayload(
  payload: Record<string, unknown>,
  model: PreviewSavePayloadModelLike | null | undefined,
): NormalizePreviewSavePayloadResult {
  const normalizedPayload: Record<string, unknown> = { ...payload };
  const errors: string[] = [];
  const warnings: string[] = [];
  validateFrameYamlEngineLayoutOverrides(payload, model, errors);
  const overrides = isRecord(payload.overrides) ? payload.overrides : null;

  if (!overrides) {
    return { payload: normalizedPayload, errors, warnings };
  }

  const normalizedOverrides: Record<string, unknown> = {};

  for (const [componentId, rawOverride] of Object.entries(overrides)) {
    if (syntheticComponentId(componentId)) {
      continue;
    }

    if (!isRecord(rawOverride)) {
      normalizedOverrides[componentId] = rawOverride;
      continue;
    }

    const node = model?.get?.(componentId) ?? null;
    const normalizedOverride = arrowComponent(componentId, node)
      ? normalizeArrowOverride(componentId, rawOverride, warnings)
      : normalizeFrameOverride(componentId, rawOverride, errors);

    if (Object.keys(normalizedOverride).length > 0) {
      normalizedOverrides[componentId] = normalizedOverride;
    }
  }

  normalizedPayload.overrides = normalizedOverrides;
  return { payload: normalizedPayload, errors, warnings };
}
