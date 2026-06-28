import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const baseUrl = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:8100';
const here = dirname(fileURLToPath(import.meta.url));
const outputPath = process.env.SPEC057_RESULT_JSON
  || join(here, 'fidelity-browser-result.json');

async function openDiagram(page, slug) {
  await page.goto(`${baseUrl}/view/v3:${slug}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#stage svg').waitFor({ timeout: 15_000 });
}

function rectSummary(rect) {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
  };
}

async function componentRect(page, id) {
  return page.evaluate((componentId) => {
    const node = document.querySelector(`[data-component-id="${componentId}"]`);
    if (!node) {
      return null;
    }
    const rect = node.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
    };
  }, id);
}

function assertInside(parent, child, label) {
  if (!parent || !child) {
    throw new Error(`${label}: missing bounds`);
  }
  if (
    child.width <= 0
    || child.height <= 0
    || child.x < parent.x
    || child.y < parent.y
    || child.right > parent.right
    || child.bottom > parent.bottom
  ) {
    throw new Error(`${label}: child is outside parent`);
  }
}

async function assertMongoCompounds(page) {
  const slug = 'mongo-octavia-ha';
  await openDiagram(page, slug);
  const engine = await page.locator('#stage svg').getAttribute('data-layout-engine');
  if (engine !== 'elk-layered') {
    throw new Error(`${slug}: expected elk-layered render, got ${engine || '<missing>'}`);
  }
  const availabilityZones = await componentRect(page, 'availability_zones');
  const zones = [];
  for (const zoneId of ['az1', 'az2', 'az3']) {
    const zone = await componentRect(page, zoneId);
    const vm = await componentRect(page, `vm_${zoneId}`);
    const label = await componentRect(page, `${zoneId}_label`);
    assertInside(availabilityZones, zone, zoneId);
    assertInside(zone, vm, `vm_${zoneId}`);
    assertInside(zone, label, `${zoneId}_label`);
    if (label.y < vm.bottom) {
      throw new Error(`${zoneId}: label overlaps or floats above VM box`);
    }
    zones.push({
      zoneId,
      zone: rectSummary(zone),
      vm: rectSummary(vm),
      label: rectSummary(label),
    });
  }
  return {
    slug,
    engine,
    availabilityZones: rectSummary(availabilityZones),
    zones,
  };
}

async function assertTieredExposure(page) {
  const slug = 'tiered-network-architecture.author-v1';
  await openDiagram(page, slug);
  const engine = await page.locator('#stage svg').getAttribute('data-layout-engine');
  if (engine !== 'v3') {
    throw new Error(`${slug}: expected unsupported authored ELK to render via v3, got ${engine || '<missing>'}`);
  }
  const tabIds = await page.locator('#engine-switcher-tabs [data-engine-id]').evaluateAll((nodes) => (
    nodes.map((node) => node.getAttribute('data-engine-id')).filter(Boolean)
  ));
  const exposedElk = tabIds.filter((id) => id.startsWith('elk-'));
  if (exposedElk.length > 0) {
    throw new Error(`${slug}: unsupported ELK tabs exposed: ${exposedElk.join(', ')}`);
  }
  return {
    slug,
    engine,
    tabIds,
  };
}

const browser = await chromium.launch();
const page = await browser.newPage();
const result = {
  startedAt: new Date().toISOString(),
  baseUrl,
  checks: [],
};

try {
  result.checks.push(await assertMongoCompounds(page));
  result.checks.push(await assertTieredExposure(page));
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
