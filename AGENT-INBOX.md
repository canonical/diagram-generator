# Agent inbox

Focused last-session -> next-session handoff only. Keep this short.

- **Human notes:** [`INBOX.md`](INBOX.md) — author -> agent.
- **Execution order & backlog:** [`TODO.md`](TODO.md) (read at session start).
- **Active-spec index:** [`docs/specs.md`](docs/specs.md).
- **Durable per-spec detail:** `specs/<id>-<slug>/`.

Do not park full session logs, spec inventories, or validation transcripts
here — those belong in the relevant `specs/<id>-<slug>/` package.

---

## Handoff — 2026-07-04 — spec 072 review follow-up implemented

Spec 072 is now **Closeout Ready** on `feat/072-preview-engine-hardening`.

- Render-node fitting is structurally enforced: `mountPreviewRenderNode` now
  requires a fit handler, source tests guard that every preview-shell caller
  passes one, and the scene/load hosts fail fast if a stage mount path ever
  loses fitting.
- The stale active-engine badge path is gone from the HTML template, runtime
  chrome owner, and preview-host contract surface; tabs + help text are the only
  engine chrome.
- Section-heading bottom spacing is now `+8px` through `SHARED_BOX_RHYTHM`,
  with contract/assertion updates and refreshed SVG goldens.
- Playwright-backed preview regressions now skip cleanly when chromium is
  unavailable instead of failing the whole `apps/preview` suite in browserless
  environments.

Validation just reran green:
- `npm --prefix packages/layout-engine test` -> `973/973`
- `npm --prefix apps/preview test` -> `160/160`
- `node scripts/check_no_new_python.mjs` -> ok

Remaining non-product note:
- `INBOX.md` still contains the recurring raw user notes because the user
  explicitly asked not to delete them yet. That admin cleanup is separate from
  spec 072 product closeout.

Next queue after 072 merge/review: 061 -> 064.
