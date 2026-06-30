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
    sidebarSections: ['layout-params'],
    capabilities: {
      ...(options.capabilities ?? {}),
      rawDebugView: options.capabilities?.rawDebugView ?? true,
    },
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
    scripts: ['layout-params-controls.js', 'layout-params-controller.js'],
  });
}
