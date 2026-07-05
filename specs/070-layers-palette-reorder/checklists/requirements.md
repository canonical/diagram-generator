# Requirements Checklist: Spec 070

> Folded in from the retired stray `specs/052-layers-palette-reorder/`
> scaffolding on 2026-07-05. `070` is the live reorder package.

## Completeness

- [x] Same-parent drag/reorder is specified.
- [x] Save/reload persistence is specified.
- [x] Invalid target behavior is specified.
- [x] Keyboard accessibility is specified.
- [x] Cross-parent reparenting is explicitly out of scope.
- [x] Tests and validation commands are specified.

## Architecture

- [x] Existing `children_order` relayout and persistence path is reused.
- [x] TypeScript preview-shell ownership is required.
- [x] Legacy JS growth is prohibited.
- [x] No Python product-path logic is added.

## UX

- [x] Click selection, shift selection, and context menu are preserved.
- [x] Drop indicators are required only for valid targets.
- [x] No-op drops must not dirty the document or create undo entries.
