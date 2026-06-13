import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadFrameYaml } from '../src/frame-yaml-loader.js';
import { layoutElkFrameDiagram } from '../src/elk-layout.js';
import { MockTextAdapter } from '../src/text-measure.js';
import { layoutFrameTree } from '../src/layout.js';
import { deserializeFrameDiagramWire, serializeFrameDiagram } from '../src/frame-serialize.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FRAMES_DIR = join(__dirname, '../../..', 'scripts/diagrams/frames');

function findFrameById(frame: { id: string; children: Array<{ id: string; children: unknown[] }> }, id: string): { id: string; children: Array<{ id: string; children: unknown[] }>; _layout: { placedW: number; placedH: number } } | null {
  if (frame.id === id) {
    return frame as { id: string; children: Array<{ id: string; children: unknown[] }>; _layout: { placedW: number; placedH: number } };
  }
  for (const child of frame.children) {
    const found = findFrameById(child as { id: string; children: Array<{ id: string; children: unknown[] }> }, id);
    if (found) {
      return found;
    }
  }
  return null;
}

function cloneDiagram<T>(diagram: T): T {
  return JSON.parse(JSON.stringify(diagram));
}

function semanticBoundsForDiagram(diagramInput: ReturnType<typeof loadFrameYaml>) {
  const adapter = new MockTextAdapter();
  const semanticDiagram = deserializeFrameDiagramWire(
    cloneDiagram(serializeFrameDiagram(diagramInput)) as Record<string, unknown>,
  );
  layoutFrameTree(semanticDiagram.root, adapter, {
    gridCols: semanticDiagram.gridCols,
    gridColGap: semanticDiagram.gridColGap,
    gridOuterMargin: semanticDiagram.gridOuterMargin,
    arrows: semanticDiagram.arrows,
  });
  return semanticDiagram;
}

function semanticBoundsForSlug(slug: string) {
  return semanticBoundsForDiagram(loadFrameYaml(join(FRAMES_DIR, `${slug}.yaml`)));
}

describe('layoutElkFrameDiagram', () => {
  it('lays out frame diagrams whose arrows target container panels', async () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'request-to-hardware-stack.yaml'));
    const adapter = new MockTextAdapter();

    await expect(layoutElkFrameDiagram(diagram, adapter)).resolves.toMatchObject({
      width: expect.any(Number),
      height: expect.any(Number),
    });

    const orch = findFrameById(diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> }, 'orch');
    expect(orch?._layout.placedW).toBeGreaterThan(0);
    expect(orch?._layout.placedH).toBeGreaterThan(0);
    expect(diagram.arrows[0]?.layoutPath?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('respects explicit fixed sizes in the ELK lane', async () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'support-engineering-flow.yaml'));
    const adapter = new MockTextAdapter();
    const ids = [
      'step_problem',
      'step_investigation',
      'step_analysis',
      'step_fix',
      'step_result',
    ];

    for (const id of ids) {
      const frame = findFrameById(
        diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
        id,
      );
      expect(frame).not.toBeNull();
      const target = frame as typeof frame & {
        sizingW: string;
        width: number | undefined;
      };
      target.sizingW = 'FIXED';
      target.sizingH = 'FIXED';
      target.width = 480;
      target.height = 160;
    }

    await layoutElkFrameDiagram(diagram, adapter);

    for (const id of ids) {
      const frame = findFrameById(
        diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
        id,
      );
      expect(frame?._layout.placedW).toBe(480);
      expect(frame?._layout.placedH).toBe(160);
    }
  });

  it('preserves native fill sizing semantics for support-engineering-flow', async () => {
    const semanticDiagram = semanticBoundsForSlug('support-engineering-flow');
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'support-engineering-flow.yaml'));
    const adapter = new MockTextAdapter();
    const ids = [
      'step_problem',
      'step_investigation',
      'step_analysis',
      'step_fix',
      'step_result',
    ];

    await layoutElkFrameDiagram(diagram, adapter);

    for (const id of ids) {
      const elkFrame = findFrameById(
        diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
        id,
      );
      const semanticFrame = findFrameById(
        semanticDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
        id,
      );
      expect(elkFrame?._layout.placedW).toBe(semanticFrame?._layout.placedW);
      expect(elkFrame?._layout.placedH).toBe(semanticFrame?._layout.placedH);
    }
  });

  it('preserves native fill sizing semantics for a vertical fill stack', async () => {
    const diagram = deserializeFrameDiagramWire({
      title: 'Vertical fill stack',
      root: {
        id: 'page',
        direction: 'VERTICAL',
        width: 720,
        sizingW: 'FIXED',
        sizingH: 'HUG',
        children: [
          {
            id: 'short',
            heading: { content: 'Short' },
            label: [{ content: 'Brief text.' }],
            sizingW: 'FILL',
            sizingH: 'HUG',
          },
          {
            id: 'long',
            heading: { content: 'Longer label' },
            label: [{ content: 'This box carries significantly more text and would collapse without preserved fill sizing.' }],
            sizingW: 'FILL',
            sizingH: 'HUG',
          },
        ],
      },
      arrows: [
        { source: 'short', target: 'long' },
      ],
      gridCols: 2,
    } as Record<string, unknown>);
    const semanticDiagram = semanticBoundsForDiagram(diagram);
    const adapter = new MockTextAdapter();
    const ids = ['short', 'long'];

    await layoutElkFrameDiagram(diagram, adapter);

    const shortElk = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'short',
    );
    const longElk = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'long',
    );
    expect(shortElk?._layout.placedW).toBe(longElk?._layout.placedW);

    for (const id of ids) {
      const elkFrame = findFrameById(
        diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
        id,
      );
      const semanticFrame = findFrameById(
        semanticDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
        id,
      );
      expect(elkFrame?._layout.placedH).toBe(semanticFrame?._layout.placedH);
    }
  });

  it('preserves native fill sizing semantics inside nested ELK compounds', async () => {
    const diagram = deserializeFrameDiagramWire({
      title: 'Nested fill compound',
      root: {
        id: 'page',
        direction: 'VERTICAL',
        width: 720,
        sizingW: 'FIXED',
        sizingH: 'HUG',
        children: [
          {
            id: 'panel',
            level: 1,
            direction: 'VERTICAL',
            sizingW: 'FILL',
            sizingH: 'HUG',
            children: [
              {
                id: 'step_a',
                heading: { content: 'A' },
                label: [{ content: 'Short text.' }],
                sizingW: 'FILL',
                sizingH: 'HUG',
              },
              {
                id: 'step_b',
                heading: { content: 'Longer label' },
                label: [{ content: 'This box should preserve native fill sizing inside the compound rather than collapsing to its measured width.' }],
                sizingW: 'FILL',
                sizingH: 'HUG',
              },
            ],
          },
        ],
      },
      arrows: [{ source: 'step_a', target: 'step_b' }],
      gridCols: 2,
    } as Record<string, unknown>);
    const semanticDiagram = semanticBoundsForDiagram(diagram);
    const adapter = new MockTextAdapter();
    const ids = ['step_a', 'step_b'];

    await layoutElkFrameDiagram(diagram, adapter);

    const panel = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'panel',
    );
    expect(panel?._layout.placedW).toBeGreaterThan(0);
    expect(panel?._layout.placedH).toBeGreaterThan(0);

    const shortFrame = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'step_a',
    );
    const longFrame = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'step_b',
    );
    expect(shortFrame?._layout.placedW).toBe(longFrame?._layout.placedW);

    for (const id of ids) {
      const elkFrame = findFrameById(
        diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
        id,
      );
      const semanticFrame = findFrameById(
        semanticDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
        id,
      );
      expect(elkFrame?._layout.placedH).toBe(semanticFrame?._layout.placedH);
    }
  });
});
