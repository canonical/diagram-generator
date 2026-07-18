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

**Spec 075 active (2026-07-17).** `feat/075-preview-folder-workspaces` is rebased
on `main` (`1299bbb`). The remaining implementation is complete: read-only Save
a copy, SHA-256 server-root conflict handling, first-run guidance, safe-YAML and
large-nav contracts, forget/shutdown cache disposal, and a reusable Chromium
real-filesystem-handle journey. Full layout-engine (1,062) and preview (188 pass /
1 expected Windows symlink skip) suites, builds, browser freshness,
no-new-Python, diff check, and the production Chromium journey are green. Native
OS chooser/regrant evidence remains unavailable because the in-app browser is
unavailable; final Opus findings are requested under `docs/spec-reviews/`.
The 2026-07-18 open-folder follow-up now lists local folders before the large
bundled corpus and refreshes navigation once when persisted handles recreate
server-side registrations. Focused contracts, builds, bundle freshness, and the
production Chromium real-handle journey are green. The broad preview contract
has one unrelated failure because the user's uncommitted
`request-to-hardware-stack.yaml` now selects ELK instead of the fixture's
historical v3 expectation; preserve that YAML.

**Spec 080 authored (2026-07-18) — NOT implemented.** `feat/080-renderable-interchange-import`
is the plan-only follow-up to merged spec 028. The 2026-07-18 Opus adversarial
review returned **import-blocking / changes requested**: the interchange importer
surfaces structural loss (dropped edges, dropped endpoint nodes, dropped
subgraph-local direction) as non-blocking warnings and writes the falsified
diagram to disk with an "Imported with N warning(s)" success toast. Full findings:
[`opus-adversarial-review-findings-2026-07-18-renderable-interchange-import.md`](docs/spec-reviews/opus-adversarial-review-findings-2026-07-18-renderable-interchange-import.md)
(written in the 075 worktree). New spec package:
[`specs/080-renderable-interchange-import/`](specs/080-renderable-interchange-import/)
— spec.md, plan.md, tasks.md, validation.md, contracts/import-capability-matrix.md.
Next: GPT implements the test-first task list (T000–T063); observe Phase gate A
(parser/IR) before touching preview persistence. No implementation task is done.

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
