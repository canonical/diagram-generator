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
});