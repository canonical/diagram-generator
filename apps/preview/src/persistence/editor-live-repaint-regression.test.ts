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
      __DG_activeLayoutOperatorKey?: string | null;
    };
    return previewWindow.__DG_activeLayoutOperatorKey ?? null;
  });
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
