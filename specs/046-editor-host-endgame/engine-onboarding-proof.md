# Engine Onboarding Proof

Browser-shell proof material for spec 046. This document is evidence for one
slice of the architecture, not proof that 046 is ready to close.

The authoritative remaining-work architecture now lives in
[remaining-implementation-plan.md](./remaining-implementation-plan.md). This
proof document exists to answer one narrower question: how much of the browser
shell already starts from typed registration points rather than from the legacy
JS sink files?

The adversarial review on 2026-06-19 changed the standard for this file:
controller compatibility is useful evidence, but it is not enough. The proof
must now distinguish clearly between:

1. the browser-shell seams that no longer start in `editor.js`
2. the still-open host/document/render/persistence blockers that prevent honest
   50/150/500-engine closeout

## What 046 changed

- `scripts/preview/editor.js` no longer names `ElkPreviewController` directly for bootstrap, save, or relayout-mode decisions.
- The grid shell now resolves engine-specific panel/save behavior through typed preview-shell owners in `packages/layout-engine/src/preview-shell/app-bootstrap.ts`.
- The bootstrap tail now enters that owner through `previewShell.bootstrap.createBootstrapPreviewEditorRuntimeOptionsFromHost(...)` plus `previewShell.bootstrap.bootstrapPreviewEditorRuntime(...)`, so `editor.js` no longer hand-assembles host-only save/toolbar/SSE/build-status wiring inline.
- The diagram load and relayout-runtime entrypoints now enter typed owners through `previewShell.bootstrap.createLoadPreviewSvgHostOptionsFromRuntime(...)` in `app-load.ts` plus `previewBridge.relayout.createPreviewRelayoutRuntimeFromRuntime(...)` in `app-relayout-runtime.ts`, so future shell-lane onboarding no longer starts by widening `loadSVG()` or `_getRelayoutRuntime()` in `editor.js`.
- The selection / inspector / waypoint runtime-set callback assembly now enters typed owners through `previewShell.bootstrap.createPreviewEditorRuntimeSetFromRuntime(...)` in `app-editor-runtime-set.ts`, so `editor.js` no longer owns that large constructor bag inline.
- The residual mutable editor-host install state now enters typed owners through `previewShell.bootstrap.createPreviewGridEditorInstallUnitFromLegacyEditorHost(...)` in `app-grid-editor-install-unit.ts`, so `editor.js` no longer owns wrapper assembly for generation, selection depth, override state, dirty-nav suppression, or relayout timers.
- Engine-local browser hooks now have a generic registration point:
  - `PreviewEngineShellController`
  - `previewShell.bootstrap.ensurePreviewEngineShellController(...)`
  - `previewShell.bootstrap.isPreviewEngineShellLayoutActive(...)`
  - `previewShell.bootstrap.initPreviewEngineShellPanel(...)`
  - `previewShell.bootstrap.collectPreviewEngineSavePayload(...)`
- The current ELK implementation is now an engine-local adapter in `scripts/preview/elk-controller.js` that conforms to that generic shell-controller seam while preserving the old `ElkPreviewController` alias for compatibility.
- `layout-bridge.js` now resolves engine-backed relayout through preview-engine manifest capabilities plus typed bridge/runtime owners instead of keeping ELK-only relayout detection and override resolution inline.

## Typed onboarding path

For an engine that reuses an existing shell tier, the browser-shell answer must
start here:

1. Add or extend the engine manifest in `packages/layout-engine/src/preview-engine/registry.ts`.
2. Use manifest capabilities and shell mode to choose an existing lane when possible.
3. If the engine needs browser-side panel/save hooks, provide an engine-local shell controller adapter rather than editing `editor.js`.
4. If a new host lane is truly required, register it in the preview-host owners
   under `apps/preview/src/preview-host/`.

The answer must not start with `scripts/preview/editor.js`.

That is only the browser-shell start point. A credible many-engine answer also
needs typed ownership for:

1. host route/page installation
2. viewer-page mode/page assembly
3. document-kind detection, parse/normalize, and engine/viewer resolution
4. save/spec/export endpoint registration
5. render/export adapter registration
6. persistence namespace ownership

Until those are descriptor-driven enough, this document is a partial proof only.

## Representative engine classes

### External dependency-backed engine

Example: another graph library in the ELK family of needs.

- Reuse the grid shell when inspector/selection behavior still applies.
- Register the engine manifest and scripts through `preview-engine`.
- Provide an engine-local shell controller adapter for panel/save hooks.
- Do not add new engine-name branches to `editor.js`.

### Ported diagram-family engine

Example: Mermaid-derived diagram types.

- Prefer a typed renderer/host registration under `preview-engine` and preview-host owners.
- Reuse `grid` or `sequence` shell tiers when the interaction model matches.
- If the engine does not need grid-shell interaction, route it through a dedicated host lane instead of widening `editor.js`.
- The browser-shell seam is now test-backed with a representative non-ELK controller in `packages/layout-engine/tests/app-bootstrap.test.ts` (`mermaid-flowchart`). This is a shell-contract proof, not a claim that a real Mermaid browser adapter is already launched.

### Bespoke in-house engine

- Start from manifest + capability registration.
- Reuse the closest shell tier.
- Add engine-local adapters in TypeScript or thin engine-local shell glue only when a tier-specific hook is genuinely required.
- The same test file now exercises a bespoke representative controller (`bespoke-grid`) through the generic bootstrap/save/panel seam without any `editor.js` changes. This is likewise a shell-contract proof rather than a launched bespoke product lane.

## Current shell-contract proof

- External dependency-backed class: live ELK adapter in `scripts/preview/elk-controller.js`, covered by `packages/layout-engine/tests/app-bootstrap.test.ts` and `apps/preview/src/persistence/engine-contract-consumers.test.ts`.
- Ported diagram-family class: representative `mermaid-flowchart` controller exercised in `packages/layout-engine/tests/app-bootstrap.test.ts`.
- Bespoke in-house class: representative `bespoke-grid` controller exercised in `packages/layout-engine/tests/app-bootstrap.test.ts`.

This is still a browser-shell proof, not a claim that Mermaid or D2 product
lanes are fully launched.

## Real non-ELK proof now on branch

The sequence family now has two layers of real proof:

1. host/document/save/export proof in
   `apps/preview/src/persistence/preview-host-contract.test.ts`
2. browser refresh/load proof in the same test file by replaying the saved
   sequence canonical state through
   `createLoadPreviewSvgHostOptionsFromRuntime(...)` + `loadPreviewSvg(...)`

That matters because the browser leg now proves the typed load seam can accept
real non-ELK canonical state without reopening `editor.js` or
`layout-bridge.js`.

The branch now also has one real foreign-shaped install-unit proof:

1. `packages/layout-engine/src/preview-engine/mindmap-lite.ts`
2. `apps/preview/src/preview-host/mindmap-lite-install-unit.ts`
3. `apps/preview/src/persistence/mindmap-lite-install-unit.test.ts`

That proof exercises:

1. document-kind registration
2. preview-engine manifest registration
3. preview-document SVG renderer registration
4. shared autolayout host-route/page reuse
5. custom save payload ownership under a document-local namespace
6. SVG export
7. browser refresh/load through the typed load helper

## Still-open blockers

The current branch still fails the full proof standard in these ways:

1. the browser edge still carries compatibility aliases and ELK-shaped debug/raw
   view names alongside the new generic engine-shell facade
2. the three-class representative proof is still shell-contract-level for the
   ported-family and bespoke classes, not launched product lanes
3. the large TypeScript barrels and VM contract harnesses still risk becoming
   the replacement monolith
4. the graph/layout substrate is still too ELK-shaped for Mermaid, D2, Dagre,
   and other foreign algorithm families

These are not side notes. They are the reason the closeout answer is still
"not yet."

## Required real proof

Spec 046 required one skeletal foreign-shaped engine or diagram-family proof
such as Mermaid-lite, D2-lite, or Dagre-lite that exercises the whole path
through typed seams:

1. document kind or document-family registration
2. preview-engine manifest/descriptor registration
3. render/export adapter registration
4. preview-host route/page install or an explicit output-only host contract
5. persistence namespace ownership
6. initial preview/load and browser refresh behavior
7. save/spec/export authority

That proof now exists as `mindmap-lite`. It did not require `editor.js`,
`layout-bridge.js`, `server.ts`, or central document-kind conditionals.

That still does not close 046 by itself because the remaining barrel/harness
and substrate blockers are real.

## Acceptance answers

### Can a future engine reuse the shell without editing `editor.js`?

Yes structurally for bootstrap, save-path, shell-controller wiring, and
engine-backed relayout dispatch.

The active engine now enters the grid shell through typed registration points
and typed owners rather than through direct ELK calls or bridge-local engine
branches in `editor.js` / `layout-bridge.js`.

### Can a future engine onboarding start from typed registration points?

Yes for the preview-shell portion, but that is no longer treated as sufficient
closeout proof for spec 046.

Cold-start answer:

1. `preview-engine/registry.ts`
2. preview-host descriptor/module registration only if needed
3. typed preview-shell owner or engine-local controller adapter
4. typed document/render/persistence descriptors rather than central server
   branches

Not:

1. `scripts/preview/editor.js`

The full 50/150/500-engine answer is broader than this document. Dedicated host
modules, documented install-unit conventions, the real foreign-shaped install
unit proof, trap-file thinness, barrel/harness split, substrate readiness, and
final compatibility cleanup still remain open, even though the browser-shell
registration path no longer starts in the legacy JS sink files and the real
non-ELK browser load proof is now green.

## Honest veto

Spec 046 does **not** get to ignore `layout-bridge.js`.

- `editor.js` is no longer the default engine-onboarding sink for preview-shell work.
- `editor.js` is now in the target thin-adapter size band and enters the grid
  shell through a single typed legacy-host installer.
- `layout-bridge.js` no longer owns bridge state, text-adapter readiness, or
  local-vs-ELK relayout dispatch; those now enter through
  `previewBridge.host` and `app-layout-bridge-runtime.ts`.
- The remaining bridge risk is narrower: compatibility wrappers and the growing
  browser-entry / preview-shell barrel cold-start surface still need cleanup
  under spec 044, but ELK debug/raw-view DOM ownership no longer lives inline
  in the JS facade.

Honest answer today:

- **Preview-shell / editor path**: materially better than before. Engine
  panel/save/bootstrap work should no longer start in `editor.js`.
- **Three-class browser-shell proof**: green only at the shell-contract level.
  ELK, representative Mermaid-family, and representative bespoke controllers
  now pass through the same typed bootstrap/panel/save seam in tests.
- **Full 50/150/500-engine answer**: still **not yet**. Host route/page
  installation is now materially better, the install-unit pattern is now
  documented and tested, the real non-ELK browser refresh/load proof is green,
  and one foreign-shaped install unit is real, but barrel/harness split,
  substrate readiness, compatibility cleanup, and the final adversarial yes/no
  audit are still not complete enough to count as honest many-engine
  readiness.
