# Agent inbox

Machine-generated handoffs and diagnostics go here.

Durable follow-up belongs in `TODO.md`, [`AGENTS.md`](AGENTS.md#handover), or [`docs/specs.md`](docs/specs.md).

---

## Resolved — do not reopen unless regressed

Host/platform seams that prior inbox entries flagged as blockers and that are now
green on `feat/046-editor-host-endgame`:

- Builtin host route/API install via `installBuiltinPreviewHost()` and installable
  modules under `apps/preview/src/preview-host/` (not per-lane `server.ts` surgery).
- Document/save/spec/export authority through typed endpoint descriptors
  (`document-apis.ts`, `frame-document-kinds.ts`, host registry).
- Open `PreviewShellMode` (`'grid' | 'force' | (string & {})`) for viewer page mode.
- Sequence render/export through registered adapters in
  `packages/layout-engine/src/preview-engine/builtin-render-adapters.ts`.
- Central `engine.id === "elk-layered"` branching removed from
  `preview-engine/registry.ts`.
- Thin JS wrappers: `save-client.js` (27 lines), `elk-controller.js` (46),
  `elk-layout-controls.js` (30) with contract tests.
- Install-unit pattern documented in
  `specs/046-editor-host-endgame/install-unit-pattern.md` and test-backed
  (`preview-engine-render.test.ts`, `preview-host-contract.test.ts`) — **T044**.
- Sequence host/API proof: preview-document, save, SVG export in
  `preview-host-contract.test.ts`.
- Sequence browser refresh/load proof: saved canonical state replays through
  `loadPreviewSvg(createLoadPreviewSvgHostOptionsFromRuntime(...))` in the same
  test file — **T045 progress**, not final closeout until T043 lands.
- `layout-bridge.js` bridge/runtime/view-mode assembly now enters through
  `createPreviewLayoutBridgeRuntimeFromBrowserHost(...)` and
  `createPreviewElkViewModeRuntimeFromBrowserHost(...)` (~395 lines, down from ~600).
- `editor.js` coordinator clusters now enter through four typed facades:
  `createPreviewEditorBootstrapFacadeFromEditorHost`,
  `createPreviewEditorInteractionFacadeFromEditorHost`,
  `createPreviewEditorSceneFacadeFromEditorHost`,
  `createPreviewEditorRelayoutFacadeFromEditorHost`.

---

## Spec 046 merged adversarial audit - Composer + Codex (2026-06-21)

**Branch:** `feat/046-editor-host-endgame`

**Verification run:**

- `npm --prefix packages/graph-layout-core test` - 1/1 pass
- `npm --prefix packages/graph-layout-elk test` - 21/21 pass
- `npm --prefix packages/layout-engine test` - 690/690 pass
- `npm --prefix apps/preview test` - 105/105 pass
- `npm --prefix apps/preview run build` - pass
- `npm --prefix packages/layout-engine run build:browser` - pass
- `node scripts/check_no_new_python.mjs` - pass

### Verdict

**Spec 046 is still not closed.** Composer's audit is correct on the main point:
the honest answer to "can we start porting Mermaid, D2, Dagre, and other
algorithms as many layout engines now?" is still **no**.

This branch made real progress. The host route/API install path, render
adapters, document endpoint descriptors, thin JS wrappers, and editor facades are
not cosmetic. The tests are green and the sequence-family proof now reaches host
save/export plus typed browser refresh/load.

The blocker is not test health. The blocker is architecture readiness for
50/150/500 heterogeneous engines. Current code still has legacy browser-shell
sinks, central document-family assumptions, and a few new TypeScript mega-barrels
that would become the next cold-start bottleneck if the spec closed now.

### Measured surfaces

Physical line counts on disk:

| File | Lines | Read |
|------|------:|------|
| `scripts/preview/editor.js` | 1,601 | Still a coordinator, not a thin adapter |
| `scripts/preview/layout-bridge.js` | 395 | Much closer, still ELK/debug/global shaped |
| `scripts/preview/save-client.js` | 27 | Thin wrapper |
| `scripts/preview/elk-controller.js` | 46 | Thin wrapper with compat alias |
| `scripts/preview/elk-layout-controls.js` | 30 | Thin wrapper |
| `packages/layout-engine/src/browser-entry.ts` | 1,306 | Large browser export barrel |
| `packages/layout-engine/src/preview-shell/index.ts` | 1,391 | Large preview-shell export barrel |
| `apps/preview/src/persistence/engine-contract-consumers.test.ts` | 3,593 | Oversized VM contract harness |

PowerShell `Measure-Object -Line` undercounted some trap files in earlier notes;
use physical line numbers above for closeout discussion.

### Credible progress to keep

- Preview-host module/API/viewer registration is real:
  `installBuiltinPreviewHost()`, `registerPreviewHostModule(...)`,
  `registerPreviewHostViewerRoute(...)`, and registered API routes now avoid
  server-local route surgery for the current builtins.
- Preview-engine registration is real:
  `registerPreviewEngine(...)`, frame render adapters, and preview-document SVG
  renderers give a typed start point for engine/render work.
- The JS wrapper direction is correct:
  `save-client.js`, `elk-controller.js`, and `elk-layout-controls.js` now mostly
  delegate into typed owners.
- The sequence proof is meaningful:
  host preview-document, save, SVG export, canonical state, and
  `loadPreviewSvg(...)` browser replay are covered in
  `preview-host-contract.test.ts`.
- The editor extraction is real:
  bootstrap, interaction, scene, relayout/state-restore/live-resize clusters now
  enter through typed `createPreviewEditor*FacadeFromEditorHost(...)` functions.

### Blockers that remain after dedupe

1. **`editor.js` is still the dominant closeout blocker.**
   The file still has about 100 top-level functions plus large option-bag
   assembly for scene/bootstrap/relayout/interaction facades. It still owns or
   wires snap/reorder helpers, inspector callback plumbing, selection wrappers,
   undo/restore glue, grid-control binding, and public V3 relayout globals. A
   maintainer still has to read the file to understand grid-shell behavior.

2. **`layout-bridge.js` is closer but not final.**
   It delegates much more now, but still exposes `performElkRelayout`,
   `refreshElkViewMode`, `refreshElkDebugOverlay`, `__DG_setElk*` globals, and
   an ELK-specific view-mode runtime. This is tolerable compatibility, not yet
   an engine-neutral adapter.

3. **Generic vocabulary is not fully "outer edge only."**
   `requestV3Relayout`, `getV3RelayoutStatus`, `ElkPreviewController`,
   `ElkLayoutControls`, `elkLayoutOverrides`, and `nextElkLayoutOverrides` still
   appear in typed owner interfaces, tests, and JS globals. The generic names
   are primary in many places, but the old vocabulary is still part of the live
   contract surface.

4. **Document-family onboarding is not registry-owned enough.**
   Handler registration exists and is useful, but `determineFrameYamlKind(...)`
   still hardcodes `sequence` vs `frame-diagram`, and
   `resolveFramePreviewEngineResolution(...)` has a direct `sequence` branch
   before falling back to frame diagrams. The custom `mindmap` test proves
   preview/render handler registration, but it does not prove save,
   engine-switch compatibility, or viewer-context resolution for arbitrary new
   document families.

5. **The install-unit pattern is documented, but builtin install is still a
   central-list pattern.**
   Current builtins register through arrays such as `BUILTIN_PREVIEW_ENGINES`,
   `BUILTIN_PREVIEW_HOST_MODULES`, and builtin render-adapter lists. That is
   acceptable for builtins, but it is not yet proof that future packages can
   install without editing central files.

6. **The browser contract has shifted from JS monoliths to TS barrels.**
   `browser-entry.ts` and `preview-shell/index.ts` are very large export maps.
   That is a better failure mode than behavior-heavy JS, but for 150-500 engines
   it can still become a central coordination surface unless split into
   owner-scoped contracts/bundles.

7. **The graph-layout substrate is still ELK-shaped.**
   `graph-layout-core` is a useful IR start, but its result `engine` union is
   currently `elk-layered | elk-force`, and the input expects measured node
   boxes. That is not yet a general Dagre/D2/Mermaid algorithm substrate.

8. **No real Mermaid/D2/Dagre skeletal install proof exists.**
   Sequence is a real non-ELK proof, and `mermaid-flowchart` / `bespoke-grid`
   shell tests prove contract shape. They do not prove the repository can port a
   second diagram-family suite or a separate graph algorithm without touching
   central detection, page, barrel, or legacy-browser surfaces.

### Task honesty

| Task | Status | Merged adversarial read |
|------|--------|--------------------------|
| T020-T026 | Closed | Credible for current host/render/wrapper seams |
| T041-T042 | Closed with caveat | Generic names are primary in important places; compat vocabulary still leaks broadly |
| T044 | Closed | Pattern is documented/tested; package-level install remains unproven |
| T019 | Closed with caveat | Shell-contract proof only, not product-family proof |
| T043 | Open | Correctly open; `editor.js` still blocks closeout |
| T045 | Open | Correctly open; rerun after final thinness |
| T034/T046 | Open | Correctly open; honest answer is still no |

### Recommended next work

1. Continue Phase C, but define the target as "skim-able adapter" rather than a
   line-count reduction. Move the remaining `editor.js` option assembly and
   callback plumbing into owner-scoped TS modules so the JS file becomes DOM
   lookup, event hookup, and compatibility export only.
2. Finish `layout-bridge.js` demotion by moving ELK debug/raw-view and relayout
   alias exposure behind an engine capability facade with generic public names.
3. Make document-kind detection and viewer-context resolution handler-owned.
   Add a custom non-frame document-family test that covers preview-document,
   save, engine compatibility, SVG export, and browser load without central
   `sequence` branches.
4. Split `browser-entry.ts`, `preview-shell/index.ts`, and the giant VM contract
   harness along owner namespaces so TypeScript does not become the new monolith.
5. Create one real skeletal "Dagre-lite" or "Mermaid-lite" install unit:
   manifest, document handler, renderer/layout adapter, host route/page or
   output-only contract, persistence namespace, refresh/load, save/export. It
   should install without editing `editor.js`, `layout-bridge.js`, `server.ts`,
   or central document-kind conditionals.
6. After T043 lands, rerun the sequence proof plus the new install-unit proof,
   then run T046. Close T034 only if the 50/150/500 answer is honestly yes.
