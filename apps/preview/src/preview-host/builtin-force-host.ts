import { installPreviewHostApiRoutes } from "./api-routes.js";
import {
  createForcePreviewHostViewerRoute,
  type BuiltinPreviewHostViewerRouteDeps,
} from "./builtin-viewer-routes.js";
import {
  createPreviewHostDocumentGetJsonRoute,
  createPreviewHostDocumentPostJsonRoute,
} from "./document-api-routes.js";
import type { PreviewHostModuleDescriptor } from "./modules.js";
import { registerPreviewHostViewerRoute } from "./registry.js";
import type { PreviewHostApiRouteDescriptor } from "./types.js";

export interface BuiltinForcePreviewHostModuleDeps
  extends BuiltinPreviewHostViewerRouteDeps {}

function missingForceExampleMessage(slug: string): string {
  return `Unknown force example: ${slug}`;
}

export function createForceSavePreviewHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentPostJsonRoute({
    key: "force-save",
    routePrefixes: ["/api/force-save/"],
    documentApiKey: "saveDocument",
    routeKey: "force",
    missingMessage: missingForceExampleMessage,
  });
}

export function createForceSpecPreviewHostApiRoute(): PreviewHostApiRouteDescriptor {
  return createPreviewHostDocumentGetJsonRoute({
    key: "force-spec",
    routePrefixes: ["/api/force-spec/"],
    documentApiKey: "loadAuthoredSpec",
    routeKey: "force",
    missingMessage: missingForceExampleMessage,
  });
}

export const FORCE_PREVIEW_HOST_API_ROUTES = [
  createForceSavePreviewHostApiRoute(),
  createForceSpecPreviewHostApiRoute(),
] as const;

export function installBuiltinForcePreviewHostApiRoutes(): () => void {
  return installPreviewHostApiRoutes(FORCE_PREVIEW_HOST_API_ROUTES);
}

export function installBuiltinForcePreviewHostModule(
  deps: BuiltinForcePreviewHostModuleDeps,
): () => void {
  const unregisterViewerRoute = registerPreviewHostViewerRoute(
    createForcePreviewHostViewerRoute(deps),
  );
  const unregisterApiRoutes = installBuiltinForcePreviewHostApiRoutes();
  return () => {
    unregisterApiRoutes();
    unregisterViewerRoute();
  };
}

export const BUILTIN_FORCE_PREVIEW_HOST_MODULE: PreviewHostModuleDescriptor = {
  key: "builtin-force",
  install: installBuiltinForcePreviewHostModule,
};
