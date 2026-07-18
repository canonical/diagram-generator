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

**Spec 080 implementation complete; first adversarial review remediated
(2026-07-18).**
`feat/080-renderable-interchange-import` includes the spec-075 folder-workspace
dependency. Mermaid and D2 imports share a blocking structural-loss gate; the
bounded tokenizer → typed IR → lowering path preserves compound topology,
reverse/local direction, supported styles, and selects/persists v3 or ELK from
engine capabilities. Preview server-root and local-folder import paths have
no-write-on-block plus persist→reload regressions. Phase 7 focused evidence is
74/74 and the full layout-engine suite is 1,133/1,133; the full preview suite is
190 pass, 1 expected Windows symlink skip. Durable
evidence and review records live in the spec package and `docs/spec-reviews/`.
The first implementation review resolved all original findings but found six
breadth/truthfulness gaps; T070–T075 now close them with unquoted edge labels,
direction-less headers, scoped D2 implicit endpoints, conflicting-label
diagnostics, decorated-edge downgrades, and re-verified corpus SHA-256 provenance.
Follow-up Opus review is pending.

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
