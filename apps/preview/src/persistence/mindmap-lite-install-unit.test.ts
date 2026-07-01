import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  MockTextAdapter,
  createLoadPreviewSvgHostOptionsFromRuntime,
  installMindmapLitePreviewEngine,
  loadPreviewSvg,
} from "@diagram-generator/layout-engine";

import { createAutolayoutPreviewHostViewerRoute } from "../preview-host/builtin-autolayout-host.js";
import {
  createFramePreviewHostDocumentEndpoints,
  FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS,
} from "../preview-host/document-apis.js";
import { installMindmapLiteFrameYamlDocumentKind } from "../preview-host/mindmap-lite-install-unit.js";

test("mindmap-lite install unit traverses shared host route, save, export, and browser refresh seams", async () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "dg-mindmap-lite-"));
  const framesDir = path.join(tempDir, "frames");
  const slug = "mindmap-proof";
  mkdirSync(framesDir, { recursive: true });
  writeFileSync(
    path.join(framesDir, `${slug}.yaml`),
    [
      "schema: author-v1",
      "title: Mindmap proof",
      "meta:",
      "  layout_engine: mindmap-tree",
      "mindmap:",
      "  root: Platform",
      "  children:",
      "    - Preview host",
      "    - Renderer",
      "",
    ].join("\n"),
    "utf8",
  );

  const normalizeLayoutEngine = (layoutEngine: string | undefined) => layoutEngine?.trim() ?? "";
  const uninstallPreviewEngine = installMindmapLitePreviewEngine();
  const uninstallDocumentKind = installMindmapLiteFrameYamlDocumentKind();

  try {
    const viewerRoute = createAutolayoutPreviewHostViewerRoute({
      framePreviewDocumentDeps: { framesDir },
      framePreviewRenderDeps: {
        framesDir,
        iconLoader: () => null,
        textAdapterPromise: Promise.resolve(new MockTextAdapter()),
      },
      forcePreviewDocumentDeps: { forceDefinitionsDir: path.join(tempDir, "force") },
      parseYaml: () => ({}),
      templateHtml: "<script>%CONFIG_SCRIPT%</script>\n%MODE_SCRIPTS%",
      baselineStylesHtml: "",
      previewAssetUrl: (filename: string) => `/preview/${filename}`,
      listAutolayoutDiagrams: () => [slug],
      listForceExamples: () => [],
      findReferenceImage: () => null,
      normalizeLayoutEngine,
    });
    const viewerHtml = viewerRoute.buildHtml(slug);
    assert.match(viewerHtml, /window\.__DG_CONFIG = \{"slug":"mindmap-proof","engine":"mindmap-tree"/);
    assert.match(viewerHtml, /"layout_engine":"mindmap-tree"/);

    const endpoints = createFramePreviewHostDocumentEndpoints({
      framePreviewDocumentDeps: { framesDir },
      framePreviewRenderDeps: {
        framesDir,
        iconLoader: () => null,
        textAdapterPromise: Promise.resolve(new MockTextAdapter()),
      },
      parseYaml: () => ({}),
      normalizeLayoutEngine,
    });
    const previewDocumentEndpoint = endpoints.find(
      (entry) => entry.kind === FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.previewDocument,
    );
    const saveEndpoint = endpoints.find(
      (entry) => entry.kind === FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.saveDocument,
    );
    const svgEndpoint = endpoints.find(
      (entry) => entry.kind === FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.svgExport,
    );

    assert.ok(previewDocumentEndpoint);
    assert.ok(saveEndpoint);
    assert.ok(svgEndpoint);

    const previewDocument = await previewDocumentEndpoint.handler(slug);
    assert.equal((previewDocument as Record<string, unknown>).kind, "mindmap-lite");
    assert.equal((previewDocument as { mindmap?: { root?: string } }).mindmap?.root, "Platform");

    const savePayload = await saveEndpoint.handler(slug, {
      layout_engine: "mindmap-tree",
      mindmap: {
        root: "Platform v2",
        children: ["Preview host", "Renderer", "Save flow"],
      },
    });
    assert.ok(savePayload && typeof savePayload === "object");
    assert.equal((savePayload as Record<string, unknown>).ok, true);
    const canonicalState = (savePayload as { canonicalState: Record<string, unknown> }).canonicalState;
    assert.equal((canonicalState.previewDocument as Record<string, unknown>).kind, "mindmap-lite");
    assert.equal(
      ((canonicalState.previewDocument as { mindmap?: { root?: string } }).mindmap?.root),
      "Platform v2",
    );
    assert.match(readFileSync(path.join(framesDir, `${slug}.yaml`), "utf8"), /root: Platform v2/);
    assert.match(readFileSync(path.join(framesDir, `${slug}.yaml`), "utf8"), /- Save flow/);

    const svgMarkup = await svgEndpoint.handler(slug);
    assert.match(String(svgMarkup), /data-document-kind="mindmap-lite"/);
    assert.match(String(svgMarkup), /Platform v2/);
    assert.match(String(svgMarkup), /Save flow/);

    const browserLoadEvents: string[] = [];
    const selectedIds = new Set<string>(["stale"]);
    const loadMode = await loadPreviewSvg(createLoadPreviewSvgHostOptionsFromRuntime({
      invocation: {
        canonicalState,
        preserveSelectionIds: ["child-2"],
      },
      stage: {
        innerHTML: "",
        replaceChildren(svg: { tagName?: string }) {
          browserLoadEvents.push(`replace:${String(svg?.tagName || "svg")}`);
        },
      },
      slug,
      engine: "mindmap-tree",
      gridEnabled: true,
      deselectAll: () => {
        browserLoadEvents.push("deselectAll");
      },
      previewBridgeHost: {
        async initLayoutBridge(currentSlug: string) {
          browserLoadEvents.push(`init:${currentSlug}`);
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
      loadTree: async (nextCanonicalState) => {
        browserLoadEvents.push(
          `loadTree:${String((nextCanonicalState?.previewDocument as { kind?: string } | null)?.kind || "")}`,
        );
      },
      loadGridInfo: async (nextCanonicalState) => {
        browserLoadEvents.push(`loadGridInfo:${String(nextCanonicalState?.gridInfo)}`);
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
            width: 540,
            height: 280,
          };
        },
      },
      overrides: {},
      model: { id: "mindmap-model" },
      fitRenderedSvgToContent: (_svg, fitOptions) => {
        browserLoadEvents.push(`fit:${fitOptions.minWidth}x${fitOptions.minHeight}`);
      },
    }));

    assert.equal(loadMode, "client-render");
    assert.deepEqual([...selectedIds], ["child-2"]);
    assert.deepEqual(browserLoadEvents, [
      "deselectAll",
      `init:${slug}`,
      "frameTree:null",
      "loadTree:mindmap-lite",
      "loadGridInfo:null",
      "populateGridControls",
      "resetOverrideState",
      "render:mindmap-model",
      "fit:540x280",
      "replace:svg",
      "applyWaypointOverrides",
      "applyAllOverrides",
      "bindInteraction",
      "renderGridOverlay",
      "reapplySelection",
      "runConstraints",
      "markSaved:dirty-state",
      "signalDiagramLoaded",
    ]);
  } finally {
    uninstallDocumentKind();
    uninstallPreviewEngine();
    rmSync(tempDir, { recursive: true, force: true });
  }
});
