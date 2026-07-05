import type { PreviewShellMode } from './types.js';

export const FRAME_PREVIEW_SHELL_MODE = 'frame' as const;
export const LEGACY_GRID_PREVIEW_SHELL_MODE = 'grid' as const;
export const FORCE_PREVIEW_SHELL_MODE = 'force' as const;

export function normalizePreviewShellMode(
  value: string | null | undefined,
): PreviewShellMode | null {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    return null;
  }
  if (normalized === LEGACY_GRID_PREVIEW_SHELL_MODE) {
    return FRAME_PREVIEW_SHELL_MODE;
  }
  return normalized as PreviewShellMode;
}

export function isFramePreviewShellMode(
  value: string | null | undefined,
): boolean {
  return normalizePreviewShellMode(value) === FRAME_PREVIEW_SHELL_MODE;
}

