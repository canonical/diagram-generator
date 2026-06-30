export type EditorMutationKind =
  | 'engine-tab'
  | 'engine-option'
  | 'grid-control'
  | 'inspector-appearance'
  | 'inspector-layout'
  | 'selection'
  | 'geometry'
  | 'waypoint'
  | 'text-edit'
  | 'clear'
  | 'undo-redo'
  | 'save'
  | 'reload'
  | (string & {});

export type EditorMutationRelayoutPolicy =
  | 'none'
  | 'local'
  | 'engine'
  | 'fresh-render';

export type EditorMutationDirtyPolicy =
  | 'preserve'
  | 'clean'
  | 'mark-dirty'
  | 'sync-from-state';

export type EditorMutationUndoPolicy =
  | 'none'
  | 'record'
  | 'restore'
  | 'clear';

export type EditorMutationResultKind =
  | 'committed'
  | 'noop'
  | 'inert'
  | 'rejected';

export interface EditorMutationCapabilityGate {
  readonly applicable: boolean;
  readonly reason: string;
  readonly capability?: string | null;
}

export interface EditorMutationRenderIntentDelta {
  readonly engineId?: string | null;
  readonly pageDirection?: string | null;
  readonly changed?: boolean;
}

export interface EditorMutationPersistenceDelta {
  readonly frameOverridesChanged?: boolean;
  readonly gridOverridesChanged?: boolean;
  readonly layoutOverridesChanged?: boolean;
  readonly frameTreeChanged?: boolean;
  readonly removedFramesChanged?: boolean;
  readonly savePayloadChanged?: boolean;
}

export interface EditorMutationDiagnostics {
  readonly code: string;
  readonly message: string;
  readonly severity?: 'info' | 'warning' | 'error';
  readonly details?: unknown;
}

export interface EditorMutationTransaction {
  readonly kind: EditorMutationKind;
  readonly sourceControl: string;
  readonly activeEngineId: string | null;
  readonly documentKind: string | null;
  readonly capabilityGate: EditorMutationCapabilityGate;
  readonly renderIntentDelta?: EditorMutationRenderIntentDelta | null;
  readonly persistenceDelta?: EditorMutationPersistenceDelta | null;
  readonly relayoutPolicy: EditorMutationRelayoutPolicy;
  readonly dirtyPolicy: EditorMutationDirtyPolicy;
  readonly undoPolicy: EditorMutationUndoPolicy;
  readonly rejectReason?: string | null;
  readonly diagnostics?: readonly EditorMutationDiagnostics[];
}

export interface EditorMutationTransactionResult {
  readonly kind: EditorMutationResultKind;
  readonly mutationKind: EditorMutationKind;
  readonly sourceControl: string;
  readonly activeEngineId: string | null;
  readonly reason: string;
  readonly relayoutPolicy: EditorMutationRelayoutPolicy;
  readonly dirtyPolicy: EditorMutationDirtyPolicy;
  readonly undoPolicy: EditorMutationUndoPolicy;
  readonly renderIntentDelta: EditorMutationRenderIntentDelta | null;
  readonly persistenceDelta: EditorMutationPersistenceDelta | null;
  readonly diagnostics: readonly EditorMutationDiagnostics[];
}

export interface EditorMutationStateVector {
  readonly activeTab?: string | null;
  readonly renderIntentEngineId?: string | null;
  readonly frameTreeLayoutEngine?: string | null;
  readonly activeOptionBucket?: string | null;
  readonly renderedEngine?: string | null;
  readonly selectionId?: string | null;
  readonly selectionType?: string | null;
  readonly inspectorTarget?: string | null;
  readonly focusedControl?: string | null;
  readonly controlApplicabilityReason?: string | null;
  readonly dirty?: boolean | null;
  readonly canUndo?: boolean | null;
  readonly canRedo?: boolean | null;
  readonly visibleControls?: readonly string[];
}

export interface EditorMutationStateVectorViolation {
  readonly code: string;
  readonly message: string;
  readonly fields: readonly string[];
  readonly expected?: unknown;
  readonly actual?: unknown;
}

export interface CompareEditorMutationStateVectorOptions {
  readonly before?: EditorMutationStateVector | null;
  readonly after: EditorMutationStateVector;
  readonly transaction?: EditorMutationTransactionResult | null;
}

function hasPersistenceDelta(delta: EditorMutationPersistenceDelta | null | undefined): boolean {
  return Boolean(delta && Object.values(delta).some(Boolean));
}

function hasRenderIntentDelta(delta: EditorMutationRenderIntentDelta | null | undefined): boolean {
  return Boolean(delta && (
    delta.changed === true
    || Object.prototype.hasOwnProperty.call(delta, 'engineId')
    || Object.prototype.hasOwnProperty.call(delta, 'pageDirection')
  ));
}

function isNoopTransaction(transaction: EditorMutationTransaction): boolean {
  return transaction.relayoutPolicy === 'none'
    && transaction.dirtyPolicy === 'preserve'
    && transaction.undoPolicy === 'none'
    && !hasPersistenceDelta(transaction.persistenceDelta)
    && !hasRenderIntentDelta(transaction.renderIntentDelta);
}

export function resolveEditorMutationTransaction(
  transaction: EditorMutationTransaction,
): EditorMutationTransactionResult {
  const diagnostics = transaction.diagnostics ?? [];
  const renderIntentDelta = transaction.renderIntentDelta ?? null;
  const persistenceDelta = transaction.persistenceDelta ?? null;

  if (transaction.rejectReason) {
    return {
      kind: 'rejected',
      mutationKind: transaction.kind,
      sourceControl: transaction.sourceControl,
      activeEngineId: transaction.activeEngineId,
      reason: transaction.rejectReason,
      relayoutPolicy: 'none',
      dirtyPolicy: 'preserve',
      undoPolicy: 'none',
      renderIntentDelta,
      persistenceDelta,
      diagnostics,
    };
  }

  if (!transaction.capabilityGate.applicable) {
    return {
      kind: 'inert',
      mutationKind: transaction.kind,
      sourceControl: transaction.sourceControl,
      activeEngineId: transaction.activeEngineId,
      reason: transaction.capabilityGate.reason,
      relayoutPolicy: 'none',
      dirtyPolicy: 'preserve',
      undoPolicy: 'none',
      renderIntentDelta: null,
      persistenceDelta: null,
      diagnostics,
    };
  }

  if (isNoopTransaction(transaction)) {
    return {
      kind: 'noop',
      mutationKind: transaction.kind,
      sourceControl: transaction.sourceControl,
      activeEngineId: transaction.activeEngineId,
      reason: transaction.capabilityGate.reason || 'no state change',
      relayoutPolicy: 'none',
      dirtyPolicy: 'preserve',
      undoPolicy: 'none',
      renderIntentDelta: null,
      persistenceDelta: null,
      diagnostics,
    };
  }

  return {
    kind: 'committed',
    mutationKind: transaction.kind,
    sourceControl: transaction.sourceControl,
    activeEngineId: transaction.activeEngineId,
    reason: transaction.capabilityGate.reason,
    relayoutPolicy: transaction.relayoutPolicy,
    dirtyPolicy: transaction.dirtyPolicy,
    undoPolicy: transaction.undoPolicy,
    renderIntentDelta,
    persistenceDelta,
    diagnostics,
  };
}

function present(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

function sameOrMissing(left: string | null | undefined, right: string | null | undefined): boolean {
  return !present(left) || !present(right) || left === right;
}

export function compareEditorMutationStateVector(
  options: CompareEditorMutationStateVectorOptions,
): EditorMutationStateVectorViolation[] {
  const after = options.after;
  const violations: EditorMutationStateVectorViolation[] = [];
  const engineFields = [
    ['activeTab', after.activeTab],
    ['renderIntentEngineId', after.renderIntentEngineId],
    ['frameTreeLayoutEngine', after.frameTreeLayoutEngine],
    ['renderedEngine', after.renderedEngine],
  ] as const;
  const presentEngineFields: Array<readonly [string, string]> = engineFields
    .filter((entry) => present(entry[1]))
    .map(([field, value]) => [field, value as string] as const);
  const uniqueEngines = new Set(presentEngineFields.map(([, value]) => value));

  if (uniqueEngines.size > 1) {
    violations.push({
      code: 'engine-identity-drift',
      message: 'Active tab, render intent, frame tree, and rendered SVG engine must agree after mutation.',
      fields: presentEngineFields.map(([field]) => field),
      actual: Object.fromEntries(presentEngineFields),
    });
  }

  if (
    present(after.activeOptionBucket)
    && present(after.renderIntentEngineId)
    && after.activeOptionBucket !== after.renderIntentEngineId
  ) {
    violations.push({
      code: 'option-bucket-drift',
      message: 'Active option bucket must match the committed render-intent engine.',
      fields: ['activeOptionBucket', 'renderIntentEngineId'],
      expected: after.renderIntentEngineId,
      actual: after.activeOptionBucket,
    });
  }

  if (
    after.selectionType === 'single'
    && present(after.selectionId)
    && !sameOrMissing(after.selectionId, after.inspectorTarget)
  ) {
    violations.push({
      code: 'inspector-selection-drift',
      message: 'Single-selection inspector target must match the selected id.',
      fields: ['selectionId', 'inspectorTarget'],
      expected: after.selectionId,
      actual: after.inspectorTarget ?? null,
    });
  }

  if (
    options.transaction?.kind === 'inert'
    && options.before
    && (
      after.dirty !== options.before.dirty
      || after.canUndo !== options.before.canUndo
      || after.canRedo !== options.before.canRedo
      || after.renderedEngine !== options.before.renderedEngine
    )
  ) {
    violations.push({
      code: 'inert-mutation-changed-state',
      message: 'Inert mutations must not change dirty, undo, redo, or rendered-engine state.',
      fields: ['dirty', 'canUndo', 'canRedo', 'renderedEngine'],
      expected: {
        dirty: options.before.dirty,
        canUndo: options.before.canUndo,
        canRedo: options.before.canRedo,
        renderedEngine: options.before.renderedEngine,
      },
      actual: {
        dirty: after.dirty,
        canUndo: after.canUndo,
        canRedo: after.canRedo,
        renderedEngine: after.renderedEngine,
      },
    });
  }

  if (
    options.transaction?.kind === 'committed'
    && options.transaction.undoPolicy === 'record'
    && after.canUndo === false
  ) {
    violations.push({
      code: 'missing-undo-entry',
      message: 'Committed mutation declared undo recording, but canUndo is false after mutation.',
      fields: ['undoPolicy', 'canUndo'],
      expected: true,
      actual: false,
    });
  }

  return violations;
}
