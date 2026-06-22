# Remaining Implementation Plan

Detailed implementation architecture and execution plan for the remaining work
under spec 046.

This document is the authoritative plan for what still has to change before
spec 046 can close. Historical progress remains in [spec.md](./spec.md) and
[tasks.md](./tasks.md), but the remaining-work architecture now lives here.

## Purpose and non-goals

Purpose:

- define the remaining implementation architecture for spec 046 only
- describe the concrete cutover work needed to make the repo ready for
  Mermaid, D2, Dagre, and many more engines
- make the future implementation path specific enough that a later coding pass
  can execute it without treating legacy JS sink files as design authority

Non-goals:

- no product-code changes in this document
- no attempt to close spec 044 or 045 by declaration alone
- no broad historical rewrite of the 046 package
- no claim that the current branch is already many-engine ready

The target outcome is clear: adding new engines must start from typed install
units and typed host/shell registration points, not from `scripts/preview/editor.js`
or `scripts/preview/layout-bridge.js`.

## Current honest state

Real progress already landed and must be preserved:

- typed preview-host module, API, and viewer registration is real
- preview-engine manifest, render-adapter, and document-renderer registration is
  real
- builtin preview engines now install through typed preview-engine install
  units instead of one manifest/renderer list walker in `install-builtins.ts`
- thin JS wrappers already exist for save and ELK control/controller entry
  points
- sequence host/save/export/browser-load proof is real
- preview-host document-family detection and engine-resolution ownership now
  live behind registered frame-YAML document handlers rather than central
  sequence-versus-frame fallbacks
- a real foreign-shaped `mindmap-lite` install unit now proves document kind,
  manifest, document renderer, shared host lane, custom save semantics, SVG
  export, and browser refresh/load traversal through typed seams only
- `browser-entry.ts` no longer hand-assembles the namespaced `previewShell`,
  `previewBridge`, `previewEngines`, and `core` browser contracts inline; those
  now live in owner-scoped `browser-entry-*.ts` modules
- four editor facades now exist for bootstrap, interaction, relayout, and scene
  coordination

Measured residual surfaces on the current branch:

- `scripts/preview/editor.js`: 256 physical lines
- `scripts/preview/layout-bridge.js`: 88 physical lines
- `scripts/preview/save-client.js`: 24 physical lines
- `scripts/preview/elk-controller.js`: 41 physical lines
- `scripts/preview/elk-layout-controls.js`: 26 physical lines
- `packages/layout-engine/src/browser-entry.ts`: 855 physical lines
- `packages/layout-engine/src/preview-shell/index.ts`: 1,307 physical lines
- `apps/preview/src/persistence/engine-contract-consumers.test.ts`: 3,470
  physical lines

What is still false to claim:

- it is now true that `editor.js` is inside the target thin-adapter size band,
  but it is still false to treat that as spec-046 closeout
- it is still false to say `layout-bridge.js` is engine-agnostic by primary
  interface shape
- it is now false to say preview-host document-family onboarding still depends
  on central sequence-versus-frame detection or engine-resolution helpers
- it is still false to say builtin install is fully package-like across the
  whole platform runtime; preview-engine builtins now install through typed
  install units, but preview-host builtin startup still reads more centrally
  than the target end state
- it is still false to say the large TypeScript barrels and VM harnesses have
  been decomposed enough to avoid becoming the next monolith
- it is still false to say the layout substrate is ready for Mermaid, D2, and
  Dagre without forcing them through ELK-shaped contracts
- it is still false to answer "yes" to the 50/150/500-engine question

## 2026-06-22 rebaseline

The branch crossed one real threshold after the preview-editor regression
detour:

- `editor.js` now enters the grid shell through a single typed legacy-host
  installer
- mutable install-state wrapper assembly for generation, selection depth,
  override state, dirty-navigation suppression, multi-action gap, and relayout
  timers now lives in `app-grid-editor-install-unit.ts`
- the remaining `editor.js` surface is now primarily thin bootstrap, DOM
  lookup, legacy globals, and compat alias wiring

That means Workstreams A through D are no longer the primary code blocker. The
highest leverage remaining blocker order is now:

1. Workstream E: stop `browser-entry.ts`, `preview-shell/index.ts`, and the VM
   harness from becoming the replacement monolith
2. Workstream F: make the layout substrate honestly open to Mermaid, D2, Dagre,
   and other non-ELK families
3. final adversarial closeout: confirm the 50/150/500-engine answer is
   actually yes after the remaining barrel and substrate work

## Target architecture

The target install path is:

1. engine install unit
2. preview-engine manifest, render adapter, and document renderer
3. preview-host module and document handler
4. shell capability facade
5. thin browser adapters

In steady state:

- an engine package owns its document kinds, parser or handler bindings,
  manifest registration, renderer or exporter adapters, and optional shell
  capabilities
- preview-host registration owns route, page, load, save, and export
  integration through typed modules and handlers
- preview-shell capabilities expose engine/view-mode/runtime behavior through
  typed contracts rather than legacy global names
- `editor.js` and `layout-bridge.js` are compatibility adapters only

Explicit anti-goal:

- `editor.js` and `layout-bridge.js` must not be growth surfaces

That means future engine work must not begin by adding:

- engine-name branches
- document-kind branches
- raw/debug/view-mode branches
- save/export routing branches
- option-bag assembly branches
- global callback or compat wiring that really belongs in TypeScript owners

## Workstream A - `editor.js` adapter cutover

Goal: reduce `scripts/preview/editor.js` to a browser adapter that does setup
only.

Current state:

- the file is now 256 physical lines
- the mutable install-state wrapper assembly now lives behind
  `createPreviewGridEditorInstallUnitFromLegacyEditorHost(...)`
- the main remaining requirement is regression control: do not let new behavior
  creep back into the JS shell

Target residual shape:

- read DOM/config/runtime bootstrap inputs
- instantiate legacy JS classes only where temporary compatibility still
  requires them
- call a typed installer such as
  `createPreviewGridEditorFromBrowserHost(...)` or
  `installPreviewGridEditorFromBrowserHost(...)`
- install compatibility globals and callback shims from the returned adapter
- forward browser lifecycle events into typed runtime owners

Behavior that must move out of `editor.js` into TypeScript owners:

- option-bag assembly for editor/runtime/facade installers
- callback map construction and repo-local callback normalization
- snap and reorder coordination
- inspector callback wiring and mutation dispatch bridging
- selection wrappers and tree-selection synchronization helpers
- undo/restore glue and restore-time callback orchestration
- grid control assembly and refresh sequencing
- relayout globals and relayout follow-up wiring

Target bar:

- `editor.js` at or below about 350 physical lines
- no domain behavior
- no engine-specific branching
- no document-kind branching
- no large inline option-object assembly blocks
- no inline install choreography for inspector, selection, relayout, grid, or
  bootstrap families beyond a single typed installer call chain

Status:

- size bar: met
- single typed installer chain: met
- no engine/document-kind branching in the file: met
- closeout relevance: still open only because spec 046 is broader than
  `editor.js` alone

Suggested implementation slices:

1. introduce one typed editor installer that accepts a compact browser-host
   contract instead of a giant inline option bag
2. move callback-map shaping into owner-scoped TS modules next to the runtime
   that consumes each callback family
3. return one compat adapter object from the installer for required globals,
   legacy class hooks, and event-entry wrappers
4. collapse residual browser event handlers to thin calls into typed owners
5. re-measure the file after each slice and refuse opportunistic growth

## Workstream B - `layout-bridge.js` adapter and engine view-mode cleanup

Goal: reduce `scripts/preview/layout-bridge.js` to a generic bridge adapter with
registered capabilities.

Target residual shape:

- browser bootstrap input parsing
- typed bridge runtime creation
- compat alias installation
- event hookup

Target bar:

- `layout-bridge.js` at or below about 180 physical lines
- no primary ELK-shaped bridge interface
- no direct ownership of raw/debug view-mode semantics
- no direct ownership of relayout override vocabulary

Required architecture:

- create a generic engine view/debug/raw capability runtime
- treat ELK raw/debug support as a registered capability, not as the bridge's
  native shape
- keep `performElkRelayout`, `refreshElk*`, and similar names only as compat
  aliases at the outer edge
- remove `elkLayoutOverrides` or equivalent ELK-first vocabulary from primary
  bridge interfaces

Suggested implementation slices:

1. define a generic view capability contract in typed preview-shell owners
2. move raw/debug/view refresh logic behind registered capability handlers
3. adapt legacy bridge exports to call those handlers through a thin alias layer
4. leave only browser bootstrap and alias installation in the JS file

## Workstream C - document-family registry closure

Goal: make document-family onboarding handler-owned rather than central-branch
driven.

Required end state:

- document handlers own detection, parse, normalization, and engine/viewer
  context
- hardcoded sequence-vs-frame branching is replaced by handler `match`,
  `parse`, and `resolve` methods
- `determineFrameYamlKind` and
  `resolveFramePreviewEngineResolution` stop being central document-family stop
  points

Each handler must be able to own:

- preview-document detection
- load/parse normalization
- preview-engine resolution
- viewer mode or shell context
- persistence namespace or save semantics
- SVG export or output-only routing when relevant

Required proof for closure:

- a custom document family must traverse preview-document load, save, engine
  compatibility resolution, SVG export, and browser load/refresh without
  central document-kind branching

Current branch state:

- met on the preview-host side through handler-owned resolution plus the real
  `mindmap-lite` install-unit proof

Suggested implementation slices:

1. define handler registry contracts that can answer detection and resolution
2. move sequence and frame-diagram logic behind that registry
3. remove central fallback conditionals after both builtins run through the new
   registry
4. extend contract tests to prove the handler-owned path end to end

## Workstream D - install-unit proof

Goal: prove the architecture with a real skeletal non-ELK install unit.

Required proof shape:

- Mermaid-lite, D2-lite, Dagre-lite, or equivalent skeletal install unit
- document kind
- parser or document handler
- manifest
- render/export adapter
- persistence namespace and save flow
- host route/page or explicit output-only contract
- refresh/load
- save/export

Hard requirement:

- the proof must install without editing `editor.js`, `layout-bridge.js`,
  `server.ts`, or central document-kind conditionals

Current branch state:

- met through the `mindmap-lite` install unit, which installs through
  registries only and reuses the shared autolayout host lane

Why this matters:

- sequence proves important seams, but it is still too close to the current
  builtin families to count as the final many-engine proof
- a real foreign-shaped install unit is the only honest way to prove that the
  package-first story works

Suggested implementation slices:

1. choose one intentionally skeletal non-ELK family
2. build the smallest real install unit that exercises all required seams
3. keep product behavior intentionally narrow; this is an architecture proof,
   not a feature launch
4. lock the proof with host, browser-contract, save, and export tests

## Workstream E - browser contract and barrel split

Goal: keep TypeScript from becoming the replacement monolith.

Required end state:

- `packages/layout-engine/src/browser-entry.ts` is split into owner-scoped
  browser contract modules
- `packages/layout-engine/src/preview-shell/index.ts` is split into owner-scoped
  barrel surfaces
- the huge VM contract harness is split into owner-scoped test files or focused
  suites by capability family

Why this is part of 046:

- moving behavior out of JS but concentrating it in giant TS barrels would fail
  the same cold-start and many-engine scaling test under a different filename

Suggested implementation slices:

1. identify export families: bootstrap, scene, interaction, relayout,
   capabilities, document handlers, host adapters
2. split runtime contracts and installer helpers by owner boundary
3. replace the single huge engine-contract consumer harness with focused suites
   per owner or capability family
4. keep one thin top-level re-export surface only if it remains mechanical

## Workstream F - algorithm substrate readiness

Goal: make the underlying layout substrate engine-open rather than ELK-shaped.

Required end state:

- `graph-layout-core` result shapes are engine-open and engine-agnostic
- size semantics are explicit
- port, label, and constraint semantics are explicit
- parser-family adapters are separated from layout algorithms

What must become clear:

- what "node size" means before layout versus after layout
- how ports are represented for algorithms that do and do not natively support
  them
- how labels participate in measurement and layout outputs
- how constraints are represented without assuming ELK-specific concepts
- which normalization happens in parser-family adapters versus in shared layout
  substrate code

Reason:

- Mermaid, D2, and Dagre should not have to contort themselves into an ELK-only
  IR just to enter the platform

Suggested implementation slices:

1. document the current ELK-shaped assumptions in the substrate contracts
2. define engine-open result and capability types
3. separate parser-family normalization from algorithm-specific layout adapters
4. prove at least one non-ELK shape can pass through without alias-heavy
   distortion

## Ordered implementation sequence

The work should land in this order because each later batch depends on the
previous batch making the architecture more honest.

### Batch 1 - `editor.js` installer cutover

Scope:

- Workstream A initial installer and compat adapter
- move the largest remaining option-bag assembly and callback shaping out of JS

Validation after batch:

- targeted diff/read against `editor.js`
- focused preview-shell contract tests touched by installer changes
- re-measure `editor.js`

### Batch 2 - `layout-bridge.js` capability cutover

Scope:

- Workstream B generic view/debug/raw capability runtime
- compat aliases retained at the boundary only

Validation after batch:

- focused bridge/runtime tests
- re-measure `layout-bridge.js`
- verify no primary interfaces still require `elkLayoutOverrides`

### Batch 3 - document-handler registry closure

Scope:

- Workstream C handler-owned detection/parse/resolve flow
- remove central sequence-vs-frame branching

Validation after batch:

- preview-document and persistence tests
- targeted save/export tests
- proof that builtin document families resolve through handlers only

### Batch 4 - real install-unit proof

Scope:

- Workstream D skeletal Mermaid-lite, D2-lite, or Dagre-lite install unit

Validation after batch:

- host route/page or output-only tests
- browser load/refresh proof
- save/export proof
- diff review showing no edits in `editor.js`, `layout-bridge.js`, `server.ts`,
  or central document-kind conditionals for the proof

### Batch 5 - barrel and harness split

Scope:

- Workstream E browser-entry, preview-shell, and test-harness decomposition

Validation after batch:

- focused contract suites per owner family
- line-count check on the split barrels and the old harness file
- cold-start read test: ownership should be obvious without reopening giant
  files

### Batch 6 - algorithm substrate readiness

Scope:

- Workstream F engine-open substrate contracts

Validation after batch:

- substrate-focused tests
- one proof that a non-ELK engine shape survives without forced ELK vocabulary
- no regression in existing engine adapters

### Batch 7 - final adversarial audit

Scope:

- rerun the 046 closeout checklist and review prompts

Validation after batch:

- confirm thin adapter bars are met
- confirm no central doc-kind stops remain
- confirm no compatibility vocabulary remains as the primary surface
- confirm the install proof is real and still green
- confirm the honest answer to 50/150/500 engines is finally yes

## Acceptance checklist

Do not close spec 046 until all of the following are true:

- `editor.js` is at or below about 350 physical lines and reads as browser
  adapter glue only
- `layout-bridge.js` is at or below about 180 physical lines and reads as a
  compat bridge only
- neither file contains domain behavior, engine-specific branching, or
  document-kind branching
- no central document-kind stop points remain for builtin or custom document
  families
- compatibility vocabulary such as V3 or ELK names exists only as aliases, not
  as the primary runtime surface
- at least one real non-ELK install unit proves document kind, handler,
  manifest, render/export, persistence namespace, host contract, browser
  refresh/load, and save/export
- `browser-entry.ts`, `preview-shell/index.ts`, and the VM contract harness are
  split enough that TypeScript has not become the new monolith
- `graph-layout-core` and adjacent substrate contracts are engine-open enough
  that Mermaid, D2, and Dagre do not need ELK-only contortions
- the final adversarial review can honestly answer "yes" to adding 50, 150,
  and 500 heterogeneous engines without widening legacy JS sinks

## Review prompts for the final re-review

Use these prompts for the final adversarial pass:

1. If asked to add a Mermaid-like engine tomorrow, where do I start first?
2. If asked to add a Dagre-like engine tomorrow, do I need `editor.js`,
   `layout-bridge.js`, `server.ts`, or a central document-kind conditional?
3. Are V3/ELK names still the primary way runtime capabilities are expressed?
4. Can a custom document family own detection, parse, resolve, save, export,
   and browser load without central branching?
5. Did TypeScript barrels or contract harnesses merely replace the old JS
   monolith?
6. Does the substrate still assume ELK semantics for sizes, ports, labels, or
   constraints?
7. If the repo had to support 50, 150, or 500 engines, where would the next
   accidental monolith form?
8. Is the honest answer now yes, or are we still relying on compatibility sinks
   that would reopen the same architecture problem?
