/**
 * Preview scene host helpers (spec 046 slice T012/T013).
 *
 * These helpers own the remaining scene-refresh DOM orchestration so
 * `editor.js` stays closer to entry/bootstrap glue.
 */

export interface PreviewSceneHostDocumentLike {
  querySelector: (selector: string) => PreviewSceneHostSvgLike | null;
  createElementNS: (namespace: string, tagName: string) => PreviewSceneHostElementLike;
  getElementById: (id: string) => PreviewSceneHostTextElementLike | null;
}

export interface PreviewSceneHostElementLike {
  id?: string;
  style: {
    pointerEvents?: string;
  };
  setAttribute: (name: string, value: string) => void;
  appendChild: (child: PreviewSceneHostElementLike) => void;
  remove?: () => void;
}

export interface PreviewSceneHostSvgLike {
  viewBox: {
    baseVal: {
      width: number;
      height: number;
    };
  };
  clientWidth?: number;
  clientHeight?: number;
  getAttribute: (name: string) => string | null;
  querySelector: (selector: string) => PreviewSceneHostElementLike | null;
  appendChild: (child: PreviewSceneHostElementLike) => void;
}

export interface PreviewSceneHostTextElementLike {
  textContent: string;
}

export interface PreviewSceneHostShapeRect {
  kind: 'rect';
  x: string;
  y: string;
  width: string;
  height: string;
  fill: string;
}

export interface PreviewSceneHostShapeLine {
  kind: 'line';
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  stroke: string;
  strokeWidth: string;
  strokeDasharray?: string;
}

export type PreviewSceneHostShape =
  | PreviewSceneHostShapeRect
  | PreviewSceneHostShapeLine;

export interface PreviewGridOverlaySceneHostResult {
  shapes: PreviewSceneHostShape[];
}

export interface RenderPreviewGridOverlayHostOptions {
  document: PreviewSceneHostDocumentLike;
  guideMode: string;
  gridInfo?: unknown;
  baselineStep: number;
  createScene: (options: {
    guideMode: string;
    gridInfo: unknown;
    svgWidth: number;
    svgHeight: number;
    baselineStep: number;
  }) => PreviewGridOverlaySceneHostResult | null;
}

export interface PreviewStageCanvasDimensions {
  width: number;
  height: number;
}

export interface ReadPreviewStageCanvasDimensionsOptions {
  document: {
    querySelector: (selector: string) => {
      viewBox?: {
        baseVal?: {
          width?: number;
          height?: number;
        };
      };
      clientWidth?: number;
      clientHeight?: number;
      getAttribute?: (name: string) => string | null;
      querySelector?: (selector: string) => {
        getAttribute?: (name: string) => string | null;
      } | null;
    } | null;
  };
}

export interface RefreshPreviewGridInfoFromLayoutHostOptions<TGridInfo> {
  document: ReadPreviewStageCanvasDimensionsOptions['document'];
  baselineStep: number;
  gridOverrides: Record<string, unknown>;
  fallbackGridInfo: TGridInfo;
  baseGridInfo: TGridInfo;
  resolveGridInfo: (options: {
    canvasWidth: number;
    canvasHeight: number;
    baselineStep: number;
    gridOverrides: Record<string, unknown>;
    fallbackGridInfo: TGridInfo;
    baseGridInfo: TGridInfo;
  }) => TGridInfo;
  setGridInfo: (gridInfo: TGridInfo) => void;
  setDiagramGrid: (gridInfo: TGridInfo) => void;
  populateGridControls: () => void;
}

export interface PreviewWaypointOverrideEntry {
  waypoints?: unknown;
  [key: string]: unknown;
}

export interface PreviewWaypointNode {
  waypoints?: unknown;
}

export interface ApplyPreviewWaypointOverridesHostOptions {
  overrides: Record<string, PreviewWaypointOverrideEntry>;
  getArrowNode: (cid: string) => PreviewWaypointNode | null | undefined;
  rebuildArrowSvg: (cid: string) => void;
}

export interface UpdatePreviewOverrideSummaryHostOptions {
  document: Pick<PreviewSceneHostDocumentLike, 'getElementById'>;
  overrideCount: number;
  formatSummary: (count: number) => string;
}

export interface RefreshPreviewTreeOverrideStateHostOptions {
  document: Document | PreviewSceneHostDocumentLike;
  overrides: Record<string, unknown>;
  syncTreeOverrideState: (container: Document | PreviewSceneHostDocumentLike, overrides: Record<string, unknown>) => void;
}

export interface UpdatePreviewConstraintStatusHostOptions<TSummary> {
  document: Pick<PreviewSceneHostDocumentLike, 'getElementById'>;
  summary: TSummary & {
    errors?: number;
  };
  syncSaveButton: (errorCount: number) => void;
  syncConstraintStatus: (
    element: PreviewSceneHostTextElementLike,
    summary: TSummary,
  ) => void;
}

export interface RunPreviewConstraintValidationHostOptions<TViolations, TSummary> {
  document: Pick<PreviewSceneHostDocumentLike, 'getElementById' | 'querySelector'>;
  model: unknown;
  validateConstraints: (model: unknown, svg: unknown) => TViolations;
  summarizeViolations: (violations: TViolations) => TSummary & {
    errors?: number;
  };
  setLastViolations: (violations: TViolations) => void;
  syncSaveButton: (errorCount: number) => void;
  syncConstraintStatus: (
    element: PreviewSceneHostTextElementLike,
    summary: TSummary,
  ) => void;
}

export interface RefreshPreviewSceneHostOptions {
  applyWaypointOverrides?: (() => void) | null;
  buildTreeUi?: (() => void) | null;
  bindInteraction?: (() => void) | null;
  applyAllOverrides?: (() => void) | null;
  renderGridOverlay?: (() => void) | null;
  reapplySelection?: (() => void) | null;
  refreshGridInfo?: (() => void) | null;
  renderSelectionInspector?: (() => void) | null;
  updateOverrideSummary?: (() => void) | null;
  refreshTreeColors?: (() => void) | null;
  runConstraints?: (() => void) | null;
  populateGridControls?: (() => void) | null;
}

export interface RerenderPreviewStageHostOptions<TModel, TOverrides, TSvg> {
  stage?: {
    replaceChildren: (child: TSvg) => void;
  } | null;
  model: TModel & {
    gridOverrides?: Record<string, unknown> | null;
  };
  overrides: TOverrides;
  renderFreshSvg: (options: {
    overrides: TOverrides;
    gridOverrides: Record<string, unknown> | null;
    model: TModel;
  }) => Promise<{
    svg: TSvg;
  }>;
  refreshScene: () => void;
}

export interface RerenderPreviewStageFromModelHostOptions<TModel, TOverrides, TSvg> {
  document: {
    getElementById: (id: string) => {
      replaceChildren: (child: TSvg) => void;
    } | null;
  };
  model: TModel & {
    gridOverrides?: Record<string, unknown> | null;
  };
  overrides: TOverrides;
  renderFreshSvg?: ((options: {
    overrides: TOverrides;
    gridOverrides: Record<string, unknown> | null;
    model: TModel;
  }) => Promise<{
    svg: TSvg;
  }>) | null;
  refreshScene: RefreshPreviewSceneHostOptions;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function appendPreviewGridOverlayShape(
  parent: PreviewSceneHostElementLike,
  document: PreviewSceneHostDocumentLike,
  shape: PreviewSceneHostShape,
): void {
  if (shape.kind === 'rect') {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', shape.x);
    rect.setAttribute('y', shape.y);
    rect.setAttribute('width', shape.width);
    rect.setAttribute('height', shape.height);
    rect.setAttribute('fill', shape.fill);
    parent.appendChild(rect);
    return;
  }

  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', shape.x1);
  line.setAttribute('y1', shape.y1);
  line.setAttribute('x2', shape.x2);
  line.setAttribute('y2', shape.y2);
  line.setAttribute('stroke', shape.stroke);
  line.setAttribute('stroke-width', shape.strokeWidth);
  if (shape.strokeDasharray) {
    line.setAttribute('stroke-dasharray', shape.strokeDasharray);
  }
  parent.appendChild(line);
}

export function renderPreviewGridOverlayHost(
  options: RenderPreviewGridOverlayHostOptions,
): boolean {
  const svg = options.document.querySelector('#stage svg');
  if (!svg) {
    return false;
  }

  svg.querySelector('#dg-grid-overlay')?.remove?.();
  if (options.guideMode === 'off' || !options.gridInfo) {
    return false;
  }

  const viewBox = svg.viewBox.baseVal;
  const svgWidth = viewBox.width || Number.parseFloat(svg.getAttribute('width') || `${svg.clientWidth || 0}`);
  const svgHeight = viewBox.height || Number.parseFloat(svg.getAttribute('height') || `${svg.clientHeight || 0}`);
  const scene = options.createScene({
    guideMode: options.guideMode,
    gridInfo: options.gridInfo,
    svgWidth,
    svgHeight,
    baselineStep: options.baselineStep,
  });
  if (!scene) {
    return false;
  }

  const group = options.document.createElementNS(SVG_NS, 'g');
  group.id = 'dg-grid-overlay';
  group.style.pointerEvents = 'none';
  for (const shape of scene.shapes) {
    appendPreviewGridOverlayShape(group, options.document, shape);
  }
  svg.appendChild(group);
  return true;
}

export function readPreviewStageCanvasDimensions(
  options: ReadPreviewStageCanvasDimensionsOptions,
): PreviewStageCanvasDimensions | null {
  const svg = options.document.querySelector('#stage svg');
  if (!svg) {
    return null;
  }
  const viewBox = svg.viewBox?.baseVal;
  const fallbackWidth = viewBox?.width || Number.parseFloat(svg.getAttribute?.('width') || `${svg.clientWidth || 0}`);
  const fallbackHeight = viewBox?.height || Number.parseFloat(svg.getAttribute?.('height') || `${svg.clientHeight || 0}`);
  const pageRect = options.document
    .querySelector('[data-component-id="page"]')
    ?.querySelector?.(':scope > rect');
  const pageWidth = Number(pageRect?.getAttribute?.('width') || '0');
  const pageHeight = Number(pageRect?.getAttribute?.('height') || '0');
  return {
    width: pageWidth > 0 ? pageWidth : fallbackWidth,
    height: pageHeight > 0 ? pageHeight : fallbackHeight,
  };
}

export function refreshPreviewGridInfoFromLayoutHost<TGridInfo>(
  options: RefreshPreviewGridInfoFromLayoutHostOptions<TGridInfo>,
): TGridInfo | null {
  const canvas = readPreviewStageCanvasDimensions({ document: options.document });
  if (!canvas) {
    return null;
  }

  const nextGridInfo = options.resolveGridInfo({
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    baselineStep: options.baselineStep,
    gridOverrides: options.gridOverrides,
    fallbackGridInfo: options.fallbackGridInfo,
    baseGridInfo: options.baseGridInfo,
  });
  options.setGridInfo(nextGridInfo);
  options.setDiagramGrid(nextGridInfo);
  options.populateGridControls();
  return nextGridInfo;
}

export function applyPreviewWaypointOverridesHost(
  options: ApplyPreviewWaypointOverridesHostOptions,
): number {
  let appliedCount = 0;
  for (const [cid, override] of Object.entries(options.overrides)) {
    if (!override?.waypoints) {
      continue;
    }
    const node = options.getArrowNode(cid);
    if (!node) {
      continue;
    }
    node.waypoints = JSON.parse(JSON.stringify(override.waypoints));
    options.rebuildArrowSvg(cid);
    appliedCount += 1;
  }
  return appliedCount;
}

export function updatePreviewOverrideSummaryHost(
  options: UpdatePreviewOverrideSummaryHostOptions,
): boolean {
  const element = options.document.getElementById('override-summary');
  if (!element) {
    return false;
  }
  element.textContent = options.formatSummary(options.overrideCount);
  return true;
}

export function refreshPreviewTreeOverrideStateHost(
  options: RefreshPreviewTreeOverrideStateHostOptions,
): void {
  options.syncTreeOverrideState(options.document, options.overrides);
}

export function updatePreviewConstraintStatusHost<TSummary>(
  options: UpdatePreviewConstraintStatusHostOptions<TSummary>,
): boolean {
  options.syncSaveButton(options.summary.errors || 0);
  const element = options.document.getElementById('constraint-status');
  if (!element) {
    return false;
  }
  options.syncConstraintStatus(element, options.summary);
  return true;
}

export function runPreviewConstraintValidationHost<TViolations, TSummary>(
  options: RunPreviewConstraintValidationHostOptions<TViolations, TSummary>,
): TViolations {
  const svg = options.document.querySelector('#stage svg');
  const violations = options.validateConstraints(options.model, svg);
  options.setLastViolations(violations);
  updatePreviewConstraintStatusHost({
    document: options.document,
    summary: options.summarizeViolations(violations),
    syncSaveButton: options.syncSaveButton,
    syncConstraintStatus: options.syncConstraintStatus,
  });
  return violations;
}

export function refreshPreviewSceneHost(
  options: RefreshPreviewSceneHostOptions,
): void {
  options.applyWaypointOverrides?.();
  options.buildTreeUi?.();
  options.bindInteraction?.();
  options.applyAllOverrides?.();
  options.renderGridOverlay?.();
  options.reapplySelection?.();
  options.refreshGridInfo?.();
  options.renderSelectionInspector?.();
  options.updateOverrideSummary?.();
  options.refreshTreeColors?.();
  options.runConstraints?.();
  options.populateGridControls?.();
}

export async function rerenderPreviewStageHost<TModel, TOverrides, TSvg>(
  options: RerenderPreviewStageHostOptions<TModel, TOverrides, TSvg>,
): Promise<boolean> {
  if (!options.stage) {
    return false;
  }
  const gridOverrides = options.model.gridOverrides && Object.keys(options.model.gridOverrides).length > 0
    ? options.model.gridOverrides
    : null;
  const renderResult = await options.renderFreshSvg({
    overrides: options.overrides,
    gridOverrides,
    model: options.model,
  });
  options.stage.replaceChildren(renderResult.svg);
  options.refreshScene();
  return true;
}

export async function rerenderPreviewStageFromModelHost<TModel, TOverrides, TSvg>(
  options: RerenderPreviewStageFromModelHostOptions<TModel, TOverrides, TSvg>,
): Promise<boolean> {
  if (typeof options.renderFreshSvg !== 'function') {
    return false;
  }

  return rerenderPreviewStageHost({
    stage: options.document.getElementById('stage'),
    model: options.model,
    overrides: options.overrides,
    renderFreshSvg: options.renderFreshSvg,
    refreshScene: () => {
      refreshPreviewSceneHost(options.refreshScene);
    },
  });
}
