import type { AuthorArrow, Diagnostic } from './types.js';

const ARROW_SHORTHAND_PATTERN = /^\s*(.+?)\s*->\s*(.+?)\s*$/;

export interface ParseArrowResult {
  arrow?: AuthorArrow;
  diagnostics: Diagnostic[];
}

export function parseArrowShorthand(value: string, path: string): ParseArrowResult {
  const match = value.match(ARROW_SHORTHAND_PATTERN);
  if (!match) {
    return {
      diagnostics: [
        {
          code: 'ARROW_SHORTHAND_PARSE',
          level: 'error',
          message: 'Arrow shorthand must use `source -> target`.',
          path,
        },
      ],
    };
  }

  return {
    arrow: {
      source: match[1],
      target: match[2],
      kind: 'directed',
    },
    diagnostics: [],
  };
}