/**
 * ELK layered layout controls — Baseline Foundry sidebar panel.
 * Uses LayoutEngine.ELK_LAYERED_PARAM_SPECS when available; embedded fallback otherwise.
 */
(function () {
  "use strict";

  const SECTION_ID = "elk-layout-section";
  const CONTAINER_ID = "elk-layout-controls";

  /** Mirror of packages/graph-layout-elk/src/elk-param-registry.ts (fallback when bundle is stale). */
  const FALLBACK_PARAM_SPECS = [
    { key: "elk.direction", label: "Direction", group: "Graph", kind: "enum", defaultValue: "DOWN",
      enumValues: [
        { value: "DOWN", label: "Top → bottom (TB)" },
        { value: "RIGHT", label: "Left → right (LR)" },
        { value: "UP", label: "Bottom → top" },
        { value: "LEFT", label: "Right → left" },
      ] },
    { key: "elk.layered.spacing.nodeNodeBetweenLayers", label: "Layer gap", group: "Spacing", kind: "number", defaultValue: "144", min: 8, max: 512, step: 8,
      description: "Vertical gap between layers — main control for arrow length (TB)." },
    { key: "elk.spacing.nodeNode", label: "Same-layer gap", group: "Spacing", kind: "number", defaultValue: "48", min: 8, max: 256, step: 8 },
    { key: "elk.spacing.edgeNode", label: "Edge ↔ node", group: "Spacing", kind: "number", defaultValue: "56", min: 0, max: 128, step: 4,
      description: "Clearance between edges and boxes — helps keep labels off nodes." },
    { key: "elk.spacing.edgeEdge", label: "Edge ↔ edge", group: "Spacing", kind: "number", defaultValue: "48", min: 0, max: 128, step: 4 },
    { key: "elk.layered.spacing.edgeEdgeBetweenLayers", label: "Edge gap (layers)", group: "Spacing", kind: "number", defaultValue: "40", min: 0, max: 128, step: 4 },
    { key: "elk.edgeRouting", label: "Edge routing", group: "Edges", kind: "enum", defaultValue: "ORTHOGONAL",
      enumValues: [
        { value: "ORTHOGONAL", label: "Orthogonal" },
        { value: "POLYLINE", label: "Polyline" },
        { value: "SPLINES", label: "Splines" },
      ] },
    { key: "elk.layered.unnecessaryBendpoints", label: "Remove extra bends", group: "Edges", kind: "boolean", defaultValue: "true" },
    { key: "elk.layered.nodePlacement.favorStraightEdges", label: "Favor straight edges", group: "Edges", kind: "boolean", defaultValue: "true" },
    { key: "elk.layered.layering.strategy", label: "Layering strategy", group: "Layering", kind: "enum", defaultValue: "NETWORK_SIMPLEX",
      enumValues: [
        { value: "NETWORK_SIMPLEX", label: "Network simplex" },
        { value: "LONGEST_PATH", label: "Longest path" },
        { value: "INTERACTIVE", label: "Interactive" },
      ] },
    { key: "elk.layered.crossingMinimization.strategy", label: "Crossing minimization", group: "Layering", kind: "enum", defaultValue: "LAYER_SWEEP",
      enumValues: [
        { value: "LAYER_SWEEP", label: "Layer sweep" },
        { value: "INTERACTIVE", label: "Interactive" },
      ] },
    { key: "elk.layered.nodePlacement.strategy", label: "Node placement", group: "Layering", kind: "enum", defaultValue: "NETWORK_SIMPLEX",
      enumValues: [
        { value: "NETWORK_SIMPLEX", label: "Network simplex" },
        { value: "BRANDES_KOEPF", label: "Brandes-Köpf" },
        { value: "LINEAR_SEGMENTS", label: "Linear segments" },
        { value: "SIMPLE", label: "Simple" },
      ] },
    { key: "elk.hierarchyHandling", label: "Hierarchy handling", group: "Compound", kind: "enum", defaultValue: "INCLUDE_CHILDREN",
      enumValues: [
        { value: "INCLUDE_CHILDREN", label: "Include children" },
        { value: "SEPARATE_CHILDREN", label: "Separate children" },
        { value: "CHILDREN_ON", label: "Children on" },
      ] },
    { key: "elk.portConstraints", label: "Port constraints", group: "Compound", kind: "enum", defaultValue: "FREE",
      enumValues: [
        { value: "FREE", label: "Free" },
        { value: "FIXED_SIDE", label: "Fixed side" },
        { value: "FIXED_ORDER", label: "Fixed order" },
        { value: "FIXED_RATIO", label: "Fixed ratio" },
      ] },
    { key: "elk.padding", label: "Compound padding", group: "Compound", kind: "text", defaultValue: "[top=32,left=8,bottom=8,right=8]" },
  ];

  let _relayoutTimer = null;
  let _getOverrides = () => ({});
  let _setOverrides = () => {};

  function _isElkDiagram(frameTreeJson) {
    if (frameTreeJson && frameTreeJson.layoutEngine === "elk-layered") return true;
    const cfg = window.__DG_CONFIG || {};
    if (cfg.layout_engine === "elk-layered") return true;
    const section = document.getElementById(SECTION_ID);
    if (section && !section.hasAttribute("hidden")) return true;
    return false;
  }

  function _containerHasPlaceholder(container) {
    return /%ELK_LAYOUT_CONTROLS_HTML%/.test(container.innerHTML);
  }

  function _paramSpecs() {
    if (typeof LayoutEngine !== "undefined" && Array.isArray(LayoutEngine.ELK_LAYERED_PARAM_SPECS)) {
      return LayoutEngine.ELK_LAYERED_PARAM_SPECS;
    }
    return FALLBACK_PARAM_SPECS;
  }

  function _slugToFamily(diagramType) {
    const t = String(diagramType || "process_and_workflow");
    if (t === "data_flow_and_integration" || t === "deployment_and_runtime_topology" || t === "process_and_workflow") {
      return t;
    }
    return "process_and_workflow";
  }

  function _resolvedValues(family, overrides) {
    if (typeof LayoutEngine !== "undefined" && typeof LayoutEngine.resolvedElkOptionsForFamily === "function") {
      return LayoutEngine.resolvedElkOptionsForFamily(family, overrides);
    }
    const resolved = {};
    for (const spec of _paramSpecs()) {
      resolved[spec.key] = spec.defaultValue;
    }
    return { ...resolved, ...overrides };
  }

  function _groups() {
    if (typeof LayoutEngine !== "undefined" && typeof LayoutEngine.elkParamGroups === "function") {
      const fromBundle = LayoutEngine.elkParamGroups();
      if (fromBundle && fromBundle.length) return fromBundle;
    }
    const buckets = new Map();
    for (const spec of _paramSpecs()) {
      const list = buckets.get(spec.group) || [];
      list.push(spec);
      buckets.set(spec.group, list);
    }
    const order = ["Graph", "Spacing", "Edges", "Layering", "Compound"];
    return order.filter((g) => buckets.has(g)).map((group) => ({ group, specs: buckets.get(group) }));
  }

  function _controlId(spec) {
    return "elk-" + spec.key.replace(/\./g, "-");
  }

  function _fieldHtml(spec, value) {
    const id = _controlId(spec);
    const title = spec.description ? ` title="${spec.description.replace(/"/g, "&quot;")}"` : "";
    if (spec.kind === "boolean") {
      const checked = value === "true" || value === true;
      return (
        `<label class="bf-switch is-full-span"${title}>` +
        `<input class="bf-switch-input" type="checkbox" id="${id}" data-elk-key="${spec.key}"${checked ? " checked" : ""}>` +
        `<span class="bf-switch-slider"></span>` +
        `<span class="bf-switch-label">${spec.label}</span>` +
        `</label>`
      );
    }
    if (spec.kind === "enum" && spec.enumValues && spec.enumValues.length) {
      const opts = spec.enumValues
        .map((ev) => `<option value="${ev.value}"${ev.value === value ? " selected" : ""}>${ev.label}</option>`)
        .join("");
      return (
        `<label class="bf-field dg-grid-field is-full-span"${title}>` +
        `<span class="bf-form-label">${spec.label}</span>` +
        `<span class="bf-control dg-grid-control">` +
        `<select class="bf-input" id="${id}" data-elk-key="${spec.key}">${opts}</select>` +
        `</span></label>`
      );
    }
    const step = spec.step != null ? ` step="${spec.step}"` : "";
    const min = spec.min != null ? ` min="${spec.min}"` : "";
    const max = spec.max != null ? ` max="${spec.max}"` : "";
    const unit = spec.kind === "number" ? `<span class="dg-grid-unit">px</span>` : "";
    const type = spec.kind === "number" ? "number" : "text";
    return (
      `<label class="bf-field dg-grid-field is-full-span"${title}>` +
      `<span class="bf-form-label">${spec.label}</span>` +
      `<span class="bf-control dg-grid-control">` +
      `<input class="bf-input dg-number-input" type="${type}" id="${id}" data-elk-key="${spec.key}"` +
      ` value="${String(value ?? spec.defaultValue).replace(/"/g, "&quot;")}"${step}${min}${max}>` +
      `${unit}</span></label>`
    );
  }

  function _readControlValue(el, spec) {
    if (spec.kind === "boolean") return el.checked ? "true" : "false";
    return String(el.value ?? "").trim();
  }

  function _collectOverridesFromDom() {
    const next = {};
    for (const spec of _paramSpecs()) {
      const el = document.getElementById(_controlId(spec));
      if (!el) continue;
      next[spec.key] = _readControlValue(el, spec);
    }
    return next;
  }

  function _ensureInit() {
    if (typeof window.__DG_ensureElkControlsInit === "function") {
      window.__DG_ensureElkControlsInit();
    }
  }

  function collectOverrides() {
    _ensureInit();
    return _collectOverridesFromDom();
  }

  function _onControlInput() {
    if (!window.__DG_elkControlsInited) _ensureInit();
    const next = _collectOverridesFromDom();
    _setOverrides(next);
    if (typeof window.__DG_applyElkLayoutOverrides === "function") {
      window.__DG_applyElkLayoutOverrides(next);
    }
    if (typeof window.setDirty === "function") window.setDirty(true);
    if (_relayoutTimer) clearTimeout(_relayoutTimer);
    _relayoutTimer = setTimeout(() => {
      if (typeof window.requestElkRelayout === "function") {
        window.requestElkRelayout();
      } else if (typeof window.requestV3Relayout === "function") {
        const rootId = (window.componentTree && window.componentTree[0] && window.componentTree[0].id) || "root";
        window.requestV3Relayout(rootId);
      }
    }, 250);
  }

  function _bindControls(container) {
    container.querySelectorAll("[data-elk-key]").forEach((el) => {
      if (el.dataset.elkBound === "1") return;
      el.dataset.elkBound = "1";
      el.addEventListener("input", _onControlInput);
      el.addEventListener("change", _onControlInput);
    });
  }

  function _syncExistingControls(container, resolved) {
    const activeId = document.activeElement && document.activeElement.id;
    for (const spec of _paramSpecs()) {
      const id = _controlId(spec);
      const el = document.getElementById(id);
      if (!el) continue;
      // Do not clobber the field the user is actively editing.
      if (activeId && id === activeId) continue;
      const val = resolved[spec.key] ?? spec.defaultValue;
      if (spec.kind === "boolean") {
        el.checked = val === "true" || val === true;
      } else {
        el.value = String(val);
      }
    }
    _bindControls(container);
  }

  function buildPanel(frameTreeJson) {
    const section = document.getElementById(SECTION_ID);
    const container = document.getElementById(CONTAINER_ID);
    if (!section || !container) return;

    const isElk = _isElkDiagram(frameTreeJson);
    section.hidden = !isElk;
    if (!isElk) {
      return;
    }

    if (_containerHasPlaceholder(container)) {
      container.textContent = "";
    }

    const family = _slugToFamily(frameTreeJson && frameTreeJson.diagramType);
    const session = _getOverrides() || {};
    const yamlElk = (frameTreeJson && frameTreeJson.elkLayout) || {};
    const merged = { ...yamlElk, ...session };
    const resolved = _resolvedValues(family, merged);

    if (container.querySelector("[data-elk-key]")) {
      _syncExistingControls(container, resolved);
      _bindElkViewToggles(section);
      return;
    }

    const parts = [];
    if (typeof LayoutEngine === "undefined") {
      parts.push('<p class="bf-form-help">Layout engine bundle not loaded.</p>');
    } else if (!LayoutEngine.ELK_LAYERED_PARAM_SPECS && !LayoutEngine.resolvedElkOptionsForFamily) {
      parts.push(
        '<p class="bf-form-help">Using embedded ELK defaults. Run ' +
        '<code>npm run build:browser</code> in packages/layout-engine for live resolved values.</p>',
      );
    }
    for (const { group, specs } of _groups()) {
      parts.push(`<h3 class="dg-section-subheading bf-h6">${group}</h3>`);
      parts.push('<div class="grid-controls">');
      for (const spec of specs) {
        parts.push(_fieldHtml(spec, resolved[spec.key] ?? spec.defaultValue));
      }
      parts.push("</div>");
    }
    container.innerHTML = parts.join("");
    _bindControls(container);
    _bindElkViewToggles(section);
  }

  function _bindElkViewToggles(section) {
    const rawToggle = section.querySelector("#elk-raw-view-toggle");
    if (rawToggle && rawToggle.dataset.elkBound !== "1") {
      rawToggle.dataset.elkBound = "1";
      rawToggle.checked = !!window.__DG_elkRawView;
      rawToggle.addEventListener("change", () => {
        if (typeof window.__DG_setElkRawView === "function") {
          window.__DG_setElkRawView(rawToggle.checked);
        }
      });
    }

    const debugToggle = section.querySelector("#elk-debug-overlay-toggle");
    if (debugToggle && debugToggle.dataset.elkBound !== "1") {
      debugToggle.dataset.elkBound = "1";
      debugToggle.checked = !!window.__DG_elkDebugOverlay;
      debugToggle.addEventListener("change", () => {
        if (typeof window.__DG_setElkDebugOverlay === "function") {
          window.__DG_setElkDebugOverlay(debugToggle.checked);
        }
      });
    }
  }

  function init(options) {
    _getOverrides = (options && options.getOverrides) || (() => ({}));
    _setOverrides = (options && options.setOverrides) || (() => {});
  }

  function refresh() {
    const tree = typeof getFrameTreeJson === "function" ? getFrameTreeJson() : null;
    buildPanel(tree);
  }

  window.ElkLayoutControls = {
    init,
    buildPanel,
    refresh,
    collectOverrides,
  };

  window.addEventListener("dg-diagram-loaded", refresh);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }
})();
