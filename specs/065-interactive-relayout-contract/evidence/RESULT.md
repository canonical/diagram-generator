# Spec 065 Evidence Result

Spec: 065-interactive-relayout-contract
Bundle rebuilt: 2026-06-29T00:17+01:00 via `npm --prefix packages/layout-engine run build:browser`
Server restarted fresh: yes, `http://127.0.0.1:8120`

Gestures proven (real click/select/drag, no `skipModelUpdate` proof calls):
- Engine tab switch on `/view/v3:mongo-octavia-ha`: PASS - rendered `data-layout-engine` changed to `v3` and node bounds changed.
- Engine tab switch on `/view/v3:juju-bootstrap-machines-process`: PASS - rendered `data-layout-engine` changed through `v3`, `elk-layered`, `elk-force`, `elk-stress`, `elk-mrtree`, and `dagre`, with node bounds changing each time.
- Page-direction flip on `/view/v3:tiered-network-architecture`: PASS - root child spread flipped from horizontal (`x: 805.266`, `y: 0`) to vertical (`x: 0`, `y: 264`), 13 arrow line signatures changed, endpoints stayed attached, and `PreviewRenderIntent.pageDirection` committed `HORIZONTAL` then `VERTICAL`.
- ELK live resize on `/view/v3:mongo-octavia-ha`: PASS - `mongo_clients` width changed from 224 to 304 and status stayed `Ready`.
- Box-type change on `/view/v3:support-engineering-flow`: PASS - engine stayed `elk-force`, selected node style changed `section` to `default`, and node count remained 6 with stable bounds.
- Contextual controls: PASS - v3 ELK section hidden/unfocusable, raw/debug toggles absent, layered-only control visible for `elk-layered` and absent after switching to `elk-radial`.

Engine identity read from `data-layout-engine`: yes
Geometry asserted (bounds/endpoints), not hashed/counted: yes
Single `PreviewRenderIntent` path (no new parallel lane): confirmed by implementation and focused tests

Evidence artifact:
- `post-load-mutations.mjs`
- `post-load-mutations-result.json` with `ok: true`, generated `2026-06-28T23:17:47.239Z`

Validation:
- `npm --prefix packages/layout-engine test` -> 149 files passed, 874 tests passed
- `npm --prefix apps/preview test` -> 145 tests passed
- `node scripts/check-browser-bundle-fresh.mjs` -> ok, 3 artifacts checked
- `node scripts/check_no_new_python.mjs` -> ok, no new product-path Python files

Incremental T021 validation:
- `npm --prefix packages/layout-engine test -- app-layout-bridge-runtime.test.ts preview-render-intent.test.ts` -> 2 files passed, 12 tests passed
- `PREVIEW_BASE_URL=http://127.0.0.1:8120 node specs/065-interactive-relayout-contract/evidence/post-load-mutations.mjs` -> ok
