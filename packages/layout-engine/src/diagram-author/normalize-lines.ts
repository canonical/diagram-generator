import type { LineSpec } from './types.js';

export function normalizeLineSpec(value: unknown): LineSpec | undefined {
  if (typeof value === 'string') {
    return { text: value };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const line = value as Record<string, unknown>;
  if (!('text' in line) && !('content' in line)) {
    const entries = Object.entries(line);
    if (entries.length === 1) {
      const [key, rawValue] = entries[0]!;
      const renderedValue = String(rawValue ?? '').trim();
      return {
        text: renderedValue.length > 0 ? `${key}: ${renderedValue}` : key,
      };
    }
  }
  return {
    text: String(line.text ?? line.content ?? ''),
    size: typeof line.size === 'string' ? line.size : undefined,
    weight: typeof line.weight === 'string' ? line.weight : undefined,
    fill: typeof line.fill === 'string' ? line.fill : undefined,
    letterSpacing: typeof line.letterSpacing === 'string'
      ? line.letterSpacing
      : typeof line.letter_spacing === 'string'
        ? line.letter_spacing
        : undefined,
    lineStep: typeof line.lineStep === 'number'
      ? line.lineStep
      : typeof line.line_step === 'number'
        ? line.line_step
        : undefined,
    fontFamily: typeof line.fontFamily === 'string'
      ? line.fontFamily
      : typeof line.font_family === 'string'
        ? line.font_family
        : undefined,
  };
}

export function normalizeLineArray(value: unknown): LineSpec[] | undefined {
  if (typeof value === 'string') {
    return [{ text: value }];
  }
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.map(entry => normalizeLineSpec(entry) ?? { text: String(entry ?? '') });
}
