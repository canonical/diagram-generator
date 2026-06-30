# Official Option Inventory

This file records the upstream-supported option surfaces for the preview's
built-in graph engines and the repo's decision about whether each option belongs
in the root-level aside.

Decision meanings:

- `Expose`: graph-scoped and product-appropriate for the root aside
- `Investigate`: documented candidate, but needs live proof or bridge work
- `Do not expose`: not appropriate for the root aside in the current product

## Source Set

- Dagre wiki: <https://github.com/dagrejs/dagre/wiki>
- Dagre 3.0.0 package source in this repo:
  `packages/graph-layout-dagre/node_modules/@dagrejs/dagre/dist/types/lib/types.d.ts`
- ELK algorithm pages:
  - Force: <https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-force.html>
  - Stress: <https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-stress.html>
  - Mr. Tree: <https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-mrtree.html>
  - Radial: <https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-radial.html>
- ELK option reference: <https://eclipse.dev/elk/reference/options.html>

## Repo Findings Before Implementation

- Dagre currently exposes only `rankdir`, `nodesep`, `ranksep`, and `edgesep`
  in `packages/graph-layout-dagre/src/dagre-param-registry.ts`.
- Dagre layout plumbing currently reads only those four keys in
  `packages/graph-layout-dagre/src/dagre-layout.ts`.
- ELK Force currently exposes `nodeNode`, `separateConnectedComponents`, and
  `randomSeed`.
- ELK Stress currently exposes `nodeNode` and `randomSeed`.
- ELK Mr. Tree currently exposes `direction` and `nodeNode`.
- ELK Radial currently exposes `nodeNode` only.
- The ELK bridge strips root `elk.padding` and `elk.portConstraints` in
  `packages/graph-layout-elk/src/elk-graph-builder.ts`, so those keys are
  implementation-owned today, not honest root-graph controls.

## Cross-Cutting Exclusion Rules

These options are not root-aside candidates in the current product even when the
upstream engine supports them:

- Node-scoped options such as `org.eclipse.elk.position`,
  `org.eclipse.elk.stress.fixed`, and `org.eclipse.elk.mrtree.positionConstraint`
- Edge-scoped options such as Dagre `weight`, Dagre `minlen`, and
  `org.eclipse.elk.force.repulsivePower`
- Options that only make sense when preview authors additional prerequisite
  state, such as Radial sort/translation options that depend on position data
- Implementation-owned ELK bridge keys such as `elk.padding` and
  `elk.portConstraints`

## Dagre

Official graph-level options from the Dagre wiki plus Dagre 3.0.0 package
source:

| Option | Decision | Reason |
|---|---|---|
| `dagre.rankdir` | `Expose` | Graph-scoped and already plumbed |
| `dagre.align` | `Expose` | Graph-scoped; documented in wiki |
| `dagre.nodesep` | `Expose` | Graph-scoped and already plumbed |
| `dagre.edgesep` | `Expose` | Graph-scoped and already plumbed |
| `dagre.ranksep` | `Expose` | Graph-scoped and already plumbed |
| `dagre.marginx` | `Expose` | Graph-scoped; missing from current repo plumbing |
| `dagre.marginy` | `Expose` | Graph-scoped; missing from current repo plumbing |
| `dagre.acyclicer` | `Expose` | Graph-scoped; useful for cyclic graphs |
| `dagre.ranker` | `Expose` | Graph-scoped; strongly affects overlap and ranking |
| `dagre.rankalign` | `Expose` | Present in Dagre 3.0.0 package source; graph-scoped |
| `dagre.minlen` | `Do not expose` | Edge-scoped, not a root-aside control |
| `dagre.weight` | `Do not expose` | Edge-scoped, not a root-aside control |
| `dagre.labelpos` | `Do not expose` | Edge-label scoped |
| `dagre.labeloffset` | `Do not expose` | Edge-label scoped |
| `disableOptimalOrderHeuristic` | `Do not expose` | Advanced layout API flag, not user-aside material |
| `constraints` / `customOrder` | `Do not expose` | Needs a typed authoring model, not free-form aside inputs |

## ELK Force

Official Force algorithm page supported options plus the ELK option reference:

| Option | Decision | Reason |
|---|---|---|
| `elk.spacing.nodeNode` | `Expose` | Documented force spacing control |
| `elk.randomSeed` | `Expose` | Documented force control |
| `elk.separateConnectedComponents` | `Expose` | Documented force control |
| `elk.force.model` | `Expose` | Core force behavior switch |
| `elk.force.iterations` | `Expose` | Core force convergence control |
| `elk.aspectRatio` | `Expose` | Graph-scoped and layout-affecting |
| `elk.force.repulsion` | `Expose` | Graph-scoped, but only when force model is `EADES` |
| `elk.force.temperature` | `Expose` | Graph-scoped, but only when force model is `FRUCHTERMAN_REINGOLD` |
| `elk.spacing.edgeNode` | `Do not expose` | Not supported by the local elkjs force metadata bundled in this repo |
| `elk.padding` | `Do not expose` | Implementation-owned by the ELK graph builder today |
| `elk.priority` | `Do not expose` | Semantics depend on nodes/edges, not an honest root slider |
| `elk.force.repulsivePower` | `Do not expose` | Applies to edges, not the root graph |
| `elk.interactive` / `elk.topdownLayout` family | `Do not expose` | Not the interaction model this preview authors |
| node-label / node-size / port-label options | `Do not expose` | Node-scoped or micro-layout scoped |

## ELK Stress

Official Stress algorithm page supported options:

| Option | Decision | Reason |
|---|---|---|
| `elk.stress.desiredEdgeLength` | `Expose` | Core stress spacing control |
| `elk.stress.iterationLimit` | `Expose` | Core convergence control |
| `elk.stress.dimension` | `Expose` | Graph-scoped stress control |
| `elk.stress.epsilon` | `Expose` | Graph-scoped termination control |
| `elk.spacing.nodeNode` | `Do not expose` | Not listed on the official stress algorithm page; current repo surface is suspect |
| `elk.randomSeed` | `Do not expose` | Not listed on the official stress algorithm page |
| `elk.stress.fixed` | `Do not expose` | Node-scoped |
| `elk.edgeLabels.inline` | `Expose` | Graph-scoped and supported by local elkjs stress metadata |
| node-label / node-size / port-label options | `Do not expose` | Node-scoped or micro-layout scoped |

## ELK Mr. Tree

Official Mr. Tree algorithm page supported options plus the ELK option
reference:

| Option | Decision | Reason |
|---|---|---|
| `elk.direction` | `Expose` | Core tree orientation control |
| `elk.spacing.nodeNode` | `Expose` | Core sibling spacing control |
| `elk.spacing.edgeNode` | `Expose` | Official option page marks it applicable; directly relevant to arrow clearance |
| `elk.mrtree.edgeRoutingMode` | `Expose` | Core tree routing behavior |
| `elk.mrtree.edgeEndTextureLength` | `Expose` | Algorithm-specific edge clearance / terminal styling control |
| `elk.mrtree.searchOrder` | `Expose` | Core spanning-tree construction control |
| `elk.separateConnectedComponents` | `Expose` | Graph-scoped and documented |
| `elk.aspectRatio` | `Expose` | Graph-scoped and supported by local elkjs metadata |
| `elk.mrtree.compaction` | `Expose` | Graph-scoped and supported by local elkjs metadata |
| `elk.mrtree.weighting` | `Expose` | Graph-scoped and supported by local elkjs metadata |
| `elk.padding` | `Do not expose` | Implementation-owned by the ELK graph builder today |
| `elk.priority` | `Do not expose` | Not a root-only semantic |
| `elk.mrtree.positionConstraint` | `Do not expose` | Node-scoped placement constraint |
| `interactive` / topdown family | `Do not expose` | Not the preview's authored interaction model |

## ELK Radial

Official Radial algorithm page supported options plus the ELK option reference:

| Option | Decision | Reason |
|---|---|---|
| `elk.spacing.nodeNode` | `Expose` | Root-scoped and supported by local elkjs radial metadata; UI label should stay honest about graph-level spacing behavior |
| `elk.spacing.edgeNode` | `Do not expose` | Not supported by the local elkjs radial metadata bundled in this repo |
| `elk.radial.centerOnRoot` | `Expose` | Graph-scoped and straightforward |
| `elk.radial.radius` | `Expose` | Graph-scoped radial spacing control |
| `elk.radial.rotate` | `Expose` | Graph-scoped and user-comprehensible |
| `elk.radial.rotation.targetAngle` | `Expose` | Graph-scoped, but only when rotate is enabled |
| `elk.radial.compactor` | `Expose` | Core radial compaction mode |
| `elk.radial.compactionStepSize` | `Expose` | Graph-scoped, but only when compaction is enabled |
| `elk.radial.wedgeCriteria` | `Expose` | Graph-scoped and supported by local elkjs metadata |
| `elk.radial.optimizationCriteria` | `Expose` | Graph-scoped and supported by local elkjs metadata |
| `elk.radial.sorter` | `Expose` | Graph-scoped and supported by local elkjs metadata |
| `elk.position` | `Do not expose` | Node-scoped prerequisite, not a root control |
| `elk.radial.orderId` | `Do not expose` | Node-scoped ordering hint |
| `elk.radial.rotation.computeAdditionalWedgeSpace` | `Expose` | Parent-scoped and supported, but UI copy must warn that docs recommend it only with top-down radial modes |
| `elk.radial.rotation.outgoingEdgeAngles` | `Expose` | Parent-scoped and supported, but UI copy must warn that docs recommend it only with top-down radial modes |

## ELK Rectpacking

Local elkjs metadata plus the Rectpacking algorithm page support these
root-scoped options:

| Option | Decision | Reason |
|---|---|---|
| `elk.spacing.nodeNode` | `Expose` | Root-scoped spacing control |
| `elk.aspectRatio` | `Expose` | Core width-approximation target |
| `elk.rectpacking.trybox` | `Expose` | Root-scoped algorithm toggle |
| `elk.rectpacking.orderBySize` | `Expose` | Root-scoped preprocessing toggle |
| `elk.rectpacking.widthApproximation.strategy` | `Expose` | Core phase-one control |
| `elk.rectpacking.widthApproximation.targetWidth` | `Expose` | Root-scoped when using target-width approximation |
| `elk.rectpacking.widthApproximation.optimizationGoal` | `Expose` | Core width-approximation selector |
| `elk.rectpacking.widthApproximation.lastPlaceShift` | `Expose` | Root-scoped width-approximation toggle |
| `elk.rectpacking.packing.strategy` | `Expose` | Core packing-phase selector |
| `elk.rectpacking.packing.compaction.rowHeightReevaluation` | `Expose` | Root-scoped packing compaction toggle |
| `elk.rectpacking.packing.compaction.iterations` | `Expose` | Root-scoped packing compaction count |
| `elk.rectpacking.whiteSpaceElimination.strategy` | `Expose` | Root-scoped whitespace elimination selector |
| `elk.rectpacking.currentPosition` | `Do not expose` | Node-scoped |
| `elk.rectpacking.desiredPosition` | `Do not expose` | Node-scoped |
| `elk.rectpacking.inNewRow` | `Do not expose` | Node-scoped |

## Immediate Gaps This Spec Must Resolve

- Dagre is missing graph-level controls that the official docs and package
  source already support.
- `elk-stress` is surfacing controls that are not on the official stress
  algorithm page.
- `elk-radial` lacks a trustworthy spacing/clearance surface for arrow
  visibility.
- The repo has no single typed source of truth that says why a graph-engine
  option is or is not allowed in the root aside.

## Reconciliation After Implementation

- Dagre now exposes and plumbs the full approved graph-scoped inventory:
  `rankdir`, `align`, `acyclicer`, `ranker`, `rankalign`, `nodesep`,
  `ranksep`, `edgesep`, `marginx`, and `marginy`.
- Non-layered ELK engines now expose audited per-algorithm registries instead
  of ad hoc control arrays, and preview-engine manifest tests assert that the
  surfaced keys match those registries exactly.
- `elk-stress` no longer surfaces undocumented `elk.spacing.nodeNode` or
  `elk.randomSeed` controls.
- Implementation-owned bridge keys such as `elk.padding` and
  `elk.portConstraints` remain absent from the author-facing engine manifests.
- Radial `elk.spacing.nodeNode` is retained, but the UI label/copy is corrected
  to describe graph-wide radial spacing rather than a sibling-only local gap.
- Remaining proof caveat:
  every surfaced option is now either registered, plumbed, and inventory-backed
  or dependency-gated, and representative runtime effect proofs now exist for
  Force, Stress, Mr. Tree, Radial, and Rectpacking. Closeout should still keep
  distinguishing "forwarded correctly" from
  "behaviorally proven" where the upstream runtime is subtle.
