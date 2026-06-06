# Agent Inbox

Machine-generated handoffs, long diagnostics, and cross-repo follow-up notes go here.

Do not use this file for user notes. User-authored async notes belong in `INBOX.md`.

The agent should triage anything durable from this file into `TODO.md`, `STATUS.md`, `HISTORY.md`, or `docs/specs.md`, then empty this file back to this header template.

---

2026-06-06 – preview-shell UI consistency smell

- The shared Input / Output / Both shell is still partly data-dependent. Force preview currently disables Input and Both when a reference image is missing, and the split-orientation toggle was previously tagged `dg-grid-only`, which made shell chrome visibility vary by engine rather than by one stable editor contract.
- User expectation is stricter: every example should sit inside the same static editor UI, with placeholders for unavailable data instead of tabs or controls disappearing.
- This looks like a broader shell-governance issue rather than an isolated bug. Future preview work should treat shell chrome visibility as shared-contract behavior owned by specs 025/026, not something each engine may trim independently.
