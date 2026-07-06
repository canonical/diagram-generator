# Plan: Spec 075 Preview folder workspaces

## Working theory

Today the preview server is hard-wired to one diagram directory (`FRAMES_DIR`),
and the side nav, open, and save paths each reach that directory more or less
directly. The work is to introduce a single typed `DiagramWorkspaceSource`
abstraction that every nav/open/save path reads, then provide two adapters behind
it: the existing disk-backed directory (generalised from one root to many) and a
new browser File System Access folder source. This is one workspace model with two
source adapters, not two parallel implementations.

The end-user flagship is the browser "Open folder" flow (local-first, cloud-synced
folders work for free). The developer/CI path is multiple server roots. Both share
the same abstraction, side nav, and qualified-slug identity.

Scope discipline: same-source editing only in this release. No cross-source move,
no reparenting, no git UX, no cloud API. A central store is explicitly out.

## Reuse points (do not reinvent)

The abstraction must wrap the existing seams, not duplicate them:

- Single-dir listing / slug safety:
  `apps/preview/src/preview-host/builtin-host-runtime.ts` (`listYamlSlugs`,
  `isSafeSlug`).
- Frame document read/render deps:
  `apps/preview/src/preview-host/frame-documents.ts`,
  `apps/preview/src/preview-host/builtin-autolayout-host.ts`.
- Save path:
  `apps/preview/src/preview-host/frame-document-actions.ts`
  (`saveFramePreviewDocument` → `saveFrameYamlDocumentForSlug`),
  `apps/preview/src/persistence/frame-diagram.ts`.
- Server wiring / roots / watcher:
  `apps/preview/src/server.ts` (`FRAMES_DIR`, `WATCH_PATHS`, install deps),
  `apps/preview/src/preview-host/builtin-host-runtime.ts`
  (`createBuiltinPreviewHostInstallDeps`).
- Browser bundle entry (for the client-side local-folder adapter and save):
  `packages/layout-engine/src/browser-entry.ts`, existing YAML persistence in the
  layout-engine package.
- Side nav rendering:
  `buildRegisteredPreviewBrowseSections` / `buildIndexPageHtml` used by
  `builtin-host-runtime.ts`.

## Likely file map

- New typed workspace model + source interface:
  `apps/preview/src/preview-host/workspace/diagram-workspace-source.ts` (new).
- Server-root adapter (wraps current dir behaviour, N roots):
  `apps/preview/src/preview-host/workspace/server-root-source.ts` (new).
- Workspace registry / resolution (ordered sources, qualified slug parse/format):
  `apps/preview/src/preview-host/workspace/workspace-registry.ts` (new).
- Server root parsing (`--root label=path`, config file, `DG_FRAMES_DIR` default):
  `apps/preview/src/server.ts` (extend), plus a small parser module.
- Grouped nav model + rendering:
  extend the browse-section builder consumed by `builtin-host-runtime.ts`.
- Browser local-folder adapter (FS Access, IndexedDB handle store, permission
  re-grant, client-side save):
  `packages/layout-engine/src/preview-shell/workspace/` (new; typed owner, not
  `editor.js` / `layout-bridge.js`).
- Open-folder UI affordance + empty state:
  preview-shell panel/registration seam (typed), not new `scripts/preview/*.js`.
- Path-safety containment helper (realpath confinement per root):
  co-located with the server-root adapter.

## Phasing

- Phase 0: introduce the abstraction and make the current single dir a
  `server-root` source with identical behaviour (no user-visible change).
- Phase 1: multiple server roots + grouped, qualified nav + read-only examples.
- Phase 2: browser open-folder source + client-side save + persistence handle.
- Phase 3: external-change/conflict handling + empty state + polish.

Each phase is independently shippable and independently testable.

## Risks and mitigations

- **Slug collisions across sources** → qualify every slug as `sourceId:slug` at the
  boundary; add collision tests (SC-001).
- **Persistence regressions on the save path** → repo-owned `persist → reload`
  round-trip per writable source kind before Closeout Ready (SC-002).
- **Browser support variance** → feature-detect FS Access; hide open-folder and
  fall back to server-root guidance where unsupported (FR-005).
- **Path traversal / write escape** → realpath containment per root and
  handle-scoped local writes; explicit rejection tests (SC-005, FR-008).
- **Untrusted YAML** → safe-mode parse, no eval-style rendering (FR-009).
- **Cloud-sync races** → external-change detection with reload/keep-mine (FR-007,
  SC-006).
- **Bundle staleness** → after any browser-surface export change, rebuild
  `dist/` via `build:browser`; do not commit `dist/`.

## Validation

```bash
npm --prefix packages/layout-engine test
npm --prefix apps/preview test
node scripts/check_no_new_python.mjs
npm --prefix packages/layout-engine run build:browser   # after browser-surface changes
```

Targeted, during iteration:

```bash
npm --prefix apps/preview test -- workspace          # source-adapter + registry contract tests
npm --prefix apps/preview test -- persist            # per-source save round-trip
```

## Definition of done

- All requirements FR-001…FR-010 satisfied and mapped to tests.
- Success criteria SC-001…SC-007 proven, including per-source persist → reload.
- No new Python; no new behaviour-heavy `scripts/preview/*.js`.
- `dist/` not committed; browser bundle rebuilds cleanly.
- Full validation suite green.
