import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createArrow, createLine, Frame, FrameDiagram } from '../src/frame-model.js';
import { loadFrameYaml } from '../src/frame-yaml-loader.js';
import { MockTextAdapter } from '../src/text-measure.js';
import { renderFrameDiagramToSvg } from '../src/svg-render.js';

describe('arrow rendering parity', () => {
  it('loadFrameYaml parses arrow label arrays and label_gap', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'dg-arrow-test-'));
    const yamlPath = join(tempDir, 'arrow.yaml');

    try {
      writeFileSync(
        yamlPath,
        [
          'engine: v3',
          'title: loader parity',
          'arrows:',
          '  - source: source.right',
          '    target: target.left',
          '    label:',
          '      - fast path',
          '      - fallback',
          '    label_gap: 40',
          'root:',
          '  id: page',
          '  direction: horizontal',
          '  children:',
          '    - id: source',
          '      label: [Source]',
          '    - id: target',
          '      label: [Target]',
          '',
        ].join('\n'),
        'utf8',
      );

      const diagram = loadFrameYaml(yamlPath);

      expect(diagram.arrows).toHaveLength(1);
      expect(diagram.arrows[0]?.label?.map(line => line.content)).toEqual(['fast path', 'fallback']);
      expect(diagram.arrows[0]?.labelGap).toBe(40);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('renderFrameDiagramToSvg preserves authored arrow waypoints', () => {
    const root = new Frame({
      id: 'page',
      children: [
        new Frame({ id: 'source', label: [{ content: 'Source' }] }),
        new Frame({ id: 'target', label: [{ content: 'Target' }] }),
      ],
    });

    root._layout.placedX = 0;
    root._layout.placedY = 0;
    root._layout.placedW = 300;
    root._layout.placedH = 150;

    const source = root.children[0]!;
    source._layout.placedX = 0;
    source._layout.placedY = 0;
    source._layout.placedW = 50;
    source._layout.placedH = 50;

    const target = root.children[1]!;
    target._layout.placedX = 200;
    target._layout.placedY = 0;
    target._layout.placedW = 50;
    target._layout.placedH = 50;

    const diagram = new FrameDiagram({
      root,
      arrows: [
        createArrow('source.right', 'target.left', {
          waypoints: [[50, 100], [200, 100]],
        }),
      ],
    });

    const svg = renderFrameDiagramToSvg(diagram, { width: 300, height: 150 }, new MockTextAdapter());

    expect(svg).toContain('x1="50" y1="25" x2="50" y2="100"');
    expect(svg).toContain('x1="50" y1="100" x2="200" y2="100"');
  });

  it('ignores raw YAML line style fields in favor of semantic defaults', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'dg-line-style-test-'));
    const yamlPath = join(tempDir, 'styled-lines.yaml');

    try {
      writeFileSync(
        yamlPath,
        [
          'engine: v3',
          'title: loader strips line styling',
          'root:',
          '  id: page',
          '  children:',
          '    - id: note',
          '      variant: annotation',
          '      label:',
          '        - text: Semantic note',
          '          fill: "#FF00FF"',
          '          weight: "900"',
          '          small_caps: true',
          '',
        ].join('\n'),
        'utf8',
      );

      const diagram = loadFrameYaml(yamlPath);
      const note = diagram.root.children[0]!;

      expect(note.label[0]?.content).toBe('Semantic note');
      expect(note.label[0]?.fill).toBe('#000000');
      expect(note.label[0]?.weight).toBe('400');
      expect(note.label[0]?.smallCaps).toBe(false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('derives compact gap for plain containers whose children are all leaves', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'dg-gap-test-'));
    const yamlPath = join(tempDir, 'derived-gap.yaml');

    try {
      writeFileSync(
        yamlPath,
        [
          'engine: v3',
          'title: derived gap',
          'root:',
          '  id: page',
          '  children:',
          '    - id: cluster',
          '      children:',
          '        - id: alpha',
          '          label: [Alpha]',
          '        - id: beta',
          '          label: [Beta]',
          '',
        ].join('\n'),
        'utf8',
      );

      const diagram = loadFrameYaml(yamlPath);
      const cluster = diagram.root.children[0]!;

      expect(cluster.gap).toBe(8);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('derives headed title gap 0 and body gap 24 when body contains a container', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'dg-heading-gap-test-'));
    const yamlPath = join(tempDir, 'heading-gap.yaml');

    try {
      writeFileSync(
        yamlPath,
        [
          'engine: v3',
          'title: heading gap derivation',
          'root:',
          '  id: page',
          '  children:',
          '    - id: panel',
          '      heading: Title',
          '      children:',
          '        - id: subgroup',
          '          children:',
          '            - id: item',
          '              label: [Item]',
          '',
        ].join('\n'),
        'utf8',
      );

      const diagram = loadFrameYaml(yamlPath);
      const panel = diagram.root.children[0]!;
      const body = panel.children.find(child => child.id.endsWith('__body'))!;

      expect(panel.gap).toBe(0);
      expect(body.gap).toBe(24);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('defaults plain non-root container padding to 8px', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'dg-padding-test-'));
    const yamlPath = join(tempDir, 'derived-padding.yaml');

    try {
      writeFileSync(
        yamlPath,
        [
          'engine: v3',
          'title: derived padding',
          'root:',
          '  id: page',
          '  children:',
          '    - id: cluster',
          '      children:',
          '        - id: alpha',
          '          label: [Alpha]',
          '',
        ].join('\n'),
        'utf8',
      );

      const diagram = loadFrameYaml(yamlPath);
      const cluster = diagram.root.children[0]!;

      expect(cluster.padding).toBe(8);
      expect(cluster.paddingTop).toBe(8);
      expect(cluster.paddingRight).toBe(8);
      expect(cluster.paddingBottom).toBe(8);
      expect(cluster.paddingLeft).toBe(8);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('keeps annotation leaf side padding at 0 while top and bottom stay at 8px', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'dg-annotation-padding-test-'));
    const yamlPath = join(tempDir, 'annotation-padding.yaml');

    try {
      writeFileSync(
        yamlPath,
        [
          'engine: v3',
          'title: annotation padding',
          'root:',
          '  id: page',
          '  children:',
          '    - id: note',
          '      variant: annotation',
          '      label: [Note]',
          '',
        ].join('\n'),
        'utf8',
      );

      const diagram = loadFrameYaml(yamlPath);
      const note = diagram.root.children[0]!;

      expect(note.paddingTop).toBe(8);
      expect(note.paddingRight).toBe(0);
      expect(note.paddingBottom).toBe(8);
      expect(note.paddingLeft).toBe(0);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('renders arrow labels with annotation variant styling, not authored line styling', () => {
    const root = new Frame({
      id: 'page',
      children: [
        new Frame({ id: 'source', label: [createLine('Source')] }),
        new Frame({ id: 'target', label: [createLine('Target')] }),
      ],
    });

    root._layout.placedX = 0;
    root._layout.placedY = 0;
    root._layout.placedW = 300;
    root._layout.placedH = 150;

    const source = root.children[0]!;
    source._layout.placedX = 0;
    source._layout.placedY = 0;
    source._layout.placedW = 50;
    source._layout.placedH = 50;

    const target = root.children[1]!;
    target._layout.placedX = 200;
    target._layout.placedY = 0;
    target._layout.placedW = 50;
    target._layout.placedH = 50;

    const diagram = new FrameDiagram({
      root,
      arrows: [
        createArrow('source.right', 'target.left', {
          label: [createLine('Fast path', { fill: '#FF00FF', weight: '900', smallCaps: true })],
        }),
      ],
    });

    const svg = renderFrameDiagramToSvg(diagram, { width: 300, height: 150 }, new MockTextAdapter());

    expect(svg).toContain('>Fast path</tspan>');
    expect(svg).toContain('fill="#666666"');
    expect(svg).toContain('font-weight="400"');
    expect(svg).not.toContain('fill="#FF00FF">Fast path</tspan>');
    expect(svg).not.toContain('font-weight="900"');
    expect(svg).not.toContain('font-variant-caps="small-caps">Fast path</tspan>');
  });
});