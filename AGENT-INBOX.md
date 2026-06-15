# Agent inbox

Machine-generated handoffs and diagnostics go here.

Durable follow-up belongs in `TODO.md`, [`AGENTS.md`](AGENTS.md#handover) (handover section), or [`docs/specs.md`](docs/specs.md).

---

## Spec 043 adversarial review (2026-06-15)

**Scope:** `specs/043-preview-shell-editor-ts-extraction/` — work to date on preview-shell editor TypeScript extraction.

**Verdict:** Substantial, real progress — but the spec is **not closeout-ready** and the architectural review bar in the spec itself would likely draw pushback. Behavior moved out of `editor.js` into typed modules with good unit-test coverage. What landed is closer to **relocating a monolith into a new `preview-shell` cluster wired through a mega-`LayoutEngine` global** than to achieving the stated end state: thin coordinator, obvious ownership, cheap multi-engine extension.

**Validation at review time:** All 532 `packages/layout-engine` tests pass. `editor.js` shrank from ~6,000 to **~2,890 lines** (~52%). `preview-shell/` is **46 files / ~9,671 lines**. Browser IIFE is **~3.75 MB**.

---

### Spec / plan / tasks alignment

| Area | Assessment |
|------|------------|
| Incremental slices | **Met** — boundaries, tasks, per-slice tests exist |
| `boundaries.md` as cold-start map | **Partially met** — useful, but "Landed" list is now too long to scan |
| `editor.js` as thin coordinator | **Not met** — still ~120 functions; pointer lifecycle, RAF resize relayout, artboard fitting, constraints, etc. |
| FR-007 / US4 (no engine branches in shell) | **Violated in places** — ELK guards remain in JS resize path |
| SC-004 (materially smaller coordinator) | **Partial** — half the lines, same coupling surface |
| Closeout tasks T012, T032–T033, T040–T043 | **Open** — correctly reflects incomplete work |
| `execution.md` | **Stale** — still says "keep inspector rendering in `editor.js`"; inspector HTML largely moved to TS |
| `AGENTS.md` handover | **Stale** — still cites spec 042 as active, not 043 |
| `docs/specs.md` | Lists 043 as **Draft** — reasonable |

The spec's **architectural review bar** (obvious ownership, no new inline UI assembly in `editor.js`, residual JS reads as glue) would be **failed or barely passed** by an external reviewer today.

---

### Big-picture architecture

#### 1. Monolith relocation, not decomposition

Highest-risk areas moved out of `editor.js` into several **new large modules**:

| Module | ~Lines | Risk |
|--------|-------:|------|
| `app-override-application.ts` | 586 | SVG override pass — high regression surface |
| `app-interaction-host.ts` | 580 | drag/resize planning |
| `app-arrow-waypoints.ts` | 562 | arrow geometry + DOM |
| `grid-controls.ts` | 326 | form/state |
| `app-bootstrap.ts` | 309 | boot wiring |

Traded **one 6k-line trap file** for **a 10k-line subsystem** plus a still-large `editor.js`. Defensible as migration phase; **not** the lean standalone repo the spec optimizes for.

#### 2. `LayoutEngine` became the new integration bottleneck

`browser-entry.ts` re-exports **200+ preview-shell symbols** into a single global. Every slice adds surface area to one flat namespace. Contradicts FR-013 / US5 preference for **typed registries and manifests** over central branching.

External architect question: *"Where is the shell contract?"* Answer today: *grep `LayoutEngine.` in `editor.js` (100 call sites) and read a 3.75 MB bundle.*

#### 3. Callback-injection architecture hides ownership

Dominant pattern: TS decides the branch; JS provides all side effects via callbacks (`loadPreviewSvg`, `restorePreviewSerializedState`, `dispatchPreviewDragCompletion`, `dispatchPreviewKeyboardShortcut`, etc.).

- **Pros:** state machines testable in isolation.
- **Cons:** real ownership split across TS branch logic + JS callback wiring. Wrong callback order or missing hook → subtle regressions unit tests won't catch (they mock `vi.fn()` callbacks, not the actual shell).

Only `editor.js` integration test found: `apps/preview/src/persistence/editor-keydown.test.ts` — verifies **delegation wiring**, not behavior outcomes. Spec asked for **one focused controller/DOM/browser regression path per interaction slice** — **not met** for drag/resize/grid.

#### 4. Inconsistent extraction depth

| Path | TS | Still raw in `editor.js` |
|------|----|--------------------------|
| `setFrameProp` | `applySingleFramePropMutation` | undo/dirty/relayout debounce glue |
| `setFrameAlign` | **none** — direct `overrides[cid].align = align` | full mutation |
| `setMultiFrameAlign` | **none** — inline for-loop | full mutation |
| `setMultiFrameProp` | `applyMultiFramePropMutation` | glue only |
| Inspector HTML | `render*InspectorPanel` in TS | style option HTML assembly still in JS for multi-select |
| Distribute/align UX | target math in TS | `alert()` guards in JS |

`frame-prop-actions.ts` has no `align` mutation helper — align changes **miss the same normalization path** as other props.

#### 5. HTML-in-TS + global `onclick` — worst of both worlds

Inspector panels in TS still emit inline handlers, e.g. `onclick="setFrameAlign('${cid}','${point}')"`.

- Tight coupling to `window.setFrameAlign`, `clearOverride`, `alignSelection`, etc.
- **No HTML escaping** on `cid` in inspector panels (contrast: `app-load.ts` uses `escapeHtml` for error markup).
- Untestable UI wiring without a browser.
- Spec allowed DOM glue in JS temporarily; instead markup moved to TS while event binding stayed on globals.

#### 6. DOM logic migrated into TS modules

`app-override-application.ts` ~30 DOM touches; same for `app-stage-svg`, `app-bootstrap`, `app-view-modes`, `app-arrow-waypoints`. Blurs stated boundary ("TS owns logic, JS owns DOM"). These are **browser host code in TypeScript**, not pure view-models.

#### 7. `editor.js` smaller but not coordinator-shaped

`loadSVG` is a good thin delegate. But large blocks remain inline:

- `autoFitArtboard` (~50 lines SVG `getBBox` traversal)
- `collectSnapTargets` / `findSnaps`
- `deleteSelectedFrames`
- `_scheduleV3ResizeRelayout` with **ELK-specific guard** in shell JS
- Full pointer lifecycle: `onSvgMouseDown`, `onDragMove`, `onResizeMove`, waypoint drag, text edit
- `setMultiFrameAlign` / `setFrameAlign` raw override mutation

#### 8. `layout-bridge.js` trap unchanged

~1,900 lines, untouched. Extraction improved `editor.js` but **did not reduce total shell complexity**.

#### 9. Spec 038 seams — mostly preserved, bundle coupling increased

Good: `frame-override-manifest.ts` single source; no design-foundry dependency; tokens/text-layout adapters reused.

Concern: shipping **entire** layout-engine browser bundle (~3.75 MB) for shell helpers increases relocation surface.

#### 10. Documentation drift undermines cold-start (US3)

- `boundaries.md` "Landed" ~50 bullets — too long to scan.
- `execution.md` contradicts current reality.
- No tier-2 flow map for shell callback ordering.
- T031 subtasks done but T012 open — boundaries.md reads like inspector extraction is finished.

---

### Low-level coding issues

**Security / correctness**

1. Unescaped `cid` in HTML attributes (`inspector-single-panel.ts`, `inspector-multi-panel.ts`).
2. `alert()` for business-rule UX in distribute/align/delete — untestable, still in shell JS.

**Type safety**

3. `unknown` in hot paths (e.g. `overrideSnapshotBefore` in completion dispatch).
4. `Record<string, unknown>` on inspector node types — weak contracts; JS shell has no compile-time help.

**Mutation model**

5. In-place `overrides` mutation in `frame-prop-actions.ts` + JS still mutating directly (`setFrameAlign`) = two mutation authorities.
6. `_coercedKeys` declared after functions that use it (works at runtime, readability hazard).

**Duplication / noise**

7. Many one-line delegators in `editor.js`.
8. Triple export barrels: `preview-shell/index.ts` (~595 lines) + `browser-entry.ts` + global `LayoutEngine`.

**Testing gaps**

9. Shallow tests for complex modules (`inspector-multi-options.test.ts` — 1 test; `grid-info.test.ts` — 1 test).
10. Dispatch tests prove callback invocation, not outcomes.
11. No drag/resize/grid shell regression — spec requirement unmet.
12. `editor-keydown.test.ts` via `vm.runInNewContext` — clever, fragile.

**Bundle / build**

13. 3.75 MB IIFE — no tree-shaking on global bundle path.
14. `dist/` artifacts untracked in git — keep ignored, don't commit.

**Windows**

15. Git status duplicate path separators for some `preview-shell` files — confirm no duplicate-file confusion on Windows mounts.

---

### What went well

1. Real behavior extraction — selection, keyboard, grid, override application, restore planning have genuine TS logic + tests.
2. `boundaries.md` + `agent-index` link — correct pattern; needs trimming for closeout.
3. `frame-override-manifest.ts` — right seam for persist/relayout.
4. Test economy mostly respected — focused vitest per module.
5. `loadSVG` / bootstrap / relayout — good coordinator delegation examples.
6. `frame-prop-actions.ts` + `frame-style.ts` — clean, testable slices.

---

### Success criteria scorecard

| Criterion | Status |
|-----------|--------|
| SC-001: stop defaulting to `editor.js` | **Partial** |
| SC-002: explicit owners outside monolith | **Partial** — overlap and callback-split |
| SC-003: cold-start without spec 026 | **Mostly met** |
| SC-004: materially smaller coordinator | **Partial** |
| SC-005: focused tests per slice | **Mostly met** — weak shell integration |
| SC-006: engines don't use `editor.js` | **Not met** — ELK guard in resize path |
| SC-007: browser bundle integration | **Met** — bundle huge |
| SC-008: reviewer maps owners from boundary note | **Weak** |

---

### Highest-priority fixes before closeout

**Architecture (P0)**

1. Define a real shell contract — small typed interface/registry instead of growing flat `LayoutEngine.*` exports.
2. Finish inconsistent mutations — `applySingleFrameAlignMutation` / `applyMultiFrameAlignMutation` (or extend `frame-prop-actions`); delete raw override loops in `editor.js`.
3. Extract remaining business logic — `autoFitArtboard`, snap-target collection, `deleteSelectedFrames` orchestration, ELK resize guard → engine-owned module.
4. One shell integration test per interaction axis — drag-end, resize-end, grid change (minimal DOM fixture or single Playwright test).

**Code quality (P1)**

5. Escape or ban raw `cid` in HTML — `data-action` + delegation, or `escapeHtml(cid)`.
6. Replace `onclick="globalFn(...)"` with delegated listeners.
7. Trim `boundaries.md` — short table for "Landed"; move history elsewhere.
8. Split mega-modules — `app-override-application`, `app-interaction-host`, `app-arrow-waypoints` becoming trap files.

**Closeout hygiene (P1)**

9. Complete T012, T032, T033, T040–T043.
10. Update `execution.md`, `AGENTS.md` handover, `docs/specs.md` status.
11. Add ≤60-line tier-2 flow map for shell callback ordering (load → override → relayout → inspector refresh).

---

### Bottom line (external architecture review framing)

> We extracted preview shell logic from a 6k-line JavaScript file into a typed `preview-shell` package with unit tests, but the browser host is still a thick JS coordinator wired through a global `LayoutEngine` bag of 200+ functions. Ownership is documented but inconsistent; several mutation paths bypass the typed layer; HTML rendering moved to TypeScript without fixing event wiring; strong module tests but weak shell integration tests. Migration direction is correct; closeout bar in the spec is not yet met.

**Key files:** `scripts/preview/editor.js`, `packages/layout-engine/src/preview-shell/`, `packages/layout-engine/src/browser-entry.ts`, `specs/043-preview-shell-editor-ts-extraction/boundaries.md`, `specs/043-preview-shell-editor-ts-extraction/tasks.md`.
