/**
 * Preview relayout coordinator helpers (spec 043 shell coordinator slice K).
 *
 * These helpers own the local-vs-ELK relayout branching and runtime-only
 * coercion cleanup so editor.js stays focused on browser callback wiring.
 */

export interface PreviewRelayoutStatus {
  localReady: boolean;
  local?: {
    reason?: string | null;
  } | null;
}

export interface PreviewRelayoutResult {
  coerced?: Map<string, Record<string, unknown>> | null;
}

export interface PreviewRelayoutOverrideEntry {
  [key: string]: unknown;
}

export interface RunPreviewRelayoutOptions<TGridOverrides, TResult extends PreviewRelayoutResult> {
  triggerCid: string;
  overrides: Record<string, PreviewRelayoutOverrideEntry>;
  coercedKeys: Set<string>;
  gridOverrides: TGridOverrides;
  normalizeGridOverrides: (value: TGridOverrides) => TGridOverrides;
  relayoutStatus: PreviewRelayoutStatus;
  isElkLayeredDiagram: boolean;
  performElkRelayout?: ((normalizedGridOverrides: TGridOverrides) => Promise<TResult | null>) | null;
  performLocalRelayout: (normalizedGridOverrides: TGridOverrides) => TResult | null;
  failRelayout: (reason: string, triggerCid: string) => unknown;
  finishRelayout: (triggerCid: string, result: TResult, executionLabel: 'elk' | 'local') => unknown;
  logError?: (message: string) => void;
}

const COERCED_KEY_MAP: Record<string, string> = {
  sizingW: 'sizing_w',
  sizingH: 'sizing_h',
};

function deleteOverrideKey(
  overrides: Record<string, PreviewRelayoutOverrideEntry>,
  frameId: string,
  key: string,
): void {
  const entry = overrides[frameId];
  if (!entry) {
    return;
  }

  if (key === 'sizing_w') {
    delete entry.sizing_w;
    delete entry.width;
  } else if (key === 'sizing_h') {
    delete entry.sizing_h;
    delete entry.height;
  } else {
    delete entry[key];
  }

  if (Object.keys(entry).length === 0) {
    delete overrides[frameId];
  }
}

export function clearPreviewCoercedOverrides(
  overrides: Record<string, PreviewRelayoutOverrideEntry>,
  coercedKeys: Set<string>,
): void {
  for (const coercedKey of Array.from(coercedKeys)) {
    const separatorIndex = coercedKey.indexOf(':');
    if (separatorIndex <= 0) {
      continue;
    }
    const frameId = coercedKey.substring(0, separatorIndex);
    const key = coercedKey.substring(separatorIndex + 1);
    deleteOverrideKey(overrides, frameId, key);
  }
  coercedKeys.clear();
}

export function collectPreviewCoercedKeys(
  result: PreviewRelayoutResult | null | undefined,
): string[] {
  const collectedKeys: string[] = [];
  if (!result?.coerced) {
    return collectedKeys;
  }

  for (const [frameId, coerced] of result.coerced.entries()) {
    for (const [rawKey] of Object.entries(coerced)) {
      const key = COERCED_KEY_MAP[rawKey] || rawKey;
      if (key === 'sizing_w' || key === 'sizing_h') {
        collectedKeys.push(`${frameId}:${key}`);
      }
    }
  }

  return collectedKeys;
}

export async function runPreviewRelayout<TGridOverrides, TResult extends PreviewRelayoutResult>(
  options: RunPreviewRelayoutOptions<TGridOverrides, TResult>,
): Promise<unknown> {
  if (!options.relayoutStatus.localReady) {
    const reason = options.relayoutStatus.local?.reason || 'unknown';
    options.logError?.(`v3 relayout: local bridge not ready (${reason})`);
    return options.failRelayout(reason, options.triggerCid);
  }

  clearPreviewCoercedOverrides(options.overrides, options.coercedKeys);
  const normalizedGridOverrides = options.normalizeGridOverrides(options.gridOverrides);

  if (options.isElkLayeredDiagram && options.performElkRelayout) {
    const elkResult = await options.performElkRelayout(normalizedGridOverrides);
    if (!elkResult) {
      options.logError?.('v3 relayout: ELK layout failed');
      return options.failRelayout('elk-failure', options.triggerCid);
    }
    return options.finishRelayout(options.triggerCid, elkResult, 'elk');
  }

  const localResult = options.performLocalRelayout(normalizedGridOverrides);
  if (!localResult) {
    options.logError?.('v3 relayout: local layout failed');
    return options.failRelayout('local-failure', options.triggerCid);
  }

  for (const coercedKey of collectPreviewCoercedKeys(localResult)) {
    options.coercedKeys.add(coercedKey);
  }

  return options.finishRelayout(options.triggerCid, localResult, 'local');
}
