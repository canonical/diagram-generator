# Mutation Owner Map

Spec 069 baseline inventory for current editor mutation paths. This is the
closeout checklist for FR-012/SC-007: each path must be migrated to the
transaction owner, proven inert/read-only, or deferred to a named follow-up
spec before the spec can close.

## Classification Legend

- **migrate**: mutates editor state today and must enter
  `EditorMutationTransaction`.
- **inert/read-only**: may update focus, hover, selection display, or derived UI
  only; must be proven not to dirty, enqueue undo, relayout, or change save
  payload.
- **deferred**: intentionally left outside this spec with a named follow-up
  spec id.

## Current Mutation Paths

| Path | Entry / owner today | State writers today | Render / relayout trigger today | Classification | Notes |
|------|---------------------|---------------------|----------------------------------|----------------|-------|
| Engine tab click | `preview-engine-workspace-chrome.ts` `switchTo()` from tab click/keyboard | `__DG_CONFIG.active_engine_id`, `__DG_CONFIG.layout_engine`, `__DG_previewRenderIntent`, `__DG_previewEngineWorkspaceState`, frame tree `layoutEngine` through `setFrameTreeLayoutEngine()` | `__DG_rerenderPreviewEngineWorkspaceStage()` in `app-grid-editor-install-unit.ts`; then `installActivePreviewEngineRuntime()` and `rerenderStageFromModel()` | migrate | Needs atomic transaction result proving active tab, render intent, frame-tree engine, active option bucket, visible panels, dirty state, and rendered `data-layout-engine` agree. |
| Engine workspace panel sync | `app-grid-editor-install-unit.ts` `__DG_syncPreviewEngineWorkspacePanels` -> `syncPreviewPanelVisibilityFromContext()` | DOM visibility/disabled state for panels derived from shell mode, engine capabilities, selection, dirty state | No render by itself | inert/read-only | Keep derived only. Any control hidden by this path must still be guarded by transaction capability checks if invoked through stale DOM. |
| Engine option edit | Active engine runtime installed by `installActivePreviewEngineRuntime()`; option buckets owned by `layout-operator-overrides.ts` | `model.layoutOperatorOverrides`, active `model.layoutOverrides`, `layoutOverrideNamespace` | Engine relayout/fresh render through preview engine runtime and bridge contract | migrate | Must reject keys not in the active manifest bucket. Switching engines must activate the new bucket without leaking inactive options into layout input. |
| Native grid/autolayout controls | `app-grid-host.ts` `dispatchPreviewGridControlChangeHost()` from `app-grid-runtime.ts` `bindControls()` | `model.gridOverrides`, pending grid undo action, overlay `gridInfo`, dirty flag | Debounced `requestRelayout(rootId)`; grid overlay rerender | migrate | Current panel visibility is capability-based, but stale DOM events can still call the mutation path unless a transaction gate checks active engine capability before any write. |
| Guide-mode cycle | `app-grid-host.ts` `cyclePreviewGuideModeHost()` | Local `guideMode`, guide badge DOM | Grid overlay render only | inert/read-only | Visual-only overlay state. Must remain out of dirty/undo/save payload. |
| Single-frame alignment edit | `app-inspector-mutation-runtime.ts` `setFrameAlign()` -> `dispatchPreviewSingleFrameAlignHost()` | Frame override entry through `applySingleFramePropMutation()`, dirty flag, undo patch action | Immediate `requestRelayoutNow()` | migrate | Has `shouldShowAutolayoutInspector()` gate, but no common reason-coded inert result or state-vector diagnostic yet. |
| Single-frame layout prop edit | `app-inspector-mutation-runtime.ts` `setFrameProp()` | Frame override entry, dirty flag, undo patch action | Immediate relayout for layout-critical props; scheduled relayout otherwise | migrate | Needs explicit relayout policy per prop and capability gate before writes. |
| Single-frame size edit | `app-inspector-mutation-runtime.ts` `setFrameSize()` | Frame override sizing keys, dirty flag, undo patch action | Immediate `requestRelayoutNow()` | migrate | Needs transaction policy for geometry-changing edits and complete state-vector check. |
| Appearance/style variant edit | `app-inspector-mutation-runtime.ts` `applyStyle()` | Style override keys, dirty flag, undo patch action | Scheduled relayout only when `previewStyleChangeRequiresRelayout()` returns true | migrate | Must prove appearance-only changes do not relayout when measured geometry is unchanged. |
| Selection click/double-click | `app-selection-host.ts` and `app-drag-host.ts` pointer selection helpers | `selectedIds`, `selectionDepth`, tree selection classes, inspector render target | No layout relayout unless gesture proceeds into drag | migrate | Selection is observable state. Transaction result must include selection id/type, inspector target, focused control, visible/applicable controls. |
| Deselect / clear selection | `app-selection-host.ts` `clearPreviewSelectionState()` and pointer deselect path | `selectedIds`, `selectionDepth`, DOM selection classes, inspector empty state | No layout relayout | migrate | Should be a deterministic no-persistence transaction: no dirty, no undo, no save delta. |
| Resize drag | `app-resize-host.ts` start/move/complete helpers | Transient interaction state, frame overrides via `persistPreviewResizeToFrameOverrides()`, propagated override resets, dirty flag via `setOverride()`, undo patch action | Live resize relayout during interaction; completion may call `requestRelayout(triggerCid)` | migrate | Needs declared policy for local/live relayout vs final engine relayout and state-vector validation after completion. |
| Component drag/reorder | `app-drag-host.ts` start/move/complete helpers and completion dispatch | Transient interaction state, frame overrides or reorder state, selected id, dirty flag through override writes, undo patch action | Local refresh/reorder apply; no single transaction result today | migrate | Needs explicit policy for drag geometry, autolayout child reorder, selection restore, and dirty/undo effects. |
| Arrow waypoint drag/insert/delete | `app-waypoint-host.ts` waypoint start/move/complete/commit helpers | Arrow node `waypoints`, persisted waypoint override, inspector refresh, undo patch action | Rebuild arrow SVG; no full layout unless surrounding path requests it | migrate | Should be geometry-changing but usually not engine relayout. Transaction policy must state arrow-local render vs layout relayout. |
| Text edit | Text adapter runtime through editor interaction facade; text relayout scheduled by `schedulePreviewTextRelayoutFromEditorHost()` | Text override keys, dirty flag, undo patch action | Debounced `requestLayoutRelayoutFromFacade()` | migrate | Needs explicit policy for text measurement/relayout and state-vector evidence after commit. |
| Clear all overrides | `app-grid-editor-runtime.ts` `onClearAllOverrides()` | Clears frame overrides, `gridOverrides`, `layoutOverrides`, layout-operator buckets, removed ids, coerced keys; dirty flag; undo action | `rerenderStageFromModel()` | migrate | Important reset transaction: must restore active engine bucket coherently and not leave stale option aliases. |
| Delete selected frames | Scene facade from `app-grid-editor-runtime.ts` | Frame tree/removal state, selected ids, dirty flag, undo action | Rerender stage from updated model/tree | migrate | Included because deletion changes frame tree and save payload. |
| Undo / redo | `editor-state-store.ts`, `editor-undo-stack.ts`, `app-state-restore.ts` | Overrides, grid overrides, layout overrides, layout-operator state, removed ids, frame tree; dirty synced from serialized snapshot | `rerenderStageFromFrameTree()`, `requestRelayout()`, or local refresh by restore plan | migrate | Needs complete state-vector restore including engine intent, visible controls, rendered engine, geometry, dirty state. |
| Save | `app-save-client.ts` `saveOverrides()` plus `app-save-payload.ts` normalization and engine payload collector | Server payload, persisted workspace state on save success, dirty clean state, coerced-key clear, selection restore | POST `/api/overrides/:slug`, then `reloadDiagram()` | migrate | Save currently validates unsupported engine layout keys, but transaction closeout must prove bad inactive state is not produced before save. |
| Reload after save / navigation load | Bootstrap/load/state restore paths in `app-grid-editor-runtime.ts`, `app-load.ts`, `app-state-restore.ts` | Model overrides, grid overrides, layout overrides, layout-operator buckets, frame tree, selected ids, dirty baseline | Stage rerender, grid info reload, panel sync, constraint run | migrate | Persist -> reload regression must assert saved clean state vector matches parsed/reloaded state. |
| Raw/SVG export | `app-save-client.ts` `saveCurrentSvg()` | Temporary export flag and downloaded SVG only | No app render mutation | inert/read-only | Must remain outside document dirty/undo/save state. |

## Known Bypass Risks

- Grid controls can be invoked by stale DOM events even when hidden by panel
  visibility. They need a capability gate at mutation entry, not only at panel
  render time.
- Engine tab switching commits several state surfaces before the rerender
  promise resolves. The transaction owner must be able to roll back or report a
  structured rejected result when the commit/render sequence fails.
- Layout-operator override aliases (`layoutOverrides` plus
  `layoutOperatorOverrides`) are still dual surfaces. The transaction owner must
  name the active bucket and keep aliases derived from that bucket only.
- Save normalization is a downstream guard, not a mutation guard. Unsupported
  or inactive keys reaching `normalizePreviewSavePayload()` should be treated as
  diagnostics for missing transaction gating.
