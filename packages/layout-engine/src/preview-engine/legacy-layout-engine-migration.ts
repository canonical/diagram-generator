const LEGACY_LAYOUT_ENGINE_KEY_ALIASES = Object.freeze({
  dagre: 'elk-layered',
} as const);

const DAGRE_DIRECTION_TO_ELK_DIRECTION = Object.freeze({
  TB: 'DOWN',
  LR: 'RIGHT',
  BT: 'UP',
  RL: 'LEFT',
} as const satisfies Record<string, string>);

const DAGRE_TO_ELK_KEY_MAP = Object.freeze({
  'dagre.rankdir': 'elk.direction',
  'dagre.nodesep': 'elk.spacing.nodeNode',
  'dagre.ranksep': 'elk.layered.spacing.nodeNodeBetweenLayers',
  'dagre.edgesep': 'elk.spacing.edgeEdge',
} as const satisfies Record<string, string>);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeNonEmptyString(value: string | null | undefined): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
}

function translateDagreOverrideValue(key: string, value: unknown): unknown {
  if (key === 'dagre.rankdir') {
    const normalized = normalizeNonEmptyString(typeof value === 'string' ? value : String(value));
    if (!normalized) {
      return '';
    }
    return DAGRE_DIRECTION_TO_ELK_DIRECTION[normalized as keyof typeof DAGRE_DIRECTION_TO_ELK_DIRECTION]
      ?? normalized;
  }
  return value;
}

function mergeOverrideRecords(
  first: Record<string, unknown> | null | undefined,
  second: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  const merged = {
    ...(first ?? {}),
    ...(second ?? {}),
  };
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mergeMigratedRecord<TValue>(
  existing: Record<string, TValue> | null | undefined,
  incoming: Record<string, TValue> | null | undefined,
  options: {
    preferExisting?: boolean;
  } = {},
): Record<string, TValue> | undefined {
  const merged = options.preferExisting
    ? {
      ...(incoming ?? {}),
      ...(existing ?? {}),
    }
    : {
      ...(existing ?? {}),
      ...(incoming ?? {}),
    };
  return Object.keys(merged).length > 0 ? merged : undefined;
}

export function canonicalPreviewLayoutEngineKey(
  value: string | null | undefined,
): string | null {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized) {
    return null;
  }
  return LEGACY_LAYOUT_ENGINE_KEY_ALIASES[normalized as keyof typeof LEGACY_LAYOUT_ENGINE_KEY_ALIASES]
    ?? normalized;
}

export function canonicalPreviewPersistNamespace(
  value: string | null | undefined,
): string | null {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized) {
    return null;
  }
  if (normalized === 'meta.dagre') {
    return 'meta.elk';
  }
  if (normalized === 'meta.dagre_nodes') {
    return 'meta.elk_nodes';
  }
  return normalized;
}

export function migrateLegacyPreviewEngineOverridesForNamespace(
  namespace: string | null | undefined,
  overrides: Record<string, unknown> | null | undefined,
): { namespace: string; overrides: Record<string, unknown> } | null {
  const normalizedNamespace = canonicalPreviewPersistNamespace(namespace);
  if (!normalizedNamespace) {
    return null;
  }
  if (!isRecord(overrides)) {
    return { namespace: normalizedNamespace, overrides: {} };
  }
  if (normalizedNamespace !== 'meta.elk' || normalizeNonEmptyString(namespace) !== 'meta.dagre') {
    return { namespace: normalizedNamespace, overrides: { ...overrides } };
  }

  const translated: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(overrides)) {
    const mappedKey = DAGRE_TO_ELK_KEY_MAP[key as keyof typeof DAGRE_TO_ELK_KEY_MAP];
    if (!mappedKey) {
      // Only the small subset of dagre keys with a clear ELK equivalent migrate.
      // Unsupported dagre-only knobs are intentionally dropped instead of being
      // persisted into the canonical ELK namespace.
      continue;
    }
    translated[mappedKey] = translateDagreOverrideValue(key, value);
  }
  return {
    namespace: normalizedNamespace,
    overrides: translated,
  };
}

export function migrateLegacyPreviewEngineNodeBucketsForNamespace(
  namespace: string | null | undefined,
  buckets: Record<string, unknown> | null | undefined,
): { namespace: string; buckets: Record<string, Record<string, unknown>> } | null {
  const sourceNamespace = normalizeNonEmptyString(namespace);
  const normalizedNamespace = canonicalPreviewPersistNamespace(namespace);
  if (!normalizedNamespace) {
    return null;
  }
  if (!isRecord(buckets)) {
    return { namespace: normalizedNamespace, buckets: {} };
  }

  const nextBuckets: Record<string, Record<string, unknown>> = {};
  for (const [rawNodeId, rawBucket] of Object.entries(buckets)) {
    if (!isRecord(rawBucket)) {
      continue;
    }
    const normalizedNodeId = normalizeNonEmptyString(rawNodeId);
    if (!normalizedNodeId) {
      continue;
    }
    const migrated = migrateLegacyPreviewEngineOverridesForNamespace(
      sourceNamespace === 'meta.dagre_nodes'
        ? 'meta.dagre'
        : normalizedNamespace.slice(0, -'_nodes'.length),
      rawBucket,
    );
    const translatedBucket = migrated?.overrides ?? {};
    if (Object.keys(translatedBucket).length === 0) {
      continue;
    }
    nextBuckets[normalizedNodeId] = mergeMigratedRecord(
      nextBuckets[normalizedNodeId],
      translatedBucket,
    ) ?? {};
  }

  return {
    namespace: normalizedNamespace,
    buckets: nextBuckets,
  };
}

export interface LegacyFrameDiagramEngineState {
  layoutEngine?: string;
  elkLayout?: Record<string, string>;
  engineLayout?: Record<string, Record<string, unknown>>;
}

export function migrateLegacyFrameDiagramEngineState<T extends LegacyFrameDiagramEngineState>(
  input: T,
): T {
  const nextLayoutEngine = canonicalPreviewLayoutEngineKey(input.layoutEngine) ?? undefined;
  const hadEngineLayout = Object.prototype.hasOwnProperty.call(input, 'engineLayout');
  const nextEngineLayout: Record<string, Record<string, unknown>> = {};

  for (const [namespace, rawValue] of Object.entries(input.engineLayout ?? {})) {
    const sourceNamespace = normalizeNonEmptyString(namespace);
    if (namespace.endsWith('_nodes')) {
      const migratedBuckets = migrateLegacyPreviewEngineNodeBucketsForNamespace(namespace, rawValue);
      if (!migratedBuckets || Object.keys(migratedBuckets.buckets).length === 0) {
        continue;
      }
      nextEngineLayout[migratedBuckets.namespace] = mergeMigratedRecord(
        nextEngineLayout[migratedBuckets.namespace],
        migratedBuckets.buckets,
        {
          preferExisting: sourceNamespace === 'meta.dagre_nodes',
        },
      ) ?? {};
      continue;
    }

    const migratedOverrides = migrateLegacyPreviewEngineOverridesForNamespace(namespace, rawValue);
    if (!migratedOverrides || Object.keys(migratedOverrides.overrides).length === 0) {
      continue;
    }
    nextEngineLayout[migratedOverrides.namespace] = mergeMigratedRecord(
      nextEngineLayout[migratedOverrides.namespace],
      migratedOverrides.overrides,
      {
        preferExisting: sourceNamespace === 'meta.dagre',
      },
    ) ?? {};
  }

  const migratedElkLayout = mergeOverrideRecords(
    nextEngineLayout['meta.elk'],
    input.elkLayout as Record<string, unknown> | undefined,
  ) as Record<string, string> | undefined;

  if (migratedElkLayout) {
    nextEngineLayout['meta.elk'] = migratedElkLayout;
  } else {
    delete nextEngineLayout['meta.elk'];
  }

  return {
    ...input,
    ...(nextLayoutEngine ? { layoutEngine: nextLayoutEngine } : {}),
    ...(migratedElkLayout ? { elkLayout: migratedElkLayout } : {}),
    ...(hadEngineLayout ? { engineLayout: nextEngineLayout } : {}),
  };
}
