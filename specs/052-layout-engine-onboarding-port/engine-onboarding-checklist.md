# Engine Onboarding Checklist (Spec 052)

Copy this checklist once **per new layout algorithm**. It is the literal recipe
for "add engine N+1." If a step here is wrong or missing, fix this file (Task
T501) so the next engine is cheaper.

Replace `<engine>` with the engine id (e.g. `elk-force`, `dagre`), `<Engine>`
with PascalCase, and `<algo-fn>` with the algorithm function.

> Prerequisite: Phase 1 of `tasks.md` is done — the factory
> `defineGraphLayoutPreviewEngine` and the contract-test helper exist.

---

## Step 1 — Graph layout engine (in a `packages/graph-layout-*` package)

1. Implement (or confirm) the algorithm function mapping
   `GraphLayoutInput → GraphLayoutResult`.
   - File: `packages/graph-layout-<pkg>/src/<engine>-layout.ts` (or existing).
   - Normalize coordinates with the shared `graph-layout-core` conventions ELK
     uses. No bespoke rounding.
2. Export a `GraphLayoutEngineDescriptor` named `<ENGINE>_GRAPH_LAYOUT_ENGINE`.
   - File: `packages/graph-layout-<pkg>/src/engine-capabilities.ts`.
   - Capabilities must be **honest**: only declare directions/ports/compounds/
     edgeLabels/constraints the algorithm truly supports.
3. Export param specs `<ENGINE>_PARAM_SPECS` (ELK param-spec shape).
   - File: `packages/graph-layout-<pkg>/src/<engine>-param-registry.ts`.
   - Mirror `packages/graph-layout-elk/src/elk-param-registry.ts`.
4. Add/extend the package's tests for the descriptor + a minimal layout.
   - Verify: `npm --prefix packages/graph-layout-<pkg> test`

## Step 2 — Render adapter (in `packages/layout-engine`)

5. Add a `PreviewFrameDiagramRenderAdapter` that calls `<algo-fn>` and returns a
   layout result.
   - File: `packages/layout-engine/src/preview-engine/builtin-render-adapters.ts`
     (or a dedicated adapter module if it grows).
   - Choose `renderFamily = 'frame-<engine>'` (must be unique).
   - If the engine reuses ELK's frame path, follow the T300 decision (selector
     vs separate family) — do not improvise.
   - Verify: `npm --prefix packages/layout-engine test`

## Step 3 — Control specs

6. Build control specs from the param registry using the generic mapper:
   `paramSpecToPreviewControl(spec, 'meta.<engine>')`.
   - Add a helper `<engine>PreviewControlSpecs()` next to `elkLayeredPreviewControlSpecs()`.
   - persistNamespace MUST be `meta.<engine>` (no collision with `meta.elk`
     unless this IS an ELK engine sharing the ELK namespace by design).

## Step 4 — Preview engine definition

7. Create the engine definition file.
   - File: `packages/layout-engine/src/preview-engine/engines/<engine>.engine.ts`
   - Call `defineGraphLayoutPreviewEngine({ ... })` with:
     - `id: '<engine>'`, `label`, `layoutEngineKey: '<engine>'`
     - `renderFamily: 'frame-<engine>'`
     - `graphEngine: <ENGINE>_GRAPH_LAYOUT_ENGINE`
     - `controlSpecs: <engine>PreviewControlSpecs()`
     - `sidebarSections`: `['elk-layout']` for ELK-family engines, or the section
       your engine exposes (do not invent a new section without a UI task)
     - `renderAdapter`: the Step 2 adapter
     - `capabilities`/`compatibility`: only overrides; rely on factory defaults
   - Export `<ENGINE>_PREVIEW_ENGINE_INSTALL_UNIT` (the `installUnit`).

## Step 5 — Register (the ONE wiring line)

8. Register the install unit.
   - File: `packages/layout-engine/src/preview-engine/builtin-install-units.ts`
   - Add exactly one line:
     `registerPreviewEngineInstallUnit(<ENGINE>_PREVIEW_ENGINE_INSTALL_UNIT);`
   - **No** other central edits. If you feel the urge to add an `if (id === ...)`
     anywhere, STOP — that violates FR-005.

## Step 6 — Permit the engine key

9. Add `'<engine>'` to the permitted `meta.layout_engine` values.
   - Find the validation list: `Select-String -Path packages/layout-engine/src -Pattern "elk-layered" -Recurse`
   - Add the new key where `elk-layered` is enumerated.

## Step 7 — Contract test (the cheap proof)

10. Add one contract test.
    - File: `packages/layout-engine/tests/engines/<engine>.contract.test.ts`
    - Body: `runGraphLayoutPreviewEngineContract(<the definition>)`.
    - Verify: `npm --prefix packages/layout-engine test`

## Step 8 — Host-contract + live proof

11. Add/extend the apps/preview host-contract test asserting this engine shows
    only its own sections and hides the others (grid for non-v3, ELK for non-ELK,
    force for non-force).
    - Verify: `npm --prefix apps/preview test`
12. Rebuild the browser bundle and run a no-screenshot DOM probe on a diagram
    using `meta.layout_engine: <engine>`.
    - Verify: `npm --prefix packages/layout-engine run build:browser` then
      `node scripts/check-browser-bundle-fresh.mjs`
    - Accept: the engine's controls render; other engines' controls are hidden
      AND not focusable.

## Step 9 — Final gate for this engine

13. Run the full validation set (spec 052 SC-001..SC-005) and confirm the diff
    for this engine touched only: its definition file, its render adapter entry,
    its param/control helper, the single registration line, the permitted-keys
    line, and its two tests. If it touched a central branch, you did it wrong.

---

## Definition of "cheap" (SC-007)

By the last engine, Steps 4, 5, and 7 should be the *only* per-engine creative
work: a definition file, one registration line, one contract test. Steps 1–3 are
algorithm-specific and unavoidable; everything else is mechanical. If any step
keeps requiring edits to shared/central files, fix the factory — not the engine.
