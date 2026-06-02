import { createLine, type Frame, type Line } from './frame-model.js';

export interface FrameTextStyle {
  weight: string;
  smallCaps: boolean;
  letterSpacing?: string;
}

export interface FrameClassDefinition {
  fill: string;
  stroke: string;
  textFill?: string;
  iconFill?: string;
  headingText?: FrameTextStyle;
  leafLeadText?: FrameTextStyle;
}

type FrameClassKey = 'hidden' | 'highlight' | 'annotation' | 'section' | 'panel' | 'leaf';

export const FRAME_CLASS_DEFS: Record<FrameClassKey, FrameClassDefinition> = {
  hidden: {
    fill: 'transparent',
    stroke: 'none',
  },
  highlight: {
    fill: '#000000',
    stroke: '#000000',
    textFill: '#FFFFFF',
    iconFill: '#FFFFFF',
  },
  annotation: {
    fill: 'transparent',
    stroke: 'none',
    textFill: '#666666',
    iconFill: '#666666',
    headingText: {
      weight: '400',
      smallCaps: false,
    },
    leafLeadText: {
      weight: '400',
      smallCaps: false,
    },
  },
  section: {
    fill: 'transparent',
    stroke: '#000000',
    textFill: '#000000',
    iconFill: '#000000',
    headingText: {
      weight: '700',
      smallCaps: true,
    },
    leafLeadText: {
      weight: '700',
      smallCaps: false,
    },
  },
  panel: {
    fill: '#F3F3F3',
    stroke: '#F3F3F3',
    textFill: '#000000',
    iconFill: '#000000',
    headingText: {
      weight: '700',
      smallCaps: false,
    },
    leafLeadText: {
      weight: '700',
      smallCaps: false,
    },
  },
  leaf: {
    fill: 'transparent',
    stroke: '#000000',
    textFill: '#000000',
    iconFill: '#000000',
    headingText: {
      weight: '400',
      smallCaps: false,
    },
    leafLeadText: {
      weight: '400',
      smallCaps: false,
    },
  },
};

function cloneLine(line: Line, overrides?: Partial<Omit<Line, 'content'>>): Line {
  return createLine(line.content, {
    size: line.size,
    weight: line.weight,
    fill: line.fill,
    smallCaps: line.smallCaps,
    letterSpacing: line.letterSpacing,
    lineStep: line.lineStep,
    fontFamily: line.fontFamily,
    ...overrides,
  });
}

function applyLineFill(line: Line, fill: string | undefined): Line {
  if (fill == null) {
    return line;
  }
  return cloneLine(line, { fill });
}

function applyTextStyle(line: Line, style: FrameTextStyle, fill: string | undefined): Line {
  return cloneLine(line, {
    weight: style.weight,
    fill: fill ?? line.fill,
    smallCaps: style.smallCaps,
    letterSpacing: style.letterSpacing,
  });
}

export function applyFrameClass(frame: Frame, frameClass: FrameClassDefinition): void {
  frame.resolvedFill = frameClass.fill;
  frame.resolvedStroke = frameClass.stroke;
  if (frame.icon && (frame.iconFill == null || frame.iconFill === '#000000')) {
    frame.iconFill = frameClass.iconFill ?? frame.iconFill;
  }

  if (frameClass.headingText) {
    for (const child of frame.children) {
      if (child.role === 'heading') {
        if (frameClass.textFill) {
          child.label = child.label.map(line => applyLineFill(line, frameClass.textFill));
        }
        if (child.label.length > 0) {
          child.label[0] = applyTextStyle(child.label[0]!, frameClass.headingText, frameClass.textFill);
        }
        if (child.icon && (child.iconFill == null || child.iconFill === '#000000')) {
          child.iconFill = frameClass.iconFill ?? child.iconFill;
        }
      }
    }
    if (frame.heading != null) {
      if (frameClass.textFill) {
        frame.heading = applyLineFill(frame.heading, frameClass.textFill);
      }
      frame.heading = applyTextStyle(frame.heading, frameClass.headingText, frameClass.textFill);
    }
  } else if (frameClass.textFill) {
    for (const child of frame.children) {
      if (child.role === 'heading') {
        child.label = child.label.map(line => applyLineFill(line, frameClass.textFill));
        if (child.icon && (child.iconFill == null || child.iconFill === '#000000')) {
          child.iconFill = frameClass.iconFill ?? child.iconFill;
        }
      }
    }
    if (frame.heading != null) {
      frame.heading = applyLineFill(frame.heading, frameClass.textFill);
    }
  }

  if (frameClass.textFill && frame.label.length > 0) {
    frame.label = frame.label.map(line => applyLineFill(line, frameClass.textFill));
  }

  if (frameClass.leafLeadText && frame.isLeaf && frame.label.length > 0) {
    frame.label[0] = applyTextStyle(frame.label[0]!, frameClass.leafLeadText, frameClass.textFill);
  }
}
