import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';

export type FixtureHash = {
  slug: string;
  path: string;
  sha256: string;
};

export function frameFixturePath(repoRoot: string, slug: string): string {
  return resolve(repoRoot, 'scripts', 'diagrams', 'frames', `${slug}.yaml`);
}

export function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function readFixtureHashes(repoRoot: string, slugs: readonly string[]): FixtureHash[] {
  return slugs.map((slug) => {
    const path = frameFixturePath(repoRoot, slug);
    if (!existsSync(path)) {
      throw new Error(`Missing fixture ${path}`);
    }
    return {
      slug,
      path,
      sha256: sha256File(path),
    };
  });
}

export function assertFixtureHashesUnchanged(before: readonly FixtureHash[], after: readonly FixtureHash[]): void {
  const afterBySlug = new Map(after.map((entry) => [entry.slug, entry]));
  for (const entry of before) {
    const next = afterBySlug.get(entry.slug);
    if (!next || next.sha256 !== entry.sha256) {
      const error = new Error(`Fixture ${entry.slug} changed during evidence run`) as Error & {
        details?: unknown;
      };
      error.details = { before: entry, after: next ?? null };
      throw error;
    }
  }
}

export function assertFrameFixturesGitClean(repoRoot: string, slugs: readonly string[]): void {
  const fixturePaths = slugs.map((slug) => relative(repoRoot, frameFixturePath(repoRoot, slug)));
  const status = execFileSync('git', ['status', '--porcelain', '--', ...fixturePaths], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
  if (status.length > 0) {
    throw new Error(`Authored frame fixtures are dirty before evidence run:\n${status}`);
  }
}

export function createTempFrameFixture(sourcePath: string, prefix = 'dg-frame-fixture-'): string {
  const tempDir = mkdtempSync(join(tmpdir(), prefix));
  const targetPath = join(tempDir, basename(sourcePath));
  copyFileSync(sourcePath, targetPath);
  return targetPath;
}

export function writeTempFrameFixture(name: string, content: string, prefix = 'dg-frame-fixture-'): string {
  const tempDir = mkdtempSync(join(tmpdir(), prefix));
  const targetPath = join(tempDir, name);
  writeFileSync(targetPath, content, 'utf8');
  return targetPath;
}
