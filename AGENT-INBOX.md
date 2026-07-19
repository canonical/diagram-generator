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

**Current task: Spec 077 YAML frame → draw.io export theme control.**
Worktree: `/Users/l/work/diagram-generator-worktrees/077-yaml-drawio-export`
on branch `feat/077-yaml-drawio-export`.

Implemented: explicit draw.io `light-dark(...)` theme pairs for page background,
rect fill/stroke, label style, rich text, edges, and embedded SVG icon
attributes. The exporter keeps `adaptiveColors="none"` so diagrams.net does not
apply automatic adaptation on top of the authored pairs.

Last-known green: `npm --prefix packages/layout-engine test` on 2026-07-19
(1,136 passed, 3 skipped) after refreshing the three spec 077 draw.io goldens;
`node scripts/check_no_new_python.mjs` also passes.

Still open: T030 manual diagrams.net check in Light, Dark, and Automatic modes,
with special attention to whether embedded SVG data URI icons honor
`light-dark(...)` inside image markup.
