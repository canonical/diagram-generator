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
`main` now contains explicit `light-dark(...)` theme pairs for page
background, fills, strokes, text, arrows, and embedded SVG icons, while keeping
`adaptiveColors="none"`. T026-T029 are complete. The remaining T021/T030 gate is
to open the three generated diagrams in diagrams.net Light, Dark, and Automatic
modes and record whether embedded SVG icons honor the declared pairs.

Last known green: `npm --prefix packages/layout-engine test` (1,136 passed,
3 skipped) and `node scripts/check_no_new_python.mjs` on 2026-07-19. Node v24.11.1
is installed through `nvm`; `~/.zshrc` already loads it for interactive shells.
PreviewEditor is running at `http://127.0.0.1:8100/`. The manual gate still needs
diagrams.net Light/Dark/Automatic verification.

**Requested Opus review: Preview folder-workspace UX and delivery path.**
Review the current implementation, the existing adversarial review, and Spec 075
as a product and architecture owner. The intended first-run experience is simple:
the user opens a folder; the left sidebar immediately lists the diagrams in that
folder (grouped when several folders/examples are open); selecting one renders it
on the central canvas; edits save back to that same folder. Bundled examples must
remain discoverable without obscuring the user's folder. The experience should
work for a non-repo user without terminal setup beyond launching the preview.

Assess whether the current product actually delivers that flow, including empty,
unsupported-browser, permission-regrant, external-change, duplicate-filename,
read-only-copy, and restart states. Check the source ownership and save contract
as well as the visible UX; do not accept test coverage as a substitute for the
real workflow. Identify the smallest useful way forward, ordered by user impact
and dependency, separating must-fix closeout issues from follow-up work.

Update the durable owner as part of the review: amend `specs/075-preview-folder-workspaces/`
when the work belongs there, or create/name a narrowly scoped successor spec when
it does not. Keep branch and task ownership unambiguous; do not implement product
code in this review. Then replace this request with concise review findings in
`AGENT-INBOX.md`: decision, prioritized next steps, blockers/evidence gaps, and
links to the durable spec/review record. Update `TODO.md` and `docs/specs.md` only
when the review changes queue order or spec status.
