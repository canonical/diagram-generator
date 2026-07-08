# Tasks: Spec 077 — Mermaid ELK cluster lowering port

**Spec**: [`spec.md`](./spec.md) · **Plan**: [`plan.md`](./plan.md)
**Branch**: `feat/077-mermaid-elk-cluster-lowering-port`

> Executor rules (read every session):
> - **ELK owns geometry.** After `elk.layout()` you read node rects and ELK
>   `edge.sections`; you never move a box or re-route an arrow. Any task that needs
>   a post-ELK translate/resize/re-anchor/re-order is wrong — stop and re-read
>   spec.md guardrails G1–G6.
> - Port **layout only** from Mermaid `render.ts` (MIT). Do not port Mermaid SVG,
>   do not add `@mermaid-js/layout-elk` or `mermaid` as a dependency.
> - Structure-driven, never fixture-keyed (G5). No `tls_*` / `traefik_*` ids in code.
> - No new behaviour-heavy `scripts/preview/*.js`. TypeScript-first.
> - Do not mark a phase done on snippet/probe evidence. Parity claims need a real
>   product-render check (G6).
> - Fixture hygiene: never write back to `scripts/diagrams/frames/*.yaml`; use
>   sanitized temp copies or hash guards.

## Phase 0 — Portable utilities (no product wiring yet)

- [ ] **T000** Port `find-common-ancestor` into
      `packages/graph-layout-elk/src/find-common-ancestor.ts` (verbatim MIT logic:
      `parentById`/`childrenById`, self-edge and root fallbacks).
      **Verify**: unit tests for sibling, ancestor, cross-branch, self, and
      missing-parent cases.
      **Evidence**: `packages/graph-layout-elk/tests/find-common-ancestor.test.ts`.
- [ ] **T001** Port the endpoint→node-border intersection trim from Mermaid
      `geometry.ts` (`computeNodeIntersection`, `replaceEndpoint`, `outsideNode`)
      as a pure utility. This is the ONLY sanctioned post-ELK geometry.
      **Verify**: unit tests trimming a point to a rect border on each side.
      **Evidence**: `packages/graph-layout-elk/tests/edge-endpoint-trim.test.ts`.

## Phase 1 — Compound graph build (structure-driven)

- [ ] **T010** Extend `packages/graph-layout-elk/src/elk-graph-builder.ts` to emit
      a compound ELK graph from the frame model: every container / blank-title
      ordering subgraph → ELK compound with `children`; leaves → ELK nodes sized
      from the measured label via the existing `TextMeasureAdapter` (not `getBBox`).
      Build `parentById` / `childrenById`.
      **Verify**: builder test — nesting depth, parent map, and leaf sizes match a
      hand-authored fixture; no fixture ids referenced (G5).
      **Evidence**: `packages/graph-layout-elk/tests/elk-compound-build.test.ts`.
- [ ] **T011** Introduce the typed "invisible ordering cluster" concept (compound
      with no chrome + a local direction) to represent Mermaid blank-title
      subgraphs. Name it in the frame model; drive it from structure.
      **Verify**: an ordering cluster lays out its children in local direction and
      renders no chrome.
      **Evidence**: model unit test + builder test.
- [ ] **T012** Port `buildSubgraphLayoutOptions`: per-compound `elk.direction`
      (from `dir`), `elk.hierarchyHandling: SEPARATE_CHILDREN` on directed
      subgraphs, `spacing.baseValue`, label placement; root gets
      `INCLUDE_CHILDREN` + `elk.direction` + `elk.layered.considerModelOrder`.
      **Verify**: option snapshot per compound/root matches the ported contract.
      **Evidence**: `packages/graph-layout-elk/tests/elk-layout-options.test.ts`.

## Phase 2 — Edge LCA lowering (replace flat leaf-to-leaf)

- [ ] **T020** Replace the flat `buildGraphEdges(...)` lowering: resolve each
      arrow's real source/target node ids, compute the LCA via T000, attach the
      edge at that ancestor, and promote the ancestor compound to
      `INCLUDE_CHILDREN`. Keep edge labels sized via the adapter.
      **Verify**: a cross-cluster edge attaches at the correct ancestor and that
      ancestor is `INCLUDE_CHILDREN`; an intra-cluster edge stays local.
      **Evidence**: `packages/graph-layout-elk/tests/elk-edge-lca.test.ts`.
- [ ] **T021** Preserve input order with **native**
      `elk.layered.considerModelOrder`. Remove the synthetic ordering-edge
      workaround (`ORDERING_EDGE_PREFIX` and `isOrderingEdgeId`). If native model
      order + hierarchy re-triggers the `elkjs` crash, root-cause it (option-value
      format / per-node placement / known `elkjs` fix) and record the finding.
      **Verify**: ordered rows keep input order; no synthetic edges in the graph;
      crash (if any) is documented with the actual resolution.
      **Evidence**: ordering test + `evidence/elkjs-modelorder-crash.md`.

## Phase 3 — Read-back and delete post-ELK ownership

- [ ] **T030** Read ELK output back verbatim in
      `packages/layout-engine/src/elk-layout.ts`: node x/y (relative) → absolute via
      accumulated ancestor offset; adopt `edge.sections[0]`
      (`startPoint`/`bendPoints`/`endPoint`) as the arrow path, offset by the LCA
      ancestor; apply only the T001 border trim.
      **Verify**: rendered node rects and arrow points equal ELK output (+ trim) on
      a hand fixture.
      **Evidence**: `packages/layout-engine/tests/elk-readback.test.ts`.
- [ ] **T031** Delete/gate the post-ELK geometry passes for cluster-lowered
      diagrams: `anchorSemanticDescendants`,
      `normalizeDirectedContainersFromSemantic`,
      `realignPlacedContainersToAuthoredLayout`, `wrapStructuralContainers`,
      `anchorSyntheticLayoutDescendants`, `layoutAnnotationsBelow`, and the
      `clearElkRoutedGeometryForFrames` + local rerouting fallback (G2, G3).
      **Verify**: none of these run for the TLS fixture; other fixtures that still
      need legacy behaviour are unaffected (gate by cluster-lowered flag, not by id).
      **Evidence**: architectural test (SC-004) + existing fidelity suites green.

## Phase 4 — Thin styling (no geometry)

- [ ] **T040** Add a geometry-free styling pass over ELK-placed boxes: annotation
      grey chrome + `border: none`, both label lines for two-line annotation
      leaves, fill/stroke/typography, insets read (not set). Must not change
      x/y/w/h or arrow points (G4).
      **Verify**: annotation leaves render grey with both lines; disabling the pass
      changes only paint, never geometry.
      **Evidence**: render test asserting geometry identical with styling on/off.

## Phase 5 — Gate: real render + cold-start portability

- [ ] **T050** SC-001 render regression: produce the **actual product SVG** for
      `tls-certificate-provider-topology` through the product render/export path and
      assert nested clusters, per-cluster direction, one endpoint row, two-line grey
      annotations, no truncation, and arrow points == ELK sections. Attach a
      documented side-by-side vs `images/01-source-mermaid-reference.png`.
      **Evidence**: repo-owned render test + updated in-repo render image.
- [ ] **T051** SC-002 cold-start fixture: author a second, structurally different
      clustered fixture (different row sizes / counts, not TLS-derived) and prove it
      renders correctly through the same generic lowering with zero fixture-keyed
      code.
      **Evidence**: second fixture + render test.
- [ ] **T052** SC-003 raw-ELK correctness: assert the raw-ELK view for the TLS
      fixture is itself structurally faithful and that no G2/G3 pass executed.
      **Evidence**: raw-ELK assertion test.
- [ ] **T053** SC-004 architectural ban test: the cluster-lowered path does not call
      the G2/G3 functions; rendered arrow points equal ELK sections.
      **Evidence**: static/architectural test.
- [ ] **T054** SC-005 full validation:
      `npm --prefix packages/graph-layout-elk test`;
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;
      `npm --prefix packages/layout-engine run build:browser`;
      `node scripts/check-browser-bundle-fresh.mjs`;
      `node scripts/check_no_new_python.mjs`;
      `node scripts/check-preview-shell-size-budgets.mjs`.
      **Evidence**: command transcript summary in this package.

## Done-when (closeout)

Guardrails G1–G6 hold, SC-001..SC-005 pass, the second cold-start fixture proves
portability, the raw-ELK view is correct on its own, and no post-ELK box-moving or
bespoke arrow routing survives on the cluster-lowered path. Then archive this
package and record the reuse seam for spec 028; spec 076 stays retired.
