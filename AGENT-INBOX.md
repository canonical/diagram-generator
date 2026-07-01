# Agent inbox

Focused last-session → next-session handoff only. Keep this short.

- **Human notes:** [`INBOX.md`](INBOX.md) — author → agent.
- **Execution order & backlog:** [`TODO.md`](TODO.md) (read at session start).
- **Active-spec index:** [`docs/specs.md`](docs/specs.md).
- **Durable per-spec detail:** `specs/<id>-<slug>/`.

Do not park full session logs, spec inventories, or validation transcripts
here — those belong in the relevant `specs/<id>-<slug>/` package.

---

## Handoff — 2026-07-01

- **Render-path review actioned.** The multi-engine render-path fragmentation
  review that was parked here is done. Its durable output is
  `specs/071-preview-render-node-graph/` (Houdini-style single render node +
  switch node + per-engine interpreter state isolation). Spec 071 Phase 1 is now
  the top priority in `TODO.md`.
- **Branch / tree:** `feat/060-output-pane-engine-tabs-rerender` with a dirty
  working tree (authored fixtures + chrome files modified). Reconcile before new
  work.
- **Untriaged user bugs** still sit in `INBOX.md`. Most map to specs
  060/061/062/063/064/069/071 — triage each into its package, then empty INBOX.

