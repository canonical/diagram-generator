import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:8100';
const here = dirname(fileURLToPath(import.meta.url));
const outputPath = process.env.SPEC059_RESULT_JSON
  || join(here, 'style-source-browser-result.json');

function nearlyEqual(actual, expected, tolerance = 0.01) {
  return Math.abs(actual - expected) <= tolerance;
}

async function assertServiceHandshakeSequence(page) {
  await page.goto(`${baseUrl}/view/v3:service-handshake-sequence`, { waitUntil: 'domcontentloaded' });
  await page.locator('#stage svg').waitFor({ timeout: 15_000 });
  await page.waitForFunction(() => {
    const label = document.querySelector('#active-engine-label');
    return label
      && !label.hasAttribute('hidden')
      && label.textContent?.trim() === 'Engine: Sequence layout';
  }, null, { timeout: 15_000 });

  const result = await page.evaluate(() => {
    const svg = document.querySelector('#stage svg');
    const firstParticipant = svg?.querySelector('[data-sequence-participant-id]');
    const firstParticipantRect = firstParticipant?.querySelector('rect');
    const firstParticipantText = firstParticipant?.querySelector('text');
    const firstNote = svg?.querySelector('[data-sequence-note-id]');
    const firstNoteRect = firstNote?.querySelector('rect');
    const firstNoteText = firstNote?.querySelector('text');
    const fontSizes = Array.from(svg?.querySelectorAll('text') ?? [])
      .map((node) => Number(node.getAttribute('font-size')))
      .filter((value) => Number.isFinite(value));

    const rectNumber = (node, name) => {
      const value = node?.getAttribute(name);
      return value == null ? null : Number(value);
    };
    const textNumber = (node, name) => {
      const value = node?.getAttribute(name);
      return value == null ? null : Number(value);
    };

    return {
      renderedEngine: svg?.getAttribute('data-layout-engine') || null,
      engineLabel: document.querySelector('#active-engine-label')?.textContent?.trim() || null,
      fontSizes,
      uniqueFontSizes: Array.from(new Set(fontSizes)).sort((a, b) => a - b),
      participant: {
        x: rectNumber(firstParticipantRect, 'x'),
        y: rectNumber(firstParticipantRect, 'y'),
        height: rectNumber(firstParticipantRect, 'height'),
        textX: textNumber(firstParticipantText, 'x'),
        textY: textNumber(firstParticipantText, 'y'),
      },
      note: {
        x: rectNumber(firstNoteRect, 'x'),
        y: rectNumber(firstNoteRect, 'y'),
        height: rectNumber(firstNoteRect, 'height'),
        textX: textNumber(firstNoteText, 'x'),
        textY: textNumber(firstNoteText, 'y'),
      },
    };
  });

  const expected = {
    engine: 'sequence',
    label: 'Engine: Sequence layout',
    fontSize: 18,
    textInset: 8,
    minBoxHeight: 64,
    ascentRatio: 0.94,
  };
  const expectedBaselineInset = expected.textInset + (expected.fontSize * expected.ascentRatio);

  if (result.renderedEngine !== expected.engine) {
    throw new Error(`expected sequence engine, got ${result.renderedEngine || '<missing>'}`);
  }
  if (result.engineLabel !== expected.label) {
    throw new Error(`expected sequence engine label, got ${result.engineLabel || '<missing>'}`);
  }
  if (JSON.stringify(result.uniqueFontSizes) !== JSON.stringify([expected.fontSize])) {
    throw new Error(`expected one shared font size, got ${JSON.stringify(result.uniqueFontSizes)}`);
  }

  for (const [name, box] of Object.entries({ participant: result.participant, note: result.note })) {
    if (box.x == null || box.y == null || box.textX == null || box.textY == null || box.height == null) {
      throw new Error(`${name} box did not render expected rect/text metrics: ${JSON.stringify(box)}`);
    }
    if (box.height !== expected.minBoxHeight) {
      throw new Error(`${name} height drifted from shared min box height: ${JSON.stringify(box)}`);
    }
    if (!nearlyEqual(box.textX - box.x, expected.textInset)) {
      throw new Error(`${name} text x inset drifted from shared inset: ${JSON.stringify(box)}`);
    }
    if (!nearlyEqual(box.textY - box.y, expectedBaselineInset)) {
      throw new Error(`${name} text baseline drifted from shared inset/font rhythm: ${JSON.stringify(box)}`);
    }
  }

  return result;
}

const browser = await chromium.launch();
const page = await browser.newPage();
const result = {
  startedAt: new Date().toISOString(),
  baseUrl,
  checks: [],
};

try {
  result.checks.push({
    name: 'service-handshake-sequence-style-source',
    ...(await assertServiceHandshakeSequence(page)),
  });
  result.ok = true;
} catch (error) {
  result.ok = false;
  result.error = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  result.finishedAt = new Date().toISOString();
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await browser.close();
}
