# Tasks: Spec 057 Graph Engine Fidelity And Example Fit

**Input**: `specs/057-graph-engine-fidelity-and-example-fit/spec.md`  
**Branch**: `feat/057-graph-engine-fidelity-and-example-fit`

## Phase 0: Reproduce And Classify

- [x] **T000** Reproduce the reported example-fit and ELK fidelity failures.
      **Verify**: capture whether each failure is compatibility, translation,
      layout, render, or YAML-authorship related.

- [x] **T001** Inventory the current engine-fit contract.
      **Do**: trace manifest capabilities, compatibility predicates, and any
      example-shape heuristics used today.
      **Verify**: bounded owner list recorded before implementation.

## Phase 1: Contract Tightening

- [x] **T010** Define a typed example-fit/fidelity bar for exposed graph engines.
      **Verify**: `npm --prefix packages/layout-engine test`

- [x] **T011** Tighten engine exposure or engine translation based on that bar.
      **Verify**: focused host/runtime tests.

## Phase 2: ELK Semantics And Fixture Coverage

- [x] **T020** Fix or explicitly bound ELK `FILL` semantics for supported cases.
      **Verify**: focused ELK sizing tests.

- [x] **T021** Fix or explicitly bound dropped-node/compound-placement failures.
      **Verify**: representative fixture tests or probes.

## Phase 3: Validation

- [x] **T030** Full validation.
      **Verify**:
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;
      `node scripts/check_no_new_python.mjs`
