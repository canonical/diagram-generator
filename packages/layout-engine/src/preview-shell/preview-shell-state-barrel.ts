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
  PERSIST_ARROW_KEYS,
  UNSUPPORTED_PERSIST_FRAME_KEYS,
  PERSIST_INT_FRAME_KEYS,
  PERSIST_LOWER_FRAME_KEYS,
  RELAYOUT_FRAME_KEYS,
  RELAYOUT_ARROW_KEYS,
  UNDO_RELAYOUT_FRAME_KEYS,
  UNDO_RELAYOUT_ARROW_KEYS,
  hasPreviewRelayoutFrameOverride,
  hasV3FrameOverride,
  filterRelayoutOverrideEntry,
  type PersistFrameKey,
  type PersistArrowKey,
  type RelayoutFrameKey,
} from './frame-override-manifest.js';

export {
  DEFAULT_FRAME_YAML_ENGINE_LAYOUT_NAMESPACE,
  filterSupportedFrameYamlEngineLayoutOverrides,
  getSupportedFrameYamlControlSpecsForNamespace,
  isSupportedFrameYamlEngineLayoutNamespace,
  listFrameYamlEngineLayoutCandidateIds,
  resolveFrameYamlEngineLayoutCandidateId,
  resolveFrameYamlEngineLayoutNamespaceForOverrides,
  type FrameYamlPersistedControlSpec,
} from './frame-yaml-engine-layout-contract.js';

export type {
  LayoutOperatorOverrideModelLike,
  LayoutOperatorOverrideState,
  ResolveLayoutOperatorOverrideViewModelOptions,
  ResolvedLayoutOperatorOverrideViewModel,
} from './layout-operator-overrides.js';

export {
  activateLayoutOperatorOverrideBucket,
  baseLayoutOperatorNamespaceFromPersistNodeNamespace,
  clearLayoutOperatorNodeBucketRegistry,
  cloneLayoutOperatorOverrideState,
  collectNamespacedLayoutOperatorOverrides,
  layoutOperatorKeyForManifest,
  persistNodeNamespaceForLayoutOperatorNamespace,
  pruneSessionBucketForManifest,
  readActiveLayoutOperatorOverrideBucket,
  readLayoutOperatorOverrideBucketForManifest,
  readLayoutOperatorOverrideState,
  replaceLayoutOperatorNodeBucketsForNamespace,
  resolveEffectiveLayoutOperatorOverrides,
  resolveLayoutOperatorOverrideViewModel,
  writeLayoutOperatorOverrideBucketForManifest,
  writeLayoutOperatorOverrideState,
} from './layout-operator-overrides.js';

export type {
  PreviewGridControlInputState,
  PreviewGridControlDomPatch,
  PreviewGridControlDomState,
  PreviewGridMarginInputState,
  PreviewGridControlRuntimeUpdate,
  PreviewGridControlState,
  PreviewGridInfoState,
} from './grid-controls.js';

export type {
  CreatePreviewEngineWorkspaceStateOptions,
  PreviewEngineWorkspaceEngine,
  PreviewEngineWorkspaceNavigation,
  PreviewEngineWorkspaceState,
  PreviewEngineWorkspaceTab,
} from './preview-engine-workspace.js';

export {
  clearPreviewEngineWorkspaceSessionState,
  createPreviewEngineWorkspaceState,
  persistPreviewEngineWorkspaceActiveEngine,
  reopenPreviewEngineWorkspace,
  resolveActivePreviewLayoutEngine,
  setPreviewEngineWorkspaceActiveEngine,
  setPreviewEngineWorkspaceSessionState,
} from './preview-engine-workspace.js';

export type {
  CreatePreviewInterpreterNodeRegistryOptions,
  PreviewInterpreterNode,
  PreviewInterpreterNodeRegistration,
  PreviewInterpreterNodeRegistry,
} from './preview-interpreter-node.js';

export {
  clearPreviewInterpreterNodeParams,
  createPreviewInterpreterNodeRegistry,
  createRegisteredPreviewInterpreterNodeRegistry,
  getPreviewInterpreterNode,
  getPreviewInterpreterNodeParams,
  listPreviewInterpreterNodes,
  resolvePreviewInterpreterNodeId,
  setPreviewInterpreterNodeParams,
} from './preview-interpreter-node.js';

export type {
  CreatePreviewRenderIntentOptions,
  PreviewRenderIntent,
  PreviewRenderIntentFrameTree,
  PreviewRenderIntentWindowLike,
  ResolvePreviewRenderIntentLayoutEngineOptions,
} from './preview-render-intent.js';

export {
  applyPreviewRenderIntentToFrameTreeJson,
  commitPreviewRenderIntentToWindow,
  createPreviewRenderIntent,
  resolvePreviewRenderIntentLayoutEngine,
} from './preview-render-intent.js';

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
  CompareEditorMutationStateVectorOptions,
  EditorMutationCapabilityGate,
  EditorMutationDiagnostics,
  EditorMutationDirtyPolicy,
  EditorMutationKind,
  EditorMutationPersistenceDelta,
  EditorMutationRelayoutPolicy,
  EditorMutationRenderIntentDelta,
  EditorMutationResultKind,
  EditorMutationStateVector,
  EditorMutationStateVectorViolation,
  EditorMutationTransaction,
  EditorMutationTransactionResult,
  EditorMutationUndoPolicy,
} from './editor-mutation-transaction.js';

export {
  compareEditorMutationStateVector,
  resolveEditorMutationTransaction,
} from './editor-mutation-transaction.js';

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
