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

**Spec 081 is isolated for parallel work (2026-07-19).**
`feat/081-diagram-review-workspace` owns the Spec Kit bundle at
`specs/081-diagram-review-workspace/`. It promotes the existing Mermaid and
planning FigJam import/comment/spec tools into a reusable official review rung.
Start with T001–T005; do not refactor either reference plugin until their commits,
audits, data shapes, and compatibility fixtures are recorded. The neutral
contract gate (T010–T013) precedes the parallel core/CLI, plugin, adapter, and
documentation lanes. This branch is independent of the active work in the
primary `main` checkout.

**Spec 080 merged to `main` and archived (2026-07-18).**
The reviewed renderable-interchange implementation and all T070–T077 remediation
landed in merge `eb5e958`. Mermaid and D2 imports share a blocking
structural-loss gate, preserve supported compound topology and direction, and
select/persist a compatible v3 or ELK engine. Post-merge validation is green:
layout engine 1,136/1,136; preview 190 pass with one expected Windows symlink
skip; browser freshness, preview build, no-new-Python, and diff checks pass.
The maintainer requested merge after the second review's remaining “almost”
items were fixed; no additional third-party approval pass was run. Durable
evidence is archived under
`docs/spec-archive/080-renderable-interchange-import/` and review records remain
under `docs/spec-reviews/`.

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
