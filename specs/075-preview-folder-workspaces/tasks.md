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
- [~] T008 Verify no nav/open/save code path references a raw directory after
      this phase. **Listing** no longer does; read/render + save still reference
      `framesDir` and are completed in Phase 1 (tracked below). FR-001 fully
      lands with Phase 1.

## Phase 1: Multiple server roots + grouped nav

- [ ] T010 Add root parsing: repeatable `--root label=path` args plus an optional
      workspace config file; keep `DG_FRAMES_DIR` as the default root. Wire in
      `apps/preview/src/server.ts` via a small typed parser module.
- [ ] T011 Register the bundled examples as a distinct `bundled-examples` source
      and each configured root as its own `server-root` source, in registry order.
- [ ] T012 Extend the browse-section builder to group nav entries by source with
      a per-source header label; emit qualified slugs in links.
- [ ] T013 Update deep-link / URL handling and `normalizeFrameSlug` to accept and
      resolve qualified `sourceId:slug` addresses; keep bare slugs resolving to
      the default source for backward compatibility.
- [ ] T014 Mark `bundled-examples` read-only whenever a writable source is
      present; expose `writable` in the nav model.
- [ ] T015 Extend the file watcher to watch every server-root path and route SSE
      reloads with the originating source id.
- [ ] T016 [P] Add tests: two-root nav grouping, non-colliding qualified slugs for
      duplicate filenames (SC-001), qualified deep-link resolution, and default
      backward-compatible bare-slug resolution.
- [ ] T017 [P] Add a `persist → reload` round-trip test that saves to a
      non-default writable root and reloads identically (SC-002, server side).

## Phase 2: Browser open-folder source (File System Access)

- [ ] T020 Add the typed `local-folder` adapter under
      `packages/layout-engine/src/preview-shell/workspace/`:
      `showDirectoryPicker()` open, `list` (enumerate `.yaml`), `read`, `write`.
- [ ] T021 Persist the directory handle in IndexedDB keyed by source id; restore
      opened folders on load with a one-click permission re-grant when access was
      dropped.
- [ ] T022 Implement the client-side save adapter: write edited YAML back to the
      picked directory using the browser bundle's YAML persistence, bypassing the
      server writer (FR-006). Do not escape the granted handle (FR-008).
- [ ] T023 Add the visible "Open folder…" affordance and register `local-folder`
      sources into the same grouped nav model as server sources, through the typed
      preview-shell registration seam (not `editor.js`/`layout-bridge.js`, not new
      `scripts/preview/*.js`).
- [ ] T024 Feature-detect FS Access write support; hide "Open folder" and show
      server-root guidance where unsupported (FR-005).
- [ ] T025 After adding browser-surface exports, rebuild the bundle
      (`npm --prefix packages/layout-engine run build:browser`) and confirm
      `check-browser-bundle-fresh` passes; do not commit `dist/`.
- [ ] T026 [P] Add tests for the local-folder adapter `list/read/write`, handle
      persistence/restore, and handle-scoped write containment.
- [ ] T027 [P] Add a client-side `persist → reload` round-trip test for a
      local-folder source (SC-004, SC-002 client side).

## Phase 3: Conflict handling, empty state, polish

- [ ] T030 Add external-change detection: mtime/hash compare for server roots and
      FS Access change signal / re-read compare for local folders.
- [ ] T031 On detected external change to an open file, surface a reload /
      keep-mine prompt instead of a silent overwrite (FR-007, SC-006).
- [ ] T032 Implement "save a copy to a writable folder…" for edits attempted on a
      read-only source (FR-004, SC-003); route the copy to a chosen writable source.
- [ ] T033 Add the empty state: bundled examples plus a prominent "Open a folder of
      your diagrams" call to action when no user folders are open (FR-010).
- [ ] T034 Add read-only lock badges and disabled-save affordances with accessible
      labels for read-only sources.
- [ ] T035 [P] Add a large-nav performance test (hundreds of slugs across sources)
      proving grouped nav and lazy loading stay responsive.

## Phase 4: Security, docs, closeout

- [ ] T040 Confirm safe-mode YAML parsing across all sources and add a test that a
      malicious/custom-tag YAML does not execute or escape (FR-009).
- [ ] T041 Add path-traversal rejection tests for server roots: `../` slug,
      absolute escape, symlink escape (SC-005, FR-008).
- [ ] T042 Update `docs/agent-index.md` and the `AGENTS.md` handover with the
      workspace-source model and the open-folder flow; keep it short.
- [ ] T043 Run full validation: `npm --prefix packages/layout-engine test`,
      `npm --prefix apps/preview test`, `node scripts/check_no_new_python.mjs`,
      `build:browser`, `check-browser-bundle-fresh`, preview-shell size budgets.
- [ ] T044 Adversarial review: prove per-source persist → reload, prove read-only
      enforcement, prove collision handling, prove no new Python and no new
      behaviour-heavy `scripts/preview/*.js`, then mark Closeout Ready.

## Task dependency notes

- Phase 0 (T001–T008) blocks everything; the abstraction is the prerequisite.
- Phase 1 depends on Phase 0; Phase 2 depends on Phase 0 (not on Phase 1) but
  reuses the grouped nav from T012.
- Phase 3 depends on both a server-root source (Phase 1) and, for conflict tests,
  a local-folder source (Phase 2).
- Phase 4 is the closeout gate and runs last.
- `[P]` tasks within a phase are independent and may proceed in parallel.
