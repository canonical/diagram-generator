"use strict";
// ---------------------------------------------------------------------------
// layout-bridge.js — Client-side layout using the TS layout engine
// ---------------------------------------------------------------------------
// Bridges between the server's serialized Frame tree (JSON) and the
// LayoutEngine global (IIFE bundle).  Provides performLocalRelayout()
// which replaces the server round-trip requestV3Relayout().
// ---------------------------------------------------------------------------

/**
 * Reconstruct a LayoutEngine.Frame from a serialized JSON object.
 * The JSON comes from the server's /api/frame-tree/<slug> endpoint.
 */
function deserializeFrame(json) {
  const children = (json.children || []).map(deserializeFrame);
  return new LayoutEngine.Frame({
    id: json.id || "",
    direction: json.direction || "VERTICAL",
    gap: json.gap ?? 24,
    padding: json.padding ?? 8,
    paddingTop: json.paddingTop,
    paddingRight: json.paddingRight,
    paddingBottom: json.paddingBottom,
    paddingLeft: json.paddingLeft,
    align: json.align || "TOP_LEFT",
    sizingW: json.sizingW || "HUG",
    sizingH: json.sizingH || "HUG",
    width: json.width ?? undefined,
    height: json.height ?? undefined,
    minWidth: json.minWidth ?? undefined,
    maxWidth: json.maxWidth ?? undefined,
    minHeight: json.minHeight ?? undefined,
    maxHeight: json.maxHeight ?? undefined,
    fill: json.fill || "#FFFFFF",
    border: json.border || "SOLID",
    heading: json.heading ? LayoutEngine.createLine(json.heading.content, json.heading) : undefined,
    icon: json.icon || undefined,
    iconFill: json.iconFill || undefined,
    label: (json.label || []).map(ln => LayoutEngine.createLine(ln.content, ln)),
    role: json.role || "",
    children,
  });
}

/**
 * Reconstruct a LayoutEngine.FrameDiagram from serialized JSON.
 */
function deserializeFrameDiagram(json) {
  const root = deserializeFrame(json.root);
  const arrows = (json.arrows || []).map(a => LayoutEngine.createArrow(a.source, a.target, a));
  return new LayoutEngine.FrameDiagram({
    title: json.title || "",
    root,
    arrows,
    gridCols: json.gridCols ?? 2,
    gridColGap: json.gridColGap ?? undefined,
    gridRowGap: json.gridRowGap ?? undefined,
    gridOuterMargin: json.gridOuterMargin ?? undefined,
  });
}

// ---------------------------------------------------------------------------
// Override application — port of _relayout_v3's override logic
// ---------------------------------------------------------------------------

const _DIRECTION_MAP = { VERTICAL: "VERTICAL", HORIZONTAL: "HORIZONTAL" };
const _SIZING_MAP = { HUG: "HUG", FILL: "FILL", FIXED: "FIXED" };
const _FILL_MAP = { WHITE: "#FFFFFF", GREY: "#F3F3F3", BLACK: "#000000" };
const _BORDER_MAP = { SOLID: "SOLID", DASHED: "DASHED", NONE: "NONE" };

function _findFrame(frame, fid) {
  if (frame.id === fid) return frame;
  for (const child of frame.children) {
    const found = _findFrame(child, fid);
    if (found) return found;
  }
  return null;
}

/**
 * Apply editor overrides to a Frame tree (mirrors Python _relayout_v3).
 */
function applyOverridesToFrameTree(diagram, allOverrides, gridOverrides) {
  for (const [fid, ovr] of Object.entries(allOverrides)) {
    const target = fid === "root"
      ? diagram.root
      : _findFrame(diagram.root, fid);
    if (!target) continue;

    if (ovr.direction && _DIRECTION_MAP[ovr.direction]) {
      target.direction = ovr.direction;
    }
    if (ovr.gap != null) {
      target.gap = Math.max(0, parseInt(ovr.gap, 10));
    }
    if (ovr.padding != null) {
      const p = Math.max(0, parseInt(ovr.padding, 10));
      target.padding = p;
      target.paddingTop = p;
      target.paddingRight = p;
      target.paddingBottom = p;
      target.paddingLeft = p;
    }
    // Per-side padding overrides (applied after uniform padding, so they win)
    if (ovr.padding_top != null) target.paddingTop = Math.max(0, parseInt(ovr.padding_top, 10));
    if (ovr.padding_right != null) target.paddingRight = Math.max(0, parseInt(ovr.padding_right, 10));
    if (ovr.padding_bottom != null) target.paddingBottom = Math.max(0, parseInt(ovr.padding_bottom, 10));
    if (ovr.padding_left != null) target.paddingLeft = Math.max(0, parseInt(ovr.padding_left, 10));
    if (ovr.sizing && _SIZING_MAP[ovr.sizing]) {
      target.sizingW = ovr.sizing;
      target.sizingH = ovr.sizing;
    }
    if (ovr.sizing_w && _SIZING_MAP[ovr.sizing_w]) {
      target.sizingW = ovr.sizing_w;
    }
    if (ovr.sizing_h && _SIZING_MAP[ovr.sizing_h]) {
      target.sizingH = ovr.sizing_h;
    }
    if (ovr.align) {
      target.align = ovr.align;
    }
    if (ovr.width != null) {
      target.width = parseInt(ovr.width, 10);
    }
    if (ovr.height != null) {
      target.height = parseInt(ovr.height, 10);
    }
    for (const key of ["minWidth", "maxWidth", "minHeight", "maxHeight"]) {
      // Map snake_case override keys to camelCase Frame properties
      const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (snakeKey in ovr) {
        if (ovr[snakeKey] == null) {
          target[key] = undefined;
        } else {
          const val = parseInt(ovr[snakeKey], 10);
          if (val >= 0) target[key] = val;
        }
      }
    }
    if (ovr.fill && _FILL_MAP[ovr.fill]) {
      target.fill = _FILL_MAP[ovr.fill];
    }
    if (ovr.border && _BORDER_MAP[ovr.border]) {
      target.border = ovr.border;
    }
    if (ovr.children_order && Array.isArray(ovr.children_order)) {
      const childMap = new Map(target.children.map(c => [c.id, c]));
      const reordered = ovr.children_order
        .filter(id => childMap.has(id))
        .map(id => childMap.get(id));
      const remaining = target.children.filter(
        c => !ovr.children_order.includes(c.id)
      );
      target.children = [...reordered, ...remaining];
    }
    if (ovr.text && typeof ovr.text === "object") {
      if (ovr.text.heading != null) {
        if (ovr.text.heading && target.heading) {
          target.heading = LayoutEngine.createLine(ovr.text.heading, {
            weight: target.heading.weight,
            size: target.heading.size,
            fill: target.heading.fill,
            smallCaps: target.heading.smallCaps,
            fontFamily: target.heading.fontFamily,
          });
        } else if (ovr.text.heading) {
          target.heading = LayoutEngine.createLine(ovr.text.heading, {
            weight: "700",
          });
        } else {
          target.heading = undefined;
        }
      }
      if (Array.isArray(ovr.text.label)) {
        target.label = ovr.text.label.map((text, i) => {
          if (i < target.label.length) {
            const orig = target.label[i];
            return LayoutEngine.createLine(text, {
              weight: orig.weight,
              size: orig.size,
              fill: orig.fill,
              smallCaps: orig.smallCaps,
              fontFamily: orig.fontFamily,
            });
          }
          return LayoutEngine.createLine(text);
        });
      }
    }
  }

  // Grid overrides
  gridOverrides = gridOverrides || {};
  if (gridOverrides.cols != null) {
    diagram.gridCols = Math.max(1, parseInt(gridOverrides.cols, 10));
  }
  if (gridOverrides.col_gap != null) {
    diagram.gridColGap = Math.max(0, parseInt(gridOverrides.col_gap, 10));
  }
  if (gridOverrides.row_gap != null) {
    diagram.gridRowGap = Math.max(0, parseInt(gridOverrides.row_gap, 10));
  }
  if (gridOverrides.outer_margin != null) {
    diagram.gridOuterMargin = Math.max(0, parseInt(gridOverrides.outer_margin, 10));
  }
}

// ---------------------------------------------------------------------------
// SVG DOM patching — update SVG elements in-place from layout results
// ---------------------------------------------------------------------------

/**
 * Collect { id → { x, y, w, h } } from a placed Frame tree.
 */
function collectPlacedBounds(frame, out) {
  if (!out) out = {};
  if (frame.id && !frame.id.startsWith("__")) {
    const ls = frame._layout;
    out[frame.id] = {
      x: ls.placedX,
      y: ls.placedY,
      w: ls.placedW,
      h: ls.placedH,
    };
  }
  for (const child of frame.children) {
    collectPlacedBounds(child, out);
  }
  return out;
}

/**
 * Patch SVG DOM elements to reflect new layout positions/sizes.
 * Uses the delta between old and new bounds to translate groups,
 * and directly updates rect dimensions for size changes.
 */
function patchSvgFromLayout(svgEl, oldBounds, newBounds) {
  if (!svgEl) return;
  const groups = svgEl.querySelectorAll("[data-component-id]");

  for (const g of groups) {
    const cid = g.getAttribute("data-component-id");
    const oldB = oldBounds[cid];
    const newB = newBounds[cid];
    if (!oldB || !newB) continue;

    const dx = newB.x - oldB.x;
    const dy = newB.y - oldB.y;
    const dw = newB.w - oldB.w;
    const dh = newB.h - oldB.h;

    // Position: translate the group
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      // Get existing transform and compose
      const existing = g.getAttribute("transform") || "";
      // Remove any previous layout-bridge translate
      const cleaned = existing.replace(/translate\([^)]*\)\s*/, "").trim();
      g.setAttribute("transform", `translate(${dx.toFixed(1)}, ${dy.toFixed(1)}) ${cleaned}`.trim());
    }

    // Size: update rect dimensions and positions
    if (Math.abs(dw) > 0.1 || Math.abs(dh) > 0.1) {
      const rect = g.querySelector("rect:first-of-type");
      if (rect) {
        // Rect has absolute coords — update width/height
        rect.setAttribute("width", String(newB.w));
        rect.setAttribute("height", String(newB.h));
        // Store original dimensions for applyAllOverrides compatibility
        rect.setAttribute("data-orig-width", String(newB.w));
        rect.setAttribute("data-orig-height", String(newB.h));
      }
    }
  }

  // Update SVG viewBox to match new diagram size
  const rootBounds = newBounds["root"] || Object.values(newBounds)[0];
  if (rootBounds) {
    svgEl.setAttribute("viewBox", `0 0 ${rootBounds.w} ${rootBounds.h}`);
    svgEl.setAttribute("width", String(rootBounds.w));
    svgEl.setAttribute("height", String(rootBounds.h));
  }
}

/**
 * Update the component model from a placed Frame tree.
 * This mirrors what the server returns as `tree_data`.
 */
function updateComponentModelFromLayout(model, frame) {
  function frameToTreeData(f) {
    if (!f.id || f.id.startsWith("__")) return null;
    const ls = f._layout;
    const children = [];
    if (f.children.length > 0) {
      for (const child of f.children) {
        const ci = frameToTreeData(child);
        if (ci) children.push(ci);
      }
    }
    return {
      id: f.id,
      type: f.children.length > 0 ? "panel" : "box",
      x: ls.placedX,
      y: ls.placedY,
      width: ls.placedW,
      height: ls.placedH,
      children,
      layout: f.children.length > 0
        ? (f.direction === "VERTICAL" ? "vertical" : "horizontal")
        : "",
      layout_gap: f.children.length > 0 ? f.gap : 0,
      layout_col_gap: f.children.length > 0 ? f.gap : 0,
      layout_row_gap: f.children.length > 0 ? f.gap : 0,
      pad: f.border !== "NONE" ? f.paddingTop : 0,
      sizing_w: f.sizingW,
      sizing_h: f.sizingH,
      min_width: f.minWidth,
      max_width: f.maxWidth,
      min_height: f.minHeight,
      max_height: f.maxHeight,
      align: f.align,
      padding_top: f.paddingTop,
      padding_right: f.paddingRight,
      padding_bottom: f.paddingBottom,
      padding_left: f.paddingLeft,
      heading_text: f.heading ? f.heading.content : "",
      label_text: f.label.map(ln => ln.content),
    };
  }

  const rootData = frameToTreeData(frame);
  if (rootData) {
    // If root is anonymous, emit children as top-level
    if (frame.id && !frame.id.startsWith("__")) {
      model.loadTree([rootData]);
    } else {
      model.loadTree(rootData.children || []);
    }
  }
}

// ---------------------------------------------------------------------------
// Arrow routing (port of layout_v3.py arrow routing)
// ---------------------------------------------------------------------------

function _inferSides(sx, sy, sw, sh, tx, ty, tw, th) {
  const dx = (tx + tw / 2) - (sx + sw / 2);
  const dy = (ty + th / 2) - (sy + sh / 2);
  if (Math.abs(dy) >= Math.abs(dx)) {
    return dy >= 0 ? ["bottom", "top"] : ["top", "bottom"];
  }
  return dx >= 0 ? ["right", "left"] : ["left", "right"];
}

function _parseRef(ref) {
  if (ref.includes(".")) {
    const parts = ref.split(".");
    const side = parts[parts.length - 1];
    if (["top", "bottom", "left", "right"].includes(side)) {
      return [parts.slice(0, -1).join("."), side];
    }
  }
  return [ref, null];
}

function _edgePoint(x, y, w, h, side) {
  switch (side) {
    case "left":   return [x, y + h / 2];
    case "right":  return [x + w, y + h / 2];
    case "top":    return [x + w / 2, y];
    case "bottom": return [x + w / 2, y + h];
    default:       return [x + w, y + h / 2];
  }
}

function _orthogonalWaypoints(start, end, srcSide, tgtSide) {
  const [sx, sy] = start;
  const [ex, ey] = end;
  if (srcSide === "right" && tgtSide === "left") {
    const midX = (sx + ex) / 2;
    return [[midX, sy], [midX, ey]];
  }
  if (srcSide === "bottom" && tgtSide === "top") {
    const midY = (sy + ey) / 2;
    return [[sx, midY], [ex, midY]];
  }
  if (srcSide === "left" && tgtSide === "right") {
    const midX = (sx + ex) / 2;
    return [[midX, sy], [midX, ey]];
  }
  if (srcSide === "top" && tgtSide === "bottom") {
    const midY = (sy + ey) / 2;
    return [[sx, midY], [ex, midY]];
  }
  return [[ex, sy]];
}

function routeArrows(arrows, boundsMap) {
  const result = [];
  for (const arrow of arrows) {
    const [srcId, srcSideExplicit] = _parseRef(arrow.source);
    const [tgtId, tgtSideExplicit] = _parseRef(arrow.target);
    const sb = boundsMap[srcId];
    const tb = boundsMap[tgtId];
    if (!sb || !tb) continue;

    let srcSide = srcSideExplicit;
    let tgtSide = tgtSideExplicit;
    if (!srcSide || !tgtSide) {
      const [inferredSrc, inferredTgt] = _inferSides(
        sb.x, sb.y, sb.w, sb.h, tb.x, tb.y, tb.w, tb.h
      );
      if (!srcSide) srcSide = inferredSrc;
      if (!tgtSide) tgtSide = inferredTgt;
    }

    const start = _edgePoint(sb.x, sb.y, sb.w, sb.h, srcSide);
    const end = _edgePoint(tb.x, tb.y, tb.w, tb.h, tgtSide);
    const waypoints = _orthogonalWaypoints(start, end, srcSide, tgtSide);

    result.push({
      start,
      end,
      waypoints,
      direction: tgtSide,
      componentId: `${arrow.source}->${arrow.target}`,
      sourceRef: arrow.source,
      targetRef: arrow.target,
      color: arrow.color || "#E95420",
    });
  }
  return result;
}

/**
 * Update arrow SVG elements from routed arrow data.
 */
function patchArrowsSvg(svgEl, routedArrows) {
  if (!svgEl) return;
  for (const arrow of routedArrows) {
    const g = svgEl.querySelector(
      `[data-component-id="${CSS.escape(arrow.componentId)}"]`
    );
    if (!g) continue;
    // Update line elements
    const lines = g.querySelectorAll("line");
    if (lines.length > 0 && arrow.waypoints.length > 0) {
      // Build segment list: start → wp[0] → wp[1] → ... → end
      const points = [arrow.start, ...arrow.waypoints, arrow.end];
      for (let i = 0; i < lines.length && i < points.length - 1; i++) {
        lines[i].setAttribute("x1", points[i][0].toFixed(1));
        lines[i].setAttribute("y1", points[i][1].toFixed(1));
        lines[i].setAttribute("x2", points[i + 1][0].toFixed(1));
        lines[i].setAttribute("y2", points[i + 1][1].toFixed(1));
      }
    }
    // Update arrowhead polygon
    const polygon = g.querySelector("polygon");
    if (polygon) {
      const [ex, ey] = arrow.end;
      const HL = window.__DG_CONFIG.head_len || 12;
      const HH = window.__DG_CONFIG.head_half || 6;
      let pts;
      switch (arrow.direction) {
        case "top":
          pts = `${ex},${ey} ${ex - HH},${ey + HL} ${ex + HH},${ey + HL}`;
          break;
        case "bottom":
          pts = `${ex},${ey} ${ex - HH},${ey - HL} ${ex + HH},${ey - HL}`;
          break;
        case "left":
          pts = `${ex},${ey} ${ex + HL},${ey - HH} ${ex + HL},${ey + HH}`;
          break;
        case "right":
          pts = `${ex},${ey} ${ex - HL},${ey - HH} ${ex - HL},${ey + HH}`;
          break;
      }
      if (pts) polygon.setAttribute("points", pts);
    }
  }
}

// ---------------------------------------------------------------------------
// Main entry point — called from editor.js
// ---------------------------------------------------------------------------

/** Stored frame tree JSON from the server (loaded once). */
let _frameTreeJson = null;

/** Canvas adapter for real text measurement. */
let _textAdapter = null;

/**
 * Load the frame tree from the server and create the text adapter.
 * Call once during editor initialization.
 */
async function initLayoutBridge(slug) {
  try {
    const resp = await fetch("/api/frame-tree/" + slug);
    if (resp.ok) {
      _frameTreeJson = await resp.json();
    }
  } catch (e) {
    console.warn("layout-bridge: failed to load frame tree", e);
  }

  // Create Canvas text adapter (uses browser font rendering)
  if (typeof LayoutEngine !== "undefined" && LayoutEngine.CanvasTextAdapter) {
    _textAdapter = new LayoutEngine.CanvasTextAdapter();
    await _textAdapter.ensureFontsReady();
  }
}

/**
 * Perform layout locally and patch the SVG DOM.
 * Returns { coerced, width, height } or null on failure.
 *
 * This replaces requestV3Relayout() — no server round-trip needed.
 */
function performLocalRelayout(model, overrides, gridOverrides) {
  if (!_frameTreeJson || !_textAdapter) {
    console.warn("layout-bridge: not initialized, falling back to server");
    return null;
  }

  try {
    // Deep-clone the stored frame tree and deserialize
    const diagramJson = JSON.parse(JSON.stringify(_frameTreeJson));
    const diagram = deserializeFrameDiagram(diagramJson);

    // Build override map (same format as requestV3Relayout sends)
    const FRAME_KEYS = [
      "direction", "gap", "padding", "sizing", "sizing_w", "sizing_h",
      "align", "width", "height", "min_width", "max_width", "min_height",
      "max_height", "children_order", "fill", "border", "text",
    ];
    const allFrameOverrides = {};
    for (const [fid, ovr] of Object.entries(overrides)) {
      const entry = {};
      for (const key of FRAME_KEYS) {
        if (ovr[key] !== undefined) entry[key] = ovr[key];
      }
      if (Object.keys(entry).length > 0) allFrameOverrides[fid] = entry;
    }

    // Apply overrides to the frame tree
    applyOverridesToFrameTree(diagram, allFrameOverrides, gridOverrides);

    // Collect old bounds from component model (before layout)
    const oldBounds = {};
    for (const id of model.allIds) {
      const node = model.get(id);
      if (node) {
        oldBounds[id] = {
          x: node.data.x,
          y: node.data.y,
          w: node.data.width,
          h: node.data.height,
        };
      }
    }

    // Run layout
    const result = LayoutEngine.layoutFrameTree(diagram.root, _textAdapter);

    // Collect new bounds
    const newBounds = collectPlacedBounds(diagram.root, {});

    // Patch SVG DOM
    const svgEl = document.querySelector("#stage svg");
    patchSvgFromLayout(svgEl, oldBounds, newBounds);

    // Route and patch arrows
    if (diagram.arrows && diagram.arrows.length > 0) {
      const routed = routeArrows(diagram.arrows, newBounds);
      patchArrowsSvg(svgEl, routed);
    }

    // Update component model
    updateComponentModelFromLayout(model, diagram.root);

    return {
      coerced: result.coerced,
      width: result.width,
      height: result.height,
    };
  } catch (e) {
    console.error("layout-bridge: local relayout failed", e);
    return null;
  }
}
