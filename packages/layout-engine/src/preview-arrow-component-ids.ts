export const PREVIEW_ARROW_COMPONENT_PREFIX = 'arrow:';

const PREVIEW_ARROW_EXPLICIT_PREFIX = `${PREVIEW_ARROW_COMPONENT_PREFIX}id:`;
const PREVIEW_ARROW_EDGE_PREFIX = `${PREVIEW_ARROW_COMPONENT_PREFIX}edge:`;

type PreviewArrowIdentity = {
  id?: string | null;
  source: string;
  target: string;
};

export interface PreviewArrowComponentEntry<TArrow extends PreviewArrowIdentity> {
  arrow: TArrow;
  componentId: string;
  occurrenceIndex: number;
}

export interface ResolvedPreviewArrowComponentEntry<TEntry, TArrow extends PreviewArrowIdentity> {
  entry: TEntry;
  arrow: TArrow;
  index: number;
  occurrenceIndex: number;
}

export type ParsedPreviewArrowComponentId =
  | {
    kind: 'explicit';
    componentId: string;
    id: string;
  }
  | {
    kind: 'edge';
    componentId: string;
    source: string;
    target: string;
    occurrenceIndex: number;
  };

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function encodeArrowIdPart(value: string): string {
  return encodeURIComponent(value);
}

function decodeArrowIdPart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function isPreviewArrowComponentId(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(PREVIEW_ARROW_COMPONENT_PREFIX);
}

export function createPreviewArrowComponentId(
  arrow: PreviewArrowIdentity,
  occurrenceIndex = 0,
): string {
  const explicitId = trimString(arrow.id);
  if (explicitId) {
    return `${PREVIEW_ARROW_EXPLICIT_PREFIX}${encodeArrowIdPart(explicitId)}`;
  }

  const source = trimString(arrow.source);
  const target = trimString(arrow.target);
  const suffix = occurrenceIndex > 0 ? `#${occurrenceIndex + 1}` : '';
  return `${PREVIEW_ARROW_EDGE_PREFIX}${encodeArrowIdPart(source)}->${encodeArrowIdPart(target)}${suffix}`;
}

export function collectPreviewArrowComponentEntries<TArrow extends PreviewArrowIdentity>(
  arrows: readonly TArrow[],
): PreviewArrowComponentEntry<TArrow>[] {
  const fallbackCounts = new Map<string, number>();

  return arrows.map((arrow) => {
    const explicitId = trimString(arrow.id);
    if (explicitId) {
      return {
        arrow,
        componentId: createPreviewArrowComponentId(arrow),
        occurrenceIndex: 0,
      };
    }

    const source = trimString(arrow.source);
    const target = trimString(arrow.target);
    const key = `${source}\u0000${target}`;
    const occurrenceIndex = fallbackCounts.get(key) ?? 0;
    fallbackCounts.set(key, occurrenceIndex + 1);

    return {
      arrow,
      componentId: createPreviewArrowComponentId(arrow, occurrenceIndex),
      occurrenceIndex,
    };
  });
}

export function resolvePreviewArrowComponentId<TEntry, TArrow extends PreviewArrowIdentity>(
  parsedComponentId: ParsedPreviewArrowComponentId,
  entries: readonly TEntry[],
  getArrowIdentity: (entry: TEntry, index: number) => TArrow | null | undefined,
): ResolvedPreviewArrowComponentEntry<TEntry, TArrow> | null {
  if (parsedComponentId.kind === 'explicit') {
    for (const [index, entry] of entries.entries()) {
      const arrow = getArrowIdentity(entry, index);
      if (!arrow) {
        continue;
      }
      if (trimString(arrow.id) !== parsedComponentId.id) {
        continue;
      }
      return {
        entry,
        arrow,
        index,
        occurrenceIndex: 0,
      };
    }
    return null;
  }

  const fallbackCounts = new Map<string, number>();
  for (const [index, entry] of entries.entries()) {
    const arrow = getArrowIdentity(entry, index);
    if (!arrow || trimString(arrow.id)) {
      continue;
    }
    const source = trimString(arrow.source);
    const target = trimString(arrow.target);
    if (!source || !target) {
      continue;
    }
    const key = `${source}\u0000${target}`;
    const occurrenceIndex = fallbackCounts.get(key) ?? 0;
    fallbackCounts.set(key, occurrenceIndex + 1);
    if (
      source === parsedComponentId.source
      && target === parsedComponentId.target
      && occurrenceIndex === parsedComponentId.occurrenceIndex
    ) {
      return {
        entry,
        arrow,
        index,
        occurrenceIndex,
      };
    }
  }
  return null;
}

export function parsePreviewArrowComponentId(componentId: string): ParsedPreviewArrowComponentId | null {
  if (typeof componentId !== 'string') {
    return null;
  }

  if (componentId.startsWith(PREVIEW_ARROW_EXPLICIT_PREFIX)) {
    return {
      kind: 'explicit',
      componentId,
      id: decodeArrowIdPart(componentId.slice(PREVIEW_ARROW_EXPLICIT_PREFIX.length)),
    };
  }

  if (!componentId.startsWith(PREVIEW_ARROW_EDGE_PREFIX)) {
    return null;
  }

  const encoded = componentId.slice(PREVIEW_ARROW_EDGE_PREFIX.length);
  const occurrenceMatch = encoded.match(/#(\d+)$/);
  const edgePart = occurrenceMatch
    ? encoded.slice(0, occurrenceMatch.index)
    : encoded;
  const separatorIndex = edgePart.indexOf('->');
  if (separatorIndex < 0) {
    return null;
  }

  const source = decodeArrowIdPart(edgePart.slice(0, separatorIndex));
  const target = decodeArrowIdPart(edgePart.slice(separatorIndex + 2));
  if (!source || !target) {
    return null;
  }

  const occurrenceIndex = occurrenceMatch
    ? Math.max(0, Number.parseInt(occurrenceMatch[1] ?? '1', 10) - 1)
    : 0;

  return {
    kind: 'edge',
    componentId,
    source,
    target,
    occurrenceIndex,
  };
}
