# Feature Specification: Text-block inline editing for preview

**Feature Branch**: `feat/041-text-block-inline-editing`

**Created**: 2026-06-13

**Status**: Draft

**Input**: Make preview text editing behave like Figma for multi-block frames: the text block the user clicks is the one that becomes editable.

## Problem Statement

The preview shell currently renders text as semantic blocks but edits text at the component level. This creates several failures:

- double-clicking one block can open multiple editors at once
- highlight cards can show white text on a white editor surface
- interaction behavior differs by diagram density and contrast instead of by authored semantics
- commit logic can blur heading/body ownership by reconstructing both fields from one grouped edit

The system already knows the semantic text split during layout and render. This feature makes that block structure visible to interaction and persistence.

## Implementation Boundary

This feature is **TypeScript-authority with preview-shell integration**.

- Text block semantics originate from the layout engine render contract.
- Preview interaction must target those authored blocks directly.
- YAML remains the only authored source of truth.
- No new Python behavior or fallback path is allowed.

## User Scenarios & Testing

### User Story 1 - Edit only the clicked text block (Priority: P1)

As a diagram author, when a frame has multiple visible text blocks, the block I double-click should be the only one that enters edit mode.

**Independent Test**: A frame with `heading + label` exposes two rendered blocks. Double-clicking the heading edits only the heading; double-clicking the body edits only the body.

**Acceptance Scenarios**:

1. **Given** a leaf with `heading: Production` and `label: [deploy]`, **When** the user double-clicks the heading, **Then** only the heading block becomes editable.
2. **Given** the same leaf, **When** the user double-clicks the body, **Then** only the body block becomes editable and the heading stays visible.

---

### User Story 2 - Dark and light themes remain legible during inline edit (Priority: P1)

As a diagram author, the inline editor must remain readable on highlight, default, panel, and annotation fills.

**Independent Test**: A highlight card with white text uses a dark edit surface; a white card with black text uses a light edit surface.

**Acceptance Scenarios**:

1. **Given** white text on a black highlight card, **When** inline editing starts, **Then** the edit surface preserves contrast and the caret is visible.
2. **Given** black text on a white card, **When** inline editing starts, **Then** the edit surface remains light and preserves the rendered typography.

---

### User Story 3 - Commit updates only the semantic field that was edited (Priority: P1)

As a maintainer, I need block edits to write back only the targeted semantic field, so heading edits do not accidentally rewrite body text and vice versa.

**Independent Test**: Editing a body block preserves any existing heading override and editing a heading block preserves any existing body override.

**Acceptance Scenarios**:

1. **Given** a frame with an existing body override, **When** the heading is edited, **Then** the body override remains intact.
2. **Given** a frame with an existing heading override, **When** the body is edited, **Then** the heading override remains intact.

## Edge Cases

- container headings with no body text
- leaf body text authored as one YAML line but visually wrapped across multiple rendered lines
- transparent/annotation fills where the editor needs an explicit readable surface
- text edits after relayout has rebuilt the SVG DOM

## Requirements

### Functional Requirements

- **FR-001**: Rendered frame-owned text blocks MUST carry stable block metadata sufficient for preview interaction targeting.
- **FR-002**: Double-click on text MUST target a specific text block before any component-level text edit fallback.
- **FR-003**: Inline editing MUST open exactly one editor surface for the clicked text block.
- **FR-004**: Editing a heading block MUST write only `text.heading`.
- **FR-005**: Editing a body block MUST write only `text.label`.
- **FR-006**: Existing text overrides for non-clicked semantic fields MUST be preserved on commit.
- **FR-007**: Inline editor styling MUST remain legible on both light and dark frame fills.

### Non-Functional Requirements

- **NFR-001**: The preview shell MUST not infer text block identity from ad hoc DOM position alone when stable render metadata is available.
- **NFR-002**: The feature MUST not introduce new YAML fields or persistence formats.
- **NFR-003**: The implementation SHOULD prefer one focused render/contract test over a broad browser harness.

## Success Criteria

- **SC-001**: Multi-block frames edit one clicked block at a time.
- **SC-002**: Highlight-theme editing is visually legible.
- **SC-003**: No grouped heading/body rewrite occurs when only one block is edited.
- **SC-004**: Render contract tests cover block metadata and block-role identity.

## Out of Scope

- rich text editing
- simultaneous multi-block editing as one operation
- adding new YAML semantics for sub-line styling

