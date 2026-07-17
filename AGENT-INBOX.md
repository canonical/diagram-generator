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

**Spec 061 merged (2026-07-17).** `feat/061-preview-grid-regression` merged
cleanly into the primary `main` worktree at `7317feb`; the feature worktree is
clean and ready for deletion. The complete evidence and review record live in
`docs/spec-reviews/` and `specs/061-preview-grid-regression/`.

**Spec 028 merge ready (2026-07-17).** The Mermaid-first implementation and
review remediation are complete on `feat/028-diagram-interchange-mermaid-d2`.
The full layout-engine (1,050) and preview (173) suites plus the real D2 compiler
gate are green; see
[`validation.md`](specs/028-diagram-interchange-mermaid-d2/validation.md).
Opus independently re-reviewed remediation commit `228adde`; the **Merge ready**
verdict is appended to
[`opus-adversarial-review-findings-2026-07-17-spec-028.md`](docs/spec-reviews/opus-adversarial-review-findings-2026-07-17-spec-028.md)
(the final section). One documented non-blocking limitation remains: inline
node declarations on an edge require separate node declarations. After merge,
leave this worktree in place but mark it ready for deletion pending user
verification in the primary worktree.
