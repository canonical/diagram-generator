# Plan: Spec 070 Layers palette reorder

## Working theory

The stage already supports drag reorder for autolayout children through the
typed `children_order` override, relayout, undo, and YAML persistence path. The
Layers palette is still a static selection tree. The work is to make the palette
a second entry point into the **same** reorder seam — not a new reorder engine —
so drag/keyboard reorder in the palette produces the identical `children_order`
result as stage drag, with the same undo/save/reload behavior.

Same-parent sibling reorder only for phase 1. Cross-parent reparenting is a
larger, separate design (hierarchy, autolayout semantics, arrow endpoints) and
stays deferred.

## Reuse points (do not reinvent)

The palette reorder must call the existing seam, not duplicate it:

- Tree row rendering / selection / context menu / override state:
  `packages/layout-engine/src/preview-shell/app-shell-panels.ts`.
- Tree/stage selection sync:
  `packages/layout-engine/src/preview-shell/app-selection-host.ts`.
- Stage reorder target resolution + completion:
  `interaction-drag-dispatch.ts`, `interaction-completion.ts`,
  `interaction-completion-dispatch.ts`.
- `children_order` write:
  `packages/layout-engine/src/preview-shell/app-editor-interaction-facade.ts`.
- `children_order` relayout (incl. headed-container synthetic body):
  `packages/layout-engine/src/preview-shell/app-relayout.ts`.
- YAML child-order persistence:
  `apps/preview/src/persistence/frame-diagram.ts`.

The full pipeline and known limits are documented in
[`layers-palette-reorder-flow.md`](./layers-palette-reorder-flow.md), and the
requirements checklist is under [`checklists/requirements.md`](./checklists/requirements.md).
Both were folded in from the retired stray `specs/052-layers-palette-reorder/`
scaffolding; `070` is the single live reorder package.

## Likely file map

- New typed layer row model + pure helpers (flatten, drop-target resolution):
  `packages/layout-engine/src/preview-shell/` (new module; must not live in
  `editor.js` or `layout-bridge.js`).
- Palette rendering extension: `app-shell-panels.ts`.
- Palette drag runtime: new typed preview-shell module reusing the stage target
  resolver where possible.
- Keyboard reorder commands: same typed owner as the drag runtime.
- Tests: `packages/layout-engine/tests/` for row model + drop-target planning;
  `apps/preview` for DOM affordance, drag indicator, invalid-drop, keyboard,
  selection-sync, and save/reload contract coverage.

## Verification shape

- Unit: valid same-parent palette reorder yields the same `children_order`
  result as stage drag; invalid targets (root, arrow, synthetic, cross-parent,
  no-op) are rejected without dirty state.
- DOM contract: drag affordance, before/after indicators, keyboard reorder,
  selection sync, and context menu coexist; row dimensions stay stable.
- Save/reload: reordered authored YAML child order persists and reloads;
  existing stage drag reorder tests still pass unchanged.
- Full validation: `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, `node scripts/check_no_new_python.mjs`.

## Sequencing note

Phase 1 (same-parent reorder) is the whole deliverable for this spec.
Cross-parent reparenting, multi-selection group reorder, force-node palette
reorder, and layer search/collapse are explicit deferred follow-ups, not
closeout blockers.
