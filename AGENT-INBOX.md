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

**No active handoff.** Spec 028 Opus review remediation is complete; the
durable review and remediation record is
`docs/spec-reviews/028-diagram-interchange-mermaid-d2-opus-review.md`.
Last-known-green: 169 test files / 1,031 tests; selected Mermaid and D2 corpus
imports compile with zero errors; browser bundle freshness and no-new-Python
checks passed.
