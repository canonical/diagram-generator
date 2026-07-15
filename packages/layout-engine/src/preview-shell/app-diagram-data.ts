import { normalizePreviewDiagramPath } from './app-diagram-navigation.js';
import { collectPreviewArrowComponentEntries } from '../preview-arrow-component-ids.js';
import { previewDocumentOwnsStandaloneSvg } from '../preview-engine/render.js';

/**
 * Preview diagram bootstrap/data helpers (spec 046 slice A).
 *
 * These helpers own the remaining diagram navigation, tree bootstrap, arrow
 * sync, and grid bootstrap logic so editor.js can stay focused on shell glue.
 */

export interface PreviewCanonicalDocumentState {
  kind?: string | null;
}

export interface PreviewCanonicalArrowState {
  id?: string | null;
  source: string;
  target: string;
  color?: string | null;
  waypoints?: unknown[] | null;
}

export interface PreviewCanonicalFrameTreeState {
  arrows?: PreviewCanonicalArrowState[] | null;
}

export interface PreviewDiagramBootstrapState {
  previewDocument?: PreviewCanonicalDocumentState | null;
  componentTree?: unknown[] | null;
  gridInfo?: unknown;
}

export interface PreviewDiagramTreeModel {
  loadTree: (tree: unknown[]) => void;
  loadArrows?: ((arrows: unknown[]) => void) | null;
}

export interface PreviewJsonFetchResponse<TValue = unknown> {
  ok: boolean;
  json: () => Promise<TValue>;
}

export interface PreviewTextFetchResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}

export interface AttemptPreviewDiagramNavigationOptions {
  nextUrl: string | null | undefined;
  currentPath: string;
  origin: string;
  isDirty: boolean;
  confirmNavigation: (message: string) => boolean;
  dirtyConfirmMessage: string;
  syncUi: () => void;
  setAllowInternalDirtyNavigation: (allowed: boolean) => void;
  assignLocation: (nextPath: string) => void;
}

export interface SyncPreviewArrowModelFromFrameTreeOptions {
  frameTreeJson: PreviewCanonicalFrameTreeState | null | undefined;
  model: PreviewDiagramTreeModel;
  syncArrowsInModel?: ((model: PreviewDiagramTreeModel, arrows: PreviewCanonicalArrowState[], removedIds: string[]) => void) | null;
  arrowComponentId?: ((arrow: PreviewCanonicalArrowState) => string | null | undefined) | null;
}

export type PreviewComponentTreeLoadMode =
  | 'preview-document'
  | 'canonical'
  | 'fetched'
  | 'unavailable';

export interface LoadPreviewComponentTreeOptions {
  canonicalState?: PreviewDiagramBootstrapState | null;
  readPreviewDocument?: (() => PreviewCanonicalDocumentState | null | undefined) | null;
  fetchTree: () => Promise<PreviewJsonFetchResponse<unknown[]>>;
  model: PreviewDiagramTreeModel;
  readFrameTreeJson?: (() => PreviewCanonicalFrameTreeState | null | undefined) | null;
  syncArrowsInModel?: ((model: PreviewDiagramTreeModel, arrows: PreviewCanonicalArrowState[], removedIds: string[]) => void) | null;
  arrowComponentId?: ((arrow: PreviewCanonicalArrowState) => string | null | undefined) | null;
}

export interface PreviewGridInfoFallbackMetrics {
  gap: number;
  pad: number;
  canvasWidth: number;
  canvasHeight: number;
  baselineStep: number;
}

export interface ResolvePreviewGridInfoOptions {
  canvasWidth: number;
  canvasHeight: number;
  baselineStep: number;
  columnCount: number;
  columnGutter: number;
  rowGutter: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
}

export type PreviewGridInfoLoadMode = 'canonical' | 'fetched' | 'fallback';

export interface LoadedPreviewGridInfoState<TGridInfo = unknown> {
  mode: PreviewGridInfoLoadMode;
  gridInfo: TGridInfo;
  baseGridInfo: TGridInfo;
}

export interface LoadPreviewGridInfoOptions<TGridInfo = unknown> {
  canonicalState?: PreviewDiagramBootstrapState | null;
  fetchGridInfo: () => Promise<PreviewJsonFetchResponse<TGridInfo>>;
  cloneValue: (value: TGridInfo) => TGridInfo;
  readFallbackMetrics: () => PreviewGridInfoFallbackMetrics;
  resolvePreviewGridInfo: (options: ResolvePreviewGridInfoOptions) => TGridInfo;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

export function attemptPreviewDiagramNavigation(
  options: AttemptPreviewDiagramNavigationOptions,
): boolean {
  const nextPath = normalizePreviewDiagramPath(options.nextUrl, options.origin);
  if (!nextPath || nextPath === options.currentPath) {
    options.syncUi();
    return false;
  }

  if (options.isDirty && !options.confirmNavigation(options.dirtyConfirmMessage)) {
    options.syncUi();
    return false;
  }

  options.setAllowInternalDirtyNavigation(true);
  try {
    options.assignLocation(nextPath);
  } catch (error) {
    options.setAllowInternalDirtyNavigation(false);
    options.syncUi();
    throw error;
  }
  return true;
}

export function syncPreviewArrowModelFromFrameTree(
  options: SyncPreviewArrowModelFromFrameTreeOptions,
): Array<{
  id: string;
  source: string;
  target: string;
  color?: string | null;
  waypoints: unknown[];
  authoredWaypoints: unknown[];
}> {
  const arrows = Array.isArray(options.frameTreeJson?.arrows)
    ? options.frameTreeJson!.arrows!
    : [];
  const arrowEntries = collectPreviewArrowComponentEntries(arrows);

  if (options.syncArrowsInModel) {
    options.syncArrowsInModel(options.model, arrows, []);
    return arrowEntries.map(({ arrow, componentId }) => ({
      id: options.arrowComponentId?.(arrow) || componentId,
      source: arrow.source,
      target: arrow.target,
      color: arrow.color,
      waypoints: Array.isArray(arrow.waypoints) ? arrow.waypoints : [],
      authoredWaypoints: Array.isArray(arrow.waypoints) ? arrow.waypoints : [],
    }));
  }

  const payload = arrowEntries.map(({ arrow, componentId }) => ({
    id: options.arrowComponentId?.(arrow) || componentId,
    source: arrow.source,
    target: arrow.target,
    color: arrow.color,
    waypoints: Array.isArray(arrow.waypoints) ? arrow.waypoints : [],
    authoredWaypoints: Array.isArray(arrow.waypoints) ? arrow.waypoints : [],
  }));
  options.model.loadArrows?.(payload);
  return payload;
}

export async function loadPreviewComponentTree(
  options: LoadPreviewComponentTreeOptions,
): Promise<PreviewComponentTreeLoadMode> {
  const previewDocument = options.canonicalState?.previewDocument
    || options.readPreviewDocument?.()
    || null;
  if (previewDocumentOwnsStandaloneSvg(previewDocument?.kind)) {
    options.model.loadTree([]);
    options.model.loadArrows?.([]);
    return 'preview-document';
  }

  const canonicalComponentTree = Array.isArray(options.canonicalState?.componentTree)
    ? options.canonicalState!.componentTree!
    : null;
  if (canonicalComponentTree) {
    options.model.loadTree(canonicalComponentTree);
    syncPreviewArrowModelFromFrameTree({
      frameTreeJson: options.readFrameTreeJson?.() || null,
      model: options.model,
      syncArrowsInModel: options.syncArrowsInModel,
      arrowComponentId: options.arrowComponentId,
    });
    return 'canonical';
  }

  try {
    const response = await options.fetchTree();
    if (response.ok) {
      const data = await response.json();
      options.model.loadTree(Array.isArray(data) ? data : []);
      syncPreviewArrowModelFromFrameTree({
        frameTreeJson: options.readFrameTreeJson?.() || null,
        model: options.model,
        syncArrowsInModel: options.syncArrowsInModel,
        arrowComponentId: options.arrowComponentId,
      });
      return 'fetched';
    }
  } catch {
    // Leave the current model state in place when the tree fetch fails.
  }

  return 'unavailable';
}

export async function loadPreviewGridInfo<TGridInfo = unknown>(
  options: LoadPreviewGridInfoOptions<TGridInfo>,
): Promise<LoadedPreviewGridInfoState<TGridInfo>> {
  const canonicalGridInfo = isObject(options.canonicalState?.gridInfo)
    ? options.canonicalState!.gridInfo as TGridInfo
    : null;
  if (canonicalGridInfo) {
    return {
      mode: 'canonical',
      gridInfo: canonicalGridInfo,
      baseGridInfo: options.cloneValue(canonicalGridInfo),
    };
  }

  try {
    const response = await options.fetchGridInfo();
    if (response.ok) {
      const gridInfo = await response.json();
      return {
        mode: 'fetched',
        gridInfo,
        baseGridInfo: options.cloneValue(gridInfo),
      };
    }
  } catch {
    // Fall through to the derived runtime grid.
  }

  const fallback = options.readFallbackMetrics();
  const gridInfo = options.resolvePreviewGridInfo({
    canvasWidth: fallback.canvasWidth,
    canvasHeight: fallback.canvasHeight,
    baselineStep: fallback.baselineStep,
    columnCount: 2,
    columnGutter: fallback.gap,
    rowGutter: fallback.gap,
    marginTop: fallback.pad,
    marginRight: fallback.pad,
    marginBottom: fallback.pad,
    marginLeft: fallback.pad,
  });
  return {
    mode: 'fallback',
    gridInfo,
    baseGridInfo: options.cloneValue(gridInfo),
  };
}
