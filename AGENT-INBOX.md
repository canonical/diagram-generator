# Agent inbox — live state (single owner)

Session-start read for **what's happening right now**: current task, active
blockers, and last-known-green validation. This is the single owner of transient
state — no other file restates it. Keep it short; when a note is resolved or
superseded, **delete it** (git and the spec package hold the history). Do not park
session logs, spec inventories, resolved reviews, or validation transcripts here.

Other owners: invariants → [`AGENTS.md`](AGENTS.md) · operational how-to →
[`docs/agent-index.md`](docs/agent-index.md) · queue/order → [`TODO.md`](TODO.md) ·
spec catalog/status → [`docs/specs.md`](docs/specs.md) · human notes →
[`INBOX.md`](INBOX.md) · durable per-spec detail → `specs/<id>-<slug>/` ·
adversarial reviews → `docs/spec-reviews/`.

**Active handoff:** Spec 061 preview grid regression is implemented on
`feat/061-preview-grid-regression`. The typed capability gate, findings, and
tests are complete. Layout-engine validation is green (1,025 tests); preview
validation is 167/168 because the existing
`editor-live-repaint-regression.test.ts` has an unrelated ELK option-default
mismatch. Branch review/merge remains the next action.
