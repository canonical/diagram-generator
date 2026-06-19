import { buildPreviewBrowseSections } from "./lanes.js";
import { buildViewerPageHtml } from "./pages.js";
import type {
  PreviewHostBrowseSection,
  PreviewHostViewerPageDefinition,
  PreviewHostViewerRouteDescriptor,
  PreviewHostViewerRouteMatch,
  PreviewHostViewerChrome,
  PreviewViewerSidebarSection,
} from "./types.js";

export interface BuildPreviewViewerHtmlOptions extends PreviewHostViewerChrome {
  readonly slug: string;
  readonly definition: PreviewHostViewerPageDefinition;
  readonly configScript: string;
  readonly modeScriptsHtml: string;
  readonly visibleSidebarSections?: readonly PreviewViewerSidebarSection[] | null;
}

export function buildPreviewViewerHtml(
  options: BuildPreviewViewerHtmlOptions,
): string {
  const visibleSidebarSections = options.visibleSidebarSections ?? [];
  return buildViewerPageHtml({
    title: options.definition.buildTitle(options.slug),
    mode: options.definition.mode,
    currentPath: options.definition.buildCurrentPath(options.slug),
    templateHtml: options.templateHtml,
    browseSections: options.browseSections,
    inspectorEmptyText: options.definition.inspectorEmptyText,
    modeScriptsHtml: options.modeScriptsHtml,
    configScript: options.configScript,
    visibleSidebarSections,
    sectionVisibilityPlaceholders: options.definition.sectionVisibilityPlaceholders ?? [],
    baselineStylesHtml: options.baselineStylesHtml,
  });
}

export function buildPreviewBrowseSectionsFromViewerRoutes(
  routes: readonly PreviewHostViewerRouteDescriptor[],
): PreviewHostBrowseSection[] {
  return buildPreviewBrowseSections(
    routes.map((route) => ({
      lane: route.lane,
      slugs: route.listSlugs(),
    })),
  );
}

export function resolvePreviewViewerRoute(
  pathname: string,
  routes: readonly PreviewHostViewerRouteDescriptor[],
  normalizeSlug: (value: string) => string | null,
): PreviewHostViewerRouteMatch | null {
  for (const route of routes) {
    for (const prefix of route.routePrefixes) {
      if (!pathname.startsWith(prefix)) {
        continue;
      }
      return {
        route,
        slug: normalizeSlug(pathname.slice(prefix.length)),
      };
    }
  }
  return null;
}
