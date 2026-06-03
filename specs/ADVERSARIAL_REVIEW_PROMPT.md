# Adversarial review prompt (copy-paste for GPT / Composer)

Use this after a coding session on `diagram-generator`. Replace `<BRANCH>` and `<COMMIT_RANGE>` before sending.

---

## Prompt

You are doing an **adversarial code review** of the `diagram-generator` repo. Be skeptical: assume something is broken until you verify otherwise. Do **not** rubber-stamp.

### Context

- **North star:** TypeScript-only for layout/measure (`packages/layout-engine/`). Frame **YAML** is the only authored source of truth. JSON from `/api/frame-tree` is a **derived wire DTO**, not authority.
- **Preview:** `scripts/preview_server.py` (threaded HTTP) + browser `layout-bridge.js` (HarfBuzz). Python `layout_v3.py` / `diagram_render_svg.py` are legacy fallback, being retired (specs 012–013).
- **Recent specs:** 011 (66ch HUG), 014 (TS SVG export pool), 015 (port kill opt-in, diagram nav).
- **Branch:** `<BRANCH>` — commits: `<COMMIT_RANGE>` (e.g. `main..HEAD` or last 5 SHAs).

### Your tasks

1. **Git / branch hygiene**
   - Is the branch name appropriate? Commits atomic and bisectable?
   - Dirty tree: untracked junk vs intentional WIP?
   - Should work split into multiple PRs?

2. **Preview server stability** (P1)
   - `preview_ts_export.py`: cache, semaphore, coalescing, `TimeoutExpired` → fallback?
   - Port binding: is `DG_PREVIEW_KILL_PORT` still killing healthy servers?
   - Threaded server + Node subprocess: remaining fan-out or deadlock risks?
   - File watcher / `_rebuild`: silent failure modes?

3. **Correctness of TS layout** (P1)
   - `applyTextLayoutDefaults`, `max_width_chars: 66`, opt-out `0`
   - Heading synthesis (`heading-synthesis.ts`) vs Python `frame_loader.py`
   - Parity fixtures: still aligned with `parity-fixture-builder.ts`?

4. **Preview client** (P1)
   - Force mode: `editor-base.js` diagram picker `change` → `location.assign`
   - Grid mode: `loadSVG()` / `initLayoutBridge` failure = blank stage?
   - Any duplicate `initDiagramPicker` / double handlers?

5. **Architecture drift**
   - New Python layout/measure logic (forbidden)?
   - Two YAML parsers (`frame_loader.py` vs `frame-yaml-loader.ts`) — drift risk?

6. **Tests**
   - Run (or cite): `npm test` in `packages/layout-engine`, `python -m pytest scripts/test_preview_ts_export.py scripts/test_preview_support_engineering_flow.py -q`
   - Gaps that would let regressions ship?

### Output format

| Severity | Area | Finding | Evidence (file:line or command) | Recommended fix |
|----------|------|---------|----------------------------------|-----------------|
| P0/P1/P2/P3 | … | … | … | … |

Then:

- **Top 3 risks** to fix before merge
- **Open questions** for the author
- **What you verified** (commands run, pass/fail)

Do not propose large rewrites unless P0/P1. Prefer minimal, TS-first fixes.

---

## Optional one-liner

> Adversarial review `diagram-generator` branch `<BRANCH>` (`<COMMIT_RANGE>`): focus preview server stability, TS-vs-Python drift, diagram nav, 66ch layout, branch hygiene. P0/P1 table + top 3 risks. TS-only for new layout code.
