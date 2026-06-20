import {
  existsSync,
  readFileSync,
} from "node:fs";
import path from "node:path";

import {
  serializePreviewEngineManifest,
} from "@diagram-generator/layout-engine";

import { installPreviewHostApiRoutes } from "./api-routes.js";
import type { BuiltinPreviewHostServerRouteDeps } from "./builtin-host-deps.js";
import type { PreviewHostModuleDescriptor } from "./modules.js";
import type { PreviewHostApiRouteDescriptor } from "./types.js";

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
    createRetiredForcePreviewHostApiRoute(),
  ] as const;
}

export function installBuiltinPreviewHostServerRoutes(
  deps: BuiltinPreviewHostServerModuleDeps,
): () => void {
  return installPreviewHostApiRoutes(createBuiltinPreviewHostServerRoutes(deps));
}

export function installBuiltinPreviewHostServerModule(
  deps: BuiltinPreviewHostServerModuleDeps,
): () => void {
  return installBuiltinPreviewHostServerRoutes(deps);
}

export const BUILTIN_PREVIEW_HOST_SERVER_MODULE: PreviewHostModuleDescriptor = {
  key: "builtin-server-routes",
  install: installBuiltinPreviewHostServerModule,
};
