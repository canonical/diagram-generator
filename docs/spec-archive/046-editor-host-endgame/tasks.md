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
  2026-07-05 reconciliation: this reopen-era measurement is now historical
  only. The reconciled closeout state is `editor.js` 316 physical lines and
  `layout-bridge.js` 77 physical lines, both guarded by
  `scripts/check-preview-shell-size-budgets.mjs`.
- [x] T033 Confirm no remaining preview-shell JS trap file still functions as the default integration sink for future engines
  Outcome: directionally yes for new engine entrypoints. New engine panel /
  save / bridge-runtime work should not start in `editor.js` or
  `layout-bridge.js`, but the files still remain substantial enough that the
  sink risk is not considered fully removed until T043.
  2026-07-05 reconciliation: that residual sink risk is now considered removed.
  New engine onboarding is registration-first, the trap files are thin adapters,
  and future work should treat widening those files as regression.
- [x] T034 Reject closeout unless the honest answer to "can we add 50, 150, and 500 engines now?" is yes
  2026-07-05 resolution: **met**. The stale reopened note is retracted.
  The two cited blockers are no longer true:
  - "central detection/resolution limits" was resolved by T057/T058 and the
    `mindmap-lite-install-unit.test.ts` proof.
  - "`editor.js` still carries too much coordinator behavior" was resolved by
    the thin-adapter cutover plus the automated size guard.
  Cross-reference: T046 and T068 already concluded the same answer. The package
  is now internally consistent that the honest 50/150/500-engine answer is yes.

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
- [x] T043 Finish the remaining trap-file thinness pass so `editor.js` and
  `layout-bridge.js` read as adapters instead of behavior-bearing coordinators
  Outcome: `editor.js` is now a 256-line browser adapter around the typed grid
  install/runtime seam, and `layout-bridge.js` is now an 88-line compat bridge
  around the typed preview-bridge install runtime. The coordinator clusters now
  live behind typed facades; the legacy JS files keep only browser bootstrap
  glue, compat aliases, and DOM/runtime hookup.
  2026-07-05 reconciliation: the current guarded counts are 316 / 77 rather
  than the earlier 256 / 88 snapshot. That is still within the enforced
  `check-preview-shell-size-budgets.mjs` budgets and does not reopen the trap-
  file veto.
- [x] T044 Document and validate the durable preview-engine install-unit
  pattern needed for 50/150/500-engine onboarding
  Outcome: the 046 package now publishes
  `install-unit-pattern.md`, `preview-engine-render.test.ts` locks a synthetic
  manifest + render-adapter + document-renderer install unit, and
  `preview-host-contract.test.ts` continues to prove the host-module side of
  the same registration story.
- [x] T045 Re-run the real non-ELK proof after phases T041-T044 and confirm it
  still works through the typed seams
  Outcome: the sequence-family browser replay proof remains green through the
  thin JS adapters, and the `mindmap-lite` install-unit proof continues to
  cover document-kind detection, manifest registration, save/export, host
  routing, and browser refresh/load through typed seams.
- [x] T046 Run one final adversarial closeout audit and close T034 only if the
  honest answer to 50/150/500-engine onboarding is yes

## Phase 5 - Remaining implementation plan execution

- [x] T050 Workstream A: define the typed browser-host installer contract that
  replaces the remaining giant inline `editor.js` option-bag assembly
- [x] T051 Workstream A: move residual callback-map shaping, snap/reorder glue,
  inspector callback wiring, selection wrappers, undo/restore glue, and grid
  control assembly out of `editor.js` into owner-scoped TypeScript modules
- [x] T052 Workstream A: reduce `editor.js` to a compat adapter that reads
  config, instantiates any required legacy JS classes, calls one typed
  installer, and installs compat globals from the returned adapter
- [x] T053 Workstream A validation: re-measure `editor.js` and keep T043 open
  unless the file is at or below about 350 physical lines with no domain
  behavior or engine-specific branching
  Outcome: `editor.js` now measures 256 physical lines on disk and reads as
  adapter glue only.

- [x] T054 Workstream B: define the generic engine view/debug/raw capability
  runtime so ELK raw/debug behavior is registered capability logic rather than
  bridge-owned shape
- [x] T055 Workstream B: demote `performElkRelayout`, `refreshElk*`, and
  `elkLayoutOverrides` to compat aliases or remove them from primary bridge
  interfaces
- [x] T056 Workstream B validation: re-measure `layout-bridge.js` and keep T043
  open unless the file is at or below about 180 physical lines with no primary
  ELK-shaped interface surface
  Outcome: `layout-bridge.js` now measures 88 physical lines on disk and keeps
  ELK names only as boundary aliases around the generic install runtime.

- [x] T057 Workstream C: replace hardcoded sequence-versus-frame detection in
  `determineFrameYamlKind` and `resolveFramePreviewEngineResolution` with
  handler-owned `match` / `parse` / `resolve` registry methods
- [x] T058 Workstream C validation: prove a custom document family can own
  preview-document detection, load/parse normalization, save, engine
  compatibility, export, and browser load without central document-kind
  branching
  Outcome: frame-YAML document kinds now resolve through handler registration,
  and `mindmap-lite-install-unit.test.ts` proves a custom family can own the
  full preview/save/export/browser path without central branching.

- [x] T059 Workstream D: add one real skeletal Mermaid-lite, D2-lite, or
  Dagre-lite style install unit that includes document kind, parser/handler,
  manifest, render/export adapter, persistence namespace/save, host route/page
  or output-only contract, refresh/load, and save/export
- [x] T060 Workstream D validation: prove the install unit lands without edits
  to `editor.js`, `layout-bridge.js`, `server.ts`, or central document-kind
  conditionals
  Outcome: `mindmap-lite` now serves as the real foreign-shaped install proof:
  manifest + renderer + document-kind handler + save namespace + shared host
  seams + browser refresh/load, all without widening the legacy JS sinks or
  central document-kind conditionals.

- [x] T061 Workstream E: split `packages/layout-engine/src/browser-entry.ts`
  into owner-scoped browser contract modules
- [x] T062 Workstream E: split
  `packages/layout-engine/src/preview-shell/index.ts` into owner-scoped barrel
  surfaces and keep any top-level re-export mechanical only
- [x] T063 Workstream E: split
  `apps/preview/src/persistence/engine-contract-consumers.test.ts` into
  focused owner-scoped harnesses so TypeScript does not become the new
  monolith
  Outcome: `browser-entry.ts` is now eight lines, `preview-shell/index.ts` is
  seven lines, and the old monolithic VM harness has been replaced by
  owner-scoped contract suites backed by `preview-script-test-helpers.ts`.

- [x] T064 Workstream F: make `graph-layout-core` result contracts and adjacent
  substrate semantics engine-open rather than ELK-shaped
- [x] T065 Workstream F: clarify size, port, label, and constraint semantics
  and separate parser-family adapters from layout algorithm contracts
- [x] T066 Workstream F validation: prove a non-ELK engine shape can traverse
  the substrate without forced ELK-only IR distortion
  Outcome: `graph-layout-core` now exposes engine-open capability/descriptor
  types, generic engine ids, explicit input-vs-output size semantics,
  `GraphInsetsInput`, side/point-anchored ports, and four-direction support.
  `graph-layout-elk` now adapts those contracts at the ELK boundary, and the
  layered tests prove side-anchored ports and object insets traverse the
  substrate without ELK-only padding strings or explicit midpoint coordinates
  in the shared IR.

## Phase 6 - Final closeout audit

- [x] T067 Re-run the acceptance checklist from
  [remaining-implementation-plan.md](./remaining-implementation-plan.md) after
  T050-T066 and confirm thin adapters, no central document-kind stops, no
  compatibility vocabulary as the primary surface, real install proof, and
  split TypeScript barrels/harnesses
- [x] T068 Run the final adversarial re-review prompts from
  [remaining-implementation-plan.md](./remaining-implementation-plan.md) and
  close T046 only if the honest answer to 50/150/500-engine onboarding is yes
  Outcome: the closeout rerun on 2026-06-22 confirms all acceptance bars are
  met on `feat/046-editor-host-endgame`: thin JS adapters, registry-owned
  document-family seams, a real foreign-shaped install proof, split TypeScript
  barrels/harnesses, and an engine-open graph-layout substrate. The honest
  answer to the 50/150/500-engine onboarding question is now yes on this
  branch.

## Phase 7 - Honest closeout reconciliation (added 2026-07-05)

**Why this phase exists.** An adversarial re-audit on 2026-07-05 (recorded in
`AGENT-INBOX.md`) found the substantive work is done and proven, but the package
is internally inconsistent: `T034` is still marked reopened while `T046` and
`T068` are both done and both already conclude the 50/150/500-engine answer is
**yes**. `T034`'s reopened note also cites two conditions that later tasks
resolved, and `T032`/`T033` outcome text carries stale line counts. This phase
is **reconciliation, not engineering** — no new architecture is required to meet
the `T034` bar as literally written ("adding 50/150/500 engines through typed
registration points rather than through `editor.js`/`layout-bridge.js`").

**Verdict the reconciliation must encode (evidence-backed):** the bar is met.
- Registry is decentralized: `packages/layout-engine/src/preview-engine/registry.ts`
  (`registerPreviewEngine`, `resolvePreviewEngine` via `.find()`, no central enum).
- No central engine-id switch/branching exists (grep-verified); the only
  family branching is UI-only (`isGridShell`/`isForceShell` in
  `preview-shell/preview-ui-context.ts`) gating panel visibility.
- Document-kind detection is handler-registered and extensible
  (`PreviewDocumentKind = ... | (string & {})`, per-engine
  `compatibility.documentKinds`); the old central sequence-vs-frame detection
  was replaced (T057/T058) and proven by `mindmap-lite-install-unit.test.ts`.
- `editor.js` is 316 lines and `layout-bridge.js` is 77 lines of thin adapter
  glue with no engine-specific coordinator logic, now automatically guarded by
  `scripts/check-preview-shell-size-budgets.mjs` (budgets: `editor.js` ≤ 320,
  `layout-bridge.js` ≤ 80 non-empty lines).
- Registration-only onboarding is locked by `preview-node-onboarding.test.ts`
  and the no-central-branching guards from specs 052 / 071 (T040) / 072 (T020).
- Adding engine N+1 of an existing shell family = create the engine file +
  add one line to `BUILTIN_PREVIEW_ENGINE_INSTALL_UNITS` in
  `packages/layout-engine/src/preview-engine/builtins.ts`.

**The one honest residual (does NOT block the bar):** a brand-new *shell family*
(beyond grid/force, e.g. a timeline shell) currently adds its panels by editing
the typed `PREVIEW_PANEL_REGISTRY` in `preview-shell/preview-ui-context.ts`
(~30-50 lines, one-time per family). This is a **typed registration point**, not
an `editor.js`/`layout-bridge.js` edit, so it satisfies the literal `T034`
wording. It is per-shell-family (not per-engine) and bounded. Treat it as an
accepted, documented limitation unless the user opts into the optional
decomposition in T073.

- [x] T070 Correct the stale evidence text in `T032`, `T033`, and `T043`:
  `editor.js` is **316** physical lines (not 1,601) and `layout-bridge.js` is
  **77** (not 395). Note that the thin-adapter ratchet is now **automated** via
  `scripts/check-preview-shell-size-budgets.mjs` (budgets 320 / 80 non-empty
  lines), so the growth from the earlier 256 / 88 snapshot is inside an enforced
  guard, not unguarded drift. Do not delete the original outcome prose wholesale;
  update the numbers and add a dated correction line.
- [x] T071 Resolve `T034`: flip it from reopened to **met**, replacing the stale
  reopened note with the evidence-backed verdict above. Explicitly retract the
  two stale conditions ("central detection/resolution limits" — refuted by
  T057/T058 + `mindmap-lite-install-unit.test.ts`; "`editor.js` too much
  coordinator behavior" — refuted by the 316-line adapter + size guard). Cross-
  reference `T046` and `T068`, which already concluded "yes", so the package is
  internally consistent.
- [x] T072 Record the shell-family `PREVIEW_PANEL_REGISTRY` residual honestly in
  the spec (a short "Known bounded limitation" note): new shell family = one
  typed panel-registry edit, per-family, not per-engine, not in the legacy JS
  sinks. State that it satisfies the literal `T034` "typed registration points"
  bar and is therefore **not** a closeout veto.
- [x] T073 **DECISION GATE (resolved 2026-07-05).**
  The repo will accept the T072 limitation and close 046 now. Mermaid / ELK
  breadth stays within the existing `grid` shell family, so making
  `PREVIEW_PANEL_REGISTRY` contribution-based would be orthogonal cleanup
  rather than a gating requirement for the current engine-port roadmap. If a
  future timeline/canvas-style shell family makes that seam painful, draft a
  new follow-up spec then; do not reopen 046 for it.
  2026-07-05 follow-through: spec 073 closed this residual without reopening
  046 by replacing the central `PREVIEW_PANEL_REGISTRY` list with registered
  lane-panel contributions and a registration-only guard in
  `packages/layout-engine/tests/preview-ui-context.test.ts`.
- [x] T074 Reconcile catalog + handover to the resolved state:
  update the `046` row in `docs/specs.md` and the `AGENTS.md` handover to drop
  stale line-count/branch claims and reflect "bar met, reconciled". Per the
  repo's "closeout ⇒ merged to `main` ⇒ archived" rule, if 046 is on `main`,
  archive the package under `docs/spec-archive/046-editor-host-endgame/`; if it
  is still only on `feat/046-editor-host-endgame`, either merge-then-archive or
  restate its status as `Active` on that branch — pick one and make catalog,
  handover, and tasks agree.
- [x] T075 Re-run full validation and the size guard; confirm green:
  `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`,
  `node scripts/check_no_new_python.mjs`,
  `node scripts/check-preview-shell-size-budgets.mjs`. Only then mark
  `T034`/`T046`/`T068` mutually consistent and 046 closed.
  Outcome: all four checks passed on 2026-07-05 during the closeout
  reconciliation rerun.
