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

**Current task (2026-07-20): spec 077 draw.io theme closeout.**
The pending merge brings explicit `light-dark(...)` theme pairs for page
background, fills, strokes, text, arrows, and embedded SVG icons, while keeping
`adaptiveColors="none"`. T026-T029 are complete. The remaining T021/T030 gate is
to open the three generated diagrams in diagrams.net Light, Dark, and Automatic
modes and record whether embedded SVG icons honor the declared pairs.

Last known green: `npm --prefix packages/layout-engine test` (1,136 passed,
3 skipped) and `node scripts/check_no_new_python.mjs` on 2026-07-19. This machine
has no discoverable Node/npm installation or local draw.io app, so PreviewEditor
cannot start and the manual gate needs a browser/editor with diagrams.net.
