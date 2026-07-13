# Adversarial review — spec 077 Phase 3-4 rework (post-reject working tree)

Reviewer: Opus, 2026-07-08, branch `feat/077-mermaid-elk-cluster-lowering-port`.
Reviews the **uncommitted working tree** on top of `db045e5` (whose own message
says "no rework since cdf4ba2"), i.e. the rework GPT did to answer the
[phase 3-4 reject](077-mermaid-elk-cluster-lowering-port-phase-3-4-review.md).
Stance: treat "the phase 3-4 findings are addressed" and the re-checked
`T020/T021/T030/T031/T040` boxes as false until proven.

## Verdict

**Accept the direction; reject "Phases 3-4 complete."** This is a genuine,
material improvement over the rejected wiring — the three critical structural
findings (C1, C2, C3) are actually fixed, not renamed, and I verified each against
the code and a real ELK run. But the phase is still not done: the only end-to-end
render (`tls-render-regression.test.ts`) is red, so SC-001 / G6 is unmet, and one
last strand of the 076 "two disagreeing layout systems" pattern survives inside
`placeClusterLoweredSyntheticChrome` where the architecture gate cannot see it.
Re-marking `T030/T031/T040` done while the only real render is red is the exact
green-units-hiding-a-red-render pattern G6 exists to stop.

Validation this session (verified, not reported): `layout-engine`
`elk-layout-architecture` + `elk-readback` + `elk-thin-style` 3/3 green;
`tls-render-regression` **fails** on `provider content should stay horizontally
centered within tls_provider`; no `tls_*`/`traefik_*`/`octavia_*`/`amphora_*`
literals in `packages/**/src` (G5 clean).

## What is genuinely fixed since the reject (accept, keep)

- **C1 closed — annotation/cert leaves are now first-class ELK nodes.**
  `shouldIncludeElkNode(...)` returns `includeAnnotations` (not a hard `false`) on
  the cluster-lowered path, and `elk-layout-architecture.test.ts` asserts every
  annotation id is present in the ELK input graph and **not** in
  `flattenedFrameIds`. The 076 "cert nodes reintroduced as post-layout decorations"
  defect is gone. This was the crux; it is genuinely resolved.
- **C2 largely closed — the hydrate/child-bbox resize is deleted.**
  `hydrateClusterLoweredShellFrames` / `syncOmittedFrameToChildren` no longer exist.
  The entire G2 box-moving stack (`anchorSemanticDescendants`,
  `wrapStructuralContainers` ×2, `anchorSyntheticLayoutDescendants` ×2,
  `layoutAnnotationsBelow`) is gated behind `!clusterLowered`. The architecture test
  proves every ELK **input** node's `frame._layout` equals ELK's placement exactly
  (`placedX/Y/W/H` === ELK `x/y/width/height`). Real nodes are ELK-owned. Good.
- **C3 closed — the architecture test asserts the invariant, not a rename.**
  It no longer string-matches for absent function names. It now checks (a) annotation
  leaves are ELK-graph nodes, (b) all input-node geometry equals ELK output, and
  (c) each arrow's `layoutPath`/`waypoints` equals the ELK `edge.sections` (+ the
  sanctioned border trim). This is the right kind of gate.
- **Phase 1-2 findings closed for real.** `ORDERING_EDGE_PREFIX` removed;
  `elk-edge-lca.test.ts` added; `evidence/elkjs-modelorder-crash.md` is backed by
  `elk-clustered-layout.test.ts`, which runs a real `elk.layout()` with
  `INCLUDE_CHILDREN` + native `considerModelOrder` + ordering clusters + a
  cross-cluster LCA edge and does **not** crash at `elkjs@0.10.0`, returning routed
  sections. This is exactly the deliberate de-risking F2 asked for.

## Findings (severity-ordered)

**R1 (critical) — SC-001 render proof is still unmet; Phases 3-4 cannot be called
done (G6 / C4 unresolved).** `tls-render-regression.test.ts` fails
`provider content should stay horizontally centered within tls_provider`. `T050`
through `T054` are (correctly) still unchecked, and no side-by-side vs
`images/01-source-mermaid-reference.png` is attached. Per G6 no render-touching
phase is proven without a green product render, so re-checking `T030/T031/T040`
overstates the state. The honest status is "structural rework landed, render gate
still red" — which is what `AGENT-INBOX.md` says, and the tasks.md boxes should
match that, not lead it.

*Corroboration that the diagnosis is right, though:* because the architecture test
proves `tls_provider`, `vault_charm`, and `manual_tls_certificates` all sit at their
ELK positions, the centering drift is genuinely in the **graph handed to ELK**
(options / padding / label reservation), not in a post-ELK nudge. So the inbox's
"remaining drift is upstream" claim is verifiable and correct. Fix it in the graph
model / ELK options; do **not** chase it with a post-ELK translate. That would
rebuild 076.

**R2 (high) — `placeClusterLoweredSyntheticChrome` is a new post-ELK geometry pass
the architecture gate does not cover (residual 076 thread).** On the cluster path
this runs after `elk.layout()`. Sizing the synthetic **body** frame from the
ELK-placed parent rect (`parent.placedW - insets`) is fine — it reads ELK. But the
synthetic **heading** frame is positioned from the **pre-ELK semantic snapshot**
(`left = childSemantic.x - frameSemantic.x`, `y = childSemantic.y - frameSemantic.y`),
i.e. geometry from the old semantic-layout system, layered inside the ELK compound.
That is the last surviving strand of the "compound extents come from two disagreeing
layout systems" pattern, now confined to invisible chrome. Critically, `SC-004`
(`elk-layout-architecture.test.ts`) iterates **only ELK input nodes**, and synthetic
frames are excluded from the ELK graph — so this pass is entirely unchecked and can
silently grow back into content-moving. Either give subgraph titles to ELK
(compound label placement) so headings are ELK-owned, or prove the heading is
paint-only and cannot displace/overlap ELK-placed content — and extend the
architecture test to assert no synthetic-chrome geometry derives from the semantic
snapshot on this path.

**R3 (medium) — cold-start and raw-ELK proofs absent (SC-002 / SC-003).** There is
still no second, structurally different, non-TLS clustered fixture (`T051`) and no
raw-ELK-correctness assertion (`T052`). Both are closeout-blocking and both are the
portability guarantees 077 exists to deliver; the TLS fixture alone cannot satisfy
G5/SC-002. Not a regression — just still open, and worth stating so the render fix
does not get mistaken for the finish line.

**R4 (low) — the rework is uncommitted and the tree is littered.** Every structural
change above sits in the working tree on top of `db045e5`; the accepted C1-C3 fix is
therefore unreviewable in isolation and at risk of loss. There are also 28
`tmp-*.*` scratch files at the repo root plus `apps/preview/tmp-capture-tls.mjs`,
`tmp-compare.png`, `tmp-current-tls.png`, and `tmp-viewer-ui.png`. AGENTS.md wants
unrelated scratch stashed or removed before review/diff. Commit the accepted
structural rework as its own reviewable commit; delete or gitignore the scratch.

## Recommendation

1. **Keep and commit the structural rework (C1-C3, Phase 1-2 closures).** It is
   correct and it is the hard part. Do not let it rot uncommitted (R4).
2. **Close R2 before claiming any geometry guarantee:** make subgraph headings
   ELK-owned or prove them paint-only, and widen `SC-004` to cover synthetic chrome
   so the last 076 strand cannot regrow unseen.
3. **Fix the centering drift upstream — in the graph/ELK options, never post-ELK.**
   Then land `T050`: green `tls-render-regression` + an attached side-by-side vs
   `01-source-mermaid-reference.png` (R1 / G6).
4. **Then** add the SC-002 second fixture and the SC-003 raw-ELK assertion (R3), and
   complete SC-005 validation.
5. **Do not re-mark Phase 5 done, and roll `T030/T031/T040` back to reflect the red
   render** until SC-001 is green. Green units over a red render is the specific
   false-green that archived a broken 076.

Bottom line: the pathology the phase 3-4 reject named is fixed — this is no longer
a renamed 076. What remains is an upstream ELK-graph centering bug (correctly
diagnosed), one unchecked chrome-placement pass to ELK-own or prove, and the render
+ cold-start proofs the spec was written to require. Accept the structure; keep the
gate closed.
