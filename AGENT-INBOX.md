# Agent inbox

Machine-generated handoffs and diagnostics go here.

Durable follow-up belongs in `TODO.md`, [`AGENTS.md`](AGENTS.md#handover), or [`docs/specs.md`](docs/specs.md).

---

## Latest adversarial review follow-up (2026-06-18, current branch state)

This section supersedes the prior pass-4 review. Resolved items have been removed.

**Branch:** `feat/046-editor-host-endgame`  
**Current shape:** `scripts/preview/editor.js` is about `1,704` lines; `scripts/preview/layout-bridge.js` is about `499` lines.

### Resolved since the prior review

- Spec 046 docs/tasks no longer overclaim closeout. The package is back to `In Progress`, T024 is reopened, and 047 remains gated.
- The `editor.js` bootstrap callback bag is materially smaller at the host edge. `editor.js` now enters the tail through `previewShell.bootstrap.bootstrapPreviewEditorRuntime(...)`, with build-status, toolbar, selection-restore, and EventSource assembly moved into `app-bootstrap.ts`.
- `editor.js` no longer hand-assembles the `loadPreviewSvg(...)` or relayout-runtime callback bags inline. Those host-option builders now live in typed preview-shell owners (`createLoadPreviewSvgHostOptions(...)` and `createPreviewRelayoutRuntimeOptionsFromHost(...)`).
- Residual engine-specific host naming called out in `editor.js` is removed. The host no longer carries `isElkLayeredDiagram`, `initElkPanel`, `getElkLayoutOverrides`, or `performElkRelayout` wiring.
- The three-class browser-shell onboarding proof is no longer prose-only. `packages/layout-engine/tests/app-bootstrap.test.ts` now exercises representative ported-family (`mermaid-flowchart`) and bespoke (`bespoke-grid`) controllers through the same generic `PreviewEngineShellController` seam used by ELK.
- `layout-bridge.js` no longer carries the inline duplicate `collectFramesById` / `collectPlacedBounds` implementations or the flat root-contract fallbacks that were still present in the previous review. The bridge now requires the namespaced preview contracts directly.
- `layout-bridge.js` no longer owns ELK debug/raw-view DOM state inline. That view-mode runtime now lives in `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts` behind `previewBridge.host.createPreviewElkViewModeRuntime(...)`.
- `editor.js` no longer hand-assembles the selection, inspector-display, inspector-mutation, inspector-selection, and arrow-waypoint runtime constructor bags inline. Those now compose through `previewShell.bootstrap.createPreviewEditorRuntimeSet(...)` in `packages/layout-engine/src/preview-shell/app-editor-runtime-set.ts`.
- `layout-bridge.js` no longer routes fresh-render or frame-tree overlay rendering back through the merged host render contract. Those paths now call the bundle render contract directly, preventing recursive self-entry and keeping the live demo load path green.
- Shared shell getters in `scripts/preview/editor-base.js` now read the namespaced browser contract directly instead of falling back to the flat `LayoutEngine` root bag.

### Still open

#### High

1. **Spec 046 thin-host bar still fails literally** — `editor.js` is improved but still too large to count as obvious thin bootstrap glue. Keep shrinking callback/runtime assembly out of the host until cold-start skim cost drops materially again.

#### Medium

2. **Cold-start surface shifted into TypeScript barrels** — `packages/layout-engine/src/preview-shell/index.ts` and `packages/layout-engine/src/browser-entry.ts` remain large enough to deserve trap-file discipline even though they are better-structured than the old JS sinks.
3. **Contract consumer harness is smaller but still not cheap** — the stale per-runtime constructor captures in `engine-contract-consumers.test.ts` are replaced with a runtime-set seam plus a focused `app-editor-runtime-set.test.ts`, but the remaining VM-extraction harness is still a maintenance cost worth shrinking further when practical.

#### Discussion / non-code-state

4. **`044` + `046` work on one branch** — this is historically true for the current branch shape, but it is not an actionable code defect without rewriting branch history or splitting commits after the fact. If reviewers want branch-level separation beyond the current commit structure, discuss before rebasing or replaying history.

### Current validation baseline

- `npm --prefix packages/layout-engine run build`
- `npm --prefix packages/layout-engine run build:browser`
- `npm --prefix packages/layout-engine test`
- `npm --prefix apps/preview test`
- `node scripts/check_no_new_python.mjs`

### Current next work

1. Continue shrinking `editor.js` by moving additional relayout/scene/bootstrap coordination into typed owners until the file reads as thin glue rather than a large coordinator.
2. Keep reducing VM contract-harness pressure where new focused unit tests can replace source-extraction coverage without losing the browser-contract guardrail; the new runtime-set seam is one working pattern.
3. Start shrinking the preview-shell barrel cold-start surface so the typed owners do not become the next trap files.
