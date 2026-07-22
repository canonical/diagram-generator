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

**Current task (2026-07-22): native folder selection must register a workspace.**
Branch: `feat/084-folder-workspace-reliability`; current implementation commit:
`f829f2c`. Port 8100 is the current worktree preview, not the 075 worktree.

**Live user reproduction:** after a person selects and confirms a folder in the
native chooser, the index page says **“No folder was opened.”** On a viewer page
the action has no visible result. No named local-folder group appears above
Bundled examples. This contradicts the expected picker → registration → sidebar
flow and remains a release blocker.

**Pending Opus review:**
[`opus-adversarial-review-request-native-picker-registration-2026-07-22.md`](specs/084-folder-workspace-reliability/opus-adversarial-review-request-native-picker-registration-2026-07-22.md).
Opus must write
`docs/spec-reviews/opus-adversarial-review-findings-2026-07-22-spec-084-native-picker-registration.md`,
then replace this paragraph with a direct link to its output and one-line verdict.

Automated evidence is in `specs/084-folder-workspace-reliability/evidence/`, but
it does not prove native selection or close this blocker. Historical 075 review
material is owned under `docs/spec-reviews/` and is intentionally not repeated
here.
