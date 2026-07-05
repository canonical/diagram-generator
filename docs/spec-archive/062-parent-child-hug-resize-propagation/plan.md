# Plan: Spec 062 Parent/Child Hug Resize Propagation

## Working Theory

The current resize mirror keeps a child's existing effective size during parent
resize even when that child is meant to behave as `HUG`. That produces the
reported `test-alignment-grid` failure: the parent shrinks, but the child keeps
stale geometry instead of recomputing from the new available inner bounds.

## Likely File Map

- Fixture: `scripts/diagrams/frames/test-alignment-grid.yaml`
- Resize interaction: `packages/layout-engine/src/preview-shell/app-resize-interaction-runtime.ts`
- Resize dispatch: `packages/layout-engine/src/preview-shell/interaction-resize-dispatch.ts`
- Resize host/persistence: `packages/layout-engine/src/preview-shell/app-resize-host.js`
- Layout sizing semantics: `packages/layout-engine/src/layout.ts`
- Save/reload proof: `apps/preview/src/persistence/`

## Verification Shape

- One focused layout/resize regression for `HUG` child shrink.
- One focused regression protecting `FIXED` child behavior.
- One repo-owned `persist -> reload` regression.
- One real-browser proof on `test-alignment-grid`.
