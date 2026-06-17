export interface PreviewHostLink {
  readonly href: string;
  readonly label: string;
}

export interface PreviewHostBrowseSection {
  readonly key: string;
  readonly label: string;
  readonly links: readonly PreviewHostLink[];
}

export interface PreviewHostLaneDescriptor {
  readonly key: string;
  readonly label: string;
  buildViewerPath(slug: string): string;
}

export interface PreviewViewerPageOptions {
  readonly title: string;
  readonly mode: "grid" | "force";
  readonly currentPath: string;
  readonly templateHtml: string;
  readonly browseSections: readonly PreviewHostBrowseSection[];
  readonly inspectorEmptyText: string;
  readonly modeScriptsHtml: string;
  readonly configScript: string;
  readonly includeElkSection: boolean;
  readonly baselineStylesHtml: string;
}

export interface PreviewIndexPageOptions {
  readonly port: number;
  readonly specHome: string;
  readonly browseSections: readonly PreviewHostBrowseSection[];
  readonly baselineStylesHtml: string;
}
