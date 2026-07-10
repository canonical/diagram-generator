const DEFAULT_SERVER_URL = "http://localhost:3846";
const DEFAULT_DIAGRAM_SLUG = "ai-infra-telecom-services-stack";
const DEFAULT_FONT = { family: "Ubuntu Sans", style: "Regular" };
const DEFAULT_BOLD_FONT = { family: "Ubuntu Sans", style: "Bold" };
const FALLBACK_FONT = { family: "Inter", style: "Regular" };
const FALLBACK_BOLD_FONT = { family: "Inter", style: "Bold" };
const PLUGIN_NAMESPACE = "dgp";
const IMPORT_ID_KEY = "importId";
const IMPORT_KIND_KEY = "importKind";
const COMPONENT_ROLE_KEY = "componentRole";
const COMPONENT_VARIANT_KEY = "componentVariant";
const SLOT_STRATEGY_KEY = "slotStrategy";
const BOX_COMPONENT_SET_NAME = "box";
const BOX_SLOT_LAYER_NAME = "slot";
const BOX_ROLE_VARIANTS = {
  child: "Child",
  parent: "Parent",
  section: "Section",
} as const;
const fontLoadCache = new Map<string, Promise<{ family: string; style: string }>>();
const PLACEHOLDER_STROKE = "#C7CDD1";

interface BoxPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface SampleLeafPayload {
  leaf: {
    id: string;
    name: string;
    width: number;
    minHeight: number;
    padding: BoxPadding;
    stroke: string;
    text: {
      text: string;
      width: number;
      fontSize: number;
      lineHeight: number;
      textFill: string;
    };
    icon: {
      name: string;
      size: number;
      path: string;
    };
  };
}

interface DiagramTextLinePayload {
  text: string;
  size: number;
  weight: number;
  fill: string;
  lineHeight: number;
}

interface DiagramTextBlockPayload {
  role: string;
  gapAfter: number;
  lines: DiagramTextLinePayload[];
}

interface DiagramIconPayload {
  name: string;
  size: number;
  path: string;
}

interface DiagramNodePayload {
  id: string;
  name: string;
  kind: string;
  isLeaf: boolean;
  width: number;
  height: number;
  direction: "HORIZONTAL" | "VERTICAL";
  bodyGap: number;
  headerGap: number;
  sizingW: "FIXED" | "HUG" | "FILL";
  sizingH: "FIXED" | "HUG" | "FILL";
  bodySizingW: "FIXED" | "HUG" | "FILL";
  bodySizingH: "FIXED" | "HUG" | "FILL";
  bodyWidth?: number;
  bodyHeight?: number;
  positionType: "AUTO" | "ABSOLUTE";
  x: number;
  y: number;
  padding: BoxPadding;
  fill: string;
  stroke: string;
  strokeWidth: number;
  textFill: string;
  iconFill: string;
  icon: DiagramIconPayload | null;
  headerMinHeight: number;
  headerIcon: DiagramIconPayload | null;
  headerIconFill: string;
  headerTextWidth: number;
  leafTextWidth: number;
  textBlocks: DiagramTextBlockPayload[];
  children: DiagramNodePayload[];
}

interface FrameDiagramPayload {
  slug: string;
  title: string;
  source?: {
    kind: string;
    name: string;
  };
  root: DiagramNodePayload;
}

interface ImportBuildContext {
  createdNodes: Set<any>;
  componentInstanceCount: number;
  componentSetName: string | null;
  instanceSlotCount: number;
  detachedSlotCount: number;
  missingIconNames: Set<string>;
}

interface ComponentMapping {
  componentSet: any;
  roleComponents: Map<"Child" | "Parent" | "Section", any>;
  iconComponents: Map<string, any>;
}

interface SizingExpectation {
  importId: string;
  label: string;
  sizingW: "FIXED" | "HUG" | "FILL";
  sizingH: "FIXED" | "HUG" | "FILL";
}

function rgba(hex: string, alpha = 1) {
  const normalized = String(hex || "").trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`Unsupported color value: ${hex}`);
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255,
    a: alpha,
  };
}

function getServerUrl(raw: unknown) {
  const trimmed = String(raw || "").trim();
  return trimmed || DEFAULT_SERVER_URL;
}

function getDiagramSlug(raw: unknown) {
  const trimmed = String(raw || "").trim();
  return trimmed || DEFAULT_DIAGRAM_SLUG;
}

function formatUnknownValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch (_error) {
    return String(value);
  }
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "error" in error) {
    return formatUnknownValue((error as { error: unknown }).error);
  }
  return formatUnknownValue(error);
}

function isVisibleColor(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized !== "" && normalized !== "none" && normalized !== "transparent";
}

function clampSize(value: number) {
  return Math.max(1, Math.round(Number.isFinite(value) ? value : 1));
}

function createImportBuildContext(): ImportBuildContext {
  return {
    createdNodes: new Set<any>(),
    componentInstanceCount: 0,
    componentSetName: null,
    instanceSlotCount: 0,
    detachedSlotCount: 0,
    missingIconNames: new Set<string>(),
  };
}

function trackCreatedNode<T>(context: ImportBuildContext | null | undefined, node: T) {
  context?.createdNodes.add(node);
  return node;
}

function setNodeSizing(node: any, horizontal: "FIXED" | "HUG" | "FILL", vertical: "FIXED" | "HUG" | "FILL") {
  try {
    node.layoutSizingHorizontal = horizontal;
  } catch (error) {
    logImportFallback(`Horizontal sizing rejected for ${node?.name || "unnamed node"} -> ${horizontal}`, error);
  }
  try {
    node.layoutSizingVertical = vertical;
  } catch (error) {
    logImportFallback(`Vertical sizing rejected for ${node?.name || "unnamed node"} -> ${vertical}`, error);
  }

  if (node.layoutSizingHorizontal !== horizontal || node.layoutSizingVertical !== vertical) {
    console.warn(
      `[figma-import] Layout sizing mismatch for ${node?.name || "unnamed node"}: `
      + `wanted ${horizontal}/${vertical}, got ${node.layoutSizingHorizontal}/${node.layoutSizingVertical}`,
    );
  }
}

function normalizeSizing(value: string | null | undefined): "FIXED" | "HUG" | "FILL" {
  if (value === "HUG" || value === "FILL" || value === "FIXED") {
    return value;
  }
  return "FIXED";
}

function applyChildLayoutSizing(
  node: any,
  sizingW: "FIXED" | "HUG" | "FILL",
  sizingH: "FIXED" | "HUG" | "FILL",
) {
  setNodeSizing(node, normalizeSizing(sizingW), normalizeSizing(sizingH));
}

function normalizePositionType(value: string | null | undefined): "AUTO" | "ABSOLUTE" {
  return value === "ABSOLUTE" ? "ABSOLUTE" : "AUTO";
}

function resolveChildSizingWithinParent(
  sizingW: "FIXED" | "HUG" | "FILL",
  sizingH: "FIXED" | "HUG" | "FILL",
  parentSizingW: "FIXED" | "HUG" | "FILL",
  parentSizingH: "FIXED" | "HUG" | "FILL",
) {
  return {
    sizingW: parentSizingW === "HUG" && sizingW === "FILL" ? "FIXED" as const : sizingW,
    sizingH: parentSizingH === "HUG" && sizingH === "FILL" ? "FIXED" as const : sizingH,
  };
}

function setFrameAxisSizingModes(
  frame: any,
  direction: "HORIZONTAL" | "VERTICAL",
  sizingW: "FIXED" | "HUG" | "FILL",
  sizingH: "FIXED" | "HUG" | "FILL",
) {
  const horizontal = normalizeSizing(sizingW);
  const vertical = normalizeSizing(sizingH);

  if (direction === "HORIZONTAL") {
    frame.primaryAxisSizingMode = horizontal === "HUG" ? "AUTO" : "FIXED";
    frame.counterAxisSizingMode = vertical === "HUG" ? "AUTO" : "FIXED";
    return;
  }

  frame.primaryAxisSizingMode = vertical === "HUG" ? "AUTO" : "FIXED";
  frame.counterAxisSizingMode = horizontal === "HUG" ? "AUTO" : "FIXED";
}

function resizeFrameForFixedAxes(
  frame: any,
  width: number,
  height: number,
  sizingW: "FIXED" | "HUG" | "FILL",
  sizingH: "FIXED" | "HUG" | "FILL",
) {
  const horizontal = normalizeSizing(sizingW);
  const vertical = normalizeSizing(sizingH);
  if (horizontal !== "FIXED" && vertical !== "FIXED") {
    return;
  }

  if (horizontal === "FIXED" && vertical === "FIXED") {
    frame.resizeWithoutConstraints(clampSize(width), clampSize(height));
    return;
  }

  if ((frame.children?.length ?? 0) === 0) {
    return;
  }

  const nextWidth = horizontal === "FIXED"
    ? clampSize(width)
    : clampSize(frame.width || 1);
  const nextHeight = vertical === "FIXED"
    ? clampSize(height)
    : clampSize(frame.height || 1);
  frame.resizeWithoutConstraints(nextWidth, nextHeight);
}

function applyFrameOwnSizing(
  frame: any,
  direction: "HORIZONTAL" | "VERTICAL",
  width: number,
  height: number,
  sizingW: "FIXED" | "HUG" | "FILL",
  sizingH: "FIXED" | "HUG" | "FILL",
) {
  const horizontal = normalizeSizing(sizingW);
  const vertical = normalizeSizing(sizingH);
  setFrameAxisSizingModes(frame, direction, horizontal, vertical);

  const parent = frame.parent ?? null;
  const canApplyChildSizing = Boolean(
    parent && (parent.layoutMode === "HORIZONTAL" || parent.layoutMode === "VERTICAL"),
  );
  if (canApplyChildSizing) {
    try {
      frame.layoutSizingHorizontal = horizontal;
    } catch (error) {
      logImportFallback(`Frame horizontal sizing rejected for ${frame?.name || "unnamed frame"} -> ${horizontal}`, error);
    }

    try {
      frame.layoutSizingVertical = vertical;
    } catch (error) {
      logImportFallback(`Frame vertical sizing rejected for ${frame?.name || "unnamed frame"} -> ${vertical}`, error);
    }
  }

  resizeFrameForFixedAxes(frame, width, height, horizontal, vertical);
}

function finalizeFrameOwnSizing(
  frame: any,
  width: number,
  height: number,
  sizingW: "FIXED" | "HUG" | "FILL",
  sizingH: "FIXED" | "HUG" | "FILL",
) {
  resizeFrameForFixedAxes(frame, width, height, sizingW, sizingH);
}

function applyChildPositioning(
  node: any,
  positionType: "AUTO" | "ABSOLUTE",
  x = 0,
  y = 0,
) {
  node.layoutPositioning = positionType;
  if (positionType === "ABSOLUTE") {
    node.x = Math.round(Number.isFinite(x) ? x : 0);
    node.y = Math.round(Number.isFinite(y) ? y : 0);
  }
}

function appendAutoLayoutChild(
  parent: any,
  child: any,
  sizingW: "FIXED" | "HUG" | "FILL",
  sizingH: "FIXED" | "HUG" | "FILL",
  positionType: "AUTO" | "ABSOLUTE" = "AUTO",
  x = 0,
  y = 0,
) {
  parent.appendChild(child);
  applyChildLayoutSizing(child, sizingW, sizingH);
  applyChildPositioning(child, positionType, x, y);
  return child;
}

function textBlocksHeight(blocks: DiagramTextBlockPayload[]) {
  let total = 0;
  for (const block of blocks) {
    for (const line of block.lines) {
      total += Math.max(1, Math.round(line.lineHeight));
    }
    total += Math.max(0, Math.round(block.gapAfter));
  }
  return total;
}

async function loadFontCandidate(font: { family: string; style: string }) {
  const key = `${font.family}::${font.style}`;
  let promise = fontLoadCache.get(key);
  if (!promise) {
    const loading = figma.loadFontAsync(font).then(() => font);
    fontLoadCache.set(key, loading);
    promise = loading;
  }
  return promise!;
}

async function loadPreferredFont(weight = 400) {
  const preferred = weight >= 600
    ? [DEFAULT_BOLD_FONT, FALLBACK_BOLD_FONT, DEFAULT_FONT, FALLBACK_FONT]
    : [DEFAULT_FONT, FALLBACK_FONT, DEFAULT_BOLD_FONT, FALLBACK_BOLD_FONT];

  for (const font of preferred) {
    try {
      return await loadFontCandidate(font);
    } catch (_error) {
      continue;
    }
  }

  throw new Error("Unable to load a usable font in Figma.");
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: unknown = null;
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch (_error) {
      body = text;
    }
  }

  if (!response.ok) {
    const detail = formatErrorMessage(body) || response.statusText;
    throw new Error(`Request failed: ${response.status} ${response.statusText}: ${detail}`);
  }

  return body as T;
}

async function fetchText(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function setImportData(node: any, importId: string, kind: string) {
  node.setSharedPluginData(PLUGIN_NAMESPACE, IMPORT_ID_KEY, importId);
  node.setSharedPluginData(PLUGIN_NAMESPACE, IMPORT_KIND_KEY, kind);
}

function getImportData(node: any, key: string) {
  return node.getSharedPluginData(PLUGIN_NAMESPACE, key);
}

function setPluginData(node: any, key: string, value: string) {
  node.setSharedPluginData(PLUGIN_NAMESPACE, key, value);
}

function safeRemoveNode(node: any) {
  if (!node || typeof node.remove !== "function") {
    return;
  }
  try {
    node.remove();
  } catch (_error) {
    // Ignore cleanup failures so the original import error still surfaces.
  }
}

function cleanupCreatedNodes(context: ImportBuildContext) {
  const trackedNodes = [...context.createdNodes];
  const trackedSet = new Set(trackedNodes);
  for (const node of trackedNodes) {
    const parent = node?.parent ?? null;
    if (parent && trackedSet.has(parent)) {
      continue;
    }
    safeRemoveNode(node);
  }
}

function clearChildren(frame: any) {
  const children = [...frame.children];
  for (const child of children) {
    child.remove();
  }
}

function createSpacer(name: string, width: number, height: number, context?: ImportBuildContext) {
  const spacer = trackCreatedNode(context, figma.createFrame());
  spacer.name = name;
  spacer.fills = [];
  spacer.strokes = [];
  spacer.clipsContent = false;
  spacer.resizeWithoutConstraints(clampSize(width), clampSize(height));
  setNodeSizing(spacer, "FIXED", "FIXED");
  return spacer;
}

function applyFrameFill(frame: any, fillHex: string) {
  frame.fills = isVisibleColor(fillHex)
    ? [{ type: "SOLID", color: rgba(fillHex) }]
    : [];
}

function applyFrameStroke(frame: any, strokeHex: string, strokeWidth = 1) {
  if (!isVisibleColor(strokeHex) || strokeWidth <= 0) {
    frame.strokes = [];
    frame.strokeWeight = 0;
    return;
  }

  frame.strokes = [{ type: "SOLID", color: rgba(strokeHex) }];
  frame.strokeWeight = Math.max(1, strokeWidth);
}

function applyFrameStyle(frame: any, fillHex: string, strokeHex: string, strokeWidth = 1) {
  applyFrameFill(frame, fillHex);
  applyFrameStroke(frame, strokeHex, strokeWidth);
}

function tintSvgNode(iconNode: any, fillHex: string) {
  if (!isVisibleColor(fillHex) || typeof iconNode.findAll !== "function") {
    return;
  }

  const fill = [{ type: "SOLID", color: rgba(fillHex) }];
  const vectors = iconNode.findAll((node: any) => "fills" in node && node.type !== "FRAME");
  for (const vector of vectors) {
    try {
      vector.fills = fill;
    } catch (_error) {
      continue;
    }
  }
}

function configureAutoLayoutFrame(
  frame: any,
  direction: "HORIZONTAL" | "VERTICAL",
  spacing: number,
) {
  frame.layoutMode = direction;
  frame.layoutWrap = "NO_WRAP";
  frame.primaryAxisAlignItems = "MIN";
  frame.counterAxisAlignItems = "MIN";
  frame.itemSpacing = Math.max(0, Math.round(spacing));
  frame.clipsContent = false;
}

function createAutoLayoutFrame(
  name: string,
  direction: "HORIZONTAL" | "VERTICAL",
  width: number,
  height: number,
  spacing: number,
  sizingW: "FIXED" | "HUG" | "FILL",
  sizingH: "FIXED" | "HUG" | "FILL",
  context?: ImportBuildContext,
) {
  const frame = trackCreatedNode(context, figma.createFrame());
  frame.name = name;
  frame.fills = [];
  frame.strokes = [];
  configureAutoLayoutFrame(frame, direction, spacing);
  applyFrameOwnSizing(frame, direction, width, height, sizingW, sizingH);
  return frame;
}

function resolveImportedNodeSizing(node: DiagramNodePayload) {
  if (node.kind === "root") {
    return { sizingW: "FIXED" as const, sizingH: "FIXED" as const };
  }
  return {
    sizingW: normalizeSizing(node.sizingW),
    sizingH: normalizeSizing(node.sizingH),
  };
}

function createSemanticAutoLayoutFrame(
  node: DiagramNodePayload,
  direction: "HORIZONTAL" | "VERTICAL",
  spacing: number,
  sizingW: "FIXED" | "HUG" | "FILL",
  sizingH: "FIXED" | "HUG" | "FILL",
  context?: ImportBuildContext,
) {
  const frame = createAutoLayoutFrame(
    node.name || node.id,
    direction,
    node.width,
    node.height,
    spacing,
    sizingW,
    sizingH,
    context,
  );
  applyPadding(frame, node.padding);
  applyFrameStyle(frame, node.fill, node.stroke, node.strokeWidth);
  setImportData(frame, node.id, node.kind);
  return frame;
}

function createRootWrapperFrame(node: DiagramNodePayload, context?: ImportBuildContext) {
  const frame = createAutoLayoutFrame(
    node.name || node.id,
    "VERTICAL",
    node.width,
    node.height,
    0,
    "FIXED",
    "FIXED",
    context,
  );
  applyFrameStyle(frame, node.fill, node.stroke, node.strokeWidth);
  setImportData(frame, node.id, node.kind);
  return frame;
}

function applyPadding(frame: any, padding: BoxPadding) {
  frame.paddingTop = padding.top;
  frame.paddingRight = padding.right;
  frame.paddingBottom = padding.bottom;
  frame.paddingLeft = padding.left;
}

function createPlaceholderFrame(
  name: string,
  width: number,
  height: number,
  strokeHex: string,
  context?: ImportBuildContext,
) {
  const frame = trackCreatedNode(context, figma.createFrame());
  frame.name = name;
  frame.layoutMode = "NONE";
  frame.clipsContent = false;
  frame.resizeWithoutConstraints(clampSize(width), clampSize(height));
  applyFrameStyle(frame, "transparent", isVisibleColor(strokeHex) ? strokeHex : PLACEHOLDER_STROKE, 1);
  setNodeSizing(frame, "FIXED", "FIXED");
  return frame;
}

function logImportFallback(label: string, error: unknown) {
  const detail = error instanceof Error
    ? (error.stack || error.message)
    : String(error);
  console.warn(`[figma-import] ${label}`, detail);
}

async function createTextLineNode(
  line: DiagramTextLinePayload,
  width: number,
  name: string,
  context?: ImportBuildContext,
) {
  let textNode: any = null;
  try {
    textNode = trackCreatedNode(context, figma.createText());
    const font = await loadPreferredFont(line.weight);
    textNode.name = name;
    textNode.fontName = font;
    textNode.fontSize = line.size;
    textNode.lineHeight = { unit: "PIXELS", value: line.lineHeight };
    textNode.fills = [{ type: "SOLID", color: rgba(line.fill) }];
    textNode.characters = line.text || " ";
    textNode.textAlignHorizontal = "LEFT";
    textNode.textAutoResize = "HEIGHT";
    textNode.resize(clampSize(width), Math.max(1, line.lineHeight));
    setNodeSizing(textNode, "FIXED", "HUG");
    return textNode;
  } catch (error) {
    safeRemoveNode(textNode);
    logImportFallback(`Text line fallback for ${name}`, error);
    return createPlaceholderFrame(`${name}/fallback`, width, line.lineHeight, line.fill, context);
  }
}

async function createTextBlocksFrame(
  blocks: DiagramTextBlockPayload[],
  width: number,
  nodeId: string,
  fallbackFill: string,
  context?: ImportBuildContext,
) {
  const stack = trackCreatedNode(context, figma.createFrame());
  stack.name = `${nodeId}/text`;
  stack.fills = [];
  stack.strokes = [];
  configureAutoLayoutFrame(stack, "VERTICAL", 0);
  applyFrameOwnSizing(stack, "VERTICAL", width, 1, "FIXED", "HUG");

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const block = blocks[blockIndex]!;
    const blockFrame = trackCreatedNode(context, figma.createFrame());
    blockFrame.name = `${nodeId}/block-${blockIndex + 1}`;
    blockFrame.fills = [];
    blockFrame.strokes = [];
    configureAutoLayoutFrame(blockFrame, "VERTICAL", 0);
    applyFrameOwnSizing(blockFrame, "VERTICAL", width, 1, "FIXED", "HUG");

    for (let lineIndex = 0; lineIndex < block.lines.length; lineIndex += 1) {
      const line = block.lines[lineIndex]!;
      const textNode = await createTextLineNode(
        { ...line, fill: line.fill || fallbackFill },
        width,
        `${nodeId}/${block.role}-${lineIndex + 1}`,
        context,
      );
      setImportData(textNode, `${nodeId}:text:${blockIndex}:${lineIndex}`, "text-line");
      blockFrame.appendChild(textNode);
    }

    appendAutoLayoutChild(stack, blockFrame, "FIXED", "HUG");
    setImportData(blockFrame, `${nodeId}:text-block:${blockIndex}`, `text-block:${block.role}`);

    if (block.gapAfter > 0 && blockIndex < blocks.length - 1) {
      appendAutoLayoutChild(
        stack,
        createSpacer(`${nodeId}/gap-${blockIndex + 1}`, 1, block.gapAfter, context),
        "FIXED",
        "FIXED",
      );
    }

    finalizeFrameOwnSizing(blockFrame, width, 1, "FIXED", "HUG");
  }

  finalizeFrameOwnSizing(stack, width, 1, "FIXED", "HUG");
  return stack;
}

async function createLeafText(payload: SampleLeafPayload["leaf"]["text"], context?: ImportBuildContext) {
  let textNode: any = null;
  try {
    textNode = trackCreatedNode(context, figma.createText());
    const font = await loadPreferredFont(400);
    textNode.fontName = font;
    textNode.fontSize = payload.fontSize;
    textNode.lineHeight = { unit: "PIXELS", value: payload.lineHeight };
    textNode.fills = [{ type: "SOLID", color: rgba(payload.textFill) }];
    textNode.characters = payload.text;
    textNode.textAlignHorizontal = "LEFT";
    textNode.textAutoResize = "HEIGHT";
    textNode.resize(payload.width, Math.max(payload.lineHeight, 1));
    textNode.name = "Label";
    setNodeSizing(textNode, "FIXED", "HUG");
    return textNode;
  } catch (error) {
    safeRemoveNode(textNode);
    logImportFallback("Leaf text fallback", error);
    return createPlaceholderFrame("Label/fallback", payload.width, payload.lineHeight, payload.textFill, context);
  }
}

async function createLeafIcon(
  payload: SampleLeafPayload["leaf"]["icon"] | DiagramIconPayload,
  serverUrl: string,
  context?: ImportBuildContext,
  fillHex?: string,
) {
  let iconNode: any = null;
  try {
    const iconUrl = `${serverUrl}${payload.path}`;
    const svgText = await fetchText(iconUrl);
    iconNode = trackCreatedNode(context, figma.createNodeFromSvg(svgText));
    iconNode.name = payload.name;
    iconNode.resizeWithoutConstraints(payload.size, payload.size);
    setNodeSizing(iconNode, "FIXED", "FIXED");
    if (fillHex) {
      tintSvgNode(iconNode, fillHex);
    }
    return iconNode;
  } catch (error) {
    safeRemoveNode(iconNode);
    logImportFallback(`Icon fallback for ${payload.name}`, error);
    return createPlaceholderFrame(
      `${payload.name}/fallback`,
      payload.size,
      payload.size,
      fillHex || PLACEHOLDER_STROKE,
      context,
    );
  }
}

function findExistingImportedLeaf(importId: string) {
  const matches = figma.currentPage.findAll((node: any) => (
    node.type === "FRAME"
    && getImportData(node, IMPORT_ID_KEY) === importId
    && getImportData(node, IMPORT_KIND_KEY) === "leaf"
  ));
  return matches.length > 0 ? matches[0] : null;
}

function findExistingImportedDiagram(importId: string) {
  const matches = figma.currentPage.findAll((node: any) => (
    node.type === "FRAME"
    && getImportData(node, IMPORT_ID_KEY) === importId
    && getImportData(node, IMPORT_KIND_KEY) === "diagram-root"
  ));
  return matches.length > 0 ? matches[0] : null;
}

function countImportedSubtreeNodes(root: any) {
  if (!root) {
    return 0;
  }
  const rootCount = getImportData(root, IMPORT_ID_KEY) !== "" ? 1 : 0;
  const descendantCount = typeof root.findAll === "function"
    ? root.findAll((node: any) => getImportData(node, IMPORT_ID_KEY) !== "").length
    : 0;
  return rootCount + descendantCount;
}

function collectPayloadSizingExpectations(
  node: DiagramNodePayload,
  expectations: SizingExpectation[] = [],
) {
  expectations.push({
    importId: node.id,
    label: node.id,
    sizingW: normalizeSizing(node.sizingW),
    sizingH: normalizeSizing(node.sizingH),
  });

  if (node.textBlocks.length > 0 && node.children.length > 0) {
    expectations.push({
      importId: `${node.id}:body`,
      label: `${node.id}/body`,
      sizingW: normalizeSizing(node.bodySizingW),
      sizingH: normalizeSizing(node.bodySizingH),
    });
  }

  for (const child of node.children) {
    collectPayloadSizingExpectations(child, expectations);
  }

  return expectations;
}

function collectImportedNodesById(root: any) {
  const nodes = new Map<string, any>();
  const visit = (node: any) => {
    const importId = getImportData(node, IMPORT_ID_KEY);
    if (importId) {
      nodes.set(importId, node);
    }
    for (const child of node.children ?? []) {
      visit(child);
    }
  };
  visit(root);
  return nodes;
}

function validateImportedDiagramSizing(rootFrame: any, payloadRoot: DiagramNodePayload) {
  const nodesById = collectImportedNodesById(rootFrame);
  const mismatches: string[] = [];
  let checked = 0;

  for (const expected of collectPayloadSizingExpectations(payloadRoot)) {
    const node = nodesById.get(expected.importId);
    if (!node) {
      mismatches.push(`${expected.label}: missing imported frame`);
      continue;
    }

    checked += 1;
    const actualW = node.layoutSizingHorizontal;
    const actualH = node.layoutSizingVertical;
    if (actualW !== expected.sizingW || actualH !== expected.sizingH) {
      mismatches.push(
        `${expected.label}: expected ${expected.sizingW}/${expected.sizingH}, got ${actualW}/${actualH}`,
      );
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`Figma rejected imported sizing:\n${mismatches.join("\n")}`);
  }

  return checked;
}

function validateImportedComponentStructure(rootFrame: any, payloadRoot: DiagramNodePayload) {
  const nodesById = collectImportedNodesById(rootFrame);
  const mismatches: string[] = [];
  let checked = 0;

  const visit = (node: DiagramNodePayload) => {
    if (node.kind !== "root") {
      const imported = nodesById.get(node.id);
      const expectedRole = componentRoleForNode(node);
      if (!imported) {
        mismatches.push(`${node.id}: missing component import`);
      } else {
        checked += 1;
        const importKind = getImportData(imported, IMPORT_KIND_KEY);
        const role = getImportData(imported, COMPONENT_ROLE_KEY);
        const variantName = getImportData(imported, COMPONENT_VARIANT_KEY)
          || imported.mainComponent?.name
          || "";
        const variantRole = parseVariantRole(variantName);
        if (!String(importKind).startsWith("component:") && !String(importKind).startsWith("detached-component:")) {
          mismatches.push(`${node.id}: expected component import, got ${importKind || "none"}`);
        }
        if (role !== expectedRole) {
          mismatches.push(`${node.id}: expected Role=${expectedRole}, got ${role || "none"}`);
        }
        if (variantRole !== expectedRole) {
          mismatches.push(`${node.id}: expected component variant Role=${expectedRole}, got ${variantName || "none"}`);
        }
      }
    }

    if (node.kind !== "root" && node.children.length > 0) {
      const body = nodesById.get(`${node.id}:body`);
      if (!body) {
        mismatches.push(`${node.id}/body: missing component slot body`);
      } else {
        checked += 1;
        const strategy = getImportData(body, SLOT_STRATEGY_KEY);
        if (strategy !== "instance-slot" && strategy !== "detached-slot") {
          mismatches.push(`${node.id}/body: missing slot strategy`);
        }
        if (body.layoutMode !== node.direction) {
          mismatches.push(`${node.id}/body: expected ${node.direction} layout, got ${body.layoutMode}`);
        }
        const childIds = (body.children ?? [])
          .map((child: any) => getImportData(child, IMPORT_ID_KEY))
          .filter(Boolean);
        const expectedChildIds = node.children.map((child) => child.id);
        if (childIds.join("\n") !== expectedChildIds.join("\n")) {
          mismatches.push(
            `${node.id}/body: expected child order ${expectedChildIds.join(", ")}, got ${childIds.join(", ")}`,
          );
        }
      }
    }

    for (const child of node.children) {
      visit(child);
    }
  };

  visit(payloadRoot);

  if (mismatches.length > 0) {
    throw new Error(`Figma component import mismatch:\n${mismatches.join("\n")}`);
  }

  return checked;
}

function visitSceneTree(root: any, visitor: (node: any) => void) {
  visitor(root);
  for (const child of root?.children ?? []) {
    visitSceneTree(child, visitor);
  }
}

function parseVariantRole(name: string): "Child" | "Parent" | "Section" | null {
  const match = String(name || "").match(/(?:^|,\s*)Role=([^,]+)/);
  const role = match?.[1]?.trim();
  if (role === "Child" || role === "Parent" || role === "Section") {
    return role;
  }
  return null;
}

function collectCandidateRoots() {
  const roots: any[] = [];
  for (const node of figma.currentPage.selection ?? []) {
    roots.push(node);
  }
  roots.push(figma.currentPage);
  return roots;
}

function findBoxComponentSets() {
  const matches = new Set<any>();
  for (const root of collectCandidateRoots()) {
    visitSceneTree(root, (node) => {
      if (String(node?.name || "").trim() === BOX_COMPONENT_SET_NAME && (node.children?.length ?? 0) > 0) {
        matches.add(node);
      }
    });
  }
  return [...matches];
}

function normalizeIconName(name: string) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\.svg$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function collectIconComponents() {
  const icons = new Map<string, any>();
  visitSceneTree(figma.currentPage, (node) => {
    if (node?.type !== "COMPONENT" || typeof node.createInstance !== "function" || parseVariantRole(node.name)) {
      return;
    }
    const normalized = normalizeIconName(node.name);
    if (normalized && !icons.has(normalized)) {
      icons.set(normalized, node);
    }
  });
  return icons;
}

function resolveComponentMapping(): ComponentMapping | null {
  const componentSets = findBoxComponentSets();
  if (componentSets.length > 1) {
    throw new Error(`Found ${componentSets.length} candidate "${BOX_COMPONENT_SET_NAME}" component sets; keep exactly one visible/selected for import.`);
  }
  const componentSet = componentSets[0];
  if (!componentSet) {
    return null;
  }

  const roleComponents = new Map<"Child" | "Parent" | "Section", any>();
  for (const child of componentSet.children ?? []) {
    const role = parseVariantRole(child.name);
    if (role && typeof child.createInstance === "function") {
      if (roleComponents.has(role)) {
        throw new Error(`Box component set has multiple Role=${role} variants.`);
      }
      roleComponents.set(role, child);
    }
  }

  for (const role of [BOX_ROLE_VARIANTS.child, BOX_ROLE_VARIANTS.parent, BOX_ROLE_VARIANTS.section] as const) {
    if (!roleComponents.has(role)) {
      throw new Error(`Box component set is missing Role=${role}.`);
    }
  }

  return {
    componentSet,
    roleComponents,
    iconComponents: collectIconComponents(),
  };
}

function componentRoleForNode(node: DiagramNodePayload): "Child" | "Parent" | "Section" {
  if (node.kind === "section") {
    return BOX_ROLE_VARIANTS.section;
  }
  if (node.kind === "panel" || (!node.isLeaf && node.kind !== "root")) {
    return BOX_ROLE_VARIANTS.parent;
  }
  return BOX_ROLE_VARIANTS.child;
}

function findFirstDescendant(node: any, predicate: (node: any) => boolean): any | null {
  if (!node) {
    return null;
  }
  for (const child of node.children ?? []) {
    if (predicate(child)) {
      return child;
    }
    const nested = findFirstDescendant(child, predicate);
    if (nested) {
      return nested;
    }
  }
  return null;
}

function findDescendants(node: any, predicate: (node: any) => boolean) {
  const matches: any[] = [];
  visitSceneTree(node, (candidate) => {
    if (candidate !== node && predicate(candidate)) {
      matches.push(candidate);
    }
  });
  return matches;
}

function findSlotNode(instance: any) {
  return findFirstDescendant(
    instance,
    (node) => String(node.name || "").trim().toLowerCase() === BOX_SLOT_LAYER_NAME,
  );
}

async function applyInstanceTextOverrides(instance: any, node: DiagramNodePayload) {
  const lines = node.textBlocks.flatMap((block) => block.lines);
  if (lines.length === 0) {
    return;
  }

  const textNodes = findDescendants(instance, (candidate) => candidate.type === "TEXT");
  for (let index = 0; index < textNodes.length && index < lines.length; index += 1) {
    const textNode = textNodes[index]!;
    const line = lines[index]!;
    try {
      const font = await loadPreferredFont(line.weight);
      textNode.fontName = font;
      textNode.characters = line.text || " ";
    } catch (error) {
      logImportFallback(`Component text override failed for ${node.id}`, error);
    }
  }
}

function findIconTarget(instance: any) {
  return findFirstDescendant(instance, (node) => /\.svg$/i.test(String(node.name || "")));
}

function applyInstanceIconOverride(
  instance: any,
  node: DiagramNodePayload,
  mapping: ComponentMapping,
  context: ImportBuildContext,
) {
  if (!node.icon) {
    return;
  }

  const key = normalizeIconName(node.icon.name);
  const component = mapping.iconComponents.get(key);
  if (!component) {
    context.missingIconNames.add(node.icon.name);
    return;
  }

  const target = findIconTarget(instance);
  if (!target || typeof target.swapComponent !== "function") {
    context.missingIconNames.add(node.icon.name);
    return;
  }

  try {
    target.swapComponent(component);
  } catch (error) {
    context.missingIconNames.add(node.icon.name);
    logImportFallback(`Icon component swap failed for ${node.icon.name}`, error);
  }
}

async function buildLeafNode(node: DiagramNodePayload, serverUrl: string, context: ImportBuildContext) {
  const innerWidth = Math.max(1, node.width - node.padding.left - node.padding.right);
  const hasText = node.textBlocks.length > 0;
  const icon = node.icon;
  const importedSizing = resolveImportedNodeSizing(node);

  if (icon) {
    const frame = createSemanticAutoLayoutFrame(
      node,
      "HORIZONTAL",
      0,
      importedSizing.sizingW,
      importedSizing.sizingH,
      context,
    );
    frame.primaryAxisAlignItems = "SPACE_BETWEEN";
    frame.counterAxisAlignItems = "MIN";

    const textWidth = Math.max(1, Math.min(innerWidth, node.leafTextWidth || innerWidth));
    if (hasText) {
      const textStack = await createTextBlocksFrame(node.textBlocks, textWidth, node.id, node.textFill, context);
      setImportData(textStack, `${node.id}:text`, "text-stack");
      appendAutoLayoutChild(frame, textStack, "FIXED", "HUG");
    } else if (innerWidth > icon.size) {
      appendAutoLayoutChild(
        frame,
        createSpacer(`${node.id}/push`, innerWidth - icon.size, 1, context),
        "FIXED",
        "FIXED",
      );
    }

    const iconNode = await createLeafIcon(icon, serverUrl, context, node.iconFill);
    setImportData(iconNode, `${node.id}:icon`, "icon");
    appendAutoLayoutChild(frame, iconNode, "FIXED", "FIXED");
    finalizeFrameOwnSizing(frame, node.width, node.height, importedSizing.sizingW, importedSizing.sizingH);
    return frame;
  }

  const frame = createSemanticAutoLayoutFrame(
    node,
    "VERTICAL",
    node.bodyGap,
    importedSizing.sizingW,
    importedSizing.sizingH,
    context,
  );

  if (hasText) {
    const textStack = await createTextBlocksFrame(node.textBlocks, innerWidth, node.id, node.textFill, context);
    setImportData(textStack, `${node.id}:text`, "text-stack");
    appendAutoLayoutChild(frame, textStack, "FIXED", "HUG");
  }

  finalizeFrameOwnSizing(frame, node.width, node.height, importedSizing.sizingW, importedSizing.sizingH);
  return frame;
}

async function buildContainerNode(
  node: DiagramNodePayload,
  serverUrl: string,
  context: ImportBuildContext,
  componentMapping: ComponentMapping | null = null,
) {
  const innerWidth = Math.max(1, node.width - node.padding.left - node.padding.right);
  const innerHeight = Math.max(1, node.height - node.padding.top - node.padding.bottom);
  const hasHeader = node.textBlocks.length > 0;
  const hasChildren = node.children.length > 0;
  const importedSizing = resolveImportedNodeSizing(node);

  if (hasHeader) {
    if (node.kind === "root") {
      const frame = createRootWrapperFrame(node, context);
      const content = createAutoLayoutFrame(
        `${node.id}/content`,
        "VERTICAL",
        innerWidth,
        innerHeight,
        node.headerGap,
        "FILL",
        "FILL",
        context,
      );

      const derivedHeaderHeight = textBlocksHeight(node.textBlocks);
      const headerHeight = Math.max(1, Math.max(clampSize(node.headerMinHeight || 0), derivedHeaderHeight));
      const headerHasIcon = Boolean(node.headerIcon);
      const headerSizing = resolveChildSizingWithinParent("FILL", "HUG", "FILL", "FILL");
      const headerFrame = createAutoLayoutFrame(
        `${node.id}/header`,
        headerHasIcon ? "HORIZONTAL" : "VERTICAL",
        innerWidth,
        Math.min(innerHeight, headerHeight),
        0,
        headerSizing.sizingW,
        headerSizing.sizingH,
        context,
      );
      headerFrame.primaryAxisAlignItems = headerHasIcon ? "SPACE_BETWEEN" : "MIN";
      headerFrame.counterAxisAlignItems = "MIN";

      const headerTextWidth = Math.max(
        1,
        Math.min(innerWidth, node.headerTextWidth > 0 ? node.headerTextWidth : innerWidth),
      );
      const textStack = await createTextBlocksFrame(
        node.textBlocks,
        headerTextWidth,
        node.id,
        node.textFill,
        context,
      );
      setImportData(textStack, `${node.id}:header`, "text-stack");
      appendAutoLayoutChild(headerFrame, textStack, "FIXED", "HUG");

      if (node.headerIcon) {
        const iconNode = await createLeafIcon(node.headerIcon, serverUrl, context, node.headerIconFill);
        setImportData(iconNode, `${node.id}:header-icon`, "header-icon");
        appendAutoLayoutChild(headerFrame, iconNode, "FIXED", "FIXED");
      }

      setImportData(headerFrame, `${node.id}:header-frame`, "container-header");
      appendAutoLayoutChild(content, headerFrame, headerSizing.sizingW, headerSizing.sizingH);

      if (hasChildren) {
        const fallbackBodyHeight = Math.max(1, innerHeight - headerFrame.height - Math.max(0, Math.round(node.headerGap)));
        const bodyWidth = Math.max(1, node.bodyWidth ?? innerWidth);
        const bodyHeight = Math.max(1, node.bodyHeight ?? fallbackBodyHeight);
        const body = createAutoLayoutFrame(
          `${node.id}/body`,
          node.direction,
          bodyWidth,
          bodyHeight,
          node.bodyGap,
          node.bodySizingW,
          node.bodySizingH,
          context,
        );

        for (const child of node.children) {
          const childFrame = await buildDiagramFrameNode(child, serverUrl, context, componentMapping);
          appendAutoLayoutChild(
            body,
            childFrame,
            normalizeSizing(child.sizingW),
            normalizeSizing(child.sizingH),
            normalizePositionType(child.positionType),
            child.x,
            child.y,
          );
        }

        setImportData(body, `${node.id}:body`, "container-body");
        finalizeFrameOwnSizing(body, bodyWidth, bodyHeight, node.bodySizingW, node.bodySizingH);
        appendAutoLayoutChild(content, body, node.bodySizingW, node.bodySizingH);
      }

      frame.appendChild(content);
      applyChildLayoutSizing(content, "FILL", "FILL");
      finalizeFrameOwnSizing(content, innerWidth, innerHeight, "FILL", "FILL");
      finalizeFrameOwnSizing(frame, node.width, node.height, "FIXED", "FIXED");
      return frame;
    }

    const frame = createSemanticAutoLayoutFrame(
      node,
      "VERTICAL",
      node.headerGap,
      importedSizing.sizingW,
      importedSizing.sizingH,
      context,
    );

    const derivedHeaderHeight = textBlocksHeight(node.textBlocks);
    const headerHeight = Math.max(1, Math.max(clampSize(node.headerMinHeight || 0), derivedHeaderHeight));
    const headerHasIcon = Boolean(node.headerIcon);
    const headerSizing = resolveChildSizingWithinParent(
      "FILL",
      "HUG",
      importedSizing.sizingW,
      importedSizing.sizingH,
    );
    const headerFrame = createAutoLayoutFrame(
      `${node.id}/header`,
      headerHasIcon ? "HORIZONTAL" : "VERTICAL",
      innerWidth,
      Math.min(innerHeight, headerHeight),
      0,
      headerSizing.sizingW,
      headerSizing.sizingH,
      context,
    );
    headerFrame.primaryAxisAlignItems = headerHasIcon ? "SPACE_BETWEEN" : "MIN";
    headerFrame.counterAxisAlignItems = "MIN";

    const headerTextWidth = Math.max(
      1,
      Math.min(innerWidth, node.headerTextWidth > 0 ? node.headerTextWidth : innerWidth),
    );
    const textStack = await createTextBlocksFrame(
      node.textBlocks,
      headerTextWidth,
      node.id,
      node.textFill,
      context,
    );
    setImportData(textStack, `${node.id}:header`, "text-stack");
    appendAutoLayoutChild(headerFrame, textStack, "FIXED", "HUG");

    if (node.headerIcon) {
      const iconNode = await createLeafIcon(node.headerIcon, serverUrl, context, node.headerIconFill);
      setImportData(iconNode, `${node.id}:header-icon`, "header-icon");
      appendAutoLayoutChild(headerFrame, iconNode, "FIXED", "FIXED");
    }

    setImportData(headerFrame, `${node.id}:header-frame`, "container-header");
    appendAutoLayoutChild(frame, headerFrame, headerSizing.sizingW, headerSizing.sizingH);

    if (hasChildren) {
      const fallbackBodyHeight = Math.max(1, innerHeight - headerFrame.height - Math.max(0, Math.round(node.headerGap)));
      const bodyWidth = Math.max(1, node.bodyWidth ?? innerWidth);
      const bodyHeight = Math.max(1, node.bodyHeight ?? fallbackBodyHeight);
      const body = createAutoLayoutFrame(
        `${node.id}/body`,
        node.direction,
        bodyWidth,
        bodyHeight,
        node.bodyGap,
        node.bodySizingW,
        node.bodySizingH,
        context,
      );

      for (const child of node.children) {
      const childFrame = await buildDiagramFrameNode(child, serverUrl, context, componentMapping);
        appendAutoLayoutChild(
          body,
          childFrame,
          normalizeSizing(child.sizingW),
          normalizeSizing(child.sizingH),
          normalizePositionType(child.positionType),
          child.x,
          child.y,
        );
      }

      setImportData(body, `${node.id}:body`, "container-body");
      finalizeFrameOwnSizing(body, bodyWidth, bodyHeight, node.bodySizingW, node.bodySizingH);
      appendAutoLayoutChild(frame, body, node.bodySizingW, node.bodySizingH);
    }

    finalizeFrameOwnSizing(frame, node.width, node.height, importedSizing.sizingW, importedSizing.sizingH);
    return frame;
  }

  const frame = createSemanticAutoLayoutFrame(
    node,
    node.direction,
    node.bodyGap,
    importedSizing.sizingW,
    importedSizing.sizingH,
    context,
  );
  for (const child of node.children) {
    const childFrame = await buildDiagramFrameNode(child, serverUrl, context, componentMapping);
    appendAutoLayoutChild(
      frame,
      childFrame,
      normalizeSizing(child.sizingW),
      normalizeSizing(child.sizingH),
      normalizePositionType(child.positionType),
      child.x,
      child.y,
    );
  }
  finalizeFrameOwnSizing(frame, node.width, node.height, importedSizing.sizingW, importedSizing.sizingH);
  return frame;
}

async function populateComponentSlot(
  slot: any,
  node: DiagramNodePayload,
  serverUrl: string,
  context: ImportBuildContext,
  componentMapping: ComponentMapping,
) {
  clearChildren(slot);
  if (slot.layoutMode !== "HORIZONTAL" && slot.layoutMode !== "VERTICAL") {
    configureAutoLayoutFrame(slot, "VERTICAL", 0);
  }

  const bodyWidth = Math.max(1, node.bodyWidth ?? node.width);
  const bodyHeight = Math.max(1, node.bodyHeight ?? node.height);
  const body = createAutoLayoutFrame(
    `${node.id}/body`,
    node.direction,
    bodyWidth,
    bodyHeight,
    node.bodyGap,
    node.bodySizingW,
    node.bodySizingH,
    context,
  );

  for (const child of node.children) {
    const childFrame = await buildDiagramFrameNode(child, serverUrl, context, componentMapping);
    appendAutoLayoutChild(
      body,
      childFrame,
      normalizeSizing(child.sizingW),
      normalizeSizing(child.sizingH),
      normalizePositionType(child.positionType),
      child.x,
      child.y,
    );
  }

  setImportData(body, `${node.id}:body`, "component-slot-body");
  finalizeFrameOwnSizing(body, bodyWidth, bodyHeight, node.bodySizingW, node.bodySizingH);
  appendAutoLayoutChild(slot, body, node.bodySizingW, node.bodySizingH);
  return body;
}

async function populateSlotWithRuntimeStrategy(
  instance: any,
  node: DiagramNodePayload,
  serverUrl: string,
  context: ImportBuildContext,
  componentMapping: ComponentMapping,
) {
  const slot = findSlotNode(instance);
  if (!slot) {
    throw new Error(`Mapped component instance for ${node.id} does not contain a layer named "${BOX_SLOT_LAYER_NAME}".`);
  }

  try {
    const body = await populateComponentSlot(slot, node, serverUrl, context, componentMapping);
    setPluginData(body, SLOT_STRATEGY_KEY, "instance-slot");
    context.instanceSlotCount += 1;
    return instance;
  } catch (instanceSlotError) {
    if (typeof instance.detachInstance !== "function") {
      throw instanceSlotError;
    }

    const detached = trackCreatedNode(context, instance.detachInstance());
    detached.name = instance.name || node.name || node.id;
    setImportData(detached, node.id, `detached-component:${node.kind}`);
    const detachedSlot = findSlotNode(detached);
    if (!detachedSlot) {
      throw new Error(`Detached component for ${node.id} does not contain a layer named "${BOX_SLOT_LAYER_NAME}".`);
    }
    const body = await populateComponentSlot(detachedSlot, node, serverUrl, context, componentMapping);
    setPluginData(body, SLOT_STRATEGY_KEY, "detached-slot");
    context.detachedSlotCount += 1;
    return detached;
  }
}

async function buildComponentMappedNode(
  node: DiagramNodePayload,
  serverUrl: string,
  context: ImportBuildContext,
  componentMapping: ComponentMapping,
) {
  const role = componentRoleForNode(node);
  const component = componentMapping.roleComponents.get(role);
  if (!component) {
    throw new Error(`No box component variant mapped for Role=${role}.`);
  }

  const instance = trackCreatedNode(context, component.createInstance());
  context.componentInstanceCount += 1;
  context.componentSetName = componentMapping.componentSet.name || BOX_COMPONENT_SET_NAME;
  instance.name = node.name || node.id;
  setImportData(instance, node.id, `component:${node.kind}`);
  setPluginData(instance, COMPONENT_ROLE_KEY, role);
  setPluginData(instance, COMPONENT_VARIANT_KEY, component.name || `Role=${role}`);

  if (typeof instance.resizeWithoutConstraints === "function") {
    instance.resizeWithoutConstraints(clampSize(node.width), clampSize(node.height));
  }
  await applyInstanceTextOverrides(instance, node);
  applyInstanceIconOverride(instance, node, componentMapping, context);

  const populated = node.children.length > 0
    ? await populateSlotWithRuntimeStrategy(instance, node, serverUrl, context, componentMapping)
    : instance;
  setPluginData(populated, COMPONENT_ROLE_KEY, role);
  setPluginData(populated, COMPONENT_VARIANT_KEY, component.name || `Role=${role}`);
  finalizeFrameOwnSizing(populated, node.width, node.height, node.sizingW, node.sizingH);
  return populated;
}

async function buildDiagramFrameNode(
  node: DiagramNodePayload,
  serverUrl: string,
  context: ImportBuildContext,
  componentMapping: ComponentMapping | null = null,
) {
  if (componentMapping && node.kind !== "root") {
    return buildComponentMappedNode(node, serverUrl, context, componentMapping);
  }

  return node.isLeaf
    ? buildLeafNode(node, serverUrl, context)
    : buildContainerNode(node, serverUrl, context, componentMapping);
}

async function upsertSampleLeaf(serverUrl: string) {
  const payload = await fetchJson<SampleLeafPayload>(`${serverUrl}/api/sample-leaf`);
  const leaf = payload.leaf;
  if (!leaf) {
    throw new Error("Sample payload did not include a leaf object.");
  }

  const existing = findExistingImportedLeaf(leaf.id);
  const frame = existing ?? figma.createFrame();
  const priorX = existing ? existing.x : null;
  const priorY = existing ? existing.y : null;
  frame.name = leaf.name || "Sample leaf";
  configureAutoLayoutFrame(frame, "HORIZONTAL", 0);
  frame.primaryAxisAlignItems = "SPACE_BETWEEN";
  frame.counterAxisAlignItems = "MIN";
  applyPadding(frame, leaf.padding);
  frame.minHeight = clampSize(leaf.minHeight);
  applyFrameStyle(frame, "transparent", leaf.stroke, 1);
  applyFrameOwnSizing(frame, "HORIZONTAL", leaf.width, leaf.minHeight, "FIXED", "HUG");
  setImportData(frame, leaf.id, "leaf");
  clearChildren(frame);

  const textNode = await createLeafText(leaf.text);
  const iconNode = await createLeafIcon(leaf.icon, serverUrl);
  setImportData(textNode, `${leaf.id}:label`, "leaf-label");
  setImportData(iconNode, `${leaf.id}:icon`, "leaf-icon");

  appendAutoLayoutChild(frame, textNode, "FIXED", "HUG");
  appendAutoLayoutChild(frame, iconNode, "FIXED", "FIXED");
  finalizeFrameOwnSizing(frame, leaf.width, leaf.minHeight, "FIXED", "HUG");
  if (!existing) {
    figma.currentPage.appendChild(frame);
  }

  if (priorX != null && priorY != null) {
    frame.x = priorX;
    frame.y = priorY;
  } else {
    const center = figma.viewport.center;
    frame.x = Math.round(center.x - leaf.width / 2);
    frame.y = Math.round(center.y - Math.max(frame.height, leaf.minHeight) / 2);
  }

  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);
  return {
    id: leaf.id,
    name: frame.name,
    width: frame.width,
    height: frame.height,
    refreshed: Boolean(existing),
  };
}

async function upsertFrameDiagramPayload(
  payload: FrameDiagramPayload,
  serverUrl: string,
  importId = `frame-diagram:${payload.slug}`,
) {
  if (!payload.root) {
    throw new Error("Diagram payload did not include a root node.");
  }

  const existing = findExistingImportedDiagram(importId);
  const priorX = existing ? existing.x : null;
  const priorY = existing ? existing.y : null;
  const buildContext = createImportBuildContext();
  const componentMapping = resolveComponentMapping();

  try {
    const frame = await buildContainerNode(payload.root, serverUrl, buildContext, componentMapping);
    if (componentMapping && buildContext.missingIconNames.size > 0) {
      throw new Error(
        "Missing Figma icon components for YAML icons: "
        + [...buildContext.missingIconNames].sort().join(", ")
        + ". Import the Brand icons library into this file or configure icon component keys before component-mode import.",
      );
    }
    const sizingVerifiedCount = validateImportedDiagramSizing(frame, payload.root);
    const componentVerifiedCount = componentMapping
      ? validateImportedComponentStructure(frame, payload.root)
      : 0;
    frame.name = payload.title || payload.slug;
    setImportData(frame, importId, "diagram-root");
    figma.currentPage.appendChild(frame);

    if (existing) {
      existing.remove();
    }

    if (priorX != null && priorY != null) {
      frame.x = priorX;
      frame.y = priorY;
    } else {
      const center = figma.viewport.center;
      frame.x = Math.round(center.x - payload.root.width / 2);
      frame.y = Math.round(center.y - Math.max(frame.height, payload.root.height) / 2);
    }

    figma.currentPage.selection = [frame];
    figma.viewport.scrollAndZoomIntoView([frame]);
    return {
      slug: payload.slug,
      title: frame.name,
      width: frame.width,
      height: frame.height,
      childCount: frame.children.length,
      descendantCount: countImportedSubtreeNodes(frame),
      sizingVerifiedCount,
      componentVerifiedCount,
      componentMode: componentMapping ? BOX_COMPONENT_SET_NAME : "generic-frame",
      componentInstanceCount: buildContext.componentInstanceCount,
      instanceSlotCount: buildContext.instanceSlotCount,
      detachedSlotCount: buildContext.detachedSlotCount,
      refreshed: Boolean(existing),
    };
  } catch (error) {
    cleanupCreatedNodes(buildContext);
    throw error;
  }
}

async function upsertFrameDiagram(serverUrl: string, slug: string) {
  const payload = await fetchJson<FrameDiagramPayload>(
    `${serverUrl}/api/frame-diagram?slug=${encodeURIComponent(slug)}`,
  );
  return upsertFrameDiagramPayload(payload, serverUrl);
}

async function upsertYamlDiagram(serverUrl: string, yamlText: string, sourceName: string) {
  if (!String(yamlText || "").trim()) {
    throw new Error("Selected YAML file is empty.");
  }

  const payload = await fetchJson<FrameDiagramPayload>(
    `${serverUrl}/api/frame-diagram-yaml`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        yaml: yamlText,
        sourceName: sourceName || "selected.yaml",
      }),
    },
  );
  return upsertFrameDiagramPayload(payload, serverUrl, `frame-diagram-yaml:${payload.slug}`);
}

function reportError(error: unknown) {
  const text = formatErrorMessage(error);
  console.error(error);
  try {
    figma.notify(text, { timeout: 6000 });
  } catch (_notifyError) {
    // Ignore notification failures in test and headless contexts.
  }
  figma.ui.postMessage({ type: "error", text });
}

if ((globalThis as any).__DGP_EXPOSE_TESTABLES__) {
  (globalThis as any).__DGP_TESTABLES__ = {
    buildContainerNode,
    cleanupCreatedNodes,
    countImportedSubtreeNodes,
    createImportBuildContext,
    reportError,
    resolveComponentMapping,
    upsertFrameDiagram,
    upsertYamlDiagram,
    validateImportedComponentStructure,
    validateImportedDiagramSizing,
    formatErrorMessage,
  };
}

figma.showUI(__html__, { width: 380, height: 320 });

async function runSampleImport(serverUrl: string) {
  figma.ui.postMessage({ type: "status", text: "Fetching sample payload..." });
  const result = await upsertSampleLeaf(serverUrl);
  figma.ui.postMessage({
    type: "done",
    text: `${result.refreshed ? "Refreshed" : "Inserted"} ${result.name} (${Math.round(result.width)}x${Math.round(result.height)})`,
  });
}

async function runDiagramImport(serverUrl: string, slug: string) {
  figma.ui.postMessage({ type: "status", text: `Fetching diagram payload for ${slug}...` });
  const result = await upsertFrameDiagram(serverUrl, slug);
  figma.ui.postMessage({
    type: "done",
    text: `${result.refreshed ? "Refreshed" : "Inserted"} ${result.title} (${Math.round(result.width)}x${Math.round(result.height)}), root children: ${result.childCount}, imported nodes: ${result.descendantCount}, sizing verified: ${result.sizingVerifiedCount}, component verified: ${result.componentVerifiedCount}, mode: ${result.componentMode}, components: ${result.componentInstanceCount}, instance slots: ${result.instanceSlotCount}, detached slots: ${result.detachedSlotCount}`,
  });
}

async function runYamlImport(serverUrl: string, yamlText: string, sourceName: string) {
  figma.ui.postMessage({ type: "status", text: `Importing ${sourceName || "selected YAML"}...` });
  const result = await upsertYamlDiagram(serverUrl, yamlText, sourceName);
  figma.ui.postMessage({
    type: "done",
    text: `${result.refreshed ? "Refreshed" : "Inserted"} ${result.title} (${Math.round(result.width)}x${Math.round(result.height)}), root children: ${result.childCount}, imported nodes: ${result.descendantCount}, sizing verified: ${result.sizingVerifiedCount}, component verified: ${result.componentVerifiedCount}, mode: ${result.componentMode}, components: ${result.componentInstanceCount}, instance slots: ${result.instanceSlotCount}, detached slots: ${result.detachedSlotCount}`,
  });
}

if (figma.command === "insert-sample-leaf") {
  runSampleImport(DEFAULT_SERVER_URL).catch(reportError);
}

if (figma.command === "import-telecom-diagram") {
  runDiagramImport(DEFAULT_SERVER_URL, DEFAULT_DIAGRAM_SLUG).catch(reportError);
}

figma.ui.onmessage = async (message: any) => {
  if (!message || typeof message !== "object") {
    return;
  }

  if (message.type === "insert-sample-leaf") {
    try {
      await runSampleImport(getServerUrl(message.serverUrl));
    } catch (error) {
      reportError(error);
    }
    return;
  }

  if (message.type === "import-diagram") {
    try {
      await runDiagramImport(getServerUrl(message.serverUrl), getDiagramSlug(message.slug));
    } catch (error) {
      reportError(error);
    }
    return;
  }

  if (message.type === "import-yaml") {
    try {
      await runYamlImport(
        getServerUrl(message.serverUrl),
        typeof message.yaml === "string" ? message.yaml : "",
        typeof message.sourceName === "string" ? message.sourceName : "selected.yaml",
      );
    } catch (error) {
      reportError(error);
    }
    return;
  }

  if (message.type === "close") {
    figma.closePlugin();
  }
};
