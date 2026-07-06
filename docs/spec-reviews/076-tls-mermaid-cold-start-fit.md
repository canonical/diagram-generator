# Adversarial review – Spec 076 TLS Mermaid cold-start fit

Reviewer: Claude Opus 4.8
Date: 2026-07-06
Scope: validate Spec 076's diagnosis and adversarially test the external
"reintroduce Dagre" hypothesis, in light of Spec 074 having just retired Dagre as
an `elk-layered` algorithm-class duplicate.

## TL;DR verdict

- **GPT's "bring Dagre back" hypothesis: reject.** It is mechanistically unsound.
  The clean clustered look in the Mermaid reference is produced by Mermaid's
  *subgraph/cluster layer* (its `dagre-wrapper`), not by the Dagre algorithm
  itself. Restoring Dagre would re-add the exact layered/Sugiyama duplicate that
  Spec 074 correctly removed, **without** the cluster machinery that creates the
  look. It buys nothing ELK-layered cannot already do.
- **Spec 076's framing (representation / lowering gap, not an engine gap):
  endorse.** It correctly rejects the Dagre shortcut (FR-004), correctly rules out
  deep nesting and non-tree arrows, and correctly names the fill carriers as the
  blockers.
- **One real gap in 076: the winning direction is asserted, not proven.** 076
  never demonstrates that a compound-graph lowering + `elk-layered` actually
  reproduces the reference. The user's own intuition — "none of our current
  algorithms has done clean leaf-in-container clustering" — points at a genuine
  third risk that 076 does not close. Add a de-risking spike before committing to
  "better lowering is the fix." Details below.

## What the Mermaid source actually is

From `references/tls-certificate-provider-topology.mmd`:

- `flowchart TB` with **nested `subgraph` clusters**, several of which have blank
  titles (`services_row`, `openstack_relation_row`, `load_balancer_relation_row`,
  `load_balancer_endpoint_row`).
- **Per-subgraph `direction` overrides** that alternate: provider cluster `TB`,
  `services_row` `LR`, each service `TB`, endpoint/relation rows `LR`.
- A small connected arrow tree fanning out from `manual_tls_certificates`.

The blank-title subgraphs are a Mermaid idiom: **invisible grouping containers
used purely to force ordering and local direction**. The visual quality of the
reference is dominated by three things:

1. clusters rendered as compound boxes with insets,
2. each cluster laid out with its **own** direction,
3. tight, ordered rows of sibling leaves inside a cluster.

## Why the Dagre hypothesis is wrong (mechanism, not vibes)

- Mermaid flowcharts do not hand the whole graph to plain Dagre. They use a
  cluster-aware wrapper that **recursively lays out each subgraph**, treats a
  cluster as a compound node with padding, and stitches inter-cluster edges. The
  nested-cluster behavior and per-subgraph direction live in **that wrapper**, not
  in Dagre's core ranking algorithm.
- Dagre's core is a Sugiyama layered algorithm — the same algorithm *class* as
  `elk.layered`. Spec 074 removed Dagre precisely because, at the algorithm-class
  level, it duplicated `elk-layered` while ELK kept the stronger capability
  surface. That decision holds under this example.
- Therefore "reintroduce Dagre" would restore a layered engine that is (a) a
  duplicate of one we have, and (b) still missing the cluster layer that produces
  the reference. GPT's hypothesis mistakes *Mermaid's rendering* for *Dagre's
  algorithm*. Reject.

## Why ELK is the better-positioned engine here

ELK `layered` already exposes, natively, the capabilities Mermaid's wrapper
implements by hand:

- `elk.hierarchyHandling = INCLUDE_CHILDREN` — cross-hierarchy layered layout over
  compound nodes (real nested clusters).
- per-node `elk.padding` / `elk.spacing.*` — cluster insets.
- per-compound `elk.direction` — the per-subgraph `TB`/`LR` overrides.
- port constraints / ordering — the ordered endpoint rows.

The repo's ELK lowering **already has compound machinery** (`collectNativeCompoundIds`,
`isElkCompound`, `compoundNeedsElkChildLayout` in `packages/layout-engine/src/elk-layout.ts`).
The problem is not that ELK cannot express clusters; it is that this fixture is
lowered as **fill-sized carriers and helper rows** (`provider_stack`,
`services_row`, `load_balancer_endpoint_row`) instead of as **compound nodes with
their own direction**. So `elk-layered` receives a flattened frame, not a cluster
graph, and cannot recover the intent. This is exactly Spec 076's thesis, and it is
correct.

## Where Spec 076 is too optimistic (the adversarial part)

076 is honest that it defers proof to a future regression, but that deferral hides
the real risk the user is sensing:

1. **The compound-lowering fix is unproven on this fixture.** 076 argues "better
   lowering will fix it" but never shows an ELK render from a clean compound graph
   matching the reference. Rejecting Dagre does not, by itself, prove the ELK path
   wins.
2. **Per-subgraph direction may not survive naive compound lowering.** ELK applies
   direction per node, but mixing `TB` parents with `LR` children across many
   levels can produce edge routing and rank spacing that still diverges from
   Mermaid's look. This needs to be observed, not assumed.
3. **Blank-title "ordering group" clusters are a typed-model gap.** Our model has
   headed containers and fill carriers, but not a first-class "invisible ordering
   cluster with a local direction." Faithful lowering likely needs that concept.
   Naming it is a prerequisite, and 076 does not.
4. **Possible third outcome.** It is plausible that neither Dagre nor naive
   ELK-compound lowering matches Mermaid, and that a **dedicated cluster-spacing /
   ordered-row pass** is required. That would still not vindicate Dagre — it would
   be a new typed capability on top of ELK. 076 should keep this outcome on the
   table explicitly.

## Recommended addition to Spec 076

Add one blocking spike **before** any implementation task claims the lowering fix:

- **Spike T0 (evidence, not prose):** hand-author a compound-graph ELK input for
  *this exact fixture* — each Mermaid `subgraph` as an ELK compound node with
  `elk.direction`, `elk.padding`, and `INCLUDE_CHILDREN` — bypassing the frame
  fill-carrier lowering. Render it and compare against
  `images/01-source-mermaid-reference.png`.
  - If it matches: the diagnosis is proven; the real work is a
    cluster-preserving Mermaid→YAML→ELK lowering, and Dagre stays retired.
  - If it does **not** match: document the specific residual (direction mixing,
    ordered rows, cross-cluster routing) and escalate to a dedicated cluster
    capability — still not Dagre.
- Only after T0 should FR-005's "cluster-preserving lowering or typed shim" path be
  committed with the fixture-owned regression 076 already mandates.

This keeps 076's evidence bar honest: it currently asks future work to prove ELK
parity, but the spike is what converts the central hypothesis from assertion to
audited fact.

## Direct answers to 076's "Questions Opus must answer"

1. *Is Dagre the missing solution?* No.
2. *Is the real fix better structured YAML / lowering?* Yes — a compound/cluster
   lowering that emits per-subgraph compound nodes with local direction, not fill
   carriers. Pending the T0 spike to prove it end to end.
3. *What can Dagre do that elk-layered cannot, once the input is corrected?*
   Nothing. Dagre's cluster behavior is Mermaid-wrapper behavior, not Dagre's; the
   algorithm class is the duplicate 074 removed.
4. *Which fixture aspects are the blockers?* Fill-sized structural carriers
   (`provider_stack`, `services_row`, `load_balancer_endpoint_row`), helper rows
   standing in for cluster-local ordering, and loss of subgraph/cluster identity
   including per-subgraph direction and blank-title ordering groups.

## Net

Spec 074's Dagre retirement stands. Spec 076's diagnosis is right and should
proceed, with the added T0 spike so the "better lowering" claim is proven on this
fixture rather than asserted. The genuine open capability — clean leaf-in-container
clustering with per-cluster direction — is an ELK-input/lowering problem plus a
possible new typed cluster pass, not a reason to resurrect Dagre.

---

## T0 evidence review — 2026-07-07 — "GPT claims we need Dagre"

GPT ran the T0 spike (`tmp/elk-cluster-spike.mts`) plus a sibling Mermaid oracle
(`../mermaid-wt-076-tls`) and concluded ELK misorders the lower clusters while
"honest dagre" is the closest source-faithful render, requesting a decision.

**Verdict: the evidence does NOT justify reintroducing Dagre. Do not pivot.**
This is "keep investigating" — one specific, narrow experiment — not a direction
change. Reasons, from the actual artifacts:

1. **The spike never engaged ELK's ordering machinery.** Grep of
   `tmp/elk-cluster-spike.mts` shows **no** `elk.layered.considerModelOrder.*`,
   **no** `crossingMinimization`, **no** `forceNodeModelOrder`, and no ports. By
   default `elk.layered` reorders same-layer nodes to minimize crossings — i.e.
   it is *expected* to permute the endpoint/certificate rows. "ELK misorders the
   rows" is therefore a result of a spike that never turned on the ELK feature
   designed to preserve input order. This is not a demonstrated ELK limitation.

2. **The one time ordering was tried, it hit an uninvestigated crash.** The
   handoff says re-enabling ELK model-order "reopens an internal `elkjs` crash".
   That crash is the real blocker and it is unexamined. You do not retire an
   engine because combining two options (`INCLUDE_CHILDREN` + model-order) threw
   once in a spike; you root-cause it (option-value format, per-node placement,
   or a known elkjs version workaround).

3. **The dagre "match" is doctored, by GPT's own admission.** The near-exact
   dagre render requires a **fabricated** `octavia_k8s --- traefik_public` edge
   that is not in the source (the example README excludes it as violating the
   no-guess bar). Honest dagre only "preserves ordering more faithfully" — it is
   **not** an exact match either. Comparing *doctored dagre* to *honest, ordering-
   off ELK* is not a valid basis for "we need dagre." If synthetic layout hints
   are on the table, the fair ELK equivalent is a model-order constraint or an
   invisible alignment edge — not an engine swap.

4. **The real ELK subtlety (and it is fixable, not a dagre argument).** The spike
   applies `INCLUDE_CHILDREN` along cross-cluster edge paths (needed so
   `manual_tls_certificates` can fan out into the lower clusters). But
   `INCLUDE_CHILDREN` flattens hierarchy, which can override the per-cluster
   `direction: RIGHT` and model order of the very rows
   (`openstack_relation_row`, endpoint row) that must stay horizontal/ordered —
   exactly the reported "cert row collapses to a vertical stack" symptom. This is
   a known ELK hierarchy/direction tension with concrete resolutions inside ELK:
   keep the ordering rows `SEPARATE_CHILDREN`, route cross-cluster edges via ports
   or hierarchical edges instead of flattening those rows, and set
   `considerModelOrder` on the rows. None of these have been tried.

5. **"Mermaid's ELK adapter misorders" proves nothing new.** Mermaid's mature,
   default, tuned path is dagre; its ELK adapter is newer and (per the example
   README) also does not set the ordering options. This is fully consistent with
   this review's original finding: the clean look is Mermaid's *dagre wrapper
   tuning*, not the dagre *algorithm* — and spec 074 established dagre ≈
   `elk.layered` at the algorithm-class level. Re-adding dagre to
   `diagram-generator` re-adds the retired duplicate and still would not, by
   itself, reproduce the reference.

### Requested verdict (choose one) → answer

- ❌ Continue 076 with a full ELK cluster port *now* — premature; T0 not yet proven.
- ❌ Pause 076 and rewrite scope around "Mermaid parity limits" / reintroduce
  Dagre — **rejected**; the evidence is not source-faithful and ELK's ordering
  was never tested.
- ✅ **Keep investigating — run the one bounded ELK-ordering experiment below
  before any direction change.**

### Precise next step for GPT (bounded; still spike-only, no product code)

1. Root-cause the `elkjs` crash: reproduce it, capture the exact error and the
   option combination that triggers it. Report it; do not silently disable.
2. On the ordering rows only (`openstack_relation_row`,
   `load_balancer_relation_row`, `load_balancer_endpoint_row`), keep
   `SEPARATE_CHILDREN` and add
   `elk.layered.considerModelOrder.strategy = NODES_AND_EDGES`
   (+ try `elk.layered.crossingMinimization.forceNodeModelOrder = true`).
3. Route the cross-cluster fan-out edges (`manual_* -> octavia_k8s / traefik_*`)
   without flattening those ordering rows — via the parent compounds / ports —
   so `INCLUDE_CHILDREN` is applied to *container* levels, not to the horizontal
   rows.
4. Re-render and re-check the existing `record(...)` expectations (endpoint row
   L→R, cert row above `octavia_k8s`, per-cluster direction preserved).
5. Report PASS/FAIL with the working option set. **Only** if this genuinely
   cannot order the rows without crashing — with the crash root-caused as a real
   elkjs limitation, not a spike bug — does the Dagre question reopen, and even
   then via a new spec, not a silent pivot.

**Guardrail unchanged:** no Dagre reintroduction in `diagram-generator` on this
evidence. Spec 074 stands.

## T0 result update (2026-07-06)

The blocking spike is now executed, and the evidence does not clear the port gate.

- Hand-authored spike: `tmp/elk-cluster-spike.mts`
- Stable seed that runs without crashing:
  - root `elk.algorithm=layered`
  - root `elk.direction=DOWN`
  - root `elk.hierarchyHandling=INCLUDE_CHILDREN`
  - root `elk.spacing.nodeNode=24`
  - root `elk.layered.spacing.nodeNodeBetweenLayers=40`
  - subgraphs default to `SEPARATE_CHILDREN`, then ancestor promotion mirrors
    Mermaid's `setIncludeChildrenPolicy(...)` for cross-cluster edges
- Result: FAIL
  - preserved: top provider cluster, top-down provider stack, left-to-right
    services lane, and top-down fanout into the lower compounds
  - failed: `openstack_relation_row` lands below `octavia_k8s`, and the endpoint
    row reorders to `traefik-rgw`, `traefik-public`, `traefik`
  - attempting to restore ELK model-order knobs on this graph reopens an
    internal `elkjs` crash (`FEc ... Cannot read properties of undefined`)
- Mermaid oracle also fails after the ELK path is corrected:
  - discard the first raw `render.mjs` pass; without managed frontmatter it was
    not a valid ELK oracle
  - corrected path:
    `node ../mermaid/restyle.mjs ... --export-only --font-mode=none`
  - review assets:
    `tmp/mermaid-tls-elk-restyled.svg` / `tmp/mermaid-tls-elk-restyled.png`
  - result: endpoint order is preserved, but the OpenStack certificate relation
    row still collapses into a left-side vertical stack instead of a horizontal
    row above `octavia_k8s`

Adversarial conclusion after the spike:

- The anti-Dagre verdict still holds.
- The plain "port Mermaid's cluster->ELK lowering and stop" claim no longer has
  enough evidence for this fixture.
- The correct next move is **not** to continue Phase 2 blindly. Stop here and
  decide whether the follow-up is:
  - a dedicated typed cluster / ordering pass on top of the lowering, or
  - a stronger source / reconstruction correction if the `.mmd` is still not
    faithful enough to the original image.
