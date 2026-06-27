import { isPreviewArrowComponentId } from '../preview-arrow-component-ids.js';
import {
  PERSIST_ARROW_KEYS,
  UNSUPPORTED_PERSIST_FRAME_KEYS,
} from './frame-override-manifest.js';
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

export function normalizePreviewSavePayload(
  payload: Record<string, unknown>,
  model: PreviewSavePayloadModelLike | null | undefined,
): NormalizePreviewSavePayloadResult {
  const normalizedPayload: Record<string, unknown> = { ...payload };
  const errors: string[] = [];
  const warnings: string[] = [];
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
