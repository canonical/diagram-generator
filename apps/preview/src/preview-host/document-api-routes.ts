import type {
  PreviewHostApiRouteDescriptor,
  PreviewHostApiRouteMatch,
  PreviewHostDocumentActionHandler,
  PreviewHostDocumentEndpointKind,
} from "./types.js";
import { resolveRegisteredPreviewDocumentEndpoint } from "./registry.js";

function requirePreviewHostRouteSlug(
  match: { slug: string | null },
  sendText: (statusCode: number, text: string) => void,
): string | null {
  const slug = match.slug;
  if (!slug) {
    sendText(400, "Invalid slug");
    return null;
  }
  return slug;
}

interface ResolvePreviewHostDocumentRouteOptions<
  THandler extends PreviewHostDocumentActionHandler,
> {
  readonly documentEndpointKind: PreviewHostDocumentEndpointKind;
  readonly routeKey?: string;
  readonly missingMessage: (slug: string) => string;
  readonly resolveSlug?: (match: PreviewHostApiRouteMatch) => string | null;
}

function resolvePreviewHostDocumentRoute<
  THandler extends PreviewHostDocumentActionHandler,
>(
  match: PreviewHostApiRouteMatch,
  sendText: (statusCode: number, text: string) => void,
  options: ResolvePreviewHostDocumentRouteOptions<THandler>,
): {
  slug: string;
  handler: THandler;
} | null {
  const slug = options.resolveSlug
    ? requirePreviewHostRouteSlug(
      { slug: options.resolveSlug(match) },
      sendText,
    )
    : requirePreviewHostRouteSlug(match, sendText);
  if (!slug) {
    return null;
  }
  const owner = resolveRegisteredPreviewDocumentEndpoint<THandler>(slug, options.documentEndpointKind, {
    routeKey: options.routeKey,
  });
  if (!owner) {
    sendText(404, options.missingMessage(slug));
    return null;
  }
  return {
    slug,
    handler: owner.handler,
  };
}

export interface CreatePreviewHostDocumentGetJsonRouteOptions<
  TResult = unknown,
> extends ResolvePreviewHostDocumentRouteOptions<(slug: string) => TResult | Promise<TResult>> {
  readonly key: string;
  readonly routePrefixes: readonly string[];
}

export function createPreviewHostDocumentGetJsonRoute<
  TResult = unknown,
>(
  options: CreatePreviewHostDocumentGetJsonRouteOptions<TResult>,
): PreviewHostApiRouteDescriptor {
  return {
    key: options.key,
    method: "GET",
    routePrefixes: options.routePrefixes,
    async handle(match, context) {
      const resolved = resolvePreviewHostDocumentRoute(match, context.sendText, options);
      if (!resolved) {
        return;
      }
      try {
        context.sendJson(200, await resolved.handler(resolved.slug));
      } catch (error) {
        context.sendText(400, error instanceof Error ? error.message : String(error));
      }
    },
  };
}

export interface CreatePreviewHostDocumentPostJsonRouteOptions<
  TResult = unknown,
> extends ResolvePreviewHostDocumentRouteOptions<(slug: string, payload: unknown) => TResult | Promise<TResult>> {
  readonly key: string;
  readonly routePrefixes: readonly string[];
}

export function createPreviewHostDocumentPostJsonRoute<
  TResult = unknown,
>(
  options: CreatePreviewHostDocumentPostJsonRouteOptions<TResult>,
): PreviewHostApiRouteDescriptor {
  return {
    key: options.key,
    method: "POST",
    routePrefixes: options.routePrefixes,
    async handle(match, context) {
      const resolved = resolvePreviewHostDocumentRoute(match, context.sendText, options);
      if (!resolved) {
        return;
      }
      let payload: unknown;
      try {
        payload = await context.readJsonBody(context.req);
      } catch (error) {
        context.sendText(400, error instanceof Error ? error.message : String(error));
        return;
      }
      try {
        context.sendJson(200, await resolved.handler(resolved.slug, payload));
      } catch (error) {
        context.sendText(400, error instanceof Error ? error.message : String(error));
      }
    },
  };
}

export interface CreatePreviewHostDocumentGetBytesRouteOptions<
  TResult = unknown,
> extends ResolvePreviewHostDocumentRouteOptions<(slug: string) => TResult | Promise<TResult>> {
  readonly key: string;
  readonly routePrefixes: readonly string[];
  readonly contentType: string;
  readonly transformResult: (value: Awaited<TResult>) => Buffer;
}

export function createPreviewHostDocumentGetBytesRoute<
  TResult = unknown,
>(
  options: CreatePreviewHostDocumentGetBytesRouteOptions<TResult>,
): PreviewHostApiRouteDescriptor {
  return {
    key: options.key,
    method: "GET",
    routePrefixes: options.routePrefixes,
    async handle(match, context) {
      const resolved = resolvePreviewHostDocumentRoute(match, context.sendText, options);
      if (!resolved) {
        return;
      }
      try {
        const result = await resolved.handler(resolved.slug);
        context.sendBytes(
          200,
          options.contentType,
          options.transformResult(
            result as Awaited<TResult>,
          ),
        );
      } catch (error) {
        context.sendText(400, error instanceof Error ? error.message : String(error));
      }
    },
  };
}
