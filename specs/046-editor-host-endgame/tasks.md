# Tasks: Editor host endgame

**Input**: Design documents from `/specs/046-editor-host-endgame/`

## Phase 1 - Remaining monolith audit

- [x] T001 Inventory the current `editor.js` responsibility buckets after specs 043 and 044
- [x] T002 Publish a cold-start decomposition map for the remaining `editor.js` surface
- [x] T003 Decide the closeout bar for "thin enough" residual host glue

## Phase 2 - Highest-value extraction slices

- [x] T010 Extract the remaining bootstrap/load/navigation coordinator region behind an explicit owner
- [x] T011 Extract the inspector action binding/dispatch host region behind an explicit owner
- [x] T012 Extract the tree/selection/reapply UI host region behind an explicit owner
- [x] T013a Extract the remaining drag/resize/waypoint completion-adjacent orchestration behind explicit owners
- [x] T013b Extract the remaining stage rerender / delete / scene-follow-up orchestration behind explicit owners
- [x] T013c Extract the remaining text-edit / bootstrap-tail / document-event coordinator glue behind explicit owners
- [x] T013d Remove residual state-copy wrappers where live interaction state already matches host contracts

## Phase 2b - Engine-scale closeout proof

- [x] T014 Define the browser-shell onboarding proof for a future engine lane that reuses an existing shell tier
- [x] T015 Verify spec 046 closeout is blocked if future engine onboarding still requires edits to `editor.js`
- [x] T016 Verify spec 046 closeout is blocked if future engine onboarding would still widen `layout-bridge.js` with engine-specific branching
- [x] T017 Define the representative engine classes the closeout proof must cover: external dependency-backed, ported diagram-family, and bespoke in-house
- [x] T018 Publish the "150-engine readiness" acceptance checklist and link it from spec 046 closeout criteria
- [x] T019 Demonstrate that the browser-shell answer for representative future engines starts from typed registration points rather than legacy JS trap files

## Phase 3 - Trap-file closeout

- [x] T020 Refresh docs and flow maps with the new owners
- [x] T021 Add or extend focused contract tests that lock the new host owners in place
- [x] T022 Re-measure `editor.js` and decide whether the residual file now qualifies as a thin host entrypoint
  Outcome: not yet "thin" in the literal sense. The active branch still leaves
  `editor.js` at roughly 1.7k lines, so the residual file is still larger than
  ideal, but it no longer owns engine onboarding or bridge runtime behavior.
- [x] T023 Confirm no remaining preview-shell JS trap file still functions as the default integration sink for future engines
  Outcome: structurally yes for future engine integration. New engine panel /
  save / bridge-runtime work should not start in `editor.js` or
  `layout-bridge.js`, even though both files still need more shrink to read as
  genuinely thin adapters.
- [ ] T024 Reject closeout unless the honest answer to "can we add 150 engines now?" is yes
  Blocked: the registration-first answer is now credible on paper for engines
  that reuse an existing shell tier, but the residual `editor.js` callback bag
  is still too large even though the three-class onboarding proof is now
  demonstrated in tests.
