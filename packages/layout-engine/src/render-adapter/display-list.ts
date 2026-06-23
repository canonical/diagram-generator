import {
  Frame,
  FrameDiagram,
  type Arrow,
  type DiagramOverlay,
  createLine,
} from "../frame-model.js";
import {
  arrowheadPathCommands,
  resolveArrowRenderPlan,
} from "../arrow-render-plan.js";
import { resolveFrameRenderPlan } from "../frame-render-plan.js";
import {
  BODY_SIZE,
  sizeToPx,
} from "../tokens.js";
import { type TextMeasureAdapter } from "../text-measure.js";
import { annotationTextToSpec } from "../resolved-spec-typography.js";
import { routeArrows, type RoutedArrow } from "../arrow-routing.js";
import { lineTopToBaseline } from "../text-render-geometry.js";
import type { LayoutOutput } from "../layout.js";
import { tintIconInnerMarkup } from "../icon-markup.js";
import type {
  Color,
  DisplayList,
  DisplayListLayer,
  DisplayListItem,
  GroupItem,
  Paint,
  TextBlockItem,
} from "../render-ir.js";

const ASCENT_RATIO = 0.94;
const WHITE = parseColor("#FFFFFF");

function parseColor(value: string): Color {
  const normalized = value.trim().toLowerCase();
  if (normalized === "transparent" || normalized === "none") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return {
      r: Number.parseInt(normalized.slice(1, 3), 16) / 255,
      g: Number.parseInt(normalized.slice(3, 5), 16) / 255,
      b: Number.parseInt(normalized.slice(5, 7), 16) / 255,
      a: 1,
    };
  }
  throw new Error(`Unsupported color format for render-ir emit: ${value}`);
}

function paint(value: string | undefined): Paint | undefined {
  if (!value || value === "none") return undefined;
  return { color: parseColor(value) };
}

function fmtSvgNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function textBlockItem(options: {
  lines: Array<{
    x: number;
    y: number;
    size: string;
    weight: string;
    fill: string;
    spec: {
      content: string;
      fontFamily?: string | null;
      letterSpacing?: string | null;
      smallCaps?: boolean;
    };
  }>;
  fontFamily?: string;
  textAnchor?: string;
  dominantBaseline?: string;
  attributes?: Record<string, string>;
}): TextBlockItem {
  return {
    kind: "text-block",
    fontFamily: options.fontFamily,
    textAnchor: options.textAnchor,
    dominantBaseline: options.dominantBaseline,
    attributes: options.attributes,
    spans: options.lines.map((line) => ({
      x: line.x,
      y: line.y,
      text: line.spec.content,
      fontSize: sizeToPx(line.size),
      fontWeight: Number.parseInt(line.weight, 10) || 400,
      fill: paint(line.fill),
      letterSpacing: line.spec.letterSpacing ?? null,
      fontFamily: line.spec.fontFamily ?? null,
      smallCaps: line.spec.smallCaps ?? false,
    })),
  };
}

function frameTextBlockItems(plan: ReturnType<typeof resolveFrameRenderPlan>): TextBlockItem[] {
  return plan.textBlocks.map((block) => textBlockItem({
    lines: block.lines,
    fontFamily: "Ubuntu Sans",
    attributes: {
      "data-dg-text-role": block.role,
      "data-dg-text-block-index": String(block.blockIndex),
    },
  }));
}

function emitFrameGroup(
  frame: Frame,
  adapter: TextMeasureAdapter,
  iconMarkupByName?: Map<string, string>,
): GroupItem {
  const plan = resolveFrameRenderPlan(frame, adapter);
  const children: DisplayListItem[] = [];

  if (plan.separator) {
    children.push({
      kind: "line",
      className: "dg-separator",
      x1: plan.separator.x1,
      y1: plan.separator.y1,
      x2: plan.separator.x2,
      y2: plan.separator.y2,
      stroke: paint("#000000")!,
      strokeStyle: { width: 1, dashArray: [8, 8] },
    });
  }

  children.push({
    kind: "rect",
    x: plan.box.x,
    y: plan.box.y,
    width: plan.box.width,
    height: plan.box.height,
    fill: paint(plan.box.fill),
    stroke: paint(plan.box.stroke),
    strokeStyle: {
      width: plan.box.strokeWidth,
      dashArray: plan.box.dashed ? [8, 8] : undefined,
    },
  });
  children.push(...frameTextBlockItems(plan));

  if (plan.icon) {
    const embeddedIconMarkup = frame.icon ? iconMarkupByName?.get(frame.icon) ?? null : null;
    if (embeddedIconMarkup) {
      children.push({
        kind: "svg-fragment",
        className: "dg-icon",
        attributes: {
          transform: `translate(${fmtSvgNumber(plan.icon.x)} ${fmtSvgNumber(plan.icon.y)})`,
        },
        markup: tintIconInnerMarkup(embeddedIconMarkup, plan.icon.fill),
      });
    } else {
      children.push({
        kind: "rect",
        className: "dg-icon",
        x: plan.icon.x,
        y: plan.icon.y,
        width: plan.icon.width,
        height: plan.icon.height,
        fill: paint(plan.icon.fill),
        opacity: 0.15,
      });
    }
  }

  for (const child of frame.children) {
    children.push(emitFrameGroup(child, adapter, iconMarkupByName));
  }

  return {
    kind: "group",
    id: plan.componentId,
    layer: "frame",
    children,
  };
}

function collectBounds(
  frame: Frame,
  out: Record<string, { x: number; y: number; w: number; h: number }> = {},
): Record<string, { x: number; y: number; w: number; h: number }> {
  if (frame.id && !frame.id.startsWith("__")) {
    out[frame.id] = {
      x: frame._layout.placedX,
      y: frame._layout.placedY,
      w: frame._layout.placedW,
      h: frame._layout.placedH,
    };
  }
  for (const child of frame.children) collectBounds(child, out);
  return out;
}

type DisplayListRoutedArrow = RoutedArrow & {
  elkLabels?: Arrow["elkLabels"];
};

export function emitRoutedArrowDisplayListItems(
  routedArrows: readonly DisplayListRoutedArrow[],
  bounds: Record<string, { x: number; y: number; w: number; h: number }>,
  options?: {
    headLength?: number;
    headHalfWidth?: number;
  },
): GroupItem[] {
  return routedArrows.map((arrow) => {
    const plan = resolveArrowRenderPlan({
      arrow,
      boundsMap: bounds,
      headLength: options?.headLength,
      headHalfWidth: options?.headHalfWidth,
    });
    const children: DisplayListItem[] = [];
    for (const segment of plan.shaftSegments) {
      children.push({
        kind: "line",
        x1: segment.x1,
        y1: segment.y1,
        x2: segment.x2,
        y2: segment.y2,
        stroke: paint(plan.color)!,
        strokeStyle: { width: 1 },
      });
    }

    if (plan.head) {
      children.push({
        kind: "path",
        commands: arrowheadPathCommands(plan.head),
        fill: paint(plan.color),
      });
    }

    if (arrow.elkLabels && arrow.elkLabels.length > 0) {
      for (const label of arrow.elkLabels) {
        const spec = annotationTextToSpec(createLine(label.text));
        const size = String(spec.size ?? BODY_SIZE);
        children.push(textBlockItem({
          lines: [{
            x: label.x + label.width / 2,
            y: lineTopToBaseline(label.y + label.height / 2 - sizeToPx(size) / 2, size),
            size,
            weight: String(spec.weight ?? "400"),
            fill: spec.fill ?? "#666666",
            spec,
          }],
          fontFamily: "Ubuntu Sans",
          textAnchor: "middle",
          dominantBaseline: "middle",
        }));
      }
    } else if (plan.label) {
      children.push(textBlockItem({
        lines: plan.label.lines,
        fontFamily: "Ubuntu Sans",
        textAnchor: plan.label.textAnchor,
        dominantBaseline: plan.label.dominantBaseline,
      }));
    }

    return {
      kind: "group",
      id: plan.componentId,
      layer: "arrow",
      attributes: {
        "data-dg-arrow": "true",
      },
      children,
    };
  });
}

function emitOverlayGroups(overlays: DiagramOverlay[], bounds: Record<string, { x: number; y: number; w: number; h: number }>): GroupItem[] {
  const OVERLAY_PAD = 8;
  const result: GroupItem[] = [];
  for (const overlay of overlays) {
    const members = overlay.members.filter((member) => bounds[member]).map((member) => bounds[member]!);
    if (members.length === 0) continue;
    const minX = Math.min(...members.map((member) => member.x));
    const minY = Math.min(...members.map((member) => member.y));
    const maxX = Math.max(...members.map((member) => member.x + member.w));
    const maxY = Math.max(...members.map((member) => member.y + member.h));
    const x = minX - OVERLAY_PAD;
    const y = minY - OVERLAY_PAD;
    const width = maxX - minX + 2 * OVERLAY_PAD;
    const height = maxY - minY + 2 * OVERLAY_PAD;

    const children: DisplayListItem[] = [
      {
        kind: "rect",
        x,
        y,
        width,
        height,
        fill: paint("transparent"),
        stroke: paint("#000000"),
        strokeStyle: { width: 1, dashArray: [2, 4] },
      },
    ];
    if (overlay.label) {
      children.push(textBlockItem({
        lines: [{
          x: x + OVERLAY_PAD,
          y: y - 4 + sizeToPx(BODY_SIZE) * ASCENT_RATIO,
          size: String(BODY_SIZE),
          weight: "400",
          fill: "#000000",
          spec: {
            content: overlay.label,
          },
        }],
        fontFamily: "Ubuntu Sans",
      }));
    }
    result.push({
      kind: "group",
      id: overlay.id,
      layer: "overlay",
      children,
    });
  }
  return result;
}

function shouldIncludeLayer(layer: DisplayListLayer, includeLayers?: readonly DisplayListLayer[]): boolean {
  return !includeLayers || includeLayers.includes(layer);
}

export function emitFrameDiagramDisplayList(
  diagram: FrameDiagram,
  result: LayoutOutput,
  adapter: TextMeasureAdapter,
  options?: {
    includeLayers?: readonly DisplayListLayer[];
    previewElkLabels?: boolean;
    iconMarkupByName?: Map<string, string>;
  },
): DisplayList {
  const viewport = {
    width: result.width || 400,
    height: result.height || 200,
    background: WHITE,
  };
  const frameGroup = emitFrameGroup(diagram.root, adapter, options?.iconMarkupByName);
  const bounds = collectBounds(diagram.root);
  const items: DisplayListItem[] = [];
  if (shouldIncludeLayer("arrow", options?.includeLayers)) {
    const arrowInputs = options?.previewElkLabels ? diagram.arrows : diagram.arrows.map((arrow) => {
      if (!arrow.elkLabels) return arrow;
      const { elkLabels: _discard, ...rest } = arrow;
      return rest;
    });
    const authoredByComponentId = options?.previewElkLabels
      ? new Map(diagram.arrows.map((arrow) => [arrow.id ?? `${arrow.source}->${arrow.target}`, arrow]))
      : null;
    const routedArrows = routeArrows(arrowInputs, bounds).map((arrow) => ({
      ...arrow,
      elkLabels: authoredByComponentId?.get(arrow.componentId || "")?.elkLabels,
    }));
    items.push(...emitRoutedArrowDisplayListItems(routedArrows, bounds));
  }
  if (shouldIncludeLayer("frame", options?.includeLayers)) {
    items.push(frameGroup);
  }
  if (shouldIncludeLayer("overlay", options?.includeLayers)) {
    items.push(...emitOverlayGroups(diagram.overlays, bounds));
  }
  return {
    viewport,
    items,
  };
}
