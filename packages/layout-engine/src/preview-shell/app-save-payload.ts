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
  resolveFrameYamlEngineLayoutNamespaceForOverrides,
} from './frame-yaml-engine-layout-contract.js';
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
  }
}

function validateFrameYamlEngineLayoutOverrides(
  payload: Record<string, unknown>,
  model: PreviewSavePayloadModelLike | null | undefined,
  errors: string[],
): void {
  const modelLayoutOverrides = nonEmptyRecord(model?.layoutOverrides);
  const legacyLayoutOverrides = nonEmptyRecord(model?.elkLayoutOverrides);
  const rawLayoutOverrides = modelLayoutOverrides ?? legacyLayoutOverrides;
  if (rawLayoutOverrides) {
    const preferredNamespace = normalizeNamespaceValue(
      (model as (PreviewSavePayloadModelLike & { layoutOverrideNamespace?: unknown }) | null | undefined)
        ?.layoutOverrideNamespace,
    );
    const namespace = preferredNamespace
      ?? (
        legacyLayoutOverrides && !modelLayoutOverrides
          ? DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE
          : resolveFrameYamlEngineLayoutNamespaceForOverrides(rawLayoutOverrides, null)
      );
    validateFrameYamlEngineLayoutOverrideEntry(namespace, rawLayoutOverrides, 'model.layoutOverrides', errors);
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
        validateFrameYamlEngineLayoutOverrideEntry(
          namespace,
          value,
          `engine_layout_overrides.${namespace}`,
          errors,
        );
      }
    }
  }

  const legacyElkOverrides = payload.elk_layout_overrides;
  if (legacyElkOverrides != null) {
    if (!isRecord(legacyElkOverrides)) {
      pushUniqueIssue(errors, 'elk_layout_overrides must be an object');
    } else {
      validateFrameYamlEngineLayoutOverrideEntry(
        DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE,
        legacyElkOverrides,
        'elk_layout_overrides',
        errors,
      );
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
