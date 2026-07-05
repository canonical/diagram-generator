# Spec 051: Preview Editor Contextual Aside

**Feature Branch**: `feat/051-preview-editor-contextual-aside`
**Status**: Closeout Ready 2026-06-29 — Phase 8 live UI audit is now proven by
real Playwright gestures, Tab traversal, DOM state, and cropped screenshots in
`evidence/contextual-aside-result.json` plus `evidence/screenshots/`. The
single-selection autolayout inspector is gated by active-engine grid-editing
capability, ELK algorithm controls are active-manifest contextual, raw view is
ELK-only, and the debug overlay / compatibility help text are absent. Closing
gate:
[`specs/065-interactive-relayout-contract/verification-protocol.md`](../065-interactive-relayout-contract/verification-protocol.md)
(§2 "Inspector / ELK option contextual surfacing").
See [`docs/spec-reviews/CLINE-VERDICT-2026-06-28.md`](../../docs/spec-reviews/CLINE-VERDICT-2026-06-28.md).
(was: Draft)
**Created**: 2026-06-25

## Problem

The preview editor right aside and left navigation expose controls by static
template section instead of by the active engine, active document kind, and
current selection. This makes the editor noisy and sometimes wrong. The clearest
example is that ELK controls can be present in a v3 editor even though the v3
engine manifest has no `elk-layout` sidebar section. The same class of problem
shows up in grid controls, force controls, empty selection states, arrow
selection, and multi-select actions.

The target shape is closer to Figma's right aside: stable high-level sections,
small predictable groups, and controls that appear only when the current object
can use them.

## Goals

- Make preview chrome visibility manifest-driven and selection-driven.
- Ensure controls are visible when applicable and absent or disabled when not
  applicable.
- Reorganize the right aside into predictable, compact groups: Selection,
  Layout, Position, Appearance, Engine, Document, and Diagnostics.
- Keep all behavior in TypeScript preview-shell or preview-engine owners.
- Add focused tests that lock the visible section matrix without screenshot
  capture.

## Non-goals

- No new behavior-heavy ownership in `scripts/preview/editor.js`,
  `scripts/preview/layout-bridge.js`, or new `scripts/preview/*.js` files.
- No redesign of diagram rendering, layout algorithms, or YAML schema.
- No visual screenshot approval workflow unless explicitly requested.
- No broad replacement of Baseline Foundry chrome outside the preview editor.

## Current UI Inventory

| Area | Current element | DOM/source | Show when | Hide or disable when |
|------|-----------------|------------|-----------|----------------------|
| Left nav | Browse tab and browse pane | `nav-tab-browse`, `nav-pane-browse` in `scripts/preview/viewer-unified.html` | Any preview route with browse links | Never hidden by engine; disable nav only during blocking save/relayout |
| Left nav | Layers tab and frame tree | `nav-tab-layers`, `nav-pane-layers`, `#tree` | `shellMode === 'grid'` and document kind is `frame-diagram` with `capabilities.nodeInspector` | Force, sequence, output-only, or future engines that do not expose a frame tree |
| Left nav | Force Nodes tab and tree | `nav-tab-nodes`, `nav-pane-nodes`, `#tree-force` | `shellMode === 'force'` | All grid/frame/sequence routes |
| Stage | Output pane and stage | `#output-pane`, `#stage` | Every viewer route | Only replaced by route-level error page |
| Stage | Guide badge | `#guide-badge` | Native grid editor when guide mode is active | ELK, force, sequence, or any engine without grid editing |
| Header | Back link, diagram picker, prev/next | `.nav-back`, `#diagram-picker`, `#diagram-prev`, `#diagram-next` | Any multi-document preview route | Disable prev/next at list edges; hide picker only for one-off embed contexts |
| Header | Build/status text | `#build-status` | Every route | Never hidden; values come from active relayout/save state |
| Selection | Empty inspector | `#inspector` empty message | No selected element | Replaced by single, multi, arrow, or force-node inspector |
| Selection | Single frame inspector | `inspector-single-panel.ts`, `inspector-autolayout-panel.ts` | Exactly one selectable frame node | Arrow-only, root-only unsupported, force-only, or no selection |
| Selection | Single arrow inspector | `inspector-single-panel.ts` waypoint block | Exactly one arrow selection | Frame selection and multi-selection |
| Selection | Multi inspector | `inspector-multi-panel.ts` | Two or more selected items | Single selection, empty selection |
| Selection | Force node inspector | `scripts/preview/force.js` until force migration | Force route with one or more selected nodes | Grid/frame/sequence routes |
| Engine | Layout engine switcher | `#engine-switcher-section`, `engine-switcher.js` | Frame diagrams with more than one compatible engine, or current persisted engine needs repair | Single compatible engine and current engine is valid |
| Engine | ELK controls | `#elk-layout-section`, `elk-layout-controls.ts`, `elk-shell-controller.ts` | Active manifest has `hostView.sidebarSections` containing `elk-layout` and `capabilities.layoutControls` | v3, force, sequence, or any engine without the `elk-layout` section |
| Engine | ELK raw/debug toggles | `#elk-raw-view-toggle`, `#elk-debug-overlay-toggle` | Active engine supports the specific debug feature; raw view requires `rawDebugView` or explicit `elk-layout` debug support | v3; ELK if capability is false; force/sequence |
| Layout | Grid controls | `#grid-controls`, `#grid-margin-controls`, `grid-controls.ts` | Active manifest has `capabilities.gridEditing` | ELK, force, sequence, output-only frame renderers |
| Layout | Link to root frame | `#grid-link-root` | Native grid editing and root frame supports linked grid overrides | Engine does not persist/apply root grid overrides |
| Layout | Absorb slack | `#grid-slack` | Native grid editing and root grid can absorb slack | ELK, force, sequence, or when row model is inactive |
| Document | Overrides summary | `#override-summary` | Interactive frame editor with override state | Output-only, force routes using force-specific summary |
| Document | Save | `#btn-save` | Interactive frame editor with persistable dirty state | Disabled when clean, relayout blocked, invalid constraints, or route cannot save |
| Document | Save SVG | `#btn-save-svg` | Frame diagram export route exists | Disabled while saving/exporting or when current render failed |
| Document | Undo/Redo | `#btn-undo`, `#btn-redo` | Interactive editor with undo stack | Disabled when stack side is empty |
| Document | Clear all | `#btn-clear-all` | Interactive frame editor with clearable overrides/removals | Disabled or hidden when no clearable editor state exists |
| Document | Copy overrides | `#btn-export` | Debug/developer mode or there are overrides to copy | Hidden by default in normal editing; available through diagnostics if retained |
| Diagnostics | Constraints section | `#constraint-status` | Interactive frame editor with active constraint registry | Hidden if no constraint registry applies |
| Force | Solver controls | `#ticks-per-frame`, run/step/reset/save/export | Force route with simulation controls | Grid/frame/sequence routes |
| Force | Simulation params | `#force-params` | Force route with `capabilities.simulationControls` | Grid/frame/sequence routes |
| Force | Guidance | Force guidance section | Force route | Grid/frame/sequence routes |

## Proposed Visibility Model

Create a typed `PreviewUiContext` and `PreviewPanelRegistry` under
`packages/layout-engine/src/preview-shell/`.

`PreviewUiContext` must be derived from:

- `PreviewEngineManifest`
- `PreviewDocumentKind`
- `PreviewShellMode`
- `PreviewEngineCapabilities`
- `PreviewEngineHostView.sidebarSections`
- compatible engine list
- current selection count and selection kinds
- selected node facts already computed by inspector helpers
- dirty, undo, redo, relayout, constraint, and save state
- reference image availability

Each panel or control group declares:

- stable id
- user-facing group name
- owning source module
- visibility predicate
- disabled predicate, if a disabled control is clearer than hiding
- reason string for tests and future debug tooling

Visibility must be computed once and applied by typed host helpers. Browser
entry glue may pass DOM references, but it must not own new branching.

## Functional Requirements

- **FR-001**: The editor must compute panel visibility from a typed context
  object instead of scattered DOM checks and engine-name comparisons.
- **FR-002**: `#elk-layout-section`, ELK raw view, and ELK debug controls must
  be hidden and unfocusable when the active manifest does not expose the
  `elk-layout` sidebar section. This explicitly means hidden for v3.
- **FR-003**: Grid controls must be visible only when the active manifest has
  `capabilities.gridEditing === true`.
- **FR-004**: Force solver, force simulation, force node tree, and force
  guidance controls must be visible only for force-shell documents.
- **FR-005**: The engine switcher must be visible only when there are multiple
  compatible engines or when the persisted engine is invalid and needs repair.
  Its help text must clearly state that switching persists `meta.layout_engine`
  immediately and reloads the page.
- **FR-006**: Empty selection must show a compact empty state only; no frame,
  arrow, sizing, style, distribute, or delete controls may remain visible.
- **FR-007**: Single frame selection must show only frame-applicable groups:
  identity, layout, sizing, position, appearance, overrides, and violations.
- **FR-008**: Container-only controls, including direction and gap delta, must
  appear only for selected frames that are containers or have children.
- **FR-009**: Position type and absolute offset controls must appear only for
  selected frames with a parent; offset X/Y appears only when position is
  `ABSOLUTE`.
- **FR-010**: Width and height fixed inputs must appear only when the matching
  sizing mode is `FIXED`; fill weight only when width is `FILL`; max chars only
  for text-bearing hug-width nodes.
- **FR-011**: Style controls must be hidden for structural wrappers and
  non-styleable selections; structural wrappers may show a read-only note.
- **FR-012**: Single arrow selection must show arrow/waypoint information and
  must not show frame sizing, frame style, container direction, or grid controls.
- **FR-013**: Multi-selection must expose align actions when every selected
  selectable has bounds; distribute and gap controls only when all actionable
  selections are same-parent siblings.
- **FR-014**: Multi-selection bulk style, sizing, and direction controls must be
  shown only when every selected actionable item supports that group. Mixed
  values may show "Mixed"; unsupported selection kinds must be summarized, not
  silently ignored.
- **FR-015**: Save, Save SVG, Undo, Redo, Clear all, and Copy overrides must
  move into a compact Document group with correct disabled state and no layout
  shift when state changes.
- **FR-016**: Constraint and violation sections must be visible only when there
  is an active constraint or violation state to show.
- **FR-017**: Reference-image controls, if added or retained, must be visible
  only when `has_reference` is true and the active manifest supports reference
  images.
- **FR-018**: The right aside must use stable section ordering:
  Selection, Layout, Position, Appearance, Engine, Document, Diagnostics.
- **FR-019**: Tests must prove the matrix for at least v3, ELK, force, empty
  selection, single frame, single arrow, same-parent multi-select, mixed
  multi-select, and root selection.
- **FR-020**: No implementation task may widen `scripts/preview/editor.js` or
  `scripts/preview/layout-bridge.js` beyond tiny delegation glue.

## User Stories

### US1: v3 editor shows native controls only

As a diagram editor user, I want the v3 editor to show native grid and frame
controls without ELK panels so I can edit the current diagram without irrelevant
engine options.

**Acceptance**: On a v3 frame diagram, ELK layout controls, raw view, and debug
overlay toggles are absent or hidden and cannot be tabbed to. Native grid
controls remain available.

### US2: ELK editor shows ELK controls only where meaningful

As an ELK diagram editor user, I want ELK spacing/routing controls visible, but
native grid controls hidden when ELK does not honor them.

**Acceptance**: On an ELK frame diagram, the ELK layout group is visible and
native grid controls are hidden unless a future manifest explicitly supports
both.

### US3: Selection panel follows the selected object

As an editor user, I want the right aside to change based on whether I selected
a frame, container, arrow, root, or multiple items.

**Acceptance**: Frame-only controls never appear for arrows, container controls
never appear for leaves, and multi-select controls reflect same-parent and
unsupported-item rules.

### US4: Document actions are predictable

As an editor user, I want save/export/undo/redo to stay in one place with
accurate enabled state.

**Acceptance**: Document actions do not jump between engine and selection
states, and disabled states explain whether the blocker is clean state, invalid
constraints, missing renderer, or active relayout.

## Success Criteria

- **SC-001**: Focused DOM tests prove `#elk-layout-section`,
  `#elk-raw-view-toggle`, and `#elk-debug-overlay-toggle` are hidden/unfocusable
  for v3.
- **SC-002**: Focused DOM tests prove `#grid-controls` is hidden for ELK because
  current ELK manifest has `gridEditing: false`.
- **SC-003**: Selection-render tests cover empty, frame, container, arrow,
  same-parent multi, mixed-parent multi, and root selection.
- **SC-004**: A panel registry test proves every static section in
  `viewer-unified.html` has a typed visibility owner.
- **SC-005**: `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, and `node scripts/check_no_new_python.mjs`
  pass after implementation.

## Risks

- Some existing tests may assume sections exist even when hidden. Update tests
  to assert context-driven visibility instead of static DOM presence.
- `engine-switcher.js` is currently legacy glue. Keep changes to delegation and
  move model/visibility logic into TypeScript.
- Force controls still live in `scripts/preview/force.js`. This spec can gate
  force shell visibility, but force-internal migration remains separate.

## Follow-Up Audit: Live UI Regressions

User review after the first implementation pass reported that some controls are
still visible or unclear in real editing flows. Treat these as open follow-up
requirements before closing spec 051.

### Reported Issues

- ELK controls are still visible when the selected/active engine is not ELK.
  The next pass must reproduce this live, including after engine switching and
  reload, and must verify raw/debug ELK controls and nested ELK inputs are not
  visible or focusable for v3 or any non-ELK engine.
- The single-selection inspector currently shows redundant identity chrome such
  as `Selection`, repeated `Selection`, selected id text like `global_server`,
  and type text like `Frame`. This does not add useful editing value and should
  be removed from the right aside.
- The `weight` parameter appears to be a no-op when changed from 1 to 2. Since
  stroke and visual styling are defined by box variants and are not meant to be
  user-tamperable, the inspector must either prove `weight` has a real layout
  effect in a supported case or remove it.
- The style input currently shows `as defined`, which is not actionable. If a
  style/variant value is displayed, it must spell out the effective variant
  such as `child`, `parent`, `section`, `highlight`, or `annotation`, with a
  clear fallback for unknown authored variants.
- Layout grid controls must not be globally visible for any v3 selection. They
  should be visible only when the top-level page/root is selected and the active
  engine supports native grid editing.
- Constraint diagnostics can show counts like `31 warnings` without explaining
  what the warnings mean or where to inspect them. The Diagnostics group needs
  an actionable details model, not just a count.

### Proposed Fix Direction

- Add a live DOM reproduction for the ELK leakage before patching. Assert the
  active engine id, persisted `meta.layout_engine`, server-rendered hidden
  placeholders, runtime DOM state, and tab order. Fix whichever layer owns the
  mismatch, not just the visible symptom.
- Simplify single-selection rendering by removing the identity group from the
  right aside. Use the Layers palette and selected element chrome as the source
  of object identity instead of duplicating id/type text in the inspector.
- Audit fill-weight semantics. If weight is meaningful only for `FILL` siblings,
  hide it outside that exact case and add a regression proving layout changes.
  If no supported engine observes it, remove the control.
- Treat Appearance as variant-driven. Do not expose stroke/weight controls as
  user-editable style tampering. Display resolved variant names explicitly, and
  only offer changes if the product intentionally supports variant selection.
- Gate Layout grid controls on both engine capability and selection kind:
  `capabilities.gridEditing === true` and `selectionKind === root/page`.
- Replace the opaque constraint count with a compact summary and expandable or
  selectable details: severity, affected frame id, rule name, and actionable
  hint. Selection-specific violations should also be reachable from the selected
  frame inspector.

### Additional Functional Requirements

- **FR-021**: ELK sections, raw/debug toggles, and nested ELK controls must be
  absent, hidden, inert, and unfocusable whenever the current active engine does
  not expose the `elk-layout` sidebar section. This must hold after engine
  switch reloads and with a freshly rebuilt browser bundle.
- **FR-022**: Single-selection inspector chrome must not duplicate selection
  identity. Remove redundant headings and id/type rows such as `global_server`
  / `Frame` from the right aside.
- **FR-023**: Layout grid controls must be visible only for top-level page/root
  selection when the active engine supports native grid editing.
- **FR-024**: `weight` controls must be hidden unless they have a tested,
  observable layout effect for the selected element. No-op controls must be
  removed.
- **FR-025**: Appearance must be variant-driven. Labels must show concrete
  effective variant names instead of `as defined`; stroke and style internals
  must not be user-tamperable unless explicitly reintroduced as product
  behavior.
- **FR-026**: Constraint diagnostics must explain warning/error counts with
  inspectable details that identify the affected element, rule, severity, and
  recommended action.
