# Preview folder workspace flow

## Open and restore

```text
Open folder / reconnect
  -> local-folder-workspace.ts
     -> File System Access directory handle
     -> bounded root-level YAML enumeration
     -> IndexedDB handle records (one per source)
     -> POST /api/workspaces/open
  -> builtin-server-routes.ts
     -> validate duplicate/count/size limits
     -> ephemeral local-folder render cache
     -> register source in WorkspaceRegistry
  -> grouped browse sections
     -> source-qualified /view/v3:<source>:<slug>
```

## Render and save

```text
qualified address
  -> WorkspaceRegistry.resolveFrameDir
     -> source directory + bare slug + writable flag
  -> document/render/export/import endpoint

Save/import mutation for local-folder
  -> canonical YAML written to ephemeral localhost cache
  -> __DG_workspaceFetch holds success response
  -> GET /api/workspaces/yaml/<qualified-address>
  -> re-read granted file handle
     -> unchanged: write handle, return original success
     -> externally changed: explicit overwrite / keep-external choice
     -> permission/write failure: return non-2xx, retain editor dirty state
```

## Current owners

- Server sources, qualified resolution, writable gate:
  `apps/preview/src/preview-host/workspace/` and `document-apis.ts`
- Grouped navigation: `builtin-host-runtime.ts`, `viewers.ts`, `pages.ts`
- Local handles, IndexedDB, conflict and commit gate:
  `packages/layout-engine/src/preview-shell/local-folder-workspace.ts`
- Ephemeral cache ingest/read:
  `apps/preview/src/preview-host/builtin-server-routes.ts`
- Thin browser save delegation: `scripts/preview/save-client.js`
