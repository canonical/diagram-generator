import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadFrameYaml } from '../src/frame-yaml-loader.js';
import { MockTextAdapter } from '../src/text-measure.js';
import {
  evaluatePreviewEngineCompatibility,
  layoutPreviewFrameDiagramForEngine,
  listCompatiblePreviewEngines,
  resolvePreviewEngine,
  summarizeFrameDiagramCompatibility,
  ELK_LAYERED_PREVIEW_ENGINE,
} from '../src/preview-engine/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FRAMES_DIR = join(__dirname, '../../..', 'scripts/diagrams/frames');

interface ProbeFrame {
  id: string;
  children: ProbeFrame[];
  _layout: {
    placedX: number;
    placedY: number;
    placedW: number;
    placedH: number;
  };
}

function findFrameById(frame: ProbeFrame, id: string): ProbeFrame | null {
  if (frame.id === id) {
    return frame;
  }
  for (const child of frame.children) {
    const found = findFrameById(child, id);
    if (found) {
      return found;
    }
  }
  return null;
}

function collectAuthoredLeaves(frame: ProbeFrame, leaves: ProbeFrame[] = []): ProbeFrame[] {
  if (
    frame.children.length === 0
    && frame.id
    && !frame.id.endsWith('__body')
    && !frame.id.endsWith('__heading')
  ) {
    leaves.push(frame);
  }
  for (const child of frame.children) {
    collectAuthoredLeaves(child, leaves);
  }
  return leaves;
}

function expectPlaced(frame: ProbeFrame | null, id: string): asserts frame is ProbeFrame {
  expect(frame, id).not.toBeNull();
  expect(frame?._layout.placedW, `${id} width`).toBeGreaterThan(0);
  expect(frame?._layout.placedH, `${id} height`).toBeGreaterThan(0);
}

function expectInside(parent: ProbeFrame, child: ProbeFrame, label: string): void {
  expect(child._layout.placedX, `${label} left`).toBeGreaterThanOrEqual(parent._layout.placedX);
  expect(child._layout.placedY, `${label} top`).toBeGreaterThanOrEqual(parent._layout.placedY);
  expect(child._layout.placedX + child._layout.placedW, `${label} right`).toBeLessThanOrEqual(
    parent._layout.placedX + parent._layout.placedW,
  );
  expect(child._layout.placedY + child._layout.placedH, `${label} bottom`).toBeLessThanOrEqual(
    parent._layout.placedY + parent._layout.placedH,
  );
}

async function layoutFixture(slug: string) {
  const diagram = loadFrameYaml(join(FRAMES_DIR, `${slug}.yaml`));
  const engine = resolvePreviewEngine({
    layoutEngine: diagram.layoutEngine,
    shellMode: 'grid',
    previewDocumentKind: 'frame-diagram',
    frameDiagramSummary: summarizeFrameDiagramCompatibility(diagram),
  });
  expect(engine, `${slug} resolved engine`).toBeDefined();
  await layoutPreviewFrameDiagramForEngine({
    diagram,
    textAdapter: new MockTextAdapter(),
    engine,
  });
  return { diagram, engine };
}

describe('preview-engine fidelity probes', () => {
  it('keeps mongo-octavia-ha compound children in-band through the preview-engine seam', async () => {
    const { diagram, engine } = await layoutFixture('mongo-octavia-ha');
    expect(engine?.id).toBe('elk-layered');

    const root = diagram.root as unknown as ProbeFrame;
    const leaves = collectAuthoredLeaves(root);
    expect(leaves.length).toBeGreaterThan(0);
    for (const leaf of leaves) {
      expectPlaced(leaf, leaf.id);
    }

    const availabilityZones = findFrameById(root, 'availability_zones');
    expectPlaced(availabilityZones, 'availability_zones');
    for (const zoneId of ['az1', 'az2', 'az3'] as const) {
      const zone = findFrameById(root, zoneId);
      const vm = findFrameById(root, `vm_${zoneId}`);
      const label = findFrameById(root, `${zoneId}_label`);
      expectPlaced(zone, zoneId);
      expectPlaced(vm, `vm_${zoneId}`);
      expectPlaced(label, `${zoneId}_label`);
      expectInside(availabilityZones, zone, zoneId);
      expectInside(zone, vm, `vm_${zoneId}`);
      expectInside(zone, label, `${zoneId}_label`);
      expect(label._layout.placedX).toBeGreaterThanOrEqual(vm._layout.placedX + vm._layout.placedW);
    }
  });

  it('withholds ELK-family engines from tiered author-v1 fill-carrier fixtures without diagram type', () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'tiered-network-architecture.author-v1.yaml'));
    const summary = summarizeFrameDiagramCompatibility(diagram);
    expect(summary.diagramType).toBeNull();
    expect(summary.fillCarrierIds).toEqual([
      'clients_center_top',
      'clients_left_top',
      'clients_right_top',
      'group_center',
      'group_left',
      'group_right',
      'tier2_row',
    ]);

    expect(listCompatiblePreviewEngines({
      shellMode: 'grid',
      previewDocumentKind: 'frame-diagram',
      frameDiagramSummary: summary,
    }).map((entry) => entry.id)).toEqual(['v3']);
    expect(evaluatePreviewEngineCompatibility(ELK_LAYERED_PREVIEW_ENGINE, {
      shellMode: 'grid',
      previewDocumentKind: 'frame-diagram',
      frameDiagramSummary: summary,
    })).toMatchObject({
      compatible: false,
      reason: expect.stringContaining('fill-sized structural carriers'),
    });
    expect(resolvePreviewEngine({
      layoutEngine: 'elk-layered',
      shellMode: 'grid',
      previewDocumentKind: 'frame-diagram',
      frameDiagramSummary: summary,
    })).toBeUndefined();
  });
});
