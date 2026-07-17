import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { Buffer } from "node:buffer";
import os from "node:os";
import path from "node:path";

import {
  serializePreviewEngineManifest,
} from "@diagram-generator/layout-engine";

import { installPreviewHostApiRoutes } from "./api-routes.js";
import {
  BUILTIN_PREVIEW_HOST_SERVER_MODULE_KEY,
  requirePreviewHostModuleContext,
  type BuiltinPreviewHostServerRouteDeps,
} from "./builtin-host-deps.js";
import type { PreviewHostModuleDescriptor, PreviewHostModuleInstallDeps } from "./modules.js";
import type { PreviewHostApiRouteDescriptor } from "./types.js";
import { isBareSlug, parseQualifiedSlug } from "./workspace/diagram-workspace-source.js";
import { createServerRootSource } from "./workspace/server-root-source.js";

export interface BuiltinPreviewHostServerModuleDeps
  extends BuiltinPreviewHostServerRouteDeps {}

function requireServeFileRouteContext(
  routeKey: string,
  context: {
    readonly serveFile?: (filePath: string, cacheControl?: string) => void;
  },
): (filePath: string, cacheControl?: string) => void {
  if (typeof context.serveFile !== "function") {
    throw new Error(`Preview host route '${routeKey}' requires file-serving helpers`);
  }
  return context.serveFile;
}

function requireHtmlRouteContext(
  routeKey: string,
  context: {
    readonly port?: number;
    readonly sendHtml?: (statusCode: number, html: string) => void;
  },
): {
  port: number;
  sendHtml: (statusCode: number, html: string) => void;
} {
  if (typeof context.port !== "number" || typeof context.sendHtml !== "function") {
    throw new Error(`Preview host route '${routeKey}' requires HTML response helpers`);
  }
  return {
    port: context.port,
    sendHtml: context.sendHtml,
  };
}

export function createPreviewHostIndexRoute(
  deps: BuiltinPreviewHostServerModuleDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: "preview-index",
    method: "GET",
    matchMode: "exact",
    routePrefixes: ["/", "/force"],
    handle(_match, context) {
      const htmlContext = requireHtmlRouteContext("preview-index", context);
      htmlContext.sendHtml(200, deps.buildIndexHtml(htmlContext.port));
    },
  };
}

export function createPreviewHostRuntimeIdentityRoute(
  deps: BuiltinPreviewHostServerModuleDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: "runtime-identity",
    method: "GET",
    matchMode: "exact",
    routePrefixes: ["/api/runtime-identity"],
    handle(_match, context) {
      context.sendJson(200, {
        ok: true,
        app: "@diagram-generator/preview-app",
        repoRoot: deps.repoRoot,
        appRoot: deps.appRoot,
        branch: deps.currentGitBranch(),
        framesDir: deps.framesDir,
        pid: process.pid,
        port: context.port ?? null,
        node: process.version,
        specHome: deps.specHome,
      });
    },
  };
}

export function createPreviewHostEngineManifestRoute(): PreviewHostApiRouteDescriptor {
  return {
    key: "preview-engines",
    method: "GET",
    matchMode: "exact",
    routePrefixes: ["/api/preview-engines"],
    handle(_match, context) {
      context.sendJson(200, serializePreviewEngineManifest());
    },
  };
}

export function createRetiredForcePreviewHostApiRoute(): PreviewHostApiRouteDescriptor {
  return {
    key: "retired-force-api",
    method: "GET",
    routePrefixes: [
      "/api/force/",
      "/api/force-reset/",
      "/api/force-node/",
      "/api/force-tick/",
      "/api/force-params/",
      "/api/force-export/",
    ],
    handle(_match, context) {
      context.sendText(404, `Route retired from the Node preview app: ${context.pathname}`);
    },
  };
}

export function createPreviewHostEventsRoute(
  deps: BuiltinPreviewHostServerModuleDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: "events",
    method: "GET",
    matchMode: "exact",
    routePrefixes: ["/events"],
    handle(_match, context) {
      context.res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      const payload = JSON.stringify(deps.readReloadState());
      context.res.write(`data: ${payload}\n\n`);
      deps.addSseClient(context.res);
      context.req.on("close", () => {
        deps.removeSseClient(context.res);
        try {
          context.res.end();
        } catch {
          // ignore close races
        }
      });
    },
  };
}

export function createPreviewHostFaviconRoute(): PreviewHostApiRouteDescriptor {
  return {
    key: "favicon",
    method: "GET",
    matchMode: "exact",
    routePrefixes: ["/favicon.ico"],
    handle(_match, context) {
      context.sendBytes(204, "image/x-icon", Buffer.alloc(0));
    },
  };
}

export function createPreviewHostLayoutFontRoute(
  deps: BuiltinPreviewHostServerModuleDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: "layout-font",
    method: "GET",
    routePrefixes: ["/assets/fonts/"],
    handle(_match, context) {
      const serveFile = requireServeFileRouteContext("layout-font", context);
      const safeName = path.posix.basename(context.pathname.slice("/assets/fonts/".length));
      if (!safeName || safeName.includes("..")) {
        context.sendText(400, "Invalid font path");
        return;
      }
      if (safeName === "UbuntuSans[wdth,wght].ttf") {
        serveFile(deps.layoutEngineFontPath, "public, max-age=300");
        return;
      }
      context.sendText(404, `${safeName} not found`);
    },
  };
}

export function createPreviewHostBaselineCssRoute(
  deps: BuiltinPreviewHostServerModuleDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: "preview-baseline-css",
    method: "GET",
    matchMode: "exact",
    routePrefixes: ["/preview/bf-os.css"],
    handle(_match, context) {
      const serveFile = requireServeFileRouteContext("preview-baseline-css", context);
      if (!existsSync(deps.baselineOsCssPath)) {
        context.sendText(
          500,
          "Baseline Foundry preview assets missing. Run the asset sync before using the Node preview app.",
        );
        return;
      }
      serveFile(deps.baselineOsCssPath, "public, max-age=300");
    },
  };
}

export function createPreviewHostBaselineFontsRoute(
  deps: BuiltinPreviewHostServerModuleDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: "preview-baseline-fonts",
    method: "GET",
    routePrefixes: ["/preview/bf-fonts/"],
    handle(_match, context) {
      const serveFile = requireServeFileRouteContext("preview-baseline-fonts", context);
      if (!existsSync(deps.baselineFontDir)) {
        context.sendText(
          500,
          "Baseline Foundry preview fonts missing. Run the asset sync before using the Node preview app.",
        );
        return;
      }
      const safeName = path.posix.basename(context.pathname.slice("/preview/bf-fonts/".length));
      serveFile(path.join(deps.baselineFontDir, safeName), "public, max-age=300");
    },
  };
}

export function createPreviewHostStaticAssetRoute(
  deps: BuiltinPreviewHostServerModuleDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: "preview-static-assets",
    method: "GET",
    routePrefixes: ["/preview/"],
    async handle(_match, context) {
      const serveFile = requireServeFileRouteContext("preview-static-assets", context);
      const safeName = path.posix.basename(context.pathname.slice("/preview/".length));
      const assetPath = deps.resolvePreviewAssetPath(safeName);
      if (!assetPath) {
        context.sendText(400, "Invalid preview asset path");
        return;
      }
      if (
        safeName === "layout-engine.js" ||
        safeName === "layout-engine-harfbuzz.js" ||
        safeName === "harfbuzz.wasm"
      ) {
        await deps.ensureLayoutEngineBrowserAssets();
      }
      if (!existsSync(assetPath)) {
        context.sendText(404, `${safeName} not found`);
        return;
      }
      serveFile(assetPath, "public, max-age=300");
    },
  };
}

export function createPreviewHostIconRoute(
  deps: BuiltinPreviewHostServerModuleDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: "preview-icon",
    method: "GET",
    routePrefixes: ["/api/icon/"],
    handle(_match, context) {
      const serveFile = requireServeFileRouteContext("preview-icon", context);
      const safeName = path.posix.basename(decodeURIComponent(context.pathname.slice("/api/icon/".length)));
      if (!safeName || safeName.includes("..")) {
        context.sendText(400, "Invalid icon name");
        return;
      }
      serveFile(path.join(deps.iconsDir, safeName), "public, max-age=300");
    },
  };
}

export function createPreviewHostReferenceImageRoute(
  deps: BuiltinPreviewHostServerModuleDeps,
): PreviewHostApiRouteDescriptor {
  return {
    key: "reference-image",
    method: "GET",
    routePrefixes: ["/reference/"],
    handle(match, context) {
      const serveFile = requireServeFileRouteContext("reference-image", context);
      if (!match.slug) {
        context.sendText(400, "Invalid slug");
        return;
      }
      const referencePath = deps.findReferenceImage(match.slug);
      if (!referencePath) {
        context.sendText(404, `Reference image not found for ${match.slug}`);
        return;
      }
      serveFile(referencePath, "public, max-age=300");
    },
  };
}

function workspaceSourceId(label: string): string {
  return label.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "folder";
}

function workspaceSlugFromFilename(name: string): string | null {
  const basename = path.posix.basename(name);
  if (!basename.toLowerCase().endsWith(".yaml")) return null;
  const slug = basename.slice(0, -".yaml".length);
  return isBareSlug(slug) ? slug : null;
}

const MAX_WORKSPACE_FILE_COUNT = 500;
const MAX_WORKSPACE_FILE_BYTES = 2 * 1024 * 1024;
const MAX_WORKSPACE_TOTAL_BYTES = 25 * 1024 * 1024;

export function createPreviewHostWorkspaceRoutes(
  deps: BuiltinPreviewHostServerModuleDeps,
): readonly PreviewHostApiRouteDescriptor[] {
  const opened = new Map<string, { source: ReturnType<typeof createServerRootSource>; dir: string }>();
  const forgetOpenedWorkspace = (sourceId: string): boolean => {
    const workspace = opened.get(sourceId);
    if (!workspace) return false;
    opened.delete(sourceId);
    deps.unregisterWorkspaceSource?.(sourceId);
    rmSync(workspace.dir, { recursive: true, force: true });
    return true;
  };

  const openRoute: PreviewHostApiRouteDescriptor = {
    key: "workspace-open",
    method: "POST",
    matchMode: "exact",
    routePrefixes: ["/api/workspaces/open"],
    async handle(_match, context) {
      if (typeof deps.registerWorkspaceSource !== "function") {
        context.sendText(501, "Workspace folder opening is unavailable in this preview host");
        return;
      }
      const body = await context.readJsonBody(context.req);
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        context.sendText(400, "Expected a workspace folder payload");
        return;
      }
      const labelValue = Reflect.get(body, "label");
      const label = typeof labelValue === "string" && labelValue.trim() ? labelValue.trim() : "Opened folder";
      const rawFiles = Reflect.get(body, "files");
      const allowEmpty = Reflect.get(body, "allowEmpty") === true;
      if (!Array.isArray(rawFiles) || (rawFiles.length === 0 && !allowEmpty)) {
        context.sendText(400, "The selected folder contains no YAML diagrams");
        return;
      }
      if (rawFiles.length > MAX_WORKSPACE_FILE_COUNT) {
        context.sendText(413, `A folder can contain at most ${MAX_WORKSPACE_FILE_COUNT} YAML diagrams`);
        return;
      }

      const validFiles = new Map<string, string>();
      const normalizedSlugs = new Set<string>();
      let totalBytes = 0;
      for (const file of rawFiles as unknown[]) {
        if (!file || typeof file !== "object") continue;
        const name = Reflect.get(file, "name");
        const content = Reflect.get(file, "content");
        const slug = typeof name === "string" && typeof content === "string"
          ? workspaceSlugFromFilename(name)
          : null;
        if (!slug) continue;
        const normalizedSlug = slug.toLocaleLowerCase("en-US");
        if (normalizedSlugs.has(normalizedSlug)) {
          context.sendText(400, `Duplicate diagram filename: ${slug}.yaml`);
          return;
        }
        const bytes = Buffer.byteLength(content as string, "utf8");
        if (bytes > MAX_WORKSPACE_FILE_BYTES) {
          context.sendText(413, `${slug}.yaml exceeds the 2 MiB diagram limit`);
          return;
        }
        totalBytes += bytes;
        if (totalBytes > MAX_WORKSPACE_TOTAL_BYTES) {
          context.sendText(413, "The selected folder exceeds the 25 MiB workspace limit");
          return;
        }
        normalizedSlugs.add(normalizedSlug);
        validFiles.set(slug, content as string);
      }
      if (validFiles.size === 0 && !allowEmpty) {
        context.sendText(400, "The selected folder contains no valid root-level YAML diagrams");
        return;
      }

      const requestedIdValue = Reflect.get(body, "sourceId");
      const requestedId = workspaceSourceId(
        typeof requestedIdValue === "string" && requestedIdValue.trim() ? requestedIdValue : label,
      );
      let sourceId = requestedId;
      let openedWorkspace = opened.get(sourceId);
      if (!openedWorkspace) {
        let suffix = 2;
        while (true) {
          const dir = mkdtempSync(path.join(os.tmpdir(), "dg-open-folder-"));
          try {
            const source = createServerRootSource({
              id: sourceId,
              label,
              dir,
              kind: "local-folder",
            });
            deps.registerWorkspaceSource(source);
            openedWorkspace = { source, dir };
            opened.set(sourceId, openedWorkspace);
            break;
          } catch (error) {
            rmSync(dir, { recursive: true, force: true });
            if (!(error instanceof Error) || !/already registered/.test(error.message)) throw error;
            sourceId = `${requestedId}-${suffix}`;
            suffix += 1;
          }
        }
      }

      for (const entry of readdirSync(openedWorkspace.dir)) {
        if (entry.toLowerCase().endsWith(".yaml")) rmSync(path.join(openedWorkspace.dir, entry), { force: true });
      }
      const slugs = [...validFiles.keys()];
      for (const [slug, content] of validFiles) {
        writeFileSync(path.join(openedWorkspace.dir, `${slug}.yaml`), content, "utf8");
      }
      slugs.sort((a, b) => a.localeCompare(b));
      context.sendJson(200, { ok: true, sourceId, label, slugs });
    },
    dispose() {
      for (const sourceId of [...opened.keys()]) forgetOpenedWorkspace(sourceId);
    },
  };

  const closeRoute: PreviewHostApiRouteDescriptor = {
    key: "workspace-close",
    method: "POST",
    matchMode: "exact",
    routePrefixes: ["/api/workspaces/close"],
    async handle(_match, context) {
      const body = await context.readJsonBody(context.req);
      const sourceId = body && typeof body === "object" && !Array.isArray(body)
        ? Reflect.get(body, "sourceId")
        : null;
      if (typeof sourceId !== "string" || !sourceId.startsWith("local-")) {
        context.sendText(400, "Expected a local workspace source id");
        return;
      }
      if (!forgetOpenedWorkspace(sourceId)) {
        context.sendText(404, `Workspace source '${sourceId}' is not open`);
        return;
      }
      context.sendJson(200, { ok: true, sourceId });
    },
  };

  const copyRoute: PreviewHostApiRouteDescriptor = {
    key: "workspace-copy",
    method: "POST",
    matchMode: "exact",
    routePrefixes: ["/api/workspaces/copy"],
    async handle(_match, context) {
      if (typeof deps.copyWorkspaceDocument !== "function") {
        context.sendText(501, "Workspace copying is unavailable in this preview host");
        return;
      }
      const body = await context.readJsonBody(context.req);
      const sourceAddress = body && typeof body === "object" && !Array.isArray(body)
        ? Reflect.get(body, "sourceAddress")
        : null;
      const targetSourceId = body && typeof body === "object" && !Array.isArray(body)
        ? Reflect.get(body, "targetSourceId")
        : null;
      const targetSlug = body && typeof body === "object" && !Array.isArray(body)
        ? Reflect.get(body, "targetSlug")
        : null;
      if (
        typeof sourceAddress !== "string"
        || typeof targetSourceId !== "string"
        || typeof targetSlug !== "string"
        || !isBareSlug(targetSlug)
      ) {
        context.sendText(400, "Expected valid sourceAddress, targetSourceId, and targetSlug values");
        return;
      }
      try {
        context.sendJson(200, deps.copyWorkspaceDocument(sourceAddress, targetSourceId, targetSlug));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        context.sendText(/already exists/.test(message) ? 409 : 400, message);
      }
    },
  };

  const yamlRoute: PreviewHostApiRouteDescriptor = {
    key: "workspace-yaml",
    method: "GET",
    routePrefixes: ["/api/workspaces/yaml/"],
    handle(match, context) {
      const qualified = match.slug ? parseQualifiedSlug(match.slug) : null;
      const openedWorkspace = qualified ? opened.get(qualified.sourceId) : null;
      if (!qualified || !openedWorkspace || !openedWorkspace.source.has(qualified.slug)) {
        context.sendText(404, "Workspace YAML not found");
        return;
      }
      context.sendText(200, openedWorkspace.source.read(qualified.slug));
    },
  };

  return [openRoute, closeRoute, copyRoute, yamlRoute];
}

export function createBuiltinPreviewHostServerRoutes(
  deps: BuiltinPreviewHostServerModuleDeps,
): readonly PreviewHostApiRouteDescriptor[] {
  return [
    createPreviewHostIndexRoute(deps),
    createPreviewHostRuntimeIdentityRoute(deps),
    createPreviewHostEngineManifestRoute(),
    createPreviewHostEventsRoute(deps),
    createPreviewHostFaviconRoute(),
    createPreviewHostLayoutFontRoute(deps),
    createPreviewHostBaselineCssRoute(deps),
    createPreviewHostBaselineFontsRoute(deps),
    createPreviewHostStaticAssetRoute(deps),
    createPreviewHostIconRoute(deps),
    createPreviewHostReferenceImageRoute(deps),
    ...createPreviewHostWorkspaceRoutes(deps),
    createRetiredForcePreviewHostApiRoute(),
  ] as const;
}

export function installBuiltinPreviewHostServerRoutes(
  deps: BuiltinPreviewHostServerModuleDeps,
): () => void {
  return installPreviewHostApiRoutes(createBuiltinPreviewHostServerRoutes(deps));
}

export function installBuiltinPreviewHostServerModule(
  deps: PreviewHostModuleInstallDeps,
): () => void {
  const moduleDeps = requirePreviewHostModuleContext<BuiltinPreviewHostServerModuleDeps>(
    deps,
    BUILTIN_PREVIEW_HOST_SERVER_MODULE_KEY,
  );
  return installBuiltinPreviewHostServerRoutes(moduleDeps);
}

export const BUILTIN_PREVIEW_HOST_SERVER_MODULE: PreviewHostModuleDescriptor = {
  key: BUILTIN_PREVIEW_HOST_SERVER_MODULE_KEY,
  install: installBuiltinPreviewHostServerModule,
};
