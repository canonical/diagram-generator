# Tasks: Preview shell editor TypeScript extraction

**Input**: Design documents from `/docs/spec-archive/043-preview-shell-editor-ts-extraction/`

**Prerequisites**: `spec.md`, `plan.md`

## Phase 1 - Active boundary refresh

- [x] T001 Audit the current live responsibilities still owned by `scripts/preview/editor.js`
- [x] T002 Publish `docs/spec-archive/043-preview-shell-editor-ts-extraction/boundaries.md` as the active archived editor-shell boundary note and link it from `docs/agent-index.md`
- [x] T003 Identify the first extraction slice with the best risk-reduction / effort ratio
- [x] T004 Document the browser-side TS landing/build contract (`packages/layout-engine/src/preview-shell/*` via `browser-entry.ts` + `build:browser`) in the active boundary notes and plan

## Phase 2 - Inspector extraction

- [x] T010 Extract inspector view-model logic into TS-owned preview-shell modules
- [x] T011 Extract inspector field visibility / merge logic into typed helpers with targeted tests
- [x] T012 Reduce `editor.js` inspector code to thin rendering / event hookup glue

## Phase 3 - Interaction extraction

- [x] T020 Extract selection state transitions into TS-owned modules
- [x] T021 Extract drag / resize / nudge controller logic into explicit interaction modules or state machines
- [x] T022 Add focused regression coverage for extracted interaction logic, including one controller/DOM/browser path rather than persistence-only validation

## Phase 4 - Grid and shell coordinator extraction

- [x] T030 Extract grid-control state resolution and update dispatch out of `editor.js`
- [x] T031 Reassess `loadSVG()` / shell bootstrap responsibilities and keep only coordinator behavior in `editor.js`
- [x] T031A Extract shell tree/sidebar and status-panel UI helpers into TS-owned modules so residual JS reads as coordinator code during architecture review
- [x] T031B Extract the local-vs-ELK relayout coordinator and runtime-only coercion cleanup into TS-owned helpers
- [x] T031C Extract the remaining single-selection inspector host glue and stage SVG host helpers into TS-owned modules
- [x] T031D Extract arrow waypoint handle/binding and drag-geometry helpers into `app-arrow-waypoints.ts`
- [x] T031E Extract live resize relayout policy and temporary override shaping into TS-owned helpers so ELK-vs-local resize behavior stops living inline in `editor.js`
- [x] T031F Extract artboard-fit, snap-target, and frame-delete orchestration into TS-owned helpers and remove the shared preview input/output/both shell branch
- [x] T031G Extract waypoint mutation and text-edit commit/cancel orchestration into TS-owned host helpers so residual `editor.js` owns browser-event glue instead of undo/cleanup flow
- [x] T032 Remove obsolete inline helpers and stale compatibility paths uncovered by the extractions
- [x] T033 Normalize shared shell hooks so future engine lanes do not require bespoke `editor.js` branches

## Phase 5 - Closeout and cold-start hardening

- [x] T040 Refresh the active boundary note and spec package based on the landed slices
- [x] T041 Update `docs/specs.md` and `TODO.md` to reflect execution status
- [x] T042 Verify no new engine-specific business logic was added to `editor.js` during the extraction work
- [x] T043 Verify the landed extraction preserves spec 038 seams and introduces no new direct design-foundry dependency
