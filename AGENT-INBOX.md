# Agent inbox

Focused last-session → next-session handoff only. Keep this short.

- **Human notes:** [`INBOX.md`](INBOX.md) — author → agent.
- **Execution order & backlog:** [`TODO.md`](TODO.md) (read at session start).
- **Active-spec index:** [`docs/specs.md`](docs/specs.md).
- **Durable per-spec detail:** `specs/<id>-<slug>/`.

Do not park full session logs, spec inventories, or validation transcripts
here — those belong in the relevant `specs/<id>-<slug>/` package.

---

## Handoff — 2026-07-02

- **Branch / tree:** `feat/071-preview-render-node-graph`, HEAD `69e68fc`. T021
  (`9b08d21`) and T022 (`69e68fc`) are both committed. Current working slice
  implements T016/T017 but is not committed yet.
- **Adversarial reviews done:** both the Phase 1 render-node pass and the Phase 2
  save/reload + isolation pass are complete. Full findings, verdicts, and the
  validation transcript live in
  `specs/071-preview-render-node-graph/evidence/adversarial-review.md`.
  Bottom line: Phase 1 and T022 both hold against their written criteria (944
  layout-engine + 155 preview tests green; the 4 chromium regressions run and
  pass), so neither reopens. Four hardening/correctness follow-ups were found.
- **Follow-ups queued in `tasks.md`:** T016 (real canvas diagnostic on the
  interaction path) and T017 (global stage-mount guard) are now cleared in the
  working tree; remaining follow-ups are T023 (let a save delete an emptied node
  bucket — currently resurrects on reload) and T024 (browser proof that
  non-active node buckets survive save→reload).
- **Next:** commit the T016/T017 slice, then either clear T023/T024 or start
  Phase 3 T030 (switch node); T023 and the flat-alias collapse (P2-3) fold
  naturally into the Phase 3 work.

