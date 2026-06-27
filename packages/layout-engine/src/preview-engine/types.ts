/**
 * Preview-engine manifest contract (spec 025).
 *
 * TypeScript owns engine metadata; Python reads generated JSON from
 * `dist/preview-engine-manifest.json` via `/api/preview-engines` — no Python mirrors.
 */

import type {
  GraphLayoutEngineDescriptor,
  LayeredCorpusFamily,
} from '@diagram-generator/graph-layout-core';

export type PreviewShellMode = 'grid' | 'force' | (string & {});
export type PreviewDocumentKind = 'frame-diagram' | 'sequence' | 'force-spec' | (string & {});
export type PreviewPersistNamespace = string;
export type PreviewViewerSidebarSection = 'elk-layout' | 'graph-layout' | (string & {});
export type PreviewRenderFamily =
  | 'frame-native'
  | 'frame-elk'
  | 'sequence'
  | 'force'
  | (string & {});

export type PreviewControlKind = 'number' | 'enum' | 'boolean' | 'text';

export interface PreviewControlSpec {
  key: string;
  label: string;
  group: string;
  kind: PreviewControlKind;
  defaultValue: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  enumValues?: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  /** Persisted namespace for engine-backed save flows; host lanes own supported values. */
  persistNamespace?: PreviewPersistNamespace;
}

export interface PreviewEngineCapabilities {
  layoutControls: boolean;
  localRelayout: boolean;
  serverRelayout: boolean;
  engineBackedSave: boolean;
  nodeInspector: boolean;
  gridEditing: boolean;
  referenceImage: boolean;
  simulationControls: boolean;
  rawDebugView: boolean;
}

export interface PreviewEngineApiRoutes {
  save?: string;
  spec?: string;
  params?: string;
  tick?: string;
  reset?: string;
  export?: string;
}

export interface PreviewEngineCompatibility {
  /** Authored/compiled document kinds this engine can host. */
  documentKinds: ReadonlyArray<PreviewDocumentKind>;
  /**
   * Required `meta.layout_engine` key when this engine is selected from a
   * frame-YAML-backed preview lane.
   */
  requiredLayoutEngineKey?: string;
  /**
   * Human-readable description of what this engine can render.
   * Shown in the switcher UI as a tooltip or help text.
   */
  description?: string;
  /**
   * Optional frame-diagram-specific compatibility rules. These let manifests
   * declare structural requirements without central engine-id branching.
   */
  frameDiagramRequirements?: {
    /** Minimum number of authored arrows required for this engine to be useful. */
    readonly minArrowCount?: number;
    /**
     * Diagram families this engine should be offered for when the authored frame
     * diagram declares a recognized `meta.diagram_type`.
     *
     * This is an example-fit filter for offer lists and disabled-state messaging,
     * not a hard block on explicitly persisted engine selection.
     */
    readonly offerDiagramTypes?: ReadonlyArray<LayeredCorpusFamily>;
    /**
     * Whether explicit/potential ELK-family selection should be rejected when a
     * fill-sized structural carrier depends on fallback family inference instead
     * of a recognized authored `meta.diagram_type`.
     */
    readonly rejectFillCarrierIdsWithoutDiagramType?: boolean;
    /**
     * Whether carrier ids reported by `summarizeFrameDiagramCompatibility(...)`
     * should block compatibility for this engine.
     */
    readonly rejectUnsupportedCarrierIds?: boolean;
  };
}

export interface FrameDiagramCompatibilitySummary {
  /** ELK layered is only meaningful when the authored frame diagram has connectors. */
  arrowCount: number;
  /** Authored `meta.diagram_type`, when recognized by the frame-YAML loader. */
  diagramType?: string | null;
  /**
   * Non-endpoint structural carriers with endpoint descendants that currently
   * rely on fill sizing semantics.
   */
  fillCarrierIds?: string[];
  /**
   * Structural carriers that the current graph input cannot safely hand to a
   * non-compound layout engine.
   */
  unsupportedCarrierIds?: string[];
  /** @deprecated Prefer `unsupportedCarrierIds`. */
  unsupportedElkCarrierIds: string[];
}

export interface PreviewEngineHostView {
  /** Engine-specific sidebar/view sections the host page should expose. */
  sidebarSections?: ReadonlyArray<PreviewViewerSidebarSection>;
}


/** Serializable manifest consumed by the preview shell and preview server. */
export interface PreviewEngineManifest {
  id: string;
  label: string;
  /** `meta.layout_engine` value when this engine backs a frame YAML diagram. */
  layoutEngineKey?: string;
  shellMode: PreviewShellMode;
  /** Shared render lane used by browser fresh-render and Node preview/SVG flows. */
  renderFamily?: PreviewRenderFamily;
  /** Host-page metadata for engine-specific assets/sections. */
  hostView?: PreviewEngineHostView;
  capabilities: PreviewEngineCapabilities;
  controlSpecs: PreviewControlSpec[];
  /** Graph layout descriptor behind factory-produced graph-layout engines. */
  graphEngine?: GraphLayoutEngineDescriptor;
  /** Relative paths under `/preview/` loaded for this engine lane. */
  scripts: string[];
  apiRoutes?: PreviewEngineApiRoutes;
  compatibility: PreviewEngineCompatibility;
}

export interface PreviewEngineContext {
  layoutEngine?: string | null;
  shellMode?: PreviewShellMode | null;
  previewDocumentKind?: PreviewDocumentKind | null;
  frameDiagramSummary?: FrameDiagramCompatibilitySummary | null;
}

export interface CompatibilityEvaluationOptions {
  /**
   * `offer` enforces product-facing example-fit rules for switchers and
   * compatibility lists. `resolve` keeps explicitly selected engines hostable
   * when the engine can still render the document technically.
   */
  mode?: 'offer' | 'resolve';
}

/**
 * Result of evaluating engine compatibility.

 * Provides both the boolean result and a human-readable reason when incompatible.
 */
export interface CompatibilityResult {
  compatible: boolean;
  /** Human-readable reason when incompatible; undefined when compatible. */
  reason?: string;
}
