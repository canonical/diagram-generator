# Spec 076: Port Mermaid's cluster/ELK lowering (TLS cold-start example)

**Feature Branch**: `feat/076-tls-mermaid-cold-start-fit`
**Status**: CLOSEOUT READY / REOPENED-AGAIN RESOLVED 2026-07-07 — the Phase 5
reopen fixed the render/text gate, the follow-up review reopened structural
parity, and the Phase 6 graph-shape/browser-path fixes are now green. See
[REOPENED AGAIN — review disproved parity](#reopened-again-2026-07-07--review-disproved-parity)
below for the historical reopen context. Earlier "closed" language is retained
only as history.
**Created**: 2026-07-06
**Rewritten**: 2026-07-06 — pivoted from "investigate Dagre vs lowering" to
"adopt/port Mermaid's proven cluster->ELK lowering", after confirming the sibling
`../mermaid/` repo already vendors `@mermaid-js/layout-elk` (MIT) on top of the
same `elkjs` engine this repo uses.
**Priority**: Example-driven capability port. The TLS topology is the proving
fixture, not the whole scope.
**Context**: `scripts/diagrams/frames/tls-certificate-provider-topology.yaml`,
`docs/spec-archive/074-layout-algorithm-consolidation/`, sibling
`../mermaid/` (vendors `@mermaid-js/layout-elk`, `elkjs`, `dagre-d3-es`), and this
package's `images/` + `references/` assets.

## REOPENED 2026-07-07 — closeout was premature

The 076 closeout claimed "green" but the **actual rendered diagram does not meet
the visual bar**. The closeout gate was satisfied by two weak tests (an
engine-resolution probe plus two geometry-snippet asserts); neither renders the
product SVG, so a badly broken render passed the gate.

**Do not trust the earlier "Merged / archived" status. Treat this section as the
authoritative work list.** Everything above and below this block that says 076 is
closed is historical.

### The bar (non-negotiable)

The live render of `tls-certificate-provider-topology` MUST reach visual parity
with the Mermaid reference:

- `specs/076-tls-mermaid-cold-start-fit/images/01-source-mermaid-reference.png`
- sister-repo harness image `H:\WSL_dev_projects\mermaid-wt-076-tls\tmp-final-canonical.png`

Geometry-snippet asserts and engine-resolution probes are **necessary but not
sufficient**. The gate now requires a render-level check plus a documented
side-by-side against the reference.

### Observed defects (live preview + operator screenshots)

Confirmed by comparing the current editor render (operator screenshot "ours")
against the Mermaid reference (operator screenshot "mermaid"):

- **D1 — annotation nodes collapse to bare text.** The grey two-line annotation
  leaves (`octavia_certificates`, `amphora_issuing_ca`, `amphora_controller_cert`,
  `public_certificates`, `internal_certificates`, `rgw_certificates`) — authored
  with `variant: annotation` / `fill: grey` / `border: none` and a **two-line**
  label (`certificates` + `interface: tls-certificates`) — render as
  **single-line floating text**. The second label line is dropped and the grey
  box chrome is missing. The Mermaid reference shows these as grey boxes with both
  lines.
- **D2 — top-down clustered structure is broken.** The provider stack is cramped
  and the fanout from `manual_tls_certificates` collapses, instead of the clean
  vertical top-down flow (`vault` -> `tls-certificates-pki` -> `manual-tls-certificates`
  -> two sibling clusters) in the reference.
- **D3 — endpoint / relation rows not a clean horizontal row.** The
  load-balancer endpoints and the OpenStack relation row do not lay out as the
  reference's single ordered horizontal rows.
- **D4 — text truncation.** Certificate/interface nodes do not show their full
  text (node width does not fit the measured label on the ELK path).
- **D5 — stale preview server masks the problem.** `apps/preview` `start` does
  not hot-reload server-side TypeScript; its watcher tracks
  `packages/layout-engine/dist`, not the full host/runtime source path
  (`apps/preview/src/server.ts`). A long-lived server on e.g. `:8100` serves an
  even older, worse render. **Reproduce on a freshly restarted server or via the
  export/host render route, never on a stale port.**

### Why the closeout tests passed anyway (root cause of the false green)

- `packages/layout-engine/tests/preview-engine-fidelity-probes.test.ts` only
  proves the fixture *resolves to* `elk-layered`.
- `packages/layout-engine/tests/elk-layout.test.ts` only asserts two geometry
  facts: `openstack_relation_row.placedY < octavia_k8s.placedY`, and the endpoint
  `x` order `traefik_public, traefik_internal, traefik_rgw`.
- Neither test renders the product SVG. So dropped label lines (D1), missing grey
  chrome (D1), collapsed structure (D2), non-horizontal rows (D3), and text
  truncation (D4) all pass silently.

### Precise reopen steps for the implementer

Work these in order. See tasks `T050`–`T056` in `tasks.md` for the checklist
form. Do **not** reintroduce Dagre (spec 074 retirement still holds) and do
**not** add behaviour-heavy `scripts/preview/*.js`.

1. **Reproduce cleanly (T050).** Restart the preview server (or use the
   export/host render route via
   `apps/preview/src/preview-host/frame-documents.ts`) so the render reflects
   current source, not a stale `:8100` process. Capture the current broken SVG as
   the reopen baseline.
2. **Write the failing render regression first (T051).** Add a regression that
   produces the **actual SVG** for `tls-certificate-provider-topology` through
   the product render/export path and asserts:
   - every annotation node renders **both** label lines (e.g. `certificates`
     *and* `interface: tls-certificates`) — no dropped second line;
   - annotation nodes keep their grey fill / annotation chrome;
   - `traefik_public`, `traefik_internal`, `traefik_rgw` share one horizontal row
     (equal / near-equal `y`);
   - no rendered label is truncated (text fits within its node box).
   This test MUST fail against the current output before any fix lands.
3. **Fix annotation rendering under the ELK compound lowering (T052).** Restore
   the second label line and grey box for `variant: annotation` /
   `border: none` / `fill: grey` leaves that live inside lowered ELK compounds.
   Root-cause where the second line and fill are lost between the frame-render
   path and the ELK position read-back in
   `packages/layout-engine/src/elk-layout.ts`.
4. **Fix the clustered layout (T053).** Reproduce the reference top-down
   structure: clean vertical provider fanout, per-cluster direction, endpoints on
   one row, relation row above `octavia_k8s`.
5. **Fix text truncation (T054).** Ensure node widths / measured label sizes on
   the ELK path accommodate the full text.
6. **Verify against the reference image, not snippets (T055).** Compare the fresh
   product render against `images/01-source-mermaid-reference.png` and the sister
   harness `tmp-final-canonical.png`. Save an updated in-repo render image into
   this package.
7. **Raise the gate (T056).** 076 cannot re-close without (a) the T051
   render-level regression green, and (b) a documented side-by-side of the fresh
   product render vs the Mermaid reference showing parity. Engine-resolution and
   geometry-snippet tests alone no longer satisfy the gate.

### REOPENED AGAIN 2026-07-07 — review disproved parity

The Phase 5 reopen work fixed real issues, but the new investigation proved the
spec still closed too early. The current server SVG is better than the stale
viewer capture, yet it still misses the Mermaid structure in three material ways:

1. **Cert nodes are still not first-class ELK graph children.**
   - `isAnnotationFrame(...)` classifies the six grey TLS cert leaves as
     annotation-only because they are borderless, non-endpoint leaves.
   - `shouldIncludeElkNode(...)` therefore omits them from the ELK input graph.
   - They are later reintroduced by `anchorSemanticDescendants(...)` and, if
     anchoring fails, `layoutAnnotationsBelow(...)`.
   - This is the main structural mismatch versus Mermaid, where these certs are
     ordinary nodes inside blank-title subgraphs, not arrow labels and not
     post-layout decorations.
2. **Compound extents still come from two disagreeing layout systems.**
   - ELK places/sizes compounds from graph-visible children.
   - The semantic snapshot and `wrapStructuralContainers(...)` then resize
     wrappers from a second pass.
   - That disagreement leaves `tls_provider` off-center and the two sibling
     parents visually imbalanced even when the server render is otherwise fresh.
3. **The current regression gate is still too weak.**
   - `tls-render-regression.test.ts` now proves text/chrome basics on the real
     render path, which was necessary.
   - It still does **not** prove that cert nodes remain inside parent compounds,
     that `layoutAnnotationsBelow(...)` never fires for this fixture, that the
     provider wrapper centers its content, or that the browser-path ELK geometry
     matches the server render.

This second reopen changes the authoritative work from "render parity cleanup"
to "graph-shape and compound-extent ownership cleanup." Do not re-close 076 on
text/chrome evidence alone.

### REOPENED AGAIN resolution (implemented 2026-07-07)

The structural reopen is now resolved on the current branch:

- grey TLS cert leaves stay in the ELK graph instead of being flattened into
  `layoutAnnotationsBelow(...)`
- the authored source model is reconciled so `tls_provider` is the real wrapper
  around `services_row` in both the YAML fixture and the checked-in Mermaid
  reference
- preview wire transport now preserves `justify`, which was the browser-path
  cause of the widened load-balancer row geometry
- the server render and the live browser IIFE now agree on the forced
  `elk-layered` TLS structure under repo-owned regressions

Validation after the Phase 6 fixes:

- `npm --prefix packages/layout-engine test` → 995/995
- `npm --prefix apps/preview test` → 168/168
- `node scripts/check-browser-bundle-fresh.mjs`
- `node scripts/check_no_new_python.mjs`

This package is back at **Closeout Ready** on
`feat/076-tls-mermaid-cold-start-fit` and is waiting on adversarial review /
merge, not more implementation.

### Process notes

- Per `AGENTS.md`, active spec work needs a matching feature branch. Reopen on a
  fresh branch (e.g. `feat/076-tls-mermaid-cold-start-fit-reopen`) and move this
  package back under `specs/076-.../` while it is active; re-archive on genuine
  parity.
- The two-line annotation authoring in the fixture is **correct** — the fixture
  already declares both label lines and `fill: grey`. The bug is in the render
  path, not the YAML, so do not "fix" the fixture by deleting the second line.

## Problem

We want on-brand diagrams to reproduce Mermaid's **grouping and parenting**:
nested clusters rendered as compound boxes, each with its own local direction,
with tightly ordered rows of leaf nodes inside. None of this repo's current
layout paths does that cleanly. The TLS certificate provider topology is the
concrete failing example: a Mermaid-origin clustered flowchart whose canonical
YAML fixture is currently `v3`-only.

The earlier investigation (and an Opus adversarial review, see
`docs/spec-reviews/076-tls-mermaid-cold-start-fit.md`) established two things:

1. This is **not** a reason to reintroduce Dagre. Spec 074 correctly retired
   Dagre as an `elk-layered` algorithm-class duplicate. Mermaid's clean cluster
   look comes from Mermaid's **cluster/subgraph lowering layer**, not from the
   Dagre algorithm itself. Reintroducing Dagre would restore the duplicate
   without the cluster machinery that produces the look.
2. The real gap is the **lowering / input shape**: our fixture is lowered as
   fill-sized structural carriers and helper rows (`provider_stack`,
   `services_row`, `load_balancer_endpoint_row`) instead of ELK **compound
   nodes** with per-cluster direction, so `elk-layered` receives the wrong
   problem and cannot recover the intent.

The open question the user raised — *is there something from Mermaid we can
directly port, since it is open source?* — now has a concrete, verified answer.
See the portability finding below. In short: **yes**, and it targets the exact
engine we already ship, so this is a lowering port, not a new layout engine.

## Portability finding (verified in `../mermaid/node_modules`)

- Mermaid's ELK support is the package **`@mermaid-js/layout-elk` v0.2.1**,
  **MIT licensed** (Copyright Knut Sveidqvist / Mermaid).
- It depends on **`elkjs`** — the **same** ELK engine `diagram-generator`
  already uses in `packages/graph-layout-elk` / `packages/layout-engine`.
- Its core (`dist/chunks/.../render-*.mjs`) lowers Mermaid's internal graph into
  an ELK graph using compound **`children`**, a **`clusterDb`** /
  **`parentLookupDb`** parent map, `isGroup`/subgraph handling, per-node
  **`layoutOptions`** (including per-cluster **`elk.direction`**), then reads ELK
  positions back. That is exactly the cluster-preserving lowering we lack.
- Coupling caveat (from `dist/render.d.ts`): the package's exported `render()`
  takes Mermaid's `LayoutData`, an `SVG`, and Mermaid `InternalHelpers`
  (`insertCluster`, `insertNode`, `insertEdge`, `labelHelper`, ...). So the
  package is **not** a drop-in pure layout function. The portable asset is the
  **graph-building/lowering algorithm** inside it (LayoutData nodes + parent map
  -> ELK compound graph + option set -> position read-back), not the SVG
  rendering, which we already own.

This directly answers the user's scepticism about hand-authoring: we do **not**
need to invent a cluster layout heuristic. Mermaid already solved it, on our
engine, under a permissive licence. We port its proven lowering.

## Goals

- Reproduce Mermaid's grouping/parenting for this fixture by feeding ELK a
  **compound-node** graph (subgraph = ELK compound with local direction, insets,
  and ordered children), instead of fill-sized carriers.
- Adopt the Mermaid `@mermaid-js/layout-elk` lowering approach — either by
  reusing the package at a boundary or by porting its MIT-licensed graph-building
  step into this repo's typed ELK lowering.
- Prove it on the TLS fixture with repo-owned regression coverage before
  claiming `elk-layered` support.
- Keep the cold-start asset pack so the example stays reproducible.
- Keep the Dagre retirement intact.

## Non-goals

- No Dagre resurrection in this spec (the port question is now settled: not
  Dagre).
- No broad Mermaid text-import implementation here; parsing `.mmd` to canonical
  YAML remains spec 028. This spec is about the **cluster->ELK lowering**, which
  028 can then reuse.
- No behavior-heavy preview work in `scripts/preview/*.js`.
- No global engine re-ranking based on one example.
- No copy of Mermaid's SVG rendering path; we keep our own renderer.

## Cold-start asset pack

This package MUST stay self-contained enough for a new agent to understand the
example without the original chat:

- `images/01-source-mermaid-reference.png`
  - the visual source of truth; this is the "before" image
- `images/02-engineer-elk-force-attempt.png`
  - the field engineer's first ELK-force comparison; this is an external
    "after" attempt, not the in-repo canonical render path
- `images/03-current-v3-render.png`
  - current in-repo `v3` render from the canonical YAML fixture
- `images/04-current-elk-layered-render.png`
  - current in-repo forced `elk-layered` render on the same fixture
- `images/05-current-elk-force-render.png`
  - current in-repo forced `elk-force` render on the same fixture
- `references/tls-certificate-provider-topology.mmd`
  - draft Mermaid reconstruction for cross-repo seeding
- `scripts/diagrams/frames/tls-certificate-provider-topology.yaml`
  - canonical YAML fixture in this repo

## Image context and interpretation

These assets are not five interchangeable screenshots. They represent three
different stages of the question:

1. **Source truth**
   - `images/01-source-mermaid-reference.png`
   - This is the target look and the likely Mermaid-origin diagram behavior.
   - The important visual properties are:
     - a top provider cluster
     - two lower sibling clusters
     - ordered endpoint rows within the right-hand cluster
     - a layered top-to-bottom fanout from one provider node

2. **Field-engineer downstream attempt**
   - `images/02-engineer-elk-force-attempt.png`
   - This is not the canonical in-repo reproduction. It is the field engineer's
     external ELK-force attempt that triggered the question "why is autolayout
     showing more of the intended structure than ELK?"
   - Treat this as evidence that a naive ELK-force try was unsatisfactory, not
     as proof that ELK in general is wrong.

3. **Controlled in-repo comparison**
   - `images/03-current-v3-render.png`
   - `images/04-current-elk-layered-render.png`
   - `images/05-current-elk-force-render.png`
   - These three are the real apples-to-apples comparison because they all come
     from the same canonical YAML fixture in this repo.

## Why the current attempts fail

The current failure mode should be stated explicitly so Opus can challenge it.
The leading hypothesis from this repo's investigation is:

- The source diagram is probably best understood as a **clustered layered
  graph**.
- The current YAML fixture is lowered as a **frame layout** with
  fill-sized structural carriers and helper rows.
- `v3` gets closer because it is designed to honor frame rows, fill carriers,
  and authored box-group structure directly.
- `elk-force` fails because it is the wrong algorithm family for this source:
  it is an organic / force layout, so it does not preserve the ordered layered
  cluster structure the reference depends on.
- `elk-layered` on the current YAML still fails to match the source because the
  lowered structure it receives is not a clean clustered graph. It sees
  full-width carriers and helper rows rather than a graph-native cluster model,
  so "switching to a layered algorithm" is not enough by itself.

This yields the resolution now recorded in this spec:

- the fix is a **cluster-preserving ELK lowering** (subgraph -> ELK compound node
  with local direction, insets, and ordered children), matching what Mermaid's
  `@mermaid-js/layout-elk` already does on `elkjs`
- it is **not** "bring Dagre back"

## Current behavior (must be treated as baseline, not conjecture)

- The authored frame fixture exists at
  `scripts/diagrams/frames/tls-certificate-provider-topology.yaml`.
- The current compatibility judgment is `v3` only.
- The current fill-carrier blockers are:
  - `provider_stack`
  - `services_row`
  - `load_balancer_endpoint_row`
- The arrow graph is a connected tree, so "only diagrams connected by arrows"
  is **not** the blocker here.
- The structure is not deeply nested by repo standards; deep nesting is **not**
  the reason ELK is withheld here.
- The meaningful current question is:
  - can a Mermaid-origin clustered flowchart be lowered into a more graph-native
    ELK input shape than the current fill-carrier-heavy frame layout?

## Decision (resolved) and port strategy

The architectural question is answered: **port Mermaid's cluster->ELK lowering;
do not reintroduce Dagre.** Three implementation strategies exist; pick per the
spike in T0.

**Strategy A — reuse `@mermaid-js/layout-elk` at a boundary.**
Convert our diagram into Mermaid's `LayoutData` node/edge/cluster shape and call
the package. Lowest reimplementation of layout logic, but heavy coupling: the
package's `render()` also wants Mermaid `InternalHelpers` and does SVG insertion,
so we would only want its internal graph-building step, which is not a clean
public entry point. Adds a runtime dependency on Mermaid internals.

**Strategy B — port the MIT-licensed lowering into our typed ELK path
(recommended).**
Reimplement the graph-building step in `packages/graph-layout-elk` /
`packages/layout-engine` ELK lowering, guided by the MIT source: each authored
cluster becomes an ELK compound node (`children`), with a parent map, per-cluster
`elk.direction`, cluster padding/insets, and ordered child placement; read ELK
positions back into our frame geometry. This fits our typed model and renderer,
keeps no Mermaid runtime dependency, and reuses the compound machinery already
present in `packages/layout-engine/src/elk-layout.ts` (`collectNativeCompoundIds`,
`isElkCompound`, `compoundNeedsElkChildLayout`).

**Strategy C — cross-repo geometry via the sibling harness.**
The `../mermaid/` brand-kit already renders `.mmd` with `config.layout: elk`
(it vendors `@mermaid-js/layout-elk` + `elkjs`). It can emit ELK cluster geometry
for the `.mmd` directly, useful as an oracle for the T0 spike and as a bridge for
spec 028's import path. Not the product path by itself, but strong evidence.

Recommendation: **B**, de-risked by a **C-backed oracle** in T0. Reject A as the
product path because of the SVG/helper coupling.

## T0 evidence update (2026-07-06)

Phase 0 is now executed and recorded. The outcome is a real FAIL, not a hand-wave:

- `T000` portability finding confirmed independently in
  `../mermaid/node_modules/@mermaid-js/layout-elk`:
  - package: `@mermaid-js/layout-elk@0.2.1`
  - license: MIT
  - engine dependency: `elkjs`
  - mechanism: compound `children`, parent map, per-subgraph `elk.direction`,
    and ancestor promotion to `elk.hierarchyHandling = INCLUDE_CHILDREN` for
    cross-cluster edges.
- `T001` / `T002` hand-authored spike implemented at `tmp/elk-cluster-spike.mts`.
  It builds the TLS graph explicitly as ELK compounds (`provider_stack`,
  `services_row`, `openstack_services`, `load_balancers`,
  `openstack_relation_row`, `load_balancer_relation_row`,
  `load_balancer_endpoint_row`) and writes `tmp/elk-cluster-spike-summary.json`.
- Stable working seed option set:
  - root: `elk.algorithm=layered`
  - root: `elk.direction=DOWN`
  - root: `elk.hierarchyHandling=INCLUDE_CHILDREN`
  - root: `elk.spacing.nodeNode=24`
  - root: `elk.layered.spacing.nodeNodeBetweenLayers=40`
  - subgraphs default to `SEPARATE_CHILDREN`, then the spike mirrors Mermaid's
    ancestor promotion to `INCLUDE_CHILDREN` only on cross-cluster edge paths.
- What the spike proves:
  - the top provider cluster remains above the lower services lane
  - provider-local `TB` direction is preserved (`vault` above
    `manual-tls-certificates`)
  - the lower services lane remains left-to-right as two sibling compounds
  - the overall fanout from `manual_tls_certificates` into the lower clusters is
    top-down rather than force-scattered
- Why it still FAILS the gate:
  - `openstack_relation_row` settles below `octavia_k8s` instead of above it
  - `load_balancer_endpoint_row` preserves a row, but reorders the leaves as
    `traefik-rgw`, `traefik-public`, `traefik` instead of the source order
  - reintroducing ELK model-order options (`considerModelOrder` /
    `forceNodeModelOrder`) on this nested cross-hierarchy graph reopens an
    internal `elkjs` crash (`FEc ... Cannot read properties of undefined`)
- `T003` sibling oracle also FAILS:
  - invalid first pass discarded: raw `node ../mermaid/render.mjs ...` on the
    draft `.mmd` did not inject the sibling repo's managed frontmatter, so it was
    not a trustworthy ELK oracle.
  - corrected ELK oracle:
    `node ../mermaid/restyle.mjs specs/076-tls-mermaid-cold-start-fit/references/tls-certificate-provider-topology.mmd tmp/mermaid-tls-elk-restyled.svg --export-only --font-mode=none`
  - rasterized review asset: `tmp/mermaid-tls-elk-restyled.png`
  - Mermaid's own `@mermaid-js/layout-elk` lowering with explicit managed
    frontmatter preserves compounds and the endpoint row order, but it still does
    not reproduce the reference's lower-cluster stacking for this reconstructed
    source: `openstack_relation_row` collapses into a left-side vertical column
    rather than a horizontal row above `octavia_k8s`.

Conclusion: the T0 spike does **not** justify proceeding directly to Phase 2.
The evidence now says the current Mermaid-style cluster lowering is necessary but
not sufficient for this example. A follow-up cluster / ordering pass remains on
the table, and the spec must stop for Opus review rather than asserting that the
port alone closes the gap.

## Opus review update (2026-07-07)

Opus reviewed the T0 evidence and rejected the proposed Dagre pivot.

- The spike never enabled ELK ordering controls (`considerModelOrder`,
  `crossingMinimization`, ports), so the observed row reordering does not prove
  an ELK limitation by itself.
- The near-match dagre comparison depends on a fabricated helper edge
  (`octavia_k8s --- traefik_public`), so it is not a valid source-faithful
  counterexample.
- The real blocker is the uninvestigated `elkjs` crash under
  `INCLUDE_CHILDREN` + model-order, plus the hierarchy-flattening side effects
  that turn the intended horizontal ordering rows into vertical stacks.

Therefore the accepted next step is a bounded ELK ordering experiment, not an
engine change: enable model-order only on the ordering rows, keep those rows
`SEPARATE_CHILDREN`, route cross-cluster edges via containers/ports, and
root-cause the crash before reconsidering scope.

## Implementation closeout update (2026-07-07)

The bounded ELK-only follow-up ultimately justified a **typed lowering shim**,
not a Dagre fallback and not more ELK model-order tuning.

What landed in product path:

- authored/native compounds stay preserved in the ELK graph
- nested compounds can now carry a local flow direction through
  `GraphNodeInput.direction`
- locally directed compounds synthesize invisible ordering edges so ELK keeps
  row order without using the hierarchy+model-order option set that crashes
  `elkjs`
- cross-hierarchy authored edges still promote the necessary compound path to
  `INCLUDE_CHILDREN`
- ordering edges stay layout-only and are filtered from rendered routes/labels

This keeps the implementation generic for spec 028 reuse, keeps Dagre retired,
and proves the TLS fixture on the real product path rather than on a spike-only
graph.

## Execution notes for implementers (GPT-tier, prescriptive)

This section makes T0 (the spike) executable without design judgement, so it can
be outsourced to a lower-tier model. The **port** (Phase 2) is intentionally not
over-specified here: harden it only *after* T0 proves the approach, using the T0
option set as the seed.

### T0 spike — exact steps

1. Create a standalone script `tmp/elk-cluster-spike.mts` (a spike, not a test).
   It imports `elkjs` (already a dependency via `packages/graph-layout-elk`) and
   builds one ELK graph by hand from
   `scripts/diagrams/frames/tls-certificate-provider-topology.yaml`.
2. Build the ELK graph with **compound nodes** (do NOT flatten to fill carriers):
   - Root: `layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': 'DOWN',
     'elk.hierarchyHandling': 'INCLUDE_CHILDREN' }`.
   - Each Mermaid `subgraph` → an ELK node with a `children` array and its own
     `layoutOptions`:
     - per-cluster direction: Mermaid `TB`→`'elk.direction':'DOWN'`,
       `LR`→`'RIGHT'`.
     - insets: `'elk.padding': '[top=24,left=16,bottom=16,right=16]'` (tune).
     - spacing: `'elk.spacing.nodeNode': '24'`,
       `'elk.layered.spacing.nodeNodeBetweenLayers': '32'` (tune).
   - Blank-title ordering subgraphs (`services_row`, `openstack_relation_row`,
     `load_balancer_relation_row`, `load_balancer_endpoint_row`) → compound nodes
     with the same options but no rendered chrome.
   - Leaves → ELK nodes with `width`/`height` from measured label sizes (reuse
     the text adapter, or hardcode approximate sizes for the spike).
   - Edges → the four authored arrows from the `.mmd`.
3. Run `elk.layout(graph)` and print the resulting nested `x/y/width/height`.
4. Compare against `images/01-source-mermaid-reference.png`:
   - clusters nested correctly (children inside parents),
   - per-cluster direction honoured (provider TB, rows LR),
   - endpoint rows ordered left→right,
   - one-provider fanout top→down.
5. Optional oracle (T003): in `../mermaid/`, render
   `references/tls-certificate-provider-topology.mmd` with `config.layout: elk`
   and compare structure.
6. Write PASS/FAIL + the working option set into this spec and the review doc.
   - 2026-07-06 update: FAIL recorded. The stable option seed is captured above,
     and both the hand-authored spike plus the Mermaid oracle miss the reference
     ordering. Stop here for review; do not start the Strategy B port.
   - 2026-07-07 update: Opus review rejects a Dagre fallback. The only allowed
     next step is the bounded ELK ordering / crash experiment in the review doc.

### Port file map (seed for Phase 2 hardening, not final)

- Cluster→ELK compound builder: `packages/graph-layout-elk/src/` (new module) or
  extend `packages/layout-engine/src/elk-layout.ts`.
- Existing compound machinery to reuse: `collectNativeCompoundIds`,
  `isElkCompound`, `compoundNeedsElkChildLayout` in
  `packages/layout-engine/src/elk-layout.ts`.
- New typed "invisible ordering cluster" concept: same module; a compound with no
  chrome + a local direction.
- Compatibility owner: `packages/layout-engine/src/preview-engine/registry.ts`.
- Regressions: `packages/layout-engine/tests/preview-engine-*` (compatibility) +
  a new geometry test on the TLS fixture.
- After browser-surface changes: `npm --prefix packages/layout-engine run build:browser`.

### Hardening status for outsourcing

- **T0 spike + planning audit:** ready to outsource now (bounded, prescriptive).
- **Phase 2 port:** NOT yet prescriptive enough for blind end-to-end
  implementation by a lower-tier model. Re-harden this section with the proven T0
  option set and exact function signatures before handing the port to GPT-tier;
  until then, keep the port on the GPT-implements / Opus-reviews loop.

## User stories

### US1: Cold-start recreation

As a new agent on a new machine, I can open this spec package and reproduce the
diagram question without prior chat context.

**Independent test**: using only this package, the YAML fixture, and repo docs,
an agent can identify the source image, the engineer comparison, the draft
Mermaid source, and the current render comparisons.

**Acceptance scenarios**

1. **Given** a cold-start agent, **When** they open this package, **Then** they
   can locate the original visual reference, the failed ELK comparison, and the
   current in-repo fixture without searching chat history.
2. **Given** the draft Mermaid source in `references/`, **When** the sibling
   Mermaid repo picks up the handoff, **Then** it has a concrete first-pass
   structure to refine rather than starting from prose alone.

### US2: Honest current classification

As a maintainer, I can see exactly why this example is not currently ELK-ready,
without blaming the wrong cause.

**Independent test**: a repo-owned compatibility probe on this fixture asserts
that only `v3` is compatible and names the exact fill-carrier ids above.

**Acceptance scenarios**

1. **Given** the current fixture, **When** compatibility is summarized,
   **Then** the spec and future probe both report `v3` only.
2. **Given** the same fixture, **When** the question "is deep nesting the
   blocker?" is asked, **Then** the answer is explicitly "no".

### US3: Future ELK claim must be real

As a reviewer, I can reject hand-wavy claims that "ELK layered should be the
same as Mermaid/Dagre here" unless the implementation changes the lowered shape
or adds a justified shim and proves it on this fixture.

**Independent test**: any future claim that `elk-layered` supports this example
must come with a repo-owned regression on this fixture covering compatibility
and the core cluster/ordering geometry.

**Acceptance scenarios**

1. **Given** a future change that keeps the current fill carriers,
   **When** it claims ELK parity anyway, **Then** the claim is rejected.
2. **Given** a future change that makes `elk-layered` compatible,
   **When** it is reviewed, **Then** it includes a fixture-owned regression and
   a written explanation of the new lowering/shim.

## Functional requirements

- **FR-001**: This spec package MUST keep the cold-start asset pack (images,
  `.mmd`, fixture) named/stable enough to reference from other repos.
- **FR-002**: The spec MUST record the verified portability finding: Mermaid ELK
  support is `@mermaid-js/layout-elk` (MIT) over `elkjs`, and the portable asset
  is its cluster->ELK compound graph-building step, not its SVG rendering.
- **FR-003**: The spec MUST record the current state precisely: `v3` only,
  blocked by `provider_stack`, `services_row`, and `load_balancer_endpoint_row`;
  not blocked by deep nesting; not blocked by a non-tree arrow graph.
- **FR-004**: This spec MUST NOT reintroduce Dagre. The decision is settled: the
  fix is a cluster-preserving ELK lowering, ported from Mermaid's approach.
- **FR-005**: The implementation MUST lower each authored cluster to an ELK
  **compound node** with local `elk.direction`, cluster insets/padding, and
  ordered children, instead of fill-sized carriers, reusing the existing
  compound machinery in `packages/layout-engine/src/elk-layout.ts` where possible.
- **FR-006**: The port MUST be validated on the TLS fixture with a repo-owned
  regression covering both `elk-layered` compatibility and the core
  cluster/ordering/direction geometry before the fixture is reclassified.
- **FR-007**: The T0 spike (hand-authored compound ELK graph for this fixture,
  optionally cross-checked against Strategy C's `.mmd` ELK render) MUST run and
  be recorded before any reclassification claim lands. If T0 still misses the
  reference, the only allowed continuation remains ELK-only: a bounded ordering
  / crash follow-up that either proves a typed lowering shim or leaves the
  fixture unreclassified.
- **FR-008**: The spec MUST explain the photo context explicitly:
  source truth, field-engineer external attempt, and in-repo controlled
  comparisons.
- **FR-009**: If the port lands generically, the cluster->ELK lowering MUST be
  reusable by spec 028's Mermaid import path, not hard-coded to this fixture.
- **FR-010**: Any claim of `elk-layered` support that keeps the current fill
  carriers, or that skips the T0 spike / fixture regression, MUST be rejected.

## 2026-07-08 Research Reset

Pause further implementation until a fresh Opus review validates the next
direction. The current branch still does **not** meet the real spec bar.

Current diagnosis after re-checking the raw ELK output and the product path:

- The raw ELK view is still materially different from the Mermaid reference, so
  the remaining gap is **not** just an SVG redraw bug.
- The local Mermaid harness now gives two source-shape rules that matter here
  and that should be treated as part of the cold-start diagnosis, not as
  stylistic advice:
  - `../brand-aligned-mermaid/PLAYBOOK.md` says fan-out labels create asymmetric
    ELK dummy nodes and must move onto a hub node instead.
  - the same playbook says not to use a subgraph/container as an edge endpoint;
    ELK should route node-to-node or through a hub.
- The product path still performs substantial post-ELK ownership work
  (`anchorSemanticDescendants(...)`, `realignPlacedContainersToAuthoredLayout(...)`,
  `wrapStructuralContainers(...)`) after ELK has already laid out the graph.
  Any direction that depends on those passes to recreate Mermaid's structure is
  architecturally suspect and should be treated as failing the spec bar.
- The current product lowering still does **not** match the strongest shape from
  the spike evidence. `buildGraphEdges(...)` in
  `packages/layout-engine/src/elk-layout.ts` still emits flat leaf-to-leaf
  edges; it does not yet own the spike's more faithful edge/container/port
  shape for cross-cluster routing.
- The graph adapter and normalizer now need to be reviewed as first-class
  suspects, not just `elk-layout.ts`:
  - `packages/graph-layout-elk/src/elk-graph-builder.ts` enables compound
    directions and fixed ports, but still operates on the graph shape we feed it.
  - `packages/graph-layout-elk/src/result-normalizer.ts` preserves ELK edge
    sections, but the product path later clears `arrow.layoutPath` whenever
    moved frame ids trigger local rerouting.
- There is also an ELK stack skew to keep in mind during review:
  - local Mermaid harness lockfile: `@mermaid-js/layout-elk@0.2.1` +
    `elkjs@0.9.3`
  - this repo: `elkjs@0.10.2` through `@diagram-generator/graph-layout-elk`
  The review should decide whether the visible mismatch is primarily version
  skew, lowering shape, or post-ELK ownership.
- The real decision question is therefore narrower and more honest than the
  reopened closeout language suggests:
  can this repo reach the Mermaid reference by continuing to port the
  Mermaid-style cluster->ELK lowering plus a generic typed edge/container shape,
  or has the current frame model hit a real limit that needs a dedicated
  follow-up before more product-path changes land?

Local visual oracle available for this review:

- `../brand-aligned-mermaid/README.md`
- the local raw ELK screenshot: `/Users/l/work/diagram-generator/image copy.png`

Required gate before more implementation:

- run a fresh Opus adversarial review against the **current branch + working
  tree diagnosis**
- use `docs/spec-reviews/076-tls-mermaid-cold-start-fit-opus-review-prompt-2026-07-08.md`
- verify whether the remaining work should stay on the Mermaid/ELK lowering
  path, and if so, which owner must change first:
  1. graph lowering / edge ownership
  2. ELK option surface and exposed manual controls
  3. post-ELK normalization ownership

Do not continue with local redraw heuristics, fixture-only routing patches, or
"looks better on this example" work before that review lands.

## Validation Protocol (Opus)

1. Inspect `images/01-source-mermaid-reference.png` (source truth).
2. Inspect `images/02-engineer-elk-force-attempt.png` (external attempt).
3. Inspect `images/03-current-v3-render.png`,
   `images/04-current-elk-layered-render.png`, and
   `images/05-current-elk-force-render.png` (controlled in-repo comparison).
4. Read `references/tls-certificate-provider-topology.mmd` and
   `scripts/diagrams/frames/tls-certificate-provider-topology.yaml`.
5. Inspect the local Mermaid visual harness at
   `../brand-aligned-mermaid/README.md` and use it as the available local
   Mermaid/ELK oracle for this repo state.
6. Confirm the portability finding independently from the Mermaid-side ELK
   implementation that is locally available to the reviewer: `@mermaid-js/layout-elk`
   is MIT and depends on `elkjs`; its core builds a compound ELK graph with
   `children` / parent map / per-cluster options.
7. Run the **T0 spike**: hand-author a compound ELK graph for this fixture
   (each subgraph as an ELK compound with local `elk.direction`, padding, ordered
   children) and render it; optionally cross-check against Strategy C's `.mmd`
   ELK render from the local Mermaid harness.
   - If it matches the reference: the diagnosis is proven; proceed to the
     Strategy B port.
   - If it does not: record the specific residual (direction mixing, ordered
     rows, cross-cluster routing), keep the follow-up ELK-only, and prove either
     a bounded typed lowering shim or a continued block — still not Dagre.
8. Only after T0 passes **or** the bounded ELK-only follow-up proves a typed
   lowering shim, review the Strategy B port for: reuse of existing compound
   machinery, per-cluster direction, ordered-child preservation, any synthetic
   ordering shim, and correct position read-back.
9. Require the fixture-owned regression (compatibility + geometry) to pass.
10. Reject any fix that keeps the current fill carriers, skips T0, or reintroduces
   Dagre.

## Success criteria

- **SC-001**: This spec package is committed with the image pack and Mermaid
  draft so the example survives cold start.
- **SC-002**: `../mermaid/AGENT-INBOX.md` contains a concrete request to add the
  example there, with links back to the assets in this repo.
- **SC-003**: A future repo-owned compatibility probe is defined for this
  fixture so the `v3`-only baseline is explicit until changed on purpose.
- **SC-004**: The spec makes the Dagre/ELK distinction honest: Dagre removal
  stays a consolidation decision, while this example is framed as a lowering /
  representation problem until proven otherwise.
- **SC-005**: The context of each before/after image is explicit enough that a
  cold-start reviewer can tell source truth from downstream attempts.
- **SC-006**: The spec records the resolved decision — port Mermaid's
  cluster->ELK lowering (`@mermaid-js/layout-elk`, MIT, over `elkjs`), not Dagre
  — with the portability finding verifiable in `../mermaid/node_modules`.
- **SC-007**: The TLS fixture is not reclassified as `elk-layered`-compatible
  until either the T0 spike passes directly or the bounded ELK-only follow-up
  proves a typed lowering shim, and the fixture-owned regression
  (compatibility + cluster/direction/ordering geometry) is committed.
- **SC-008**: The ported cluster->ELK lowering is generic enough for spec 028's
  Mermaid import to reuse, not hard-coded to this one fixture.

## Risks

- It is easy to misdiagnose this as "ELK is worse than Mermaid" when the real
  issue may be the current frame lowering, especially the fill carriers.
- It is also easy to smuggle Dagre back in through example frustration. FR-004
  blocks that shortcut.
- T0 now proves a third risk is real: Mermaid's current ELK lowering and a
  hand-authored compound graph can still miss the intended row ordering /
  vertical stacking, so a dedicated typed cluster-ordering pass may be required
  even after the lowering shape is corrected.
- A Mermaid reconstruction can still be a weak fit if the source image hides
  authoring details. The sibling repo must follow its no-guess fit workflow and
  call that out explicitly if needed.
