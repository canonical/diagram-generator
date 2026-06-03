# Spec 015 – Preview stability and navigation triage

**Created**: 2026-06-03  
**Status**: Complete (2026-06-03)  
**Input**: User report (server dies constantly); GPT 5.4 adversarial review; Cursor investigation of diagram prev/next

## Adversarial summary (today's branch `feat/005-autolayout-hardening`)

| Commit | Risk | Notes |
|--------|------|-------|
| `9141fc0` spec 014 | Medium | TS export pool — mitigated; watch for cache staleness after edits |
| `4f12e76` spec 011 | Medium | Node SVG on hot path — superseded by 014 pool |
| `5e8390f` | Low | Style/semantic fixes |
| `f41c1a5` | Low | Docs + preview save |

**Branch hygiene:** 4 commits ahead of main, many untracked WIP files (specs 012–013 partial, test logs). Recommend dedicated feature branch before merge.

## Problem A — “Server keeps dying”

**Likely cause (P1):** `preview_server.py` **auto-kills any process on port 8100** on every start (`main()` Windows block). Cursor/agent background restarts spawn a new server → kill the previous → background task reports exit `4294967295`. User perceives constant death.

**Secondary (mitigated in 014):** Unbounded Node subprocess per SVG request under threaded server.

## Problem B — Diagram prev/next: select changes, page does not navigate

**Root cause (force mode):** `viewer-unified.html` loads `editor-base.js` then `force.js`. `initPreviewShell()` in editor-base calls `initDiagramPicker()` **version A** — wires arrows to `dispatchEvent('change')` but **never registers a `change` listener**. `editor.js` (version B with listener) is **not** loaded in force mode.

**Grid mode:** `editor.js` redefines `initDiagramPicker` and registers navigation — should work.

## User scenarios

### US1 — Port kill opt-in (P1)

**Given** port 8100 is already in use, **When** preview server starts without opt-in kill, **Then** it does not kill the existing process; it prints a clear error or uses `--port`.

### US2 — Shared diagram picker (P1)

**Given** force or grid unified viewer, **When** user clicks diagram prev/next, **Then** `location.assign` runs when the selected href differs from current path.

### US3 — Branch hygiene (P2)

**Given** repo policy, **When** spec 015 closes, **Then** `.gitignore` covers preview test logs; specs 012–013 tracked or removed from WIP clutter.

## Non-goals

- Long-lived Node worker (spec 012/014 follow-up)
- Inspector sizing arrow buttons (separate if still broken)
