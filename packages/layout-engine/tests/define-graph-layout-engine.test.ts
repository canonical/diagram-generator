import { describe, expect, it } from 'vitest';
import type { GraphLayoutEngineDescriptor } from '@diagram-generator/graph-layout-core';
import {
  defineGraphLayoutPreviewEngine,
  paramSpecToPreviewControl,
  type GraphLayoutPreviewEngineDefinition,
} from '../src/preview-engine/index.js';
import { runGraphLayoutPreviewEngineContract } from './helpers/graph-layout-engine-contract.js';

const SYNTHETIC_GRAPH_ENGINE: GraphLayoutEngineDescriptor = {
  id: 'contract-graph',
  capabilities: {
    directions: ['TB', 'LR'],
    honorsDirectionHints: true,
    sizing: {
      requiresInputNodeSizes: true,
      returnsPlacedNodeSizes: true,
    },
    ports: {
      explicitPorts: false,
      sideAnchors: false,
      pointAnchors: false,
      implicitEndpointPorts: true,
    },
    edgeLabels: {
      measuredBoxes: false,
      placementHints: false,
    },
    constraints: {
      order: false,
      alignment: false,
    },
    compounds: {
      nestedChildren: false,
      paddingInsets: false,
    },
  },
};

const SYNTHETIC_DEFINITION: GraphLayoutPreviewEngineDefinition = {
  id: 'contract-graph',
  label: 'Contract graph layout',
  layoutEngineKey: 'contract-graph',
  renderFamily: 'frame-contract-graph',
  graphEngine: SYNTHETIC_GRAPH_ENGINE,
  controlSpecs: [
    paramSpecToPreviewControl({
      key: 'contract.spacing',
      label: 'Spacing',
      group: 'Graph',
      kind: 'number',
      defaultValue: '24',
      min: 0,
      max: 128,
      step: 8,
    }, 'meta.contract-graph'),
  ],
  sidebarSections: ['layout-params'],
  compatibility: {
    description: 'Synthetic graph engine used to test the onboarding factory',
    frameDiagramRequirements: {
      rejectUnsupportedCarrierIds: true,
    },
  },
  renderAdapter: async () => ({
    width: 240,
    height: 160,
    coerced: new Map(),
  }),
  scripts: ['contract-graph.js'],
};

describe('defineGraphLayoutPreviewEngine', () => {
  it('builds graph-layout preview manifests with factory defaults and overrides', () => {
    const { manifest, installUnit } = defineGraphLayoutPreviewEngine({
      ...SYNTHETIC_DEFINITION,
      capabilities: {
        rawDebugView: true,
      },
      compatibility: {
        documentKinds: ['contract-doc'],
        requiredLayoutEngineKey: 'contract-layout-key',
      },
    });

    expect(installUnit.key).toBe('contract-graph');
    expect(manifest).toMatchObject({
      id: 'contract-graph',
      label: 'Contract graph layout',
      layoutEngineKey: 'contract-graph',
      shellMode: 'grid',
      renderFamily: 'frame-contract-graph',
      hostView: {
        sidebarSections: ['layout-params'],
      },
      capabilities: {
        layoutControls: true,
        localRelayout: false,
        serverRelayout: true,
        engineBackedSave: true,
        nodeInspector: true,
        gridEditing: false,
        referenceImage: true,
        simulationControls: false,
        rawDebugView: true,
      },
      scripts: ['contract-graph.js'],
    });
    expect(manifest.compatibility.documentKinds).toEqual(['frame-diagram', 'contract-doc']);
    expect(manifest.compatibility.requiredLayoutEngineKey).toBe('contract-layout-key');
    expect(manifest.controlSpecs).toEqual(SYNTHETIC_DEFINITION.controlSpecs);
    expect(manifest.graphEngine).toEqual(SYNTHETIC_GRAPH_ENGINE);
  });
});

runGraphLayoutPreviewEngineContract(SYNTHETIC_DEFINITION);
