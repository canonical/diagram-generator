# Spec 014 – Preview server TS export hardening

**Branch**: `feat/014-preview-server-ts-export-hardening`  
**Created**: 2026-06-03  
**Status**: Complete (2026-06-03)  
**Input**: GPT 5.4 adversarial review of spec 011 preview-server Node subprocess path

## Problem

`preview_server.py` shells out to Node (`export-frame-svg.mjs`) on hot SVG paths inside a **threaded** HTTP server. Under bursty UI traffic this can:

- Spawn many concurrent Node processes (thread stalls, connection drops)
- Fail without graceful fallback when `subprocess.TimeoutExpired` is not caught
- Mask repeated reload failures (broad `except` in watcher), feeling like “preview is dead”

## User scenarios

### US1 – Bounded concurrency (P1)

**Given** many simultaneous SVG requests, **When** TS export runs, **Then** at most N Node processes run concurrently (default 2); extra requests wait or coalesce.

### US2 – Cached TS SVG (P1)

**Given** repeated requests for the same slug with unchanged YAML mtime, **When** TS export already succeeded, **Then** no new Node subprocess is spawned.

### US3 – Timeout handling (P1) — superseded by spec 012 (2026-06-03)

**Was:** Timeout → Python `diagram_render_svg` fallback.  
**Now:** TS export failure returns no SVG bytes → HTTP **404** for live v3 paths; no Python fallback. `TimeoutExpired` must still not propagate uncaught.

### US4 – Watcher visibility (P2)

**Given** module reload fails during watch, **When** rebuild runs, **Then** stderr logs include the exception type and traceback; consecutive failures emit an explicit warning.

## Non-goals

- Long-lived Node worker pool (future spec)
- ~~Removing Python SVG fallback entirely~~ — done in spec 012 T060a for preview server

## Success criteria

- Stress: 20 parallel GETs for one slug → ≤2 concurrent Node at a time, cache hits after first
- `subprocess.TimeoutExpired` never propagates to request handler
- `python -m pytest scripts/test_preview_ts_export.py -q` passes
