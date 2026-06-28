import { describe, expect, it } from 'vitest';
import { Direction, Frame, FrameDiagram, Sizing, createArrow, createLine } from '../../src/frame-model.js';
import { MockTextAdapter } from '../../src/text-measure.js';
import { defineGraphLayoutPreviewEngine, type GraphLayoutPreviewEngineDefinition } from '../../src/preview-engine/define-graph-layout-engine.js';
import { evaluatePreviewEngineCompatibility, getPreviewEngine, getPreviewEngineByLayoutKey } from '../../src/preview-engine/registry.js';
import { getPreviewFrameDiagramRenderAdapter } from '../../src/preview-engine/render.js';
import type { FrameDiagramCompatibilitySummary, PreviewDocumentKind } from '../../src/preview-engine/types.js';

function minimalFrameDiagram(layoutEngineKey: string): FrameDiagram {
  return new FrameDiagram({
    title: 'Graph layout contract fixture',
    layoutEngine: layoutEngineKey,
    root: new Frame({
      id: 'page',
      direction: Direction.VERTICAL,
      padding: 24,
      gap: 24,
      children: [
        new Frame({
          id: 'source',
          sizingW: Sizing.FIXED,
          sizingH: Sizing.FIXED,
          width: 120,
          height: 64,
          label: [createLine('Source')],
        }),
        new Frame({
          id: 'target',
          sizingW: Sizing.FIXED,
          sizingH: Sizing.FIXED,
          width: 120,
          height: 64,
          label: [createLine('Target')],
        }),
      ],
    }),
    arrows: [createArrow('source', 'target', { id: 'edge-1' })],
  });
}

function incompatibleDocumentKind(documentKinds: readonly PreviewDocumentKind[]): PreviewDocumentKind {
  for (const candidate of ['sequence', 'force-spec', 'frame-diagram'] as const) {
    if (!documentKinds.includes(candidate)) {
      return candidate;
    }
  }
  return 'contract-incompatible-document-kind';
}

function compatibleFrameDiagramSummary(
  definition: GraphLayoutPreviewEngineDefinition,
): FrameDiagramCompatibilitySummary {
  return {
    arrowCount: 1,
    diagramType: definition.compatibility.frameDiagramRequirements?.offerDiagramTypes?.[0] ?? null,
    fillCarrierIds: [],
    isArrowGraphTree: definition.compatibility.frameDiagramRequirements?.requiresTree ? true : undefined,
    unsupportedCarrierIds: [],
    unsupportedElkCarrierIds: [],
  };
}

export function runGraphLayoutPreviewEngineContract(
  definition: GraphLayoutPreviewEngineDefinition,
): void {
  describe(`${definition.id} graph layout preview engine contract`, () => {
    it('registers a manifest, render adapter, compatibility contract, controls, and layout lane', async () => {
      const { manifest, installUnit } = defineGraphLayoutPreviewEngine(definition);
      const uninstall = installUnit.install();

      try {
        expect(getPreviewEngine(definition.id)).toBe(manifest);
        expect(getPreviewEngineByLayoutKey(definition.layoutEngineKey)).toBe(manifest);
        expect(getPreviewFrameDiagramRenderAdapter(definition.renderFamily)).toBe(definition.renderAdapter);

        for (const documentKind of manifest.compatibility.documentKinds) {
          expect(
            evaluatePreviewEngineCompatibility(manifest, {
              previewDocumentKind: documentKind,
              layoutEngine: definition.layoutEngineKey,
              frameDiagramSummary: compatibleFrameDiagramSummary(definition),
            }),
          ).toEqual({ compatible: true });
        }

        const incompatible = evaluatePreviewEngineCompatibility(manifest, {
          previewDocumentKind: incompatibleDocumentKind(manifest.compatibility.documentKinds),
          layoutEngine: definition.layoutEngineKey,
          frameDiagramSummary: { arrowCount: 1, unsupportedElkCarrierIds: [] },
        });
        expect(incompatible.compatible).toBe(false);
        expect(incompatible.reason).toBeTruthy();

        const keys = new Set<string>();
        for (const spec of manifest.controlSpecs) {
          expect(keys.has(spec.key)).toBe(false);
          keys.add(spec.key);
          expect(spec.persistNamespace).toBeTruthy();
        }

        expect(definition.graphEngine.id).toBe(definition.id);
        expect(definition.graphEngine.capabilities.directions.length).toBeGreaterThan(0);
        expect(manifest.graphEngine).toEqual(definition.graphEngine);
        expect(manifest.capabilities.serverRelayout).toBe(true);
        expect(manifest.capabilities.engineBackedSave).toBe(true);
        expect(manifest.capabilities.gridEditing).toBe(false);
        expect(manifest.renderFamily).toBe(definition.renderFamily);
        expect(manifest.layoutEngineKey).toBe(definition.layoutEngineKey);
        if (!definition.graphEngine.capabilities.compounds.nestedChildren) {
          expect(manifest.compatibility.frameDiagramRequirements?.rejectUnsupportedCarrierIds).toBe(true);
        }

        const layout = await definition.renderAdapter({
          diagram: minimalFrameDiagram(definition.layoutEngineKey),
          textAdapter: new MockTextAdapter(),
          engine: manifest,
          elkOptionOverrides: {},
        });
        expect(layout.width).toBeGreaterThan(0);
        expect(layout.height).toBeGreaterThan(0);
      } finally {
        uninstall?.();
      }

      expect(getPreviewEngine(definition.id)).toBeUndefined();
      expect(getPreviewFrameDiagramRenderAdapter(definition.renderFamily)).toBeUndefined();
    });
  });
}
