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

**Spec 080 implementation active (2026-07-18).** Phase gate A and Mermaid
lowering are green on `feat/080-renderable-interchange-import`: all imports use
the bounded tokenizer → typed IR → lowering path; inline/chained/fan-out edges,
local LR/TB directions, markdown downgrades, topology batteries, shared
structural blocking, preview-server no-write, and CLI category reporting are
covered (43 focused tests green). The branch now includes the spec-075 folder
workspace dependency. Next: prove local-folder no-mirror, then complete reverse
directions, capability-driven engine persistence, preview summary/persist→reload
coverage, D2 parity, and corpus hardening. Current red D2 test inventory is
isolated in `tests/d2-parity.test.ts`.

**Spec 061 merged (2026-07-17).** `feat/061-preview-grid-regression` merged
cleanly into the primary `main` worktree at `7317feb`; the feature worktree is
clean and ready for deletion. The complete evidence and review record live in
`docs/spec-reviews/` and `specs/061-preview-grid-regression/`.

**Spec 028 merged (2026-07-17).** The reviewed Mermaid-first implementation
fast-forwarded cleanly into the primary `main` worktree at `32e0390`. After the
rebase, the full layout-engine (1,054) and preview (174) suites, browser-bundle
freshness check, Python ratchet, and diff check were green; the real D2 compiler
gate had also passed. The feature worktree is clean and ready for deletion
pending user verification in the primary worktree. Durable validation and the
Opus re-review live in
[`validation.md`](specs/028-diagram-interchange-mermaid-d2/validation.md) and
[`opus-adversarial-review-findings-2026-07-17-spec-028.md`](docs/spec-reviews/opus-adversarial-review-findings-2026-07-17-spec-028.md).
One documented non-blocking limitation remains: inline node declarations on an
edge require separate node declarations.
