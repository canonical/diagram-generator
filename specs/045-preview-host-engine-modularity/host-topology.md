# Preview Host Topology

Cold-start map for the Node preview host under spec 045.

## Pipeline

1. Request hits `apps/preview/src/server.ts`
2. Server resolves the preview lane and slug
3. Preview-host lane descriptors build browse links and viewer paths
4. Shared page-shell builders assemble viewer/index HTML
5. Browser loads `layout-engine` bundle plus lane-specific shell scripts

## Current owners

| Concern | Owner |
|--------|-------|
| App entrypoint + HTTP server | `apps/preview/src/server.ts` |
| Lane descriptors | `apps/preview/src/preview-host/lanes.ts` |
| Shared viewer/index page shell | `apps/preview/src/preview-host/pages.ts` |
| Engine compatibility/manifest | `packages/layout-engine/src/preview-engine/*` |
| Browser shell and bridge | `scripts/preview/*`, `packages/layout-engine/src/preview-shell/*`, spec 044 |

## Lane vs shell

Do not blur these:

- **Preview host lane**: server-side registration, browse path, viewer page assembly, asset/script selection
- **Browser shell tier**: runtime editor/controller surface such as grid shell, force shell, ELK debug helpers

Today the repo effectively has:

- one grid shell tier (`editor.js` + `layout-bridge.js`, with ELK selected through `layout_engine` and engine-specific browser scripts)
- one force shell tier (`force.js`)

Spec 045 modularizes the first concern. Spec 044 modularizes the second.

## First landed slice

- Grid and force viewer paths now come from typed lane descriptors.
- Browse-nav and select-option generation now comes from preview-host sections instead of server-local string assembly.
- Viewer/index HTML assembly now lives in shared preview-host page builders.

## Tests to run

- `npm --prefix apps/preview test -- preview-host-contract.test.ts engine-contract-consumers.test.ts`
- `npm --prefix packages/layout-engine test -- browser-entry-contract.test.ts`

## Known limits

- `server.ts` still owns most route handlers and document-loading helpers.
- Grid and force still use different browser controllers; this spec only modularizes the host, not the editor behavior.
- Engine onboarding is not fully descriptor-driven yet; this is the first host slice, not the end state.
- A preview-engine manifest is still not a complete preview-host plugin contract by itself.
