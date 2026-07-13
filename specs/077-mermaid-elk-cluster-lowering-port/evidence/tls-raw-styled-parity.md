# TLS raw ELK / styled product parity

Date: 2026-07-10
Branch: `feat/077-mermaid-elk-cluster-lowering-port`

## Evidence files

- Reference image: `evidence/reference/01-source-mermaid-reference.png`
- Raw ELK SVG: `evidence/render/tls-certificate-provider-topology.raw-elk.svg`
- Product SVG: `evidence/render/tls-certificate-provider-topology.product.svg`
- Product PNG: `evidence/render/tls-certificate-provider-topology.product.png`

## Product-path facts

The app-path state builder for `tls-certificate-provider-topology` now emits:

- Root children: `tls_provider`, `openstack_services`, `load_balancers`
- Frame roles are synthesized by `meta.frame_roles.strategy:
  root-edge-source-section-target-parent`; the TLS provider root compound is a
  section and the lower service compounds are parents without fixture-keyed code
- `meta.layout_profiles.same_layer_compound_heights: true` feeds equal
  same-layer compound minimum heights back into a second ELK pass, so raw ELK and
  product SVG both have equal-height lower compounds
- TLS pins native ELK fan-out/order options in YAML:
  `elk.layered.mergeEdges: true`, `elk.layered.mergeHierarchyEdges: true`,
  `elk.layered.considerModelOrder.strategy: NODES_AND_EDGES`, and
  `elk.layered.crossingMinimization.forceNodeModelOrder: true`
- TLS also pins readable ELK edge-label geometry options in YAML:
  `elk.edgeLabels.inline: false`, `elk.edgeLabels.placement: CENTER`,
  `elk.spacing.edgeLabel: 8`,
  `elk.layered.edgeLabels.sideSelection: SMART_DOWN`, and
  `elk.layered.edgeLabels.centerLabelPlacementStrategy: SPACE_EFFICIENT_LAYER`.
  These are typed layered controls; the graph IR still carries engine-agnostic
  measured label boxes, and the ELK adapter attaches per-label inline/placement
  options before invoking ELK.
- Authored/product arrows: `edge-0` through `edge-6` only
- Raw ELK input edges: `edge-0` through `edge-6` only
- Removed from the authored tree and raw/product parity: `services_row`,
  `load_balancer_endpoint_row`, `helper-order-*`, cert/interface leaf boxes

Every TLS edge has raw ELK sections. The six consumer labels are ELK label boxes
with two-line text (`certificates\ninterface: tls-certificates`,
`amphora-issuing-ca\ninterface: tls-certificates`,
`amphora-controller-cert\ninterface: tls-certificates`) and product SVG renders
the same x/y/width/height using annotation-class transparent/no-stroke label
carriers with left-aligned `#666666` text.

The styled layer changes fill/stroke/font presentation only. It does not create
alternate label placement or fallback routes for this fixture.

The product SVG frame rectangles now have zero x/y/width/height delta from the
raw ELK node tree for `tls_provider`, `vault_charm`, `manual_tls_certificates`,
`openstack_services`, `octavia_k8s`, `load_balancers`, and the three `traefik_*`
endpoints.

The six consumer arrows from `manual_tls_certificates` now share the same
ELK-owned source stem in raw ELK and in the styled product path. In the current
evidence render, product `edge-1` through `edge-6` begin at
`[824,304] -> [824,320] -> [824,328]`, and the raw ELK SVG contains the matching
common vertical stem from the source-side border before fanning out.

The product regression now also checks that no rendered arrow segment crosses the
interior of an ELK-owned label rectangle. This deliberately avoids the alternate
renderer-background workaround: labels stay transparent/no-stroke annotation
carriers, and ELK owns their detached placement.

## Validation

- `npm --prefix packages/graph-layout-elk test`
- `npm --prefix packages/layout-engine test -- frame-role-assignment.test.ts elk-layout-architecture.test.ts elk-readback.test.ts elk-layout.test.ts app-arrow-render.test.ts render-ir-parity.test.ts`
- `npm --prefix packages/layout-engine test -- frame-class-contract-drift.test.ts`
- `npm --prefix packages/layout-engine test -- level-promotion-corpus.test.ts frame-role-assignment.test.ts elk-layout.test.ts elk-layout-architecture.test.ts frame-class-contract-drift.test.ts`
- `npm --prefix packages/layout-engine run build`
- `npm --prefix packages/layout-engine run build:browser`
- `node --import tsx --test src/persistence/tls-render-regression.test.ts src/persistence/tls-browser-parity-regression.test.ts` (from `apps/preview`)
- `npm --prefix packages/graph-layout-elk test -- elk-layout-options.test.ts elk-clustered-layout.test.ts`
- `npm --prefix packages/graph-layout-elk test -- elk-layout-options.test.ts elk-layered.test.ts elk-clustered-layout.test.ts engine-capabilities.test.ts`
- `npm --prefix packages/layout-engine test -- elk-layout.test.ts frame-style.test.ts frame-role-assignment.test.ts`
- `npm --prefix packages/layout-engine test -- elk-layout.test.ts elk-layout-architecture.test.ts frame-style.test.ts frame-role-assignment.test.ts`
- `npm --prefix apps/preview test -- tls-render-regression.test.ts tls-browser-parity-regression.test.ts`
- `node scripts/check-browser-bundle-fresh.mjs`
- `node scripts/check_no_new_python.mjs`
- `node scripts/check-preview-shell-size-budgets.mjs`
- `git diff --check` (passes; Git reports line-ending warnings only)

Known unrelated blocker for full `npm --prefix packages/layout-engine test`:
`export-frame-drawio.test.ts` still fails on
`ai-infra-production-contract.drawio` because the working tree already contains a
dirty `specs/077-yaml-drawio-export/golden/ai-infra-production-contract.drawio`
golden mismatch. The full preview app suite is also currently 167/168 because
`editor-live-repaint-regression.test.ts` expects two blank ELK option fields that
the current registry omits; the focused TLS preview tests above are 2/2 green.
