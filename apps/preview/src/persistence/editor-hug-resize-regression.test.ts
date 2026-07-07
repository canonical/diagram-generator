import test from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Browser, Page } from "playwright";
import { launchChromiumOrSkip } from "./playwright-test-support.js";

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
  ready.catch(() => {});
  return {
    process: child,
    ready,
    output,
  };
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
      // Retry until ready.
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
  await page.waitForTimeout(400);
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

async function frameBounds(page: Page, componentId: string): Promise<{ x: number; y: number; w: number; h: number }> {
  return page.locator(`#dg-frame-layer [data-component-id="${componentId}"]`).evaluate((element) => {
    const box = (element as SVGGraphicsElement).getBBox();
    return {
      x: box.x,
      y: box.y,
      w: box.width,
      h: box.height,
    };
  });
}

async function clickComponent(page: Page, componentId: string, offset?: { x: number; y: number }): Promise<void> {
  const target = page.locator(`#dg-frame-layer [data-component-id="${componentId}"]`);
  const box = await target.boundingBox();
  assert.ok(box, `expected bounding box for ${componentId}`);
  await page.mouse.click(
    box.x + (offset?.x ?? box.width / 2),
    box.y + (offset?.y ?? box.height / 2),
  );
  await settle(page);
}

test("test-alignment-grid reflows a HUG child when the parent is resized smaller", { timeout: 120_000 }, async (t) => {
  const framesDir = copyFixtureFrames(["test-alignment-grid"]);
  const port = await allocatePort();
  const server = startPreviewServer(framesDir, port);
  const browser = await launchChromiumOrSkip(t, { headless: true });
  if (!browser) {
    await stopPreviewServer(server.process);
    fs.rmSync(framesDir, { recursive: true, force: true });
    return;
  }

  try {
    await server.ready;
    const page = await openPreviewPage(browser, `http://127.0.0.1:${port}`, "test-alignment-grid");

    await clickComponent(page, "small_box");
    await page.locator('#inspector [data-dg-change-action="single-prop"][data-dg-prop="sizing_w"]').selectOption("HUG");
    await page.locator('#inspector [data-dg-change-action="single-prop"][data-dg-prop="sizing_h"]').selectOption("HUG");
    await settle(page);

    const beforeChild = await frameBounds(page, "small_box");
    const beforeParent = await frameBounds(page, "container");

    await clickComponent(page, "container", { x: 16, y: 16 });

    const handle = page.locator('.dg-handle[data-resize-cid="container"][data-resize-axis="r"]').first();
    const handleBox = await handle.boundingBox();
    assert.ok(handleBox, "expected container resize handle");
    const handleCenterX = handleBox.x + handleBox.width / 2;
    const handleCenterY = handleBox.y + handleBox.height / 2;
    const shrinkDistance = Math.max(320, beforeParent.w - Math.max(96, beforeChild.w - 24));

    await page.mouse.move(handleCenterX, handleCenterY);
    await page.mouse.down();
    await page.mouse.move(handleCenterX - shrinkDistance, handleCenterY, { steps: 32 });
    await page.mouse.up();
    await settle(page);

    const afterChild = await frameBounds(page, "small_box");
    const afterParent = await frameBounds(page, "container");

    assert.ok(afterParent.w < beforeParent.w, "parent should shrink after the resize drag");
    assert.ok(afterParent.w < beforeChild.w, "parent should shrink past the child's pre-resize HUG width");
    assert.ok(afterChild.w < beforeChild.w, "HUG child should shrink after the parent resize");
    assert.ok(afterChild.x + afterChild.w <= afterParent.x + afterParent.w + 1, "child should stay within the resized parent");
  } finally {
    await browser.close();
    await stopPreviewServer(server.process);
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
});
