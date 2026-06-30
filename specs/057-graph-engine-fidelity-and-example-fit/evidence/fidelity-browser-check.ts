import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';

type Bounds = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type CheckResult = {
  name: string;
  ok: boolean;
  details?: unknown;
  error?: string;
};

type EvidenceResult = {
  ok: boolean;
  startedAt: string;
  finishedAt?: string;
  baseUrl: string;
  notes: string[];
  checks: CheckResult[];
};

type DetailError = Error & {
  details?: unknown;
};

const baseUrl = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:8100';
const here = dirname(fileURLToPath(import.meta.url));
const outputPath = process.env.SPEC057_RESULT_JSON
  || join(here, 'fidelity-browser-result.json');

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function assert(condition: unknown, message: string, details?: unknown): asserts condition {
  if (!condition) {
    const error = new Error(message) as DetailError;
    error.details = details;
    throw error;
  }
}

function boundsById(bounds: Bounds[]): Map<string, Bounds> {
  return new Map(bounds.map((entry) => [entry.id, entry]));
}

function rangesOverlap(a1: number, a2: number, b1: number, b2: number, tolerance = 2): boolean {
  return Math.max(a1, b1) <= Math.min(a2, b2) + tolerance;
}

function boundsSignature(bounds: Bounds[]): string {
  return JSON.stringify(
    [...bounds]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((entry) => [entry.id, entry.x, entry.y, entry.w, entry.h]),
  );
}

function changedBounds(before: Bounds[], after: Bounds[], tolerance = 0): Bounds[] {
  const afterById = boundsById(after);
  return before.filter((entry) => {
    const next = afterById.get(entry.id);
    return next && (
      Math.abs(next.x - entry.x) > tolerance
      || Math.abs(next.y - entry.y) > tolerance
      || Math.abs(next.w - entry.w) > tolerance
      || Math.abs(next.h - entry.h) > tolerance
    );
  });
}

async function openPage(browser: Browser, slug: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${baseUrl}/view/v3:${slug}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await settle(page);
  return page;
}

async function settle(page: Page): Promise<void> {
  await page.locator('#stage svg').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
}

async function currentEngine(page: Page): Promise<string | null> {
  return page.locator('#stage svg').getAttribute('data-layout-engine');
}

async function waitForEngine(page: Page, engineId: string): Promise<string | null> {
  await page.waitForFunction(
    (expected) => document.querySelector('#stage svg')?.getAttribute('data-layout-engine') === expected,
    engineId,
    { timeout: 15_000 },
  );
  await settle(page);
  return currentEngine(page);
}

async function nodeBounds(page: Page): Promise<Bounds[]> {
  return page.locator('#dg-frame-layer [data-component-id]').evaluateAll((elements) => elements
    .map((element) => {
      const box = (element as SVGGraphicsElement).getBBox();
      const roundBoxValue = (value: number) => Math.round(value * 1000) / 1000;
      return {
        id: element.getAttribute('data-component-id') || '',
        x: roundBoxValue(box.x),
        y: roundBoxValue(box.y),
        w: roundBoxValue(box.width),
        h: roundBoxValue(box.height),
      };
    })
    .filter((entry): entry is Bounds => Boolean(entry.id) && entry.w > 0 && entry.h > 0));
}

async function selectBySvgComponent(page: Page, componentId: string): Promise<void> {
  const box = await page.locator(`#dg-frame-layer [data-component-id="${componentId}"]`).first().boundingBox();
  assert(box, `component ${componentId} must have a visible SVG box`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await settle(page);
}

async function assertMongoV3AzLabelsBesideVms(browser: Browser): Promise<unknown> {
  const page = await openPage(browser, 'mongo-octavia-ha');
  try {
    const initialEngine = await currentEngine(page);
    const before = await nodeBounds(page);
    await page.click('#engine-switcher-tabs [data-engine-id="v3"]');
    const renderedEngine = await waitForEngine(page, 'v3');
    const after = await nodeBounds(page);
    const changed = changedBounds(before, after, 1);
    assert(renderedEngine === 'v3', `mongo-octavia-ha: expected v3 render after tab click, got ${renderedEngine || '<missing>'}`);
    assert(changed.length > 0, 'mongo-octavia-ha: v3 tab click must change layout bounds', {
      beforeCount: before.length,
      afterCount: after.length,
    });
    const byId = boundsById(after);
    const zones = [];
    for (const index of [1, 2, 3]) {
      const label = byId.get(`az${index}_label`);
      const vm = byId.get(`vm_az${index}`);
      assert(label, `mongo-octavia-ha: missing az${index}_label after v3 switch`);
      assert(vm, `mongo-octavia-ha: missing vm_az${index} after v3 switch`);
      assert(
        rangesOverlap(label.y, label.y + label.h, vm.y, vm.y + vm.h),
        `mongo-octavia-ha: az${index}_label must sit beside its VM band after v3 switch`,
        { label, vm },
      );
      zones.push({
        zone: `az${index}`,
        label,
        vm,
      });
    }
    return {
      slug: 'mongo-octavia-ha',
      initialEngine,
      renderedEngine,
      changedNodeCount: changed.length,
      changedNodeSample: changed.slice(0, 5).map((entry) => entry.id),
      zones,
    };
  } finally {
    await page.close();
  }
}

async function assertBoxTypeChangeDoesNotRelayout(browser: Browser): Promise<unknown> {
  const page = await openPage(browser, 'support-engineering-flow');
  try {
    await selectBySvgComponent(page, 'step_problem');
    const beforeEngine = await currentEngine(page);
    const before = await nodeBounds(page);
    const select = page.locator('select[data-dg-change-action="single-style"][data-dg-cid="step_problem"]');
    await select.waitFor({ state: 'visible', timeout: 10_000 });
    const current = await select.inputValue();
    const next = current === 'default' ? 'section' : 'default';
    await select.selectOption(next);
    await page.waitForTimeout(800);
    await settle(page);
    const afterEngine = await currentEngine(page);
    const after = await nodeBounds(page);
    assert(beforeEngine === afterEngine, 'support-engineering-flow: box-type change must not change rendered engine', {
      beforeEngine,
      afterEngine,
    });
    assert(boundsSignature(before) === boundsSignature(after), 'support-engineering-flow: box-type change must not relayout nodes', {
      changed: changedBounds(before, after, 0),
    });
    return {
      slug: 'support-engineering-flow',
      engine: beforeEngine,
      selectedNode: 'step_problem',
      changedStyle: { from: current, to: next },
      nodeCount: before.length,
    };
  } finally {
    await page.close();
  }
}

async function record(result: EvidenceResult, name: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    result.checks.push({
      name,
      ok: true,
      details: await fn(),
    });
  } catch (error) {
    result.ok = false;
    const detailError = error as Partial<DetailError>;
    result.checks.push({
      name,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      details: detailError.details,
    });
  }
}

async function main(): Promise<void> {
  const result: EvidenceResult = {
    ok: true,
    startedAt: new Date().toISOString(),
    baseUrl,
    notes: [
      'Real gestures only: page.click engine tab and mouse/select interaction for box type.',
      'No layoutPreviewFrameDiagramForEngine probe is used as proof.',
    ],
    checks: [],
  };
  const browser = await chromium.launch({ headless: true });
  try {
    await record(result, 'mongo v3 tab keeps AZ labels beside VM bands', () => (
      assertMongoV3AzLabelsBesideVms(browser)
    ));
    await record(result, 'box-type change stays appearance-only', () => (
      assertBoxTypeChangeDoesNotRelayout(browser)
    ));
  } finally {
    await browser.close();
    result.finishedAt = new Date().toISOString();
    writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }
  if (!result.ok) {
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});
