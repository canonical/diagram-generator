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
  return defineGraphLayoutPreviewEngine({
    ...options,
    sidebarSections: ['elk-layout'],
    compatibility: {
      description: options.description,
      frameDiagramRequirements: {
        minArrowCount: 1,
        rejectUnsupportedCarrierIds: true,
      },
      ...(options.compatibility ?? {}),
    },
    scripts: ['elk-layout-controls.js', 'elk-controller.js'],
  });
}
