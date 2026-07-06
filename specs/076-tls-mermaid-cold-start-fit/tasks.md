# Tasks: Spec 076 TLS certificate provider Mermaid cold-start fit

**Input**: `specs/076-tls-mermaid-cold-start-fit/spec.md`
**Plan**: `specs/076-tls-mermaid-cold-start-fit/plan.md`
**Branch**: `feat/076-tls-mermaid-cold-start-fit`

## Phase 1: Preserve the example for cold start

- [ ] T001 Copy the reference image, engineer comparison, and current render
      comparisons into `specs/076-tls-mermaid-cold-start-fit/images/` with
      stable names.
- [ ] T002 Add a draft Mermaid reconstruction under
      `specs/076-tls-mermaid-cold-start-fit/references/` so the example can be
      reasoned about from source image to candidate `.mmd`.
- [ ] T003 Update `docs/specs.md` with this package so the example is indexed in
      the active spec catalog.

## Phase 2: Mermaid-first handoff

- [ ] T010 Write a concrete cross-repo request into `../mermaid/AGENT-INBOX.md`
      asking that repo to add this example there through its mandatory
      input-fit workflow.
- [ ] T011 Link the Mermaid handoff to:
      `images/01-source-mermaid-reference.png`,
      `images/02-engineer-elk-force-attempt.png`,
      `references/tls-certificate-provider-topology.mmd`, and
      `scripts/diagrams/frames/tls-certificate-provider-topology.yaml`.
- [ ] T012 Require the Mermaid-side note to state explicitly whether the draft
      `flowchart` fit is strong, weak, or unsupported.

## Phase 3: Current-state classification in this repo

- [ ] T020 Record the exact current compatibility baseline for the fixture:
      `v3` only.
- [ ] T021 Record the exact current fill-carrier blocker ids:
      `provider_stack`, `services_row`, `load_balancer_endpoint_row`.
- [ ] T022 Record the explicit non-blockers:
      deep nesting is not the reason; the authored arrows form a connected tree.
- [ ] T023 Tie the classification back to the actual compatibility owner in
      `packages/layout-engine/src/preview-engine/registry.ts`.

## Phase 4: Decide the acceptable future fix path

- [ ] T030 Define the only acceptable future outcomes for this example:
      explicit `v3`-only classification, cluster-preserving lowering/shim, or
      another typed path with equal evidence.
- [ ] T031 Reject "just switch to ELK layered" on the existing lowered frame
      shape as a valid fix unless the compatibility blocker and fixture geometry
      are both addressed.
- [ ] T032 If the preferred path is a lowering/shim, name the owner that should
      change:
      spec 028 import/lowering, preview-engine compatibility, or a new typed
      adapter layer.

## Phase 5: Tests and verification

- [ ] T040 Add a fixture-owned compatibility regression in
      `packages/layout-engine/tests/preview-engine-registry.test.ts` or
      `preview-engine-fidelity-probes.test.ts` asserting the current `v3`-only
      baseline until it changes on purpose.
- [ ] T041 If a future change makes `elk-layered` compatible, add a second
      regression for the core cluster/ordering expectations on this fixture.
- [ ] T042 Do not close the ELK-support path on this example unless the
      compatibility regression and the geometry regression both pass.

## Closeout gate

- Cold-start pack committed in this package.
- Mermaid-side handoff recorded in `../mermaid/AGENT-INBOX.md`.
- Current-state classification is explicit and honest about why ELK is
  withheld today.
- Any future ELK-support claim is blocked on fixture-owned regression coverage.

## Deferred follow-up

- Broad Mermaid-to-YAML import ownership and typed lowering live in spec 028,
  not in this example package.
- Any broader engine policy change beyond this example should be its own spec,
  not inferred here.
