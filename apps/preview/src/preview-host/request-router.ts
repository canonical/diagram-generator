import type { IncomingMessage, ServerResponse } from "node:http";

import { resolveRegisteredPreviewHostApiRoute } from "./api-routes.js";
import { resolveRegisteredPreviewViewerRoute } from "./registry.js";
import type { PreviewHostApiRouteHandlerContext } from "./types.js";

export interface RouteRegisteredPreviewHostRequestOptions {
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
  readonly pathname: string;
  readonly port?: number;
  readonly normalizeSlug: (value: string) => string | null;
  readonly sendHtml: (statusCode: number, html: string) => void;
  readonly sendJson: (statusCode: number, payload: unknown) => void;
  readonly sendText: (statusCode: number, text: string) => void;
  readonly sendBytes: (statusCode: number, contentType: string, bytes: Buffer) => void;
  readonly serveFile?: (filePath: string, cacheControl?: string) => void;
  readonly readJsonBody: (req: IncomingMessage) => Promise<unknown>;
  readonly notImplementedPayload: unknown;
}

export function createPreviewHostRouteHandlerContext(
  options: RouteRegisteredPreviewHostRequestOptions,
): PreviewHostApiRouteHandlerContext {
  return {
    req: options.req,
    res: options.res,
    pathname: options.pathname,
    port: options.port,
    sendHtml: options.sendHtml,
    sendJson: options.sendJson,
    sendText: options.sendText,
    sendBytes: options.sendBytes,
    serveFile: options.serveFile,
    readJsonBody: options.readJsonBody,
  };
}

export async function routeRegisteredPreviewHostRequest(
  options: RouteRegisteredPreviewHostRequestOptions,
): Promise<void> {
  const routeContext = createPreviewHostRouteHandlerContext(options);

  if (options.req.method === "POST") {
    const previewHostApiRouteMatch = resolveRegisteredPreviewHostApiRoute(
      "POST",
      options.pathname,
      options.normalizeSlug,
    );
    if (previewHostApiRouteMatch) {
      await previewHostApiRouteMatch.route.handle(previewHostApiRouteMatch, routeContext);
      return;
    }

    options.sendJson(405, { ok: false, error: "Method not allowed" });
    return;
  }

  if (options.req.method !== "GET") {
    options.sendJson(405, { ok: false, error: "Method not allowed" });
    return;
  }

  const previewHostGetApiRouteMatch = resolveRegisteredPreviewHostApiRoute(
    "GET",
    options.pathname,
    options.normalizeSlug,
  );
  if (previewHostGetApiRouteMatch) {
    await previewHostGetApiRouteMatch.route.handle(previewHostGetApiRouteMatch, routeContext);
    return;
  }

  const previewViewerRouteMatch = resolveRegisteredPreviewViewerRoute(
    options.pathname,
    options.normalizeSlug,
  );
  if (previewViewerRouteMatch) {
    const { route, slug } = previewViewerRouteMatch;
    if (!slug) {
      options.sendText(400, "Invalid slug");
      return;
    }
    if (!route.hasDocument(slug)) {
      options.sendText(404, route.describeMissing(slug));
      return;
    }
    options.sendHtml(200, route.buildHtml(slug));
    return;
  }

  options.sendJson(501, options.notImplementedPayload);
}
