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

**Spec 075 active (2026-07-17).** `feat/075-preview-folder-workspaces` was
restored and rebased onto `main` (`1299bbb`). The adversarial hardening slice now
provides grouped sources, multiple persisted browser handles, one-click
permission reconnect, authoritative handle-gated saves/imports, local external
change protection, read-only API enforcement, qualified interchange routing,
and bounded/duplicate-safe ingest. Full layout-engine (1,058) and preview (185
pass / 1 Windows symlink skip) suites, TypeScript builds, browser-bundle
freshness, the no-new-Python ratchet, diff check, and production HTTP smoke are
green. The in-app browser was unavailable, so the real
picker/save/reload/regrant journey remains a merge gate alongside Save a copy,
server-root conflict parity, and temp-cache disposal. Durable findings:
[`075-preview-folder-workspaces-adversarial-review-2026-07-17.md`](docs/spec-reviews/075-preview-folder-workspaces-adversarial-review-2026-07-17.md).

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
