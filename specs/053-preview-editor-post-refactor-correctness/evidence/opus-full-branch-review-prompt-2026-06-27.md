# Opus full-branch re-review prompt

Review the full `feat/053-preview-editor-post-refactor-correctness` branch in
the `diagram-generator` repo.

Target branch state:

- Review the committed branch at `84cce35` (`Harden preview save payload and arrow identity`).
- Diff against `origin/main`, then read the current source where needed.
- Do not rely on summaries alone; inspect the actual diffs and the owning files.

Review mode:

- Findings first, ordered by severity, with file/line references.
- Prioritize real defects, architectural regressions, client/server contract
  drift, save/persist hazards, routing identity bugs, reload-state hazards, and
  missing durable tests.
- Keep the summary brief after findings.

Repo workflow constraints:

- Read `AGENTS.md` and `docs/agent-index.md` first.
- Treat `scripts/preview/*.js` as legacy compatibility shell, not a valid new
  ownership surface.
- Focus on TypeScript owners and the YAML persistence path.

Branch context to verify:

1. Save payload normalization now lives in typed
   `packages/layout-engine/src/preview-shell/app-save-payload.ts`.
   Check that it:
   - converts transient frame deltas `dx/dy/dw/dh` to canonical persisted
     fields,
   - drops synthetic `__body` / `__heading` ids,
   - keeps unsupported arrow-only keys from aborting unrelated frame saves,
   - still fails clearly when a frame delta cannot be canonicalized.
2. Save/reload state handling now lives in
   `packages/layout-engine/src/preview-shell/app-save-client.ts`.
   Check that it:
   - clears `removedIds` before canonical reload,
   - restores the prior deletion set if reload fails after a successful save,
   - does not desync the client into a false "save failed" state.
3. Preview arrow identity is now owned by
   `packages/layout-engine/src/preview-arrow-component-ids.ts`.
   Check that the branch-wide client/server path stays aligned across:
   - preview render ids,
   - duplicate parallel edges,
   - explicit arrow ids,
   - `arrow:<id>` / branch-attachment routing,
   - separator-safe ids containing `->` or `#`.
4. Persistence/routing owners to inspect:
   - `packages/layout-engine/src/arrow-routing.ts`
   - `packages/layout-engine/src/preview-shell/app-arrow-render.ts`
   - `packages/layout-engine/src/preview-shell/app-diagram-data.ts`
   - `packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts`
   - `apps/preview/src/persistence/frame-diagram.ts`
   - `apps/preview/src/persistence/frame-engine-layout-namespaces.ts`
5. Manifest / contract surface:
   - `packages/layout-engine/src/preview-shell/frame-override-manifest.ts`
   - `packages/layout-engine/src/index.ts`
   - changed tests under `packages/layout-engine/tests/` and
     `apps/preview/src/persistence/`

Validation already run on this branch state (2026-06-27):

- `npm --prefix packages/layout-engine test`
- `npm --prefix apps/preview test`
- `npm --prefix packages/layout-engine run build:browser`
- `node scripts/check-browser-bundle-fresh.mjs`
- `node scripts/check_no_new_python.mjs`

All of the above passed locally after `84cce35`.

Important note on remaining uncommitted files:

- The remaining dirty/untracked files are review artifacts or notes:
  `AGENT-INBOX.md`, `INBOX.md`,
  `specs/053-preview-editor-post-refactor-correctness/evidence/*`,
  `specs/054-preview-persistence-model-typescript/`, and `image.png`.
- Do not treat those as evidence that the product-path save/routing fixes are
  still only in the working tree.

Please answer:

1. What are the highest-severity remaining defects or regressions on this
   branch?
2. Is there any remaining client/server mismatch in preview save payloads,
   override ids, or routing identity?
3. Does the preview-arrow identity split have any hidden regressions in
   selection, save, reload, duplicate-edge handling, or `arrow:<id>` routing?
4. Are the tests now sufficient for the durable contracts they claim to
   protect?
5. What, if anything, should still be fixed before branch closeout?
