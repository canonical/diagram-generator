import {
  buildPreviewBrowseSectionsFromViewerRoutes,
  resolvePreviewViewerRoute,
} from "./viewers.js";
import type {
  PreviewHostBrowseSection,
  PreviewHostViewerRouteDescriptor,
  PreviewHostViewerRouteMatch,
} from "./types.js";

const previewHostViewerRoutes: PreviewHostViewerRouteDescriptor[] = [];

export function registerPreviewHostViewerRoute(
  route: PreviewHostViewerRouteDescriptor,
): () => void {
  if (previewHostViewerRoutes.some((entry) => entry.key === route.key)) {
    throw new Error(`Preview host viewer route '${route.key}' is already registered`);
  }
  previewHostViewerRoutes.push(route);
  return () => {
    const index = previewHostViewerRoutes.findIndex((entry) => entry.key === route.key);
    if (index >= 0) {
      previewHostViewerRoutes.splice(index, 1);
    }
  };
}

export function listPreviewHostViewerRoutes(): PreviewHostViewerRouteDescriptor[] {
  return previewHostViewerRoutes.map((entry) => entry);
}

export function buildRegisteredPreviewBrowseSections(): PreviewHostBrowseSection[] {
  return buildPreviewBrowseSectionsFromViewerRoutes(listPreviewHostViewerRoutes());
}

export function resolveRegisteredPreviewViewerRoute(
  pathname: string,
  normalizeSlug: (value: string) => string | null,
): PreviewHostViewerRouteMatch | null {
  return resolvePreviewViewerRoute(pathname, listPreviewHostViewerRoutes(), normalizeSlug);
}
