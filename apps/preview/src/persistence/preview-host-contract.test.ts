import test from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MockTextAdapter } from "@diagram-generator/layout-engine";
import { AUTOLAYOUT_HOST_LANE, FORCE_HOST_LANE, buildPreviewBrowseSections } from "../preview-host/lanes.js";
import { buildIndexPageHtml, buildViewerPageHtml } from "../preview-host/pages.js";
import { installBuiltinPreviewHostViewerRoutes } from "../preview-host/builtin-viewer-routes.js";
import {
  listPreviewHostApiRoutes,
  registerPreviewHostApiRoute,
  resolveRegisteredPreviewHostApiRoute,
  resolvePreviewHostApiRoute,
} from "../preview-host/api-routes.js";
import { installBuiltinPreviewHostApiRoutes } from "../preview-host/builtin-api-routes.js";
import {
  buildRegisteredPreviewBrowseSections,
  listPreviewHostViewerRoutes,
  registerPreviewHostViewerRoute,
  resolveRegisteredPreviewDocumentApi,
  resolveRegisteredPreviewViewerRoute,
} from "../preview-host/registry.js";
import { buildPreviewBrowseSectionsFromViewerRoutes, resolvePreviewViewerRoute } from "../preview-host/viewers.js";
import type {
  PreviewHostApiRouteDescriptor,
  PreviewHostViewerRouteDescriptor,
} from "../preview-host/types.js";

const require = createRequire(import.meta.url);
const { parse: parseYaml } = require("yaml") as { parse: (raw: string) => unknown };
const PREVIEW_APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO_ROOT = path.resolve(PREVIEW_APP_ROOT, "..", "..");

test("preview host lane descriptors build typed browse sections", () => {
  const sections = buildPreviewBrowseSections([
    { lane: AUTOLAYOUT_HOST_LANE, slugs: ["support-engineering-flow"] },
    { lane: FORCE_HOST_LANE, slugs: ["force-stakeholders"] },
  ]);

  assert.deepEqual(sections, [
    {
      key: "autolayout",
      label: "Autolayout",
      links: [{ href: "/view/v3:support-engineering-flow", label: "support-engineering-flow" }],
    },
    {
      key: "force",
      label: "Force demos",
      links: [{ href: "/force/view/force-stakeholders", label: "force-stakeholders" }],
    },
  ]);
});

test("preview viewer routes resolve aliases and build browse sections without server-local branching", () => {
  const routes: readonly PreviewHostViewerRouteDescriptor[] = [
    {
      key: "autolayout",
      lane: AUTOLAYOUT_HOST_LANE,
      routePrefixes: ["/v3/view/", "/view/"],
      listSlugs: () => ["support-engineering-flow"],
      hasDocument: () => true,
      buildHtml: () => "<html></html>",
      describeMissing: (slug: string) => `Unknown diagram: ${slug}`,
    },
    {
      key: "force",
      lane: FORCE_HOST_LANE,
      routePrefixes: ["/force/view/"],
      listSlugs: () => ["force-stakeholders"],
      hasDocument: () => true,
      buildHtml: () => "<html></html>",
      describeMissing: (slug: string) => `Unknown force example: ${slug}`,
    },
  ];

  assert.deepEqual(buildPreviewBrowseSectionsFromViewerRoutes(routes), [
    {
      key: "autolayout",
      label: "Autolayout",
      links: [{ href: "/view/v3:support-engineering-flow", label: "support-engineering-flow" }],
    },
    {
      key: "force",
      label: "Force demos",
      links: [{ href: "/force/view/force-stakeholders", label: "force-stakeholders" }],
    },
  ]);

  assert.deepEqual(resolvePreviewViewerRoute("/view/v3:support-engineering-flow", routes, normalizePreviewSlug), {
    route: routes[0],
    slug: "support-engineering-flow",
  });
  assert.deepEqual(resolvePreviewViewerRoute("/v3/view/support-engineering-flow", routes, normalizePreviewSlug), {
    route: routes[0],
    slug: "support-engineering-flow",
  });
  assert.deepEqual(resolvePreviewViewerRoute("/force/view/force-stakeholders", routes, normalizePreviewSlug), {
    route: routes[1],
    slug: "force-stakeholders",
  });
  assert.equal(resolvePreviewViewerRoute("/api/grid/support-engineering-flow", routes, normalizePreviewSlug), null);
});

test("preview host viewer routes register through a typed registry", () => {
  const unregisterAutolayout = registerPreviewHostViewerRoute({
    key: "test-autolayout",
    lane: AUTOLAYOUT_HOST_LANE,
    routePrefixes: ["/test/view/"],
    listSlugs: () => ["support-engineering-flow"],
    hasDocument: () => true,
    buildHtml: () => "<html>grid</html>",
    describeMissing: (slug: string) => `Unknown diagram: ${slug}`,
    documentApi: {
      loadPreviewDocument: (slug: string) => ({ kind: "frame-diagram", slug }),
    },
  });
  const unregisterForce = registerPreviewHostViewerRoute({
    key: "test-force",
    lane: FORCE_HOST_LANE,
    routePrefixes: ["/test-force/view/"],
    listSlugs: () => ["force-stakeholders"],
    hasDocument: () => true,
    buildHtml: () => "<html>force</html>",
    describeMissing: (slug: string) => `Unknown force example: ${slug}`,
  });

  try {
    expectRegisteredRoutes(["test-autolayout", "test-force"]);
    assert.deepEqual(buildRegisteredPreviewBrowseSections(), [
      {
        key: "autolayout",
        label: "Autolayout",
        links: [{ href: "/view/v3:support-engineering-flow", label: "support-engineering-flow" }],
      },
      {
        key: "force",
        label: "Force demos",
        links: [{ href: "/force/view/force-stakeholders", label: "force-stakeholders" }],
      },
    ]);
    assert.deepEqual(
      resolveRegisteredPreviewViewerRoute("/test/view/support-engineering-flow", normalizePreviewSlug),
      {
        route: listPreviewHostViewerRoutes().find((route) => route.key === "test-autolayout"),
        slug: "support-engineering-flow",
      },
    );
    assert.deepEqual(
      resolveRegisteredPreviewDocumentApi("support-engineering-flow", "loadPreviewDocument"),
      {
        route: listPreviewHostViewerRoutes().find((route) => route.key === "test-autolayout"),
        handler: listPreviewHostViewerRoutes().find((route) => route.key === "test-autolayout")?.documentApi?.loadPreviewDocument,
      },
    );
  } finally {
    unregisterForce();
    unregisterAutolayout();
  }

  expectRegisteredRoutes([]);
});

test("builtin preview host viewer routes install through a host-owned installer", () => {
  const unregister = installBuiltinPreviewHostViewerRoutes({
    framePreviewDocumentDeps: { framesDir: "/virtual/frames" },
    framePreviewRenderDeps: {
      framesDir: "/virtual/frames",
      iconLoader: () => null,
      textAdapterPromise: Promise.resolve(new MockTextAdapter()),
    },
    forcePreviewDocumentDeps: { forceDefinitionsDir: "/virtual/force" },
    parseYaml: () => ({}),
    templateHtml: "%MODE%",
    baselineStylesHtml: "",
    previewAssetUrl: (filename: string) => `/preview/${filename}`,
    listAutolayoutDiagrams: () => ["support-engineering-flow"],
    listForceExamples: () => ["force-stakeholders"],
    findReferenceImage: () => null,
    normalizeLayoutEngine: () => "v3",
  });

  try {
    expectRegisteredRoutes(["autolayout", "force"]);
    assert.deepEqual(buildRegisteredPreviewBrowseSections(), [
      {
        key: "force",
        label: "Force demos",
        links: [{ href: "/force/view/force-stakeholders", label: "force-stakeholders" }],
      },
      {
        key: "autolayout",
        label: "Autolayout",
        links: [{ href: "/view/v3:support-engineering-flow", label: "support-engineering-flow" }],
      },
    ]);
  } finally {
    unregister();
  }

  expectRegisteredRoutes([]);
});

test("preview host viewer route registry rejects duplicate keys", () => {
  const unregister = registerPreviewHostViewerRoute({
    key: "test-duplicate",
    lane: AUTOLAYOUT_HOST_LANE,
    routePrefixes: ["/test-dupe/view/"],
    listSlugs: () => [],
    hasDocument: () => false,
    buildHtml: () => "<html></html>",
    describeMissing: (slug: string) => `Unknown diagram: ${slug}`,
  });
  try {
    assert.throws(
      () =>
        registerPreviewHostViewerRoute({
          key: "test-duplicate",
          lane: FORCE_HOST_LANE,
          routePrefixes: ["/elsewhere/"],
          listSlugs: () => [],
          hasDocument: () => false,
          buildHtml: () => "<html></html>",
          describeMissing: (slug: string) => `Unknown force example: ${slug}`,
        }),
      /already registered/,
    );
  } finally {
    unregister();
  }
});

test("preview host api routes resolve through a typed registry", () => {
  const routes: readonly PreviewHostApiRouteDescriptor[] = [
    {
      key: "force-spec",
      method: "GET",
      routePrefixes: ["/api/force-spec/"],
      handle() {},
    },
    {
      key: "force-save",
      method: "POST",
      routePrefixes: ["/api/force-save/"],
      handle() {},
    },
  ];

  assert.deepEqual(
    resolvePreviewHostApiRoute("GET", "/api/force-spec/force-stakeholders", routes, normalizePreviewSlug),
    {
      route: routes[0],
      pathname: "/api/force-spec/force-stakeholders",
      slug: "force-stakeholders",
    },
  );
  assert.deepEqual(
    resolvePreviewHostApiRoute("POST", "/api/force-save/force-stakeholders", routes, normalizePreviewSlug),
    {
      route: routes[1],
      pathname: "/api/force-save/force-stakeholders",
      slug: "force-stakeholders",
    },
  );
  assert.equal(
    resolvePreviewHostApiRoute("GET", "/api/force-save/force-stakeholders", routes, normalizePreviewSlug),
    null,
  );
});

test("preview host api route registry rejects duplicate keys", () => {
  const unregister = registerPreviewHostApiRoute({
    key: "test-duplicate-api",
    method: "GET",
    routePrefixes: ["/api/test/"],
    handle() {},
  });
  try {
    assert.throws(
      () =>
        registerPreviewHostApiRoute({
          key: "test-duplicate-api",
          method: "POST",
          routePrefixes: ["/api/test-post/"],
          handle() {},
        }),
      /already registered/,
    );
  } finally {
    unregister();
  }
});

test("builtin preview host api routes install through a host-owned installer", async () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "dg-preview-host-api-"));
  const forceDefinitionsDir = path.join(tempDir, "force");
  const forceSpecPath = path.join(forceDefinitionsDir, "force-stakeholders.yaml");
  const framesDir = path.join(tempDir, "frames");
  const sourceFramePath = path.join(REPO_ROOT, "scripts", "diagrams", "frames", "complex-routing-usecase.yaml");
  const tempFramePath = path.join(framesDir, "complex-routing-usecase.yaml");
  const sequenceFramePath = path.join(framesDir, "service-handshake-sequence.yaml");
  mkdirSync(framesDir, { recursive: true });
  mkdirSync(forceDefinitionsDir, { recursive: true });
  copyFileSync(sourceFramePath, tempFramePath);
  writeFileSync(forceSpecPath, "nodes:\n  - id: alpha\nlinks: []\n", "utf8");
  writeFileSync(
    sequenceFramePath,
    [
      "schema: author-v1",
      "title: Service handshake sequence",
      "engine: v3",
      "meta:",
      "  layout_engine: sequence",
      "root:",
      "  id: page",
      "  children: []",
      "sequence:",
      "  participants:",
      "    - id: client",
      "      kind: actor",
      "      label: Client",
      "    - id: api",
      "      label:",
      "        - Public",
      "        - API",
      "  messages:",
      "    - from: client",
      "      to: api",
      "      label: GET /v1/handshake",
      "  notes:",
      "    - target: api",
      "      placement: right-of",
      "      label: Auth happens here",
      "",
    ].join("\n"),
    "utf8",
  );

  const unregisterViewers = installBuiltinPreviewHostViewerRoutes({
    framePreviewDocumentDeps: { framesDir },
    framePreviewRenderDeps: {
      framesDir,
      iconLoader: () => null,
      textAdapterPromise: Promise.resolve(new MockTextAdapter()),
    },
    forcePreviewDocumentDeps: { forceDefinitionsDir },
    parseYaml,
    templateHtml: "%MODE%",
    baselineStylesHtml: "",
    previewAssetUrl: (filename: string) => `/preview/${filename}`,
    listAutolayoutDiagrams: () => ["complex-routing-usecase", "service-handshake-sequence"],
    listForceExamples: () => ["force-stakeholders"],
    findReferenceImage: () => null,
    normalizeLayoutEngine: (layoutEngine: string | undefined) => layoutEngine ?? "",
  });

  const unregisterApiRoutes = installBuiltinPreviewHostApiRoutes();

  try {
    assert.deepEqual(
      listPreviewHostApiRoutes().map((route) => route.key).sort(),
      ["component-tree", "force-save", "force-spec", "frame-overrides", "frame-tree", "grid-info", "preview-document", "svg-export"],
    );

    const previewDocumentMatch = resolveRegisteredPreviewHostApiRoute(
      "GET",
      "/api/preview-document/complex-routing-usecase",
      normalizePreviewSlug,
    );
    assert.ok(previewDocumentMatch);
    let previewDocumentPayload: unknown = null;
    await previewDocumentMatch.route.handle(previewDocumentMatch, {
      req: {} as never,
      res: {} as never,
      pathname: previewDocumentMatch.pathname,
      sendJson: (_statusCode, payload) => {
        previewDocumentPayload = payload;
      },
      sendText: () => {
        throw new Error("did not expect preview document route to send plain text");
      },
      sendBytes: () => {
        throw new Error("did not expect preview document route to send bytes");
      },
      readJsonBody: async () => ({}),
    });
    assert.ok(previewDocumentPayload && typeof previewDocumentPayload === "object");
    assert.equal((previewDocumentPayload as Record<string, unknown>).kind, "frame-diagram");
    assert.equal((previewDocumentPayload as Record<string, unknown>).slug, "complex-routing-usecase");

    const sequencePreviewDocumentMatch = resolveRegisteredPreviewHostApiRoute(
      "GET",
      "/api/preview-document/service-handshake-sequence",
      normalizePreviewSlug,
    );
    assert.ok(sequencePreviewDocumentMatch);
    let sequencePreviewDocumentPayload: unknown = null;
    await sequencePreviewDocumentMatch.route.handle(sequencePreviewDocumentMatch, {
      req: {} as never,
      res: {} as never,
      pathname: sequencePreviewDocumentMatch.pathname,
      sendJson: (_statusCode, payload) => {
        sequencePreviewDocumentPayload = payload;
      },
      sendText: () => {
        throw new Error("did not expect sequence preview document route to send plain text");
      },
      sendBytes: () => {
        throw new Error("did not expect sequence preview document route to send bytes");
      },
      readJsonBody: async () => ({}),
    });
    assert.ok(sequencePreviewDocumentPayload && typeof sequencePreviewDocumentPayload === "object");
    assert.equal((sequencePreviewDocumentPayload as Record<string, unknown>).kind, "sequence");
    assert.equal((sequencePreviewDocumentPayload as Record<string, unknown>).slug, "service-handshake-sequence");

    const frameOverridesMatch = resolveRegisteredPreviewHostApiRoute(
      "POST",
      "/api/overrides/complex-routing-usecase",
      normalizePreviewSlug,
    );
    assert.ok(frameOverridesMatch);
    let frameOverridesPayload: unknown = null;
    const baselineFrameText = readFileSync(tempFramePath, "utf8");
    await frameOverridesMatch.route.handle(frameOverridesMatch, {
      req: {} as never,
      res: {} as never,
      pathname: frameOverridesMatch.pathname,
      sendJson: (_statusCode, payload) => {
        frameOverridesPayload = payload;
      },
      sendText: () => {
        throw new Error("did not expect frame override route to send plain text");
      },
      sendBytes: () => {
        throw new Error("did not expect frame override route to send bytes");
      },
      readJsonBody: async () => ({}),
    });
    assert.equal(readFileSync(tempFramePath, "utf8"), baselineFrameText);
    assert.ok(frameOverridesPayload && typeof frameOverridesPayload === "object");
    assert.equal((frameOverridesPayload as Record<string, unknown>).ok, true);

    const specMatch = resolveRegisteredPreviewHostApiRoute(
      "GET",
      "/api/force-spec/force-stakeholders",
      normalizePreviewSlug,
    );
    assert.ok(specMatch);
    let specPayload: unknown = null;
    await specMatch.route.handle(specMatch, {
      req: {} as never,
      res: {} as never,
      pathname: specMatch.pathname,
      sendJson: (_statusCode, payload) => {
        specPayload = payload;
      },
      sendText: () => {
        throw new Error("did not expect force spec route to send plain text");
      },
      sendBytes: () => {
        throw new Error("did not expect force spec route to send bytes");
      },
      readJsonBody: async () => ({}),
    });
    assert.deepEqual(specPayload, { nodes: [{ id: "alpha" }], links: [] });

    const saveMatch = resolveRegisteredPreviewHostApiRoute(
      "POST",
      "/api/force-save/force-stakeholders",
      normalizePreviewSlug,
    );
    assert.ok(saveMatch);
    let savePayload: unknown = null;
    await saveMatch.route.handle(saveMatch, {
      req: {} as never,
      res: {} as never,
      pathname: saveMatch.pathname,
      sendJson: (_statusCode, payload) => {
        savePayload = payload;
      },
      sendText: () => {
        throw new Error("did not expect force save route to send plain text");
      },
      sendBytes: () => {
        throw new Error("did not expect force save route to send bytes");
      },
      readJsonBody: async () => ({ nodes: [{ id: "beta" }], links: [] }),
    });
    assert.deepEqual(readFileSync(forceSpecPath, "utf8"), "nodes:\n  - id: beta\nlinks: []\n");
    assert.deepEqual(savePayload, {
      ok: true,
      canonicalState: {
        slug: "force-stakeholders",
        authoredSpec: { nodes: [{ id: "beta" }], links: [] },
      },
    });

    const svgMatch = resolveRegisteredPreviewHostApiRoute(
      "GET",
      "/svg/complex-routing-usecase",
      normalizePreviewSlug,
    );
    assert.ok(svgMatch);
    let svgPayload: Buffer | null = null;
    let svgContentType = "";
    await svgMatch.route.handle(svgMatch, {
      req: {} as never,
      res: {} as never,
      pathname: svgMatch.pathname,
      sendJson: () => {
        throw new Error("did not expect svg export route to send json");
      },
      sendText: () => {
        throw new Error("did not expect svg export route to send plain text");
      },
      sendBytes: (_statusCode, contentType, bytes) => {
        svgContentType = contentType;
        svgPayload = bytes;
      },
      readJsonBody: async () => ({}),
    });
    assert.equal(svgContentType, "image/svg+xml");
    assert.match(String(svgPayload), /<svg\b/);

    const sequenceSvgMatch = resolveRegisteredPreviewHostApiRoute(
      "GET",
      "/svg/service-handshake-sequence",
      normalizePreviewSlug,
    );
    assert.ok(sequenceSvgMatch);
    let sequenceSvgPayload: Buffer | null = null;
    await sequenceSvgMatch.route.handle(sequenceSvgMatch, {
      req: {} as never,
      res: {} as never,
      pathname: sequenceSvgMatch.pathname,
      sendJson: () => {
        throw new Error("did not expect sequence svg export route to send json");
      },
      sendText: () => {
        throw new Error("did not expect sequence svg export route to send plain text");
      },
      sendBytes: (_statusCode, _contentType, bytes) => {
        sequenceSvgPayload = bytes;
      },
      readJsonBody: async () => ({}),
    });
    assert.match(String(sequenceSvgPayload), /data-sequence-message-id="m1"/);
  } finally {
    unregisterApiRoutes();
    unregisterViewers();
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("preview viewer page HTML is assembled from typed host sections", () => {
  const html = buildViewerPageHtml({
    title: "support-engineering-flow – diagram preview",
    mode: "grid",
    currentPath: "/view/v3:support-engineering-flow",
    templateHtml: [
      "%TITLE%",
      "%BF_STYLES%",
      "%MODE%",
      "%NAV_OPTIONS%",
      "%BROWSE_NAV%",
      "%INSPECTOR_EMPTY%",
      "%MODE_SCRIPTS%",
      "%CONFIG_SCRIPT%",
      "%ELK_SECTION_HIDDEN%",
      "%UNUSED_PLACEHOLDER%",
    ].join("\n"),
    browseSections: buildPreviewBrowseSections([
      { lane: AUTOLAYOUT_HOST_LANE, slugs: ["support-engineering-flow"] },
      { lane: FORCE_HOST_LANE, slugs: ["force-stakeholders"] },
    ]),
    inspectorEmptyText: "Click a component to inspect it.",
    modeScriptsHtml: '<script src="/preview/editor.js"></script>',
    configScript: "window.__DG_CONFIG = {};",
    visibleSidebarSections: ["elk-layout"],
    baselineStylesHtml: '<link rel="stylesheet" href="/preview/bf-os.css">',
  });

  assert.match(html, /support-engineering-flow – diagram preview/);
  assert.match(html, /<optgroup label="Autolayout">/);
  assert.match(html, /value="\/view\/v3:support-engineering-flow" selected/);
  assert.match(html, /dg-browse-link is-active/);
  assert.match(html, /window\.__DG_CONFIG = \{\};/);
  assert.equal(html.includes("%UNUSED_PLACEHOLDER%"), false);
});

test("preview index page HTML renders browse sections without server-local string assembly", () => {
  const html = buildIndexPageHtml({
    port: 8100,
    specHome: "specs/045-preview-host-engine-modularity/",
    browseSections: buildPreviewBrowseSections([
      { lane: AUTOLAYOUT_HOST_LANE, slugs: ["alpha"] },
      { lane: FORCE_HOST_LANE, slugs: ["beta"] },
    ]),
    baselineStylesHtml: '<link rel="stylesheet" href="/preview/bf-os.css">',
  });

  assert.match(html, /Node preview app on port 8100/);
  assert.match(html, /specs\/045-preview-host-engine-modularity\//);
  assert.match(html, /href="\/view\/v3:alpha"/);
  assert.match(html, /href="\/force\/view\/beta"/);
});

function normalizePreviewSlug(value: string): string | null {
  const normalized = decodeURIComponent(value).replace(/^v3:/, "");
  return /^[A-Za-z0-9._:-]+$/.test(normalized) ? normalized : null;
}

function expectRegisteredRoutes(keys: string[]): void {
  assert.deepEqual(
    listPreviewHostViewerRoutes().map((route) => route.key).sort(),
    [...keys].sort(),
  );
}
