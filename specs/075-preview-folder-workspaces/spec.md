# Spec 075: Preview folder workspaces

**Feature Branch**: `feat/075-preview-folder-workspaces`
**Status**: In progress — implementation and real-handle Chromium coverage are
complete; native OS-picker/regrant evidence and final adversarial review remain
**Created**: 2026-07-06
**Support files**: [`plan.md`](./plan.md), [`tasks.md`](./tasks.md),
[`workspace-flow.md`](./workspace-flow.md), [`validation.md`](./validation.md)

## Problem

The preview editor is single-tenant and repo-bound. The server resolves exactly
one diagram directory:

- `FRAMES_DIR` is a single directory, defaulting to `diagrams/1.input`
  and overridable only through the `DG_FRAMES_DIR` environment variable
  (`apps/preview/src/server.ts`).
- The side navigation is the `.yaml` slugs in that one directory (`listYamlSlugs`
  in `apps/preview/src/preview-host/builtin-host-runtime.ts`).
- Saves write YAML back into that same directory keyed by slug
  (`saveFramePreviewDocument` → `frame-document-actions.ts`).

This is fine for repo development against a handful of authored fixtures. It does
not support the intended end-user story: a user keeps their own diagrams in their
own folder – including a cloud-synced folder such as Google Drive, OneDrive, or
Dropbox – opens the editor, browses their examples in the side nav, edits, and
saves back to that folder, without a central server and without editing an
environment variable.

A single centralised diagram store is explicitly not the goal. The unit of
ownership is a folder or repo, opened like a project in a code editor.

## Goals

- A user can point the editor at an arbitrary folder of diagrams and browse,
  open, edit, and save them.
- Cloud-synced folders work with no special integration – they are ordinary local
  folders the OS keeps in sync.
- Multiple diagram sources can be open at once (the bundled examples plus the
  user's own folders) and are distinguishable and grouped in the side nav.
- No mandatory central server or account. Local-first.
- The bundled example corpus stays available as read-only browseable examples.
- All source access goes through one typed abstraction so nav, open, and save are
  source-agnostic.

## Non-goals

- No hosted multi-user SaaS or central diagram database.
- No real-time multi-user collaboration or CRDT editing.
- No cloud-provider API integration (Google Drive API etc.); cloud sync is the
  user's desktop sync client, not our concern.
- No changes to the layout engine or the diagram schema.
- No arbitrary cross-source move/reparent of diagrams in the first release.
- No new behaviour-heavy logic under `scripts/preview/*.js`.

## Current behaviour

- `apps/preview/src/server.ts` computes a single `FRAMES_DIR` and passes it as
  `framePreviewDocumentDeps.framesDir`.
- `apps/preview/src/preview-host/builtin-host-runtime.ts` lists diagrams with
  `listYamlSlugs(dir)` and gates slugs through `isSafeSlug`.
- Open/read and render run through `frame-documents.ts` and the autolayout host
  (`builtin-autolayout-host.ts`, routes under `/api/preview-document/`,
  `/api/frame-tree/`, `/api/overrides/`).
- Save runs through `saveFramePreviewDocument` →
  `saveFrameYamlDocumentForSlug`, writing YAML into `FRAMES_DIR`.
- The browser bundle is loaded from
  `packages/layout-engine/dist/layout-engine.iife.js` (gitignored, rebuilt by the
  app's `predev` / `prestart` hooks).
- A server-side file watcher (`WATCH_PATHS`) drives live reload over SSE.

## Target behaviour

A single typed `DiagramWorkspaceSource` abstraction backs every diagram source.
Two adapters implement it in this spec:

1. `bundled-examples` / `server-root` – the disk-backed directory model, extended
   from one dir to an ordered list of labelled roots.
2. `local-folder` – a browser File System Access API directory handle, opened from
   an "Open folder" button, persisted in IndexedDB, and authoritative for writes.
   The localhost preview process may keep an ephemeral render cache because the
   existing canonical YAML save logic is server-owned, but it never treats that
   cache as a successful user save until the browser writes the granted handle.

Slug identity becomes qualified (`sourceId:slug`) so folders containing the same
filename do not collide. The side nav groups slugs by source. Read-only sources
show a lock affordance and offer "save a copy to a writable folder" instead of
failing silently.

## Requirements

### FR-001 Source abstraction

All diagram listing, reading, writing, and watching go through a typed
`DiagramWorkspaceSource` interface. No nav/open/save code path may reference a raw
directory directly after this spec lands.

### FR-002 Multiple server roots

The server accepts an ordered list of labelled roots (repeatable
`--root label=path` argument and/or a workspace config file) in addition to the
default bundled examples. Each root is its own source. `DG_FRAMES_DIR` continues
to work as the default single root for backward compatibility.

### FR-003 Grouped, qualified side nav

The side nav groups entries by source with a header label per source. Slugs are
qualified as `sourceId:slug` in URLs/deep links and internally, so duplicate
filenames across sources remain distinct and addressable.

### FR-004 Read-only bundled examples

The bundled example corpus is read-only when any writable source is present.
Edits to a read-only source are offered as "save a copy to a writable folder",
never a silent overwrite or a swallowed error.

### FR-005 Browser open-folder source

A visible "Open folder…" action uses `window.showDirectoryPicker()` to add a
`local-folder` source. Multiple directory handles are persisted in IndexedDB and
re-offered on return with a one-click permission re-grant when the browser has
dropped access. Same-named folders receive distinct stable source ids.
Feature-detected; the action is hidden on browsers without write support and
server-root guidance is shown instead.

### FR-006 Authoritative browser-handle save for local folders

Edits to a `local-folder` source are canonicalized in the localhost preview's
ephemeral source cache, then committed to the picked directory by the browser
through the granted file handle. A save response must not be reported as
successful, clear dirty state, or reload the editor until the handle write
succeeds. Every mutating workflow that can change YAML, including interchange
import, uses this commit gate.

### FR-007 External-change and conflict handling

When a file changes underneath the editor (cloud sync, external edit), detect it
(mtime/hash for server roots; re-read compare for local folders) and require an
explicit overwrite or keep-external choice rather than silently overwriting.

### FR-008 Path safety

Server-root `slug → path` resolution is confined inside the declared root by
realpath containment, rejecting `..`, absolute escapes, and symlink escape, in
addition to the existing `isSafeSlug` allowlist. Local-folder writes never escape
the granted directory handle.

### FR-009 Untrusted YAML safety

Opening an arbitrary folder means parsing untrusted YAML. Parsing stays in safe
mode (no custom tags or code-yielding constructs) and the renderer performs no
eval-style execution of file content.

### FR-010 Empty state and discoverability

With no user folders opened, the editor shows the bundled examples plus a
prominent "Open a folder of your diagrams" call to action. Once a user folder is
open, its browse group appears before server roots and bundled examples so the
large example corpus does not make a successful open look like a no-op.

When persisted browser handles recreate server-side workspace registrations
after a preview-server restart, the already-rendered navigation refreshes once.
It must not require a second manual reload, and it must not enter a reload loop
when the registrations already exist.

### FR-011 Bounded, unambiguous folder ingest

Folder ingest rejects case-insensitive duplicate YAML filenames and applies
explicit file-count, per-file, and total-size limits in both the browser and the
localhost server. A malformed or oversized folder is rejected before registering
a partial source.

## Success criteria

- SC-001: Starting the server with two `--root` args shows both as grouped nav
  sections with correct, non-colliding qualified slugs.
- SC-002: Opening a diagram from each source, editing, and saving writes back to
  the correct originating folder and reloads identically (persist → reload
  round-trip) per source.
- SC-003: The bundled examples are non-writable when a writable root is present;
  attempting to save offers "save a copy" and writes to the chosen writable
  source.
- SC-004: In a supported browser, "Open folder" adds multiple folders (including
  same-named folders), lists their diagrams in distinct source groups, edits one,
  saves it back to the correct OS folder, and reconnects each folder on reload via
  its persisted handle.
- SC-005: A traversal attempt (`../` slug, symlink escape) against a server root
  is rejected with no read/write outside the root.
- SC-006: An external change to an open file surfaces a reload/keep-mine prompt
  rather than a silent overwrite.
- SC-007: `check_no_new_python` passes and no new behaviour-heavy JS is added under
  `scripts/preview/`.
- SC-008: A denied handle write, dropped permission, or external-change refusal
  leaves the editor dirty and never presents the ephemeral server cache as a
  successful disk save.
- SC-009: Opening a folder makes its group immediately visible before bundled
  examples; restoring a missing server registration refreshes navigation exactly
  once, while an already-registered folder does not trigger another refresh.

## Constraints

- TypeScript-first: the workspace model, adapters, and save routing live in
  `apps/preview/src/**` and `packages/layout-engine/src/**`, not in
  `scripts/preview/*.js`.
- Preview loads the browser bundle from `dist/`; after adding browser-surface
  exports, rebuild with `npm --prefix packages/layout-engine run build:browser`.
- This spec touches the preview save/persist path, so Closeout Ready requires a
  repo-owned `persist → reload` regression per writable source kind.

## Open questions (resolve during plan/first phase)

1. Is the browser open-folder path against `localhost` enough that most end users
   never touch a terminal, or is a packaged desktop shell needed later?
2. Resolved: the browser handle is the user's disk writer. The localhost server
   may canonicalize into an ephemeral render cache, but the client gates success
   on the handle commit (FR-006, SC-008).
3. How much git awareness, if any, ships here versus a follow-up spec? (Default:
   none in 075.)
