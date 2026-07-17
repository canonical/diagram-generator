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
