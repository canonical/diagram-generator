import type { IncomingMessage, ServerResponse } from "node:http";
import type { PreviewShellMode } from "@diagram-generator/layout-engine";

export type PreviewViewerSidebarSection = "elk-layout" | (string & {});

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

export interface PreviewHostViewerRouteDescriptor {
  readonly key: string;
  readonly lane: PreviewHostLaneDescriptor;
  readonly routePrefixes: readonly string[];
  readonly listSlugs: () => readonly string[];
  readonly hasDocument: (slug: string) => boolean;
  readonly buildHtml: (slug: string) => string;
  readonly describeMissing: (slug: string) => string;
}

export interface PreviewHostViewerRouteMatch {
  readonly route: PreviewHostViewerRouteDescriptor;
  readonly slug: string | null;
}

export type PreviewHostApiMethod = "GET" | "POST";

export interface PreviewHostApiRouteDescriptor {
  readonly key: string;
  readonly method: PreviewHostApiMethod;
  readonly routePrefixes: readonly string[];
  handle(match: PreviewHostApiRouteMatch, context: PreviewHostApiRouteHandlerContext): Promise<void> | void;
}

export interface PreviewHostApiRouteMatch {
  readonly route: PreviewHostApiRouteDescriptor;
  readonly pathname: string;
  readonly slug: string | null;
}

export interface PreviewHostApiRouteHandlerContext {
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
  readonly pathname: string;
  readonly sendJson: (statusCode: number, payload: unknown) => void;
  readonly sendText: (statusCode: number, text: string) => void;
  readonly readJsonBody: (req: IncomingMessage) => Promise<unknown>;
}

export interface PreviewHostViewerScriptResolver {
  readonly previewAssetUrl: (filename: string) => string;
}

export interface PreviewHostViewerPageDefinition {
  readonly mode: PreviewShellMode;
  readonly inspectorEmptyText: string;
  buildTitle(slug: string): string;
  buildCurrentPath(slug: string): string;
}

export interface PreviewHostViewerChrome {
  readonly templateHtml: string;
  readonly browseSections: readonly PreviewHostBrowseSection[];
  readonly baselineStylesHtml: string;
}

export interface PreviewViewerPageOptions {
  readonly title: string;
  readonly mode: PreviewShellMode;
  readonly currentPath: string;
  readonly templateHtml: string;
  readonly browseSections: readonly PreviewHostBrowseSection[];
  readonly inspectorEmptyText: string;
  readonly modeScriptsHtml: string;
  readonly configScript: string;
  readonly visibleSidebarSections: readonly PreviewViewerSidebarSection[];
  readonly baselineStylesHtml: string;
}

export interface PreviewIndexPageOptions {
  readonly port: number;
  readonly specHome: string;
  readonly browseSections: readonly PreviewHostBrowseSection[];
  readonly baselineStylesHtml: string;
}
