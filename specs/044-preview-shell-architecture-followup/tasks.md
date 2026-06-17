# Tasks: Preview shell architecture follow-up

## Phase 1 - Surface audit

- [x] T001 Inventory the current browser-entry export surface and group it by owner concern
- [x] T002 Inventory `LayoutEngine.` call sites in `scripts/preview/editor.js` and classify them into contract buckets
- [x] T003 Publish a cold-start map for `layout-bridge.js` responsibilities and candidate decomposition slices

## Phase 2 - Contract design

- [x] T010 Define the staged preview-shell browser contract / registry shape
- [x] T011 Define the migration rules for new browser-facing preview-shell helpers
- [x] T012 Decide whether inspector action routing needs a typed action registry in this phase or a later slice

## Phase 3 - Bundle strategy

- [x] T020 Measure the current preview browser bundle surface and document the baseline
- [x] T021 Define the target bundle boundaries and the first safe split points

## Phase 4 - Execution choice

- [x] T030 Pick one bounded pilot slice if implementation proof is required
- [ ] T031 Otherwise close the spec as a design/architecture package with explicit next implementation steps

## Phase 5 - Contract migration pilots

- [x] T040 Land a namespaced `previewShell.bootstrap` consumer pilot outside the main `editor.js` trap file
- [x] T041 Land namespaced `previewEngines` consumer pilots in engine-owned browser scripts (ELK / force)
- [x] T042 Widen the staged `previewEngines` contract only where real consumers require it
- [x] T043 Start migrating `editor.js` scene / inspector consumers onto `previewShell.*`
- [x] T044 Start migrating `editor.js` bootstrap consumers onto `previewShell.bootstrap`
- [x] T045 Migrate the main `editor.js` interaction / selection / drag / resize consumers onto `previewShell.interaction`
- [x] T046 Migrate the remaining `editor.js` frame-prop / style / inspector-state consumers onto `previewShell.inspector`
- [x] T047 Widen `previewShell.*` namespace objects to eliminate the last direct `LayoutEngine.*` consumers in `editor.js`
- [x] T050 Start the first `layout-bridge.js` consumer migration against `previewBridge`
- [x] T052 Land a minimal `LayoutEngine.core` pilot and migrate `layout-bridge.js` runtime/layout/text consumers onto it
- [x] T051 Expand the `layout-bridge.js` migration beyond override filtering into a typed bridge host slice

## Phase 6 - Review follow-up hardening

- [ ] T060 Retire transitional root-level browser-entry aliases once all real consumers are stable on `previewShell.*`, `previewBridge.*`, `previewEngines.*`, and `core`
- [ ] T061 Split the oversized browser contract VM harness into smaller owner-scoped suites so contract coverage does not become a new trap file
- [ ] T062 Continue shrinking `layout-bridge.js` until it no longer reads like the default integration sink for future engine-specific browser work
