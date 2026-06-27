# Preview reroute invalidation flow

## Pipeline

1. Preview interactions commit frame overrides into `model.overrides` through the
   typed preview-shell mutation owners (`app-live-resize.ts`,
   `app-relayout.ts`, `app-layout-bridge-runtime.ts`).
2. Local relayout collects route-bearing frame overrides, applies them to a
   cloned diagram, and clears stale authored arrow geometry when
   `REROUTE_INVALIDATION_FRAME_KEYS` are present.
3. Fresh render follows the same invalidation rule before rerouting so full
   render and local relayout stay aligned.
4. `app-arrow-render.ts` and `app-diagram-data.ts` sync routed arrows back into
   the preview model and keep an `authoredWaypoints` snapshot for persistence.
5. `preview-override-model.ts` assembles the save payload. When reroute-bearing
   frame overrides are pending, it emits `waypoints: []` for arrow overrides and
   for authored-waypoint arrows so save clears stale geometry instead of
   persisting it.
6. `apps/preview/src/persistence/frame-diagram.ts` applies those arrow clears to
   YAML. Reload then routes from the preserved arrow ids and attachment targets.

## Key files

- `packages/layout-engine/src/preview-shell/frame-override-manifest.ts`
- `packages/layout-engine/src/preview-shell/preview-arrow-reroute-invalidation.ts`
- `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts`
- `packages/layout-engine/src/preview-shell/app-fresh-render.ts`
- `packages/layout-engine/src/preview-shell/app-arrow-render.ts`
- `packages/layout-engine/src/preview-shell/app-diagram-data.ts`
- `packages/layout-engine/src/preview-shell/preview-override-model.ts`
- `apps/preview/src/persistence/frame-diagram.ts`
- `scripts/preview/component-model.js`

## Tests to run

- `npm --prefix packages/layout-engine test -- preview-override-model.test.ts app-layout-bridge-runtime.test.ts app-live-resize.test.ts app-relayout-runtime.test.ts app-editor-relayout-facade.test.ts`
- `npm --prefix packages/layout-engine run build`
- `node --import ./node_modules/tsx/dist/loader.mjs --test ./src/persistence/frame-diagram.test.ts` (from `apps/preview/`)
- `node scripts/check_no_new_python.mjs`

## Known limits

- Structural edits intentionally discard stale stored waypoint geometry; reload
  trusts routing from preserved attachments instead of trying to preserve old
  path points across changed layout inputs.
