# Plan: Spec 012 – TS SVG renderer

## Phase 1 – Inventory Python renderer

- List all `Primitive` types handled in `diagram_render_svg.py` / `layout_v3` render path
- Map each to existing `layout-bridge.js` DOM code (spec 009) vs missing

## Phase 2 – Shared render module

- Extract browser `layout-bridge` render helpers into `packages/layout-engine/src/svg-render/` (string builder, no DOM)
- Wire `export-frame-svg.mjs` to full renderer
- Icon loader: read `assets/icons/<name>` in Node

## Phase 3 – Golden tests

- 5–8 representative slugs (vertical stack, deep nesting, arrows, highlight, section)
- Compare SVG structure (bbox + element counts) or snapshot files in `packages/layout-engine/tests/fixtures/svg/`

## Phase 4 – Delete Python

- Remove fallback in `preview_server.py`
- Delete `diagram_render_svg.py`
- Update docs and pytest collection
