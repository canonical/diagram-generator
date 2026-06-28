import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const base = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:8100';
const evidenceDir = dirname(fileURLToPath(import.meta.url));
const resultPath = resolve(
  evidenceDir,
  process.env.DG_EVIDENCE_RESULT || 'post-load-mutations-result.json',
);

function round(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function assert(condition, message, details = undefined) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function boundsById(bounds) {
  return new Map(bounds.map((entry) => [entry.id, entry]));
}

function changedBounds(before, after, tolerance = 1) {
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

function boundsSignature(bounds) {
  return JSON.stringify(
    [...bounds]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((entry) => [entry.id, entry.x, entry.y, entry.w, entry.h]),
  );
}

function centerSpread(bounds) {
  const centers = bounds.map((entry) => ({
    x: entry.x + entry.w / 2,
    y: entry.y + entry.h / 2,
  }));
  return {
    x: round(Math.max(...centers.map((entry) => entry.x)) - Math.min(...centers.map((entry) => entry.x))),
    y: round(Math.max(...centers.map((entry) => entry.y)) - Math.min(...centers.map((entry) => entry.y))),
  };
}

function rangesOverlap(a1, a2, b1, b2, tolerance = 2) {
  return Math.max(a1, b1) <= Math.min(a2, b2) + tolerance;
}

function endpointOnAnyPerimeter(endpoint, bounds, tolerance = 2.5) {
  return bounds.some((box) => {
    if (box.id === 'page') return false;
    const withinX = endpoint.x >= box.x - tolerance && endpoint.x <= box.x + box.w + tolerance;
    const withinY = endpoint.y >= box.y - tolerance && endpoint.y <= box.y + box.h + tolerance;
    const onVertical = withinY
      && (Math.abs(endpoint.x - box.x) <= tolerance || Math.abs(endpoint.x - (box.x + box.w)) <= tolerance);
    const onHorizontal = withinX
      && (Math.abs(endpoint.y - box.y) <= tolerance || Math.abs(endpoint.y - (box.y + box.h)) <= tolerance);
    return onVertical || onHorizontal;
  });
}

function endpointOnBoxPerimeter(endpoint, box, tolerance = 2.5) {
  if (!box) return false;
  const withinX = endpoint.x >= box.x - tolerance && endpoint.x <= box.x + box.w + tolerance;
  const withinY = endpoint.y >= box.y - tolerance && endpoint.y <= box.y + box.h + tolerance;
  const onVertical = withinY
    && (Math.abs(endpoint.x - box.x) <= tolerance || Math.abs(endpoint.x - (box.x + box.w)) <= tolerance);
  const onHorizontal = withinX
    && (Math.abs(endpoint.y - box.y) <= tolerance || Math.abs(endpoint.y - (box.y + box.h)) <= tolerance);
  return onVertical || onHorizontal;
}

async function openPreviewPage(browser, slug) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${base}/view/v3:${slug}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForSelector('#stage svg', { timeout: 30000 });
  await settle(page);
  return page;
}

async function settle(page) {
  await page.waitForSelector('#stage svg', { timeout: 30000 });
  await page.waitForTimeout(500);
}

async function engineOf(page) {
  return page.locator('#stage svg').getAttribute('data-layout-engine');
}

async function renderIntentOf(page) {
  return page.evaluate(() => window.__DG_previewRenderIntent ?? null);
}

async function waitForEngine(page, engineId) {
  await page.waitForFunction(
    (expected) => document.querySelector('#stage svg')?.getAttribute('data-layout-engine') === expected,
    engineId,
    { timeout: 20000 },
  );
  await settle(page);
}

async function nodeBounds(page, selector = '#dg-frame-layer [data-component-id]') {
  return page.locator(selector).evaluateAll((elements) => elements
    .map((element) => {
      const box = element.getBBox();
      return {
        id: element.getAttribute('data-component-id'),
        x: Math.round(box.x * 1000) / 1000,
        y: Math.round(box.y * 1000) / 1000,
        w: Math.round(box.width * 1000) / 1000,
        h: Math.round(box.height * 1000) / 1000,
      };
    })
    .filter((entry) => entry.id && entry.w > 0 && entry.h > 0));
}

async function arrowEndpoints(page) {
  return page.locator('#dg-arrow-layer [data-dg-arrow="true"]').evaluateAll((groups) => {
    function numericAttr(element, name) {
      return Number.parseFloat(element.getAttribute(name) || '0');
    }

    function parsePoints(value) {
      return String(value || '')
        .trim()
        .split(/\s+/)
        .map((pair) => pair.split(',').map((part) => Number.parseFloat(part)))
        .filter((point) => point.length === 2 && point.every(Number.isFinite))
        .map(([x, y]) => ({ x, y }));
    }

    function farthest(points, origin) {
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
        const first = lines[0];
        const last = lines[lines.length - 1];
        const source = {
          x: numericAttr(first, 'x1'),
          y: numericAttr(first, 'y1'),
        };
        let target = {
          x: numericAttr(last, 'x2'),
          y: numericAttr(last, 'y2'),
        };
        const polygon = Array.from(group.querySelectorAll('polygon')).at(-1);
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

      const path = group.querySelector('path');
      if (path && typeof path.getTotalLength === 'function') {
        const length = path.getTotalLength();
        const source = path.getPointAtLength(0);
        const target = path.getPointAtLength(length);
        return {
          id,
          sourceId,
          targetId,
          source: { x: source.x, y: source.y },
          target: { x: target.x, y: target.y },
        };
      }

      return null;
    }).filter(Boolean);
  });
}

async function arrowLineSignatures(page) {
  return page.locator('#dg-arrow-layer [data-dg-arrow="true"]').evaluateAll((groups) => groups.map((group) => ({
    id: group.getAttribute('data-component-id'),
    lines: Array.from(group.querySelectorAll('line'))
      .filter((line) => line.getAttribute('stroke') !== 'transparent')
      .map((line) => [
        line.getAttribute('x1'),
        line.getAttribute('y1'),
        line.getAttribute('x2'),
        line.getAttribute('y2'),
      ]),
  })));
}

function changedArrowLineIds(before, after) {
  const afterById = new Map(after.map((entry) => [entry.id, entry]));
  return before
    .filter((entry) => {
      const next = afterById.get(entry.id);
      return next && JSON.stringify(next.lines) !== JSON.stringify(entry.lines);
    })
    .map((entry) => entry.id);
}

async function controlState(page, selector) {
  return page.locator(selector).evaluateAll((elements, currentSelector) => elements.map((element) => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const painted = style.display !== 'none'
      && style.visibility !== 'hidden'
      && rect.width > 0
      && rect.height > 0;
    const hidden = Boolean(
      element.hidden
      || element.closest('[hidden]')
      || style.display === 'none'
      || style.visibility === 'hidden',
    );
    const focusable = !hidden
      && !element.disabled
      && element.getAttribute('aria-hidden') !== 'true'
      && element.tabIndex >= 0;
    return {
      selector: currentSelector,
      exists: true,
      hidden,
      painted,
      focusable,
      disabled: Boolean(element.disabled),
      display: style.display,
      visibility: style.visibility,
      rect: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      tabIndex: element.tabIndex,
      id: element.id || null,
    };
  }), selector);
}

async function expectAbsentOrHiddenUnfocusable(page, selector) {
  const states = await controlState(page, selector);
  assert(
    states.length === 0 || states.every((state) => state.hidden && !state.painted && !state.focusable),
    `${selector} must be absent or hidden, unpainted, and unfocusable`,
    states,
  );
  return states;
}

async function expectVisible(page, selector) {
  const states = await controlState(page, selector);
  assert(
    states.length > 0 && states.some((state) => !state.hidden && state.painted),
    `${selector} must be visible`,
    states,
  );
  return states;
}

async function expectTextAbsent(page, text) {
  const found = await page.locator(`text=${text}`).count();
  assert(found === 0, `text must be absent: ${text}`, { text, found });
}

async function selectBySvgComponent(page, componentId) {
  const box = await page.locator(`#dg-frame-layer [data-component-id="${componentId}"]`).first().boundingBox();
  assert(box, `component ${componentId} must have a visible SVG box`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await settle(page);
}

async function proveEngineTabSwitch(browser, slug, targets) {
  const page = await openPreviewPage(browser, slug);
  const steps = [];
  try {
    for (const target of targets) {
      const before = await nodeBounds(page);
      await page.click(`#engine-switcher-tabs [data-engine-id="${target}"]`);
      await waitForEngine(page, target);
      const after = await nodeBounds(page);
      const changed = changedBounds(before, after);
      assert(changed.length > 0, `${slug} ${target} must move at least one node`, {
        beforeCount: before.length,
        afterCount: after.length,
      });
      steps.push({
        target,
        renderedEngine: await engineOf(page),
        changedNodeCount: changed.length,
        changedNodeSample: changed.slice(0, 5).map((entry) => entry.id),
      });
    }

    if (slug === 'mongo-octavia-ha') {
      const after = boundsById(await nodeBounds(page));
      for (const index of [1, 2, 3]) {
        const azLabel = after.get(`az${index}_label`);
        const vm = after.get(`vm_az${index}`);
        assert(azLabel && vm, `mongo-octavia-ha v3 must expose az${index} label and vm_az${index}`);
        assert(
          rangesOverlap(azLabel.y, azLabel.y + azLabel.h, vm.y, vm.y + vm.h),
          `az${index} label must sit beside its VM band after v3 switch`,
          { azLabel, vm },
        );
      }
    }

    return { slug, steps };
  } finally {
    await page.close();
  }
}

async function proveDirectionFlip(browser) {
  const page = await openPreviewPage(browser, 'tiered-network-architecture');
  try {
    await page.click('#nav-tab-layers');
    await page.click('.tree-item[data-node-id="page"]');
    const verticalBeforeLines = await arrowLineSignatures(page);
    await page.selectOption('select[data-dg-cid="page"][data-dg-prop="direction"]', 'HORIZONTAL');
    await page.waitForFunction(() => {
      const children = Array.from(
        document.querySelectorAll('#dg-frame-layer > [data-component-id="page"] > [data-component-id]'),
      );
      if (children.length < 2) return false;
      const centers = children.map((element) => {
        const box = element.getBBox();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      });
      const spreadX = Math.max(...centers.map((entry) => entry.x)) - Math.min(...centers.map((entry) => entry.x));
      const spreadY = Math.max(...centers.map((entry) => entry.y)) - Math.min(...centers.map((entry) => entry.y));
      return spreadX > spreadY;
    }, null, { timeout: 15000 });
    await settle(page);
    const horizontalChildren = await nodeBounds(
      page,
      '#dg-frame-layer > [data-component-id="page"] > [data-component-id]',
    );
    const horizontalLines = await arrowLineSignatures(page);
    const changedArrowIds = changedArrowLineIds(verticalBeforeLines, horizontalLines);
    assert(
      changedArrowIds.length === verticalBeforeLines.length,
      'all arrow line signatures must change after horizontal direction relayout',
      {
        changedArrowIds,
        beforeCount: verticalBeforeLines.length,
        afterCount: horizontalLines.length,
      },
    );
    const horizontalBounds = boundsById(await nodeBounds(page));
    const horizontalEndpoints = await arrowEndpoints(page);
    const horizontalDetached = horizontalEndpoints.filter((arrow) => (
      arrow.sourceId && arrow.targetId
        ? (
          !endpointOnBoxPerimeter(arrow.source, horizontalBounds.get(arrow.sourceId))
          || !endpointOnBoxPerimeter(arrow.target, horizontalBounds.get(arrow.targetId))
        )
        : (
          !endpointOnAnyPerimeter(arrow.source, [...horizontalBounds.values()])
          || !endpointOnAnyPerimeter(arrow.target, [...horizontalBounds.values()])
        )
    ));
    assert(
      horizontalDetached.length === 0,
      'horizontal direction relayout must attach arrow endpoints to their own source/target boxes',
      horizontalDetached,
    );
    const horizontalIntent = await renderIntentOf(page);
    assert(
      horizontalIntent?.pageDirection === 'HORIZONTAL',
      'direction select must commit the PreviewRenderIntent pageDirection before/after relayout',
      horizontalIntent,
    );

    await page.selectOption('select[data-dg-cid="page"][data-dg-prop="direction"]', 'VERTICAL');
    await page.waitForFunction(() => {
      const children = Array.from(
        document.querySelectorAll('#dg-frame-layer > [data-component-id="page"] > [data-component-id]'),
      );
      if (children.length < 2) return false;
      const centers = children.map((element) => {
        const box = element.getBBox();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      });
      const spreadX = Math.max(...centers.map((entry) => entry.x)) - Math.min(...centers.map((entry) => entry.x));
      const spreadY = Math.max(...centers.map((entry) => entry.y)) - Math.min(...centers.map((entry) => entry.y));
      return spreadY > spreadX;
    }, null, { timeout: 15000 });
    await settle(page);

    const verticalChildren = await nodeBounds(
      page,
      '#dg-frame-layer > [data-component-id="page"] > [data-component-id]',
    );
    const verticalIntent = await renderIntentOf(page);
    assert(
      verticalIntent?.pageDirection === 'VERTICAL',
      'direction select back to vertical must commit the PreviewRenderIntent pageDirection',
      verticalIntent,
    );
    const allBounds = await nodeBounds(page);
    const endpoints = await arrowEndpoints(page);
    const detached = endpoints.filter((arrow) => (
      !endpointOnAnyPerimeter(arrow.source, allBounds)
      || !endpointOnAnyPerimeter(arrow.target, allBounds)
    ));

    assert(detached.length === 0, 'all arrow endpoints must remain attached after direction flip', detached);

    return {
      slug: 'tiered-network-architecture',
      renderedEngine: await engineOf(page),
      horizontalRootChildSpread: centerSpread(horizontalChildren),
      verticalRootChildSpread: centerSpread(verticalChildren),
      changedHorizontalArrowCount: changedArrowIds.length,
      arrowCount: endpoints.length,
      horizontalIntent: {
        engineId: horizontalIntent.engineId,
        pageDirection: horizontalIntent.pageDirection,
      },
      verticalIntent: {
        engineId: verticalIntent.engineId,
        pageDirection: verticalIntent.pageDirection,
      },
    };
  } finally {
    await page.close();
  }
}

async function proveElkLiveResize(browser) {
  const page = await openPreviewPage(browser, 'mongo-octavia-ha');
  try {
    await selectBySvgComponent(page, 'mongo_clients');
    const before = boundsById(await nodeBounds(page)).get('mongo_clients');
    assert(before, 'mongo_clients bounds must exist before resize');

    const handle = await page.locator('[data-resize-cid="mongo_clients"][data-resize-axis="r"]').boundingBox();
    assert(handle, 'mongo_clients right resize handle must exist');
    const startX = handle.x + handle.width / 2;
    const startY = handle.y + handle.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 80, startY, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(1500);
    await settle(page);

    const after = boundsById(await nodeBounds(page)).get('mongo_clients');
    assert(after, 'mongo_clients bounds must exist after resize');
    const statusText = await page.locator('#build-status').textContent();
    assert(!/failed/i.test(statusText || ''), 'ELK live resize must not report relayout failed', {
      statusText,
    });
    assert(after.w > before.w + 10, 'mongo_clients width must grow after right-handle drag', {
      before,
      after,
    });

    return {
      slug: 'mongo-octavia-ha',
      renderedEngine: await engineOf(page),
      before,
      after,
      statusText,
    };
  } finally {
    await page.close();
  }
}

async function proveBoxTypeAppearanceOnly(browser) {
  const page = await openPreviewPage(browser, 'support-engineering-flow');
  try {
    await selectBySvgComponent(page, 'step_problem');
    const beforeEngine = await engineOf(page);
    const before = await nodeBounds(page);
    const select = page.locator('select[data-dg-change-action="single-style"][data-dg-cid="step_problem"]');
    await select.waitFor({ state: 'visible', timeout: 10000 });
    const current = await select.inputValue();
    const next = current === 'default' ? 'section' : 'default';
    await select.selectOption(next);
    await page.waitForTimeout(800);
    await settle(page);
    const afterEngine = await engineOf(page);
    const after = await nodeBounds(page);

    assert(beforeEngine === afterEngine, 'box-type change must not change rendered engine', {
      beforeEngine,
      afterEngine,
    });
    assert(boundsSignature(before) === boundsSignature(after), 'box-type change must leave node bounds byte-identical', {
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

async function proveContextualControls(browser) {
  const v3Page = await openPreviewPage(browser, 'tiered-network-architecture');
  const v3 = {};
  try {
    v3.engine = await engineOf(v3Page);
    v3.elkSection = await expectAbsentOrHiddenUnfocusable(v3Page, '#elk-layout-section');
    v3.rawToggle = await expectAbsentOrHiddenUnfocusable(v3Page, '#elk-raw-view-toggle');
    v3.debugToggle = await expectAbsentOrHiddenUnfocusable(v3Page, '#elk-debug-overlay-toggle');
    for (const selector of [
      '#grid-cols',
      '#grid-rows',
      '#grid-col-gap',
      '#grid-row-gap',
      '#grid-margin-top',
      '#grid-margin-right',
      '#grid-margin-bottom',
      '#grid-margin-left',
    ]) {
      await expectAbsentOrHiddenUnfocusable(v3Page, selector);
    }
  } finally {
    await v3Page.close();
  }

  const elkPage = await openPreviewPage(browser, 'support-engineering-flow');
  const elk = {};
  try {
    await expectVisible(elkPage, '#elk-layout-section');
    await expectVisible(elkPage, '#elk-raw-view-toggle');
    await expectAbsentOrHiddenUnfocusable(elkPage, '#elk-debug-overlay-toggle');
    await expectTextAbsent(elkPage, 'Replaces BF styling');
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
      '#grid-link-root',
      '#grid-slack',
    ]) {
      await expectAbsentOrHiddenUnfocusable(elkPage, selector);
    }
    await elkPage.click('#engine-switcher-tabs [data-engine-id="elk-layered"]');
    await waitForEngine(elkPage, 'elk-layered');
    const layeredOnly = await expectVisible(elkPage, '#elk-elk-layered-layering-strategy');
    await elkPage.click('#engine-switcher-tabs [data-engine-id="elk-radial"]');
    await waitForEngine(elkPage, 'elk-radial');
    const radialLayeredOnly = await expectAbsentOrHiddenUnfocusable(elkPage, '#elk-elk-layered-layering-strategy');
    elk.engine = await engineOf(elkPage);
    elk.layeredOnlyBefore = layeredOnly;
    elk.layeredOnlyAfter = radialLayeredOnly;
  } finally {
    await elkPage.close();
  }

  return { v3, elk };
}

async function runCase(results, name, fn) {
  const startedAt = new Date().toISOString();
  try {
    const details = await fn();
    results.cases.push({
      name,
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      details,
    });
  } catch (error) {
    results.ok = false;
    results.cases.push({
      name,
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      details: error?.details,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

const results = {
  ok: true,
  base,
  generatedAt: new Date().toISOString(),
  notes: [
    'Real gestures only for mutations: page.click, page.selectOption, page.mouse drag.',
    'DOM evaluation is used only to read geometry/control state.',
  ],
  cases: [],
};

const browser = await chromium.launch({ headless: true });
try {
  await runCase(results, 'engine-tab-switch:mongo-octavia-ha', () => (
    proveEngineTabSwitch(browser, 'mongo-octavia-ha', ['v3'])
  ));
  await runCase(results, 'engine-tab-switch:juju-bootstrap-machines-process', () => (
    proveEngineTabSwitch(browser, 'juju-bootstrap-machines-process', [
      'v3',
      'elk-layered',
      'elk-force',
      'elk-stress',
      'elk-mrtree',
      'dagre',
    ])
  ));
  await runCase(results, 'page-direction-flip:tiered-network-architecture', () => (
    proveDirectionFlip(browser)
  ));
  await runCase(results, 'elk-live-resize:mongo-octavia-ha', () => (
    proveElkLiveResize(browser)
  ));
  await runCase(results, 'box-type-change:support-engineering-flow', () => (
    proveBoxTypeAppearanceOnly(browser)
  ));
  await runCase(results, 'contextual-controls', () => (
    proveContextualControls(browser)
  ));
} finally {
  await browser.close();
}

writeFileSync(resultPath, `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
if (!results.ok) {
  process.exitCode = 1;
}
