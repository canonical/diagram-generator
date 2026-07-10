import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadFrameYaml } from '../src/frame-yaml-loader.js';
import { layoutElkFrameDiagram } from '../src/elk-layout.js';
import { applyPreviewOverridesToFrameTree } from '../src/preview-shell/app-relayout.js';
import { MockTextAdapter } from '../src/text-measure.js';
import { layoutFrameTree } from '../src/layout.js';
import { deserializeFrameDiagramWire, serializeFrameDiagram } from '../src/frame-serialize.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FRAMES_DIR = join(__dirname, '../../..', 'diagrams/1.input');

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

function expectPortAttachment(
  points: Array<[number, number]>,
  expectedStart: [number, number],
  expectedEnd: [number, number],
) {
  expect(points.length).toBeGreaterThanOrEqual(2);
  expect(points[0]).toEqual(expectedStart);
  expect(points[points.length - 1]).toEqual(expectedEnd);
}

function expectPointInsideHorizontalSpan(
  point: [number, number],
  frame: { _layout: { placedX: number; placedW: number } } | null,
) {
  expect(point[0]).toBeGreaterThanOrEqual(frame?._layout.placedX ?? Infinity);
  expect(point[0]).toBeLessThanOrEqual((frame?._layout.placedX ?? -Infinity) + (frame?._layout.placedW ?? 0));
}

function expectPointInsideVerticalSpan(
  point: [number, number],
  frame: { _layout: { placedY: number; placedH: number } } | null,
) {
  expect(point[1]).toBeGreaterThanOrEqual(frame?._layout.placedY ?? Infinity);
  expect(point[1]).toBeLessThanOrEqual((frame?._layout.placedY ?? -Infinity) + (frame?._layout.placedH ?? 0));
}

function expectRightSideAttachment(
  point: [number, number],
  frame: { _layout: { placedX: number; placedY: number; placedW: number; placedH: number } } | null,
) {
  expectPointInsideVerticalSpan(point, frame);
  expect(point[0]).toBeGreaterThan((frame?._layout.placedX ?? 0) + ((frame?._layout.placedW ?? 0) / 2));
}

function expectLeftSideAttachment(
  point: [number, number],
  frame: { _layout: { placedX: number; placedY: number; placedW: number; placedH: number } } | null,
) {
  expectPointInsideVerticalSpan(point, frame);
  expect(point[0]).toBeLessThan((frame?._layout.placedX ?? 0) + ((frame?._layout.placedW ?? 0) / 2));
}

function expectOrthogonalPath(points: Array<[number, number]>) {
  expect(points.length).toBeGreaterThanOrEqual(2);
  for (let i = 1; i < points.length; i += 1) {
    const [prevX, prevY] = points[i - 1]!;
    const [nextX, nextY] = points[i]!;
    expect(
      prevX === nextX || prevY === nextY,
      `segment ${i - 1} -> ${i} should be orthogonal: (${prevX}, ${prevY}) -> (${nextX}, ${nextY})`,
    ).toBe(true);
  }
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

function applyFillOverrides(diagram: ReturnType<typeof loadFrameYaml>, ids: string[]) {
  applyPreviewOverridesToFrameTree(
    diagram,
    Object.fromEntries(ids.map((id) => [id, { sizing_w: 'FILL', sizing_h: 'FILL' }])),
  );
}

function relativeInset(
  parent: { _layout: { placedX: number; placedY: number; placedW: number; placedH: number } } | null,
  child: { _layout: { placedX: number; placedY: number; placedW: number; placedH: number } } | null,
) {
  if (!parent || !child) {
    return null;
  }
  return {
    top: child._layout.placedY - parent._layout.placedY,
    left: child._layout.placedX - parent._layout.placedX,
    right: (parent._layout.placedX + parent._layout.placedW)
      - (child._layout.placedX + child._layout.placedW),
    bottom: (parent._layout.placedY + parent._layout.placedH)
      - (child._layout.placedY + child._layout.placedH),
  };
}

function expectChromeRhythm(
  actual: ReturnType<typeof relativeInset> | null,
  expected: ReturnType<typeof relativeInset> | null,
) {
  expect(actual).not.toBeNull();
  expect(expected).not.toBeNull();
  expect(actual?.top).toBe(expected?.top);
  expect(actual?.left).toBe(expected?.left);
  expect(actual?.right).toBe(expected?.right);
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

  it('preserves native fill sizing semantics for request-to-hardware-stack endpoint compounds', async () => {
    const ids = ['user', 'orch', 'runtime', 'kernel', 'driver', 'hardware'];
    const semanticDiagram = loadFrameYaml(join(FRAMES_DIR, 'request-to-hardware-stack.yaml'));
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'request-to-hardware-stack.yaml'));
    const adapter = new MockTextAdapter();

    applyFillOverrides(semanticDiagram, ids);
    applyFillOverrides(diagram, ids);

    const semanticLayout = semanticBoundsForDiagram(semanticDiagram);

    await layoutElkFrameDiagram(diagram, adapter);

    const semanticFirst = findFrameById(
      semanticLayout.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      ids[0]!,
    );
    expect(semanticFirst?._layout.placedW).toBeGreaterThan(0);
    expect(semanticFirst?._layout.placedH).toBeGreaterThan(0);

    for (const id of ids) {
      const elkFrame = findFrameById(
        diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
        id,
      );
      const semanticFrame = findFrameById(
        semanticLayout.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
        id,
      );
      expect(elkFrame?._layout.placedW).toBe(semanticFrame?._layout.placedW);
      expect(elkFrame?._layout.placedH).toBe(semanticFrame?._layout.placedH);
    }

    const orch = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'orch',
    );
    const orchHeading = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'orch__heading',
    );
    const orchBody = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'orch__body',
    );

    expect(orchHeading?._layout.placedY).toBeGreaterThanOrEqual(orch?._layout.placedY ?? -Infinity);
    expect((orchHeading?._layout.placedY ?? 0) + (orchHeading?._layout.placedH ?? 0))
      .toBeLessThanOrEqual(orchBody?._layout.placedY ?? Infinity);
    expect(orchBody?._layout.placedX).toBeGreaterThanOrEqual(orch?._layout.placedX ?? -Infinity);
    expect((orchBody?._layout.placedX ?? 0) + (orchBody?._layout.placedW ?? 0))
      .toBeLessThanOrEqual((orch?._layout.placedX ?? 0) + (orch?._layout.placedW ?? 0));
    expect((orchBody?._layout.placedY ?? 0) + (orchBody?._layout.placedH ?? 0))
      .toBeLessThanOrEqual((orch?._layout.placedY ?? 0) + (orch?._layout.placedH ?? 0));
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

  it('keeps synthesized heading rows inside ELK endpoint containers', async () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'example-platform-architecture.yaml'));
    const adapter = new MockTextAdapter();

    await layoutElkFrameDiagram(diagram, adapter);

    const frontend = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'frontend',
    );
    const frontendHeading = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'frontend__heading',
    );
    const frontendBody = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'frontend__body',
    );
    const services = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'services',
    );
    const servicesHeading = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'services__heading',
    );
    const servicesBody = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'services__body',
    );

    expect(frontendHeading?._layout.placedY).toBeGreaterThanOrEqual(frontend?._layout.placedY ?? -Infinity);
    expect(frontendHeading?._layout.placedY).toBeLessThan(frontendBody?._layout.placedY ?? Infinity);
    expect(
      (frontendHeading?._layout.placedY ?? 0) + (frontendHeading?._layout.placedH ?? 0),
    ).toBeLessThanOrEqual((frontend?._layout.placedY ?? 0) + (frontend?._layout.placedH ?? 0));

    expect(servicesHeading?._layout.placedY).toBeGreaterThanOrEqual(services?._layout.placedY ?? -Infinity);
    expect(servicesHeading?._layout.placedY).toBeLessThan(servicesBody?._layout.placedY ?? Infinity);
    expect(
      (servicesHeading?._layout.placedY ?? 0) + (servicesHeading?._layout.placedH ?? 0),
    ).toBeLessThanOrEqual((services?._layout.placedY ?? 0) + (services?._layout.placedH ?? 0));
  });

  it('matches semantic headed chrome insets for ELK compounds', async () => {
    for (const slug of ['example-platform-architecture', 'complex-routing-usecase']) {
      const semanticDiagram = semanticBoundsForSlug(slug);
      const elkDiagram = loadFrameYaml(join(FRAMES_DIR, `${slug}.yaml`));
      const adapter = new MockTextAdapter();

      await layoutElkFrameDiagram(elkDiagram, adapter);

      const walkHeadedIds = (frame: { id: string; children: Array<{ id: string; children: unknown[] }> }): string[] => {
        const ids: string[] = [];
        if (frame.children.some((child) => child.id === `${frame.id}__body`)) {
          ids.push(frame.id);
        }
        for (const child of frame.children) {
          ids.push(...walkHeadedIds(child as { id: string; children: Array<{ id: string; children: unknown[] }> }));
        }
        return ids;
      };

      for (const id of walkHeadedIds(
        semanticDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      )) {
        const semanticParent = findFrameById(
          semanticDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
          id,
        );
        const semanticHeading = findFrameById(
          semanticDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
          `${id}__heading`,
        );
        const semanticBody = findFrameById(
          semanticDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
          `${id}__body`,
        );
        const elkParent = findFrameById(
          elkDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
          id,
        );
        const elkHeading = findFrameById(
          elkDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
          `${id}__heading`,
        );
        const elkBody = findFrameById(
          elkDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
          `${id}__body`,
        );

        expectChromeRhythm(relativeInset(elkParent, elkBody), relativeInset(semanticParent, semanticBody));
        expectChromeRhythm(
          relativeInset(elkParent, elkHeading),
          relativeInset(semanticParent, semanticHeading),
        );
        expect((elkBody?._layout.placedY ?? 0) - (
          (elkHeading?._layout.placedY ?? 0) + (elkHeading?._layout.placedH ?? 0)
        )).toBe(
          (semanticBody?._layout.placedY ?? 0) - (
            (semanticHeading?._layout.placedY ?? 0) + (semanticHeading?._layout.placedH ?? 0)
          ),
        );
      }
    }
  });

  it('lays out nested structural carriers that contain endpoint descendants', async () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'tiered-network-architecture.yaml'));
    const adapter = new MockTextAdapter();

    await expect(layoutElkFrameDiagram(diagram, adapter)).resolves.toMatchObject({
      width: expect.any(Number),
      height: expect.any(Number),
    });

    const tier2Row = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'tier2_row',
    );
    const groupLeft = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'group_left',
    );
    const clientsLeftTop = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'clients_left_top',
    );
    const clientL1 = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'client_l1',
    );
    const clientL2 = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'client_l2',
    );

    expect(tier2Row?._layout.placedW).toBeGreaterThan(0);
    expect(groupLeft?._layout.placedW).toBeGreaterThan(0);
    expect(clientsLeftTop?._layout.placedW).toBeGreaterThan(0);
    expect(clientL1?._layout.placedW).toBeGreaterThan(0);
    expect(clientL2?._layout.placedW).toBeGreaterThan(0);
    expect(clientL1?._layout.placedX).toBeGreaterThanOrEqual(clientsLeftTop?._layout.placedX ?? -Infinity);
    expect(clientL2?._layout.placedX).toBeGreaterThanOrEqual(clientsLeftTop?._layout.placedX ?? -Infinity);
  });

  it('keeps mongo-octavia-ha availability-zone wrappers and labels attached to their compounds', async () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'mongo-octavia-ha.yaml'));
    const semanticDiagram = semanticBoundsForDiagram(diagram);
    const adapter = new MockTextAdapter();

    await layoutElkFrameDiagram(diagram, adapter);

    const availabilityZones = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'availability_zones',
    );
    const semanticAvailabilityZones = findFrameById(
      semanticDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'availability_zones',
    );
    expect(availabilityZones?._layout.placedH).toBeGreaterThanOrEqual(
      (semanticAvailabilityZones?._layout.placedH ?? 0) - 8,
    );
    const zoneIds = ['az1', 'az2', 'az3'] as const;
    for (const zoneId of zoneIds) {
      const zone = findFrameById(
        diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
        zoneId,
      );
      const vm = findFrameById(
        diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
        `vm_${zoneId}`,
      );
      const label = findFrameById(
        diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
        `${zoneId}_label`,
      );

      expect(zone?._layout.placedW).toBeGreaterThan(vm?._layout.placedW ?? Infinity);
      expect(label?._layout.placedX).toBeGreaterThanOrEqual(zone?._layout.placedX ?? Infinity);
      expect((label?._layout.placedX ?? 0) + (label?._layout.placedW ?? 0))
        .toBeLessThanOrEqual((zone?._layout.placedX ?? -Infinity) + (zone?._layout.placedW ?? 0));
      expect(label?._layout.placedX).toBeGreaterThanOrEqual(
        (vm?._layout.placedX ?? 0) + (vm?._layout.placedW ?? 0),
      );
      expect(label?._layout.placedY).toBeGreaterThanOrEqual(
        zone?._layout.placedY ?? Infinity,
      );
      expect((label?._layout.placedY ?? 0) + (label?._layout.placedH ?? 0))
        .toBeLessThanOrEqual((zone?._layout.placedY ?? -Infinity) + (zone?._layout.placedH ?? 0));
    }
  });

  it('keeps same-layer gap overrides effective along the authored horizontal ELK axis', async () => {
    const baseDiagram = loadFrameYaml(join(FRAMES_DIR, 'complex-routing-usecase.yaml'));
    const gapDiagram = loadFrameYaml(join(FRAMES_DIR, 'complex-routing-usecase.yaml'));
    const adapter = new MockTextAdapter();

    await layoutElkFrameDiagram(baseDiagram, adapter);
    await layoutElkFrameDiagram(gapDiagram, adapter, {
      elkOptionOverrides: {
        'elk.spacing.nodeNode': '96',
      },
    });

    const basePlanning = findFrameById(
      baseDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'planning',
    );
    const gapPlanning = findFrameById(
      gapDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'planning',
    );
    const baseMeasure = findFrameById(
      baseDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'measure',
    );
    const gapMeasure = findFrameById(
      gapDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'measure',
    );
    const baseImplementation = findFrameById(
      baseDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'implementation',
    );
    const gapImplementation = findFrameById(
      gapDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'implementation',
    );
    const baseDelivery = findFrameById(
      baseDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'delivery',
    );
    const gapDelivery = findFrameById(
      gapDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'delivery',
    );

    expect(gapPlanning?._layout.placedY).toBe(basePlanning?._layout.placedY);
    expect(gapMeasure?._layout.placedY).toBe(baseMeasure?._layout.placedY);
    expect(gapImplementation?._layout.placedX).toBe(baseImplementation?._layout.placedX);
    expect(gapDelivery?._layout.placedY).not.toBe(baseDelivery?._layout.placedY);
  });

  it('keeps process edges attached to source right and target left across ELK spacing changes', async () => {
    const baseDiagram = loadFrameYaml(join(FRAMES_DIR, 'support-engineering-flow.yaml'));
    const gapDiagram = loadFrameYaml(join(FRAMES_DIR, 'support-engineering-flow.yaml'));
    const adapter = new MockTextAdapter();

    await layoutElkFrameDiagram(baseDiagram, adapter);
    await layoutElkFrameDiagram(gapDiagram, adapter, {
      elkOptionOverrides: {
        'elk.layered.spacing.nodeNodeBetweenLayers': '144',
      },
    });

    const baseSource = findFrameById(
      baseDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'step_problem',
    );
    const baseTarget = findFrameById(
      baseDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'step_investigation',
    );
    const gapSource = findFrameById(
      gapDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'step_problem',
    );
    const gapTarget = findFrameById(
      gapDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'step_investigation',
    );

    const baseStart = baseDiagram.arrows[0]?.layoutPath?.[0];
    const baseEnd = baseDiagram.arrows[0]?.layoutPath?.[baseDiagram.arrows[0].layoutPath.length - 1];
    const gapStart = gapDiagram.arrows[0]?.layoutPath?.[0];
    const gapEnd = gapDiagram.arrows[0]?.layoutPath?.[gapDiagram.arrows[0].layoutPath.length - 1];

    expectRightSideAttachment(baseStart ?? [Infinity, Infinity], baseSource);
    expectLeftSideAttachment(baseEnd ?? [Infinity, Infinity], baseTarget);
    expectRightSideAttachment(gapStart ?? [Infinity, Infinity], gapSource);
    expectLeftSideAttachment(gapEnd ?? [Infinity, Infinity], gapTarget);
    expectOrthogonalPath(baseDiagram.arrows[0]?.layoutPath ?? []);
    expectOrthogonalPath(gapDiagram.arrows[0]?.layoutPath ?? []);
  });

  it('honors horizontal root direction overrides in the ELK lane and reroutes arrows side-to-side', async () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'example-deployment-pipeline.yaml'));
    Object.assign(diagram as { layoutEngine?: string; elkLayout?: Record<string, unknown> }, {
      layoutEngine: 'elk-layered',
      elkLayout: {},
    });
    const adapter = new MockTextAdapter();

    applyPreviewOverridesToFrameTree(diagram, {
      root: {
        direction: 'HORIZONTAL',
      },
    });
    await layoutElkFrameDiagram(diagram, adapter);

    const commit = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'commit',
    );
    const build = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'build',
    );
    const commitToBuild = diagram.arrows.find((arrow) => arrow.source === 'commit' && arrow.target === 'build');
    const start = commitToBuild?.layoutPath?.[0];
    const end = commitToBuild?.layoutPath?.[commitToBuild.layoutPath.length - 1];

    expect((commit?._layout.placedX ?? 0) + (commit?._layout.placedW ?? 0))
      .toBeLessThanOrEqual(build?._layout.placedX ?? -Infinity);
    expect(Math.abs((commit?._layout.placedY ?? 0) - (build?._layout.placedY ?? 0))).toBeLessThanOrEqual(1e-6);

    expectRightSideAttachment(start ?? [Infinity, Infinity], commit);
    expectLeftSideAttachment(end ?? [Infinity, Infinity], build);
    expectOrthogonalPath(commitToBuild?.layoutPath ?? []);
  });

  it('keeps passive top-level siblings visible when only one sibling participates in the arrow graph', async () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'preview-smoke.yaml'));
    const adapter = new MockTextAdapter();

    const result = await layoutElkFrameDiagram(diagram, adapter);

    const sources = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'sources',
    );
    const workflow = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'workflow',
    );
    const planning = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'planning',
    );
    const implement = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'implement',
    );

    expect(result.elkSnapshot?.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      'sources',
      'workflow',
      'planning',
    ]));

    for (const frame of [sources, workflow, planning, implement]) {
      expect(frame?._layout.placedW).toBeGreaterThan(0);
      expect(frame?._layout.placedH).toBeGreaterThan(0);
    }

    const topLevelFrames = [sources, workflow, planning]
      .filter((frame): frame is NonNullable<typeof frame> => Boolean(frame));
    const boxesOverlap = (
      left: NonNullable<typeof sources>,
      right: NonNullable<typeof sources>,
    ) => (
      left._layout.placedX < right._layout.placedX + right._layout.placedW
      && left._layout.placedX + left._layout.placedW > right._layout.placedX
      && left._layout.placedY < right._layout.placedY + right._layout.placedH
      && left._layout.placedY + left._layout.placedH > right._layout.placedY
    );
    for (let index = 0; index < topLevelFrames.length; index += 1) {
      for (let compareIndex = index + 1; compareIndex < topLevelFrames.length; compareIndex += 1) {
        expect(
          boxesOverlap(topLevelFrames[index]!, topLevelFrames[compareIndex]!),
          `${topLevelFrames[index]!.id} should not overlap ${topLevelFrames[compareIndex]!.id}`,
        ).toBe(false);
      }
    }
  });

  it('treats headed groups as ELK compounds while keeping headings decorative', async () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'complex-routing-usecase.yaml'));
    const adapter = new MockTextAdapter();

    await layoutElkFrameDiagram(diagram, adapter);

    const planning = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'planning',
    );
    const planningHeading = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'planning__heading',
    );
    const planningBody = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'planning__body',
    );
    const define = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'define',
    );
    const measure = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'measure',
    );
    const implementation = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'implementation',
    );
    const implementationBody = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'implementation__body',
    );
    const devteam = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'devteam',
    );
    const devteamBody = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'devteam__body',
    );
    const implement = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'implement',
    );
    const spike = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'spike',
    );
    const delivery = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'delivery',
    );
    const deliveryBody = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'delivery__body',
    );
    const review = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'review',
    );

    expect((planningHeading?._layout.placedY ?? 0) + (planningHeading?._layout.placedH ?? 0))
      .toBeLessThanOrEqual(planningBody?._layout.placedY ?? Infinity);
    expect((planning?._layout.placedX ?? 0) + (planning?._layout.placedW ?? 0))
      .toBeLessThanOrEqual(implementation?._layout.placedX ?? Infinity);
    expect((planning?._layout.placedX ?? 0) + (planning?._layout.placedW ?? 0))
      .toBeLessThanOrEqual(delivery?._layout.placedX ?? Infinity);
    expect((implementation?._layout.placedY ?? 0) + (implementation?._layout.placedH ?? 0))
      .toBeLessThanOrEqual(delivery?._layout.placedY ?? Infinity);
    expect(implementation?._layout.placedX).toBe(delivery?._layout.placedX);

    expect(define?._layout.placedY).toBeGreaterThanOrEqual(planningBody?._layout.placedY ?? -Infinity);
    expect(measure?._layout.placedY).toBeGreaterThanOrEqual(planningBody?._layout.placedY ?? -Infinity);
    expect(implement?._layout.placedY).toBeGreaterThanOrEqual(devteamBody?._layout.placedY ?? -Infinity);
    expect(spike?._layout.placedY).toBeGreaterThanOrEqual(devteamBody?._layout.placedY ?? -Infinity);
    expect(review?._layout.placedY).toBeGreaterThanOrEqual(deliveryBody?._layout.placedY ?? -Infinity);
    expect((spike?._layout.placedX ?? 0) + (spike?._layout.placedW ?? 0))
      .toBeLessThanOrEqual((devteam?._layout.placedX ?? 0) + (devteam?._layout.placedW ?? 0));
    expect((implement?._layout.placedY ?? 0) + (implement?._layout.placedH ?? 0))
      .toBeLessThanOrEqual((implementationBody?._layout.placedY ?? 0) + (implementationBody?._layout.placedH ?? 0));

    const defineToImplement = diagram.arrows.find((arrow) => arrow.source === 'define' && arrow.target === 'implement');
    const measureToReview = diagram.arrows.find((arrow) => arrow.source === 'measure' && arrow.target === 'review');

    const defineStart = defineToImplement?.layoutPath?.[0];
    const defineEnd = defineToImplement?.layoutPath?.[defineToImplement.layoutPath.length - 1];
    const measureStart = measureToReview?.layoutPath?.[0];
    const measureEnd = measureToReview?.layoutPath?.[measureToReview.layoutPath.length - 1];

    expectRightSideAttachment(defineStart ?? [Infinity, Infinity], define);
    expectLeftSideAttachment(defineEnd ?? [Infinity, Infinity], implement);

    expectRightSideAttachment(measureStart ?? [Infinity, Infinity], measure);
    expectLeftSideAttachment(measureEnd ?? [Infinity, Infinity], review);

    expectOrthogonalPath(defineToImplement?.layoutPath ?? []);
    expectOrthogonalPath(measureToReview?.layoutPath ?? []);
  });

  it('keeps juju client fan-out edges attached to true side midpoints with orthogonal first segments', async () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'juju-bootstrap-machines-process.yaml'));
    const adapter = new MockTextAdapter();

    await layoutElkFrameDiagram(diagram, adapter);

    const client = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'client',
    );
    const cloud = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'cloud',
    );
    const binaries = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'simplestreams_binaries',
    );
    const images = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'simplestreams_images',
    );
    const controller = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'controller_agent',
    );

    const step1 = diagram.arrows.find((arrow) => arrow.id === 'step1');
    const step2 = diagram.arrows.find((arrow) => arrow.id === 'step2');
    const step3 = diagram.arrows.find((arrow) => arrow.id === 'step3');
    const step4 = diagram.arrows.find((arrow) => arrow.id === 'step4');
    const step5 = diagram.arrows.find((arrow) => arrow.id === 'step5');

    expectPortAttachment(
      step1?.layoutPath ?? [],
      [
        (client?._layout.placedX ?? 0) + ((client?._layout.placedW ?? 0) / 2),
        (client?._layout.placedY ?? 0) + (client?._layout.placedH ?? 0),
      ],
      [
        (binaries?._layout.placedX ?? 0) + ((binaries?._layout.placedW ?? 0) / 2),
        binaries?._layout.placedY ?? 0,
      ],
    );
    expectPortAttachment(
      step2?.layoutPath ?? [],
      [
        (client?._layout.placedX ?? 0) + ((client?._layout.placedW ?? 0) / 2),
        (client?._layout.placedY ?? 0) + (client?._layout.placedH ?? 0),
      ],
      [
        (images?._layout.placedX ?? 0) + ((images?._layout.placedW ?? 0) / 2),
        images?._layout.placedY ?? 0,
      ],
    );
    expectPortAttachment(
      step3?.layoutPath ?? [],
      [
        (client?._layout.placedX ?? 0) + ((client?._layout.placedW ?? 0) / 2),
        client?._layout.placedY ?? 0,
      ],
      [
        (cloud?._layout.placedX ?? 0) + ((cloud?._layout.placedW ?? 0) / 2),
        (cloud?._layout.placedY ?? 0) + (cloud?._layout.placedH ?? 0),
      ],
    );
    expectPortAttachment(
      step5?.layoutPath ?? [],
      [
        (client?._layout.placedX ?? 0) + ((client?._layout.placedW ?? 0) / 2),
        (client?._layout.placedY ?? 0) + (client?._layout.placedH ?? 0),
      ],
      [
        (controller?._layout.placedX ?? 0) + ((controller?._layout.placedW ?? 0) / 2),
        controller?._layout.placedY ?? 0,
      ],
    );
    expectPortAttachment(
      step4?.layoutPath ?? [],
      [
        (cloud?._layout.placedX ?? 0) + (cloud?._layout.placedW ?? 0),
        (cloud?._layout.placedY ?? 0) + ((cloud?._layout.placedH ?? 0) / 2),
      ],
      [
        (client?._layout.placedX ?? 0) + (client?._layout.placedW ?? 0),
        (client?._layout.placedY ?? 0) + ((client?._layout.placedH ?? 0) / 2),
      ],
    );

    expectOrthogonalPath(step1?.layoutPath ?? []);
    expectOrthogonalPath(step2?.layoutPath ?? []);
    expectOrthogonalPath(step3?.layoutPath ?? []);
    expectOrthogonalPath(step4?.layoutPath ?? []);
    expectOrthogonalPath(step5?.layoutPath ?? []);
    expect(step3?.layoutPath).toHaveLength(2);
    expect(step3?.layoutPath?.[0]?.[0]).toBe(step3?.layoutPath?.[1]?.[0]);
  });

  it('ignores legacy implementation-owned ELK keys when preview-style session overrides echo them back', async () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'juju-bootstrap-machines-process.yaml'));
    const adapter = new MockTextAdapter();

    await expect(layoutElkFrameDiagram(diagram, adapter, {
      elkOptionOverrides: {
        ...(diagram.elkLayout ?? {}),
      },
    })).resolves.toMatchObject({
      width: expect.any(Number),
      height: expect.any(Number),
    });
  });

  it('keeps layering strategy changes observable on juju ELK layouts', async () => {
    const longestPathDiagram = loadFrameYaml(join(FRAMES_DIR, 'juju-bootstrap-machines-process.yaml'));
    const networkSimplexDiagram = loadFrameYaml(join(FRAMES_DIR, 'juju-bootstrap-machines-process.yaml'));
    const adapter = new MockTextAdapter();

    await layoutElkFrameDiagram(longestPathDiagram, adapter, {
      elkOptionOverrides: {
        'elk.layered.layering.strategy': 'LONGEST_PATH',
      },
    });
    await layoutElkFrameDiagram(networkSimplexDiagram, adapter, {
      elkOptionOverrides: {
        'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
      },
    });

    const longestPathClient = findFrameById(
      longestPathDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'client',
    );
    const networkSimplexClient = findFrameById(
      networkSimplexDiagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'client',
    );

    expect(longestPathClient?._layout.placedX).not.toBe(networkSimplexClient?._layout.placedX);
  });

  it('expands the root width to include ELK edge geometry beyond authored fixed width', async () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'juju-bootstrap-machines-process.yaml'));
    const adapter = new MockTextAdapter();

    await layoutElkFrameDiagram(diagram, adapter);

    expect(diagram.root.width).toBe(1200);
    expect(diagram.root._layout.placedW).toBeGreaterThan(1200);
  });

  it('keeps the TLS certificate relation row above octavia and preserves endpoint order', async () => {
    const diagram = loadFrameYaml(join(FRAMES_DIR, 'tls-certificate-provider-topology.yaml'));
    const adapter = new MockTextAdapter();

    await layoutElkFrameDiagram(diagram, adapter);

    const openstackRelationRow = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'openstack_relation_row',
    );
    const octavia = findFrameById(
      diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
      'octavia_k8s',
    );
    const orderedEndpointIds = ['traefik_public', 'traefik_internal', 'traefik_rgw'];
    const endpoints = orderedEndpointIds.map((id) => (
      findFrameById(
        diagram.root as unknown as { id: string; children: Array<{ id: string; children: unknown[] }> },
        id,
      )
    ));

    expect(openstackRelationRow?._layout.placedY).toBeLessThan(octavia?._layout.placedY ?? -Infinity);
    expect(
      endpoints.filter((frame): frame is NonNullable<typeof frame> => Boolean(frame))
        .sort((left, right) => left._layout.placedX - right._layout.placedX)
        .map((frame) => frame.id),
    ).toEqual(orderedEndpointIds);
  });
});
