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
  hasPreviewRelayoutFrameOverride,
  hasV3FrameOverride,
  filterRelayoutOverrideEntry,
  type PersistFrameKey,
  type RelayoutFrameKey,
} from './frame-override-manifest.js';

export type {
  PreviewGridControlInputState,
  PreviewGridControlDomPatch,
  PreviewGridControlDomState,
  PreviewGridMarginInputState,
  PreviewGridControlRuntimeUpdate,
  PreviewGridControlState,
  PreviewGridInfoState,
} from './grid-controls.js';

export {
  createPreviewGridOverrides,
  isGridControlInputId,
  resolvePreviewGridControlDomPatch,
  resolvePreviewGridControlInputState,
  resolvePreviewGridControlRuntimeUpdate,
  resolvePreviewGridControlState,
  resolvePreviewGridControlStateFromDomState,
  resolvePreviewGridInfoFromControlState,
  resolvePreviewGridInfoFromRuntimeState,
  resolvePreviewGridMarginsFromInputState,
} from './grid-controls.js';

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
  PreviewFrameMutationNode,
  PreviewFrameMutationNodeData,
  PreviewFrameOverrideEntry,
  PreviewFrameOverrideMap,
  PreviewFramePropMutationKind,
  PreviewFramePropMutationResult,
  PreviewFrameSizeDimension,
} from './frame-prop-actions.js';

export {
  applyMultiFramePropMutation,
  applyMultiFrameSizeMutation,
  applySingleFramePropMutation,
  applySingleFrameSizeMutation,
  resolvePreviewFrameSizePx,
} from './frame-prop-actions.js';

export type {
  MultiSelectionPreviewStyleItem,
  MultiSelectionPreviewStyleState,
  PreviewBoxStyleMap,
  PreviewBoxStylePreset,
  PreviewRenderedStyleFields,
  PreviewStyleMode,
  PreviewStyleNode,
  PreviewStyleNodeData,
  PreviewStyleOverrideEntry,
  PreviewStyleOverrideMap,
  SingleSelectionPreviewStyleState,
} from './frame-style.js';

export {
  PREVIEW_STYLE_SEMANTICS,
  applyPreviewStyleFields,
  applyVisiblePreviewStyleOverride,
  formatPreviewDefinedStyleLabel,
  hasPreviewVisibleStylePicker,
  inferPreviewStyleFromFields,
  inferPreviewStyleFromNode,
  isPreviewStructuralWrapper,
  isPreviewStyleableComponentType,
  normalizePreviewStyleFill,
  normalizePreviewStyleName,
  normalizePreviewStyleStrokeOrBorder,
  renderPreviewBoxStyleOptions,
  resolvePreviewBoxStyleLabel,
  resolveBasePreviewStyleName,
  resolveEffectivePreviewStyleName,
  resolveMultiSelectionPreviewStyleState,
  resolveSingleSelectionPreviewStyleState,
} from './frame-style.js';
