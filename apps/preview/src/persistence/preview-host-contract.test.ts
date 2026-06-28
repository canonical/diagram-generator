import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MockTextAdapter,
  createLoadPreviewSvgHostOptionsFromRuntime,
  loadPreviewSvg,
} from "@diagram-generator/layout-engine";
import { AUTOLAYOUT_HOST_LANE, FORCE_HOST_LANE, buildPreviewBrowseSections } from "../preview-host/lanes.js";
import { buildIndexPageHtml, buildViewerPageHtml } from "../preview-host/pages.js";
import { createAutolayoutPreviewHostViewerRoute } from "../preview-host/builtin-autolayout-host.js";
import { createForcePreviewHostViewerRoute } from "../preview-host/builtin-force-host.js";
import { installBuiltinPreviewHostViewerRoutes } from "../preview-host/builtin-viewer-routes.js";
import { installBuiltinPreviewHost } from "../preview-host/install-builtins.js";
import {
  listPreviewHostApiRoutes,
  registerPreviewHostApiRoute,
  resolveRegisteredPreviewHostApiRoute,
  resolvePreviewHostApiRoute,
} from "../preview-host/api-routes.js";
import {
  BUILTIN_AUTOLAYOUT_PREVIEW_HOST_MODULE_KEY,
  BUILTIN_FORCE_PREVIEW_HOST_MODULE_KEY,
  BUILTIN_PREVIEW_HOST_SERVER_MODULE_KEY,
  type BuiltinAutolayoutPreviewHostModuleDeps,
  type BuiltinForcePreviewHostModuleDeps,
  type BuiltinPreviewHostServerRouteDeps,
} from "../preview-host/builtin-host-deps.js";
import { createBuiltinPreviewHostInstallDeps } from "../preview-host/builtin-host-runtime.js";
import { createBuiltinPreviewHostServerRoutes } from "../preview-host/builtin-server-routes.js";
import { createPreviewHostDocumentGetJsonRoute } from "../preview-host/document-api-routes.js";
import { routeRegisteredPreviewHostRequest } from "../preview-host/request-router.js";
import {
  buildRegisteredPreviewBrowseSections,
  listPreviewHostViewerRoutes,
  registerPreviewHostViewerRoute,
  resolveRegisteredPreviewDocumentEndpoint,
  resolveRegisteredPreviewViewerRoute,
} from "../preview-host/registry.js";
import {
  listFrameYamlDocumentKindHandlers,
  registerFrameYamlDocumentKindHandler,
} from "../preview-host/frame-document-kinds.js";
import {
  previewDocumentForSlug,
  resolveFramePreviewViewerContext,
  renderSvgForSlug,
  type FramePreviewCanonicalState,
} from "../preview-host/frame-documents.js";
import { saveFramePreviewDocument } from "../preview-host/frame-document-actions.js";
import {
  installRegisteredPreviewHostModules,
  listPreviewHostModules,
  type PreviewHostModuleDescriptor,
  registerPreviewHostModule,
} from "../preview-host/modules.js";
import { buildPreviewBrowseSectionsFromViewerRoutes, resolvePreviewViewerRoute } from "../preview-host/viewers.js";
import type {
  PreviewHostApiRouteDescriptor,
  PreviewHostViewerRouteDescriptor,
} from "../preview-host/types.js";

const require = createRequire(import.meta.url);
const { parse: parseYaml } = require("yaml") as { parse: (raw: string) => unknown };
const PREVIEW_APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO_ROOT = path.resolve(PREVIEW_APP_ROOT, "..", "..");

test("served layout-engine browser bundle is fresh", () => {
  execFileSync(process.execPath, [path.join(REPO_ROOT, "scripts", "check-browser-bundle-fresh.mjs")], {
    cwd: REPO_ROOT,
    stdio: "pipe",
  });
});

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
    documentEndpoints: [
      {
        kind: "preview-document",
        handler: (slug: string) => ({ kind: "frame-diagram", slug }),
      },
    ],
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
      resolveRegisteredPreviewDocumentEndpoint("support-engineering-flow", "preview-document"),
      {
        route: listPreviewHostViewerRoutes().find((route) => route.key === "test-autolayout"),
        handler: listPreviewHostViewerRoutes().find((route) => route.key === "test-autolayout")?.documentEndpoints?.[0]?.handler,
      },
    );
  } finally {
    unregisterForce();
    unregisterAutolayout();
  }

  expectRegisteredRoutes([]);
});

test("legacy builtin viewer-route helper installs both builtin viewers for narrow contract tests", () => {
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

test("autolayout viewer loads engine controller scripts before editor bootstrap", () => {
  const route = createAutolayoutPreviewHostViewerRoute({
    framePreviewDocumentDeps: {
      framesDir: path.join(REPO_ROOT, "scripts", "diagrams", "frames"),
    },
    framePreviewRenderDeps: {
      framesDir: path.join(REPO_ROOT, "scripts", "diagrams", "frames"),
      iconLoader: () => null,
      textAdapterPromise: Promise.resolve(new MockTextAdapter()),
    },
    forcePreviewDocumentDeps: { forceDefinitionsDir: "/virtual/force" },
    parseYaml: () => ({}),
    templateHtml: "%MODE_SCRIPTS%",
    baselineStylesHtml: "",
    previewAssetUrl: (filename: string) => `/preview/${filename}`,
    listAutolayoutDiagrams: () => ["support-engineering-flow"],
    listForceExamples: () => [],
    findReferenceImage: () => null,
    normalizeLayoutEngine: () => "elk-layered",
  });

  const html = route.buildHtml("support-engineering-flow");
  const controlsIndex = html.indexOf('/preview/elk-layout-controls.js');
  const controllerIndex = html.indexOf('/preview/elk-controller.js');
  const editorIndex = html.indexOf('/preview/editor.js');

  assert.notEqual(controlsIndex, -1);
  assert.notEqual(controllerIndex, -1);
  assert.notEqual(editorIndex, -1);
  assert.ok(controlsIndex < editorIndex);
  assert.ok(controllerIndex < editorIndex);
});

test("autolayout viewer hides ELK controls for a single-engine v3 frame", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "dg-preview-v3-ui-"));
  const framesDir = path.join(tempDir, "frames");
  mkdirSync(framesDir, { recursive: true });
  writeFileSync(
    path.join(framesDir, "simple.yaml"),
    [
      "engine: v3",
      "title: Simple",
      "root:",
      "  id: page",
      "  direction: vertical",
      "  children:",
      "    - id: alpha",
      "      label:",
      "        - Alpha",
      "",
    ].join("\n"),
    "utf8",
  );

  const route = createAutolayoutPreviewHostViewerRoute({
    framePreviewDocumentDeps: { framesDir },
    framePreviewRenderDeps: {
      framesDir,
      iconLoader: () => null,
      textAdapterPromise: Promise.resolve(new MockTextAdapter()),
    },
    forcePreviewDocumentDeps: { forceDefinitionsDir: "/virtual/force" },
    parseYaml: () => ({}),
    templateHtml: contextualAsideTemplate(),
    baselineStylesHtml: "",
    previewAssetUrl: (filename: string) => `/preview/${filename}`,
    listAutolayoutDiagrams: () => ["simple"],
    listForceExamples: () => [],
    findReferenceImage: () => null,
    normalizeLayoutEngine: (layoutEngine: string | undefined) => layoutEngine?.trim() ?? "",
  });

  try {
  const html = route.buildHtml("simple");
  assert.match(html, /id="grid-controls-section" hidden/);
  assert.match(html, /id="elk-layout-section" hidden/);
  assert.match(html, /id="graph-layout-section" hidden/);
  assert.match(html, /id="force-solver-section" hidden/);
  assert.match(html, /<div class="dg-preview-pane-header">[\s\S]*id="engine-switcher-section"/);
  assert.match(html, /id="engine-switcher-tabs" role="tablist"/);
  assert.doesNotMatch(html, /id="engine-switcher-prev"/);
  assert.doesNotMatch(html, /id="engine-switcher-next"/);
  assert.match(html, /\/preview\/engine-switcher\.js/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("autolayout viewer hides native grid controls for ELK-family frames", () => {
  for (const layoutEngine of [
    "elk-layered",
    "elk-force",
    "elk-stress",
    "elk-mrtree",
    "elk-radial",
    "elk-rectpacking",
  ]) {
    const route = createAutolayoutPreviewHostViewerRoute({
      framePreviewDocumentDeps: {
        framesDir: path.join(REPO_ROOT, "scripts", "diagrams", "frames"),
      },
      framePreviewRenderDeps: {
        framesDir: path.join(REPO_ROOT, "scripts", "diagrams", "frames"),
        iconLoader: () => null,
        textAdapterPromise: Promise.resolve(new MockTextAdapter()),
      },
      forcePreviewDocumentDeps: { forceDefinitionsDir: "/virtual/force" },
      parseYaml: () => ({}),
      templateHtml: contextualAsideTemplate(),
      baselineStylesHtml: "",
      previewAssetUrl: (filename: string) => `/preview/${filename}`,
      listAutolayoutDiagrams: () => ["support-engineering-flow"],
      listForceExamples: () => [],
      findReferenceImage: () => null,
      normalizeLayoutEngine: () => layoutEngine,
    });

    const html = route.buildHtml("support-engineering-flow");
    assert.match(html, /id="grid-controls-section" hidden/, layoutEngine);
    assert.match(html, /id="elk-layout-section" >/, layoutEngine);
    assert.match(html, /id="graph-layout-section" hidden/, layoutEngine);
    assert.match(html, /id="force-solver-section" hidden/, layoutEngine);
    assert.match(html, /\/preview\/engine-switcher\.js/, layoutEngine);
  }
});

test("autolayout viewer shows graph layout controls and hides ELK, grid, and force controls for dagre frames", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "dg-preview-dagre-ui-"));
  const framesDir = path.join(tempDir, "frames");
  mkdirSync(framesDir, { recursive: true });
  writeFileSync(
    path.join(framesDir, "dagre-simple.yaml"),
    [
      "engine: v3",
      "title: Dagre simple",
      "meta:",
      "  layout_engine: dagre",
      "root:",
      "  id: page",
      "  direction: vertical",
      "  children:",
      "    - id: leaf_a",
      "      label: [A]",
      "    - id: leaf_b",
      "      label: [B]",
      "arrows:",
      "  - source: leaf_a",
      "    target: leaf_b",
      "",
    ].join("\n"),
    "utf8",
  );
  const route = createAutolayoutPreviewHostViewerRoute({
    framePreviewDocumentDeps: {
      framesDir,
    },
    framePreviewRenderDeps: {
      framesDir,
      iconLoader: () => null,
      textAdapterPromise: Promise.resolve(new MockTextAdapter()),
    },
    forcePreviewDocumentDeps: { forceDefinitionsDir: "/virtual/force" },
    parseYaml: () => ({}),
    templateHtml: contextualAsideTemplate(),
    baselineStylesHtml: "",
    previewAssetUrl: (filename: string) => `/preview/${filename}`,
    listAutolayoutDiagrams: () => ["support-engineering-flow"],
    listForceExamples: () => [],
    findReferenceImage: () => null,
    normalizeLayoutEngine: () => "dagre",
  });

  try {
    const html = route.buildHtml("dagre-simple");
    const controlsIndex = html.indexOf('/preview/graph-layout-controls.js');
    const controllerIndex = html.indexOf('/preview/graph-layout-controller.js');
    const editorIndex = html.indexOf('/preview/editor.js');
    assert.match(html, /id="grid-controls-section" hidden/);
    assert.match(html, /id="elk-layout-section" hidden/);
    assert.match(html, /id="graph-layout-section" >/);
    assert.match(html, /id="force-solver-section" hidden/);
    assert.match(html, /\/preview\/engine-switcher\.js/);
    assert.notEqual(controlsIndex, -1);
    assert.notEqual(controllerIndex, -1);
    assert.notEqual(editorIndex, -1);
    assert.ok(controlsIndex < editorIndex);
    assert.ok(controllerIndex < editorIndex);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("real frame fixtures resolve authored layout engines without silent v3 fallback", () => {
  const framesDir = path.join(REPO_ROOT, "scripts", "diagrams", "frames");
  const expectedLayoutEngines = new Map([
    ["example-platform-architecture", "v3"],
    ["request-to-hardware-stack", "v3"],
  ]);
  for (const [slug, expectedLayoutEngine] of expectedLayoutEngines) {
    const context = resolveFramePreviewViewerContext(
      slug,
      { framesDir },
      {
        normalizeLayoutEngine: (layoutEngine: string | undefined) => layoutEngine?.trim() ?? "",
        findReferenceImage: () => null,
      },
    );

    assert.equal(context.documentKind, "frame-diagram", slug);
    assert.equal(context.authoredLayoutEngine, expectedLayoutEngine, slug);
    assert.equal(context.engineManifest?.id, expectedLayoutEngine, slug);
    assert.equal(context.activeLayoutEngine, expectedLayoutEngine, slug);
    assert.ok(context.compatibleEngines.includes(expectedLayoutEngine), slug);
  }
});

test("switching an authored ELK frame fixture to v3 persists and resolves v3", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "dg-preview-engine-switch-"));
  const framesDir = path.join(tempDir, "frames");
  mkdirSync(framesDir, { recursive: true });
  copyFileSync(
    path.join(REPO_ROOT, "scripts", "diagrams", "frames", "juju-bootstrap-machines-process.yaml"),
    path.join(framesDir, "juju-bootstrap-machines-process.yaml"),
  );
  const normalizeLayoutEngine = (layoutEngine: string | undefined) => layoutEngine?.trim() ?? "";

  try {
    const before = resolveFramePreviewViewerContext(
      "juju-bootstrap-machines-process",
      { framesDir },
      { normalizeLayoutEngine, findReferenceImage: () => null },
    );
    assert.equal(before.engineManifest?.id, "elk-layered");

    saveFramePreviewDocument(
      "juju-bootstrap-machines-process",
      { layout_engine: "v3" },
      {
        framePreviewDocumentDeps: { framesDir },
        parseYaml,
        normalizeLayoutEngine,
      },
    );

    const saved = readFileSync(path.join(framesDir, "juju-bootstrap-machines-process.yaml"), "utf8");
    assert.match(saved, /layout_engine: v3/);
    const after = resolveFramePreviewViewerContext(
      "juju-bootstrap-machines-process",
      { framesDir },
      { normalizeLayoutEngine, findReferenceImage: () => null },
    );
    assert.equal(after.authoredLayoutEngine, "v3");
    assert.equal(after.engineManifest?.id, "v3");
    assert.equal(after.activeLayoutEngine, "v3");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("frame viewer compatibility excludes and rejects graph engines for no-arrow frames", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "dg-preview-engine-compat-"));
  const framesDir = path.join(tempDir, "frames");
  mkdirSync(framesDir, { recursive: true });
  const framePath = path.join(framesDir, "no-arrow-frame.yaml");
  const normalizeLayoutEngine = (layoutEngine: string | undefined) => layoutEngine?.trim() ?? "";
  writeFileSync(
    framePath,
    [
      "engine: v3",
      "title: No arrow frame",
      "root:",
      "  id: page",
      "  direction: vertical",
      "  children:",
      "    - id: child",
      "      label: Child",
      "",
    ].join("\n"),
  );

  try {
    const context = resolveFramePreviewViewerContext(
      "no-arrow-frame",
      { framesDir },
      { normalizeLayoutEngine, findReferenceImage: () => null },
    );

    assert.deepEqual(context.compatibleEngines, ["v3"]);
    assert.throws(
      () => saveFramePreviewDocument(
        "no-arrow-frame",
        { layout_engine: "elk-layered" },
        {
          framePreviewDocumentDeps: { framesDir },
          parseYaml,
          normalizeLayoutEngine,
        },
      ),
      /Cannot use engine 'elk-layered' with frame-diagram: Engine requires at least 1 authored arrow/,
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("sequence frame fixture resolves and renders through the sequence document path", async () => {
  const framesDir = path.join(REPO_ROOT, "scripts", "diagrams", "frames");
  const context = resolveFramePreviewViewerContext(
    "service-handshake-sequence",
    { framesDir },
    {
      normalizeLayoutEngine: (layoutEngine: string | undefined) => layoutEngine?.trim() ?? "",
      findReferenceImage: () => null,
    },
  );

  assert.equal(context.documentKind, "sequence");
  assert.equal(context.engineManifest?.id, "sequence");
  assert.equal(context.activeLayoutEngine, "sequence");
  const route = createAutolayoutPreviewHostViewerRoute({
    framePreviewDocumentDeps: { framesDir },
    framePreviewRenderDeps: {
      framesDir,
      iconLoader: () => null,
      textAdapterPromise: Promise.resolve(new MockTextAdapter()),
    },
    forcePreviewDocumentDeps: { forceDefinitionsDir: "/virtual/force" },
    parseYaml: () => ({}),
    templateHtml: readFileSync(path.join(REPO_ROOT, "scripts", "preview", "viewer-unified.html"), "utf8"),
    baselineStylesHtml: "",
    previewAssetUrl: (filename: string) => `/preview/${filename}`,
    listAutolayoutDiagrams: () => ["service-handshake-sequence"],
    listForceExamples: () => [],
    findReferenceImage: () => null,
    normalizeLayoutEngine: (layoutEngine: string | undefined) => layoutEngine?.trim() ?? "",
  });
  const html = route.buildHtml("service-handshake-sequence");
  assert.match(html, /id="active-engine-label" hidden><\/span>/);
  assert.match(html, /\/preview\/engine-switcher\.js/);
  assert.match(html, /"document_kind":"sequence"/);
  assert.match(html, /"active_engine_id":"sequence"/);
  assert.match(html, /"active_engine_label":"Sequence layout"/);
  assert.match(html, /"show_engine_switcher":false/);

  const svg = await renderSvgForSlug("service-handshake-sequence", {
    framesDir,
    iconLoader: () => null,
    textAdapterPromise: Promise.resolve(new MockTextAdapter()),
  });
  assert.match(svg, /data-sequence-note-id="note/);
  assert.match(svg, /Auth happens here/);
  assert.doesNotMatch(svg, /data-component-id="api"/);
  const widthMatch = svg.match(/<svg[^>]+width="([0-9.]+)"/);
  assert.ok(widthMatch);
  assert.ok(Number(widthMatch[1]) > 680);
});

test("force viewer hides grid and ELK sections", () => {
  const route = createForcePreviewHostViewerRoute({
    forcePreviewDocumentDeps: { forceDefinitionsDir: "/virtual/force" },
    parseYaml: () => ({}),
    templateHtml: contextualAsideTemplate(),
    baselineStylesHtml: "",
    previewAssetUrl: (filename: string) => `/preview/${filename}`,
    listForceExamples: () => ["force-stakeholders"],
  });

  const html = route.buildHtml("force-stakeholders");
  assert.match(html, /id="grid-controls-section" hidden/);
  assert.match(html, /id="elk-layout-section" hidden/);
  assert.match(html, /id="graph-layout-section" hidden/);
  assert.match(html, /id="force-solver-section" >/);
  assert.match(html, /id="force-simulation-section" >/);
});

test("static viewer chrome exposes stable right-aside panel groups", () => {
  const template = readFileSync(path.join(REPO_ROOT, "scripts", "preview", "viewer-unified.html"), "utf8");

  assert.match(template, /data-dg-panel-group="selection" data-dg-panel-id="selection"/);
  assert.match(
    template,
    /id="engine-switcher-section" data-dg-panel-group="engine" data-dg-panel-id="engine-switcher"/,
  );
  assert.match(template, /id="engine-switcher-tabs" role="tablist"/);
  assert.doesNotMatch(template, /id="engine-switcher-prev"/);
  assert.doesNotMatch(template, /id="engine-switcher-next"/);
  assert.match(template, /id="active-engine-label" hidden/);
  assert.match(
    template,
    /id="grid-controls-section" data-dg-panel-group="layout" data-dg-panel-id="layout-grid"/,
  );
  assert.match(
    template,
    /id="elk-layout-section" data-dg-panel-group="engine" data-dg-panel-id="engine-elk-layout"/,
  );
  assert.match(
    template,
    /id="graph-layout-section" data-dg-panel-group="engine" data-dg-panel-id="engine-graph-layout"/,
  );
  assert.match(
    template,
    /id="document-actions-section" data-dg-panel-group="document" data-dg-panel-id="document-actions"/,
  );
  assert.match(template, /<h2 class="dg-section-heading bf-h5">Document<\/h2>/);
  assert.doesNotMatch(template, /<h2 class="dg-section-heading bf-h5">Overrides<\/h2>/);
  assert.match(
    template,
    /id="constraints-section" data-dg-panel-group="diagnostics" data-dg-panel-id="diagnostics-constraints"/,
  );
  assert.match(
    template,
    /id="force-solver-section" data-dg-panel-group="engine" data-dg-panel-id="force-solver"/,
  );
  assert.match(
    template,
    /id="force-simulation-section" data-dg-panel-group="engine" data-dg-panel-id="force-simulation"/,
  );
  assert.match(
    template,
    /id="force-guidance-section" data-dg-panel-group="diagnostics" data-dg-panel-id="force-guidance"/,
  );
});

test("frame YAML preview document kinds register outside the central fallback handler", async () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "dg-preview-document-kind-"));
  const framesDir = path.join(tempDir, "frames");
  const customFramePath = path.join(framesDir, "custom-mindmap.yaml");
  mkdirSync(framesDir, { recursive: true });
  writeFileSync(
    customFramePath,
    [
      "schema: author-v1",
      "title: Custom mindmap",
      "mindmap:",
      "  root: Alpha",
      "",
    ].join("\n"),
    "utf8",
  );

  const unregister = registerFrameYamlDocumentKindHandler({
    kind: "mindmap",
    createPreviewDocument(slug, raw) {
      if (!raw.includes("mindmap:")) {
        return null;
      }
      return {
        kind: "mindmap",
        slug,
        title: "Custom mindmap",
        shellMode: "grid",
      };
    },
    buildCanonicalState(slug, _deps, previewDocument): FramePreviewCanonicalState {
      return {
        slug,
        previewDocument,
        frameTree: null,
        componentTree: [{ id: "root", label: "Alpha" }],
        gridInfo: null,
      };
    },
    async renderSvg() {
      return '<svg data-kind="mindmap"></svg>';
    },
    resolvePreviewEngineResolution(_slug, _deps, previewDocument, normalizeLayoutEngine) {
      const authoredLayoutEngine = normalizeLayoutEngine("mindmap-tree");
      const compatibleContext = {
        shellMode: "grid" as const,
        previewDocumentKind: "mindmap" as const,
      };
      return {
        previewDocument,
        compatibleContext,
        previewContext: {
          layoutEngine: authoredLayoutEngine,
          ...compatibleContext,
        },
        authoredLayoutEngine,
      };
    },
  });

  try {
    const previewDocument = previewDocumentForSlug("custom-mindmap", { framesDir });
    assert.equal(previewDocument.kind, "mindmap");
    assert.equal(
      await renderSvgForSlug("custom-mindmap", {
        framesDir,
        iconLoader: () => null,
        textAdapterPromise: Promise.resolve(new MockTextAdapter()),
      }),
      '<svg data-kind="mindmap"></svg>',
    );
    assert.ok(listFrameYamlDocumentKindHandlers().some((handler) => handler.kind === "mindmap"));
  } finally {
    unregister();
    rmSync(tempDir, { recursive: true, force: true });
  }
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

test("preview host modules register and install through a typed registry", () => {
  const installEvents: string[] = [];
  const moduleA: PreviewHostModuleDescriptor = {
    key: "test-module-a",
    install() {
      installEvents.push("install-a");
      return () => {
        installEvents.push("uninstall-a");
      };
    },
  };
  const moduleB: PreviewHostModuleDescriptor = {
    key: "test-module-b",
    install() {
      installEvents.push("install-b");
      return () => {
        installEvents.push("uninstall-b");
      };
    },
  };

  const unregisterA = registerPreviewHostModule(moduleA);
  const unregisterB = registerPreviewHostModule(moduleB);

  try {
    assert.deepEqual(
      listPreviewHostModules().map((descriptor) => descriptor.key),
      ["test-module-a", "test-module-b"],
    );
    const uninstall = installRegisteredPreviewHostModules({
      appRoot: "/virtual/app",
      repoRoot: "/virtual/repo",
      specHome: "specs/046-editor-host-endgame/",
      currentGitBranch: () => "feat/046-editor-host-endgame",
      buildIndexHtml: (port: number) => `<html data-port="${port}"></html>`,
      layoutEngineFontPath: "/virtual/layout-font.ttf",
      baselineOsCssPath: "/virtual/bf-os.css",
      baselineFontDir: "/virtual/bf-fonts",
      iconsDir: "/virtual/icons",
      resolvePreviewAssetPath: () => null,
      ensureLayoutEngineBrowserAssets: async () => {},
      parseYaml: () => ({}),
      templateHtml: "%MODE%",
      baselineStylesHtml: "",
      previewAssetUrl: (filename: string) => `/preview/${filename}`,
      readReloadState: () => ({ generation: 1, error: null }),
      addSseClient: () => {},
      removeSseClient: () => {},
      resolvePreviewHostModuleContext: () => {
        throw new Error("did not expect generic module-registry test to resolve module context");
      },
    });
    assert.deepEqual(installEvents, ["install-a", "install-b"]);
    uninstall();
    assert.deepEqual(installEvents, ["install-a", "install-b", "uninstall-b", "uninstall-a"]);
  } finally {
    unregisterB();
    unregisterA();
  }

  assert.deepEqual(listPreviewHostModules().map((descriptor) => descriptor.key), []);
});

test("preview host module registry rejects duplicate keys", () => {
  const unregister = registerPreviewHostModule({
    key: "test-module-duplicate",
    install() {},
  });
  try {
    assert.throws(
      () =>
        registerPreviewHostModule({
          key: "test-module-duplicate",
          install() {},
        }),
      /already registered/,
    );
  } finally {
    unregister();
  }
});

test("future preview lane onboarding installs through a preview-host module without server changes", async () => {
  const deps = createBuiltinPreviewHostInstallDeps({
    framePreviewDocumentDeps: { framesDir: "/virtual/frames" },
    framePreviewRenderDeps: {
      framesDir: "/virtual/frames",
      iconLoader: () => null,
      textAdapterPromise: Promise.resolve(new MockTextAdapter()),
    },
    forcePreviewDocumentDeps: { forceDefinitionsDir: "/virtual/force" },
    appRoot: "/virtual/app",
    repoRoot: "/virtual/repo",
    framesDir: "/virtual/frames",
    specHome: "docs/spec-archive/045-preview-host-engine-modularity/",
    currentGitBranch: () => "feat/045-preview-host-engine-modularity",
    layoutEngineFontPath: "/virtual/layout-font.ttf",
    baselineOsCssPath: "/virtual/bf-os.css",
    baselineFontDir: "/virtual/bf-fonts",
    iconsDir: "/virtual/icons",
    resolvePreviewAssetPath: () => null,
    ensureLayoutEngineBrowserAssets: async () => {},
    parseYaml: () => ({}),
    templateHtml: "%MODE%",
    baselineStylesHtml: '<link rel="stylesheet" href="/preview/bf-os.css">',
    previewAssetUrl: (filename: string) => `/preview/${filename}`,
    readReloadState: () => ({ generation: 1, error: null }),
    addSseClient: () => {},
    removeSseClient: () => {},
    corpusRefDir: "/virtual/corpus",
    inputDirs: ["/virtual/input"],
  });

  const unregisterModule = registerPreviewHostModule({
    key: "sequence-preview-host",
    install() {
      const unregisterViewer = registerPreviewHostViewerRoute({
        key: "sequence",
        lane: {
          key: "sequence",
          label: "Sequence demos",
          buildViewerPath(slug: string): string {
            return `/sequence/view/${slug}`;
          },
        },
        routePrefixes: ["/sequence/view/"],
        listSlugs: () => ["service-handshake"],
        hasDocument: () => true,
        buildHtml: (slug: string) => `<html data-sequence="${slug}"></html>`,
        describeMissing: (slug: string) => `Unknown sequence example: ${slug}`,
        documentEndpoints: [
          {
            kind: "sequence-outline",
            handler: (slug: string) => ({ kind: "outline", slug, lane: "sequence" }),
          },
        ],
      });
      const unregisterApi = registerPreviewHostApiRoute(
        createPreviewHostDocumentGetJsonRoute({
          key: "sequence-outline",
          routePrefixes: ["/api/sequence-outline/"],
          documentEndpointKind: "sequence-outline",
          routeKey: "sequence",
          missingMessage: (slug: string) => `Unknown sequence example: ${slug}`,
        }),
      );
      return () => {
        unregisterApi();
        unregisterViewer();
      };
    },
  });

  try {
    const uninstall = installRegisteredPreviewHostModules(deps);
    try {
      assert.deepEqual(buildRegisteredPreviewBrowseSections(), [
        {
          key: "sequence",
          label: "Sequence demos",
          links: [{ href: "/sequence/view/service-handshake", label: "service-handshake" }],
        },
      ]);

      const viewerMatch = resolveRegisteredPreviewViewerRoute(
        "/sequence/view/service-handshake",
        normalizePreviewSlug,
      );
      assert.ok(viewerMatch);
      assert.equal(viewerMatch?.route.key, "sequence");
      assert.equal(
        viewerMatch?.route.buildHtml("service-handshake"),
        '<html data-sequence="service-handshake"></html>',
      );

      const indexHtml = deps.buildIndexHtml(8100);
      assert.match(indexHtml, /href="\/sequence\/view\/service-handshake"/);

      const apiMatch = resolveRegisteredPreviewHostApiRoute(
        "GET",
        "/api/sequence-outline/service-handshake",
        normalizePreviewSlug,
      );
      assert.ok(apiMatch);
      let outlinePayload: unknown = null;
      await apiMatch.route.handle(apiMatch, {
        req: {} as never,
        res: {} as never,
        pathname: apiMatch.pathname,
        sendJson: (_statusCode, payload) => {
          outlinePayload = payload;
        },
        sendText: () => {
          throw new Error("did not expect sequence-outline route to send plain text");
        },
        sendBytes: () => {
          throw new Error("did not expect sequence-outline route to send bytes");
        },
        readJsonBody: async () => ({}),
      });
      assert.deepEqual(outlinePayload, {
        kind: "outline",
        slug: "service-handshake",
        lane: "sequence",
      });
    } finally {
      uninstall();
    }
  } finally {
    unregisterModule();
  }

  expectRegisteredRoutes([]);
  assert.deepEqual(listPreviewHostApiRoutes().map((route) => route.key), []);
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
    {
      key: "runtime-identity",
      method: "GET",
      matchMode: "exact",
      routePrefixes: ["/api/runtime-identity"],
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
  assert.deepEqual(
    resolvePreviewHostApiRoute("GET", "/api/runtime-identity", routes, normalizePreviewSlug),
    {
      route: routes[2],
      pathname: "/api/runtime-identity",
      slug: null,
    },
  );
  assert.equal(
    resolvePreviewHostApiRoute("GET", "/api/runtime-identity/extra", routes, normalizePreviewSlug),
    null,
  );
});

test("preview host document routes resolve arbitrary owner-defined action keys", async () => {
  const unregisterViewerRoute = registerPreviewHostViewerRoute({
    key: "test-document-actions",
    lane: AUTOLAYOUT_HOST_LANE,
    routePrefixes: ["/test-document-actions/view/"],
    listSlugs: () => ["support-engineering-flow"],
    hasDocument: () => true,
    buildHtml: () => "<html></html>",
    describeMissing: (slug: string) => `Unknown diagram: ${slug}`,
    documentEndpoints: [
      {
        kind: "load-outline",
        handler: (slug: string) => ({ kind: "outline", slug }),
      },
    ],
  });
  const unregisterApiRoute = registerPreviewHostApiRoute(
    createPreviewHostDocumentGetJsonRoute({
      key: "test-outline",
      routePrefixes: ["/api/test-outline/"],
      documentEndpointKind: "load-outline",
      routeKey: "test-document-actions",
      missingMessage: (slug: string) => `Unknown outline: ${slug}`,
    }),
  );

  try {
    const outlineMatch = resolveRegisteredPreviewHostApiRoute(
      "GET",
      "/api/test-outline/support-engineering-flow",
      normalizePreviewSlug,
    );
    assert.ok(outlineMatch);
    let outlinePayload: unknown = null;
    await outlineMatch.route.handle(outlineMatch, {
      req: {} as never,
      res: {} as never,
      pathname: outlineMatch.pathname,
      sendJson: (_statusCode, payload) => {
        outlinePayload = payload;
      },
      sendText: () => {
        throw new Error("did not expect outline route to send plain text");
      },
      sendBytes: () => {
        throw new Error("did not expect outline route to send bytes");
      },
      readJsonBody: async () => ({}),
    });
    assert.deepEqual(outlinePayload, {
      kind: "outline",
      slug: "support-engineering-flow",
    });
  } finally {
    unregisterApiRoute();
    unregisterViewerRoute();
  }
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

test("preview host request router dispatches registered API and viewer routes without server-local branching", async () => {
  const events: Array<Record<string, unknown>> = [];
  const unregisterApiRoute = registerPreviewHostApiRoute({
    key: "test-router-post",
    method: "POST",
    routePrefixes: ["/api/router/"],
    handle(match, context) {
      events.push({
        kind: "post-route",
        pathname: match.pathname,
        slug: match.slug,
        port: context.port,
        hasServeFile: typeof context.serveFile,
      });
      context.sendJson(201, { ok: true, slug: match.slug });
    },
  });
  const unregisterViewerRoute = registerPreviewHostViewerRoute({
    key: "test-router-view",
    lane: AUTOLAYOUT_HOST_LANE,
    routePrefixes: ["/view/"],
    listSlugs: () => ["alpha"],
    hasDocument: (slug: string) => slug === "alpha",
    buildHtml: (slug: string) => `<html data-slug="${slug}"></html>`,
    describeMissing: (slug: string) => `Missing ${slug}`,
  });

  try {
    const responses: Array<Record<string, unknown>> = [];
    await routeRegisteredPreviewHostRequest({
      req: { method: "POST" } as never,
      res: {} as never,
      pathname: "/api/router/alpha",
      port: 8100,
      normalizeSlug: normalizePreviewSlug,
      sendHtml: (statusCode: number, html: string) => {
        responses.push({ kind: "html", statusCode, html });
      },
      sendJson: (statusCode: number, payload: unknown) => {
        responses.push({ kind: "json", statusCode, payload });
      },
      sendText: (statusCode: number, text: string) => {
        responses.push({ kind: "text", statusCode, text });
      },
      sendBytes: () => {
        responses.push({ kind: "bytes" });
      },
      serveFile: () => {},
      readJsonBody: async () => ({}),
      notImplementedPayload: { ok: false },
    });

    await routeRegisteredPreviewHostRequest({
      req: { method: "GET" } as never,
      res: {} as never,
      pathname: "/view/alpha",
      port: 8100,
      normalizeSlug: normalizePreviewSlug,
      sendHtml: (statusCode: number, html: string) => {
        responses.push({ kind: "html", statusCode, html });
      },
      sendJson: (statusCode: number, payload: unknown) => {
        responses.push({ kind: "json", statusCode, payload });
      },
      sendText: (statusCode: number, text: string) => {
        responses.push({ kind: "text", statusCode, text });
      },
      sendBytes: () => {
        responses.push({ kind: "bytes" });
      },
      serveFile: () => {},
      readJsonBody: async () => ({}),
      notImplementedPayload: { ok: false },
    });

    await routeRegisteredPreviewHostRequest({
      req: { method: "GET" } as never,
      res: {} as never,
      pathname: "/unknown",
      port: 8100,
      normalizeSlug: normalizePreviewSlug,
      sendHtml: (statusCode: number, html: string) => {
        responses.push({ kind: "html", statusCode, html });
      },
      sendJson: (statusCode: number, payload: unknown) => {
        responses.push({ kind: "json", statusCode, payload });
      },
      sendText: (statusCode: number, text: string) => {
        responses.push({ kind: "text", statusCode, text });
      },
      sendBytes: () => {
        responses.push({ kind: "bytes" });
      },
      serveFile: () => {},
      readJsonBody: async () => ({}),
      notImplementedPayload: { ok: false, route: "/unknown" },
    });

    assert.deepEqual(events, [
      {
        kind: "post-route",
        pathname: "/api/router/alpha",
        slug: "alpha",
        port: 8100,
        hasServeFile: "function",
      },
    ]);
    assert.deepEqual(responses, [
      { kind: "json", statusCode: 201, payload: { ok: true, slug: "alpha" } },
      { kind: "html", statusCode: 200, html: '<html data-slug="alpha"></html>' },
      { kind: "json", statusCode: 501, payload: { ok: false, route: "/unknown" } },
    ]);
  } finally {
    unregisterViewerRoute();
    unregisterApiRoute();
  }
});

test("preview viewer requests refresh browser assets before building cache-busted html", async () => {
  let browserAssetVersion = "stale";
  const events: string[] = [];
  const unregisterViewerRoute = registerPreviewHostViewerRoute({
    key: "test-router-fresh-browser-assets",
    lane: AUTOLAYOUT_HOST_LANE,
    routePrefixes: ["/fresh/view/"],
    listSlugs: () => ["alpha"],
    hasDocument: (slug: string) => slug === "alpha",
    buildHtml: (slug: string) => {
      events.push(`build:${browserAssetVersion}`);
      return `<script src="/preview/layout-engine.js?v=${browserAssetVersion}"></script><main>${slug}</main>`;
    },
    describeMissing: (slug: string) => `Missing ${slug}`,
  });

  try {
    await routeRegisteredPreviewHostRequest({
      req: { method: "GET" } as never,
      res: {} as never,
      pathname: "/fresh/view/alpha",
      normalizeSlug: normalizePreviewSlug,
      ensureViewerBrowserAssets: async () => {
        events.push("ensure");
        browserAssetVersion = "fresh";
      },
      sendHtml: (_statusCode: number, html: string) => {
        events.push(html);
      },
      sendJson: () => {
        throw new Error("did not expect json");
      },
      sendText: () => {
        throw new Error("did not expect text");
      },
      sendBytes: () => {
        throw new Error("did not expect bytes");
      },
      readJsonBody: async () => ({}),
      notImplementedPayload: { ok: false },
    });

    assert.deepEqual(events, [
      "ensure",
      "build:fresh",
      '<script src="/preview/layout-engine.js?v=fresh"></script><main>alpha</main>',
    ]);
  } finally {
    unregisterViewerRoute();
  }
});

test("builtin preview host production install coexists with a third registered lane module", async () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "dg-preview-host-builtins-"));
  const framesDir = path.join(tempDir, "frames");
  const forceDefinitionsDir = path.join(tempDir, "force");
  mkdirSync(framesDir, { recursive: true });
  mkdirSync(forceDefinitionsDir, { recursive: true });
  writeFileSync(
    path.join(framesDir, "alpha.yaml"),
    ["schema: author-v1", "engine: v3", "root:", "  id: page", "  children: []", ""].join("\n"),
    "utf8",
  );
  writeFileSync(path.join(forceDefinitionsDir, "force-stakeholders.yaml"), "nodes: []\nlinks: []\n", "utf8");

  const unregisterModule = registerPreviewHostModule({
    key: "sequence-preview-host",
    install() {
      const unregisterViewer = registerPreviewHostViewerRoute({
        key: "sequence",
        lane: {
          key: "sequence",
          label: "Sequence demos",
          buildViewerPath(slug: string): string {
            return `/sequence/view/${slug}`;
          },
        },
        routePrefixes: ["/sequence/view/"],
        listSlugs: () => ["service-handshake"],
        hasDocument: () => true,
        buildHtml: (slug: string) => `<html data-sequence="${slug}"></html>`,
        describeMissing: (slug: string) => `Unknown sequence example: ${slug}`,
        documentEndpoints: [
          {
            kind: "sequence-outline",
            handler: (slug: string) => ({ kind: "outline", slug, lane: "sequence" }),
          },
        ],
      });
      const unregisterApi = registerPreviewHostApiRoute(
        createPreviewHostDocumentGetJsonRoute({
          key: "sequence-outline",
          routePrefixes: ["/api/sequence-outline/"],
          documentEndpointKind: "sequence-outline",
          routeKey: "sequence",
          missingMessage: (slug: string) => `Unknown sequence example: ${slug}`,
        }),
      );
      return () => {
        unregisterApi();
        unregisterViewer();
      };
    },
  });

  const deps = createBuiltinPreviewHostInstallDeps({
    framePreviewDocumentDeps: { framesDir },
    framePreviewRenderDeps: {
      framesDir,
      iconLoader: () => null,
      textAdapterPromise: Promise.resolve(new MockTextAdapter()),
    },
    forcePreviewDocumentDeps: { forceDefinitionsDir },
    appRoot: "/virtual/app",
    repoRoot: "/virtual/repo",
    framesDir,
    specHome: "docs/spec-archive/045-preview-host-engine-modularity/",
    currentGitBranch: () => "feat/045-preview-host-engine-modularity",
    layoutEngineFontPath: "/virtual/layout-font.ttf",
    baselineOsCssPath: "/virtual/bf-os.css",
    baselineFontDir: "/virtual/bf-fonts",
    iconsDir: "/virtual/icons",
    resolvePreviewAssetPath: (filename: string) => `/virtual/preview/${filename}`,
    ensureLayoutEngineBrowserAssets: async () => {},
    parseYaml,
    templateHtml: "%MODE%",
    baselineStylesHtml: "",
    previewAssetUrl: (filename: string) => `/preview/${filename}`,
    readReloadState: () => ({ generation: 1, error: null }),
    addSseClient: () => {},
    removeSseClient: () => {},
    corpusRefDir: "/virtual/corpus",
    inputDirs: ["/virtual/input"],
  });

  try {
    const unregisterBuiltins = installBuiltinPreviewHost(deps);
    try {
      expectRegisteredRoutes(["autolayout", "force", "sequence"]);
      for (const key of [
        "component-tree",
        "force-save",
        "force-spec",
        "frame-overrides",
        "frame-tree",
        "grid-info",
        "preview-document",
        "sequence-outline",
        "svg-export",
      ]) {
        assert.ok(
          listPreviewHostApiRoutes().some((route) => route.key === key),
          `expected api route '${key}' to be registered`,
        );
      }

      assert.equal(
        resolveRegisteredPreviewViewerRoute("/view/v3:alpha", normalizePreviewSlug)?.route.key,
        "autolayout",
      );
      assert.equal(
        resolveRegisteredPreviewViewerRoute("/force/view/force-stakeholders", normalizePreviewSlug)?.route.key,
        "force",
      );
      assert.equal(
        resolveRegisteredPreviewViewerRoute("/sequence/view/service-handshake", normalizePreviewSlug)?.route.key,
        "sequence",
      );

      const indexHtml = deps.buildIndexHtml(8100);
      assert.match(indexHtml, /href="\/view\/v3:alpha"/);
      assert.match(indexHtml, /href="\/force\/view\/force-stakeholders"/);
      assert.match(indexHtml, /href="\/sequence\/view\/service-handshake"/);

      const sequenceOutlineMatch = resolveRegisteredPreviewHostApiRoute(
        "GET",
        "/api/sequence-outline/service-handshake",
        normalizePreviewSlug,
      );
      assert.ok(sequenceOutlineMatch);
      let outlinePayload: unknown = null;
      await sequenceOutlineMatch.route.handle(sequenceOutlineMatch, {
        req: {} as never,
        res: {} as never,
        pathname: sequenceOutlineMatch.pathname,
        sendJson: (_statusCode, payload) => {
          outlinePayload = payload;
        },
        sendText: () => {
          throw new Error("did not expect sequence outline route to send plain text");
        },
        sendBytes: () => {
          throw new Error("did not expect sequence outline route to send bytes");
        },
        readJsonBody: async () => ({}),
      });
      assert.deepEqual(outlinePayload, {
        kind: "outline",
        slug: "service-handshake",
        lane: "sequence",
      });
    } finally {
      unregisterBuiltins();
    }
  } finally {
    unregisterModule();
    rmSync(tempDir, { recursive: true, force: true });
  }

  expectRegisteredRoutes([]);
  assert.deepEqual(listPreviewHostApiRoutes().map((route) => route.key), []);
});

test("builtin preview host runtime assembles browse, reference, and engine helpers outside server.ts", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "dg-preview-host-runtime-"));
  const framesDir = path.join(tempDir, "frames");
  const forceDefinitionsDir = path.join(tempDir, "force");
  const corpusRefDir = path.join(tempDir, "corpus");
  const inputDir = path.join(tempDir, "input");
  mkdirSync(framesDir, { recursive: true });
  mkdirSync(forceDefinitionsDir, { recursive: true });
  mkdirSync(corpusRefDir, { recursive: true });
  mkdirSync(inputDir, { recursive: true });
  writeFileSync(path.join(framesDir, "zeta.yaml"), "schema: author-v1\n", "utf8");
  writeFileSync(path.join(framesDir, "alpha.yaml"), "schema: author-v1\n", "utf8");
  writeFileSync(path.join(forceDefinitionsDir, "force-stakeholders.yaml"), "nodes: []\nlinks: []\n", "utf8");
  writeFileSync(
    path.join(forceDefinitionsDir, "force-reference-example.yaml"),
    "reference_image: force-ref.png\nnodes: []\nlinks: []\n",
    "utf8",
  );
  writeFileSync(path.join(corpusRefDir, "alpha-source.png"), "png", "utf8");
  writeFileSync(path.join(inputDir, "force-ref.png"), "png", "utf8");

  const deps = createBuiltinPreviewHostInstallDeps({
    framePreviewDocumentDeps: { framesDir },
    framePreviewRenderDeps: {
      framesDir,
      iconLoader: () => null,
      textAdapterPromise: Promise.resolve(new MockTextAdapter()),
    },
    forcePreviewDocumentDeps: { forceDefinitionsDir },
    appRoot: "/virtual/app",
    repoRoot: "/virtual/repo",
    framesDir,
    specHome: "docs/spec-archive/045-preview-host-engine-modularity/",
    currentGitBranch: () => "feat/045-preview-host-engine-modularity",
    layoutEngineFontPath: "/virtual/layout-font.ttf",
    baselineOsCssPath: "/virtual/bf-os.css",
    baselineFontDir: "/virtual/bf-fonts",
    iconsDir: "/virtual/icons",
    resolvePreviewAssetPath: () => null,
    ensureLayoutEngineBrowserAssets: async () => {},
    parseYaml,
    templateHtml: "%MODE%",
    baselineStylesHtml: '<link rel="stylesheet" href="/preview/bf-os.css">',
    previewAssetUrl: (filename: string) => `/preview/${filename}`,
    readReloadState: () => ({ generation: 1, error: null }),
    addSseClient: () => {},
    removeSseClient: () => {},
    corpusRefDir,
    inputDirs: [inputDir],
  });

  const unregisterAutolayout = registerPreviewHostViewerRoute({
    key: "runtime-autolayout",
    lane: AUTOLAYOUT_HOST_LANE,
    routePrefixes: ["/runtime/view/"],
    listSlugs: () =>
      deps.resolvePreviewHostModuleContext<BuiltinAutolayoutPreviewHostModuleDeps>(
        BUILTIN_AUTOLAYOUT_PREVIEW_HOST_MODULE_KEY,
      ).listAutolayoutDiagrams(),
    hasDocument: () => true,
    buildHtml: () => "<html>grid</html>",
    describeMissing: (slug: string) => `Unknown diagram: ${slug}`,
  });
  const unregisterForce = registerPreviewHostViewerRoute({
    key: "runtime-force",
    lane: FORCE_HOST_LANE,
    routePrefixes: ["/runtime-force/view/"],
    listSlugs: () =>
      deps.resolvePreviewHostModuleContext<BuiltinForcePreviewHostModuleDeps>(
        BUILTIN_FORCE_PREVIEW_HOST_MODULE_KEY,
      ).listForceExamples(),
    hasDocument: () => true,
    buildHtml: () => "<html>force</html>",
    describeMissing: (slug: string) => `Unknown force example: ${slug}`,
  });

  try {
    const autolayoutDeps = deps.resolvePreviewHostModuleContext<BuiltinAutolayoutPreviewHostModuleDeps>(
      BUILTIN_AUTOLAYOUT_PREVIEW_HOST_MODULE_KEY,
    );
    const forceDeps = deps.resolvePreviewHostModuleContext<BuiltinForcePreviewHostModuleDeps>(
      BUILTIN_FORCE_PREVIEW_HOST_MODULE_KEY,
    );
    const serverDeps = deps.resolvePreviewHostModuleContext<BuiltinPreviewHostServerRouteDeps>(
      BUILTIN_PREVIEW_HOST_SERVER_MODULE_KEY,
    );

    assert.equal("listAutolayoutDiagrams" in deps, false);
    assert.equal("listForceExamples" in deps, false);
    assert.equal("normalizeLayoutEngine" in deps, false);
    assert.equal("findReferenceImage" in deps, false);

    assert.deepEqual(autolayoutDeps.listAutolayoutDiagrams(), ["alpha", "zeta"]);
    assert.deepEqual(forceDeps.listForceExamples(), ["force-reference-example", "force-stakeholders"]);
    assert.equal(autolayoutDeps.normalizeLayoutEngine(" v3 "), "v3");
    assert.equal(autolayoutDeps.normalizeLayoutEngine(" definitely-not-real "), "");
    assert.equal(serverDeps.findReferenceImage("alpha"), path.join(corpusRefDir, "alpha-source.png"));
    assert.equal(serverDeps.findReferenceImage("force-reference-example"), path.join(inputDir, "force-ref.png"));

    const html = deps.buildIndexHtml(8100);
    assert.match(html, /docs\/spec-archive\/045-preview-host-engine-modularity\//);
    assert.match(html, /href="\/view\/v3:alpha"/);
    assert.match(html, /href="\/force\/view\/force-reference-example"/);
  } finally {
    unregisterForce();
    unregisterAutolayout();
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("builtin preview host server routes install through typed descriptors", async () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "dg-preview-host-server-"));
  const previewAssetPath = path.join(tempDir, "layout-engine.js");
  const baselineOsCssPath = path.join(tempDir, "bf-os.css");
  const baselineFontDir = path.join(tempDir, "bf-fonts");
  const layoutEngineFontPath = path.join(tempDir, "UbuntuSans[wdth,wght].ttf");
  const iconsDir = path.join(tempDir, "icons");
  const iconPath = path.join(iconsDir, "sample.svg");
  const referencePath = path.join(tempDir, "reference.png");
  mkdirSync(baselineFontDir, { recursive: true });
  mkdirSync(iconsDir, { recursive: true });
  writeFileSync(previewAssetPath, "console.log('preview');", "utf8");
  writeFileSync(baselineOsCssPath, "body {}", "utf8");
  writeFileSync(path.join(baselineFontDir, "foundry.woff2"), "font", "utf8");
  writeFileSync(layoutEngineFontPath, "font-data", "utf8");
  writeFileSync(iconPath, "<svg></svg>", "utf8");
  writeFileSync(referencePath, "png", "utf8");

  const sseClients = new Set<unknown>();
  let ensuredBrowserAssets = 0;
  const routes = createBuiltinPreviewHostServerRoutes({
    appRoot: "/virtual/app",
    repoRoot: "/virtual/repo",
    framesDir: "/virtual/frames",
    specHome: "specs/046-editor-host-endgame/",
    currentGitBranch: () => "feat/046-editor-host-endgame",
    buildIndexHtml: (port: number) => `<html data-port="${port}"></html>`,
    layoutEngineFontPath,
    baselineOsCssPath,
    baselineFontDir,
    iconsDir,
    resolvePreviewAssetPath: (filename: string) =>
      filename === "layout-engine.js" ? previewAssetPath : null,
    ensureLayoutEngineBrowserAssets: async () => {
      ensuredBrowserAssets += 1;
    },
    findReferenceImage: (slug: string) => (slug === "support-engineering-flow" ? referencePath : null),
    readReloadState: () => ({ generation: 7, error: null }),
    addSseClient: (client) => {
      sseClients.add(client);
    },
    removeSseClient: (client) => {
      sseClients.delete(client);
    },
  });

  try {
    const indexMatch = resolvePreviewHostApiRoute("GET", "/", routes, normalizePreviewSlug);
    assert.ok(indexMatch);
    let indexHtml = "";
    await indexMatch.route.handle(indexMatch, {
      req: {} as never,
      res: {} as never,
      pathname: indexMatch.pathname,
      port: 8100,
      sendHtml: (_statusCode, html) => {
        indexHtml = html;
      },
      sendJson: () => {
        throw new Error("did not expect index route to send json");
      },
      sendText: () => {
        throw new Error("did not expect index route to send plain text");
      },
      sendBytes: () => {
        throw new Error("did not expect index route to send bytes");
      },
      readJsonBody: async () => ({}),
    });
    assert.equal(indexHtml, '<html data-port="8100"></html>');

    const runtimeIdentityMatch = resolvePreviewHostApiRoute(
      "GET",
      "/api/runtime-identity",
      routes,
      normalizePreviewSlug,
    );
    assert.ok(runtimeIdentityMatch);
    let runtimeIdentityPayload: unknown = null;
    await runtimeIdentityMatch.route.handle(runtimeIdentityMatch, {
      req: {} as never,
      res: {} as never,
      pathname: runtimeIdentityMatch.pathname,
      port: 8100,
      sendJson: (_statusCode, payload) => {
        runtimeIdentityPayload = payload;
      },
      sendText: () => {
        throw new Error("did not expect runtime identity route to send plain text");
      },
      sendBytes: () => {
        throw new Error("did not expect runtime identity route to send bytes");
      },
      readJsonBody: async () => ({}),
    });
    assert.equal((runtimeIdentityPayload as Record<string, unknown>).specHome, "specs/046-editor-host-endgame/");
    assert.equal((runtimeIdentityPayload as Record<string, unknown>).port, 8100);

    const eventsMatch = resolvePreviewHostApiRoute("GET", "/events", routes, normalizePreviewSlug);
    assert.ok(eventsMatch);
    const eventsReq = new EventEmitter() as unknown as Record<string, unknown>;
    const eventWrites: string[] = [];
    let ended = false;
    const eventsRes = {
      writeHead: () => {},
      write: (value: string) => {
        eventWrites.push(value);
      },
      end: () => {
        ended = true;
      },
    } as unknown as Record<string, unknown>;
    await eventsMatch.route.handle(eventsMatch, {
      req: eventsReq as never,
      res: eventsRes as never,
      pathname: eventsMatch.pathname,
      sendJson: () => {
        throw new Error("did not expect events route to send json");
      },
      sendText: () => {
        throw new Error("did not expect events route to send plain text");
      },
      sendBytes: () => {
        throw new Error("did not expect events route to send bytes");
      },
      readJsonBody: async () => ({}),
    });
    assert.match(eventWrites.join(""), /"generation":7/);
    assert.equal(sseClients.size, 1);
    (eventsReq as EventEmitter).emit("close");
    assert.equal(sseClients.size, 0);
    assert.equal(ended, true);

    let servedFilePath = "";
    let servedCacheControl = "";
    const staticAssetMatch = resolvePreviewHostApiRoute(
      "GET",
      "/preview/layout-engine.js",
      routes,
      normalizePreviewSlug,
    );
    assert.ok(staticAssetMatch);
    await staticAssetMatch.route.handle(staticAssetMatch, {
      req: {} as never,
      res: {} as never,
      pathname: staticAssetMatch.pathname,
      sendJson: () => {
        throw new Error("did not expect preview asset route to send json");
      },
      sendText: () => {
        throw new Error("did not expect preview asset route to send plain text");
      },
      sendBytes: () => {
        throw new Error("did not expect preview asset route to send bytes");
      },
      serveFile: (filePath: string, cacheControl?: string) => {
        servedFilePath = filePath;
        servedCacheControl = cacheControl ?? "";
      },
      readJsonBody: async () => ({}),
    });
    assert.equal(servedFilePath, previewAssetPath);
    assert.equal(servedCacheControl, "public, max-age=300");
    assert.equal(ensuredBrowserAssets, 1);

    const iconMatch = resolvePreviewHostApiRoute("GET", "/api/icon/sample.svg", routes, normalizePreviewSlug);
    assert.ok(iconMatch);
    await iconMatch.route.handle(iconMatch, {
      req: {} as never,
      res: {} as never,
      pathname: iconMatch.pathname,
      sendJson: () => {
        throw new Error("did not expect icon route to send json");
      },
      sendText: () => {
        throw new Error("did not expect icon route to send plain text");
      },
      sendBytes: () => {
        throw new Error("did not expect icon route to send bytes");
      },
      serveFile: (filePath: string) => {
        servedFilePath = filePath;
      },
      readJsonBody: async () => ({}),
    });
    assert.equal(servedFilePath, iconPath);

    const referenceMatch = resolvePreviewHostApiRoute(
      "GET",
      "/reference/support-engineering-flow",
      routes,
      normalizePreviewSlug,
    );
    assert.ok(referenceMatch);
    await referenceMatch.route.handle(referenceMatch, {
      req: {} as never,
      res: {} as never,
      pathname: referenceMatch.pathname,
      sendJson: () => {
        throw new Error("did not expect reference route to send json");
      },
      sendText: () => {
        throw new Error("did not expect reference route to send plain text");
      },
      sendBytes: () => {
        throw new Error("did not expect reference route to send bytes");
      },
      serveFile: (filePath: string) => {
        servedFilePath = filePath;
      },
      readJsonBody: async () => ({}),
    });
    assert.equal(servedFilePath, referencePath);

    const retiredForceMatch = resolvePreviewHostApiRoute(
      "GET",
      "/api/force-export/demo",
      routes,
      normalizePreviewSlug,
    );
    assert.ok(retiredForceMatch);
    let retiredForceText = "";
    await retiredForceMatch.route.handle(retiredForceMatch, {
      req: {} as never,
      res: {} as never,
      pathname: retiredForceMatch.pathname,
      sendJson: () => {
        throw new Error("did not expect retired force route to send json");
      },
      sendText: (_statusCode, text) => {
        retiredForceText = text;
      },
      sendBytes: () => {
        throw new Error("did not expect retired force route to send bytes");
      },
      readJsonBody: async () => ({}),
    });
    assert.equal(retiredForceText, "Route retired from the Node preview app: /api/force-export/demo");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("builtin preview host install preserves frame-yaml document ownership across preview and save routes", async () => {
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

  const unregisterBuiltins = installBuiltinPreviewHost(createBuiltinPreviewHostInstallDeps({
    framePreviewDocumentDeps: { framesDir },
    framePreviewRenderDeps: {
      framesDir,
      iconLoader: () => null,
      textAdapterPromise: Promise.resolve(new MockTextAdapter()),
    },
    forcePreviewDocumentDeps: { forceDefinitionsDir },
    appRoot: "/virtual/app",
    repoRoot: "/virtual/repo",
    framesDir,
    specHome: "docs/spec-archive/045-preview-host-engine-modularity/",
    currentGitBranch: () => "feat/045-preview-host-engine-modularity",
    layoutEngineFontPath: "/virtual/layout-font.ttf",
    baselineOsCssPath: "/virtual/bf-os.css",
    baselineFontDir: "/virtual/bf-fonts",
    iconsDir: "/virtual/icons",
    resolvePreviewAssetPath: () => null,
    ensureLayoutEngineBrowserAssets: async () => {},
    parseYaml,
    templateHtml: "%MODE%",
    baselineStylesHtml: "",
    previewAssetUrl: (filename: string) => `/preview/${filename}`,
    readReloadState: () => ({ generation: 1, error: null }),
    addSseClient: () => {},
    removeSseClient: () => {},
    corpusRefDir: path.join(tempDir, "corpus"),
    inputDirs: [path.join(tempDir, "input")],
  }));

  try {
    for (const key of [
      "component-tree",
      "force-save",
      "force-spec",
      "frame-overrides",
      "frame-tree",
      "grid-info",
      "preview-document",
      "svg-export",
    ]) {
      assert.ok(
        listPreviewHostApiRoutes().some((route) => route.key === key),
        `expected api route '${key}' to be registered`,
      );
    }

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

    const sequenceSaveMatch = resolveRegisteredPreviewHostApiRoute(
      "POST",
      "/api/overrides/service-handshake-sequence",
      normalizePreviewSlug,
    );
    assert.ok(sequenceSaveMatch);
    let sequenceSavePayload: unknown = null;
    await sequenceSaveMatch.route.handle(sequenceSaveMatch, {
      req: {} as never,
      res: {} as never,
      pathname: sequenceSaveMatch.pathname,
      sendJson: (_statusCode, payload) => {
        sequenceSavePayload = payload;
      },
      sendText: () => {
        throw new Error("did not expect sequence save route to send plain text");
      },
      sendBytes: () => {
        throw new Error("did not expect sequence save route to send bytes");
      },
      readJsonBody: async () => ({ layout_engine: "sequence" }),
    });
    assert.match(readFileSync(sequenceFramePath, "utf8"), /layout_engine: sequence/);
    assert.ok(sequenceSavePayload && typeof sequenceSavePayload === "object");
    assert.equal((sequenceSavePayload as Record<string, unknown>).ok, true);
    const sequenceCanonicalState = (sequenceSavePayload as { canonicalState: Record<string, unknown> }).canonicalState;
    assert.equal(sequenceCanonicalState.slug, "service-handshake-sequence");
    assert.equal((sequenceCanonicalState.previewDocument as Record<string, unknown>).kind, "sequence");
    assert.equal((sequenceCanonicalState.previewDocument as Record<string, unknown>).layoutEngine, "sequence");
    assert.equal(sequenceCanonicalState.frameTree, null);
    assert.deepEqual(sequenceCanonicalState.componentTree, []);
    assert.equal(sequenceCanonicalState.gridInfo, null);

    const browserLoadEvents: string[] = [];
    const selectedIds = new Set<string>(["stale"]);
    const loadMode = await loadPreviewSvg(createLoadPreviewSvgHostOptionsFromRuntime({
      invocation: {
        canonicalState: sequenceCanonicalState,
        preserveSelectionIds: ["message:m1"],
      },
      stage: {
        innerHTML: "",
        replaceChildren(svg: { tagName?: string }) {
          browserLoadEvents.push(`replace:${String(svg?.tagName || "svg")}`);
        },
      },
      slug: "service-handshake-sequence",
      engine: "sequence",
      gridEnabled: true,
      deselectAll: () => {
        browserLoadEvents.push("deselectAll");
      },
      previewBridgeHost: {
        async initLayoutBridge(slug: string) {
          browserLoadEvents.push(`init:${slug}`);
        },
        setFrameTreeJson(frameTree: unknown) {
          browserLoadEvents.push(`frameTree:${String(frameTree)}`);
        },
      },
      isEngineLayoutActive: () => false,
      resetOverrideState: () => {
        browserLoadEvents.push("resetOverrideState");
      },
      initEnginePanel: () => {
        browserLoadEvents.push("initEnginePanel");
      },
      getLocalRelayoutStatus: () => ({ ready: true, reason: "ready" }),
      escapeHtml: (value: string) => value,
      loadTree: async (canonicalState) => {
        browserLoadEvents.push(`loadTree:${String((canonicalState?.previewDocument as { kind?: string } | null)?.kind || "")}`);
      },
      loadGridInfo: async (canonicalState) => {
        browserLoadEvents.push(`loadGridInfo:${String(canonicalState?.gridInfo)}`);
      },
      gridState: {
        getGridInfo: () => null,
        setDiagramGrid: () => {
          browserLoadEvents.push("setDiagramGrid");
        },
        getGridOverrides: () => null,
        pruneLinkedRootGridOverrides: () => {
          browserLoadEvents.push("pruneLinkedRootGridOverrides");
        },
      },
      populateGridControls: () => {
        browserLoadEvents.push("populateGridControls");
      },
      applyWaypointOverrides: () => {
        browserLoadEvents.push("applyWaypointOverrides");
      },
      applyAllOverrides: () => {
        browserLoadEvents.push("applyAllOverrides");
      },
      bindInteraction: () => {
        browserLoadEvents.push("bindInteraction");
      },
      renderGridOverlay: () => {
        browserLoadEvents.push("renderGridOverlay");
      },
      selectionState: {
        selectedIds,
        reapplySelection: () => {
          browserLoadEvents.push("reapplySelection");
        },
      },
      runConstraints: () => {
        browserLoadEvents.push("runConstraints");
      },
      previewSaveClient: {
        markSaved: (serializedState: string) => {
          browserLoadEvents.push(`markSaved:${serializedState}`);
        },
      },
      dirtyStateSerializer: {
        serializeDirtyState: () => "dirty-state",
      },
      signalDiagramLoaded: () => {
        browserLoadEvents.push("signalDiagramLoaded");
      },
      previewBridgeRender: {
        async renderFreshPreviewSvg(renderOptions) {
          browserLoadEvents.push(`render:${String((renderOptions.model as { id?: string })?.id || "")}`);
          return {
            svg: { tagName: "svg" },
            width: 640,
            height: 320,
          };
        },
      },
      overrides: {},
      model: { id: "sequence-model" },
      fitRenderedSvgToContent: (_svg, fitOptions) => {
        browserLoadEvents.push(`fit:${fitOptions.minWidth}x${fitOptions.minHeight}`);
      },
    }));

    assert.equal(loadMode, "client-render");
    assert.deepEqual([...selectedIds], ["message:m1"]);
    assert.deepEqual(browserLoadEvents, [
      "deselectAll",
      "init:service-handshake-sequence",
      "frameTree:null",
      "loadTree:sequence",
      "loadGridInfo:null",
      "populateGridControls",
      "resetOverrideState",
      "render:sequence-model",
      "replace:svg",
      "fit:640x320",
      "applyWaypointOverrides",
      "applyAllOverrides",
      "bindInteraction",
      "renderGridOverlay",
      "reapplySelection",
      "runConstraints",
      "markSaved:dirty-state",
      "signalDiagramLoaded",
    ]);

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
    unregisterBuiltins();
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
    "%GRAPH_LAYOUT_SECTION_HIDDEN%",
    "%UNUSED_PLACEHOLDER%",
    ].join("\n"),
    browseSections: buildPreviewBrowseSections([
      { lane: AUTOLAYOUT_HOST_LANE, slugs: ["support-engineering-flow"] },
      { lane: FORCE_HOST_LANE, slugs: ["force-stakeholders"] },
    ]),
    inspectorEmptyText: "Click a component to inspect it.",
    modeScriptsHtml: '<script src="/preview/editor.js"></script>',
    configScript: "window.__DG_CONFIG = {};",
    visibleTemplateSections: ["elk-layout"],
    sectionVisibilityPlaceholders: [
      {
        placeholder: "%ELK_SECTION_HIDDEN%",
        section: "elk-layout",
      },
      {
        placeholder: "%GRAPH_LAYOUT_SECTION_HIDDEN%",
        section: "graph-layout",
      },
    ],
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
    specHome: "docs/spec-archive/045-preview-host-engine-modularity/",
    browseSections: buildPreviewBrowseSections([
      { lane: AUTOLAYOUT_HOST_LANE, slugs: ["alpha"] },
      { lane: FORCE_HOST_LANE, slugs: ["beta"] },
    ]),
    baselineStylesHtml: '<link rel="stylesheet" href="/preview/bf-os.css">',
  });

  assert.match(html, /Node preview app on port 8100/);
  assert.match(html, /docs\/spec-archive\/045-preview-host-engine-modularity\//);
  assert.match(html, /href="\/view\/v3:alpha"/);
  assert.match(html, /href="\/force\/view\/beta"/);
});

function normalizePreviewSlug(value: string): string | null {
  const normalized = decodeURIComponent(value).replace(/^v3:/, "");
  return /^[A-Za-z0-9._:-]+$/.test(normalized) ? normalized : null;
}

function contextualAsideTemplate(): string {
  return [
    '<div class="dg-preview-pane-header">',
    '  <section id="engine-switcher-section" %GRID_ENGINE_SWITCHER_HIDDEN%>',
    '    <div class="bf-tabs dg-output-engine-tabs" aria-label="Compatible engines">',
    '      <ul class="bf-tabs-list" id="engine-switcher-tabs" role="tablist" aria-label="Compatible engines"></ul>',
    '    </div>',
    '  </section>',
    '</div>',
    '<section id="grid-controls-section" %GRID_CONTROLS_HIDDEN%><div id="grid-controls"></div></section>',
    '<section id="elk-layout-section" %ELK_SECTION_HIDDEN%><input id="elk-raw-view-toggle"><input id="elk-debug-overlay-toggle"></section>',
    '<section id="graph-layout-section" %GRAPH_LAYOUT_SECTION_HIDDEN%><div id="graph-layout-controls"></div></section>',
    '<section id="force-solver-section" %FORCE_SOLVER_HIDDEN%>force solver</section>',
    '<section id="force-simulation-section" %FORCE_SIMULATION_HIDDEN%><div id="force-params"></div></section>',
    '%MODE_SCRIPTS%',
  ].join('\n');
}

function expectRegisteredRoutes(keys: string[]): void {
  assert.deepEqual(
    listPreviewHostViewerRoutes().map((route) => route.key).sort(),
    [...keys].sort(),
  );
}
