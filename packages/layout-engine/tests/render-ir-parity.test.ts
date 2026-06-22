import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createArrow, Frame, FrameDiagram } from "../src/frame-model.js";
import { loadFrameYaml } from "../src/frame-yaml-loader.js";
import { layoutFrameTree } from "../src/layout.js";
import { emitFrameDiagramDisplayList } from "../src/render-adapter/display-list.js";
import { renderDisplayListToSvg } from "../src/render-adapter/svg.js";
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

function normalizeGeometry(svg: string) {
  const rects = [...svg.matchAll(/<rect ([^>]+?)\/>/g)].map((match) => ({
    x: Number(match[1]!.match(/\bx="([^"]+)"/)?.[1] ?? "0"),
    y: Number(match[1]!.match(/\by="([^"]+)"/)?.[1] ?? "0"),
    width: Number(match[1]!.match(/\bwidth="([^"]+)"/)?.[1] ?? "0"),
    height: Number(match[1]!.match(/\bheight="([^"]+)"/)?.[1] ?? "0"),
    fill: match[1]!.match(/\bfill="([^"]+)"/)?.[1] ?? "",
    stroke: match[1]!.match(/\bstroke="([^"]+)"/)?.[1] ?? "",
  }));
  const lines = [...svg.matchAll(/<line ([^>]+?)\/>/g)].map((match) => ({
    x1: Number(match[1]!.match(/\bx1="([^"]+)"/)?.[1] ?? "0"),
    y1: Number(match[1]!.match(/\by1="([^"]+)"/)?.[1] ?? "0"),
    x2: Number(match[1]!.match(/\bx2="([^"]+)"/)?.[1] ?? "0"),
    y2: Number(match[1]!.match(/\by2="([^"]+)"/)?.[1] ?? "0"),
    stroke: match[1]!.match(/\bstroke="([^"]+)"/)?.[1] ?? "",
    dash: match[1]!.match(/\bstroke-dasharray="([^"]+)"/)?.[1] ?? "",
  }));
  const tspans = [...svg.matchAll(/<tspan ([^>]+?)>([^<]*)<\/tspan>/g)].map((match) => ({
    x: Number(match[1]!.match(/\bx="([^"]+)"/)?.[1] ?? "0"),
    y: Number(match[1]!.match(/\by="([^"]+)"/)?.[1] ?? "0"),
    size: match[1]!.match(/\bfont-size="([^"]+)"/)?.[1] ?? "",
    weight: match[1]!.match(/\bfont-weight="([^"]+)"/)?.[1] ?? "",
    fill: match[1]!.match(/\bfill="([^"]+)"/)?.[1] ?? "",
    text: match[2]!,
  }));
  const arrowheads = [
    ...[...svg.matchAll(/<polygon ([^>]+?)\/>/g)].map((match) => ({
      points: parsePointPairs(match[1]!.match(/\bpoints="([^"]+)"/)?.[1] ?? ""),
      fill: match[1]!.match(/\bfill="([^"]+)"/)?.[1] ?? "",
    })),
    ...[...svg.matchAll(/<path ([^>]+?)\/>/g)].map((match) => ({
      points: parsePathTriangle(match[1]!.match(/\bd="([^"]+)"/)?.[1] ?? ""),
      fill: match[1]!.match(/\bfill="([^"]+)"/)?.[1] ?? "",
    })),
  ];
  return { rects, lines, tspans, arrowheads };
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
