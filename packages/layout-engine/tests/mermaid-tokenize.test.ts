import { describe, expect, it } from 'vitest';

import {
  MermaidTokenizeError,
  tokenizeMermaidFlowchart,
} from '../src/diagram-author/mermaid/tokenize.js';

describe('Mermaid flowchart tokenizer', () => {
  it('emits the bounded token surface with source-accurate offsets', () => {
    const source = [
      '---',
      'title: Token fixture',
      '---',
      'flowchart TB',
      'subgraph group["Group"]',
      '  a["A"]:::leaf -->|dispatch| b & c; e1@{ shape: cyl }',
      'end',
      '',
    ].join('\n');

    const result = tokenizeMermaidFlowchart(source);
    const kinds = new Set(result.tokens.map(token => token.kind));

    expect(kinds).toEqual(new Set([
      'frontmatter',
      'keyword',
      'identifier',
      'string',
      'connector',
      'delimiter',
      'class',
      'ampersand',
      'pipe',
      'semicolon',
      'newline',
      'text',
      'eof',
    ]));
    expect(result.tokens.at(-1)).toMatchObject({
      kind: 'eof',
      start: source.length,
      end: source.length,
    });

    for (const token of result.tokens) {
      expect(token.start).toBeGreaterThanOrEqual(0);
      expect(token.end).toBeGreaterThanOrEqual(token.start);
      expect(token.end).toBeLessThanOrEqual(source.length);
      expect(token.line).toBeGreaterThanOrEqual(1);
      expect(token.column).toBeGreaterThanOrEqual(1);
      expect(token.raw).toBe(source.slice(token.start, token.end));
    }
  });

  it('recognizes every supported shape delimiter and connector without swallowing neighbors', () => {
    const source = [
      'flowchart TB',
      'a[A] --> b(B)',
      'c{C} --- d((D))',
      'e([E]) ==> f[[F]]',
      'g[(G)] -.-> h{{H}}',
      'i>I] <--> j[J]',
      '',
    ].join('\n');

    const tokens = tokenizeMermaidFlowchart(source).tokens;

    expect(tokens.filter(token => token.kind === 'connector').map(token => token.value)).toEqual([
      '-->',
      '---',
      '==>',
      '-.->',
      '<-->',
    ]);
    expect(tokens.filter(token => token.kind === 'delimiter').map(token => token.value)).toEqual([
      '[', ']',
      '(', ')',
      '{', '}',
      '((', '))',
      '([', '])',
      '[[', ']]',
      '[(', ')]',
      '{{', '}}',
      '>', ']',
      '[', ']',
    ]);
  });

  it.each([
    {
      name: 'source bytes',
      source: 'é',
      options: { maxSourceBytes: 1 },
      code: 'IMPORT_MERMAID_SOURCE_TOO_LARGE',
    },
    {
      name: 'token count',
      source: 'flowchart TB\n',
      options: { maxTokens: 2 },
      code: 'IMPORT_MERMAID_TOO_MANY_TOKENS',
    },
    {
      name: 'delimiter depth',
      source: 'flowchart TB\na[[A[B]]]\n',
      options: { maxDelimiterDepth: 1 },
      code: 'IMPORT_MERMAID_NESTING_TOO_DEEP',
    },
  ])('fails deterministically at the configured $name bound', ({ source, options, code }) => {
    expect(() => tokenizeMermaidFlowchart(source, options)).toThrowError(
      expect.objectContaining<Partial<MermaidTokenizeError>>({
        name: 'MermaidTokenizeError',
        code,
      }),
    );
  });
});
