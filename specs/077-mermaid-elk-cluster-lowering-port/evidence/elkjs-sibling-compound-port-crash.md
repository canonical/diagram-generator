# Root cause: the "reference model crashes ELK" claim — it's a builder bug, not an ELK wall

Date: 2026-07-09
Branch: `feat/077-mermaid-elk-cluster-lowering-port`
Investigator: Opus (adversarial review follow-up)

## TL;DR

The true reference model — **three sibling compounds** (provider on top,
OpenStack Services + Load Balancers below) with **leaf → leaf edge-labelled
edges** (`manual → octavia_k8s` ×3, `manual → traefik_*` ×3) — is fully
layout-able by `elkjs@0.10.0`. It does **not** require abandoning the reference,
and it is **not** a "descendant-target" or model-order limitation.

The crash GPT hit is caused by **our builder emitting `FIXED_POS` implicit ports**
on leaf nodes. When a cross-hierarchy edge (LCA = root) is routed through those
fixed ports across `INCLUDE_CHILDREN` compounds, elkjs throws
`Cannot read properties of undefined (reading 'a')`. Remove the fixed ports on the
cluster-lowered path (route to node borders, as Mermaid does) and the exact
reference topology lays out cleanly.

## Why the earlier "no crash" evidence was misleading

`elkjs-modelorder-crash.md` concluded "no crash" — but its fixture
(`elk-clustered-layout.test.ts` `clusteredInput`) keeps **both** endpoints of the
cross edge inside **one** `provider` compound, so the edge's LCA is a *compound*,
not the root. That topology is not the reference. The reference has the endpoints
in **sibling** compounds (LCA = root), which is the case that crashes. The evidence
gave false confidence.

## Reproduction (all run this session, then cleaned up)

1. **Product path, reference-model YAML** (3 sibling compounds, leaf→leaf edges):
   the current product **re-targets** every cross-compound edge to the compound
   boundary via `promoteCrossHierarchyTargets` — raw ELK edges came back as
   `manual → openstack_services` / `manual → load_balancers`, not `→ octavia_k8s` /
   `→ traefik_*`. Because `applyElkEdgeRoutes` matches on the original leaf
   endpoints, the arrows got `pts=0` (no geometry), and the provider compound
   stretched pathologically (h≈1536). This re-targeting is the workaround that
   forced the cert-node / lane scaffolding.

2. **Disable re-targeting (`DG_NO_RETARGET`), keep edges leaf→leaf:** elkjs crashes
   `reading 'a'`. So the workaround exists *specifically* to dodge this crash.

3. **Primitive `layoutLayered`, minimal two sibling compounds + one cross edge:**
   crashes `reading 'a'`. So it is not fixture- or scale-specific.

4. **Raw elkjs, hand-built graph, same topology, NO ports:** OK — edge routed
   (`sections=1`), with `considerModelOrder` + `INCLUDE_CHILDREN` at the root.
   So neither model-order nor hierarchy is the trigger.

5. **Raw elkjs, the builder's actual graph (`buildElkGraphFromInput`):** crashes
   `reading 'a'`. The builder graph differs from (4) only by the `FIXED_POS`
   implicit ports it stamps on every leaf (`a1__top/right/bottom/left`,
   `elk.portConstraints: FIXED_POS`).

6. **Raw elkjs, full reference topology (provider + services + 3-endpoint lbs,
   7 edges incl. 3 parallel `manual→octavia`), port-free:** OK — all 7 edges
   routed, provider on top, two compounds side by side below. This is the reference
   layout.

Conclusion: `FIXED_POS` implicit ports + cross-sibling (`LCA = root`) edges +
`INCLUDE_CHILDREN` = the crash. Port-free routing is the Mermaid behaviour and it
works.

## 2026-07-10 addendum — separate promoted-compound model-order crash

After the port-free fix, the full `packages/graph-layout-elk` suite exposed a
second, narrower `elkjs@0.10.0` crash: root-LCA cross-hierarchy graphs crash when
endpoint ancestor compounds are promoted to `elk.hierarchyHandling:
INCLUDE_CHILDREN` **and** those promoted non-LCA compounds keep a local
`elk.layered.considerModelOrder.strategy`. Root-level model order remains viable,
and model order on a compound that is itself the edge LCA remains viable.

The implemented fix is to suppress `elk.layered.considerModelOrder.strategy` only
on promoted endpoint ancestor compounds where `node.id !== ancestorId`. This keeps
native root/LCA ordering where it is safe and avoids the crash without synthetic
ordering edges. Regression coverage: `packages/graph-layout-elk test` now passes,
including `elk-layered.test.ts` compound/root-LCA cases and
`elk-layout-options.test.ts` assertions that promoted endpoint compounds do not
carry the local model-order strategy.

## The fix (scoped, not an engine rewrite)

On the cluster-lowered path:

1. **Do not emit `FIXED_POS` implicit ports** for nodes that are endpoints of
   cross-hierarchy edges (or disable implicit ports on this path entirely; let ELK
   route to borders). This removes the crash.
2. **Keep edges leaf → leaf**; drop `promoteCrossHierarchyTargets` for this path
   and use the builder's existing LCA attachment (`findCommonAncestor` +
   `assignEdgeToAncestor` + `setIncludeChildrenPolicy`), which already routes the
   `clusteredInput` case.
3. **Consume `edge.sections` verbatim** (read-back already exists); fix
   `applyElkEdgeRoutes`/`applyElkEdgeLabels` endpoint matching so **parallel** edges
   (3× `manual→octavia`) are matched by edge id, not by `source->target` key.
4. Then the YAML can be reauthored to the reference: three sibling compounds,
   interface text as **edge labels** (two-line), no cert nodes / lanes /
   relation-rows / `services_row`.

Follow-on polish (not blockers): two-line edge-label rendering; provider full-width
band (or accept centered-not-full-width); rewrite the overfit tests to reference
properties.
