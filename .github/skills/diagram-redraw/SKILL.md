---
name: diagram-redraw
description: "Redraw rough sketches or inconsistent diagrams into on-brand SVG and draw.io outputs. Use when adding a new diagram slug, translating a rough source into generator code, picking local icons, wiring compare pages, or producing editable outputs."
argument-hint: "Describe the source asset, target slug, and any special constraints"
---

# Diagram redraw

## When to use

- A rough source image, sketch, or prior diagram needs an on-brand redraw.
- A new diagram slug is being added to the generator batch.
- A diagram needs both draw.io and SVG outputs.
- Compare pages need a new before and after pair.

## Procedure

1. Read `STATUS.md`, `DIAGRAM.md`, and `docs/specs.md` before making any layout decisions.
2. Inspect the source sketch plus the governing local references in `diagrams/0.reference/`.
3. Audit `assets/icons/` early and decide which nodes get icons and which intentionally stay text-only.
4. **Identify the content tree.** List every panel, heading, and child box. Note icons and line counts — this determines box model math.
5. **Lock the alignment model before touching coordinates.** For grouped layouts, use parent-scoped equal splits with consistent gutters and wrapper outdents. Do not mix with ad hoc top-level-grid forcing.
6. **Compute box heights from content (inside-out).** Use the formulas in DIAGRAM.md "Box height formulas". Key checks: 64px minimum for bordered boxes, no dead space below text, annotation style for standalone labels.
7. **Define the panel grid using named variables.** Column x-positions, row y-positions, panel dimensions — all derived from content, all on the 8px baseline. See DIAGRAM.md "Grid variables per panel".
8. **Apply typography hierarchy.** Bold = structural headings only. Regular weight for content labels. Helper text uses color shift, not size change. See DIAGRAM.md "Typography".
9. **Verify text containment.** Every text element fits entirely inside its parent or sits entirely outside. See DIAGRAM.md "Text containment".
10. **Apply the correct group style.** Grey no-stroke for default groups. Dashed only for debug. See DIAGRAM.md "Group styling invariant".
11. Create or update the frame YAML in `scripts/diagrams/frames/`.
12. The preview server auto-discovers new YAMLs, so no manual registration is needed.
13. **Wire the source reference image** so the "Both" tab shows the original sketch beside the output:
    - Save the source image to `diagrams/1.input/` (any subfolder is fine, e.g. `diagrams/1.input/maas/`).
    - Add a slug → filename mapping to `_REFERENCE_MAP` in `scripts/preview_server.py`.
    - The "Input" and "Both" tabs in the preview server load the image via `/reference/<slug>`.
    - If the source is an attached image that can't be saved programmatically, note the expected filename and path so the user can save it manually.
14. Run the build and validation workflow from the `diagram-build-validate` skill.
14. **Post-generation layout audit.** Check against DIAGRAM.md rules:
    - All positions and dimensions on 8px baseline
    - Only two gap scales: compact-gap (8px) and grid-gutter (24px)
    - No text crossing container borders
    - Row/column alignment consistent
    - Box heights tight to content
    - Typography hierarchy correct (bold = headings only)
    - Arrow clearance satisfied (last segment ≥ 24px, first ≥ 8px)
    - Group alignment and wrapper outdents consistent
    - Arrow doglegs treated as layout smells
    - Arrow labels free-positioned, not grid cells
    - Separators thin, not box-height rows
    If any check fails, fix the grid parameters or anchor model — not individual coordinates.
15. Open the changed diagram in the browser and take a Playwright screenshot before treating the task as done.
16. If the change adds a reusable rule, record it in `DIAGRAM.md`.

## Guardrails

All visual rules are defined in `DIAGRAM.md`. Read it before using this procedure. The anti-patch protocol in `.github/copilot-instructions.md` governs how changes are classified and validated.

Key constraints during redraw:

- Treat `DIAGRAM.md` as the canonical design-language contract.
- Keep text-bearing draw.io shapes native and editable.
- Use local icons only (`assets/icons/`).
- Attach direct draw.io edges with `source`, `target`, and explicit anchors.
- Sanitize changed deliverable SVGs before treating them as final.
- No ad-hoc coordinates. Every position must derive from named grid variables.
- Inside-out box model. Never size containers first and fit content inside.
- Sentence case for all diagram text (capitalize first word and proper nouns only).
- Open the changed diagram in the browser and take a Playwright screenshot before reporting done.