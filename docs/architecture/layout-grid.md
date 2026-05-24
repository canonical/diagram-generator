# Layout grid architecture

## Overview

The layout grid is a visual reference system for aligning content on a page. It is inspired by InDesign/Figma layout grids and follows the same model used in the design-foundry `resolveGridCore()` algorithm.

The grid is independent of the autolayout engine. Autolayout (HUG/FILL/FIXED, measure/place) positions frames within the page. The layout grid overlays columns, rows, gutters, and margins as a visual reference. The two systems are optionally linked via a toggle.

## Three-layer architecture

```
┌──────────────────────────────────────────────────┐
│  _resolveGrid()                                  │
│  (editor.js — JS port of resolveGridCore)        │
│                                                  │
│  INPUT:  canvas dims, per-side margins,          │
│          cols, rows, gutters, baselineStep        │
│  OUTPUT: column keylines, row tops, resolved      │
│          margins (with slack absorption)          │
│                                                  │
│  → Visual overlay (columns, rows, baselines)     │
│  → Does NOT control autolayout                   │
├──────────────────────────────────────────────────┤
│  layoutFrameTree()                               │
│  (packages/layout-engine — TS autolayout)        │
│                                                  │
│  INPUT:  frame tree, gridStep                    │
│  OUTPUT: positioned children                     │
│                                                  │
│  gridStep=8  → diagram-generator / print docs    │
│  gridStep=1  → general UI / no snapping          │
│                                                  │
│  → Pure spatial algorithm                        │
│  → Independent of layout grid                    │
├──────────────────────────────────────────────────┤
│  "Link to root frame" toggle                     │
│  (layout-bridge.js — _applyLinkedRootGridSpacing)│
│                                                  │
│  When ON:  root.padding = grid margins,          │
│            root.gap = grid gutter                │
│  When OFF: frame props set independently         │
└──────────────────────────────────────────────────┘
```

## Grid controls (sidebar)

The sidebar exposes these controls:

| Control | Type | Description |
|---------|------|-------------|
| Columns | number | Number of columns (1–20) |
| Rows | number | Number of rows (1–40). When set to 0 or left at default, auto-calculated from canvas height |
| Col gutter | number (step=8) | Horizontal gutter between columns, in px |
| Row gutter | number (step=8) | Vertical gutter between rows, in px |
| Top margin | number (step=8) | Top page margin, in px |
| Right margin | number (step=8) | Right page margin, in px |
| Bottom margin | number (step=8) | Bottom page margin, in px |
| Left margin | number (step=8) | Left page margin, in px |
| Link to root frame | BF switch | When on, grid margins → root padding, grid col gutter → root gap |
| Absorb slack | BF switch | When on, bottom margin grows to absorb leftover vertical space so row heights stay baseline-faithful |

Toggles use the Baseline Foundry `bf-switch` component (`bf-switch-input` + `bf-switch-slider` + `bf-switch-label`) — no local CSS. The underlying `<input type="checkbox">` fires `change` events and exposes `.checked`, so the JS wiring is identical to a bare checkbox.

## Grid resolver algorithm

The `_resolveGrid()` function in `editor.js` is a JS port of `resolveGridCore()` from `design-foundry/packages/layout-grid/src/grid-core.ts`. The algorithm:

1. **Snap** all margins and gutters to the nearest baseline step multiple (default 8px)
2. **Compute** content area: `canvasWidth - marginLeft - marginRight` × `canvasHeight - marginTop - marginBottom`
3. **Derive** column width: `(contentWidth - (cols - 1) × colGutter) / cols`, floored to baseline step
4. **Derive** row height: `floor((availableHeight - totalRowGutter) / (rows × step)) × step`
5. **Absorb slack** (when enabled): bottom margin grows to fill `canvasHeight - marginTop - usedRowStack`
6. **Right margin slack**: similarly absorbs leftover from column width snapping

## Link to root frame

When enabled ("Link to root frame" checked):
- Grid margins are synced to the root frame's per-side padding
- Grid column gutter is synced to the root frame's gap (for horizontal layouts) or the grid col gutter value
- Changing margins in the grid panel changes the root frame's padding
- The root frame's individual padding/gap overrides are pruned (they come from the grid)

When disabled:
- Grid is a visual overlay only
- Root frame padding/gap can be set independently via the inspector
- Grid margins and frame padding can differ

## Slack absorption

When enabled ("Absorb slack to bottom margin" checked):
- Row heights are snapped to exact baseline multiples
- The bottom margin grows to consume any leftover vertical space
- This guarantees the content area height is a baseline multiple
- Matches the print document workflow in design-foundry

When disabled:
- Row heights are still baseline-snapped
- Bottom margin is exactly the requested value
- The row stack may not fill the full canvas height

## Print document workflow

For print documents (A4, etc.), the intended workflow is:

1. Set page dimensions (e.g. 595 × 842pt for A4)
2. Set top, left, right margins to desired values
3. Set a minimum bottom margin
4. Enable slack absorption
5. Set baseline step to your document baseline (e.g. 12pt)
6. Set column count, column gutter, row count, row gutter

The system calculates:
- Row heights as exact baseline multiples
- Actual bottom margin (absorbs leftover — may be larger than requested)
- Column widths (baseline-snapped)

This saves the user from tedious arithmetic to find a content area height that is an exact multiple of the baseline grid.

## Relationship to design-foundry

The TypeScript autolayout engine in `packages/layout-engine/` will eventually port to `design-foundry` as `@design-foundry/operator-autolayout`. The grid controls and `_resolveGrid()` are diagram-generator-specific UI and stay in this repo.

The design-foundry counterpart is `resolveGridCore()` in `packages/layout-grid/src/grid-core.ts`. The two implementations share the same algorithm but `_resolveGrid()` is a simplified JS version tailored to the preview's gridInfo shape.

## Grid override persistence

Grid overrides are stored alongside frame overrides in the override JSON file (`tmp/overrides/<slug>.json`). The grid override shape:

```json
{
  "cols": 4,
  "rows": 6,
  "col_gap": 24,
  "row_gap": 24,
  "margin_top": 48,
  "margin_right": 48,
  "margin_bottom": 48,
  "margin_left": 48,
  "link_to_root": true,
  "slack_absorption": true
}
```

Legacy overrides with `outer_margin` (uniform margin) are still read for backward compatibility.
