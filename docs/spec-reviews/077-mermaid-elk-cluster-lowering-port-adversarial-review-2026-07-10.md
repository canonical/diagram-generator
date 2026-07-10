# Adversarial review — spec 077 (Mermaid ELK cluster lowering port)

- Reviewer: Cline (adversarial pass)
- Date: 2026-07-10
- Branch: `feat/077-mermaid-elk-cluster-lowering-port`
- Request: `specs/077-mermaid-elk-cluster-lowering-port/evidence/opus-adversarial-review-request-2026-07-10.md`
- Oracle consulted: `H:\WSL_dev_projects\mermaid-js-monorepo\packages\mermaid-layout-elk\src\render.ts` (MIT, `@mermaid-js/layout-elk@0.2.1`)

## Verdict

**Not clean-to-merge as-is — one blocking finding.** The architecture is sound and
the previously-reported problems (post-ELK box moving, flat edge lowering, synthetic
ordering edges, fixture-keyed styling) are genuinely fixed. But the port **inverts the
Mermaid oracle's edge-label placement contract**, which is the direct cause of the
reported "arrow labels distort the arrows instead of attaching to the shortest path"
symptom. This is a visible SC-001 parity gap, not cosmetic, and it is a one-line-class
fix with a definite ELK setting behind it. Fix it (or consciously accept it and
regenerate parity evidence) before merge.

---

## BLOCKING

### B1 — Edge labels use `edgeLabels.inline=false`, the opposite of the Mermaid oracle; this distorts arrow routing

**This is the answer to the "is there an ELK setting for that?" question: yes.**

Mermaid's `render.ts` attaches per-edge-label layout options when it builds the ELK
graph (`addEdges`, lines 501–512):

```js
labels: [
  {
    width: edgeData.width,
    height: edgeData.height,
    orgWidth: edgeData.width,
    orgHeight: edgeData.height,
    text: edgeData.label,
    layoutOptions: {
      'edgeLabels.inline': 'true',
      'edgeLabels.placement': 'CENTER',
    },
  },
],
```

`edgeLabels.inline=true` + `edgeLabels.placement=CENTER` tells ELK layered to place the
label **centered directly on the routed edge**, without allocating a separate
label-dummy node in the layer graph. The edge keeps its shortest/straight route and the
label rides on it.

This port does the **opposite**, in two places:

1. `packages/graph-layout-elk/src/layered-options.ts:110`
   ```ts
   base['elk.edgeLabels.inline'] = 'false';
   ```
   Set graph-wide, inherited by every compound (`buildElkGraph` copies `rootOptions`
   into `inheritedCompoundLayoutOptions`).

2. Edge labels are emitted **without** per-label `layoutOptions`:
   - `packages/layout-engine/src/elk-layout.ts` builds
     `edge.labels = [{ text, width, height }]` only.
   - `packages/graph-layout-elk/src/elk-graph-builder.ts` `mapElkEdge` (lines 475–483)
     maps labels to `{ text, width, height }` only.

With `edgeLabels.inline=false`, ELK layered inserts a **label dummy node** for each
labeled edge. That dummy reserves a slot/space in its layer, which pushes nodes apart
and forces the edge to detour around/through the reserved label box. That reserved-box
routing *is* the "distortion." The label position itself is still ELK-owned (the
read-back in `applyElkEdgeLabels` is correct), so this is not a styling bug — it is a
layout-option regression against the oracle.

This is squarely inside SC-001's contract: "two-line annotation-class **arrow labels**
… with ELK-backed routing/label geometry" and a documented side-by-side vs the Mermaid
reference. Reproducing Mermaid's look requires reproducing Mermaid's label option.

**Recommended fix (faithful to the oracle):**
- Attach per-label `layoutOptions: { 'edgeLabels.inline': 'true', 'edgeLabels.placement': 'CENTER' }`
  in `mapElkEdge` (and in the `elk-layout.ts` label builder), exactly as Mermaid does.
- At minimum, stop forcing the graph-level `elk.edgeLabels.inline='false'` on the
  cluster-lowered path (or flip it to `true` there). Per-label options should win over
  the inherited default, but leaving a contradictory global default is a trap.
- Expect ELK label x/y/w/h to change; the raw-ELK and product parity artifacts under
  `evidence/render/*` and the assertions in `tls-render-regression.test.ts` /
  `tls-browser-parity-regression.test.ts` will need to be regenerated. That regen is
  part of the fix, not separate scope.

**Caveats to verify after flipping:**
- Inline labels can overlap the edge line or nearby nodes when spacing is tight; ELK
  `org.eclipse.elk.spacing.edgeLabel` controls the label↔edge gap. Tune if labels sit
  on top of the stroke.
- The TLS fan-out stem (six `manual_tls_certificates` consumer arrows) currently shares
  one ELK stem with `mergeEdges=true`. Re-confirm the shared stem survives inline labels
  in both raw ELK and product SVG after the change.

### B1a — `elk.edgeLabels.inline` is not authorable, so the fixture cannot opt in via YAML

`elk.edgeLabels.inline` is **absent** from `ELK_LAYERED_PARAM_SPECS`
(`elk-param-registry.ts`), and `resolveElkLayoutOptions` throws on any unknown key. So
even though the TLS fixture pins a full `meta.elk` block, it **cannot** set
`elk.edgeLabels.inline`/`edgeLabels.placement` today. This means B1 cannot be resolved
in YAML — it must be a code change. It is also a gap against FR-011's intent to expose
the native ELK edge controls that explain the layout. If inline-label placement is meant
to be tunable per diagram, add it to the layered registry; otherwise hardwire the
oracle's inline behavior on the cluster-lowered path and document that it is
implementation-owned.

---

## NON-BLOCKING

### N1 — Contradictory hardcoded `edgeLabels.inline='false'` should not remain even after B1

Once per-label options are set, the global `false` in `layered-options.ts` becomes dead
and misleading for future readers (it reads like an intentional "labels reserve space"
policy). Remove it or replace with the oracle-matching `true`, with a comment pointing at
`render.ts`.

### N2 — Review claims trusted from evidence, not fully line-verified

I confirmed by code read: G1–G4 architecture (ELK-owned geometry, no G2/G3 passes on the
cluster path), the LCA edge attachment + `INCLUDE_CHILDREN` promotion
(`elk-graph-builder.ts`), native model-order (no `ORDERING_EDGE_PREFIX` survivors), and
that edge-label geometry is read back from ELK verbatim. I did **not** independently
re-run the full suite or pixel-diff the SVGs; I trust the evidence transcript in
`evidence/tls-raw-styled-parity.md` for the green runs and the frame/label
zero-delta parity claim. Residual risk: the parity artifacts predate any B1 fix and will
be stale once labels go inline.

### N3 — Role/section styling and preview-variant authority not exhaustively traced

`meta.frame_roles.strategy: root-edge-source-section-target-parent` and the
`same_layer_compound_heights` profile are generic and structure-driven per the fixture
YAML and tasks T041/T042. I did not line-trace `resolve-styles.ts` or the inspector
variant dropdown to confirm `level` is the sole role authority in every branch; the spec
flags this as a known trap (raw `fill`/`border` leaking Annotation into the dropdown).
Recommend Opus/the human spot-check the inspector dropdown on the synthesized
section/parent compounds before closeout.

---

## Guardrail checks performed

- **G5 (no fixture-keyed code):** searched `packages/**/*.ts` for `tls_provider`,
  `traefik`, `octavia`, `manual_tls`, `load_balancer`, `openstack_services`. All 32 hits
  are in `packages/**/tests/**` (assertions/fixtures). **Zero** in `packages/**/src/**`.
  G5 holds in product code.
- **G2/G3 (no post-ELK box moving / bespoke routing):** `elk-layout.ts` reads
  `edge.sections` and ELK label x/y verbatim; architecture test `elk-layout-architecture.test.ts`
  is cited as the ban test (T053). Not re-executed here.
- **Edge LCA lowering / INCLUDE_CHILDREN promotion:** present and generic in
  `elk-graph-builder.ts` (`edgeLayoutAncestorId`, `setIncludeChildrenPolicy`).

## Tests / validations

- Not run in this pass (review-only). Relied on `evidence/tls-raw-styled-parity.md` and
  AGENT-INBOX last-known-green (graph-layout-elk 70/70; preview 168/168; focused
  TLS/layout suites green; build/browser/bundle-fresh/size-budget/no-new-python green).
- Full `packages/layout-engine test` remains red only on the unrelated dirty draw.io
  golden (`specs/077-yaml-drawio-export/golden/ai-infra-production-contract.drawio`).

## Closeout status

- **T051 (SC-002 second cold-start fixture): still required and still open.** Portability
  is the whole point of 077; without a non-TLS clustered fixture the cold-start claim is
  unproven. Do not close 077 without it.
- **T054 (SC-005 full validation): required.** The layout-engine full run is currently
  masked by the unrelated draw.io golden; resolve/segregate that so SC-005 can be a clean
  green, or record the exclusion explicitly.
- **B1 fix + regenerated parity evidence** should land before merge to satisfy SC-001.

## Recommended follow-up specs

- If inline edge-label placement (and `spacing.edgeLabel`) should be tunable per diagram
  rather than hardwired, that is a small typed-registry addition — fold into FR-011 here
  rather than a new spec.
- The draw.io golden drift (`077-yaml-drawio-export`) is a separate concern and should be
  triaged on its own branch, not swept into this one.
