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

**Opus review request (028).** Use
[`opus-adversarial-review-request-2026-07-17-spec-028.md`](docs/spec-reviews/opus-adversarial-review-request-2026-07-17-spec-028.md).
Write findings only to
`docs/spec-reviews/opus-adversarial-review-findings-2026-07-17-spec-028.md`.

**Preview canvas resize (2026-07-16).** Fixed the local v3 relayout order:
after arrows are rerouted, the stage is fitted again to the new root dimensions.
Previously, the initial fit included stale arrow paths, so a root direction
round-trip could retain the old horizontal canvas extent. Targeted runtime tests
and a live `vertical -> horizontal -> vertical` run now return the canvas to
`1752x728`.

**Opus adversarial review findings (2026-07-15).** Filed at
[`opus-adversarial-review-findings-2026-07-15-v3-autolayout-ports-save.md`](docs/spec-reviews/opus-adversarial-review-findings-2026-07-15-v3-autolayout-ports-save.md).
Source-level pass (live save/reload + resize not yet exercised, so not `No
findings`). Highlights: F1 FILL/HUG parser defaults confirmed correct; F2 min/max
relayout clear led to the inspector/YAML persist defect: a clear now carries an
explicit null marker so an authored bound is deleted, while numeric `0` remains a
real bound; F3 `createScene`
alias is present in the TS browser entry, so the reload `TypeError` is most likely
a stale `dist` IIFE — rebuild and retest; F4 confirm parallel arrows are a real
port model, not an anonymous heuristic, before closeout; F5 add a containment
regression. See the file for owners, reproductions, and dispositions.

