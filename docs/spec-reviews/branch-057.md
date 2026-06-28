# Review: spec 057 — Graph engine fidelity and example fit

**Branch:** `feat/057-graph-engine-fidelity-and-example-fit`
**Claimed status:** In Progress; commits `667d251`, `1600c56` (review), `2b1192d`
(close review gaps). Tasks T000–T030 all unchecked in `tasks.md` (good — honest).
**Real status:** the *exposure* side advanced (offer-list gating, registry
coverage). The *fidelity* side — the part the user actually sees — is unproven.

## What landed (exposure / compatibility)

`2b1192d` tightened `preview-engine/registry.ts` so manifests with
`offerDiagramTypes` stay off offer lists until an authored `diagram_type` exists,
and added registry coverage for metadata-less fixtures + an endpoint-container
reproducer, plus an ELK fill-carrier guard. This is reasonable and addresses
"which tabs show".

## What is NOT proven (fidelity — the reported bugs)

The three inbox fidelity reports are still open and 057 has **no test that runs
the engine and asserts the output is structurally correct**:

1. **INBOX #4 — `mongo-octavia-ha`: AZ1–3 / IPs stranded underneath the VM boxes
   instead of beside them.** This is a compound/container child-placement bug. FR-004
   demands "compound child placement must preserve intended visual grouping", but
   there is no fixture probe asserting AZ nodes share the parent's row/column band.
   Add a test that lays out the fixture through the real layout path and asserts
   the AZ children's bounds are siblings of (not below) the VM boxes.
2. **INBOX #6/#3 — ELK `FILL` does not fill in the parent direction**
   (`tiered-network-architecture.author-v1`); switching node placement to network
   simplex stacks arrow annotation labels. FR-003 (direction-aware fill) needs an
   ELK sizing test asserting fill children expand along the parent's main axis.
   The label-stacking part is a **separate** concern — route it to new spec 064
   (see inbox-triage), do not bury it here.
3. **INBOX #12 — changing box type triggers relayout on ELK** (should be
   appearance-only; box size is unchanged). This is a fidelity-adjacent
   interaction bug: a style/variant change must not invalidate engine layout.
   Owned partly here, partly by 051 (hide N/A controls). Add a test that a
   variant change produces no relayout request when geometry is unchanged.

## The fit-vs-fidelity contract FR-001/FR-002 still needs teeth

057 says "if an engine is exposed as compatible, representative fixtures must pass
structural fidelity checks" (FR-002). There is no such gate wired. Define it
concretely:

- a small fidelity-probe harness that, per (engine, fixture) in a curated matrix,
  runs `layoutPreviewFrameDiagramForEngine` and asserts an engine-appropriate
  invariant (no dropped nodes: every authored leaf has placed bounds; compound
  children stay within parent band; fill children fill the main axis).
- exposure of an engine on a fixture class is blocked unless its probe passes.

## Dependency on 060

The `mongo-octavia-ha` "switch to v3 still shows ELK" half of INBOX #4 is a **060**
problem (engine intent not threaded). 057 owns the ELK-side compound placement
*when ELK is genuinely the active engine*. Sequence the work: land 060 first so
you can actually observe v3 vs ELK output, then prove 057's fidelity probes.

## Closeout gate for this branch

README §3 plus:

- Fidelity-probe tests (real layout, not mocks) for `mongo-octavia-ha` (no
  stranded AZ children), `tiered-network-architecture.author-v1` (direction-aware
  fill), and `support-engineering-flow` (the offered engine produces a non-absurd
  layout or is not offered).
- Browser re-verification of INBOX #4 and #12 recorded under `evidence/`.
- Keep tasks unchecked until each has a real-layout assertion behind it.
