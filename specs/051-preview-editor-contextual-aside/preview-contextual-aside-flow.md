# Preview Contextual Aside Flow

## Pipeline

```text
frame/force/sequence document
  -> preview host resolves active engine manifest
  -> host injects __DG_CONFIG and template sections
  -> browser bootstrap loads typed preview-shell runtime
  -> PreviewUiContext combines engine, document, selection, and state
  -> PreviewPanelRegistry resolves visible/disabled groups
  -> right aside and left nav render only applicable controls
  -> save/reload/export keep existing document APIs
```

## Key Files

- `scripts/preview/viewer-unified.html`: static chrome ids and placeholders.
- `apps/preview/src/preview-host/builtin-autolayout-host.ts`: frame viewer
  context, compatible engines, template section visibility.
- `apps/preview/src/preview-host/builtin-force-host.ts`: force viewer context.
- `packages/layout-engine/src/preview-engine/builtins.ts`: manifest
  capabilities and `hostView.sidebarSections`.
- `packages/layout-engine/src/preview-engine/types.ts`: capability and sidebar
  section contract.
- `packages/layout-engine/src/preview-shell/inspector-*.ts`: selection-derived
  inspector facts and renderers.
- `packages/layout-engine/src/preview-shell/app-shell-panels.ts`: layers tree,
  override summary, constraint status.
- `scripts/preview/engine-switcher.js`: current legacy browser glue; keep as
  delegation only.

## Tests To Run

- `npm --prefix packages/layout-engine test`
- `npm --prefix apps/preview test`
- `node scripts/check_no_new_python.mjs`

## Known Limits

- Force-node inspector rendering still lives in `scripts/preview/force.js`;
  this spec gates force visibility but does not complete force-shell migration.
- Engine switching intentionally persists `meta.layout_engine` immediately and
  reloads. The UI should make this explicit instead of modeling it as an
  unsaved override.
- Screenshot verification is not required by default; use DOM probes unless the
  user explicitly asks for visual checks.
