# Adversarial review — Spec 075 preview folder workspaces

Date: 2026-07-17
Branch: `feat/075-preview-folder-workspaces`
Rebased base: `main` (`1299bbb`)
Reviewed implementation tip: `3168d90` plus the remediation described below

## Verdict

The July 14 open-folder slice was not mergeable. It demonstrated a picker and
server staging route, but could claim Save succeeded while the granted OS file
was unchanged, lost correct save routing after a second folder opened, silently
overwrote external changes, and did not satisfy its grouped/read-only/reconnect
UX promises.

The current remediation makes the browser handle authoritative, gates successful
mutations on that handle write, supports multiple persisted folders, and closes
the source-routing and ingest-safety holes. The follow-up implementation also
adds read-only Save a copy, SHA-256 server-root conflicts, safe YAML, first-run
guidance, and cache disposal. Spec 075 remains **In progress**, not Closeout
Ready: native OS picker/regrant evidence and final Opus review remain open.

## Findings and dispositions

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| F01 | Critical | The wrapper returned the successful server response even when `createWritable`, `write`, or `close` failed; the save client then cleared dirty state although the OS file was unchanged. | Fixed. The server cache response is held until the browser-handle commit completes. Write/permission failures become non-2xx responses and retain dirty state. Covered by the controller contract. |
| F02 | Critical | One global `PreviewLocalFolderState` meant opening folder B replaced folder A's handles. Saving A afterward only changed its temp server cache. | Fixed. State and IndexedDB records are per source; same-named folders receive distinct stable ids. Regression saves A and B independently. |
| F03 | High | Saves overwrote cloud-sync/external edits without comparison. | Fixed. Local folders compare handle content; server roots carry SHA-256 revisions and return a reload/keep-mine 409 conflict. |
| F04 | High | A persisted handle with dropped permission was silently ignored; no re-grant action existed. | Fixed. Denied handles surface an accessible reconnect action using `requestPermission` from a user gesture. |
| F05 | High | Unsupported browsers still showed Open folder and Ctrl/Cmd+O was captured only to fail afterward. | Fixed. The action and shortcut are enabled only when the picker exists; actionable `--root` guidance replaces them. |
| F06 | High | All source slugs were flattened under Autolayout, so duplicate folders were not understandable in navigation. | Fixed. Viewer routes can contribute typed browse sections; autolayout now emits one labelled section per source while Force remains its own lane. |
| F07 | High | `resolveFrameDir` discarded `writable`; document save and interchange import could write a source declared read-only. | Fixed at the typed API boundary and surfaced in nav. Save is pre-labelled "Save a copy…" and transfers the unsaved payload through a chosen writable folder handle. |
| F08 | High | Mermaid/D2 export and interchange import bypassed qualified source resolution. Imports to a local source were not mirrored to disk. | Fixed. All formats resolve source + bare slug; successful local imports use the same handle-commit gate. |
| F09 | Medium | Folder ingest was unbounded and case-only duplicate names could alias on Windows. | Fixed in browser and server with 500-file, 2 MiB/file, 25 MiB-total gates and case-insensitive duplicate rejection before registration. |
| F10 | Medium | Temp render-cache directories are not disposed on shutdown and forgotten sources cannot be unregistered. | Fixed. Forget unregisters the source and removes its cache; route/host teardown disposes all remaining caches. |
| F11 | Medium | The spec required a "pure client-side" YAML writer even though canonical override persistence is server-owned; the code silently used the server writer anyway. | Spec corrected: localhost may canonicalize into an ephemeral cache, but the granted browser handle is the authoritative writer and gates success. |
| F12 | Verification | The old branch had no controller tests and no live picker evidence. | Controller/host regressions and a production Chromium journey using real OPFS handles now cover same-name folders, save, external conflict, reload, and Save a copy. The in-app browser was unavailable, so native OS chooser and actual permission revocation/regrant evidence remain T045. |

## Evidence

- `packages/layout-engine/tests/local-folder-workspace.test.ts`
  - two same-named folders retain independent handles and save destinations
  - interchange mutations use the same disk-commit gate
  - an external-change refusal returns 409 and preserves the OS file
  - a dropped permission exposes and completes one-click reconnect
- `apps/preview/src/persistence/preview-host-contract.test.ts`
  - grouped source navigation coexists with Force
  - bundled examples are read-only at nav and save boundaries
  - qualified save/reload and SVG/draw.io/Mermaid/D2 export use the owning source
  - duplicate and oversized folder uploads are rejected before registration
- Production-bundle HTTP smoke on `127.0.0.1:8175`
  - index and viewer returned 200
  - Open folder, Reconnect folders, bundled-source grouping, and rebuilt bundle
    references were present

## Remaining merge gates

1. T045 native OS chooser and actual permission revocation/regrant evidence.
2. Opus adversarial closeout and remediation of any findings.
