# Spec 078: Figma autolayout plugin

**Feature Branch**: `feat/078-figma-autolayout-plugin`
**Created**: 2026-07-08
**Status**: Draft
**Input**: User description: "Investigate and build a local-development Figma plugin that recreates diagram-generator nodes as native Figma auto-layout, starting with a simple child node with icon and wrapped text, then growing toward parent/section hierarchy import."
**Context**: linked Figma Design test file `oO0QdUZSf53hxQzBMrg54F`, runtime layout authorities in `packages/layout-engine/src/`, and sibling reference plugin `H:\WSL_dev_projects\mermaid\scripts\figma-atlas-plugin\`.

## User Scenarios & Testing

### User Story 1 - Import a canonical leaf node (Priority: P1)

As a diagram author working in a Figma Design file, I can run a local development
plugin and insert one canonical diagram leaf node as native Figma auto-layout so
the node stays editable and matches the repo's box contract.

**Why this priority**: This is the smallest slice that proves the core claim:
the diagram system can be represented in Figma as editable auto-layout instead
of as flattened SVG or image output.

**Independent Test**: Can be fully tested by running the plugin in the linked
test file, inserting one sample leaf node, and verifying its frame width,
padding, text wrap, icon position, and editability directly in Figma.

**Acceptance Scenarios**:

1. **Given** a Figma Design file and a running local plugin server, **When** the
   user runs the plugin's sample import action, **Then** one diagram leaf node is
   inserted on the current page as native Figma layers with auto-layout enabled.
2. **Given** a sample leaf label that spans multiple lines, **When** the plugin
   imports the node, **Then** the text wraps within the intended text column and
   does not overlap or displace the icon out of contract.
3. **Given** the imported sample node, **When** the user selects it in Figma,
   **Then** the node exposes editable frame padding, child layout, and text
   content rather than a single raster or vector blob.

---

### User Story 2 - Import semantic container hierarchy (Priority: P2)

As a diagram author, I can import a small semantic diagram fragment containing
sections, parents, annotations, and leaves so the Figma document preserves the
diagram-generator hierarchy, spacing, and visual role distinctions.

**Why this priority**: Once the leaf contract is proven, the next real value is
hierarchy import. This is where the plugin either stays faithful to the repo's
semantic model or collapses into absolute-position drawing.

**Independent Test**: Can be fully tested by importing a small nested sample and
verifying that section, parent, and child ordering, padding, gaps, and styling
remain editable and structurally nested in Figma.

**Acceptance Scenarios**:

1. **Given** a semantic payload with section, parent, and leaf nodes, **When**
   the plugin imports it, **Then** the resulting Figma structure uses nested
   auto-layout frames that preserve the authored parent-child relationships.
2. **Given** nodes with different semantic roles, **When** the plugin imports
   them, **Then** their fills, strokes, text emphasis, and spacing reflect the
   corresponding diagram-generator role rather than one generic box style.

---

### User Story 3 - Refresh imported nodes in place (Priority: P3)

As a diagram author iterating on the same diagram, I can rerun the plugin and
refresh previously imported nodes in place so I do not accumulate duplicates or
lose comments and local canvas organization.

**Why this priority**: Native editable import is much more useful if repeat
imports update stable nodes instead of creating a fresh copy every time.

**Independent Test**: Can be fully tested by importing a sample structure, then
changing its local payload and rerunning the plugin to confirm the existing
imported nodes update instead of duplicating.

**Acceptance Scenarios**:

1. **Given** a previously imported node set with stable import identifiers,
   **When** the plugin reruns against an updated payload, **Then** the existing
   nodes are updated in place wherever a stable match exists.
2. **Given** an imported node that no longer has a valid stable match, **When**
   the plugin attempts a refresh, **Then** the user receives a clear report
   instead of silent duplication or destructive guessing.

### Edge Cases

- What happens when the plugin is run in FigJam or another unsupported editor
  surface instead of a Figma Design file?
- How does the plugin handle a missing icon asset or an icon name that has no
  known local mapping?
- What happens when the local server is unavailable, returns invalid payload, or
  serves a payload version the plugin does not recognize?
- How does the import behave when a text label exceeds the default leaf width
  and must grow vertically through wrapping?
- How does refresh behave when part of a prior imported hierarchy was manually
  deleted or duplicated in the Figma file?

## Requirements

### Functional Requirements

- **FR-001**: The system MUST provide a local-development plugin flow for Figma
  Design files that does not depend on Figma cloud REST access for diagram
  import.
- **FR-002**: The plugin MUST obtain diagram payload and icon assets from a
  local server or local development bundle, not by reconstructing layout from
  screenshots or flattened SVG.
- **FR-003**: Imported diagram nodes MUST be created as native Figma layers
  using frames, text, instances, or shapes with auto-layout where applicable,
  not as a single raster or vector artifact.
- **FR-004**: The first implementation slice MUST import one canonical leaf node
  matching the repo contract: fixed outer width `192`, `8px` padding on all
  sides, `48x48` icon, body text `18px` with `24px` line rhythm, and `64px`
  minimum box height.
- **FR-005**: For a leaf node with icon and label text, the plugin MUST reserve
  a fixed text column equivalent to the diagram engine's layout so wrapped text
  stays stable while the icon remains pinned at the top-right.
- **FR-006**: The plugin MUST support semantic role mapping for at least leaf,
  panel/parent, section, annotation, and highlight nodes so different diagram
  classes remain visually distinguishable in Figma.
- **FR-007**: The plugin MUST preserve semantic hierarchy, authored child order,
  layout direction, gap, and per-side padding when importing nested structures.
- **FR-008**: The plugin MUST attach stable import identifiers to imported nodes
  so later refresh actions can update in place rather than duplicating by
  default.
- **FR-009**: The plugin MUST provide clear user-visible failure messages for
  unsupported editor type, local server unavailability, invalid payload, and
  unmapped assets.
- **FR-010**: The plugin package structure SHOULD reuse the sibling reference
  plugin's clean development patterns where useful, including a development
  manifest, a localhost allowlist, and a bundled main entry, while adapting the
  implementation to Figma Design auto-layout creation rather than FigJam review
  asset import.
- **FR-011**: Users MUST be able to insert the sample leaf node into the current
  Figma page without manually wiring payload data inside the plugin source.
- **FR-012**: Refresh behavior MUST be conservative: if the plugin cannot
  confidently match an existing imported node set, it MUST report the ambiguity
  instead of silently replacing unrelated nodes.

### Key Entities

- **Semantic node payload**: The local data representation of one diagram node,
  including its role, text, icon reference, sizing, padding, direction, and
  parent-child relationships.
- **Imported Figma node mapping**: The stable correspondence between a semantic
  node in the payload and the native Figma layers created for it.
- **Import session**: One plugin run that reads a local payload, reports any
  issues, and inserts or refreshes nodes in the active Figma document.
- **Icon asset reference**: The local identifier and asset path used to map a
  diagram-generator icon name onto a Figma-compatible asset or instance.

## Success Criteria

### Measurable Outcomes

- **SC-001**: In the linked Figma test file, a user can run the development
  plugin and insert the sample leaf node in under 30 seconds after opening the
  plugin.
- **SC-002**: The imported sample leaf node matches the repo's canonical leaf
  contract for width, padding, icon size, text wrap behavior, and minimum height
  without manual post-import adjustment.
- **SC-003**: After import, a user can directly edit the inserted text and
  inspect the node's frame auto-layout settings in Figma, proving the output is
  native and editable.
- **SC-004**: A small nested sample containing at least one section, one parent,
  and two leaves imports with preserved hierarchy and without manual re-layout.
- **SC-005**: Re-running the plugin on an updated sample refreshes at least text,
  icon, and spacing changes in place for previously imported nodes without
  creating duplicates.

## Assumptions

- The first supported target is a Figma Design file; FigJam support is out of
  scope unless it falls out naturally from shared plugin plumbing.
- A local development server on `localhost` is acceptable for serving payloads
  and icon assets during development and early validation.
- The diagram-generator repo remains the source of truth for semantic layout
  values; the plugin consumes exported semantic data rather than inventing layout
  rules inside Figma.
- The existing sibling plugin is a development and packaging reference only; it
  does not define the semantic import contract for this repo.
