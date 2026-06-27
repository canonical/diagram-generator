import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SOURCE_ROOTS = [
  {
    label: 'packages/layout-engine/src',
    dir: fileURLToPath(new URL('../src/', import.meta.url)),
  },
  {
    label: 'apps/preview/src',
    dir: fileURLToPath(new URL('../../../apps/preview/src/', import.meta.url)),
  },
];

const ALLOWED_FILES = new Set([
  ['packages/layout-engine/src', 'preview-engine', 'registry.ts'].join(sep),
  ['packages/layout-engine/src', 'diagram-author', 'export-d2.ts'].join(sep),
]);

const ALLOWED_PATH_PATTERNS = [
  `${sep}packages${sep}layout-engine${sep}src${sep}preview-engine${sep}engines${sep}`,
];

const ENGINE_ID = String.raw`(?:elk-[A-Za-z0-9_-]+|dagre|force)`;
const ENGINE_ID_PREFIX = String.raw`(?:elk|elk-[A-Za-z0-9_-]+|dagre|force)`;
const ENGINE_ID_EQUALITY = new RegExp(
  String.raw`\b(?:layoutEngine|layoutEngineKey|engineId|engineKey|previewEngine\.id|engine\.id|manifest\.id|id)\b\s*(?:={2,3}|!={1,2})\s*(['"])${ENGINE_ID}\1`,
);
const ENGINE_ID_SWITCH_CASE = new RegExp(String.raw`\bcase\s+(['"])${ENGINE_ID}\1\s*:`);
const ENGINE_ID_PREFIX_CHECK = new RegExp(
  String.raw`\b(?:layoutEngine|layoutEngineKey|engineId|engineKey|authoredLayoutEngine|activeLayoutEngine)\b\s*\.\s*(?:includes|startsWith)\s*\(\s*(['"])${ENGINE_ID_PREFIX}\1`,
);

function listTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const absolute = join(dir, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      files.push(...listTypeScriptFiles(absolute));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      files.push(absolute);
    }
  }
  return files;
}

function isAllowed(relativePath: string): boolean {
  return ALLOWED_FILES.has(relativePath)
    || ALLOWED_PATH_PATTERNS.some((pattern) => relativePath.includes(pattern.slice(1)));
}

describe('preview engine registration guardrails', () => {
  it('keeps layout engine identity checks out of central source paths', () => {
    const violations: string[] = [];

    for (const root of SOURCE_ROOTS) {
      for (const file of listTypeScriptFiles(root.dir)) {
        const relativePath = [root.label, relative(root.dir, file)].join(sep);
        if (isAllowed(relativePath)) continue;

        const lines = readFileSync(file, 'utf8').split(/\r?\n/);
        lines.forEach((line, index) => {
          if (
            ENGINE_ID_EQUALITY.test(line) ||
            ENGINE_ID_SWITCH_CASE.test(line) ||
            ENGINE_ID_PREFIX_CHECK.test(line)
          ) {
            violations.push(`${relativePath}:${index + 1}: ${line.trim()}`);
          }
        });
      }
    }

    expect(violations).toEqual([]);
  });
});
