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

- [x] **T031** Address adversarial-review compatibility reopeners.
      **Verify**:
      `npm --prefix packages/layout-engine test -- preview-engine-registry.test.ts`;
      `npm --prefix apps/preview test -- src/persistence/preview-host-contract.test.ts`;
      `node scripts/check_no_new_python.mjs`

- [x] **T030** Full validation.
      **Verify**:
      `npm --prefix packages/layout-engine test`;
      `npm --prefix apps/preview test`;

## Phase 4: Fidelity Probes (added 2026-06-28 — required for closeout)

- [x] **T040** Add a real-layout fidelity-probe harness (no mocks).
      **Do**: per (engine, fixture), run `layoutPreviewFrameDiagramForEngine` and
      assert: every authored leaf has placed bounds (no dropped nodes); compound
      children stay within the parent band; fill children fill the parent main
      axis.
      **Verify**: `npm --prefix packages/layout-engine test -- <probe>.test.ts`.

- [x] **T041** Prove `mongo-octavia-ha` AZ1–3 sit beside the VM boxes, not below
      (INBOX). Prove `tiered-network-architecture.author-v1` direction-aware FILL.
      **Verify**: probe assertions above on the real fixtures.

- [x] **T042** Prove a variant/box-type change triggers no relayout when geometry
      is unchanged (INBOX line 56).
      **Verify**: focused interaction test.

- [x] **T043** Block engine exposure on a fixture class unless its probe passes
      (give FR-002 teeth).
      **Verify**: registry/exposure test.

- [x] **T044** Browser re-verification of the two fixtures recorded under
      `evidence/` (per `docs/spec-reviews/README.md` §4). Depends on spec 060
      having landed engine-intent threading.

      **Verify**: `node specs/057-graph-engine-fidelity-and-example-fit/evidence/fidelity-browser-check.mjs`.
