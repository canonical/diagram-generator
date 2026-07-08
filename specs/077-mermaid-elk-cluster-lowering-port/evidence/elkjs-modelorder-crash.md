# ELK model-order + hierarchy check

Date: 2026-07-08
Branch: `feat/077-mermaid-elk-cluster-lowering-port`

Question: does native `elk.layered.considerModelOrder.strategy = NODES_AND_EDGES`
combined with compound hierarchy (`elk.hierarchyHandling = INCLUDE_CHILDREN`) still
re-trigger the 076 crash at `elkjs@0.10.0`?

Result: no crash reproduced in the repo-owned clustered regression
`packages/graph-layout-elk/tests/elk-clustered-layout.test.ts`.

What was exercised:

- Root graph with `INCLUDE_CHILDREN`
- Directed compound children with `SEPARATE_CHILDREN`
- Typed ordering clusters (`kind: ordering-cluster`) with local `LR` direction
- Cross-cluster edge lowered to the provider LCA
- Native model-order strategy only; no synthetic ordering edges

Observed outcome:

- `layoutLayered()` completed successfully.
- ELK returned routed sections for the cross-cluster edge.
- The route touched the source and target node boundaries.
- The top row stayed above the endpoint row, so the hierarchy + order contract held.

Conclusion: at `elkjs@0.10.0`, the native model-order path is viable for the
clustered lowering exercised here. Keep using the native strategy; do not
reintroduce synthetic ordering edges.
