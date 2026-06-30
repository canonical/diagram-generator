import { resolvePreviewEngine } from '../preview-engine/registry.js';
import type { ElkLayoutSnapshot } from '../elk-layout.js';
import type { Arrow, Frame, FrameDiagram } from '../frame-model.js';
import type { TextMeasureAdapter } from '../text-measure.js';
import {
  invalidatePreviewArrowWaypointGeometry,
  shouldInvalidatePreviewArrowWaypointGeometry,
} from './preview-arrow-reroute-invalidation.js';
import {
  normalizePreviewWorkspaceEngineId,
} from './preview-engine-workspace.js';
import {
  readFrameYamlEngineLayoutOverridesForLayoutEngine,
} from './frame-yaml-engine-layout-contract.js';
import {
  activateLayoutOperatorOverrideBucket,
  readActiveLayoutOperatorOverrideBucket,
  readLayoutOperatorOverrideBucketForManifest,
  resolveActiveLayoutOperatorManifest,
  resolveEffectiveLayoutOperatorOverrides,
  writeActiveLayoutOperatorOverrides,
  writeLayoutOperatorOverrideBucketForManifest,
} from './layout-operator-overrides.js';
import type { LayoutOperatorOverrideState } from './layout-operator-overrides.js';
import {
  applyPreviewRenderIntentToFrameTreeJson,
  commitPreviewRenderIntentToWindow,
  createPreviewRenderIntent,
  resolvePreviewRenderIntentLayoutEngine,
  type PreviewRenderIntent,
  type PreviewRenderIntentFrameTree,
  type PreviewRenderIntentWindowLike,
} from './preview-render-intent.js';
import type { PreviewRoutedArrow } from './app-arrow-render.js';
import type { FreshPreviewSvgRenderResult } from './app-fresh-render.js';
import type { PreviewLocalRelayoutStatus, PreviewRelayoutOverrideEntry } from './app-relayout.js';

export type PreviewLocalRelayoutOverrideMode = 'auto' | 'unready';

export interface PreviewLayoutBridgeState<
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
> {
  previewDocumentJson: TPreviewDocumentJson | null;
  frameTreeJson: TFrameTreeJson | null;
  lastElkSnapshot: ElkLayoutSnapshot | null;
  lastElkFrameLabels: Record<string, string> | null;
  renderIntent: PreviewRenderIntent | null;
  textAdapter: TextMeasureAdapter | null;
  textAdapterError: string | null;
  localRelayoutOverrideMode: PreviewLocalRelayoutOverrideMode;
}

export interface PreviewLayoutBridgeRelayoutResult {
  coerced?: Map<string, unknown> | null;
  width: number;
  height: number;
}

export interface PreviewLayoutBridgeOldBoundsEntry {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PreviewLayoutBridgeRelayoutExecutionOptions {
  skipModelUpdate?: boolean;
}

/** @deprecated Prefer `PreviewLayoutBridgeRelayoutExecutionOptions`. */
export type PreviewLayoutBridgeLocalRelayoutOptions = PreviewLayoutBridgeRelayoutExecutionOptions;

export interface PreviewLayoutBridgeRemovalModel {
  removedIds?: Set<string>;
  topLevelRemovalIds?: (() => string[]) | null;
}

export interface PreviewLayoutBridgeModelTreeLoader {
  loadTree: (nodes: unknown[]) => void;
}

export interface PreviewLayoutBridgeCoreContract<
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
> {
  deserializeFrameDiagramWire: (json: TFrameTreeJson | Record<string, unknown>) => FrameDiagram;
  resolveStyles: (root: Frame) => void;
  layoutFrameTree: (
    root: Frame,
    textAdapter: TextMeasureAdapter,
    options: {
      gridCols?: unknown;
      gridColGap?: unknown;
      gridOuterMargin?: unknown;
      arrows?: unknown;
    },
  ) => PreviewLayoutBridgeRelayoutResult;
}

export interface PreviewLayoutBridgeRenderContract {
  collectPreviewFramesById: (
    frame: Frame,
    out: Record<string, Frame>,
  ) => Record<string, Frame>;
  collectPreviewPlacedBounds: (
    frame: Frame,
    out: Record<string, PreviewLayoutBridgeOldBoundsEntry>,
  ) => Record<string, PreviewLayoutBridgeOldBoundsEntry>;
  fitPreviewSvgToRenderedContent: (options: {
    svg: SVGSVGElement;
    padding?: number;
    minWidth?: number;
    minHeight?: number;
  }) => unknown;
  patchPreviewSvgFromLayout: (options: {
    svg: SVGSVGElement | null;
    oldBounds: Record<string, PreviewLayoutBridgeOldBoundsEntry>;
    newBounds: Record<string, PreviewLayoutBridgeOldBoundsEntry>;
    framesById: Record<string, Frame>;
    textAdapter: TextMeasureAdapter | null;
  }) => void;
  routePreviewArrows: (
    arrows: Arrow[],
    boundsMap: Record<string, PreviewLayoutBridgeOldBoundsEntry>,
  ) => PreviewRoutedArrow[];
  patchPreviewArrowSvg: (options: {
    svg: SVGSVGElement | null;
    routedArrows: PreviewRoutedArrow[];
    boundsMap: Record<string, PreviewLayoutBridgeOldBoundsEntry>;
    headLen?: number;
    headHalf?: number;
  }) => void;
  syncPreviewArrowsInModel: (
    model: unknown,
    arrows: Arrow[],
    routedArrows: PreviewRoutedArrow[],
  ) => void;
}

export interface PreviewLayoutBridgeBundleRenderContract<
  TModel,
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
> {
  renderFreshPreviewSvg: CreatePreviewLayoutBridgeRuntimeOptions<
    TModel,
    TPreviewDocumentJson,
    TFrameTreeJson
  >['renderFreshPreviewSvg'];
}

export interface PreviewLayoutBridgeRelayoutContract {
  collectPreviewRelayoutFrameOverrides: (
    overrides: Record<string, PreviewRelayoutOverrideEntry>,
  ) => Record<string, PreviewRelayoutOverrideEntry>;
  applyPreviewOverridesToFrameTree: (
    diagram: FrameDiagram,
    allOverrides: Record<string, PreviewRelayoutOverrideEntry>,
    gridOverrides: Record<string, unknown>,
  ) => void;
}

export interface PreviewLayoutBridgeHostContract<
  TModel,
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
> {
  updatePreviewComponentModelFromLayout: (
    model: TModel,
    frame: Frame,
  ) => void;
}

export interface CreatePreviewLayoutBridgeRuntimeFromBrowserHostOptions<
  TModel,
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
> {
  state: PreviewLayoutBridgeState<TPreviewDocumentJson, TFrameTreeJson>;
  slug: string;
  ownerDocument: Document;
  previewWindow: {
    __DG_CONFIG?: {
      head_len?: number;
      head_half?: number;
    } | null;
  };
  previewCore: PreviewLayoutBridgeCoreContract<TPreviewDocumentJson, TFrameTreeJson>;
  previewBridgeRender: PreviewLayoutBridgeRenderContract;
  previewBridgeBundleRender: PreviewLayoutBridgeBundleRenderContract<
    TModel,
    TPreviewDocumentJson,
    TFrameTreeJson
  >;
  previewBridgeRelayout: PreviewLayoutBridgeRelayoutContract;
  previewBridgeHost: PreviewLayoutBridgeHostContract<TModel, TPreviewDocumentJson, TFrameTreeJson>;
  resolvePreviewEngineManifest: (json: TFrameTreeJson | Record<string, unknown> | null) => {
    capabilities?: {
      serverRelayout?: boolean;
    } | null;
  } | null;
  createTextAdapter: () => Promise<TextMeasureAdapter>;
  getTextAdapterBackend: (textAdapter: TextMeasureAdapter | null) => string | null;
  isAuthoritativeTextAdapter: (textAdapter: TextMeasureAdapter | null) => boolean;
  resolveEngineLayoutOptionOverrides?: ((
    diagram: FrameDiagram,
    model: TModel,
  ) => Record<string, string>) | null;
  refreshElkViewMode: () => void;
  refreshLayoutControls?: (() => void) | null;
  warn: (message: string, error?: unknown) => void;
  error: (message: string, error?: unknown) => void;
  fetchPreviewDocument?: ((slug: string) => Promise<TPreviewDocumentJson | null>) | null;
}

export interface CreatePreviewElkViewModeRuntimeFromBrowserHostOptions {
  previewWindow: PreviewElkViewModeWindowLike;
  ownerDocument: Document;
  previewWindowConfig?: {
    headLen?: number | null;
    headHalf?: number | null;
  } | null;
  getLayoutBridgeRuntime: () => {
    getLastElkSnapshot: () => ElkLayoutSnapshot | null;
    getLastElkFrameLabels: () => Record<string, string> | null;
  };
  renderPreviewElkRawView?: CreatePreviewElkViewModeRuntimeOptions['renderPreviewElkRawView'];
}

export interface CreatePreviewLayoutBridgeRuntimeOptions<
  TModel,
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
> {
  state: PreviewLayoutBridgeState<TPreviewDocumentJson, TFrameTreeJson>;
  fetchPreviewDocument: (slug: string) => Promise<TPreviewDocumentJson | null>;
  extractFrameTreeFromPreviewDocument: (
    previewDocumentJson: TPreviewDocumentJson | null,
  ) => TFrameTreeJson | null;
  createTextAdapter: () => Promise<TextMeasureAdapter>;
  getTextAdapterBackend: (textAdapter: TextMeasureAdapter | null) => string | null;
  isAuthoritativeTextAdapter: (textAdapter: TextMeasureAdapter | null) => boolean;
  isEngineLayoutDiagramJson: (json: TFrameTreeJson | Record<string, unknown> | null) => boolean;
  deserializeFrameDiagram: (json: TFrameTreeJson | Record<string, unknown>) => FrameDiagram;
  collectRelayoutFrameOverrides: (
    overrides: Record<string, PreviewRelayoutOverrideEntry>,
  ) => Record<string, PreviewRelayoutOverrideEntry>;
  applyOverridesToFrameTree: (
    diagram: FrameDiagram,
    allOverrides: Record<string, PreviewRelayoutOverrideEntry>,
    gridOverrides: Record<string, unknown>,
  ) => void;
  layoutLocalDiagram: (
    diagram: FrameDiagram,
    textAdapter: TextMeasureAdapter,
  ) => PreviewLayoutBridgeRelayoutResult;
  collectPlacedBounds: (
    root: Frame,
  ) => Record<string, PreviewLayoutBridgeOldBoundsEntry>;
  collectFramesById: (root: Frame) => Record<string, Frame>;
  queryStageSvg: () => SVGSVGElement | null;
  patchSvgFromLayout: (options: {
    svg: SVGSVGElement | null;
    oldBounds: Record<string, PreviewLayoutBridgeOldBoundsEntry>;
    newBounds: Record<string, PreviewLayoutBridgeOldBoundsEntry>;
    framesById: Record<string, Frame>;
  }) => void;
  routeArrows: (
    arrows: Arrow[],
    boundsMap: Record<string, PreviewLayoutBridgeOldBoundsEntry>,
  ) => PreviewRoutedArrow[];
  patchArrowsSvg: (options: {
    svg: SVGSVGElement | null;
    routedArrows: PreviewRoutedArrow[];
    boundsMap: Record<string, PreviewLayoutBridgeOldBoundsEntry>;
  }) => void;
  updateModelFromLayout: (model: TModel, root: Frame) => void;
  syncArrowsInModel: (model: TModel, arrows: Arrow[], routedArrows: PreviewRoutedArrow[]) => void;
  renderFreshPreviewSvg: (options: {
    ownerDocument: Document;
    previewDocumentJson: TPreviewDocumentJson | null;
    frameTreeJson: TFrameTreeJson | null;
    overrides: Record<string, PreviewRelayoutOverrideEntry>;
    gridOverrides: Record<string, unknown> | null;
    renderIntent?: PreviewRenderIntent | null;
    model: TModel;
    textAdapter: TextMeasureAdapter;
    skipModelUpdate?: boolean | null;
    applySessionRemovalsToDiagramJson: (
      diagramJson: Record<string, unknown>,
      model: TModel,
    ) => void;
    applyOverridesToFrameTree: (
      diagram: FrameDiagram,
      allOverrides: Record<string, PreviewRelayoutOverrideEntry>,
      gridOverrides: Record<string, unknown>,
    ) => void;
    collectRelayoutFrameOverrides: (
      overrides: Record<string, PreviewRelayoutOverrideEntry>,
    ) => Record<string, PreviewRelayoutOverrideEntry>;
    isEngineLayoutDiagramJson: (json: TFrameTreeJson | Record<string, unknown> | null) => boolean;
    resolveEngineLayoutOptionOverrides: (
      diagram: FrameDiagram,
      model: TModel,
    ) => Record<string, string>;
    updateModelFromLayout: (model: TModel, root: Frame) => void;
    syncArrowsInModel: (model: TModel, arrows: Arrow[], routedArrows: PreviewRoutedArrow[]) => void;
  }) => Promise<FreshPreviewSvgRenderResult<SVGSVGElement>>;
  ownerDocument: Document;
  getStageContainer: () => HTMLElement | null;
  fitRenderedSvg: (
    svg: SVGSVGElement,
    options: { minWidth: number; minHeight: number },
  ) => unknown;
  resolveEngineLayoutOptionOverrides: (
    diagram: FrameDiagram,
    model: TModel,
  ) => Record<string, string>;
  refreshElkViewMode: () => void;
  refreshLayoutControls?: (() => void) | null;
  warn: (message: string, error?: unknown) => void;
  error: (message: string, error?: unknown) => void;
}

export interface PreviewLayoutBridgeRuntime<
  TModel,
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
> {
  state: PreviewLayoutBridgeState<TPreviewDocumentJson, TFrameTreeJson>;
  init: (slug: string) => Promise<void>;
  getLocalRelayoutStatus: () => PreviewLocalRelayoutStatus;
  isLocalRelayoutReady: () => boolean;
  setLocalRelayoutOverrideMode: (mode: string | null | undefined) => PreviewLocalRelayoutStatus;
  getPreviewDocumentJson: () => TPreviewDocumentJson | null;
  getFrameTreeJson: () => TFrameTreeJson | null;
  setFrameTreeJson: (json: TFrameTreeJson | null) => void;
  setFrameTreeLayoutEngine: (layoutEngine: string | null | undefined) => string | null;
  getTextAdapter: () => TextMeasureAdapter | null;
  getLastElkSnapshot: () => ElkLayoutSnapshot | null;
  getLastElkFrameLabels: () => Record<string, string> | null;
  applyFrameTreeRemovals: (frameIds: string[]) => string[];
  performLocalRelayout: (
    model: TModel,
    overrides: Record<string, PreviewRelayoutOverrideEntry>,
    gridOverrides: Record<string, unknown>,
    opts?: PreviewLayoutBridgeRelayoutExecutionOptions | null,
  ) => PreviewLayoutBridgeRelayoutResult | null;
  renderFreshSvg: (
    overrides: Record<string, PreviewRelayoutOverrideEntry>,
    gridOverrides: Record<string, unknown> | null,
    model: TModel,
    options?: PreviewLayoutBridgeRelayoutExecutionOptions | null,
  ) => Promise<PreviewLayoutBridgeRelayoutResult & { svg: SVGSVGElement }>;
  performEngineRelayout: (
    model: TModel,
    overrides: Record<string, PreviewRelayoutOverrideEntry>,
    gridOverrides: Record<string, unknown>,
    options?: PreviewLayoutBridgeRelayoutExecutionOptions | null,
  ) => Promise<PreviewLayoutBridgeRelayoutResult | null>;
  /** @deprecated Prefer `performEngineRelayout`. */
  performElkRelayout: (
    model: TModel,
    overrides: Record<string, PreviewRelayoutOverrideEntry>,
    gridOverrides: Record<string, unknown>,
    options?: PreviewLayoutBridgeRelayoutExecutionOptions | null,
  ) => Promise<PreviewLayoutBridgeRelayoutResult | null>;
}

export interface PreviewElkViewModeWindowLike {
  __DG_previewEngineRawView?: boolean;
  __DG_elkRawView?: boolean;
}

export interface CreatePreviewElkViewModeRuntimeOptions {
  previewWindow: PreviewElkViewModeWindowLike;
  getStageSvg: () => SVGSVGElement | null;
  ownerDocument: Document;
  getLastElkSnapshot: () => ElkLayoutSnapshot | null;
  getLastElkFrameLabels: () => Record<string, string> | null;
  renderPreviewElkRawView?: ((options: {
    ownerDocument: Document;
    snapshot: ElkLayoutSnapshot;
    labelMap: Record<string, string>;
    svgNs: string;
    headLen: number;
    headHalf: number;
  }) => SVGElement | SVGGElement | null) | null;
  svgNs: string;
  headLen: number;
  headHalf: number;
}

export interface PreviewElkViewModeRuntime {
  initializeWindowState: () => void;
  refreshViewMode: () => void;
  setRawView: (enabled: boolean) => void;
}

interface PreviewLayoutBridgeLegacyEngineShellController {
  getLayoutOverrides?: () => Record<string, unknown>;
}

interface PreviewLayoutBridgeLegacyLayoutControls {
  refresh?: () => void;
  collectOverrides?: () => Record<string, unknown>;
}

interface PreviewLayoutBridgeLegacyBootstrapContract {
  getPreviewEngineShellController?: (
    previewWindow: PreviewLayoutBridgeLegacyWindow,
  ) => PreviewLayoutBridgeLegacyEngineShellController | null;
}

interface PreviewLayoutBridgeLegacyRenderContract
  extends PreviewLayoutBridgeRenderContract {
  previewArrowComponentId?: (arrow: Arrow) => string;
  createPreviewArrowSvgFragment?: (options: {
    ownerDocument: Document;
    routedArrows: PreviewRoutedArrow[];
    boundsMap: Record<string, PreviewLayoutBridgeOldBoundsEntry>;
    headLen?: number;
    headHalf?: number;
  }) => DocumentFragment;
}

interface PreviewLayoutBridgeLegacyBundleRenderContract<
  TModel extends PreviewLayoutBridgeRemovalModel,
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
> extends PreviewLayoutBridgeBundleRenderContract<TModel, TPreviewDocumentJson, TFrameTreeJson> {
  renderPreviewFrameTreeToSvg?: (options: {
    ownerDocument: Document;
    diagram: FrameDiagram;
    result: PreviewLayoutBridgeRelayoutResult;
    textAdapter: TextMeasureAdapter | null;
    iconElements?: unknown;
    overlays?: unknown;
  }) => SVGSVGElement | SVGElement | DocumentFragment | null;
}

interface PreviewLayoutBridgeLegacyElkEngineContract {
  renderPreviewElkRawView?: CreatePreviewElkViewModeRuntimeOptions['renderPreviewElkRawView'];
}

export interface PreviewLayoutBridgeLegacyWindow extends PreviewElkViewModeWindowLike {
  __DG_CONFIG?: {
    slug?: string;
    head_len?: number;
    head_half?: number;
    layout_engine?: string | null;
  } | null;
  __DG_previewRenderIntent?: PreviewRenderIntent | null;
  setFrameTreeLayoutEngine?: ((layoutEngine: string | null | undefined) => string | null) | null;
  __DG_getPreviewCoreContract?: (() => PreviewLayoutBridgeCoreContract | null) | null;
  __DG_getPreviewBridgeRenderContract?: (() => PreviewLayoutBridgeLegacyRenderContract | null) | null;
  __DG_getPreviewBridgeBundleRenderContract?: ((
    () => PreviewLayoutBridgeLegacyBundleRenderContract<PreviewLayoutBridgeRemovalModel> | null
  )) | null;
  __DG_getPreviewBridgeRelayoutContract?: (() => PreviewLayoutBridgeRelayoutContract | null) | null;
  __DG_getPreviewElkEngineContract?: (() => PreviewLayoutBridgeLegacyElkEngineContract | null) | null;
  __DG_getPreviewShellBootstrapContract?: (() => PreviewLayoutBridgeLegacyBootstrapContract | null) | null;
  PreviewEngineShellController?: PreviewLayoutBridgeLegacyEngineShellController | null;
  ElkPreviewController?: PreviewLayoutBridgeLegacyEngineShellController | null;
  PreviewEngineLayoutControls?: PreviewLayoutBridgeLegacyLayoutControls | null;
  ElkLayoutControls?: PreviewLayoutBridgeLegacyLayoutControls | null;
}

export interface CreatePreviewLayoutBridgeInstallRuntimeFromLegacyBrowserHostOptions<
  TModel extends PreviewLayoutBridgeRemovalModel,
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
> {
  ownerDocument: Document;
  previewWindow: PreviewLayoutBridgeLegacyWindow;
  slug?: string;
}

export interface PreviewLayoutBridgeInstallRuntime<
  TModel extends PreviewLayoutBridgeRemovalModel,
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
> {
  getRuntime: () => PreviewLayoutBridgeRuntime<TModel, TPreviewDocumentJson, TFrameTreeJson>;
  getElkViewModeRuntime: () => PreviewElkViewModeRuntime;
  getPreviewBridgeBundleRenderContract: () => PreviewLayoutBridgeLegacyBundleRenderContract<
    TModel,
    TPreviewDocumentJson,
    TFrameTreeJson
  >;
  getPreviewElkEngineContract: () => PreviewLayoutBridgeLegacyElkEngineContract;
  textAdapterBackend: () => string | null;
  setLocalRelayoutOverrideMode: (
    mode: string | null | undefined,
  ) => PreviewLocalRelayoutStatus;
  getLocalRelayoutStatus: () => PreviewLocalRelayoutStatus;
  isLocalRelayoutReady: () => boolean;
  getFrameTreeJson: () => TFrameTreeJson | null;
  getPreviewDocumentJson: () => TPreviewDocumentJson | null;
  setFrameTreeJson: (json: TFrameTreeJson | null) => void;
  setFrameTreeLayoutEngine: (layoutEngine: string | null | undefined) => string | null;
  applyFrameTreeRemovalsToJson: (
    treeJson: Record<string, unknown> | null | undefined,
    frameIds: string[] | null | undefined,
  ) => string[];
  applyFrameTreeRemovals: (frameIds: string[]) => string[];
  applySessionRemovalsToDiagramJson: (
    diagramJson: Record<string, unknown> | null | undefined,
    model: TModel | null | undefined,
  ) => void;
  initLayoutBridge: (slug: string) => Promise<void>;
  performLocalRelayout: (
    model: TModel,
    overrides: Record<string, PreviewRelayoutOverrideEntry>,
    gridOverrides: Record<string, unknown>,
    opts?: PreviewLayoutBridgeRelayoutExecutionOptions | null,
  ) => PreviewLayoutBridgeRelayoutResult | null;
  performEngineRelayout: (
    model: TModel,
    overrides: Record<string, PreviewRelayoutOverrideEntry>,
    gridOverrides: Record<string, unknown>,
    opts?: PreviewLayoutBridgeRelayoutExecutionOptions | null,
  ) => Promise<PreviewLayoutBridgeRelayoutResult | null>;
  performElkRelayout: (
    model: TModel,
    overrides: Record<string, PreviewRelayoutOverrideEntry>,
    gridOverrides: Record<string, unknown>,
    opts?: PreviewLayoutBridgeRelayoutExecutionOptions | null,
  ) => Promise<PreviewLayoutBridgeRelayoutResult | null>;
  renderFreshSvg: (
    overrides: Record<string, PreviewRelayoutOverrideEntry>,
    gridOverrides: Record<string, unknown> | null,
    model: TModel,
    opts?: PreviewLayoutBridgeRelayoutExecutionOptions | null,
  ) => Promise<PreviewLayoutBridgeRelayoutResult & { svg: SVGSVGElement }>;
  renderFrameTreeToSvg: (
    diagram: FrameDiagram,
    result: PreviewLayoutBridgeRelayoutResult,
    options?: {
      iconElements?: unknown;
      overlays?: unknown;
    } | null,
  ) => SVGSVGElement | SVGElement | DocumentFragment | null;
  createArrowsSvg: (
    routedArrows: PreviewRoutedArrow[] | null | undefined,
    boundsMap: Record<string, PreviewLayoutBridgeOldBoundsEntry> | null | undefined,
  ) => DocumentFragment;
  arrowComponentId: (arrow: Arrow) => string;
  syncArrowsInModel: (
    model: TModel,
    arrows: Arrow[] | null | undefined,
    routedArrows: PreviewRoutedArrow[] | null | undefined,
  ) => void;
  refreshElkViewMode: () => void;
  installCompatWindowBindings: () => void;
}

interface PreviewLayoutBridgeTreeNode {
  id?: string | null;
  role?: string | null;
  direction?: string | null;
  gap?: number | null;
  gapDelta?: number | null;
  border?: string | null;
  positionType?: string | null;
  x?: number | null;
  y?: number | null;
  paddingTop?: number | null;
  paddingRight?: number | null;
  paddingBottom?: number | null;
  paddingLeft?: number | null;
  sizingW?: string | null;
  sizingH?: string | null;
  fillWeight?: number | null;
  minWidth?: number | null;
  maxWidth?: number | null;
  maxWidthChars?: number | null;
  minHeight?: number | null;
  maxHeight?: number | null;
  align?: string | null;
  level?: number | null;
  fill?: string | null;
  borderFill?: string | null;
  heading?: { content?: string | null } | null;
  label?: Array<{ content?: string | null }>;
  children: PreviewLayoutBridgeTreeNode[];
  _layout: {
    placedX: number;
    placedY: number;
    placedW: number;
    placedH: number;
  };
}

function clonePreviewLayoutBridgeValue<T>(value: T): T {
  if (value == null) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function isPreviewLayoutBridgeRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function writePreviewLayoutEngine(
  record: Record<string, unknown>,
  layoutEngine: string | null,
): void {
  if (layoutEngine) {
    record.layoutEngine = layoutEngine;
    return;
  }
  delete record.layoutEngine;
}

function setFrameTreeJsonLayoutEngine<TFrameTreeJson>(
  frameTreeJson: TFrameTreeJson | null,
  layoutEngine: string | null,
): TFrameTreeJson | null {
  if (!isPreviewLayoutBridgeRecord(frameTreeJson)) {
    return frameTreeJson;
  }
  const nextFrameTreeJson = clonePreviewLayoutBridgeValue(frameTreeJson) as Record<string, unknown>;
  writePreviewLayoutEngine(nextFrameTreeJson, layoutEngine);
  return nextFrameTreeJson as TFrameTreeJson;
}

function setPreviewDocumentFrameTreeLayoutEngine<TPreviewDocumentJson>(
  previewDocumentJson: TPreviewDocumentJson | null,
  layoutEngine: string | null,
): TPreviewDocumentJson | null {
  if (!isPreviewLayoutBridgeRecord(previewDocumentJson)) {
    return previewDocumentJson;
  }
  const nextPreviewDocumentJson = clonePreviewLayoutBridgeValue(
    previewDocumentJson,
  ) as Record<string, unknown>;
  if (String(nextPreviewDocumentJson.kind || '') === 'frame-diagram') {
    writePreviewLayoutEngine(nextPreviewDocumentJson, layoutEngine);
    const frameTree = nextPreviewDocumentJson.frameTree;
    if (isPreviewLayoutBridgeRecord(frameTree)) {
      writePreviewLayoutEngine(frameTree, layoutEngine);
    }
  }
  return nextPreviewDocumentJson as TPreviewDocumentJson;
}

function frameTreeJsonFromPreviewDocument(
  previewDocumentJson: unknown,
): PreviewRenderIntentFrameTree | null {
  if (!isPreviewLayoutBridgeRecord(previewDocumentJson)) {
    return null;
  }
  if (String(previewDocumentJson.kind || '') === 'frame-diagram') {
    const frameTree = previewDocumentJson.frameTree;
    return isPreviewLayoutBridgeRecord(frameTree)
      ? frameTree as PreviewRenderIntentFrameTree
      : previewDocumentJson as PreviewRenderIntentFrameTree;
  }
  return previewDocumentJson as PreviewRenderIntentFrameTree;
}

function commitPreviewLayoutBridgeRenderIntent<
  TPreviewDocumentJson,
  TFrameTreeJson,
>(
  state: PreviewLayoutBridgeState<TPreviewDocumentJson, TFrameTreeJson>,
  options: {
    activeEngineId?: string | null;
    frameOverrides?: Record<string, unknown> | null;
    engineOverrides?: Record<string, unknown> | null;
    gridOverrides?: Record<string, unknown> | null;
  } = {},
): PreviewRenderIntent {
  const frameTreeJson = isPreviewLayoutBridgeRecord(state.frameTreeJson)
    ? state.frameTreeJson as PreviewRenderIntentFrameTree
    : frameTreeJsonFromPreviewDocument(state.previewDocumentJson);
  const intent = createPreviewRenderIntent({
    current: state.renderIntent,
    activeEngineId: options.activeEngineId,
    frameTreeJson,
    frameOverrides: options.frameOverrides ?? null,
    engineOverrides: options.engineOverrides ?? null,
    gridOverrides: options.gridOverrides ?? null,
  });
  state.renderIntent = intent;
  return intent;
}

function isPreviewElkRawViewEnabled(
  previewWindow: PreviewElkViewModeWindowLike,
): boolean {
  if (typeof previewWindow.__DG_previewEngineRawView === 'boolean') {
    return previewWindow.__DG_previewEngineRawView;
  }
  return previewWindow.__DG_elkRawView === true;
}

export function createPreviewElkViewModeRuntime(
  options: CreatePreviewElkViewModeRuntimeOptions,
): PreviewElkViewModeRuntime {
  const refreshViewMode = (): void => {
    const svg = options.getStageSvg();
    if (!svg) {
      return;
    }

    const elkSnapshot = options.getLastElkSnapshot();
    const elkFrameLabels = options.getLastElkFrameLabels();
    const rawViewEnabled = isPreviewElkRawViewEnabled(options.previewWindow);
    const styledLayer = svg.querySelector<SVGElement>('#dg-styled-layer');

    styledLayer?.setAttribute('display', rawViewEnabled ? 'none' : 'inline');
    svg.querySelector('#dg-elk-raw-view')?.remove();

    if (rawViewEnabled && elkSnapshot && options.renderPreviewElkRawView) {
      const rawView = options.renderPreviewElkRawView({
        ownerDocument: options.ownerDocument,
        snapshot: elkSnapshot,
        labelMap: elkFrameLabels || {},
        svgNs: options.svgNs,
        headLen: options.headLen,
        headHalf: options.headHalf,
      });
      if (rawView) {
        svg.appendChild(rawView);
      }
      return;
    }
  };

  return {
    initializeWindowState() {
      const rawViewEnabled = typeof options.previewWindow.__DG_previewEngineRawView === 'boolean'
        ? options.previewWindow.__DG_previewEngineRawView
        : options.previewWindow.__DG_elkRawView === true;
      options.previewWindow.__DG_previewEngineRawView = rawViewEnabled;
      options.previewWindow.__DG_elkRawView = rawViewEnabled;
    },
    refreshViewMode,
    setRawView(enabled) {
      const nextEnabled = Boolean(enabled);
      options.previewWindow.__DG_previewEngineRawView = nextEnabled;
      options.previewWindow.__DG_elkRawView = nextEnabled;
      refreshViewMode();
    },
  };
}

export function createPreviewElkViewModeRuntimeFromBrowserHost(
  options: CreatePreviewElkViewModeRuntimeFromBrowserHostOptions,
): PreviewElkViewModeRuntime {
  return createPreviewElkViewModeRuntime({
    previewWindow: options.previewWindow,
    getStageSvg: () => options.ownerDocument.querySelector('#stage svg'),
    ownerDocument: options.ownerDocument,
    getLastElkSnapshot: () => options.getLayoutBridgeRuntime().getLastElkSnapshot(),
    getLastElkFrameLabels: () => options.getLayoutBridgeRuntime().getLastElkFrameLabels(),
    renderPreviewElkRawView: options.renderPreviewElkRawView ?? null,
    svgNs: 'http://www.w3.org/2000/svg',
    headLen: options.previewWindowConfig?.headLen ?? 8,
    headHalf: options.previewWindowConfig?.headHalf ?? 4,
  });
}

function requirePreviewLayoutBridgeLegacyContract<TContract>(
  contract: TContract | null | undefined,
  message: string,
): TContract {
  if (!contract) {
    throw new Error(message);
  }
  return contract;
}

function readPreviewLayoutBridgeModelLayoutOverrides(
  model: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return readActiveLayoutOperatorOverrideBucket(model as {
    layoutOverrides?: Record<string, unknown>;
    layoutOperatorOverrides?: LayoutOperatorOverrideState | null;
  } | null | undefined);
}

function writePreviewLayoutBridgeModelLayoutOverrides(
  model: Record<string, unknown> | null | undefined,
  value: Record<string, unknown>,
  namespace?: string | null,
): void {
  if (!model || typeof model !== 'object') {
    return;
  }
  const modelLike = model as {
    layoutOverrides?: Record<string, unknown>;
    layoutOverrideNamespace?: string | null;
    layoutOperatorOverrides?: LayoutOperatorOverrideState | null;
  };
  writeActiveLayoutOperatorOverrides(modelLike, value, namespace);
}

function resolvePreviewLayoutBridgeManifest(
  diagram: {
    layoutEngine?: string | null;
  } | null | undefined,
  model: Record<string, unknown> | null | undefined,
): ReturnType<typeof resolvePreviewEngine> | null {
  const manifest = diagram?.layoutEngine
    ? resolvePreviewEngine({
      layoutEngine: diagram.layoutEngine,
      shellMode: 'grid',
    }) ?? null
    : null;
  if (manifest) {
    return manifest;
  }
  return resolveActiveLayoutOperatorManifest(model as {
    layoutOverrides?: Record<string, unknown>;
    layoutOverrideNamespace?: string | null;
    layoutOperatorOverrides?: LayoutOperatorOverrideState | null;
  } | null | undefined);
}

function resolvePreviewLayoutBridgeShellController(
  previewWindow: PreviewLayoutBridgeLegacyWindow,
): PreviewLayoutBridgeLegacyEngineShellController | null {
  const previewShellBootstrap = previewWindow.__DG_getPreviewShellBootstrapContract?.() ?? null;
  if (previewShellBootstrap && typeof previewShellBootstrap.getPreviewEngineShellController === 'function') {
    return previewShellBootstrap.getPreviewEngineShellController(previewWindow) ?? null;
  }
  return previewWindow.PreviewEngineShellController
    ?? previewWindow.ElkPreviewController
    ?? null;
}

function resolvePreviewLayoutBridgeLayoutControls(
  previewWindow: PreviewLayoutBridgeLegacyWindow,
): PreviewLayoutBridgeLegacyLayoutControls | null {
  return previewWindow.PreviewEngineLayoutControls
    ?? previewWindow.ElkLayoutControls
    ?? null;
}

export function createPreviewLayoutBridgeInstallRuntimeFromLegacyBrowserHost<
  TModel extends PreviewLayoutBridgeRemovalModel,
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
>(
  options: CreatePreviewLayoutBridgeInstallRuntimeFromLegacyBrowserHostOptions<
    TModel,
    TPreviewDocumentJson,
    TFrameTreeJson
  >,
): PreviewLayoutBridgeInstallRuntime<TModel, TPreviewDocumentJson, TFrameTreeJson> {
  const previewCore = requirePreviewLayoutBridgeLegacyContract(
    options.previewWindow.__DG_getPreviewCoreContract?.() as
      | PreviewLayoutBridgeCoreContract<TPreviewDocumentJson, TFrameTreeJson>
      | null
      | undefined,
    'layout-bridge: preview core contract is unavailable',
  );
  const previewBridgeRender = requirePreviewLayoutBridgeLegacyContract(
    options.previewWindow.__DG_getPreviewBridgeRenderContract?.() as
      | PreviewLayoutBridgeLegacyRenderContract
      | null
      | undefined,
    'layout-bridge: previewBridge.render contract is unavailable',
  );
  const previewBridgeBundleRender = requirePreviewLayoutBridgeLegacyContract(
    options.previewWindow.__DG_getPreviewBridgeBundleRenderContract?.() as
      | PreviewLayoutBridgeLegacyBundleRenderContract<TModel, TPreviewDocumentJson, TFrameTreeJson>
      | null
      | undefined,
    'layout-bridge: previewBridge.render bundle contract is unavailable',
  );
  const previewBridgeRelayout = requirePreviewLayoutBridgeLegacyContract(
    options.previewWindow.__DG_getPreviewBridgeRelayoutContract?.() as
      | PreviewLayoutBridgeRelayoutContract
      | null
      | undefined,
    'layout-bridge: previewBridge.relayout contract is unavailable',
  );
  const previewElkEngine = requirePreviewLayoutBridgeLegacyContract(
    options.previewWindow.__DG_getPreviewElkEngineContract?.() as
      | PreviewLayoutBridgeLegacyElkEngineContract
      | null
      | undefined,
    'layout-bridge: previewEngines.elk contract is unavailable',
  );

  const state = createPreviewLayoutBridgeState<TPreviewDocumentJson, TFrameTreeJson>();
  const slug = options.slug ?? options.previewWindow.__DG_CONFIG?.slug ?? '';

  const runtime = createPreviewLayoutBridgeRuntimeFromBrowserHost<TModel, TPreviewDocumentJson, TFrameTreeJson>({
    state,
    slug,
    ownerDocument: options.ownerDocument,
    previewWindow: options.previewWindow,
    previewCore,
    previewBridgeRender,
    previewBridgeBundleRender,
    previewBridgeRelayout,
    previewBridgeHost: {
      updatePreviewComponentModelFromLayout: (model, frame) => updatePreviewComponentModelFromLayout(
        model as TModel & PreviewLayoutBridgeModelTreeLoader,
        frame,
      ),
    },
    resolvePreviewEngineManifest: (json) => {
      const layoutEngine = resolvePreviewRenderIntentLayoutEngine({
        intent: state.renderIntent,
        frameTreeJson: json as PreviewRenderIntentFrameTree | null | undefined,
        layoutEngine: (json as { layoutEngine?: string | null } | null | undefined)?.layoutEngine ?? null,
      });
      return resolvePreviewEngine({ layoutEngine, shellMode: 'grid' }) || null;
    },
    createTextAdapter: async () => {
      const harfbuzzModuleUrl = '/preview/layout-engine-harfbuzz.js';
      const hbModule = await import(harfbuzzModuleUrl);
      return hbModule.createDefaultHarfBuzzTextAdapter({
        fontUrl: '/preview/layout-font.ttf',
      });
    },
    getTextAdapterBackend: (textAdapter) => (
      textAdapter && typeof textAdapter.measurementBackend === 'string'
        ? textAdapter.measurementBackend
        : null
    ),
    isAuthoritativeTextAdapter: (textAdapter) => (
      textAdapter && typeof textAdapter.measurementBackend === 'string'
        ? textAdapter.measurementBackend === 'harfbuzz'
        : false
    ),
    resolveEngineLayoutOptionOverrides: (diagram, model) => {
      const modelLike = model as {
        layoutOverrides?: Record<string, string>;
        layoutOverrideNamespace?: string | null;
        layoutOperatorOverrides?: LayoutOperatorOverrideState | null;
      } | null;
      const manifest = resolvePreviewLayoutBridgeManifest(diagram, modelLike);
      const fromYamlState = readFrameYamlEngineLayoutOverridesForLayoutEngine({
        layoutEngine: diagram?.layoutEngine ?? null,
        elkLayout: diagram?.elkLayout as Record<string, unknown> | null | undefined,
        engineLayout: diagram?.engineLayout as Record<string, Record<string, unknown>> | null | undefined,
      });
      let session = manifest
        ? readLayoutOperatorOverrideBucketForManifest(modelLike as never, manifest) as Record<string, string>
        : readPreviewLayoutBridgeModelLayoutOverrides(modelLike) as Record<string, string>;
      const controller = resolvePreviewLayoutBridgeShellController(options.previewWindow);
      if (controller && typeof controller.getLayoutOverrides === 'function') {
        session = {
          ...session,
          ...((controller.getLayoutOverrides() || {}) as Record<string, string>),
        };
        if (manifest) {
          writeLayoutOperatorOverrideBucketForManifest(
            modelLike as never,
            manifest,
            session,
            fromYamlState?.namespace ?? modelLike?.layoutOverrideNamespace ?? null,
          );
        }
      }
      if (Object.keys(session).length === 0) {
        const layoutControls = resolvePreviewLayoutBridgeLayoutControls(options.previewWindow);
        if (layoutControls && typeof layoutControls.collectOverrides === 'function') {
          session = (layoutControls.collectOverrides() || {}) as Record<string, string>;
          if (manifest) {
            writeLayoutOperatorOverrideBucketForManifest(
              modelLike as never,
              manifest,
              session,
              fromYamlState?.namespace ?? modelLike?.layoutOverrideNamespace ?? null,
            );
          } else {
            writePreviewLayoutBridgeModelLayoutOverrides(
              modelLike,
              session,
              fromYamlState?.namespace ?? null,
            );
          }
        }
      }
      if (manifest) {
        activateLayoutOperatorOverrideBucket(modelLike as never, manifest, {
          fallbackOverrides: fromYamlState?.overrides ?? {},
          persistNamespace: fromYamlState?.namespace ?? modelLike?.layoutOverrideNamespace ?? null,
        });
        return resolveEffectiveLayoutOperatorOverrides({
          manifest,
          engineLayout: diagram?.engineLayout as Record<string, Record<string, unknown>> | null | undefined,
          elkLayout: diagram?.elkLayout as Record<string, unknown> | null | undefined,
          sessionOverrides: session,
          persistNamespace: fromYamlState?.namespace ?? modelLike?.layoutOverrideNamespace ?? null,
        }) as Record<string, string>;
      }
      const fromYaml = (
        fromYamlState?.overrides
        ?? diagram?.elkLayout
        ?? {}
      ) as Record<string, string>;
      return { ...fromYaml, ...session };
    },
    refreshElkViewMode: () => {
      elkViewModeRuntime.refreshViewMode();
    },
    refreshLayoutControls: () => {
      resolvePreviewLayoutBridgeLayoutControls(options.previewWindow)?.refresh?.();
    },
    warn: (message, error) => console.warn(message, error),
    error: (message, error) => console.error(message, error),
  });

  const elkViewModeRuntime = createPreviewElkViewModeRuntimeFromBrowserHost({
    previewWindow: options.previewWindow,
    ownerDocument: options.ownerDocument,
    previewWindowConfig: {
      headLen: 8,
      headHalf: 4,
    },
    getLayoutBridgeRuntime: () => runtime,
    renderPreviewElkRawView: previewElkEngine.renderPreviewElkRawView,
  });
  elkViewModeRuntime.initializeWindowState();

  const renderFrameTreeToSvg: PreviewLayoutBridgeInstallRuntime<
    TModel,
    TPreviewDocumentJson,
    TFrameTreeJson
  >['renderFrameTreeToSvg'] = (diagram, result, renderOptions = null) => {
    if (typeof previewBridgeBundleRender.renderPreviewFrameTreeToSvg !== 'function') {
      throw new Error('layout-bridge: previewBridge.render.renderPreviewFrameTreeToSvg is unavailable');
    }
    return previewBridgeBundleRender.renderPreviewFrameTreeToSvg({
      ownerDocument: options.ownerDocument,
      diagram,
      result,
      textAdapter: runtime.getTextAdapter(),
      iconElements: renderOptions?.iconElements,
      overlays: renderOptions?.overlays,
    });
  };

  const renderFreshSvg: PreviewLayoutBridgeInstallRuntime<
    TModel,
    TPreviewDocumentJson,
    TFrameTreeJson
  >['renderFreshSvg'] = (overrides, gridOverrides, model, relayoutOptions = null) => (
    runtime.renderFreshSvg(
      overrides || {},
      gridOverrides || null,
      model,
      relayoutOptions,
    )
  );

  const arrowComponentId = (arrow: Arrow): string => {
    if (typeof previewBridgeRender.previewArrowComponentId !== 'function') {
      throw new Error('layout-bridge: previewBridge.render.previewArrowComponentId is unavailable');
    }
    return previewBridgeRender.previewArrowComponentId(arrow);
  };

  const syncArrowsInModel = (
    model: TModel,
    arrows: Arrow[] | null | undefined,
    routedArrows: PreviewRoutedArrow[] | null | undefined,
  ): void => {
    previewBridgeRender.syncPreviewArrowsInModel(
      model,
      Array.isArray(arrows) ? arrows : [],
      Array.isArray(routedArrows) ? routedArrows : [],
    );
  };

  const createArrowsSvg = (
    routedArrows: PreviewRoutedArrow[] | null | undefined,
    boundsMap: Record<string, PreviewLayoutBridgeOldBoundsEntry> | null | undefined,
  ): DocumentFragment => {
    if (typeof previewBridgeRender.createPreviewArrowSvgFragment === 'function') {
      return previewBridgeRender.createPreviewArrowSvgFragment({
        ownerDocument: options.ownerDocument,
        routedArrows: Array.isArray(routedArrows) ? routedArrows : [],
        boundsMap: boundsMap || {},
        headLen: options.previewWindow.__DG_CONFIG?.head_len,
        headHalf: options.previewWindow.__DG_CONFIG?.head_half,
      });
    }
    return options.ownerDocument.createDocumentFragment();
  };

  const refreshElkViewMode = (): void => {
    elkViewModeRuntime.refreshViewMode();
  };

  const compatHostRuntime = {
    initLayoutBridge: (nextSlug: string) => runtime.init(nextSlug),
    isLocalRelayoutReady: () => runtime.isLocalRelayoutReady(),
    getLocalRelayoutStatus: () => runtime.getLocalRelayoutStatus(),
    getPreviewDocumentJson: () => runtime.getPreviewDocumentJson(),
    getFrameTreeJson: () => runtime.getFrameTreeJson(),
    setFrameTreeJson: (json: TFrameTreeJson | null) => runtime.setFrameTreeJson(json),
    setFrameTreeLayoutEngine: (layoutEngine: string | null | undefined) => {
      const committed = runtime.setFrameTreeLayoutEngine(layoutEngine);
      commitPreviewRenderIntentToWindow(options.previewWindow, {
        current: runtime.state.renderIntent,
        activeEngineId: committed,
        frameTreeJson: runtime.state.frameTreeJson as PreviewRenderIntentFrameTree | null,
      });
      return committed;
    },
    applyFrameTreeRemovals: (frameIds: string[]) => runtime.applyFrameTreeRemovals(frameIds),
    applyFrameTreeRemovalsToJson: (
      treeJson: Record<string, unknown> | null | undefined,
      frameIds: string[] | null | undefined,
    ) => applyFrameTreeRemovalsToPreviewTreeJson(treeJson, frameIds),
    applySessionRemovalsToDiagramJson: (
      diagramJson: Record<string, unknown> | null | undefined,
      model: TModel | null | undefined,
    ) => applyPreviewSessionRemovalsToDiagramJson(diagramJson, model),
    performLocalRelayout: (
      model: TModel,
      overrides: Record<string, PreviewRelayoutOverrideEntry>,
      gridOverrides: Record<string, unknown>,
      opts?: PreviewLayoutBridgeRelayoutExecutionOptions | null,
    ) => runtime.performLocalRelayout(model, overrides || {}, gridOverrides || {}, opts || null),
    performElkRelayout: (
      model: TModel,
      overrides: Record<string, PreviewRelayoutOverrideEntry>,
      gridOverrides: Record<string, unknown>,
      opts?: PreviewLayoutBridgeRelayoutExecutionOptions | null,
    ) => runtime.performElkRelayout(model, overrides || {}, gridOverrides || {}, opts || null),
    performEngineRelayout: (
      model: TModel,
      overrides: Record<string, PreviewRelayoutOverrideEntry>,
      gridOverrides: Record<string, unknown>,
      opts?: PreviewLayoutBridgeRelayoutExecutionOptions | null,
    ) => runtime.performEngineRelayout(model, overrides || {}, gridOverrides || {}, opts || null),
    renderFreshSvg: (
      overrides: Record<string, PreviewRelayoutOverrideEntry>,
      gridOverrides: Record<string, unknown> | null,
      model: TModel,
      opts?: PreviewLayoutBridgeRelayoutExecutionOptions | null,
    ) => renderFreshSvg(overrides, gridOverrides, model, opts || null),
    getTextAdapter: () => runtime.getTextAdapter(),
  };

  const compatRenderHost = {
    renderPreviewFrameTreeToSvg: (renderOptions: {
      diagram: FrameDiagram;
      result: PreviewLayoutBridgeRelayoutResult;
      iconElements?: unknown;
      overlays?: unknown;
    }) => renderFrameTreeToSvg(
      renderOptions?.diagram,
      renderOptions?.result,
      renderOptions,
    ),
    renderFreshPreviewSvg: (renderOptions: {
      overrides: Record<string, PreviewRelayoutOverrideEntry>;
      gridOverrides: Record<string, unknown> | null;
      model: TModel;
    }) => renderFreshSvg(
      renderOptions?.overrides,
      renderOptions?.gridOverrides,
      renderOptions?.model,
      null,
    ),
  };

  const installCompatWindowBindings = (): void => {
    const previewWindowRecord = options.previewWindow as unknown as Record<string, unknown>;
    previewWindowRecord.__DG_setElkRawView = (enabled: boolean) => {
      elkViewModeRuntime.setRawView(Boolean(enabled));
    };
    previewWindowRecord.__DG_setPreviewEngineRawView = (enabled: boolean) => {
      elkViewModeRuntime.setRawView(Boolean(enabled));
    };
    previewWindowRecord.isLocalRelayoutReady = () => runtime.isLocalRelayoutReady();
    previewWindowRecord.getLocalRelayoutStatus = () => runtime.getLocalRelayoutStatus();
    previewWindowRecord.__DG_TEST_setLocalRelayoutMode = (mode: string | null | undefined) => (
      runtime.setLocalRelayoutOverrideMode(mode)
    );
    previewWindowRecord.__DG_previewBridgeHostRuntime = compatHostRuntime;
    previewWindowRecord.__DG_previewBridgeRenderHost = compatRenderHost;
    previewWindowRecord.renderFrameTreeToSvg = renderFrameTreeToSvg;
    previewWindowRecord.refreshElkViewMode = refreshElkViewMode;
    previewWindowRecord.renderFreshSvg = renderFreshSvg;
    previewWindowRecord.arrowComponentId = arrowComponentId;
    previewWindowRecord.syncArrowsInModel = syncArrowsInModel;
    previewWindowRecord.getLayoutTextAdapter = () => runtime.getTextAdapter();
    previewWindowRecord.getPreviewDocumentJson = () => runtime.getPreviewDocumentJson();
    previewWindowRecord.getFrameTreeJson = () => runtime.getFrameTreeJson();
    previewWindowRecord.setFrameTreeJson = (json: TFrameTreeJson | null) => {
      runtime.setFrameTreeJson(json);
      commitPreviewRenderIntentToWindow(options.previewWindow, {
        current: runtime.state.renderIntent,
        frameTreeJson: runtime.state.frameTreeJson as PreviewRenderIntentFrameTree | null,
      });
    };
    previewWindowRecord.setFrameTreeLayoutEngine = (
      layoutEngine: string | null | undefined,
    ) => {
      const committed = runtime.setFrameTreeLayoutEngine(layoutEngine);
      commitPreviewRenderIntentToWindow(options.previewWindow, {
        current: runtime.state.renderIntent,
        activeEngineId: committed,
        frameTreeJson: runtime.state.frameTreeJson as PreviewRenderIntentFrameTree | null,
      });
      return committed;
    };
    previewWindowRecord.applyFrameTreeRemovals = (frameIds: string[]) => runtime.applyFrameTreeRemovals(frameIds);
    previewWindowRecord.applyFrameTreeRemovalsToJson = (
      treeJson: Record<string, unknown> | null | undefined,
      frameIds: string[] | null | undefined,
    ) => applyFrameTreeRemovalsToPreviewTreeJson(treeJson, frameIds);
    previewWindowRecord.applySessionRemovalsToDiagramJson = (
      diagramJson: Record<string, unknown> | null | undefined,
      model: TModel | null | undefined,
    ) => applyPreviewSessionRemovalsToDiagramJson(diagramJson, model);
  };

  return {
    getRuntime: () => runtime,
    getElkViewModeRuntime: () => elkViewModeRuntime,
    getPreviewBridgeBundleRenderContract: () => previewBridgeBundleRender,
    getPreviewElkEngineContract: () => previewElkEngine,
    textAdapterBackend: () => {
      const textAdapter = runtime.getTextAdapter();
      return textAdapter && typeof textAdapter.measurementBackend === 'string'
        ? textAdapter.measurementBackend
        : null;
    },
    setLocalRelayoutOverrideMode: (mode) => runtime.setLocalRelayoutOverrideMode(mode),
    getLocalRelayoutStatus: () => runtime.getLocalRelayoutStatus(),
    isLocalRelayoutReady: () => runtime.isLocalRelayoutReady(),
    getFrameTreeJson: () => runtime.getFrameTreeJson(),
    getPreviewDocumentJson: () => runtime.getPreviewDocumentJson(),
    setFrameTreeJson: (json) => {
      runtime.setFrameTreeJson(json);
      commitPreviewRenderIntentToWindow(options.previewWindow, {
        current: runtime.state.renderIntent,
        frameTreeJson: runtime.state.frameTreeJson as PreviewRenderIntentFrameTree | null,
      });
    },
    setFrameTreeLayoutEngine: (layoutEngine) => {
      const committed = runtime.setFrameTreeLayoutEngine(layoutEngine);
      commitPreviewRenderIntentToWindow(options.previewWindow, {
        current: runtime.state.renderIntent,
        activeEngineId: committed,
        frameTreeJson: runtime.state.frameTreeJson as PreviewRenderIntentFrameTree | null,
      });
      return committed;
    },
    applyFrameTreeRemovalsToJson: (treeJson, frameIds) => (
      applyFrameTreeRemovalsToPreviewTreeJson(treeJson, frameIds)
    ),
    applyFrameTreeRemovals: (frameIds) => runtime.applyFrameTreeRemovals(frameIds),
    applySessionRemovalsToDiagramJson: (diagramJson, model) => (
      applyPreviewSessionRemovalsToDiagramJson(diagramJson, model)
    ),
    initLayoutBridge: (nextSlug) => runtime.init(nextSlug),
    performLocalRelayout: (model, overrides, gridOverrides, relayoutOptions = null) => (
      runtime.performLocalRelayout(model, overrides || {}, gridOverrides || {}, relayoutOptions)
    ),
    performEngineRelayout: (model, overrides, gridOverrides, relayoutOptions = null) => (
      runtime.performEngineRelayout(model, overrides || {}, gridOverrides || {}, relayoutOptions)
    ),
    performElkRelayout: (model, overrides, gridOverrides, relayoutOptions = null) => (
      runtime.performElkRelayout(model, overrides || {}, gridOverrides || {}, relayoutOptions)
    ),
    renderFreshSvg,
    renderFrameTreeToSvg,
    createArrowsSvg,
    arrowComponentId,
    syncArrowsInModel,
    refreshElkViewMode,
    installCompatWindowBindings,
  };
}

export function normalizePreviewLayoutBridgeLocalRelayoutOverrideMode(
  mode: string | null | undefined,
): PreviewLocalRelayoutOverrideMode {
  return mode === 'unready' ? 'unready' : 'auto';
}

export function createPreviewLayoutBridgeState<
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
>(): PreviewLayoutBridgeState<TPreviewDocumentJson, TFrameTreeJson> {
  return {
    previewDocumentJson: null,
    frameTreeJson: null,
    lastElkSnapshot: null,
    lastElkFrameLabels: null,
    renderIntent: null,
    textAdapter: null,
    textAdapterError: null,
    localRelayoutOverrideMode: 'auto',
  };
}

export function resolvePreviewLayoutBridgeLocalRelayoutStatus(
  state: PreviewLayoutBridgeState<unknown, unknown>,
  getTextAdapterBackend: (textAdapter: TextMeasureAdapter | null) => string | null,
): PreviewLocalRelayoutStatus {
  const overrideMode = normalizePreviewLayoutBridgeLocalRelayoutOverrideMode(
    state.localRelayoutOverrideMode,
  );
  const frameTreeLoaded = Boolean(state.frameTreeJson || state.previewDocumentJson);
  const textAdapterReady = Boolean(state.textAdapter);
  const textAdapterBackend = getTextAdapterBackend(state.textAdapter);
  const textAdapterError = state.textAdapterError;

  if (overrideMode === 'unready') {
    return {
      ready: false,
      reason: 'forced-unready',
      overrideMode,
      frameTreeLoaded,
      textAdapterReady,
      textAdapterBackend,
      textAdapterError,
    };
  }

  if (!frameTreeLoaded) {
    return {
      ready: false,
      reason: 'missing-frame-tree',
      overrideMode,
      frameTreeLoaded,
      textAdapterReady,
      textAdapterBackend,
      textAdapterError,
    };
  }

  if (textAdapterError) {
    return {
      ready: false,
      reason: 'text-adapter-init-failed',
      overrideMode,
      frameTreeLoaded,
      textAdapterReady,
      textAdapterBackend,
      textAdapterError,
    };
  }

  if (!textAdapterReady) {
    return {
      ready: false,
      reason: 'missing-text-adapter',
      overrideMode,
      frameTreeLoaded,
      textAdapterReady,
      textAdapterBackend,
      textAdapterError,
    };
  }

  if (textAdapterBackend !== 'harfbuzz') {
    return {
      ready: false,
      reason: 'non-harfbuzz-text-adapter',
      overrideMode,
      frameTreeLoaded,
      textAdapterReady,
      textAdapterBackend,
      textAdapterError,
    };
  }

  return {
    ready: true,
    reason: 'ready',
    overrideMode,
    frameTreeLoaded,
    textAdapterReady,
    textAdapterBackend,
    textAdapterError,
  };
}

export function applyFrameTreeRemovalsToPreviewTreeJson(
  treeJson: Record<string, unknown> | null | undefined,
  frameIds: string[] | null | undefined,
): string[] {
  const root = treeJson?.root as PreviewLayoutBridgeTreeNode | undefined;
  if (!root || !frameIds || frameIds.length === 0) {
    return [];
  }

  const rootId = typeof root.id === 'string' ? root.id : null;
  const requested = [...new Set(frameIds.filter((id) => Boolean(id) && id !== rootId))];
  if (requested.length === 0) {
    return [];
  }

  const removed = new Set<string>();

  const collectDescendants = (node: PreviewLayoutBridgeTreeNode | null | undefined): void => {
    if (!node) {
      return;
    }
    if (node.id) {
      removed.add(node.id);
    }
    for (const child of node.children || []) {
      collectDescendants(child);
    }
  };

  const findNode = (
    node: PreviewLayoutBridgeTreeNode | null | undefined,
    id: string,
  ): PreviewLayoutBridgeTreeNode | null => {
    if (!node) {
      return null;
    }
    if (node.id === id) {
      return node;
    }
    for (const child of node.children || []) {
      const hit = findNode(child, id);
      if (hit) {
        return hit;
      }
    }
    return null;
  };

  const pruneChildren = (
    children: PreviewLayoutBridgeTreeNode[] | null | undefined,
  ): PreviewLayoutBridgeTreeNode[] => {
    if (!Array.isArray(children)) {
      return [];
    }
    const next: PreviewLayoutBridgeTreeNode[] = [];
    for (const child of children) {
      if (!child || typeof child !== 'object') {
        continue;
      }
      if (child.id && requested.includes(child.id)) {
        collectDescendants(child);
        continue;
      }
      child.children = pruneChildren(child.children);
      next.push(child);
    }
    return next;
  };

  for (const id of requested) {
    const node = findNode(root, id);
    if (node) {
      collectDescendants(node);
    }
  }

  root.children = pruneChildren(root.children);

  const arrows = Array.isArray(treeJson?.arrows)
    ? (treeJson?.arrows as Array<{ source?: string; target?: string }>)
    : null;
  if (arrows) {
    (treeJson as { arrows: Array<{ source?: string; target?: string }> }).arrows = arrows.filter(
      (arrow) => arrow && !removed.has(String(arrow.source || '')) && !removed.has(String(arrow.target || '')),
    );
  }

  return [...removed];
}

export function applyPreviewSessionRemovalsToDiagramJson<TModel extends PreviewLayoutBridgeRemovalModel>(
  diagramJson: Record<string, unknown> | null | undefined,
  model: TModel | null | undefined,
): void {
  if (!diagramJson || !model?.removedIds || model.removedIds.size === 0) {
    return;
  }
  const topLevelIds = typeof model.topLevelRemovalIds === 'function'
    ? model.topLevelRemovalIds()
    : [...model.removedIds];
  applyFrameTreeRemovalsToPreviewTreeJson(diagramJson, topLevelIds);
}

function headingTextForPreviewFrame(frame: PreviewLayoutBridgeTreeNode): string {
  if (frame.heading?.content) {
    return frame.heading.content;
  }
  const headingChild = frame.children.find(
    (child) => child.role === 'heading' || Boolean(child.id && child.id.endsWith('__heading')),
  );
  return headingChild?.label?.[0]?.content || '';
}

function resolvePreviewAuthoredLayoutFrame(frame: PreviewLayoutBridgeTreeNode): {
  layoutChildren: PreviewLayoutBridgeTreeNode[];
  layoutGap: number;
  layoutDirection: string | null;
  layoutHeaderGap?: number | null;
} {
  if (!frame.children || frame.children.length === 0) {
    return {
      layoutChildren: [],
      layoutGap: 0,
      layoutDirection: frame.direction || null,
    };
  }

  const body = frame.children.find(
    (child) => child.id === '__body' || Boolean(child.id && child.id.endsWith('__body')),
  );
  const hasHeading = frame.children.some(
    (child) => child.role === 'heading' || Boolean(child.id && child.id.endsWith('__heading')),
  );
  if (body && hasHeading) {
    return {
      layoutChildren: body.children || [],
      layoutGap: body.gap || 0,
      layoutDirection: body.direction || null,
      layoutHeaderGap: frame.gap || 0,
    };
  }
  return {
    layoutChildren: frame.children.filter(
      (child) => !(child.id && child.id.endsWith('__body'))
        && !(child.id && child.id.endsWith('__heading'))
        && child.role !== 'heading',
    ),
    layoutGap: frame.gap || 0,
    layoutDirection: frame.direction || null,
    layoutHeaderGap: frame.gap || 0,
  };
}

export function updatePreviewComponentModelFromLayout<
  TModel extends PreviewLayoutBridgeModelTreeLoader,
>(
  model: TModel,
  frame: PreviewLayoutBridgeTreeNode,
): void {
  const frameToTreeData = (node: PreviewLayoutBridgeTreeNode): Record<string, unknown> | null => {
    if (!node.id || node.id.startsWith('__')) {
      return null;
    }
    const layout = node._layout;
    const { layoutChildren, layoutGap, layoutDirection, layoutHeaderGap } =
      resolvePreviewAuthoredLayoutFrame(node);
    const children = layoutChildren
      .map((child) => frameToTreeData(child))
      .filter((child): child is Record<string, unknown> => Boolean(child));
    const hasLayout = layoutChildren.length > 0;
    return {
      id: node.id,
      type: hasLayout || node.children.length > 0 ? 'panel' : 'box',
      x: layout.placedX,
      y: layout.placedY,
      width: layout.placedW,
      height: layout.placedH,
      children,
      layout: hasLayout
        ? (layoutDirection === 'VERTICAL' ? 'vertical' : 'horizontal')
        : '',
      layout_gap: hasLayout ? layoutGap : 0,
      layout_col_gap: hasLayout ? layoutGap : 0,
      layout_row_gap: hasLayout ? layoutGap : 0,
      layout_header_gap: hasLayout ? layoutHeaderGap || 0 : 0,
      gap_delta: node.gapDelta ?? undefined,
      pad: node.border !== 'NONE' ? node.paddingTop || 0 : 0,
      sizing_w: node.sizingW || null,
      sizing_h: node.sizingH || null,
      fill_weight: node.fillWeight ?? null,
      position: node.positionType ?? null,
      authored_x: node.x ?? null,
      authored_y: node.y ?? null,
      min_width: node.minWidth ?? null,
      max_width: node.maxWidth ?? null,
      max_width_chars: node.maxWidthChars ?? null,
      min_height: node.minHeight ?? null,
      max_height: node.maxHeight ?? null,
      align: node.align ?? null,
      padding_top: node.paddingTop ?? null,
      padding_right: node.paddingRight ?? null,
      padding_bottom: node.paddingBottom ?? null,
      padding_left: node.paddingLeft ?? null,
      level: node.level ?? null,
      fill: node.fill ?? null,
      border: node.border ?? null,
      heading_text: headingTextForPreviewFrame(node),
      label_text: Array.isArray(node.label)
        ? node.label.map((line) => line.content || '')
        : [],
    };
  };

  const rootData = frameToTreeData(frame);
  if (!rootData) {
    return;
  }

  if (frame.id && !frame.id.startsWith('__')) {
    model.loadTree([rootData]);
    return;
  }

  model.loadTree((rootData.children as unknown[]) || []);
}

function previewLayoutOptionsFromDiagram(
  diagram: FrameDiagram,
): {
  gridCols: FrameDiagram['gridCols'];
  gridColGap: FrameDiagram['gridColGap'];
  gridOuterMargin: FrameDiagram['gridOuterMargin'];
  arrows: FrameDiagram['arrows'];
} {
  return {
    gridCols: diagram.gridCols,
    gridColGap: diagram.gridColGap,
    gridOuterMargin: diagram.gridOuterMargin,
    arrows: diagram.arrows,
  };
}

export function createPreviewLayoutBridgeRuntimeFromBrowserHost<
  TModel extends PreviewLayoutBridgeRemovalModel,
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
>(
  options: CreatePreviewLayoutBridgeRuntimeFromBrowserHostOptions<
    TModel,
    TPreviewDocumentJson,
    TFrameTreeJson
  >,
): PreviewLayoutBridgeRuntime<TModel, TPreviewDocumentJson, TFrameTreeJson> {
  const runtime = createPreviewLayoutBridgeRuntime({
    state: options.state,
    fetchPreviewDocument: options.fetchPreviewDocument ?? (async (slug) => {
      const response = await fetch(`/api/preview-document/${slug}?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        return null;
      }
      return response.json();
    }),
    extractFrameTreeFromPreviewDocument: (previewDocumentJson) => (
      previewDocumentJson
      && typeof previewDocumentJson === 'object'
      && 'kind' in previewDocumentJson
      && previewDocumentJson.kind === 'frame-diagram'
        ? ((previewDocumentJson as { frameTree?: TFrameTreeJson | null }).frameTree || null)
        : null
    ),
    createTextAdapter: options.createTextAdapter,
    getTextAdapterBackend: options.getTextAdapterBackend,
    isAuthoritativeTextAdapter: options.isAuthoritativeTextAdapter,
    isEngineLayoutDiagramJson: (json) => Boolean(
      options.resolvePreviewEngineManifest(json)?.capabilities?.serverRelayout,
    ),
    deserializeFrameDiagram: (json) => options.previewCore.deserializeFrameDiagramWire(json),
    collectRelayoutFrameOverrides: (overrides) =>
      options.previewBridgeRelayout.collectPreviewRelayoutFrameOverrides(overrides || {}),
    applyOverridesToFrameTree: (diagram, allOverrides, gridOverrides) => {
      options.previewBridgeRelayout.applyPreviewOverridesToFrameTree(
        diagram,
        allOverrides || {},
        gridOverrides || {},
      );
    },
    layoutLocalDiagram: (diagram, textAdapter) => {
      options.previewCore.resolveStyles(diagram.root);
      return options.previewCore.layoutFrameTree(
        diagram.root,
        textAdapter,
        previewLayoutOptionsFromDiagram(diagram),
      );
    },
    collectPlacedBounds: (root) => options.previewBridgeRender.collectPreviewPlacedBounds(root, {}),
    collectFramesById: (root) => options.previewBridgeRender.collectPreviewFramesById(root, {}),
    queryStageSvg: () => options.ownerDocument.querySelector('#stage svg'),
    patchSvgFromLayout: (layoutOptions) => {
      options.previewBridgeRender.patchPreviewSvgFromLayout({
        svg: layoutOptions.svg,
        oldBounds: layoutOptions.oldBounds || {},
        newBounds: layoutOptions.newBounds || {},
        framesById: layoutOptions.framesById || {},
        textAdapter: runtime.getTextAdapter(),
      });
    },
    routeArrows: (arrows, boundsMap) => options.previewBridgeRender.routePreviewArrows(
      Array.isArray(arrows) ? arrows : [],
      boundsMap || {},
    ),
    patchArrowsSvg: (layoutOptions) => {
      options.previewBridgeRender.patchPreviewArrowSvg({
        svg: layoutOptions.svg,
        routedArrows: Array.isArray(layoutOptions.routedArrows) ? layoutOptions.routedArrows : [],
        boundsMap: layoutOptions.boundsMap || {},
        headLen: options.previewWindow.__DG_CONFIG?.head_len,
        headHalf: options.previewWindow.__DG_CONFIG?.head_half,
      });
    },
    updateModelFromLayout: (model, root) => options.previewBridgeHost.updatePreviewComponentModelFromLayout(
      model,
      root,
    ),
    syncArrowsInModel: (model, arrows, routedArrows) => {
      options.previewBridgeRender.syncPreviewArrowsInModel(
        model,
        Array.isArray(arrows) ? arrows : [],
        Array.isArray(routedArrows) ? routedArrows : [],
      );
    },
    renderFreshPreviewSvg: options.previewBridgeBundleRender.renderFreshPreviewSvg,
    ownerDocument: options.ownerDocument,
    getStageContainer: () => options.ownerDocument.getElementById('stage'),
    fitRenderedSvg: (svg, fitOptions) => options.previewBridgeRender.fitPreviewSvgToRenderedContent({
      svg,
      minWidth: fitOptions.minWidth,
      minHeight: fitOptions.minHeight,
    }),
    resolveEngineLayoutOptionOverrides: options.resolveEngineLayoutOptionOverrides ?? ((diagram, model) => {
      const modelLike = model as {
        layoutOverrides?: Record<string, string>;
        layoutOverrideNamespace?: string | null;
        layoutOperatorOverrides?: LayoutOperatorOverrideState | null;
      } | null;
      const manifest = resolvePreviewLayoutBridgeManifest(diagram, modelLike);
      const fromYamlState = readFrameYamlEngineLayoutOverridesForLayoutEngine({
        layoutEngine: diagram?.layoutEngine ?? null,
        elkLayout: diagram?.elkLayout as Record<string, unknown> | null | undefined,
        engineLayout: diagram?.engineLayout as Record<string, Record<string, unknown>> | null | undefined,
      });
      if (manifest) {
        const session = readLayoutOperatorOverrideBucketForManifest(modelLike as never, manifest);
        return resolveEffectiveLayoutOperatorOverrides({
          manifest,
          engineLayout: diagram?.engineLayout as Record<string, Record<string, unknown>> | null | undefined,
          elkLayout: diagram?.elkLayout as Record<string, unknown> | null | undefined,
          sessionOverrides: session,
          persistNamespace: fromYamlState?.namespace ?? modelLike?.layoutOverrideNamespace ?? null,
        }) as Record<string, string>;
      }
      const fromYaml = (
        fromYamlState?.overrides
        ?? diagram?.elkLayout
        ?? {}
      ) as Record<string, string>;
      const session = modelLike?.layoutOverrides || {};
      return {
        ...fromYaml,
        ...session,
      };
    }),
    refreshElkViewMode: options.refreshElkViewMode,
    refreshLayoutControls: options.refreshLayoutControls,
    warn: options.warn,
    error: options.error,
  });

  const publishRenderIntentToWindow = (): PreviewRenderIntent => (
    commitPreviewRenderIntentToWindow(options.previewWindow as PreviewRenderIntentWindowLike, {
      current: runtime.state.renderIntent,
      frameTreeJson: runtime.state.frameTreeJson as PreviewRenderIntentFrameTree | null,
    })
  );

  return {
    ...runtime,
    async init(slug) {
      await runtime.init(slug);
      publishRenderIntentToWindow();
    },
    setFrameTreeJson(json) {
      runtime.setFrameTreeJson(json);
      publishRenderIntentToWindow();
    },
    setFrameTreeLayoutEngine(layoutEngine) {
      const committed = runtime.setFrameTreeLayoutEngine(layoutEngine);
      publishRenderIntentToWindow();
      return committed;
    },
    performLocalRelayout(model, overrides, gridOverrides, opts = null) {
      const result = runtime.performLocalRelayout(model, overrides, gridOverrides, opts);
      publishRenderIntentToWindow();
      return result;
    },
    async renderFreshSvg(overrides, gridOverrides, model, renderOptions = null) {
      const result = await runtime.renderFreshSvg(overrides, gridOverrides, model, renderOptions);
      publishRenderIntentToWindow();
      return result;
    },
    async performEngineRelayout(model, overrides, gridOverrides, relayoutOptions = null) {
      const result = await runtime.performEngineRelayout(model, overrides, gridOverrides, relayoutOptions);
      publishRenderIntentToWindow();
      return result;
    },
    async performElkRelayout(model, overrides, gridOverrides, relayoutOptions = null) {
      const result = await runtime.performElkRelayout(model, overrides, gridOverrides, relayoutOptions);
      publishRenderIntentToWindow();
      return result;
    },
  };
}

export function createPreviewLayoutBridgeRuntime<
  TModel extends PreviewLayoutBridgeRemovalModel,
  TPreviewDocumentJson = Record<string, unknown>,
  TFrameTreeJson = Record<string, unknown>,
>(
  options: CreatePreviewLayoutBridgeRuntimeOptions<TModel, TPreviewDocumentJson, TFrameTreeJson>,
): PreviewLayoutBridgeRuntime<TModel, TPreviewDocumentJson, TFrameTreeJson> {
  const runtime: PreviewLayoutBridgeRuntime<TModel, TPreviewDocumentJson, TFrameTreeJson> = {
    state: options.state,
    async init(slug) {
      options.state.previewDocumentJson = null;
      options.state.frameTreeJson = null;
      options.state.textAdapter = null;
      options.state.textAdapterError = null;
      options.state.lastElkSnapshot = null;
      options.state.lastElkFrameLabels = null;
      options.state.renderIntent = null;

      try {
        const previewDocumentJson = await options.fetchPreviewDocument(slug);
        options.state.previewDocumentJson = clonePreviewLayoutBridgeValue(previewDocumentJson);
        options.state.frameTreeJson = clonePreviewLayoutBridgeValue(
          options.extractFrameTreeFromPreviewDocument(previewDocumentJson),
        );
        commitPreviewLayoutBridgeRenderIntent(options.state);
      } catch (error) {
        options.warn('layout-bridge: failed to load preview document', error);
      }

      try {
        const textAdapter = await options.createTextAdapter();
        if (!options.isAuthoritativeTextAdapter(textAdapter)) {
          throw new Error(
            'layout-bridge requires a HarfBuzz text adapter, got '
            + String(options.getTextAdapterBackend(textAdapter) || 'unknown'),
          );
        }
        options.state.textAdapter = textAdapter;
      } catch (error) {
        options.state.textAdapter = null;
        options.state.textAdapterError = error instanceof Error ? error.message : String(error);
        options.error('layout-bridge: failed to initialize HarfBuzz text adapter', error);
      }
    },
    getLocalRelayoutStatus() {
      return resolvePreviewLayoutBridgeLocalRelayoutStatus(
        options.state,
        options.getTextAdapterBackend,
      );
    },
    isLocalRelayoutReady() {
      return runtime.getLocalRelayoutStatus().ready;
    },
    setLocalRelayoutOverrideMode(mode) {
      options.state.localRelayoutOverrideMode =
        normalizePreviewLayoutBridgeLocalRelayoutOverrideMode(mode);
      return runtime.getLocalRelayoutStatus();
    },
    getPreviewDocumentJson() {
      return clonePreviewLayoutBridgeValue(options.state.previewDocumentJson);
    },
    getFrameTreeJson() {
      return clonePreviewLayoutBridgeValue(options.state.frameTreeJson);
    },
    setFrameTreeJson(json) {
      options.state.frameTreeJson = clonePreviewLayoutBridgeValue(json);
      commitPreviewLayoutBridgeRenderIntent(options.state);
    },
    setFrameTreeLayoutEngine(layoutEngine) {
      if (!isPreviewLayoutBridgeRecord(options.state.frameTreeJson)) {
        return null;
      }
      const normalizedLayoutEngine = normalizePreviewWorkspaceEngineId(layoutEngine ?? null);
      options.state.frameTreeJson = setFrameTreeJsonLayoutEngine(
        options.state.frameTreeJson,
        normalizedLayoutEngine,
      );
      options.state.previewDocumentJson = setPreviewDocumentFrameTreeLayoutEngine(
        options.state.previewDocumentJson,
        normalizedLayoutEngine,
      );
      commitPreviewLayoutBridgeRenderIntent(options.state, {
        activeEngineId: normalizedLayoutEngine,
      });
      return normalizedLayoutEngine;
    },
    getTextAdapter() {
      return options.state.textAdapter;
    },
    getLastElkSnapshot() {
      return options.state.lastElkSnapshot;
    },
    getLastElkFrameLabels() {
      return options.state.lastElkFrameLabels
        ? { ...options.state.lastElkFrameLabels }
        : null;
    },
    applyFrameTreeRemovals(frameIds) {
      if (!options.state.frameTreeJson) {
        return [];
      }
      return applyFrameTreeRemovalsToPreviewTreeJson(
        options.state.frameTreeJson as Record<string, unknown>,
        frameIds,
      );
    },
    performLocalRelayout(model, overrides, gridOverrides, relayoutOptions) {
      const readiness = runtime.getLocalRelayoutStatus();
      if (!readiness.ready) {
        options.warn(`layout-bridge: not ready (${readiness.reason})`);
        return null;
      }

      if (!options.state.frameTreeJson || !options.state.textAdapter) {
        options.warn('layout-bridge: missing frame tree or text adapter');
        return null;
      }

      try {
        const diagramJson = clonePreviewLayoutBridgeValue(
          options.state.frameTreeJson,
        ) as Record<string, unknown>;
        const renderIntent = commitPreviewLayoutBridgeRenderIntent(options.state, {
          frameOverrides: overrides || {},
          gridOverrides: gridOverrides || {},
        });
        applyPreviewRenderIntentToFrameTreeJson(diagramJson, renderIntent);
        applyPreviewSessionRemovalsToDiagramJson(diagramJson, model);
        if (options.isEngineLayoutDiagramJson(diagramJson)) {
          options.warn('layout-bridge: performLocalRelayout skipped for engine-backed diagram');
          return null;
        }

        const diagram = options.deserializeFrameDiagram(diagramJson);
        const allFrameOverrides = options.collectRelayoutFrameOverrides(overrides || {});
        options.applyOverridesToFrameTree(diagram, allFrameOverrides, gridOverrides || {});
        if (shouldInvalidatePreviewArrowWaypointGeometry(allFrameOverrides)) {
          invalidatePreviewArrowWaypointGeometry(diagram.arrows);
        }

        const oldBounds: Record<string, PreviewLayoutBridgeOldBoundsEntry> = {};
        const modelIds = (model as { allIds?: Iterable<string> }).allIds;
        const getModelNode = (id: string) => (
          (model as { get?: (id: string) => { data?: Record<string, number> } | null }).get?.(id)
        );
        if (modelIds) {
          for (const id of modelIds) {
            const node = getModelNode(id);
            if (node?.data) {
              oldBounds[id] = {
                x: Number(node.data.x || 0),
                y: Number(node.data.y || 0),
                w: Number(node.data.width || 0),
                h: Number(node.data.height || 0),
              };
            }
          }
        }

        const result = options.layoutLocalDiagram(diagram, options.state.textAdapter);
        const newBounds = options.collectPlacedBounds(diagram.root);
        const framesById = options.collectFramesById(diagram.root);
        options.patchSvgFromLayout({
          svg: options.queryStageSvg(),
          oldBounds,
          newBounds,
          framesById,
        });

        let routedArrows: PreviewRoutedArrow[] = [];
        if (diagram.arrows.length > 0) {
          routedArrows = options.routeArrows(diagram.arrows, newBounds);
          options.patchArrowsSvg({
            svg: options.queryStageSvg(),
            routedArrows,
            boundsMap: newBounds,
          });
        }

        if (!relayoutOptions?.skipModelUpdate) {
          options.updateModelFromLayout(model, diagram.root);
          options.syncArrowsInModel(model, diagram.arrows, routedArrows);
        }

        return {
          coerced: result.coerced,
          width: result.width,
          height: result.height,
        };
      } catch (error) {
        options.error('layout-bridge: local relayout failed', error);
        return null;
      }
    },
    async renderFreshSvg(overrides, gridOverrides, model, relayoutOptions) {
      if (!options.state.textAdapter) {
        throw new Error('layout-bridge: renderFreshSvg requires an initialized text adapter');
      }
      const renderResult = await options.renderFreshPreviewSvg({
        ownerDocument: options.ownerDocument,
        previewDocumentJson: options.state.previewDocumentJson,
        frameTreeJson: options.state.frameTreeJson,
        overrides: overrides || {},
        gridOverrides: gridOverrides || null,
        renderIntent: commitPreviewLayoutBridgeRenderIntent(options.state, {
          frameOverrides: overrides || {},
          gridOverrides: gridOverrides || {},
        }),
        model,
        textAdapter: options.state.textAdapter,
        skipModelUpdate: relayoutOptions?.skipModelUpdate ?? false,
        applySessionRemovalsToDiagramJson: (diagramJson, nextModel) => {
          applyPreviewSessionRemovalsToDiagramJson(diagramJson, nextModel);
        },
        applyOverridesToFrameTree: options.applyOverridesToFrameTree,
        collectRelayoutFrameOverrides: options.collectRelayoutFrameOverrides,
        isEngineLayoutDiagramJson: options.isEngineLayoutDiagramJson,
        resolveEngineLayoutOptionOverrides: options.resolveEngineLayoutOptionOverrides,
        updateModelFromLayout: options.updateModelFromLayout,
        syncArrowsInModel: options.syncArrowsInModel,
      });
      options.state.lastElkSnapshot = renderResult.elkSnapshot || null;
      options.state.lastElkFrameLabels = renderResult.elkFrameLabels || null;
      options.refreshElkViewMode();
      options.refreshLayoutControls?.();
      return {
        svg: renderResult.svg,
        width: renderResult.width,
        height: renderResult.height,
        coerced: renderResult.coerced,
      };
    },
    async performEngineRelayout(model, overrides, gridOverrides, relayoutOptions) {
      const readiness = runtime.getLocalRelayoutStatus();
      if (!readiness.ready) {
        options.warn(`layout-bridge: not ready (${readiness.reason})`);
        return null;
      }

      try {
        const renderResult = await runtime.renderFreshSvg(
          overrides,
          gridOverrides && Object.keys(gridOverrides).length > 0 ? gridOverrides : null,
          model,
          relayoutOptions,
        );
        const stage = options.getStageContainer();
        if (!stage) {
          return null;
        }
        stage.replaceChildren(renderResult.svg);
        options.fitRenderedSvg(renderResult.svg, {
          minWidth: renderResult.width,
          minHeight: renderResult.height,
        });
        return {
          coerced: renderResult.coerced,
          width: renderResult.width,
          height: renderResult.height,
        };
      } catch (error) {
        options.error('layout-bridge: engine relayout failed', error);
        return null;
      }
    },
    async performElkRelayout(model, overrides, gridOverrides, relayoutOptions) {
      return runtime.performEngineRelayout(model, overrides, gridOverrides, relayoutOptions);
    },
  };

  return runtime;
}
