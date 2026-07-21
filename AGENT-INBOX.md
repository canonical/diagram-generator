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

**Preview folder-workspace UX review — done 2026-07-20.**
Durable findings: [`docs/spec-reviews/opus-adversarial-review-findings-2026-07-20-spec-075-ux-delivery.md`](docs/spec-reviews/opus-adversarial-review-findings-2026-07-20-spec-075-ux-delivery.md).

Decision: **changes requested / evidence-gated — not a code block.** Tracing the
production routes (not the tests) confirms the target flow works: prominent
"Open folder…" CTA, opened folder grouped first in the sidebar (local → server →
bundled), qualified-address render onto the canvas, and a save gated on the real
browser file-handle write. Read-only bundled examples, Save a copy, conflict
handling, reconnect, bounded ingest, and safe YAML are all wired at the right
boundaries and merged on `main`.

Blockers / evidence gaps before Closeout Ready:
- **G1 (must-fix):** T045 native OS chooser + real permission revoke/restart/
  regrant is unproven — all handle evidence is a deterministic OPFS harness.
- **G2:** the prior 2026-07-17 Opus closeout was never written; this review
  discharges that gate, conditional on G1.
- **G3 (process note):** all of 075 shipped to `main` with no `feat/075` branch
  ahead of closeout, so the review is retroactive. Already reflected in
  `docs/specs.md` / `TODO.md`; no action beyond finishing G1 then archiving.

Prioritized next steps:
1. Run and record the G1 native-picker/regrant journey → closes T045.
2. Archive `specs/075-preview-folder-workspaces/`; flip status to Closed.
3. Follow-up only: **Spec 083 preview folder-workspace delivery shell**
   (`specs/083-preview-folder-workspace-delivery-shell/`) owns the non-repo
   launch gap (users still need a checkout + `npm install` today). Not a 075
   blocker.

Durable owners updated: spec 075 status + T044, `docs/specs.md`, `TODO.md`, and
new draft spec 083. Do not resume with product code until G1 lands on a matching
branch.
