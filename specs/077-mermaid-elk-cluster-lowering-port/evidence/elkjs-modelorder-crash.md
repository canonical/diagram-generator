# ELK model-order + hierarchy check

Date: 2026-07-08
Branch: `feat/077-mermaid-elk-cluster-lowering-port`

> **⚠️ 2026-07-09 correction — this note gives false confidence. Read
> [`elkjs-sibling-compound-port-crash.md`](./elkjs-sibling-compound-port-crash.md)
> first.** The fixture below keeps both endpoints of the cross edge inside **one**
> `provider` compound (LCA = a compound), which is **not** the reference topology.
> The reference has endpoints in **sibling** compounds (LCA = root), and that case
> *does* crash — not because of model order, but because the builder emits
> `FIXED_POS` implicit ports. Port-free routing of the exact reference topology
> works. Do not cite this note as evidence that the reference model is unviable.
>
> **2026-07-10 correction to the correction:** after the port-free routing fix,
> full-suite coverage found a separate root-LCA crash when endpoint ancestor
> compounds promoted to `INCLUDE_CHILDREN` keep local
> `elk.layered.considerModelOrder.strategy`. Root/LCA model order remains viable;
> non-LCA promoted endpoint compounds must suppress that local strategy. See the
> addendum in `elkjs-sibling-compound-port-crash.md`.

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
