# Spec 070: Layers Palette Reorder

**Feature Branch**: `feat/070-layers-palette-reorder`
**Status**: Draft
**Created**: 2026-06-25

## Problem

The frame editor supports stage drag reorder for autolayout children, but the
Layers palette is still a static selection tree. Users naturally expect a layer
tree to support reordering, especially when the stage order is hard to inspect
or precise drag targets are crowded. The missing palette reorder path also means
the left sidebar is less useful than the stage for structure editing.

## Goals

- Allow drag/reorder directly in the frame Layers palette.
- Reuse the existing typed `children_order` override, relayout, undo, save, and
  YAML persistence path.
- Keep click selection, shift multi-select, context menu, and stage selection
  sync intact.
- Provide keyboard-accessible reorder controls or shortcuts.
- Preserve headed-container semantics where authored children render inside a
  synthetic body.

## Non-goals

- No arbitrary cross-parent reparenting in the first release.
- No drag/reorder for force nodes, sequence documents, arrows, root, synthetic
  heading/body nodes, or hidden runtime-only rows.
- No new behavior-heavy logic in `scripts/preview/*.js`.
- No broad layer-panel redesign beyond what reorder needs.

## Current Behavior

- `scripts/preview/viewer-unified.html` renders the frame Layers tab and an
  empty `#tree` container.
- `packages/layout-engine/src/preview-shell/app-shell-panels.ts` renders
  `.tree-item[data-node-id]` rows with indentation, selection state, override
  state, click selection, and context menu handling.
- `packages/layout-engine/src/preview-shell/app-selection-host.ts` synchronizes
  stage and tree selection.
- Stage drag reorder resolves a reorder target through
  `interaction-drag-dispatch.ts` and commits through
  `interaction-completion-dispatch.ts`.
- `app-editor-interaction-facade.ts` writes `children_order` on the authored
  parent via `setFrameProp(parentId, 'children_order', newOrder)`.
- `app-relayout.ts` applies `children_order` to the synthetic body when a
  headed container owns runtime children.
- `apps/preview/src/persistence/frame-diagram.ts` persists `children_order` by
  reordering the authored YAML `children` list.

## Proposed Interaction

The Layers palette becomes a structural editing surface for same-parent sibling
order.

- Clicking a row still selects it.
- Shift-click still adds/removes it from the current selection.
- Context menu still works on right click.
- A visible row grip or drag affordance starts layer reorder. Pointer movement
  over reorderable sibling rows shows before/after insertion indicators.
- Drop commits a single undoable `children_order` update and relayouts the
  stage.
- Invalid targets show no drop indicator and commit nothing.
- Keyboard users can focus a row and move it before/after siblings through a
  discoverable command path, such as small up/down reorder buttons or documented
  accessible shortcuts on the row.

Initial release scope is same-parent reorder only. Cross-parent reparenting can
be a later spec once parent compatibility, autolayout semantics, and arrow
endpoint effects are designed.

## Functional Requirements

- **FR-001**: Add a typed layer tree model that includes row id, depth, authored
  parent id, sibling index, sibling ids, selected state, override state,
  reorderable state, and non-reorderable reason.
- **FR-002**: Root rows, arrows, synthetic heading/body rows, runtime-only rows,
  removed rows, and unsupported document kinds must not be reorderable.
- **FR-003**: Rows are reorderable only among siblings under the same authored
  parent.
- **FR-004**: Headed containers must route palette reorder through the same
  authored-parent `children_order` override used by stage drag reorder, while
  relayout applies it to the synthetic body when needed.
- **FR-005**: Drag affordance must not break row click selection or context menu.
  Start drag only from the affordance or after a movement threshold that clearly
  distinguishes drag from click.
- **FR-006**: Drop indicators must distinguish before and after insertion and
  must appear only on valid sibling targets.
- **FR-007**: Dropping a row onto itself or into its current adjacent position
  must be a no-op with no dirty state and no undo entry.
- **FR-008**: A valid reorder must create exactly one undoable action, preserve
  selection, update the tree order, rerender the stage, and refresh inspector
  state.
- **FR-009**: Undo and redo must restore both stage order and layer order.
- **FR-010**: Save must persist the reordered authored YAML child order through
  `children_order`; reload must preserve the order.
- **FR-011**: Multi-selection reorder is optional for phase 1. If implemented,
  it must move selected same-parent siblings as a stable group; otherwise the UI
  must only drag the focused row and leave multi-selection intact.
- **FR-012**: Keyboard reorder must be possible without pointer drag.
- **FR-013**: Accessibility state must include focusable row controls, valid ARIA
  labels, and clear disabled state for non-reorderable rows.
- **FR-014**: Existing stage drag reorder behavior must remain unchanged.
- **FR-015**: The implementation must live in TypeScript preview-shell owners;
  legacy browser files may only delegate to typed APIs.

## User Stories

### US1: Drag siblings in the Layers palette

As an editor user, I want to drag a child row above or below a sibling in the
Layers palette so I can reorder a stack without aiming at crowded stage
geometry.

**Acceptance**: Dragging a reorderable row before or after a sibling changes the
stage order, the Layers order, and the dirty state in one action.

### US2: Save and reload preserve order

As an editor user, I want a layer reorder to persist to YAML so the diagram
opens with the same order later.

**Acceptance**: After reordering, Save writes the authored child order, reload
shows the same order, and export uses the saved order.

### US3: Invalid reorder is clearly blocked

As an editor user, I want invalid drops to do nothing so I do not accidentally
reparent or corrupt structure.

**Acceptance**: Root, arrows, runtime-only rows, and cross-parent targets show no
valid drop indicator and create no undo/dirty state.

### US4: Keyboard users can reorder

As a keyboard user, I want to move a focused layer up or down without using the
mouse.

**Acceptance**: A focused reorderable row exposes accessible move-before and
move-after commands, updates order, and participates in undo/redo.

## Success Criteria

- **SC-001**: Unit tests prove valid same-parent layer reorder produces the same
  `children_order` result as stage drag reorder.
- **SC-002**: Unit tests prove root, arrow, synthetic, cross-parent, and no-op
  drops are rejected without dirty state.
- **SC-003**: DOM-level tests prove drag affordance, before/after indicator,
  keyboard reorder, selection sync, and context menu coexist.
- **SC-004**: Save/reload tests prove YAML child order is persisted and reloads
  correctly.
- **SC-005**: `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, and `node scripts/check_no_new_python.mjs`
  pass.

## Risks

- HTML5 drag/drop can be brittle in tests. Prefer pointer-driven logic if it
  matches existing stage interaction helpers and can be tested deterministically.
- Palette rows currently flatten ids only. The new model must retain authored
  parent/sibling facts without duplicating tree authority.
- Cross-parent reparenting is tempting but materially larger because it changes
  hierarchy, layout semantics, and arrow endpoint implications.
