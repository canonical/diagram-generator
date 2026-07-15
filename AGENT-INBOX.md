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

**Active handoff.** Spec 028 diagram interchange is active in the separate
`diagram-generator-worktrees/028-diagram-interchange-mermaid-d2` worktree.
Keep its implementation isolated until it is reviewed, rebased, and merged.
Spec 061 has a clean closeout commit in its own worktree and needs review/merge;
do not start a duplicate 061 implementation.

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

