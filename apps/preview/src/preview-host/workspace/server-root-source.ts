/**
 * Disk-backed `server-root` workspace source (spec 075, Phase 0).
 *
 * Wraps a single directory with the historical single-dir behaviour: list
 * `*.yaml` stems, read/write by slug. All `slug -> path` resolution is confined
 * inside the declared root by realpath containment (FR-008, SC-005), rejecting
 * `..`, absolute escapes, and symlink escapes in addition to the bare-slug
 * allowlist.
 */

import { existsSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  formatQualifiedSlug,
  isBareSlug,
  type DiagramEntry,
  type DiagramSourceKind,
  type DiagramWorkspaceSource,
} from "./diagram-workspace-source.js";

export interface ServerRootSourceOptions {
  readonly id: string;
  readonly label: string;
  readonly dir: string;
  /** `server-root` (default) or `bundled-examples`. */
  readonly kind?: Extract<DiagramSourceKind, "server-root" | "bundled-examples">;
  /** Defaults to `true`. Set `false` for read-only bundled examples. */
  readonly writable?: boolean;
}

/**
 * Resolve `slug -> absolute path` confined to `rootDir`. Returns `null` when the
 * slug is unsafe or would escape the root (via `..`, absolute path, or a symlink
 * that points outside the root).
 */
export function resolveContainedFramePath(rootDir: string, slug: string): string | null {
  if (!isBareSlug(slug)) return null;

  const rootReal = safeRealpath(rootDir);
  if (rootReal === null) return null;

  const candidate = path.resolve(rootReal, `${slug}.yaml`);
  if (!isInside(rootReal, candidate)) return null;

  // If the target exists, its realpath must still be inside the root so that a
  // symlink cannot redirect a read/write outside the confined directory.
  if (existsSync(candidate)) {
    const candidateReal = safeRealpath(candidate);
    if (candidateReal === null || !isInside(rootReal, candidateReal)) return null;
  }
  return candidate;
}

function safeRealpath(target: string): string | null {
  try {
    return realpathSync(target);
  } catch {
    return null;
  }
}

function isInside(rootReal: string, candidate: string): boolean {
  const rel = path.relative(rootReal, candidate);
  return rel.length > 0 && !rel.startsWith("..") && !path.isAbsolute(rel);
}

export function createServerRootSource(options: ServerRootSourceOptions): DiagramWorkspaceSource {
  const kind: DiagramSourceKind = options.kind ?? "server-root";
  const writable = options.writable ?? true;
  const { id, label, dir } = options;

  function requirePath(slug: string): string {
    const resolved = resolveContainedFramePath(dir, slug);
    if (resolved === null) {
      throw new Error(`Diagram slug '${slug}' is outside source '${id}'`);
    }
    return resolved;
  }

  return {
    id,
    label,
    kind,
    writable,
    directory: dir,
    list(): DiagramEntry[] {
      if (!existsSync(dir)) return [];
      return readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
        .map((entry) => path.basename(entry.name, ".yaml"))
        .filter((slug) => isBareSlug(slug))
        .sort((a, b) => a.localeCompare(b))
        .map((slug) => ({
          qualifiedId: formatQualifiedSlug(id, slug),
          sourceId: id,
          slug,
          title: slug,
          writable,
        }));
    },
    has(slug: string): boolean {
      const resolved = resolveContainedFramePath(dir, slug);
      return resolved !== null && existsSync(resolved);
    },
    read(slug: string): string {
      return readFileSync(requirePath(slug), "utf8");
    },
    write(slug: string, yaml: string): void {
      if (!writable) {
        throw new Error(`Workspace source '${id}' is read-only`);
      }
      writeFileSync(requirePath(slug), yaml, "utf8");
    },
    resolvePath(slug: string): string {
      return requirePath(slug);
    },
  };
}
