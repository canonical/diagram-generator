import path from "node:path";
import { createRequire } from "node:module";
import { EOL } from "node:os";

import {
  PERSIST_ARROW_KEYS,
  PERSIST_FRAME_KEYS,
  PERSIST_INT_FRAME_KEYS,
  PERSIST_LOWER_FRAME_KEYS,
  UNSUPPORTED_PERSIST_FRAME_KEYS,
  canonicalPreviewLayoutEngineKey,
  canonicalPreviewPersistNamespace,
  migrateLegacyPreviewEngineNodeBucketsForNamespace,
  migrateLegacyPreviewEngineOverridesForNamespace,
  parsePreviewArrowComponentId,
  resolvePreviewArrowComponentId,
} from "@diagram-generator/layout-engine";
import {
  getFrameYamlEngineLayoutNamespace,
  isFrameYamlEngineLayoutNodeNamespace,
  sanitizeSupportedFrameYamlEngineLayoutNodeBuckets,
  sanitizeSupportedFrameYamlEngineLayoutOverrides,
} from "./frame-engine-layout-namespaces.js";

const require = createRequire(import.meta.url);
const yaml = require("yaml") as {
  parse: (raw: string) => unknown;
  stringify: (value: unknown, options?: Record<string, unknown>) => string;
};

// Keep these semantics aligned with the preview-shell style contract so a
// picker-applied variant persists and reloads as the same authored box class.
const STYLE_SEMANTICS: Record<string, { level: number | null; fill: string; border: string }> = {
  default: { level: 1, fill: "white", border: "solid" },
  parent: { level: 2, fill: "grey", border: "solid" },
  section: { level: 3, fill: "white", border: "solid" },
  annotation: { level: null, fill: "white", border: "none" },
  highlight: { level: null, fill: "black", border: "solid" },
};

const SUPPORTED_FRAME_KEYS = new Set<string>(PERSIST_FRAME_KEYS);
const UNSUPPORTED_FRAME_KEYS = new Set<string>(UNSUPPORTED_PERSIST_FRAME_KEYS);
const SUPPORTED_GRID_KEYS = new Set(["cols", "col_gap", "row_gap", "outer_margin"]);
const IGNORED_GRID_KEYS = new Set(["link_to_root"]);
const UNSUPPORTED_GRID_KEYS = new Set(["rows", "slack_absorption"]);
const LOWER_KEYS = new Set<string>(PERSIST_LOWER_FRAME_KEYS);
const INT_KEYS = new Set<string>(PERSIST_INT_FRAME_KEYS);
const SUPPORTED_ARROW_KEYS = new Set<string>(PERSIST_ARROW_KEYS);
const ARROW_SHORTHAND_PATTERN = /^\s*(.+?)\s*->\s*(.+?)\s*$/;

export interface PersistOverridePayload {
  overrides?: Record<string, unknown>;
  removed_ids?: unknown[];
  grid_overrides?: Record<string, unknown>;
  /**
   * Namespaced engine-backed overrides keyed by preview-control persistNamespace.
   * Frame YAML supports registered namespaces such as `meta.elk` and `meta.dagre`.
   */
  engine_layout_overrides?: Record<string, Record<string, unknown>>;
  /** @deprecated Prefer `engine_layout_overrides["meta.elk"]`. */
  elk_layout_overrides?: Record<string, unknown>;
  /**
   * Canonical layout engine key to persist (spec 035).
   * Stored as `meta.layout_engine` in the frame YAML.
   * Set to null to clear the layout engine choice.
   */
  layout_engine?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function metaKeyFromNamespace(namespace: string): string {
  return namespace.startsWith("meta.") ? namespace.slice("meta.".length) : namespace;
}

function migrateLegacyDocumentMeta(document: Record<string, unknown>): void {
  const meta = isRecord(document.meta) ? document.meta : null;
  if (!meta) {
    return;
  }

  const migratedMeta: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (key === "layout_engine") {
      const canonicalLayoutEngine = canonicalPreviewLayoutEngineKey(
        typeof value === "string" ? value : null,
      );
      if (canonicalLayoutEngine) {
        migratedMeta.layout_engine = canonicalLayoutEngine;
      }
      continue;
    }
    if (!isRecord(value)) {
      migratedMeta[key] = value;
      continue;
    }

    const namespace = `meta.${key}`;
    if (isFrameYamlEngineLayoutNodeNamespace(namespace)) {
      const migrated = migrateLegacyPreviewEngineNodeBucketsForNamespace(namespace, value);
      if (!migrated || Object.keys(migrated.buckets).length === 0) {
        continue;
      }
      const metaKey = metaKeyFromNamespace(migrated.namespace);
      migratedMeta[metaKey] = {
        ...(isRecord(migratedMeta[metaKey]) ? migratedMeta[metaKey] : {}),
        ...migrated.buckets,
      };
      continue;
    }

    const migrated = migrateLegacyPreviewEngineOverridesForNamespace(namespace, value);
    if (!migrated || Object.keys(migrated.overrides).length === 0) {
      continue;
    }
    const metaKey = metaKeyFromNamespace(migrated.namespace);
    migratedMeta[metaKey] = {
      ...(isRecord(migratedMeta[metaKey]) ? migratedMeta[metaKey] : {}),
      ...migrated.overrides,
    };
  }

  if (Object.keys(migratedMeta).length > 0) {
    document.meta = migratedMeta;
  } else {
    delete document.meta;
  }
}

function normalizeStyleName(styleName: unknown): string | null {
  if (typeof styleName !== "string") return null;
  const canonical = styleName.trim();
  return canonical.length > 0 ? canonical : null;
}

function styleSemantics(styleName: unknown): Record<string, unknown> | null {
  const canonical = normalizeStyleName(styleName);
  if (!canonical) return null;
  const semantic = STYLE_SEMANTICS[canonical];
  if (!semantic) return null;
  return { ...semantic, style: canonical };
}

function coerceInt(value: unknown, fieldName: string): number {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return numeric;
}

function coerceFloat(value: unknown, fieldName: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`${fieldName} must be numeric`);
  }
  return numeric;
}

function yamlAlign(value: unknown): string {
  if (typeof value !== "string") throw new Error("align must be a string");
  return value.trim().toLowerCase().replaceAll("_", "-");
}

function yamlTextScalar(existing: unknown, text: string): unknown {
  if (isRecord(existing)) {
    return { text };
  }
  return text;
}

function updateTextFields(frameData: Record<string, unknown>, textOverride: unknown): void {
  if (!isRecord(textOverride)) {
    throw new Error("text override must be an object");
  }
  if ("heading" in textOverride) {
    const heading = textOverride.heading;
    if (heading == null || heading === "") {
      delete frameData.heading;
    } else if (typeof heading !== "string") {
      throw new Error("text.heading must be a string");
    } else {
      frameData.heading = yamlTextScalar(frameData.heading, heading);
    }
  }
  if ("label" in textOverride) {
    const label = textOverride.label;
    if (!Array.isArray(label) || label.some((line) => typeof line !== "string")) {
      throw new Error("text.label must be a list of strings");
    }
    const existing = frameData.label;
    const existingLines = Array.isArray(existing) ? existing : existing != null ? [existing] : [];
    frameData.label = label.map((line, index) =>
      yamlTextScalar(index < existingLines.length ? existingLines[index] : null, line),
    );
  }
}

function reorderChildren(frameData: Record<string, unknown>, childOrder: unknown, frameId: string): void {
  if (!Array.isArray(childOrder) || childOrder.some((item) => typeof item !== "string")) {
    throw new Error("children_order must be a list of child ids");
  }
  const children = frameData.children;
  if (!Array.isArray(children)) {
    throw new Error(`${frameId} has no children to reorder`);
  }
  const childMap = new Map<string, Record<string, unknown>>();
  for (const child of children) {
    if (isRecord(child) && typeof child.id === "string") {
      childMap.set(child.id, child);
    }
  }
  const missing = childOrder.filter((childId) => !childMap.has(childId));
  if (missing.length > 0) {
    throw new Error(`${frameId} children_order references unknown child ids: ${missing.join(", ")}`);
  }
  const reordered = childOrder.map((childId) => childMap.get(childId) as Record<string, unknown>);
  const remaining = children.filter(
    (child) => !isRecord(child) || typeof child.id !== "string" || !childOrder.includes(child.id),
  );
  frameData.children = [...reordered, ...remaining];
}

function applyGridOverrides(document: Record<string, unknown>, gridOverrides: unknown): void {
  if (!isRecord(gridOverrides)) {
    throw new Error("grid_overrides must be an object");
  }
  const grid = isRecord(document.grid) ? document.grid : {};
  document.grid = grid;

  for (const key of UNSUPPORTED_GRID_KEYS) {
    if (key in gridOverrides && gridOverrides[key] !== null && gridOverrides[key] !== true) {
      throw new Error(`${key} is not persistable in frame YAML`);
    }
  }
  if ("link_to_root" in gridOverrides && gridOverrides.link_to_root !== null && gridOverrides.link_to_root !== true) {
    throw new Error("link_to_root=false is not persistable in frame YAML");
  }

  const marginKeys = ["margin_top", "margin_right", "margin_bottom", "margin_left"] as const;
  const marginValues = marginKeys.filter((key) => key in gridOverrides).map((key) => gridOverrides[key]);
  if (marginValues.length > 0) {
    const numericMargins = marginValues.map((value) => coerceInt(value, "grid_overrides.margin"));
    if (new Set(numericMargins).size !== 1) {
      throw new Error("per-side grid margins are not persistable in frame YAML; values must be uniform");
    }
    grid.outer_margin = numericMargins[0];
  }

  for (const [key, value] of Object.entries(gridOverrides)) {
    if (SUPPORTED_GRID_KEYS.has(key)) {
      grid[key] = coerceInt(value, `grid_overrides.${key}`);
    } else if (
      !IGNORED_GRID_KEYS.has(key) &&
      !UNSUPPORTED_GRID_KEYS.has(key) &&
      !marginKeys.includes(key as (typeof marginKeys)[number])
    ) {
      throw new Error(`Unknown grid_overrides key: ${key}`);
    }
  }
}

function applyStyleFields(frameData: Record<string, unknown>, styleName: unknown): void {
  delete frameData.style;
  const semantic = styleSemantics(styleName);
  if (!semantic) {
    delete frameData.level;
    delete frameData.fill;
    delete frameData.border;
    return;
  }
  if (semantic.level == null) {
    delete frameData.level;
  } else {
    frameData.level = semantic.level;
  }
  frameData.fill = semantic.fill;
  frameData.border = semantic.border;
}

function isImplicitStructuralWrapperFrame(frameData: Record<string, unknown>): boolean {
  const children = frameData.children;
  if (!Array.isArray(children) || children.length === 0) {
    return false;
  }
  const heading = frameData.heading;
  if (typeof heading === "string" && heading.trim()) return false;
  if (isRecord(heading) && String(heading.text ?? "").trim()) return false;
  return !("level" in frameData) && !("fill" in frameData) && !("border" in frameData) && !("variant" in frameData);
}

function applyDirectField(frameData: Record<string, unknown>, key: string, value: unknown): void {
  if (key === "align") {
    frameData[key] = yamlAlign(value);
    return;
  }
  if (key === "fill_weight") {
    const coerced = coerceFloat(value, key);
    frameData[key] = Number.isInteger(coerced) ? Math.trunc(coerced) : coerced;
    return;
  }
  if (key === "wrap") {
    frameData[key] = Boolean(value);
    return;
  }
  if (LOWER_KEYS.has(key)) {
    if (typeof value !== "string") throw new Error(`${key} must be a string`);
    frameData[key] = value.trim().toLowerCase();
    return;
  }
  if (INT_KEYS.has(key)) {
    frameData[key] = coerceInt(value, key);
    return;
  }
  throw new Error(`Unsupported canonical field: ${key}`);
}

function parseArrowShorthandForPersistence(value: string): { source: string; target: string } | null {
  const match = value.match(ARROW_SHORTHAND_PATTERN);
  const source = match?.[1]?.trim();
  const target = match?.[2]?.trim();
  if (!source || !target) {
    return null;
  }
  return { source, target };
}

function persistableArrowData(arrowData: unknown): { id?: string; source: string; target: string } | null {
  if (typeof arrowData === "string") {
    return parseArrowShorthandForPersistence(arrowData) ?? null;
  }
  if (!isRecord(arrowData)) return null;
  const source = typeof arrowData.source === "string" ? arrowData.source.trim() : "";
  const target = typeof arrowData.target === "string" ? arrowData.target.trim() : "";
  if (!source || !target) return null;
  const explicitId = typeof arrowData.id === "string" ? arrowData.id.trim() : "";
  return explicitId ? { id: explicitId, source, target } : { source, target };
}

function coerceArrowWaypoint(value: unknown, fieldName: string): [number, number] {
  if (Array.isArray(value) && value.length === 2) {
    return [
      Math.round(coerceFloat(value[0], `${fieldName}[0]`)),
      Math.round(coerceFloat(value[1], `${fieldName}[1]`)),
    ];
  }
  if (isRecord(value) && "x" in value && "y" in value) {
    return [
      Math.round(coerceFloat(value.x, `${fieldName}.x`)),
      Math.round(coerceFloat(value.y, `${fieldName}.y`)),
    ];
  }
  throw new Error(`${fieldName} must be a [x, y] pair`);
}

function removeFrameFromTree(frameData: Record<string, unknown>, frameId: string): boolean {
  const children = frameData.children;
  if (!Array.isArray(children)) return false;
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (!isRecord(child)) continue;
    if (child.id === frameId) {
      children.splice(index, 1);
      return true;
    }
    if (removeFrameFromTree(child, frameId)) return true;
  }
  return false;
}

function applyRemovedFrameIds(document: Record<string, unknown>, removedIds: string[]): void {
  if (removedIds.length === 0) return;
  const rootData = document.root;
  if (!isRecord(rootData)) throw new Error("root must be a mapping");
  const rootId = typeof rootData.id === "string" ? rootData.id : "";
  const removed = new Set(removedIds.filter((frameId) => typeof frameId === "string" && frameId));
  if (rootId && removed.has(rootId)) {
    throw new Error(`Cannot remove diagram root frame: ${rootId}`);
  }
  for (const frameId of [...removed].sort()) {
    if (frameId !== rootId) {
      removeFrameFromTree(rootData, frameId);
    }
  }
  if (Array.isArray(document.arrows)) {
    document.arrows = document.arrows.filter(
      (arrow) => {
        const parsed = persistableArrowData(arrow);
        return Boolean(
          parsed
          && !removed.has(parsed.source)
          && !removed.has(parsed.target),
        );
      },
    );
  }
}

function findFrameData(frameData: Record<string, unknown>, frameId: string): Record<string, unknown> | null {
  if (frameData.id === frameId) return frameData;
  const children = frameData.children;
  if (!Array.isArray(children)) return null;
  for (const child of children) {
    if (!isRecord(child)) continue;
    const found = findFrameData(child, frameId);
    if (found) return found;
  }
  return null;
}

function findArrowData(document: Record<string, unknown>, componentId: string): Record<string, unknown> | null {
  const arrows = document.arrows;
  if (!Array.isArray(arrows)) return null;
  const parsedComponentId = parsePreviewArrowComponentId(componentId);
  const matchedPreviewArrow = parsedComponentId
    ? resolvePreviewArrowComponentId(parsedComponentId, arrows, (arrowEntry) => persistableArrowData(arrowEntry))
    : null;

  for (let index = 0; index < arrows.length; index += 1) {
    const arrowEntry = arrows[index];
    const matchesPreviewComponentId = matchedPreviewArrow?.index === index;
    if (!matchesPreviewComponentId) continue;
    if (isRecord(arrowEntry)) {
      return arrowEntry;
    }
    if (typeof arrowEntry === "string") {
      const parsed = parseArrowShorthandForPersistence(arrowEntry);
      if (!parsed) {
        return null;
      }
      const normalizedArrow = {
        source: parsed.source,
        target: parsed.target,
      };
      arrows[index] = normalizedArrow;
      return normalizedArrow;
    }
  }
  return null;
}

function applyFrameOverride(frameData: Record<string, unknown>, override: unknown, frameId: string): void {
  if (!isRecord(override)) {
    throw new Error(`Override for ${frameId} must be an object`);
  }
  const unsupported = Object.keys(override).filter((key) => UNSUPPORTED_FRAME_KEYS.has(key)).sort();
  if (unsupported.length > 0) {
    throw new Error(
      `${frameId} includes non-canonical transient keys that cannot be saved to YAML: ${unsupported.join(", ")}`,
    );
  }

  const styleName = override.style;
  if ("style" in override) {
    if (isImplicitStructuralWrapperFrame(frameData) && normalizeStyleName(styleName)) {
      // keep wrappers structural-only
    } else {
      applyStyleFields(frameData, styleName);
    }
  }

  for (const [key, value] of Object.entries(override)) {
    if (!SUPPORTED_FRAME_KEYS.has(key) && !UNSUPPORTED_FRAME_KEYS.has(key)) {
      throw new Error(`Unknown override key for ${frameId}: ${key}`);
    }
    if (key === "style") continue;
    if (key === "children_order") {
      reorderChildren(frameData, value, frameId);
      continue;
    }
    if (key === "text") {
      updateTextFields(frameData, value);
      continue;
    }
    if (key === "sizing") {
      applyDirectField(frameData, "sizing_w", value);
      applyDirectField(frameData, "sizing_h", value);
      delete frameData.sizing;
      continue;
    }
    if (key === "padding") {
      applyDirectField(frameData, key, value);
      delete frameData.padding_top;
      delete frameData.padding_right;
      delete frameData.padding_bottom;
      delete frameData.padding_left;
      continue;
    }
    if (key === "gap") {
      applyDirectField(frameData, key, value);
      delete frameData.gap_delta;
      continue;
    }
    if (key === "gap_delta") {
      if (value == null) {
        delete frameData.gap_delta;
        continue;
      }
      applyDirectField(frameData, key, value);
      delete frameData.gap;
      continue;
    }
    if ((key === "level" || key === "fill" || key === "border") && "style" in override) {
      continue;
    }
    if (
      [
        "direction",
        "gap",
        "padding_top",
        "padding_right",
        "padding_bottom",
        "padding_left",
        "sizing_w",
        "sizing_h",
        "fill_weight",
        "align",
        "wrap",
        "width",
        "height",
        "min_width",
        "max_width",
        "max_width_chars",
        "min_height",
        "max_height",
        "fill",
        "border",
        "level",
        "position",
        "x",
        "y",
      ].includes(key)
    ) {
      applyDirectField(frameData, key, value);
    }
  }
}

function applyArrowOverride(arrowData: Record<string, unknown>, override: unknown, arrowId: string): void {
  if (!isRecord(override)) {
    throw new Error(`Override for ${arrowId} must be an object`);
  }
  for (const [key, value] of Object.entries(override)) {
    if (!SUPPORTED_ARROW_KEYS.has(key)) {
      throw new Error(`Unknown override key for ${arrowId}: ${key}`);
    }
    if (key === "waypoints") {
      if (value == null) {
        delete arrowData.waypoints;
        continue;
      }
      if (!Array.isArray(value)) {
        throw new Error(`${arrowId}.waypoints must be a list`);
      }
      const authoredWaypoints = value.map((point, index) =>
        coerceArrowWaypoint(point, `${arrowId}.waypoints[${index}]`),
      );
      if (authoredWaypoints.length === 0) {
        delete arrowData.waypoints;
      } else {
        arrowData.waypoints = authoredWaypoints;
      }
    }
  }
}

/**
 * Apply layout engine choice to the document's meta section (spec 035).
 * The layout engine is persisted as `meta.layout_engine` in the frame YAML.
 */
function applyLayoutEngineChoice(document: Record<string, unknown>, layoutEngine: string | null): void {
  const meta = isRecord(document.meta) ? document.meta : {};
  document.meta = meta;

  const normalizedLayoutEngine = canonicalPreviewLayoutEngineKey(layoutEngine);
  if (normalizedLayoutEngine === null || normalizedLayoutEngine === "") {
    // Clear the layout engine choice
    delete meta.layout_engine;
  } else {
    meta.layout_engine = normalizedLayoutEngine;
  }

  // Clean up empty meta object
  if (Object.keys(meta).length === 0) {
    delete document.meta;
  }
}

function assertSupportedPersistedEngineLayoutMeta(
  meta: Record<string, unknown>,
  source: string,
  preferredLayoutEngineOverride?: string | null,
): void {
  const preferredLayoutEngine = preferredLayoutEngineOverride ?? (
    typeof meta.layout_engine === "string"
      ? meta.layout_engine.trim()
      : null
  );
  for (const [key, value] of Object.entries(meta)) {
    const namespace = `meta.${key}`;
    if (!getFrameYamlEngineLayoutNamespace(namespace) || !isRecord(value)) {
      continue;
    }
    const label = namespace === "meta.elk" ? "ELK" : key;
    const sanitized = isFrameYamlEngineLayoutNodeNamespace(namespace)
      ? sanitizeSupportedFrameYamlEngineLayoutNodeBuckets(
        namespace,
        value,
        `${source} ${namespace}`,
      )
      : sanitizeSupportedFrameYamlEngineLayoutOverrides(
        namespace,
        value,
        `${source} ${namespace}`,
        label,
        preferredLayoutEngine,
      );
    if (Object.keys(sanitized).length === 0) {
      delete meta[key];
      continue;
    }
    meta[key] = sanitized;
  }
}

function normalizeEngineLayoutOverrides(
  payload: PersistOverridePayload,
): Record<string, Record<string, unknown>> {
  const normalized: Record<string, Record<string, unknown>> = {};
  const namespacedOverrides = payload.engine_layout_overrides;
  if ("engine_layout_overrides" in payload && namespacedOverrides != null && !isRecord(namespacedOverrides)) {
    throw new Error("engine_layout_overrides must be an object");
  }
  if (isRecord(namespacedOverrides)) {
    for (const [namespace, overrides] of Object.entries(namespacedOverrides)) {
      if (!isRecord(overrides)) {
        throw new Error(`engine_layout_overrides.${namespace} must be an object`);
      }
      const normalizedNamespace = canonicalPreviewPersistNamespace(namespace) ?? namespace;
      if (isFrameYamlEngineLayoutNodeNamespace(normalizedNamespace)) {
        const migratedBuckets = migrateLegacyPreviewEngineNodeBucketsForNamespace(namespace, overrides);
        const nextBuckets = migratedBuckets?.buckets ?? {};
        if (Object.keys(nextBuckets).length > 0 || isFrameYamlEngineLayoutNodeNamespace(normalizedNamespace)) {
          normalized[normalizedNamespace] = { ...nextBuckets };
        }
        continue;
      }
      const migrated = migrateLegacyPreviewEngineOverridesForNamespace(namespace, overrides);
      const nextOverrides = migrated?.overrides ?? { ...overrides };
      if (Object.keys(nextOverrides).length > 0) {
        normalized[normalizedNamespace] = { ...nextOverrides };
      }
    }
  }

  const elkLayoutOverrides = payload.elk_layout_overrides;
  if ("elk_layout_overrides" in payload && elkLayoutOverrides != null && !isRecord(elkLayoutOverrides)) {
    throw new Error("elk_layout_overrides must be an object");
  }
  if (isRecord(elkLayoutOverrides) && Object.keys(elkLayoutOverrides).length > 0) {
    normalized["meta.elk"] = {
      ...(normalized["meta.elk"] || {}),
      ...elkLayoutOverrides,
    };
  }

  return normalized;
}

function applyEngineLayoutOverrides(
  document: Record<string, unknown>,
  engineLayoutOverrides: Record<string, Record<string, unknown>>,
): void {
  const unsupportedNamespaces = Object.keys(engineLayoutOverrides)
    .filter((namespace) => !getFrameYamlEngineLayoutNamespace(namespace))
    .sort();
  if (unsupportedNamespaces.length > 0) {
    throw new Error(
      `engine_layout_overrides contains unsupported namespaces for frame YAML: ${unsupportedNamespaces.join(", ")}`,
    );
  }

  for (const [namespace, overrides] of Object.entries(engineLayoutOverrides)) {
    if (Object.keys(overrides).length === 0 && !isFrameYamlEngineLayoutNodeNamespace(namespace)) {
      continue;
    }
    const descriptor = getFrameYamlEngineLayoutNamespace(namespace);
    if (!descriptor) {
      throw new Error(`engine_layout_overrides contains unsupported namespace: ${namespace}`);
    }
    descriptor.applyOverrides(document, overrides);
  }
}

export function verifyElkLayoutPersisted(documentText: string, expected: Record<string, unknown>): void {
  const entries = Object.entries(expected);
  if (entries.length === 0) return;
  const document = yaml.parse(documentText);
  if (!isRecord(document)) throw new Error("expected top-level mapping after save");
  const requiresPersistedElk = entries.some(([, raw]) => raw != null && raw !== "");
  const meta = isRecord(document.meta) ? document.meta : null;
  if (requiresPersistedElk && !meta) throw new Error("meta missing after ELK save");
  const elkLayout = meta && isRecord(meta.elk)
    ? meta.elk
    : {};
  if (requiresPersistedElk && !isRecord(meta?.elk)) throw new Error("meta.elk missing after ELK save");
  for (const [key, raw] of entries) {
    const got = elkLayout[key];
    if (raw == null || raw === "") {
      if (got != null) {
        throw new Error(`meta.elk[${JSON.stringify(key)}] is ${JSON.stringify(got)}, expected cleared after save`);
      }
      continue;
    }
    if (got == null) {
      throw new Error(`meta.elk missing key ${JSON.stringify(key)} after save`);
    }
    if (!Object.is(got, raw)) {
      throw new Error(`meta.elk[${JSON.stringify(key)}] is ${JSON.stringify(got)}, expected ${JSON.stringify(raw)} after save`);
    }
  }
}

export function persistFrameDiagramOverridePayloadToYaml(
  framePath: string,
  baselineText: string,
  payload: PersistOverridePayload,
): string {
  if (!isRecord(payload)) throw new Error("Expected JSON object");
  const overrides = isRecord(payload.overrides) ? payload.overrides : {};
  if ("overrides" in payload && !isRecord(payload.overrides)) {
    throw new Error("overrides must be an object");
  }
  const removedIds = payload.removed_ids == null ? [] : payload.removed_ids;
  if (!Array.isArray(removedIds)) {
    throw new Error("removed_ids must be an array");
  }
  const gridOverrides = payload.grid_overrides;
  const hasGridOverrides = isRecord(gridOverrides) && Object.keys(gridOverrides).length > 0;
  const engineLayoutOverrides = normalizeEngineLayoutOverrides(payload);
  const hasEngineLayoutOverrides = Object.keys(engineLayoutOverrides).length > 0;
  const hasLayoutEngine = "layout_engine" in payload;
  if (
    Object.keys(overrides).length === 0
    && !hasGridOverrides
    && removedIds.length === 0
    && !hasEngineLayoutOverrides
    && !hasLayoutEngine
  ) {
    return baselineText;
  }

  const document = yaml.parse(baselineText);
  if (!isRecord(document)) throw new Error(`${framePath}: expected top-level mapping`);
  if (document.engine !== "v3") {
    throw new Error(`${framePath}: not a native frame YAML (missing engine: v3)`);
  }
  migrateLegacyDocumentMeta(document);
  const rootData = document.root;
  if (!isRecord(rootData)) throw new Error(`${framePath}: root must be a mapping`);
  if (isRecord(document.meta)) {
    assertSupportedPersistedEngineLayoutMeta(
      document.meta,
      framePath,
      typeof payload.layout_engine === "string" ? payload.layout_engine : undefined,
    );
  }

  if ("grid_overrides" in payload) {
    applyGridOverrides(document, gridOverrides ?? {});
  }
  if (hasEngineLayoutOverrides) {
    applyEngineLayoutOverrides(document, engineLayoutOverrides);
  }
  if ("layout_engine" in payload) {
    const layoutEngineValue = payload.layout_engine;
    if (layoutEngineValue === null || layoutEngineValue === undefined) {
      applyLayoutEngineChoice(document, null);
    } else if (typeof layoutEngineValue === "string") {
      applyLayoutEngineChoice(document, layoutEngineValue);
    } else {
      throw new Error("layout_engine must be a string or null");
    }
  }
  if (removedIds.length > 0) {
    applyRemovedFrameIds(
      document,
      removedIds.filter((frameId): frameId is string => typeof frameId === "string"),
    );
  }
  for (const [componentId, override] of Object.entries(overrides)) {
    const frameTarget = findFrameData(rootData, componentId);
    if (frameTarget) {
      applyFrameOverride(frameTarget, override, componentId);
      continue;
    }
    const arrowTarget = findArrowData(document, componentId);
    if (arrowTarget) {
      applyArrowOverride(arrowTarget, override, componentId);
      continue;
    }
    throw new Error(`Unknown component id in overrides: ${componentId}`);
  }
  if (isRecord(document.meta)) {
    assertSupportedPersistedEngineLayoutMeta(document.meta, framePath);
    if (Object.keys(document.meta).length === 0) {
      delete document.meta;
    }
  }

  const dumped = yaml.stringify(document, {
    aliasDuplicateObjects: false,
    indentSeq: false,
    lineWidth: 1000,
    singleQuote: true,
    sortMapEntries: false,
  });
  return dumped.replace(/\n/g, EOL);
}

export function framePersistenceFileLabel(filePath: string): string {
  return path.basename(filePath);
}
