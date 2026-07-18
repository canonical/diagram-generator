/**
 * Typed workspace-source abstraction for the preview host (spec 075, Phase 0).
 *
 * Every diagram listing, reading, and writing path resolves through a
 * `DiagramWorkspaceSource` so nav/open/save become source-agnostic. Phase 0
 * ships a single `server-root` source with behaviour identical to the historical
 * single-directory model; later phases add multiple server roots and a browser
 * `local-folder` source behind the same interface.
 */

export type DiagramSourceKind = "bundled-examples" | "server-root" | "local-folder";

/** A single diagram addressable within a workspace source. */
export interface DiagramEntry {
  /** Globally unique address, `${sourceId}:${slug}`. */
  readonly qualifiedId: string;
  /** Owning source id. */
  readonly sourceId: string;
  /** Bare slug within the source (filename without extension). */
  readonly slug: string;
  /** Display title for the nav (defaults to the slug). */
  readonly title: string;
  /** Whether this entry can be written back to. */
  readonly writable: boolean;
}

/**
 * One diagram source (a labelled directory, the bundled examples, or a browser
 * folder handle). Reads/writes use bare slugs scoped to this source.
 */
export interface DiagramWorkspaceSource {
  readonly id: string;
  readonly label: string;
  readonly kind: DiagramSourceKind;
  readonly writable: boolean;
  /**
   * Absolute directory backing a disk source, when applicable. Present for
   * `server-root` / `bundled-examples`; absent for a browser `local-folder`.
   * Used at the request boundary to build per-source `{ framesDir }` deps
   * without changing the downstream single-directory contract.
   */
  readonly directory?: string;
  /** List the diagrams available in this source, sorted by slug. */
  list(): DiagramEntry[];
  /** Whether a diagram with this bare slug exists in the source. */
  has(slug: string): boolean;
  /** Read the raw YAML text for a bare slug. Throws if absent or out of bounds. */
  read(slug: string): string;
  /** Write raw YAML text for a bare slug. Throws if read-only or out of bounds. */
  write(slug: string, yaml: string): void;
  /**
   * Stable revision of the current raw YAML, used for optimistic concurrency.
   * Disk-backed sources return a content hash; callers must not treat mtimes as
   * sufficient because cloud-sync clients can preserve or coarsen timestamps.
   */
  revision?(slug: string): string;
  /**
   * Absolute on-disk path for a bare slug, when the source is disk-backed.
   * Present only for `server-root` / `bundled-examples`; used to bridge into the
   * existing render/save deps that key off a directory + slug.
   */
  resolvePath?(slug: string): string;
}

/** A source id must be a short token with no reserved separators. */
const SOURCE_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

/** A bare slug is a filename stem with no path separators, colons, or `..`. */
const BARE_SLUG_PATTERN = /^[A-Za-z0-9._-]+$/;

export function isValidSourceId(sourceId: string): boolean {
  return SOURCE_ID_PATTERN.test(sourceId);
}

export function isBareSlug(slug: string): boolean {
  return BARE_SLUG_PATTERN.test(slug) && slug !== "." && slug !== "..";
}

/** Build the qualified address `sourceId:slug`. Throws on malformed inputs. */
export function formatQualifiedSlug(sourceId: string, slug: string): string {
  if (!isValidSourceId(sourceId)) {
    throw new Error(`Invalid workspace source id: '${sourceId}'`);
  }
  if (!isBareSlug(slug)) {
    throw new Error(`Invalid diagram slug: '${slug}'`);
  }
  return `${sourceId}:${slug}`;
}

/**
 * Parse a `sourceId:slug` address. Returns `null` for anything that is not a
 * well-formed qualified address (bare slugs included — callers decide the
 * default-source fallback).
 */
export function parseQualifiedSlug(value: string): { sourceId: string; slug: string } | null {
  const separator = value.indexOf(":");
  if (separator <= 0 || separator === value.length - 1) return null;
  const sourceId = value.slice(0, separator);
  const slug = value.slice(separator + 1);
  if (!isValidSourceId(sourceId) || !isBareSlug(slug)) return null;
  return { sourceId, slug };
}
