import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createFsIconLoader,
  createHarfBuzzTextAdapter,
  evaluatePreviewEngineCompatibility,
  getPreviewEngineByLayoutKey,
  listCompatiblePreviewEngines,
  resolvePreviewEngine,
  serializePreviewEngineManifest,
  summarizeFrameDiagramCompatibility,
  type PreviewEngineContext,
  type PreviewEngineManifest,
} from "@diagram-generator/layout-engine";
import {
  canonicalSavedState as canonicalFrameSavedState,
  determineFrameYamlKind,
  frameDiagramExists,
  loadFrameDiagram,
  type FramePreviewDocumentDeps,
  type FramePreviewRenderDeps,
} from "./preview-host/frame-documents.js";
import {
  buildRegisteredPreviewBrowseSections,
  resolveRegisteredPreviewViewerRoute,
} from "./preview-host/registry.js";
import { resolveRegisteredPreviewHostApiRoute } from "./preview-host/api-routes.js";
import {
  canonicalForceSavedState,
  readForceSpec,
  type ForcePreviewDocumentDeps,
} from "./preview-host/force-documents.js";
import { installBuiltinPreviewHost } from "./preview-host/install-builtins.js";
import {
  persistForceSpecToYaml,
  persistFrameDiagramOverridePayloadToYaml,
  verifyElkLayoutPersisted,
  type PersistOverridePayload,
} from "./persistence/index.js";
import { buildIndexPageHtml } from "./preview-host/pages.js";

const DEFAULT_PORT = 8100;
const SPEC_HOME = "docs/spec-archive/038-ts-authority-python-removal/";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { parse: parseYaml } = require("yaml") as { parse: (raw: string) => unknown };
const APP_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(APP_ROOT, "..", "..");
const SCRIPTS_DIR = path.join(REPO_ROOT, "scripts");
const PREVIEW_DIR = path.join(SCRIPTS_DIR, "preview");
const FRAMES_DIR = path.resolve(process.env.DG_FRAMES_DIR ?? path.join(SCRIPTS_DIR, "diagrams", "frames"));
const FORCE_DEFINITIONS_DIR = path.resolve(
  process.env.DG_FORCE_DEFINITIONS_DIR ?? path.join(SCRIPTS_DIR, "diagrams", "force"),
);
const ICONS_DIR = path.join(REPO_ROOT, "assets", "icons");
const CORPUS_REF_DIR = path.join(REPO_ROOT, "docs", "corpus-references");
const INPUT_DIRS = [path.join(REPO_ROOT, "diagrams", "1.input")];
const BF_VENDOR_ROOT = path.join(REPO_ROOT, "assets", "baseline-foundry");
const BF_VENDOR_OS_CSS = path.join(BF_VENDOR_ROOT, "os", "styles.css");
const BF_VENDOR_FONT_DIR = path.join(BF_VENDOR_ROOT, "fonts");
const LAYOUT_ENGINE_BUNDLE = path.join(
  REPO_ROOT,
  "packages",
  "layout-engine",
  "dist",
  "layout-engine.iife.js",
);
const LAYOUT_ENGINE_HARFBUZZ_BUNDLE = path.join(
  REPO_ROOT,
  "packages",
  "layout-engine",
  "dist",
  "layout-engine-harfbuzz.js",
);
const LAYOUT_ENGINE_WASM = path.join(REPO_ROOT, "packages", "layout-engine", "dist", "harfbuzz.wasm");
const LAYOUT_ENGINE_FONT = path.join(REPO_ROOT, "assets", "UbuntuSans[wdth,wght].ttf");
const LAYOUT_ENGINE_BROWSER_ENTRY = path.join(REPO_ROOT, "packages", "layout-engine", "src", "browser-entry.ts");
const LAYOUT_ENGINE_HARFBUZZ_ENTRY = path.join(
  REPO_ROOT,
  "packages",
  "layout-engine",
  "src",
  "harfbuzz-text-adapter.ts",
);
const GRAPH_LAYOUT_CORE_ENTRY = path.join(REPO_ROOT, "packages", "graph-layout-core", "src", "index.ts");
const GRAPH_LAYOUT_ELK_ENTRY = path.join(REPO_ROOT, "packages", "graph-layout-elk", "src", "index.ts");
const HARFBUZZ_WASM_SOURCE = path.join(
  REPO_ROOT,
  "packages",
  "layout-engine",
  "node_modules",
  "harfbuzzjs",
  "dist",
  "harfbuzz.wasm",
);
const VIEWER_TEMPLATE = path.join(PREVIEW_DIR, "viewer-unified.html");

const REFERENCE_MAP: Record<string, string> = {
  "memory-wall": "redo-this-image-onbrand.png",
  "attention-qkv": "image 3.png",
  "logic-data-vram": "image 4.png",
  "request-to-hardware-stack": "image 6.png",
  "inference-snaps": "image 7.png",
  "example-arrow-label-separator": "example-arrow-label-separator-rough.svg",
  "force-stakeholders": "force/IMG_3229.jpg",
  "tiered-network-architecture": "maas/tiered-network-architecture.png",
};

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".otf": "font/otf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const iconLoader = createFsIconLoader(ICONS_DIR);
const previewEngines = serializePreviewEngineManifest();
const hostableGridLayoutKeys = new Set(
  previewEngines
    .filter(
      (entry: PreviewEngineManifest): entry is PreviewEngineManifest & { layoutEngineKey: string } =>
        entry.shellMode === "grid" && typeof entry.layoutEngineKey === "string",
    )
    .map((entry) => entry.layoutEngineKey),
);
const textAdapterPromise = createHarfBuzzTextAdapter({
  fontData: readFileSync(path.join(REPO_ROOT, "assets", "UbuntuSans[wdth,wght].ttf")).buffer,
});
const framePreviewDocumentDeps: FramePreviewDocumentDeps = {
  framesDir: FRAMES_DIR,
};
const forcePreviewDocumentDeps: ForcePreviewDocumentDeps = {
  forceDefinitionsDir: FORCE_DEFINITIONS_DIR,
};
const framePreviewRenderDeps: FramePreviewRenderDeps = {
  ...framePreviewDocumentDeps,
  iconLoader,
  textAdapterPromise,
};
const WATCH_EXTENSIONS = new Set([".yaml", ".yml", ".json", ".html", ".css", ".js", ".svg", ".ttf", ".woff", ".woff2"]);
const WATCH_PATHS = [FRAMES_DIR, FORCE_DEFINITIONS_DIR, PREVIEW_DIR, BF_VENDOR_ROOT, path.join(REPO_ROOT, "packages", "layout-engine", "dist")];
let rebuildGeneration = 0;
let lastRebuildError: string | null = null;
let watchIntervalHandle: NodeJS.Timeout | null = null;
let lastWatchMtimes = new Map<string, number>();
const sseClients = new Set<ServerResponse>();
let previewBundleBuildPromise: Promise<void> | null = null;

function parsePort(argv: readonly string[], env: NodeJS.ProcessEnv): number {
  const rawArgPort = argv.find((arg) => arg.startsWith("--port="))?.split("=", 2)[1];
  const shortFlagIndex = argv.findIndex((arg) => arg === "--port" || arg === "-p");
  const rawFlagPort =
    shortFlagIndex >= 0 && shortFlagIndex + 1 < argv.length ? argv[shortFlagIndex + 1] : undefined;
  const rawPort = rawArgPort ?? rawFlagPort ?? env.DG_PREVIEW_PORT ?? env.PREVIEW_PORT;
  const parsed = Number.parseInt(rawPort ?? `${DEFAULT_PORT}`, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendHtml(res: ServerResponse, statusCode: number, html: string): void {
  res.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
    "Cache-Control": "no-store",
  });
  res.end(html);
}

function sendText(res: ServerResponse, statusCode: number, text: string): void {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
    "Cache-Control": "no-store",
  });
  res.end(text);
}

function sendBytes(
  res: ServerResponse,
  statusCode: number,
  contentType: string,
  body: Buffer,
  cacheControl = "no-store",
): void {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Content-Length": body.length,
    "Cache-Control": cacheControl,
  });
  res.end(body);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON");
  }
}

function requestUrl(req: IncomingMessage): URL {
  return new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
}

function collectWatchMtimes(): Map<string, number> {
  const mtimes = new Map<string, number>();
  const visit = (targetPath: string): void => {
    if (!existsSync(targetPath)) return;
    const stats = statSync(targetPath);
    if (stats.isFile()) {
      if (WATCH_EXTENSIONS.has(path.extname(targetPath).toLowerCase())) {
        mtimes.set(targetPath, Math.trunc(stats.mtimeMs));
      }
      return;
    }
    for (const entry of readdirSync(targetPath, { withFileTypes: true })) {
      const childPath = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        visit(childPath);
      } else if (entry.isFile() && WATCH_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        mtimes.set(childPath, Math.trunc(statSync(childPath).mtimeMs));
      }
    }
  };
  for (const watchPath of WATCH_PATHS) {
    visit(watchPath);
  }
  return mtimes;
}

function broadcastReloadEvent(): void {
  const payload = JSON.stringify({
    generation: rebuildGeneration,
    error: lastRebuildError,
  });
  for (const client of [...sseClients]) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
      try {
        client.end();
      } catch {
        // ignore client teardown errors
      }
    }
  }
}

function startWatchLoop(): void {
  if (watchIntervalHandle) return;
  lastWatchMtimes = collectWatchMtimes();
  watchIntervalHandle = setInterval(() => {
    try {
      const currentMtimes = collectWatchMtimes();
      let changed = currentMtimes.size !== lastWatchMtimes.size;
      if (!changed) {
        for (const [filePath, mtime] of currentMtimes) {
          if (lastWatchMtimes.get(filePath) !== mtime) {
            changed = true;
            break;
          }
        }
      }
      if (!changed) return;
      lastWatchMtimes = currentMtimes;
      rebuildGeneration += 1;
      lastRebuildError = null;
      broadcastReloadEvent();
    } catch (error) {
      rebuildGeneration += 1;
      lastRebuildError = error instanceof Error ? error.message : String(error);
      broadcastReloadEvent();
    }
  }, 500);
}

function currentGitBranch(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function isSafeSlug(slug: string): boolean {
  return /^[A-Za-z0-9._:-]+$/.test(slug);
}

function normalizeFrameSlug(slug: string): string | null {
  const value = decodeURIComponent(slug).replace(/^v3:/, "");
  return isSafeSlug(value) ? value : null;
}

function normalizeLayoutEngine(layoutEngine: string | undefined): string {
  const key = layoutEngine?.trim() ?? "";
  if (!key) return "";
  return hostableGridLayoutKeys.size === 0 || hostableGridLayoutKeys.has(key) ? key : "";
}

function listYamlSlugs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
    .map((entry) => path.basename(entry.name, ".yaml"))
    .filter((slug) => isSafeSlug(slug))
    .sort((a, b) => a.localeCompare(b));
}

function listAutolayoutDiagrams(): string[] {
  return listYamlSlugs(FRAMES_DIR);
}

function listForceExamples(): string[] {
  return listYamlSlugs(FORCE_DEFINITIONS_DIR);
}

function resolvePreviewAssetPath(filename: string): string | null {
  if (!filename || filename.includes("..")) return null;
  if (filename === "layout-engine.js") return LAYOUT_ENGINE_BUNDLE;
  if (filename === "layout-engine-harfbuzz.js") return LAYOUT_ENGINE_HARFBUZZ_BUNDLE;
  if (filename === "harfbuzz.wasm") return LAYOUT_ENGINE_WASM;
  if (filename === "layout-font.ttf") return LAYOUT_ENGINE_FONT;
  const safe = path.posix.basename(filename);
  return path.join(PREVIEW_DIR, safe);
}

function maxSourceMtimeMs(rootDir: string): number {
  let newest = 0;
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, maxSourceMtimeMs(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".ts")) {
      newest = Math.max(newest, statSync(fullPath).mtimeMs);
    }
  }
  return newest;
}

function layoutEngineBrowserSourceIsNewerThanBundle(): boolean {
  const srcRoot = path.join(REPO_ROOT, "packages", "layout-engine", "src");
  if (!existsSync(LAYOUT_ENGINE_BUNDLE) || !existsSync(srcRoot)) {
    return true;
  }
  return maxSourceMtimeMs(srcRoot) > statSync(LAYOUT_ENGINE_BUNDLE).mtimeMs;
}

async function ensureLayoutEngineBrowserAssets(): Promise<void> {
  const bundleMissing =
    !existsSync(LAYOUT_ENGINE_BUNDLE) ||
    !existsSync(LAYOUT_ENGINE_HARFBUZZ_BUNDLE) ||
    !existsSync(LAYOUT_ENGINE_WASM);
  const bundleStale = !bundleMissing && layoutEngineBrowserSourceIsNewerThanBundle();
  if (!bundleMissing && !bundleStale) {
    return;
  }
  if (previewBundleBuildPromise) {
    await previewBundleBuildPromise;
    return;
  }

  previewBundleBuildPromise = (async () => {
    mkdirSync(path.dirname(LAYOUT_ENGINE_BUNDLE), { recursive: true });
    const layoutEngineRequire = createRequire(path.join(REPO_ROOT, "packages", "layout-engine", "package.json"));
    const esbuild = layoutEngineRequire("esbuild") as {
      build: (options: {
        entryPoints: string[];
        bundle: boolean;
        format: "iife" | "esm";
        globalName?: string;
        outfile: string;
        target: string;
        platform?: "browser";
        define?: Record<string, string>;
        external?: string[];
        plugins?: Array<{
          name: string;
          setup: (build: {
            onResolve: (
              options: { filter: RegExp },
              callback: (args: { path: string }) => { path: string } | null,
            ) => void;
          }) => void;
        }>;
      }) => Promise<unknown>;
    };
    const localPackageAliasPlugin = {
      name: "local-package-alias",
      setup(build: {
        onResolve: (
          options: { filter: RegExp },
          callback: (args: { path: string }) => { path: string } | null,
        ) => void;
      }) {
        build.onResolve({ filter: /^@diagram-generator\/graph-layout-core$/ }, () => ({ path: GRAPH_LAYOUT_CORE_ENTRY }));
        build.onResolve({ filter: /^@diagram-generator\/graph-layout-elk$/ }, () => ({ path: GRAPH_LAYOUT_ELK_ENTRY }));
      },
    };

    await esbuild.build({
      entryPoints: [LAYOUT_ENGINE_BROWSER_ENTRY],
      bundle: true,
      format: "iife",
      globalName: "LayoutEngine",
      outfile: LAYOUT_ENGINE_BUNDLE,
      target: "es2022",
      plugins: [localPackageAliasPlugin],
    });

    await esbuild.build({
      entryPoints: [LAYOUT_ENGINE_HARFBUZZ_ENTRY],
      bundle: true,
      format: "esm",
      outfile: LAYOUT_ENGINE_HARFBUZZ_BUNDLE,
      platform: "browser",
      target: "es2022",
      define: {
        process: "undefined",
      },
      external: ["module"],
    });

    copyFileSync(HARFBUZZ_WASM_SOURCE, LAYOUT_ENGINE_WASM);
  })();

  try {
    await previewBundleBuildPromise;
  } finally {
    previewBundleBuildPromise = null;
  }
}

function previewAssetUrl(filename: string): string {
  const assetPath = resolvePreviewAssetPath(filename);
  const version = assetPath && existsSync(assetPath) ? Math.trunc(statSync(assetPath).mtimeMs) : 0;
  return `/preview/${filename}?v=${version}`;
}

function findReferenceImage(slug: string): string | null {
  const corpus = path.join(CORPUS_REF_DIR, `${slug}-source.png`);
  if (existsSync(corpus)) return corpus;

  const mapped = REFERENCE_MAP[slug];
  if (mapped) {
    for (const inputDir of INPUT_DIRS) {
      const candidate = path.join(inputDir, mapped);
      if (existsSync(candidate)) return candidate;
    }
  }

  const forceSpecPath = path.join(FORCE_DEFINITIONS_DIR, `${slug}.yaml`);
  if (existsSync(forceSpecPath)) {
    try {
      const parsed = parseYaml(readFileSync(forceSpecPath, "utf8"));
      const filename =
        parsed && typeof parsed === "object" && "reference_image" in parsed
          ? Reflect.get(parsed as Record<string, unknown>, "reference_image")
          : null;
      if (typeof filename === "string") {
        for (const inputDir of INPUT_DIRS) {
          const candidate = path.join(inputDir, filename);
          if (existsSync(candidate)) return candidate;
        }
      }
    } catch {
      return null;
    }
  }

  return null;
}

function bfStylesLinkHtml(): string {
  return '<link rel="stylesheet" href="/preview/bf-os.css">';
}

function buildBrowseSections() {
  return buildRegisteredPreviewBrowseSections();
}

function buildIndexHtml(port: number): string {
  return buildIndexPageHtml({
    port,
    specHome: SPEC_HOME,
    browseSections: buildBrowseSections(),
    baselineStylesHtml: bfStylesLinkHtml(),
  });
}

installBuiltinPreviewHost({
  framePreviewDocumentDeps,
  forcePreviewDocumentDeps,
  framePreviewRenderDeps,
  parseYaml,
  templateHtml: readFileSync(VIEWER_TEMPLATE, "utf8"),
  baselineStylesHtml: bfStylesLinkHtml(),
  previewAssetUrl,
  listAutolayoutDiagrams,
  listForceExamples,
  findReferenceImage,
  normalizeLayoutEngine,
});

function contentTypeForPath(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function serveFile(res: ServerResponse, filePath: string, cacheControl = "no-store"): void {
  if (!existsSync(filePath)) {
    sendText(res, 404, "Not found");
    return;
  }
  sendBytes(res, 200, contentTypeForPath(filePath), readFileSync(filePath), cacheControl);
}

function handleRuntimeIdentity(res: ServerResponse, port: number): void {
  sendJson(res, 200, {
    ok: true,
    app: "@diagram-generator/preview-app",
    repoRoot: REPO_ROOT,
    appRoot: APP_ROOT,
    branch: currentGitBranch(),
    framesDir: FRAMES_DIR,
    pid: process.pid,
    port,
    node: process.version,
    specHome: SPEC_HOME,
  });
}

function handlePreviewEngines(res: ServerResponse): void {
  sendJson(res, 200, previewEngines);
}

async function handleRequest(req: IncomingMessage, res: ServerResponse, port: number): Promise<void> {
  const url = requestUrl(req);
  const pathname = url.pathname;

  if (req.method === "POST") {
    const previewHostApiRouteMatch = resolveRegisteredPreviewHostApiRoute(
      "POST",
      pathname,
      normalizeFrameSlug,
    );
    if (previewHostApiRouteMatch) {
      await previewHostApiRouteMatch.route.handle(previewHostApiRouteMatch, {
        req,
        res,
        pathname,
        sendJson: (statusCode: number, payload: unknown) => sendJson(res, statusCode, payload),
        sendText: (statusCode: number, text: string) => sendText(res, statusCode, text),
        sendBytes: (statusCode: number, contentType: string, bytes: Buffer) =>
          sendBytes(res, statusCode, contentType, bytes),
        readJsonBody,
      });
      return;
    }

    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  if (pathname === "/") {
    sendHtml(res, 200, buildIndexHtml(port));
    return;
  }
  if (pathname === "/force") {
    sendHtml(res, 200, buildIndexHtml(port));
    return;
  }
  if (pathname === "/api/runtime-identity") {
    handleRuntimeIdentity(res, port);
    return;
  }
  if (pathname === "/api/preview-engines") {
    handlePreviewEngines(res);
    return;
  }
  if (pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    const payload = JSON.stringify({
      generation: rebuildGeneration,
      error: lastRebuildError,
    });
    res.write(`data: ${payload}\n\n`);
    sseClients.add(res);
    req.on("close", () => {
      sseClients.delete(res);
      try {
        res.end();
      } catch {
        // ignore close races
      }
    });
    return;
  }
  if (pathname === "/favicon.ico") {
    sendBytes(res, 204, "image/x-icon", Buffer.alloc(0));
    return;
  }
  if (pathname.startsWith("/assets/fonts/")) {
    const safeName = path.posix.basename(pathname.slice("/assets/fonts/".length));
    if (!safeName || safeName.includes("..")) {
      sendText(res, 400, "Invalid font path");
      return;
    }
    if (safeName === "UbuntuSans[wdth,wght].ttf") {
      serveFile(res, LAYOUT_ENGINE_FONT, "public, max-age=300");
      return;
    }
    sendText(res, 404, `${safeName} not found`);
    return;
  }
  if (pathname === "/preview/bf-os.css") {
    if (!existsSync(BF_VENDOR_OS_CSS)) {
      sendText(
        res,
        500,
        "Baseline Foundry preview assets missing. Run the asset sync before using the Node preview app.",
      );
      return;
    }
    serveFile(res, BF_VENDOR_OS_CSS, "public, max-age=300");
    return;
  }
  if (pathname.startsWith("/preview/bf-fonts/")) {
    if (!existsSync(BF_VENDOR_FONT_DIR)) {
      sendText(
        res,
        500,
        "Baseline Foundry preview fonts missing. Run the asset sync before using the Node preview app.",
      );
      return;
    }
    const safeName = path.posix.basename(pathname.slice("/preview/bf-fonts/".length));
    serveFile(res, path.join(BF_VENDOR_FONT_DIR, safeName), "public, max-age=300");
    return;
  }
  if (pathname.startsWith("/preview/")) {
    const safeName = path.posix.basename(pathname.slice("/preview/".length));
    const assetPath = resolvePreviewAssetPath(safeName);
    if (!assetPath) {
      sendText(res, 400, "Invalid preview asset path");
      return;
    }
    if (
      safeName === "layout-engine.js" ||
      safeName === "layout-engine-harfbuzz.js" ||
      safeName === "harfbuzz.wasm"
    ) {
      await ensureLayoutEngineBrowserAssets();
    }
    if (!existsSync(assetPath)) {
      sendText(res, 404, `${safeName} not found`);
      return;
    }
    serveFile(res, assetPath, "public, max-age=300");
    return;
  }
  if (pathname.startsWith("/api/icon/")) {
    const safeName = path.posix.basename(decodeURIComponent(pathname.slice("/api/icon/".length)));
    if (!safeName || safeName.includes("..")) {
      sendText(res, 400, "Invalid icon name");
      return;
    }
    serveFile(res, path.join(ICONS_DIR, safeName), "public, max-age=300");
    return;
  }
  if (pathname.startsWith("/reference/")) {
    const slug = normalizeFrameSlug(pathname.slice("/reference/".length));
    if (!slug) {
      sendText(res, 400, "Invalid slug");
      return;
    }
    const refPath = findReferenceImage(slug);
    if (!refPath) {
      sendText(res, 404, `Reference image not found for ${slug}`);
      return;
    }
    serveFile(res, refPath, "public, max-age=300");
    return;
  }
  const previewHostGetApiRouteMatch = resolveRegisteredPreviewHostApiRoute(
    "GET",
    pathname,
    normalizeFrameSlug,
  );
  if (previewHostGetApiRouteMatch) {
    await previewHostGetApiRouteMatch.route.handle(previewHostGetApiRouteMatch, {
      req,
      res,
      pathname,
      sendJson: (statusCode: number, payload: unknown) => sendJson(res, statusCode, payload),
      sendText: (statusCode: number, text: string) => sendText(res, statusCode, text),
      sendBytes: (statusCode: number, contentType: string, bytes: Buffer) =>
        sendBytes(res, statusCode, contentType, bytes),
      readJsonBody,
    });
    return;
  }
  if (
    pathname.startsWith("/api/force/") ||
    pathname.startsWith("/api/force-reset/") ||
    pathname.startsWith("/api/force-node/") ||
    pathname.startsWith("/api/force-tick/") ||
    pathname.startsWith("/api/force-params/") ||
    pathname.startsWith("/api/force-export/")
  ) {
    sendText(res, 404, `Route retired from the Node preview app: ${pathname}`);
    return;
  }
  const previewViewerRouteMatch = resolveRegisteredPreviewViewerRoute(pathname, normalizeFrameSlug);
  if (previewViewerRouteMatch) {
    const { route, slug } = previewViewerRouteMatch;
    if (!slug) {
      sendText(res, 400, "Invalid slug");
      return;
    }
    if (!route.hasDocument(slug)) {
      sendText(res, 404, route.describeMissing(slug));
      return;
    }
    sendHtml(res, 200, route.buildHtml(slug));
    return;
  }

  sendJson(res, 501, {
    ok: false,
    error: "Preview route not implemented yet in the Node app scaffold.",
    route: pathname,
    specHome: SPEC_HOME,
  });
}

export function startPreviewServer(port = parsePort(process.argv.slice(2), process.env)) {
  startWatchLoop();
  const server = createServer((req, res) => {
    void handleRequest(req, res, port).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(res, 500, {
        ok: false,
        error: message,
        specHome: SPEC_HOME,
      });
    });
  });
  server.listen(port, "127.0.0.1");
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = parsePort(process.argv.slice(2), process.env);
  const server = startPreviewServer(port);
  server.on("listening", () => {
    process.stdout.write(`[preview-app] listening on http://127.0.0.1:${port}\n`);
  });
}
