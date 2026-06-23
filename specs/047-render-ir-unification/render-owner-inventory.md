# Render Owner Inventory

Post-046, the remaining render substrate is split into one shared geometry layer
plus serializer-specific adapters. This file records the intended owners so new
engine lanes do not reopen bespoke render math.

## Shared Geometry Owners

- `packages/layout-engine/src/frame-render-plan.ts`
  Frame box, separator, wrapped text, and icon placement for preview patch,
  legacy artifact SVG, and display-list emission.
- `packages/layout-engine/src/arrow-render-plan.ts`
  Arrow shaft truncation, head geometry, authored-label anchoring, and label
  line layout for preview DOM, legacy artifact SVG, and display-list emission.
- `packages/layout-engine/src/text-render-geometry.ts`
  Neutral text baseline conversion shared by frame and arrow planning.

## Serializer-Specific Owners

- `packages/layout-engine/src/render-adapter/display-list.ts`
  Emits shared scene IR items for preview and export, including optional
  embedded icon fragments for the export wrapper, while preserving legacy
  stacking order: arrows, then frames, then overlays.
- `packages/layout-engine/src/render-adapter/svg.ts`
  Serializes display-list IR to artifact SVG while preserving legacy export
  contract details such as arrow grouping markers and polygon arrowheads.
- `packages/layout-engine/src/preview-shell/app-display-list-dom.ts`
  Serializes shared display-list IR into preview DOM for frame, overlay, and
  fresh-preview arrow layers while adding preview-only metadata, transparent hit
  lines, origin snapshots, arrowhead polygon conversion, and optional icon
  element substitution.
- `packages/layout-engine/src/svg-render.ts`
  Thin export wrapper over `emitFrameDiagramDisplayList()` plus
  `renderDisplayListToSvg()`. It should stay a compatibility entry point, not a
  geometry owner.
- `packages/layout-engine/src/preview-shell/app-frame-svg.ts`
  Preview frame DOM patcher. Owns preview-only `data-*` metadata, pointer-event
  suppression, and DOM node reuse only.
- `packages/layout-engine/src/preview-shell/app-arrow-render.ts`
  Preview bridge arrow DOM patcher. Owns DOM reuse during relayout/waypoint
  edits, transparent hit-line refresh, and origin snapshot refresh only.
- `packages/layout-engine/src/preview-shell/app-fresh-render.ts`
  Preview layer assembly and icon fetch/clone flow. It should shrink toward
  serializer orchestration rather than geometry ownership.
- `packages/layout-engine/src/preview-shell/app-arrow-waypoints.ts`
  Interactive arrow-edit mutation owner. It may mutate preview DOM, but must
  stay downstream of shared shaft/head geometry primitives.

## Preview-Only Surfaces That Must Not Leak Into Export

- Layer ids: `dg-styled-layer`, `dg-arrow-layer`, `dg-frame-layer`, `dg-overlay-layer`
- Arrow hit areas: transparent `line` targets with `pointerEvents = 'stroke'`
- Arrow origin snapshots:
  `data-orig-x1`, `data-orig-y1`, `data-orig-x2`, `data-orig-y2`, `data-orig-points`
- Frame/text/icon origin snapshots:
  `data-dg-text-role`, `data-dg-text-block-index`, `data-orig-inner`,
  `data-orig-width`, `data-orig-height`, `data-orig-tx`, `data-orig-ty`
- Legacy export keeps `data-dg-arrow="true"` on arrow groups as a lightweight
  compatibility marker. It is not a geometry owner.

## Steady-State Preview Mutation Owners

- Bridge arrow patching stays as a preview-only optimization.
  `patchPreviewArrowSvg()` is still the owner for DOM reuse, transparent hit
  targets, and origin snapshot refresh during relayout and waypoint editing.
  It now consumes shared arrow planning instead of owning separate geometry.
- Fresh preview now consumes shared display-list IR for frame, overlay, and
  arrow layers. Preview-only ELK labels flow through the shared IR emitter via
  the preview serializer option instead of a separate fresh-preview builder.
- Interactive waypoint editing still mutates preview DOM directly after the
  shared geometry pass, but its shaft/head math stays routed through
  `resolveArrowPolylineGeometry()` and `resolveArrowheadGeometry()`.
