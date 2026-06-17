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
function _collectRelayoutFrameOverrides(overrides) {
  const previewBridgeRelayout = window.__DG_getPreviewBridgeRelayoutContract();
  if (typeof previewBridgeRelayout.collectPreviewRelayoutFrameOverrides === "function") {
    return previewBridgeRelayout.collectPreviewRelayoutFrameOverrides(overrides || {});
  }
  const collected = {};
  for (const [frameId, entry] of Object.entries(overrides || {})) {
    const filtered = previewBridgeRelayout.filterRelayoutOverrideEntry(entry || {});
    if (Object.keys(filtered).length > 0) {
      collected[frameId] = filtered;
    }
  }
  return collected;
}

function previewCoreContract() {
  return window.__DG_getPreviewCoreContract?.()
    ?? window.LayoutEngine?.core
    ?? window.LayoutEngine
    ?? (typeof LayoutEngine !== "undefined" ? LayoutEngine : null);
}

function previewBridgeRenderContract() {
  return window.LayoutEngine?.previewBridge?.render
    ?? window.LayoutEngine
    ?? (typeof LayoutEngine !== "undefined" ? LayoutEngine : null);
}

function previewElkEngineContract() {
  return window.__DG_getPreviewElkEngineContract?.()
    ?? window.LayoutEngine?.previewEngines?.elk
    ?? window.LayoutEngine?.previewEngines
    ?? window.LayoutEngine
    ?? (typeof LayoutEngine !== "undefined" ? LayoutEngine : null);
}

function deserializeFrame(json) {
  return previewCoreContract().deserializeFrameWire(json);
}

/**
 * Reconstruct a LayoutEngine.FrameDiagram from serialized JSON.
 */
function deserializeFrameDiagram(json) {
  const diagram = previewCoreContract().deserializeFrameDiagramWire(json);
  if (!diagram.layoutEngine && window.__DG_CONFIG && window.__DG_CONFIG.layout_engine) {
    diagram.layoutEngine = window.__DG_CONFIG.layout_engine;
  }
  return diagram;
}

// ---------------------------------------------------------------------------
// Override application — delegated to previewBridge.relayout
// ---------------------------------------------------------------------------

function applyOverridesToFrameTree(diagram, allOverrides, gridOverrides) {
  const previewBridgeRelayout = window.__DG_getPreviewBridgeRelayoutContract();
  if (typeof previewBridgeRelayout.applyPreviewOverridesToFrameTree !== "function") {
    throw new Error("layout-bridge: previewBridge.relayout.applyPreviewOverridesToFrameTree is unavailable");
  }
  previewBridgeRelayout.applyPreviewOverridesToFrameTree(
    diagram,
    allOverrides || {},
    gridOverrides || {},
  );
}

// ---------------------------------------------------------------------------
// SVG DOM patching — update SVG elements in-place from layout results
// ---------------------------------------------------------------------------

const SVG_NS = "http://www.w3.org/2000/svg";

const _ASCENT_RATIO = 0.94;

function _fmtSvgNumber(value) {
  return String(Math.round(value * 100) / 100);
}

function collectFramesById(frame, out) {
  if (!out) out = {};
  if (frame.id && !frame.id.startsWith("__")) {
    out[frame.id] = frame;
  }
  for (const child of frame.children) {
    collectFramesById(child, out);
  }
  return out;
}

function _lineTopToBaseline(top, size) {
  return top + previewCoreContract().sizeToPx(size) * _ASCENT_RATIO;
}

function _arrowLabelLines(arrow) {
  if (!arrow.label || arrow.label.length === 0) return [];
  return arrow.label.map((line) => {
    if (typeof line === "string") {
      return previewCoreContract().createLine(line);
    }
    return previewCoreContract().createLine(line.content || "", {
      size: line.size,
      weight: line.weight,
      fill: line.fill,
      smallCaps: line.smallCaps,
      letterSpacing: line.letterSpacing,
      lineStep: line.lineStep,
    });
  });
}

/** Offset label anchor perpendicular to the shaft; pick the side with more node clearance. */
function _minDistanceToBounds(lx, ly, boundsList) {
  let minDist = Infinity;
  for (const b of boundsList) {
    if (!b) continue;
    const cx = Math.max(b.x, Math.min(lx, b.x + b.w));
    const cy = Math.max(b.y, Math.min(ly, b.y + b.h));
    minDist = Math.min(minDist, Math.hypot(lx - cx, ly - cy));
  }
  return minDist;
}

function _labelAnchorForSegment(x1, y1, x2, y2, labelGap, boundsMap) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const boundsList = Object.values(boundsMap || {});
  const candidates = [
    { lx: mx + nx * labelGap, ly: my + ny * labelGap },
    { lx: mx - nx * labelGap, ly: my - ny * labelGap },
  ];
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const c of candidates) {
    const score = _minDistanceToBounds(c.lx, c.ly, boundsList);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

function _buildArrowLabelsFromElk(arrow) {
  const previewCore = previewCoreContract();
  if (!arrow.elkLabels || !arrow.elkLabels.length) return null;
  if (typeof previewCore.annotationTextToSpec !== "function") return null;

  const frag = document.createDocumentFragment();
  for (const lbl of arrow.elkLabels) {
    const spec = previewCore.annotationTextToSpec(
      previewCore.createLine(lbl.text),
    );
    const size = spec.size ?? previewCore.BODY_SIZE;
    const cx = lbl.x + lbl.width / 2;
    const cy = lbl.y + lbl.height / 2;
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("font-family", "Ubuntu Sans");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    const tspan = document.createElementNS(SVG_NS, "tspan");
    tspan.setAttribute("x", _fmtSvgNumber(cx));
    tspan.setAttribute("y", _fmtSvgNumber(_lineTopToBaseline(cy - previewCore.sizeToPx(size) / 2, size)));
    tspan.setAttribute("font-size", String(size));
    tspan.setAttribute("font-weight", String(spec.weight ?? "400"));
    tspan.setAttribute("fill", spec.fill ?? "#666666");
    tspan.textContent = lbl.text;
    text.appendChild(tspan);
    frag.appendChild(text);
  }
  return frag;
}

function _buildArrowLabelElement(arrow, shaftPoints, labelGap, boundsMap) {
  const elkLabels = _buildArrowLabelsFromElk(arrow);
  if (elkLabels) return elkLabels;

  const lines = _arrowLabelLines(arrow);
  if (!lines.length) return null;
  const previewCore = previewCoreContract();
  if (typeof previewCore.annotationTextToSpec !== "function") return null;

  let bestIdx = 0;
  let bestLen = 0;
  for (let i = 0; i < shaftPoints.length - 1; i++) {
    const [x1, y1] = shaftPoints[i];
    const [x2, y2] = shaftPoints[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len > bestLen) {
      bestLen = len;
      bestIdx = i;
    }
  }
  const [mx1, my1] = shaftPoints[bestIdx];
  const [mx2, my2] = shaftPoints[bestIdx + 1];
  const { lx, ly } = _labelAnchorForSegment(mx1, my1, mx2, my2, labelGap, boundsMap);

  const text = document.createElementNS(SVG_NS, "text");
  text.setAttribute("font-family", "Ubuntu Sans");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "middle");

  const specs = lines.map((line) => previewCore.annotationTextToSpec(line));
  if (!specs.length) return null;

  const totalHeight = specs.reduce((sum, spec, index) => {
    const lineStep = previewCore.sizeToPx(spec.lineStep ?? previewCore.BODY_LINE_STEP);
    return sum + (index === 0 ? 0 : lineStep);
  }, 0);
  let top = ly - totalHeight / 2;

  for (const spec of specs) {
    const size = spec.size ?? previewCore.BODY_SIZE;
    const weight = spec.weight ?? "400";
    const fill = spec.fill ?? "#666666";
    const lineStep = previewCore.sizeToPx(spec.lineStep ?? previewCore.BODY_LINE_STEP);
    const tspan = document.createElementNS(SVG_NS, "tspan");
    tspan.setAttribute("x", _fmtSvgNumber(lx));
    tspan.setAttribute("y", _fmtSvgNumber(_lineTopToBaseline(top, size)));
    tspan.setAttribute("font-size", String(size));
    tspan.setAttribute("font-weight", String(weight));
    tspan.setAttribute("fill", fill);
    if (spec.letterSpacing) {
      tspan.setAttribute("letter-spacing", String(spec.letterSpacing));
    }
    if (spec.smallCaps) {
      tspan.setAttribute("font-variant-caps", "small-caps");
    }
    tspan.textContent = spec.content;
    text.appendChild(tspan);
    top += lineStep;
  }
  return text;
}

function _frameBoxRenderState(frame) {
  // Use resolved style values from resolveStyles() — the single source of truth.
  // resolvedFill / resolvedStroke are always set after resolveStyles() runs.
  const fill = frame.resolvedFill ?? "transparent";
  const stroke = frame.resolvedStroke ?? "none";

  let padTop = frame.paddingTop;
  let padRight = frame.paddingRight;
  const padBottom = frame.paddingBottom;
  let padLeft = frame.paddingLeft;

  const previewCore = previewCoreContract();
  const iconCol = frame.icon ? (previewCore.ICON_SIZE + previewCore.INSET) : 0;
  const textMaxWidth = frame._layout.placedW - padLeft - padRight - iconCol;
  const iconFill = frame.resolvedIconFill ?? frame.iconFill ?? "#000000";

  let textBlocks = previewCore.frameOwnedTextBlocks(frame);
  if (textBlocks.length > 0 && textMaxWidth > 0) {
    textBlocks = textBlocks
      .map(block => previewCore.wrapTextLines(block, textMaxWidth, _textAdapter))
      .filter(block => block.length > 0);
  }

  const strokeWidth = typeof previewCore.effectiveResolvedStrokeWidth === "function"
    ? previewCore.effectiveResolvedStrokeWidth(frame)
    : (stroke === "none" || stroke === "transparent"
      ? 0
      : (frame.resolvedStrokeWidth
        ?? (frame.border === "SOLID" || frame.border === "DASHED" ? 1 : 0)));

  return {
    fill,
    stroke,
    strokeWidth,
    dashed: frame.border === "DASHED",
    padTop,
    padRight,
    padBottom,
    padLeft,
    textMaxWidth,
    textBlocks,
    iconFill,
  };
}

function _buildFrameTextElements(frame, renderState) {
  if (!renderState.textBlocks.length) return [];
  const previewCore = previewCoreContract();

  const elements = [];
  let top = frame._layout.placedY + renderState.padTop;
  const x = frame._layout.placedX + renderState.padLeft;

  for (const [blockIndex, block] of renderState.textBlocks.entries()) {
    const textEl = document.createElementNS(SVG_NS, "text");
    textEl.setAttribute("font-family", "Ubuntu Sans");
    textEl.setAttribute("data-dg-text-role", previewCore.frameOwnedTextBlockRole(frame, blockIndex));
    textEl.setAttribute("data-dg-text-block-index", String(blockIndex));

    for (const spec of block) {
      const size = spec.size ?? previewCore.BODY_SIZE;
      const weight = spec.weight ?? "400";
      const smallCaps = spec.smallCaps ?? false;
      const fill = spec.fill ?? "#000000";
      const lineStep = previewCore.sizeToPx(spec.lineStep ?? previewCore.BODY_LINE_STEP);
      const tspan = document.createElementNS(SVG_NS, "tspan");
      tspan.setAttribute("x", _fmtSvgNumber(x));
      tspan.setAttribute("y", _fmtSvgNumber(_lineTopToBaseline(top, size)));
      tspan.setAttribute("font-size", String(size));
      tspan.setAttribute("font-weight", String(weight));
      tspan.setAttribute("fill", fill);
      if (spec.letterSpacing) {
        tspan.setAttribute("letter-spacing", String(spec.letterSpacing));
      }
      if (spec.fontFamily) {
        tspan.setAttribute("font-family", spec.fontFamily);
      }
      if (smallCaps) {
        tspan.setAttribute("font-variant-caps", "small-caps");
      }
      tspan.textContent = spec.content;
      textEl.appendChild(tspan);
      top += lineStep;
    }

    textEl.setAttribute("data-orig-inner", textEl.innerHTML);
    elements.push(textEl);
    top += previewCore.frameOwnedTextBlockGap(frame, blockIndex, renderState.textBlocks.length);
  }

  return elements;
}

function patchFrameGroup(g, frame, iconElement) {
  const renderState = _frameBoxRenderState(frame);
  const existingIcon = g.querySelector(":scope > .dg-icon");

  g.removeAttribute("transform");
  g.style.transform = "";

  const children = [];

  // Separator role: emit a visible dashed line at the top of the bounds
  if (frame.role === "separator") {
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("class", "dg-separator");
    line.setAttribute("x1", _fmtSvgNumber(frame._layout.placedX));
    line.setAttribute("y1", _fmtSvgNumber(frame._layout.placedY));
    line.setAttribute("x2", _fmtSvgNumber(frame._layout.placedX + frame._layout.placedW));
    line.setAttribute("y2", _fmtSvgNumber(frame._layout.placedY));
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", "#000000");
    line.setAttribute("stroke-width", "1");
    line.setAttribute("stroke-miterlimit", "10");
    line.setAttribute("stroke-dasharray", "8 8");
    children.push(line);
  }

  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("x", _fmtSvgNumber(frame._layout.placedX));
  rect.setAttribute("y", _fmtSvgNumber(frame._layout.placedY));
  rect.setAttribute("width", _fmtSvgNumber(frame._layout.placedW));
  rect.setAttribute("height", _fmtSvgNumber(frame._layout.placedH));
  rect.setAttribute("fill", renderState.fill);
  rect.setAttribute("stroke", renderState.stroke);
  rect.setAttribute("stroke-width", String(renderState.strokeWidth));
  rect.setAttribute("stroke-miterlimit", "10");
  rect.setAttribute("data-orig-width", _fmtSvgNumber(frame._layout.placedW));
  rect.setAttribute("data-orig-height", _fmtSvgNumber(frame._layout.placedH));
  if (renderState.dashed) {
    rect.setAttribute("stroke-dasharray", "8 8");
  }
  // Structural transparent rects (no text, no stroke) are pure containers —
  // keep them click-transparent so child components remain selectable.
  if (renderState.fill === "transparent" && renderState.stroke === "none"
      && !renderState.textBlocks.length) {
    rect.setAttribute("pointer-events", "none");
  }

  children.push(rect);
  const textEls = _buildFrameTextElements(frame, renderState);
  if (textEls.length) {
    children.push(...textEls);
  }

  const iconToUse = iconElement || existingIcon;
  if (frame.icon && iconToUse) {
    const iconX = frame._layout.placedX + frame._layout.placedW - renderState.padRight - previewCoreContract().ICON_SIZE;
    const iconY = frame._layout.placedY + renderState.padTop;
    iconToUse.setAttribute("transform", `translate(${_fmtSvgNumber(iconX)} ${_fmtSvgNumber(iconY)})`);
    iconToUse.setAttribute("data-orig-tx", _fmtSvgNumber(iconX));
    iconToUse.setAttribute("data-orig-ty", _fmtSvgNumber(iconY));
    children.push(iconToUse);
  }

  g.replaceChildren(...children);
}

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

function fitSvgToRenderedContent(svgEl, options) {
  if (!svgEl) return null;
  const styledLayer = svgEl.querySelector("#dg-styled-layer");
  if (!styledLayer || typeof styledLayer.getBBox !== "function") return null;

  let bbox;
  try {
    bbox = styledLayer.getBBox();
  } catch (_error) {
    return null;
  }
  if (!bbox || !Number.isFinite(bbox.width) || !Number.isFinite(bbox.height)) return null;

  const padding = Number(options && options.padding) || 24;
  const minWidth = Math.max(0, Number(options && options.minWidth) || 0);
  const minHeight = Math.max(0, Number(options && options.minHeight) || 0);
  const minX = Math.min(0, Math.floor(bbox.x - padding));
  const minY = Math.min(0, Math.floor(bbox.y - padding));
  const maxX = Math.max(minWidth, Math.ceil(bbox.x + bbox.width + padding));
  const maxY = Math.max(minHeight, Math.ceil(bbox.y + bbox.height + padding));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  svgEl.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
  svgEl.setAttribute("width", String(width));
  svgEl.setAttribute("height", String(height));

  const bgRect = svgEl.querySelector(":scope > rect:first-of-type");
  if (bgRect) {
    bgRect.setAttribute("x", String(minX));
    bgRect.setAttribute("y", String(minY));
    bgRect.setAttribute("width", String(width));
    bgRect.setAttribute("height", String(height));
  }

  return { x: minX, y: minY, width, height };
}

/**
 * Patch SVG DOM elements to reflect new layout positions/sizes.
 * FrameBox groups are rebuilt from the relaid-out frame tree so text,
 * icon anchoring, and rect geometry stay in sync.
 */
function patchSvgFromLayout(svgEl, oldBounds, newBounds, framesById) {
  if (!svgEl) return;
  const groups = svgEl.querySelectorAll("[data-component-id]");

  for (const g of groups) {
    const cid = g.getAttribute("data-component-id");
    const newB = newBounds[cid];

    // Frame groups are fully rebuilt from the relaid-out frame tree.
    // This covers heading/body synthetic children that may not have
    // oldBounds entries in the component model.
    const frame = framesById ? framesById[cid] : null;
    if (frame && newB) {
      patchFrameGroup(g, frame);
      continue;
    }

    const oldB = oldBounds[cid];
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
    fitSvgToRenderedContent(svgEl, {
      minWidth: rootBounds.w,
      minHeight: rootBounds.h,
    });
  }
}

/**
 * Update the component model from a placed Frame tree.
 * This mirrors what the server returns as `tree_data`.
 */
function _headingTextForFrame(f) {
  if (f.heading && f.heading.content) return f.heading.content;
  const headingChild = (f.children || []).find(
    c => c.role === "heading" || (c.id && c.id.endsWith("__heading")),
  );
  if (headingChild && headingChild.label && headingChild.label[0]) {
    return headingChild.label[0].content || "";
  }
  return "";
}

function _resolveAuthoredLayoutFrame(f) {
  if (!f.children || f.children.length === 0) {
    return { layoutChildren: [], layoutGap: 0, layoutDirection: f.direction };
  }
  const body = f.children.find(
    c => c.id === "__body" || (c.id && c.id.endsWith("__body")),
  );
  const hasHeading = f.children.some(
    c => c.role === "heading" || (c.id && c.id.endsWith("__heading")),
  );
  if (body && hasHeading) {
    return {
      layoutChildren: body.children || [],
      layoutGap: body.gap,
      layoutDirection: body.direction,
      layoutHeaderGap: f.gap,
    };
  }
  return {
    layoutChildren: f.children.filter(
      c => !(c.id && c.id.endsWith("__body"))
        && !(c.id && c.id.endsWith("__heading"))
        && c.role !== "heading",
    ),
    layoutGap: f.gap,
    layoutDirection: f.direction,
    layoutHeaderGap: f.gap,
  };
}

function updateComponentModelFromLayout(model, frame) {
  function frameToTreeData(f) {
    if (!f.id || f.id.startsWith("__")) return null;
    const ls = f._layout;
    const { layoutChildren, layoutGap, layoutDirection, layoutHeaderGap } =
      _resolveAuthoredLayoutFrame(f);
    const children = [];
    for (const child of layoutChildren) {
      const ci = frameToTreeData(child);
      if (ci) children.push(ci);
    }
    const hasLayout = layoutChildren.length > 0;
    return {
      id: f.id,
      type: hasLayout || f.children.length > 0 ? "panel" : "box",
      x: ls.placedX,
      y: ls.placedY,
      width: ls.placedW,
      height: ls.placedH,
      children,
      layout: hasLayout
        ? (layoutDirection === "VERTICAL" ? "vertical" : "horizontal")
        : "",
      layout_gap: hasLayout ? layoutGap : 0,
      layout_col_gap: hasLayout ? layoutGap : 0,
      layout_row_gap: hasLayout ? layoutGap : 0,
      layout_header_gap: hasLayout ? layoutHeaderGap : 0,
      gap_delta: f.gapDelta ?? undefined,
      pad: f.border !== "NONE" ? f.paddingTop : 0,
      sizing_w: f.sizingW,
      sizing_h: f.sizingH,
      fill_weight: f.fillWeight,
      min_width: f.minWidth,
      max_width: f.maxWidth,
      max_width_chars: f.maxWidthChars,
      min_height: f.minHeight,
      max_height: f.maxHeight,
      align: f.align,
      padding_top: f.paddingTop,
      padding_right: f.paddingRight,
      padding_bottom: f.paddingBottom,
      padding_left: f.paddingLeft,
      level: f.level ?? null,
      fill: f.fill,
      border: f.border,
      heading_text: _headingTextForFrame(f),
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
// Arrow routing bridges serialized preview state to the TS-owned router.
// ---------------------------------------------------------------------------

/** Match packages/layout-engine/src/svg-render.ts arrow group ids. */
function arrowComponentId(arrow) {
  if (arrow && arrow.id) return String(arrow.id);
  return `${arrow.source}->${arrow.target}`;
}

function syncArrowsInModel(model, arrows, routedArrows) {
  if (!model || typeof model.loadArrows !== "function") return;
  const routedById = new Map();
  for (const r of routedArrows || []) {
    routedById.set(r.componentId, r);
  }
  const payload = (arrows || []).map((a) => {
    const cid = arrowComponentId(a);
    const routed = routedById.get(cid);
    return {
      id: cid,
      source: a.source,
      target: a.target,
      color: a.color,
      waypoints: routed ? routed.waypoints : (a.waypoints || []),
    };
  });
  model.loadArrows(payload);
}

function routeArrows(arrows, boundsMap) {
  const previewCore = previewCoreContract();
  if (typeof previewCore.routeArrows !== "function") {
    console.warn("layout-bridge: LayoutEngine.routeArrows is unavailable");
    return [];
  }

  const authoredByComponentId = new Map(
    (arrows || []).map((arrow) => [arrowComponentId(arrow), arrow]),
  );

  return previewCore.routeArrows(arrows, boundsMap)
    .map((routed) => {
      const points = routed.points || [];
      const authored = authoredByComponentId.get(routed.componentId) || {};
      return {
        start: points[0],
        end: points[points.length - 1],
        waypoints: points.slice(1, -1),
        componentId: routed.componentId || arrowComponentId(authored),
        color: routed.color || authored.color || "#E95420",
        label: routed.label ?? authored.label,
        labelGap: routed.labelGap ?? authored.labelGap ?? previewCore.GRID_GUTTER ?? 24,
        elkLabels: authored.elkLabels,
      };
    })
    .filter((arrow) => arrow.start && arrow.end);
}

function _syncArrowOriginGeometry(g) {
  if (!g) return;
  g.style.transform = "";
  g.querySelectorAll("line").forEach((line) => {
    line.setAttribute("data-orig-x1", line.getAttribute("x1") || "0");
    line.setAttribute("data-orig-y1", line.getAttribute("y1") || "0");
    line.setAttribute("data-orig-x2", line.getAttribute("x2") || "0");
    line.setAttribute("data-orig-y2", line.getAttribute("y2") || "0");
  });
  g.querySelectorAll("polygon").forEach((polygon) => {
    polygon.setAttribute("data-orig-points", polygon.getAttribute("points") || "");
  });
}

function _replaceArrowLabels(g, arrow, boundsMap) {
  if (!g) return;
  g.querySelectorAll(":scope > text").forEach((el) => el.remove());
  const replacement = createArrowsSvg([arrow], boundsMap).firstChild;
  if (!replacement) return;
  Array.from(replacement.childNodes).forEach((child) => {
    if (child.nodeName && child.nodeName.toLowerCase() === "text") {
      g.appendChild(child);
    }
  });
}

/**
 * Update arrow SVG elements from routed arrow data.
 */
function patchArrowsSvg(svgEl, routedArrows, boundsMap) {
  if (!svgEl) return;
  for (const arrow of routedArrows) {
    const g = svgEl.querySelector(
      `[data-dg-arrow="true"][data-component-id="${CSS.escape(arrow.componentId)}"]`
    );
    if (!g) continue;
    // Update visible arrow segments only. Interactive hit-area lines may
    // already exist in the group from a previous bindInteraction() pass.
    const allLines = Array.from(g.querySelectorAll("line"));
    const lines = allLines.filter((line) => line.getAttribute("stroke") !== "transparent");
    const hitLines = allLines.filter((line) => line.getAttribute("stroke") === "transparent");
    const points = [arrow.start, ...arrow.waypoints, arrow.end];
    const segmentCount = Math.max(0, points.length - 1);
    if (lines.length !== segmentCount || hitLines.length !== segmentCount) {
      const replacement = createArrowsSvg([arrow], boundsMap).firstChild;
      if (replacement) {
        g.querySelectorAll("line, polygon, text").forEach((el) => el.remove());
        Array.from(replacement.childNodes).forEach((child) => g.appendChild(child));
        _syncArrowOriginGeometry(g);
      }
      continue;
    }
    if (lines.length > 0 && points.length >= 2) {
      let basePoint = null;
      const [tx, ty] = points[points.length - 1];
      const [px, py] = points[points.length - 2];
      const head = _arrowheadPoints(
        tx,
        ty,
        px,
        py,
        window.__DG_CONFIG.head_len || 12,
        window.__DG_CONFIG.head_half || 6,
      );
      if (head) basePoint = head.base;

      for (let i = 0; i < lines.length && i < points.length - 1; i++) {
        lines[i].setAttribute("x1", points[i][0].toFixed(1));
        lines[i].setAttribute("y1", points[i][1].toFixed(1));
        const isLastSegment = i === points.length - 2;
        const endPoint = isLastSegment && basePoint ? basePoint : points[i + 1];
        lines[i].setAttribute("x2", endPoint[0].toFixed(1));
        lines[i].setAttribute("y2", endPoint[1].toFixed(1));
      }

      for (let i = 0; i < hitLines.length && i < lines.length; i++) {
        hitLines[i].setAttribute("x1", lines[i].getAttribute("x1"));
        hitLines[i].setAttribute("y1", lines[i].getAttribute("y1"));
        hitLines[i].setAttribute("x2", lines[i].getAttribute("x2"));
        hitLines[i].setAttribute("y2", lines[i].getAttribute("y2"));
      }
    }
    // Update arrowhead polygon
    const polygon = g.querySelector("polygon");
    if (polygon && points.length >= 2) {
      const [tx, ty] = points[points.length - 1];
      const [px, py] = points[points.length - 2];
      const head = _arrowheadPoints(
        tx,
        ty,
        px,
        py,
        window.__DG_CONFIG.head_len || 12,
        window.__DG_CONFIG.head_half || 6,
      );
      if (head) polygon.setAttribute("points", head.points);
    }
    _replaceArrowLabels(g, arrow, boundsMap);
    _syncArrowOriginGeometry(g);
  }
}

// ---------------------------------------------------------------------------
// Main entry point — called from editor.js
// ---------------------------------------------------------------------------

/** Stored frame tree JSON from the server (loaded once). */
let _previewDocumentJson = null;
let _frameTreeJson = null;
let _lastElkSnapshot = null;
let _lastElkFrameLabels = null;

function _elkDebugEnabled() {
  return window.__DG_elkDebugOverlay === true && !window.__DG_elkRawView;
}

function _elkRawViewEnabled() {
  return window.__DG_elkRawView === true;
}

function refreshElkViewMode() {
  const svg = document.querySelector("#stage svg");
  if (!svg) return;
  const previewElk = previewElkEngineContract();

  const styled = svg.querySelector("#dg-styled-layer");
  const rawOn = _elkRawViewEnabled();

  if (styled) {
    styled.setAttribute("display", rawOn ? "none" : "inline");
  }

  svg.querySelector("#dg-elk-raw-view")?.remove();
  svg.querySelector("#dg-elk-debug-overlay")?.remove();

  if (rawOn && _lastElkSnapshot && typeof previewElk.renderPreviewElkRawView === "function") {
    svg.appendChild(previewElk.renderPreviewElkRawView({
      ownerDocument: document,
      snapshot: _lastElkSnapshot,
      labelMap: _lastElkFrameLabels || {},
      svgNs: SVG_NS,
      headLen: 8,
      headHalf: 4,
    }));
    return;
  }

  if (_elkDebugEnabled() && _lastElkSnapshot && typeof previewElk.renderPreviewElkDebugOverlay === "function") {
    svg.appendChild(previewElk.renderPreviewElkDebugOverlay({
      ownerDocument: document,
      snapshot: _lastElkSnapshot,
      svgNs: SVG_NS,
    }));
  }
}

function refreshElkDebugOverlay() {
  refreshElkViewMode();
}

window.__DG_setElkDebugOverlay = function (enabled) {
  window.__DG_elkDebugOverlay = !!enabled;
  refreshElkViewMode();
};

window.__DG_setElkRawView = function (enabled) {
  window.__DG_elkRawView = !!enabled;
  refreshElkViewMode();
};

window.__DG_elkDebugOverlay = window.__DG_elkDebugOverlay === true;
window.__DG_elkRawView = window.__DG_elkRawView === true;

/** HarfBuzz-backed text adapter for authoritative browser measurement. */
let _textAdapter = null;
let _textAdapterError = null;

function _textAdapterBackend() {
  return _textAdapter && typeof _textAdapter.measurementBackend === "string"
    ? _textAdapter.measurementBackend
    : null;
}

function _hasAuthoritativeTextAdapter() {
  return _textAdapterBackend() === "harfbuzz";
}

/** Test-only override for deterministic local-unready coverage. */
let _localRelayoutOverrideMode = "auto";

function _normaliseLocalRelayoutOverrideMode(mode) {
  return mode === "unready" ? "unready" : "auto";
}

function setLocalRelayoutOverrideMode(mode) {
  _localRelayoutOverrideMode = _normaliseLocalRelayoutOverrideMode(mode);
  return getLocalRelayoutStatus();
}

function getLocalRelayoutStatus() {
  const overrideMode = _normaliseLocalRelayoutOverrideMode(_localRelayoutOverrideMode);
  const frameTreeLoaded = !!_frameTreeJson || !!_previewDocumentJson;
  const textAdapterReady = !!_textAdapter;
  const textAdapterBackend = _textAdapterBackend();
  const textAdapterError = _textAdapterError;

  if (overrideMode === "unready") {
    return {
      ready: false,
      reason: "forced-unready",
      overrideMode,
      frameTreeLoaded,
      textAdapterReady,
      textAdapterBackend,
      textAdapterError,
    };
  }
  if (!frameTreeLoaded) {
    return {
      ready: false,
      reason: "missing-frame-tree",
      overrideMode,
      frameTreeLoaded,
      textAdapterReady,
      textAdapterBackend,
      textAdapterError,
    };
  }
  if (textAdapterError) {
    return {
      ready: false,
      reason: "text-adapter-init-failed",
      overrideMode,
      frameTreeLoaded,
      textAdapterReady,
      textAdapterBackend,
      textAdapterError,
    };
  }
  if (!textAdapterReady) {
    return {
      ready: false,
      reason: "missing-text-adapter",
      overrideMode,
      frameTreeLoaded,
      textAdapterReady,
      textAdapterBackend,
      textAdapterError,
    };
  }
  if (!_hasAuthoritativeTextAdapter()) {
    return {
      ready: false,
      reason: "non-harfbuzz-text-adapter",
      overrideMode,
      frameTreeLoaded,
      textAdapterReady,
      textAdapterBackend,
      textAdapterError,
    };
  }
  return {
    ready: true,
    reason: "ready",
    overrideMode,
    frameTreeLoaded,
    textAdapterReady,
    textAdapterBackend,
    textAdapterError,
  };
}

function isLocalRelayoutReady() {
  return getLocalRelayoutStatus().ready;
}

function getFrameTreeJson() {
  return _frameTreeJson ? JSON.parse(JSON.stringify(_frameTreeJson)) : null;
}

function getPreviewDocumentJson() {
  return _previewDocumentJson ? JSON.parse(JSON.stringify(_previewDocumentJson)) : null;
}

function _isElkLayeredDiagramJson(json) {
  if (json && json.layoutEngine === "elk-layered") return true;
  const cfg = window.__DG_CONFIG || {};
  return cfg.layout_engine === "elk-layered";
}

function _resolveElkOptionOverrides(diagram, model) {
  const fromYaml = (diagram && diagram.elkLayout) || {};
  let session = (model && model.elkLayoutOverrides) || {};
  // Model is updated on every sidebar input — prefer it over DOM reads so load/reload
  // cannot clobber saved YAML with stale server-rendered sidebar HTML.
  if (Object.keys(session).length === 0
    && window.ElkLayoutControls
    && typeof ElkLayoutControls.collectOverrides === "function") {
    session = ElkLayoutControls.collectOverrides();
    if (model) {
      model.elkLayoutOverrides = { ...session };
    }
  }
  return { ...fromYaml, ...session };
}

function setFrameTreeJson(json) {
  _frameTreeJson = json ? JSON.parse(JSON.stringify(json)) : null;
}

/**
 * Remove frames (and subtrees) from a frame-tree JSON object (mutates in place).
 * @param {object} treeJson
 * @param {string[]} frameIds  Top-level ids to remove (ancestors win over descendants).
 * @returns {string[]} ids actually removed from the tree
 */
function applyFrameTreeRemovalsToJson(treeJson, frameIds) {
  if (!treeJson || !treeJson.root || !frameIds || frameIds.length === 0) return [];
  const rootId = treeJson.root && treeJson.root.id;
  const requested = [...new Set(frameIds.filter(id => id && id !== rootId))];
  if (requested.length === 0) return [];

  const removed = new Set();
  function collectDescendants(node) {
    if (!node || typeof node !== "object") return;
    if (node.id) removed.add(node.id);
    for (const child of node.children || []) collectDescendants(child);
  }
  function findNode(node, id) {
    if (!node) return null;
    if (node.id === id) return node;
    for (const child of node.children || []) {
      const hit = findNode(child, id);
      if (hit) return hit;
    }
    return null;
  }
  function pruneChildren(children) {
    if (!Array.isArray(children)) return [];
    const next = [];
    for (const child of children) {
      if (!child || typeof child !== "object") continue;
      if (requested.includes(child.id)) {
        collectDescendants(child);
        continue;
      }
      child.children = pruneChildren(child.children);
      next.push(child);
    }
    return next;
  }

  for (const id of requested) {
    const node = findNode(treeJson.root, id);
    if (node) collectDescendants(node);
  }
  treeJson.root.children = pruneChildren(treeJson.root.children);
  if (Array.isArray(treeJson.arrows)) {
    treeJson.arrows = treeJson.arrows.filter(
      a => a && !removed.has(a.source) && !removed.has(a.target),
    );
  }
  return [...removed];
}

/** @deprecated Prefer session-only removals via model.removedIds; mutates canonical cache. */
function applyFrameTreeRemovals(frameIds) {
  if (!_frameTreeJson) return [];
  return applyFrameTreeRemovalsToJson(_frameTreeJson, frameIds);
}

function applySessionRemovalsToDiagramJson(diagramJson, model) {
  if (!diagramJson || !model || !model.removedIds || model.removedIds.size === 0) return;
  const topIds = typeof model.topLevelRemovalIds === "function"
    ? model.topLevelRemovalIds()
    : [...model.removedIds];
  applyFrameTreeRemovalsToJson(diagramJson, topIds);
}

/**
 * Load the frame tree from the server and create the text adapter.
 * Call once during editor initialization.
 */
async function initLayoutBridge(slug) {
  _previewDocumentJson = null;
  _frameTreeJson = null;
  _textAdapter = null;
  _textAdapterError = null;
  try {
    const resp = await fetch("/api/preview-document/" + slug + "?t=" + Date.now(), { cache: "no-store" });
    if (resp.ok) {
      _previewDocumentJson = await resp.json();
      _frameTreeJson = _previewDocumentJson && _previewDocumentJson.kind === "frame-diagram"
        ? JSON.parse(JSON.stringify(_previewDocumentJson.frameTree || null))
        : null;
    }
  } catch (e) {
    console.warn("layout-bridge: failed to load preview document", e);
  }

  try {
    const hbModule = await import("/preview/layout-engine-harfbuzz.js");
    _textAdapter = await hbModule.createDefaultHarfBuzzTextAdapter({
      fontUrl: "/preview/layout-font.ttf",
    });
    if (!_hasAuthoritativeTextAdapter()) {
      throw new Error(
        "layout-bridge requires a HarfBuzz text adapter, got "
        + String(_textAdapterBackend() || "unknown"),
      );
    }
  } catch (e) {
    _textAdapter = null;
    _textAdapterError = e && e.message ? String(e.message) : String(e);
    console.error("layout-bridge: failed to initialize HarfBuzz text adapter", e);
  }
}

/**
 * Perform layout locally and patch the SVG DOM.
 * Returns { coerced, width, height } or null on failure.
 *
 * This replaces requestV3Relayout() — no server round-trip needed.
 *
 * @param {object} opts
 * @param {boolean} [opts.skipModelUpdate] - When true, the component model
 *   is NOT updated after patching the SVG.  Used during live drag/resize so
 *   snap calculations keep referencing the original positions.
 */
function _layoutOptionsFromDiagram(diagram) {
  return {
    gridCols: diagram.gridCols,
    gridColGap: diagram.gridColGap,
    gridOuterMargin: diagram.gridOuterMargin,
    arrows: diagram.arrows,
  };
}

function performLocalRelayout(model, overrides, gridOverrides, opts) {
  const readiness = getLocalRelayoutStatus();
  if (!readiness.ready) {
    console.warn("layout-bridge: not ready (" + readiness.reason + ")");
    return null;
  }

  try {
    // Deep-clone the stored frame tree and deserialize
    const diagramJson = JSON.parse(JSON.stringify(_frameTreeJson));
    applySessionRemovalsToDiagramJson(diagramJson, model);
    if (_isElkLayeredDiagramJson(diagramJson)) {
      console.warn("layout-bridge: performLocalRelayout skipped for elk-layered diagram");
      return null;
    }
    const diagram = deserializeFrameDiagram(diagramJson);

    // Build override map (same format as requestV3Relayout sends)
    const allFrameOverrides = _collectRelayoutFrameOverrides(overrides);

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

    // Resolve styles before layout so typography-affecting mutations
    // (for example section small-caps headings) participate in measure/place,
    // matching the Python pipeline's resolve_styles() -> layout ordering.
    previewCoreContract().resolveStyles(diagram.root);

    // Run layout
    const result = previewCoreContract().layoutFrameTree(diagram.root, _textAdapter, _layoutOptionsFromDiagram(diagram));

    // Collect new bounds
    const newBounds = collectPlacedBounds(diagram.root, {});
    const framesById = collectFramesById(diagram.root, {});

    // Patch SVG DOM
    const svgEl = document.querySelector("#stage svg");
    patchSvgFromLayout(svgEl, oldBounds, newBounds, framesById);

    // Route and patch arrows
    let routedArrows = [];
    if (diagram.arrows && diagram.arrows.length > 0) {
      routedArrows = routeArrows(diagram.arrows, newBounds);
      patchArrowsSvg(svgEl, routedArrows, newBounds);
    }

    // Update component model (skip during live resize to keep snap stable)
    if (!opts || !opts.skipModelUpdate) {
      updateComponentModelFromLayout(model, diagram.root);
      syncArrowsInModel(model, diagram.arrows, routedArrows);
    }

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

/**
 * Full ELK relayout + SVG replace (async). Used when ELK params or frame overrides change.
 */
async function performElkRelayout(model, overrides, gridOverrides) {
  const readiness = getLocalRelayoutStatus();
  if (!readiness.ready) {
    console.warn("layout-bridge: not ready (" + readiness.reason + ")");
    return null;
  }
  try {
    const hasGridOverrides = gridOverrides && Object.keys(gridOverrides).length > 0;
    const renderResult = await renderFreshSvg(
      overrides,
      hasGridOverrides ? gridOverrides : null,
      model,
    );
    if (!renderResult || !renderResult.svg) return null;
    const stage = document.getElementById("stage");
    if (!stage) return null;
    stage.replaceChildren(renderResult.svg);
    fitSvgToRenderedContent(renderResult.svg, {
      minWidth: renderResult.width,
      minHeight: renderResult.height,
    });
    return {
      coerced: renderResult.coerced,
      width: renderResult.width,
      height: renderResult.height,
    };
  } catch (e) {
    console.error("layout-bridge: ELK relayout failed", e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Arrow SVG creation (T007–T008)
// ---------------------------------------------------------------------------

function _arrowheadPoints(tipX, tipY, prevX, prevY, headLen, headHalf) {
  const dx = tipX - prevX;
  const dy = tipY - prevY;
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;
  const scale = Math.min(1, length / headLen);
  const scaledHeadLen = headLen * scale;
  const scaledHeadHalf = headHalf * scale;
  const ux = dx / length;
  const uy = dy / length;
  const bx = tipX - ux * scaledHeadLen;
  const by = tipY - uy * scaledHeadLen;
  const nx = -uy * scaledHeadHalf;
  const ny = ux * scaledHeadHalf;
  return {
    base: [bx, by],
    points: `${(bx + nx).toFixed(1)},${(by + ny).toFixed(1)} ${tipX.toFixed(1)},${tipY.toFixed(1)} ${(bx - nx).toFixed(1)},${(by - ny).toFixed(1)}`,
  };
}

function createArrowsSvg(routedArrows, boundsMap) {
  const frag = document.createDocumentFragment();
  const HL = (window.__DG_CONFIG && window.__DG_CONFIG.head_len) || 12;
  const HH = (window.__DG_CONFIG && window.__DG_CONFIG.head_half) || 6;

  for (const arrow of routedArrows) {
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("data-dg-arrow", "true");
    if (arrow.componentId) {
      g.setAttribute("data-component-id", arrow.componentId);
    }
    const points = [arrow.start, ...arrow.waypoints, arrow.end];
    if (points.length < 2) continue;

    // Compute arrowhead so shaft ends at the base
    const [tx, ty] = points[points.length - 1];
    const [px, py] = points[points.length - 2];
    const head = _arrowheadPoints(tx, ty, px, py, HL, HH);
    const shaftPoints = points.slice();
    if (head) {
      shaftPoints[shaftPoints.length - 1] = head.base;
    }

    const color = arrow.color || "#E95420";
    // Shaft segments + transparent hit areas (editor selection / knee insert)
    for (let i = 0; i < shaftPoints.length - 1; i++) {
      const x1 = shaftPoints[i][0];
      const y1 = shaftPoints[i][1];
      const x2 = shaftPoints[i + 1][0];
      const y2 = shaftPoints[i + 1][1];
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", x1.toFixed(1));
      line.setAttribute("y1", y1.toFixed(1));
      line.setAttribute("x2", x2.toFixed(1));
      line.setAttribute("y2", y2.toFixed(1));
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", color);
      line.setAttribute("stroke-width", "1");
      line.setAttribute("stroke-miterlimit", "10");
      g.appendChild(line);

      const hit = document.createElementNS(SVG_NS, "line");
      hit.setAttribute("x1", x1.toFixed(1));
      hit.setAttribute("y1", y1.toFixed(1));
      hit.setAttribute("x2", x2.toFixed(1));
      hit.setAttribute("y2", y2.toFixed(1));
      hit.setAttribute("stroke", "transparent");
      hit.setAttribute("stroke-width", "12");
      hit.style.pointerEvents = "stroke";
      g.appendChild(hit);
    }

    // Arrowhead polygon
    if (head) {
      const polygon = document.createElementNS(SVG_NS, "polygon");
      polygon.setAttribute("points", head.points);
      polygon.setAttribute("fill", color);
      g.appendChild(polygon);
    }

    // Step label on longest shaft segment — annotation typography, offset from line.
    const labelGap = arrow.labelGap ?? previewCoreContract().GRID_GUTTER ?? 24;
    const labelEl = _buildArrowLabelElement(arrow, shaftPoints, labelGap, boundsMap);
    if (labelEl) {
      g.appendChild(labelEl);
    }

    frag.appendChild(g);
  }
  return frag;
}

// ---------------------------------------------------------------------------
// Overlay SVG rendering (T009)
// ---------------------------------------------------------------------------

function renderFrameTreeToSvg(diagram, result, options) {
  const previewBridgeRender = previewBridgeRenderContract();
  if (typeof previewBridgeRender.renderPreviewFrameTreeToSvg !== "function") {
    throw new Error("layout-bridge: previewBridge.render.renderPreviewFrameTreeToSvg is unavailable");
  }
  return previewBridgeRender.renderPreviewFrameTreeToSvg({
    ownerDocument: document,
    diagram,
    result,
    textAdapter: _textAdapter,
    iconElements: options && options.iconElements,
    overlays: options && options.overlays,
  });
}

async function renderFreshSvg(overrides, gridOverrides, model) {
  const previewBridgeRender = previewBridgeRenderContract();
  if (typeof previewBridgeRender.renderFreshPreviewSvg !== "function") {
    throw new Error("layout-bridge: previewBridge.render.renderFreshPreviewSvg is unavailable");
  }
  const renderResult = await previewBridgeRender.renderFreshPreviewSvg({
    ownerDocument: document,
    previewDocumentJson: _previewDocumentJson,
    frameTreeJson: _frameTreeJson,
    overrides: overrides || {},
    gridOverrides: gridOverrides || null,
    model,
    textAdapter: _textAdapter,
    applySessionRemovalsToDiagramJson,
    applyOverridesToFrameTree,
    collectRelayoutFrameOverrides: _collectRelayoutFrameOverrides,
    isElkLayeredDiagramJson: _isElkLayeredDiagramJson,
    resolveElkOptionOverrides: _resolveElkOptionOverrides,
    updateModelFromLayout: updateComponentModelFromLayout,
    syncArrowsInModel,
  });
  _lastElkSnapshot = renderResult.elkSnapshot || null;
  _lastElkFrameLabels = renderResult.elkFrameLabels || null;
  refreshElkViewMode();
  return {
    svg: renderResult.svg,
    width: renderResult.width,
    height: renderResult.height,
    coerced: renderResult.coerced,
  };
}

window.isLocalRelayoutReady = isLocalRelayoutReady;
window.getLocalRelayoutStatus = getLocalRelayoutStatus;
window.__DG_TEST_setLocalRelayoutMode = setLocalRelayoutOverrideMode;
window.__DG_previewBridgeRenderHost = {
  renderPreviewFrameTreeToSvg: (options) => renderFrameTreeToSvg(
    options && options.diagram,
    options && options.result,
    options,
  ),
  renderFreshPreviewSvg: (options) => renderFreshSvg(
    options && options.overrides,
    options && options.gridOverrides,
    options && options.model,
  ),
};
window.renderFrameTreeToSvg = renderFrameTreeToSvg;
window.refreshElkDebugOverlay = refreshElkDebugOverlay;
window.refreshElkViewMode = refreshElkViewMode;
window.renderFreshSvg = renderFreshSvg;
window.arrowComponentId = arrowComponentId;
window.syncArrowsInModel = syncArrowsInModel;
window.getLayoutTextAdapter = () => _textAdapter;
window.getPreviewDocumentJson = getPreviewDocumentJson;
window.getFrameTreeJson = getFrameTreeJson;
window.setFrameTreeJson = setFrameTreeJson;
window.applyFrameTreeRemovals = applyFrameTreeRemovals;
window.applyFrameTreeRemovalsToJson = applyFrameTreeRemovalsToJson;
window.applySessionRemovalsToDiagramJson = applySessionRemovalsToDiagramJson;
