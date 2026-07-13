const DEFAULT_SERVER_URL = "http://localhost:3846";
const IMPORTER_BUILD_ID = "079-semantic-boxes-only-20260713.6";
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
const ICON_SOURCE_MAX_DIMENSION = 128;
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
  importedNodeIds: Map<string, string>;
  importedNodes: Map<string, any>;
  importedGeometry: Map<string, ImportedGeometry>;
  componentInstanceCount: number;
  componentSetName: string | null;
  instanceSlotCount: number;
  missingIconNames: Set<string>;
  missingIconReasons: Map<string, Set<string>>;
}

type BoxRole = "Child" | "Parent" | "Section";

interface ComponentMapping {
  componentSet: any;
  roleComponents: Map<BoxRole, any>;
  roleContracts: Map<BoxRole, BoxComponentContract>;
  iconSources: Map<string, IconSource>;
  searchedPageCount: number;
}

interface BoxComponentContract {
  role: BoxRole;
  component: any;
  contentSlotMasterId: string | null;
  iconSlotMasterId: string | null;
  iconSlotHasDefaultContent: boolean;
  hasHelperTextLayer: boolean;
  titleTextMasterId: string | null;
  helperTextMasterId: string | null;
  titleTextProperty: string | null;
  helperTextProperty: string | null;
  helperVisibleProperty: string | null;
  iconVisibleProperty: string | null;
}

interface RoleContractUsage {
  titleNodeIds: string[];
  helperTextNodeIds: string[];
  helperDefaultHideNodeIds: string[];
  iconDefaultHideNodeIds: string[];
  iconNodeIds: string[];
}

interface IconSource {
  kind: "component" | "cloneable" | "instance";
  name: string;
  node: any;
}

interface SizingExpectation {
  importId: string;
  label: string;
  sizingW: "FIXED" | "HUG" | "FILL";
  sizingH: "FIXED" | "HUG" | "FILL";
}

interface ImportedGeometry {
  width: number;
  height: number;
  sizingW: "FIXED" | "HUG" | "FILL";
  sizingH: "FIXED" | "HUG" | "FILL";
}

interface IconOverrideResult {
  ok: boolean;
  reason: string;
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
    importedNodeIds: new Map<string, string>(),
    importedNodes: new Map<string, any>(),
    importedGeometry: new Map<string, ImportedGeometry>(),
    componentInstanceCount: 0,
    componentSetName: null,
    instanceSlotCount: 0,
    missingIconNames: new Set<string>(),
    missingIconReasons: new Map<string, Set<string>>(),
  };
}

function registerImportedGeometry(
  context: ImportBuildContext | null | undefined,
  importId: string,
  width: number,
  height: number,
  sizingW: "FIXED" | "HUG" | "FILL",
  sizingH: "FIXED" | "HUG" | "FILL",
) {
  context?.importedGeometry.set(importId, {
    width: clampSize(width),
    height: clampSize(height),
    sizingW: normalizeSizing(sizingW),
    sizingH: normalizeSizing(sizingH),
  });
}

function trackCreatedNode<T>(context: ImportBuildContext | null | undefined, node: T) {
  context?.createdNodes.add(node);
  return node;
}

function trackImportedNode(
  context: ImportBuildContext | null | undefined,
  node: any,
  importId: string,
) {
  context?.importedNodes.set(importId, node);
  const nodeId = safeGetNodeId(node);
  if (nodeId) {
    context?.importedNodeIds.set(importId, nodeId);
  }
  return node;
}

/**
 * Figma can assign a new id when a generated node is reparented into a live
 * instance SlotNode. Keep its direct handle for the current import transaction:
 * slot descendants are not always globally addressable by their returned id.
 */
function refreshImportedNodeIds(context: ImportBuildContext) {
  for (const [importId, node] of context.importedNodes) {
    trackImportedNode(context, node, importId);
  }
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

  const parent = safeGetParent(frame);
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
  context?: ImportBuildContext,
) {
  parent.appendChild(child);
  applyChildLayoutSizing(child, sizingW, sizingH);
  applyChildPositioning(child, positionType, x, y);
  const importId = getImportData(child, IMPORT_ID_KEY);
  if (importId) {
    const geometry = context?.importedGeometry.get(importId);
    if (geometry) {
      // Figma may recalculate a mapped instance when it crosses into an
      // auto-layout parent. Restore only effective FIXED axes from V3; Hug
      // remains owned by the component/slot content.
      resizeFrameForFixedAxes(
        child,
        geometry.width,
        geometry.height,
        geometry.sizingW,
        geometry.sizingH,
      );
    }
    trackImportedNode(context, child, importId);
  }
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
  try {
    if (!isNodeAvailable(node) || typeof node.getSharedPluginData !== "function") {
      return "";
    }
    return node.getSharedPluginData(PLUGIN_NAMESPACE, key);
  } catch (_error) {
    return "";
  }
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
    try {
      const parent = safeGetParent(node);
      if (parent && trackedSet.has(parent)) {
        continue;
      }
      safeRemoveNode(node);
    } catch (_error) {
      // Cleanup must never mask the original import failure.
    }
  }
}

function clearChildren(frame: any) {
  const children = safeGetChildren(frame);
  for (const child of children) {
    safeRemoveNode(child);
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
  return findImportedNode(figma.currentPage, importId, "leaf", "FRAME");
}

function findExistingImportedDiagram(importId: string) {
  for (const node of safeGetChildren(figma.currentPage)) {
    if (
      getImportData(node, IMPORT_ID_KEY) === importId
      && getImportData(node, IMPORT_KIND_KEY) === "diagram-root"
      && safeGetNodeType(node) === "FRAME"
    ) {
      return node;
    }
  }
  return null;
}

function countImportedSubtreeNodes(root: any, context?: ImportBuildContext | null) {
  return collectImportedNodes(root, context).length;
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

function getImportIndexChildren(node: any) {
  if (safeGetNodeType(node) === "INSTANCE") {
    return [];
  }
  return safeGetChildren(node);
}

function collectImportedNodes(root: any, context?: ImportBuildContext | null) {
  const nodes: any[] = [];
  const seen = new Set<any>();
  const addNode = (node: any) => {
    if (!isNodeAvailable(node) || seen.has(node)) {
      return;
    }
    seen.add(node);
    if (getImportData(node, IMPORT_ID_KEY)) {
      nodes.push(node);
    }
  };
  const visit = (node: any) => {
    addNode(node);
    for (const child of getImportIndexChildren(node)) {
      visit(child);
    }
  };
  visit(root);
  for (const node of context?.createdNodes ?? []) {
    addNode(node);
  }
  return nodes;
}

async function collectImportedNodesById(root: any, context?: ImportBuildContext | null) {
  const nodes = new Map<string, any>();
  for (const node of collectImportedNodes(root, context)) {
    nodes.set(getImportData(node, IMPORT_ID_KEY), node);
  }
  for (const [importId, nodeId] of context?.importedNodeIds ?? []) {
    const freshNode = await getNodeById(nodeId);
    if (freshNode && getImportData(freshNode, IMPORT_ID_KEY) === importId) {
      nodes.set(importId, freshNode);
    }
  }
  // A node placed in a live instance SlotNode can remain a valid direct handle
  // while Figma declines to resolve its document id with getNodeByIdAsync.
  // This is transaction-scoped readback only, never instance-tree traversal.
  for (const [importId, node] of context?.importedNodes ?? []) {
    if (isNodeAvailable(node)) {
      nodes.set(importId, node);
    }
  }
  return nodes;
}

function isOpaqueLiveSlotImport(context: ImportBuildContext | null | undefined, importId: string) {
  return Boolean(
    context?.importedNodes.has(importId)
    || context?.importedNodeIds.has(importId),
  );
}

function findImportedNode(root: any, importId: string, importKind: string, type?: string) {
  for (const node of collectImportedNodes(root)) {
    if (
      getImportData(node, IMPORT_ID_KEY) === importId
      && getImportData(node, IMPORT_KIND_KEY) === importKind
      && (!type || safeGetNodeType(node) === type)
    ) {
      return node;
    }
  }
  return null;
}

async function validateImportedDiagramSizing(
  rootFrame: any,
  payloadRoot: DiagramNodePayload,
  context?: ImportBuildContext | null,
) {
  const nodesById = await collectImportedNodesById(rootFrame, context);
  const mismatches: string[] = [];
  let checked = 0;

  for (const expected of collectPayloadSizingExpectations(payloadRoot)) {
    const node = nodesById.get(expected.importId);
    if (!node) {
      // Figma may make an already-inserted live-slot descendant opaque to both
      // global lookup and its pre-insertion handle. Its sizing was applied
      // before insertion and the enclosing SlotNode was checked for limits, so
      // do not roll back a valid diagram solely because post-build readback is
      // unavailable. Unknown nodes still fail the import below.
      if (isOpaqueLiveSlotImport(context, expected.importId)) {
        continue;
      }
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

async function validateImportedComponentStructure(
  rootFrame: any,
  payloadRoot: DiagramNodePayload,
  context?: ImportBuildContext | null,
) {
  const nodesById = await collectImportedNodesById(rootFrame, context);
  const mismatches: string[] = [];
  let checked = 0;

  const visit = (node: DiagramNodePayload) => {
    if (isMappedComponentNode(node)) {
      const imported = nodesById.get(node.id);
      const expectedRole = componentRoleForNode(node);
      if (!imported) {
        if (!isOpaqueLiveSlotImport(context, node.id)) {
          mismatches.push(`${node.id}: missing component import`);
        }
      } else {
        checked += 1;
        const importKind = getImportData(imported, IMPORT_KIND_KEY);
        const role = getImportData(imported, COMPONENT_ROLE_KEY);
        const variantName = getImportData(imported, COMPONENT_VARIANT_KEY)
          || imported.mainComponent?.name
          || "";
        const variantRole = parseVariantRole(variantName);
        if (!String(importKind).startsWith("component:")) {
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

    if (isMappedComponentNode(node) && node.children.length > 0) {
      const body = nodesById.get(`${node.id}:body`);
      if (!body) {
        if (!isOpaqueLiveSlotImport(context, `${node.id}:body`)) {
          mismatches.push(`${node.id}/body: missing component slot body`);
        }
      } else {
        checked += 1;
        const strategy = getImportData(body, SLOT_STRATEGY_KEY);
        if (strategy !== "instance-slot") {
          mismatches.push(`${node.id}/body: missing slot strategy`);
        }
        if (body.layoutMode !== node.direction) {
          mismatches.push(`${node.id}/body: expected ${node.direction} layout, got ${body.layoutMode}`);
        }
        const childIds = safeGetChildren(body)
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

function isNodeAvailable(node: any) {
  if (!node) {
    return false;
  }
  try {
    return node.removed !== true;
  } catch (_error) {
    return false;
  }
}

function safeGetNodeType(node: any) {
  try {
    return String(node?.type || "");
  } catch (_error) {
    return "";
  }
}

function safeGetNodeName(node: any) {
  try {
    return String(node?.name || "");
  } catch (_error) {
    return "";
  }
}

function safeGetNodeId(node: any) {
  try {
    return String(node?.id || "");
  } catch (_error) {
    return "";
  }
}

function safeGetChildren(node: any) {
  try {
    if (!isNodeAvailable(node)) {
      return [];
    }
    return [...(node.children ?? [])];
  } catch (_error) {
    return [];
  }
}

function safeGetParent(node: any) {
  try {
    if (!isNodeAvailable(node)) {
      return null;
    }
    const parent = node.parent ?? null;
    return isNodeAvailable(parent) ? parent : null;
  } catch (_error) {
    return null;
  }
}

function safeReadNumber(node: any, key: string) {
  try {
    if (!isNodeAvailable(node)) {
      return null;
    }
    const value = Number(node?.[key]);
    return Number.isFinite(value) ? value : null;
  } catch (_error) {
    return null;
  }
}

function hasNodeMethod(node: any, methodName: string) {
  try {
    return typeof node?.[methodName] === "function";
  } catch (_error) {
    return false;
  }
}

async function getNodeById(id: string) {
  try {
    if (typeof figma.getNodeByIdAsync === "function") {
      return await figma.getNodeByIdAsync(id);
    }
    if (typeof figma.getNodeById === "function") {
      return figma.getNodeById(id);
    }
  } catch (_error) {
    return null;
  }
  return null;
}

function visitSceneTree(root: any, visitor: (node: any) => void | boolean) {
  if (!isNodeAvailable(root)) {
    return;
  }
  if (visitor(root) === false) {
    return;
  }
  for (const child of safeGetChildren(root)) {
    visitSceneTree(child, visitor);
  }
}

async function loadDocumentPagesForMapping() {
  if (typeof figma.loadAllPagesAsync === "function") {
    await figma.loadAllPagesAsync();
  }
}

function isDescendantOf(node: any, ancestor: any) {
  for (let current = safeGetParent(node); current; current = safeGetParent(current)) {
    if (current === ancestor) {
      return true;
    }
  }
  return false;
}

function findAncestorPage(node: any) {
  for (let current = node; current; current = safeGetParent(current)) {
    if (safeGetNodeType(current) === "PAGE") {
      return current;
    }
  }
  return null;
}

function hasImportedAncestor(node: any) {
  for (let current = node; current; current = safeGetParent(current)) {
    try {
      if (current.getSharedPluginData?.(PLUGIN_NAMESPACE, IMPORT_ID_KEY)) {
        return true;
      }
    } catch (_error) {
      // Some Figma node-like test doubles may not support plugin data.
    }
  }
  return false;
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
  const roots = new Set<any>();
  try {
    for (const node of figma.currentPage.selection ?? []) {
      if (isNodeAvailable(node)) {
        roots.add(node);
      }
    }
  } catch (_error) {
    // Selection can contain stale node handles after manual deletes.
  }
  if (isNodeAvailable(figma.currentPage)) {
    roots.add(figma.currentPage);
  }
  for (const page of safeGetChildren(figma.root)) {
    if (isNodeAvailable(page)) {
      roots.add(page);
    }
  }
  return [...roots];
}

function findBoxComponentSets() {
  const matches = new Set<any>();
  for (const root of collectCandidateRoots()) {
    visitSceneTree(root, (node) => {
      const nodeType = safeGetNodeType(node);
      if (
        nodeType === "COMPONENT_SET"
        && safeGetNodeName(node).trim() === BOX_COMPONENT_SET_NAME
        && safeGetChildren(node).length > 0
      ) {
        matches.add(node);
      }
      if (node !== root && nodeType === "INSTANCE") {
        return false;
      }
      return true;
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

function isCopiedIconInstanceSource(node: any) {
  if (safeGetNodeType(node) !== "INSTANCE") {
    return false;
  }
  const width = safeReadNumber(node, "width");
  const height = safeReadNumber(node, "height");
  if (width == null || height == null || width <= 0 || height <= 0) {
    return false;
  }
  const larger = Math.max(width, height);
  const smaller = Math.min(width, height);
  return larger <= ICON_SOURCE_MAX_DIMENSION && larger / smaller <= 1.5;
}

function noteMissingIcon(context: ImportBuildContext, iconName: string, reason: string) {
  context.missingIconNames.add(iconName);
  const reasons = context.missingIconReasons.get(iconName) ?? new Set<string>();
  reasons.add(reason);
  context.missingIconReasons.set(iconName, reasons);
}

function iconOverrideOk(): IconOverrideResult {
  return { ok: true, reason: "" };
}

function iconOverrideFailed(reason: string): IconOverrideResult {
  return { ok: false, reason };
}

function formatMissingIconReasonSummary(context: ImportBuildContext) {
  const entries = [...context.missingIconReasons.entries()];
  if (entries.length === 0) {
    return "";
  }
  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(0, 8)
    .map(([name, reasons]) => `${name}: ${[...reasons].join("; ")}`)
    .join(" | ");
}

function formatIconSourceSummary(mapping: ComponentMapping) {
  const sources = [...mapping.iconSources.values()]
    .map((source) => `${source.name} (${source.kind})`)
    .sort((left, right) => left.localeCompare(right));
  if (sources.length === 0) {
    return "no current-file icon sources discovered";
  }
  return `${sources.length} current-file icon sources discovered; sample: ${sources.slice(0, 16).join(", ")}`;
}

function normalizeLayerKey(name: string) {
  return String(name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function isHelperLayerName(name: string) {
  const normalized = normalizeLayerKey(name);
  return /\b(helper|support|description|body|subtitle|secondary)\b/.test(normalized);
}

function isIconLayerName(name: string) {
  const normalized = normalizeLayerKey(name);
  return /\b(icon|svg|network)\b/.test(normalized);
}

function safeGetComponentPropertyDefinitions(node: any) {
  try {
    const definitions = node?.componentPropertyDefinitions;
    return definitions && typeof definitions === "object" ? definitions : {};
  } catch (_error) {
    return {};
  }
}

function getComponentPropertyDefinitions(componentSet: any) {
  return safeGetComponentPropertyDefinitions(componentSet);
}

function getComponentPropertyReferences(node: any) {
  try {
    const references = node?.componentPropertyReferences;
    return references && typeof references === "object" ? references : {};
  } catch (_error) {
    return {};
  }
}

function getReferencedProperty(
  node: any,
  field: "characters" | "visible" | "mainComponent",
  definitions: Record<string, any>,
  expectedType: "TEXT" | "BOOLEAN" | "INSTANCE_SWAP",
) {
  const references = getComponentPropertyReferences(node);
  const propertyName = typeof references[field] === "string" ? references[field] : "";
  if (!propertyName) {
    return null;
  }
  const definitionType = String(definitions[propertyName]?.type || "").toUpperCase();
  return definitionType === expectedType ? propertyName : null;
}

function analyzeBoxComponentContract(
  componentSet: any,
  role: BoxRole,
  component: any,
): BoxComponentContract {
  const definitions = getComponentPropertyDefinitions(componentSet);
  const contentSlots: any[] = [];
  const iconSlots: any[] = [];
  let titleTextProperty: string | null = null;
  let helperTextProperty: string | null = null;
  let titleTextMasterId: string | null = null;
  let helperTextMasterId: string | null = null;
  let helperVisibleProperty: string | null = null;
  let iconVisibleProperty: string | null = null;
  let hasHelperTextLayer = false;

  visitSceneTree(component, (candidate) => {
    if (candidate === component) {
      return true;
    }

    const candidateName = safeGetNodeName(candidate);
    const candidateType = safeGetNodeType(candidate);
    const helperLayer = isHelperLayerName(candidateName);
    const iconLayer = isIconLayerName(candidateName);

    if (candidateType === "SLOT") {
      if (candidateName.trim().toLowerCase() === BOX_SLOT_LAYER_NAME) {
        contentSlots.push(candidate);
      } else {
        iconSlots.push(candidate);
      }
    }

    if (candidateType === "TEXT") {
      if (helperLayer) {
        hasHelperTextLayer = true;
        helperTextMasterId ||= safeGetNodeId(candidate) || null;
      } else {
        titleTextMasterId ||= safeGetNodeId(candidate) || null;
      }
    }

    const textProperty = getReferencedProperty(candidate, "characters", definitions, "TEXT");
    if (textProperty) {
      if (helperLayer && !helperTextProperty) {
        helperTextProperty = textProperty;
      } else if (!helperLayer && !titleTextProperty) {
        titleTextProperty = textProperty;
      }
    }

    const visibleProperty = getReferencedProperty(candidate, "visible", definitions, "BOOLEAN");
    if (visibleProperty) {
      if (helperLayer && !helperVisibleProperty) {
        helperVisibleProperty = visibleProperty;
      }
      if (iconLayer && !iconVisibleProperty) {
        iconVisibleProperty = visibleProperty;
      }
    }

    return true;
  });

  if (contentSlots.length > 1) {
    throw new Error(`Role=${role} box component has ${contentSlots.length} content SLOT nodes named "${BOX_SLOT_LAYER_NAME}"; expected at most one.`);
  }
  if (iconSlots.length > 1) {
    const names = iconSlots.map((slot) => safeGetNodeName(slot) || "unnamed").sort().join(", ");
    throw new Error(`Role=${role} box component has ${iconSlots.length} icon SLOT candidates (${names}); expected at most one.`);
  }

  const iconSlot = iconSlots[0] ?? null;
  return {
    role,
    component,
    contentSlotMasterId: contentSlots[0] ? safeGetNodeId(contentSlots[0]) : null,
    iconSlotMasterId: iconSlot ? safeGetNodeId(iconSlot) : null,
    iconSlotHasDefaultContent: Boolean(iconSlot && safeGetChildren(iconSlot).length > 0),
    hasHelperTextLayer,
    titleTextMasterId,
    helperTextMasterId,
    titleTextProperty,
    helperTextProperty,
    helperVisibleProperty,
    iconVisibleProperty,
  };
}

function getInstanceSublayerId(instance: any, masterNodeId: string) {
  const instanceId = safeGetNodeId(instance);
  if (!instanceId || !masterNodeId) {
    return null;
  }
  return `I${instanceId};${masterNodeId}`;
}

async function getInstanceSlotByMasterId(
  instance: any,
  masterSlotId: string | null,
  label: string,
  nodeId: string,
) {
  if (!masterSlotId) {
    return null;
  }
  const slotId = getInstanceSublayerId(instance, masterSlotId);
  if (!slotId) {
    throw new Error(`Mapped component instance for ${nodeId} cannot address its ${label}: missing stable instance/master node ids.`);
  }
  const slot = await getNodeById(slotId);
  if (!slot) {
    throw new Error(`Mapped component instance for ${nodeId} cannot address its ${label} by stable slot id ${slotId}; refusing to walk live instance sublayers.`);
  }
  assertSlotNode(slot, label, nodeId);
  return slot;
}

async function getInstanceTextByMasterId(
  instance: any,
  masterTextId: string | null,
  label: string,
  nodeId: string,
) {
  if (!masterTextId) {
    return null;
  }
  const textId = getInstanceSublayerId(instance, masterTextId);
  if (!textId) {
    throw new Error(`Mapped component instance for ${nodeId} cannot address its ${label}: missing stable instance/master node ids.`);
  }
  const text = await getNodeById(textId);
  if (!text) {
    throw new Error(`Mapped component instance for ${nodeId} cannot address its ${label} by stable text id ${textId}; refusing to walk live instance sublayers.`);
  }
  if (safeGetNodeType(text) !== "TEXT") {
    throw new Error(`Mapped component instance for ${nodeId} has a ${label} that is ${safeGetNodeType(text) || "unknown"}, not TEXT.`);
  }
  return text;
}

function collectIconSources(componentSet: any) {
  const icons = new Map<string, IconSource>();
  for (const root of collectCandidateRoots()) {
    visitSceneTree(root, (node) => {
      if (!node || node === componentSet || isDescendantOf(node, componentSet) || hasImportedAncestor(node)) {
        return true;
      }
      const name = safeGetNodeName(node);
      if (parseVariantRole(name)) {
        return true;
      }

      const normalized = normalizeIconName(name);
      if (!normalized || icons.has(normalized)) {
        return safeGetNodeType(node) !== "INSTANCE";
      }

      if (safeGetNodeType(node) === "COMPONENT" && hasNodeMethod(node, "createInstance")) {
        icons.set(normalized, {
          kind: "component",
          name,
          node,
        });
        return true;
      }

      if (isCopiedIconInstanceSource(node)) {
        icons.set(normalized, {
          kind: "instance",
          name,
          node,
        });
        return false;
      }

      if (/\.svg$/i.test(name) && hasNodeMethod(node, "clone")) {
        icons.set(normalized, {
          kind: "cloneable",
          name,
          node,
        });
      }
      return safeGetNodeType(node) !== "INSTANCE";
    });
  }
  return icons;
}

async function resolveComponentMapping(): Promise<ComponentMapping | null> {
  await loadDocumentPagesForMapping();
  const componentSets = findBoxComponentSets();
  if (componentSets.length > 1) {
    const names = componentSets
      .map((node) => {
        const page = findAncestorPage(node);
        const pageName = safeGetNodeName(page);
        const nodeName = safeGetNodeName(node) || BOX_COMPONENT_SET_NAME;
        return pageName ? `${pageName}/${nodeName}` : nodeName;
      })
      .sort()
      .join(", ");
    throw new Error(`Found ${componentSets.length} candidate "${BOX_COMPONENT_SET_NAME}" component sets (${names}); keep exactly one visible/selected for import.`);
  }
  const componentSet = componentSets[0];
  if (!componentSet) {
    return null;
  }

  const roleComponents = new Map<BoxRole, any>();
  for (const child of safeGetChildren(componentSet)) {
    const role = parseVariantRole(safeGetNodeName(child));
    if (role && safeGetNodeType(child) === "COMPONENT" && hasNodeMethod(child, "createInstance")) {
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

  const roleContracts = new Map<BoxRole, BoxComponentContract>();
  for (const role of [BOX_ROLE_VARIANTS.child, BOX_ROLE_VARIANTS.parent, BOX_ROLE_VARIANTS.section] as const) {
    const component = roleComponents.get(role)!;
    const contract = analyzeBoxComponentContract(componentSet, role, component);
    if ((role === BOX_ROLE_VARIANTS.parent || role === BOX_ROLE_VARIANTS.section) && !contract.contentSlotMasterId) {
      throw new Error(`Role=${role} box component must expose exactly one content SLOT named "${BOX_SLOT_LAYER_NAME}" for nested diagram children.`);
    }
    roleContracts.set(role, contract);
  }

  const pageCount = safeGetChildren(figma.root).length || 1;

  return {
    componentSet,
    roleComponents,
    roleContracts,
    iconSources: collectIconSources(componentSet),
    searchedPageCount: pageCount,
  };
}

function componentRoleForNode(node: DiagramNodePayload): BoxRole {
  if (node.kind === "section") {
    return BOX_ROLE_VARIANTS.section;
  }
  if (node.kind === "panel" || (!node.isLeaf && node.kind !== "root")) {
    return BOX_ROLE_VARIANTS.parent;
  }
  return BOX_ROLE_VARIANTS.child;
}

function isMappedComponentNode(node: DiagramNodePayload) {
  // V3 uses `container` for structural wrappers such as rows, stack groups,
  // and icon/label pairs. They are raw auto-layout frames, not semantic boxes.
  return node.kind !== "root" && node.kind !== "container";
}

function createRoleContractUsage(): RoleContractUsage {
  return {
    titleNodeIds: [],
    helperTextNodeIds: [],
    helperDefaultHideNodeIds: [],
    iconDefaultHideNodeIds: [],
    iconNodeIds: [],
  };
}

function getRoleContractUsage(usages: Map<BoxRole, RoleContractUsage>, role: BoxRole) {
  let usage = usages.get(role);
  if (!usage) {
    usage = createRoleContractUsage();
    usages.set(role, usage);
  }
  return usage;
}

function addUsageNodeId(nodeIds: string[], nodeId: string) {
  if (!nodeIds.includes(nodeId)) {
    nodeIds.push(nodeId);
  }
}

function visitDiagramPayloadTree(node: DiagramNodePayload, visitor: (node: DiagramNodePayload) => void) {
  visitor(node);
  for (const child of node.children ?? []) {
    visitDiagramPayloadTree(child, visitor);
  }
}

function formatPreflightNodeIds(nodeIds: string[]) {
  const unique = [...new Set(nodeIds.filter(Boolean))].sort((left, right) => left.localeCompare(right));
  if (unique.length === 0) {
    return "unknown node";
  }
  const sample = unique.slice(0, 5).join(", ");
  return unique.length > 5 ? `${sample}, +${unique.length - 5} more` : sample;
}

function addContractIssue(issues: string[], role: BoxRole, description: string, nodeIds: string[]) {
  if (nodeIds.length > 0) {
    issues.push(`Role=${role} needs ${description} for ${formatPreflightNodeIds(nodeIds)}`);
  }
}

function validateComponentMappingContractForPayload(root: DiagramNodePayload, mapping: ComponentMapping) {
  const usages = new Map<BoxRole, RoleContractUsage>();

  visitDiagramPayloadTree(root, (node) => {
    if (!isMappedComponentNode(node)) {
      return;
    }
    const role = componentRoleForNode(node);
    const usage = getRoleContractUsage(usages, role);
    const text = getPayloadTextValues(node);

    if (text.hasTitle) {
      addUsageNodeId(usage.titleNodeIds, node.id);
    }
    if (text.hasHelper) {
      addUsageNodeId(usage.helperTextNodeIds, node.id);
    } else {
      addUsageNodeId(usage.helperDefaultHideNodeIds, node.id);
    }
    if (node.icon) {
      addUsageNodeId(usage.iconNodeIds, node.id);
    } else {
      addUsageNodeId(usage.iconDefaultHideNodeIds, node.id);
    }
  });

  const issues: string[] = [];
  for (const [role, usage] of usages) {
    const contract = mapping.roleContracts.get(role);
    if (!contract) {
      addContractIssue(issues, role, "an analyzed component contract", [
        ...usage.titleNodeIds,
        ...usage.helperTextNodeIds,
        ...usage.helperDefaultHideNodeIds,
        ...usage.iconDefaultHideNodeIds,
        ...usage.iconNodeIds,
      ]);
      continue;
    }

    if (!contract.titleTextProperty && !contract.titleTextMasterId) {
      addContractIssue(issues, role, "title/text override target", usage.titleNodeIds);
    }
    if (!contract.helperTextProperty && !contract.helperTextMasterId) {
      addContractIssue(issues, role, "helper/body text override target", usage.helperTextNodeIds);
    }
    if (contract.hasHelperTextLayer && !contract.helperVisibleProperty && !contract.helperTextProperty && !contract.helperTextMasterId) {
      addContractIssue(issues, role, "helper text override target or helper visibility component property", usage.helperDefaultHideNodeIds);
    }
    if (contract.iconSlotHasDefaultContent && !contract.iconVisibleProperty && !contract.iconSlotMasterId) {
      addContractIssue(issues, role, "icon SLOT to clear the default icon", usage.iconDefaultHideNodeIds);
    }
    if (usage.iconNodeIds.length > 0 && !contract.iconSlotMasterId) {
      addContractIssue(issues, role, "icon SLOT", usage.iconNodeIds);
    }
  }

  if (issues.length > 0) {
    throw new Error(
      `Mapped box component contract is incomplete for this diagram: ${issues.join("; ")}. Refusing to edit live instance sublayers.`,
    );
  }
}

function isSlotNode(node: any) {
  return safeGetNodeType(node) === "SLOT";
}

function assertSlotNode(node: any, label: string, nodeId: string) {
  if (!isSlotNode(node)) {
    throw new Error(
      `Mapped component instance for ${nodeId} has a ${label} that is ${safeGetNodeType(node) || "unknown"}, not SLOT.`,
    );
  }
}

function clearSlotChildren(slot: any, label: string, nodeId: string) {
  assertSlotNode(slot, label, nodeId);
  clearChildren(slot);
}

function assertSlotLimits(slot: any, label: string, nodeId: string) {
  assertSlotNode(slot, label, nodeId);
  const violations = Array.isArray(slot.limitViolations) ? slot.limitViolations : [];
  if (violations.length > 0) {
    throw new Error(
      `Mapped component instance for ${nodeId} violates ${label} SlotNode limits: ${violations.join(", ")}.`,
    );
  }
}

function getPayloadTextValues(node: DiagramNodePayload) {
  const lines = node.textBlocks.flatMap((block) => block.lines);
  return {
    title: lines[0]?.text ?? "",
    helper: lines.slice(1).map((line) => line.text).filter(Boolean).join("\n"),
    hasTitle: lines.length > 0,
    hasHelper: lines.length > 1 && lines.slice(1).some((line) => String(line.text || "").trim() !== ""),
  };
}

function setInstanceProperties(instance: any, properties: Record<string, string | boolean>, nodeId: string) {
  const entries = Object.entries(properties);
  if (entries.length === 0) {
    return;
  }
  if (typeof instance.setProperties !== "function") {
    throw new Error(`Mapped component instance for ${nodeId} does not support setProperties(); refusing to edit live instance sublayers.`);
  }
  instance.setProperties(properties);
}

async function loadTextNodeFont(textNode: any) {
  const font = textNode?.fontName;
  if (
    font
    && typeof font === "object"
    && typeof font.family === "string"
    && typeof font.style === "string"
  ) {
    await loadFontCandidate(font);
  }
}

async function setInstanceTextOverride(
  instance: any,
  masterTextId: string | null,
  label: string,
  value: string,
  nodeId: string,
) {
  // Targeted, non-structural instance override: resolve from the master id,
  // never by walking live instance children.
  const textNode = await getInstanceTextByMasterId(instance, masterTextId, label, nodeId);
  if (!textNode) {
    throw new Error(
      `Mapped component Role text fallback for ${nodeId} has no stable ${label} target; refusing to walk live instance sublayers.`,
    );
  }
  try {
    await loadTextNodeFont(textNode);
    textNode.characters = value;
  } catch (error) {
    throw new Error(
      `Mapped component instance for ${nodeId} could not override its ${label} by stable text id. `
      + `Expose that text as a component property if this instance sublayer is not overrideable: ${formatErrorMessage(error)}`,
    );
  }
}

async function applyInstanceComponentProperties(
  instance: any,
  node: DiagramNodePayload,
  contract: BoxComponentContract,
) {
  const text = getPayloadTextValues(node);
  const properties: Record<string, string | boolean> = {};
  const textOverrides: Array<{ masterTextId: string | null; label: string; value: string }> = [];

  if (text.hasTitle) {
    if (contract.titleTextProperty) {
      properties[contract.titleTextProperty] = text.title || " ";
    } else {
      textOverrides.push({
        masterTextId: contract.titleTextMasterId,
        label: "title text",
        value: text.title || " ",
      });
    }
  }

  if (text.hasHelper) {
    if (contract.helperTextProperty) {
      properties[contract.helperTextProperty] = text.helper || " ";
    } else {
      textOverrides.push({
        masterTextId: contract.helperTextMasterId,
        label: "helper text",
        value: text.helper || " ",
      });
    }
    if (contract.helperVisibleProperty) {
      properties[contract.helperVisibleProperty] = true;
    }
  } else if (contract.hasHelperTextLayer) {
    if (contract.helperVisibleProperty) {
      properties[contract.helperVisibleProperty] = false;
    } else if (contract.helperTextProperty) {
      properties[contract.helperTextProperty] = "";
    } else if (contract.helperTextMasterId) {
      textOverrides.push({
        masterTextId: contract.helperTextMasterId,
        label: "helper text",
        value: "",
      });
    } else {
      throw new Error(
        `Mapped component Role=${contract.role} for ${node.id} has a default helper text layer but exposes no helper text or helper visibility component property.`,
      );
    }
  }

  if (node.icon) {
    if (contract.iconVisibleProperty) {
      properties[contract.iconVisibleProperty] = true;
    }
  } else if (contract.iconSlotHasDefaultContent) {
    if (contract.iconVisibleProperty) {
      properties[contract.iconVisibleProperty] = false;
    } else if (contract.iconSlotMasterId) {
      // applyInstanceIconOverride clears the real SlotNode after properties are
      // applied, so no visibility property is needed for this case.
    } else {
      throw new Error(
        `Mapped component Role=${contract.role} for ${node.id} has a default icon slot but exposes no icon visibility component property or icon SLOT.`,
      );
    }
  }

  setInstanceProperties(instance, properties, node.id);
  for (const override of textOverrides) {
    await setInstanceTextOverride(
      instance,
      override.masterTextId,
      override.label,
      override.value,
      node.id,
    );
  }
}

function instantiateIconSource(source: IconSource, context: ImportBuildContext) {
  if (source.kind === "component" && typeof source.node.createInstance === "function") {
    return trackCreatedNode(context, source.node.createInstance());
  }
  if ((source.kind === "cloneable" || source.kind === "instance") && typeof source.node.clone === "function") {
    return trackCreatedNode(context, source.node.clone());
  }
  return null;
}

async function applyInstanceIconOverride(
  instance: any,
  node: DiagramNodePayload,
  mapping: ComponentMapping,
  contract: BoxComponentContract,
  context: ImportBuildContext,
  recordMissing = true,
) {
  if (!node.icon) {
    if (!contract.iconSlotHasDefaultContent || contract.iconVisibleProperty) {
      return iconOverrideOk();
    }
    const slot = await getInstanceSlotByMasterId(instance, contract.iconSlotMasterId, "icon slot", node.id);
    if (!slot) {
      throw new Error(`Mapped component instance for ${node.id} has a default icon but no icon SLOT to clear.`);
    }
    try {
      clearSlotChildren(slot, "icon slot", node.id);
      assertSlotLimits(slot, "icon slot", node.id);
    } catch (error) {
      throw new Error(
        `Mapped component instance for ${node.id} could not clear its default icon SLOT: ${formatErrorMessage(error)}`,
      );
    }
    return iconOverrideOk();
  }

  const fail = (reason: string) => {
    if (recordMissing) {
      noteMissingIcon(context, node.icon!.name, reason);
    }
    return iconOverrideFailed(reason);
  };

  const key = normalizeIconName(node.icon.name);
  const source = mapping.iconSources.get(key);
  if (!source) {
    return fail(`no source matched key "${key}"`);
  }

  const slot = await getInstanceSlotByMasterId(instance, contract.iconSlotMasterId, "icon slot", node.id);
  if (!slot) {
    return fail(`no icon SLOT found in ${safeGetNodeName(instance) || node.id}`);
  }

  const replacement = instantiateIconSource(source, context);
  if (!replacement) {
    return fail(`source ${source.name} (${source.kind}) could not be instantiated`);
  }

  try {
    clearSlotChildren(slot, "icon slot", node.id);
    replacement.name = node.icon.name || source.name || safeGetNodeName(replacement) || "Icon";
    const iconSize = clampSize(node.icon.size || safeReadNumber(slot, "width") || 48);
    if (typeof replacement.resizeWithoutConstraints === "function") {
      replacement.resizeWithoutConstraints(iconSize, iconSize);
    } else if (typeof replacement.resize === "function") {
      replacement.resize(iconSize, iconSize);
    }
    slot.appendChild(replacement);
    applyChildLayoutSizing(replacement, "FIXED", "FIXED");
    replacement.x = 0;
    replacement.y = 0;
    setImportData(replacement, `${node.id}:icon`, "component-icon");
    assertSlotLimits(slot, "icon slot", node.id);
    return iconOverrideOk();
  } catch (error) {
    safeRemoveNode(replacement);
    logImportFallback(`Icon slot insertion failed for ${node.icon.name}`, error);
    return fail(`source ${source.name} (${source.kind}) could not be inserted into icon SLOT ${safeGetNodeName(slot) || "unnamed"}`);
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
            context,
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
          context,
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
      context,
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
  clearSlotChildren(slot, "content slot", node.id);

  const bodyWidth = Math.max(1, node.bodyWidth ?? node.width);
  const bodyHeight = Math.max(
    1,
    normalizeSizing(node.bodySizingH) === "FIXED"
      ? (node.bodyHeight ?? node.height)
      : (node.bodyHeight ?? 1),
  );
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
      context,
    );
  }

  setImportData(body, `${node.id}:body`, "component-slot-body");
  registerImportedGeometry(
    context,
    `${node.id}:body`,
    bodyWidth,
    bodyHeight,
    node.bodySizingW,
    node.bodySizingH,
  );
  finalizeFrameOwnSizing(body, bodyWidth, bodyHeight, node.bodySizingW, node.bodySizingH);
  appendAutoLayoutChild(slot, body, node.bodySizingW, node.bodySizingH, "AUTO", 0, 0, context);
  // Figma can re-key nodes when this body becomes content of a live instance
  // slot. Refresh only after the final structural insertion, then validate via
  // getNodeByIdAsync rather than walking instance sublayers.
  refreshImportedNodeIds(context);
  assertSlotLimits(slot, "content slot", node.id);
  return body;
}

async function populateSlotWithRuntimeStrategy(
  instance: any,
  node: DiagramNodePayload,
  serverUrl: string,
  context: ImportBuildContext,
  componentMapping: ComponentMapping,
  contract: BoxComponentContract,
) {
  const slot = await getInstanceSlotByMasterId(instance, contract.contentSlotMasterId, "content slot", node.id);
  if (!slot) {
    throw new Error(`Mapped component instance for ${node.id} does not contain a content SLOT named "${BOX_SLOT_LAYER_NAME}".`);
  }

  const body = await populateComponentSlot(slot, node, serverUrl, context, componentMapping);
  setPluginData(body, SLOT_STRATEGY_KEY, "instance-slot");
  context.instanceSlotCount += 1;
  return instance;
}

function markMappedComponentNode(
  target: any,
  node: DiagramNodePayload,
  role: BoxRole,
  variantName: string,
  importKind: string,
  context: ImportBuildContext,
) {
  setImportData(target, node.id, importKind);
  registerImportedGeometry(context, node.id, node.width, node.height, node.sizingW, node.sizingH);
  setPluginData(target, COMPONENT_ROLE_KEY, role);
  setPluginData(target, COMPONENT_VARIANT_KEY, variantName);
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
  const contract = componentMapping.roleContracts.get(role);
  if (!contract) {
    throw new Error(`No box component contract mapped for Role=${role}.`);
  }

  const variantName = component.name || `Role=${role}`;
  const instance = trackCreatedNode(context, component.createInstance());
  context.componentInstanceCount += 1;
  context.componentSetName = componentMapping.componentSet.name || BOX_COMPONENT_SET_NAME;
  instance.name = node.name || node.id;
  markMappedComponentNode(instance, node, role, variantName, `component:${node.kind}`, context);

  await applyInstanceComponentProperties(instance, node, contract);
  await applyInstanceIconOverride(instance, node, componentMapping, contract, context, true);

  const populated = node.children.length > 0
    ? await populateSlotWithRuntimeStrategy(instance, node, serverUrl, context, componentMapping, contract)
    : instance;
  setPluginData(populated, COMPONENT_ROLE_KEY, role);
  setPluginData(populated, COMPONENT_VARIANT_KEY, variantName);
  finalizeFrameOwnSizing(populated, node.width, node.height, node.sizingW, node.sizingH);
  return populated;
}

async function buildDiagramFrameNode(
  node: DiagramNodePayload,
  serverUrl: string,
  context: ImportBuildContext,
  componentMapping: ComponentMapping | null = null,
) {
  if (componentMapping && isMappedComponentNode(node)) {
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
  const priorX = existing ? safeReadNumber(existing, "x") : null;
  const priorY = existing ? safeReadNumber(existing, "y") : null;
  const buildContext = createImportBuildContext();
  const componentMapping = await resolveComponentMapping();
  if (componentMapping) {
    validateComponentMappingContractForPayload(payload.root, componentMapping);
  }

  try {
    const frame = await buildContainerNode(payload.root, serverUrl, buildContext, componentMapping);
    if (componentMapping && buildContext.missingIconNames.size > 0) {
      const reasonSummary = formatMissingIconReasonSummary(buildContext);
      throw new Error(
        "Missing or unapplied Figma icon sources for YAML icons: "
        + [...buildContext.missingIconNames].sort().join(", ")
        + `. ${formatIconSourceSummary(componentMapping)}.`
        + (reasonSummary ? ` Reasons: ${reasonSummary}.` : "")
        + " Copy matching icon components, icon-sized instances, or .svg-named cloneable icon nodes into this file, or configure icon component keys before component-mode import.",
      );
    }
    const sizingVerifiedCount = await validateImportedDiagramSizing(frame, payload.root, buildContext);
    const componentVerifiedCount = componentMapping
      ? await validateImportedComponentStructure(frame, payload.root, buildContext)
      : 0;
    frame.name = payload.title || payload.slug;
    setImportData(frame, importId, "diagram-root");
    figma.currentPage.appendChild(frame);

    if (existing) {
      safeRemoveNode(existing);
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
      childCount: safeGetChildren(frame).length,
      descendantCount: countImportedSubtreeNodes(frame, buildContext),
      sizingVerifiedCount,
      componentVerifiedCount,
      componentMode: componentMapping ? BOX_COMPONENT_SET_NAME : "generic-frame",
      componentInstanceCount: buildContext.componentInstanceCount,
      instanceSlotCount: buildContext.instanceSlotCount,
      componentSearchPageCount: componentMapping?.searchedPageCount ?? (safeGetChildren(figma.root).length || 1),
      iconSourceCount: componentMapping?.iconSources.size ?? 0,
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
  const text = `[${IMPORTER_BUILD_ID}] ${formatErrorMessage(error)}`;
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
    text: `[${IMPORTER_BUILD_ID}] ${result.refreshed ? "Refreshed" : "Inserted"} ${result.title} (${Math.round(result.width)}x${Math.round(result.height)}), root children: ${result.childCount}, imported nodes: ${result.descendantCount}, sizing verified: ${result.sizingVerifiedCount}, component verified: ${result.componentVerifiedCount}, mode: ${result.componentMode}, components: ${result.componentInstanceCount}, instance slots: ${result.instanceSlotCount}, searched pages: ${result.componentSearchPageCount}, icon sources: ${result.iconSourceCount}`,
  });
}

async function runYamlImport(serverUrl: string, yamlText: string, sourceName: string) {
  figma.ui.postMessage({ type: "status", text: `Importing ${sourceName || "selected YAML"}...` });
  const result = await upsertYamlDiagram(serverUrl, yamlText, sourceName);
  figma.ui.postMessage({
    type: "done",
    text: `[${IMPORTER_BUILD_ID}] ${result.refreshed ? "Refreshed" : "Inserted"} ${result.title} (${Math.round(result.width)}x${Math.round(result.height)}), root children: ${result.childCount}, imported nodes: ${result.descendantCount}, sizing verified: ${result.sizingVerifiedCount}, component verified: ${result.componentVerifiedCount}, mode: ${result.componentMode}, components: ${result.componentInstanceCount}, instance slots: ${result.instanceSlotCount}, searched pages: ${result.componentSearchPageCount}, icon sources: ${result.iconSourceCount}`,
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
