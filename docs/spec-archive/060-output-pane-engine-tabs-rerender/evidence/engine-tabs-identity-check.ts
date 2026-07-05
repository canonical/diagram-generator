import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';

type Point = {
  x: number;
  y: number;
};

type Bounds = Point & {
  id: string;
  w: number;
  h: number;
};

type ArrowEndpoint = {
  id: string;
  sourceId: string | null;
  targetId: string | null;
  source: Point;
  target: Point;
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

type PreviewRenderIntent = {
  engineId?: string;
  pageDirection?: string;
};

declare global {
  interface Window {
    __DG_previewRenderIntent?: PreviewRenderIntent;
  }
}

const baseUrl = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:8100';
const here = dirname(fileURLToPath(import.meta.url));
const outputPath = process.env.ENGINE_TABS_RESULT_JSON
  || join(here, 'engine-tabs-identity-result.json');

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

function changedBounds(before: Bounds[], after: Bounds[], tolerance = 1): Bounds[] {
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

function centerSpread(bounds: Bounds[]): Point {
  const centers = bounds.map((entry) => ({
    x: entry.x + entry.w / 2,
    y: entry.y + entry.h / 2,
  }));
  return {
    x: round(Math.max(...centers.map((entry) => entry.x)) - Math.min(...centers.map((entry) => entry.x))),
    y: round(Math.max(...centers.map((entry) => entry.y)) - Math.min(...centers.map((entry) => entry.y))),
  };
}

function endpointOnBoxPerimeter(endpoint: Point, box: Bounds | undefined, tolerance = 2.5): boolean {
  if (!box) return false;
  const withinX = endpoint.x >= box.x - tolerance && endpoint.x <= box.x + box.w + tolerance;
  const withinY = endpoint.y >= box.y - tolerance && endpoint.y <= box.y + box.h + tolerance;
  const onVertical = withinY
    && (Math.abs(endpoint.x - box.x) <= tolerance || Math.abs(endpoint.x - (box.x + box.w)) <= tolerance);
  const onHorizontal = withinX
    && (Math.abs(endpoint.y - box.y) <= tolerance || Math.abs(endpoint.y - (box.y + box.h)) <= tolerance);
  return onVertical || onHorizontal;
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

async function nodeBounds(
  page: Page,
  selector = '#dg-frame-layer [data-component-id]',
): Promise<Bounds[]> {
  return page.locator(selector).evaluateAll((elements) => elements
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

async function arrowEndpoints(page: Page): Promise<ArrowEndpoint[]> {
  return page.locator('#dg-arrow-layer [data-dg-arrow="true"]').evaluateAll((groups) => {
    function numericAttr(element: Element, name: string): number {
      return Number.parseFloat(element.getAttribute(name) || '0');
    }

    function parsePoints(value: string | null): Point[] {
      return String(value || '')
        .trim()
        .split(/\s+/)
        .map((pair) => {
          const [xRaw, yRaw] = pair.split(',');
          return {
            x: Number.parseFloat(xRaw || ''),
            y: Number.parseFloat(yRaw || ''),
          };
        })
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    }

    function farthest(points: Point[], origin: Point): Point | null {
      let selected = points[0] || null;
      let selectedDistance = -1;
      for (const point of points) {
        const distance = ((point.x - origin.x) ** 2) + ((point.y - origin.y) ** 2);
        if (distance > selectedDistance) {
          selected = point;
          selectedDistance = distance;
        }
      }
      return selected;
    }

    return groups.map((group) => {
      const id = group.getAttribute('data-component-id') || '';
      const edgeMatch = id.startsWith('arrow:edge:')
        ? id.slice('arrow:edge:'.length)
        : id;
      const separatorIndex = edgeMatch.indexOf('->');
      const sourceId = separatorIndex >= 0
        ? decodeURIComponent(edgeMatch.slice(0, separatorIndex))
        : null;
      const targetId = separatorIndex >= 0
        ? decodeURIComponent(edgeMatch.slice(separatorIndex + 2).replace(/#\d+$/, ''))
        : null;
      const lines = Array.from(group.querySelectorAll('line'))
        .filter((line) => line.getAttribute('stroke') !== 'transparent');
      if (lines.length > 0) {
        const first = lines[0]!;
        const last = lines[lines.length - 1]!;
        const source = {
          x: numericAttr(first, 'x1'),
          y: numericAttr(first, 'y1'),
        };
        let target = {
          x: numericAttr(last, 'x2'),
          y: numericAttr(last, 'y2'),
        };
        const polygon = Array.from(group.querySelectorAll('polygon')).at(-1) || null;
        if (polygon) {
          target = farthest(parsePoints(polygon.getAttribute('points')), {
            x: numericAttr(last, 'x1'),
            y: numericAttr(last, 'y1'),
          }) || target;
        }
        return {
          id,
          sourceId,
          targetId,
          source,
          target,
        };
      }
      return null;
    }).filter((entry): entry is ArrowEndpoint => Boolean(entry));
  });
}

async function assertEngineSwitch(browser: Browser, slug: string, steps: string[]): Promise<unknown> {
  const page = await openPage(browser, slug);
  try {
    const before = await currentEngine(page);
    const results = [];
    for (const engineId of steps) {
      const beforeBounds = await nodeBounds(page);
      await page.click(`#engine-switcher-tabs [data-engine-id="${engineId}"]`);
      const renderedEngine = await waitForEngine(page, engineId);
      const afterBounds = await nodeBounds(page);
      const changed = changedBounds(beforeBounds, afterBounds);
      assert(renderedEngine === engineId, `${slug}: selected ${engineId}, rendered ${renderedEngine || '<missing>'}`);
      assert(changed.length > 0, `${slug}: selecting ${engineId} must change layout bounds`, {
        beforeCount: beforeBounds.length,
        afterCount: afterBounds.length,
      });
      results.push({
        selectedEngine: engineId,
        renderedEngine,
        changedNodeCount: changed.length,
        changedNodeSample: changed.slice(0, 5).map((entry) => entry.id),
      });
    }
    return { slug, before, steps: results };
  } finally {
    await page.close();
  }
}

async function assertNoDeadRailOnSequence(browser: Browser): Promise<unknown> {
  const slug = 'service-handshake-sequence';
  const page = await openPage(browser, slug);
  try {
    const renderedEngine = await waitForEngine(page, 'sequence');
    const sectionState = await page.locator('#engine-switcher-section').evaluateAll((nodes) => nodes.map((node) => {
      const style = getComputedStyle(node);
      return {
        hidden: node.hasAttribute('hidden') || style.display === 'none',
        display: style.display,
      };
    }));
    const tabCount = await page.locator('#engine-switcher-tabs [role="tab"]').count();
    assert(sectionState.length === 0 || sectionState.every((entry) => entry.hidden), `${slug}: expected hidden engine rail`, {
      sectionState,
      tabCount,
    });
    assert(tabCount === 0, `${slug}: expected no dead engine tabs`, { sectionState, tabCount });
    return { slug, renderedEngine, sectionState, tabCount };
  } finally {
    await page.close();
  }
}

async function assertDirectionFlipKeepsArrows(browser: Browser): Promise<unknown> {
  const slug = 'tiered-network-architecture';
  const page = await openPage(browser, slug);
  try {
    await page.click('#nav-tab-layers');
    await page.click('.tree-item[data-node-id="page"]');
    await page.selectOption('select[data-dg-cid="page"][data-dg-prop="direction"]', 'HORIZONTAL');
    await page.waitForFunction(() => {
      const children = Array.from(
        document.querySelectorAll('#dg-frame-layer > [data-component-id="page"] > [data-component-id]'),
      );
      if (children.length < 2) return false;
      const centers = children.map((element) => {
        const box = (element as SVGGraphicsElement).getBBox();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      });
      const spreadX = Math.max(...centers.map((entry) => entry.x)) - Math.min(...centers.map((entry) => entry.x));
      const spreadY = Math.max(...centers.map((entry) => entry.y)) - Math.min(...centers.map((entry) => entry.y));
      return spreadX > spreadY;
    }, null, { timeout: 15_000 });
    await settle(page);
    const horizontalChildren = await nodeBounds(
      page,
      '#dg-frame-layer > [data-component-id="page"] > [data-component-id]',
    );
    const horizontalBounds = boundsById(await nodeBounds(page));
    const horizontalEndpoints = await arrowEndpoints(page);
    const detached = horizontalEndpoints.filter((arrow) => (
      !endpointOnBoxPerimeter(arrow.source, arrow.sourceId ? horizontalBounds.get(arrow.sourceId) : undefined)
      || !endpointOnBoxPerimeter(arrow.target, arrow.targetId ? horizontalBounds.get(arrow.targetId) : undefined)
    ));
    assert(detached.length === 0, `${slug}: horizontal direction relayout must attach arrows to source/target boxes`, detached);
    const horizontalIntent = await page.evaluate(() => window.__DG_previewRenderIntent ?? null);
    assert(horizontalIntent?.pageDirection === 'HORIZONTAL', `${slug}: direction select must commit horizontal render intent`, horizontalIntent);

    await page.selectOption('select[data-dg-cid="page"][data-dg-prop="direction"]', 'VERTICAL');
    await page.waitForFunction(() => {
      const children = Array.from(
        document.querySelectorAll('#dg-frame-layer > [data-component-id="page"] > [data-component-id]'),
      );
      if (children.length < 2) return false;
      const centers = children.map((element) => {
        const box = (element as SVGGraphicsElement).getBBox();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      });
      const spreadX = Math.max(...centers.map((entry) => entry.x)) - Math.min(...centers.map((entry) => entry.x));
      const spreadY = Math.max(...centers.map((entry) => entry.y)) - Math.min(...centers.map((entry) => entry.y));
      return spreadY > spreadX;
    }, null, { timeout: 15_000 });
    await settle(page);
    const verticalChildren = await nodeBounds(
      page,
      '#dg-frame-layer > [data-component-id="page"] > [data-component-id]',
    );
    const verticalBounds = boundsById(await nodeBounds(page));
    const verticalEndpoints = await arrowEndpoints(page);
    const verticalDetached = verticalEndpoints.filter((arrow) => (
      !endpointOnBoxPerimeter(arrow.source, arrow.sourceId ? verticalBounds.get(arrow.sourceId) : undefined)
      || !endpointOnBoxPerimeter(arrow.target, arrow.targetId ? verticalBounds.get(arrow.targetId) : undefined)
    ));
    assert(verticalDetached.length === 0, `${slug}: vertical direction relayout must attach arrows to source/target boxes`, verticalDetached);
    const verticalIntent = await page.evaluate(() => window.__DG_previewRenderIntent ?? null);
    assert(verticalIntent?.pageDirection === 'VERTICAL', `${slug}: direction select must commit vertical render intent`, verticalIntent);
    return {
      slug,
      renderedEngine: await currentEngine(page),
      horizontalRootChildSpread: centerSpread(horizontalChildren),
      verticalRootChildSpread: centerSpread(verticalChildren),
      horizontalArrowCount: horizontalEndpoints.length,
      verticalArrowCount: verticalEndpoints.length,
      horizontalIntent,
      verticalIntent,
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
      'Real gestures only: page.click engine tabs and page.selectOption inspector direction control.',
      'No skipModelUpdate, no page.evaluate performEngineRelayout, no hash-only assertions.',
    ],
    checks: [],
  };
  const browser = await chromium.launch({ headless: true });
  try {
    await record(result, 'mongo authored-elk to v3 and elk-layered', () => (
      assertEngineSwitch(browser, 'mongo-octavia-ha', ['v3', 'elk-layered'])
    ));
    await record(result, 'sequence document has no dead engine rail', () => (
      assertNoDeadRailOnSequence(browser)
    ));
    await record(result, 'tiered inspector direction flip reroutes arrows', () => (
      assertDirectionFlipKeepsArrows(browser)
    ));
    await record(result, 'juju engine switch changes rendered engine and layout', () => (
      assertEngineSwitch(browser, 'juju-bootstrap-machines-process', ['v3', 'elk-layered'])
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
