import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const baseUrl = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:8100';
const here = dirname(fileURLToPath(import.meta.url));
const outputPath = process.env.ENGINE_TABS_RESULT_JSON
  || join(here, 'engine-tabs-identity-result.json');

async function currentEngine(page) {
  return page.locator('#stage svg').getAttribute('data-layout-engine');
}

async function waitForEngine(page, engineId) {
  await page.waitForFunction((expected) => {
    return document.querySelector('#stage svg')?.getAttribute('data-layout-engine') === expected;
  }, engineId, { timeout: 15_000 });
  return currentEngine(page);
}

async function openDiagram(page, slug) {
  await page.goto(`${baseUrl}/view/v3:${slug}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#stage svg').waitFor({ timeout: 15_000 });
}

async function clickEngineTab(page, engineId) {
  const tab = page.locator(`#engine-switcher-tabs [data-engine-id="${engineId}"]`);
  await tab.waitFor({ timeout: 15_000 });
  await tab.click();
  return waitForEngine(page, engineId);
}

async function assertEngineSwitch(page, slug, steps) {
  await openDiagram(page, slug);
  const before = await currentEngine(page);
  const results = [];
  for (const engineId of steps) {
    const after = await clickEngineTab(page, engineId);
    results.push({ selectedEngine: engineId, renderedEngine: after });
    if (after !== engineId) {
      throw new Error(`${slug}: selected ${engineId}, rendered ${after || '<missing>'}`);
    }
  }
  return { slug, before, steps: results };
}

async function assertNoDeadRailOnSequence(page) {
  const slug = 'service-handshake-sequence';
  await openDiagram(page, slug);
  const renderedEngine = await waitForEngine(page, 'sequence');
  const sectionHidden = await page.locator('#engine-switcher-section').evaluate((node) => {
    return node.hasAttribute('hidden') || getComputedStyle(node).display === 'none';
  });
  const tabCount = await page.locator('#engine-switcher-tabs [role="tab"]').count();
  if (!sectionHidden || tabCount !== 0) {
    throw new Error(`${slug}: expected hidden empty engine rail, got hidden=${sectionHidden}, tabs=${tabCount}`);
  }
  return { slug, renderedEngine, sectionHidden, tabCount };
}

async function assertDirectionFlipKeepsArrows(page) {
  const slug = 'tiered-network-architecture';
  await openDiagram(page, slug);
  const result = await page.evaluate(async () => {
    const summarize = () => Array.from(document.querySelectorAll('#dg-arrow-layer [data-component-id]'))
      .map((node) => ({
        id: node.getAttribute('data-component-id'),
        markup: node.outerHTML,
      }));
    const before = summarize();
    const runtime = window.__DG_previewBridgeHostRuntime;
    if (!runtime?.performEngineRelayout) {
      throw new Error('preview bridge host runtime is unavailable');
    }
    const relayout = await runtime.performEngineRelayout(
      { removedIds: new Set(), topLevelRemovalIds: () => [] },
      { page: { direction: 'VERTICAL' } },
      {},
      { skipModelUpdate: true },
    );
    const after = summarize();
    return {
      renderedEngine: document.querySelector('#stage svg')?.getAttribute('data-layout-engine'),
      relayout,
      beforeCount: before.length,
      afterCount: after.length,
      finite: after.every((entry) => !/NaN|Infinity|-Infinity/.test(entry.markup)),
    };
  });
  if (
    result.renderedEngine !== 'v3'
    || !result.relayout
    || result.beforeCount === 0
    || result.afterCount !== result.beforeCount
    || !result.finite
  ) {
    throw new Error(`${slug}: direction flip did not preserve finite arrow attachments`);
  }
  return { slug, ...result };
}

async function assertJujuEngineSwitch(page) {
  const slug = 'juju-bootstrap-machines-process';
  return assertEngineSwitch(page, slug, ['v3', 'elk-layered']);
}

const startedAt = new Date().toISOString();
const browser = await chromium.launch();
const page = await browser.newPage();
const result = {
  startedAt,
  baseUrl,
  checks: [],
};

try {
  result.checks.push(await assertEngineSwitch(page, 'mongo-octavia-ha', ['v3', 'elk-layered']));
  result.checks.push(await assertNoDeadRailOnSequence(page));
  result.checks.push(await assertDirectionFlipKeepsArrows(page));
  result.checks.push(await assertJujuEngineSwitch(page));
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
