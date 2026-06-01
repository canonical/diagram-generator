# Spec 010 – DIAGRAM.md token audit and sizing model correction

## Problem

DIAGRAM.md contains hardcoded values in its YAML frontmatter that were derived from initial sample diagrams by an agent, not from deliberate design decisions. Several of these values have been misinterpreted by the layout engine as hard constraints when they should be defaults.

### Immediate problem: BLOCK_WIDTH as HUG floor

`default-box-width: 192px` was intended as a default standalone box width, but the layout engine treats it as a minimum floor for HUG-sized boxes. Both Python (`layout_v3.py` line 291) and TypeScript (`layout.ts`) do:

```python
w = max(round_up_to_grid(content_w), BLOCK_WIDTH)
```

A box set to `sizing_w: hug` can never shrink below 192px, even when text content only needs ~156px. This defeats the purpose of HUG sizing. An annotation with two short lines ("Android owns / everything above") renders at 192px when it should render at ~160px.

### Broader problem: sample-derived values treated as invariants

DIAGRAM.md needs a systematic audit to distinguish:

1. **Genuine design tokens** – intentional, should be enforced (e.g. baseline-unit, grid-gutter, outer-margin)
2. **Reasonable defaults** – good starting points but overridable per-diagram (e.g. default-box-width)
3. **Sample artifacts** – measured from initial diagrams, suspiciously precise, possibly wrong (e.g. arrowHeadLength: 10.8408px)

## Scope

### Part 1: DIAGRAM.md token audit

Review every hardcoded value in DIAGRAM.md frontmatter. For each, determine its provenance and whether it should be an invariant, a default, or removed.

Values to audit:

| Token | Current value | Concern |
|-------|--------------|---------|
| `default-box-width` | 192px | Used as HUG floor – should be default only |
| `default-box-min-height` | 64px | Conflates icon presence with minimum height |
| `growthStep` | 8px | Redundant with baseline-unit? |
| `arrowHeadLength` | 10.8408px | Suspiciously precise – measured from a sample SVG |
| `arrowHeadHalfWidth` | 2.9053px | Same concern |
| `arrowClearance` | 8px | Code has three different values (8/8/12) |
| `minArrowSegment` | 16px | Derived or designed? |
| `terminal-bar.height` | 64px | Same as BOX_MIN_HEIGHT – coincidence or intentional? |
| `matrix-widget.size` | 48px | Same as ICON_SIZE |
| `chromeHeight` | 20px | Source? |
| Component `width` | 192px ×3 | box-default, box-accent, box-emphasis all repeat same value |

Expected outcome: each value is classified as invariant / default / artifact, and DIAGRAM.md is updated to reflect the distinction. Artifacts are either replaced with intentional values or removed.

### Part 2: Fix HUG sizing model

The `BLOCK_WIDTH` floor on leaf HUG measurement must be removed. HUG should produce `round_up_to_grid(content_w)` without a minimum width floor.

- `BLOCK_WIDTH` becomes the default width when no sizing mode is specified and no text determines width (the "empty box" case)
- HUG-sized leaves use measured content width + padding, grid-snapped, with no floor
- Both Python and TypeScript engines must be updated in lockstep
- Parity tests must pass

### Part 3: Column-span in width inspector input

When a diagram has explicit grid columns, the width inspector input should offer column-span values (e.g. "2 cols") as an alternative to raw pixels. The engine already supports `col_span` – this is purely an editor UI enhancement.

## Out of scope

- Redesigning the token system itself (that's a DIAGRAM.md v2 concern)
- Changing the grid/gutter/margin tokens (those are well-established)
- Changing icon size or baseline unit (genuine design tokens)

## Constraints

- Changes must maintain parity between Python and TypeScript engines
- All 23 production diagrams must be browser-verified after sizing changes
- DIAGRAM.md updates must be reflected in engine token constants
- The anti-patch protocol applies – classify each change before implementing

## Acceptance criteria

1. DIAGRAM.md frontmatter has each value annotated with its role (invariant / default / configurable)
2. HUG-sized boxes shrink to content width (grid-snapped) without a 192px floor
3. No regression in any of the 23 production diagrams
4. Both test suites pass (TS + Python)
5. Column-span UI appears in the width inspector when the diagram has explicit grid columns
