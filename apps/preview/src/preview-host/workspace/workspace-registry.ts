/**
 * Ordered registry of `DiagramWorkspaceSource`s for the preview host (spec 075).
 *
 * The registry owns source ordering, qualified-slug resolution, and the
 * aggregate diagram listing that the side nav renders. It never touches raw
 * directories itself — it only routes to registered sources.
 */

import {
  parseQualifiedSlug,
  type DiagramEntry,
  type DiagramWorkspaceSource,
} from "./diagram-workspace-source.js";

export interface ResolvedDiagramAddress {
  readonly source: DiagramWorkspaceSource;
  readonly slug: string;
}

/** A resolved disk-backed address: the source directory plus the bare slug. */
export interface ResolvedFrameDirAddress extends ResolvedDiagramAddress {
  readonly framesDir: string;
}

export class WorkspaceRegistry {
  private readonly sources: DiagramWorkspaceSource[] = [];
  private readonly byId = new Map<string, DiagramWorkspaceSource>();

  constructor(sources: readonly DiagramWorkspaceSource[] = []) {
    for (const source of sources) {
      this.register(source);
    }
  }

  register(source: DiagramWorkspaceSource): void {
    if (this.byId.has(source.id)) {
      throw new Error(`Workspace source '${source.id}' is already registered`);
    }
    this.byId.set(source.id, source);
    this.sources.push(source);
  }

  /** Registered sources in registration order. */
  list(): DiagramWorkspaceSource[] {
    return this.sources.slice();
  }

  get(sourceId: string): DiagramWorkspaceSource | undefined {
    return this.byId.get(sourceId);
  }

  /** The first registered source; bare slugs resolve against it. */
  defaultSource(): DiagramWorkspaceSource | undefined {
    return this.sources[0];
  }

  /**
   * Resolve an address to its source + bare slug. Accepts a qualified
   * `sourceId:slug` address or a bare slug (resolved against the default
   * source for backward compatibility). Returns `null` when the source is
   * unknown or the address is malformed.
   */
  resolve(address: string): ResolvedDiagramAddress | null {
    const qualified = parseQualifiedSlug(address);
    if (qualified) {
      const source = this.byId.get(qualified.sourceId);
      return source ? { source, slug: qualified.slug } : null;
    }
    const fallback = this.defaultSource();
    return fallback ? { source: fallback, slug: address } : null;
  }

  /** Aggregate diagram entries across every source, in registration order. */
  listEntries(): DiagramEntry[] {
    return this.sources.flatMap((source) => source.list());
  }

  /**
   * Resolve an address to the disk directory + bare slug for a disk-backed
   * source. Returns `null` when the address is unknown or the source has no
   * backing directory (e.g. a browser `local-folder`). Bridges qualified
   * addresses onto the downstream single-directory `{ framesDir }` contract.
   */
  resolveFrameDir(address: string): ResolvedFrameDirAddress | null {
    const resolved = this.resolve(address);
    if (!resolved || typeof resolved.source.directory !== "string") return null;
    return { ...resolved, framesDir: resolved.source.directory };
  }
}
