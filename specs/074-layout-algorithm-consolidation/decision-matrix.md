# Decision Matrix: Spec 074 Layout algorithm consolidation

## Evidence base

This matrix is derived from the scoped planning-repo evidence named in
`tasks.md`, not from the current engine list:

- `diagram-generator-planning/docs/taxonomy/stakeholder-models/ux-diagram-categories-2026-06-08.{md,json}`
- `diagram-generator-planning/docs/taxonomy/crosswalks/ux-to-canonical-families.md`
- `diagram-generator-planning/docs/taxonomy/ontology/diagram-ontology.reviewed-corpus.v0.ttl`
- `diagram-generator-planning/docs/audit/layout_mapping.py`
- `diagram-generator-planning/docs/audit/human-readable-categories.md`
- `diagram-generator-planning/docs/audit/layout-benchmark-corpus/top30-manifest.json`

### Benchmark distribution snapshots

Top-30 benchmark corpus by canonical diagram type:

| Diagram type | Count |
|--------------|------:|
| `deployment_and_runtime_topology` | 13 |
| `data_flow_and_integration` | 5 |
| `system_architecture` | 4 |
| `concept_and_relationship_mapping` | 3 |
| `process_and_workflow` | 2 |
| `state_and_lifecycle` | 2 |
| `infrastructure_and_network_topology` | 1 |

Top-30 benchmark corpus by preferred layout engine:

| Preferred engine | Count |
|------------------|------:|
| `ELK layered` | 20 |
| `ELK force` | 8 |
| `State machine` | 2 |

Reviewed-corpus ontology by canonical diagram type:

| Diagram type | Count |
|--------------|------:|
| `data_flow_and_integration` | 37 |
| `infrastructure_and_network_topology` | 37 |
| `system_architecture` | 21 |
| `process_and_workflow` | 18 |
| `data_model_and_relationships` | 14 |
| `layered_stack` | 8 |
| `interaction_and_sequence` | 7 |
| `state_and_lifecycle` | 7 |

## Required algorithms (corpus-derived)

This section satisfies T002's requirement to enumerate the algorithms the
audited diagrams actually need, justified by the taxonomy/corpus rather than by
the current engine set.

| Required algorithm | Diagram types needing it | Evidence | Why it is distinct |
|--------------------|--------------------------|----------|--------------------|
| Layered / Sugiyama directed graph | `deployment_and_runtime_topology`, `process_and_workflow`, `data_flow_and_integration` | `layout_mapping.py` maps all three to `ELK_LAYERED`; these three families dominate both the top-30 benchmark and the reviewed corpus. UX terms: Flowcharts, BPMN, Data Flow, Deployment. | Needs direction-aware, branch-friendly layout with routed edges, group boundaries, and deterministic top-down/left-right reading. |
| Organic force-directed graph | `system_architecture`, `infrastructure_and_network_topology`, `concept_and_relationship_mapping`, likely part of `data_model_and_relationships` | `layout_mapping.py` maps architecture/network/concept families to `ELK_FORCE`; top-30 benchmark prefers `ELK force` for architecture-heavy examples. UX terms: System Architecture, Cloud Architecture, Network, Mindmaps. | Needs non-linear, cluster-friendly placement when rigid rank layers are the wrong visual grammar. |
| State-machine layout | `state_and_lifecycle` | `layout_mapping.py` maps this family to `STATE_MACHINE`; top-30 benchmark has two state-machine picks and the UX taxonomy explicitly calls out state nodes, transitions, and composite states. | Temporal lifecycle/state transition diagrams have semantics and glyph rules that are not interchangeable with generic directed graphs. |
| Sequence / lifeline timeline | `interaction_and_sequence` | `layout_mapping.py` maps this family to `SEQUENCE`; UX taxonomy explicitly calls out lifelines, activation bars, and directed messages. | Sequence layout is a specialized temporal grammar with lane/lifeline ownership, not a generic graph algorithm. |
| Vertical stack / layered containment | `layered_stack` | `layout_mapping.py` maps this family to `VERTICAL_STACK`; reviewed-corpus ontology contains eight `layered_stack` diagrams. | Pure stacks often need no edge-routing at all; this is closer to structured composition than graph solving. |
| Grid / matrix comparison layout | `matrix_and_comparison` | `layout_mapping.py` maps this family to `GRID_MATRIX`; human-readable category review explicitly treats side-by-side comparison boards as a stable family/form. | Requires row/column alignment and comparison-board composition rather than graph routing. |
| Tree layout | Mindmaps / rooted hierarchy cases inside `concept_and_relationship_mapping`, plus explicit tree-shaped frame diagrams | UX taxonomy names Mindmaps with root/sub-branch/leaf structure; current preview inventory ships both `elk-mrtree` and mindmap/tree-shaped owners, which is a duplication signal to resolve. | Rooted hierarchies benefit from dedicated tree ordering rather than general force or layered heuristics. |
| Relationship / data-model graph | `data_model_and_relationships` | Reviewed-corpus ontology contains 14 such diagrams; UX taxonomy explicitly calls out ER diagrams, entity tables, and crow's-foot links. | The corpus proves the need is real; the remaining decision is whether this should stay under the chosen organic force implementation or graduate to a separate data-model-specific backend. |

### Inventory-backed candidate lanes not yet justified as corpus-required

These lanes still ship in the current product inventory, so they stay in the
survey and engine-verdict sections below. They are **not** counted as FR-001
required algorithms until planning-repo evidence proves audited corpus demand.

| Candidate lane | Current inventory signal | Current status |
|----------------|--------------------------|----------------|
| Radial tree / hub-and-spoke layout | `elk-radial` is a current lane, and the UX taxonomy language around mindmaps / concept maps suggests a possible fit. | Keep the lane under evaluation, but do not cite it as corpus-required until audited examples or mapping evidence exist. |
| Rectangle packing | `elk-rectpacking` is a current lane, and its compatibility surface is intentionally narrowed to specific deployment/grouping cases. | Keep the lane under evaluation, but do not cite it as corpus-required until audited examples or mapping evidence exist. |

## Immediate implications for the inventory pass

- `dagre` and `elk-layered` are both candidates for the same layered /
  Sugiyama slot.
- `elk-mrtree` and the repo's mindmap/tree-shaped owners are candidates for the
  same tree slot.
- `force`, `elk-force`, and `elk-stress` overlap around organic relationship
  layout and need an explicit keep/retire split.
- `sequence`, `state machine`, `vertical stack`, and `grid / matrix` remain
  distinct until evidence proves otherwise.

## Current implementation inventory (T010)

Determinism below means "same input and same option set produce the same layout
result in the current repo implementation." For interactive force simulation,
the saved simulation state still matters after user-driven ticks or drags.

### Graph-layout package inventory

| Package | Role in the current stack | External dependency / licence | Maintenance signal | Bundle-cost signal |
|---------|----------------------------|-------------------------------|--------------------|--------------------|
| `graph-layout-core` | Engine-agnostic IR and capability contract only; not a layout backend by itself. | No external runtime dep declared; package is repo-private and has no explicit SPDX field in `package.json`. | Maintained in-tree with the layout-engine TypeScript path. | Low incremental cost; contract/types only. |
| `graph-layout-elk` | Shared adapter package for `elk-layered`, `elk-force`, `elk-stress`, `elk-mrtree`, `elk-radial`, and `elk-rectpacking`. | `elkjs ^0.10.0`; npm metadata for `elkjs@0.10.0`: licence `EPL-2.0`, repo `github.com/kieler/elkjs`, modified `2026-03-03`. | Active upstream package signal as of the npm metadata above; all six in-repo ELK engines ride this one backend. | High shared cost: `elkjs@0.10.0` unpacked size `7,915,096` bytes across `12` files. Cost is amortized across all ELK engine ids. |
| `graph-layout-dagre` | Adapter package for the single `dagre` preview engine. | `@dagrejs/dagre ^3.0.0` plus `@dagrejs/graphlib 4.0.1`; npm metadata: both `MIT`, Dagre modified `2026-03-22`, Graphlib modified `2026-03-08`. | Active upstream package signal from recent npm metadata, but this repo only uses it for one engine lane. | Medium dedicated cost: Dagre unpacked size `1,186,652` bytes + Graphlib `460,659` bytes. |

### Repo-owned/native preview engines

| Engine id | Algorithm class | Ports / compounds / routing / direction | Determinism | Licence / bundle cost |
|-----------|-----------------|------------------------------------------|-------------|-----------------------|
| `v3` | Native frame-diagram autolayout / structured containment composition | No explicit graph-port contract. Strong compound/nesting support through the authored frame tree. Orthogonal arrow routing is part of the native frame layout path. No global direction selector; flow follows frame structure and authored overrides. | Strong. Repo-owned deterministic TypeScript layout path with no randomness surfaced in the implementation chain. | Repo-owned only; no extra external backend beyond `@diagram-generator/layout-engine`. Lowest incremental backend cost. |
| `force` | Repo-owned force-directed simulation | No explicit ports. No nested compound-node contract. Edge routing is simulation-style organic geometry rather than orthogonal graph routing. Direction is not a first-class control. | Medium. The solver seeds its own LCG (`lcg()` in `force-solver.ts`), so cold starts are repeatable, but persisted simulation state and interactive ticks become part of the saved result. | Repo-owned only; no extra external backend package. Low external cost, but it keeps a separate non-graph runtime alive in the product. |
| `sequence` | Sequence / lifeline timeline layout | Ports are implicit in participant centers rather than explicit graph ports. Supports sequence groups/notes, not graph compounds. Message edges are straight timeline connectors. Direction is fixed by the grammar: participants left-to-right, time top-to-bottom. | Strong. `layoutSequenceDiagram()` is a pure arithmetic pass over the authored sequence payload. | Repo-owned only; no extra external backend package. Low incremental backend cost. |
| `mindmap-tree` | Lite rooted-tree renderer used as a foreign-shaped install proof | No explicit ports, no compounds, simple line connectors, and a fixed root-top/children-below direction. It is not a general graph backend. | Strong. The renderer is a fixed SVG composition over `root` + `children`. | Repo-owned only; no extra external backend package. Low cost, but capability is intentionally skeletal. |

### Graph-backed preview engines

| Engine id | Algorithm class | Ports / compounds / routing / direction | Determinism | Licence / bundle cost |
|-----------|-----------------|------------------------------------------|-------------|-----------------------|
| `dagre` | Layered / Sugiyama directed graph | Directions `TB/LR/BT/RL`; honors direction hints. Requires input sizes and returns placed sizes. No explicit ports, no side/point anchors, no measured edge-label boxes, no compound nesting/padding. Routed edge polylines come from Dagre point lists. | Strong for identical input/options; no randomness is surfaced in the adapter. | MIT backend (`@dagrejs/dagre` + `@dagrejs/graphlib`) with a medium dedicated package footprint. |
| `elk-layered` | Layered / Sugiyama directed graph | Directions `TB/LR/BT/RL`; honors direction hints. Requires input sizes and returns placed sizes. Supports explicit ports, side anchors, point anchors, implicit endpoint ports, measured edge-label boxes, nested compounds, and padding insets. Uses ELK routing plus a second pass that chooses relationship-aware port refs. | Strong. Same input/options produce the same ELK run; no random seed is involved in the in-repo layered path. | EPL-2.0 shared ELK backend; high shared cost but reused by all ELK algorithms. |
| `elk-force` | Organic force-directed graph | Directions are accepted but not semantically honored (`honorsDirectionHints: false`). No explicit ports, no measured edge labels, no compound nesting/padding. Organic routed edges come from ELK normalization rather than orthogonal routing. | Strong in repo configuration: the adapter forces `elk.randomSeed = 0`. | EPL-2.0 shared ELK backend; high shared cost amortized across all ELK lanes. |
| `elk-stress` | Stress-majorization relationship graph | Same capability surface as the other non-layered ELK descriptors: directions listed but not semantically honored, no ports, no compounds, no measured edge labels. Positioned for relationship graphs rather than strict hierarchy. | Medium-strong. The adapter exposes no explicit random seed, so determinism depends on ELK stress itself rather than a repo-pinned seed. | EPL-2.0 shared ELK backend; no new external package beyond `elkjs`. |
| `elk-mrtree` | Rooted tree layout | Directions `TB/LR/BT/RL`; honors direction hints. No explicit ports or compounds. Tree-specific edge-routing options are surfaced (`elk.mrtree.edgeRoutingMode`, compaction, search order, weighting). | Strong for identical input/options; tree direction can be pinned via `elk.direction`. | EPL-2.0 shared ELK backend; no additional external package beyond `elkjs`. |
| `elk-radial` | Radial tree / hub-and-spoke layout | Directions are listed but not semantically honored by the capability descriptor. No explicit ports or compounds. Radial-specific spacing, rotation, compaction, and wedge criteria are surfaced. Compatibility currently requires a tree-shaped input. | Strong for identical input/options; no repo-added randomness. | EPL-2.0 shared ELK backend; no additional external package beyond `elkjs`. |
| `elk-rectpacking` | Rectangle packing / bounded dense grouping | Directions are listed for manifest parity but not semantically honored. No explicit ports or compounds. Exposes packing-, compaction-, and whitespace-specific controls rather than graph-routing richness. Compatibility is intentionally narrowed to `deployment_and_runtime_topology`. | Strong for identical input/options; no repo-added randomness. | EPL-2.0 shared ELK backend; no additional external package beyond `elkjs`. |

## Explicit duplicate flags (T011)

These are overlap flags from the current in-repo inventory, not the final
keep/retire verdicts from Phase 3.

| Suspected duplicate set | Shared algorithm class | Evidence from the inventory | Distinctive delta that still needs the Phase 3 verdict |
|-------------------------|------------------------|-----------------------------|--------------------------------------------------------|
| `dagre` vs `elk-layered` | Layered / Sugiyama directed graph | Both expose the same directional layered slot (`TB/LR/BT/RL`) and serve frame-diagram graphs with at least one arrow. | `elk-layered` already exceeds Dagre on ports, compounds, padding insets, measured edge labels, and relationship-aware port refinement. Phase 3 only needs to confirm no missing Dagre-only user capability remains. |
| `mindmap-tree` vs `elk-mrtree` | Rooted tree layout | Both target rooted-tree shapes with top-down/left-right style directionality. | `mindmap-tree` is a skeletal proof renderer for `mindmap-lite`, while `elk-mrtree` is the real graph backend with routing/ordering controls. Phase 3 needs to decide whether the lite proof stays as a non-comparable install proof or counts as a duplicate tree engine. |
| `force` vs `elk-force` vs `elk-stress` | Organic relationship layout | All three occupy the non-layered "organic graph" space used for architecture/concept/relationship diagrams. | The repo-owned `force` path is an interactive simulation owner, `elk-force` is a seeded ELK force layout backend, and `elk-stress` is stress-majorization with its own option surface. Phase 3 must decide whether stress is distinct enough to keep and whether the legacy `force` runtime is a product requirement or just a duplicate backend family. |

## Candidate survey and chosen implementations (T020/T021)

This table includes the two current inventory-backed lanes above. Their rows are
product decisions about already-shipping engines, not additional FR-001
evidence claims.

| Required algorithm | Candidates evaluated | Chosen implementation | Criteria-based rationale | Downstream spec / sequencing |
|--------------------|----------------------|-----------------------|--------------------------|------------------------------|
| Layered / Sugiyama directed graph | `elk-layered`, `dagre`, Graphviz `dot` via `@viz-js/viz`, Mermaid flowchart, D2 layered default | `elk-layered` | Best current balance of capability and migration cost. It already ships in-repo, shares the ELK backend we pay for elsewhere, and is the only current candidate in this stack that combines direction hints, explicit ports, measured edge labels, nested compounds, padding insets, and routed-edge refinement. Graphviz `dot` remains the strongest external challenger on maturity, but it would add another heavyweight backend and migration burden. Mermaid and D2 are whole diagram DSL toolchains, not attractive drop-in layout backends for this repo. | `T040` in this spec removes Dagre. Keep a future Graphviz challenge spec only if benchmark evidence exposes an ELK-layered gap. |
| Organic force-directed graph | `elk-force`, repo `force`, `elk-stress`, `d3-force`, Cytoscape, WebCola | `elk-force` | The corpus already maps architecture/network/concept families to ELK force, and the repo pins determinism with `elk.randomSeed = 0`. It rides the shared ELK backend instead of preserving the bespoke `force-spec` workflow, and it demands less custom routing/integration work than `d3-force` or WebCola. Cytoscape is active but heavy and UI-centric for a headless layout role. | Create a downstream force-convergence spec that migrates `force-spec` onto the shared graph-engine path and retires the legacy `force` runtime. |
| State-machine layout | `elk-layered`, Graphviz `dot`, Mermaid state diagrams, D2 | `elk-layered` under a state-machine-specific schema/render layer | State-machine diagrams need distinct node/edge semantics, but the surveyed backends do not justify a separate layout engine today. `elk-layered` already has the compound-node, direction, and routing surface needed for composite-state graphs. Graphviz `dot` is the main alternate candidate, but its extra backend cost is hard to justify before a corpus benchmark shows an ELK failure. Mermaid and D2 again skew toward end-to-end DSL tooling, not reusable backend integration. | Name a downstream "state-machine schema + ELK layered lane" spec rather than introducing a second layered backend. |
| Sequence / lifeline timeline | Repo-native `sequence`; Mermaid sequence as the nearest external comparator | Repo-native `sequence` | This is grammar-specific layout, not generic graph solving. The current TypeScript implementation is deterministic, small, and directly aligned with the repo's sequence document schema. Pulling Mermaid in would import a much larger end-to-end toolchain without solving a missing backend problem. | No backend-swap spec required. Keep sequence on the repo-native path. |
| Vertical stack / layered containment | Repo-native `v3`; generic graph backends were considered and rejected as the wrong abstraction | Repo-native `v3` structured compositor | Vertical stacks are authored composition more than graph solving. The current native frame autolayout already owns containment, spacing, and orthogonal arrows without importing another backend. | Future spec 073 follow-up may split this into an explicit "stack" node type, but it should stay on the native TS path. |
| Grid / matrix comparison layout | Repo-native `v3`; generic graph backends were considered and rejected as the wrong abstraction | Repo-native `v3` structured compositor | Comparison boards want row/column alignment, not graph routing. The current native path is the right owner until there is evidence for a dedicated matrix compositor. | Future spec 073 follow-up may split this into an explicit "matrix" node type, but it should stay on the native TS path. |
| Tree layout | `elk-mrtree`, `mindmap-tree`, `d3-hierarchy` tree/cluster | `elk-mrtree` | `elk-mrtree` is the only surveyed current candidate that already fits the shared graph IR, honors direction hints, and exposes tree-specific routing/ordering controls. `d3-hierarchy` is lighter but would require new routing and product integration. `mindmap-tree` is too skeletal to count as the long-term backend. | Create a downstream spec to remove `mindmap-tree` from the product algorithm set while preserving any install-proof coverage it still provides. |
| Radial tree / hub-and-spoke layout | `elk-radial`, `d3-hierarchy` radial tree/cluster | `elk-radial` (provisional keep) | The shared ELK backend cost is already paid, and `elk-radial` exposes rotation/compaction controls that the plain d3 hierarchy projection does not. Keep it as the stronger current implementation for this lane, but do not treat the lane itself as corpus-required until audited examples are cited. | No extra port spec needed today; keep the current engine and re-evaluate when audited radial corpus evidence arrives. |
| Rectangle packing | `elk-rectpacking`, d3 treemap-style packing, Graphviz packing family | `elk-rectpacking` (provisional keep) | `elk-rectpacking` is the only current candidate already integrated into the frame-diagram graph path with packing-specific controls. Treemap-style d3 layouts solve a different area-encoding problem, and another Graphviz-backed port would add backend cost without proven corpus demand. | Keep the current lane narrowly scoped, and re-evaluate once audited packing-specific corpus evidence exists. |
| Relationship / data-model graph | `elk-force`, `elk-stress`, Cytoscape, WebCola, Graphviz `dot` | `elk-force` (same backend as the organic graph slot) | The corpus proves the diagram family exists, but the current survey does not prove a separate backend should survive for it. `elk-stress` exposes too little extra capability over `elk-force` to justify a second organic backend today, while Cytoscape/WebCola would add new integration or UI weight. The standing decision is: keep one organic backend until a benchmark shows otherwise. | Name a downstream "relationship-graph benchmark gate" spec only if future corpus runs show ELK force failing dense ER-style examples. |

## Current engine verdicts (T022)

| Current engine | Verdict | Why | Downstream spec / implementation note |
|----------------|---------|-----|---------------------------------------|
| `v3` | Keep | Current owner for native structured frame autolayout, vertical stacks, and matrix-style composition. | Future spec 073 follow-up may split its roles into explicit node types without changing the backend family. |
| `force` | Retire (downstream) | Duplicate organic-layout family plus a bespoke `force-spec` workflow that conflicts with the shared-engine direction in the architecture doc. | Downstream force-convergence spec: migrate persisted `force-spec` documents onto the chosen shared graph-engine path before removing the legacy runtime. |
| `sequence` | Keep | Distinct timeline grammar with no better surveyed backend. | No follow-up beyond ordinary sequence maintenance. |
| `mindmap-tree` | Retire from the product algorithm set; keep only as a temporary install-proof fixture if still needed | Too skeletal to remain a first-class tree backend once `elk-mrtree` is the chosen tree implementation. | Downstream install-proof decoupling spec: move foreign-shaped proof coverage off the product engine registry if possible. |
| `dagre` | Retire in this spec | Less-capable duplicate of `elk-layered`; the removal was already decided before the survey. | `T040` in this spec: remove the engine, migrate persisted Dagre diagrams, and land a persist -> reload proof. |
| `elk-layered` | Keep | Winning layered/state-machine backend. | Benchmark Graphviz only if a concrete ELK-layered gap appears. |
| `elk-force` | Keep | Winning organic graph backend. | Also absorbs relationship/data-model graphs unless a later benchmark proves a separate need. |
| `elk-stress` | Retire (downstream unless later evidence overturns it) | Current survey does not show enough distinct capability over `elk-force` to justify keeping two organic ELK backends. | Downstream organic-backend cleanup spec, unless a relationship-graph benchmark revives a distinct stress-majorization lane. |
| `elk-mrtree` | Keep | Winning rooted-tree backend. | Downstream work is only the cleanup of `mindmap-tree`, not replacement of `elk-mrtree`. |
| `elk-radial` | Keep (inventory-backed, not yet corpus-proven) | Strongest current implementation for the existing radial lane, but the audited corpus evidence is not yet sufficient to count that lane as FR-001 required. | Revisit when audited radial examples are added to the planning evidence. |
| `elk-rectpacking` | Keep (inventory-backed, not yet corpus-proven) | Strongest current implementation for the existing packing lane, but the audited corpus evidence is not yet sufficient to count that lane as FR-001 required. | Revisit when audited packing-specific examples are added to the planning evidence. |

## Backend-swap migration discipline (T030)

Replacement of one implementation by another is a migration, not a silent swap.
Saved diagrams persist engine ids, engine-scoped overrides, and geometry
expectations. The required discipline is:

1. Persisted `layout_engine` ids are stable contracts. Do not silently reinterpret
   a saved id as a different backend. Add an explicit upgrader or alias path,
   and remove the old engine only after the migration proof exists.
2. Engine-specific overrides stay namespaced until translated. A swap must either
   preserve the old override namespace for compatibility reads or convert it via
   a tested mapping into the new backend's namespace.
3. Every retire needs a repo-owned persist -> reload proof. The proof must start
   from a fixture saved against the retired backend, apply the migration path,
   reload through the preview host, and assert the new engine id plus a stable
   post-migration render/layout result.
4. Geometry changes are expected and must be made explicit. When the chosen
   replacement produces different deterministic geometry, treat that as a
   versioned migration with updated snapshots/fixtures, not as a transparent
   background default flip.
5. Removal happens last. Keep the old engine install path or compatibility shim
   in place until the migration fixture, persistence tests, and green suites
   prove that saved documents no longer depend on the retired runtime.

## Downstream spec queue (T031)

The matrix implies these follow-on specs after the Dagre removal in this spec:

| Proposed downstream spec | Why it exists |
|--------------------------|---------------|
| Force convergence and legacy `force-spec` retirement | Migrate the bespoke force workflow onto the chosen shared graph-engine path and remove the duplicate repo-owned force backend. |
| Mindmap install-proof decoupling | Preserve the foreign-shaped install proof without keeping `mindmap-tree` as a product algorithm lane. |
| State-machine schema + render lane on `elk-layered` | Add the state-machine-specific document/input/render semantics while reusing the chosen layered backend. |
| Organic-backend cleanup / `elk-stress` benchmark gate | Either remove `elk-stress` as a duplicate or preserve it only if benchmark evidence proves a distinct relationship-graph win. |
| Graphviz challenge benchmark (only if needed) | Re-open the layered/state-machine backend choice only if a corpus-backed benchmark exposes a concrete ELK-layered deficiency. |
