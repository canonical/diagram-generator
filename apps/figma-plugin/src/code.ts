const DEFAULT_SERVER_URL = "http://localhost:3846";
const DEFAULT_DIAGRAM_SLUG = "ai-infra-telecom-services-stack";
const DEFAULT_FONT = { family: "Ubuntu Sans", style: "Regular" };
const DEFAULT_BOLD_FONT = { family: "Ubuntu Sans", style: "Bold" };
const FALLBACK_FONT = { family: "Inter", style: "Regular" };
const FALLBACK_BOLD_FONT = { family: "Inter", style: "Bold" };
const PLUGIN_NAMESPACE = "dgp";
const IMPORT_ID_KEY = "importId";
const IMPORT_KIND_KEY = "importKind";
const fontLoadCache = new Map<string, Promise<{ family: string; style: string }>>();

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
  padding: BoxPadding;
  fill: string;
  stroke: string;
  strokeWidth: number;
  textFill: string;
  iconFill: string;
  icon: DiagramIconPayload | null;
  leafTextWidth: number;
  textBlocks: DiagramTextBlockPayload[];
  children: DiagramNodePayload[];
}

interface FrameDiagramPayload {
  slug: string;
  title: string;
  root: DiagramNodePayload;
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

function isVisibleColor(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized !== "" && normalized !== "none" && normalized !== "transparent";
}

function clampSize(value: number) {
  return Math.max(1, Math.round(Number.isFinite(value) ? value : 1));
}

function setNodeSizing(node: any, horizontal: "FIXED" | "HUG" | "FILL", vertical: "FIXED" | "HUG" | "FILL") {
  node.layoutSizingHorizontal = horizontal;
  node.layoutSizingVertical = vertical;
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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
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

function clearChildren(frame: any) {
  const children = [...frame.children];
  for (const child of children) {
    child.remove();
  }
}

function createSpacer(name: string, width: number, height: number) {
  const spacer = figma.createFrame();
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
  width: number,
  spacing: number,
) {
  frame.layoutMode = direction;
  frame.layoutWrap = "NO_WRAP";
  frame.primaryAxisAlignItems = "MIN";
  frame.counterAxisAlignItems = "MIN";
  frame.itemSpacing = Math.max(0, Math.round(spacing));
  frame.clipsContent = false;
  frame.resizeWithoutConstraints(clampSize(width), clampSize(frame.height || 1));

  if (direction === "HORIZONTAL") {
    frame.primaryAxisSizingMode = "FIXED";
    frame.counterAxisSizingMode = "AUTO";
  } else {
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "FIXED";
  }
}

function applyPadding(frame: any, padding: BoxPadding) {
  frame.paddingTop = padding.top;
  frame.paddingRight = padding.right;
  frame.paddingBottom = padding.bottom;
  frame.paddingLeft = padding.left;
}

async function createTextLineNode(line: DiagramTextLinePayload, width: number, name: string) {
  const textNode = figma.createText();
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
}

async function createTextBlocksFrame(
  blocks: DiagramTextBlockPayload[],
  width: number,
  nodeId: string,
  fallbackFill: string,
) {
  const stack = figma.createFrame();
  stack.name = `${nodeId}/text`;
  stack.fills = [];
  stack.strokes = [];
  configureAutoLayoutFrame(stack, "VERTICAL", width, 0);
  setNodeSizing(stack, "FIXED", "HUG");

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const block = blocks[blockIndex]!;
    const blockFrame = figma.createFrame();
    blockFrame.name = `${nodeId}/block-${blockIndex + 1}`;
    blockFrame.fills = [];
    blockFrame.strokes = [];
    configureAutoLayoutFrame(blockFrame, "VERTICAL", width, 0);
    setNodeSizing(blockFrame, "FIXED", "HUG");

    for (let lineIndex = 0; lineIndex < block.lines.length; lineIndex += 1) {
      const line = block.lines[lineIndex]!;
      const textNode = await createTextLineNode(
        { ...line, fill: line.fill || fallbackFill },
        width,
        `${nodeId}/${block.role}-${lineIndex + 1}`,
      );
      setImportData(textNode, `${nodeId}:text:${blockIndex}:${lineIndex}`, "text-line");
      blockFrame.appendChild(textNode);
    }

    stack.appendChild(blockFrame);
    setImportData(blockFrame, `${nodeId}:text-block:${blockIndex}`, `text-block:${block.role}`);

    if (block.gapAfter > 0 && blockIndex < blocks.length - 1) {
      stack.appendChild(createSpacer(`${nodeId}/gap-${blockIndex + 1}`, 1, block.gapAfter));
    }
  }

  return stack;
}

async function createLeafText(payload: SampleLeafPayload["leaf"]["text"]) {
  const textNode = figma.createText();
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
}

async function createLeafIcon(
  payload: SampleLeafPayload["leaf"]["icon"] | DiagramIconPayload,
  serverUrl: string,
  fillHex?: string,
) {
  const iconUrl = `${serverUrl}${payload.path}`;
  const svgText = await fetchText(iconUrl);
  const iconNode = figma.createNodeFromSvg(svgText);
  iconNode.name = payload.name;
  iconNode.resizeWithoutConstraints(payload.size, payload.size);
  setNodeSizing(iconNode, "FIXED", "FIXED");
  if (fillHex) {
    tintSvgNode(iconNode, fillHex);
  }
  return iconNode;
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

async function buildLeafNode(node: DiagramNodePayload, serverUrl: string) {
  const frame = figma.createFrame();
  frame.name = node.name || node.id;
  applyFrameStyle(frame, node.fill, node.stroke, node.strokeWidth);
  applyPadding(frame, node.padding);
  setImportData(frame, node.id, node.kind);

  const innerWidth = Math.max(1, node.width - node.padding.left - node.padding.right);
  const hasText = node.textBlocks.length > 0;
  const icon = node.icon;

  if (icon) {
    configureAutoLayoutFrame(frame, "HORIZONTAL", node.width, 0);
    frame.primaryAxisAlignItems = "SPACE_BETWEEN";
    frame.counterAxisAlignItems = "MIN";
    frame.minHeight = clampSize(node.height);
    setNodeSizing(frame, "FIXED", "HUG");

    const textWidth = Math.max(1, Math.min(innerWidth, node.leafTextWidth || innerWidth));
    if (hasText) {
      const textStack = await createTextBlocksFrame(node.textBlocks, textWidth, node.id, node.textFill);
      setImportData(textStack, `${node.id}:text`, "text-stack");
      frame.appendChild(textStack);
    } else if (innerWidth > icon.size) {
      frame.appendChild(createSpacer(`${node.id}/push`, innerWidth - icon.size, 1));
    }

    const iconNode = await createLeafIcon(icon, serverUrl, node.iconFill);
    setImportData(iconNode, `${node.id}:icon`, "icon");
    frame.appendChild(iconNode);
    return frame;
  }

  configureAutoLayoutFrame(frame, "VERTICAL", node.width, node.bodyGap);
  frame.minHeight = clampSize(node.height);
  setNodeSizing(frame, "FIXED", "HUG");

  if (hasText) {
    const textStack = await createTextBlocksFrame(node.textBlocks, innerWidth, node.id, node.textFill);
    setImportData(textStack, `${node.id}:text`, "text-stack");
    frame.appendChild(textStack);
  }

  return frame;
}

async function buildContainerNode(node: DiagramNodePayload, serverUrl: string) {
  const frame = figma.createFrame();
  frame.name = node.name || node.id;
  applyFrameStyle(frame, node.fill, node.stroke, node.strokeWidth);
  applyPadding(frame, node.padding);
  setImportData(frame, node.id, node.kind);
  setNodeSizing(frame, "FIXED", "HUG");

  const innerWidth = Math.max(1, node.width - node.padding.left - node.padding.right);
  const hasHeader = node.textBlocks.length > 0;
  const hasChildren = node.children.length > 0;

  if (hasHeader) {
    configureAutoLayoutFrame(frame, "VERTICAL", node.width, node.headerGap);
    const textStack = await createTextBlocksFrame(node.textBlocks, innerWidth, node.id, node.textFill);
    setImportData(textStack, `${node.id}:header`, "text-stack");
    frame.appendChild(textStack);

    if (hasChildren) {
      const body = figma.createFrame();
      body.name = `${node.id}/body`;
      body.fills = [];
      body.strokes = [];
      configureAutoLayoutFrame(body, node.direction, innerWidth, node.bodyGap);
      setNodeSizing(body, "FIXED", "HUG");

      for (const child of node.children) {
        body.appendChild(await buildDiagramFrameNode(child, serverUrl));
      }

      setImportData(body, `${node.id}:body`, "container-body");
      frame.appendChild(body);
    }

    return frame;
  }

  configureAutoLayoutFrame(frame, node.direction, node.width, node.bodyGap);
  for (const child of node.children) {
    frame.appendChild(await buildDiagramFrameNode(child, serverUrl));
  }
  return frame;
}

async function buildDiagramFrameNode(node: DiagramNodePayload, serverUrl: string) {
  return node.isLeaf
    ? buildLeafNode(node, serverUrl)
    : buildContainerNode(node, serverUrl);
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
  configureAutoLayoutFrame(frame, "HORIZONTAL", leaf.width, 0);
  frame.primaryAxisAlignItems = "SPACE_BETWEEN";
  frame.counterAxisAlignItems = "MIN";
  applyPadding(frame, leaf.padding);
  frame.minHeight = clampSize(leaf.minHeight);
  applyFrameStyle(frame, "transparent", leaf.stroke, 1);
  setNodeSizing(frame, "FIXED", "HUG");
  setImportData(frame, leaf.id, "leaf");
  clearChildren(frame);

  const textNode = await createLeafText(leaf.text);
  const iconNode = await createLeafIcon(leaf.icon, serverUrl);
  setImportData(textNode, `${leaf.id}:label`, "leaf-label");
  setImportData(iconNode, `${leaf.id}:icon`, "leaf-icon");

  frame.appendChild(textNode);
  frame.appendChild(iconNode);
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

async function upsertFrameDiagram(serverUrl: string, slug: string) {
  const payload = await fetchJson<FrameDiagramPayload>(
    `${serverUrl}/api/frame-diagram?slug=${encodeURIComponent(slug)}`,
  );
  if (!payload.root) {
    throw new Error("Diagram payload did not include a root node.");
  }

  const importId = `frame-diagram:${payload.slug}`;
  const existing = findExistingImportedDiagram(importId);
  const priorX = existing ? existing.x : null;
  const priorY = existing ? existing.y : null;

  const frame = await buildContainerNode(payload.root, serverUrl);
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
    refreshed: Boolean(existing),
  };
}

function reportError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  figma.ui.postMessage({ type: "error", text });
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
    text: `${result.refreshed ? "Refreshed" : "Inserted"} ${result.title} (${Math.round(result.width)}x${Math.round(result.height)}), root children: ${result.childCount}`,
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

  if (message.type === "close") {
    figma.closePlugin();
  }
};
