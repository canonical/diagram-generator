import { isPreviewArrowComponentId } from '../preview-arrow-component-ids.js';
import {
  PERSIST_ARROW_KEYS,
  UNSUPPORTED_PERSIST_FRAME_KEYS,
} from './frame-override-manifest.js';

export interface PreviewSavePayloadModelNode {
  type?: string | null;
  data?: Record<string, unknown> | null;
}

export interface PreviewSavePayloadModelLike {
  get?: ((id: string) => PreviewSavePayloadModelNode | null | undefined) | null;
}

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

function numericValue(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function roundPersistedValue(value: number): number {
  return Math.round(value);
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
  node: PreviewSavePayloadModelNode | null | undefined,
  errors: string[],
): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...override };
  const nodeData = isRecord(node?.data) ? node!.data! : {};

  const dx = numericValue(override.dx) ?? 0;
  const dy = numericValue(override.dy) ?? 0;
  const dw = numericValue(override.dw) ?? 0;
  const dh = numericValue(override.dh) ?? 0;

  if (dx !== 0 || dy !== 0) {
    const baseX = numericValue(override.x) ?? numericValue(nodeData.authored_x) ?? numericValue(nodeData.x);
    const baseY = numericValue(override.y) ?? numericValue(nodeData.authored_y) ?? numericValue(nodeData.y);
    if (baseX == null || baseY == null) {
      errors.push(`${componentId} still has transient move deltas and no canonical x/y base`);
    } else {
      normalized.position = 'ABSOLUTE';
      normalized.x = roundPersistedValue(baseX + dx);
      normalized.y = roundPersistedValue(baseY + dy);
    }
  }

  if (dw !== 0 || dh !== 0) {
    const baseWidth = numericValue(override.width) ?? numericValue(nodeData.width);
    const baseHeight = numericValue(override.height) ?? numericValue(nodeData.height);
    if (dw !== 0) {
      if (baseWidth == null) {
        errors.push(`${componentId} still has transient width deltas and no canonical width base`);
      } else {
        normalized.width = roundPersistedValue(baseWidth + dw);
        normalized.sizing_w = 'FIXED';
      }
    }
    if (dh !== 0) {
      if (baseHeight == null) {
        errors.push(`${componentId} still has transient height deltas and no canonical height base`);
      } else {
        normalized.height = roundPersistedValue(baseHeight + dh);
        normalized.sizing_h = 'FIXED';
      }
    }
  }

  delete normalized.dx;
  delete normalized.dy;
  delete normalized.dw;
  delete normalized.dh;

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
      : normalizeFrameOverride(componentId, rawOverride, node, errors);

    if (Object.keys(normalizedOverride).length > 0) {
      normalizedOverrides[componentId] = normalizedOverride;
    }
  }

  normalizedPayload.overrides = normalizedOverrides;
  return { payload: normalizedPayload, errors, warnings };
}
