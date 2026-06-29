# Spec 065 Evidence Result

Spec: 065-interactive-relayout-contract
Bundle rebuilt: 2026-06-29T00:37+01:00 via `npm run preview` prestart (`npm --prefix packages/layout-engine run build:browser`)
Server restarted fresh: yes, `http://127.0.0.1:8120`

Gestures proven (real click/select/drag, no `skipModelUpdate` proof calls):
- Engine tab switch on `/view/v3:mongo-octavia-ha`: PASS - rendered `data-layout-engine` changed to `v3` and node bounds changed.
- Engine tab switch on `/view/v3:juju-bootstrap-machines-process`: PASS - rendered `data-layout-engine` changed through `v3`, `elk-layered`, `elk-force`, `elk-stress`, `elk-mrtree`, and `dagre`, with node bounds changing each time.
- Page-direction flip on `/view/v3:tiered-network-architecture`: PASS - root child spread flipped from horizontal (`x: 805.266`, `y: 0`) to vertical (`x: 0`, `y: 264`), 13 arrow line signatures changed, endpoints stayed attached, and `PreviewRenderIntent.pageDirection` committed `HORIZONTAL` then `VERTICAL`.
- ELK live resize on `/view/v3:mongo-octavia-ha`: PASS - `mongo_clients` width changed from 224 to 304 and status stayed `Ready`.
- Box-type change on `/view/v3:support-engineering-flow`: PASS - engine stayed `elk-force`, selected node style changed `section` to `default`, and node count remained 6 with stable bounds.
- Contextual controls: PASS - v3 ELK section hidden/unfocusable/unpainted, ELK pages hide native grid controls with `display: none` and zero rects, raw debug toggle absent, raw-view helper text absent, layered-only control visible for `elk-layered` and absent after switching to `elk-radial`.

Engine identity read from `data-layout-engine`: yes
Geometry asserted (bounds/endpoints), not hashed/counted: yes
Single `PreviewRenderIntent` path (no new parallel lane): confirmed by implementation and focused tests

Evidence artifact:
- `post-load-mutations.ts`
- `post-load-mutations-result.json` with `ok: true`, generated `2026-06-29T08:01:50.990Z`
- `diagnostics/support-flow-elk-aside-before-next.png`
- `diagnostics/support-flow-elk-aside-after-hidden-fix.png`

Validation:
- `npm --prefix packages/layout-engine run build:browser` -> passed
- `npm --prefix packages/layout-engine test` -> 149 files passed, 878 tests passed
- `npm --prefix apps/preview test` -> 146 tests passed
- `node apps/preview/node_modules/typescript/bin/tsc --noEmit --target ES2022 --module ES2022 --moduleResolution bundler --strict --skipLibCheck --types node --typeRoots apps/preview/node_modules/@types --lib ES2022,DOM specs/065-interactive-relayout-contract/evidence/post-load-mutations.ts` -> passed
- `node scripts/check-browser-bundle-fresh.mjs` -> ok, 3 artifacts checked
- `node scripts/check_no_new_python.mjs` -> ok, 9 Python files scanned, no new product-path files

Incremental T021 validation:
- `npm --prefix packages/layout-engine test -- app-layout-bridge-runtime.test.ts preview-render-intent.test.ts` -> 2 files passed, 12 tests passed
- `PREVIEW_BASE_URL=http://127.0.0.1:8120 node --experimental-default-type=module specs/065-interactive-relayout-contract/evidence/post-load-mutations.ts` -> ok

Incremental T012 validation:
- `npm --prefix packages/layout-engine test -- app-grid-editor-install-unit.test.ts app-shell-panels.test.ts preview-engine-elk-runtime.test.ts preview-ui-context.test.ts` -> 4 files passed, 36 tests passed
- `PREVIEW_BASE_URL=http://127.0.0.1:8120 node --experimental-default-type=module specs/065-interactive-relayout-contract/evidence/post-load-mutations.ts` -> ok with stricter unpainted hidden-control assertions
- `node scripts/check-browser-bundle-fresh.mjs` -> ok, 3 artifacts checked

Incremental T020 validation:
- `npm --prefix packages/layout-engine test -- preview-engine-workspace-chrome.test.ts app-grid-editor-install-unit.test.ts preview-render-intent.test.ts` -> 3 files passed, 13 tests passed; tab click and keyboard activation assert `__DG_previewRenderIntent.engineId`
- `PREVIEW_BASE_URL=http://127.0.0.1:8120 node --experimental-default-type=module specs/065-interactive-relayout-contract/evidence/post-load-mutations.ts` -> ok with real `page.click` engine-tab switches on `mongo-octavia-ha` and `juju-bootstrap-machines-process`

Incremental T022 validation:
- `npm --prefix packages/layout-engine test -- app-relayout.test.ts app-live-resize.test.ts` -> 2 files passed, 25 tests passed; null engine result maps to `engine-failure` and `formatPreviewRelayoutStatusMessage('engine-failure') === 'Engine relayout failed'`
- `PREVIEW_BASE_URL=http://127.0.0.1:8120 node --experimental-default-type=module specs/065-interactive-relayout-contract/evidence/post-load-mutations.ts` -> ok with real mouse drag on `mongo-octavia-ha` (`mongo_clients` width 224 -> 304, status `Ready`)

Incremental T023 validation:
- `npm --prefix packages/layout-engine test -- app-inspector-mutation-runtime.test.ts frame-style.test.ts` -> 2 files passed, 14 tests passed; `section -> default` style change does not schedule/request relayout
- `PREVIEW_BASE_URL=http://127.0.0.1:8120 node --experimental-default-type=module specs/065-interactive-relayout-contract/evidence/post-load-mutations.ts` -> ok with real `selectOption` on `support-engineering-flow`; engine stayed `elk-force` and node bounds stayed byte-identical

Incremental T010/T011 validation:
- `npm --prefix packages/layout-engine test -- app-fresh-render.test.ts preview-render-intent.test.ts app-grid-editor-install-unit.test.ts app-layout-bridge-runtime.test.ts` -> 4 files passed, 25 tests passed; committed `PreviewRenderIntent` drives `renderFreshPreviewSvg` over an authored `elk-layered` frame tree
- `rg -n '__DG_CONFIG\\??\\.(active_engine_id|layout_engine)' packages/layout-engine/src/preview-shell/app-fresh-render.ts packages/layout-engine/src/preview-shell/app-layout-bridge-runtime.ts packages/layout-engine/src/preview-shell/app-relayout-runtime.ts packages/layout-engine/src/preview-shell/app-grid-editor-install-unit.ts packages/layout-engine/src/preview-shell/preview-render-intent.ts` -> no matches
- `PREVIEW_BASE_URL=http://127.0.0.1:8120 node --experimental-default-type=module specs/065-interactive-relayout-contract/evidence/post-load-mutations.ts` -> ok after fresh browser rebuild
- `node scripts/check-browser-bundle-fresh.mjs` -> ok, 3 artifacts checked

Final T040 validation:
- Fresh server restarted with `PREVIEW_PORT=8120 npm run preview`; prestart rebuilt the browser bundle
- `PREVIEW_BASE_URL=http://127.0.0.1:8120 node --experimental-default-type=module specs/065-interactive-relayout-contract/evidence/post-load-mutations.ts` -> `ok: true`
- `node scripts/check-browser-bundle-fresh.mjs` -> ok, 3 artifacts checked

Incremental T030 validation:
- `npm --prefix apps/preview test -- src/persistence/frame-diagram.test.ts` -> 146 tests passed, including `persist layout engine and root direction survive frame yaml reload`
