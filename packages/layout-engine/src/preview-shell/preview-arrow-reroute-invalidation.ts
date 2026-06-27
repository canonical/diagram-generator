import type { Arrow } from '../frame-model.js';
import { hasPreviewRerouteInvalidationFrameOverride } from './frame-override-manifest.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function shouldInvalidatePreviewArrowWaypointGeometry(
  overrides: Record<string, unknown> | null | undefined,
): boolean {
  return Object.values(overrides || {}).some((entry) => (
    isRecord(entry) && hasPreviewRerouteInvalidationFrameOverride(entry)
  ));
}

export function invalidatePreviewArrowWaypointGeometry(
  arrows: Arrow[] | null | undefined,
): void {
  for (const arrow of arrows || []) {
    if (arrow.layoutPath?.length) {
      arrow.layoutPath = undefined;
    }
    if (arrow.waypoints?.length) {
      arrow.waypoints = undefined;
    }
  }
}
