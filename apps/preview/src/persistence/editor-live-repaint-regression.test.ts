import test from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";

const REPO_ROOT = path.resolve(process.cwd(), "..", "..");
const APP_ROOT = path.join(REPO_ROOT, "apps", "preview");
const FRAME_SOURCE_DIR = path.join(REPO_ROOT, "scripts", "diagrams", "frames");
const TSX_CLI = path.join(APP_ROOT, "node_modules", "tsx", "dist", "cli.mjs");

function copyFixtureFrames(slugs: readonly string[]): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dg-preview-frames-"));
  for (const slug of slugs) {
    fs.copyFileSync(
      path.join(FRAME_SOURCE_DIR, `${slug}.yaml`),
      path.join(tempDir, `${slug}.yaml`),
    );
  }
  return tempDir;
}

async function allocatePort(): Promise<number> {
  const net = await import("node:net");
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate preview test port")));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

function startPreviewServer(framesDir: string, port: number): {
  process: ChildProcessWithoutNullStreams;
  ready: Promise<void>;
  output: { stdout: string; stderr: string };
} {
  const child = spawn(process.execPath, [TSX_CLI, path.join(APP_ROOT, "src", "server.ts"), "--port", String(port)], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      DG_FRAMES_DIR: framesDir,
      DG_PREVIEW_PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = { stdout: "", stderr: "" };
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    output.stdout += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    output.stderr += chunk;
  });
  const ready = waitForServer(`http://127.0.0.1:${port}`, child, output);
  return { process: child, ready, output };
}

async function waitForServer(
  baseUrl: string,
  child: ChildProcessWithoutNullStreams,
  output: { stdout: string; stderr: string },
): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Preview server exited early (${child.exitCode}).\n${output.stderr || output.stdout}`);
    }
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the server is ready or exits.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  child.kill();
  throw new Error(`Timed out waiting for preview server.\n${output.stderr || output.stdout}`);
}

async function stopPreviewServer(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null) {
    return;
  }
  child.kill();
  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
    setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
      resolve();
    }, 5_000);
  });
}

async function settle(page: Page): Promise<void> {
  await page.locator("#stage svg").waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
}

async function openPreviewPage(browser: Browser, baseUrl: string, slug: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${baseUrl}/view/v3:${slug}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await settle(page);
  return page;
}

async function boundsSignature(page: Page): Promise<string> {
  return page.locator("#dg-frame-layer [data-component-id]").evaluateAll((elements) => JSON.stringify(
    elements
      .map((element) => {
        const box = (element as SVGGraphicsElement).getBBox();
        return {
          id: element.getAttribute("data-component-id") ?? "",
          x: Math.round(box.x * 1000) / 1000,
          y: Math.round(box.y * 1000) / 1000,
          w: Math.round(box.width * 1000) / 1000,
          h: Math.round(box.height * 1000) / 1000,
        };
      })
      .filter((entry) => entry.id && entry.w > 0 && entry.h > 0)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((entry) => [entry.id, entry.x, entry.y, entry.w, entry.h]),
  ));
}

async function selectFirstFrame(page: Page): Promise<string> {
  const target = page.locator(
    '#dg-frame-layer [data-component-id]:not([data-component-id="page"]):not([data-component-id="root"])',
  ).first();
  const id = await target.getAttribute("data-component-id");
  assert.ok(id, "expected a selectable frame");
  const box = await target.boundingBox();
  assert.ok(box, `expected bounding box for ${id}`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await settle(page);
  return id;
}

async function selectedSvgFragment(page: Page, componentId: string): Promise<string> {
  return page.locator(`#dg-frame-layer [data-component-id="${componentId}"]`).evaluate((element) => element.outerHTML);
}

async function frameLayerMarkup(page: Page): Promise<string> {
  return page.locator("#dg-frame-layer").evaluate((element) => element.outerHTML);
}

async function renderedEngine(page: Page): Promise<string | null> {
  return page.locator("#stage svg").getAttribute("data-layout-engine");
}

async function activeOptionBucket(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const previewWindow = window as Window & typeof globalThis & {
      EditorState?: {
        captureSnapshot?: () => {
          ep?: {
            activeOperatorKey?: string | null;
          };
        };
      } | null;
    };
    return previewWindow.EditorState?.captureSnapshot?.()?.ep?.activeOperatorKey ?? null;
  });
}

async function captureLayoutOperatorBrowserState(page: Page): Promise<{
  activeOperatorKey: string | null;
  activeLayoutOverrides: Record<string, unknown>;
  byOperator: Record<string, Record<string, unknown>>;
  renderIntentEngineId: string | null;
  renderIntentOverrides: Record<string, unknown>;
}> {
  return page.evaluate(() => {
    const previewWindow = window as Window & typeof globalThis & {
      EditorState?: {
        captureSnapshot?: () => {
          e?: Record<string, unknown>;
          ep?: {
            activeOperatorKey?: string | null;
            byOperator?: Record<string, Record<string, unknown>>;
          };
        };
      } | null;
      __DG_previewRenderIntent?: {
        engineId?: string | null;
        engineOverrides?: Record<string, unknown> | null;
      } | null;
    };
    const snapshot = previewWindow.EditorState?.captureSnapshot?.() ?? {};
    const layoutOperatorState = snapshot.ep ?? {};
    return {
      activeOperatorKey: layoutOperatorState.activeOperatorKey ?? null,
      activeLayoutOverrides: { ...(snapshot.e ?? {}) },
      byOperator: Object.fromEntries(
        Object.entries(layoutOperatorState.byOperator ?? {}).map(([key, value]) => [key, { ...value }]),
      ),
      renderIntentEngineId: previewWindow.__DG_previewRenderIntent?.engineId ?? null,
      renderIntentOverrides: { ...(previewWindow.__DG_previewRenderIntent?.engineOverrides ?? {}) },
    };
  });
}

async function fittedViewBox(page: Page): Promise<string> {
  const viewBox = await page.locator("#stage svg").getAttribute("viewBox");
  assert.ok(viewBox, "expected the rendered stage to expose a fitted viewBox");
  return viewBox.trim().replace(/\s+/g, " ");
}

async function currentEngineTabs(page: Page): Promise<string[]> {
  return page.locator("#engine-switcher-tabs [data-engine-id]").evaluateAll((elements) => (
    elements
      .map((element) => element.getAttribute("data-engine-id") ?? "")
      .filter((engineId) => engineId.length > 0)
  ));
}

async function selectedEngineId(page: Page): Promise<string | null> {
  return page.locator('#engine-switcher-tabs [aria-selected="true"]').getAttribute("data-engine-id");
}

async function selectEngine(page: Page, engineId: string): Promise<void> {
  if ((await selectedEngineId(page)) === engineId) {
    return;
  }
  await page.locator(`#engine-switcher-tabs [data-engine-id="${engineId}"]`).click();
  await page.waitForFunction(
    (expected) => document.querySelector("#stage svg")?.getAttribute("data-layout-engine") === expected,
    engineId,
    { timeout: 20_000 },
  );
  await settle(page);
}

async function firstVisibleLayoutControlId(page: Page): Promise<string> {
  const controlId = await page.evaluate(() => {
    const controls = Array.from(
      document.querySelectorAll<HTMLElement>(
        '#layout-params-section [data-dg-engine-layout-key], #layout-params-section [data-elk-key]',
      ),
    );
    const control = controls.find((element) => {
      const disabled = "disabled" in element && Boolean((element as HTMLInputElement | HTMLSelectElement).disabled);
      return !disabled && element.offsetParent !== null && typeof element.id === "string" && element.id.length > 0;
    });
    return control?.id ?? null;
  });
  assert.ok(controlId, "expected a visible enabled engine layout control");
  return controlId;
}

async function firstVisibleLayoutControlForPrefix(page: Page, prefix: string): Promise<{
  id: string;
  key: string;
}> {
  const control = await page.evaluate((desiredPrefix) => {
    const controls = Array.from(
      document.querySelectorAll<HTMLElement>(
        '#layout-params-section [data-dg-engine-layout-key], #layout-params-section [data-elk-key]',
      ),
    );
    const match = controls.find((element) => {
      const disabled = "disabled" in element && Boolean((element as HTMLInputElement | HTMLSelectElement).disabled);
      const layoutKey = element.dataset.dgEngineLayoutKey ?? element.dataset.elkKey ?? "";
      return !disabled
        && element.offsetParent !== null
        && typeof element.id === "string"
        && element.id.length > 0
        && layoutKey.startsWith(desiredPrefix);
    });
    if (!match) {
      return null;
    }
    return {
      id: match.id,
      key: match.dataset.dgEngineLayoutKey ?? match.dataset.elkKey ?? "",
    };
  }, prefix);
  assert.ok(control, `expected a visible enabled layout control for prefix ${prefix}`);
  return control;
}

async function hasVisibleLayoutControls(page: Page): Promise<boolean> {
  return page.evaluate(() => Array.from(
    document.querySelectorAll<HTMLElement>(
      '#layout-params-section [data-dg-engine-layout-key], #layout-params-section [data-elk-key]',
    ),
  ).some((element) => {
    const disabled = "disabled" in element && Boolean((element as HTMLInputElement | HTMLSelectElement).disabled);
    return !disabled && element.offsetParent !== null;
  }));
}

async function chooseTargetEngineWithLayoutControls(page: Page): Promise<string> {
  const available = await currentEngineTabs(page);
  assert.ok(available.length >= 2, "expected at least two compatible engine tabs");
  const preferredOrder = ["dagre", "elk-layered", "elk-force", "elk-radial", "elk-stress", "elk-mrtree", "elk-rectpacking"];
  const candidates = [...preferredOrder, ...available];
  const attempted = new Set<string>();

  for (const candidate of candidates) {
    if (!available.includes(candidate) || attempted.has(candidate)) {
      continue;
    }
    attempted.add(candidate);
    await selectEngine(page, candidate);
    if (await hasVisibleLayoutControls(page)) {
      return candidate;
    }
  }

  throw new Error("No compatible engine with surfaced layout controls was found");
}

async function mutateAndRestoreFirstLayoutControl(page: Page): Promise<void> {
  const controlId = await firstVisibleLayoutControlId(page);
  const control = page.locator(`#${controlId}`);
  const descriptor = await control.evaluate((element) => {
    if (element instanceof HTMLSelectElement) {
      return {
        tagName: "select",
        value: element.value,
        options: Array.from(element.options).map((option) => option.value),
      };
    }
    if (element instanceof HTMLInputElement) {
      return {
        tagName: "input",
        type: element.type || "text",
        value: element.type === "checkbox" ? String(element.checked) : element.value,
        step: element.step,
        min: element.min,
        max: element.max,
      };
    }
    throw new Error(`Unsupported layout control tag ${(element as HTMLElement).tagName}`);
  });

  if (descriptor.tagName === "select") {
    const alternate = descriptor.options.find((value) => value && value !== descriptor.value);
    assert.ok(alternate, `expected an alternate option for layout control ${controlId}`);
    await control.selectOption(alternate);
    await settle(page);
    await control.selectOption(descriptor.value);
    await settle(page);
    return;
  }

  if (descriptor.type === "checkbox") {
    const original = descriptor.value === "true";
    await control.evaluate((element, checked) => {
      const input = element as HTMLInputElement;
      input.checked = checked as boolean;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, !original);
    await settle(page);
    await control.evaluate((element, checked) => {
      const input = element as HTMLInputElement;
      input.checked = checked as boolean;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, original);
    await settle(page);
    return;
  }

  const original = Number(descriptor.value);
  assert.ok(Number.isFinite(original), `expected numeric layout control ${controlId}`);
  const step = Number(descriptor.step || "1") || 1;
  const min = descriptor.min ? Number(descriptor.min) : Number.NEGATIVE_INFINITY;
  const max = descriptor.max ? Number(descriptor.max) : Number.POSITIVE_INFINITY;
  let alternate = original + step;
  if (alternate > max || !Number.isFinite(alternate)) {
    alternate = original - step;
  }
  if (alternate < min || alternate === original || !Number.isFinite(alternate)) {
    alternate = original + 1;
  }
  if (alternate > max || alternate < min || alternate === original) {
    throw new Error(`Unable to derive alternate numeric value for layout control ${controlId}`);
  }
  const writeValue = async (nextValue: number) => {
    await control.evaluate((element, value) => {
      const input = element as HTMLInputElement;
      input.value = String(value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, nextValue);
  };
  await writeValue(alternate);
  await settle(page);
  await writeValue(original);
  await settle(page);
}

async function mutateLayoutControlAndKeepValue(page: Page, controlId: string): Promise<void> {
  const control = page.locator(`#${controlId}`);
  const descriptor = await control.evaluate((element) => {
    if (element instanceof HTMLSelectElement) {
      return {
        tagName: "select",
        value: element.value,
        options: Array.from(element.options).map((option) => option.value),
      };
    }
    if (element instanceof HTMLInputElement) {
      return {
        tagName: "input",
        type: element.type || "text",
        value: element.type === "checkbox" ? String(element.checked) : element.value,
        step: element.step,
        min: element.min,
        max: element.max,
      };
    }
    throw new Error(`Unsupported layout control tag ${(element as HTMLElement).tagName}`);
  });

  if (descriptor.tagName === "select") {
    const alternate = descriptor.options.find((value) => value && value !== descriptor.value);
    assert.ok(alternate, `expected an alternate option for layout control ${controlId}`);
    await control.selectOption(alternate);
    await settle(page);
    return;
  }

  if (descriptor.type === "checkbox") {
    const original = descriptor.value === "true";
    await control.evaluate((element, checked) => {
      const input = element as HTMLInputElement;
      input.checked = checked as boolean;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, !original);
    await settle(page);
    return;
  }

  const original = Number(descriptor.value);
  assert.ok(Number.isFinite(original), `expected numeric layout control ${controlId}`);
  const step = Number(descriptor.step || "1") || 1;
  const min = descriptor.min ? Number(descriptor.min) : Number.NEGATIVE_INFINITY;
  const max = descriptor.max ? Number(descriptor.max) : Number.POSITIVE_INFINITY;
  let alternate = original + step;
  if (alternate > max || !Number.isFinite(alternate)) {
    alternate = original - step;
  }
  if (alternate < min || alternate === original || !Number.isFinite(alternate)) {
    alternate = original + 1;
  }
  if (alternate > max || alternate < min || alternate === original) {
    throw new Error(`Unable to derive alternate numeric value for layout control ${controlId}`);
  }
  await control.evaluate((element, value) => {
    const input = element as HTMLInputElement;
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, alternate);
  await settle(page);
}

async function triggerSaveReload(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const previewWindow = window as Window & typeof globalThis & {
      PreviewSaveClient?: {
        saveOverrides?: (() => Promise<void>) | null;
      } | null;
    };
    const saveOverrides = previewWindow.PreviewSaveClient?.saveOverrides;
    if (typeof saveOverrides !== "function") {
      throw new Error("PreviewSaveClient.saveOverrides is unavailable");
    }
    await saveOverrides();
  });
  await settle(page);
}

async function alternateEngineId(page: Page): Promise<string> {
  const tabs = page.locator("#engine-switcher-tabs [data-engine-id]");
  const count = await tabs.count();
  assert.ok(count >= 2, "expected at least two engine tabs");
  const current = await page.locator('#engine-switcher-tabs [aria-selected="true"]').getAttribute("data-engine-id");
  for (let index = 0; index < count; index += 1) {
    const engineId = await tabs.nth(index).getAttribute("data-engine-id");
    if (engineId && engineId !== current) {
      return engineId;
    }
  }
  throw new Error("No alternate engine tab found");
}

async function collectCanvasParityViewBoxes(page: Page): Promise<{
  targetEngine: string;
  load: string;
  saveReload: string;
  tabSwitch: string;
  paramEdit: string;
  containerResize: string;
}> {
  const targetEngine = await chooseTargetEngineWithLayoutControls(page);
  const load = await fittedViewBox(page);
  const alternateEngine = (await currentEngineTabs(page)).find((engineId) => engineId !== targetEngine);
  assert.ok(alternateEngine, "expected an alternate engine for the parity switch check");

  await selectEngine(page, alternateEngine);
  await selectEngine(page, targetEngine);
  const tabSwitch = await fittedViewBox(page);

  await mutateAndRestoreFirstLayoutControl(page);
  const paramEdit = await fittedViewBox(page);

  await page.setViewportSize({ width: 1180, height: 900 });
  await settle(page);
  const containerResize = await fittedViewBox(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await settle(page);

  await triggerSaveReload(page);
  const saveReload = await fittedViewBox(page);
  assert.equal(await renderedEngine(page), targetEngine, "save→reload should preserve the selected engine");

  return {
    targetEngine,
    load,
    saveReload,
    tabSwitch,
    paramEdit,
    containerResize,
  };
}

async function chooseAlternateStyleVariant(page: Page): Promise<string> {
  const select = page.locator('#inspector select[data-dg-change-action="single-style"]').first();
  await select.waitFor({ state: "visible", timeout: 30_000 });
  const options = await select.evaluate((node) => (
    Array.from((node as HTMLSelectElement).options).map((option) => option.value)
  ));
  const current = await select.inputValue();
  const preferredOrder = ["parent", "highlight", "annotation", "section", "default"];
  const target = preferredOrder.find((value) => value !== current && options.includes(value))
    ?? options.find((value) => value !== current);
  assert.ok(target, "expected an alternate style variant");
  await select.selectOption(target);
  await settle(page);
  return target;
}

test("preview gestures repaint the live stage for engine tabs and appearance-only role changes", { timeout: 120_000 }, async () => {
  const framesDir = copyFixtureFrames(["mongo-octavia-ha"]);
  const port = await allocatePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = startPreviewServer(framesDir, port);
  const browser = await chromium.launch();

  try {
    await server.ready;

    const enginePage = await openPreviewPage(browser, baseUrl, "mongo-octavia-ha");
    try {
      const beforeSignature = await boundsSignature(enginePage);
      const beforeEngine = await renderedEngine(enginePage);
      const targetEngine = await alternateEngineId(enginePage);

      await enginePage.locator(`#engine-switcher-tabs [data-engine-id="${targetEngine}"]`).click();
      await enginePage.waitForFunction(
        (expected) => document.querySelector("#stage svg")?.getAttribute("data-layout-engine") === expected,
        targetEngine,
        { timeout: 20_000 },
      );
      await settle(enginePage);

      const afterSignature = await boundsSignature(enginePage);
      const afterEngine = await renderedEngine(enginePage);

      assert.notEqual(afterEngine, beforeEngine, "engine switch should repaint with the selected engine");
      assert.equal(afterEngine, targetEngine, "rendered engine should match the selected tab");
      assert.notEqual(afterSignature, beforeSignature, "engine switch should change visible stage geometry for this fixture");
    } finally {
      await enginePage.close();
    }

    const appearancePage = await openPreviewPage(browser, baseUrl, "mongo-octavia-ha");
    try {
      const selectedId = await selectFirstFrame(appearancePage);
      const beforeMarkup = await frameLayerMarkup(appearancePage);
      const beforeFragment = await selectedSvgFragment(appearancePage, selectedId);
      const beforeEngine = await renderedEngine(appearancePage);

      await chooseAlternateStyleVariant(appearancePage);

      const afterMarkup = await frameLayerMarkup(appearancePage);
      const afterFragment = await selectedSvgFragment(appearancePage, selectedId);
      const afterEngine = await renderedEngine(appearancePage);

      assert.equal(afterEngine, beforeEngine, "appearance-only role change should not switch engines");
      assert.notEqual(afterMarkup, beforeMarkup, "appearance-only role change should repaint the live frame layer");
      assert.notEqual(afterFragment, beforeFragment, "appearance-only role change should repaint the selected SVG fragment");
    } finally {
      await appearancePage.close();
    }
  } finally {
    await browser.close();
    await stopPreviewServer(server.process);
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
});

test("engine tab switches classify visible changes while syncing engine and option-bucket state", { timeout: 120_000 }, async () => {
  const framesDir = copyFixtureFrames(["support-engineering-flow"]);
  const port = await allocatePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = startPreviewServer(framesDir, port);
  const browser = await chromium.launch();

  try {
    await server.ready;

    const page = await openPreviewPage(browser, baseUrl, "support-engineering-flow");
    try {
      const beforeSignature = await boundsSignature(page);
      const beforeEngine = await renderedEngine(page);
      const beforeBucket = await activeOptionBucket(page);
      const targetEngine = beforeEngine === "elk-layered" ? await alternateEngineId(page) : "elk-layered";

      await page.locator(`#engine-switcher-tabs [data-engine-id="${targetEngine}"]`).click();
      await page.waitForFunction(
        (expected) => document.querySelector("#stage svg")?.getAttribute("data-layout-engine") === expected,
        targetEngine,
        { timeout: 20_000 },
      );
      await settle(page);

      const afterSignature = await boundsSignature(page);
      const afterEngine = await renderedEngine(page);
      const afterBucket = await activeOptionBucket(page);
      const classification = beforeSignature === afterSignature
        ? "equivalent-geometry"
        : "distinct-geometry";

      assert.notEqual(afterEngine, beforeEngine, "engine switch should commit a different rendered engine");
      assert.equal(afterEngine, targetEngine, "rendered engine should match the selected tab");
      assert.equal(afterBucket, targetEngine, "active option bucket should sync to the selected engine");
      assert.notEqual(afterBucket, beforeBucket, "active option bucket should change with the selected engine");
      assert.ok(
        classification === "distinct-geometry" || classification === "equivalent-geometry",
        "engine switch classification should be explicit",
      );
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
    await stopPreviewServer(server.process);
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
});

test("phase 1 canvas parity holds across load, save→reload, engine-tab switch, param edit, and container resize", { timeout: 180_000 }, async () => {
  const slugs = ["example-deployment-pipeline", "mongo-octavia-ha", "support-engineering-flow"] as const;
  const framesDir = copyFixtureFrames(slugs);
  const port = await allocatePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = startPreviewServer(framesDir, port);
  const browser = await chromium.launch();

  try {
    await server.ready;

    for (const slug of slugs) {
      const page = await openPreviewPage(browser, baseUrl, slug);
      try {
        const parity = await collectCanvasParityViewBoxes(page);
        const expected = parity.load;
        assert.equal(parity.saveReload, expected, `${slug}: save→reload should preserve the fitted viewBox for ${parity.targetEngine}`);
        assert.equal(parity.tabSwitch, expected, `${slug}: engine-tab switch should preserve the fitted viewBox for ${parity.targetEngine}`);
        assert.equal(parity.paramEdit, expected, `${slug}: param edit round-trip should preserve the fitted viewBox for ${parity.targetEngine}`);
        assert.equal(parity.containerResize, expected, `${slug}: container resize should preserve the fitted viewBox for ${parity.targetEngine}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await stopPreviewServer(server.process);
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
});

test("engine-specific layout buckets stay isolated across layered, radial, and dagre browser switches", { timeout: 120_000 }, async () => {
  const framesDir = copyFixtureFrames(["example-deployment-pipeline"]);
  const port = await allocatePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = startPreviewServer(framesDir, port);
  const browser = await chromium.launch();

  try {
    await server.ready;

    const page = await openPreviewPage(browser, baseUrl, "example-deployment-pipeline");
    try {
      const engineTabs = await currentEngineTabs(page);
      assert.ok(engineTabs.includes("elk-layered"), "expected elk-layered engine tab");
      assert.ok(engineTabs.includes("elk-radial"), "expected elk-radial engine tab");
      assert.ok(engineTabs.includes("dagre"), "expected dagre engine tab");

      await selectEngine(page, "elk-layered");
      const layeredControl = await firstVisibleLayoutControlForPrefix(page, "elk.layered.");
      await mutateLayoutControlAndKeepValue(page, layeredControl.id);
      const layeredState = await captureLayoutOperatorBrowserState(page);

      assert.equal(layeredState.activeOperatorKey, "elk-layered");
      assert.equal(layeredState.renderIntentEngineId, "elk-layered");
      assert.deepEqual(layeredState.activeLayoutOverrides, layeredState.byOperator["elk-layered"] ?? {});
      assert.ok(layeredControl.key in layeredState.activeLayoutOverrides);

      await selectEngine(page, "elk-radial");
      const radialControl = await firstVisibleLayoutControlForPrefix(page, "elk.radial.");
      await mutateLayoutControlAndKeepValue(page, radialControl.id);
      const radialState = await captureLayoutOperatorBrowserState(page);

      assert.equal(radialState.activeOperatorKey, "elk-radial");
      assert.equal(radialState.renderIntentEngineId, "elk-radial");
      assert.deepEqual(radialState.activeLayoutOverrides, radialState.byOperator["elk-radial"] ?? {});
      assert.ok(radialControl.key in radialState.activeLayoutOverrides);
      assert.equal(radialState.activeLayoutOverrides[layeredControl.key], undefined);
      assert.deepEqual(radialState.byOperator["elk-layered"], layeredState.byOperator["elk-layered"]);

      await selectEngine(page, "elk-layered");
      const layeredReturnState = await captureLayoutOperatorBrowserState(page);

      assert.equal(layeredReturnState.activeOperatorKey, "elk-layered");
      assert.deepEqual(layeredReturnState.activeLayoutOverrides, layeredState.byOperator["elk-layered"] ?? {});
      assert.equal(layeredReturnState.activeLayoutOverrides[radialControl.key], undefined);

      await selectEngine(page, "dagre");
      const dagreControl = await firstVisibleLayoutControlForPrefix(page, "dagre.");
      await mutateLayoutControlAndKeepValue(page, dagreControl.id);
      const dagreState = await captureLayoutOperatorBrowserState(page);

      assert.equal(dagreState.activeOperatorKey, "dagre");
      assert.equal(dagreState.renderIntentEngineId, "dagre");
      assert.deepEqual(dagreState.activeLayoutOverrides, dagreState.byOperator.dagre ?? {});
      assert.ok(dagreControl.key in dagreState.activeLayoutOverrides);
      assert.equal(dagreState.activeLayoutOverrides[layeredControl.key], undefined);
      assert.equal(dagreState.activeLayoutOverrides[radialControl.key], undefined);
      assert.deepEqual(dagreState.byOperator["elk-layered"], layeredState.byOperator["elk-layered"]);
      assert.deepEqual(dagreState.byOperator["elk-radial"], radialState.byOperator["elk-radial"]);

      await selectEngine(page, "elk-layered");
      const layeredAfterDagreState = await captureLayoutOperatorBrowserState(page);

      assert.equal(layeredAfterDagreState.activeOperatorKey, "elk-layered");
      assert.deepEqual(layeredAfterDagreState.activeLayoutOverrides, layeredState.byOperator["elk-layered"] ?? {});
      assert.equal(layeredAfterDagreState.activeLayoutOverrides[dagreControl.key], undefined);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
    await stopPreviewServer(server.process);
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
});
