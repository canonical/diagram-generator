import test from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import { readFileSync } from "node:fs";
import type { Browser, Page } from "playwright";

import {
  createFsIconLoader,
  createHarfBuzzTextAdapter,
} from "@diagram-generator/layout-engine";

import { launchChromiumOrSkip } from "./playwright-test-support.js";
import { buildFrameDiagramState } from "../preview-host/frame-documents.js";

const REPO_ROOT = path.resolve(process.cwd(), "..", "..");
const APP_ROOT = path.join(REPO_ROOT, "apps", "preview");
const FRAMES_DIR = path.join(REPO_ROOT, "scripts", "diagrams", "frames");
const ICONS_DIR = path.join(REPO_ROOT, "assets", "icons");
const FONT_PATH = path.join(REPO_ROOT, "assets", "UbuntuSans[wdth,wght].ttf");
const TSX_CLI = path.join(APP_ROOT, "node_modules", "tsx", "dist", "cli.mjs");

const TLS_IDS = [
  "tls_provider",
  "provider_stack",
  "openstack_services",
  "load_balancers",
  "octavia_certificates",
  "amphora_issuing_ca",
  "amphora_controller_cert",
  "public_certificates",
  "internal_certificates",
  "rgw_certificates",
  "octavia_k8s",
  "traefik_public",
  "traefik_internal",
  "traefik_rgw",
] as const;

const HEADED_COMPOUND_WIDTH_TOLERANCE = new Set([
  "tls_provider",
  "openstack_services",
  "load_balancers",
]);

const SERVER_GEOMETRY_IDS = new Set([
  "tls_provider",
  "provider_stack",
  "openstack_services",
  "load_balancers",
  "octavia_k8s",
  "traefik_public",
  "traefik_internal",
  "traefik_rgw",
]);

type FrameLike = {
  id: string;
  children: FrameLike[];
  _layout: {
    placedX: number;
    placedY: number;
    placedW: number;
    placedH: number;
  };
};

let harfBuzzAdapterPromise: ReturnType<typeof createHarfBuzzTextAdapter> | null = null;

function getHarfBuzzAdapter() {
  if (!harfBuzzAdapterPromise) {
    const fontBuffer = readFileSync(FONT_PATH);
    const fontData = fontBuffer.buffer.slice(
      fontBuffer.byteOffset,
      fontBuffer.byteOffset + fontBuffer.byteLength,
    );
    harfBuzzAdapterPromise = createHarfBuzzTextAdapter({ fontData });
  }
  return harfBuzzAdapterPromise;
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

function startPreviewServer(port: number): {
  process: ChildProcessWithoutNullStreams;
  ready: Promise<void>;
  output: { stdout: string; stderr: string };
} {
  const child = spawn(process.execPath, [TSX_CLI, path.join(APP_ROOT, "src", "server.ts"), "--port", String(port)], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      DG_FRAMES_DIR: FRAMES_DIR,
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
  return {
    process: child,
    ready: waitForServer(`http://127.0.0.1:${port}`, child, output),
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
  await page.waitForTimeout(500);
}

async function openPreviewPage(browser: Browser, baseUrl: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  await page.goto(`${baseUrl}/view/v3:tls-certificate-provider-topology`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await settle(page);
  return page;
}

function findFrameById(frame: FrameLike, id: string): FrameLike | null {
  if (frame.id === id) {
    return frame;
  }
  for (const child of frame.children) {
    const match = findFrameById(child, id);
    if (match) {
      return match;
    }
  }
  return null;
}

async function renderedRect(page: Page, id: string): Promise<{ x: number; y: number; width: number; height: number }> {
  return page.locator(`#dg-frame-layer [data-component-id="${id}"] > rect`).evaluate(function (element) {
    const rect = element as SVGRectElement;
    return {
      x: Number(rect.getAttribute("x") ?? 0),
      y: Number(rect.getAttribute("y") ?? 0),
      width: Number(rect.getAttribute("width") ?? 0),
      height: Number(rect.getAttribute("height") ?? 0),
    };
  });
}

test("TLS forced ELK browser render matches server geometry for cert rows and parent compounds", async (t) => {
  const browser = await launchChromiumOrSkip(t);
  let page: Page | undefined;
  let server: ChildProcessWithoutNullStreams | undefined;

  try {
    const port = await allocatePort();
    const started = startPreviewServer(port);
    server = started.process;
    await started.ready;

    const textAdapter = await getHarfBuzzAdapter();
    const renderDeps = {
      framesDir: FRAMES_DIR,
      iconLoader: createFsIconLoader(ICONS_DIR),
      textAdapterPromise: Promise.resolve(textAdapter),
    };
    const { diagram } = await buildFrameDiagramState("tls-certificate-provider-topology", renderDeps);
    const root = diagram.root as unknown as FrameLike;

    page = await openPreviewPage(browser, `http://127.0.0.1:${port}`);
    assert.equal(
      await page.locator("#stage svg").getAttribute("data-layout-engine"),
      "elk-layered",
      "TLS fixture should render through elk-layered in the browser path",
    );

    const rects = new Map<string, { x: number; y: number; width: number; height: number }>();
    for (const id of TLS_IDS) {
      const frame = findFrameById(root, id);
      assert.ok(frame, `expected server frame for ${id}`);
      const rect = await renderedRect(page, id);
      rects.set(id, rect);
      if (!SERVER_GEOMETRY_IDS.has(id)) {
        continue;
      }
      const positionTolerance = id.startsWith("traefik_") ? 20 : 1;
      const widthTolerance = HEADED_COMPOUND_WIDTH_TOLERANCE.has(id) ? 16 : 1;
      assert.ok(
        Math.abs(rect.x - frame._layout.placedX) <= positionTolerance &&
        Math.abs(rect.y - frame._layout.placedY) <= 1 &&
        Math.abs(rect.width - frame._layout.placedW) <= widthTolerance &&
        Math.abs(rect.height - frame._layout.placedH) <= 1,
        `${id} browser rect should match server geometry; browser=${JSON.stringify(rect)} server=${JSON.stringify(frame._layout)}`,
      );
    }

    assert.ok(
      rects.get("octavia_certificates")!.y < rects.get("octavia_k8s")!.y,
      "browser path should keep the OpenStack cert row above octavia_k8s",
    );
    assert.ok(
      rects.get("public_certificates")!.y < rects.get("traefik_public")!.y,
      "browser path should keep the load balancer cert row above the endpoint row",
    );
    assert.ok(
      rects.get("traefik_public")!.x < rects.get("traefik_internal")!.x &&
      rects.get("traefik_internal")!.x < rects.get("traefik_rgw")!.x,
      "browser path should keep the endpoint row in authored left-to-right order",
    );
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
    await browser.close().catch(() => {});
    if (server) {
      await stopPreviewServer(server);
    }
  }
});
