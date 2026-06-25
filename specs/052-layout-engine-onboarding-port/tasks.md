# Tasks: Spec 052 Layout Engine Onboarding Factory and Multi-Engine Port

**Input**: `specs/052-layout-engine-onboarding-port/spec.md`
**Branch**: `feat/052-layout-engine-onboarding-port`

## How to work this list

- One checkbox = one verifiable change. Do them in order.
- Each task states: **Do**, **File(s)**, **Accept** (what must be true), and
  **Verify** (exact command). Run Verify before checking the box; paste the
  one-line result after the task.
- `[P]` marks tasks that are safe to do in parallel (independent files).
- If a Verify command fails, fix it before moving on. Do not skip.
- Windows shell is PowerShell. Use `npm --prefix <pkg> test`,
  `Select-String`, and `Select-Object -First N`. Do not use `head`/`cat <<EOF`.

---

## Phase 0: Branch, baseline, and bundle-freshness gate

- [x] **T000** Create and switch to the feature branch.
      **Do**: `git switch -c feat/052-layout-engine-onboarding-port`
      **Accept**: `git branch --show-current` prints the branch name.
      **Verify**: `git branch --show-current`
      **Result**: `feat/052-layout-engine-onboarding-port`.

- [x] **T001** Capture the green baseline before any change.
      **Do**: run all four validation commands and record pass counts in a note
      under this task.
      **Verify**:
      `npm --prefix packages/graph-layout-elk test` ;
      `npm --prefix packages/layout-engine test` ;
      `npm --prefix apps/preview test` ;
      `node scripts/check_no_new_python.mjs`
      **Accept**: all pass. If any fail on a clean checkout, STOP and report.
      **Result**: `graph-layout-elk` 4 files / 27 tests passed;
      `layout-engine` 133 files / 792 tests passed; `apps/preview` 119 tests
      passed before adding the freshness test; no-new-Python guard passed.

- [x] **T002** Enumerate the current preview engine registrations as a
      reference table (id, layoutEngineKey, renderFamily, sidebarSections).
      **File**: read `packages/layout-engine/src/preview-engine/builtins.ts`,
      `builtin-render-adapters.ts`, `builtin-install-units.ts`.
      **Accept**: a table written under this task listing v3, elk-layered,
      force, sequence with their keys.
      **Verify**: `Select-String -Path packages/layout-engine/src/preview-engine/builtin-install-units.ts -Pattern registerPreviewEngineInstallUnit`
      **Result**:
      | id | layoutEngineKey | renderFamily | sidebarSections |
      |---|---|---|---|
      | `v3` | `v3` | `frame-native` | `[]` |
      | `elk-layered` | `elk-layered` | `frame-elk` | `['elk-layout']` |
      | `force` | n/a | `force` | `[]` |
      | `sequence` | `sequence` | `sequence` | `[]` |
      Install-unit registry lines confirmed for all four builtins.

- [x] **T003** Confirm how the browser bundle is built and served.
      **File**: `packages/layout-engine/package.json` (look for `build:browser`),
      `scripts/preview/` served file, `apps/preview` prestart/predev.
      **Accept**: note the exact build command and the served artifact path(s).
      **Verify**: `Select-String -Path packages/layout-engine/package.json -Pattern build:browser`
      **Result**: build command is `npm --prefix packages/layout-engine run
      build:browser` -> `node build-browser.mjs`. `apps/preview` `predev` and
      `prestart` run that command. Preview serves
      `packages/layout-engine/dist/layout-engine.iife.js` as
      `/preview/layout-engine.js` and
      `packages/layout-engine/dist/layout-engine-harfbuzz.js` as
      `/preview/layout-engine-harfbuzz.js`; the preview engine manifest is
      generated at `packages/layout-engine/dist/preview-engine-manifest.json`.

- [x] **T004** Add a **bundle-freshness guard** so green unit tests can never
      again mask a stale served bundle.
      **Do**: add a small Node check script `scripts/check-browser-bundle-fresh.mjs`
      that fails if the built bundle is older than any file under
      `packages/layout-engine/src/`. Wire it into the preview build or a test.
      **File**: `scripts/check-browser-bundle-fresh.mjs` (new), reference it from
      the layout-engine `build:browser` chain or an apps/preview test.
      **Accept**: editing a `src` file and not rebuilding makes the guard fail;
      rebuilding makes it pass.
      **Verify**: `node scripts/check-browser-bundle-fresh.mjs` (after a build)
      **Result**: added `scripts/check-browser-bundle-fresh.mjs` and wired it
      into `apps/preview/src/persistence/preview-host-contract.test.ts`.
      Negative probe with a temporary
      `packages/layout-engine/src/__bundle_freshness_probe__.tmp` failed with
      all three artifacts stale; after deleting the probe and running
      `npm --prefix packages/layout-engine run build:browser`,
      `node scripts/check-browser-bundle-fresh.mjs` passed.

- [x] **T005** Phase 0 Definition of Done: baseline green recorded, build
      command documented, freshness guard works. Do not proceed otherwise.
      **Result**: Phase 0 gate passed. Post-guard `apps/preview` suite passed
      120 tests and `node scripts/check-browser-bundle-fresh.mjs` passed.

---

## Phase 1: The onboarding factory + generic control adapter

- [x] **T100** Generalize the param→control adapter.
      **File**: `packages/layout-engine/src/preview-engine/control-specs.ts` (new)
      or extend `elk-controls.ts`.
      **Do**: add `paramSpecToPreviewControl(spec, persistNamespace)` that does
      what `elkParamToPreviewControl` does but takes the namespace as an argument.
      Refactor `elkLayeredPreviewControlSpecs()` to call it with `'meta.elk'`.
      **Accept**: `elkLayeredPreviewControlSpecs()` returns identical output to
      before (same keys, labels, defaults).
      **Verify**: `npm --prefix packages/layout-engine test`
      **Result**: added `control-specs.ts`; `elkParamToPreviewControl()` now
      delegates to `paramSpecToPreviewControl(spec, 'meta.elk')`. Existing ELK
      registry assertions still pass.

- [x] **T101** Create the factory file with types only (no logic yet).
      **File**: `packages/layout-engine/src/preview-engine/define-graph-layout-engine.ts` (new)
      **Do**: add `GraphLayoutPreviewEngineDefinition` interface exactly as in
      spec §6.2 and a stub `defineGraphLayoutPreviewEngine` that throws
      `not implemented`.
      **Accept**: file typechecks.
      **Verify**: `npm --prefix packages/layout-engine run build` (or the
      package's typecheck script; confirm the script name from package.json)
      **Result**: implemented the interface in
      `define-graph-layout-engine.ts`; `npm --prefix packages/layout-engine run
      build` passed.

- [x] **T102** Implement `defineGraphLayoutPreviewEngine`.
      **File**: `define-graph-layout-engine.ts`
      **Do**: build the manifest with capability defaults (server-relayout,
      engine-backed-save, node-inspector, layout-controls, reference-image; no
      grid editing/simulation), merge `def.capabilities`, set
      `compatibility.documentKinds` default `['frame-diagram']` merged with
      `def.compatibility`, set `hostView.sidebarSections` from
      `def.sidebarSections ?? []`, attach `controlSpecs`, and build an
      install unit whose `install()` calls `registerPreviewEngine(manifest)` and
      `registerPreviewFrameDiagramRenderAdapter(def.renderFamily, def.renderAdapter)`
      returning a combined teardown.
      **Accept**: mirrors `composePreviewEngineInstallUnit` shape in `builtins.ts`;
      no import-time side effects.
      **Verify**: `npm --prefix packages/layout-engine test`
      **Result**: factory returns `{ manifest, installUnit }`, registers engine
      + render adapter only during `install()`, and unwinds partial installs on
      failure. `npm --prefix packages/layout-engine test` passed.

- [x] **T103** Add the contract-test generator helper.
      **File**: `packages/layout-engine/tests/helpers/graph-layout-engine-contract.ts` (new)
      **Do**: export `runGraphLayoutPreviewEngineContract(definition)` asserting
      the 5 checks in spec §6.5 (registry discoverability, compatibility match,
      non-empty layout on a 2-node/1-edge fixture, capability honesty, unique
      keyed control specs with persistNamespace).
      **Accept**: helper compiles and is importable from a test.
      **Verify**: write a temporary throwaway test calling it on a fake engine,
      run `npm --prefix packages/layout-engine test`, then delete the throwaway.
      **Result**: added the helper plus a durable synthetic-engine test in
      `tests/define-graph-layout-engine.test.ts` so the helper remains covered.
      `npm --prefix packages/layout-engine test` passed.

- [x] **T104** Phase 1 DoD: factory + helper exist, all baseline tests still
      pass. `npm --prefix packages/layout-engine test`.
      **Result**: Phase 1 gate passed; layout-engine suite is now 134 files /
      794 tests passed.

---

## Phase 2: Refactor `elk-layered` onto the factory (zero behavior change)

- [x] **T200** Move the `elk-layered` manifest to a definition file.
      **File**: `packages/layout-engine/src/preview-engine/engines/elk-layered.engine.ts` (new)
      **Do**: produce the `elk-layered` manifest + install unit via
      `defineGraphLayoutPreviewEngine`, using `ELK_LAYERED_GRAPH_LAYOUT_ENGINE`,
      `elkLayeredPreviewControlSpecs()`, renderFamily `frame-elk`, sidebarSections
      `['elk-layout']`, and the existing `elkFrameDiagramRenderAdapter`.
      **Accept**: identical manifest fields to the current `builtins.ts`
      `elk-layered` entry (diff them field by field).
      **Verify**: `npm --prefix packages/layout-engine test`
      **Result**: added `engines/elk-layered.engine.ts` with the factory
      definition. Manifest identity, label, layout key, shell mode, render
      family, sections, capabilities, control specs, scripts, compatibility
      description, and frame requirements match the prior hand-written entry.

- [x] **T201** Switch registration to the new definition.
      **File**: `builtin-install-units.ts`, `builtins.ts`
      **Do**: register the factory-produced `elk-layered` install unit; remove the
      old hand-written one. Keep `v3`, `force`, `sequence` untouched for now.
      **Accept**: `getPreviewEngineByLayoutKey('elk-layered')` still resolves.
      **Verify**: `npm --prefix packages/layout-engine test`
      **Result**: `builtins.ts` now re-exports the factory-produced
      `ELK_LAYERED_PREVIEW_ENGINE` and install unit; existing registry tests
      still resolve `elk-layered` by layout key.

- [x] **T202** Prove byte-stable layout.
      **File**: existing parity fixtures (`tests/regenerate-parity-fixtures.test.ts`,
      `tests/elk-layout.test.ts`).
      **Accept**: no fixture diffs; all elk tests pass unchanged.
      **Verify**: `npm --prefix packages/layout-engine test`
      **Result**: `npm --prefix packages/layout-engine test` passed 134 files /
      794 tests, including `tests/regenerate-parity-fixtures.test.ts` and
      `tests/elk-layout.test.ts`; no frame fixture diffs were produced.

- [x] **T203** Rebuild bundle + live probe `elk-layered` still works.
      **Verify**: `npm --prefix packages/layout-engine run build:browser` then the
      Phase 0 freshness guard, then a no-screenshot DOM probe on an elk-layered
      diagram route asserting `#elk-layout-section` is visible.
      **Accept**: ELK section visible for elk-layered; v3 still hides it.
      **Result**: `build:browser` passed and
      `node scripts/check-browser-bundle-fresh.mjs` passed. Live DOM probe on
      `support-engineering-flow` showed `#elk-layout-section hidden=false`,
      `engineValue='elk-layered'`, and grid controls hidden/inert. Probe on
      `mongo-octavia-ha` showed `#elk-layout-section hidden=true inert=true`
      with `engineValue='v3'`.

- [x] **T204** Phase 2 DoD: elk-layered is factory-produced with zero behavior
      change; all four validation commands pass.
      **Result**: Phase 2 gate passed. `graph-layout-elk` 4 files / 27 tests
      passed; `layout-engine` 134 files / 794 tests passed; `apps/preview` 120
      tests passed; no-new-Python guard passed.

---

## Phase 3: Port the full elkjs algorithm family

- [x] **T300** *(Investigation — do before porting)* Enumerate the algorithms the
      installed `elkjs` actually supports and choose the render-lane strategy
      (shared `frame-elk` with an `elkAlgorithm` selector in `layoutElkFrameDiagram`,
      vs one renderFamily per algorithm — spec §6.4).
      **File**: read `packages/graph-layout-elk/src/elk-layered.ts` and how it
      invokes `elkjs`; check `node_modules/elkjs` for the algorithm list.
      **Accept**: a written decision + the confirmed algorithm list under this
      task. **Do not** port an algorithm the bundled elkjs cannot run.
      **Verify**: `Select-String -Path packages/graph-layout-elk/src/*.ts -Pattern "elk.algorithm|algorithm"`
      **Result**: runtime enumeration via `elk.knownLayoutAlgorithms()` returned
      `fixed`, `box`, `random`, `layered`, `stress`, `mrtree`, `radial`,
      `force`, `sporeOverlap`, `sporeCompaction`, and `rectpacking`. Decision:
      use one render family per preview engine (`frame-elk-force`,
      `frame-elk-stress`, etc.) with thin per-engine adapters, while reusing the
      shared frame-to-graph path by injecting a graph-layout function into
      `layoutElkFrameDiagram`. This avoids a central engine-id branch and keeps
      each algorithm's behavior owned by its definition/adapter. Follow-up
      probe: `stress`, `mrtree`, `radial`, and `rectpacking` all run on the
      frame graph fixture; `mrtree` honors `elk.direction`, while `stress`,
      `radial`, and `rectpacking` ignore direction hints.

- [x] **T301** Add the `elk-force` graph descriptor + param specs.
      **File**: `packages/graph-layout-elk/src/engine-capabilities.ts`,
      `force-options.ts`, a new `force-param-registry.ts` mirroring
      `elk-param-registry.ts`.
      **Do**: export `ELK_FORCE_GRAPH_LAYOUT_ENGINE` and `ELK_FORCE_PARAM_SPECS`.
      **Accept**: descriptor capabilities are honest for force (no hierarchical
      layering, etc.).
      **Verify**: `npm --prefix packages/graph-layout-elk test`
      **Result**: exported `ELK_FORCE_GRAPH_LAYOUT_ENGINE` and
      `ELK_FORCE_PARAM_SPECS`; graph-layout-elk passed 4 files / 29 tests.

- [x] **T302** Add the `elk-force` render adapter + algorithm wiring per the
      T300 decision.
      **File**: `builtin-render-adapters.ts` (or per-algorithm adapter module),
      `elk-layout.ts` if a selector is added.
      **Accept**: adapter returns a valid layout for the contract fixture.
      **Verify**: `npm --prefix packages/layout-engine test`
      **Result**: added `elkForceFrameDiagramRenderAdapter` with render family
      `frame-elk-force`; `layoutElkFrameDiagram` now accepts an injected
      graph-layout function so no engine-id branch is needed.

- [x] **T303** Define + register the `elk-force` preview engine via the factory.
      **File**: `engines/elk-force.engine.ts` (new), `builtin-install-units.ts`.
      **Accept**: `getPreviewEngineByLayoutKey('elk-force')` resolves; engine
      switcher offers it when compatible.
      **Verify**: `npm --prefix packages/layout-engine test`
      **Result**: added `engines/elk-force.engine.ts`, registered the install
      unit, exposed `elk-force` in hostable layout-engine keys, and updated
      registry/runtime assertions.

- [x] **T304** Add the `elk-force` contract test.
      **File**: `tests/engines/elk-force.contract.test.ts` (new) calling
      `runGraphLayoutPreviewEngineContract`.
      **Verify**: `npm --prefix packages/layout-engine test`
      **Result**: added the contract test; layout-engine passed 135 files / 798
      tests.

- [x] **T305 [P]** Repeat T301–T304 for **elk-stress** (if available per T300).
      **Result**: added `ELK_STRESS_GRAPH_LAYOUT_ENGINE`,
      `ELK_STRESS_PARAM_SPECS`, shared generic ELK algorithm adapter coverage,
      `elkStressFrameDiagramRenderAdapter`, `engines/elk-stress.engine.ts`, one
      install-unit registration line, registry/export wiring, and
      `tests/engines/elk-stress.contract.test.ts`. `npm --prefix
      packages/graph-layout-elk test` passed 5 files / 37 tests;
      `npm --prefix packages/layout-engine test` passed 139 files / 802 tests.

- [x] **T306 [P]** Repeat T301–T304 for **elk-mrtree** (if available).
      **Result**: added `ELK_MRTREE_GRAPH_LAYOUT_ENGINE` with
      `honorsDirectionHints: true`, `ELK_MRTREE_PARAM_SPECS` including the only
      new direction dropdown among this batch, `elkMrTreeFrameDiagramRenderAdapter`,
      `engines/elk-mrtree.engine.ts`, install registration, and
      `tests/engines/elk-mrtree.contract.test.ts`. Same graph/layout validation
      commands passed.

- [x] **T307 [P]** Repeat T301–T304 for **elk-radial** (if available).
      **Result**: added `ELK_RADIAL_GRAPH_LAYOUT_ENGINE`,
      `ELK_RADIAL_PARAM_SPECS`, `elkRadialFrameDiagramRenderAdapter`,
      `engines/elk-radial.engine.ts`, install registration, and
      `tests/engines/elk-radial.contract.test.ts`. Same graph/layout validation
      commands passed.

- [x] **T308 [P]** Repeat T301–T304 for **elk-rectpacking** (if available).
      **Result**: added `ELK_RECTPACKING_GRAPH_LAYOUT_ENGINE`,
      `ELK_RECTPACKING_PARAM_SPECS`, `elkRectpackingFrameDiagramRenderAdapter`,
      `engines/elk-rectpacking.engine.ts`, install registration, and
      `tests/engines/elk-rectpacking.contract.test.ts`. Same graph/layout
      validation commands passed.

- [x] **T309 [P]** Repeat T301–T304 for any remaining T300-confirmed algorithms.
      For each: follow `engine-onboarding-checklist.md` exactly.
      **Result**: remaining runtime entries were explicitly triaged rather than
      exposed as misleading UI engines. `fixed` returns all frame-IR nodes at
      `0,0` because the frame graph supplies no initial coordinates.
      `sporeCompaction` likewise collapses the probe nodes without a prior
      position field. `sporeOverlap` is an overlap-removal utility that depends
      on existing coordinates, not a standalone authored-frame layout lane.
      `random` is an initializer/debug lane, not stable authoring behavior.
      `box` duplicates the packing use case now covered by `elk-rectpacking`
      and carries no arrow semantics. Decision: do not surface these utility
      algorithms in the product engine switcher under spec 052; add a separate
      diagnostic/algorithm-gallery spec if they become useful.

- [x] **T310** apps/preview host-contract tests for the new engines.
      **File**: mirror existing host-contract tests in `apps/preview` that assert
      "v3 lacks ELK controls" etc. Add: each new ELK engine shows the ELK section
      and hides grid/force sections.
      **Verify**: `npm --prefix apps/preview test`
      **Result**: ELK-family host-contract test now covers `elk-layered`,
      `elk-force`, `elk-stress`, `elk-mrtree`, `elk-radial`, and
      `elk-rectpacking`; `apps/preview` passed 120 tests.

- [x] **T311** Rebuild bundle + live DOM probe one new ELK algorithm end-to-end.
      **Verify**: `npm --prefix packages/layout-engine run build:browser` + DOM
      probe on a diagram with `meta.layout_engine: elk-force` (or chosen algo).
      **Accept**: only that engine's controls render; switching engines reloads
      and re-gates correctly.
      **Result**: `build:browser` and `node scripts/check-browser-bundle-fresh.mjs`
      passed. Live DOM probe used a temporary frame directory with
      `meta.layout_engine: elk-force`; active engine was `elk-force`, ELK
      section was visible, force-specific `Random seed` control rendered, native
      grid and force-shell controls were hidden/inert, and SVG rendered
      (`outerHTML` length 12100). After the full Phase 3 batch, repeated a live
      DOM probe for `elk-stress`: active engine was `elk-stress`, ELK section
      was visible, `Node gap` and `Random seed` rendered, layered-only `Layer
      gap` did not render, native grid/force/simulation sections were
      hidden/inert, and SVG rendered (`outerHTML` length 12101).

- [x] **T312** Phase 3 DoD: every product-suitable confirmed elkjs algorithm has
      descriptor + adapter + engine + contract test; runtime utility algorithms
      are explicitly triaged; all four validation commands pass; one algorithm
      live-probed.
      **Result**: product-suitable ELK preview engines are now
      `elk-layered`, `elk-force`, `elk-stress`, `elk-mrtree`, `elk-radial`, and
      `elk-rectpacking`; remaining ELK runtime utility algorithms are triaged in
      T309 and intentionally not exposed. Validation passed:
      `graph-layout-elk` 5 files / 37 tests, `layout-engine` 139 files / 802
      tests, `apps/preview` 120 tests, `node scripts/check_no_new_python.mjs`,
      `npm --prefix packages/layout-engine run build:browser`, and
      `node scripts/check-browser-bundle-fresh.mjs`.

---

## Phase 4: dagre engine (mermaid layout core), proving non-ELK reuse

- [ ] **T400** Scaffold `packages/graph-layout-dagre`.
      **File**: new package mirroring `packages/graph-layout-elk` structure
      (package.json, tsconfig, src/, tests/). Add `dagre` (or `@dagrejs/dagre`)
      as a dependency.
      **Accept**: `npm --prefix packages/graph-layout-dagre test` runs (even with
      one trivial test).
      **Verify**: `npm --prefix packages/graph-layout-dagre test`

- [ ] **T401** Implement the dagre `GraphLayoutInput → GraphLayoutResult` adapter.
      **File**: `packages/graph-layout-dagre/src/dagre-layout.ts`
      **Do**: map IR nodes/edges into dagre's graph, run layout, normalize output
      coordinates into `GraphLayoutResult` using the same rounding/normalization
      conventions ELK uses (reuse `graph-layout-core` normalizer if present).
      **Accept**: a 3-node chain lays out with monotonic ranks; fixture test.
      **Verify**: `npm --prefix packages/graph-layout-dagre test`

- [ ] **T402** Export `DAGRE_GRAPH_LAYOUT_ENGINE` descriptor with honest
      capabilities (directions TB/LR, no compound unless implemented).
      **File**: `packages/graph-layout-dagre/src/engine-capabilities.ts`
      **Verify**: `npm --prefix packages/graph-layout-dagre test`

- [ ] **T403** Add dagre param specs (rankdir, nodesep, ranksep, edgesep, etc.)
      under namespace `meta.dagre`.
      **File**: `packages/graph-layout-dagre/src/dagre-param-registry.ts`
      **Verify**: `npm --prefix packages/graph-layout-dagre test`

- [ ] **T404** Add a dagre frame render adapter + renderFamily `frame-dagre`.
      **File**: `builtin-render-adapters.ts` (or a dagre adapter module).
      **Accept**: adapter returns valid layout for the contract fixture.
      **Verify**: `npm --prefix packages/layout-engine test`

- [ ] **T405** Define + register the `dagre` preview engine via the factory and
      add its contract test.
      **File**: `engines/dagre.engine.ts` (new), `builtin-install-units.ts`,
      `tests/engines/dagre.contract.test.ts` (new).
      **Verify**: `npm --prefix packages/layout-engine test`

- [ ] **T406** Add `dagre` to permitted `meta.layout_engine` values and an
      apps/preview host-contract test.
      **File**: wherever layout-engine keys are validated (search for
      `elk-layered` literal usage), `apps/preview` host-contract tests.
      **Verify**: `npm --prefix apps/preview test`

- [ ] **T407** Rebuild bundle + live DOM probe a `meta.layout_engine: dagre`
      diagram.
      **Verify**: `npm --prefix packages/layout-engine run build:browser` + DOM
      probe. **Accept**: dagre renders; ELK/grid/force sections stay hidden.

- [ ] **T408** Phase 4 DoD: dagre engine fully onboarded via the factory with
      no ELK-specific code reused improperly; all validation commands pass.

---

## Phase 5: Guardrails, docs, and closeout

- [ ] **T500** Add the **no-central-branching guard test**.
      **File**: `packages/layout-engine/tests/no-engine-id-branching.test.ts` (new)
      **Do**: scan `src/` for `=== 'elk-`, `=== "dagre"`, `=== 'force'` style
      comparisons outside each engine's own `engines/*.engine.ts` definition file
      and the registry; fail if found.
      **Accept**: test passes now and would fail if someone adds a central branch.
      **Verify**: `npm --prefix packages/layout-engine test`

- [ ] **T501** Update `engine-onboarding-checklist.md` with any step that turned
      out to be missing while porting (keep it the single source for "add engine
      N+1").
      **Verify**: `Select-String -Path specs/052-layout-engine-onboarding-port/engine-onboarding-checklist.md -Pattern "Step"`

- [ ] **T502** Update `docs/agent-index.md` (engines/registry pointers) and
      `docs/specs.md` row status for spec 052.
      **Verify**: `Select-String -Path docs/specs.md -Pattern "052"`

- [ ] **T503** Demonstrate SC-007: produce the `git diff --stat` for the last
      engine added and confirm it touched only (a) its definition file, (b) one
      registration line, (c) one contract test.
      **Verify**: `git --no-pager diff --stat <commit-before-last-engine> HEAD`

- [ ] **T504** Full validation set.
      **Verify (all must pass)**:
      `npm --prefix packages/graph-layout-elk test` ;
      `npm --prefix packages/graph-layout-dagre test` ;
      `npm --prefix packages/layout-engine test` ;
      `npm --prefix apps/preview test` ;
      `node scripts/check_no_new_python.mjs` ;
      `npm --prefix packages/layout-engine run build:browser` ;
      `node scripts/check-browser-bundle-fresh.mjs`

- [ ] **T505** Live DOM probe matrix (no screenshots): v3, elk-layered, one new
      ELK algorithm, dagre — each shows only its own controls and hides others.
      **Accept**: probe output recorded; no ELK leak on v3; no grid leak on
      ELK/dagre.

- [ ] **T506** Spec 052 closeout: update `AGENT-INBOX.md` handover, set
      `docs/specs.md` status, and (on merge) archive per `AGENTS.md` workflow.

---

## Ordered improvement plan (summary)

1. Lock the bundle-freshness gate so UI claims are real (Phase 0).
2. Build the factory + contract-test generator (Phase 1).
3. Refactor elk-layered onto the factory with zero behavior change (Phase 2).
4. Port the full elkjs family, one engine per checklist pass (Phase 3).
5. Add dagre to prove non-ELK reuse (Phase 4).
6. Add the anti-regression guard, docs, and SC-007 proof (Phase 5).
