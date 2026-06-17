import type { PreviewHostBrowseSection, PreviewHostLaneDescriptor } from "./types.js";

export const AUTOLAYOUT_HOST_LANE: PreviewHostLaneDescriptor = {
  key: "autolayout",
  label: "Autolayout",
  buildViewerPath(slug: string): string {
    return `/view/v3:${slug}`;
  },
};

export const FORCE_HOST_LANE: PreviewHostLaneDescriptor = {
  key: "force",
  label: "Force demos",
  buildViewerPath(slug: string): string {
    return `/force/view/${slug}`;
  },
};

export const PREVIEW_HOST_LANES = [AUTOLAYOUT_HOST_LANE, FORCE_HOST_LANE] as const;

export function buildPreviewBrowseSection(
  lane: PreviewHostLaneDescriptor,
  slugs: readonly string[],
): PreviewHostBrowseSection | null {
  if (slugs.length === 0) {
    return null;
  }
  return {
    key: lane.key,
    label: lane.label,
    links: slugs.map((slug) => ({
      href: lane.buildViewerPath(slug),
      label: slug,
    })),
  };
}

export function buildPreviewBrowseSections(
  entries: readonly Readonly<{ lane: PreviewHostLaneDescriptor; slugs: readonly string[] }>[],
): PreviewHostBrowseSection[] {
  return entries
    .map(({ lane, slugs }) => buildPreviewBrowseSection(lane, slugs))
    .filter((section): section is PreviewHostBrowseSection => section !== null);
}
