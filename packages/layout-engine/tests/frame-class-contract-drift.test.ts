import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FRAME_CLASS_DEFS } from '../src/frame-classes.js';
import { PREVIEW_STYLE_SEMANTICS } from '../src/preview-shell/frame-style.js';

const diagramDoc = readFileSync(new URL('../../../DIAGRAM.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const frameClassesDoc = readFileSync(new URL('../../../docs/frame-classes.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const levelAssignmentSkill = readFileSync(new URL('../../../.github/skills/level-assignment/SKILL.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('frame-class contract drift guard', () => {
  it('keeps the runtime frame-class table on the canonical 0/1/2/3 axis', () => {
    expect(FRAME_CLASS_DEFS.section).toMatchObject({
      fill: 'transparent',
      stroke: '#000000',
      textFill: '#000000',
      iconFill: '#000000',
      headingText: { weight: '700', smallCaps: false },
      leafLeadText: { weight: '700', smallCaps: false },
    });
    expect(FRAME_CLASS_DEFS.panel).toMatchObject({
      fill: '#F3F3F3',
      stroke: '#F3F3F3',
      textFill: '#000000',
      iconFill: '#000000',
      headingText: { weight: '700', smallCaps: false },
    });
    expect(FRAME_CLASS_DEFS.leaf).toMatchObject({
      fill: 'transparent',
      stroke: '#000000',
      textFill: '#000000',
      iconFill: '#000000',
      headingText: { weight: '400', smallCaps: false },
    });
    expect(FRAME_CLASS_DEFS.annotation).toMatchObject({
      fill: 'transparent',
      stroke: 'none',
      textFill: '#666666',
      iconFill: '#666666',
      headingText: { weight: '400', smallCaps: false },
    });
    expect(FRAME_CLASS_DEFS.highlight).toMatchObject({
      fill: '#000000',
      stroke: '#000000',
      textFill: '#FFFFFF',
      iconFill: '#FFFFFF',
    });
  });

  it('keeps the preview picker semantics aligned with the runtime contract', () => {
    expect(PREVIEW_STYLE_SEMANTICS).toEqual({
      default: { level: 1, fill: 'WHITE', border: 'SOLID', style: 'default' },
      parent: { level: 2, fill: 'GREY', border: 'SOLID', style: 'parent' },
      section: { level: 3, fill: 'WHITE', border: 'SOLID', style: 'section' },
      annotation: { fill: 'WHITE', border: 'NONE', style: 'annotation' },
      highlight: { fill: 'BLACK', border: 'SOLID', style: 'highlight' },
    });
  });

  it('keeps docs and skill aligned with the fixed structural encoding and promotion rule', () => {
    expect(frameClassesDoc).toContain('Behavioral authority lives in');
    expect(frameClassesDoc).toContain('Wrapper (`level: 0`) is part of the fixed structural encoding');
    expect(frameClassesDoc).toContain('- `D = 0` -> child / leaf (`level: 1`)');
    expect(frameClassesDoc).toContain('- `D = 1` -> parent / panel (`level: 2`)');
    expect(frameClassesDoc).toContain('- `D >= 2` -> section (`level: 3`)');
    expect(frameClassesDoc).toContain('Wrapper (`level: 0`), annotation,\nand highlight are exempt from promotion.');

    expect(levelAssignmentSkill).toContain('Level assignment is an **authoring-time** rule.');
    expect(levelAssignmentSkill).toContain('The engine requires explicit `level:` fields in YAML - it never guesses');
    expect(levelAssignmentSkill).toContain('1. **`D = 0` → child / leaf (`level: 1`).**');
    expect(levelAssignmentSkill).toContain('2. **`D = 1` → parent / panel (`level: 2`).**');
    expect(levelAssignmentSkill).toContain('3. **`D >= 2` → section (`level: 3`).**');
    expect(levelAssignmentSkill).toContain('Highlights (`variant: highlight`) keep their structural level; they');
    expect(levelAssignmentSkill).toContain('`resolveStyles()` in');
  });

  it('keeps DIAGRAM.md as a thin index instead of an independent class-rule source', () => {
    expect(diagramDoc).toContain('Thin index for the current TS renderer contract.');
    expect(diagramDoc).toContain('- `packages/layout-engine/src/frame-classes.ts`');
    expect(diagramDoc).toContain('- `packages/layout-engine/src/resolve-styles.ts`');
    expect(diagramDoc).toContain('- `docs/frame-classes.md`');
    expect(diagramDoc).toContain('- `.github/skills/level-assignment/SKILL.md`');
    expect(diagramDoc).not.toContain('## Frame classes');
    expect(diagramDoc).not.toContain('| Class | Fill | Border | Text |');
  });
});
