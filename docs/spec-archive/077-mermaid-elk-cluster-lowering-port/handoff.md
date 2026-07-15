# Implementation handoff — spec 077 (read this before writing code)

Audience: the implementer (GPT). Reviewer: Opus. This is the durable per-spec
entry point for **where to start, what to keep, what to rewrite**. The numbered
work is in [`tasks.md`](./tasks.md); the rationale is in [`spec.md`](./spec.md).

## 0. Cold-start orientation

- Read [`spec.md`](./spec.md) (problem, options, guardrails G1–G6) and
  [`plan.md`](./plan.md) (owner boundaries + a line-referenced map from Mermaid
  source into this repo), then this file, then start Phase 0 in `tasks.md`.
- Why 076 failed (do not repeat): post-mortem in
  [`../../spec-reviews/076-tls-mermaid-cold-start-fit.md`](../../spec-reviews/076-tls-mermaid-cold-start-fit.md).
  Short version: it never used Mermaid's algorithm, lowered cross-cluster edges
  flat, then **owned geometry after ELK** (box-moving + local arrow rerouting) and
  closed on non-rendering snippet asserts. The raw-ELK view is structurally wrong,
  so nothing cold-starts.
- The one invariant to internalize: **ELK owns geometry; the product styles thinly
  on top and never moves a box or reroutes an arrow after layout.** Also recorded
  as a permanent rule in `AGENTS.md` → Core rules.

## 1. Branch: off `main`, not the 076 branch

Branch off `main`. Do **not** continue on `feat/076-tls-mermaid-cold-start-fit`.
The mess 077 rewrites (`buildGraphEdges` flat lowering, the post-ELK box-moving
passes, the synthetic `ORDERING_EDGE_PREFIX` edges) is **already merged to main**,
so this is a rewrite-in-place regardless of branch. The 076 branch only adds
+286 more lines of box-moving on top (throwaway).

`main` is an ancestor of `feat/076`, so the good 076 files can be taken wholesale
with no conflicts:

```bash
git fetch origin
git switch -c feat/077-mermaid-elk-cluster-lowering-port main

# 077 spec package (committed on feat/076 as da889e7) + the cold-start wiring +
# the salvage files. feat/076 is strictly ahead of main, so these are safe.
git checkout feat/076-tls-mermaid-cold-start-fit -- \
  docs/spec-archive/077-mermaid-elk-cluster-lowering-port/ \
  AGENT-INBOX.md TODO.md docs/specs.md \
  scripts/diagrams/frames/tls-certificate-provider-topology.yaml \
  packages/layout-engine/src/resolve-styles.ts \
  packages/layout-engine/src/diagram-author/normalize-lines.ts \
  packages/layout-engine/src/frame-record-parser.ts \
  packages/layout-engine/src/frame-serialize.ts \
  packages/layout-engine/tests/resolve-styles.test.ts \
  packages/layout-engine/tests/frame-serialize.test.ts \
  packages/layout-engine/tests/diagram-author-lower.test.ts \
  apps/preview/src/persistence/tls-render-regression.test.ts \
  apps/preview/src/persistence/tls-browser-parity-regression.test.ts

git add -A && git commit -m "spec(077): bootstrap branch (spec + salvage + wiring)"
```

Do **not** take `packages/layout-engine/src/elk-layout.ts` or
`packages/layout-engine/tests/elk-layout.test.ts` from 076 — start from main's and
rewrite (Section 3).

## 2. What to keep (salvaged above — geometry-free, genuinely useful)

Update from the 2026-07-10 review pass: the temporary 13-edge cert/interface-node
fixture is superseded. The durable TLS fixture is the three-compound,
seven-semantic-edge model: `tls_provider`, `openstack_services`, and
`load_balancers` are direct root children; the TLS certificate annotations are ELK
arrow labels, not authored boxes. The raw ELK SVG and product SVG evidence must
match visible frame and label geometry; styling may only change fill/stroke/font
presentation, and arrow labels must use the annotation class contract rather than
renderer-local grey pills or centered label boxes.

Update from the configured-profile pass: TLS now opts into
`meta.frame_roles.strategy: root-edge-source-section-target-parent` instead of
hardcoded compound levels, and into
`meta.layout_profiles.same_layer_compound_heights: true` instead of a graph-local
height patch. Both profiles are generic and structure-driven. Role assignment runs
before style resolution and may synthesize explicit levels only when the YAML opts
in. Same-layer compound heights are converted into ELK input minimum heights and
then ELK is rerun; the renderer still reads final ELK geometry verbatim.
Role-derived styling must remain centralized: section/parent fill, stroke, and
heading weight come from frame classes via `resolveStyles`, not from ELK-cluster
helpers mutating `resolved*` fields after layout. Preview inspector variant
inference must also use semantic `level` as the role authority; raw default
`fill`/`border` fields are not allowed to make synthesized sections/parents show
as Annotation in the dropdown.

Update from the fan-out pass: common-source TLS consumer arrows are handled with
native ELK configuration, not a path rewrite. The typed ELK option registry now
exposes `elk.layered.mergeEdges`, `elk.layered.mergeHierarchyEdges`,
`elk.layered.considerModelOrder.strategy`, and
`elk.layered.crossingMinimization.forceNodeModelOrder`. The global `mergeEdges`
default remains false because it can change unrelated non-cluster fan-out
geometry; the layered graph lane enables it by default only for graphs that opt
into border-routed cross-hierarchy edges, and YAML can still override it. The TLS
fixture pins the intended options under `meta.elk`/`meta.elk_nodes.elk-layered`,
so raw ELK and product SVG both show one shared stem from
`manual_tls_certificates` before the consumer arrows fan out.

Update from the 2026-07-10 edge-label overlap fix: Mermaid uses inline labels
because its renderer can hide the edge under the label. This product renderer uses
transparent annotation labels, so inline labels make arrow strokes cross text.
Layered edge labels now default to detached placement
(`elk.edgeLabels.inline: false`) and expose documented ELK controls for label
spacing, side selection, and center-label layer strategy. The TLS YAML pins those
controls explicitly. The core graph IR and layout-engine app path stay
engine-agnostic: they provide measured label boxes; ELK-specific label options
belong in `packages/graph-layout-elk/`.

| File(s) | Why keep | Treat as |
|---|---|---|
| `tls-certificate-provider-topology.yaml` | Three compound topology with seven semantic labeled edges; no cert/interface boxes, carrier rows, or helper arrows | Keep (this is your fixture) |
| `resolve-styles.ts` (+test) | Keeps authored grey fill for annotation leaves | Keep (feeds FR-007 thin styling) |
| `normalize-lines.ts`, `frame-record-parser.ts` | Render a `key: value` map line (e.g. `interface: tls-certificates`) as the second annotation line | Keep (fixes dropped second line; geometry-free) |
| `frame-serialize.ts` (+test) | Preserves `justify` through serialize/browser transport | Keep (pre-ELK authoring hint) |
| `tls-render-regression.test.ts`, `tls-browser-parity-regression.test.ts` | Real product-render tests | Keep as **scaffolds, then rewrite assertions** to the SC-001 bar — they encode the box-moved output today and *should* fail once the lowering is fixed |

## 3. What to rewrite (in main's `packages/layout-engine/src/elk-layout.ts`)

Keep the compound-detection machinery (`collectNativeCompoundIds`, `isElkCompound`,
`compoundNeedsElkChildLayout`), text measurement via `TextMeasureAdapter`, and the
ELK invocation plumbing. Rewrite / delete:

- `buildGraphEdges(...)` flat leaf-to-leaf → LCA edge attachment; promote the LCA
  compound to `INCLUDE_CHILDREN` (T020, built in `elk-graph-builder.ts`).
- `ORDERING_EDGE_PREFIX` / `isOrderingEdgeId` synthetic ordering edges → delete;
  use native `elk.layered.considerModelOrder`. If the model-order+hierarchy
  `elkjs` crash recurs, root-cause it and record it — do not re-add fabricated
  edges (T021).
- `clearElkRoutedGeometryForFrames(...)` + local arrow rerouting → delete; arrow
  paths come from ELK `edge.sections` verbatim + the Phase-0 border trim (T030).
- Post-ELK box-moving stack → delete or gate off for cluster-lowered diagrams:
  `anchorSemanticDescendants`, `normalizeDirectedContainersFromSemantic`,
  `realignPlacedContainersToAuthoredLayout`, `wrapStructuralContainers` (×2),
  `anchorSyntheticLayoutDescendants` (×2), `layoutAnnotationsBelow` (T031). Gate by
  a cluster-lowered flag, never by node id.

Mermaid source to port (layout only; ignore its SVG/`insertNode`/`insertCluster`
drawing):
`H:\WSL_dev_projects\mermaid-js-monorepo\packages\mermaid-layout-elk\src\render.ts`
+ `find-common-ancestor.ts` + `geometry.ts` (MIT). Do **not** add
`@mermaid-js/layout-elk` or `mermaid` as a dependency — its `render()` is a Mermaid
renderer, not a layout boundary.

## 4. Hard rules — the PR is rejected if any is violated (spec G1–G6)

- ELK owns geometry: after `elk.layout()` you read node rects and `edge.sections`;
  never translate/resize/re-anchor/re-order/re-route.
- If a configured layout profile needs derived constraints, feed those constraints
  back into ELK and render the final ELK result; never patch the final graph.
- No bespoke arrow routing: arrow points == ELK sections (+ generic border trim).
- No bespoke role styling: ELK may place frames, but frame-class styling still
  comes from `resolveStyles`; do not patch `resolvedFill`, `resolvedStroke`, or
  heading weights in the cluster path.
- No preview-role drift: the inspector's variant dropdown must report the same
  semantic role that drives rendering, even when that role was synthesized by a
  configured profile instead of authored as raw fill/border YAML.
- No fan-out path surgery: if a shared stem is needed, use typed ELK options
  (`mergeEdges` / hierarchy merge / model-order controls) or a generic graph-shape
  default, never a post-ELK path rewrite or fixture id branch.
- No edge strokes through transparent annotation labels: layered ELK labels are
  detached by default with typed spacing/side/layer controls. Inline labels are
  allowed only when a diagram explicitly opts in and the renderer can keep text
  legible.
- Structure-driven, never fixture-keyed: no `tls_*` / `traefik_*` / `octavia_*`
  literals anywhere in `packages/`.
- Styling is thin and geometry-free: fill/stroke/typography/label-lines only.
- Render-level gate: no closing on engine-resolution probes or geometry-snippet
  asserts. SC-001 renders the actual product SVG with a side-by-side vs
  `images/01-source-mermaid-reference.png`.
- If a spec point is ambiguous, STOP and ask; do not invent scope.

## 5. What Opus will check at review

SC-001 render regression green + attached side-by-side; SC-002 a second,
**non-TLS** clustered fixture proving cold-start with zero fixture-keyed code;
SC-003 the **raw-ELK view is itself correct** (parity does not depend on any
deleted pass); SC-004 an architectural test that the banned functions do not run
and rendered arrow points equal ELK sections; SC-005 full validation. The diff will
be grepped for any surviving post-ELK geometry mutation and any `tls_`/`traefik_`
literal in `packages/`.
