import test from "node:test";
import assert from "node:assert/strict";
import { createFrameDiagramPayload } from "./dev-server.js";

type PluginTestables = {
  buildContainerNode: (node: any, serverUrl: string, context: any, componentMapping?: any) => Promise<any>;
  cleanupCreatedNodes: (context: any) => void;
  createImportBuildContext: () => any;
  resolveComponentMapping: () => Promise<any>;
  upsertFrameDiagram: (serverUrl: string, slug: string) => Promise<any>;
  upsertYamlDiagram: (serverUrl: string, yamlText: string, sourceName: string) => Promise<any>;
  validateImportedComponentStructure: (rootFrame: any, payloadRoot: any) => number;
  validateImportedDiagramSizing: (rootFrame: any, payloadRoot: any) => number;
  formatErrorMessage: (error: unknown) => string;
};

class FakeSceneNode {
  type: string;
  private _name = "";
  width = 100;
  height = 100;
  x = 0;
  y = 0;
  fills: any[] = [];
  strokes: any[] = [];
  strokeWeight = 0;
  clipsContent = false;
  private _children: FakeSceneNode[] = [];
  private _parent: FakeSceneNode | null = null;
  removed = false;
  throwOnParentRead = false;
  throwOnNameRead = false;
  throwOnChildrenRead = false;
  layoutMode = "NONE";
  layoutWrap = "NO_WRAP";
  primaryAxisAlignItems = "MIN";
  counterAxisAlignItems = "MIN";
  primaryAxisSizingMode = "AUTO";
  counterAxisSizingMode = "AUTO";
  itemSpacing = 0;
  minHeight = 0;
  private _layoutSizingHorizontal = "FIXED";
  private _layoutSizingVertical = "FIXED";
  layoutPositioning = "AUTO";
  textAutoResize = "NONE";
  fontName: any = null;
  fontSize = 0;
  lineHeight: any = null;
  textAlignHorizontal = "LEFT";
  characters = "";
  selection: FakeSceneNode[] = [];
  constraints: { horizontal: string; vertical: string } | null = null;
  rejectChildMutation = false;
  instanceSublayer = false;
  mainComponent: FakeSceneNode | null = null;
  private readonly pluginData = new Map<string, Map<string, string>>();

  constructor(type: string) {
    this.type = type;
  }

  get name() {
    if (this.throwOnNameRead) {
      throw new Error(`in get_name: The node with id "${this._name || this.type}" does not exist`);
    }
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  get parent() {
    if (this.throwOnParentRead) {
      throw new Error(`in get_parent: The node with id "${this._name || this.type}" does not exist`);
    }
    return this._parent;
  }

  set parent(value: FakeSceneNode | null) {
    this._parent = value;
  }

  get children() {
    if (this.throwOnChildrenRead) {
      throw new Error(`in get_children: The node with id "${this._name || this.type}" does not exist`);
    }
    return this._children;
  }

  set children(value: FakeSceneNode[]) {
    this._children = value;
  }

  get layoutSizingHorizontal() {
    return this._layoutSizingHorizontal;
  }

  set layoutSizingHorizontal(value: string) {
    this.validateLayoutSizing("HORIZONTAL", value);
    this._layoutSizingHorizontal = value;
  }

  get layoutSizingVertical() {
    return this._layoutSizingVertical;
  }

  set layoutSizingVertical(value: string) {
    this.validateLayoutSizing("VERTICAL", value);
    this._layoutSizingVertical = value;
  }

  appendChild(child: FakeSceneNode) {
    if (this.rejectsChildMutation()) {
      throw new Error(`Child mutation rejected by ${this._name || this.type}`);
    }
    if (child.parent) {
      const index = child.parent.children.indexOf(child);
      if (index >= 0) {
        child.parent.children.splice(index, 1);
      }
    }
    child.parent = this;
    this.children.push(child);
    return child;
  }

  insertChild(index: number, child: FakeSceneNode) {
    if (this.rejectsChildMutation()) {
      throw new Error(`Child mutation rejected by ${this._name || this.type}`);
    }
    if (child.parent) {
      const currentIndex = child.parent.children.indexOf(child);
      if (currentIndex >= 0) {
        child.parent.children.splice(currentIndex, 1);
      }
    }
    child.parent = this;
    const boundedIndex = Math.max(0, Math.min(index, this.children.length));
    this.children.splice(boundedIndex, 0, child);
    return child;
  }

  remove() {
    if (!this.parent) {
      this.removed = true;
      return;
    }
    if (this.parent.rejectsChildMutation()) {
      throw new Error(`Child mutation rejected by ${this.parent._name || this.parent.type}`);
    }
    const index = this.parent.children.indexOf(this);
    if (index >= 0) {
      this.parent.children.splice(index, 1);
    }
    this.parent = null;
    this.removed = true;
  }

  findAll(predicate: (node: FakeSceneNode) => boolean) {
    const matches: FakeSceneNode[] = [];
    const visit = (node: FakeSceneNode) => {
      for (const child of node.children) {
        if (predicate(child)) {
          matches.push(child);
        }
        visit(child);
      }
    };
    visit(this);
    return matches;
  }

  resizeWithoutConstraints(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  createInstance() {
    if (this.type !== "COMPONENT") {
      throw new Error(`Cannot create instance from ${this.type}`);
    }
    const instance = this.cloneTree("INSTANCE");
    instance.name = this.name;
    instance.mainComponent = this;
    fakeFigma.currentPage.appendChild(instance);
    return instance;
  }

  clone() {
    return this.cloneTree();
  }

  detachInstance() {
    if (this.type !== "INSTANCE") {
      throw new Error(`Cannot detach ${this.type}`);
    }
    const detached = this.cloneTree("FRAME", false);
    detached.name = this.name;
    const parent = this.parent;
    if (parent) {
      const index = parent.children.indexOf(this);
      if (index >= 0) {
        parent.children[index] = detached;
        detached.parent = parent;
        this.parent = null;
      }
    } else {
      fakeFigma.currentPage.appendChild(detached);
    }
    this.invalidateRemovedSubtree();
    return detached;
  }

  async getMainComponentAsync() {
    return this.mainComponent;
  }

  private cloneTree(typeOverride?: string, preserveMutationLocks = true, instanceSublayer = false) {
    const clone = new FakeSceneNode(typeOverride || this.type);
    clone.name = this._name;
    clone.width = this.width;
    clone.height = this.height;
    clone.x = this.x;
    clone.y = this.y;
    clone.fills = [...this.fills];
    clone.strokes = [...this.strokes];
    clone.strokeWeight = this.strokeWeight;
    clone.clipsContent = this.clipsContent;
    clone.layoutMode = this.layoutMode;
    clone.layoutWrap = this.layoutWrap;
    clone.primaryAxisAlignItems = this.primaryAxisAlignItems;
    clone.counterAxisAlignItems = this.counterAxisAlignItems;
    clone.primaryAxisSizingMode = this.primaryAxisSizingMode;
    clone.counterAxisSizingMode = this.counterAxisSizingMode;
    clone.itemSpacing = this.itemSpacing;
    clone.minHeight = this.minHeight;
    clone._layoutSizingHorizontal = this._layoutSizingHorizontal;
    clone._layoutSizingVertical = this._layoutSizingVertical;
    clone.layoutPositioning = this.layoutPositioning;
    clone.textAutoResize = this.textAutoResize;
    clone.fontName = this.fontName;
    clone.fontSize = this.fontSize;
    clone.lineHeight = this.lineHeight;
    clone.textAlignHorizontal = this.textAlignHorizontal;
    clone.characters = this.characters;
    clone.constraints = this.constraints ? { ...this.constraints } : null;
    clone.mainComponent = this.mainComponent;
    clone.instanceSublayer = instanceSublayer;
    const cloneType = typeOverride || this.type;
    const childInstanceSublayer = instanceSublayer || cloneType === "INSTANCE";
    for (const child of this.children) {
      const childClone = child.cloneTree(undefined, preserveMutationLocks, childInstanceSublayer);
      childClone.parent = clone;
      clone.children.push(childClone);
    }
    clone.rejectChildMutation = preserveMutationLocks ? this.rejectChildMutation : false;
    return clone;
  }

  private rejectsChildMutation() {
    return this.rejectChildMutation || (this.instanceSublayer && this.type !== "SLOT");
  }

  private invalidateRemovedSubtree() {
    this.throwOnNameRead = true;
    this.throwOnParentRead = true;
    this.throwOnChildrenRead = true;
    for (const child of this._children) {
      child.invalidateRemovedSubtree();
    }
  }

  private validateLayoutSizing(axis: "HORIZONTAL" | "VERTICAL", value: string) {
    if (value === "HUG" && this.type !== "TEXT" && !this.isAutoLayoutFrame()) {
      throw new Error(`HUG is only valid on auto-layout frames and text nodes (${this._name || this.type})`);
    }
    if (value === "FILL") {
      if (!this.isAutoLayoutChild()) {
        throw new Error(`FILL is only valid on auto-layout children (${this._name || this.type})`);
      }
      const parent = this.parent!;
      const parentHugsAxis = axis === "HORIZONTAL"
        ? this.parentAxisSizingMode(parent, "HORIZONTAL") === "AUTO"
        : this.parentAxisSizingMode(parent, "VERTICAL") === "AUTO";
      if (parentHugsAxis) {
        throw new Error(`FILL is invalid when parent hugs ${axis.toLowerCase()} (${this._name || this.type})`);
      }
    }
    if (value !== "FIXED" && value !== "HUG" && value !== "FILL") {
      throw new Error(`Unsupported layout sizing value on ${axis}: ${value}`);
    }
  }

  private isAutoLayoutFrame() {
    return this.layoutMode === "HORIZONTAL" || this.layoutMode === "VERTICAL";
  }

  private isAutoLayoutChild() {
    const parent = this.parent;
    return Boolean(parent && (parent.layoutMode === "HORIZONTAL" || parent.layoutMode === "VERTICAL"));
  }

  private parentAxisSizingMode(parent: FakeSceneNode, axis: "HORIZONTAL" | "VERTICAL") {
    if (parent.layoutMode === "HORIZONTAL") {
      return axis === "HORIZONTAL" ? parent.primaryAxisSizingMode : parent.counterAxisSizingMode;
    }
    return axis === "VERTICAL" ? parent.primaryAxisSizingMode : parent.counterAxisSizingMode;
  }

  setSharedPluginData(namespace: string, key: string, value: string) {
    let bucket = this.pluginData.get(namespace);
    if (!bucket) {
      bucket = new Map<string, string>();
      this.pluginData.set(namespace, bucket);
    }
    bucket.set(key, value);
  }

  getSharedPluginData(namespace: string, key: string) {
    return this.pluginData.get(namespace)?.get(key) ?? "";
  }
}

class FakeFigma {
  root = new FakeSceneNode("DOCUMENT");
  currentPage = new FakeSceneNode("PAGE");
  viewport = {
    center: { x: 0, y: 0 },
    scrollAndZoomIntoView: (_nodes: FakeSceneNode[]) => {},
  };
  ui = {
    postMessage: (_message: unknown) => {},
    onmessage: null as ((message: unknown) => void | Promise<void>) | null,
  };
  command: string | undefined = undefined;
  notifications: Array<{ text: string; options: unknown }> = [];
  loadAllPagesAsyncCount = 0;

  reset() {
    this.root = new FakeSceneNode("DOCUMENT");
    this.currentPage = new FakeSceneNode("PAGE");
    this.currentPage.name = "Page 1";
    this.currentPage.selection = [];
    this.root.appendChild(this.currentPage);
    this.viewport.center = { x: 0, y: 0 };
    this.notifications = [];
    this.loadAllPagesAsyncCount = 0;
  }

  createPage(name: string) {
    const page = new FakeSceneNode("PAGE");
    page.name = name;
    this.root.appendChild(page);
    return page;
  }

  createFrame() {
    const node = new FakeSceneNode("FRAME");
    this.currentPage.appendChild(node);
    return node;
  }

  createText() {
    const node = new FakeSceneNode("TEXT");
    this.currentPage.appendChild(node);
    return node;
  }

  createNodeFromSvg(svgText: string) {
    if (svgText.includes("bad-svg")) {
      throw new Error("SVG parse failure");
    }
    const node = new FakeSceneNode("FRAME");
    this.currentPage.appendChild(node);
    return node;
  }

  async loadFontAsync(_font: { family: string; style: string }) {
    return undefined;
  }

  async loadAllPagesAsync() {
    this.loadAllPagesAsyncCount += 1;
  }

  notify(text: string, options: unknown) {
    this.notifications.push({ text, options });
  }

  showUI(_html: string, _options: unknown) {}

  closePlugin() {}
}

const fakeFigma = new FakeFigma();
(globalThis as any).figma = fakeFigma;
(globalThis as any).__html__ = "";
(globalThis as any).__DGP_EXPOSE_TESTABLES__ = true;

const fetchState: {
  payload: any;
  iconTextByPath: Record<string, string>;
  lastYamlRequest: null | {
    method: string;
    body: any;
  };
} = {
  payload: null,
  iconTextByPath: {},
  lastYamlRequest: null,
};

(globalThis as any).fetch = async (url: string, init?: any) => {
  const href = String(url);
  if (href.includes("/api/frame-diagram?")) {
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => fetchState.payload,
      text: async () => JSON.stringify(fetchState.payload),
    };
  }

  const pathname = new URL(href).pathname;
  if (pathname === "/api/frame-diagram-yaml") {
    fetchState.lastYamlRequest = {
      method: String(init?.method || "GET"),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    };
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => fetchState.payload,
      text: async () => JSON.stringify(fetchState.payload),
    };
  }

  if (pathname === "/api/broken-object-error") {
    return {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({ error: { message: "Nested failure" } }),
      text: async () => JSON.stringify({ error: { message: "Nested failure" } }),
    };
  }

  const iconText = fetchState.iconTextByPath[pathname];
  if (typeof iconText === "string") {
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => iconText,
      text: async () => iconText,
    };
  }

  if (pathname.startsWith("/icons/")) {
    const svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"48\" height=\"48\"><path d=\"M4 4h40v40H4z\"/></svg>";
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => svg,
      text: async () => svg,
    };
  }

  return {
    ok: false,
    status: 404,
    statusText: "Not Found",
    json: async () => ({}),
    text: async () => "",
  };
};

const codeModuleUrl = new URL("./code.ts", import.meta.url);
await import(codeModuleUrl.href);

const testables = (globalThis as any).__DGP_TESTABLES__ as PluginTestables;

function makeTextBlock(text: string) {
  return [{
    role: "heading",
    gapAfter: 0,
    lines: [{
      text,
      size: 18,
      weight: 700,
      fill: "#111111",
      lineHeight: 24,
    }],
  }];
}

function makeLeaf(overrides: Record<string, unknown> = {}) {
  return {
    id: "leaf-1",
    name: "Leaf 1",
    kind: "leaf",
    isLeaf: true,
    width: 320,
    height: 120,
    direction: "VERTICAL",
    bodyGap: 0,
    headerGap: 0,
    sizingW: "FIXED",
    sizingH: "FIXED",
    bodySizingW: "FIXED",
    bodySizingH: "FIXED",
    positionType: "AUTO",
    x: 0,
    y: 0,
    padding: { top: 24, right: 24, bottom: 24, left: 24 },
    fill: "transparent",
    stroke: "#4B5563",
    strokeWidth: 1,
    textFill: "#111111",
    iconFill: "#111111",
    icon: null,
    headerMinHeight: 0,
    headerIcon: null,
    headerIconFill: "#111111",
    headerTextWidth: 0,
    leafTextWidth: 200,
    textBlocks: makeTextBlock("Leaf label"),
    children: [],
    ...overrides,
  };
}

function makeRoot(children: any[], overrides: Record<string, unknown> = {}) {
  return {
    id: "page",
    name: "Telecom Services",
    kind: "root",
    isLeaf: false,
    width: 1600,
    height: 1200,
    direction: "VERTICAL",
    bodyGap: 24,
    headerGap: 24,
    sizingW: "FIXED",
    sizingH: "FIXED",
    bodySizingW: "FILL",
    bodySizingH: "HUG",
    positionType: "AUTO",
    x: 0,
    y: 0,
    padding: { top: 32, right: 32, bottom: 32, left: 32 },
    fill: "transparent",
    stroke: "#111111",
    strokeWidth: 1,
    textFill: "#111111",
    iconFill: "#111111",
    icon: null,
    headerMinHeight: 64,
    headerIcon: null,
    headerIconFill: "#111111",
    headerTextWidth: 480,
    leafTextWidth: 0,
    textBlocks: makeTextBlock("Telecom Services"),
    children,
    ...overrides,
  };
}

function makeContainerNode(children: any[], overrides: Record<string, unknown> = {}) {
  return {
    ...makeLeaf(),
    id: "panel-1",
    name: "Panel 1",
    kind: "panel",
    isLeaf: false,
    width: 480,
    height: 200,
    direction: "HORIZONTAL",
    bodyGap: 16,
    headerGap: 8,
    sizingW: "FIXED",
    sizingH: "HUG",
    bodySizingW: "FILL",
    bodySizingH: "HUG",
    bodyWidth: 440,
    bodyHeight: 96,
    headerMinHeight: 48,
    headerTextWidth: 320,
    leafTextWidth: 0,
    children,
    ...overrides,
  };
}

function makeTextNode(name: string, characters: string) {
  const node = new FakeSceneNode("TEXT");
  node.name = name;
  node.characters = characters;
  node.layoutSizingHorizontal = "FIXED";
  node.layoutSizingVertical = "HUG";
  return node;
}

function makeBoxVariant(role: "Child" | "Parent" | "Section", includeSlot: boolean, slotRejectsMutation = false) {
  const component = new FakeSceneNode("COMPONENT");
  component.name = `Role=${role}`;
  component.layoutMode = "VERTICAL";
  component.primaryAxisSizingMode = "AUTO";
  component.counterAxisSizingMode = "FIXED";
  component.resizeWithoutConstraints(role === "Child" ? 287 : 287, role === "Child" ? 64 : 136);

  const contents = new FakeSceneNode("FRAME");
  contents.name = "contents";
  contents.layoutMode = "HORIZONTAL";
  contents.primaryAxisSizingMode = "FIXED";
  contents.counterAxisSizingMode = "AUTO";

  const textBlock = new FakeSceneNode("FRAME");
  textBlock.name = "Text block";
  textBlock.layoutMode = "VERTICAL";
  textBlock.appendChild(makeTextNode("Main text", "Main text"));
  textBlock.appendChild(makeTextNode("Helper text", "Helper text"));
  contents.appendChild(textBlock);

  const icon = new FakeSceneNode("SLOT");
  icon.name = "Network.svg";
  icon.layoutMode = "NONE";
  icon.resizeWithoutConstraints(48, 48);
  const defaultIcon = new FakeSceneNode("INSTANCE");
  defaultIcon.name = "Default icon";
  icon.appendChild(defaultIcon);
  contents.appendChild(icon);
  component.appendChild(contents);

  if (includeSlot) {
    const slot = new FakeSceneNode("SLOT");
    slot.name = "slot";
    slot.layoutMode = "VERTICAL";
    slot.primaryAxisSizingMode = "FIXED";
    slot.counterAxisSizingMode = "FIXED";
    const placeholder = new FakeSceneNode("FRAME");
    placeholder.name = "placeholder";
    slot.appendChild(placeholder);
    slot.rejectChildMutation = slotRejectsMutation;
    component.appendChild(slot);
  }

  return component;
}

function installBoxComponentSet(options: { slotRejectsMutation?: boolean } = {}, parent: FakeSceneNode = fakeFigma.currentPage) {
  const set = new FakeSceneNode("COMPONENT_SET");
  set.name = "box";
  set.appendChild(makeBoxVariant("Child", false));
  set.appendChild(makeBoxVariant("Parent", true, Boolean(options.slotRejectsMutation)));
  set.appendChild(makeBoxVariant("Section", true, Boolean(options.slotRejectsMutation)));
  parent.appendChild(set);
  if (parent === fakeFigma.currentPage) {
    fakeFigma.currentPage.selection = [set];
  }
  return set;
}

function installBoxNamedInstance(parent: FakeSceneNode = fakeFigma.currentPage) {
  const instance = new FakeSceneNode("INSTANCE");
  instance.name = "box";
  const child = new FakeSceneNode("FRAME");
  child.name = "contents";
  instance.appendChild(child);
  parent.appendChild(instance);
  return instance;
}

function installIncompleteBoxComponentSet() {
  const set = new FakeSceneNode("COMPONENT_SET");
  set.name = "box";
  set.appendChild(makeBoxVariant("Child", false));
  set.appendChild(makeBoxVariant("Parent", true));
  fakeFigma.currentPage.appendChild(set);
  fakeFigma.currentPage.selection = [set];
  return set;
}

function installIconComponent(name: string, parent: FakeSceneNode = fakeFigma.currentPage) {
  const component = new FakeSceneNode("COMPONENT");
  component.name = name;
  parent.appendChild(component);
  return component;
}

function installNestedIconComponent(name: string) {
  const folder = new FakeSceneNode("FRAME");
  folder.name = "frames";
  fakeFigma.currentPage.appendChild(folder);
  return installIconComponent(name, folder);
}

function installIconInstance(
  name: string,
  parent: FakeSceneNode = fakeFigma.currentPage,
  size = 48,
  mainComponent: FakeSceneNode | null = null,
) {
  const instance = new FakeSceneNode("INSTANCE");
  instance.name = name;
  instance.width = size;
  instance.height = size;
  instance.mainComponent = mainComponent;
  const vector = new FakeSceneNode("VECTOR");
  vector.name = "glyph";
  instance.appendChild(vector);
  parent.appendChild(instance);
  return instance;
}

function installCloneableIconFrame(name: string) {
  const folder = new FakeSceneNode("FRAME");
  folder.name = "frames";
  const icon = new FakeSceneNode("FRAME");
  icon.name = name;
  const vector = new FakeSceneNode("VECTOR");
  vector.name = "glyph";
  icon.appendChild(vector);
  folder.appendChild(icon);
  fakeFigma.currentPage.appendChild(folder);
  return icon;
}

function resetTestState() {
  fakeFigma.reset();
  fetchState.payload = null;
  fetchState.iconTextByPath = {};
  fetchState.lastYamlRequest = null;
}

function countImportedNodesOnPage() {
  return fakeFigma.currentPage.findAll(
    (node) => node.getSharedPluginData("dgp", "importId") !== "",
  ).length;
}

function findImportedById(root: FakeSceneNode, importId: string) {
  return root.findAll((node) => node.getSharedPluginData("dgp", "importId") === importId)[0] ?? null;
}

function findPayloadNode(node: any, id: string): any | null {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const hit = findPayloadNode(child, id);
    if (hit) return hit;
  }
  return null;
}

test("buildContainerNode preserves fixed root geometry and nested child hierarchy", async () => {
  resetTestState();
  const context = testables.createImportBuildContext();
  const root = makeRoot([makeLeaf({
    sizingW: "FILL",
    sizingH: "HUG",
  })], {
    bodySizingW: "FILL",
    bodySizingH: "HUG",
  });

  const frame = await testables.buildContainerNode(root, "http://localhost:3846", context);
  const content = frame.children[0];
  const header = content.children[0];
  const body = content.children[1];
  const childLeaf = body.children[0];

  assert.equal(frame.width, 1600);
  assert.equal(frame.height, 1200);
  assert.equal(fakeFigma.currentPage.children.length, 1);
  assert.equal(content.name, "page/content");
  assert.equal(header.name, "page/header");
  assert.equal(body.name, "page/body");
  assert.equal(childLeaf.name, "Leaf 1");
  assert.equal(frame.layoutSizingHorizontal, "FIXED");
  assert.equal(frame.layoutSizingVertical, "FIXED");
  assert.equal(content.layoutSizingHorizontal, "FILL");
  assert.equal(content.layoutSizingVertical, "FILL");
  assert.equal(body.layoutSizingHorizontal, "FILL");
  assert.equal(body.layoutSizingVertical, "HUG");
  assert.equal(body.primaryAxisSizingMode, "AUTO");
  assert.equal(body.counterAxisSizingMode, "FIXED");
  assert.equal(childLeaf.layoutSizingHorizontal, "FILL");
  assert.equal(childLeaf.layoutSizingVertical, "HUG");
});

test("buildContainerNode preserves authored absolute child positioning", async () => {
  resetTestState();
  const context = testables.createImportBuildContext();
  const root = makeRoot([makeLeaf({
    id: "absolute-leaf",
    name: "Absolute leaf",
    sizingW: "FIXED",
    sizingH: "FIXED",
    positionType: "ABSOLUTE",
    x: 40,
    y: 88,
  })]);

  const frame = await testables.buildContainerNode(root, "http://localhost:3846", context);
  const body = frame.children[0].children[1];
  const childLeaf = body.children[0];

  assert.equal(childLeaf.layoutPositioning, "ABSOLUTE");
  assert.equal(childLeaf.x, 40);
  assert.equal(childLeaf.y, 88);
});

test("upsertFrameDiagram removes partially-built nodes when recursive construction throws", async () => {
  resetTestState();
  const survivor = fakeFigma.createFrame();
  survivor.name = "survivor";

  fetchState.payload = {
    slug: "broken-diagram",
    title: "Broken diagram",
    root: makeRoot([
      makeLeaf({ stroke: "#nothex" }),
    ]),
  };

  await assert.rejects(() => testables.upsertFrameDiagram("http://localhost:3846", "broken-diagram"));
  assert.equal(fakeFigma.currentPage.children.length, 1);
  assert.equal(fakeFigma.currentPage.children[0], survivor);
  assert.equal(countImportedNodesOnPage(), 0);
});

test("cleanupCreatedNodes does not mask stale Figma parent handles", () => {
  resetTestState();
  const context = testables.createImportBuildContext();
  const stale = fakeFigma.createFrame();
  stale.name = "71:6243";
  stale.throwOnParentRead = true;
  context.createdNodes.add(stale);

  assert.doesNotThrow(() => testables.cleanupCreatedNodes(context));
});

test("upsertFrameDiagram tolerates stale prior imported root handles", async () => {
  resetTestState();
  const existing = fakeFigma.createFrame();
  existing.name = "71:6243";
  existing.x = 320;
  existing.y = 240;
  existing.setSharedPluginData("dgp", "importId", "frame-diagram:telecom");
  existing.setSharedPluginData("dgp", "importKind", "diagram-root");
  existing.throwOnParentRead = true;

  fetchState.payload = {
    slug: "telecom",
    title: "Telecom diagram",
    root: makeRoot([makeLeaf()]),
  };

  const result = await testables.upsertFrameDiagram("http://localhost:3846", "telecom");

  assert.equal(result.refreshed, true);
  assert.equal(result.title, "Telecom diagram");
  const selected = fakeFigma.currentPage.selection[0];
  assert.ok(selected);
  assert.equal(selected.x, 320);
  assert.equal(selected.y, 240);
});

test("upsertFrameDiagram counts only the imported root subtree, not prior orphan imports", async () => {
  resetTestState();
  const orphan = fakeFigma.createFrame();
  orphan.setSharedPluginData("dgp", "importId", "orphan-node");
  orphan.setSharedPluginData("dgp", "importKind", "orphan");

  fetchState.payload = {
    slug: "telecom",
    title: "Telecom diagram",
    root: makeRoot([
      makeLeaf({
        icon: {
          name: "Bad icon",
          size: 48,
          path: "/icons/bad.svg",
        },
      }),
    ], {
      headerIcon: {
        name: "Header icon",
        size: 48,
        path: "/icons/bad.svg",
      },
    }),
  };
  fetchState.iconTextByPath["/icons/bad.svg"] = "bad-svg";

  const result = await testables.upsertFrameDiagram("http://localhost:3846", "telecom");

  assert.equal(result.width, 1600);
  assert.equal(result.height, 1200);
  assert.equal(countImportedNodesOnPage(), result.descendantCount + 1);
  assert.equal(result.sizingVerifiedCount, 3);
  assert.equal(fakeFigma.currentPage.selection[0]?.name, "Telecom diagram");
});

test("upsertFrameDiagram rejects payload sizing that Figma cannot apply", async () => {
  resetTestState();
  fetchState.payload = {
    slug: "illegal-sizing",
    title: "Illegal sizing",
    root: makeRoot([makeLeaf({
      sizingW: "FILL",
      sizingH: "FILL",
    })], {
      bodySizingW: "FILL",
      bodySizingH: "HUG",
    }),
  };

  await assert.rejects(
    () => testables.upsertFrameDiagram("http://localhost:3846", "illegal-sizing"),
    /Figma rejected imported sizing/,
  );
});

test("upsertFrameDiagram applies the real telecom effective payload sizing", async () => {
  resetTestState();
  fetchState.payload = await createFrameDiagramPayload("ai-infra-telecom-services-stack");

  const result = await testables.upsertFrameDiagram("http://localhost:3846", "ai-infra-telecom-services-stack");
  const importedRoot = fakeFigma.currentPage.selection[0]!;

  assert.ok(result.sizingVerifiedCount > 40);
  for (const id of ["services_layer", "ai_workflows", "compute_nodes", "whitebox_switches"]) {
    const payloadNode = findPayloadNode(fetchState.payload.root, id);
    const importedNode = findImportedById(importedRoot, id);
    assert.ok(payloadNode, `missing payload node ${id}`);
    assert.ok(importedNode, `missing imported node ${id}`);
    assert.equal(importedNode.layoutSizingHorizontal, payloadNode.sizingW, `${id} horizontal sizing`);
    assert.equal(importedNode.layoutSizingVertical, payloadNode.sizingH, `${id} vertical sizing`);
  }
});

test("upsertYamlDiagram posts selected YAML and imports returned payload", async () => {
  resetTestState();
  fetchState.payload = {
    slug: "selected-diagram",
    title: "Selected diagram",
    source: {
      kind: "selected-yaml",
      name: "selected.yaml",
    },
    root: makeRoot([makeLeaf()]),
  };

  const result = await testables.upsertYamlDiagram(
    "http://localhost:3846",
    "title: Selected diagram\nroot:\n  id: page\n",
    "selected.yaml",
  );

  assert.equal(result.title, "Selected diagram");
  assert.equal(fetchState.lastYamlRequest?.method, "POST");
  assert.equal(fetchState.lastYamlRequest?.body.sourceName, "selected.yaml");
  assert.match(fetchState.lastYamlRequest?.body.yaml, /Selected diagram/);
  assert.equal(fakeFigma.currentPage.selection[0]?.name, "Selected diagram");
});

test("resolveComponentMapping finds selected box role variants", async () => {
  resetTestState();
  installBoxComponentSet();

  const mapping = await testables.resolveComponentMapping();

  assert.ok(mapping);
  assert.equal(mapping.componentSet.name, "box");
  assert.equal(mapping.roleComponents.get("Child")?.name, "Role=Child");
  assert.equal(mapping.roleComponents.get("Parent")?.name, "Role=Parent");
  assert.equal(mapping.roleComponents.get("Section")?.name, "Role=Section");
  assert.equal(fakeFigma.loadAllPagesAsyncCount, 1);
});

test("resolveComponentMapping rejects incomplete or ambiguous box mappings", async () => {
  resetTestState();
  installIncompleteBoxComponentSet();
  await assert.rejects(() => testables.resolveComponentMapping(), /missing Role=Section/);

  resetTestState();
  installBoxComponentSet();
  installBoxComponentSet();
  await assert.rejects(() => testables.resolveComponentMapping(), /candidate "box" component sets/);
});

test("resolveComponentMapping ignores box-named instances and stale deleted selection handles", async () => {
  resetTestState();
  const componentsPage = fakeFigma.createPage("Components");
  const componentSet = installBoxComponentSet({}, componentsPage);
  for (let index = 0; index < 8; index += 1) {
    installBoxNamedInstance(componentsPage);
  }
  const staleSelection = new FakeSceneNode("INSTANCE");
  staleSelection.name = "70:864";
  staleSelection.throwOnParentRead = true;
  fakeFigma.currentPage.selection = [staleSelection];

  const mapping = await testables.resolveComponentMapping();

  assert.equal(mapping?.componentSet, componentSet);
  assert.equal(mapping?.roleComponents.get("Child")?.name, "Role=Child");
});

test("upsertYamlDiagram uses box component variants and instance slots when available", async () => {
  resetTestState();
  installBoxComponentSet();
  fetchState.payload = {
    slug: "component-diagram",
    title: "Component diagram",
    source: {
      kind: "selected-yaml",
      name: "component.yaml",
    },
    root: makeRoot([
      makeContainerNode([
        makeLeaf({ id: "child-1", name: "Child 1" }),
      ]),
    ]),
  };

  const result = await testables.upsertYamlDiagram(
    "http://localhost:3846",
    "title: Component diagram\nroot:\n  id: page\n",
    "component.yaml",
  );
  const importedRoot = fakeFigma.currentPage.selection[0]!;
  const panel = findImportedById(importedRoot, "panel-1");
  const child = findImportedById(importedRoot, "child-1");
  const slotBody = findImportedById(importedRoot, "panel-1:body");

  assert.equal(result.componentMode, "box");
  assert.equal(result.componentInstanceCount, 2);
  assert.equal(result.componentVerifiedCount, 3);
  assert.equal(result.instanceSlotCount, 1);
  assert.equal(panel?.type, "INSTANCE");
  assert.equal(panel?.name, "Panel 1");
  assert.equal(child?.type, "INSTANCE");
  assert.equal(slotBody?.name, "panel-1/body");
});

test("component validation ignores stale ordinary instance sublayer children", async () => {
  resetTestState();
  installBoxComponentSet();
  const root = makeRoot([
    makeContainerNode([
      makeLeaf({ id: "child-1", name: "Child 1" }),
    ]),
  ]);
  const context = testables.createImportBuildContext();
  const mapping = await testables.resolveComponentMapping();

  const importedRoot = await testables.buildContainerNode(
    root,
    "http://localhost:3846",
    context,
    mapping,
  );
  const panel = findImportedById(importedRoot, "panel-1");
  const contents = panel ? panel.findAll((node) => node.name === "contents")[0] : null;
  assert.ok(contents);
  contents.throwOnChildrenRead = true;

  assert.doesNotThrow(() => testables.validateImportedDiagramSizing(importedRoot, root));
  assert.doesNotThrow(() => testables.validateImportedComponentStructure(importedRoot, root));
});

test("upsertYamlDiagram finds components and copied icons on non-current pages", async () => {
  resetTestState();
  const componentsPage = fakeFigma.createPage("Components");
  const iconsPage = fakeFigma.createPage("Brand icons");
  installBoxComponentSet({}, componentsPage);
  installIconComponent("Gateway.svg", iconsPage);
  fakeFigma.currentPage.selection = [];
  fetchState.payload = {
    slug: "cross-page-components",
    title: "Cross-page components",
    source: {
      kind: "selected-yaml",
      name: "cross-page.yaml",
    },
    root: makeRoot([
      makeLeaf({
        id: "icon-child",
        name: "Gateway child",
        icon: {
          name: "Gateway.svg",
          size: 48,
          path: "/icons/Gateway.svg",
        },
      }),
    ]),
  };

  const result = await testables.upsertYamlDiagram(
    "http://localhost:3846",
    "title: Cross-page components\nroot:\n  id: page\n",
    "cross-page.yaml",
  );
  const importedRoot = fakeFigma.currentPage.selection[0]!;
  const child = findImportedById(importedRoot, "icon-child");
  const iconTarget = child ? child.findAll((node) => node.name === "Gateway.svg")[0] : null;

  assert.equal(fakeFigma.loadAllPagesAsyncCount, 1);
  assert.equal(result.componentMode, "box");
  assert.equal(result.componentInstanceCount, 1);
  assert.equal(child?.type, "INSTANCE");
  assert.equal(iconTarget?.type, "INSTANCE");
  assert.equal(iconTarget?.getSharedPluginData("dgp", "importId"), "icon-child:icon");
});

test("upsertYamlDiagram reports missing icon components in component mode", async () => {
  resetTestState();
  installBoxComponentSet();
  fetchState.payload = {
    slug: "missing-icons",
    title: "Missing icons",
    root: makeRoot([
      makeLeaf({
        id: "icon-child",
        icon: {
          name: "Gateway.svg",
          size: 48,
          path: "/icons/Gateway.svg",
        },
      }),
    ]),
  };

  await assert.rejects(
    () => testables.upsertYamlDiagram("http://localhost:3846", "title: Missing icons", "icons.yaml"),
    /Missing or unapplied Figma icon sources.*Gateway\.svg/,
  );
});

test("upsertYamlDiagram inserts icon component into the icon slot when matching icon exists", async () => {
  resetTestState();
  installBoxComponentSet();
  installIconComponent("Gateway.svg");
  fetchState.payload = {
    slug: "mapped-icons",
    title: "Mapped icons",
    root: makeRoot([
      makeLeaf({
        id: "icon-child",
        icon: {
          name: "Gateway.svg",
          size: 48,
          path: "/icons/Gateway.svg",
        },
      }),
    ]),
  };

  const result = await testables.upsertYamlDiagram("http://localhost:3846", "title: Mapped icons", "icons.yaml");
  const importedRoot = fakeFigma.currentPage.selection[0]!;
  const child = findImportedById(importedRoot, "icon-child");
  const iconTarget = child ? child.findAll((node) => node.name === "Gateway.svg")[0] : null;

  assert.equal(result.componentMode, "box");
  assert.equal(result.componentVerifiedCount, 1);
  assert.equal(iconTarget?.type, "INSTANCE");
  assert.equal(iconTarget?.getSharedPluginData("dgp", "importId"), "icon-child:icon");
});

test("upsertYamlDiagram discovers copied icon components nested in folders", async () => {
  resetTestState();
  installBoxComponentSet();
  installNestedIconComponent("Firewall.svg");
  fetchState.payload = {
    slug: "nested-icons",
    title: "Nested icons",
    root: makeRoot([
      makeLeaf({
        id: "icon-child",
        icon: {
          name: "Firewall.svg",
          size: 48,
          path: "/icons/Firewall.svg",
        },
      }),
    ]),
  };

  const result = await testables.upsertYamlDiagram("http://localhost:3846", "title: Nested icons", "icons.yaml");
  const importedRoot = fakeFigma.currentPage.selection[0]!;
  const child = findImportedById(importedRoot, "icon-child");
  const iconTarget = child ? child.findAll((node) => node.name === "Firewall.svg")[0] : null;

  assert.equal(result.componentMode, "box");
  assert.equal(result.componentVerifiedCount, 1);
  assert.equal(iconTarget?.type, "INSTANCE");
  assert.equal(iconTarget?.getSharedPluginData("dgp", "importId"), "icon-child:icon");
});

test("upsertYamlDiagram clones copied icon instances named without svg extension", async () => {
  resetTestState();
  installBoxComponentSet();
  installIconInstance("AI");
  fetchState.payload = {
    slug: "instance-icons",
    title: "Instance icons",
    root: makeRoot([
      makeLeaf({
        id: "icon-child",
        icon: {
          name: "AI.svg",
          size: 48,
          path: "/icons/AI.svg",
        },
      }),
    ]),
  };

  const result = await testables.upsertYamlDiagram("http://localhost:3846", "title: Instance icons", "icons.yaml");
  const importedRoot = fakeFigma.currentPage.selection[0]!;
  const child = findImportedById(importedRoot, "icon-child");
  const replacement = child ? child.findAll((node) => node.name === "AI.svg")[0] : null;
  const iconSlot = child ? child.findAll((node) => node.name === "Network.svg")[0] : null;

  assert.equal(result.componentMode, "box");
  assert.equal(result.componentVerifiedCount, 1);
  assert.equal(replacement?.type, "INSTANCE");
  assert.equal(replacement?.getSharedPluginData("dgp", "importId"), "icon-child:icon");
  assert.equal(iconSlot?.type, "SLOT");
});

test("upsertYamlDiagram inserts copied icon into SLOT without mutating normal instance sublayers", async () => {
  resetTestState();
  const set = installBoxComponentSet();
  const childVariant = set.children[0]!;
  const contents = childVariant.children.find((node) => node.name === "contents");
  assert.ok(contents);
  contents.rejectChildMutation = true;
  installIconInstance("AI");
  fetchState.payload = {
    slug: "slot-icon",
    title: "Slot icon",
    root: makeRoot([
      makeLeaf({
        id: "icon-child",
        icon: {
          name: "AI.svg",
          size: 48,
          path: "/icons/AI.svg",
        },
      }),
    ]),
  };

  const result = await testables.upsertYamlDiagram("http://localhost:3846", "title: Slot icon", "icons.yaml");
  const importedRoot = fakeFigma.currentPage.selection[0]!;
  const child = findImportedById(importedRoot, "icon-child");
  const replacement = child ? child.findAll((node) => node.name === "AI.svg")[0] : null;
  const iconSlot = child ? child.findAll((node) => node.name === "Network.svg")[0] : null;

  assert.equal(result.componentMode, "box");
  assert.equal(result.componentVerifiedCount, 1);
  assert.equal(child?.type, "INSTANCE");
  assert.equal(child?.getSharedPluginData("dgp", "importKind"), "component:leaf");
  assert.equal(replacement?.type, "INSTANCE");
  assert.equal(replacement?.getSharedPluginData("dgp", "importId"), "icon-child:icon");
  assert.equal(iconSlot?.type, "SLOT");
});

test("upsertYamlDiagram clones copied icon instances with their main component into the icon slot", async () => {
  resetTestState();
  installBoxComponentSet();
  const mainComponent = new FakeSceneNode("COMPONENT");
  mainComponent.name = "AI master";
  installIconInstance("AI", fakeFigma.currentPage, 48, mainComponent);
  fetchState.payload = {
    slug: "instance-icon-swap",
    title: "Instance icon swap",
    root: makeRoot([
      makeLeaf({
        id: "icon-child",
        icon: {
          name: "AI.svg",
          size: 48,
          path: "/icons/AI.svg",
        },
      }),
    ]),
  };

  const result = await testables.upsertYamlDiagram("http://localhost:3846", "title: Instance icon swap", "icons.yaml");
  const importedRoot = fakeFigma.currentPage.selection[0]!;
  const child = findImportedById(importedRoot, "icon-child");
  const iconTarget = child ? child.findAll((node) => node.name === "AI.svg")[0] : null;

  assert.equal(result.componentMode, "box");
  assert.equal(result.componentVerifiedCount, 1);
  assert.equal(iconTarget?.mainComponent?.name, "AI master");
  assert.equal(iconTarget?.getSharedPluginData("dgp", "importId"), "icon-child:icon");
});

test("upsertYamlDiagram does not treat oversized instances as copied icon sources", async () => {
  resetTestState();
  installBoxComponentSet();
  installIconInstance("AI", fakeFigma.currentPage, 320);
  fetchState.payload = {
    slug: "oversized-instance-icons",
    title: "Oversized instance icons",
    root: makeRoot([
      makeLeaf({
        id: "icon-child",
        icon: {
          name: "AI.svg",
          size: 48,
          path: "/icons/AI.svg",
        },
      }),
    ]),
  };

  await assert.rejects(
    () => testables.upsertYamlDiagram("http://localhost:3846", "title: Oversized", "icons.yaml"),
    /Missing or unapplied Figma icon sources.*AI\.svg/,
  );
});

test("upsertYamlDiagram inserts copied cloneable svg frame into the icon slot", async () => {
  resetTestState();
  installBoxComponentSet();
  installCloneableIconFrame("Router.svg");
  fetchState.payload = {
    slug: "cloneable-icons",
    title: "Cloneable icons",
    root: makeRoot([
      makeLeaf({
        id: "icon-child",
        icon: {
          name: "Router.svg",
          size: 48,
          path: "/icons/Router.svg",
        },
      }),
    ]),
  };

  const result = await testables.upsertYamlDiagram("http://localhost:3846", "title: Cloneable icons", "icons.yaml");
  const importedRoot = fakeFigma.currentPage.selection[0]!;
  const child = findImportedById(importedRoot, "icon-child");
  const replacement = child ? child.findAll((node) => node.name === "Router.svg")[0] : null;
  const iconSlot = child ? child.findAll((node) => node.name === "Network.svg")[0] : null;

  assert.equal(result.componentMode, "box");
  assert.equal(result.componentVerifiedCount, 1);
  assert.equal(replacement?.type, "FRAME");
  assert.equal(replacement?.getSharedPluginData("dgp", "importId"), "icon-child:icon");
  assert.equal(iconSlot?.type, "SLOT");
});

test("upsertYamlDiagram rejects mapped instance when content SLOT mutation is rejected", async () => {
  resetTestState();
  installBoxComponentSet({ slotRejectsMutation: true });
  fetchState.payload = {
    slug: "rejected-slot",
    title: "Rejected slot",
    root: makeRoot([
      makeContainerNode([
        makeLeaf({ id: "child-1", name: "Child 1" }),
      ]),
    ]),
  };

  await assert.rejects(
    () => testables.upsertYamlDiagram("http://localhost:3846", "title: Rejected slot", "rejected-slot.yaml"),
    /Child mutation rejected by slot/,
  );
});

test("validateImportedComponentStructure rejects wrong slot direction", async () => {
  resetTestState();
  installBoxComponentSet();
  fetchState.payload = {
    slug: "wrong-slot-direction",
    title: "Wrong slot direction",
    root: makeRoot([
      makeContainerNode([
        makeLeaf({ id: "child-1", name: "Child 1" }),
      ]),
    ]),
  };

  await testables.upsertYamlDiagram("http://localhost:3846", "title: Wrong", "wrong.yaml");
  const importedRoot = fakeFigma.currentPage.selection[0]!;
  const slotBody = findImportedById(importedRoot, "panel-1:body")!;
  slotBody.layoutMode = "VERTICAL";

  assert.throws(
    () => testables.validateImportedComponentStructure(importedRoot, fetchState.payload.root),
    /panel-1\/body: expected HORIZONTAL layout, got VERTICAL/,
  );
});

test("formatErrorMessage serializes object errors instead of object-object text", () => {
  resetTestState();
  const message = testables.formatErrorMessage({ error: { message: "Nested failure" } });

  assert.notEqual(message, "[object Object]");
  assert.match(message, /Nested failure/);
});
