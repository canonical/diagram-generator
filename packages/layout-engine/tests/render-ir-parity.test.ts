import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createArrow, Frame, FrameDiagram } from "../src/frame-model.js";
import { loadFrameYaml } from "../src/frame-yaml-loader.js";
import { layoutFrameTree } from "../src/layout.js";
import { emitFrameDiagramDisplayList } from "../src/render-adapter/display-list.js";
import { renderDisplayListToSvg } from "../src/render-adapter/svg.js";
import { renderPreviewFrameTreeToSvg } from "../src/preview-shell/app-fresh-render.js";
import { renderFrameDiagramToSvg } from "../src/svg-render.js";
import { MockTextAdapter } from "../src/text-measure.js";

const ROOT = join(process.cwd(), "..", "..", "scripts", "diagrams", "frames");

function loadDiagram(slug: string) {
  return loadFrameYaml(join(ROOT, `${slug}.yaml`));
}

function parsePointPairs(raw: string): Array<[number, number]> {
  return raw
    .trim()
    .split(/\s+/)
    .filter((pair) => pair.length > 0)
    .map((pair) => {
      const [x, y] = pair.split(",");
      return [Number(x ?? "0"), Number(y ?? "0")] as [number, number];
    });
}

function parsePathTriangle(raw: string): Array<[number, number]> {
  const tokens = raw.trim().split(/\s+/).filter((token) => token.length > 0);
  const points: Array<[number, number]> = [];
  for (let index = 0; index < tokens.length;) {
    const token = tokens[index++]!;
    if (token === "M" || token === "L") {
      points.push([
        Number(tokens[index++] ?? "0"),
        Number(tokens[index++] ?? "0"),
      ]);
      continue;
    }
    if (token === "Z") {
      continue;
    }
    throw new Error(`unexpected path token: ${token}`);
  }
  return points;
}

function matchEmptyOrPairedElement(svg: string, tagName: string): RegExpMatchArray[] {
  return [...svg.matchAll(new RegExp(`<${tagName}\\b([^>]*?)(?:\\/>|><\\/${tagName}>)`, "g"))];
}

function normalizeNumber(value: string, precision: number): number {
  const scale = 10 ** precision;
  return Math.round(Number(value) * scale) / scale;
}

function normalizeGeometry(svg: string, options: { precision?: number } = {}) {
  const precision = options.precision ?? 2;
  const readNumber = (attrs: string, name: string): number => (
    normalizeNumber(attrs.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1] ?? "0", precision)
  );
  const readAttribute = (attrs: string, name: string): string => (
    attrs.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1] ?? ""
  );

  const rects = matchEmptyOrPairedElement(svg, "rect").map((match) => ({
    x: readNumber(match[1]!, "x"),
    y: readNumber(match[1]!, "y"),
    width: readNumber(match[1]!, "width"),
    height: readNumber(match[1]!, "height"),
    fill: readAttribute(match[1]!, "fill"),
    stroke: readAttribute(match[1]!, "stroke"),
  }));
  const lines = matchEmptyOrPairedElement(svg, "line")
    .map((match) => ({
      x1: readNumber(match[1]!, "x1"),
      y1: readNumber(match[1]!, "y1"),
      x2: readNumber(match[1]!, "x2"),
      y2: readNumber(match[1]!, "y2"),
      stroke: readAttribute(match[1]!, "stroke"),
      dash: readAttribute(match[1]!, "stroke-dasharray"),
    }))
    .filter((line) => line.stroke !== "transparent");
  const tspans = [...svg.matchAll(/<tspan ([^>]+?)>([^<]*)<\/tspan>/g)].map((match) => ({
    x: readNumber(match[1]!, "x"),
    y: readNumber(match[1]!, "y"),
    size: readAttribute(match[1]!, "font-size"),
    weight: readAttribute(match[1]!, "font-weight"),
    fill: readAttribute(match[1]!, "fill"),
    text: match[2]!,
  }));
  const arrowheads = [
    ...matchEmptyOrPairedElement(svg, "polygon").map((match) => ({
      points: parsePointPairs(readAttribute(match[1]!, "points")).map(([x, y]) => [
        normalizeNumber(String(x), precision),
        normalizeNumber(String(y), precision),
      ]),
      fill: readAttribute(match[1]!, "fill"),
    })),
    ...matchEmptyOrPairedElement(svg, "path").map((match) => ({
      points: parsePathTriangle(readAttribute(match[1]!, "d")).map(([x, y]) => [
        normalizeNumber(String(x), precision),
        normalizeNumber(String(y), precision),
      ]),
      fill: readAttribute(match[1]!, "fill"),
    })),
  ];
  return { rects, lines, tspans, arrowheads };
}

class FakeNode {
  parentNode: FakeNode | null = null;
  childNodes: FakeNode[] = [];
  nodeName: string;

  constructor(nodeName: string) {
    this.nodeName = nodeName;
  }

  appendChild<TNode extends FakeNode>(node: TNode): TNode {
    if (node.parentNode) {
      node.remove();
    }
    this.childNodes.push(node);
    node.parentNode = this;
    return node;
  }

  remove(): void {
    if (!this.parentNode) {
      return;
    }
    const siblings = this.parentNode.childNodes;
    const index = siblings.indexOf(this);
    if (index >= 0) {
      siblings.splice(index, 1);
    }
    this.parentNode = null;
  }
}

class FakeElement extends FakeNode {
  tagName: string;
  attrs: Record<string, string> = {};
  textContent = "";
  style: Record<string, string> = {};

  constructor(tagName: string) {
    super(tagName);
    this.tagName = tagName;
  }

  setAttribute(name: string, value: string): void {
    this.attrs[name] = value;
  }

  getAttribute(name: string): string | null {
    return this.attrs[name] ?? null;
  }

  hasAttribute(name: string): boolean {
    return name in this.attrs;
  }

  set id(value: string) {
    this.setAttribute("id", value);
  }

  get id(): string {
    return this.getAttribute("id") || "";
  }

  get innerHTML(): string {
    return this.childNodes
      .map((child) => child instanceof FakeElement ? child.outerHTML : "")
      .join("");
  }

  get outerHTML(): string {
    const attrs = Object.entries(this.attrs)
      .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
      .join("");
    const content = this.childNodes.length > 0
      ? this.childNodes.map((child) => child instanceof FakeElement ? child.outerHTML : "").join("")
      : this.textContent;
    return `<${this.tagName}${attrs}>${content}</${this.tagName}>`;
  }
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

class FakeDocument {
  createElementNS(_namespace: string, tagName: string): FakeElement {
    return new FakeElement(tagName);
  }
}

describe("render-ir parity", () => {
  for (const slug of ["preview-smoke", "support-engineering-flow"]) {
    it(`emits equivalent geometry for ${slug}`, () => {
      const diagram = loadDiagram(slug);
      const adapter = new MockTextAdapter();
      const layout = layoutFrameTree(diagram.root, adapter, {
        gridCols: diagram.gridCols,
        gridColGap: diagram.gridColGap,
        gridOuterMargin: diagram.gridOuterMargin,
      });
      const displayList = emitFrameDiagramDisplayList(diagram, layout, adapter);
      const legacySvg = renderFrameDiagramToSvg(diagram, layout, adapter);
      const displayListSvg = renderDisplayListToSvg(displayList);

      expect(normalizeGeometry(displayListSvg)).toEqual(normalizeGeometry(legacySvg));
    });
  }

  it("emits equivalent geometry across fresh preview DOM and export SVG", () => {
    const diagram = loadDiagram("preview-smoke");
    const adapter = new MockTextAdapter();
    const layout = layoutFrameTree(diagram.root, adapter, {
      gridCols: diagram.gridCols,
      gridColGap: diagram.gridColGap,
      gridOuterMargin: diagram.gridOuterMargin,
    });
    const exportSvg = renderFrameDiagramToSvg(diagram, layout, adapter);
    const previewSvg = renderPreviewFrameTreeToSvg({
      ownerDocument: new FakeDocument() as unknown as Document,
      diagram,
      result: layout,
      textAdapter: adapter,
      iconElements: new Map(),
    }) as unknown as FakeElement;

    expect(normalizeGeometry(previewSvg.outerHTML, { precision: 1 })).toEqual(
      normalizeGeometry(exportSvg, { precision: 1 }),
    );
  });

  it("emits equivalent clamped arrowhead geometry for short final segments", () => {
    const root = new Frame({
      id: "page",
      children: [
        new Frame({ id: "source", label: [{ content: "Source" }] }),
        new Frame({ id: "target", label: [{ content: "Target" }] }),
      ],
    });

    root._layout.placedX = 0;
    root._layout.placedY = 0;
    root._layout.placedW = 220;
    root._layout.placedH = 80;

    const source = root.children[0]!;
    source._layout.placedX = 0;
    source._layout.placedY = 0;
    source._layout.placedW = 80;
    source._layout.placedH = 50;

    const target = root.children[1]!;
    target._layout.placedX = 120;
    target._layout.placedY = 0;
    target._layout.placedW = 80;
    target._layout.placedH = 50;

    const diagram = new FrameDiagram({
      root,
      arrows: [
        createArrow("source.right", "target.left", {
          id: "short-leftward",
          layoutPath: [[100, 25], [95, 25]],
        }),
      ],
    });
    const layout = { width: 220, height: 80 };
    const adapter = new MockTextAdapter();

    const displayList = emitFrameDiagramDisplayList(diagram, layout, adapter);
    const legacySvg = renderFrameDiagramToSvg(diagram, layout, adapter);
    const displayListSvg = renderDisplayListToSvg(displayList);

    expect(normalizeGeometry(displayListSvg)).toEqual(normalizeGeometry(legacySvg));
  });

  it("emits equivalent authored arrow label geometry across display-list and legacy svg serializers", () => {
    const root = new Frame({
      id: "page",
      children: [
        new Frame({ id: "source", label: [{ content: "Source" }] }),
        new Frame({ id: "target", label: [{ content: "Target" }] }),
        new Frame({ id: "obstacle", label: [{ content: "Obstacle" }] }),
      ],
    });

    root._layout.placedX = 0;
    root._layout.placedY = 0;
    root._layout.placedW = 320;
    root._layout.placedH = 160;

    const source = root.children[0]!;
    source._layout.placedX = 0;
    source._layout.placedY = 40;
    source._layout.placedW = 60;
    source._layout.placedH = 40;

    const target = root.children[1]!;
    target._layout.placedX = 220;
    target._layout.placedY = 40;
    target._layout.placedW = 60;
    target._layout.placedH = 40;

    const obstacle = root.children[2]!;
    obstacle._layout.placedX = 110;
    obstacle._layout.placedY = 0;
    obstacle._layout.placedW = 60;
    obstacle._layout.placedH = 36;

    const diagram = new FrameDiagram({
      root,
      arrows: [
        createArrow("source.right", "target.left", {
          id: "labeled-edge",
          label: [{ content: "Fast path" }],
          labelGap: 24,
        }),
      ],
    });
    const layout = { width: 320, height: 160 };
    const adapter = new MockTextAdapter();

    const displayList = emitFrameDiagramDisplayList(diagram, layout, adapter);
    const legacySvg = renderFrameDiagramToSvg(diagram, layout, adapter);
    const displayListSvg = renderDisplayListToSvg(displayList);

    expect(normalizeGeometry(displayListSvg)).toEqual(normalizeGeometry(legacySvg));
  });
});
