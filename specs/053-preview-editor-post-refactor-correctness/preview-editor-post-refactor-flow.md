# Preview Editor Post-Refactor Flow

## Pipeline

```text
frame YAML
  -> apps/preview frame document loader
  -> preview-engine registry compatibility
  -> viewer HTML + window.__DG_CONFIG
  -> preview-shell UI context
  -> inspector / engine controls
  -> typed mutation or save action
  -> YAML persist + relayout
```

## Alignment and Direction Path

- Inspector clicks start in `inspector-single-panel.ts` or
  `inspector-multi-panel.ts`.
- Browser event dispatch is owned by `app-inspector-actions.ts` and the grid
  editor install runtime.
- Single-frame align mutates through `app-inspector-mutation-runtime.ts` and
  `frame-prop-actions.ts`.
- Multi-selection align mutates through `app-inspector-selection-runtime.ts` and
  `selection-actions.ts`.
- Direction, alignment, override application, and relayout run through
  `app-relayout.ts` and `app-override-application.ts`.
- Stage/canvas sizing is refreshed through `app-frame-svg.ts`,
  `app-stage-svg.ts`, and `app-shell-resize.ts`.
- YAML persistence is owned by `apps/preview/src/persistence/frame-diagram.ts`.

## Engine UI Path

- Server document resolution is owned by
  `apps/preview/src/preview-host/frame-documents.ts`.
- Compatibility is owned by `packages/layout-engine/src/preview-engine/registry.ts`.
- Viewer config is emitted by `builtin-autolayout-host.ts` into
  `window.__DG_CONFIG`.
- Section visibility is owned by `preview-ui-context.ts` and
  `app-shell-panels.ts`.
- ELK controls are rendered by `elk-layout-controls.ts`; Dagre/non-ELK graph
  controls use the `graph-layout` section and controller.
- Engine switch saves route through `frame-document-actions.ts` and must use the
  same compatibility check as the rendered list.

## Tests To Run

- `npm --prefix packages/layout-engine test -- app-inspector-mutation-runtime.test.ts frame-prop-actions.test.ts app-relayout.test.ts`
- `npm --prefix packages/layout-engine test -- app-frame-svg.test.ts app-stage-svg.test.ts app-shell-resize.test.ts`
- `npm --prefix packages/layout-engine test -- preview-ui-context.test.ts preview-engine-elk-runtime.test.ts`
- `npm --prefix apps/preview test`
- `npm --prefix packages/layout-engine run build:browser`
- `node scripts/check-browser-bundle-fresh.mjs`

## Known Limits

- Do not add new engine-specific branches in `scripts/preview/*.js`.
- Do not broaden this into right-aside redesign; spec 051 owns broader panel
  composition.
- Screenshot evidence is stored under this spec for context, but closeout must
  rely on DOM/text assertions and focused tests.
