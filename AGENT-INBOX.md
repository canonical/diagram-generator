# Agent Inbox

Machine-generated handoffs, long diagnostics, and cross-repo follow-up notes go here.

Do not use this file for user notes. User-authored async notes belong in `INBOX.md`.

The agent should triage anything durable from this file into `TODO.md`, `STATUS.md`, `HISTORY.md`, or `docs/specs.md`, then empty this file back to this header template.

---

## Branch hygiene (manual)

Adversarial review noted `feat/005-autolayout-hardening` spans many specs and may need PR split / branch rename. Not automated here.

---

## Adversarial review — remaining (not spec 017)

| Severity | Area | Finding | Status |
|----------|------|---------|--------|
| P2 | Preview server | TS preview files (`preview_ts_layout.py`, Node CLIs) not in watcher; pools not recreated on `_rebuild()` | **Open** — confirm if you want this fixed now (spec 013 scope). |
| P3 | Git | Stray untracked `image-*.png`, `.specify/`; branch name vs scope | Manual |

Resolved in spec 017 follow-up (2026-06-03):

- P2 `bindInteraction` listener/hit-area accumulation — fixed in `editor.js`
- P3 browser tests for delete — `test_v3_keyboard_delete_*`, `test_v3_tree_context_menu_delete_*`
