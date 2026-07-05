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
| Radial tree / hub-and-spoke layout | Hub-and-spoke concept maps and selected rooted hierarchy views | Current engine inventory includes `elk-radial`; UX taxonomy's mindmap and concept-map shapes imply cases where radial symmetry is the intended reading order. | Radial structure is not interchangeable with force when concentric depth rings are the message. |
| Rectangle packing | Dense grouped frame collections and compact bounded deployments | Current engine inventory includes `elk-rectpacking`; its compatibility surface is explicitly limited to `deployment_and_runtime_topology`. | Packing solves dense enclosure layout without depending on directed edges; it is a distinct capability from layered or force. |
| Relationship / data-model graph | `data_model_and_relationships` | Reviewed-corpus ontology contains 14 such diagrams; UX taxonomy explicitly calls out ER diagrams, entity tables, and crow's-foot links. | The corpus proves the need is real; the remaining decision is whether this should stay under the chosen organic force implementation or graduate to a separate data-model-specific backend. |

## Immediate implications for the inventory pass

- `dagre` and `elk-layered` are both candidates for the same layered /
  Sugiyama slot.
- `elk-mrtree` and the repo's mindmap/tree-shaped owners are candidates for the
  same tree slot.
- `force`, `elk-force`, and `elk-stress` overlap around organic relationship
  layout and need an explicit keep/retire split.
- `sequence`, `state machine`, `vertical stack`, and `grid / matrix` remain
  distinct until evidence proves otherwise.

## Migration discipline

To be filled in Phase 4. Replacement of one implementation by another is a
migration, not a silent swap: persisted engine ids, engine-specific overrides,
and geometry expectations need an explicit persist -> reload proof.
