# Tasks: Spec 076 Port Mermaid's cluster/ELK lowering

**Input**: `specs/076-tls-mermaid-cold-start-fit/spec.md`
**Plan**: `specs/076-tls-mermaid-cold-start-fit/plan.md`
**Branch**: `feat/076-tls-mermaid-cold-start-fit`
**Review**: `docs/spec-reviews/076-tls-mermaid-cold-start-fit.md` (Opus: reject Dagre)

## Phase 0: Prove the diagnosis (blocking spike, evidence not prose)

- [x] T000 Confirm the portability finding independently: in
      `../mermaid/node_modules/@mermaid-js/layout-elk`, verify MIT license,
      `elkjs` dependency, and that the core builds a compound ELK graph
      (`children`, parent map, per-cluster `layoutOptions`/`elk.direction`).
- [x] T001 Hand-author a compound ELK input graph for the TLS fixture: each
      authored cluster (`provider_stack`, `services_row`, `openstack_services`,
      `load_balancers`, and the blank-title ordering rows) as an ELK compound
      node with local `elk.direction`, padding/insets, and ordered children.
- [x] T002 Render that hand-authored graph through the existing `elkjs` path and
      compare against `images/01-source-mermaid-reference.png`.
- [x] T003 [P] Strategy C oracle: render
      `references/tls-certificate-provider-topology.mmd` in the sibling
      `../mermaid/` harness with `config.layout: elk` and capture its ELK
      cluster geometry as a cross-check for T002.
- [x] T004 Record the T0 result in the spec: if T002 matches, proceed to the
      Strategy B port; if not, document the exact residual (direction mixing,
      ordered rows, cross-cluster routing) and escalate to a dedicated cluster
      pass. Do not reintroduce Dagre either way.

T0 result on 2026-07-06: FAIL. `tmp/elk-cluster-spike.mts` now proves a stable
compound ELK graph can preserve the top cluster, the overall top-down fanout,
and the left-to-right services row, but it still misses two reference-critical
properties: `openstack_relation_row` settles below `octavia_k8s` instead of
above it, and `load_balancer_endpoint_row` reorders the leaves as
`traefik-rgw`, `traefik-public`, `traefik` instead of the reference order.
Reintroducing ELK model-order options on this nested cross-hierarchy graph
reopens an internal `elkjs` crash (`FEc ... Cannot read properties of
undefined`). A first raw `render.mjs` pass on the draft `.mmd` was discarded as
an invalid oracle because it lacked `defaultRenderer: elk`. The corrected sibling
Mermaid ELK oracle is `node ../mermaid/restyle.mjs ... --export-only`, producing
`tmp/mermaid-tls-elk-restyled.svg` / `tmp/mermaid-tls-elk-restyled.png`; it also
fails to reproduce the reference ordering, so the current evidence blocks
Phase 2 and escalates to a dedicated cluster / ordering follow-up rather than a
direct Strategy B port.

Opus review on 2026-07-07 sharpens that outcome: do **not** pivot to Dagre.
The next bounded spike must test ELK ordering directly (ordering rows only,
`SEPARATE_CHILDREN`, cross-cluster routing via containers/ports) and root-cause
the `elkjs` hierarchy + model-order crash before any scope change.

## Phase 1: Study the portable lowering

- [ ] T010 Read the MIT `@mermaid-js/layout-elk` graph-building step
      (`dist/chunks/.../render-*.mjs`): how `clusterDb` / `parentLookupDb` build
      the parent map, how subgraphs become `children`, which `elk.*` options are
      set per node/cluster, and how positions are read back.
- [ ] T011 Map Mermaid's `LayoutData` cluster concepts onto this repo's frame
      model: authored container -> ELK compound, blank-title ordering subgraph ->
      invisible ordering compound, leaf -> ELK node, per-subgraph direction ->
      per-compound `elk.direction`.
- [ ] T012 Inventory the compound machinery already present in
      `packages/layout-engine/src/elk-layout.ts` (`collectNativeCompoundIds`,
      `isElkCompound`, `compoundNeedsElkChildLayout`) and decide reuse vs. extend.

## Phase 2: Port into the typed ELK lowering (Strategy B)

- [ ] T020 Add a cluster-preserving lowering in `packages/graph-layout-elk` /
      `packages/layout-engine`: authored clusters -> ELK compound nodes with a
      parent map, per-cluster direction, insets, and ordered children (no
      fill-carrier flattening).
- [ ] T021 Introduce the typed concept the current model lacks: an invisible
      "ordering cluster" (a compound with no chrome and a local direction) to
      represent Mermaid blank-title subgraphs.
- [ ] T022 Read ELK positions back into frame geometry through the existing
      position read-back path; keep our own renderer (do not port Mermaid SVG).
- [ ] T023 Keep the lowering generic (FR-009): drive it from cluster structure,
      not from this fixture's ids, so spec 028 import can reuse it.
- [ ] T024 Retire the fixture's fill-carrier blockers (`provider_stack`,
      `services_row`, `load_balancer_endpoint_row`) in favour of compound
      clusters, or lower them as compounds, so `elk-layered` receives a cluster
      graph.
- [ ] T025 After browser-surface changes, rebuild the bundle
      (`npm --prefix packages/layout-engine run build:browser`) and confirm
      `check-browser-bundle-fresh`.

## Phase 3: Prove it on the fixture (evidence bar)

- [ ] T030 Add a repo-owned compatibility regression: the TLS fixture becomes
      `elk-layered`-compatible under the new lowering (update the probe in
      `packages/layout-engine/tests/preview-engine-*`).
- [ ] T031 Add a geometry regression asserting the core cluster/ordering/direction
      expectations (cluster nesting, per-cluster direction, ordered endpoint rows)
      on this fixture.
- [ ] T032 Confirm `elk-force` remains the wrong family here and is not claimed.
- [ ] T033 Update the compatibility owner in
      `packages/layout-engine/src/preview-engine/registry.ts` only once T030/T031
      pass.

## Phase 4: Docs, generalization, closeout

- [ ] T040 Record the T0 evidence and the chosen strategy in the spec and review.
- [ ] T041 Note the reuse seam for spec 028 (Mermaid import -> canonical YAML ->
      cluster ELK lowering) without implementing 028 import here.
- [ ] T042 Keep the cold-start asset pack and portability finding stable and
      referenceable from `../mermaid/`.
- [ ] T043 Run validation: `npm --prefix packages/layout-engine test`,
      `npm --prefix apps/preview test`, `node scripts/check_no_new_python.mjs`,
      `build:browser`, `check-browser-bundle-fresh`.
- [ ] T044 Closeout gate: T0 spike recorded, Strategy B ported generically,
      fixture compatibility + geometry regressions green, no Dagre, no new
      behaviour-heavy `scripts/preview/*.js`.

## Closeout gate

- T0 spike proves a compound ELK graph reproduces the reference before any
  lowering code lands.
- Mermaid's cluster->ELK lowering approach is ported (Strategy B), MIT-clean, and
  reuses `elkjs` — no Mermaid SVG/runtime dependency, no Dagre.
- The TLS fixture is `elk-layered`-compatible with fixture-owned compatibility +
  geometry regressions.
- The lowering is generic enough for spec 028 to reuse.

## Deferred follow-up

- Mermaid `.mmd` text parsing to canonical YAML stays spec 028; this spec only
  supplies the reusable cluster->ELK lowering it will consume.
- Any broader engine policy change beyond clustered flowcharts is its own spec.
