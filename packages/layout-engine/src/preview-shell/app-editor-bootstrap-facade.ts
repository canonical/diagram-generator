import {
  bootstrapPreviewEditorRuntime,
  createBootstrapPreviewEditorRuntimeOptionsFromHost,
  createPreviewDiagramLoadSignalState,
  signalPreviewDiagramLoaded,
  whenPreviewDiagramLoaded,
  type CreateBootstrapPreviewEditorRuntimeOptionsFromHostOptions,
  type PreviewBootstrapRuntimeModelLike,
} from './app-bootstrap.js';
import {
  attemptPreviewDiagramNavigation,
  loadPreviewComponentTree,
  type LoadPreviewComponentTreeOptions,
  type PreviewComponentTreeLoadMode,
  type PreviewDiagramBootstrapState,
  type PreviewDiagramTreeModel,
} from './app-diagram-data.js';
import { syncPreviewBrowseLinksToPath } from './app-diagram-navigation.js';
import {
  createLoadPreviewSvgHostOptionsFromRuntime,
  loadPreviewSvg,
  type CreateLoadPreviewSvgHostOptionsFromRuntimeOptions,
  type PreviewLoadExecutionMode,
  type PreviewLoadInvocationOptions,
} from './app-load.js';

type BootstrapFacadeDocumentLike = Pick<Document, 'querySelector' | 'querySelectorAll'>;
type PreviewEditorBootstrapRuntimeModel =
  PreviewDiagramTreeModel
  & PreviewBootstrapRuntimeModelLike;

type BootstrapFacadeSvgLoadOptions<TSvg = unknown, TModel = unknown, TGridInfo = unknown> = Omit<
  CreateLoadPreviewSvgHostOptionsFromRuntimeOptions<TSvg, TModel, TGridInfo>,
  'invocation' | 'slug' | 'loadTree' | 'signalDiagramLoaded'
>;

type BootstrapFacadeRuntimeOptions = Omit<
  CreateBootstrapPreviewEditorRuntimeOptionsFromHostOptions,
  'document' | 'previewWindow' | 'slug' | 'syncBrowseNav' | 'attemptNavigation' | 'reloadDiagram'
>;

export interface PreviewEditorBootstrapNavigationOptions {
  isDirty: () => boolean;
  setAllowInternalDirtyNavigation: (allowed: boolean) => void;
  dirtyConfirmMessage: string;
  browseLinkSelector?: string;
}

export interface CreatePreviewEditorBootstrapFacadeFromEditorHostOptions<
  TSvg = unknown,
  TModel = unknown,
  TGridInfo = unknown,
> {
  document: BootstrapFacadeDocumentLike;
  previewWindow: Window & typeof globalThis;
  slug: string;
  componentTree: Omit<LoadPreviewComponentTreeOptions, 'canonicalState'>;
  svgLoad: BootstrapFacadeSvgLoadOptions<TSvg, TModel, TGridInfo>;
  navigation: PreviewEditorBootstrapNavigationOptions;
  runtimeBootstrap?: BootstrapFacadeRuntimeOptions | null;
  hasRenderedStageSvg?: (() => boolean) | null;
}

type RuntimeBootstrapComponentTreeOptions = Omit<
  CreatePreviewEditorBootstrapFacadeFromEditorHostOptions['componentTree'],
  'model'
>;

type RuntimeBootstrapSvgLoadOptions<TSvg = unknown, TModel = unknown, TGridInfo = unknown> = Omit<
  CreatePreviewEditorBootstrapFacadeFromEditorHostOptions<TSvg, TModel, TGridInfo>['svgLoad'],
  | 'stage'
  | 'engine'
  | 'gridEnabled'
  | 'previewBridgeHost'
  | 'previewBridgeRender'
  | 'previewSaveClient'
  | 'dirtyStateSerializer'
  | 'overrides'
  | 'model'
> & {
  selectionState: Omit<
    CreatePreviewEditorBootstrapFacadeFromEditorHostOptions<TSvg, TModel, TGridInfo>['svgLoad']['selectionState'],
    'selectedIds'
  >;
};

type RuntimeBootstrapFacadeRuntimeOptions = Omit<
  BootstrapFacadeRuntimeOptions,
  'model' | 'selectedIds' | 'editorState' | 'getOverrides' | 'previewSaveClient' | 'getFrameTree'
>;

export interface PreviewEditorBootstrapSharedOptions<
  TSvg = unknown,
  TModel extends PreviewEditorBootstrapRuntimeModel = PreviewEditorBootstrapRuntimeModel,
  TGridInfo = unknown,
> {
  document: BootstrapFacadeDocumentLike;
  previewWindow: Window & typeof globalThis;
  slug: string;
  stage: CreatePreviewEditorBootstrapFacadeFromEditorHostOptions<TSvg, TModel, TGridInfo>['svgLoad']['stage'];
  engine: CreatePreviewEditorBootstrapFacadeFromEditorHostOptions<TSvg, TModel, TGridInfo>['svgLoad']['engine'];
  gridEnabled: CreatePreviewEditorBootstrapFacadeFromEditorHostOptions<TSvg, TModel, TGridInfo>['svgLoad']['gridEnabled'];
  model: TModel;
  selectedIds: Set<string>;
  getOverrides: BootstrapFacadeRuntimeOptions['getOverrides'];
  getFrameTree: BootstrapFacadeRuntimeOptions['getFrameTree'];
  previewSaveClient: (
    CreatePreviewEditorBootstrapFacadeFromEditorHostOptions<TSvg, TModel, TGridInfo>['svgLoad']['previewSaveClient']
    & BootstrapFacadeRuntimeOptions['previewSaveClient']
  );
  editorState:
    CreatePreviewEditorBootstrapFacadeFromEditorHostOptions<TSvg, TModel, TGridInfo>['svgLoad']['dirtyStateSerializer']
    & BootstrapFacadeRuntimeOptions['editorState'];
}

export interface PreviewEditorBootstrapContractOptions<
  TSvg = unknown,
  TModel extends PreviewEditorBootstrapRuntimeModel = PreviewEditorBootstrapRuntimeModel,
  TGridInfo = unknown,
> {
  previewBridgeHost:
    CreatePreviewEditorBootstrapFacadeFromEditorHostOptions<TSvg, TModel, TGridInfo>['svgLoad']['previewBridgeHost'];
  previewBridgeRender:
    CreatePreviewEditorBootstrapFacadeFromEditorHostOptions<TSvg, TModel, TGridInfo>['svgLoad']['previewBridgeRender'];
}

export interface CreatePreviewEditorBootstrapFacadeFromRuntimeOptions<
  TSvg = unknown,
  TModel extends PreviewEditorBootstrapRuntimeModel = PreviewEditorBootstrapRuntimeModel,
  TGridInfo = unknown,
> {
  shared: PreviewEditorBootstrapSharedOptions<TSvg, TModel, TGridInfo>;
  contracts: PreviewEditorBootstrapContractOptions<TSvg, TModel, TGridInfo>;
  componentTree: RuntimeBootstrapComponentTreeOptions;
  svgLoad: RuntimeBootstrapSvgLoadOptions<TSvg, TModel, TGridInfo>;
  navigation: PreviewEditorBootstrapNavigationOptions;
  runtimeBootstrap?: RuntimeBootstrapFacadeRuntimeOptions | null;
  hasRenderedStageSvg?: (() => boolean) | null;
}

export interface PreviewEditorBootstrapFacade {
  loadTree: (
    canonicalState?: PreviewDiagramBootstrapState | null,
  ) => Promise<PreviewComponentTreeLoadMode>;
  loadSvg: (
    invocation?: PreviewLoadInvocationOptions | null,
  ) => Promise<PreviewLoadExecutionMode>;
  signalDiagramLoaded: () => number;
  whenDiagramLoaded: () => Promise<number>;
  syncBrowseNavToLocation: () => void;
  attemptDiagramNavigation: (nextUrl: string | null | undefined, syncUi: () => void) => boolean;
  bootstrapEditorRuntime: () => void;
}

export function createPreviewEditorBootstrapFacadeFromEditorHost<
  TSvg = unknown,
  TModel = unknown,
  TGridInfo = unknown,
>(
  options: CreatePreviewEditorBootstrapFacadeFromEditorHostOptions<TSvg, TModel, TGridInfo>,
): PreviewEditorBootstrapFacade {
  const diagramLoadSignalState = createPreviewDiagramLoadSignalState();

  const runtime: PreviewEditorBootstrapFacade = {
    loadTree(canonicalState = null) {
      return loadPreviewComponentTree({
        ...options.componentTree,
        canonicalState,
      });
    },
    loadSvg(invocation = null) {
      return loadPreviewSvg(createLoadPreviewSvgHostOptionsFromRuntime({
        ...options.svgLoad,
        invocation,
        slug: options.slug,
        loadTree: async (canonicalState) => {
          await runtime.loadTree(canonicalState);
        },
        signalDiagramLoaded: () => {
          runtime.signalDiagramLoaded();
        },
      }));
    },
    signalDiagramLoaded() {
      return signalPreviewDiagramLoaded(
        diagramLoadSignalState,
        options.previewWindow,
        options.slug,
      );
    },
    whenDiagramLoaded() {
      return whenPreviewDiagramLoaded(
        diagramLoadSignalState,
        options.hasRenderedStageSvg
          ?? (() => Boolean(options.document.querySelector('#stage svg'))),
      );
    },
    syncBrowseNavToLocation() {
      syncPreviewBrowseLinksToPath(
        Array.from(
          options.document.querySelectorAll(
            options.navigation.browseLinkSelector ?? '.dg-browse-link',
          ),
        ),
        options.previewWindow.location.pathname,
      );
    },
    attemptDiagramNavigation(nextUrl, syncUi) {
      return attemptPreviewDiagramNavigation({
        nextUrl,
        currentPath: options.previewWindow.location.pathname,
        origin: options.previewWindow.location.origin,
        isDirty: options.navigation.isDirty(),
        confirmNavigation: (message) => options.previewWindow.confirm(message),
        dirtyConfirmMessage: options.navigation.dirtyConfirmMessage,
        syncUi,
        setAllowInternalDirtyNavigation: options.navigation.setAllowInternalDirtyNavigation,
        assignLocation: (nextPath) => {
          options.previewWindow.location.assign(nextPath);
        },
      });
    },
    bootstrapEditorRuntime() {
      if (!options.runtimeBootstrap) {
        throw new Error('preview editor bootstrap facade requires runtime bootstrap host options');
      }
      bootstrapPreviewEditorRuntime(createBootstrapPreviewEditorRuntimeOptionsFromHost({
        ...options.runtimeBootstrap,
        document: options.document as Document,
        previewWindow: options.previewWindow,
        slug: options.slug,
        syncBrowseNav: () => {
          runtime.syncBrowseNavToLocation();
        },
        attemptNavigation: (nextUrl, syncUi) => runtime.attemptDiagramNavigation(nextUrl, syncUi),
        reloadDiagram: (invocation) => runtime.loadSvg(invocation as PreviewLoadInvocationOptions | null),
      }));
    },
  };

  return runtime;
}

export function createPreviewEditorBootstrapFacadeFromRuntime<
  TSvg = unknown,
  TModel extends PreviewEditorBootstrapRuntimeModel = PreviewEditorBootstrapRuntimeModel,
  TGridInfo = unknown,
>(
  options: CreatePreviewEditorBootstrapFacadeFromRuntimeOptions<TSvg, TModel, TGridInfo>,
): PreviewEditorBootstrapFacade {
  return createPreviewEditorBootstrapFacadeFromEditorHost({
    document: options.shared.document,
    previewWindow: options.shared.previewWindow,
    slug: options.shared.slug,
    componentTree: {
      ...options.componentTree,
      model: options.shared.model,
    },
    svgLoad: {
      ...options.svgLoad,
      stage: options.shared.stage,
      engine: options.shared.engine,
      gridEnabled: options.shared.gridEnabled,
      previewBridgeHost: options.contracts.previewBridgeHost,
      previewBridgeRender: options.contracts.previewBridgeRender,
      previewSaveClient: options.shared.previewSaveClient,
      dirtyStateSerializer: options.shared.editorState,
      overrides: options.shared.getOverrides(),
      model: options.shared.model,
      selectionState: {
        ...options.svgLoad.selectionState,
        selectedIds: options.shared.selectedIds,
      },
    },
    navigation: options.navigation,
    runtimeBootstrap: options.runtimeBootstrap
      ? {
        ...options.runtimeBootstrap,
        model: options.shared.model,
        selectedIds: options.shared.selectedIds,
        editorState: options.shared.editorState,
        getOverrides: options.shared.getOverrides,
        previewSaveClient: options.shared.previewSaveClient,
        getFrameTree: options.shared.getFrameTree,
      }
      : null,
    hasRenderedStageSvg: options.hasRenderedStageSvg ?? null,
  });
}
