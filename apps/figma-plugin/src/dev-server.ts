import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadFrameYamlFromString } from "../../../packages/layout-engine/dist/frame-yaml-loader.js";
import { layoutFrameTree } from "../../../packages/layout-engine/dist/layout.js";
import { MockTextAdapter } from "../../../packages/layout-engine/dist/text-measure.js";
import { resolveStyles } from "../../../packages/layout-engine/dist/resolve-styles.js";
import {
  frameOwnedTextBlockGap,
  frameOwnedTextBlockRole,
  frameOwnedTextBlocks,
} from "../../../packages/layout-engine/dist/resolved-spec-typography.js";
import { effectiveResolvedStrokeWidth } from "../../../packages/layout-engine/dist/frame-classes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(APP_ROOT, "..", "..");
const PORT = 3846;
const SAMPLE_PATH = path.join(APP_ROOT, "dev-data", "sample-leaf.yaml");
const ICONS_DIR = path.join(REPO_ROOT, "assets", "icons");
const FRAMES_DIR = path.join(REPO_ROOT, "scripts", "diagrams", "frames");

function sendJson(response: import("node:http").ServerResponse, statusCode: number, body: unknown) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  response.end(JSON.stringify(body, null, 2));
}

async function sendFile(
  response: import("node:http").ServerResponse,
  filePath: string,
  contentType: string,
) {
  const bytes = await readFile(filePath);
  response.writeHead(200, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
  });
  response.end(bytes);
}

function findFrame(frame: any, id: string): any | null {
  if (frame.id === id) return frame;
  for (const child of frame.children) {
    const hit = findFrame(child, id);
    if (hit) return hit;
  }
  return null;
}

function resolveAuthoredLayoutFrame(frame: any): {
  layoutChildren: any[];
  layoutGap: number;
  layoutDirection: string;
  layoutHeaderGap: number;
} {
  if (frame.isLeaf) {
    return {
      layoutChildren: [],
      layoutGap: 0,
      layoutDirection: frame.direction,
      layoutHeaderGap: 0,
    };
  }

  const body = frame.children.find(
    (child: any) => child.id === "__body" || String(child.id || "").endsWith("__body"),
  );
  const hasHeading = frame.children.some(
    (child: any) => child.role === "heading" || child.id === "__heading" || String(child.id || "").endsWith("__heading"),
  );

  if (body && hasHeading) {
    return {
      layoutChildren: body.children,
      layoutGap: body.gap,
      layoutDirection: body.direction,
      layoutHeaderGap: frame.gap,
    };
  }

  return {
    layoutChildren: frame.children.filter(
      (child: any) => !String(child.id || "").endsWith("__body")
        && !String(child.id || "").endsWith("__heading")
        && child.role !== "heading",
    ),
    layoutGap: frame.gap,
    layoutDirection: frame.direction,
    layoutHeaderGap: frame.gap,
  };
}

function findSyntheticHeading(frame: any) {
  return frame.children.find(
    (child: any) => child.role === "heading"
      || child.id === "__heading"
      || String(child.id || "").endsWith("__heading"),
  ) ?? null;
}

function classifyFrame(frame: any) {
  if (frame.id === "page") return "root";
  if (frame.resolvedFill === "#000000" && frame.resolvedTextFill === "#FFFFFF") {
    return "highlight";
  }
  if (frame.isLeaf) {
    if ((frame.resolvedStroke === "none" || frame.resolvedStroke === "transparent")
      && (frame.resolvedFill === "transparent" || frame.resolvedFill == null)) {
      return "annotation";
    }
    return "leaf";
  }
  if (frame.resolvedFill === "#F3F3F3") return "panel";
  if ((frame.resolvedFill === "transparent" || frame.resolvedFill == null)
    && frame.resolvedStroke
    && frame.resolvedStroke !== "none"
    && frame.resolvedStroke !== "transparent") {
    return "section";
  }
  return "container";
}

function serializeTextBlocks(frame: any) {
  const source = frameOwnedTextBlocks(frame).length > 0
    ? frame
    : (findSyntheticHeading(frame) ?? frame);
  const blocks = frameOwnedTextBlocks(source);
  return blocks.map((block: any[], blockIndex: number) => ({
    role: frameOwnedTextBlockRole(source, blockIndex),
    gapAfter: frameOwnedTextBlockGap(source, blockIndex, blocks.length),
    lines: block.map((line) => ({
      text: line.content,
      size: Number(line.size ?? 18),
      weight: Number(line.weight ?? 400),
      fill: line.fill ?? source.resolvedTextFill ?? frame.resolvedTextFill ?? "#000000",
      lineHeight: Number(line.lineStep ?? 24),
    })),
  }));
}

function serializeDiagramNode(frame: any): any {
  const { layoutChildren, layoutGap, layoutDirection, layoutHeaderGap } = resolveAuthoredLayoutFrame(frame);
  const iconColumn = frame.icon ? 48 + 8 : 0;
  return {
    id: frame.id,
    name: frame.id,
    kind: classifyFrame(frame),
    isLeaf: frame.isLeaf,
    width: frame._layout.placedW,
    height: frame._layout.placedH,
    direction: layoutDirection,
    bodyGap: layoutGap,
    headerGap: layoutHeaderGap,
    padding: {
      top: frame.paddingTop,
      right: frame.paddingRight,
      bottom: frame.paddingBottom,
      left: frame.paddingLeft,
    },
    fill: frame.resolvedFill ?? "transparent",
    stroke: frame.resolvedStroke ?? "none",
    strokeWidth: effectiveResolvedStrokeWidth(frame),
    textFill: frame.resolvedTextFill ?? "#000000",
    iconFill: frame.resolvedIconFill ?? "#000000",
    icon: frame.icon ? {
      name: frame.icon,
      size: 48,
      path: `/icons/${encodeURIComponent(frame.icon)}`,
    } : null,
    leafTextWidth: Math.max(0, frame._layout.placedW - frame.paddingLeft - frame.paddingRight - iconColumn),
    textBlocks: serializeTextBlocks(frame),
    children: layoutChildren.map((child: any) => serializeDiagramNode(child)),
  };
}

async function loadDiagramBySlug(slug: string) {
  const yamlPath = path.join(FRAMES_DIR, `${slug}.yaml`);
  const raw = await readFile(yamlPath, "utf8");
  const diagram = loadFrameYamlFromString(raw, yamlPath);
  const adapter = new MockTextAdapter();
  resolveStyles(diagram.root);
  layoutFrameTree(diagram.root, adapter, {
    arrows: diagram.arrows,
    gridCols: diagram.gridCols,
    gridColGap: diagram.gridColGap,
    gridOuterMargin: diagram.gridOuterMargin,
  });
  return diagram;
}

async function createSampleLeafPayload() {
  const raw = await readFile(SAMPLE_PATH, "utf8");
  const diagram = loadFrameYamlFromString(raw, SAMPLE_PATH);
  const adapter = new MockTextAdapter();
  resolveStyles(diagram.root);
  layoutFrameTree(diagram.root, adapter, { arrows: diagram.arrows });
  const leaf = findFrame(diagram.root, "sample_leaf");
  if (!leaf) {
    throw new Error("Sample fixture did not contain sample_leaf.");
  }

  const iconColumn = leaf.icon ? 48 + 8 : 0;
  return {
    leaf: {
      id: leaf.id,
      name: "Sample leaf",
      width: leaf._layout.placedW,
      minHeight: 64,
      padding: {
        top: leaf.paddingTop,
        right: leaf.paddingRight,
        bottom: leaf.paddingBottom,
        left: leaf.paddingLeft,
      },
      stroke: leaf.resolvedStroke ?? "#000000",
      text: {
        text: leaf.label.map((line: any) => line.content).join("\n"),
        width: Math.max(0, leaf._layout.placedW - leaf.paddingLeft - leaf.paddingRight - iconColumn),
        fontSize: 18,
        lineHeight: 24,
        textFill: leaf.resolvedTextFill ?? "#000000",
      },
      icon: {
        name: leaf.icon ?? "Gateway.svg",
        size: 48,
        path: `/icons/${encodeURIComponent(leaf.icon ?? "Gateway.svg")}`,
      },
    },
  };
}

async function createFrameDiagramPayload(slug: string) {
  const diagram = await loadDiagramBySlug(slug);
  return {
    slug,
    title: diagram.title,
    root: serializeDiagramNode(diagram.root),
  };
}

const server = createServer(async (request, response) => {
  try {
    if (!request.url) {
      sendJson(response, 400, { error: "Missing request URL." });
      return;
    }

    const url = new URL(request.url, `http://localhost:${PORT}`);

    if (url.pathname === "/health") {
      sendJson(response, 200, { ok: true, port: PORT });
      return;
    }

    if (url.pathname === "/api/sample-leaf") {
      const payload = await createSampleLeafPayload();
      sendJson(response, 200, payload);
      return;
    }

    if (url.pathname === "/api/frame-diagram") {
      const slug = String(url.searchParams.get("slug") || "").trim();
      if (!slug) {
        sendJson(response, 400, { error: "Missing slug query parameter." });
        return;
      }
      const payload = await createFrameDiagramPayload(slug);
      sendJson(response, 200, payload);
      return;
    }

    if (url.pathname.startsWith("/icons/")) {
      const iconName = decodeURIComponent(path.basename(url.pathname));
      const iconPath = path.join(ICONS_DIR, iconName);
      await sendFile(response, iconPath, "image/svg+xml");
      return;
    }

    sendJson(response, 404, {
      error: "Not found",
      path: url.pathname,
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, () => {
  console.log(`Figma plugin dev server listening on http://localhost:${PORT}`);
});
