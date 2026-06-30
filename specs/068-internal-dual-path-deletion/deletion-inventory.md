# Deletion Inventory: Spec 068 Internal Dual-Path Deletion

This file is the kill list for repo-owned internal dual paths. It is not a
history essay. If an item is listed here, the expectation is deletion unless a
real external contract is named.

## Canonical Decisions

- **Browser contract access**: `window.LayoutEngine.previewShell.*` and
  `window.LayoutEngine.previewEngines.graph.*`
- **Relayout browser entry names**: `requestLayoutRelayout`,
  `getLayoutRelayoutStatus`
- **Graph-layout pane/controller naming**: neutral `layout-params` /
  `PreviewEngine*` names, not ELK-branded names for generic owners
- **Viewer route**: `/view/v3:<slug>`
- **Engine-layout persistence policy**: save/load only manifest-approved active
  namespace keys; strip or reject unknown keys

## Banned Internal Alias List

These patterns must be gone from active product code and active tests at
closeout unless this file records a concrete external contract exception:

- `_getPreviewGridEditorCompat`
- `requestV3Relayout`
- `getV3RelayoutStatus`
- `requestElkRelayout`
- `ElkPreviewController`
- `ElkLayoutControls`
- `createPreviewElkLayoutControlsRuntime`
- `ensurePreviewElkPreviewController`
- `__DG_getPreviewElkEngineContract`
- active tests that assert unsupported `meta.elk` / `meta.dagre` keys are
  preserved on save
- repo-owned `/v3/view/` emission or normalization support

## Explicit Non-Debt Exclusions

These are **not** 068 targets unless later evidence shows a second internal path
exists for the same behavior:

- `compatibleEngines` / engine-to-document compatibility checks
  Reason: product semantics, not migration duplication.
- `outer_margin`
  Reason: current docs still define it as the canonical uniform grid-margin
  field, not as a deprecated alias.
- `ELK_LAYERED_PARAM_SPECS` as a layered-engine registry export by itself
  Reason: the debt is the generic-pane fallback to old ELK-root access, not the
  existence of a layered registry constant.

## Inventory

| Item | Canonical owner/path | Current evidence | Decision | Why it still exists | Delete plan |
|------|----------------------|------------------|----------|---------------------|-------------|
| `_getPreviewGridEditorCompat` browser facade | `window.LayoutEngine.previewShell.bootstrap.*` runtime + direct typed host/install APIs | `scripts/preview/editor.js`; many preview VM contract tests and `preview-script-test-helpers.ts` inject or read it | `delete now` | Browser shell and VM tests were written against the migration facade instead of the canonical typed contract | Rewrite `editor.js` and the helper/tests to bind the canonical preview-shell bootstrap/runtime APIs directly, then remove the facade from the install unit |
| `requestV3Relayout` / `getV3RelayoutStatus` duplicate relayout globals | `requestLayoutRelayout` / `getLayoutRelayoutStatus` | `scripts/preview/editor.js`; `app-bootstrap.ts`; `app-grid-editor-*`; multiple contract tests | `delete now` | Old v3 naming was kept while graph/ELK lanes converged | Move runtime/browser callers and tests to the canonical layout relayout names, then delete v3 aliases from bootstrap and browser globals |
| `requestElkRelayout` fallback in generic graph-layout controls | `requestLayoutRelayout` through the generic preview engine shell contract | `layout-params-controls.ts` | `delete now` | Generic pane still tolerates the pre-unification ELK callback name | Remove the fallback and require the generic contract only |
| `ElkPreviewController` / `ElkLayoutControls` window slots and type names | Neutral `PreviewEngineShellController` / `PreviewEngineLayoutControls` owners | `app-bootstrap.ts`; `app-grid-editor-install-unit.ts`; `app-layout-bridge-runtime.ts`; `layout-params-controls.ts`; `layout-params-controller.ts` | `delete now` | ELK-specific naming survived the graph-layout pane unification | Rename the remaining types/slots/callers to neutral names and delete ELK-named aliases |
| `createPreviewElkLayoutControlsRuntime` and `ensurePreviewElkPreviewController` exports | Neutral `createPreviewEngineLayoutControlsRuntime` and `ensurePreviewEngineShellController` exports | `packages/layout-engine/src/index.ts`; `browser-entry-preview-shell.ts`; `browser-entry-flat-*`; `preview-engine/index.ts` | `delete now` | Public/browser barrels still carry old ELK-branded names for generic owners | Update repo-owned imports and browser-entry barrels, then delete the old export names |
| `__DG_getPreviewElkEngineContract` browser global | `window.LayoutEngine.previewEngines.graph` contract access | `scripts/preview/editor-base.js`; `app-layout-bridge-runtime.ts` | `delete now` | Bridge bootstrap still offers a pre-registry global getter | Point bridge runtime at the canonical graph-engine contract and remove the global getter from `editor-base.js` |
| Save-time preservation of unsupported `meta.elk` / `meta.dagre` keys | Manifest-aware strip-or-reject persistence | `frame-diagram.test.ts` tests at “persist preserves legacy unsupported…” | `delete now` | Persistence kept historical foreign keys alive instead of normalizing them away | Replace preservation tests with strip/reject assertions and remove permissive persistence behavior |
| `/v3/view/` viewer route alias | `/view/v3:<slug>` | `builtin-autolayout-host.ts`; `preview-host-contract.test.ts`; `app-diagram-navigation.ts` | `delete now` | Host and route normalizer still accept the superseded viewer path prefix | Update repo-owned route emitters/tests to canonical `/view/v3:` paths and remove alias prefixes/normalization |
| `legacyArrowComponentId` fallback | Canonical preview arrow component ids from `preview-arrow-component-ids.ts` | `frame-diagram.ts` lookup path only | `migrate then delete in-spec` | Save-time override lookup still tolerates an older arrow id shape; fixture/corpus usage not yet confirmed | Search frame corpus and tests for old arrow-id shape. If none remain, delete the fallback; if any remain, rewrite them in-repo and then delete |
| Generic-pane fallback to old ELK-root param access | Active engine manifest `controlSpecs` and graph contract groups | `layout-params-controls.ts` fallback to `previewEngines.elk.ELK_LAYERED_PARAM_SPECS` and root `ELK_LAYERED_PARAM_SPECS` | `delete now` | Pane runtime still carries a pre-manifest rescue lane | Require manifest-backed specs/groups only and delete the fallback accessors |

## First Execution Order

1. Remove browser/test facade aliases:
   `_getPreviewGridEditorCompat`, `requestV3Relayout`, `getV3RelayoutStatus`.
2. Remove ELK-branded generic pane/controller aliases and browser-entry exports.
3. Remove permissive save preservation of foreign engine-layout keys.
4. Remove `/v3/view/` route alias.
5. Audit and then remove `legacyArrowComponentId`.
