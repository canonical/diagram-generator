# Implementation Plan: Folder Workspace Reliability

**Branch**: `feat/084-folder-workspace-reliability` | **Date**: 2026-07-22 | **Spec**: [spec.md](spec.md)

## Summary

Make the existing local-folder workflow deterministic and observable. The
browser must give every folder action an immediate user-visible state, preserve
that state through the asynchronous restore path, and make permission recovery
prominent beside the primary action. A successfully registered folder must
continue to appear as a named Browse group above bundled examples after reload
or preview-server replacement.

This is a **bug and UX-reliability change**, not a new workspace architecture.
The existing typed workspace registry, browser handle authority, bounded ingest,
and qualified-address model remain the implementation substrate.

## Evidence and research

See [research.md](research.md). The July 18 sidebar fix is still present in
both `main` and the prior Spec 075 branch. The observed regression is therefore
not a reverted sort order: it is a gap in the native picker, async restore, and
recovery-state experience.

## Technical Context

**Language/Version**: Node.js + TypeScript; browser compatibility shell is
existing JavaScript only.  
**Primary Dependencies**: Native browser File System Access API; existing
preview-host workspace registry.  
**Storage**: Browser-held folder handles and an ephemeral server-side render
cache; authored YAML remains authoritative.  
**Testing**: Node test runner for preview contracts/controller tests; real Chrome
session with native chooser and permission evidence.  
**Target Platform**: Chromium desktop browser on localhost.  
**Project Type**: Local browser editor and Node preview host.  
**Performance Goals**: Folder operation status appears synchronously on user
activation; successful grouped navigation appears in the same operation flow.  
**Constraints**: No new behavior-heavy `scripts/preview/*.js`; no bypass of
browser handle permissions; preserve bounded ingest and save authority.  
**Scale/Scope**: One primary Open folder entry point, multiple remembered local
folders, and all restart/reload/permission outcomes.

## Constitution Check

| Gate | Result | Evidence |
|---|---|---|
| Classify before coding | Pass | Bug + UX reliability; no per-diagram exception. |
| Single owning layer | Pass | Typed browser workspace owner owns operation/recovery state; host registry owns grouped navigation. |
| Test before ship | Required | Unit/contract coverage plus a recorded native Chrome journey. |
| Stable public interfaces | Pass | Keep browser-entry contract stable; add only concern-owned typed exports if necessary. |
| No format lock-in | Pass | No persisted format change. |

## Design decisions

### 1. Give the folder workflow an explicit visible operation state

`packages/layout-engine/src/preview-shell/local-folder-workspace.ts` is the
owner for open, restore, reconnect, forget, and browser-handle outcomes. Extend
its typed view model so an operation moves through pending, cancelled,
successful, recoverable, and failed states. The state presenter must update the
dedicated workspace area rather than relying on the unrelated build status.

### 2. Keep recovery adjacent to Open folder

The static viewer provides stable, accessible placeholders. The typed workspace
owner decides whether recovery is relevant and supplies the label, explanation,
and action. A denied remembered handle must not be the only condition under
which users receive recovery guidance: the idle workflow also explains that
folders are remembered per local browser address and can be opened again there.

### 3. Preserve the existing registry/nav boundary

`apps/preview/src/preview-host/builtin-server-routes.ts` registers the
temporary local source and `builtin-host-runtime.ts` ranks local folders before
bundled examples. Preserve that ownership. Strengthen the registration result
contract only where it is required to make a successful browser operation
wait for/observe its visible navigation result.

### 4. Treat a preview restart as a first-class recovery transition

The server registry is process-local while browser handles may persist. A
granted remembered handle must re-register after server restart and show its
named Browse group. A denied handle must leave a durable actionable recovery
state, not a hidden control or a transient status race.

### 5. Test browser facts at the right layer

Automated tests own deterministic controller, status, registration, and
navigation contracts. A real Chrome test owns native chooser invocation,
cancellation, actual permission revocation/re-grant, and the visual left-sidebar
result. Do not substitute an OPFS or mocked-handle pass for native evidence.

## Project Structure

```text
apps/preview/src/
├── persistence/
│   ├── workspace-source.test.ts
│   └── preview-host-contract.test.ts
└── preview-host/
    ├── builtin-host-runtime.ts
    └── builtin-server-routes.ts

packages/layout-engine/src/
├── browser-entry-preview-shell.ts
└── preview-shell/
    ├── local-folder-workspace.ts
    └── local-folder-workspace.test.ts

scripts/preview/
└── viewer-unified.html                 # structural placeholders only

specs/084-folder-workspace-reliability/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/workspace-operation-ui.md
└── tasks.md
```

**Structure Decision**: Keep behavior in the typed local-folder workspace and
preview-host owners. The viewer template is limited to stable markup hooks;
legacy browser scripts remain thin delegates.

## Validation strategy

1. Extend focused controller/host contract tests for every operation outcome.
2. Build the browser bundle and run the freshness guard.
3. Run the preview test suite and relevant layout-engine tests.
4. In a real Chrome session, record: native chooser open, cancel, valid folder
open, named Browse group above Bundled examples, preview restart restore,
permission revoke, reconnect/re-grant, and save/reload.
5. Treat missing native evidence as a closeout blocker.

## Complexity Tracking

No constitution exceptions requested.
