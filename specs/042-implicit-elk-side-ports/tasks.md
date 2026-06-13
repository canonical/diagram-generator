# Tasks: Implicit ELK side ports

**Input**: Design documents from `/specs/042-implicit-elk-side-ports/`

**Prerequisites**: `spec.md`, `plan.md`

## Phase 1: Graph IR and builder

- [ ] T001 Add a minimal port model to the shared graph IR
- [ ] T002 Extend ELK graph building to emit generated side-midpoint ports for eligible nodes
- [ ] T003 Add stable edge endpoint mapping from edges to generated ports
- [ ] T004 Add focused tests for port ids, side geometry, and endpoint references

## Phase 2: Side-selection policy

- [ ] T010 Define the first deterministic ingress/egress side policy for TB and LR graphs
- [ ] T011 Validate the policy on one process/workflow and one architecture-style diagram
- [ ] T012 Document where the first policy is intentionally limited

## Phase 3: Preview control audit

- [ ] T020 Remove or relabel dead ELK controls that still do nothing with the real graph model
- [ ] T021 Re-evaluate `portConstraints` against implicit ports and keep only meaningful values
- [ ] T022 Remove unsupported or suspect enum values that do not match current ELK support

## Phase 4: Regression validation

- [ ] T030 Add a real-diagram regression that demonstrates improved attachment stability
- [ ] T031 Run focused graph-layout, layout-engine, and browser-bundle validation
- [ ] T032 Run full repo validation and Python-path ratchet

## Phase 5: Adversarial review

- [ ] T040 Review architecture drift: graph IR scope, YAML authority, spec 006 overlap
- [ ] T041 Review implementation risks: rigid side policy, compound-node leakage, control-panel drift
