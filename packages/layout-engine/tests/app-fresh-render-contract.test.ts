import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('preview fresh-render arrowhead contract', () => {
  it('uses canonical arrow token constants instead of legacy 12/6 preview values', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../src/preview-shell/app-arrow-render.ts'),
      'utf8',
    );

    expect(source).toContain('ARROW_HEAD_LENGTH');
    expect(source).toContain('ARROW_HEAD_HALF_WIDTH');
    expect(source).not.toContain('headLen: 12');
    expect(source).not.toContain('headHalf: 6');
  });
});
