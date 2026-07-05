# Plan: Spec 071 Preview render node graph

**Spec**: [`spec.md`](./spec.md)
**Branch**: `feat/071-preview-render-node-graph`
**Cold-start read order**: `AGENTS.md` → `docs/agent-index.md` →
`docs/spec-reviews/README.md` (engine-identity review) → this plan →
`tasks.md`. Then open only the files named per task.

## 1. Why the Houdini metaphor fits

The current preview is a set of overlapping imperative render paths. The Houdini
SOP model is a pull-based dependency graph with **isolated node state** and a
**single output**. Mapping it here is not a paradigm import; it is the missing
organizing principle that the repo already half-implements:

- `frameTreeJson` is already the source node.
- `defineGraphLayoutPreviewEngine` + the ELK/Dagre adapters are already
  interpreter-shaped.
- `PreviewRenderIntent` is already a proto-switch — but it is written from 8+
  sites and read inconsistently.
- `fitPreviewSvgToRenderedContent` is already a render-node primitive — but it is
  a per-caller afterthought instead of a pipeline stage.

So the work is **consolidation into typed owners**, not green-field. This is why
it is feasible and why it is the right substrate before onboarding 50/150
engines: node isolation is what stops them stepping on each other.

## 2. Target model (typed, in `packages/layout-engine/src/preview-shell/`)

Fixed fan-in graph. No arbitrary wiring.

```
source (frameTreeJson)
   │
   ├─► interpreterNode[v3]        (owns v3 params + cooked output)
   ├─► interpreterNode[elk-*]     (owns its ELK params + cooked output)
   ├─► interpreterNode[dagre]     (owns its dagre params + cooked output)
   └─► interpreterNode[…]         (registration-only; up to 50/150)
                                   │
                              switchNode  (sole writer of render intent)
                                   │
                              renderNode  (render → fit → mount → refreshScene)
                                   │
                                #stage svg
```

Proposed core types (names indicative; refine in T010):

- `PreviewRenderNodeGraph` — holds the source ref, the interpreter node map, the
  switch selection, and the render node handle.
- `PreviewInterpreterNode` — `{ id, capability, params (typed container),
  cook(source, params) => CookedLayout, cachedCook, dirty }`.
- `PreviewSwitchNode` — `{ getActiveNodeId, select(nodeId): RenderIntent,
  commit() }`. Wraps and replaces scattered `commitPreviewRenderIntentToWindow`.
- `PreviewRenderNode` — `{ mount(cooked): FittedStage }`. Wraps
  `renderFreshPreviewSvg` + `fitPreviewSvgToRenderedContent` + mount +
  `refreshPreviewSceneHost` as one call.

Nodes are cheap descriptors over existing engines; they do not duplicate layout
logic. The interpreter's `cook` delegates to the existing
`layoutPreviewFrameDiagramForEngine` path.

## 3. Refactor targets (what changes, per phase)

### Phase 1 — Render node
- New: `preview-render-node.ts` owning render→fit→mount→refresh.
- `app-scene-host.ts::rerenderPreviewStageHost` / `rerenderPreviewStageFromModelHost`
  delegate mounting+fitting to the render node instead of `replaceChildren` with
  no fit.
- `app-load.ts` load path calls the render node instead of its own
  `fitRenderedSvgToContent` wiring.
- `app-frame-svg.ts::patchPreviewSvgFromLayout` uses the one fit function; drop
  the `0 0 w h` reset divergence.
- `app-layout-bridge-runtime.ts` bridge relayout mounts via the render node.
- Extend `EditorMutationStateVector` (spec 069,
  `editor-mutation-transaction.ts`) with `fittedViewBox` + `activeNodeId`;
  add a violation when two mounts disagree on canvas.

### Phase 2 — Interpreter node state isolation
- New: `preview-interpreter-node.ts` + a node registry keyed by engine id that
  wraps existing `registerPreviewEngine` manifests.
- Move param ownership off `layoutOperatorOverrides` /
  `__DG_activeLayoutOperatorKey` global state onto the node container. The global
  keys become derived read-through from the active node, then are removed.
- `layout-operator-overrides.ts` becomes the per-node param store, not a shared
  bucket.
- Persistence (`apps/preview/src/persistence/frame-diagram.ts`,
  `app-save-payload.ts`) reads/writes each node's namespace; foreign-key
  rejection moves to the node boundary.

### Phase 3 — Switch node + cook
- New: `preview-switch-node.ts`. Replace all
  `commitPreviewRenderIntentToWindow` call sites (grid-editor-install-unit,
  grid-editor-runtime, layout-bridge-runtime, workspace-chrome) with switch-node
  calls. The switch commits `frameTreeJson.layoutEngine` too.
- New: dirty/cook model. Save/render = `switch.commit()` → `activeNode.cook()` →
  `renderNode.mount()`. Only the selected node cooks.

### Phase 4 — Onboarding + inventory
- `check-no-central-branching`-style test extended to assert a dummy node needs
  no edits to render/switch/editor/bridge.
- FR-010 inventory doc: `evidence/render-path-inventory.md` listing every legacy
  stage-mount / fit / render-intent site with migrate|read-only|deferred status.

## 4. Invariants (must hold across all render paths)

1. Only the render node mounts/fits the stage SVG.
2. Fit is idempotent and origin-deterministic; one implementation.
3. Only the switch node writes render intent; render reads engine only from it.
4. Each interpreter node owns its params; no cross-node reads or writes.
5. Fitted viewBox is part of the state vector; divergence is a violation.
6. Equivalent geometry is a verified recorded state, never an ambiguous visual.
7. Save/render is deterministic: (source, node, params) ⇒ identical fitted stage.
8. Adding a node touches only registration, never render/switch/editor code.

## 5. Dependencies and ordering

- **Subsumes** the spec 060 follow-up (visual no-op tab switches) — do not do 060
  follow-up separately; Phase 1 closes it.
- **Builds on** spec 065 (`PreviewRenderIntent`), spec 069
  (`EditorMutationStateVector`), spec 052 (`defineGraphLayoutPreviewEngine`),
  spec 054/060 (persistence + engine-commit).
- **Precedes** engine-breadth work: the "resume engine breadth" backlog item in
  `TODO.md` should consume the Phase 4 node contract.
- **Parallel-safe** with localized correctness specs 061/064. Specs 062/063
  (hug-resize / auto-style) should adopt the Phase 3 dirty-propagation contract
  once it lands rather than adding a fifth ad-hoc relayout trigger.

## 6. Test strategy

- **Unit** (`packages/layout-engine/tests/`): render node idempotent-fit;
  switch node single-writer; interpreter node param isolation; state-vector
  canvas violation; no-central-branching dummy node.
- **Persistence** (`apps/preview/src/persistence/`): per-node namespace
  round-trip; foreign-key rejection at node boundary; SC-001 canvas-parity across
  the five triggers (prefer a Node/DOM-level harness; Playwright only where a
  real gesture is required).
- **Browser evidence** (`docs/spec-archive/071-.../evidence/`): SC-002 real-gesture tab
  switch with fitted-canvas + `data-layout-engine` + active node id captured;
  SC-003 ELK/dagre bucket-leak sequence. Follow spec 069's fixture-hygiene rule:
  sanitized temp fixtures or hash-guarded authored fixtures; never write back to
  `scripts/diagrams/frames/*.yaml`.
- Reuse `check-preview-shell-size-budgets.mjs`; keep `editor.js`/`layout-bridge.js`
  thin — new ownership is TypeScript in `preview-shell/`.

## 7. What this is NOT
- Not a visual node-graph UI. Tabs stay.
- Not a general dataflow engine.
- Not new engine breadth or fidelity work.
- Not a rewrite: each phase delegates then deletes, and is independently
  mergeable.
