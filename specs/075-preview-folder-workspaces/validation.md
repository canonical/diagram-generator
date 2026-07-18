# Validation: Spec 075 Preview folder workspaces

Date: 2026-07-17

## Automated evidence

- Layout engine: 171 files, 1,062 tests passed.
- Preview: all 188 executable tests pass; one Windows symlink-containment test
  is skipped because symlink creation is unavailable.
- TypeScript builds: layout engine and preview app pass.
- Browser bundle: rebuilt; freshness check passes.
- Architecture/safety: no-new-Python ratchet and `git diff --check` pass.

## Chromium filesystem journey

`node scripts/verify-folder-workspace-chromium.mjs` against the production
preview bundle passes with:

- two real OPFS `FileSystemDirectoryHandle` objects whose directory names match;
- distinct qualified source ids and independent writes to `alpha.yaml` and
  `beta.yaml`;
- persisted handle restore and two grouped "Same name" sources after reload;
- external file modification preserved after the editor refuses overwrite (409);
- a read-only bundled example copied with its unsaved override payload to the
  chosen writable handle.

The in-app browser was unavailable. The harness deterministically supplies real
browser filesystem handles to the production picker affordance, so it does not
prove interaction with the native OS chooser or an actual browser permission
revocation/regrant. T045 remains partial until that manual/native evidence exists.

## Open-folder navigation regression — 2026-07-18

A user opened a valid five-file folder but the large bundled list made the browse
surface look unchanged; restored server registrations could also be recreated
after the page HTML was rendered without refreshing that navigation.

The typed workspace owners now:

- list local folders before server roots and bundled examples;
- report whether `/api/workspaces/open` created an ephemeral registration;
- reload navigation once when persisted-handle restore recreates a registration,
  without looping when it already exists.

Validation:

- `npm --prefix packages/layout-engine test -- local-folder-workspace` — 7 passed.
- focused preview contracts for workspace open and typed browse ordering — 2
  passed.
- layout-engine browser bundle rebuilt and freshness check passed.
- layout-engine and preview TypeScript builds passed.
- production Chromium real-OPFS journey passed with two restored same-name
  sources, independent saves, external-change 409, and Save a copy.

The broad preview contract file has one unrelated failure against the user's
uncommitted `diagrams/1.input/request-to-hardware-stack.yaml`: that file now
selects `elk-layered` while the historical fixture assertion expects `v3`. The
user-owned YAML was not modified or reverted.
