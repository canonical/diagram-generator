import path from "node:path";

import { installPreviewHostApiRoutes } from "./api-routes.js";
import {
  createAutolayoutPreviewHostViewerRoute,
  type BuiltinPreviewHostViewerRouteDeps,
} from "./builtin-viewer-routes.js";
import {
  createPreviewHostDocumentGetBytesRoute,
  createPreviewHostDocumentGetJsonRoute,
  createPreviewHostDocumentPostJsonRoute,
} from "./document-api-routes.js";
import type { PreviewHostModuleDescriptor } from "./modules.js";
import { registerPreviewHostViewerRoute } from "./registry.js";
import type { PreviewHostApiRouteDescriptor } from "./types.js";

export interface BuiltinAutolayoutPreviewHostModuleDeps
  extends BuiltinPreviewHostViewerRouteDeps {}

function missingAutolayoutDiagramMessage(slug: string): string {
  return `Unknown diagram: ${slug}`;
}

function resolveSvgExportSlug(pathname: string): string | null {
  const rawName = pathname.startsWith("/svg/")
    ? pathname.slice("/svg/".length)
    : pathname.slice("/v3/svg/".length);
  const safeName = path.posix.basename(rawName);
  return safeName
    .replace(/-onbrand-v3-grid\.svg$/i, "")
    .replace(/-onbrand-v3\.svg$/i, "");
}

export function createFrameOverridesPreviewHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentPostJsonRoute({
    key: "frame-overrides",
    routePrefixes: ["/api/overrides/"],
    documentApiKey: "saveDocument",
    routeKey: "autolayout",
    missingMessage: (slug: string) => `Unknown frame slug: ${slug}`,
  });
}

export function createPreviewDocumentPreviewHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentGetJsonRoute({
    key: "preview-document",
    routePrefixes: ["/api/preview-document/"],
    documentApiKey: "loadPreviewDocument",
    missingMessage: missingAutolayoutDiagramMessage,
  });
}

export function createFrameTreePreviewHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentGetJsonRoute({
    key: "frame-tree",
    routePrefixes: ["/api/frame-tree/"],
    documentApiKey: "loadFrameTree",
    missingMessage: missingAutolayoutDiagramMessage,
  });
}

export function createComponentTreePreviewHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentGetJsonRoute({
    key: "component-tree",
    routePrefixes: ["/api/tree/"],
    documentApiKey: "loadComponentTree",
    missingMessage: missingAutolayoutDiagramMessage,
  });
}

export function createGridInfoPreviewHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentGetJsonRoute({
    key: "grid-info",
    routePrefixes: ["/api/grid/"],
    documentApiKey: "loadGridInfo",
    missingMessage: missingAutolayoutDiagramMessage,
  });
}

export function createPreviewSvgHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentGetBytesRoute({
    key: "svg-export",
    routePrefixes: ["/svg/", "/v3/svg/"],
    documentApiKey: "renderSvg",
    missingMessage: missingAutolayoutDiagramMessage,
    contentType: "image/svg+xml",
    resolveSlug: (match) => resolveSvgExportSlug(match.pathname),
    transformResult: (value) => Buffer.from(String(value), "utf8"),
  });
}

export const AUTOLAYOUT_PREVIEW_HOST_API_ROUTES = [
  createFrameOverridesPreviewHostApiRoute(),
  createPreviewDocumentPreviewHostApiRoute(),
  createFrameTreePreviewHostApiRoute(),
  createComponentTreePreviewHostApiRoute(),
  createGridInfoPreviewHostApiRoute(),
  createPreviewSvgHostApiRoute(),
] as const;

export function installBuiltinAutolayoutPreviewHostApiRoutes(): () => void {
  return installPreviewHostApiRoutes(AUTOLAYOUT_PREVIEW_HOST_API_ROUTES);
}

export function installBuiltinAutolayoutPreviewHostModule(
  deps: BuiltinAutolayoutPreviewHostModuleDeps,
): () => void {
  const unregisterViewerRoute = registerPreviewHostViewerRoute(
    createAutolayoutPreviewHostViewerRoute(deps),
  );
  const unregisterApiRoutes = installBuiltinAutolayoutPreviewHostApiRoutes();
  return () => {
    unregisterApiRoutes();
    unregisterViewerRoute();
  };
}

export const BUILTIN_AUTOLAYOUT_PREVIEW_HOST_MODULE: PreviewHostModuleDescriptor = {
  key: "builtin-autolayout",
  install: installBuiltinAutolayoutPreviewHostModule,
};
