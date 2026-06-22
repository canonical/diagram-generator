# Agent inbox

Machine-generated handoffs and diagnostics go here.

Durable follow-up belongs in `specs/<id>-<slug>/`,
[`AGENTS.md`](AGENTS.md#handover), or [`docs/specs.md`](docs/specs.md).
`TODO.md` is only a pointer to open spec packages.

---

## Active handoff (2026-06-22)

- `INBOX.md` has been triaged back to its template header.
- The detailed GPT 5.4 next plan moved into
  `specs/048-elk-sizing-interaction-followup/`. Start there, using
  `tasks.md` first and `elk-sizing-interaction-flow.md` for the cross-layer
  map.
- `TODO.md` is no longer an execution queue. It points to the active spec index
  and lists only high-level spec candidates.
- Spec 046 is architecturally ready to close. Do not reopen it for ELK product
  bugs unless the fix regresses by widening `scripts/preview/editor.js`,
  `scripts/preview/layout-bridge.js`, central preview-host/document-kind
  branching, or ELK-shaped shared graph contracts.
- Spec 048 Phase 1 is partly landed: `request-to-hardware-stack` Fill semantics
  now have focused regression coverage and the passive endpoint-compound ELK
  sizing fix is in `packages/layout-engine/src/elk-layout.ts`. Full
  `packages/layout-engine` still reports unrelated existing
  `tests/parity.test.ts` failures in the base layout path; do not treat those
  as fallout from the ELK change without a separate repro.
- Spec 048 Phase 2 has a first narrow improvement: explicit inspector
  width/height edits now route through immediate typed relayout request wiring
  instead of the generic debounced relayout scheduler. Live drag relayout is
  still a separate follow-up.
- Worktree note: `scripts/diagrams/frames/request-to-hardware-stack.yaml` is
  currently changed from `meta.layout_engine: elk-layered` to `v3` by an
  existing edit. Treat it as user work; do not revert it unless explicitly
  asked.

## Active handoff (2026-06-22, later)

- Spec 048 is now **Closeout Ready** on `feat/048-elk-sizing-interaction-followup`.
- Phase 2 is complete:
  - explicit inspector width/height edits request immediate typed relayout
  - preview frame patching now has a focused regression proving width changes
    rerun text wrapping without save/reload
  - live resize remains typed/RAF-coalesced through `app-live-resize.ts`, and
    drop persistence still shares the same fixed-size override semantics
- Phase 3 is complete:
  - ELK headed/parent chrome now restores semantic top/left/right rhythm from
    the current parent box instead of shrinking `__heading` / `__body` from
    child bboxes
  - `elk-layout.test.ts` now locks semantic headed chrome parity for
    `example-platform-architecture` and `complex-routing-usecase`
- Phase 4 is complete:
  - ELK option specs now require either behavior coverage or caveat copy
  - topology-dependent controls have tightened descriptions
  - ELK raw/debug views now expose structured authored-tree and input-graph
    payloads from `ElkLayoutSnapshot.debug`
  - reciprocal-edge alternate-port selection remains covered in
    `packages/graph-layout-elk/tests/elk-layered.test.ts`
- Validation:
  - targeted `packages/layout-engine` suites for ELK sizing, resize, inspector,
    relayout, browser-entry, and debug view all pass
  - `npm --prefix packages/graph-layout-elk test` passes
  - `npm --prefix apps/preview test` passes
  - `node scripts/check_no_new_python.mjs` passes
  - `npm --prefix packages/layout-engine test` still reports the pre-existing
    unrelated `tests/parity.test.ts` headed/body fixture failures in the native
    layout path; the new 048 work does not introduce additional package-level
    failures beyond that known bucket
