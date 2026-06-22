# Tasks: Render IR unification

**Input**: Design documents from `/specs/047-render-ir-unification/`

**Gate**: Do not start implementation work until spec 046 is closed enough that `editor.js` is a thin host file.

## Phase 1 - Architecture lock

- [x] T001 Confirm the post-046 start gate and define explicit unblock conditions
- [ ] T002 Inventory every remaining render geometry owner and serializer boundary
- [ ] T003 Decide whether bridge arrow patching survives as an optimization or is deleted after parity/perf review

## Phase 2 - Immediate geometry convergence

- [x] T010 Replace legacy arrowhead literals/fallbacks with shared canonical geometry helpers everywhere
- [x] T011 Add focused parity coverage that proves arrowheads/shaft truncation match across preview/export paths
- [ ] T012 Document which preview-only layers/metadata are serializer-specific and must never leak into export

## Phase 3 - Shared IR cutover

- [ ] T020 Refactor fresh preview render to consume the shared render IR instead of hand-rolled frame/arrow DOM geometry
- [ ] T021 Define or implement a preview DOM serializer that consumes the same IR as export
- [ ] T022 Make `svg-render.ts` a thin wrapper over the shared IR path or retire it after parity holds

## Phase 4 - Duplicate renderer retirement

- [ ] T030 Retire or sharply reduce duplicate bridge arrow render builders in `layout-bridge.js`
- [ ] T031 Keep interactive arrow editing as a DOM mutation layer but route its geometry through shared primitives only
- [ ] T032 Re-run export/preview parity checks and validate logical export grouping stays intact

## Phase 5 - Closeout

- [ ] T040 Refresh docs and architecture maps
- [ ] T041 Update `docs/specs.md`, `TODO.md`, and handover notes with the converged renderer state
- [ ] T042 Declare the cutover complete only when no new engine lane would need a new bespoke renderer
