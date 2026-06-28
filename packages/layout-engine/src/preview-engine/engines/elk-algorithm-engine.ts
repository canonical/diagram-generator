import {
  defineGraphLayoutPreviewEngine,
  type DefinedGraphLayoutPreviewEngine,
  type GraphLayoutPreviewEngineDefinition,
} from '../define-graph-layout-engine.js';

export interface ElkAlgorithmPreviewEngineOptions extends GraphLayoutPreviewEngineDefinition {
  description: string;
}

export function defineElkAlgorithmPreviewEngine(
  options: ElkAlgorithmPreviewEngineOptions,
): DefinedGraphLayoutPreviewEngine {
  const compatibility = options.compatibility ?? {};
  return defineGraphLayoutPreviewEngine({
    ...options,
    sidebarSections: ['elk-layout'],
    compatibility: {
      ...compatibility,
      description: options.description,
      frameDiagramRequirements: {
        minArrowCount: 1,
        rejectFillCarrierIdsWithoutDiagramType: true,
        rejectUnsupportedCarrierIds: true,
        ...(compatibility.frameDiagramRequirements ?? {}),
      },
    },
    scripts: ['elk-layout-controls.js', 'elk-controller.js'],
  });
}
