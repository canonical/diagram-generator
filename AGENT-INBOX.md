# Agent Inbox

Machine-generated handoffs, long diagnostics, and cross-repo follow-up notes go here.

Do not use this file for user notes. User-authored async notes belong in `INBOX.md`.

The agent should triage anything durable from this file into `TODO.md`, `STATUS.md`, `HISTORY.md`, or `docs/specs.md`, then empty this file back to this header template.

---

## Handoff — spec 012 continuation (2026-06-03)

**Branch:** `main` (work lands on `main` per repo convention; no long-lived feature branch required unless user starts `/speckit.git.feature`).

**Done on `main`:** T060a (preview TS-only SVG). See `HISTORY.md` 2026-06-03 entry.

**Next tasks** (`specs/012-ts-svg-renderer-retire-python/tasks.md`): T020 icons → T030 arrows → T040 overlays → T050 golden SVG → T060b batch Python SVG removal → T070 docs.

**Then:** spec 005 WS2, spec 008 Phase 5. Cleanup: rename `test_preview_support_engineering_flow.py`, decompose `preview_server.py`.

**Architecture note (do not re-litigate):** Frame YAML is authoring source of truth. Spec 012 is TS-only **preview/render runtime**, not YAML migration.
