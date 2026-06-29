import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';

type ControlState = {
  selector: string;
  exists: true;
  hidden: boolean;
  painted: boolean;
  focusable: boolean;
  disabled: boolean;
  display: string;
  visibility: string;
  tabIndex: number;
  id: string | null;
};

type CheckResult = {
  name: string;
  ok: boolean;
  details?: unknown;
  error?: string;
};

type ScreenshotRecord = {
  name: string;
  path: string;
  selector: string;
  note: string;
};

type ActiveElementState = {
  tagName: string;
  id: string | null;
  dgProp: string | null;
  dgCid: string | null;
  elkKey: string | null;
  engineLayoutKey: string | null;
  text: string | null;
};

type EvidenceResult = {
  ok: boolean;
  startedAt: string;
  finishedAt?: string;
  baseUrl: string;
  screenshotDir: string;
  notes: string[];
  checks: CheckResult[];
};

type DetailError = Error & {
  details?: unknown;
};

const baseUrl = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:8100';
const here = dirname(fileURLToPath(import.meta.url));
const screenshotDir = join(here, 'screenshots');
const outputPath = process.env.SPEC051_RESULT_JSON
  || join(here, 'contextual-aside-result.json');

function assert(condition: unknown, message: string, details?: unknown): asserts condition {
  if (!condition) {
    const error = new Error(message) as DetailError;
    error.details = details;
    throw error;
  }
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

async function waitForEngine(page: Page, engineId: string): Promise<void> {
  await page.waitForFunction(
    (expected) => document.querySelector('#stage svg')?.getAttribute('data-layout-engine') === expected,
    engineId,
    { timeout: 15_000 },
  );
  await settle(page);
}

async function captureAsideScreenshot(
  page: Page,
  name: string,
  note: string,
): Promise<ScreenshotRecord> {
  mkdirSync(screenshotDir, { recursive: true });
  const path = join(screenshotDir, `${name}.png`);
  const selector = '#dg-preview-aside';
  await page.locator(selector).screenshot({ path });
  return { name, path, selector, note };
}

async function selectLayerTreeNode(page: Page, id: string): Promise<void> {
  await page.click('#nav-tab-layers');
  await page.click(`.tree-item[data-node-id="${id}"]`);
  await settle(page);
}

async function controlState(page: Page, selector: string): Promise<ControlState[]> {
  return page.locator(selector).evaluateAll((elements, currentSelector) => elements.map((element) => {
    const control = element as HTMLElement & { disabled?: boolean };
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const hidden = Boolean(
      control.hidden
      || element.closest('[hidden]')
      || style.display === 'none'
      || style.visibility === 'hidden',
    );
    const painted = !hidden && rect.width > 0 && rect.height > 0;
    return {
      selector: currentSelector,
      exists: true,
      hidden,
      painted,
      focusable: !hidden
        && !control.disabled
        && element.getAttribute('aria-hidden') !== 'true'
        && control.tabIndex >= 0,
      disabled: Boolean(control.disabled),
      display: style.display,
      visibility: style.visibility,
      tabIndex: control.tabIndex,
      id: element.id || null,
    };
  }), selector);
}

async function expectVisible(page: Page, selector: string): Promise<ControlState[]> {
  const states = await controlState(page, selector);
  assert(
    states.length > 0 && states.some((state) => !state.hidden && state.painted),
    `${selector} must be visible`,
    states,
  );
  return states;
}

async function expectAbsentOrHiddenUnfocusable(page: Page, selector: string): Promise<ControlState[]> {
  const states = await controlState(page, selector);
  assert(
    states.length === 0 || states.every((state) => state.hidden && !state.painted && !state.focusable),
    `${selector} must be absent or hidden, unpainted, and unfocusable`,
    states,
  );
  return states;
}

async function expectTextAbsent(page: Page, text: string): Promise<void> {
  const count = await page.locator(`text=${text}`).count();
  assert(count === 0, `text must be absent: ${text}`, { text, count });
}

async function renderedEngineControlKeys(page: Page): Promise<string[]> {
  return page.locator('[data-dg-engine-layout-key], [data-elk-key]').evaluateAll((elements) => (
    elements
      .map((element) => (
        element.getAttribute('data-dg-engine-layout-key')
        || element.getAttribute('data-elk-key')
        || ''
      ))
      .filter((key) => key.length > 0)
      .sort()
  ));
}

async function collectTabSequence(page: Page, steps = 120): Promise<ActiveElementState[]> {
  await page.click('body', { position: { x: 4, y: 4 } });
  const sequence: ActiveElementState[] = [];
  for (let index = 0; index < steps; index += 1) {
    await page.keyboard.press('Tab');
    sequence.push(await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (!element) {
        return {
          tagName: '',
          id: null,
          dgProp: null,
          dgCid: null,
          elkKey: null,
          engineLayoutKey: null,
          text: null,
        };
      }
      const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
      return {
        tagName: element.tagName.toLowerCase(),
        id: element.id || null,
        dgProp: element.getAttribute('data-dg-prop'),
        dgCid: element.getAttribute('data-dg-cid'),
        elkKey: element.getAttribute('data-elk-key'),
        engineLayoutKey: element.getAttribute('data-dg-engine-layout-key'),
        text: text ? text.slice(0, 80) : null,
      };
    }));
  }
  return sequence;
}

async function expectTabSequenceSkips(
  page: Page,
  forbidden: Array<Partial<ActiveElementState>>,
): Promise<ActiveElementState[]> {
  const sequence = await collectTabSequence(page);
  const hits = sequence.filter((state) => forbidden.some((target) => (
    (target.id == null || state.id === target.id)
    && (target.dgProp == null || state.dgProp === target.dgProp)
    && (target.dgCid == null || state.dgCid === target.dgCid)
    && (target.elkKey == null || state.elkKey === target.elkKey)
    && (target.engineLayoutKey == null || state.engineLayoutKey === target.engineLayoutKey)
  )));
  assert(hits.length === 0, 'hidden controls must be skipped by Tab traversal', {
    forbidden,
    hits,
    sequence,
  });
  return sequence;
}

async function assertV3RootShowsAutolayoutInspector(browser: Browser): Promise<unknown> {
  const page = await openPage(browser, 'tiered-network-architecture');
  try {
    await selectLayerTreeNode(page, 'page');
    const direction = await expectVisible(page, 'select[data-dg-cid="page"][data-dg-prop="direction"]');
    const gridSection = await expectVisible(page, '#grid-controls-section');
    await expectAbsentOrHiddenUnfocusable(page, '#elk-layout-section');
    await expectAbsentOrHiddenUnfocusable(page, '#elk-raw-view-toggle');
    await expectAbsentOrHiddenUnfocusable(page, '#elk-debug-overlay-toggle');
    const screenshot = await captureAsideScreenshot(
      page,
      'v3-tiered-network-root-aside',
      'V3 root selection: native autolayout controls visible; ELK controls absent.',
    );
    return {
      slug: 'tiered-network-architecture',
      engine: await currentEngine(page),
      direction,
      gridSection,
      screenshot,
    };
  } finally {
    await page.close();
  }
}

async function assertElkRootHidesNativeAutolayoutInspector(browser: Browser): Promise<unknown> {
  const page = await openPage(browser, 'support-engineering-flow');
  try {
    await selectLayerTreeNode(page, 'page');
    const engine = await currentEngine(page);
    const direction = await expectAbsentOrHiddenUnfocusable(
      page,
      'select[data-dg-cid="page"][data-dg-prop="direction"]',
    );
    const gap = await expectAbsentOrHiddenUnfocusable(
      page,
      '[data-dg-cid="page"][data-dg-prop="gap_delta"]',
    );
    const gridFields: Record<string, ControlState[]> = {};
    for (const selector of [
      '#grid-controls-section',
      '#grid-cols',
      '#grid-rows',
      '#grid-col-gap',
      '#grid-row-gap',
      '#grid-margin-top',
      '#grid-margin-right',
      '#grid-margin-bottom',
      '#grid-margin-left',
    ]) {
      gridFields[selector] = await expectAbsentOrHiddenUnfocusable(page, selector);
    }
    const raw = await expectVisible(page, '#elk-raw-view-toggle');
    await expectAbsentOrHiddenUnfocusable(page, '#elk-debug-overlay-toggle');
    await expectTextAbsent(page, 'Only engines compatible with this document are listed');
    const tabSequence = await expectTabSequenceSkips(page, [
      { dgCid: 'page', dgProp: 'direction' },
      { dgCid: 'page', dgProp: 'gap_delta' },
      { id: 'grid-cols' },
      { id: 'grid-rows' },
      { id: 'grid-col-gap' },
      { id: 'grid-row-gap' },
      { id: 'grid-margin-top' },
      { id: 'grid-margin-right' },
      { id: 'grid-margin-bottom' },
      { id: 'grid-margin-left' },
      { id: 'elk-debug-overlay-toggle' },
    ]);
    const screenshot = await captureAsideScreenshot(
      page,
      'elk-support-root-aside',
      'ELK root selection: native autolayout/grid fields hidden and skipped in Tab order.',
    );
    return {
      slug: 'support-engineering-flow',
      engine,
      direction,
      gap,
      raw,
      gridFields,
      tabSequence,
      screenshot,
    };
  } finally {
    await page.close();
  }
}

async function assertElkAlgorithmContext(browser: Browser): Promise<unknown> {
  const page = await openPage(browser, 'support-engineering-flow');
  try {
    await page.click('#engine-switcher-tabs [data-engine-id="elk-layered"]');
    await waitForEngine(page, 'elk-layered');
    const layeredOnly = await expectVisible(page, '#elk-elk-layered-layering-strategy');
    const layeredKeys = await renderedEngineControlKeys(page);
    assert(
      layeredKeys.includes('elk.layered.layering.strategy'),
      'layered engine must render layered-only control keys',
      { layeredKeys },
    );
    const layeredScreenshot = await captureAsideScreenshot(
      page,
      'elk-layered-controls-aside',
      'ELK layered active: layered-only controls are visible.',
    );
    await page.click('#engine-switcher-tabs [data-engine-id="elk-radial"]');
    await waitForEngine(page, 'elk-radial');
    const radialLayeredOnly = await expectAbsentOrHiddenUnfocusable(page, '#elk-elk-layered-layering-strategy');
    const radialKeys = await renderedEngineControlKeys(page);
    assert(
      !radialKeys.includes('elk.layered.layering.strategy'),
      'radial engine must not render layered-only control keys',
      { radialKeys },
    );
    const raw = await expectVisible(page, '#elk-raw-view-toggle');
    await expectAbsentOrHiddenUnfocusable(page, '#elk-debug-overlay-toggle');
    await expectTextAbsent(page, 'Only engines compatible with this document are listed');
    const tabSequence = await expectTabSequenceSkips(page, [
      { id: 'elk-elk-layered-layering-strategy' },
      { engineLayoutKey: 'elk.layered.layering.strategy' },
      { elkKey: 'elk.layered.layering.strategy' },
      { id: 'elk-debug-overlay-toggle' },
    ]);
    const radialScreenshot = await captureAsideScreenshot(
      page,
      'elk-radial-controls-aside',
      'ELK radial active: layered-only controls are absent; raw toggle remains ELK-only.',
    );
    return {
      slug: 'support-engineering-flow',
      engine: await currentEngine(page),
      layeredOnly,
      layeredKeys,
      layeredScreenshot,
      radialLayeredOnly,
      radialKeys,
      raw,
      tabSequence,
      radialScreenshot,
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
  mkdirSync(here, { recursive: true });
  const result: EvidenceResult = {
    ok: true,
    startedAt: new Date().toISOString(),
    baseUrl,
    screenshotDir,
    notes: [
      'Real browser gestures only: layer-tree clicks, engine-tab clicks, and Tab traversal.',
      'Hidden controls must be absent or hidden, unpainted, unfocusable, and skipped in Tab order.',
      'ELK algorithms are selected through engine tabs in this UI; rendered control keys must match the active manifest.',
    ],
    checks: [],
  };
  const browser = await chromium.launch({ headless: true });
  try {
    await record(result, 'v3 root exposes native autolayout inspector controls', () => (
      assertV3RootShowsAutolayoutInspector(browser)
    ));
    await record(result, 'ELK root hides native autolayout and grid controls', () => (
      assertElkRootHidesNativeAutolayoutInspector(browser)
    ));
    await record(result, 'ELK options are active-algorithm contextual', () => (
      assertElkAlgorithmContext(browser)
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
