import { describe, expect, it } from 'vitest';

import { compileDiagramYaml } from '../src/index.js';

describe('compileDiagramYaml', () => {
  it('parses frame-tree-native authoring YAML into a scaffold AST with empty diagnostics', () => {
    const result = compileDiagramYaml(
      [
        'schema: author-v1',
        'title: Example diagram',
        'engine: v3',
        'arrows: []',
        'root:',
        '  id: page',
        '  children: []',
        '',
      ].join('\n'),
    );

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.diagnostics).toEqual([]);
    expect(result.raw).toMatchObject({
      schema: 'author-v1',
      title: 'Example diagram',
      engine: 'v3',
    });
    expect(result.ast.metadata).toMatchObject({
      schema: 'author-v1',
      title: 'Example diagram',
      engine: 'v3',
    });
    expect(result.ast.arrows).toEqual([]);
    expect(result.ast.root?.id).toBe('page');
    expect(result.ast.root?.children).toEqual([]);
    expect(result.ast.frameIndex).toMatchObject({
      page: {
        id: 'page',
        isContainer: false,
        path: 'root',
      },
    });
    expect(result.ast.source).toMatchObject({
      title: 'Example diagram',
      engine: 'v3',
    });
  });

  it('normalizes shorthand and object arrows while preserving authored refs', () => {
    const result = compileDiagramYaml(
      [
        'schema: author-v1',
        'title: Arrow example',
        'engine: v3',
        'arrows:',
        '  - tier2_row -> global_server',
        '  - source: global_server.right',
        '    target: tier2_left.left',
        'root:',
        '  id: page',
        '  children:',
        '    - id: tier2_row',
        '      children:',
        '        - id: tier2_left',
        '          children: []',
        '    - id: global_server',
        '      children: []',
        '',
      ].join('\n'),
    );

    expect(result.errors).toEqual([]);
    expect(result.ast.arrows).toEqual([
      {
        source: 'tier2_row',
        target: 'global_server',
        kind: 'directed',
      },
      {
        source: 'global_server.right',
        target: 'tier2_left.left',
        kind: 'directed',
        id: undefined,
        label: undefined,
        style: undefined,
        color: undefined,
        labelGap: undefined,
        waypoints: undefined,
      },
    ]);
    expect(result.ast.frameIndex).toMatchObject({
      page: { path: 'root' },
      tier2_row: { parentId: 'page', isContainer: true },
      tier2_left: { parentId: 'tier2_row' },
      global_server: { parentId: 'page' },
    });
  });

  it('reports malformed arrow shorthand as a compile error', () => {
    const result = compileDiagramYaml(
      [
        'schema: author-v1',
        'title: Bad arrow example',
        'engine: v3',
        'arrows:',
        '  - public_repo ->',
        'root:',
        '  id: page',
        '  children:',
        '    - id: public_repo',
        '      children: []',
        '',
      ].join('\n'),
    );

    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'ARROW_SHORTHAND_PARSE',
        level: 'error',
      }),
    );
  });

  it('reports unknown arrow source base ids while preserving anchor-qualified ref syntax', () => {
    const result = compileDiagramYaml(
      [
        'schema: author-v1',
        'title: Unknown source example',
        'engine: v3',
        'arrows:',
        '  - missing_box.right -> global_server.left',
        'root:',
        '  id: page',
        '  children:',
        '    - id: global_server',
        '      children: []',
        '',
      ].join('\n'),
    );

    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'ARROW_UNKNOWN_SOURCE',
        level: 'error',
        path: 'arrows[0]',
      }),
    );
  });

  it('reports unknown arrow target base ids while preserving valid source container refs', () => {
    const result = compileDiagramYaml(
      [
        'schema: author-v1',
        'title: Unknown target example',
        'engine: v3',
        'arrows:',
        '  - tier2_row -> missing_box.left',
        'root:',
        '  id: page',
        '  children:',
        '    - id: tier2_row',
        '      children:',
        '        - id: tier2_left',
        '          children: []',
        '',
      ].join('\n'),
    );

    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'ARROW_UNKNOWN_TARGET',
        level: 'error',
        path: 'arrows[0]',
      }),
    );
    expect(result.errors).not.toContainEqual(
      expect.objectContaining({
        code: 'ARROW_UNKNOWN_SOURCE',
        path: 'arrows[0]',
      }),
    );
  });

  it('preserves nested container trees and normalizes canonical frame fields', () => {
    const result = compileDiagramYaml(
      [
        'schema: author-v1',
        'title: Nested tree',
        'engine: v3',
        'arrows: []',
        'root:',
        '  id: page',
        '  direction: vertical',
        '  children:',
        '    - id: tier2_row',
        '      direction: horizontal',
        '      padding: 16',
        '      children:',
        '        - id: tier2_left',
        '          label: Left leaf',
        '          sizing_w: fill',
        '          children: []',
        '',
      ].join('\n'),
    );

    expect(result.errors).toEqual([]);
    expect(result.ast.root).toMatchObject({
      id: 'page',
      direction: 'vertical',
      children: [
        {
          id: 'tier2_row',
          direction: 'horizontal',
          padding: 16,
          children: [
            {
              id: 'tier2_left',
              sizingW: 'fill',
              label: [{ text: 'Left leaf' }],
              children: [],
            },
          ],
        },
      ],
    });
    expect(result.ast.frameIndex).toMatchObject({
      page: { path: 'root', isContainer: true },
      tier2_row: { parentId: 'page', isContainer: true, path: 'root.children[0]' },
      tier2_left: { parentId: 'tier2_row', isContainer: false, path: 'root.children[0].children[0]' },
    });
  });

  it('reports duplicate frame ids', () => {
    const result = compileDiagramYaml(
      [
        'schema: author-v1',
        'title: Duplicate ids',
        'engine: v3',
        'arrows: []',
        'root:',
        '  id: page',
        '  children:',
        '    - id: dup',
        '      children: []',
        '    - id: dup',
        '      children: []',
        '',
      ].join('\n'),
    );

    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'DUPLICATE_FRAME_ID',
        level: 'error',
        path: 'root.children[1]',
      }),
    );
  });

  it('reports invalid frame child entries', () => {
    const result = compileDiagramYaml(
      [
        'schema: author-v1',
        'title: Invalid child',
        'engine: v3',
        'arrows: []',
        'root:',
        '  id: page',
        '  children:',
        '    - not-a-frame',
        '',
      ].join('\n'),
    );

    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_FRAME_CHILD',
        level: 'error',
        path: 'root.children[0]',
      }),
    );
  });

  it('reports missing root as a compile error', () => {
    const result = compileDiagramYaml(
      [
        'schema: author-v1',
        'title: Missing root',
        'engine: v3',
        'arrows: []',
        '',
      ].join('\n'),
    );

    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'ROOT_MISSING',
        level: 'error',
        path: 'root',
      }),
    );
    expect(result.ast.root).toBeNull();
  });

  it('allows arrows to container frame endpoints', () => {
    const result = compileDiagramYaml(
      [
        'schema: author-v1',
        'title: Container endpoint',
        'engine: v3',
        'arrows:',
        '  - client -> tier2_row',
        'root:',
        '  id: page',
        '  children:',
        '    - id: client',
        '      children: []',
        '    - id: tier2_row',
        '      children:',
        '        - id: tier2_left',
        '          children: []',
        '',
      ].join('\n'),
    );

    expect(result.errors).toEqual([]);
    expect(result.ast.arrows[0]).toMatchObject({
      source: 'client',
      target: 'tier2_row',
    });
    expect(result.ast.frameIndex.tier2_row.isContainer).toBe(true);
  });

  it('preserves line-object heading style fields during frame normalization', () => {
    const result = compileDiagramYaml(
      [
        'schema: author-v1',
        'title: Heading styles',
        'engine: v3',
        'arrows: []',
        'root:',
        '  id: panel',
        '  heading:',
        '    text: Tier 1',
        '    size: heading',
        '    weight: bold',
        '  children: []',
        '',
      ].join('\n'),
    );

    expect(result.errors).toEqual([]);
    expect(result.ast.root?.heading).toEqual({
      text: 'Tier 1',
      size: 'heading',
      weight: 'bold',
    });
  });

  it('expands defaults templates onto frames referenced by use', () => {
    const result = compileDiagramYaml(
      [
        'schema: author-v1',
        'title: Template expansion',
        'engine: v3',
        'arrows: []',
        'defaults:',
        '  client:',
        '    label: Client',
        '    icon: Laptop.svg',
        '  network_server:',
        '    label: [Tier 2, Network server]',
        '    icon: Network.svg',
        'root:',
        '  id: page',
        '  children:',
        '    - id: client_l1',
        '      use: client',
        '      children: []',
        '    - id: tier2_left',
        '      use: network_server',
        '      children: []',
        '',
      ].join('\n'),
    );

    expect(result.errors).toEqual([]);
    expect(result.ast.defaults.client).toEqual({
      label: [{ text: 'Client' }],
      icon: 'Laptop.svg',
    });
    expect(result.ast.defaults.network_server).toEqual({
      label: [{ text: 'Tier 2' }, { text: 'Network server' }],
      icon: 'Network.svg',
    });
    expect(result.ast.root?.children[0]).toMatchObject({
      id: 'client_l1',
      label: [{ text: 'Client' }],
      icon: 'Laptop.svg',
    });
    expect(result.ast.root?.children[0]?.use).toBeUndefined();
    expect(result.ast.root?.children[1]).toMatchObject({
      id: 'tier2_left',
      label: [{ text: 'Tier 2' }, { text: 'Network server' }],
      icon: 'Network.svg',
    });
  });

  it('lets frame-local properties override expanded defaults', () => {
    const result = compileDiagramYaml(
      [
        'schema: author-v1',
        'title: Template override',
        'engine: v3',
        'arrows: []',
        'defaults:',
        '  client:',
        '    label: Client',
        '    icon: Laptop.svg',
        'root:',
        '  id: page',
        '  children:',
        '    - id: client_l1',
        '      use: client',
        '      label: Special client',
        '      children: []',
        '',
      ].join('\n'),
    );

    expect(result.errors).toEqual([]);
    expect(result.ast.root?.children[0]).toMatchObject({
      id: 'client_l1',
      label: [{ text: 'Special client' }],
      icon: 'Laptop.svg',
    });
  });

  it('reports unknown default templates referenced by use', () => {
    const result = compileDiagramYaml(
      [
        'schema: author-v1',
        'title: Missing template',
        'engine: v3',
        'arrows: []',
        'root:',
        '  id: page',
        '  children:',
        '    - id: client_l1',
        '      use: missing_template',
        '      children: []',
        '',
      ].join('\n'),
    );

    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'UNKNOWN_TEMPLATE',
        level: 'error',
        path: 'root.children[0]',
      }),
    );
    expect(result.ast.root?.children[0]?.use).toBe('missing_template');
  });

  it('preserves line-object label style fields in defaults templates', () => {
    const result = compileDiagramYaml(
      [
        'schema: author-v1',
        'title: Styled template label',
        'engine: v3',
        'arrows: []',
        'defaults:',
        '  panel:',
        '    label:',
        '      - text: Tier 1',
        '        size: heading',
        '        weight: bold',
        'root:',
        '  id: page',
        '  children:',
        '    - id: tier1',
        '      use: panel',
        '      children: []',
        '',
      ].join('\n'),
    );

    expect(result.errors).toEqual([]);
    expect(result.ast.defaults.panel?.label).toEqual([
      {
        text: 'Tier 1',
        size: 'heading',
        weight: 'bold',
      },
    ]);
    expect(result.ast.root?.children[0]?.label).toEqual([
      {
        text: 'Tier 1',
        size: 'heading',
        weight: 'bold',
      },
    ]);
  });
});