# Feature Specification: Heading + body layout region

**Feature Branch**: `feat/002-heading-body-layout`

**Created**: 2026-05-28

**Status**: Draft – depends on feat/001-box-style-contract

**Input**: Containers with `heading:` must have a clear two-zone layout: header zone (heading text top-left, icon top-right) and body zone (children below with consistent gap/padding). Fix the synthetic `__heading`/`__body` system that currently loses fields.

## User Scenarios & Testing

### User Story 1 – Heading always top-left with icon top-right (Priority: P1)

When a container has `heading: "Title"` and `icon: Cloud.svg`, the heading text must appear at the top-left corner of the container (using INSET padding), and the icon must appear at the top-right corner.

**Why this priority**: This is the most visible bug – headings sometimes float in the middle of containers.

**Independent Test**: Create a container with `heading: "Test"`, `icon: Cloud.svg`, and two leaf children. Verify heading is at top-left, icon at top-right, children below.

**Acceptance Scenarios**:

1. **Given** a container with `heading:` and `icon:`, **When** rendered, **Then** heading text baseline starts at `(x + padding_left, y + padding_top + baseline_offset)`, icon at `(x + w - padding_right - ICON_SIZE, y + padding_top)`.
2. **Given** a container with `heading:` but no icon, **When** rendered, **Then** heading text uses the full width minus padding.

---

### User Story 2 – Body zone starts below heading (Priority: P1)

Children of a headed container must be laid out in a body region that starts below the heading zone. The heading zone height is `max(heading_text_height, ICON_SIZE) + gap`.

**Why this priority**: Overlapping heading and children makes diagrams unreadable.

**Independent Test**: Render request-to-hardware-stack. Verify no child box overlaps a panel heading.

**Acceptance Scenarios**:

1. **Given** a container with heading and children, **When** laid out, **Then** the first child's top edge is at `heading_zone_bottom + gap`.
2. **Given** a container with heading, icon, and children, **When** the icon is taller than the heading text, **Then** the body zone still starts below the icon.

---

### User Story 3 – Synthetic __heading/__body copies all layout fields (Priority: P2)

The synthetic `__heading` and `__body` children created during layout must inherit all layout-affecting fields from the parent: `wrap`, `sizing_w`, `sizing_h`, `fill_weight`, `align`, `padding_*`.

**Why this priority**: Missing field copies cause subtle layout bugs that are hard to reproduce.

**Independent Test**: Create a container with `wrap: true`, `sizing_w: fill`, `fill_weight: 2`. Verify `__heading` and `__body` inherit these fields.

**Acceptance Scenarios**:

1. **Given** a parent with `fill_weight: 2` and `sizing_w: fill`, **When** `__body` is synthesised, **Then** `__body.fill_weight == 2` and `__body.sizing_w == Sizing.FILL`.

---

### Edge Cases

- Container with heading but zero children → heading zone renders, body zone is empty (zero height).
- Container with no heading but has children → no heading zone, children start at top with padding.
- Container with heading and `direction: horizontal` children → body zone uses horizontal layout below the heading.

## Requirements

### Functional Requirements

- **FR-001**: The `__heading` synthetic child MUST be created with `align: top-left`.
- **FR-002**: The `__body` synthetic child MUST copy `wrap`, `sizing_w`, `sizing_h`, `fill_weight`, `direction`, `gap`, `align`, and `padding_*` from the parent.
- **FR-003**: The heading zone height MUST be `max(text_height, ICON_SIZE)` when an icon is present, or just `text_height` when no icon.
- **FR-004**: The body zone MUST start at `heading_zone_y + heading_zone_height + gap`.

## Success Criteria

- **SC-001**: request-to-hardware-stack renders with all headings top-left and children below.
- **SC-002**: android-security-comparison headings ("Containerized Android", "Virtualized Android") render top-left.
- **SC-003**: No heading/child overlap in any existing diagram.

## Assumptions

- Feature 001 (box style contract) is merged before this work begins.
- The heading zone model (header + body) is the only layout model for containers – no alternative zone systems are needed.
