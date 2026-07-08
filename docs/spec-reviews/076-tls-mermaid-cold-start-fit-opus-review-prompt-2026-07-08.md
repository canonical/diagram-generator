# Opus Adversarial Review Prompt — Spec 076 Research Reset

Use this prompt for one fresh Opus pass before any more implementation on
`feat/076-tls-mermaid-cold-start-fit`.

```text
Familiarize yourself with the `diagram-generator` repo, then perform a strict
adversarial review of the current `feat/076-tls-mermaid-cold-start-fit` branch.

This is a pre-implementation direction review, not a request to bless local
patches. Review the current state as a skeptical external engineer and decide
whether the next step is actually on the right owner boundary.

Current target:
- Repo: `diagram-generator`
- Branch: `feat/076-tls-mermaid-cold-start-fit`
- Spec package: `specs/076-tls-mermaid-cold-start-fit/`
- New spec reset section: `specs/076-tls-mermaid-cold-start-fit/spec.md`
  under `## 2026-07-08 Research Reset`

Required context to inspect first:
- `AGENTS.md`
- `AGENT-INBOX.md`
- `specs/076-tls-mermaid-cold-start-fit/spec.md`
- `specs/076-tls-mermaid-cold-start-fit/plan.md`
- `specs/076-tls-mermaid-cold-start-fit/tasks.md`
- `docs/spec-reviews/076-tls-mermaid-cold-start-fit.md`
- `specs/076-tls-mermaid-cold-start-fit/evidence/elk-ordering-spike-2026-07-07.md`
- `specs/076-tls-mermaid-cold-start-fit/evidence/elk-ordering-spike.mjs`

Visual evidence to inspect:
- Mermaid reference image:
  `specs/076-tls-mermaid-cold-start-fit/images/01-source-mermaid-reference.png`
- Local raw ELK screenshot:
  `/Users/l/work/diagram-generator/image copy.png`
- Current product-path screenshot showing the left-arrow failure:
  `/Users/l/work/diagram-generator/image.png`

Local Mermaid oracle to inspect:
- `/Users/l/work/brand-aligned-mermaid/README.md`
- `/Users/l/work/brand-aligned-mermaid/PLAYBOOK.md`

Relevant Mermaid-harness findings to verify against the product path:
- `PLAYBOOK.md` says ELK fan-out labels create asymmetric dummy nodes and should
  move to a hub node instead.
- `PLAYBOOK.md` says not to use a subgraph/container as an edge endpoint; route
  node-to-node or through a hub.
- `brand-aligned-mermaid/package-lock.json` pins `@mermaid-js/layout-elk@0.2.1`
  with `elkjs@0.9.3`; compare that against this repo's ELK stack and decide
  whether version skew is materially relevant to the current failure.

Critical code owners to inspect:
- `packages/layout-engine/src/elk-layout.ts`
- `packages/layout-engine/src/preview-engine/`
- `packages/graph-layout-elk/src/elk-graph-builder.ts`
- `packages/graph-layout-elk/src/result-normalizer.ts`
- `scripts/diagrams/frames/tls-certificate-provider-topology.yaml`
- `specs/076-tls-mermaid-cold-start-fit/references/tls-certificate-provider-topology.mmd`

What you should verify adversarially:

1. Is the current branch actually using a Mermaid-style cluster->ELK lowering,
   or only a partial approximation?
   - In particular, check whether the product path currently ports only
     compound children/direction while still lowering the cross-cluster edges as
     flat leaf-to-leaf edges.
   - `packages/layout-engine/src/elk-layout.ts:1053` is the current local
     pressure point: `buildGraphEdges(...)` maps arrows to flat `source` /
     `target` leaf ids with labels, but no richer cross-cluster edge ownership.

2. Does the raw ELK view already prove the remaining gap is upstream of SVG
   redraw?
   - If the raw ELK view is structurally wrong, say so clearly.
   - If the raw ELK view is close enough and only the redraw path corrupts it,
     say so clearly.

3. Is the current post-ELK ownership boundary architecturally acceptable?
   - `anchorSemanticDescendants(...)`
   - `realignPlacedContainersToAuthoredLayout(...)`
   - `wrapStructuralContainers(...)`
   - clearing `arrow.layoutPath` and falling back to local rerouting
   - the local code points to check are:
     - `packages/layout-engine/src/elk-layout.ts:1169` (ELK route adoption)
     - `packages/layout-engine/src/elk-layout.ts:1177` (clearing routed geometry)
     - `packages/layout-engine/src/elk-layout.ts:1474` (post-ELK ownership pass chain)

4. Given the spike evidence and current product path, which owner must change
   first before more implementation is justified?
   Choose the strongest answer and defend it:
   - graph lowering / edge ownership shape
   - ELK option surface plus exposed manual controls
   - post-ELK normalization ownership
   - or a deeper model limitation that requires a dedicated follow-up spec

5. Answer the key decision question directly:
   - Is it still plausible to reach the Mermaid reference by continuing the
     Mermaid/ELK lowering port in this repo?
   - Or has the evidence already shown that this branch needs a more explicit
     typed capability or model change before more ELK-lowering work lands?

Review constraints:
- Do not praise partial improvements.
- Do not accept "this example looks better" if the direction would not cold-start
  on a new similar diagram with different row sizes or item counts.
- Treat any solution that redraws around ELK instead of fixing the lowering /
  ELK boundary as suspect unless you can justify it as a thin, generic bridge.
- Treat existing spec status claims as untrusted unless the current evidence still
  supports them.

Deliverable format:
- Findings first, ordered by severity.
- Then:
  - `Direction verdict`
  - `What must change before more implementation`
  - `What work should be rejected immediately`
  - `Open questions / assumptions`

If you conclude the current intended direction is still correct, be precise
about why, and name the exact owner boundary that should change next.
If you conclude it is not correct, say what the spec should claim instead before
any more code lands.
```
