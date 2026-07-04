import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadFrameYaml, validateFrameLevelPromotion } from '../src/index.js';

const FRAMES_DIR = join(__dirname, '../../..', 'scripts/diagrams/frames');

describe('frame level-promotion corpus', () => {
  it('keeps authored frame YAML aligned with the sibling-promotion rule', () => {
    const violations = readdirSync(FRAMES_DIR)
      .filter((entry) => entry.endsWith('.yaml'))
      .sort()
      .flatMap((entry) => {
        const diagram = loadFrameYaml(join(FRAMES_DIR, entry));
        return validateFrameLevelPromotion(diagram.root).map((violation) => ({
          file: entry,
          ...violation,
        }));
      });

    expect(violations).toEqual([]);
  });
});
