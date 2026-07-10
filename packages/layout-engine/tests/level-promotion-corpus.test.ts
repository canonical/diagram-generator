import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { loadFrameYaml, validateFrameLevelPromotion } from '../src/index.js';

const FRAMES_DIR = join(__dirname, '../../..', 'diagrams/1.input');

function hasConfiguredFrameRoles(filePath: string): boolean {
  const source = parse(readFileSync(filePath, 'utf8')) as { meta?: { frame_roles?: unknown } } | null;
  return Boolean(source?.meta?.frame_roles);
}

describe('frame level-promotion corpus', () => {
  it('keeps authored frame YAML aligned with the sibling-promotion rule', () => {
    const violations = readdirSync(FRAMES_DIR)
      .filter((entry) => entry.endsWith('.yaml'))
      .sort()
      .flatMap((entry) => {
        const filePath = join(FRAMES_DIR, entry);
        if (hasConfiguredFrameRoles(filePath)) {
          return [];
        }
        const diagram = loadFrameYaml(filePath);
        return validateFrameLevelPromotion(diagram.root).map((violation) => ({
          file: entry,
          ...violation,
        }));
      });

    expect(violations).toEqual([]);
  });
});
