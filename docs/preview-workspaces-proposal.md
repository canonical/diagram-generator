# Proposal – open-a-folder workspaces for the preview editor

Status: proposal for discussion (not yet scheduled)
Type: architecture + UX direction
Product path: Node preview app + TypeScript layout engine (no new Python)
Related: supersedes the single `DG_FRAMES_DIR` model for end-user use

## 1. Problem

The preview editor today is a single-tenant, repo-bound tool. The server resolves
exactly one diagram folder:

- `FRAMES_DIR` is a single directory, defaulting to
  `diagrams/1.input` and overridable only by the `DG_FRAMES_DIR`
  environment variable ([`apps/preview/src/server.ts`](../apps/preview/src/server.ts)).
- The side navigation is just the `.yaml` slugs in that one directory
  (`listYamlSlugs` in
  [`apps/preview/src/preview-host/builtin-host-runtime.ts`](../apps/preview/src/preview-host/builtin-host-runtime.ts)).
- Saves write YAML back into that same directory by slug
  (`saveFramePreviewDocument` →
  [`frame-document-actions.ts`](../apps/preview/src/preview-host/frame-document-actions.ts)).

This is fine for repo development with a handful of authored fixtures. It does not
scale to the intended end-user story: someone clones or installs the tool, keeps
their own diagrams in their own folder (including a cloud-synced folder such as
Google Drive, OneDrive, or Dropbox), opens the editor, browses their examples in
the side nav, edits, and saves back to that folder – without a central server and
without editing an environment variable.

A single centralised diagram store is explicitly **not** the goal: it creates an
ownership, sync, privacy, and scaling bottleneck. The right model is
"open a folder / repo of diagrams", like a code editor opens a project.

## 2. Goals

1. A user can point the editor at an arbitrary folder of diagrams and browse,
   open, edit, and save them.
2. Cloud-synced folders (Google Drive Desktop, OneDrive, Dropbox) work with no
   special integration – they are just local folders the OS keeps in sync.
3. Multiple diagram sources can be open at once (e.g. the bundled examples plus
   the user's own folder) and are distinguishable in the side nav.
4. No mandatory central server or account. Local-first.
5. The bundled example corpus remains available as read-only "browseable examples".

## 3. Non-goals

- Building a hosted multi-user SaaS with a central database.
- Real-time multi-user collaboration / CRDT editing.
- A cloud-provider API integration (Google Drive API, etc.). Cloud sync is handled
  by the user's existing desktop sync client, not by us.
- Changing the layout engine or diagram schema.

## 4. Current architecture constraints to respect

- Preview loads the browser bundle from
  `packages/layout-engine/dist/layout-engine.iife.js`, rebuilt by the app's
  `predev` / `prestart` hooks. `dist/` is gitignored.
- Save/persist is YAML-file based and slug-keyed. Any workspace model must keep the
  `slug → file` contract coherent when multiple roots are open (slug collisions).
- Product-path logic is TypeScript-first; do not add behaviour-heavy JS under
  `scripts/preview/`.

## 5. Design options

### Option A – server workspace roots (multiple `--root` dirs)

Extend the Node server from one `FRAMES_DIR` to an ordered list of **workspace
roots**. Each root is a labelled source (e.g. `examples`, `my-diagrams`). The side
nav groups slugs by root. Saves route back to the originating root.

- Pros: minimal change from today; keeps the existing YAML save path; works for
  git repos and cloud-synced folders because the sync client just mirrors the OS
  folder; supports server-side watch/live-reload that already exists.
- Cons: requires the user to run a local server and pass paths; adding/removing a
  folder needs a server restart or a "add root" API; the browser cannot itself pick
  an arbitrary OS folder, so folder selection is CLI/config-driven.

### Option B – browser File System Access API (open folder from the page)

Use the browser
[File System Access API](https://developer.mozilla.org/docs/Web/API/File_System_Access_API)
(`window.showDirectoryPicker()`) so the user clicks "Open folder" in the editor and
grants read/write access to a real OS directory – including a Google Drive / OneDrive
/ Dropbox synced folder. The editor reads YAML directly and writes edits straight
back, with the persistent-permission handle stored in IndexedDB so it re-grants on
return.

- Pros: best UX – a genuine "open folder" button, no env vars, no CLI, no upload,
  no central server; cloud folders "just work"; the user stays in control of where
  files live; re-openable via saved handles.
- Cons: Chromium-only for full read/write today (Safari/Firefox lack write); needs
  a secure context (localhost or HTTPS); the YAML parse/measure/render path must be
  reachable client-side (the layout engine already ships as a browser bundle, so
  this is feasible); persistence currently goes through server routes and would need
  a client-side save adapter.

### Option C – git-repo aware roots

Treat a workspace root that is a git repo specially: show branch, dirty state, and
optionally group by folder. Layered on top of A or B.

- Pros: natural fit for teams versioning diagrams; enables "diagrams as code" review.
- Cons: extra surface; not required for the core folder-open story.

### Recommendation

Ship **B as the primary end-user UX**, backed by **A as the developer / power-user
and headless path**. They share one abstraction (below), so this is not two
implementations of the same thing – it is one workspace model with two source
adapters.

- End users get a friendly "Open folder" button (B) that works with cloud-synced
  folders and needs no terminal.
- Developers and CI keep the server-roots path (A) for the repo corpus and scripted
  use.
- C is an optional later enhancement for git repos.

## 6. Core abstraction – `DiagramWorkspaceSource`

Introduce a single typed interface that both adapters implement, so the side nav,
open, and save flows are source-agnostic:

```ts
interface DiagramWorkspaceSource {
  readonly id: string;            // stable per open source
  readonly label: string;         // shown as a side-nav group header
  readonly kind: "bundled-examples" | "server-root" | "local-folder";
  readonly writable: boolean;
  list(): Promise<DiagramEntry[]>;         // slugs + metadata for the side nav
  read(slug: string): Promise<string>;     // YAML text
  write(slug: string, yaml: string): Promise<void>; // no-op/blocked if !writable
  watch?(onChange: (slug: string) => void): () => void;
}
```

- `bundled-examples`: the repo's `diagrams/1.input`, always present,
  read-only for end users (the "browseable examples" in the side nav).
- `server-root`: today's disk-backed dir, one instance per `--root` (Option A).
- `local-folder`: File System Access API directory handle (Option B).

Slug identity becomes `sourceId:slug` to avoid collisions when multiple folders
contain the same filename. The side nav groups by source; the URL/deep-link encodes
the qualified id.

## 7. UX design

Target the mental model of a code editor's "Open folder", not a file upload.

- **Side nav** becomes grouped:
  - `Examples` (bundled, read-only, badge "examples")
  - each opened folder as its own collapsible group with the folder name
  - a persistent `+ Open folder…` action at the top of the nav
- **Open folder** (Option B) triggers `showDirectoryPicker()`. The chosen folder
  appears as a new group immediately; its handle is saved so it reappears on next
  visit with a one-click "re-grant access" if the browser dropped permission.
- **Read-only sources** show a lock badge; edits are offered as "Save a copy to a
  writable folder…" instead of silently failing.
- **New diagram** creates a `.yaml` in the currently selected writable folder.
- **Save** writes back to the originating folder; cloud sync propagates it with no
  action from us. A subtle "synced via <provider>" hint can be shown when the path
  is detected under a known sync root, but this is cosmetic.
- **Empty state** (no user folders yet) shows the examples plus a prominent "Open a
  folder of your diagrams" call to action.
- **Conflict / external change**: because cloud sync can rewrite a file underneath
  the editor, detect external modification (mtime/hash or the FS Access change
  signal) and offer reload / keep-mine rather than silently overwriting.

## 8. What it would take – phased plan

### Phase 0 – abstraction refactor (no user-visible change)

- Introduce `DiagramWorkspaceSource` and refactor the server so `FRAMES_DIR` becomes
  a single `server-root` source behind the interface. Side nav, open, save all go
  through the abstraction. Keep behaviour identical.

### Phase 1 – multiple server roots (Option A)

- Accept repeated `--root label=path` args and/or a small workspace config file.
- Group the side nav by source; qualify slugs as `sourceId:slug`; route saves and
  the existing file watcher per root.
- Mark the bundled examples read-only when other writable roots exist.

### Phase 2 – browser "Open folder" (Option B)

- Add the File System Access `local-folder` source: directory picker, IndexedDB
  handle persistence, permission re-grant flow.
- Add a client-side save adapter so writes can bypass the server for local folders
  (the layout engine already runs in the browser bundle).
- Feature-detect; on unsupported browsers, hide "Open folder" and fall back to
  Option A guidance.

### Phase 3 – polish and git awareness (Option C, optional)

- External-change detection and conflict UX.
- Optional git-repo grouping and dirty/branch indicators.
- "Save a copy" from read-only sources into a chosen writable folder.

## 9. Security and safety

- **Path traversal**: server roots must confine `slug → path` resolution inside the
  declared root (reject `..`, absolute escapes, symlink escape). The existing
  `isSafeSlug` allowlist is a start but must be paired with realpath containment per
  root.
- **Write scope**: never write outside an explicitly opened writable source. Bundled
  examples are read-only by default.
- **Browser permissions**: File System Access requires a secure context and explicit
  user grant per folder; store only opaque handles, never absolute paths, in
  IndexedDB.
- **Untrusted YAML**: opening a stranger's folder means parsing untrusted YAML and
  rendering it. Keep the YAML parser in safe mode (no arbitrary tags or code-yielding
  anchors), and keep the renderer free of any eval-style execution of file content.
- **No silent central upload**: nothing leaves the machine unless the user's own
  sync client moves it. Make that explicit in the UI copy.

## 10. Testing implications (ties to the small-corpus concern)

The current handful of fixtures is exactly what will feel limiting as users bring
their own folders. This proposal reduces that risk by decoupling corpus size from
the app:

- The bundled examples stay a curated, tested set (small on purpose).
- User corpora live in user folders and are not the repo's test burden.
- Add source-adapter contract tests: `list/read/write/watch` for each adapter,
  slug-collision handling across sources, path-traversal rejection, and read-only
  enforcement.
- Add a large-corpus performance test for the side nav (hundreds of slugs) so the
  grouped nav and lazy loading hold up when a user opens a big folder.

## 11. Open questions

1. Do we require an install/CLI at all for the end-user path, or is Phase 2 (browser
   Open folder against `localhost`) enough that most users never touch a terminal?
2. Should saves for local folders always go client-side (Option B adapter), or should
   the server remain the single writer for consistency with existing persistence
   regression tests?
3. How far do we take git awareness – nav grouping only, or full dirty/commit UX?
4. Do we ship a tiny packaged binary / desktop shell later so "open folder" works
   without any Node setup, or stay browser-plus-local-server?

## 12. Recommendation summary

- Adopt the `DiagramWorkspaceSource` abstraction now (Phase 0) – it is a prerequisite
  for everything and is low-risk.
- Deliver multi-root server workspaces (Phase 1) for the repo/dev/CI story.
- Deliver browser "Open folder" (Phase 2) as the flagship end-user UX; it is the best
  fit for local-first, cloud-synced, no-account diagram folders.
- Keep the bundled examples as read-only browseable examples throughout.
- Treat a central store as explicitly out of scope; folders and repos are the unit of
  ownership.
