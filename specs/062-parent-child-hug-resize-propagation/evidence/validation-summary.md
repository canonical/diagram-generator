# Spec 062 Validation Summary

Date: 2026-07-03
Branch: `feat/062-parent-child-hug-resize-propagation`

## Fixture Facts

- `scripts/diagrams/frames/test-alignment-grid.yaml` authors `container` with
  explicit `width`/`height` and `small_box` as `FIXED 192x64`.
- The user-facing repro requires a mutation step first: `small_box` is switched
  from `FIXED` to `HUG`, then `container` is resized smaller.
- The resize seam is typed end-to-end:
  `app-inspector-mutation-runtime.ts` -> `frame-prop-actions.ts` ->
  `app-live-resize.ts` / `app-resize-host.ts` -> `app-relayout.ts` ->
  `layout.ts`.
- The only JS compatibility touchpoint exercised by the browser proof remains
  `scripts/preview/editor-base.js` resize-handle rendering.

## Landed Coverage

- `packages/layout-engine/tests/layout.test.ts`
  proves both leaf and nested-container `HUG` children shrink under a narrower
  parent and `FIXED` children do not silently adopt `HUG` semantics.
- `packages/layout-engine/tests/app-fresh-render.test.ts`
  proves the real `test-alignment-grid` fixture reflows correctly after an
  inspector-style `HUG` mutation plus a smaller parent width override.
- `apps/preview/src/persistence/frame-diagram.test.ts`
  proves `persist -> reload` preserves both the `test-alignment-grid` `HUG`
  child sizing mode and a nested `HUG` container child's propagated
  smaller-parent fit.
- `apps/preview/src/persistence/editor-hug-resize-regression.test.ts`
  provides a real-browser proof that switches `small_box` to `HUG`, drags the
  `container` resize handle smaller, and verifies the child shrinks while
  staying within the parent bounds.

## Validation

- `npm --prefix packages/layout-engine exec vitest run tests/layout.test.ts`
- `npm --prefix packages/layout-engine test`
- `npm --prefix apps/preview test`
- `node scripts/check_no_new_python.mjs`

Passed on 2026-07-03 after installing the temp worktree dependencies:

- `npm --prefix packages/layout-engine exec vitest run tests/layout.test.ts`
- `npm --prefix packages/layout-engine test`
- `npm --prefix apps/preview test`
- `node scripts/check_no_new_python.mjs`

Notes:

- The SC-005 rerun exposed one additional renderer regression outside the
  original nested-child review finding: constrained remeasurement was
  collapsing unconstrained root/top-level `HUG` widths, which broke the
  `test-box-styles` SVG golden. `layout.ts` now preserves the requested root
  width and only refreshes non-leaf `HUG` widths when the frame was actually
  tightened.
