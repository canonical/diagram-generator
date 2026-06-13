# Feature Specification: Arrow–arrowhead gap fix

**Feature Branch**: `feat/003-arrow-gap-fix`

**Created**: 2026-05-28

**Status**: Draft – independent of feat/001 and feat/002

**Input**: Fix the visible gap between arrow shafts and arrowheads in rendered diagrams. The gap appears as a white space between the last segment of the arrow shaft and the triangular arrowhead.

## User Scenarios & Testing

### User Story 1 – Arrow shaft meets arrowhead seamlessly (Priority: P1)

When an arrow connects two boxes, the shaft's last segment must reach the arrowhead's base with zero visible gap. Currently, `ARROW_CLEARANCE` and segment-length calculations leave a gap.

**Why this priority**: This is a visual glitch visible in every diagram with arrows.

**Independent Test**: Render request-to-hardware-stack. Zoom to 200%. Verify no gap between any arrow shaft and its arrowhead.

**Acceptance Scenarios**:

1. **Given** a vertical arrow from box A to box B, **When** rendered, **Then** the shaft's endpoint equals the arrowhead's base y-coordinate.
2. **Given** a horizontal arrow, **When** rendered, **Then** the shaft's endpoint equals the arrowhead's base x-coordinate.
3. **Given** a routed arrow with multiple segments, **When** the last segment approaches the target, **Then** the shaft meets the arrowhead with no gap.

---

### Edge Cases

- Very short arrows (adjacent boxes) – shaft may be too short for clearance. Must still connect.
- Arrows that route around obstacles – the last segment after the final turn must still meet the arrowhead.

## Requirements

### Functional Requirements

- **FR-001**: The arrow shaft's final point MUST coincide with the arrowhead polygon's base.
- **FR-002**: `ARROW_CLEARANCE` MUST NOT create a gap between shaft and head – it controls the gap between the arrow path and obstacle boxes, not between shaft and head.
- **FR-003**: The fix MUST apply to both straight and routed (multi-segment) arrows.

## Success Criteria

- **SC-001**: Zero visible gaps between shafts and arrowheads in all existing diagrams.
- **SC-002**: Arrow clearance from box edges is maintained (arrows don't touch box borders).

## Assumptions

- This is a bug fix in the arrow rendering/routing code, not a contract change.
- Arrow colours (orange) and head dimensions are unchanged.
- This feature can be developed on a parallel branch, independent of features 001 and 002.
