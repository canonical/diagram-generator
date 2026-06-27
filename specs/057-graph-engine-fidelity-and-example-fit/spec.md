# Spec 057: Graph Engine Fidelity And Example Fit

**Feature Branch**: `feat/057-graph-engine-fidelity-and-example-fit`  
**Status**: In Progress  
**Created**: 2026-06-27

## Problem

Some graph-layout engines are available on documents where the result is
structurally misleading or semantically incomplete.

The inbox reports cluster into one product risk:

- ELK fill behavior can diverge from the expected parent-direction semantics
- some ELK-family outputs appear to strand or drop nodes from their intended
  compound/parent relationship
- some examples appear to expose engines that are technically selectable but are
  poor fits for the authored structure

This is not just UI filtering. The repo needs a clearer contract for what it
means for an engine to be a good fit for a given example and a testable bar for
semantic fidelity once an engine is exposed.

## Goals

- Tighten the compatibility and example-fit contract for graph engines.
- Ensure ELK-family fill semantics match intended parent-direction behavior.
- Catch compound/container child-placement regressions where nodes appear
  visually dropped, stranded, or detached from expected parents.
- Distinguish true YAML issues from engine-translation or render glitches.

## Non-goals

- No redesign of engine tab UI; that belongs to spec 055.
- No generic addition of new engine families.
- No per-example special-case lists as the primary solution.

## Grouped Inbox Notes

- `support-engineering-flow` exposes `elk-rectpacking` but the result appears
  wrong enough to question compatibility.
- In ELK, setting selected items to `FILL` does not make them fill in the
  parent direction for `tiered-network-architecture.author-v1`.
- ELK algorithms can visually drop items such as `az1`, `az2`, `az3` in
  `mongo-octavia-ha`.

## Functional Requirements

- **FR-001**: The engine-compatibility path must distinguish technical
  selectability from product-suitable example fit.
- **FR-002**: If an engine is exposed as compatible, representative fixtures for
  that engine/example class must pass structural fidelity checks.
- **FR-003**: ELK-family `FILL` semantics must respect parent-direction sizing
  expectations for supported document structures.
- **FR-004**: Compound/container child placement must preserve intended visual
  grouping for supported example classes.
- **FR-005**: The implementation must make root-cause ownership explicit:
  authored YAML issue, engine translation issue, layout engine issue, or render
  issue.
- **FR-006**: Compatibility and fidelity rules must remain manifest- or
  contract-driven, not hidden in server-local branching.

## Success Criteria

- **SC-001**: Focused tests or fixture probes prove the chosen compatibility bar
  for `support-engineering-flow`, `tiered-network-architecture.author-v1`, and
  `mongo-octavia-ha`.
- **SC-002**: ELK fill semantics regressions are covered by owning-layer tests.
- **SC-003**: Example-fit regressions either block engine exposure or are fixed
  in the owning translation/render layer.
- **SC-004**: `npm --prefix packages/layout-engine test`,
  `npm --prefix apps/preview test`, and
  `node scripts/check_no_new_python.mjs` pass.

## Dependencies

- Spec 052 for multi-engine onboarding substrate and compatibility predicates.
- Spec 048 for ELK sizing/interaction follow-up ownership.

## Status Notes

### 2026-06-28 implementation closeout

- **T000 findings**
  - `support-engineering-flow` exposed `elk-rectpacking` even though the engine wrapped the authored left-to-right process into a two-row packing result. Classified as an **example-fit / compatibility** failure, not YAML authorship.
  - `tiered-network-architecture.author-v1` lost parent-direction `FILL` semantics once fill-sized structural carriers were pushed through the ELK lane without an authored `diagram_type`. Classified as an **ELK fidelity / translation-contract** failure, not YAML authorship.
  - `mongo-octavia-ha` detached AZ labels from their owning wrappers because nested annotation leaves were being spilled below the whole diagram instead of remaining attached to their structural carriers. Classified as an **ELK render / post-layout restoration** failure, not YAML authorship.
- **T001 owner inventory**
  - Example-fit contract owners: `packages/layout-engine/src/preview-engine/types.ts`, `registry.ts`, `define-graph-layout-engine.ts`, `engines/elk-*.engine.ts`.
  - Host/workspace owners that consume the contract: `apps/preview/src/preview-host/frame-documents.ts`, `apps/preview/src/preview-host/builtin-autolayout-host.ts`, `packages/layout-engine/src/preview-shell/preview-engine-workspace.ts`.
  - ELK fidelity owners: `packages/layout-engine/src/elk-layout.ts`, `packages/graph-layout-elk/src/layered-options.ts`.
- **Implemented bar**
  - Preview-engine compatibility now distinguishes **explicit technical resolution** from **offer-list example fit**.
  - `elk-rectpacking` remains technically resolvable when explicitly chosen, but it is no longer offered for authored process-flow examples like `support-engineering-flow`.
  - ELK-family engines now hard-block diagrams that introduce fill-sized structural carriers without an authored `meta.diagram_type`, explicitly bounding the unsupported `tiered-network-architecture.author-v1` ELK fill case instead of silently offering a misleading lane.
  - Nested annotation restoration now keeps `mongo-octavia-ha` AZ labels attached to their owning wrappers instead of stacking them below the whole page.

### 2026-06-28 adversarial review

- Full validation stayed green, but closeout is blocked on two remaining
  compatibility gaps:
  - metadata-less arrow fixtures (`complex-routing-usecase`,
    `example-deployment-pipeline`, and `preview-smoke`) still offer
    `elk-rectpacking`, so the example-fit gate still depends on authored
    `meta.diagram_type` being present.
  - the fill-carrier summary currently skips fill-sized structural carriers that
    are themselves arrow endpoints, so an explicit ELK selection can still
    resolve without authored `meta.diagram_type` for that shape.
