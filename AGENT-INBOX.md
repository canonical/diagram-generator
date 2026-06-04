# Agent Inbox

Machine-generated handoffs, long diagnostics, and cross-repo follow-up notes go here.

Do not use this file for user notes. User-authored async notes belong in `INBOX.md`.

The agent should triage anything durable from this file into `TODO.md`, `STATUS.md`, `HISTORY.md`, or `docs/specs.md`, then empty this file back to this header template.

---

## Opus: verify no work lost during `main` reset and branch merge (2026-06-03)

**Priority:** P1 — audit before more preview work on `main`.

### Context

On **2026-06-03**, an agent cleaned up branches by:

1. `git stash` (uncommitted WIP on `editor.js` / tests)
2. `git checkout main`
3. **`git reset --hard origin/main`** → moved `main` to **`3fd3a18`**
4. `git merge feat/010-diagram-token-audit` (fast-forward → **`495baf6`**)
5. `git merge feat/005-autolayout-hardening` (fast-forward → **`6790df0`**)
6. `git push origin main`
7. Deleted local feature branches; restored stash (still uncommitted on `main`)

**Concern:** Local `main` before step 3 was **`31bce6e`**, which was **not** the same tip as `origin/main` (`3fd3a18`). A hard reset could have dropped unpushed commits if they were not recovered by the merges.

### Anchor SHAs

| Label | SHA | Date (author TZ) | Subject |
|-------|-----|------------------|---------|
| **Old local `main` (pre-reset)** | `31bce6ec62f135bf39e2de452c79258276eff292` | 2026-06-02 21:25:48 +0100 | Merge feat/010-diagram-token-audit: token audit, HUG fix, annotation weight, inbox triage |
| **`origin/main` at reset** | `3fd3a186ea19451b2b5728f7bd0383da90271e9f` | 2026-05-30 11:38:31 +0100 | engine: class-based styling, heading on non-containers, delete overrides |
| **After `feat/010` FF merge** | `495baf6d7fadf796112b226dda3fe1ba7d58a1c3` | (feat/010 tip) | docs: triage INBOX – top-level FILL default, root editable sizing; fix stale TODO items |
| **Current `main` / `origin/main`** | `6790df09fa4eafb0e2ebb9a0443a2aeedb38ff5a` | 2026-06-03 23:52:43 +0100 | fix: session-only delete, heading clear, and diagram-load readiness |

Recover pre-reset tip via reflog: `git reflog main` → look for `main@{n}: reset: moving to origin/main`; parent entry should be **`31bce6e`**.

### Commits on local `main` at `31bce6e` but NOT on `origin/main` at reset (`3fd3a18`)

These 18 commits were the “unpushed ahead of remote” set (merge-base was `3fd3a18`; local `main` already contained all of `3fd3a18` plus these):

```
31bce6e Merge feat/010-diagram-token-audit: token audit, HUG fix, annotation weight, inbox triage
495baf6 docs: triage INBOX – top-level FILL default, root editable sizing; fix stale TODO items
5c71416 docs: drain INBOX – annotation bold bug fixed, images cleaned
d437595 engine: fix annotation headings rendering bold – add weight=400 to annotation class
5ea522f docs: mark spec 010 complete – 46/46 tasks done
b339456 engine: conditionally display cols unit option when grid columns available
a19e729 engine: remove BLOCK_WIDTH floor from HUG leaf measurement – boxes shrink to content
3bf97f0 docs: annotate DIAGRAM.md tokens with role classifications (invariant/default/frozen-sample)
2ec51f0 specs: add spec 010 – DIAGRAM.md token audit and HUG sizing model fix
c4018e8 docs: reorganize TODO – move completed items to HISTORY, prioritize open spec work
914c084 engine: complete spec-009 phases 4-6 – all 23 diagrams verified, error handling added
fe7592c engine: complete spec-009 phases 1-3 – TS-only first-load rendering
3c6ad6f specs: add 009-client-side-ts-rendering spec package
da607f8 engine: spec 008 repo coherence (phases 1-4, 6-9), small caps via font-variant-caps
636b168 docs: update workflow files for cold start, drain AGENT-INBOX
672a9ad engine: port resolve_styles() to TypeScript, rewrite _frameBoxRenderState()
8ac2b15 engine: expand meta.diagram_type enum to 11 families
64d0a55 engine: harden style ownership and layout semantics
```

### Commits on `origin/main` at reset (`3fd3a18`) NOT reachable from old local tip `31bce6e`

**Expected count: 0** (old local `main` already included `3fd3a18` in its history). Confirm:

```bash
git rev-list --count 3fd3a18 --not 31bce6e   # expect 0
```

Notable commits on the `3fd3a18` ancestry (already in `31bce6e` history):

```
3fd3a18 engine: class-based styling, heading on non-containers, delete overrides
0daf2c1 engine: add missing importlib import in preview_server
8af97f7 engine: fix client-side small-caps rendering in layout bridge
0a52ab5 docs: update README, STATUS, copilot-instructions, frame-classes for v3-only engine
f19a3fe engine: delete all v2 logic, single render engine (autolayout v3)
d36da91 engine: small-caps rendering fix + level-3 non-container support
a9dd6a4 engine: three-tier frame class hierarchy (section > panel > leaf)
… (older merges feat/001–004, etc.)
```

### Commits added to `main` AFTER old local `31bce6e` (from `feat/005-autolayout-hardening`)

These 11 commits are **intentional new work**, not recovery from reset:

```
6790df0 fix: session-only delete, heading clear, and diagram-load readiness
c6818be fix: TS preview hot-reload on preview_server rebuild
a52cc9d fix: spec 017 adversarial follow-up — idempotent bindInteraction and delete tests
efa69fc docs: refresh adversarial review prompt and spec 012 SVG gap inventory
505fd98 feat: spec 017 restore preview frame delete
ff5a3ce feat: spec 013 TS preview API and spec 016 adversarial review followup
dd44081 fix: spec 015 preview stability and force-mode diagram nav
9141fc0 fix: harden preview server TS SVG export pool (spec 014)
4f12e76 feat: spec 011 figma autolayout fidelity and TS export path
5e8390f fix: P1 bugs and complete spec 005 WS1 semantic mutation removal
f41c1a5 feat: spec 005 coercion slice, preview save/reload hardening, doc consolidation
```

### Prior automated check (re-verify independently)

```bash
git fetch origin
git rev-list --count 31bce6e --not 6790df0   # prior result: 0
git merge-base --is-ancestor 31bce6e 6790df0 # prior result: yes
```

**Verdict (2026-06-03): SAFE** — human git review + `git rev-list --count 31bce6e --not 6790df0` = 0. Do not re-litigate reset.

### Agreed next steps (GPT + user)

1. Commit dirty-nav fix (prev/next + browse links when unsaved).
2. Spec **012** — finish **TS-only preview/render** (retire Python SVG runtime path; YAML is already authoring source of truth).
3. Resume specs **005** / **008** hardening.
4. Cleanup: rename preview flow test file, decompose `preview_server.py`.

### Task (historical — completed)

1. **Clone/fetch** and confirm `origin/main` is at **`6790df0`** (or report if it moved).
2. **Prove or disprove** that every commit reachable from **`31bce6e`** is reachable from **`6790df0`**.
3. **Tree-level check:**
   - `git diff 31bce6e 495baf6 --stat` — expect empty or explain any diff (FF merge target for feat/010).
   - `git diff 31bce6e 6790df0 --stat` — expect only files changed by the 11 feat/005 commits above; list unexpected paths.
4. **Patch-level spot check** for high-risk paths if any tree diff is non-empty:
   - `scripts/preview/editor.js`, `scripts/preview/layout-bridge.js`
   - `packages/layout-engine/src/resolve-styles.ts`, `scripts/frame_loader.py`
   - `scripts/preview_server.py`
5. **Reflog / orphans:** `git reflog main | head -20` and `git fsck --lost-found` — flag dangling commits not reachable from `6790df0` that look like lost product work (exclude stash).
6. **Uncommitted work:** stash was restored; **do not** treat uncommitted `editor.js` / test changes as lost commits—they were never on `31bce6e`.
7. **Deliverable:** Short verdict (**SAFE** / **LOSS DETECTED**), list of any missing SHAs or file-level regressions, and recommended recovery commands if anything is missing.

### Branches deleted locally (for orphan hunt)

`feat/001-box-style-contract` … `feat/005`, `feat/010`, `feat/spec-kit-retrofit-core-engine-specs` — tips were merged into `6790df0` via FF; remote tips may still exist on GitHub.

### Remote branches NOT merged (out of scope unless they were on old local main)

- `origin/feature/force-layout`
- `origin/svg/controller-agent-architecture`

---
