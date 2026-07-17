# Tasks: Spec 075 Preview folder workspaces

**Input**: `specs/075-preview-folder-workspaces/spec.md`
**Plan**: `specs/075-preview-folder-workspaces/plan.md`
**Branch**: `feat/075-preview-folder-workspaces`

Legend: `[P]` = parallelizable with siblings in the same phase.
Each phase is independently shippable. Do not start a phase before its
predecessor's tests are green.

## Phase 0: Source abstraction (behaviour-identical)

- [x] T001 Read the current single-dir flow end to end and note exact seams:
      `apps/preview/src/server.ts` (`FRAMES_DIR`, install deps, `WATCH_PATHS`),
      `apps/preview/src/preview-host/builtin-host-runtime.ts` (`listYamlSlugs`,
      `isSafeSlug`, `createBuiltinPreviewHostInstallDeps`),
      `apps/preview/src/preview-host/frame-document-actions.ts`,
      `apps/preview/src/persistence/frame-diagram.ts`.
- [x] T002 Add the typed `DiagramWorkspaceSource` interface
      (`id`, `label`, `kind`, `writable`, `list()`, `read(slug)`,
      `write(slug, yaml)`, `has`, optional `resolvePath`) and a `DiagramEntry`
      model (qualified id, slug, source id, title, writable) in
      `apps/preview/src/preview-host/workspace/diagram-workspace-source.ts`.
- [x] T003 Add a `WorkspaceRegistry` that holds an ordered source list and
      parses/formats qualified slugs (`sourceId:slug`), rejecting malformed ids,
      in `apps/preview/src/preview-host/workspace/workspace-registry.ts`.
- [x] T004 Implement `server-root-source.ts` wrapping the current directory
      behaviour (`list` via a yaml-stem scan, `read`/`write` by slug), with
      realpath containment for `slug → path` (`resolveContainedFramePath`).
- [x] T005 Route the autolayout diagram listing in
      `createBuiltinPreviewHostInstallDeps` through the registry/default source
      (single default root registered from `framesDir`/`DG_FRAMES_DIR`).
      **Partial:** listing is rerouted; the render/read + save request paths
      still key off `framesDir` directly and move onto the source in Phase 1.
- [x] T006 [P] Add unit tests: qualified-slug parse/format, registry ordering +
      duplicate rejection + address resolution, server-root `list/read/write`,
      and realpath containment rejection (traversal, absolute, separator,
      symlink escape) — `apps/preview/src/persistence/workspace-source.test.ts`.
- [x] T007 [P] Add a `persist → reload` round-trip test for the server-root
      source proving write→read fidelity on disk.
- [x] T008 Verify no nav/open/save code path references a raw directory after
      this phase. Read/render/save resolve a typed source at the request boundary;
      downstream `framesDir` is an adapter detail supplied only by that source.

## Phase 1: Multiple server roots + grouped nav

- [x] T010 Add root parsing: repeatable `--root label=path` args; keep
      `DG_FRAMES_DIR` as the default root. Wired in `apps/preview/src/server.ts`
      (`parseWorkspaceRootSpecs`), with de-duplicated source ids.
- [x] T011 Register each configured root as its own `server-root` source in
      registry order (default first, then `--root` sources). **Partial:** a
      distinct read-only `bundled-examples` source (vs. the writable default
      corpus dir) is not yet split out — see T014.
- [x] T012 Grouped nav. Viewer routes may now contribute typed browse sections;
      autolayout emits one labelled section per workspace source while the Force
      lane remains independently registered. Default slugs stay bare and other
      sources remain qualified.
- [x] T013 Qualified-address resolution: the request boundary resolves
      `sourceId:slug` to the right source folder + bare slug via the registry;
      bare slugs resolve to the default source (backward compatible). `v3:`
      prefix + `isSafeSlug` (`:` allowed) carry qualified addresses through.
- [x] T014 Mark `bundled-examples` read-only whenever another writable source is
      present, carry `writable` into nav links, display a lock affordance, and
      reject document/import writes at the typed API boundary. "Save a copy"
      remains T032.
- [x] T015 Extend the file watcher to watch every server-root path
      (`WORKSPACE_ROOT_DIRS` folded into `WATCH_PATHS`). Per-source SSE origin
      tagging deferred with T012 nav polish.
- [x] T016 [P] Add tests: two-root aggregation + non-colliding qualified slugs
      for duplicate filenames (SC-001), qualified/bare address resolution, and
      directory-less sources — `workspace-source.test.ts`.
- [x] T017 [P] Add a `persist → reload` round-trip test that writes to a
      non-default writable root and reloads identically (SC-002, server side).

## Phase 2: Browser open-folder source (File System Access)

- [x] T020 Add the typed `local-folder` controller under
      `packages/layout-engine/src/preview-shell/`: picker open, bounded root-level
      `.yaml` enumeration, ephemeral localhost render-cache registration, and
      handle-scoped disk commit.
- [x] T021 Persist multiple directory handles in IndexedDB keyed by source id;
      restore granted handles and show a one-click reconnect action for dropped
      permissions. Migrate the old single `last-folder` record.
- [x] T022 Make the browser handle authoritative for local-folder saves. The
      localhost cache canonicalizes YAML; Save remains failed/dirty until the
      file-handle write succeeds (FR-006, SC-008).
- [x] T023 Add the visible "Open folder…" affordance and register `local-folder`
      sources into the grouped nav through typed preview-shell and preview-host
      seams. Legacy JS changes remain one-line/thin delegation only.
- [x] T024 Feature-detect FS Access write support; hide "Open folder", do not
      capture Ctrl/Cmd+O, and show `--root "Name=path"` guidance where unsupported.
- [x] T025 Rebuild the browser bundle and confirm `check-browser-bundle-fresh`
      passes; keep `dist/` uncommitted.
- [x] T026 [P] Add controller tests for multiple handles, per-source save routing,
      denied-permission reconnect, external-change refusal, and handle-scoped
      writes.
- [x] T027 [P] Local-folder `persist → reload`: unit contracts plus
      `scripts/verify-folder-workspace-chromium.mjs` prove canonical save to real
      browser filesystem handles and persisted multi-handle restore.
- [x] T028 Give newly opened local folders collision-resistant `local-*` source
      ids and reuse a stored id only when `isSameEntry` confirms the same handle;
      prove same-named folders save independently.
- [x] T029 Bound folder ingest to 500 YAML files, 2 MiB per file, and 25 MiB
      total in both browser and server; reject case-insensitive duplicate names
      before registering a partial source.

## Phase 3: Conflict handling, empty state, polish

- [x] T030 Add external-change detection. Local folders re-read and compare the
      last committed content; server roots use SHA-256 optimistic revisions.
- [x] T031 Require explicit overwrite/reload or keep-external/keep-mine choices
      for local-folder and server-root conflicts.
- [x] T032 Implement "save a copy to a writable folder…" for edits attempted on a
      read-only source (FR-004, SC-003); route the copy to a chosen writable source.
- [x] T033 Add first-run explanatory copy alongside bundled examples and the
      prominent Open folder action.
- [x] T034 Give read-only links accessible locks, enforce the server gate, and
      replace Save with an accessible "Save a copy…" affordance before mutation.
- [x] T035 [P] Add a maximum-ingest navigation performance contract (500 slugs
      across five sources) proving grouped nav string generation stays responsive.
- [x] T036 Gate save success on the browser-handle commit. Permission/write/
      conflict failures return non-2xx to the existing save client so dirty state
      is retained.
- [x] T037 Dispose ephemeral local-folder cache directories on host shutdown and
      remove stale source registrations when a folder is forgotten.
- [x] T038 Route Mermaid/D2 export and interchange import through qualified source
      resolution; mirror successful local-folder imports through the same
      browser-handle commit gate.

## Phase 4: Security, docs, closeout

- [x] T040 Confirm safe-mode YAML parsing across all sources and add a test that a
      malicious/custom-tag YAML does not execute or escape (FR-009).
- [x] T041 Add path-traversal rejection tests for server roots: `../` slug,
      absolute escape, symlink escape (SC-005, FR-008).
- [x] T042 Add the cross-runtime workspace flow map and route it from
      `docs/agent-index.md`; keep live handoff only in `AGENT-INBOX.md` and do not
      duplicate task state into `AGENTS.md`.
- [x] T043 Full validation on 2026-07-17 is green: layout-engine 1,062; preview
      188 pass / 1 expected Windows symlink skip; builds, browser freshness,
      no-new-Python, diff check, and the Chromium real-handle journey pass.
- [~] T044 Initial adversarial review and remediation are recorded in
      `docs/spec-reviews/075-preview-folder-workspaces-adversarial-review-2026-07-17.md`.
      An Opus closeout request is prepared; its findings file is still pending.
- [~] T045 Run a supported Chromium picker journey against the production bundle:
      open two same-named folders, edit/save each, externally change one, reload,
      revoke/re-grant permission, and record the OS files plus grouped nav as
      evidence. Real Chromium OPFS handles cover open/save/collision/external
      change/reload and Save a copy; the in-app browser was unavailable, so a
      native OS chooser and actual permission revocation/regrant remain unproven.
- [x] T046 Add server-root mtime/hash optimistic concurrency and reload/keep-mine
      UX equivalent to the local-folder guard.
- [x] T047 Add the complete read-only "Save a copy to…" workflow, including
      target-folder selection, unsaved override transfer, persist→reload, and
      accessible pre-save affordances.

## Task dependency notes

- Phase 0 (T001–T008) blocks everything; the abstraction is the prerequisite.
- Phase 1 depends on Phase 0; Phase 2 depends on Phase 0 (not on Phase 1) but
  reuses the grouped nav from T012.
- Phase 3 depends on both a server-root source (Phase 1) and, for conflict tests,
  a local-folder source (Phase 2).
- Phase 4 is the closeout gate and runs last.
- `[P]` tasks within a phase are independent and may proceed in parallel.
