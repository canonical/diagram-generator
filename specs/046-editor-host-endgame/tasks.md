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
- [x] T018 Publish the "50/150/500-engine readiness" acceptance checklist and link it from spec 046 closeout criteria
- [x] T019 Demonstrate that the browser-shell answer for representative future engines starts from typed registration points rather than legacy JS trap files
  Outcome: proven at the shell-contract level through representative controllers.
  This is intentionally not counted as launched product-lane proof for the
  ported-family or bespoke classes.

## Phase 2c - Many-engine platform blockers

- [x] T020 Move builtin preview-host route/page registration out of central
  `apps/preview/src/server.ts` branches into typed host modules or installable
  descriptors
- [x] T021 Make viewer page mode/page assembly open enough for non-grid /
  non-force lanes instead of relying on finite unions or lane-named page
  builders
- [x] T022 Add typed document-kind plus save/spec/export endpoint descriptors so
  new document families do not start with central server branching
- [x] T023 Convert remaining non-frame render/export branches to registered
  render adapters, starting with the remaining direct sequence-family wiring
- [x] T024 Remove or retire central engine-name compatibility branches and
  browser vocabulary that are still V3/ELK-specific in disguise
  Outcome: preview-shell relayout/bootstrap/state-restore owners now use
  generic layout-shell contracts as the primary TypeScript vocabulary.
  Remaining V3/ELK names are compatibility aliases, not the primary
  registration or runtime model.
- [x] T025 Land one real skeletal non-ELK onboarding proof end to end:
  document kind, manifest, render/export adapter, host route/page or explicit
  output-only contract, persistence namespace, refresh/load, and save/export
  Outcome: the sequence family now exercises the shared typed seams through
  host route installation, preview-document load, canonical save, and SVG
  export without widening `editor.js`, `layout-bridge.js`, or central
  preview-host branching. The browser refresh/load leg is still revalidated
  later under T045 after the trap-file thinness pass.
- [x] T026 Keep `scripts/preview/*.js` on a shrink/wrapper/delegation path only;
  reject any new behavior-heavy JS ownership there and add missing TS seams
  instead
  Outcome: save-client, ELK layout controls, and ELK shell-controller browser
  entrypoints are now thin JS wrappers over durable TypeScript owners, and
  preview-app contract tests lock the wrappers to namespaced registration
  seams instead of flat root fallbacks.

## Phase 3 - Trap-file closeout and veto
- [x] T030 Refresh docs and flow maps with the new owners
- [x] T031 Add or extend focused contract tests that lock the new host owners in place
- [x] T032 Re-measure `editor.js` and decide whether the residual file now qualifies as a thin host entrypoint
  Outcome: not yet "thin" in the literal sense. The active branch still leaves
  `editor.js` at 1,601 physical lines and `layout-bridge.js` at 395 physical
  lines, so the residual trap files are still larger and more behavior-bearing
  than a closeout-quality adapter layer.
- [x] T033 Confirm no remaining preview-shell JS trap file still functions as the default integration sink for future engines
  Outcome: directionally yes for new engine entrypoints. New engine panel /
  save / bridge-runtime work should not start in `editor.js` or
  `layout-bridge.js`, but the files still remain substantial enough that the
  sink risk is not considered fully removed until T043.
- [ ] T034 Reject closeout unless the honest answer to "can we add 50, 150, and 500 engines now?" is yes
  Reopened: current repo state does not yet satisfy this bar. Future engine
  onboarding is materially better for current builtins, the install-unit
  pattern is now documented/tested, and the sequence browser refresh/load proof
  is green, but arbitrary document-family onboarding still hits central
  detection/resolution limits and `editor.js` still carries too much
  coordinator behavior to count as honest many-engine readiness. This veto also
  stays active if new behavior-heavy preview-shell JS is still being introduced
  under a "migrate later" rationale.

## Phase 4 - Veto removal plan

- [x] T040 Publish the ordered veto-removal plan inside the 046 package and keep
  task sequencing aligned to it
- [x] T041 Make generic layout-shell/runtime vocabulary primary across the
  browser runtime; keep V3/ELK names as compatibility aliases only at the
  outer edge
  Outcome: preview-shell relayout/bootstrap/state-restore owners and browser
  contract tests now treat generic layout-runtime names as the primary
  vocabulary, with V3/ELK aliases preserved only at compatibility edges.
- [x] T042 Promote one primary engine-shell capability facade for panel,
  override, relayout, and optional debug/raw-view behavior; keep legacy globals
  as wrappers only
  Outcome: browser-side engine panel wiring, layout-control access, relayout
  requests, and raw/debug-view toggles now flow through generic preview-engine
  capability names first, with ELK globals retained as aliases rather than as
  the primary shell contract.
- [ ] T043 Finish the remaining trap-file thinness pass so `editor.js` and
  `layout-bridge.js` read as adapters instead of behavior-bearing coordinators
  Progress note: the relayout/state-restore/live-resize coordinator cluster now
  enters through `previewBridge.relayout.createPreviewEditorRelayoutFacadeFromEditorHost(...)`,
  the stage/pointer/selection-chrome/text-edit/resize/keyboard/runtime-set
  coordinator cluster now enters through
  `previewShell.bootstrap.createPreviewEditorInteractionFacadeFromEditorHost(...)`,
  the residual grid/scene/rerender/delete/status-refresh coordinator cluster
  now enters through `previewShell.scene.createPreviewEditorSceneFacadeFromEditorHost(...)`,
  the bootstrap/load/navigation/diagram-loaded/bootstrap-tail coordinator
  cluster now enters through
  `previewShell.bootstrap.createPreviewEditorBootstrapFacadeFromEditorHost(...)`,
  and the measured residual files are still 1,601 physical lines for
  `editor.js` and 395 physical lines for `layout-bridge.js`, so the JS sinks
  still carry too much option-bag assembly, drag/reorder glue,
  selection/inspector callback wiring, and repo-local DOM/runtime glue to
  count as closeout-quality adapters.
- [x] T044 Document and validate the durable preview-engine install-unit
  pattern needed for 50/150/500-engine onboarding
  Outcome: the 046 package now publishes
  `install-unit-pattern.md`, `preview-engine-render.test.ts` locks a synthetic
  manifest + render-adapter + document-renderer install unit, and
  `preview-host-contract.test.ts` continues to prove the host-module side of
  the same registration story.
- [ ] T045 Re-run the real non-ELK proof after phases T041-T044 and confirm it
  still works through the typed seams
  Progress note: the sequence family now replays canonical save state through
  `loadPreviewSvg(...)` in `preview-host-contract.test.ts`, proving the typed
  browser refresh/load leg. This task stays open until T043 is done and the
  proof is re-run against the final thinness state, and it does not by itself
  satisfy the final Mermaid-lite, D2-lite, or Dagre-lite install-proof bar.
- [ ] T046 Run one final adversarial closeout audit and close T034 only if the
  honest answer to 50/150/500-engine onboarding is yes

## Phase 5 - Remaining implementation plan execution

- [ ] T050 Workstream A: define the typed browser-host installer contract that
  replaces the remaining giant inline `editor.js` option-bag assembly
- [ ] T051 Workstream A: move residual callback-map shaping, snap/reorder glue,
  inspector callback wiring, selection wrappers, undo/restore glue, and grid
  control assembly out of `editor.js` into owner-scoped TypeScript modules
- [ ] T052 Workstream A: reduce `editor.js` to a compat adapter that reads
  config, instantiates any required legacy JS classes, calls one typed
  installer, and installs compat globals from the returned adapter
- [ ] T053 Workstream A validation: re-measure `editor.js` and keep T043 open
  unless the file is at or below about 350 physical lines with no domain
  behavior or engine-specific branching

- [ ] T054 Workstream B: define the generic engine view/debug/raw capability
  runtime so ELK raw/debug behavior is registered capability logic rather than
  bridge-owned shape
- [ ] T055 Workstream B: demote `performElkRelayout`, `refreshElk*`, and
  `elkLayoutOverrides` to compat aliases or remove them from primary bridge
  interfaces
- [ ] T056 Workstream B validation: re-measure `layout-bridge.js` and keep T043
  open unless the file is at or below about 180 physical lines with no primary
  ELK-shaped interface surface

- [ ] T057 Workstream C: replace hardcoded sequence-versus-frame detection in
  `determineFrameYamlKind` and `resolveFramePreviewEngineResolution` with
  handler-owned `match` / `parse` / `resolve` registry methods
- [ ] T058 Workstream C validation: prove a custom document family can own
  preview-document detection, load/parse normalization, save, engine
  compatibility, export, and browser load without central document-kind
  branching

- [ ] T059 Workstream D: add one real skeletal Mermaid-lite, D2-lite, or
  Dagre-lite style install unit that includes document kind, parser/handler,
  manifest, render/export adapter, persistence namespace/save, host route/page
  or output-only contract, refresh/load, and save/export
- [ ] T060 Workstream D validation: prove the install unit lands without edits
  to `editor.js`, `layout-bridge.js`, `server.ts`, or central document-kind
  conditionals

- [ ] T061 Workstream E: split `packages/layout-engine/src/browser-entry.ts`
  into owner-scoped browser contract modules
- [ ] T062 Workstream E: split
  `packages/layout-engine/src/preview-shell/index.ts` into owner-scoped barrel
  surfaces and keep any top-level re-export mechanical only
- [ ] T063 Workstream E: split
  `apps/preview/src/persistence/engine-contract-consumers.test.ts` into
  focused owner-scoped harnesses so TypeScript does not become the new
  monolith

- [ ] T064 Workstream F: make `graph-layout-core` result contracts and adjacent
  substrate semantics engine-open rather than ELK-shaped
- [ ] T065 Workstream F: clarify size, port, label, and constraint semantics
  and separate parser-family adapters from layout algorithm contracts
- [ ] T066 Workstream F validation: prove a non-ELK engine shape can traverse
  the substrate without forced ELK-only IR distortion

## Phase 6 - Final closeout audit

- [ ] T067 Re-run the acceptance checklist from
  [remaining-implementation-plan.md](./remaining-implementation-plan.md) after
  T050-T066 and confirm thin adapters, no central document-kind stops, no
  compatibility vocabulary as the primary surface, real install proof, and
  split TypeScript barrels/harnesses
- [ ] T068 Run the final adversarial re-review prompts from
  [remaining-implementation-plan.md](./remaining-implementation-plan.md) and
  close T046 only if the honest answer to 50/150/500-engine onboarding is yes
