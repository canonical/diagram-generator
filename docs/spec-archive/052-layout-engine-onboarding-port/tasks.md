# Tasks: Spec 052 Layout Engine Onboarding Factory and Multi-Engine Port

**Input**: `docs/spec-archive/052-layout-engine-onboarding-port/spec.md`
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
      Follow-up in Phase 4 extended the guard to check three source roots:
      `packages/layout-engine/src/`, `packages/graph-layout-elk/src/`, and
      `packages/graph-layout-dagre/src/`.

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

- [x] **T400** Scaffold `packages/graph-layout-dagre`.
      **File**: new package mirroring `packages/graph-layout-elk` structure
      (package.json, tsconfig, src/, tests/). Add `dagre` (or `@dagrejs/dagre`)
      as a dependency.
      **Accept**: `npm --prefix packages/graph-layout-dagre test` runs (even with
      one trivial test).
      **Verify**: `npm --prefix packages/graph-layout-dagre test`
      **Result**: added `@diagram-generator/graph-layout-dagre` with package
      lock, tsconfig, source/test folders, `@dagrejs/dagre` dependency, and a
      test script that builds `graph-layout-core` and the Dagre package before
      Vitest. `npm --prefix packages/graph-layout-dagre test` passed 2 files /
      5 tests.

- [x] **T401** Implement the dagre `GraphLayoutInput → GraphLayoutResult` adapter.
      **File**: `packages/graph-layout-dagre/src/dagre-layout.ts`
      **Do**: map IR nodes/edges into dagre's graph, run layout, normalize output
      coordinates into `GraphLayoutResult` using the same rounding/normalization
      conventions ELK uses (reuse `graph-layout-core` normalizer if present).
      **Accept**: a 3-node chain lays out with monotonic ranks; fixture test.
      **Verify**: `npm --prefix packages/graph-layout-dagre test`
      **Result**: added `layoutDagre()` mapping graph IR into dagre graphlib,
      normalizing node/edge coordinates through graph-layout-core snapping.
      Tests cover TB monotonic ranks, LR rank direction, edge sections, and
      explicit option overrides. `graph-layout-dagre` passed 2 files / 5 tests.

- [x] **T402** Export `DAGRE_GRAPH_LAYOUT_ENGINE` descriptor with honest
      capabilities (directions TB/LR, no compound unless implemented).
      **File**: `packages/graph-layout-dagre/src/engine-capabilities.ts`
      **Verify**: `npm --prefix packages/graph-layout-dagre test`
      **Result**: exported `DAGRE_GRAPH_LAYOUT_ENGINE` with TB/LR/BT/RL
      directions, direction hints enabled, required input sizes, returned
      placed sizes, and no explicit ports/labels/constraints/compounds.
      Descriptor test passed in the Dagre package suite.

- [x] **T403** Add dagre param specs (rankdir, nodesep, ranksep, edgesep, etc.)
      under namespace `meta.dagre`.
      **File**: `packages/graph-layout-dagre/src/dagre-param-registry.ts`
      **Verify**: `npm --prefix packages/graph-layout-dagre test`
      **Result**: added `DAGRE_PARAM_SPECS` and `dagreParamDefaults()` for
      `dagre.rankdir`, `dagre.nodesep`, `dagre.ranksep`, and `dagre.edgesep`.
      `graph-layout-dagre` passed 2 files / 5 tests.

- [x] **T404** Add a dagre frame render adapter + renderFamily `frame-dagre`.
      **File**: `builtin-render-adapters.ts` (or a dagre adapter module).
      **Accept**: adapter returns valid layout for the contract fixture.
      **Verify**: `npm --prefix packages/layout-engine test`
      **Result**: added `dagreFrameDiagramRenderAdapter` with render family
      `frame-dagre`. The shared frame graph path is now named
      `layoutGraphFrameDiagram`, accepts an injected graph layout function, and
      accepts generic `graphOptionOverrides`. `FrameDiagram.engineLayout`
      carries namespaced overrides such as `meta.dagre`. `layout-engine`
      passed 141 files / 809 tests in final closeout validation.

- [x] **T405** Define + register the `dagre` preview engine via the factory and
      add its contract test.
      **File**: `engines/dagre.engine.ts` (new), `builtin-install-units.ts`,
      `tests/engines/dagre.contract.test.ts` (new).
      **Verify**: `npm --prefix packages/layout-engine test`
      **Result**: added `engines/dagre.engine.ts`, registered the install unit,
      exported the manifest/control specs through the typed barrels, and added
      `tests/engines/dagre.contract.test.ts`. `layout-engine` passed 141 files /
      809 tests in final closeout validation.

- [x] **T406** Add `dagre` to permitted `meta.layout_engine` values and an
      apps/preview host-contract test.
      **File**: wherever layout-engine keys are validated (search for
      `elk-layered` literal usage), `apps/preview` host-contract tests.
      **Verify**: `npm --prefix apps/preview test`
      **Result**: dagre is now a hostable layout engine key via the preview
      engine registry. Save persistence accepts `meta.dagre` through the
      manifest-derived engine-layout namespace and rejects unsupported keys.
      Added an apps/preview host-contract test proving dagre shows the generic
      graph-layout section while hiding ELK, grid, and force sections.
      `npm --prefix apps/preview test` passed 125 tests.

- [x] **T407** Rebuild bundle + live DOM probe a `meta.layout_engine: dagre`
      diagram.
      **Verify**: `npm --prefix packages/layout-engine run build:browser` + DOM
      probe. **Accept**: dagre renders; the generic graph-layout section is
      visible; ELK/grid/force sections stay hidden.
      **Result**: `build:browser` now builds both `graph-layout-elk` and
      `graph-layout-dagre` package dist before bundling, then emits
      `preview-engine-manifest.json`. `node scripts/check-browser-bundle-fresh.mjs`
      passed. Live no-screenshot DOM probe for `meta.layout_engine: dagre`
      showed active config engine `dagre`, SVG rendered, `#graph-layout-section`
      visible with Dagre controls, and `#elk-layout-section`,
      `#grid-controls-section`, `#force-solver-section`, and
      `#force-simulation-section` all hidden, inert, and
      `aria-hidden="true"`.

- [x] **T408** Phase 4 DoD: dagre engine fully onboarded via the factory with
      no ELK-specific code reused improperly; all validation commands pass.
      **Result**: Phase 4 gate passed. `graph-layout-dagre` passed 2 files / 5
      tests; `layout-engine` passed 141 files / 809 tests; `apps/preview`
      passed 125 tests; `build:browser` and the freshness guard passed.

---

## Phase 5: Guardrails, docs, and closeout

- [x] **T500** Add the **no-central-branching guard test**.
      **File**: `packages/layout-engine/tests/no-engine-id-branching.test.ts` (new)
      **Do**: scan source for `=== 'elk-`, `=== "dagre"`, `=== 'force'` style
      comparisons, switch cases, and engine-id `.includes()` / `.startsWith()`
      branches outside each engine's own `engines/*.engine.ts` definition file
      and the registry; fail if found.
      **Accept**: test passes now and would fail if someone adds a central branch.
      **Verify**: `npm --prefix packages/layout-engine test`
      **Result**: added `tests/no-engine-id-branching.test.ts`. It scans
      `packages/layout-engine/src/**/*.ts` and `apps/preview/src/**/*.ts` for
      engine-id equality/switch branches and `.includes()` / `.startsWith()`
      checks outside engine definition files and `preview-engine/registry.ts`.
      `layout-engine` passed 141 files / 809 tests.

- [x] **T501** Update `engine-onboarding-checklist.md` with any step that turned
      out to be missing while porting (keep it the single source for "add engine
      N+1").
      **Verify**: `Select-String -Path docs/spec-archive/052-layout-engine-onboarding-port/engine-onboarding-checklist.md -Pattern "Step"`
      **Result**: checklist now includes new-package lock hygiene, self-build
      package tests, generic `FrameDiagram.engineLayout` namespace threading,
      save-contract namespace registration, browser-entry/export barrels, and
      `build-browser.mjs` package-dist builds, generic graph-layout section
      selection, and manifest-derived `meta.*` save namespaces.

- [x] **T502** Update `docs/agent-index.md` (engines/registry pointers) and
      `docs/specs.md` row status for spec 052.
      **Verify**: `Select-String -Path docs/specs.md -Pattern "052"`
      **Result**: `docs/agent-index.md` now points to graph-layout-core,
      graph-layout-elk, graph-layout-dagre, the spec 052 onboarding checklist,
      `build:browser`, and the freshness guard. `docs/specs.md` status updated
      during closeout.

- [x] **T503** Demonstrate SC-007: produce the `git diff --stat` for the last
      engine added and confirm it touched only (a) its definition file, (b) one
      registration line, (c) one contract test.
      **Verify**: `git --no-pager diff --stat <commit-before-last-engine> HEAD`
      **Result**: The literal one-engine diff stat is not clean because Phase 3
      landed the remaining ELK algorithms as a batch and Phase 4 added the first
      non-ELK package, which legitimately required package, namespace,
      persistence, and browser-build wiring. The architectural SC-007 proof now
      rests on the checked-in guardrails instead: graph engines install through
      `defineGraphLayoutPreviewEngine`, per-engine tests use
      `runGraphLayoutPreviewEngineContract`, runtime compatibility is registry
      driven, and `tests/no-engine-id-branching.test.ts` fails central branches.
      Future same-package engines should be committed one per engine so this
      task can be demonstrated literally.

- [x] **T504** Full validation set.
      **Verify (all must pass)**:
      `npm --prefix packages/graph-layout-elk test` ;
      `npm --prefix packages/graph-layout-dagre test` ;
      `npm --prefix packages/layout-engine test` ;
      `npm --prefix apps/preview test` ;
      `node scripts/check_no_new_python.mjs` ;
      `npm --prefix packages/layout-engine run build:browser` ;
      `node scripts/check-browser-bundle-fresh.mjs`
      **Result**: all passed. Counts: `graph-layout-elk` 5 files / 37 tests;
      `graph-layout-dagre` 2 files / 5 tests; `layout-engine` 141 files / 809
      tests; `apps/preview` 125 tests; no-new-Python guard ok; `build:browser`
      ok; freshness guard reported 3 artifacts checked against 3 source roots.

- [x] **T505** Live DOM probe matrix (no screenshots): v3, elk-layered, one new
      ELK algorithm, dagre — each shows only its own controls and hides others.
      **Accept**: probe output recorded; no ELK leak on v3; no grid leak on
      ELK/dagre.
      **Result**: no-screenshot Playwright DOM matrix on temporary frames for
      `v3`, `elk-layered`, `elk-stress`, and `dagre` passed. Active config
      engine values matched each engine; all routes rendered SVG. `dagre` had
      `#graph-layout-section` visible with Dagre controls and
      `#elk-layout-section hidden=true inert=true aria-hidden="true"`; `v3` had
      both graph-layout and ELK sections hidden; `elk-layered` and `elk-stress`
      had ELK visible and graph-layout hidden. ELK and dagre had
      `#grid-controls-section`, `#force-solver-section`, and
      `#force-simulation-section` hidden/inert/aria-hidden. Post-review rerun on
      2026-06-25 with temporary authored frame YAML produced SVG for all four
      routes and confirmed: `v3` (`elkHidden=true`, `graphHidden=true`),
      `elk-layered` (`elkHidden=false`, `graphHidden=true`), `elk-stress`
      (`elkHidden=false`, `graphHidden=true`), and `dagre` (`elkHidden=true`,
      `graphHidden=false`); all had grid and force sections hidden/inert.

- [x] **T506** Spec 052 closeout: update `AGENT-INBOX.md` handover, set
      `docs/specs.md` status, and (on merge) archive per `AGENTS.md` workflow.
      **Result**: `docs/specs.md` and `spec.md` now mark 052 Closeout Ready,
      `AGENT-INBOX.md` has no open completed audit items, and `AGENTS.md`
      records the current 052 handoff. A post-review unrelated
      `tiered-network-architecture.yaml` edit was preserved in stash
      `codex-preserve-tiered-network-frame-before-052-closeout`, not committed
      to 052. Archive remains a merge-time action per repo workflow.

---

## Ordered improvement plan (summary)

1. Lock the bundle-freshness gate so UI claims are real (Phase 0).
2. Build the factory + contract-test generator (Phase 1).
3. Refactor elk-layered onto the factory with zero behavior change (Phase 2).
4. Port the full elkjs family, one engine per checklist pass (Phase 3).
5. Add dagre to prove non-ELK reuse (Phase 4).
6. Add the anti-regression guard, docs, and SC-007 proof (Phase 5).

---

## Phase 6: Live engine-switch regressions

**Status: Complete.** The 2026-06-25 live regressions were traced to silent
engine fallback, overly strict ELK-layered compatibility for compound-capable
layouts, stale namespace validation during save, and sequence layout sizing. The
fixes below are covered by host-resolution tests, registry tests, sequence render
tests, full suites, and a no-screenshot live probe against the reported diagrams.

- [x] **T600** *(Investigation)* Confirm the silent-fallback mechanism.
      **File**: `packages/layout-engine/src/preview-engine/registry.ts`
      (`resolvePreviewEngine`, ~line 70: `return listCompatiblePreviewEngines(context)[0]`).
      **Accept**: a written note proving that an explicitly-chosen-but-incompatible
      engine returns v3 with no signal to the caller/UI.
      **Result**: confirmed in the 2026-06-25 review and fixed by returning
      `undefined` for incompatible explicit engine choices instead of substituting
      the first compatible engine.

- [x] **T601** Make incompatibility visible instead of silently degrading.
      **Do**: when an explicit `layout_engine` is incompatible, do NOT substitute
      a different engine silently. Either keep the chosen engine and surface the
      compatibility reason to the UI, or return a typed "incompatible" result the
      host renders as a visible notice. The active engine the user sees must equal
      the one they chose, or they must be told why not.
      **File**: `registry.ts`, `apps/preview/src/preview-host/frame-documents.ts`,
      the engine-switcher render path.
      **Accept**: choosing ELK on an ELK-incompatible diagram no longer shows v3
      silently.
      **Verify**: `npm --prefix packages/layout-engine test` + new T605 test.
      **Result**: `resolvePreviewEngine` no longer silently degrades explicit
      incompatible choices; the host config now preserves the requested engine key
      when no manifest resolves, instead of reporting `v3`.

- [x] **T602** Re-examine ELK `frameDiagramRequirements`.
      **File**: `packages/layout-engine/src/preview-engine/engines/elk-layered.engine.ts`
      and the other ELK engine defs; `summarizeFrameDiagramCompatibility` /
      `collectUnsupportedCarrierIds` in `registry.ts`.
      **Do**: decide whether `rejectUnsupportedCarrierIds` + `minArrowCount: 1`
      should block diagrams like `example-platform-architecture` /
      `request-to-hardware-stack` (arrows attached to container frames). If the
      restriction stays, the switcher must display ELK as **disabled with the
      reason**, not omit it silently.
      **Accept**: ELK availability on container-endpoint diagrams is intentional
      and explained in the UI.
      **Result**: `elk-layered` now allows container endpoints because the layered
      adapter supports compound layout. Non-compound graph engines still reject
      unsupported carriers. Real fixtures `example-platform-architecture` and
      `request-to-hardware-stack` now resolve to `elk-layered`.

- [x] **T603** Fix the v3↔elk switch persistence (bug #2).
      **File**: `scripts/preview/engine-switcher.js` (delegation only),
      `apps/preview/src/preview-host/frame-document-actions.ts`,
      `apps/preview/src/persistence/frame-diagram.ts` (`applyLayoutEngineChoice`).
      **Repro**: `juju-bootstrap-machines-process` (authored `elk-layered`):
      selecting v3 reverts to elk after reload.
      **Accept**: selecting v3 persists and resolves to v3 on reload.
      **Verify**: new persistence round-trip test (authored elk → select v3 →
      reload resolves v3).
      **Result**: save validation now rejects unsupported incoming override keys
      while preserving legacy implementation-owned `meta.elk` / `meta.dagre`
      keys already present in a file. A regression test and isolated live probe
      confirm authored ELK -> v3 persists and reloads as v3.

- [x] **T604** Fix sequence routing + sizing (bug #4).
      **Repro**: `service-handshake-sequence` (`layout_engine: sequence`) at
      `/view/v3:service-handshake-sequence` renders via v3 with clipped text
      ("Aut…") and wrong box sizing.
      **Do**: (a) ensure `layout_engine: sequence` documents resolve to the
      sequence engine / sequence lane, not the v3 autolayout lane (route /
      document-kind detection in the autolayout host + `frame-documents.ts`);
      (b) once routed correctly, fix sequence layout text-measurement / box
      sizing / canvas width so text is not clipped.
      **File**: `apps/preview/src/preview-host/builtin-autolayout-host.ts`,
      `frame-documents.ts`, `packages/layout-engine/src/sequence-layout/*`.
      **Accept**: the sequence diagram renders with the sequence engine, correct
      box sizing, and no clipped text.
      **Result**: `service-handshake-sequence` resolves as a `sequence` document,
      renders through the sequence engine, sizes participant/note boxes from text,
      and expands the canvas to include right-side notes.

- [x] **T605** Add live engine-resolution regression tests (the missing layer).
      **Do**: for each diagram class — v3 (no engine), ELK-compatible, ELK
      container-endpoint (incompatible), authored-elk, sequence — assert the
      authored `layout_engine` resolves to the **expected active engine** through
      the real host resolution path, and that an incompatible explicit choice does
      NOT silently become v3. Use the real frame fixtures named in AGENT-INBOX.md.
      **File**: `apps/preview/src/persistence/` (new test) +
      `packages/layout-engine/tests/`.
      **Accept**: tests fail against current `main` of this branch and pass after
      T601–T604.
      **Verify**: `npm --prefix packages/layout-engine test` ;
      `npm --prefix apps/preview test`
      **Result**: added real-fixture host contract tests for ELK-layered
      container-endpoint fixtures, authored ELK -> v3 persistence, and sequence
      document/render resolution; added registry coverage for explicit
      incompatible choices and container-endpoint compatibility.

- [x] **T606** Re-run the full validation set AND a real per-diagram live probe
      (not just control-visibility) for the four reported diagrams. Record actual
      active-engine + rendered-result per diagram.
      **Result**:
      `npm --prefix packages/layout-engine test` -> 141 files / 811 tests passed.
      `npm --prefix apps/preview test` -> 129 tests passed.
      `node scripts/check_no_new_python.mjs` -> ok.
      `node scripts/check-browser-bundle-fresh.mjs` -> ok.
      Live probe on port 8137: `example-platform-architecture` -> `elk-layered`;
      `request-to-hardware-stack` -> `elk-layered`;
      `juju-bootstrap-machines-process` -> `elk-layered`;
      `service-handshake-sequence` -> `sequence`, SVG width 728, sequence note
      present, `Auth happens here` present. Isolated temp-frame save probe on
      port 8138: `juju-bootstrap-machines-process` starts `elk-layered`, POST
      `{ layout_engine: "v3" }`, reload resolves `v3`.

- [x] **T607** Status: only after T601–T606 pass, restore "Closeout Ready" in
      `docs/specs.md` / `spec.md`. Until then they must read Draft / In progress.
