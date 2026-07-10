# Tasks: Spec 079 Figma component variant import

**Input**: [`spec.md`](spec.md), [`plan.md`](plan.md)
**Branch**: `feat/079-figma-component-variant-import`

## Phase 0 - Feasibility and Contract

- [ ] T001 Inspect the user-authored Figma component set(s) and record stable
  names, component-set identity strategy, variant properties, text/icon
  controls, and slot marker contract.
- [ ] T002 Run a live Figma slot probe proving whether the plugin can insert a
  generated auto-layout container into the component slot while preserving
  instance semantics.
- [ ] T003 Document the selected slot strategy: intact instance, detach-for-slot,
  wrapper-slot, or another proven approach.
- [ ] T004 Define component mapping ownership rules for importer-owned versus
  user-owned component properties and overrides.

## Phase 1 - Select YAML Import

- [ ] T010 Replace `ui.html` sample/telecom buttons with a primary **Select YAML
  to import** workflow.
- [ ] T011 Add a `showOpenFilePicker()` path with `<input type="file">`
  fallback for `.yaml` and `.yml` files.
- [ ] T012 Add plugin UI-to-main messages carrying selected YAML text, filename,
  and optional source metadata.
- [ ] T013 Add a local server endpoint that accepts raw YAML text and returns the
  versioned frame-diagram payload using the same layout path as slug import.
- [ ] T014 Add tests proving arbitrary YAML payload import works for at least two
  different frame YAML files.
- [ ] T015 Keep slug/sample endpoints only as explicit debug/test helpers, not
  as the visible production workflow.

## Phase 2 - Component Mapping Resolver

- [ ] T020 Add an inspectable component mapping manifest/schema for semantic
  roles, levels, variants, and component-property ownership.
- [ ] T021 Implement component-set discovery in the current Figma file without
  relying only on transient node IDs.
- [ ] T022 Implement variant/component-property resolution and validation.
- [ ] T023 Fail import with actionable messages for missing, duplicated,
  ambiguous, or incomplete mappings.
- [ ] T024 Add fake-Figma tests for successful mapping resolution and all
  negative resolver failures.

## Phase 3 - Component Instance Builder

- [ ] T030 Replace mapped semantic box creation with component instance creation
  when a mapping exists.
- [ ] T031 Apply variant/component properties for role, level, title/body/icon
  state, and other mapped semantic values.
- [ ] T032 Preserve spec 078 effective Fill/Hug/Fixed sizing when sizing mapped
  instances and generated slot containers.
- [ ] T033 Keep explicit fallback behavior only for roles configured to use a
  fallback component or debug generic-frame mode.
- [ ] T034 Add readback validation for component identity and component-property
  values.

## Phase 4 - Slot-Based Nesting

- [ ] T040 Implement slot target discovery using the selected stable marker
  contract.
- [ ] T041 Create generated slot containers with horizontal or vertical
  auto-layout based on payload child/body direction.
- [ ] T042 Insert mapped child instances into slot containers in payload child
  order.
- [ ] T043 Apply payload gap, padding, and effective body sizing to slot
  containers.
- [ ] T044 Add readback validation for slot existence, slot direction, child
  count/order, and generated subtree import IDs.
- [ ] T045 Add tests that intentionally swap slot direction and prove validation
  fails.

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

- [ ] T060 Update `apps/figma-plugin/README.md` with the selected-YAML and
  component-mapping workflow.
- [ ] T061 Record live Figma validation against the user's component variants.
- [ ] T062 Run `npm --prefix apps/figma-plugin test`.
- [ ] T063 Run `npm --prefix apps/figma-plugin run build`.
- [ ] T064 Run `npm --prefix packages/layout-engine test`.
- [ ] T065 Run `node scripts/check_no_new_python.mjs`.
- [ ] T066 Write an adversarial review prompt focused on component mapping,
  slot feasibility, arbitrary YAML import, refresh ownership, and no silent
  fallback.
