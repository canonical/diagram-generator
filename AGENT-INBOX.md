# Agent Inbox

Machine-generated handoffs, long diagnostics, and cross-repo follow-up notes go here.

Do not use this file for user notes. User-authored async notes belong in `INBOX.md`.

The agent should triage anything durable from this file into `TODO.md`, `STATUS.md`, `HISTORY.md`, or `docs/specs.md`, then empty this file back to this header template.

---

## Session handoff — 2026-06-04

### What landed (2 commits on main, unpushed)

**`6bba9dd` engine: canonical frame-stroke-width via resolvedStrokeWidth**
- `DEFAULT_FRAME_STROKE_WIDTH = 1` token (TS + Python) wired to `DIAGRAM.md spacing.frame-stroke-width`
- `resolvedStrokeWidth` field on `Frame`, set by `applyFrameClass()` — hidden/annotation = 0, leaf/panel/section/highlight = 1
- `effectiveResolvedStrokeWidth()` reads resolved value when `resolveStyles()` has run; falls back to border field otherwise
- `strokeInsetPerSide()` and layout/SVG render use this instead of the hardcoded `border === SOLID ? 1 : 0`
- Annotation leaf padding: 0 left/right (INSET top/bottom only)
- `android-custom-to-cloud.yaml`: icons on two sections, consolidated label lines, width set to 464

**`69ace3a` editor: fix inspector regression + revert gap field to single Gap**
- Restored missing `let html` init in `updateInspector()` — composer deleted it, breaking the entire inspector
- Reverted Title gap / Stack gap split back to a single "Gap" field for all containers (writes `frame.gap`)
- `heading-synthesis.ts`: `stackGap` option added so YAML `stack_gap` survives load/reload
- `frame-yaml-loader.ts`: forwards `data.stack_gap` as `stackGap` option
- Two new tests guard the `stack_gap` YAML round-trip (TS + Python)

### Pre-existing failures (NOT introduced this session)
- 12 TS parity failures: `test-deep-nesting` width off by 16px (Python layout computes differently)
- 5 Python parity failures: `__body` frame ID differences

### What to do next

**Highest priority (pick one to start):**

1. **Spec 012 T030–T040** — Arrow heads and overlays in `svg-render.ts`. This is the main remaining blocker before closing 012 and retiring `diagram_render_svg.py`. See `specs/012-ts-svg-renderer-retire-python/`.

2. **Spec 019 inspector cleanup** (`specs/019-preview-inspector-cleanup/`) — Remove the four redundant read-only header fields (Component id, Computed position, Size, Layout) that are now duplicated by the Auto-layout panel. This is a contained `editor.js` change that will clean up the panel significantly. Spec is at `specs/019-preview-inspector-cleanup/spec.md`. No tasks.md yet — generate it or implement directly.

3. **Spec 008 Phase 5 T040–T047** — Resolved-style snapshot fields (T040–T044) and regression tests (T045–T047). 8 tasks, see `specs/008-repo-coherence-rewrite/`.

**Standalone bugs to pick off when small:**
- Root direction vertical→horizontal should reset children to HUG (in `TODO.md` Priority 3)
- M2: `ARROW_CLEARANCE` triple-defined (trivial)

### Notes for the next agent
- `specs/018-png-export/` and `specs/019-preview-inspector-cleanup/` are untracked (not staged). Commit them if taking up those specs.
- The preview server should still be running at `http://127.0.0.1:8100` from this session.
- All tests: `npm --prefix packages/layout-engine test -- --run` (12 pre-existing failures OK) and `python -m pytest test_frame_loader.py test_frame_yaml_persistence.py -q` (46 pass).


## Bug: root direction vertical → horizontal should reset top-level sizing to hug

**Reported:** 2026-06-04 (`android-custom-to-cloud` editor pass)

**Symptom:** After switching the page (root) `direction` from `vertical` to `horizontal`, top-level section/column frames stay `sizing_h: fill` (or otherwise FILL on the old primary axis). They stretch to equal column width/height instead of hugging content.

**Expected:** On root direction change, **all direct children of `page`** should reset to **hug** on the layout primary axis (and cross-axis as appropriate), so authors re-opt into `fill` deliberately. Same behavior in preview inspector and in any YAML persistence of that edit.

**Reference diagram:** `android-custom-to-cloud` — four top-level sections (`custom_files`, `host_tools`, `anbox_cloud`, `virt_instance`).

**Where:** Preview editor direction handler (`scripts/preview/editor.js` or layout-bridge), optional mirror in `scripts/frame_yaml_persistence.py` when `direction` is saved on `page`.

---

## Process: agents must not replace frame YAML wholesale

**Context:** `android-custom-to-cloud` stakeholder edit (2026-06-04).

**What happened:** User tuned layout in the preview UI (`direction: vertical`, parent `gap: 0`, etc.). An agent rewrote `scripts/diagrams/frames/android-custom-to-cloud.yaml` from git/assumptions instead of the on-disk (or saved) file, dropping editor state and adding structure not in the source (e.g. `Consumes` / `Instance` panels).

**How save works:** Preview **Save** POSTs override deltas to `/api/overrides/<slug>`, which merges into YAML via `scripts/frame_yaml_persistence.py` (`persist_override_payload_to_yaml`). Only keys present in the override payload are written—not a full tree export. Unsaved inspector changes live only in the browser until Save.

**Agent rule:** Before editing a frame YAML, read the current file from disk. Apply minimal diffs for the requested fix. Do not revert user-saved `direction` / `gap` / `padding` unless asked. If the user may have unsaved UI edits, say so and ask them to Save first (or paste overrides).
