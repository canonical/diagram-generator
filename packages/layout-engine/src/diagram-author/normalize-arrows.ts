import { parseArrowShorthand } from './arrow-shorthand.js';
import type { AuthorArrow, Diagnostic, LineSpec } from './types.js';

function normalizeLineArray(value: unknown): LineSpec[] | undefined {
  if (typeof value === 'string') {
    return [{ text: value }];
  }
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.map(entry => {
    if (typeof entry === 'string') {
      return { text: entry };
    }
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const line = entry as Record<string, unknown>;
      return {
        text: String(line.text ?? ''),
        size: typeof line.size === 'string' ? line.size : undefined,
        weight: typeof line.weight === 'string' ? line.weight : undefined,
        fill: typeof line.fill === 'string' ? line.fill : undefined,
        smallCaps: typeof line.smallCaps === 'boolean' ? line.smallCaps : undefined,
        letterSpacing: typeof line.letterSpacing === 'string' ? line.letterSpacing : undefined,
        lineStep: typeof line.lineStep === 'number' ? line.lineStep : undefined,
        fontFamily: typeof line.fontFamily === 'string' ? line.fontFamily : undefined,
      };
    }
    return { text: String(entry ?? '') };
  });
}

function normalizeArrow(entry: unknown, path: string): { arrow?: AuthorArrow; diagnostics: Diagnostic[] } {
  if (typeof entry === 'string') {
    return parseArrowShorthand(entry, path);
  }
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return {
      diagnostics: [
        {
          code: 'ARROW_INVALID_REF',
          level: 'error',
          message: 'Arrow entry must be a shorthand string or mapping.',
          path,
        },
      ],
    };
  }
  const record = entry as Record<string, unknown>;
  if (typeof record.source !== 'string' || typeof record.target !== 'string') {
    return {
      diagnostics: [
        {
          code: 'ARROW_INVALID_REF',
          level: 'error',
          message: 'Arrow object entries require string `source` and `target` fields.',
          path,
        },
      ],
    };
  }

  return {
    arrow: {
      id: typeof record.id === 'string' ? record.id : undefined,
      source: record.source,
      target: record.target,
      kind: 'directed',
      label: normalizeLineArray(record.label),
      style: typeof record.style === 'string' ? record.style : undefined,
      color: typeof record.color === 'string' ? record.color : undefined,
      labelGap: typeof record.label_gap === 'number'
        ? record.label_gap
        : typeof record.labelGap === 'number'
          ? record.labelGap
          : undefined,
      waypoints: Array.isArray(record.waypoints)
        ? (record.waypoints as [number, number][])
        : undefined,
    },
    diagnostics: [],
  };
}

export function normalizeArrows(value: unknown): { arrows: AuthorArrow[]; diagnostics: Diagnostic[] } {
  if (!Array.isArray(value)) {
    return { arrows: [], diagnostics: [] };
  }

  const diagnostics: Diagnostic[] = [];
  const arrows: AuthorArrow[] = [];
  value.forEach((entry, index) => {
    const result = normalizeArrow(entry, `arrows[${index}]`);
    diagnostics.push(...result.diagnostics);
    if (result.arrow) {
      arrows.push(result.arrow);
    }
  });

  return { arrows, diagnostics };
}