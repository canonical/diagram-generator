import path from "node:path";

import {
  registerPreviewHostApiRoute,
} from "./api-routes.js";
import { resolveRegisteredPreviewDocumentApi } from "./registry.js";
import type { PreviewHostApiRouteDescriptor } from "./types.js";

function requireApiSlug(
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

export function createForceSavePreviewHostApiRoute(): PreviewHostApiRouteDescriptor {
  return {
    key: "force-save",
    method: "POST",
    routePrefixes: ["/api/force-save/"],
    async handle(match, context) {
      const { sendJson, sendText, readJsonBody, req } = context;
      const slug = match.slug;
      if (!slug) {
        sendText(400, "Invalid slug");
        return;
      }
      const owner = resolveRegisteredPreviewDocumentApi(slug, "saveDocument", {
        routeKey: "force",
      });
      if (!owner) {
        sendText(404, `Unknown force example: ${slug}`);
        return;
      }
      let payload: unknown;
      try {
        payload = await readJsonBody(req);
      } catch (error) {
        sendText(400, error instanceof Error ? error.message : String(error));
        return;
      }
      try {
        sendJson(200, await owner.handler(slug, payload));
      } catch (error) {
        sendText(400, error instanceof Error ? error.message : String(error));
      }
    },
  };
}

export function createFrameOverridesPreviewHostApiRoute(
): PreviewHostApiRouteDescriptor {
  return {
    key: "frame-overrides",
    method: "POST",
    routePrefixes: ["/api/overrides/"],
    async handle(match, context) {
      const { sendJson, sendText, readJsonBody, req } = context;
      const slug = match.slug;
      if (!slug) {
        sendText(400, "Invalid slug");
        return;
      }
      const owner = resolveRegisteredPreviewDocumentApi(slug, "saveDocument", {
        routeKey: "autolayout",
      });
      if (!owner) {
        sendText(404, `Unknown frame slug: ${slug}`);
        return;
      }
      let payload: unknown;
      try {
        payload = await readJsonBody(req);
      } catch (error) {
        sendText(400, error instanceof Error ? error.message : String(error));
        return;
      }
      try {
        sendJson(200, await owner.handler(slug, payload));
      } catch (error) {
        sendText(400, error instanceof Error ? error.message : String(error));
      }
    },
  };
}

export function createForceSpecPreviewHostApiRoute(
): PreviewHostApiRouteDescriptor {
  return {
    key: "force-spec",
    method: "GET",
    routePrefixes: ["/api/force-spec/"],
    handle(match, context) {
      const { sendJson, sendText } = context;
      const slug = match.slug;
      if (!slug) {
        sendText(400, "Invalid slug");
        return;
      }
      const owner = resolveRegisteredPreviewDocumentApi(slug, "loadAuthoredSpec", {
        routeKey: "force",
      });
      if (!owner) {
        sendText(404, `Unknown force example: ${slug}`);
        return;
      }
      try {
        sendJson(200, owner.handler(slug));
      } catch (error) {
        sendText(400, error instanceof Error ? error.message : String(error));
      }
    },
  };
}

export function createPreviewDocumentPreviewHostApiRoute(
): PreviewHostApiRouteDescriptor {
  return {
    key: "preview-document",
    method: "GET",
    routePrefixes: ["/api/preview-document/"],
    handle(match, context) {
      const slug = requireApiSlug(match, context.sendText);
      if (!slug) {
        return;
      }
      const owner = resolveRegisteredPreviewDocumentApi(slug, "loadPreviewDocument");
      if (!owner) {
        context.sendText(404, `Unknown diagram: ${slug}`);
        return;
      }
      context.sendJson(200, owner.handler(slug));
    },
  };
}

export function createFrameTreePreviewHostApiRoute(
): PreviewHostApiRouteDescriptor {
  return {
    key: "frame-tree",
    method: "GET",
    routePrefixes: ["/api/frame-tree/"],
    handle(match, context) {
      const slug = requireApiSlug(match, context.sendText);
      if (!slug) {
        return;
      }
      const owner = resolveRegisteredPreviewDocumentApi(slug, "loadFrameTree");
      if (!owner) {
        context.sendText(404, `Unknown diagram: ${slug}`);
        return;
      }
      context.sendJson(200, owner.handler(slug));
    },
  };
}

export function createComponentTreePreviewHostApiRoute(
): PreviewHostApiRouteDescriptor {
  return {
    key: "component-tree",
    method: "GET",
    routePrefixes: ["/api/tree/"],
    handle(match, context) {
      const slug = requireApiSlug(match, context.sendText);
      if (!slug) {
        return;
      }
      const owner = resolveRegisteredPreviewDocumentApi(slug, "loadComponentTree");
      if (!owner) {
        context.sendText(404, `Unknown diagram: ${slug}`);
        return;
      }
      context.sendJson(200, owner.handler(slug));
    },
  };
}

export function createGridInfoPreviewHostApiRoute(
): PreviewHostApiRouteDescriptor {
  return {
    key: "grid-info",
    method: "GET",
    routePrefixes: ["/api/grid/"],
    handle(match, context) {
      const slug = requireApiSlug(match, context.sendText);
      if (!slug) {
        return;
      }
      const owner = resolveRegisteredPreviewDocumentApi(slug, "loadGridInfo");
      if (!owner) {
        context.sendText(404, `Unknown diagram: ${slug}`);
        return;
      }
      context.sendJson(200, owner.handler(slug));
    },
  };
}

export function createPreviewSvgHostApiRoute(
): PreviewHostApiRouteDescriptor {
  return {
    key: "svg-export",
    method: "GET",
    routePrefixes: ["/svg/", "/v3/svg/"],
    async handle(match, context) {
      const rawName = match.pathname.startsWith("/svg/")
        ? match.pathname.slice("/svg/".length)
        : match.pathname.slice("/v3/svg/".length);
      const safeName = path.posix.basename(rawName);
      const normalized =
        safeName.replace(/-onbrand-v3-grid\.svg$/i, "").replace(/-onbrand-v3\.svg$/i, "");
      const slug = requireApiSlug({ slug: normalized || null }, context.sendText);
      if (!slug) {
        return;
      }
      const owner = resolveRegisteredPreviewDocumentApi(slug, "renderSvg");
      if (!owner) {
        context.sendText(404, `Unknown diagram: ${slug}`);
        return;
      }
      const svg = await owner.handler(slug);
      context.sendBytes(200, "image/svg+xml", Buffer.from(svg, "utf8"));
    },
  };
}

export function installBuiltinPreviewHostApiRoutes(): () => void {
  const unregisterFrameOverrides = registerPreviewHostApiRoute(
    createFrameOverridesPreviewHostApiRoute(),
  );
  const unregisterPreviewDocument = registerPreviewHostApiRoute(
    createPreviewDocumentPreviewHostApiRoute(),
  );
  const unregisterFrameTree = registerPreviewHostApiRoute(
    createFrameTreePreviewHostApiRoute(),
  );
  const unregisterComponentTree = registerPreviewHostApiRoute(
    createComponentTreePreviewHostApiRoute(),
  );
  const unregisterGridInfo = registerPreviewHostApiRoute(
    createGridInfoPreviewHostApiRoute(),
  );
  const unregisterSvgExport = registerPreviewHostApiRoute(
    createPreviewSvgHostApiRoute(),
  );
  const unregisterForceSave = registerPreviewHostApiRoute(
    createForceSavePreviewHostApiRoute(),
  );
  const unregisterForceSpec = registerPreviewHostApiRoute(
    createForceSpecPreviewHostApiRoute(),
  );
  return () => {
    unregisterForceSpec();
    unregisterForceSave();
    unregisterSvgExport();
    unregisterGridInfo();
    unregisterComponentTree();
    unregisterFrameTree();
    unregisterPreviewDocument();
    unregisterFrameOverrides();
  };
}
