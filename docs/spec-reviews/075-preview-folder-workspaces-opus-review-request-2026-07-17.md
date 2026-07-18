# Opus adversarial review request — Spec 075

Review `feat/075-preview-folder-workspaces` adversarially against current `main`.
This is a closeout review, not a summary exercise. Inspect `git diff main...HEAD`
and trace the production routes through the typed owners.

Read first:

1. `AGENTS.md`
2. `AGENT-INBOX.md`
3. `docs/agent-index.md`
4. `specs/075-preview-folder-workspaces/spec.md`
5. `specs/075-preview-folder-workspaces/tasks.md`
6. `specs/075-preview-folder-workspaces/workspace-flow.md`
7. `specs/075-preview-folder-workspaces/validation.md`
8. `docs/spec-reviews/075-preview-folder-workspaces-adversarial-review-2026-07-17.md`

Review especially:

- whether Save a copy transfers the current unsaved payload, cannot overwrite an
  existing target, gates success on the chosen handle, cleans partial failures,
  and navigates to the writable qualified copy;
- optimistic concurrency for server-root save and import, including multi-tab,
  reload, keep-mine, retry, and malformed/missing revision behavior;
- local-folder external-change handling for save and new interchange imports;
- source unregister/cache disposal on forget, module teardown, SIGINT, SIGTERM,
  repeated open/close, and error paths;
- read-only enforcement at every mutation boundary;
- path containment, ingest bounds, safe-YAML behavior, and source-id/slug
  ambiguity;
- IndexedDB restore/migration, same-name folders, denied permissions, and races
  between restore/forget/save;
- the spec-046 architecture ratchet: no new behavior ownership in legacy JS;
- test quality, false-positive evidence, and requirements/tasks that are marked
  complete without sufficient proof.

Treat the Chromium harness accurately: it uses real OPFS
`FileSystemDirectoryHandle` objects and the production picker affordance, but
deterministically supplies the handles. It does **not** prove the native OS
chooser or an actual browser permission revocation/regrant. Do not close T045
without separate evidence.

## Required output behavior

Do **not** leave the review only in chat. Use file-editing tools and write the
complete review to this exact repository path:

`docs/spec-reviews/opus-adversarial-review-findings-2026-07-17-spec-075.md`

Create that file even if there are no findings. It must contain:

- verdict: Block / Changes requested / Closeout ready;
- findings ordered Critical → High → Medium → Low, each with stable ID, exact
  file/line evidence, failure scenario, user impact, and concrete remediation;
- requirements/task-status mismatches;
- validation performed and validation gaps;
- explicit disposition of T045 and whether merge is safe.

Do not modify product code, specs, tasks, catalog, inbox, or this request file.
After writing the findings file, reply in chat with only a one-line pointer to
the file so the durable review is not trapped in chat history.
