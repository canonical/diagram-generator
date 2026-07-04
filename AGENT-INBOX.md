# Agent inbox

Focused last-session -> next-session handoff only. Keep this short.

- **Human notes:** [`INBOX.md`](INBOX.md) — author -> agent.
- **Execution order & backlog:** [`TODO.md`](TODO.md) (read at session start).
- **Active-spec index:** [`docs/specs.md`](docs/specs.md).
- **Durable per-spec detail:** `specs/<id>-<slug>/`.

Do not park full session logs, spec inventories, or validation transcripts
here — those belong in the relevant `specs/<id>-<slug>/` package.

---

## Handoff — 2026-07-04 — spec 072 merged

Re-reviewed the closeout commit `e127dda` against my four prior findings, and
independently reran validation (not taken on trust). **The fixes are real and
the committed work is merge-ready.**

Verified fixed:
1. **Render-node fit — structurally enforced (was the main risk).**
   `mountPreviewRenderNode.fitSvgToContent` is now a **required** param and is
   called unconditionally; `app-scene-host` and `app-load` **throw** if the
   underlying fit is ever missing (fail-fast, not silent skip); and
   `preview-render-node.test.ts` now source-scans every `mountPreviewRenderNode(`
   caller and asserts `missingFitCallers` is empty. This is the structural
   guarantee I asked for, not a convention.
2. **Skip guard added.** `playwright-test-support.ts::launchChromiumOrSkip`
   `t.skip()`s on chromium launch failure, so a browserless env no longer reds
   the suite.
3. **T010 badge removed.** `active-engine-label` is gone from src + templates
   (grep-confirmed); chrome owner shed ~35 lines; tests updated.
4. **T013 spacing.** `SHARED_BOX_RHYTHM.headingBottomGap = INSET + 8`; SVG
   goldens refreshed to match.

Independently reran (green):
- `packages/layout-engine` → `973/973`
- `apps/preview` → `160/160`, **skipped 0** (the Playwright padding / canvas-parity
  / layered-radial-dagre isolation / save→reload proofs actually executed)
- `check_no_new_python`, `check-browser-bundle-fresh`, `check-preview-shell-size-budgets` → ok

`feat/072-preview-engine-hardening` is now merged to `main`, and the 072
package is moved under `docs/spec-archive/072-preview-engine-hardening/`.

Two non-blocking caveats before/after merge:
- **INBOX.md is still not drained** (uncommitted `M INBOX.md`). It is *not* part
  of the merge (uncommitted), so the committed work is clean — but the human
  bug backlog still duplicates spec-tracked items. Drain into 061/064/closed as
  a follow-up; do not silently delete.
- **Substrate done ≠ symptoms gone.** Merging 072 hardens the render/engine
  architecture; it does **not** close the reported user symptoms (mongo-octavia
  layout, sequence styling contract, unknown-variant, horizontal→vertical arrow
  break, “box styling does nothing”). Those live in 056/057/058/059/063/069 and
  the 061/064 queue. Do not mark user bug reports resolved on this merge.

Next queue after 072 merge: 061 (grid regression) → 064 (arrow label de-overlap).
