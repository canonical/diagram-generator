import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:8100';
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');
const outputPath = process.env.SPEC058_RESULT_JSON
  || join(here, 'layer-tree-inspector-browser-result.json');
const browserBundlePath = join(
  repoRoot,
  'packages',
  'layout-engine',
  'dist',
  'layout-engine.iife.js',
);

async function assertTypedTreeDomKeyboard(page) {
  await page.goto('about:blank');
  await page.setContent('<!doctype html><html><body><div id="tree"></div></body></html>');
  await page.addScriptTag({ path: browserBundlePath });
  const result = await page.evaluate(() => {
    const container = document.getElementById('tree');
    const calls = [];
    window.LayoutEngine.previewShell.scene.renderPreviewTreePanel({
      container,
      nodes: [
        { id: 'alpha' },
        { id: 'beta' },
        { id: 'gamma' },
      ],
      overrides: {},
      selectedIds: ['alpha'],
      onSelect(id, additive) {
        calls.push({
          id,
          additive,
          activeElementId: document.activeElement?.getAttribute('data-node-id') || null,
        });
      },
      onContextMenu() {},
    });

    const rows = Array.from(container.querySelectorAll('.tree-item[data-node-id]'));
    rows[0].focus();
    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    rows[0].dispatchEvent(enter);
    const activeAfterEnter = document.activeElement?.getAttribute('data-node-id') || null;
    const shiftEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.activeElement.dispatchEvent(shiftEnter);

    return {
      calls,
      activeAfterEnter,
      activeAfterShiftEnter: document.activeElement?.getAttribute('data-node-id') || null,
      tabIndexes: rows.map((row) => ({
        id: row.getAttribute('data-node-id'),
        tabIndex: row.tabIndex,
      })),
      enterDefaultPrevented: enter.defaultPrevented,
      shiftEnterDefaultPrevented: shiftEnter.defaultPrevented,
    };
  });

  const expectedCalls = [
    { id: 'beta', additive: false, activeElementId: 'beta' },
    { id: 'alpha', additive: false, activeElementId: 'alpha' },
  ];
  if (JSON.stringify(result.calls) !== JSON.stringify(expectedCalls)) {
    throw new Error(`typed DOM keyboard calls mismatch: ${JSON.stringify(result.calls)}`);
  }
  if (
    result.activeAfterEnter !== 'beta'
    || result.activeAfterShiftEnter !== 'alpha'
    || !result.enterDefaultPrevented
    || !result.shiftEnterDefaultPrevented
    || result.tabIndexes.find((row) => row.id === 'alpha')?.tabIndex !== 0
    || result.tabIndexes.find((row) => row.id === 'beta')?.tabIndex !== -1
  ) {
    throw new Error(`typed DOM keyboard state mismatch: ${JSON.stringify(result)}`);
  }
  return result;
}

async function openDeepNesting(page) {
  await page.goto(`${baseUrl}/view/v3:test-deep-nesting`, { waitUntil: 'domcontentloaded' });
  await page.locator('#stage svg').waitFor({ timeout: 15_000 });
  await page.locator('#nav-tab-layers').click();
  await page.locator('#tree .tree-item[data-node-id="vm_2"]').waitFor({ timeout: 15_000 });
}

async function assertDeepNestingBrowserBehavior(page) {
  await openDeepNesting(page);

  await page.locator('#tree .tree-item[data-node-id="vm_2"]').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    return document.querySelector('#tree .tree-item.selected')?.getAttribute('data-node-id') === 'vm_3'
      && document.activeElement?.getAttribute('data-node-id') === 'vm_3';
  }, null, { timeout: 15_000 });

  await page.keyboard.press('Shift+Enter');
  await page.waitForFunction(() => {
    return document.querySelector('#tree .tree-item.selected')?.getAttribute('data-node-id') === 'vm_2'
      && document.activeElement?.getAttribute('data-node-id') === 'vm_2';
  }, null, { timeout: 15_000 });

  const result = await page.evaluate(() => {
    const selectedRow = document.querySelector('#tree .tree-item.selected');
    const styleSelect = document.querySelector('#inspector [data-dg-change-action="single-style"]');
    const inspectorText = document.querySelector('#inspector')?.textContent || '';
    return {
      selectedNodeId: selectedRow?.getAttribute('data-node-id') || null,
      activeElementId: document.activeElement?.getAttribute('data-node-id') || null,
      styleSelectValue: styleSelect?.value || null,
      inspectorText,
      hasUnknownVariant: /Unknown variant/i.test(inspectorText),
    };
  });

  if (
    result.selectedNodeId !== 'vm_2'
    || result.activeElementId !== 'vm_2'
    || result.styleSelectValue !== 'default'
    || result.hasUnknownVariant
  ) {
    throw new Error(`test-deep-nesting browser check failed: ${JSON.stringify(result)}`);
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
    name: 'typed-tree-dom-keyboard',
    ...(await assertTypedTreeDomKeyboard(page)),
  });
  result.checks.push({
    name: 'test-deep-nesting-layer-tree-and-inspector',
    ...(await assertDeepNestingBrowserBehavior(page)),
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
