# Spec 057: Graph Engine Fidelity And Example Fit

**Feature Branch**: `feat/057-graph-engine-fidelity-and-example-fit`  
**Status**: Draft  
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
