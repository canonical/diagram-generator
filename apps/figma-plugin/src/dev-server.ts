import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadFrameYamlFromString } from "../../../packages/layout-engine/dist/frame-yaml-loader.js";
import {
  BODY_LINE_STEP,
  BODY_SIZE,
  Border,
  BOX_MIN_HEIGHT,
  computeLevel,
  effectiveResolvedStrokeWidth,
  Fill,
  findSyntheticBody,
  findSyntheticHeading,
  frameOwnedTextBlockGap,
  frameOwnedTextBlockRole,
  frameOwnedTextBlocks,
  ICON_SIZE,
  INSET,
  isSyntheticBodyFrame,
  isSyntheticHeadingFrame,
  layoutFrameTree,
  MockTextAdapter,
  resolveStyles,
} from "../../../packages/layout-engine/dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(APP_ROOT, "..", "..");
const PORT = 3846;
const SAMPLE_PATH = path.join(APP_ROOT, "dev-data", "sample-leaf.yaml");
const ICONS_DIR = path.join(REPO_ROOT, "assets", "icons");
const FRAMES_DIR = path.join(REPO_ROOT, "scripts", "diagrams", "frames");
const ICON_COLUMN = ICON_SIZE + INSET;

type FigmaSizing = "FIXED" | "HUG" | "FILL";

type CoercedSizingMap = Map<string, {
  sizingW?: "FIXED";
  sizingH?: "FIXED";
  width?: number;
  height?: number;
}>;

interface EffectiveSizing {
  sizingW: FigmaSizing;
  sizingH: FigmaSizing;
  width: number;
  height: number;
}

interface FrameSemanticContext {
  depth: number;
  parentIsPanel: boolean;
  parentIsSection: boolean;
}

interface FrameSemanticState {
  kind: string;
  childContext: FrameSemanticContext;
}

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

function isLayoutWrapperFrame(frame: any) {
  return String(frame?.id || "").includes("__");
}

function normalizeSizing(value: unknown): FigmaSizing {
  if (value === "FIXED" || value === "HUG" || value === "FILL") {
    return value;
  }
  return "FIXED";
}

function placedWidth(frame: any): number {
  const value = frame?._layout?.placedW ?? frame?.width ?? 0;
  return Math.round(Number.isFinite(value) ? value : 0);
}

function placedHeight(frame: any): number {
  const value = frame?._layout?.placedH ?? frame?.height ?? 0;
  return Math.round(Number.isFinite(value) ? value : 0);
}

function resolveEffectiveSizing(frame: any, coerced?: CoercedSizingMap): EffectiveSizing {
  const override = frame?.id ? coerced?.get(frame.id) : undefined;
  const fallbackWidth = placedWidth(frame);
  const fallbackHeight = placedHeight(frame);

  return {
    sizingW: override?.sizingW === "FIXED" ? "FIXED" : normalizeSizing(frame?.sizingW),
    sizingH: override?.sizingH === "FIXED" ? "FIXED" : normalizeSizing(frame?.sizingH),
    width: Math.round(typeof override?.width === "number" && Number.isFinite(override.width)
      ? override.width
      : fallbackWidth),
    height: Math.round(typeof override?.height === "number" && Number.isFinite(override.height)
      ? override.height
      : fallbackHeight),
  };
}

function rootFixedSizing(frame: any): EffectiveSizing {
  return {
    sizingW: "FIXED",
    sizingH: "FIXED",
    width: placedWidth(frame),
    height: placedHeight(frame),
  };
}

function reconcileChildSizingForFigma(
  sizing: EffectiveSizing,
  parentSizing: EffectiveSizing | null | undefined,
): EffectiveSizing {
  if (!parentSizing) {
    return sizing;
  }

  return {
    ...sizing,
    sizingW: parentSizing.sizingW === "HUG" && sizing.sizingW === "FILL"
      ? "FIXED"
      : sizing.sizingW,
    sizingH: parentSizing.sizingH === "HUG" && sizing.sizingH === "FILL"
      ? "FIXED"
      : sizing.sizingH,
  };
}

export function resolveAuthoredLayoutFrame(frame: any): {
  layoutChildren: any[];
  layoutGap: number;
  layoutDirection: string;
  layoutHeaderGap: number;
  layoutSizingW: string;
  layoutSizingH: string;
  bodySizingW: string;
  bodySizingH: string;
  bodyFrame: any | null;
} {
  if (frame.isLeaf) {
    return {
      layoutChildren: [],
      layoutGap: 0,
      layoutDirection: frame.direction,
      layoutHeaderGap: 0,
      layoutSizingW: frame.sizingW,
      layoutSizingH: frame.sizingH,
      bodySizingW: frame.sizingW,
      bodySizingH: frame.sizingH,
      bodyFrame: null,
    };
  }

  const body = findSyntheticBody(frame);
  const heading = findSyntheticHeading(frame);

  if (body && heading) {
    return {
      layoutChildren: body.children,
      layoutGap: body.gap,
      layoutDirection: body.direction,
      layoutHeaderGap: frame.gap,
      layoutSizingW: frame.sizingW,
      layoutSizingH: frame.sizingH,
      bodySizingW: body.sizingW,
      bodySizingH: body.sizingH,
      bodyFrame: body,
    };
  }

  return {
    layoutChildren: frame.children.filter(
      (child: any) => !isSyntheticBodyFrame(child) && !isSyntheticHeadingFrame(child),
    ),
    layoutGap: frame.gap,
    layoutDirection: frame.direction,
    layoutHeaderGap: frame.gap,
    layoutSizingW: frame.sizingW,
    layoutSizingH: frame.sizingH,
    bodySizingW: frame.sizingW,
    bodySizingH: frame.sizingH,
    bodyFrame: null,
  };
}

function serializeIcon(frame: any) {
  return frame.icon ? {
    name: frame.icon,
    size: ICON_SIZE,
    path: `/icons/${encodeURIComponent(frame.icon)}`,
  } : null;
}

function resolveFrameSemanticState(
  frame: any,
  context: FrameSemanticContext,
): FrameSemanticState {
  if (context.depth === 0 || frame.id === "page") {
    return {
      kind: "root",
      childContext: {
        depth: context.depth + 1,
        parentIsPanel: false,
        parentIsSection: false,
      },
    };
  }

  const isLayoutWrapper = isLayoutWrapperFrame(frame);
  const isHighlight = frame.fill === Fill.BLACK;
  let isPanel = false;
  let isSection = false;
  let kind = "container";

  if (isHighlight) {
    kind = "highlight";
  } else {
    let level = computeLevel(frame, context.depth);
    if (level >= 2 && context.parentIsPanel) {
      level = 1;
    }
    if (level >= 3 && context.parentIsSection) {
      level = Math.min(level, 2);
    }

    if (frame.border === Border.NONE && frame.isLeaf && !isLayoutWrapper) {
      kind = "annotation";
    } else if (level >= 3) {
      kind = "section";
      isSection = true;
    } else if (level >= 2) {
      kind = "panel";
      isPanel = true;
    } else if (frame.isLeaf) {
      kind = "leaf";
    }
  }

  return {
    kind,
    childContext: {
      depth: context.depth + 1,
      parentIsPanel: isLayoutWrapper ? context.parentIsPanel : isPanel,
      parentIsSection: isLayoutWrapper ? context.parentIsSection : isSection,
    },
  };
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

export function serializeDiagramNode(
  frame: any,
  context: FrameSemanticContext = {
    depth: 0,
    parentIsPanel: false,
    parentIsSection: false,
  },
  options: {
    coerced?: CoercedSizingMap;
    parentSizing?: EffectiveSizing | null;
  } = {},
): any {
  const {
    layoutChildren,
    layoutGap,
    layoutDirection,
    layoutHeaderGap,
    bodyFrame,
  } = resolveAuthoredLayoutFrame(frame);
  const semanticState = resolveFrameSemanticState(frame, context);
  const rawNodeSizing = semanticState.kind === "root"
    ? rootFixedSizing(frame)
    : resolveEffectiveSizing(frame, options.coerced);
  const nodeSizing = reconcileChildSizingForFigma(rawNodeSizing, options.parentSizing);
  const rawBodySizing = bodyFrame
    ? resolveEffectiveSizing(bodyFrame, options.coerced)
    : nodeSizing;
  const bodySizing = bodyFrame
    ? reconcileChildSizingForFigma(rawBodySizing, nodeSizing)
    : rawBodySizing;
  const childParentSizing = bodyFrame ? bodySizing : nodeSizing;
  const headingFrame = findSyntheticHeading(frame);
  const iconColumn = frame.icon ? ICON_COLUMN : 0;
  const headingIconColumn = headingFrame?.icon ? ICON_COLUMN : 0;
  return {
    id: frame.id,
    name: frame.id,
    kind: semanticState.kind,
    isLeaf: frame.isLeaf,
    width: nodeSizing.width,
    height: nodeSizing.height,
    direction: layoutDirection,
    bodyGap: layoutGap,
    headerGap: layoutHeaderGap,
    sizingW: nodeSizing.sizingW,
    sizingH: nodeSizing.sizingH,
    bodySizingW: bodySizing.sizingW,
    bodySizingH: bodySizing.sizingH,
    bodyWidth: bodySizing.width,
    bodyHeight: bodySizing.height,
    positionType: frame.positionType ?? "AUTO",
    x: Number.isFinite(frame.x) ? frame.x : 0,
    y: Number.isFinite(frame.y) ? frame.y : 0,
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
    icon: serializeIcon(frame),
    headerMinHeight: headingFrame?._layout?.placedH ?? 0,
    headerIcon: headingFrame ? serializeIcon(headingFrame) : null,
    headerIconFill: headingFrame?.resolvedIconFill ?? frame.resolvedIconFill ?? "#000000",
    headerTextWidth: headingFrame
      ? Math.max(0, placedWidth(headingFrame) - headingFrame.paddingLeft - headingFrame.paddingRight - headingIconColumn)
      : 0,
    leafTextWidth: Math.max(0, nodeSizing.width - frame.paddingLeft - frame.paddingRight - iconColumn),
    textBlocks: serializeTextBlocks(frame),
    children: layoutChildren.map((child: any) => serializeDiagramNode(child, semanticState.childContext, {
      coerced: options.coerced,
      parentSizing: childParentSizing,
    })),
  };
}

async function loadDiagramBySlug(slug: string) {
  const yamlPath = path.join(FRAMES_DIR, `${slug}.yaml`);
  const raw = await readFile(yamlPath, "utf8");
  const diagram = loadFrameYamlFromString(raw, yamlPath);
  const adapter = new MockTextAdapter();
  resolveStyles(diagram.root);
  const layout = layoutFrameTree(diagram.root, adapter, {
    arrows: diagram.arrows,
    gridCols: diagram.gridCols,
    gridColGap: diagram.gridColGap,
    gridOuterMargin: diagram.gridOuterMargin,
  });
  return { diagram, layout };
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

  const iconColumn = leaf.icon ? ICON_COLUMN : 0;
  return {
    leaf: {
      id: leaf.id,
      name: "Sample leaf",
      width: leaf._layout.placedW,
      minHeight: BOX_MIN_HEIGHT,
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
        fontSize: BODY_SIZE,
        lineHeight: BODY_LINE_STEP,
        textFill: leaf.resolvedTextFill ?? "#000000",
      },
      icon: {
        name: leaf.icon ?? "Gateway.svg",
        size: ICON_SIZE,
        path: `/icons/${encodeURIComponent(leaf.icon ?? "Gateway.svg")}`,
      },
    },
  };
}

export async function createFrameDiagramPayload(slug: string) {
  const { diagram, layout } = await loadDiagramBySlug(slug);
  return {
    slug,
    title: diagram.title,
    root: serializeDiagramNode(diagram.root, undefined, { coerced: layout.coerced }),
  };
}

export function createDevServer() {
  return createServer(async (request, response) => {
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
}

function isDirectExecution() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(entry).href;
}

if (isDirectExecution()) {
  const server = createDevServer();
  server.listen(PORT, () => {
    console.log(`Figma plugin dev server listening on http://localhost:${PORT}`);
  });
}
