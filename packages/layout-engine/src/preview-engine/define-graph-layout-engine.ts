import type { GraphLayoutEngineDescriptor } from '@diagram-generator/graph-layout-core';
import type {
  PreviewEngineCapabilities,
  PreviewEngineCompatibility,
  PreviewEngineManifest,
  PreviewRenderFamily,
  PreviewViewerSidebarSection,
  PreviewControlSpec,
} from './types.js';
import type { PreviewFrameDiagramRenderAdapter } from './render.js';
import { registerPreviewFrameDiagramRenderAdapter } from './render.js';
import { registerPreviewEngine } from './registry.js';
import type { PreviewEngineInstallUnit } from './install-units.js';
import { FRAME_PREVIEW_SHELL_MODE } from './shell-mode.js';

export interface GraphLayoutPreviewEngineDefinition {
  /** Manifest identity (e.g. 'elk-force'). */
  id: string;
  label: string;
  algorithmClass: string;
  /** meta.layout_engine value (usually === id). */
  layoutEngineKey: string;
  /** Shared render lane key (e.g. 'frame-elk-force'); used by render adapter. */
  renderFamily: PreviewRenderFamily;
  /** Graph engine capability descriptor from a graph-layout-* package. */
  graphEngine: GraphLayoutEngineDescriptor;
  /** Engine-specific tunable params, already in PreviewControlSpec shape. */
  controlSpecs: PreviewControlSpec[];
  /** Sidebar sections this engine exposes (e.g. ['layout-params']). */
  sidebarSections?: PreviewViewerSidebarSection[];
  /** Capability flags for preview chrome gating (defaults provided). */
  capabilities?: Partial<PreviewEngineCapabilities>;
  /** Frame-diagram compatibility rules (min arrows, etc). */
  compatibility?: Partial<PreviewEngineCompatibility>;
  /** The frame render adapter for this engine's renderFamily. */
  renderAdapter: PreviewFrameDiagramRenderAdapter;
  /** Browser script files this engine lane needs (default []). */
  scripts?: string[];
}

export interface DefinedGraphLayoutPreviewEngine {
  manifest: PreviewEngineManifest;
  installUnit: PreviewEngineInstallUnit;
}

const DEFAULT_GRAPH_LAYOUT_CAPABILITIES: PreviewEngineCapabilities = {
  layoutControls: true,
  localRelayout: false,
  serverRelayout: true,
  engineBackedSave: true,
  nodeInspector: true,
  gridEditing: false,
  referenceImage: true,
  simulationControls: false,
  rawDebugView: false,
};

function mergeDocumentKinds(
  compatibility: Partial<PreviewEngineCompatibility> | undefined,
): PreviewEngineCompatibility['documentKinds'] {
  return Array.from(new Set(['frame-diagram', ...(compatibility?.documentKinds ?? [])]));
}

function buildManifest(def: GraphLayoutPreviewEngineDefinition): PreviewEngineManifest {
  const compatibility: PreviewEngineCompatibility = {
    ...def.compatibility,
    documentKinds: mergeDocumentKinds(def.compatibility),
    requiredLayoutEngineKey: def.compatibility?.requiredLayoutEngineKey ?? def.layoutEngineKey,
    description: def.compatibility?.description ?? def.label,
  };

  return {
    id: def.id,
    label: def.label,
    algorithmClass: def.algorithmClass,
    layoutEngineKey: def.layoutEngineKey,
    shellMode: FRAME_PREVIEW_SHELL_MODE,
    renderFamily: def.renderFamily,
    hostView: {
      sidebarSections: def.sidebarSections ?? [],
    },
    capabilities: {
      ...DEFAULT_GRAPH_LAYOUT_CAPABILITIES,
      ...def.capabilities,
    },
    controlSpecs: def.controlSpecs,
    graphEngine: def.graphEngine,
    scripts: def.scripts ?? [],
    compatibility,
  };
}

function uninstallInReverse(unregisterers: Array<() => void>): void {
  for (let index = unregisterers.length - 1; index >= 0; index -= 1) {
    unregisterers[index]?.();
  }
}

export function defineGraphLayoutPreviewEngine(
  def: GraphLayoutPreviewEngineDefinition,
): DefinedGraphLayoutPreviewEngine {
  const manifest = buildManifest(def);

  return {
    manifest,
    installUnit: {
      key: def.id,
      install() {
        const unregisterers: Array<() => void> = [];
        try {
          unregisterers.push(registerPreviewEngine(manifest));
          unregisterers.push(registerPreviewFrameDiagramRenderAdapter(def.renderFamily, def.renderAdapter));
          return () => uninstallInReverse(unregisterers);
        } catch (error) {
          uninstallInReverse(unregisterers);
          throw error;
        }
      },
    },
  };
}
