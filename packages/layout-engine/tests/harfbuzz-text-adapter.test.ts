import { beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { HarfBuzzTextAdapter } from '../src/harfbuzz-text-adapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..', '..');
const FONT_PATH = path.join(ROOT, 'assets', 'UbuntuSans[wdth,wght].ttf');

let adapter: HarfBuzzTextAdapter;

beforeAll(async () => {
  const fontBuffer = await readFile(FONT_PATH);
  const fontData = fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength);
  adapter = new HarfBuzzTextAdapter({ fontData });
});

describe('HarfBuzzTextAdapter', () => {
  it('reports the harfbuzz backend', () => {
    expect(adapter.measurementBackend).toBe('harfbuzz');
  });

  it('matches canonical Ubuntu Sans advances for plain and small-caps text', () => {
    const plain = adapter.measureTextWidth({
      text: 'Infrastructure',
      fontSize: 18,
      weight: 400,
    });
    const smallCaps = adapter.measureTextWidth({
      text: 'Infrastructure',
      fontSize: 15,
      weight: 700,
      smallCaps: true,
    });

    expect(plain).toBeCloseTo(112.248, 3);
    expect(smallCaps).toBeCloseTo(118.545, 3);
  });

  it('treats explicit letter spacing as a real layout input', () => {
    const base = adapter.measureTextWidth({
      text: 'INFRASTRUCTURE',
      fontSize: 15,
      weight: 700,
      smallCaps: true,
    });
    const spaced = adapter.measureTextWidth({
      text: 'INFRASTRUCTURE',
      fontSize: 15,
      weight: 700,
      smallCaps: true,
      letterSpacing: '0.05em',
    });

    expect(base).toBeCloseTo(118.545, 3);
    expect(spaced).toBeCloseTo(128.295, 3);
    expect(spaced - base).toBeCloseTo(9.75, 6);
  });
});
