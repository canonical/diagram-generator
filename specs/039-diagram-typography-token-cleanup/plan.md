# Implementation Plan: Diagram Typography Token Cleanup

**Branch**: `039-diagram-typography-token-cleanup` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/039-diagram-typography-token-cleanup/spec.md`

**Author**: Cline (Qwen 3.7 Max)

## Summary

Consolidate DIAGRAM.md's typography frontmatter from 13 tokens to 2 (`diagram-body` and `diagram-heading-1`), remove 6 dead Python constants, clean up unused spacing/grid aliases, retire v2-only prose sections, and reorganize unused component specs. Pure documentation and dead-code removal — no new functionality, no new dependencies.

## Technical Context

**Language/Version**: Python 3.11, TypeScript 5.x

**Primary Dependencies**: `scripts/diagram_shared.py` (Python tokens), `packages/layout-engine/src/tokens.ts` (TS tokens), `packages/layout-engine/src/frame-classes.ts` (frame class definitions)

**Storage**: N/A — no data layer changes

**Testing**: `pytest scripts/test_*.py`, `npx tsc --noEmit` in `packages/layout-engine`

**Target Platform**: N/A — documentation and constant cleanup only

**Project Type**: Diagram generator (CLI + preview server)

**Performance Goals**: N/A

**Constraints**: All existing tests must pass. No runtime behavior changes.

**Scale/Scope**: 1 markdown file (DIAGRAM.md), 1 Python file (diagram_shared.py), 0 TS files (tokens.ts has no dead constants to remove — it only defines `BODY_SIZE` and `BODY_LINE_STEP` which are both used)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- No new dependencies introduced ✓
- No new files created (spec files only) ✓
- No runtime behavior changes ✓
- TypeScript and Python parity maintained ✓

## Project Structure

### Documentation (this feature)

```text
specs/039-diagram-typography-token-cleanup/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Task list
```

### Source Code (repository root)

```text
DIAGRAM.md                              # Frontmatter + prose cleanup
scripts/diagram_shared.py               # Remove dead constants
```

**Structure Decision**: Changes are confined to DIAGRAM.md (documentation contract) and `scripts/diagram_shared.py` (dead constant removal). No structural changes to the codebase.

## Complexity Tracking

No constitution violations. This is a pure cleanup spec.

## Detailed Change Inventory

### DIAGRAM.md Frontmatter — Typography Section

**Before** (13 tokens):
```yaml
typography:
  root: { fontSize: 14px, ... }
  body: { fontSize: 14px, ... }
  diagram-body: { fontSize: 18px, fontWeight: 400, lineHeight: 24px }
  diagram-body-strong: { fontSize: 18px, fontWeight: 600, lineHeight: 24px }
  body-strong: { fontSize: 14px, ... }
  body-smallcaps: { fontSize: 14px, ... }
  heading-strong: { fontSize: 18px, fontWeight: 700, lineHeight: 24px }
  heading: { fontSize: 18px, fontWeight: 600, lineHeight: 24px }
  heading-regular: { fontSize: 18px, fontWeight: 400, lineHeight: 24px }
  title: { fontSize: 24px, ... }
  title-strong: { fontSize: 24px, ... }
  helper: { fontSize: 14px, ... }
  mono-body: { fontSize: 14px, ... }
```

**After** (2 tokens):
```yaml
typography:
  diagram-body:
    fontFamily: Ubuntu Sans
    fontSize: 18px
    fontWeight: 400
    lineHeight: 24px
    notes: Default body text for all diagram labels, annotations, and box content.
  diagram-heading-1:
    fontFamily: Ubuntu Sans
    fontSize: 18px
    fontWeight: 700
    lineHeight: 24px
    notes: Section and panel headings. Weight 700 is the only bold level. Leaf headings use diagram-body (weight 400).
```

### DIAGRAM.md Frontmatter — Spacing Section

**Remove**: `unit`, `rhythm-step`, `panel-padding`, `icon-inset`, `heading-line-step`, `title-line-step`, `default-box-growth-step`

**Keep**: `baseline-unit`, `inset`, `compact-gap`, `grid-gutter`, `outer-margin`, `body-line-step`

### DIAGRAM.md Frontmatter — Grid Section

**Remove**: `column-counts`, `span-rule`, `application-gutter`, `application-outer-margin`

**Keep**: `baseline-unit`, `default-box-width`, `default-box-min-height`, `icon-size`, `frame-stroke-width`

### DIAGRAM.md Frontmatter — Components Section

**Move to "Reserved" subsection**: `terminal-bar`, `matrix-widget`, `jagged-panel`, `icon-cluster`

### DIAGRAM.md Body — Prose Sections

**Remove or replace with brief note**:
- "Sizing constraints" table (`canvas_width`, `canvas_height`, `uniform_rows`, `col_width`)
- "Row equalization for mixed-type rows"
- "Panel children type ordering"
- `column-counts` and `span-rule` references in "Gutters and grid rules"

### scripts/diagram_shared.py — Dead Constants

**Remove**:
```python
HEADING_SIZE = "18"        # Never imported; heading weight comes from frame classes
TITLE_SIZE = "24"          # Never imported; no code path emits 24px
HEADING_LINE_STEP = 24     # Never imported; identical to BODY_LINE_STEP
TITLE_LINE_STEP = 32       # Never imported; title size is unused
DIAGRAM_TIER_BODY_SIZE = BODY_SIZE      # Legacy alias, never imported
DIAGRAM_TIER_BODY_LINE_STEP = BODY_LINE_STEP  # Legacy alias, never imported
```

**Keep**: `BODY_SIZE = "18"`, `BODY_LINE_STEP = 24` — both actively used by `drawio_style_presets.py`, `diagram_layout.py`, `layout_v3.py`, and the TS layout engine.