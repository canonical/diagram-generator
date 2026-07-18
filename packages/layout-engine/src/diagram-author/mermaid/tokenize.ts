export type MermaidTokenKind =
  | 'keyword'
  | 'identifier'
  | 'string'
  | 'connector'
  | 'delimiter'
  | 'class'
  | 'ampersand'
  | 'pipe'
  | 'semicolon'
  | 'newline'
  | 'frontmatter'
  | 'text'
  | 'eof';

export interface MermaidToken {
  readonly kind: MermaidTokenKind;
  readonly value: string;
  readonly raw: string;
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly column: number;
}

export interface MermaidTokenizeOptions {
  readonly maxSourceBytes?: number;
  readonly maxTokens?: number;
  readonly maxDelimiterDepth?: number;
}

export interface MermaidTokenizeResult {
  readonly source: string;
  readonly tokens: readonly MermaidToken[];
}

export class MermaidTokenizeError extends Error {
  readonly code: string;
  readonly line: number;
  readonly column: number;

  constructor(code: string, message: string, line: number, column: number) {
    super(message);
    this.name = 'MermaidTokenizeError';
    this.code = code;
    this.line = line;
    this.column = column;
  }
}

const DEFAULT_MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_TOKENS = 200_000;
const DEFAULT_MAX_DELIMITER_DEPTH = 128;

const KEYWORDS = new Set([
  'flowchart',
  'graph',
  'subgraph',
  'end',
  'direction',
  'classdef',
  'class',
  'style',
  'linkstyle',
  'click',
]);

const CONNECTORS = ['<-->', '-.->', '-->', '==>', '---', '--'] as const;
const DELIMITERS = [
  '((', '))', '([', '])', '[[', ']]', '[(', ')]', '{{', '}}',
  '[', ']', '(', ')', '{', '}', '>',
] as const;
const OPEN_DELIMITERS = new Set(['((', '([', '[[', '[(', '{{', '[', '(', '{', '>']);
const CLOSE_DELIMITERS = new Set(['))', '])', ']]', ')]', '}}', ']', ')', '}']);

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}

function advancePosition(raw: string, state: { line: number; column: number }): void {
  for (const character of raw) {
    if (character === '\n') {
      state.line += 1;
      state.column = 1;
    } else {
      state.column += 1;
    }
  }
}

function frontmatterEnd(source: string): number | null {
  if (!source.startsWith('---')) return 0;
  const firstLineEnd = source.indexOf('\n');
  if (firstLineEnd < 0 || source.slice(0, firstLineEnd).trim() !== '---') return 0;
  let cursor = firstLineEnd + 1;
  while (cursor <= source.length) {
    const next = source.indexOf('\n', cursor);
    const end = next < 0 ? source.length : next;
    const line = source.slice(cursor, end).trim();
    if (line === '---' || line === '...') return next < 0 ? end : next + 1;
    if (next < 0) break;
    cursor = next + 1;
  }
  return null;
}

export function tokenizeMermaidFlowchart(
  source: string,
  options: MermaidTokenizeOptions = {},
): MermaidTokenizeResult {
  const maxSourceBytes = options.maxSourceBytes ?? DEFAULT_MAX_SOURCE_BYTES;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const maxDelimiterDepth = options.maxDelimiterDepth ?? DEFAULT_MAX_DELIMITER_DEPTH;
  if (utf8Length(source) > maxSourceBytes) {
    throw new MermaidTokenizeError(
      'IMPORT_MERMAID_SOURCE_TOO_LARGE',
      `Mermaid source exceeds the ${maxSourceBytes}-byte import limit.`,
      1,
      1,
    );
  }

  const tokens: MermaidToken[] = [];
  const position = { line: 1, column: 1 };
  let cursor = 0;
  let delimiterDepth = 0;

  const push = (
    kind: MermaidTokenKind,
    start: number,
    end: number,
    value = source.slice(start, end),
  ): void => {
    if (tokens.length >= maxTokens) {
      throw new MermaidTokenizeError(
        'IMPORT_MERMAID_TOO_MANY_TOKENS',
        `Mermaid source exceeds the ${maxTokens}-token import limit.`,
        position.line,
        position.column,
      );
    }
    const raw = source.slice(start, end);
    tokens.push({
      kind,
      value,
      raw,
      start,
      end,
      line: position.line,
      column: position.column,
    });
    advancePosition(raw, position);
  };

  const frontmatter = frontmatterEnd(source);
  if (frontmatter === null) {
    throw new MermaidTokenizeError(
      'IMPORT_MERMAID_UNSUPPORTED_FRONTMATTER',
      'Mermaid YAML frontmatter was not closed.',
      1,
      1,
    );
  }
  if (frontmatter > 0) {
    push('frontmatter', 0, frontmatter);
    cursor = frontmatter;
  }

  while (cursor < source.length) {
    const start = cursor;
    const character = source[cursor]!;

    if (character === '\r' && source[cursor + 1] === '\n') {
      push('newline', start, start + 2, '\n');
      cursor += 2;
      continue;
    }
    if (character === '\n') {
      push('newline', start, start + 1, '\n');
      cursor += 1;
      continue;
    }
    if (/\s/.test(character)) {
      cursor += 1;
      position.column += 1;
      continue;
    }
    if (source.startsWith('%%', cursor)) {
      const newline = source.indexOf('\n', cursor);
      const end = newline < 0 ? source.length : newline;
      advancePosition(source.slice(cursor, end), position);
      cursor = end;
      continue;
    }

    const connector = CONNECTORS.find(candidate => source.startsWith(candidate, cursor));
    if (connector) {
      push('connector', start, start + connector.length, connector);
      cursor += connector.length;
      continue;
    }
    if (source.startsWith(':::', cursor)) {
      let end = cursor + 3;
      while (end < source.length && /[\w-]/.test(source[end]!)) end += 1;
      push('class', start, end, source.slice(cursor + 3, end));
      cursor = end;
      continue;
    }
    if (character === '&') {
      push('ampersand', start, start + 1, character);
      cursor += 1;
      continue;
    }
    if (character === '|') {
      push('pipe', start, start + 1, character);
      cursor += 1;
      continue;
    }
    if (character === ';') {
      push('semicolon', start, start + 1, character);
      cursor += 1;
      continue;
    }
    if (character === '"' || character === "'") {
      const quote = character;
      let end = cursor + 1;
      let escaped = false;
      while (end < source.length) {
        const next = source[end]!;
        if (!escaped && next === quote) break;
        escaped = !escaped && next === '\\';
        if (next !== '\\') escaped = false;
        end += 1;
      }
      if (end >= source.length) {
        throw new MermaidTokenizeError(
          'IMPORT_MERMAID_UNTERMINATED_STRING',
          'Mermaid source contains an unterminated quoted string.',
          position.line,
          position.column,
        );
      }
      end += 1;
      push('string', start, end, source.slice(cursor + 1, end - 1));
      cursor = end;
      continue;
    }

    const delimiter = DELIMITERS.find(candidate => source.startsWith(candidate, cursor));
    if (delimiter) {
      if (OPEN_DELIMITERS.has(delimiter)) {
        delimiterDepth += 1;
        if (delimiterDepth > maxDelimiterDepth) {
          throw new MermaidTokenizeError(
            'IMPORT_MERMAID_NESTING_TOO_DEEP',
            `Mermaid delimiter nesting exceeds the ${maxDelimiterDepth}-level import limit.`,
            position.line,
            position.column,
          );
        }
      } else if (CLOSE_DELIMITERS.has(delimiter)) {
        delimiterDepth = Math.max(0, delimiterDepth - 1);
      }
      push('delimiter', start, start + delimiter.length, delimiter);
      cursor += delimiter.length;
      continue;
    }
    if (/[A-Za-z_]/.test(character)) {
      let end = cursor + 1;
      while (end < source.length && /[\w.-]/.test(source[end]!)) end += 1;
      const value = source.slice(cursor, end);
      push(KEYWORDS.has(value.toLowerCase()) ? 'keyword' : 'identifier', start, end, value);
      cursor = end;
      continue;
    }

    let end = cursor + 1;
    while (
      end < source.length
      && !/\s/.test(source[end]!)
      && !['&', '|', ';', '"', "'"].includes(source[end]!)
      && !CONNECTORS.some(candidate => source.startsWith(candidate, end))
      && !DELIMITERS.some(candidate => source.startsWith(candidate, end))
      && !source.startsWith(':::', end)
    ) {
      end += 1;
    }
    push('text', start, end);
    cursor = end;
  }

  tokens.push({
    kind: 'eof',
    value: '',
    raw: '',
    start: source.length,
    end: source.length,
    line: position.line,
    column: position.column,
  });
  return { source, tokens };
}
