import type { AuthorArrow, Diagnostic, FrameIndexEntry } from './types.js';

export function extractBaseFrameId(ref: string): string {
  return ref.split('.')[0] ?? ref;
}

export function validateArrowRefs(
  arrows: AuthorArrow[],
  frameIndex: Record<string, FrameIndexEntry>,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  arrows.forEach((arrow, index) => {
    const sourceId = extractBaseFrameId(arrow.source);
    const targetId = extractBaseFrameId(arrow.target);

    if (!sourceId || !frameIndex[sourceId]) {
      diagnostics.push({
        code: 'ARROW_UNKNOWN_SOURCE',
        level: 'error',
        message: `Arrow source base id does not exist: ${arrow.source}`,
        path: `arrows[${index}]`,
      });
    }

    if (!targetId || !frameIndex[targetId]) {
      diagnostics.push({
        code: 'ARROW_UNKNOWN_TARGET',
        level: 'error',
        message: `Arrow target base id does not exist: ${arrow.target}`,
        path: `arrows[${index}]`,
      });
    }
  });

  return diagnostics;
}