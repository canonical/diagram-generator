import {
  Frame,
  FrameDiagram,
  type Arrow,
  type DiagramOverlay,
} from "../frame-model.js";
import {
  resolveArrowPolylineGeometry,
  type ResolvedArrowheadGeometry,
} from "../arrow-geometry.js";
import { resolveFrameRenderPlan } from "../frame-render-plan.js";
import {
  ARROW_COLOR,
  ARROW_HEAD_HALF_WIDTH,
  ARROW_HEAD_LENGTH,
  BODY_LINE_STEP,
  BODY_SIZE,
  sizeToPx,
} from "../tokens.js";
import { type TextMeasureAdapter } from "../text-measure.js";
import {
  annotationTextToSpec,
} from "../resolved-spec-typography.js";
import { routeArrows } from "../arrow-routing.js";
import type { LayoutOutput } from "../layout.js";
import type {
  Color,
  DisplayList,
  DisplayListItem,
  GlyphRunItem,
  GroupItem,
  Paint,
  PathCommand,
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

function simplifyPath(points: [number, number][]): [number, number][] {
  if (points.length <= 2) return points;
  const result: [number, number][] = [points[0]!];
  for (let index = 1; index < points.length - 1; index += 1) {
    const [px, py] = points[index - 1]!;
    const [cx, cy] = points[index]!;
    const [nx, ny] = points[index + 1]!;
    if (!((px === cx && cx === nx) || (py === cy && cy === ny))) {
      result.push(points[index]!);
    }
  }
  result.push(points[points.length - 1]!);
  return result;
}

function arrowheadPathCommands(head: ResolvedArrowheadGeometry): readonly PathCommand[] {
  return [
    { kind: "M", x: head.left[0], y: head.left[1] },
    { kind: "L", x: head.tip[0], y: head.tip[1] },
    { kind: "L", x: head.right[0], y: head.right[1] },
    { kind: "Z" },
  ];
}

function labelAnchorForSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  labelGap: number,
): { x: number; y: number } {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: mx + (-dy / len) * labelGap,
    y: my + (dx / len) * labelGap,
  };
}

function emitArrowGroups(arrows: Arrow[], adapter: TextMeasureAdapter, bounds: Record<string, { x: number; y: number; w: number; h: number }>): GroupItem[] {
  return routeArrows(arrows, bounds).map((arrow) => {
    const children: DisplayListItem[] = [];
    const { head, shaftPoints } = resolveArrowPolylineGeometry({
      points: arrow.points,
      headLength: ARROW_HEAD_LENGTH,
      headHalfWidth: ARROW_HEAD_HALF_WIDTH,
    });

    for (let index = 0; index < shaftPoints.length - 1; index += 1) {
      const [x1, y1] = shaftPoints[index]!;
      const [x2, y2] = shaftPoints[index + 1]!;
      children.push({
        kind: "line",
        x1,
        y1,
        x2,
        y2,
        stroke: paint(arrow.color)!,
        strokeStyle: { width: 1 },
      });
    }

    if (head) {
      children.push({
        kind: "path",
        commands: arrowheadPathCommands(head),
        fill: paint(arrow.color),
      });
    }

    if (arrow.label && arrow.label.length > 0) {
      let bestIndex = 0;
      let bestLength = 0;
      for (let index = 0; index < shaftPoints.length - 1; index += 1) {
        const [x1, y1] = shaftPoints[index]!;
        const [x2, y2] = shaftPoints[index + 1]!;
        const length = Math.hypot(x2 - x1, y2 - y1);
        if (length > bestLength) {
          bestLength = length;
          bestIndex = index;
        }
      }
      const [x1, y1] = shaftPoints[bestIndex]!;
      const [x2, y2] = shaftPoints[bestIndex + 1]!;
      const anchor = labelAnchorForSegment(x1, y1, x2, y2, arrow.labelGap);
      const specs = arrow.label.map(annotationTextToSpec);
      const totalHeight = specs.reduce((sum, spec, index) => {
        const lineStep = sizeToPx(spec.lineStep ?? BODY_LINE_STEP);
        return sum + (index === 0 ? 0 : lineStep);
      }, 0);
      let top = anchor.y - totalHeight / 2;
      for (const spec of specs) {
        const size = String(spec.size ?? BODY_SIZE);
        children.push({
          kind: "glyph-run",
          x: anchor.x,
          y: lineTopToBaseline(top, size),
          run: shapeLineSpec(adapter, spec),
          fill: paint(spec.fill ?? "#666666"),
        });
        top += sizeToPx(spec.lineStep ?? BODY_LINE_STEP);
      }
    }

    return {
      kind: "group",
      id: arrow.componentId,
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
      frameGroup,
      ...emitArrowGroups(diagram.arrows, adapter, bounds),
      ...emitOverlayGroups(diagram.overlays, adapter, bounds),
    ],
  };
}
