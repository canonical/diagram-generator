# Spec 058: Layer Tree And Inspector Selection Ergonomics

**Feature Branch**: `feat/058-layer-tree-inspector-selection-ergonomics`  
**Status**: Closeout Ready  
**Created**: 2026-06-27

## Problem

Two small but high-frequency editor interactions currently feel broken:

- keyboard traversal in the Layers tree no longer behaves like the expected
  Figma-style up/down navigation flow
- the inspector can show `unknown` for the selected variant/style of an ordinary
  child box

Neither issue deserves a broad shell refactor, but both point to missing typed
contracts for selection ergonomics and effective-variant display.

## Goals

- Restore predictable keyboard traversal in the layer tree.
- Make the inspector show the effective variant/style for ordinary supported
  selections instead of `unknown`.
- Keep ownership in typed preview-shell inspectors and selection/tree owners.

## Non-goals

- No layer reorder design; that remains separate from simple keyboard traversal.
- No broad aside regrouping or chrome redesign.
- No new behavior-heavy logic in legacy browser scripts.

## Grouped Inbox Notes

- `Enter` / `Shift+Enter` to move up/down the layer tree no longer works.
- The variant field says `unknown` whenever a child box is selected.

## Implementation Notes

- Reproduced tree traversal through the typed `app-stage-binding-runtime ->
  app-selection-host -> app-shell-panels` path: tree rows rendered click and
  context-menu handlers only, so focused rows had no `Enter` / `Shift+Enter`
  traversal contract.
- Reproduced variant fallback through the typed `app-inspector-display-runtime
  -> app-inspector-host -> inspector-single-options -> frame-style` path:
  rendered child boxes with solid visible styling but no authored level/fill/
  border fields fell back to `annotation`/`unknown` instead of their effective
  visible variant.
- Landed typed fixes in `app-shell-panels.ts` (row traversal + roving tab stop)
  and `frame-style.ts` (rendered-style inference for supported white/grey box
  variants).
- Closeout evidence now includes a fixture-backed assertion for unstyled
  `test-deep-nesting` child boxes and
  `evidence/layer-tree-inspector-browser-check.mjs`, which dispatches keyboard
  events in a real browser DOM and verifies `vm_2` shows the default variant
  with no `Unknown variant` text.

## Functional Requirements

- **FR-001**: The layer tree must support typed keyboard traversal that matches
  the documented up/down navigation behavior for focused rows.
- **FR-002**: Keyboard traversal must preserve selection/focus sync with the
  current tree and stage selection model.
- **FR-003**: Effective variant/style display must resolve through a typed
  styling owner and show canonical values such as `child`, `parent`, `section`,
  `highlight`, or an explicit authored fallback when derivable.
- **FR-004**: `unknown` must not appear for ordinary supported child-box
  selections whose effective style can be inferred from authored/runtime state.
- **FR-005**: The implementation must not widen `scripts/preview/editor.js`.

## Success Criteria

- **SC-001**: Focused tests prove keyboard traversal moves through the layer
  tree predictably.
- **SC-002**: Focused inspector tests prove child-box selections resolve an
  effective variant value instead of `unknown`.
- **SC-003**: `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, and
  `node scripts/check_no_new_python.mjs` pass.

## Dependencies

- Spec 051 for broader aside cleanup.
- Spec 052 (`layers-palette-reorder`) for nearby layer-tree ownership.
