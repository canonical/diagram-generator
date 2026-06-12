# Feature Specification: Diagram Typography Token Cleanup

**Feature Branch**: `039-diagram-typography-token-cleanup`

**Created**: 2026-06-12

**Status**: Draft

**Author**: Cline (Qwen 3.7 Max)

**Input**: User description: "Review DIAGRAM.md. List which parts are used and which can be dropped. Many rules are never used, styles too — the 24px font size for example. Consolidate to diagram-body and diagram-heading-1."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clean typography token contract (Priority: P1)

A diagram author or engine maintainer reads DIAGRAM.md and finds exactly two typography tokens that map 1:1 to what the code actually emits. There is no ambiguity about which token governs body text vs headings, and no dead tokens that suggest capabilities the engine does not have.

**Why this priority**: The typography frontmatter is the canonical contract. Every other cleanup (spacing, prose, components) depends on getting this right first. Dead tokens mislead AI agents and human authors into requesting features that don't exist.

**Independent Test**: Open DIAGRAM.md, count typography tokens in the frontmatter — should be exactly 2 (`diagram-body`, `diagram-heading-1`). Cross-reference against `BODY_SIZE` and frame-class heading weights in `frame_style_classes.py` — should match exactly.

**Acceptance Scenarios**:

1. **Given** DIAGRAM.md frontmatter, **When** a reader inspects the `typography:` section, **Then** they see exactly 2 tokens: `diagram-body` (18px/400/24px) and `diagram-heading-1` (18px/700/24px).
2. **Given** the cleaned frontmatter, **When** cross-referenced against `scripts/diagram_shared.py` constants, **Then** `BODY_SIZE = "18"` maps to `diagram-body.fontSize` and `BODY_LINE_STEP = 24` maps to `diagram-body.lineHeight`.
3. **Given** the cleaned frontmatter, **When** cross-referenced against `frame_style_classes.py`, **Then** section/panel heading weight `700` maps to `diagram-heading-1.fontWeight`, and leaf heading weight `400` maps to `diagram-body.fontWeight`.

---

### User Story 2 - Remove dead Python constants (Priority: P2)

A developer grepping `diagram_shared.py` for typography constants finds only constants that are actually imported and used. Dead constants like `TITLE_SIZE`, `HEADING_SIZE`, and legacy aliases are gone.

**Why this priority**: Dead constants are a maintenance burden and confuse new contributors. They suggest capabilities (24px titles, separate heading sizes) that the engine does not implement.

**Independent Test**: Run `grep -r "TITLE_SIZE\|HEADING_SIZE\|TITLE_LINE_STEP\|HEADING_LINE_STEP\|DIAGRAM_TIER_BODY" scripts/ packages/` — should return zero results. Run `pytest scripts/test_*.py` — all tests pass.

**Acceptance Scenarios**:

1. **Given** the cleaned `diagram_shared.py`, **When** searching for `TITLE_SIZE`, **Then** no definition or import is found.
2. **Given** the cleaned `diagram_shared.py`, **When** searching for `HEADING_SIZE`, **Then** no definition or import is found.
3. **Given** the cleaned `diagram_shared.py`, **When** searching for `DIAGRAM_TIER_BODY_SIZE` or `DIAGRAM_TIER_BODY_LINE_STEP`, **Then** no definition or import is found.
4. **Given** the cleaned codebase, **When** running the full Python test suite, **Then** all tests pass with no import errors.

---

### User Story 3 - Clean spacing and grid tokens (Priority: P2)

A reader inspecting the spacing and grid frontmatter sections finds only tokens that have corresponding code constants. Redundant aliases (`unit`, `rhythm-step`, `panel-padding`, `icon-inset`) and aspirational rules (`column-counts`, `span-rule`) are removed.

**Why this priority**: Aliases inflate the spec without adding capability. Aspirational grid rules suggest enforcement that doesn't exist.

**Independent Test**: Count spacing tokens in frontmatter — should be 6 (`baseline-unit`, `inset`, `compact-gap`, `grid-gutter`, `outer-margin`, `body-line-step`). Count grid tokens — should be 5 (`baseline-unit`, `default-box-width`, `default-box-min-height`, `icon-size`, `frame-stroke-width`).

**Acceptance Scenarios**:

1. **Given** the cleaned spacing section, **When** a reader looks for `unit` or `rhythm-step`, **Then** they are not present.
2. **Given** the cleaned grid section, **When** a reader looks for `column-counts` or `span-rule`, **Then** they are not present.

---

### User Story 4 - Retire v2-only prose and reorganize unused components (Priority: P3)

A reader scanning DIAGRAM.md prose sections does not encounter v2-specific guidance (`canvas_width`, `uniform_rows`, `Panel children type ordering`) that describes a system no longer in use. Unused component specs (terminal-bar, matrix-widget, jagged-panel, icon-cluster) are clearly marked as reserved rather than appearing active.

**Why this priority**: Stale prose is misleading but not blocking. It's the lowest-risk cleanup.

**Independent Test**: Search DIAGRAM.md for `canvas_width`, `canvas_height`, `uniform_rows`, `Panel children type ordering` — none should appear in active prose. Search for `terminal-bar`, `matrix-widget` — should appear only under a "Reserved components" heading.

**Acceptance Scenarios**:

1. **Given** the cleaned DIAGRAM.md, **When** searching for `canvas_width`, **Then** it does not appear in active guidance.
2. **Given** the cleaned DIAGRAM.md, **When** searching for `terminal-bar`, **Then** it appears only under a reserved/inactive subsection.

---

### Edge Cases

- What if a future diagram needs 24px title text? → Add a `diagram-title` token at that point, backed by actual code. Don't keep dead tokens "just in case."
- What if `HEADING_SIZE` is referenced in a file not yet checked? → The grep in US2 acceptance criteria catches this. If found, the constant stays.
- What about the `LINE_HEIGHTS_BY_SIZE` lookup table that includes 24→32? → Keep it. It's a general-purpose lookup used by `default_line_step()` for any font size, not specific to the dead `TITLE_SIZE` constant.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: DIAGRAM.md frontmatter MUST contain exactly 2 typography tokens: `diagram-body` and `diagram-heading-1`.
- **FR-002**: `diagram-body` MUST specify `fontSize: 18px`, `fontWeight: 400`, `lineHeight: 24px`, `fontFamily: Ubuntu Sans`.
- **FR-003**: `diagram-heading-1` MUST specify `fontSize: 18px`, `fontWeight: 700`, `lineHeight: 24px`, `fontFamily: Ubuntu Sans`.
- **FR-004**: `scripts/diagram_shared.py` MUST NOT define `TITLE_SIZE`, `HEADING_SIZE`, `TITLE_LINE_STEP`, `HEADING_LINE_STEP`, `DIAGRAM_TIER_BODY_SIZE`, or `DIAGRAM_TIER_BODY_LINE_STEP`.
- **FR-005**: DIAGRAM.md spacing section MUST NOT contain alias tokens (`unit`, `rhythm-step`, `panel-padding`, `icon-inset`, `heading-line-step`, `title-line-step`, `default-box-growth-step`).
- **FR-006**: DIAGRAM.md grid section MUST NOT contain `column-counts`, `span-rule`, `application-gutter`, or `application-outer-margin`.
- **FR-007**: DIAGRAM.md prose MUST NOT contain active guidance about `canvas_width`, `canvas_height`, `uniform_rows`, or `Panel children type ordering`.
- **FR-008**: Unused component specs (`terminal-bar`, `matrix-widget`, `jagged-panel`, `icon-cluster`) MUST be moved to a clearly labeled "Reserved" subsection or removed.
- **FR-009**: All existing Python tests MUST pass after changes.
- **FR-010**: TypeScript compilation MUST succeed after changes.

### Key Entities

- **Typography token**: A named entry in the DIAGRAM.md `typography:` frontmatter section. Each token defines fontFamily, fontSize, fontWeight, and lineHeight.
- **Spacing token**: A named entry in the `spacing:` frontmatter section. Each token defines a pixel value and a role (invariant/default).
- **Dead constant**: A Python module-level variable that is defined but never imported by any other module in the codebase.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: DIAGRAM.md typography section contains exactly 2 tokens (down from 13).
- **SC-002**: `scripts/diagram_shared.py` has 6 fewer dead constants (from ~12 typography constants down to 6 active ones).
- **SC-003**: Zero grep hits for removed constants across `scripts/` and `packages/`.
- **SC-004**: All existing Python tests pass (`pytest scripts/test_*.py`).
- **SC-005**: TypeScript compiles cleanly (`npx tsc --noEmit` in `packages/layout-engine`).
- **SC-006**: No SVG output changes — the cleanup is documentation and dead-code only.

## Assumptions

- The current engine uses exactly 18px body text and 18px/700 heading text. This was verified by reading `diagram_shared.py` (`BODY_SIZE = "18"`), `frame_style_classes.py` (heading weights 700 and 400), and `tokens.ts` (`BODY_SIZE = 18`).
- No YAML diagram in the corpus overrides font size at the line level. All diagrams use the default body size.
- The `LINE_HEIGHTS_BY_SIZE` table in `diagram_shared.py` is a general utility and should not be trimmed even though it contains entries for sizes not currently used (e.g., 24→32). It serves `default_line_step()` which handles arbitrary sizes.
- The TypeScript `tokens.ts` file does not define `TITLE_SIZE` or `HEADING_SIZE` — it only has `BODY_SIZE` and `BODY_LINE_STEP`, both of which are active. No TS changes needed.
- The `make_diagram_line()` function in `diagram_shared.py` is a legacy alias that is still callable but its docstring is stale ("16px/20px is the default" — the default is now 18px/24px). This spec does not address that function; it's a separate cleanup concern.