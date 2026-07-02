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

- **Branch / tree:** `feat/071-preview-render-node-graph`. Committed checkpoints:
  T021 `9b08d21`, T022 `69e68fc`, T016/T017 `be96d32`. Current working slice
  implements Phase 3 T030/T031/T032 and updates the spec/handoff docs.
- **Adversarial reviews done:** the earlier Opus review for Phases 1/2 remains in
  `specs/071-preview-render-node-graph/evidence/adversarial-review.md`. A new
  Codex Phase 3 review is in
  `specs/071-preview-render-node-graph/evidence/phase-3-adversarial-review.md`.
  Verdict: no reopen; residual notes are low-risk only (legacy helper export,
  no cook-cache eviction).
- **Validation completed on the current working slice:**
  `npm --prefix packages/layout-engine test` → 156 files / 949 tests green.
  `npm --prefix apps/preview test -- editor-live-repaint-regression` → full
  preview suite green from the preview app, including the Chromium switch/isolation
  regressions and the new return-to-layered `viewBox` determinism assertions.
- **Still open in spec 071:** T023 (let save delete an emptied non-active node
  bucket) and T024 (browser proof that non-active buckets survive save→reload),
  then Phase 4 T040+ closeout work.
- **Next:** commit the Phase 3 slice, then either clear T023/T024 or move to
  Phase 4 onboarding/inventory closeout.

