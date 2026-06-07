import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { serializePreviewEngineManifest } from "@diagram-generator/layout-engine";

const DEFAULT_PORT = 8100;
const SPEC_HOME = "specs/038-ts-authority-python-removal/";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(APP_ROOT, "..", "..");

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

function notImplemented(res: ServerResponse, pathname: string): void {
  sendJson(res, 501, {
    ok: false,
    error: "Preview route not implemented yet in the Node app scaffold.",
    route: pathname,
    specHome: SPEC_HOME,
  });
}

function requestUrl(req: IncomingMessage): URL {
  return new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
}

function handleRoot(res: ServerResponse, port: number): void {
  sendHtml(
    res,
    200,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>diagram-generator preview app</title>
  </head>
  <body>
    <h1>diagram-generator preview app scaffold</h1>
    <p>Spec 038 Phase 1 is in progress. The Node front door is now a real app boundary.</p>
    <ul>
      <li><a href="/api/runtime-identity">/api/runtime-identity</a></li>
      <li><a href="/api/preview-engines">/api/preview-engines</a></li>
    </ul>
    <p>Port: ${port}</p>
  </body>
</html>`,
  );
}

function handleRuntimeIdentity(res: ServerResponse, port: number): void {
  sendJson(res, 200, {
    ok: true,
    app: "@diagram-generator/preview-app",
    repoRoot: REPO_ROOT,
    appRoot: APP_ROOT,
    pid: process.pid,
    port,
    node: process.version,
    specHome: SPEC_HOME,
  });
}

function handlePreviewEngines(res: ServerResponse): void {
  sendJson(res, 200, serializePreviewEngineManifest());
}

export function startPreviewServer(port = parsePort(process.argv.slice(2), process.env)) {
  const server = createServer((req, res) => {
    if (req.method !== "GET") {
      sendJson(res, 405, { ok: false, error: "Method not allowed" });
      return;
    }
    const url = requestUrl(req);
    if (url.pathname === "/") {
      handleRoot(res, port);
      return;
    }
    if (url.pathname === "/api/runtime-identity") {
      handleRuntimeIdentity(res, port);
      return;
    }
    if (url.pathname === "/api/preview-engines") {
      handlePreviewEngines(res);
      return;
    }
    notImplemented(res, url.pathname);
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
