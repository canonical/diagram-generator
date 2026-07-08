# Adversarial review — spec 077 Phase 3 & 4 (product wiring)

Reviewer: Opus, 2026-07-08, branch `feat/077-mermaid-elk-cluster-lowering-port`.
Reviews the working-tree wiring on top of committed Phase 0/1 (`c5ac327`). Stance:
treat "Phases 3-4 are done" as false until proven.

## Verdict

**Reject "Phases 3-4 complete."** The reusable lowering primitive is good, but the
**product wiring re-implements the exact 076 pathology under new names.** The
cluster-lowered path does not let ELK own geometry: annotation/cert leaves are
still excluded from the ELK graph and hand-placed afterward, container shells are
resized from child bounding boxes, and the "architecture ban test" enforces a
function-rename rather than the invariant. No test renders the actual TLS SVG
(SC-001 unchecked), so there is still zero render proof — and the structure
predicts it will not match the reference. Keep the primitive; redo the wiring.

All unit suites pass (`graph-layout-elk` 64/64, `layout-engine` 998/998), which is
exactly why this needs an adversarial read: green units are hiding a structural
regression, the 076 failure mode.

## What is genuinely good (keep)

- **Primitive-level Phase 2 is solid.** LCA edge attachment + native
  `considerModelOrder`, `ORDERING_EDGE_PREFIX` removed (F3 closed),
  `elk-edge-lca.test.ts` added (F4 closed).
- **Crash evidence is real and useful (F2 closed).**
  `evidence/elkjs-modelorder-crash.md` documents a repo-owned clustered layout that
  runs real ELK with `INCLUDE_CHILDREN` + `considerModelOrder` + ordering clusters
  + a cross-cluster LCA edge and does **not** crash at `elkjs@0.10.0`, with ELK
  returning routed sections. This is the right kind of evidence. Keep it.
- `applyClusterLoweredThinStyles(...)` is correctly thin — paint only (grey fill,
  no stroke). That one is fine.

## Findings (severity-ordered)

**C1 (critical) — annotation/cert leaves are still excluded from the ELK graph and
hand-placed after layout.** `shouldIncludeElkNode(...)` still returns `false` for
`isAnnotationFrame(...)`, so the grey cert leaves never enter the ELK input. They
are reintroduced by `hydrateClusterLoweredShellFrames(...)`, which positions them
from the **semantic snapshot** (`childSemantic.x - frameSemantic.x`) or, for
annotations, **beside a sibling** (`setPlacedGeometry(child, siblingBox.maxX, …)`).
This is verbatim the 076 second-reopen defect ("cert nodes are still not
first-class ELK graph children … reintroduced as post-layout decorations"), which
spec 077 exists to fix. It was renamed, not fixed. Because these leaves are not
ELK-ordered inside their blank-title subgraphs, the reference row/cluster structure
cannot be reproduced generically.

**C2 (critical) — the cluster path owns geometry after ELK (G1 violation).**
`hydrateClusterLoweredShellFrames` → `syncOmittedFrameToChildren()` resizes and
repositions container shells from the bounding box of their children
(`nextX = min(placedX, box.minX - paddingLeft)`, etc.). That is
`wrapStructuralContainers` behaviour under a new name, and it recreates the 076
"compound extents come from two disagreeing layout systems" problem. The failing
test GPT is chasing — *"provider content should stay horizontally centered within
tls_provider"* — is that exact symptom: ELK sized `tls_provider`, then the hydrate
pass re-sized it from children, so it drifts off-center. Chasing that centering by
further post-ELK adjustment is the wrong direction; the shell must come from ELK.

**C3 (high) — the "architecture ban test" is a rigged gate.**
`elk-layout-architecture.test.ts` only string-checks that the old function *names*
(`anchorSemanticDescendants(`, `wrapStructuralContainers(`, …) are absent from the
cluster branch and that `hydrateClusterLoweredShellFrames(` / `applyClusterLoweredThinStyles(`
are present. It **whitelists the new box-mover** and asserts a rename, not the
invariant. It does not check that no node is repositioned after ELK, that arrow
points equal ELK sections, or that annotation leaves are ELK-placed. This is the
same "test encodes the workaround" false-green that archived a broken 076. T053
(SC-004) is correctly still unchecked; this test must not be counted as satisfying
it.

**C4 (high) — no render-level proof (SC-001 / T050 unchecked).** Nothing renders
the actual TLS product SVG and compares to
`images/01-source-mermaid-reference.png`. Given C1/C2, the render almost certainly
does not match. Phases 3-4 cannot be called done without this — it is the entire
reason 077 exists. The remaining "red" GPT reports (`tls-render-regression.test.ts`
centering) is a symptom of C2, not the last mile.

## Recommendation

The lowering primitive is right; the product wiring is wrong in the same way 076
was. Do not patch the centering drift. Instead:

1. **Make the annotation/cert leaves first-class ELK nodes.** Include them in the
   ELK input inside their blank-title ordering compounds (stop returning `false`
   from `shouldIncludeElkNode` for these leaves on the cluster path) so ELK places
   and orders them. This is C1 and it is the crux.
2. **Delete the geometry work in `hydrateClusterLoweredShellFrames`.** After (1),
   ELK places every node and sizes every compound; the cluster path should read
   node rects + ELK `edge.sections` verbatim and do nothing else. Keep
   `applyClusterLoweredThinStyles` (paint only). This removes C2.
3. **Rewrite the architecture test to assert the invariant, not the rename**
   (no node geometry mutated after `elk.layout()`; rendered arrow points equal ELK
   sections; annotation leaves carry ELK-assigned positions). This is C3 / SC-004.
4. **Land SC-001 (T050): render the real TLS SVG and diff against the reference**
   before marking any of Phase 3-5 done. This is C4 / G6.

Until C1–C2 are fixed, Phases 3-4 are a hybrid (new lowering + renamed 076
box-moving) — the worst-case outcome the spec was written to prevent. Keep Phase
0-2 primitive work; redo the product wiring per the above.
