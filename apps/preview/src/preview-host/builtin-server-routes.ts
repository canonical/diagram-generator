import {
  serializePreviewEngineManifest,
} from "@diagram-generator/layout-engine";

import { installPreviewHostApiRoutes } from "./api-routes.js";
import type { BuiltinPreviewHostServerRouteDeps } from "./builtin-host-deps.js";
import type { PreviewHostModuleDescriptor } from "./modules.js";
import type { PreviewHostApiRouteDescriptor } from "./types.js";

export interface BuiltinPreviewHostServerModuleDeps
  extends BuiltinPreviewHostServerRouteDeps {}

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

export function createBuiltinPreviewHostServerRoutes(
  deps: BuiltinPreviewHostServerModuleDeps,
): readonly PreviewHostApiRouteDescriptor[] {
  return [
    createPreviewHostIndexRoute(deps),
    createPreviewHostRuntimeIdentityRoute(deps),
    createPreviewHostEngineManifestRoute(),
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
