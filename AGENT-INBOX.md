# Agent inbox

Focused last-session → next-session handoff only. Keep this short.

- **Human notes:** [`INBOX.md`](INBOX.md) — author → agent.
- **Spec ordering & audit:** [`TODO.md`](TODO.md) (read at session start).
- **Active-spec index:** [`docs/specs.md`](docs/specs.md).
- **Durable per-spec detail:** `specs/<id>-<slug>/`.

Do not park full session logs, spec inventories, or validation transcripts
here — those belong in the relevant `specs/<id>-<slug>/` package.

---

## Handoff — 2026-07-01

- **Branch:** `feat/069-editor-mutation-state-determinism` (11 commits ahead of
  `main`, unmerged). Spec 069 is `Closeout Ready` but **not on `main`**.
- **Uncommitted:** `scripts/diagrams/frames/example-deployment-pipeline.yaml`
  (authoring experiment — do not commit unless the task asks). `AGENTS.md` and
  this file also have pending edits.
- **This session:** ran a full repo audit; results + prioritized next-spec
  order are in [`TODO.md`](TODO.md). Culled the tracked root `image.png` and two
  `tmp/` debug screenshots.
- **Next slice:** land spec 069 to `main` with a real gesture→repaint product
  check (TODO priority #1), then the 060/062/063 correctness backlog.
- **Known stale:** `AGENTS.md` handover line-counts for `editor.js` (says 256,
  actual 316) and `layout-bridge.js` (says 88, actual 77) need updating.

