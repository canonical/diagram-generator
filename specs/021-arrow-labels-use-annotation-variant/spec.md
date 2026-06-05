# Feature Specification: arrow labels use annotation variant

**Feature Branch**: `feat/021-arrow-labels-use-annotation-variant`

**Spec Package**: `021-arrow-labels-use-annotation-variant`

**Created**: 2026-06-05

**Status**: Draft

**Input**: User request that arrow labels must use the annotation frame variant so no text in the system sits outside the explicit semantic variant set: box/leaf, panel/parent, section, annotation, and highlight.

## Mission

Remove the last free-floating text styling path for arrow labels.

Arrow labels are not a special ad hoc text system. They are semantic annotation text and must render as the annotation variant in every active renderer.

That means:

- one styling authority for arrow labels: annotation variant semantics
- no arrow-label-specific inline style authority from authored `Line` fields
- no render-time fallback to raw `fill`, `weight`, `smallCaps`, `letterSpacing`, or `fontFamily`
- one export contract: fully expanded Illustrator-safe SVG attributes derived from annotation semantics

## Operating Contract

The next agent implementing this spec MUST follow these rules:

1. Treat arrow labels as annotation text, not as a separate style system.
2. Do not preserve authored arrow-label color, weight, small-caps, letter-spacing, or font-family as authoritative styling inputs.
3. Keep the final SVG exporter Illustrator-safe: no CSS/class-only export format changes in this slice.
4. Keep TypeScript authoritative.
5. Prefer small focused tests over expanding the diagram corpus.

## User Scenarios & Testing

### User Story 1 - Arrow labels inherit annotation semantics (Priority: P1)

As an engine maintainer, I need arrow labels to render as annotation text so the renderer has no free-floating text path outside the semantic variant system.

**Why this priority**: Arrow labels are currently the clearest remaining text path that bypasses the variant/snapshot model.

**Independent Test**: An arrow label with authored stale style fields still renders with annotation variant styling in the TS exporter.

**Acceptance Scenarios**:

1. **Given** an arrow label line authored with `fill: "#FF00FF"` and `weight: "900"`, **When** the SVG exporter runs, **Then** the label renders with annotation fill and weight instead of the authored values.
2. **Given** an arrow label line authored with `smallCaps: true`, **When** it renders, **Then** the label does not gain small-caps unless the annotation variant itself says so.
3. **Given** multiple arrow label lines, **When** they render, **Then** each line uses annotation variant styling consistently.

---

### User Story 2 - No text sits outside the semantic variant set (Priority: P1)

As a maintainer, I need every user-visible text path to map to an explicit semantic variant so the engine stops fighting itself with parallel styling models.

**Why this priority**: The architecture only becomes teachable when every text path belongs to a named semantic class.

**Independent Test**: Repo search of active text render paths shows frame-owned text and arrow labels both resolve through semantic style helpers rather than raw authored text styling.

**Acceptance Scenarios**:

1. **Given** frame-owned text, **When** it renders, **Then** it uses the existing frame variant snapshot path.
2. **Given** arrow labels, **When** they render, **Then** they use the annotation variant helper.
3. **Given** an exported SVG, **When** it is inspected, **Then** the styling is explicit per element but still derived from semantic variants rather than authored inline text styles.

## Non-goals

- Switching SVG export to CSS classes or embedded stylesheet output
- Preserving authored arrow-label visual overrides as styling authority
- Expanding Python parity in this slice
- Designing a new generic rich-text system

## Edge Cases

- Arrow labels may remain multi-line and still need per-line line-step handling.
- Arrow labels must stay Illustrator-safe in final export even if they become semantically annotation-driven internally.
- Preview surfaces that render arrow labels must follow the same semantic rule if they own separate render logic.

## Requirements

### Functional Requirements

- **FR-001**: Arrow labels MUST use annotation variant styling semantics.
- **FR-002**: Arrow label rendering MUST ignore authored `fill`, `weight`, `smallCaps`, `letterSpacing`, and `fontFamily` as authoritative style inputs.
- **FR-003**: The TypeScript SVG exporter MUST serialize arrow labels with explicit SVG attributes derived from annotation semantics.
- **FR-004**: Any active preview arrow-label renderer MUST use the same annotation semantic contract.
- **FR-005**: Focused regression tests MUST prove stale authored arrow-label styling does not change exported output.

### Key Entities

- **Arrow label**: Free-positioned connector text attached to an arrow.
- **Annotation variant**: The semantic text style currently used for muted note-like content.
- **Semantic text helper**: A shared helper that converts semantic intent plus authored content into resolved text specs for renderers.

## Success Criteria

- **SC-001**: A focused arrow-render regression proves stale authored arrow-label styling no longer affects the exported SVG.
- **SC-002**: Arrow labels render with annotation fill/weight semantics in TS export.
- **SC-003**: The engine can describe all user-visible text paths as belonging to explicit semantic variants or roles, with arrow labels mapped to annotation.
