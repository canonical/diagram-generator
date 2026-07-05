# Spec 071: Preview render node graph (Houdini-style interpreter/switch/render)

**Feature Branch**: `feat/071-preview-render-node-graph`
**Status**: Closeout Ready
**Created**: 2026-07-01
**Owner Map**: [`render-node-graph-flow.md`](./render-node-graph-flow.md)
**Depends on / subsumes**: spec 060 follow-up (visual no-op tab switches),
`docs/spec-reviews/README.md` (engine-identity source-of-truth review), and the
2026-07-01 render-path fragmentation review in `AGENT-INBOX.md`.
**Status Note (2026-07-02)**: Spec 071 remains closeout-ready on
`feat/071-preview-render-node-graph`. The closeout review follow-up tightened
SC-002's real-browser proof so same-bounds engine switches now have to prove
equivalent geometry with matching rendered engine, explicit active node id,
frame-tree `layoutEngine`, selected tab, option bucket, and fitted `viewBox`.
The render-path inventory is now branch-scoped instead of pinned to a stale
pre-follow-up commit, and the earlier Phase 4 onboarding / inventory / full
validation evidence remains recorded in this package.

## North star

The user's mental model is a Houdini SOP network:

- one **source** node (the frame YAML) is the single source of truth;
- N **interpreter** nodes each adapt the source into an engine-native form
  (YAML → ELK graph, YAML → Dagre graph, YAML → Mermaid, YAML → v3 grid, …),
  and each holds its **own** parameters and cooked output *inside itself*;
- all interpreters fan into one **switch** node that selects the active branch;
- the switch feeds one **render** node that fits and mounts the stage;
- clicking save/render cooks the selected branch and renders exactly that.

Nodes do not reach into each other's state. Adding interpreter N+1 (up to 50 or
150 engines) is adding a node, never editing a shared render path. This spec
translates that metaphor into a buildable, typed model in
`packages/layout-engine/src/preview-shell/` and retires the fragmented render
paths that currently let engines step on each other.

## Problem

The preview today is the opposite of a clean pull-based graph:

1. **No single render node.** At least four independent paths mutate the stage
   SVG — initial load / save→reload (`app-load.ts`), engine-tab rerender
   (`rerenderPreviewStageHost` in `app-scene-host.ts`), local relayout patch
   (`patchPreviewSvgFromLayout` in `app-frame-svg.ts`), and engine/bridge
   relayout (`app-layout-bridge-runtime.ts`). Canvas fitting
   (`fitPreviewSvgToRenderedContent`) is applied by three of them and skipped by
   the engine-tab path, so the outer canvas padding is path-dependent: switch an
   engine and it is unpadded; change one param and it re-fits to padded bounds
   with the same content. Same diagram state, different canvas.
2. **No single switch node.** Active engine / render intent is committed by
   `commitPreviewRenderIntentToWindow` from 8+ call sites across three files, and
   the renderer reads engine identity from `frameTreeJson.layoutEngine`, which a
   different code path must keep in sync. Two sources that must agree is not a
   switch; it is a race.
3. **Interpreter state is shared, not owned.** Engine option buckets live in
   global model state (`layoutOperatorOverrides`, `__DG_activeLayoutOperatorKey`,
   `meta.elk`/`meta.dagre`), so ELK-family engines share `meta.elk` and stale
   keys can leak across a switch. Spec 069 patched this with filtering, but
   filtering is a band-aid over shared state, not per-node isolation.
4. **State is interaction-dependent.** Save, reload, tab switch, param tweak,
   and container resize can each produce a different outer canvas for the same
   logical diagram, because each is a separate entry point with its own partial
   contract. This is why bugs get "partially fixed" while the visible behavior
   survives.

This structure guarantees the reported class of bug recurs whenever a new render
trigger or engine is added. It does not scale to 50/150 engines.

## Houdini metaphor → repo mapping

| Houdini node | Repo concept today | Gap this spec closes |
|---|---|---|
| Source (file SOP) | `frameTreeJson` / frame YAML | Already a source of truth; formalize as the graph's only root input. |
| Interpreter/adapter | `defineGraphLayoutPreviewEngine`, ELK/Dagre adapters, v3 layout | Give each engine a self-contained **node** owning its params + cooked output; stop sharing `meta.elk`/operator buckets. |
| Node params (local) | `layoutOperatorOverrides`, `__DG_activeLayoutOperatorKey`, `meta.<engine>` | Move param ownership onto the node's typed param container; persist under the node's own namespace only. |
| Switch SOP | `PreviewRenderIntent` + engine tabs + `frameTreeJson.layoutEngine` | Collapse the 8+ commit sites and dual engine source into **one** switch owner. |
| Render/Output SOP | `app-load` fit + `rerenderPreviewStageHost` (no fit) + patch + bridge | Collapse into **one** render node: render → fit → mount → refresh. |
| Cook / dirty propagation | ad-hoc relayout scheduling | A typed dirty/cook model so only the selected branch recooks, deterministically. |

## Definitions

- **Render graph**: a constrained, typed fan-in DAG:
  `source → interpreter[] → switch → render`. Not a general dataflow engine and
  not (in this spec) a visual node editor. Wiring is fixed; only the switch
  selection and per-node params vary.
- **Interpreter node**: a typed unit that maps the source frame tree +
  its own params into a laid-out result for exactly one engine. Owns its param
  container, its capability descriptor, and its cached cooked output.
- **Switch node**: the single authority for which interpreter is active. Owns
  render intent (engine id + page direction) and is the only writer of the
  active-engine signal the render node reads.
- **Render node**: the single authority that turns a cooked interpreter output
  into the mounted, fitted stage SVG. The only code allowed to replace stage
  children.
- **Cook**: producing a node's output from its inputs+params. A node is *dirty*
  when its inputs or params changed since its last cook.
- **State vector** (extends spec 069): now includes the fitted stage viewBox and
  the active interpreter node id, so canvas divergence is a detectable violation.

## Goals

- One typed render node; no other code may mount/replace/fit the stage SVG.
- One typed switch node; no other code may commit active engine / render intent.
- Each interpreter node owns its params and cooked output; no cross-node reads.
- Deterministic cook: identical source + selected node + params ⇒ identical
  mounted stage (fitted viewBox included), independent of interaction history.
- Adding an interpreter node requires no edit to render/switch/editor code.
- Canvas padding is identical across load, save→reload, tab switch, param
  change, and container resize for the same selected node.

## Non-goals

- No visual Houdini-style graph editor canvas in this spec. Tabs (or an
  equivalent selector) remain the UI. The graph is an internal model. A visual
  editor is an explicit later candidate, not part of closeout.
- No general-purpose dataflow engine (no arbitrary wiring, no user-authored
  merge topologies). The graph shape is fixed fan-in.
- No new engine breadth here. This spec is the substrate; onboarding the next 20
  engines is downstream work that consumes the node contract.
- Does not reopen spec 046 by moving behavior into `scripts/preview/*.js`. All
  node/switch/render code is TypeScript in `packages/layout-engine/src/`.
- Does not redesign per-engine layout fidelity (that is spec 057 and follow-ups).

## Functional Requirements

- **FR-001 (Render node)**: Add one typed render owner in
  `packages/layout-engine/src/preview-shell/` that performs
  `render → fit → mount → refreshScene` as an atomic, idempotent operation. All
  stage mounts (load, reload, tab switch, local relayout, engine relayout,
  container resize) route through it. `rerenderPreviewStageHost` and the load
  path both delegate to it; no caller mounts a stage SVG without fitting.
- **FR-002 (Single fit)**: Exactly one fit implementation with a deterministic,
  origin-stable padding rule. Eliminate the `0 0 w h`-reset-then-fit divergence
  in `patchPreviewSvgFromLayout`. `fit(fit(svg)) === fit(svg)`.
- **FR-003 (Switch node)**: Add one typed switch owner that is the sole writer of
  active engine id + page direction (render intent). Replace the 8+
  `commitPreviewRenderIntentToWindow` call sites with calls into this owner. The
  render node reads engine identity only from the switch, and `frameTreeJson`
  engine is committed by the switch, not by separate paths.
- **FR-004 (Interpreter node state isolation)**: Each engine's params live in a
  typed per-node container keyed by node id. No node reads another node's
  params. Switching nodes cannot carry a foreign param into the active layout
  request without going through that node's own container.
- **FR-005 (Per-node persistence)**: Save writes each interpreter node's params
  under its own namespace only (`meta.<engineFamily>` / node-scoped keys), and
  reload rehydrates each node's container from its own namespace. Unsupported
  foreign keys are rejected at the node boundary, not globally filtered later.
- **FR-006 (Deterministic cook)**: A typed dirty/cook model recooks only the
  selected branch. Save/render cooks the selected node then renders it. The same
  (source, selected node, params) yields a byte-identical mounted stage viewBox
  regardless of prior interactions.
- **FR-007 (State vector extension)**: Extend spec 069's
  `EditorMutationStateVector` with fitted stage viewBox and active interpreter
  node id. Two paths disagreeing on canvas is a recorded violation.
- **FR-008 (Registration-only onboarding)**: Adding interpreter node N+1 is a
  registration against the node contract with its own param schema/capabilities;
  it must require zero edits to render node, switch node, `editor.js`, or
  `layout-bridge.js`. Enforced by a no-central-branching test.
- **FR-009 (Equivalent-geometry classification)**: When a switch produces
  content-equivalent geometry, the render node still yields the deterministic
  fitted canvas and the result is recorded as verified-equivalent, not confused
  with a stale/failed refresh. This closes the spec 060 follow-up.
- **FR-010 (Migration inventory)**: Produce an inventory of every current stage
  mount, fit call, and render-intent commit site. Each must be migrated to the
  node owners, proven read-only, or deferred to a named follow-up before
  closeout. No orphaned second path may remain.

## Success Criteria

- **SC-001**: A repo-owned test proves load, save→reload, engine-tab switch, ELK
  param edit, and container resize on the same fixture and selected engine
  produce the **same fitted viewBox** (byte-identical), across at least
  `example-deployment-pipeline`, `mongo-octavia-ha`, and
  `support-engineering-flow`.
- **SC-002**: A real-gesture browser probe shows switching engine tabs is never a
  silent no-op: either bounds change or the evidence records verified-equivalent
  geometry with matching `data-layout-engine`, active node id, and fitted canvas.
- **SC-003**: ELK layered → radial → layered and layered → dagre → layered prove
  no param bucket leaks: each engine layout request contains only its own node's
  params; foreign keys are rejected at the node boundary.
- **SC-004**: `persist → reload` round-trips each interpreter node's params under
  its own namespace; a foreign key in a node's save payload is rejected before
  write.
- **SC-005**: A no-central-branching test proves a newly registered dummy
  interpreter node renders and switches with zero edits to render node, switch
  node, `editor.js`, or `layout-bridge.js`.
- **SC-006**: The migration inventory (FR-010) shows every legacy stage-mount,
  fit, and render-intent-commit site is migrated, proven read-only, or deferred
  with a named spec id — no unclassified second path.
- **SC-007**: Full validation passes:
  `npm --prefix packages/layout-engine run build:browser`,
  `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`,
  `node scripts/check-browser-bundle-fresh.mjs`,
  `node scripts/check-preview-shell-size-budgets.mjs`,
  `node scripts/check_no_new_python.mjs`.

## Phased delivery

Ship value early; do not gate everything on the full graph.

- **Phase 1 — Render node + canvas in state vector** (FR-001, FR-002, FR-007,
  FR-009). Highest leverage; closes the padding path-dependence and the spec 060
  visual-no-op ambiguity. Independently mergeable.
- **Phase 2 — Interpreter node state isolation** (FR-004, FR-005). Stops engines
  stepping on each other; the "50 tabs" safety fix.
- **Phase 3 — Switch node + deterministic cook** (FR-003, FR-006). Collapses the
  render-intent commit sprawl and makes save/render deterministic.
- **Phase 4 — Registration-only onboarding + inventory closeout** (FR-008,
  FR-010). Proves the metaphor scales and removes every orphaned path.

## Closeout Gate

Do not mark Closeout Ready unless all hold:

1. Exactly one render node mounts/fits the stage; no other stage-mount path
   remains (or remaining ones are proven read-only / deferred with a spec id).
2. Exactly one switch node writes render intent; the render node reads engine
   identity from it, not from a second source.
3. Each interpreter node owns its params; SC-003 proves no cross-node leak.
4. SC-001 canvas-parity test passes across the three fixtures and all five
   triggers.
5. SC-005 no-central-branching test passes for a fresh dummy node.
6. Real-gesture browser evidence, not mock-only wiring, proves SC-002.
7. The migration inventory has no unclassified legacy path.
8. Branch is `feat/071-preview-render-node-graph`; work is TypeScript-first with
   no new behavior-heavy `scripts/preview/*.js`.

## Risks

- **Over-scoping into a visual node editor.** Mitigation: Non-goals forbid it;
  tabs stay. The graph is a model.
- **Big-bang rewrite.** Mitigation: phased, each phase independently mergeable;
  legacy paths delegate to the new owners before deletion.
- **Hidden fit callers.** Mitigation: FR-010 inventory + a test that fails if any
  code mounts stage children outside the render node.
- **Per-node persistence churn.** Mitigation: reuse existing `meta.<engine>`
  namespaces; the node model owns read/write but the on-disk shape is unchanged.
- **Determinism vs. engine nondeterminism.** Some engines (force) are not
  deterministic; SC-001 fixtures must use deterministic engines/seeds or assert
  the fitted-canvas invariant given identical layout output, not identical
  physics.
