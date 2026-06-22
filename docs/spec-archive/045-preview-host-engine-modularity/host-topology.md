# Preview Host Topology

Cold-start map for the Node preview host under spec 045.

## Pipeline

1. Request hits `apps/preview/src/server.ts`
2. `server.ts` delegates host bootstrap to `createBuiltinPreviewHostInstallDeps(...)`
3. Builtin preview-host modules resolve their own install contexts by module key
4. Registered viewer routes build browse links, viewer paths, and document endpoints
5. Shared page-shell builders assemble viewer/index HTML
6. Browser loads `layout-engine` bundle plus lane-specific shell scripts

## Install path

1. `apps/preview/src/server.ts` builds generic host install deps plus builtin
   module contexts through `builtin-host-runtime.ts`.
2. `installBuiltinPreviewHost()` registers the builtin preview-host modules.
3. Each builtin module resolves only its own typed context:
   `builtin-autolayout-host.ts`, `builtin-force-host.ts`,
   `builtin-server-routes.ts`.
4. `registry.ts`, `modules.ts`, and `api-routes.ts` become the host-owned
   composition seams for future lane onboarding.
5. Deps-heavy builtin lanes still extend `builtin-host-runtime.ts` for install
   context assembly; this slice removes `server.ts` branching, not every
   builtin bootstrap hook.

## Current owners

| Concern | Owner |
|--------|-------|
| App entrypoint + HTTP server | `apps/preview/src/server.ts` |
| Builtin host runtime/dependency assembly | `apps/preview/src/preview-host/builtin-host-runtime.ts` |
| Lane descriptors | `apps/preview/src/preview-host/lanes.ts` |
| Shared viewer/index page shell | `apps/preview/src/preview-host/pages.ts` |
| Registered viewer/API/server route modules | `apps/preview/src/preview-host/*host*.ts`, `api-routes.ts`, `modules.ts`, `registry.ts` |
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

## Current lane tiers

| Host lane | Viewer route key | Browser shell tier | Browser owner |
|-----------|------------------|--------------------|---------------|
| autolayout | `autolayout` | `grid` | `editor.js`, `layout-bridge.js`, spec 044 contracts |
| force | `force` | `force` | `force.js`, `previewEngines.force` |

Lane registration may choose one of these shell tiers or add a new one later,
but the host descriptor/module must not absorb editor or bridge behavior.

## Closeout state

- Grid and force viewer paths now come from typed lane descriptors.
- Browse-nav and select-option generation now comes from preview-host sections instead of server-local string assembly.
- Viewer/index HTML assembly now lives in shared preview-host page builders.
- Builtin host runtime/dependency assembly now lives in `builtin-host-runtime.ts`
  instead of inline `server.ts` helpers.
- Builtin server routes, viewer routes, and document endpoints install through
  registered preview-host modules and registries.
- `preview-host-contract.test.ts` now includes a production-path third-lane
  coexistence proof through `installBuiltinPreviewHost(...)`, showing
  browse/index/viewer/API integration alongside autolayout and force without
  `server.ts` branching.

## Future lane onboarding checklist

1. Extend the engine-side compatibility/manifest owner in
   `packages/layout-engine/src/preview-engine/*` if the document kind or shell
   support changes.
2. Add a preview-host lane descriptor or reuse an existing lane in
   `apps/preview/src/preview-host/lanes.ts`.
3. Register a preview-host module that installs the viewer route plus any
   owner-scoped API/document routes in `apps/preview/src/preview-host/*`.
4. If the lane needs builtin-specific install context, extend
   `builtin-host-runtime.ts` and the single bootstrap call instead of adding
   server-local route/page branching.
5. Reuse the shared page builders in `pages.ts` / `viewers.ts`; do not add
   bespoke page HTML assembly to `server.ts`.
6. Select an existing browser shell tier or declare a new browser owner
   separately from the preview-host module.

## Contract boundary

- Spec 035 remains the authority for preview-engine compatibility and engine
  manifests.
- Spec 045 owns lane descriptors, preview-host module registration, route/page
  assembly, and host-side onboarding.
- Spec 044 owns browser-shell contracts, bridge decomposition, and
  engine-specific browser behavior.
- A preview-engine manifest is not, by itself, a preview-host plugin contract;
  host module registration stays explicit on purpose.

## Tests to run

- `npm --prefix apps/preview run build`
- `npm --prefix apps/preview test`
- `node scripts/check_no_new_python.mjs`

## Known limits

- `server.ts` still owns the generic app entrypoint, HTTP adapters, watch
  loop, and browser-bundle bootstrap.
- Deps-heavy new host lanes still extend `builtin-host-runtime.ts` and the
  `createBuiltinPreviewHostInstallDeps(...)` input list until module-context
  self-registration exists.
- Grid and force still use different browser controllers; this spec only modularizes the host, not the editor behavior.
- A preview-engine manifest is still not a complete preview-host plugin contract by itself.
