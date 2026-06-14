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
  NudgeKey,
  NudgeSelectionItem,
} from './interaction-keyboard.js';

export {
  createNudgeOverrideEntries,
  isNudgeKey,
} from './interaction-keyboard.js';
