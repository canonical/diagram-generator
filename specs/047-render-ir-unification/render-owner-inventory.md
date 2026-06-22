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
  Emits shared scene IR items and preserves legacy stacking order:
  arrows, then frames, then overlays.
- `packages/layout-engine/src/render-adapter/svg.ts`
  Serializes display-list IR to clean artifact SVG.
- `packages/layout-engine/src/svg-render.ts`
  Legacy artifact SVG serializer still needed while embedded icon markup and
  direct-export compatibility have not yet fully moved behind IR serializers.
- `packages/layout-engine/src/preview-shell/app-frame-svg.ts`
  Preview frame DOM patcher. Owns preview-only `data-*` metadata, pointer-event
  suppression, and DOM node reuse only.
- `packages/layout-engine/src/preview-shell/app-arrow-render.ts`
  Preview arrow DOM serializer/patcher. Owns transparent hit lines,
  `data-dg-arrow`, origin geometry snapshots, and ELK label DOM emission only.
- `packages/layout-engine/src/preview-shell/app-fresh-render.ts`
  Preview layer assembly and icon fetch/clone flow. It should shrink toward
  serializer orchestration rather than geometry ownership.
- `packages/layout-engine/src/preview-shell/app-arrow-waypoints.ts`
  Interactive arrow-edit mutation owner. It may mutate preview DOM, but must
  stay downstream of shared shaft/head geometry primitives.

## Preview-Only Surfaces That Must Not Leak Into Export

- Layer ids: `dg-styled-layer`, `dg-arrow-layer`, `dg-frame-layer`, `dg-overlay-layer`
- Arrow markers and hit areas:
  `data-dg-arrow="true"`, transparent `line` hit targets with `pointerEvents = 'stroke'`
- Arrow origin snapshots:
  `data-orig-x1`, `data-orig-y1`, `data-orig-x2`, `data-orig-y2`, `data-orig-points`
- Frame/text/icon origin snapshots:
  `data-dg-text-role`, `data-dg-text-block-index`, `data-orig-inner`,
  `data-orig-width`, `data-orig-height`, `data-orig-tx`, `data-orig-ty`

## Remaining 047 Gaps

- Bridge arrow patching stays as a preview-only optimization.
  `patchPreviewArrowSvg()` is still the owner for DOM reuse, transparent hit
  targets, and origin snapshot refresh during relayout and waypoint editing.
  It now consumes shared arrow planning instead of owning separate geometry.
- Fresh preview still assembles DOM trees directly instead of consuming emitted
  display-list IR items.
- ELK edge-label DOM remains preview-specific.
- Embedded icon markup still bypasses display-list IR on the legacy export path.
