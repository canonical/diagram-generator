import type {
  PreviewHostApiRouteDescriptor,
  PreviewHostApiRouteMatch,
  PreviewHostDocumentApi,
} from "./types.js";
import { resolveRegisteredPreviewDocumentApi } from "./registry.js";

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
  TKey extends keyof PreviewHostDocumentApi,
> {
  readonly documentApiKey: TKey;
  readonly routeKey?: string;
  readonly missingMessage: (slug: string) => string;
  readonly resolveSlug?: (match: PreviewHostApiRouteMatch) => string | null;
}

function resolvePreviewHostDocumentRoute<
  TKey extends keyof PreviewHostDocumentApi,
>(
  match: PreviewHostApiRouteMatch,
  sendText: (statusCode: number, text: string) => void,
  options: ResolvePreviewHostDocumentRouteOptions<TKey>,
): {
  slug: string;
  handler: NonNullable<PreviewHostDocumentApi[TKey]>;
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
  const owner = resolveRegisteredPreviewDocumentApi(slug, options.documentApiKey, {
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
  TKey extends keyof PreviewHostDocumentApi,
> extends ResolvePreviewHostDocumentRouteOptions<TKey> {
  readonly key: string;
  readonly routePrefixes: readonly string[];
}

export function createPreviewHostDocumentGetJsonRoute<
  TKey extends keyof PreviewHostDocumentApi,
>(
  options: CreatePreviewHostDocumentGetJsonRouteOptions<TKey>,
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
        const handler = resolved.handler as (slug: string) => unknown | Promise<unknown>;
        context.sendJson(200, await handler(resolved.slug));
      } catch (error) {
        context.sendText(400, error instanceof Error ? error.message : String(error));
      }
    },
  };
}

export interface CreatePreviewHostDocumentPostJsonRouteOptions<
  TKey extends keyof PreviewHostDocumentApi,
> extends ResolvePreviewHostDocumentRouteOptions<TKey> {
  readonly key: string;
  readonly routePrefixes: readonly string[];
}

export function createPreviewHostDocumentPostJsonRoute<
  TKey extends keyof PreviewHostDocumentApi,
>(
  options: CreatePreviewHostDocumentPostJsonRouteOptions<TKey>,
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
        const handler = resolved.handler as (slug: string, payload: unknown) => unknown | Promise<unknown>;
        context.sendJson(200, await handler(resolved.slug, payload));
      } catch (error) {
        context.sendText(400, error instanceof Error ? error.message : String(error));
      }
    },
  };
}

export interface CreatePreviewHostDocumentGetBytesRouteOptions<
  TKey extends keyof PreviewHostDocumentApi,
> extends ResolvePreviewHostDocumentRouteOptions<TKey> {
  readonly key: string;
  readonly routePrefixes: readonly string[];
  readonly contentType: string;
  readonly transformResult: (value: Awaited<ReturnType<NonNullable<PreviewHostDocumentApi[TKey]>>>) => Buffer;
}

export function createPreviewHostDocumentGetBytesRoute<
  TKey extends keyof PreviewHostDocumentApi,
>(
  options: CreatePreviewHostDocumentGetBytesRouteOptions<TKey>,
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
        const handler = resolved.handler as (slug: string) => unknown | Promise<unknown>;
        const result = await handler(resolved.slug);
        context.sendBytes(
          200,
          options.contentType,
          options.transformResult(
            result as Awaited<ReturnType<NonNullable<PreviewHostDocumentApi[TKey]>>>,
          ),
        );
      } catch (error) {
        context.sendText(400, error instanceof Error ? error.message : String(error));
      }
    },
  };
}
