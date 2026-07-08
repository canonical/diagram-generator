# Adversarial review — spec 077 Phase 1 & 2

Reviewer: Opus, 2026-07-08, branch `feat/077-mermaid-elk-cluster-lowering-port`.
Stance: treat "Phase 1 and 2 are complete" as false until proven. Work reviewed is
**uncommitted in the working tree** (Phase 0/1/2 files).

## Verdict

- **Phase 1: complete and clean.** Accept.
- **Phase 2: overstated.** The LCA lowering and native model order exist only as a
  `graph-layout-elk` primitive; they are **not wired into the product path**, have
  **no real-ELK/LCA test**, still carry the synthetic-ordering-edge machinery, and
  the tasks.md T020/T021 boxes are (correctly) still unchecked. Do **not** mark
  Phase 2 done yet. It is fine to proceed into Phase 3, where the wiring + proof
  naturally land — but close F1–F4 as part of it.

Validation this session: `graph-layout-elk` 60/60 green, `graph-layout-core` 4/4
green. No `tls_*`/`traefik_*`/`octavia_*` literals in the new code (G5 clean).

## What is genuinely done (accept)

- **Phase 0** — `find-common-ancestor.ts` and `edge-endpoint-trim.ts` ported as
  pure MIT utilities with focused unit tests. Correct.
- **T010** — `buildElkGraph`/`mapNode` emit a compound ELK graph with `children`,
  a parent map (`buildInputTreeData`), and leaf sizes; structure-driven.
- **T011** — typed `GraphNodeKind = 'node' | 'compound' | 'ordering-cluster'` +
  `resolveGraphNodeKind`/`isGraphCompoundNode` in `graph-ir.ts`. Reasonable model.
- **T012** — `buildSubgraphLayoutOptions` sets per-compound `elk.direction` +
  `SEPARATE_CHILDREN` + spacing/label placement; root gets `INCLUDE_CHILDREN` +
  `considerModelOrder`. Matches the ported contract.
- **T020 mechanics** — `findCommonAncestor` + `setIncludeChildrenPolicy` promote the
  LCA compound of a cross-cluster edge to `INCLUDE_CHILDREN`. The logic looks
  correct.

## Findings (severity-ordered)

**F1 (high) — Phase 2 is not wired into the product path.**
`packages/layout-engine/src/elk-layout.ts` is **untouched vs `main`** (empty diff).
The product still builds the flat graph via `buildGraphEdges(...)` and still runs
the entire post-ELK box-moving stack. The new LCA lowering lives only inside the
`graph-layout-elk` builder, which the product does not yet feed a compound graph.
So Phase 2 has **zero effect on any rendered diagram** today. T020's own wording is
"replace the flat `buildGraphEdges(...)`" — that replacement has not happened in the
product; a parallel primitive was added instead. Until the layout-engine emits a
compound `GraphLayoutInput` and consumes ELK's output (Phase 3), Phase 2 is
unproven end-to-end. This is why "Phase 2 complete" contradicts the still-unchecked
T020/T021 in `tasks.md`.

**F2 (high) — no real-ELK test of the new lowering; the 076 crash is only
incidentally de-risked.**
The new Phase-1/2 tests (`elk-compound-build`, `elk-layout-options`) assert graph
shape and option maps only — they never call `elk.layout()`. The pre-existing
`elk-layered.test.ts` *does* run real ELK on a nested compound and passes with the
new auto-applied `considerModelOrder = NODES_AND_EDGES` + `INCLUDE_CHILDREN`, which
is encouraging evidence the 076 crash may not reproduce at `elkjs@0.10.0`. But that
is incidental, not a deliberate regression: there is no test that (a) intentionally
reproduces-or-rules-out the `considerModelOrder + INCLUDE_CHILDREN` crash, or
(b) asserts a cross-cluster edge actually **routes across** the LCA compound in a
real layout. T021's required `evidence/elkjs-modelorder-crash.md` does not exist.
The central risk that killed 076 is not yet closed with intent.

**F3 (medium) — T021 not done: synthetic ordering-edge machinery still present.**
`ORDERING_EDGE_PREFIX = '__dg_order__'` is still exported and handled throughout
`elk-graph-builder.ts` (`collectEndpointNodeIds`, `mapNode`, edge mapping,
`hasOrderingEdges`). The spec requires removing it in favour of native model order.
Both mechanisms now coexist; leaving the synthetic path in is a latent trap — a
future caller can re-introduce the exact 076 workaround. Remove it as T021 states,
or explicitly defer with written rationale.

**F4 (low) — missing the T020 evidence test (`elk-edge-lca.test.ts`).**
The LCA promotion is covered only indirectly. T020 requires a focused test:
cross-cluster edge → correct ancestor promoted to `INCLUDE_CHILDREN`; intra-cluster
edge stays local. Add it.

**F5 (low) — everything is uncommitted.**
All Phase 0/1/2 changes sit in the working tree (untracked + modified). Review and
progress should be against a committed state; commit the accepted Phase 0/1 work so
it is not lost and so the Phase 2 delta is reviewable in isolation.

## What is NOT wrong (pre-empting over-correction)

- Sequencing is right: build the reusable primitive first, wire it in Phase 3.
  Do **not** rush a product wiring that bolts the LCA graph on while the post-ELK
  box-moving stack still runs — that would recreate the 076 hybrid.
- No post-ELK geometry was added; no Mermaid dependency; G5 clean. Good.

## Recommendation

Mark **Phase 1 accepted**. Keep **Phase 2 open**. Fold its closure into Phase 3 so
the LCA lowering is proven where it actually matters:

1. Commit the accepted Phase 0/1 work (F5).
2. Add `elk-edge-lca.test.ts` (F4) and a **real-`elk.layout()`** test that a
   cross-cluster edge routes through the LCA compound and that model-order +
   hierarchy does not crash — with `evidence/elkjs-modelorder-crash.md` recording
   the outcome (F2).
3. Remove `ORDERING_EDGE_PREFIX` (F3).
4. Only then wire the compound graph into `elk-layout.ts` **together with** the
   Phase 3 read-back and the deletion of the post-ELK box-moving passes (F1) — the
   product must not carry both the new lowering and the old box-moving at once.
