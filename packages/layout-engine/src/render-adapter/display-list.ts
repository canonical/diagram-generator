import {
  Frame,
  FrameDiagram,
  type Arrow,
  type DiagramOverlay,
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
import { routeArrows } from "../arrow-routing.js";
import type { LayoutOutput } from "../layout.js";
import type {
  Color,
  DisplayList,
  DisplayListItem,
  GlyphRunItem,
  GroupItem,
  Paint,
} from "../render-ir.js";
import { shapeLineSpec } from "../text-adapter/shape-compatible.js";

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

function textRunItems(plan: ReturnType<typeof resolveFrameRenderPlan>, adapter: TextMeasureAdapter): GlyphRunItem[] {
  const runs: GlyphRunItem[] = [];
  for (const block of plan.textBlocks) {
    for (const line of block.lines) {
      runs.push({
        kind: "glyph-run",
        x: line.x,
        y: line.y,
        run: shapeLineSpec(adapter, line.spec),
        fill: paint(line.fill),
      });
    }
  }
  return runs;
}

function emitFrameGroup(frame: Frame, adapter: TextMeasureAdapter): GroupItem {
  const plan = resolveFrameRenderPlan(frame, adapter);
  const children: DisplayListItem[] = [];

  if (plan.separator) {
    children.push({
      kind: "line",
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
    strokeStyle: plan.box.strokeWidth > 0
      ? {
        width: plan.box.strokeWidth,
        dashArray: plan.box.dashed ? [8, 8] : undefined,
      }
      : undefined,
  });
  children.push(...textRunItems(plan, adapter));

  if (plan.icon) {
    children.push({
      kind: "rect",
      x: plan.icon.x,
      y: plan.icon.y,
      width: plan.icon.width,
      height: plan.icon.height,
      fill: paint(plan.icon.fill),
      opacity: 0.15,
    });
  }

  for (const child of frame.children) {
    children.push(emitFrameGroup(child, adapter));
  }

  return {
    kind: "group",
    id: plan.componentId,
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

function emitArrowGroups(arrows: Arrow[], adapter: TextMeasureAdapter, bounds: Record<string, { x: number; y: number; w: number; h: number }>): GroupItem[] {
  return routeArrows(arrows, bounds).map((arrow) => {
    const plan = resolveArrowRenderPlan({
      arrow,
      boundsMap: bounds,
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

    if (plan.label) {
      for (const line of plan.label.lines) {
        children.push({
          kind: "glyph-run",
          x: line.x,
          y: line.y,
          run: shapeLineSpec(adapter, line.spec),
          fill: paint(line.fill),
        });
      }
    }

    return {
      kind: "group",
      id: plan.componentId,
      children,
    };
  });
}

function emitOverlayGroups(overlays: DiagramOverlay[], adapter: TextMeasureAdapter, bounds: Record<string, { x: number; y: number; w: number; h: number }>): GroupItem[] {
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
      const spec = {
        content: overlay.label,
        size: String(BODY_SIZE),
        weight: "400",
        fill: "#000000",
      };
      children.push({
        kind: "glyph-run",
        x: x + OVERLAY_PAD,
        y: y - 4 + sizeToPx(BODY_SIZE) * ASCENT_RATIO,
        run: shapeLineSpec(adapter, spec),
        fill: paint("#000000"),
      });
    }
    result.push({
      kind: "group",
      id: overlay.id,
      children,
    });
  }
  return result;
}

export function emitFrameDiagramDisplayList(
  diagram: FrameDiagram,
  result: LayoutOutput,
  adapter: TextMeasureAdapter,
): DisplayList {
  const viewport = {
    width: result.width || 400,
    height: result.height || 200,
    background: WHITE,
  };
  const frameGroup = emitFrameGroup(diagram.root, adapter);
  const bounds = collectBounds(diagram.root);
  return {
    viewport,
    items: [
      ...emitArrowGroups(diagram.arrows, adapter, bounds),
      frameGroup,
      ...emitOverlayGroups(diagram.overlays, adapter, bounds),
    ],
  };
}
