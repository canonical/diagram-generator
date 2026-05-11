# Agent Inbox

Machine-generated handoffs, long diagnostics, and cross-repo follow-up notes go here.

Do not use this file for user notes. User-authored async notes belong in `INBOX.md`.

The agent should triage anything durable from this file into `TODO.md`, `ROADMAP.md`, `STATUS.md`, `HISTORY.md`, or `docs/specs.md`, then empty this file back to this header template.

---

## 2026-05-11 – DG BF `os` resync status

- The preview-server sibling path and vendored fallback now target BF `dist/tiers/os/styles.css`; `assets/baseline-foundry/` was refreshed locally and now carries `os/styles.css` plus Ubuntu Sans.
- The served preview route is now `/preview/bf-os.css`.
- DG keeps one local shell-specific compatibility shim: `.bf-application-navigation-resize-handle` now lives in `scripts/preview/editor.css` because current BF `os` no longer ships that selector.
- DG editor-only chrome now uses BF authoring-accent tokens for override markers, snap guides, and dirty-save state. Actual diagram arrow rendering remains `#E95420`.
- Validated locally:
  - `python3 -m py_compile scripts/preview_server.py scripts/sync_baseline_foundry_assets.py`
  - vendored sync succeeds
  - preview smoke on `/view/memory-wall`
  - `/preview/bf-os.css` serves
  - vendored fallback resolution works when sibling BF paths are unavailable
  - `/Users/l/.nvm/versions/node/v24.11.1/bin/node --check scripts/preview/editor.js`
- Remaining follow-up is manual/browser-level, not structural:
  - verify dropdown, inspector, shell resize, and scrolling by eye in the preview
  - verify dense search/input/action spacing still feels right under BF `os`
  - then move to BLO and A4 from their reverted checkpoints