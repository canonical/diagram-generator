/**
 * Style resolution — TypeScript port of frame_loader.py resolve_styles().
 *
 * Walks a Frame tree and sets resolvedFill / resolvedStroke on every frame
 * based on the four-class hierarchy:
 *   Section  (level 3): small-caps bold heading, transparent, black border
 *   Panel    (level 2): bold heading, grey fill, grey border
 *   Leaf     (level 1): regular heading, transparent, black border
 *   Annotation:         borderless leaf — transparent, no border
 *
 * This is the single source of truth for visual style semantics.
 * Renderers consume resolvedFill/resolvedStroke directly — no re-derivation.
 */

import { Border, createLine, Fill, Frame } from './frame-model.js';

const BLACK = '#000000';
const GREY = '#F3F3F3';

/**
 * Compute the effective prominence level for a frame.
 *
 * If `frame.level` is explicitly set (e.g. from YAML or override), use it.
 * Otherwise apply safe defaults:
 *   depth 0                           → 0 (root, invisible)
 *   container without heading         → 0 (layout wrapper, invisible)
 *   everything else                   → 1 (outlined box)
 *
 * Grey panel treatment (level 2) is never guessed — it must be opted into
 * via `level: 2` in the YAML or an explicit override.
 */
export function computeLevel(frame: Frame, depth: number): number {
  if (frame.level != null) {
    return frame.level;
  }
  if (depth === 0) {
    return 0;
  }
  // Headingless containers are layout wrappers — invisible
  const hasHeading =
    frame.children.some(c => c.role === 'heading') ||
    frame.heading != null;
  if (frame.isContainer && !hasHeading) {
    return 0;
  }
  return 1;
}

interface ResolveStylesContext {
  depth: number;
  parentIsPanel: boolean;
  parentIsSection: boolean;
}

/**
 * Walk the tree and set resolvedFill / resolvedStroke on every frame.
 *
 * Must be called after layout so that children are known. Mirrors the
 * Python `resolve_styles()` in `frame_loader.py` exactly.
 */
export function resolveStyles(root: Frame, ctx?: Partial<ResolveStylesContext>): void {
  const depth = ctx?.depth ?? 0;
  const parentIsPanel = ctx?.parentIsPanel ?? false;
  const parentIsSection = ctx?.parentIsSection ?? false;

  const isLayoutWrapper = (root.id || '').includes('__');
  let thisIsPanel = false;
  let thisIsSection = false;

  if (depth === 0) {
    // Root frame: invisible
    root.resolvedFill = 'transparent';
    root.resolvedStroke = 'none';
  } else if (isLayoutWrapper) {
    // Synthetic __heading / __body frames: transparent
    root.resolvedFill = 'transparent';
    root.resolvedStroke = 'none';
    // __heading with a black-fill parent keeps its fill for contrast
    if (root.fill === Fill.BLACK) {
      root.resolvedFill = BLACK;
    } else if (root.fill === Fill.WHITE && root.role === 'heading') {
      root.resolvedFill = 'transparent';
    }
  } else if (root.fill === Fill.BLACK) {
    // Highlight variant (fill already set to BLACK by variant overlay)
    root.resolvedFill = BLACK;
    root.resolvedStroke = BLACK;
  } else if (root.role === 'separator') {
    root.resolvedFill = 'transparent';
    root.resolvedStroke = 'none';
  } else {
    // Normal frame: resolve from level
    let level = computeLevel(root, depth);

    // Nesting constraints: grey-on-grey has no visible boundary,
    // and section-in-section is not meaningful.
    if (level >= 2 && parentIsPanel) {
      level = 1;
    }
    if (level >= 3 && parentIsSection) {
      level = Math.min(level, 2);
    }

    if (level === 0) {
      // Level 0: headingless container / layout wrapper — invisible
      root.resolvedFill = 'transparent';
      root.resolvedStroke = 'none';
    } else if (root.border === Border.NONE && root.isLeaf && !isLayoutWrapper) {
      // Annotation: borderless leaf — no fill, no stroke
      root.resolvedFill = 'transparent';
      root.resolvedStroke = 'none';
    } else if (level >= 3) {
      // Section: small-caps bold heading, transparent fill, black border
      root.resolvedFill = 'transparent';
      root.resolvedStroke = BLACK;
      thisIsSection = true;

      // Set small caps on heading children
      for (const child of root.children) {
        if (child.role === 'heading' && child.label.length > 0) {
          const cl = child.label[0]!;
          child.label[0] = createLine(cl.content, {
            weight: cl.weight,
            fill: cl.fill,
            smallCaps: true,
            lineStep: cl.lineStep,
            fontFamily: cl.fontFamily,
          });
        }
      }
      if (root.heading != null) {
        root.heading = createLine(root.heading.content, {
          weight: root.heading.weight,
          fill: root.heading.fill,
          smallCaps: true,
          lineStep: root.heading.lineStep,
          fontFamily: root.heading.fontFamily,
        });
      }
      // Non-container with first label line as heading
      if (root.isLeaf && root.label.length > 0) {
        const ln = root.label[0]!;
        root.label[0] = createLine(ln.content, {
          weight: ln.weight,
          fill: ln.fill,
          smallCaps: true,
          lineStep: ln.lineStep,
          fontFamily: ln.fontFamily,
        });
      }
    } else if (level >= 2) {
      // Panel: grey fill, grey border (invisible against fill)
      root.resolvedFill = GREY;
      root.resolvedStroke = GREY;
      thisIsPanel = true;
    } else {
      // Leaf (level 1): outlined box, regular-weight heading
      root.resolvedFill = 'transparent';
      root.resolvedStroke = BLACK;

      // Demote heading from bold to regular weight for leaves
      for (const child of root.children) {
        if (child.role === 'heading' && child.label.length > 0) {
          const cl = child.label[0]!;
          child.label[0] = createLine(cl.content, {
            weight: '400',
            fill: cl.fill,
            smallCaps: false,
            lineStep: cl.lineStep,
            fontFamily: cl.fontFamily,
          });
        }
      }
      if (root.heading != null) {
        root.heading = createLine(root.heading.content, {
          weight: '400',
          fill: root.heading.fill,
          smallCaps: false,
          lineStep: root.heading.lineStep,
          fontFamily: root.heading.fontFamily,
        });
      }
      // Non-container leaves: demote first label line
      if (root.isLeaf && root.label.length > 0) {
        const ln = root.label[0]!;
        if (ln.weight === '700') {
          root.label[0] = createLine(ln.content, {
            weight: '400',
            fill: ln.fill,
            smallCaps: false,
            lineStep: ln.lineStep,
            fontFamily: ln.fontFamily,
          });
        }
      }
    }
  }

  // Recurse into children
  for (const child of root.children) {
    // Layout wrappers pass through the parent's panel/section status
    const childParentPanel = isLayoutWrapper ? parentIsPanel : thisIsPanel;
    const childParentSection = isLayoutWrapper ? parentIsSection : thisIsSection;
    resolveStyles(child, {
      depth: depth + 1,
      parentIsPanel: childParentPanel,
      parentIsSection: childParentSection,
    });
  }
}
