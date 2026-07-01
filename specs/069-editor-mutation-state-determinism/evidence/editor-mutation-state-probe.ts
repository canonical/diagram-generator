import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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

type FixtureHash = {
  slug: string;
  path: string;
  sha256: string;
};

type DomControlState = {
  selector: string;
  exists: boolean;
  hidden: boolean | null;
  disabled: boolean | null;
  focused: boolean;
  value: string | null;
  checked: boolean | null;
  reason: string;
};

type StateVector = {
  label: string;
  url: string;
  activeTab: string | null;
  renderIntent: unknown;
  frameTreeLayoutEngine: string | null;
  layoutOperator: unknown;
  renderedEngine: string | null;
  bounds: Bounds[];
  boundsSignature: string;
  selection: {
    ids: string[];
    domIds: string[];
    type: string | null;
  };
  inspectorTarget: string | null;
  focusedControl: {
    id: string | null;
    tagName: string | null;
    dataset: Record<string, string>;
  } | null;
  controlApplicability: Record<string, DomControlState>;
  dirty: boolean | null;
  undo: {
    canUndo: boolean | null;
    canRedo: boolean | null;
  };
  visibleControls: Array<{
    id: string;
    hidden: boolean;
    inert: boolean;
    disabledControlCount: number;
    enabledControlCount: number;
  }>;
  savePayload: unknown;
  reloadParse: {
    configSlug: string | null;
    documentKind: string | null;
    layoutEngine: string | null;
  };
  violations: string[];
};

type EvidenceStep = {
  name: string;
  ok: boolean;
  before?: StateVector;
  after?: StateVector;
  details?: unknown;
  error?: string;
  stack?: string;
};

type EvidenceCase = {
  slug: string;
  ok: boolean;
  steps: EvidenceStep[];
};

type EvidenceResult = {
  ok: boolean;
  baseUrl: string;
  generatedAt: string;
  fixtureHashesBefore: FixtureHash[];
  fixtureHashesAfter: FixtureHash[];
  notes: string[];
  cases: EvidenceCase[];
};

type DetailError = Error & {
  details?: unknown;
};

declare global {
  interface Window {
    __DG_CONFIG?: {
      slug?: string | null;
      document_kind?: string | null;
      layout_engine?: string | null;
    } | null;
    __DG_TEST_preview?: {
      canUndo?: () => boolean;
      canRedo?: () => boolean;
    } | null;
    __DG_getPreviewBridgeHostContract?: () => {
      getFrameTreeJson?: () => unknown;
    };
    __DG_previewRenderIntent?: unknown;
    getFrameTreeJson?: () => unknown;
    LayoutEngine?: {
      previewShell?: {
        createPreviewOverridePayload?: (model: Record<string, unknown>) => unknown;
      };
    };
    PreviewSaveClient?: {
      isDirty?: () => boolean;
    };
  }
}

const fixtureSlugs = [
  'example-deployment-pipeline',
  'juju-bootstrap-machines-process',
  'mongo-octavia-ha',
  'tiered-network-architecture',
  'support-engineering-flow',
] as const;

const baseUrl = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:8100';
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const resultPath = resolve(
  here,
  process.env.DG_EVIDENCE_RESULT || 'editor-mutation-state-result.json',
);

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function fixturePath(slug: string): string {
  return resolve(repoRoot, 'scripts', 'diagrams', 'frames', `${slug}.yaml`);
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readFixtureHashes(): FixtureHash[] {
  return fixtureSlugs.map((slug) => {
    const path = fixturePath(slug);
    if (!existsSync(path)) {
      throw new Error(`Missing fixture ${path}`);
    }
    return {
      slug,
      path,
      sha256: sha256(path),
    };
  });
}

function assertFixtureHashesUnchanged(before: FixtureHash[], after: FixtureHash[]): void {
  const afterBySlug = new Map(after.map((entry) => [entry.slug, entry]));
  for (const entry of before) {
    const next = afterBySlug.get(entry.slug);
    if (!next || next.sha256 !== entry.sha256) {
      const error = new Error(`Fixture ${entry.slug} changed during evidence run`) as DetailError;
      error.details = { before: entry, after: next ?? null };
      throw error;
    }
  }
}

function boundsSignature(bounds: readonly Bounds[]): string {
  return JSON.stringify(
    [...bounds]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((entry) => [entry.id, entry.x, entry.y, entry.w, entry.h]),
  );
}

async function settle(page: Page): Promise<void> {
  await page.locator('#stage svg').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
}

async function openPreviewPage(browser: Browser, slug: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${baseUrl}/view/v3:${slug}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await settle(page);
  return page;
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

async function captureStateVector(page: Page, label: string): Promise<StateVector> {
  const bounds = await nodeBounds(page);
  const state = await page.evaluate((stateLabel) => {
    function clone(value: unknown): unknown {
      if (value == null) return value;
      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return String(value);
      }
    }

    function globalEval<T>(expr: string, fallback: T): T {
      try {
        return (0, eval)(expr) as T;
      } catch {
        return fallback;
      }
    }

    function isHidden(element: Element | null): boolean {
      if (!element) return true;
      const html = element as HTMLElement;
      const style = getComputedStyle(html);
      return html.hidden
        || html.getAttribute('aria-hidden') === 'true'
        || style.display === 'none'
        || style.visibility === 'hidden';
    }

    function controlState(selector: string): DomControlState {
      const control = document.querySelector(selector) as HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null;
      if (!control) {
        return {
          selector,
          exists: false,
          hidden: null,
          disabled: null,
          focused: false,
          value: null,
          checked: null,
          reason: 'missing',
        };
      }
      const hidden = isHidden(control) || Boolean(control.closest('[hidden], [aria-hidden="true"]'));
      const disabled = Boolean((control as { disabled?: boolean }).disabled);
      return {
        selector,
        exists: true,
        hidden,
        disabled,
        focused: document.activeElement === control,
        value: 'value' in control ? String(control.value ?? '') : null,
        checked: 'checked' in control ? Boolean((control as HTMLInputElement).checked) : null,
        reason: hidden ? 'hidden' : (disabled ? 'disabled' : 'applicable'),
      };
    }

    function panelState(id: string) {
      const element = document.getElementById(id);
      if (!element) {
        return {
          id,
          hidden: true,
          inert: false,
          disabledControlCount: 0,
          enabledControlCount: 0,
        };
      }
      const controls = Array.from(element.querySelectorAll('button, input, select, textarea'));
      return {
        id,
        hidden: isHidden(element),
        inert: Boolean((element as HTMLElement & { inert?: boolean }).inert),
        disabledControlCount: controls.filter((control) => Boolean((control as { disabled?: boolean }).disabled)).length,
        enabledControlCount: controls.filter((control) => !Boolean((control as { disabled?: boolean }).disabled)).length,
      };
    }

    const bridgeHost = window.__DG_getPreviewBridgeHostContract?.();
    const frameTree = (window.getFrameTreeJson?.() ?? bridgeHost?.getFrameTreeJson?.() ?? null) as {
      layoutEngine?: string | null;
    } | null;
    const model = globalEval<Record<string, unknown> | null>('model', null);
    const selectedIds = globalEval<string[]>('[...selectedIds]', []);
    const activeElement = document.activeElement as HTMLElement | null;
    const savePayload = model && window.LayoutEngine?.previewShell?.createPreviewOverridePayload
      ? window.LayoutEngine.previewShell.createPreviewOverridePayload(model)
      : {
        overrides: clone(model?.overrides),
        grid_overrides: clone(model?.gridOverrides),
        layout_overrides: clone(model?.layoutOverrides),
        layout_operator_overrides: clone(model?.layoutOperatorOverrides),
        removed_ids: clone(Array.from((model?.removedIds as Set<string> | undefined) ?? [])),
      };

    return {
      label: stateLabel,
      url: location.href,
      activeTab: document.querySelector('#engine-switcher-tabs [aria-selected="true"]')?.getAttribute('data-engine-id') ?? null,
      renderIntent: clone(window.__DG_previewRenderIntent ?? null),
      frameTreeLayoutEngine: frameTree?.layoutEngine ?? null,
      layoutOperator: clone({
        activeOperatorKey: (model?.layoutOperatorOverrides as { activeOperatorKey?: unknown } | undefined)?.activeOperatorKey ?? null,
        byOperator: (model?.layoutOperatorOverrides as { byOperator?: unknown } | undefined)?.byOperator ?? null,
        layoutOverrides: model?.layoutOverrides ?? null,
        layoutOverrideNamespace: model?.layoutOverrideNamespace ?? null,
      }),
      renderedEngine: document.querySelector('#stage svg')?.getAttribute('data-layout-engine') ?? null,
      selection: {
        ids: selectedIds,
        domIds: Array.from(document.querySelectorAll('.dg-selected[data-component-id]'))
          .map((element) => element.getAttribute('data-component-id') || '')
          .filter(Boolean),
        type: selectedIds.length === 0 ? 'empty' : (selectedIds.length === 1 ? 'single' : 'multi'),
      },
      inspectorTarget: document.querySelector('#inspector [data-dg-cid]')?.getAttribute('data-dg-cid') ?? null,
      focusedControl: activeElement && activeElement !== document.body
        ? {
          id: activeElement.id || null,
          tagName: activeElement.tagName || null,
          dataset: { ...activeElement.dataset },
        }
        : null,
      controlApplicability: {
        engineTab: controlState('#engine-switcher-tabs [data-engine-id]'),
        engineOption: controlState('#layout-params-controls [data-dg-engine-layout-key], #layout-params-controls [data-elk-key]'),
        gridCols: controlState('#grid-cols'),
        gridRows: controlState('#grid-rows'),
        styleVariant: controlState('#inspector [data-dg-change-action="single-style"]'),
        save: controlState('#btn-save'),
        undo: controlState('#btn-undo'),
        redo: controlState('#btn-redo'),
      },
      dirty: window.PreviewSaveClient?.isDirty?.() ?? null,
      undo: {
        canUndo: window.__DG_TEST_preview?.canUndo?.() ?? null,
        canRedo: window.__DG_TEST_preview?.canRedo?.() ?? null,
      },
      visibleControls: [
        panelState('engine-switcher-section'),
        panelState('layout-params-section'),
        panelState('grid-controls-section'),
        panelState('inspector'),
      ],
      savePayload: clone(savePayload),
      reloadParse: {
        configSlug: window.__DG_CONFIG?.slug ?? null,
        documentKind: window.__DG_CONFIG?.document_kind ?? null,
        layoutEngine: window.__DG_CONFIG?.layout_engine ?? null,
      },
    };
  }, label);

  const vector = {
    ...state,
    bounds,
    boundsSignature: boundsSignature(bounds),
    violations: [],
  } as StateVector;

  const intentEngine = typeof (vector.renderIntent as { engineId?: unknown } | null)?.engineId === 'string'
    ? (vector.renderIntent as { engineId: string }).engineId
    : null;
  const agreement = [
    ['activeTab', vector.activeTab],
    ['renderIntent', intentEngine],
    ['frameTreeLayoutEngine', vector.frameTreeLayoutEngine],
    ['renderedEngine', vector.renderedEngine],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const uniqueEngines = new Set(agreement.map(([, value]) => value));
  if (uniqueEngines.size > 1) {
    vector.violations.push(`engine identity drift: ${agreement.map(([key, value]) => `${key}=${value}`).join(', ')}`);
  }
  if (vector.selection.type === 'single' && !vector.inspectorTarget) {
    vector.violations.push('single selection has no inspector target');
  }
  return vector;
}

async function runStep(
  page: Page,
  name: string,
  action: () => Promise<unknown>,
): Promise<EvidenceStep> {
  const before = await captureStateVector(page, `${name}:before`);
  try {
    const details = await action();
    await settle(page);
    const after = await captureStateVector(page, `${name}:after`);
    return {
      name,
      ok: true,
      before,
      after,
      details,
    };
  } catch (error) {
    const detailError = error as DetailError;
    return {
      name,
      ok: false,
      before,
      error: detailError.message ?? String(error),
      stack: detailError.stack,
      details: detailError.details,
    };
  }
}

async function switchEngineStep(page: Page): Promise<unknown> {
  const tabs = page.locator('#engine-switcher-tabs [data-engine-id]');
  const count = await tabs.count();
  if (count < 2) {
    return { skipped: true, reason: 'fewer than two engine tabs' };
  }
  const current = await page.locator('#engine-switcher-tabs [aria-selected="true"]').getAttribute('data-engine-id');
  let target: string | null = null;
  for (let index = 0; index < count; index += 1) {
    const engineId = await tabs.nth(index).getAttribute('data-engine-id');
    if (engineId && engineId !== current) {
      target = engineId;
      break;
    }
  }
  if (!target) {
    return { skipped: true, reason: 'no alternate engine tab' };
  }
  await page.locator(`#engine-switcher-tabs [data-engine-id="${target}"]`).click();
  await page.waitForFunction(
    (expected) => document.querySelector('#stage svg')?.getAttribute('data-layout-engine') === expected,
    target,
    { timeout: 20_000 },
  );
  return { target };
}

async function editEngineOptionStep(page: Page): Promise<unknown> {
  const control = page.locator('#layout-params-controls [data-dg-engine-layout-key], #layout-params-controls [data-elk-key]').first();
  if (await control.count() === 0) {
    return { skipped: true, reason: 'no engine option control' };
  }
  if (!(await control.isVisible()) || !(await control.isEnabled())) {
    return { skipped: true, reason: 'engine option control not interactable' };
  }
  const tagName = await control.evaluate((element) => element.tagName.toLowerCase());
  const type = await control.getAttribute('type');
  if (tagName === 'select') {
    const options = await control.locator('option').evaluateAll((nodes) => nodes.map((node) => (node as HTMLOptionElement).value));
    const current = await control.inputValue();
    const target = options.find((value) => value !== current);
    if (!target) {
      return { skipped: true, reason: 'select has no alternate option' };
    }
    await control.selectOption(target);
    return { kind: 'select', target };
  }
  if (type === 'checkbox') {
    const checked = await control.isChecked();
    if (checked) {
      await control.uncheck();
    } else {
      await control.check();
    }
    return { kind: 'checkbox', checked: !checked };
  }
  const current = Number.parseFloat(await control.inputValue());
  const next = Number.isFinite(current) ? String(current + 1) : '1';
  await control.fill(next);
  await control.press('Tab');
  return { kind: 'input', next };
}

async function irrelevantGridControlStep(page: Page): Promise<unknown> {
  const gridCols = page.locator('#grid-cols');
  if (await gridCols.count() === 0) {
    return { skipped: true, reason: 'grid control missing' };
  }
  return gridCols.evaluate((control) => {
    function clone(value: unknown): unknown {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return value == null ? value : String(value);
      }
    }

    function globalEval<T>(expr: string, fallback: T): T {
      try {
        return (0, eval)(expr) as T;
      } catch {
        return fallback;
      }
    }

    function payloadSignature(): string {
      const model = globalEval<Record<string, unknown> | null>('model', null);
      const payload = model && window.LayoutEngine?.previewShell?.createPreviewOverridePayload
        ? window.LayoutEngine.previewShell.createPreviewOverridePayload(model)
        : {
          overrides: clone(model?.overrides),
          gridOverrides: clone(model?.gridOverrides),
          layoutOverrides: clone(model?.layoutOverrides),
          layoutOperatorOverrides: clone(model?.layoutOperatorOverrides),
        };
      return JSON.stringify(payload);
    }

    const input = control as HTMLInputElement;
    const style = getComputedStyle(input);
    const visible = !(
      input.hidden
      || input.closest('[hidden], [aria-hidden="true"]')
      || style.display === 'none'
      || style.visibility === 'hidden'
    );
    const enabled = !input.disabled;
    const before = {
      dirty: window.PreviewSaveClient?.isDirty?.() ?? null,
      canUndo: window.__DG_TEST_preview?.canUndo?.() ?? null,
      canRedo: window.__DG_TEST_preview?.canRedo?.() ?? null,
      payload: payloadSignature(),
      value: input.value,
      visible,
      enabled,
    };
    const parsed = Number.parseInt(input.value || '', 10);
    input.value = String(Number.isFinite(parsed) ? parsed + 1 : 2);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const after = {
      dirty: window.PreviewSaveClient?.isDirty?.() ?? null,
      canUndo: window.__DG_TEST_preview?.canUndo?.() ?? null,
      canRedo: window.__DG_TEST_preview?.canRedo?.() ?? null,
      payload: payloadSignature(),
      value: input.value,
    };
    if (
      before.dirty !== after.dirty
      || before.canUndo !== after.canUndo
      || before.canRedo !== after.canRedo
      || before.payload !== after.payload
    ) {
      throw new Error(`stale grid control event mutated state: ${JSON.stringify({ before, after })}`);
    }
    return {
      attempted: true,
      staleDomEvent: true,
      visible,
      enabled,
      before,
      after,
    };
  });
}

async function selectFirstFrameStep(page: Page): Promise<unknown> {
  const target = page.locator(
    '#dg-frame-layer [data-component-id]:not([data-component-id="page"]):not([data-component-id="root"])',
  ).first();
  const count = await target.count();
  if (count === 0) {
    return { skipped: true, reason: 'no selectable frame' };
  }
  const id = await target.getAttribute('data-component-id');
  const box = await target.boundingBox();
  if (!box) {
    return { skipped: true, reason: 'selected frame has no bounding box', id };
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  return { id };
}

async function editStyleVariantStep(page: Page): Promise<unknown> {
  const select = page.locator('#inspector select[data-dg-change-action="single-style"]').first();
  if (await select.count() === 0) {
    return { skipped: true, reason: 'style variant select missing' };
  }
  if (!(await select.isVisible()) || !(await select.isEnabled())) {
    return { skipped: true, reason: 'style variant select not interactable' };
  }
  const options = await select.evaluate((node) => (
    Array.from((node as HTMLSelectElement).options).map((option) => option.value)
  ));
  const current = await select.inputValue();
  const preferred = current === 'default' ? 'section' : 'default';
  const target = options.includes(preferred)
    ? preferred
    : options.find((value) => value !== current);
  if (target === undefined) {
    return { skipped: true, reason: 'style variant select has no alternate option', current, options };
  }
  await select.selectOption(target);
  return { target };
}

async function undoRedoStep(page: Page): Promise<unknown> {
  const undo = page.locator('#btn-undo');
  const redo = page.locator('#btn-redo');
  const details: Record<string, unknown> = {};
  if (await undo.count() > 0 && await undo.isEnabled()) {
    await undo.click();
    await settle(page);
    details.undoClicked = true;
  } else {
    details.undoClicked = false;
  }
  if (await redo.count() > 0 && await redo.isEnabled()) {
    await redo.click();
    details.redoClicked = true;
  } else {
    details.redoClicked = false;
  }
  return details;
}

async function reloadStep(page: Page): Promise<unknown> {
  await page.reload({ waitUntil: 'domcontentloaded' });
  return { reloaded: true };
}

async function runCase(browser: Browser, slug: string): Promise<EvidenceCase> {
  const page = await openPreviewPage(browser, slug);
  const steps: EvidenceStep[] = [];
  try {
    steps.push({
      name: 'initial-state',
      ok: true,
      after: await captureStateVector(page, 'initial-state'),
    });

    if (slug === 'example-deployment-pipeline' || slug === 'mongo-octavia-ha') {
      steps.push(await runStep(page, 'engine-tab-switch', () => switchEngineStep(page)));
      steps.push(await runStep(page, 'engine-option-edit', () => editEngineOptionStep(page)));
      steps.push(await runStep(page, 'irrelevant-grid-control-attempt', () => irrelevantGridControlStep(page)));
    }

    if (slug === 'support-engineering-flow') {
      steps.push(await runStep(page, 'selection-inspector-bind', () => selectFirstFrameStep(page)));
      steps.push(await runStep(page, 'appearance-style-edit', () => editStyleVariantStep(page)));
      steps.push(await runStep(page, 'undo-redo-after-style-edit', () => undoRedoStep(page)));
    }

    if (slug === 'tiered-network-architecture') {
      steps.push(await runStep(page, 'reload-parse', () => reloadStep(page)));
    }

    return {
      slug,
      ok: steps.every((step) => step.ok),
      steps,
    };
  } finally {
    await page.close();
  }
}

async function main(): Promise<void> {
  const fixtureHashesBefore = readFixtureHashes();
  let fixtureHashesAfter: FixtureHash[] = [];
  const result: EvidenceResult = {
    ok: false,
    baseUrl,
    generatedAt: new Date().toISOString(),
    fixtureHashesBefore,
    fixtureHashesAfter,
    notes: [
      'Baseline evidence only: drift is recorded in state-vector violations and follow-up tasks decide whether it is expected, equivalent geometry, or a product defect.',
      'The probe uses real browser gestures for mutation attempts and read-only page evaluation for state capture.',
      'Authored frame YAML hashes are checked before and after the run; this script must not mutate scripts/diagrams/frames/*.yaml.',
    ],
    cases: [],
  };

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch();
    for (const slug of fixtureSlugs) {
      result.cases.push(await runCase(browser, slug));
    }
    fixtureHashesAfter = readFixtureHashes();
    assertFixtureHashesUnchanged(fixtureHashesBefore, fixtureHashesAfter);
    result.fixtureHashesAfter = fixtureHashesAfter;
    result.ok = result.cases.every((entry) => entry.ok);
  } catch (error) {
    const detailError = error as DetailError;
    result.notes.push(`Probe failed: ${detailError.message ?? String(error)}`);
    if (detailError.details) {
      result.notes.push(`Failure details: ${JSON.stringify(detailError.details)}`);
    }
    fixtureHashesAfter = readFixtureHashes();
    result.fixtureHashesAfter = fixtureHashesAfter;
    result.ok = false;
  } finally {
    await browser?.close();
    if (result.fixtureHashesAfter.length === 0) {
      result.fixtureHashesAfter = readFixtureHashes();
    }
    writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    if (!result.ok) {
      process.exitCode = 1;
    }
  }
}

await main();
