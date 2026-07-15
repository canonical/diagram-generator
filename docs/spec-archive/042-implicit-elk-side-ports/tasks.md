# Tasks: Implicit ELK side ports

**Input**: Design documents from `/specs/042-implicit-elk-side-ports/`

**Prerequisites**: `spec.md`, `plan.md`

## Phase 1: Graph IR and builder

- [x] T001 Extend `packages/graph-layout-core/src/graph-ir.ts` with optional node-owned ports plus optional `sourcePort` / `targetPort` edge refs
- [x] T002 Re-export the new IR types from `packages/graph-layout-core/src/index.ts` without breaking non-port callers
- [x] T003 Keep the output contract centered on native ELK sections and labels rather than inventing a second route model
- [x] T004 Add focused IR/builder tests for stable port ids, side metadata, and endpoint references

## Phase 2: Native ELK port modeling

- [x] T010 Add eligible-node detection and four midpoint side ports in `packages/graph-layout-elk/src/elk-graph-builder.ts`
- [x] T011 Use native ELK edge-port refs when the chosen layered-plus-port setup requires them
- [x] T012 Evaluate supported ELK options for shared-source fan-out or merged stems; enable only if compatible with the chosen layered-plus-port setup
- [x] T013 If no compatible native ELK option exists, keep default ELK behavior instead of adding a TypeScript fan-out pass
- [x] T014 Document the intentional first-slice limit: one logical port per side and no custom same-side lane policy
- [x] T015 Keep headed and icon-bearing compounds ELK-compatible by treating heading chrome as decorative container padding instead of a fallback trigger or graph-participating node, while flattening bidirectional external-traffic carriers that would otherwise force ELK boundary detours

## Phase 3: Thin render-path authority

- [x] T020 Ensure `packages/graph-layout-elk/src/result-normalizer.ts` preserves native ELK sections and labels without synthetic rerouting
- [x] T021 Ensure `packages/layout-engine/src/elk-layout.ts` forwards ELK-managed arrow geometry directly
- [x] T022 Remove or bypass secondary route rewriting for ELK-managed arrows in `packages/layout-engine/src/arrow-routing.ts`
- [x] T023 Audit `scripts/preview/layout-bridge.js` so arrowheads derive from the final ELK segment without preview-only route repair
- [x] T024 Ensure ELK-managed edge labels remain authoritative and no post-layout pass creates route-over-label collisions

## Phase 4: Preview control and persistence audit

- [x] T030 Remove `elk.portConstraints` from `packages/graph-layout-elk/src/elk-param-registry.ts`
- [x] T031 Ensure legacy `meta.elk.elk.portConstraints` values do not override fixed-side generated-port behavior and are scrubbed on save
- [x] T032 Update preview control coverage in `packages/layout-engine/tests/preview-engine-registry.test.ts`
- [x] T033 Add preview persistence coverage for stale `elk.portConstraints` cleanup

## Phase 5: Regression validation

- [x] T040 Extend `packages/graph-layout-elk/tests/elk-layered.test.ts` with builder-level native-port and endpoint-ref coverage
- [x] T041 Reuse the existing ELK corpus fixtures for `juju-bootstrap-machines-process` and `ubuntu-pro-wsl-deployment` to verify native side attachment
- [x] T042 Add one `packages/layout-engine/tests/elk-layout.test.ts` regression proving rendered paths and arrowhead-bearing final segments follow ELK output on a real frame diagram
- [x] T042a Add regression coverage for headed compounds staying native ELK while headings/icons remain decorative chrome
- [x] T043 Run `npm --prefix packages/graph-layout-elk test`
- [x] T044 Run `npm --prefix packages/layout-engine run build:browser`
- [x] T045 Run `npm --prefix packages/layout-engine test`
- [x] T046 Run `npm --prefix apps/preview test`
- [x] T047 Run `node scripts/check_no_new_python.mjs`

## Phase 6: Adversarial review

- [x] T050 Review architecture drift: shared IR size, builder-owned port synthesis, render-path thinness, YAML authority, spec 006 overlap
- [x] T051 Review behavior risks: compound endpoint leakage, unsupported shared-fan-out expectations, inert legacy YAML keys, and duplicate preview rendering logic
