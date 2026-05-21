---
name: diagram-build-validate
description: "Build and validate diagram-generator outputs. Use when changing renderers, shared primitives, deliverable SVGs, draw.io exports, compare pages, or any diagram slug that needs rebuild, sanitization, and focused output checks."
argument-hint: "Describe which diagram slugs or files changed"
---

# Diagram build and validate

## When to use

- Renderer code changed in `scripts/export_drawio_batch.py`, `scripts/generate_remaining_diagrams.py`, or `scripts/diagram_shared.py`.
- Layout engine or model changed in `scripts/diagram_layout.py` or `scripts/diagram_model.py`.
- A declarative diagram definition changed in `scripts/diagrams/*.py`.
- A new diagram was added.
- A deliverable SVG changed and needs sanitization.
- Compare pages need regeneration.

## Procedure

1. Rebuild the v1 canonical batch with `python scripts/build_outputs.py`.
2. Rebuild the v2 declarative batch with `python scripts/build_v2.py`.
3. Run `python scripts/_audit_v2.py` to compare element counts (orange, rects, texts) between v1 and v2.
4. Run `python scripts/_compare_3way.py` (or a single slug) for Playwright 3-way visual comparison.
5. Sanitize changed deliverable SVGs with `python scripts/svg_illustrator_sanitize.py --write <svg>`.
6. Regenerate compare pages with `python scripts/build_compare_pages.py` when compare inputs or slugs changed.
7. Check the touched Python and Markdown files for errors if the editor reports any.
8. Spot-check the changed draw.io XML for attached edges and the changed SVG for syntax or portability issues.
9. Update `STATUS.md`, `TODO.md`, and `HISTORY.md` if the change altered the repo's current state or added a reusable rule.

## Guardrails

All visual rules (gutter consistency, arrow clearance, equal-height equalization, typography hierarchy, box height formulas, annotations vs helpers, separator sizing) are defined in `DIAGRAM.md`. Read it before running this procedure.

Key constraints to verify during build:

- Do not skip the batch rebuild when renderer or exporter code changed.
- Do not skip the sanitizer for changed deliverable SVGs.
- Text must not overlap arrows, borders, icons, or other text.
- Always reference the v1 source to verify v2 definitions carry all content.
- When an arrow crosses helper text, change anchor sides or add waypoints — do not accept crossings.
- When a panel mixes MatrixWidgets, Boxes, and Annotations at different heights, set `uniform_height=False` to avoid inflating box rows to annotation-text height.