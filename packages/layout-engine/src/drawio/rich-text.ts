import { Fill } from '../frame-model.js';
import { BODY_SIZE, sizeToPx } from '../tokens.js';
import type { FrameRenderTextLinePlan } from '../frame-render-plan.js';
import type { TextSpanItem } from '../render-ir.js';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function richTextFromLines(lines: readonly FrameRenderTextLinePlan[]): string {
  const rendered: string[] = [];
  for (const line of lines) {
    let inner = escapeHtml(line.spec.content);
    if (line.weight !== '400') {
      inner = `<b>${inner}</b>`;
    }
    const styles: string[] = [];
    const sizePx = Math.round(sizeToPx(line.size));
    if (sizePx !== 16) {
      styles.push(`font-size:${sizePx}px`);
    }
    if (line.fill !== Fill.BLACK) {
      styles.push(`color:${line.fill}`);
    }
    if (line.spec.smallCaps) {
      styles.push('font-variant:small-caps');
      styles.push('letter-spacing:0.05em');
    }
    if (styles.length > 0) {
      inner = `<span style="${styles.join(';')}">${inner}</span>`;
    }
    rendered.push(inner);
  }
  return rendered.join('<br>');
}

export function richTextFromPlainLines(
  lines: readonly { content: string; size?: string; weight?: string; fill?: string; smallCaps?: boolean }[],
): string {
  return richTextFromLines(lines.map((line) => ({
    x: 0,
    y: 0,
    size: line.size ?? String(BODY_SIZE),
    weight: line.weight ?? '400',
    fill: line.fill ?? Fill.BLACK,
    spec: {
      content: line.content,
      size: line.size,
      weight: line.weight,
      fill: line.fill,
      smallCaps: line.smallCaps,
    },
  })));
}

function paintToCssFill(paint: TextSpanItem['fill']): string {
  if (!paint || paint.color.a === 0) return Fill.BLACK;
  const r = Math.round(paint.color.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(paint.color.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(paint.color.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toUpperCase();
}

export function richTextFromTextBlockSpans(spans: readonly TextSpanItem[]): string {
  const rendered: string[] = [];
  for (const span of spans) {
    let inner = escapeHtml(span.text);
    const weight = String(span.fontWeight ?? 400);
    if (weight !== '400') {
      inner = `<b>${inner}</b>`;
    }
    const styles: string[] = [];
    const sizePx = Math.round(span.fontSize);
    if (sizePx !== 16) {
      styles.push(`font-size:${sizePx}px`);
    }
    const fill = paintToCssFill(span.fill);
    if (fill !== Fill.BLACK) {
      styles.push(`color:${fill}`);
    }
    if (span.smallCaps) {
      styles.push('font-variant:small-caps');
      styles.push('letter-spacing:0.05em');
    }
    if (styles.length > 0) {
      inner = `<span style="${styles.join(';')}">${inner}</span>`;
    }
    rendered.push(inner);
  }
  return rendered.join('<br>');
}
