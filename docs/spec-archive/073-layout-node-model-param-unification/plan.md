# Plan: Spec 073 Layout algorithm node model and parameter-pane unification

## Working theory

The substrate is already mostly here — spec 071 interpreter nodes, the shared
param controller (`layout-params-controller.ts`), the sidebar section contract
(`sidebar-sections.ts`), and `force-param-registry.ts`. What is missing is:
(1) treating the layout algorithm as the first-class node instead of leaving
`grid`/`force` as overloaded lanes, (2) routing force through the shared param
pane instead of its bespoke lane UI, (3) renaming `grid` → `frame`, and
(4) making the panel registry contribution-based so lanes/algorithms register
panels instead of editing a central list.

No "family" layer is added; that decision (dedup to one impl per algorithm) is
what makes a family pointless. This spec is the node/param/UX model only —
backend selection is spec 074.

## Key files

- Interpreter node substrate: spec 071 owners under
  `packages/layout-engine/src/preview-shell/` (confirm the interpreter-node
  registry entry point before wiring).
- Param pane: `packages/layout-engine/src/preview-engine/layout-params-controller.ts`,
  `layout-params-controls.ts`, `sidebar-sections.ts`.
- Force params: `packages/layout-engine/src/preview-engine/force-param-registry.ts`.
- Engine manifest/types: `packages/layout-engine/src/preview-engine/types.ts`,
  `define-graph-layout-engine.ts`, `registry.ts`.
- Shell lane + panel registry: `packages/layout-engine/src/preview-shell/preview-ui-context.ts`
  (`shellMode`, `isGridShell`, `isForceShell`, `PREVIEW_PANEL_REGISTRY`),
  guarded by `packages/layout-engine/tests/preview-ui-context.test.ts`.
- Force document lane (must keep working): `apps/preview/src/preview-host/builtin-force-host.ts`,
  `force-document-actions.ts`, `force-documents.ts`, `persistence/force-spec.ts`.

## Approach (ordered, tests green at each step)

1. **Lane rename `grid` → `frame`.** Mechanical rename of `shellMode`/predicate
   vocabulary with a compat alias kept at the boundary. Land it first so later
   work uses the correct name.
2. **Panel registry → contribution-based.** Replace the central
   `PREVIEW_PANEL_REGISTRY` + `isXShell` gating with per-lane/per-algorithm panel
   registration, keeping the existing registry test as the guard. This is the
   046 T073 decomposition.
3. **Force through the shared param pane.** Feed `force-param-registry.ts` into
   `layout-params-controller.ts` so force parameters render in the same aside as
   ELK/Dagre. Keep the standalone `force-spec` routes/persistence intact.
4. **No-family guard.** Add a guard asserting no `algorithmFamily` field exists
   on the manifest/type surface, locking the decision.

## Deliberately deferred (decision-gated)

- Retiring the `force-spec` document kind by teaching the frame editor to author
  node/link graphs. `force-spec` is a real distinct authoring model, so this is
  a separate, explicitly-approved follow-up — not part of phase 1.

## Verification shape

- Unit/contract: force params resolve through the shared controller; new-lane
  panel registration needs no central-list edit; no-`algorithmFamily` guard.
- Rename safety: existing grid/frame tests pass under the `frame` name + alias.
- Regression: `force-spec` host/persistence contract tests unchanged.
- Full validation incl. size-budget guard.

## Relationship to other specs

- **071**: this spec's algorithm node = 071 interpreter node; reuse, do not
  fork.
- **046 T073**: FR-006 closes it; update the 046 T073 note to point here.
- **074**: decides which backends are registered as nodes; 073 is the model they
  plug into. 073's node-model refactor does not need to wait for 074, but do not
  retire/add backends here — that is 074.
