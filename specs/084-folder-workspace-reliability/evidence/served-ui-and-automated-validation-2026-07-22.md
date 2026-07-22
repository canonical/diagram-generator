# Served UI and automated validation — 2026-07-22

Branch: `feat/084-folder-workspace-reliability`.

## Served UI check

The stale 075 process was stopped and the preview server was started from this
worktree on `http://127.0.0.1:8100/` (Node PID 49808, `src/server.ts --port
8100`). A connected Chrome session opened
`/view/v3:ai-infra-production-contract`.

The rendered page contained:

- the `Folder workspace` section heading;
- a dedicated `#dg-workspace-status` live region reporting `1 folder need
  permission to reconnect.` for the session's denied remembered handle;
- a visible adjacent `Reconnect folder…` action; and
- a separate `#build-status`, with accessible name `Preview build status` and
  text `Ready`.

This proves the served branch exposes recovery and no longer visually assigns
folder meaning to the build-status indicator. It does **not** exercise the
native OS chooser, its cancel path, or permission re-grant.

## Automated validation

- `npm --prefix packages/layout-engine exec vitest run tests/local-folder-workspace.test.ts` — 14 tests passed.
- `npm --prefix packages/layout-engine test` — 179 files passed; 1,140 tests
  passed, 3 skipped.
- `npm --prefix apps/preview run test -- src/persistence/preview-host-contract.test.ts` — passed.
- `npm --prefix packages/layout-engine run build:browser` — passed.
- `node scripts/check-browser-bundle-fresh.mjs` — passed.
- `node scripts/check_no_new_python.mjs` — passed.

Native Chrome chooser/revoke/re-grant/save-reload evidence remains the hard
closeout gate in `quickstart.md`.
