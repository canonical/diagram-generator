# Spec 061 findings: preview grid regression

## Scope and evidence

The current `main` codebase already contains the first containment slice from
the preview-shell hardening work. This spec closes the remaining duplication
and records what the investigation can and cannot attribute to the grid
refactor.

### Capability and affordance owners

- `packages/layout-engine/src/preview-engine/builtins.ts` is the capability
  source. `V3_PREVIEW_ENGINE.capabilities.gridEditing` is `true`; Force,
  Sequence, and the ELK manifests are `false`.
- `packages/layout-engine/src/preview-shell/preview-ui-context.ts` owns
  contextual panel visibility. `previewContextSupportsGridEditing` is now the
  single typed predicate for the frame document, frame shell, and active
  engine capability. `gridControlsVisible` additionally requires a single
  root selection.
- `packages/layout-engine/src/preview-shell/app-grid-editor-install-unit.ts`
  passes the same predicate to the inspector runtime. That gates the
  inspector's 9-dot alignment widget and its mutation callbacks, rather than
  leaving a hidden control path able to schedule native relayout.
- `packages/layout-engine/src/preview-shell/app-grid-host.ts` retains a
  second runtime safety boundary: `dispatchPreviewGridControlChange` returns
  an inert transaction before reading grid state, scheduling relayout, or
  writing overrides when `canEditGridControls` is false.

The combination means non-grid engines do not receive the grid section or
alignment affordance in the DOM, and stale direct calls are inert. The live
Chromium regression in
`apps/preview/src/persistence/editor-live-repaint-regression.test.ts` selects
the V3 grid root, confirms grid controls are in the tab order, then switches to
ELK and confirms the section is hidden with no tab stops and no 9-dot buttons.
The layout-engine runtime test invokes the same installed capability closure
through a stale callback and confirms the dispatch remains inert.

## Overlay investigation

The typed render path is still connected:

1. `app-load.ts` calls `loadGridInfo` and `finalizePreviewLoad` for both the
   client-render and fallback paths.
2. `app-grid-runtime.ts` owns `renderGridOverlay` and delegates to
   `renderPreviewGridOverlayHost`.
3. `app-scene-host.ts` removes/replaces `#dg-grid-overlay` in the stage SVG and
   calls the injected `createGridOverlayScene`.
4. `grid-overlay-scene.ts` produces non-empty rect/line shapes for `guideMode`
   `all` when grid info contains rows/columns and canvas dimensions are
   available.
5. `grid-resolution.ts` owns the resolved canvas geometry, while
   `app-grid-host.ts` recomputes runtime grid info and calls `renderGridOverlay`
   after an applied control update.

The default runtime guide mode is deliberately `off` in
`createPreviewGridRuntimeHost`; `renderPreviewGridOverlayHost` removes the
overlay in that mode. Cycling the guide mode uses the same typed runtime and
renders the scene. The live Chromium regression cycles V3 guide mode and
asserts that `#dg-grid-overlay` contains rendered geometry before switching to
ELK. Therefore the reported “lost overlay” is not classified as an active
`(a) not mounted/rendered`, `(b) wrong geometry`, or `(c) controls dead`
regression on the current V3 path.

### Classification and decision

Classification: **(d), intentional support boundary**. Grid editing is
intentionally V3-only; non-grid engines do not get a grid model or overlay.
The evidence does not justify restoring a grid overlay to ELK, Force,
Sequence, or Dagre, and no larger restoration follow-up is opened by this
spec. V3 keeps the existing overlay path and its guide-mode behavior.

Decision: **retire the grid affordance on non-grid engines and retain the V3
typed grid path**. If a future report shows a V3 overlay missing while guide
mode is `all`, the next owner is `app-scene-host.ts` / `grid-overlay-scene.ts`.

## ELK error path

The old failure was reachable from the 9-dot or grid-control callback into
`requestRelayout`. With this change, `shouldShowAutolayoutInspector` and
`canEditGridControls` share the capability predicate; the inspector does not
render the 9-dot widget for ELK, and `dispatchPreviewGridControlChange`
short-circuits before any relayout request. This is the containment required by
FR-001–FR-003 without adding behavior to the legacy browser shell.
