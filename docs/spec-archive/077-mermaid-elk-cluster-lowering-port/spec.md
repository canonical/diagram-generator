# Spec 077: Port Mermaid's ELK cluster lowering (layout-only), style thinly over ELK geometry

**Feature branch**: `feat/077-mermaid-elk-cluster-lowering-port`
**Status**: In progress — TLS topology review fixes are in the working tree;
broader closeout still needs SC-002 and SC-005
**Created**: 2026-07-08
**Supersedes direction of**: spec 076 (`specs/076-tls-mermaid-cold-start-fit/`),
which is retired as a failed approach. See
[`docs/spec-reviews/076-tls-mermaid-cold-start-fit.md`](../../docs/spec-reviews/076-tls-mermaid-cold-start-fit.md)
and the 076 post-mortem summarized in the Problem section below.
**Proving fixture**: `scripts/diagrams/frames/tls-certificate-provider-topology.yaml`
**Reference (visual truth)**:
`specs/076-tls-mermaid-cold-start-fit/images/01-source-mermaid-reference.png`
**Mermaid oracle (MIT source to port)**:
`H:\WSL_dev_projects\mermaid-js-monorepo\packages\mermaid-layout-elk\src\render.ts`
(+ `find-common-ancestor.ts`, `geometry.ts`). Published as
`@mermaid-js/layout-elk@0.2.1` on `elkjs@0.9.3`.

---

## Problem

On-brand diagrams must reproduce Mermaid's **grouping and parenting**: nested
clusters rendered as compound boxes, each with its own local direction, with
tightly ordered rows of leaves inside, and edges routed cleanly across cluster
boundaries. The TLS certificate provider topology is the concrete failing
fixture; the capability is general.

Spec 076 tried to reach this and failed across four gates and three reopens. The
post-mortem (2026-07-08) established the root causes precisely:

1. **The Mermaid algorithm was never actually ported.** `@mermaid-js/layout-elk`
   was never a product dependency. 076 chose "Strategy B" (re-implement the
   lowering) but only ported a subset.
2. **Cross-cluster edges are lowered flat.**
   `packages/layout-engine/src/elk-layout.ts` `buildGraphEdges(...)` maps arrows
   to flat `source`/`target` leaf ids with labels — no lowest-common-ancestor
   attachment, no cross-cluster edge ownership. ELK therefore never receives the
   real clustered edge graph.
3. **The product path owns geometry after ELK.** ELK's routed edges are thrown
   away (`clearElkRoutedGeometryForFrames`) and re-routed locally, and a large
   post-ELK box-moving stack (`anchorSemanticDescendants`,
   `normalizeDirectedContainersFromSemantic`,
   `realignPlacedContainersToAuthoredLayout`, `wrapStructuralContainers` — called
   twice, `anchorSyntheticLayoutDescendants` — called twice,
   `layoutAnnotationsBelow`) hand-nudges this one fixture toward the reference.
   The doubled calls are the fingerprint of iterate-until-this-picture-looks-right.
4. **The closeout gate never rendered the diagram.** It passed on an
   engine-resolution probe plus two geometry-snippet asserts. A broken render got
   a green check and was archived.

**Consequence — not portable.** Because the acceptable look comes from
fixture-specific post-ELK box moving, the **raw ELK output** (the only part a new
diagram on a fresh clone would actually get) is structurally wrong. Toggling the
raw-ELK view shows a completely different, broken layout. Any new similar diagram
with different row sizes or item counts would fail cold-start.

## Root cause, stated as an invariant to restore

Mermaid's ELK path works because **ELK owns all geometry** — node placement,
compound sizing, and edge routing — from a correctly lowered compound graph, and
Mermaid only reads that geometry back and draws it. This repo inverted that: it
under-lowers the graph, then re-owns geometry afterward. The fix is to restore the
invariant, not to improve the post-processing.

## Goals

- Port Mermaid's **layout-only** cluster→ELK lowering into this repo's TypeScript,
  on top of the existing `elkjs` (`packages/graph-layout-elk` uses `elkjs@0.10.0`).
- Feed ELK a faithful compound graph: authored/native containers and blank-title
  ordering groups become ELK compounds with per-compound direction; edges attach
  at their lowest common ancestor; cross-cluster edges promote that ancestor to
  `INCLUDE_CHILDREN`.
- Consume ELK's final output **verbatim**: node rectangles and ELK `edge.sections`
  become the rendered geometry. The only permitted post-ELK geometry is the
  generic endpoint→node-border intersection trim.
- Style **thinly** on top of ELK-placed boxes: fill, stroke, typography, insets,
  annotation chrome, multi-line labels. No geometry ownership.
- Prove parity on the TLS fixture **and** a second structurally-different fixture,
  through the real product render path, with an image-level gate.

## Non-goals

- Do **not** add `@mermaid-js/layout-elk` or `mermaid` as a dependency (its public
  `render()` is a renderer coupled to Mermaid's `InternalHelpers` + live SVG DOM,
  not a layout boundary). See Options.
- Do **not** drop `elkjs` in favour of Mermaid's stack.
- Do **not** reintroduce Dagre (spec 074 retirement stands; the clean look is
  Mermaid's cluster wrapper, not Dagre's algorithm).
- Do **not** implement bespoke arrow routing. Arrow geometry comes from ELK.
- Do **not** implement Mermaid import here (spec 028 owns Mermaid→YAML). This spec
  only ports the lowering; keep the seam reusable for 028.

## Options considered

**Option A — depend on `@mermaid-js/layout-elk` and call it. Rejected.**
Its entry is `render(data4Layout, svg, InternalHelpers, { algorithm })`. It needs
Mermaid's `insertNode` / `insertCluster` / `insertEdge` / `labelHelper` and a live
SVG, measures nodes via `getBBox`, and draws Mermaid's flowchart DOM. Using it
means standing up Mermaid's renderer and restyling generated SVG — maximal
dependency surface, pins `elkjs@0.9.3`, and fights the brand renderer.

**Option B — drop `elkjs`, adopt Mermaid + layout-elk wholesale. Rejected.**
Inherits Mermaid's entire flowchart pipeline and reduces the typed frame model,
editor, overrides, and arrows-as-model to CSS-over-generated-SVG. A rewrite around
Mermaid, not a layout fix.

**Option C — port the layout algorithm into TS, keep `elkjs` + our renderer.
Chosen.** The portable core of `render.ts` is small and MIT: recursive compound
graph build (`isGroup`→compound, `parentId`→parent map), `buildSubgraphLayoutOptions`
(per-compound `elk.direction` + `SEPARATE_CHILDREN`), root `INCLUDE_CHILDREN` +
`considerModelOrder`, `find-common-ancestor` LCA edge attachment, one
`elk.layout()`, and position/section read-back to absolute. Mermaid's two coupling
points (measurement, drawing) are replaced by owners we already have
(`TextMeasureAdapter`; the frame renderer). `elkjs` stays at `0.10.0`; the option
skew vs `0.9.3` is low-risk and smoke-tested (see Risks).

## What the port must reproduce (from Mermaid `render.ts`, MIT)

Faithful pieces to port as **layout-only**:

1. **Compound graph build** — each container/subgraph becomes an ELK compound
   with `children`; each leaf an ELK node sized from measured label (via our
   `TextMeasureAdapter`, not `getBBox`). Build `parentById` / `childrenById`.
2. **Per-compound layout options** (`buildSubgraphLayoutOptions`): a directed
   subgraph sets `elk.direction` (from its `dir`), `elk.hierarchyHandling:
   SEPARATE_CHILDREN`, `spacing.baseValue`, and label placement.
3. **Root options**: `elk.hierarchyHandling: INCLUDE_CHILDREN`, root `elk.direction`,
   and `elk.layered.considerModelOrder.strategy` for input-order preservation —
   the **native** ordering mechanism. Do **not** re-add synthetic "ordering edges"
   (`ORDERING_EDGE_PREFIX`) as a model-order substitute; if native model order +
   hierarchy triggers an `elkjs` crash, root-cause it (option-value format,
   per-node placement, or a known `elkjs` workaround) rather than working around
   it with fabricated edges.
4. **Cross-cluster edge ownership** (`find-common-ancestor` + `addEdges`): for each
   edge, compute the LCA of source/target; attach the edge at that ancestor and set
   the ancestor to `INCLUDE_CHILDREN` so ELK routes across the hierarchy. Replace
   flat leaf-to-leaf `buildGraphEdges(...)`.
5. **Read-back**: convert ELK node x/y (relative to parent) to absolute via
   accumulated ancestor offset; adopt `edge.sections[0]` (`startPoint`,
   `bendPoints`, `endPoint`) as the arrow path, offset by the LCA ancestor.
6. **Only** allowed post-ELK geometry: endpoint→node-border intersection trim
   (`geometry.ts` `computeNodeIntersection` / `replaceEndpoint`), ported as a
   generic utility.

## Anti-mess guardrails (hard requirements)

These exist specifically to stop a re-implementer (human or agent) from
re-creating the 076 mess by redrawing around ELK.

- **G1 — ELK owns geometry.** After the final `elk.layout()`, node rectangles and
  edge paths are read, not recomputed. No pass may translate, resize, re-anchor,
  re-wrap, or re-order a node the ELK compound graph already placed. A configured
  layout profile may derive additional ELK input constraints and rerun ELK, but it
  must still render only the final ELK output.
- **G2 — No post-ELK box moving on this path.** `anchorSemanticDescendants`,
  `normalizeDirectedContainersFromSemantic`,
  `realignPlacedContainersToAuthoredLayout`, `wrapStructuralContainers`,
  `anchorSyntheticLayoutDescendants`, and `layoutAnnotationsBelow` must not run for
  cluster-lowered diagrams. Remove them from this path or gate them off; they may
  not be "improved."
- **G3 — No bespoke arrow routing.** Arrow geometry equals ELK `edge.sections`
  (plus the G-approved border trim). `clearElkRoutedGeometryForFrames` +
  local rerouting must not run for this path. Do not add waypoint heuristics.
- **G4 — Styling is thin and geometry-free.** The styling pass may set fill,
  stroke, border, typography, text lines, and read insets; it may not change x/y/w/h
  or arrow points.
- **G5 — Generic, not fixture-keyed.** The lowering is driven by cluster structure
  (`isGroup`, `parentId`, `dir`), never by this fixture's node ids. No branch may
  reference `tls_provider`, `octavia_k8s`, `traefik_*`, former carrier ids, etc.
- **G6 — Render-level gate only.** Closeout requires the actual product SVG plus a
  documented side-by-side vs the reference. Engine-resolution probes and
  geometry-snippet asserts are necessary-but-insufficient and cannot satisfy the
  gate alone.

## Functional requirements

- **FR-001** Port `find-common-ancestor` and the endpoint-border geometry as pure,
  unit-tested TS utilities in `packages/graph-layout-elk`.
- **FR-002** Build the ELK compound graph from the frame model with a parent map,
  per-compound direction, `SEPARATE_CHILDREN` on directed subgraphs, and
  `INCLUDE_CHILDREN` at the root, driven by structure only (G5).
- **FR-003** Lower edges via LCA attachment; promote the LCA compound to
  `INCLUDE_CHILDREN`; drop the flat leaf-to-leaf lowering.
- **FR-004** Preserve input order via native `elk.layered.considerModelOrder`;
  remove the synthetic ordering-edge workaround; if a crash recurs, root-cause and
  document it.
- **FR-005** Read node rects and ELK `edge.sections` back to absolute geometry and
  feed the existing renderer; apply only the generic border trim afterward.
- **FR-006** Delete/disable the post-ELK box-moving and arrow-clearing passes for
  cluster-lowered diagrams (G2, G3).
- **FR-007** Add a thin styling pass that restores annotation-class fill/stroke,
  typography, padding, and two-line labels on ELK-placed edge labels without
  touching geometry (G4). The TLS fixture's authored two-line arrow labels are
  correct; do not edit the YAML to hide render bugs.
- **FR-008** Keep the lowering reusable for spec 028 (Mermaid import → canonical
  YAML → this lowering); no import logic here.
- **FR-009** Rebuild the browser bundle after browser-surface changes and keep
  `check-browser-bundle-fresh` green.
- **FR-010** Support typed, opt-in authoring profiles under YAML `meta`: a
  `frame_roles` profile may synthesize explicit frame levels before style
  resolution, and a `layout_profiles.same_layer_compound_heights` profile may
  derive same-layer compound minimum heights as ELK input constraints. Both must be
  structure-driven and generic, never fixture-id keyed.
- **FR-011** Expose native ELK edge/order controls through the typed option
  registry so fan-out, hierarchy-edge merge, model-order, and edge-label geometry
  behavior are
  configurable (`mergeEdges`, `mergeHierarchyEdges`,
  `considerModelOrder.strategy`, `forceNodeModelOrder`, `edgeLabels.inline`,
  `edgeLabels.placement`, `spacing.edgeLabel`,
  `layered.edgeLabels.sideSelection`,
  `layered.edgeLabels.centerLabelPlacementStrategy`). Global defaults must stay
  safe for existing non-cluster diagrams; shape-specific defaults may apply only
  when the graph itself opts into border-routed cross-hierarchy edges, and YAML may
  still override them explicitly. Because product arrow labels are transparent
  annotation carriers, layered edge labels default to detached ELK placement; inline
  labels are an explicit opt-in for renderers that keep edge strokes from crossing
  label text.
- **FR-012** Keep layout-option discoverability explicit: every authorable option
  admitted by a graph-engine registry/YAML namespace must render in the preview
  layout-params UI with a reasonable default, label, group, description, bounds,
  and enum values. Official ELK options that are not admitted must be captured in
  an audit list with a reason (`implementation-owned`, `invalid for current graph
  model`, `unsafe default surface`, `unsupported by elkjs`, or `needs dedicated
  UI/validation`) so users and future agents do not have to fish for hidden knobs.

## Success criteria

- **SC-001 (render parity, TLS).** A repo-owned regression renders the **actual
  product SVG** for `tls-certificate-provider-topology` through the product
  render/export path and asserts: nested clusters as compound boxes; per-cluster
  direction (provider vertical, load-balancer compound horizontal); the three
  load-balancer endpoints on one horizontal row; the TLS certificate annotations
  are two-line **arrow labels**, not authored boxes; those labels use the
  annotation class contract instead of bespoke grey pills; no truncated label;
  labels are placed by ELK with detached label spacing so no arrow segment crosses
  an ELK-owned label box;
  repeated consumer arrows from the top provider fan out from one ELK-owned shared
  stem instead of separate rogue starts;
  the source/root provider compound is classified as a section while target/root
  service compounds are parents through configured role assignment; same-layer
  bottom-row compounds have matching final ELK heights when the layout profile is
  enabled; and every visible frame rectangle and semantic TLS edge label has
  matching raw ELK and product geometry. A documented side-by-side vs
  `01-source-mermaid-reference.png` is attached.
- **SC-002 (cold-start portability).** A **second, structurally different**
  clustered fixture (different row sizes / item counts, not derived from TLS)
  renders correctly through the same generic lowering with zero fixture-keyed code.
- **SC-003 (raw ELK is correct).** The raw-ELK view for the TLS fixture is itself
  structurally faithful (clusters, direction, ordered rows) — i.e. parity does not
  depend on any post-ELK pass. Assert no banned pass (G2/G3) executed for this
  diagram.
- **SC-004 (no geometry ownership after ELK).** An architectural test proves the
  cluster-lowered path does not call the G2/G3 functions and that rendered arrow
  points equal ELK sections.
- **SC-005 (validation).** `npm --prefix packages/graph-layout-elk test`,
  `npm --prefix packages/layout-engine test`, `npm --prefix apps/preview test`,
  `build:browser`, `check-browser-bundle-fresh`, `check_no_new_python`, and
  preview-shell size budgets all green.

## Closeout gate

077 cannot close without: SC-001 render regression green with an attached
side-by-side; SC-002 second-fixture proof; SC-003 raw-ELK correctness + banned-pass
assertion; SC-004 architectural ban test; SC-005 full validation. No snippet-only
or engine-resolution-only evidence satisfies the gate (G6).

## Risks and assumptions

- **elkjs skew.** Mermaid pins `0.9.3`; this repo uses `0.10.0`. The options used
  (`hierarchyHandling`, `direction`, `considerModelOrder`, `spacing.*`) are stable
  across those; smoke-test early and record any divergence. Do not upgrade/downgrade
  as a first move.
- **Model-order + hierarchy crash.** 076 hit an `elkjs` crash combining
  `INCLUDE_CHILDREN` with model order and dodged it with synthetic edges. This spec
  requires root-causing it. If genuinely unfixable at `0.10.0`, document the exact
  failure and choose a native ELK alternative (ports, per-row `SEPARATE_CHILDREN`),
  never a redraw.
- **Typed "ordering cluster".** Blank-title Mermaid subgraphs need a first-class
  "invisible ordering compound with local direction" in the frame model. Name it
  explicitly; it is a prerequisite, not a fixture hack.
- **Measurement parity.** Our `TextMeasureAdapter` replaces Mermaid's `getBBox`.
  Node sizes may differ slightly; the gate is visual parity, not pixel identity.
- **ELK option defaults.** Broadly enabling `mergeEdges` or forced model order can
  change unrelated non-cluster diagrams. Keep global defaults conservative and
  prefer typed, graph-shape defaults plus authorable YAML overrides over
  fixture-keyed route patches.
