# Spec 079: Figma component variant import

**Feature Branch**: `feat/079-figma-component-variant-import`
**Created**: 2026-07-10
**Status**: Draft
**Input**: User request: "write a new spec followup to try and map our boxes to native figma component variants that I have created. we need to consider how we're going to do nesting - i have a slot in the component where you may need to insert a parent with horizontal or vertical autolayout, depending on the need of the part of the graph. and we will need to replace the plugin buttons with a 'select yaml to import button', and wire it so any diagram can be rendered"

## Baseline

Spec 078 shipped a local Figma Design plugin that imports diagram-generator YAML
as native editable auto-layout frames. It now consumes effective layout-engine
sizing, rejects Figma-illegal fill-under-hug payloads, and validates Figma's
actual Fill/Hug/Fixed settings after import.

Spec 079 changes the target representation. Instead of drawing every semantic
box as plugin-authored frames/shapes, the importer should instantiate
user-authored native Figma component variants and populate their content slots
with direction-specific nested auto-layout.

This is intentionally a follow-up because component instances, variants, and
slots introduce Figma-specific constraints that must be proven in Figma rather
than hidden behind the working generic-frame importer.

## External API Facts To Respect

- Figma plugins can create and modify file nodes through the `figma` plugin API,
  and plugin UI runs in an iframe that can use browser APIs:
  https://developers.figma.com/docs/plugins/
- Figma plugin access to library components is limited to components already in
  the file or explicitly imported by key:
  https://developers.figma.com/docs/plugins/
- Variant/component properties are discoverable on component sets/components:
  https://developers.figma.com/docs/plugins/api/properties/ComponentPropertiesMixin-componentpropertydefinitions/
- Variant instances can be configured with `InstanceNode.setProperties(...)`,
  but current docs state that `setProperties` does not support `SLOT`
  properties and will throw for slot properties:
  https://developers.figma.com/docs/plugins/api/InstanceNode/
- Converted Figma slots are first-class `SlotNode` containers. The plugin must
  treat slot insertion as child mutation of nodes whose `type` is `SLOT`, not
  as `InstanceNode.setProperties(...)` and not as mutation of ordinary instance
  sublayers:
  https://developers.figma.com/docs/plugins/api/SlotNode/
- `showOpenFilePicker()` is limited/experimental and not baseline across all
  browser contexts, so the plugin UI must have a file-input fallback:
  https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker

## 2026-07-10 Figma Inspection Outcome

The user provided a box-component link at node `58:3` and a separate Brand icons
library link. The first local connector pass was attached to an unrelated FigJam
canvas named `MMD4`, so `58:3` was not visible. After the user selected the
master component, the connector inspected `58:3` successfully.

Outcome recorded in
[`figma-inspection-2026-07-10.md`](figma-inspection-2026-07-10.md):

- The selected component is `box` with variants/components named `Role=Child`,
  `Role=Parent`, and `Role=Section`.
- Parent and Section variants both contain a layer named `slot`.
- Correct box variant instantiation is feasible by resolving component set
  `box` and mapping semantic node roles to the `Role` variant property.
- Automatic icon selection is feasible if YAML icon ids map to icon component
  keys or stable icon component names/plugin-data markers.
- Exact remote icon component keys were not visible because the separate Brand
  icons library was not available to the connector and unauthenticated REST
  calls returned `403 Forbidden`.
- For this implementation slice, the user copied icon assets into the same
  Figma test file under frames/folders with names matching project icon names.
  The importer supports that current-file contract by matching normalized YAML
  icon names to Figma icon components or `.svg`-named cloneable icon nodes,
  including nested assets.
- The user later converted both content and icon placeholders to actual Figma
  slots. The selected implementation is strict `SlotNode` insertion: content
  uses the `SLOT` named `slot`, icons use the single non-content `SLOT` inside
  each box variant, and the importer fails rather than detaching if a required
  slot is absent or rejects mutation.

## 2026-07-12 Architectural Debugging Decision

The moving `get_children`/`get_parent` errors were one architectural failure,
not independent bad node ids: earlier code mixed live-instance sublayer
mutation with mid-build detach, invalidating handles that later steps still
used. The current implementation has removed that hybrid. It now uses a strict
live-component contract: master-tree discovery, direct instance SlotNode
addressing, component properties for visibility and preferred text overrides,
stable targeted text-node overrides when a text property is absent, no detach,
and no ordinary instance-sublayer structural mutation or traversal.

Official Figma Plugin API documentation confirms that `SlotNode` is a
freeform-content container with child APIs, while `InstanceNode.setProperties`
does not accept `SLOT` properties. Therefore the remaining work is not another
generic importer rewrite. It is a live proof that the user's converted slots
are addressable/mutable with valid slot settings, plus completion of the real
`box` component-property/slot contract.

Terra MUST execute
[`terra-live-fix-runbook.md`](terra-live-fix-runbook.md) before making another
code-side fix. Code changes are justified only by a failed assertion in that
runbook with captured live ids, node types, property definitions/references,
slot violations, and the exact failing operation.

## User Scenarios & Testing

### User Story 1 - Import any selected YAML file (Priority: P1)

As a diagram author, I can click one **Select YAML to import** control in the
Figma plugin, choose any valid frame YAML file, and import that diagram without
editing a hardcoded slug or using sample-specific plugin buttons.

**Why this priority**: The plugin must graduate from a telecom demo to a general
diagram import workflow before component variants are useful.

**Independent Test**: Run the plugin, select two different YAML files from
`diagrams/1.input/`, and verify both render without changing plugin
source or UI defaults.

**Acceptance Scenarios**:

1. **Given** the local plugin server is running, **When** the user clicks
   **Select YAML to import** and chooses a valid frame YAML file, **Then** the
   plugin sends that YAML through the same layout-engine path as preview and
   imports the resulting diagram.
2. **Given** the user selects a YAML file that includes browser-saved overrides,
   **When** the plugin imports it, **Then** the imported Figma nodes reflect the
   saved override state rather than the original unsaved preview state.
3. **Given** the user cancels the picker or selects an invalid file, **When** the
   plugin handles the event, **Then** it reports a clear non-destructive status.

---

### User Story 2 - Map semantic boxes to user-authored component variants (Priority: P1)

As a diagram author who has created native Figma component variants for diagram
boxes, I can have the importer instantiate those variants for semantic nodes so
the imported diagram uses the real design-system components rather than generic
plugin-drawn frames.

**Why this priority**: This is the core value of the follow-up. The imported
diagram should become a structured Figma design-system document, not merely an
editable recreation.

**Independent Test**: Provide a component set in the Figma test file, import a
small YAML fixture containing leaf, parent, section, highlight, and annotation
roles, and assert through Figma readback that representative boxes are
`INSTANCE` nodes from the expected main components/variant properties.

**Acceptance Scenarios**:

1. **Given** the Figma file contains the configured diagram box component set,
   **When** the plugin imports a semantic node, **Then** it creates an instance
   of the mapped component variant for that node's role/style.
2. **Given** a semantic node maps to a variant property such as role, level,
   emphasis, icon visibility, or title/body mode, **When** the plugin creates
   the instance, **Then** the Figma instance exposes the expected component
   property values.
3. **Given** no configured component or variant matches a semantic node, **When**
   the plugin imports, **Then** it fails with a mapping error unless an explicit
   fallback component is configured for that role.

---

### User Story 3 - Populate component slots with nested auto-layout (Priority: P1)

As a diagram author, I can use a component variant with a content slot, and the
importer can insert a generated horizontal or vertical auto-layout parent inside
that slot so nested graph structure remains editable and directionally correct.

**Why this priority**: Component variants alone do not solve nested diagrams.
The importer must preserve the diagram-generator hierarchy inside the component
slot without flattening or losing Fill/Hug/Fixed parity.

**Independent Test**: Import a fixture with one vertical section containing
horizontal child rows and one horizontal parent containing vertical child stacks.
Inspect the Figma result to verify each component slot contains the correct
generated auto-layout parent and child order.

**Acceptance Scenarios**:

1. **Given** a mapped component variant declares exactly one importer-recognized
   content slot, **When** the semantic node has children, **Then** the plugin
   inserts a generated slot container into that slot.
2. **Given** the payload says the body/child flow is horizontal, **When** the
   plugin builds the slot container, **Then** that container uses horizontal
   auto-layout with payload gap, padding, child order, and effective sizing.
3. **Given** the payload says the body/child flow is vertical, **When** the
   plugin builds the slot container, **Then** that container uses vertical
   auto-layout with payload gap, padding, child order, and effective sizing.
4. **Given** the target component does not expose a real mutable `SLOT` node,
   **When** the importer reaches that node, **Then** import fails with an
   actionable slot-contract error instead of detaching or rewriting ordinary
   instance sublayers.

---

### User Story 4 - Refresh without destroying component overrides (Priority: P2)

As a diagram author iterating between browser YAML and Figma, I can rerun import
on the same selected YAML and refresh generated content while preserving Figma
overrides that the importer does not own.

**Why this priority**: Component instances are valuable because designers may
adjust component properties or nested overrides after import. Refresh must not
silently wipe unrelated work.

**Independent Test**: Import a fixture, make a non-generated component override
allowed by the mapping contract, change the YAML, rerun import, and verify owned
content updates while the allowed Figma override remains.

**Acceptance Scenarios**:

1. **Given** an imported diagram has stable import IDs, **When** the same YAML is
   imported again, **Then** existing mapped instances refresh in place rather
   than duplicating.
2. **Given** a component property is declared importer-owned, **When** the YAML
   changes, **Then** the plugin updates that property from the payload.
3. **Given** a component property is declared user-owned, **When** refresh runs,
   **Then** the plugin preserves that property unless the user explicitly opts
   into a destructive reset.

## Requirements

### Functional Requirements

- **FR-001**: The plugin UI MUST replace the sample-leaf and telecom-specific
  buttons with one primary **Select YAML to import** workflow.
- **FR-002**: The import workflow MUST support arbitrary frame YAML files, not
  only slugs present in `diagrams/1.input/`.
- **FR-003**: Arbitrary YAML import MUST route raw YAML through the local
  layout-engine server so effective sizing, synthetic heading/body frames, and
  browser-saved YAML overrides are resolved by the same authority as preview.
- **FR-004**: The server MUST expose a non-slug diagram payload path, such as a
  POST endpoint that accepts YAML text plus source metadata and returns the
  existing versioned frame-diagram payload shape.
- **FR-005**: Component mapping MUST be explicit and inspectable. The
  implementation MUST NOT hardcode transient Figma node IDs as the only way to
  find user-authored components.
- **FR-006**: The mapping contract MUST cover at least leaf, parent/panel,
  section, highlight, and annotation roles, including variant/component-property
  values needed for each role.
- **FR-007**: The importer MUST create mapped semantic boxes as Figma component
  instances when a mapping exists. It MUST NOT silently fall back to the old
  generic-frame drawing path for mapped roles.
- **FR-008**: Missing component sets, missing variant properties, ambiguous
  component matches, and unmapped semantic roles MUST produce explicit import
  failures with actionable messages.
- **FR-009**: The slot contract MUST define how the plugin identifies the
  insertion targets inside a component. For this slice, content uses exactly
  one `SLOT` named `slot`, and icons use exactly one non-content `SLOT` in each
  mapped box variant.
- **FR-010**: Before implementation commits to one slot strategy, the spec work
  MUST include a Figma feasibility probe proving whether slot content can be
  inserted while preserving component-instance semantics. The probe MUST account
  for Figma's documented `setProperties()` limitation for `SLOT` properties.
- **FR-011**: For nodes with children, the importer MUST create an intermediate
  auto-layout slot container whose direction, gap, padding, child order, and
  effective sizing come from the layout-engine payload.
- **FR-012**: Slot containers MUST preserve the spec 078 Fill/Hug/Fixed
  invariant: the plugin MUST not send Figma a child sizing combination Figma
  rejects, and readback validation MUST fail import on mismatch.
- **FR-013**: Text, icons, headings, annotations, and role-specific styling MUST
  be set through component properties or documented nested overrides when the
  component exposes those controls.
- **FR-013a**: For copied current-file icon assets, the importer MUST discover
  matching icon sources by stable normalized name outside the `box` component
  set. It MUST support nested Figma icon components, icon-sized copied Figma
  icon instances named with or without the `.svg` suffix, and `.svg`-named
  cloneable icon nodes. The importer MUST insert the resolved icon node into a
  real icon `SLOT` on the live component instance. It MUST NOT replace ordinary
  instance sublayers, detach the box, or silently fall back to raw SVG drawing.
  In component mode, successful icon output SHOULD be a Figma component/instance
  source rather than a raw imported SVG recreation. If a semantic node has no
  icon or a requested icon cannot be resolved under an explicit continue-on-
  missing policy, the importer MUST hide/clear the icon slot or icon visibility
  control; it MUST NOT leave the component's default placeholder icon visible.
- **FR-013b**: In component mode, helper visibility MUST be driven through a
  Figma component property discovered from the master component's
  `componentPropertyDefinitions` and sublayer `componentPropertyReferences`.
  Icon visibility SHOULD use such a Boolean property; when it is absent, the
  importer MUST clear the one real icon `SLOT` for an icon-less node. Title/
  helper text SHOULD use component properties when available. When a text
  property is absent, the importer MAY set `characters` on one explicitly
  selected `TEXT` sublayer addressed from its master-node id; it MUST NOT
  discover that target by walking a live instance or perform structural
  instance-sublayer mutation.
- **FR-014**: Refresh MUST continue to use stable import IDs and MUST define
  importer-owned versus user-owned component properties before overwriting an
  existing instance.
- **FR-015**: The Figma readback validator MUST expand beyond sizing to verify
  component identity, mapped variant/component-property values, slot-container
  direction, slot child count/order, and generated subtree import IDs.
- **FR-016**: The in-repo tests MUST cover arbitrary YAML payload creation,
  component-mapping resolution, slot-container direction selection, and negative
  failures for missing/ambiguous mappings.
- **FR-017**: Component-mode import MUST NOT introduce hardcoded fixed heights
  that contradict the layout-engine payload. Mapped instances, generated slot
  containers, and slot children MUST preserve effective Fill/Hug/Fixed behavior
  unless the payload explicitly requests `FIXED` on that axis.
- **FR-018**: Component helper text MUST be controlled from the payload. Default
  helper text in the authored component MUST be hidden or cleared when the YAML
  node does not provide helper/body text for that component property.
- **FR-019**: Slot population MUST replace importer-owned generated slot
  content, not append duplicate parent/section instances on rerun. A parent or
  section content slot MUST contain one generated body/container for that
  semantic node; deeper nesting is allowed only when it corresponds to real YAML
  hierarchy, not repeated import wrappers.
- **FR-020**: After any generated body or mapped child is reparented into a
  live `SLOT`, the importer MUST record its transaction-scoped import identity
  and post-reparent node id. Validators MAY use a globally resolved node or a
  valid direct handle, but MUST NOT traverse an instance. If Figma makes an
  already-inserted live-slot descendant opaque to both readback mechanisms,
  validation MUST retain the mutation-time sizing and successful empty
  `limitViolations` assertion rather than roll back the diagram solely for a
  missing post-build node. After content or icon mutation, the importer MUST
  fail if that real `SlotNode` reports any `limitViolations`.
- **FR-021**: Component-mode import MUST preserve the V3 payload's effective
  geometry across Figma auto-layout reparenting: restore only `FIXED` width or
  height after the child enters its final auto-layout parent; leave `HUG` axes
  content-driven and retain `FILL` as an auto-layout sizing mode.
- **FR-022**: V3 nodes with `kind: container` are structural layout wrappers,
  not semantic boxes. Component-mode import MUST create them as raw generated
  auto-layout frames and MUST NOT insert a `Role=Parent` instance or its
  authored placeholder label for those nodes.

### Non-Goals

- Publishing to Figma Community or removing the localhost development server.
- Importing remote library components by key unless a concrete key-based
  mapping is added and tested. First slice may require components to exist in
  the current Figma file.
- Directly importing unsaved browser preview state. This spec consumes selected
  YAML; users must save browser overrides to YAML before import.
- Replacing the spec 078 generic importer until component mapping and slot
  insertion are proven. The old path can remain as an explicit debug fallback,
  but not as the silent result for mapped production imports.

## Key Entities

- **Component mapping manifest**: The repo or file-local contract that maps
  diagram semantic roles/style signals to Figma component sets, variants,
  component properties, and ownership rules.
- **Mapped box instance**: A Figma `INSTANCE` node created from the configured
  component variant for one semantic diagram node.
- **Content slot**: The importer-recognized insertion point inside a mapped
  component where generated child layout is placed.
- **Slot container**: A generated Figma auto-layout frame inserted into a
  content slot to hold child semantic nodes in horizontal or vertical flow.
- **Selected YAML import session**: One plugin run that reads a user-selected
  YAML file, asks the local server to layout it, resolves component mappings,
  imports or refreshes nodes, and validates the result.

## Success Criteria

- **SC-001**: A user can run the plugin, click **Select YAML to import**, choose
  any valid frame YAML file, and import the diagram without changing plugin
  code or a hardcoded slug.
- **SC-002**: At least two different repo YAML diagrams import through the same
  selected-file workflow.
- **SC-003**: Representative imported leaf, parent, section, highlight, and
  annotation boxes are Figma component instances from the configured user
  component set, verified by readback.
- **SC-004**: Nested component slots contain generated horizontal or vertical
  auto-layout containers that match the payload direction, child order, gap,
  padding, and effective sizing.
- **SC-005**: A browser-saved YAML override affecting sizing or child order is
  visible in the imported Figma component-instance structure.
- **SC-006**: The readback validator catches an intentionally wrong component
  mapping, wrong slot direction, and wrong Fill/Hug/Fixed sizing in tests.
- **SC-007**: Live Figma verification records whether strict `SlotNode`
  insertion preserves component-instance semantics, with no ambiguous "looks
  right" closeout and no detach fallback.
- **SC-008**: Live Figma verification shows no unintended hardcoded heights, no
  visible default helper text, no visible default placeholder icons, no raw-SVG
  icon fallback where component icons exist, and no duplicate parent/section
  instances or repeated generated slot containers after rerun.

## Edge Cases

- The selected YAML is valid YAML but not a supported frame diagram.
- The selected YAML references icons that do not have mapped component/icon
  controls.
- A component's default helper text or default icon remains visible because the
  importer did not set/hide the corresponding component property or slot.
- Copied Brand icon sources exist as Figma components/instances, but the import
  output still contains raw SVG recreation or the component's default icon.
- The copied icon asset is nested inside a frame/folder rather than placed at
  page root.
- A `box` component placeholder icon has the same `.svg` naming convention as
  copied icon assets; discovery must not mistake component internals for the
  external icon source library.
- The configured component set is absent, duplicated, renamed, remote-only, or
  not yet imported into the file.
- The expected slot marker exists more than once or not at all in a component
  variant.
- Figma rejects mutation of a required content or icon `SLOT` on an intact
  component instance.
- Reimporting or nesting a parent/section appends another generated body inside
  an existing generated body, producing repeated `slot -> body -> slot -> body`
  wrappers that do not correspond to YAML hierarchy.
- Component variants have authored default dimensions that conflict with the
  layout-engine effective sizing, causing hardcoded heights in imported output.
- A role maps to a variant property name that has a generated `#...` suffix.
- The user refreshes a diagram after manually deleting or modifying part of the
  imported instance tree.
- The file picker API is unavailable in Figma Desktop's plugin iframe; fallback
  `<input type="file">` must still work.
