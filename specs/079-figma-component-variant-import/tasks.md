# Tasks: Spec 079 Figma component variant import

**Input**: [`spec.md`](spec.md), [`plan.md`](plan.md)
**Branch**: `feat/079-figma-component-variant-import`

## Phase 0 - Feasibility and Contract

- [x] T000 Record the 2026-07-10 Figma inspection attempt and its limitation:
  the connector was attached to an unrelated FigJam canvas, so exact component
  variant and icon library metadata remain unverified.
- [x] T001 Inspect the selected `box` component set and record visible stable
  names, variant roles, and slot marker names.
- [x] T001a Record the current-file copied-icon contract for automatic icon
  selection: icon assets live in the Figma test file under frames/folders and
  use stable names matching project YAML icon names. Remote library component
  keys remain out of scope for this slice.
- [ ] T002 Run a live Figma slot probe proving whether the plugin can insert a
  generated auto-layout container into the component slot while preserving
  instance semantics.
- [ ] T003 Document the selected slot strategy: intact instance, detach-for-slot,
  wrapper-slot, or another proven approach.
- [ ] T004 Define component mapping ownership rules for importer-owned versus
  user-owned component properties and overrides.
- [ ] T005 Record the failed post-patch rerun outcome from spec 078 as a hard
  constraint for spec 079: raw plugin-authored frame reconstruction still does
  not achieve real Figma autolayout parity, so this follow-up should not assume
  the generic-frame importer is salvageable as the primary product path.
- [ ] T006 Write a wrapper-depth audit against the current importer output,
  especially around text and headed containers, and classify each wrapper layer
  as necessary, provisional, or redundant.

## Phase 1 - Select YAML Import

- [x] T010 Replace `ui.html` sample/telecom buttons with a primary **Select YAML
  to import** workflow.
- [x] T011 Add a `showOpenFilePicker()` path with `<input type="file">`
  fallback for `.yaml` and `.yml` files.
- [x] T012 Add plugin UI-to-main messages carrying selected YAML text, filename,
  and optional source metadata.
- [x] T013 Add a local server endpoint that accepts raw YAML text and returns the
  versioned frame-diagram payload using the same layout path as slug import.
- [x] T014 Add tests proving arbitrary YAML payload import works for at least two
  different frame YAML files.
- [x] T015 Keep slug/sample endpoints only as explicit debug/test helpers, not
  as the visible production workflow.
- [x] T016 Move the canonical frame YAML corpus to `diagrams/1.input` and
  update slug-based preview/Figma/plugin/test defaults away from the former
  scripts frame directory.

## Phase 2 - Component Mapping Resolver

- [x] T020 Add an inspectable component mapping manifest/schema for semantic
  roles, levels, variants, and component-property ownership.
- [x] T021 Implement component-set discovery in the current Figma file without
  relying only on transient node IDs.
- [x] T021a Load/search all Figma pages for component and icon discovery so
  imports on `Page 1` can resolve the `box` component on `Components` and
  copied icons on `Brand icons`.
- [x] T021b Resolve only the master `COMPONENT_SET` named `box`; ignore
  `box`-named component instances and stale/deleted Figma node handles during
  mapping discovery.
- [x] T022 Implement variant/component-property resolution and validation.
- [x] T023 Fail import with actionable messages for missing, duplicated,
  ambiguous, or incomplete mappings.
- [x] T024 Add fake-Figma tests for successful mapping resolution and all
  negative resolver failures.

## Phase 3 - Component Instance Builder

- [x] T030 Replace mapped semantic box creation with component instance creation
  when a mapping exists.
- [ ] T031 Apply variant/component properties for role, level, title/body/icon
  state, and other mapped semantic values.
- [x] T032 Preserve spec 078 effective Fill/Hug/Fixed sizing when sizing mapped
  instances and generated slot containers.
- [x] T033 Keep explicit fallback behavior only for roles configured to use a
  fallback component or debug generic-frame mode.
- [x] T034 Add readback validation for component identity and component-property
  values.
- [ ] T035 Re-review whether component instances should own box internals
  entirely, with the plugin limited to placement, property assignment, text
  replacement, icon swap, and visibility toggles instead of procedural box
  reconstruction.
- [x] T036 Support current-file copied icon assets in component mode, including
  nested Figma icon components and `.svg`-named cloneable icon nodes, while
  excluding `box` component internals from discovery.

## Phase 4 - Slot-Based Nesting

- [x] T040 Implement slot target discovery using the selected stable marker
  contract.
- [x] T041 Create generated slot containers with horizontal or vertical
  auto-layout based on payload child/body direction.
- [x] T042 Insert mapped child instances into slot containers in payload child
  order.
- [x] T043 Apply payload gap, padding, and effective body sizing to slot
  containers.
- [x] T044 Add readback validation for slot existence, slot direction, child
  count/order, and generated subtree import IDs.
- [x] T045 Add tests that intentionally swap slot direction and prove validation
  fails.
- [ ] T046 Define and document a wrapper budget for the component path so text
  and headed containers do not inherit the awkward 4-deep text wrapper pattern
  from the generic-frame importer unless a wrapper is proven necessary.
- [ ] T047 Flatten the text/content insertion path for mapped instances:
  minimize text-stack/block/body/content wrappers, prefer direct instance text
  overrides where possible, and keep generated slot containers only where the
  component contract truly requires them.
- [ ] T048 Add one cold-start comparison example showing the current generic
  importer tree versus the target component-instance tree for a leaf, a headed
  parent, and one text-heavy node.

## Phase 5 - Refresh and Overrides

- [ ] T050 Define selected-YAML import IDs that are stable across reruns and do
  not collide between files with the same basename.
- [ ] T051 Refresh existing mapped component instances in place when import IDs
  match.
- [ ] T052 Preserve user-owned component properties during refresh.
- [ ] T053 Update importer-owned component properties from YAML/payload changes.
- [ ] T054 Add tests for refresh, deletion ambiguity, and user-owned override
  preservation.

## Phase 6 - Closeout

- [x] T060 Update `apps/figma-plugin/README.md` with the selected-YAML and
  component-mapping workflow.
- [ ] T061 Record live Figma validation against the user's component variants.
- [ ] T061a During live validation, explicitly inspect representative nodes for
  both sizing parity and wrapper depth: one leaf, one parent, one section, and
  one text-heavy node.
- [x] T062 Run `npm --prefix apps/figma-plugin test`.
- [x] T063 Run `npm --prefix apps/figma-plugin run build`.
- [x] T064 Run `npm --prefix packages/layout-engine test`.
- [x] T065 Run `node scripts/check_no_new_python.mjs`.
- [ ] T066 Write an adversarial review prompt focused on component mapping,
  slot feasibility, arbitrary YAML import, refresh ownership, and no silent
  fallback.
- [ ] T067 Write an adversarial re-review prompt focused specifically on:
  missing real-Figma autolayout parity, awkwardly deep nesting, and whether the
  component-instance architecture has fully replaced the fragile generic-frame
  reconstruction path.
