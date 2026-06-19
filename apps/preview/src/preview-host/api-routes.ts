import type {
  PreviewHostApiMethod,
  PreviewHostApiRouteDescriptor,
  PreviewHostApiRouteMatch,
} from "./types.js";

const previewHostApiRoutes: PreviewHostApiRouteDescriptor[] = [];

export function registerPreviewHostApiRoute(
  route: PreviewHostApiRouteDescriptor,
): () => void {
  if (previewHostApiRoutes.some((entry) => entry.key === route.key)) {
    throw new Error(`Preview host API route '${route.key}' is already registered`);
  }
  previewHostApiRoutes.push(route);
  return () => {
    const index = previewHostApiRoutes.findIndex((entry) => entry.key === route.key);
    if (index >= 0) {
      previewHostApiRoutes.splice(index, 1);
    }
  };
}

export function listPreviewHostApiRoutes(): PreviewHostApiRouteDescriptor[] {
  return previewHostApiRoutes.map((entry) => entry);
}

export function resolvePreviewHostApiRoute(
  method: PreviewHostApiMethod,
  pathname: string,
  routes: readonly PreviewHostApiRouteDescriptor[],
  normalizeSlug: (value: string) => string | null,
): PreviewHostApiRouteMatch | null {
  for (const route of routes) {
    if (route.method !== method) {
      continue;
    }
    for (const prefix of route.routePrefixes) {
      if (!pathname.startsWith(prefix)) {
        continue;
      }
      return {
        route,
        pathname,
        slug: normalizeSlug(pathname.slice(prefix.length)),
      };
    }
  }
  return null;
}

export function resolveRegisteredPreviewHostApiRoute(
  method: PreviewHostApiMethod,
  pathname: string,
  normalizeSlug: (value: string) => string | null,
): PreviewHostApiRouteMatch | null {
  return resolvePreviewHostApiRoute(
    method,
    pathname,
    listPreviewHostApiRoutes(),
    normalizeSlug,
  );
}
