export type {
  EditorSnapshot,
  EditorSnapshotInput,
} from './editor-snapshot.js';

export {
  captureEditorSnapshot,
  cloneEditorSnapshotValue,
  normalizeGridOverrides,
  parseEditorSnapshot,
  serializeEditorSnapshot,
} from './editor-snapshot.js';

export type {
  EditorOverridePatchCommand,
  EditorStatePatchCommand,
  EditorUndoCommand,
  EditorUndoStackOptions,
  PendingUndoableAction,
} from './editor-undo-stack.js';

export {
  EditorUndoStack,
  createOverridePatchCommand,
  createStatePatchCommand,
  overridePatchChanged,
} from './editor-undo-stack.js';

export type {
  EditorStateStoreDeps,
  EditorStateStoreOptions,
} from './editor-state-store.js';

export {
  EditorStateStore,
  captureOverrideEntries,
  createEditorStateStore,
} from './editor-state-store.js';

export {
  PERSIST_FRAME_KEYS,
  UNSUPPORTED_PERSIST_FRAME_KEYS,
  PERSIST_INT_FRAME_KEYS,
  PERSIST_LOWER_FRAME_KEYS,
  RELAYOUT_FRAME_KEYS,
  UNDO_RELAYOUT_FRAME_KEYS,
  hasV3FrameOverride,
  filterRelayoutOverrideEntry,
  type PersistFrameKey,
  type RelayoutFrameKey,
} from './frame-override-manifest.js';

export type {
  InspectorSelectionItem,
  InspectorSelectionParentLayout,
  MultiSelectionInspectorViewModel,
  SelectionActionInfo,
} from './inspector-selection.js';

export {
  createMultiSelectionInspectorViewModel,
  createSelectionActionInfo,
  inferSelectionGap,
  resolvePrimarySelectedId,
} from './inspector-selection.js';

export type {
  InspectorDeltaState,
  InspectorDirection,
  InspectorEffectiveDeltaState,
  InspectorPositionType,
  InspectorSizingMode,
  SingleSelectionAutolayoutState,
  SingleSelectionInspectorViewModel,
} from './inspector-single.js';

export {
  createSingleSelectionAutolayoutState,
  createSingleSelectionInspectorViewModel,
} from './inspector-single.js';

export type {
  MultiSelectionAlignItem,
  MultiSelectionAlignState,
  MultiSelectionContainerItem,
  MultiSelectionContainerState,
  MultiSelectionSizingItem,
  MultiSelectionSizingState,
} from './inspector-multi.js';

export {
  createMultiSelectionAlignState,
  createMultiSelectionContainerState,
  createMultiSelectionSizingState,
} from './inspector-multi.js';

export type {
  DoubleClickSelectionResolution,
  PointerSelectionResolution,
} from './interaction-selection.js';

export {
  isAutolayoutParentLayout,
  resolveDoubleClickSelection,
  resolvePointerSelection,
} from './interaction-selection.js';

export type {
  SelectionStateMutation,
  SelectionStateSnapshot,
} from './interaction-selection-state.js';

export {
  applySelectionStateMutation,
} from './interaction-selection-state.js';

export type {
  DragCompletionPlan,
  DragReorderTarget,
  ResizeCompletionPlan,
} from './interaction-completion.js';

export {
  resolveDragCompletion,
  resolveResizeCompletion,
} from './interaction-completion.js';

export type {
  PreviewDragCompletionDispatchOptions,
  PreviewDragCompletionState,
  PreviewResizeCompletionDispatchOptions,
  PreviewResizeCompletionState,
} from './interaction-completion-dispatch.js';

export {
  dispatchPreviewDragCompletion,
  dispatchPreviewResizeCompletion,
} from './interaction-completion-dispatch.js';

export type {
  PreviewResizeMoveDispatchOptions,
  PreviewResizeMoveResult,
  PreviewResizeMoveState,
  PreviewResizeNodeBounds,
  PreviewResizeSelection,
} from './interaction-resize-dispatch.js';

export {
  dispatchPreviewResizeMove,
} from './interaction-resize-dispatch.js';

export type {
  PreviewAutolayoutDragContext,
  PreviewDragDelta,
  PreviewDragMoveDispatchOptions,
  PreviewDragMoveResult,
  PreviewDragMoveState,
  PreviewDragSnapResult,
  PreviewDragSnapTargets,
} from './interaction-drag-dispatch.js';

export {
  dispatchPreviewDragMove,
} from './interaction-drag-dispatch.js';

export type {
  SingleSelectionAutolayoutPanelRenderOptions,
} from './inspector-autolayout-panel.js';

export {
  renderSingleSelectionAutolayoutPanel,
} from './inspector-autolayout-panel.js';

export type {
  MultiSelectionInspectorPanelRenderOptions,
  MultiSelectionStyleState,
} from './inspector-multi-panel.js';

export {
  renderMultiSelectionInspectorPanel,
} from './inspector-multi-panel.js';

export type {
  SingleSelectionInspectorPanelRenderOptions,
  SingleSelectionInspectorViolation,
} from './inspector-single-panel.js';

export {
  renderSingleSelectionInspectorPanel,
} from './inspector-single-panel.js';

export type {
  SelectionActionPlanItem,
  SelectionAlignMode,
  SelectionDistributeAxis,
  SelectionParentBounds,
  SelectionTargetOverrideEntry,
  SelectionTargetPoint,
} from './selection-actions.js';

export {
  clampSelectionTarget,
  createSelectionTargetOverrideEntries,
  normalizeSelectionGap,
  resolveSelectionAlignTargets,
  resolveSelectionDistributeTargets,
} from './selection-actions.js';

export {
  createPreviewGridOverlayScene,
} from './grid-overlay-scene.js';

export type {
  PreviewGridOverlayLine,
  PreviewGridOverlayRect,
  PreviewGridOverlayScene,
  PreviewGridOverlayShape,
} from './grid-overlay-scene.js';

export type {
  ReorderResolution,
  ReorderTargetPoint,
  ResizeBounds,
  ResizeBoundsInput,
  ResizeGuideLine,
  SingleResizeOverride,
  SingleResizeOverrideInput,
} from './interaction-geometry.js';

export {
  applyReorderOrder,
  resizeBoundsFromHandle,
  resolveSingleResizeOverride,
  resolveAutolayoutReorderTarget,
} from './interaction-geometry.js';

export type {
  InteractionDeltaPatch,
  InteractionDeltaValue,
  InteractionOverrideEntry,
  MultiSelectionResizeMember,
  MultiSelectionResizeOverride,
  ResizePersistenceEntry,
  ResizePersistenceItem,
  ResizePersistencePlan,
} from './interaction-resize.js';

export {
  collectRecursiveRelayoutEntries,
  createMultiSelectionResizeOverrides,
  createOriginalOverrideEntries,
  createResizePersistencePlan,
  mergeRelativeOverrideEntries,
} from './interaction-resize.js';

export type {
  KeyboardShortcutAction,
  NudgeKey,
  NudgeSelectionItem,
} from './interaction-keyboard.js';

export {
  createNudgeOverrideEntries,
  isNudgeKey,
  resolveKeyboardShortcutAction,
} from './interaction-keyboard.js';

export type {
  PreviewKeyboardDelta,
  PreviewKeyboardDispatchOptions,
} from './interaction-keyboard-dispatch.js';

export {
  dispatchPreviewKeyboardShortcut,
} from './interaction-keyboard-dispatch.js';

export type {
  PreviewGridInfo,
  ResolvePreviewGridInfoParams,
} from './grid-resolution.js';

export {
  colSpanToPx,
  pxToColSpan,
  pxToRowSpan,
  resolvePreviewGridInfo,
  rowSpanToPx,
} from './grid-resolution.js';

export type {
  PreviewGridControlInputState,
  PreviewGridControlState,
  PreviewGridInfoState,
} from './grid-controls.js';

export {
  createPreviewGridOverrides,
  isGridControlInputId,
  resolvePreviewGridControlInputState,
  resolvePreviewGridControlState,
  resolvePreviewGridInfoFromControlState,
  resolvePreviewGridInfoFromRuntimeState,
} from './grid-controls.js';
