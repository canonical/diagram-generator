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

**Current task (2026-07-22): Spec 084 folder-workspace reliability.**
The user reports a silent **Open folder…** action and an absent visible recovery
control. This is now a dedicated follow-up, not a claim that Spec 075 is ready
to close. The active branch is `feat/084-folder-workspace-reliability`.

Evidence so far: the known sidebar fix is `f0f440f` (2026-07-18), and remains
in `main` and the prior 075 worktree. The server on `http://127.0.0.1:8100/`
currently runs the 075 worktree, which serves a fresh bundle with the typed
folder controller. A controlled Chrome page shows the reconnect action only
after its async restore detects a denied remembered handle; the user's real UI
does not expose it. The follow-up must make every folder action observable,
make recovery adjacent and durable, and prove native Chrome chooser/regrant
behavior. See `specs/084-folder-workspace-reliability/`.

Last known live check: `8100` returned HTTP 200 from the 075 worktree on
2026-07-22. Do not treat bundle/source inspection or mocked handles as native
picker evidence; the new Spec 084 tasks require a real Chrome journey.

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
- **G4 (must-fix):** Spec 084 must close the observed silent-open and hidden
  recovery UX before the folder workflow can be presented as dependable.
- **G2:** the prior 2026-07-17 Opus closeout was never written; this review
  discharges that gate, conditional on G1.
- **G3 (process note):** all of 075 shipped to `main` with no `feat/075` branch
  ahead of closeout, so the review is retroactive. Already reflected in
  `docs/specs.md` / `TODO.md`; no action beyond finishing G1 then archiving.

Prioritized next steps:
1. Implement and validate Spec 084 through the real Chrome native journey.
2. Run and record the remaining 075 G1 native-picker/regrant journey.
3. Archive `specs/075-preview-folder-workspaces/`; flip status to Closed.
4. Follow-up only: **Spec 083 preview folder-workspace delivery shell**
   (`specs/083-preview-folder-workspace-delivery-shell/`) owns the non-repo
   launch gap (users still need a checkout + `npm install` today). Not a 075
   blocker.

Durable owners updated: spec 075 status + T044, `docs/specs.md`, `TODO.md`, and
new draft spec 083. Do not resume with product code until G1 lands on a matching
branch.
