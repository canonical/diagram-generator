import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  AUTOLAYOUT_PREVIEW_HOST_API_ROUTES,
} from "../preview-host/builtin-autolayout-host.js";
import {
  createFramePreviewHostDocumentEndpoints,
  FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS,
} from "../preview-host/document-apis.js";
import {
  renderD2ForSlug,
  importInterchangeForSlug,
  InterchangeImportBlockedError,
  renderMermaidForSlug,
  type FramePreviewDocumentDeps,
  type FramePreviewRenderDeps,
} from "../preview-host/frame-documents.js";
import { resolvePreviewHostApiRoute } from "../preview-host/api-routes.js";
import { compileDiagramYaml } from "@diagram-generator/layout-engine";

function makeYaml(sourceLabel: string): string {
  return `engine: v3
title: Export sample
root:
  id: page
  children:
  - id: source
    label: [${sourceLabel}]
  - id: target
    label: [Target]
arrows:
- source: source
  target: target
`;
}

function makeTempFramesDir() {
  const root = mkdtempSync(path.join(os.tmpdir(), "diagram-generator-interchange-"));
  mkdirSync(root, { recursive: true });
  return root;
}

test("preview interchange exports cache by format and authored YAML mtime", () => {
  const framesDir = makeTempFramesDir();
  try {
    const yamlPath = path.join(framesDir, "sample.yaml");
    writeFileSync(yamlPath, makeYaml("Source"), "utf8");
    const deps: FramePreviewDocumentDeps = { framesDir };

    const firstMermaid = renderMermaidForSlug("sample", deps);
    const firstD2 = renderD2ForSlug("sample", deps);
    assert.match(firstMermaid, /flowchart TB/);
    assert.match(firstMermaid, /source\[\"Source\"\]/);
    assert.match(firstD2, /source: Source/);

    const changedMtime = Date.now() + 5_000;
    writeFileSync(yamlPath, makeYaml("Changed source"), "utf8");
    utimesSync(yamlPath, changedMtime / 1000, changedMtime / 1000);

    const secondMermaid = renderMermaidForSlug("sample", deps);
    const secondD2 = renderD2ForSlug("sample", deps);
    assert.notEqual(secondMermaid, firstMermaid);
    assert.notEqual(secondD2, firstD2);
  } finally {
    rmSync(framesDir, { recursive: true, force: true });
  }
});

test("preview interchange endpoints expose exact Mermaid and D2 export routes", () => {
  const routeByKey = new Map(AUTOLAYOUT_PREVIEW_HOST_API_ROUTES.map((route) => [route.key, route]));
  const mermaidRoute = routeByKey.get("mermaid-export");
  const d2Route = routeByKey.get("d2-export");
  assert.ok(mermaidRoute);
  assert.ok(d2Route);

  const mermaidMatch = resolvePreviewHostApiRoute(
    "GET",
    "/api/export/mermaid",
    [mermaidRoute],
    (value) => value || null,
  );
  const pathWithSlugMatch = resolvePreviewHostApiRoute(
    "GET",
    "/api/export/mermaid/sample",
    [mermaidRoute],
    (value) => value || null,
  );
  assert.equal(mermaidMatch?.route.key, "mermaid-export");
  assert.equal(pathWithSlugMatch, null);

  const documentDeps: FramePreviewDocumentDeps = { framesDir: "frames" };
  const renderDeps = {
    ...documentDeps,
    iconLoader: undefined,
    textAdapterPromise: Promise.resolve(undefined),
  } as unknown as FramePreviewRenderDeps;
  const endpoints = createFramePreviewHostDocumentEndpoints({
    framePreviewDocumentDeps: documentDeps,
    framePreviewRenderDeps: renderDeps,
    parseYaml: () => ({}),
    normalizeLayoutEngine: (value) => value ?? "v3",
  });
  assert.ok(endpoints.some((endpoint) => endpoint.kind === FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.mermaidExport));
  assert.ok(endpoints.some((endpoint) => endpoint.kind === FRAME_PREVIEW_HOST_DOCUMENT_ENDPOINTS.d2Export));
});

test("preview import writes a new canonical YAML diagram and refuses overwrite", () => {
  const framesDir = makeTempFramesDir();
  try {
    const deps: FramePreviewDocumentDeps = { framesDir };
    const result = importInterchangeForSlug(
      "imported-sample",
      "mermaid",
      `flowchart TB\n  source["Source"]\n  target["Target"]\n  source --> target`,
      deps,
    );
    assert.equal(result.ok, true);
    assert.equal(result.slug, "imported-sample");
    assert.deepEqual(result.summary, {
      preserved: 3,
      downgraded: [],
      blocked: [],
    });
    const yaml = readFileSync(path.join(framesDir, "imported-sample.yaml"), "utf8");
    assert.match(yaml, /engine: v3/);
    assert.match(yaml, /id: source/);
    assert.throws(
      () => importInterchangeForSlug("imported-sample", "d2", "source: Source", deps),
      /already exists/,
    );
  } finally {
    rmSync(framesDir, { recursive: true, force: true });
  }
});

test("preview import blocks structural Mermaid loss before writing canonical YAML", () => {
  const framesDir = makeTempFramesDir();
  try {
    const deps: FramePreviewDocumentDeps = { framesDir };
    assert.throws(
      () => importInterchangeForSlug(
        "inline-edge-loss",
        "mermaid",
        [
          "flowchart TB",
          "power_on@{ animate: true } --> load_spl",
        ].join("\n"),
        deps,
      ),
      (error: unknown) => {
        assert.ok(error instanceof InterchangeImportBlockedError);
        assert.match(error.message, /Mermaid edge id\/animation could not be imported/);
        assert.equal(error.summary.preserved, 0);
        assert.equal(error.summary.blocked.length, 1);
        return true;
      },
    );
    assert.equal(
      existsSync(path.join(framesDir, "inline-edge-loss.yaml")),
      false,
    );
  } finally {
    rmSync(framesDir, { recursive: true, force: true });
  }
});

test("preview import persists and reloads nested topology, local direction, and selected engine", () => {
  const framesDir = makeTempFramesDir();
  try {
    const result = importInterchangeForSlug(
      "compound-import",
      "mermaid",
      [
        "flowchart TB",
        "subgraph left[\"Left\"]",
        "  direction RL",
        "  a[\"A\"]",
        "end",
        "subgraph right[\"Right\"]",
        "  b[\"B\"]",
        "end",
        "a --> b",
      ].join("\n"),
      { framesDir },
    );

    assert.deepEqual(result.summary, {
      preserved: 5,
      downgraded: [],
      blocked: [],
    });
    const yaml = readFileSync(path.join(framesDir, "compound-import.yaml"), "utf8");
    assert.match(yaml, /layout_engine: elk-layered/);
    assert.match(yaml, /flow_direction: RL/);
    const reloaded = compileDiagramYaml(yaml);
    assert.deepEqual(reloaded.errors, []);
    assert.equal(reloaded.ast.frameIndex.a?.parentId, "left");
    assert.equal(reloaded.ast.frameIndex.b?.parentId, "right");
    assert.deepEqual(reloaded.ast.arrows.map(({ source, target }) => [source, target]), [["a", "b"]]);
    assert.equal(reloaded.ast.root?.children[0]?.direction, "horizontal");
    assert.equal(reloaded.ast.root?.children[0]?.flowDirection, "RL");
    assert.equal(reloaded.frameDiagram?.layoutEngine, "elk-layered");
  } finally {
    rmSync(framesDir, { recursive: true, force: true });
  }
});

test("preview import rejects unsupported Mermaid types without writing a phantom diagram", () => {
  const framesDir = makeTempFramesDir();
  try {
    const deps: FramePreviewDocumentDeps = { framesDir };
    assert.throws(
      () => importInterchangeForSlug(
        "unsupported-sankey",
        "mermaid",
        "sankey-beta\nA,B,1\n",
        deps,
      ),
      /Mermaid 'sankey-beta'.*Detected diagram type: sankey-beta/,
    );
    assert.equal(
      existsSync(path.join(framesDir, "unsupported-sankey.yaml")),
      false,
    );
  } finally {
    rmSync(framesDir, { recursive: true, force: true });
  }
});
