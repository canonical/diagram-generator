/**
 * Preview override application helpers (spec 043 shell coordinator slice B).
 *
 * This module owns the SVG override pass that used to live directly in
 * editor.js. The shell still supplies runtime model callbacks and the selected
 * target for resize-handle refresh.
 */

export interface PreviewOverrideDelta {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export interface PreviewOverrideTreeNode {
  id: string;
  type?: string;
  source?: string;
  target?: string;
  gridRow?: number;
  children?: PreviewOverrideTreeNode[];
}

export interface PreviewOverrideRootNode {
  id: string;
  gridRow?: number;
}

export interface PreviewOverrideEntry {
  text?: unknown;
  style?: unknown;
}

export interface PreviewOverrideBoxStylePreset {
  fill: string;
  text: string;
  icon: string;
}

export interface PreviewOverrideRelayoutStatus {
  frameManaged?: boolean;
}

export interface PreviewArrowSegmentCoordinate {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PreviewArrowEndpointShift {
  dx: number;
  dy: number;
}

export interface ApplyPreviewSvgOverridesOptions {
  svg: SVGSVGElement;
  componentTree: PreviewOverrideTreeNode[];
  rootNodes: PreviewOverrideRootNode[];
  overrides: Record<string, PreviewOverrideEntry | undefined>;
  relayoutStatus?: PreviewOverrideRelayoutStatus | null;
  boxStyles: Record<string, PreviewOverrideBoxStylePreset>;
  inset: number;
  iconSize: number;
  gridStep: number;
  hasDiagramGrid: boolean;
  getNode: (cid: string) => PreviewOverrideTreeNode | null | undefined;
  getOwnDelta: (cid: string) => PreviewOverrideDelta;
  getEffectiveDelta: (cid: string) => PreviewOverrideDelta;
  isFrameManagedTarget: (
    target: Element | null | undefined,
    relayoutStatus?: PreviewOverrideRelayoutStatus | null,
  ) => boolean;
  selectedId?: string | null;
  showResizeHandles?: ((cid: string) => void) | null;
}

export interface ApplyPreviewSvgOverridesHostOptions {
  document: {
    querySelector: (selector: string) => SVGSVGElement | null;
  };
  selectedIds: Iterable<string>;
  componentTree: PreviewOverrideTreeNode[];
  rootNodes: PreviewOverrideRootNode[];
  overrides: Record<string, PreviewOverrideEntry | undefined>;
  relayoutStatus?: PreviewOverrideRelayoutStatus | null;
  boxStyles: Record<string, PreviewOverrideBoxStylePreset>;
  inset: number;
  iconSize: number;
  gridStep: number;
  hasDiagramGrid: boolean;
  getNode: (cid: string) => PreviewOverrideTreeNode | null | undefined;
  getOwnDelta: (cid: string) => PreviewOverrideDelta;
  getEffectiveDelta: (cid: string) => PreviewOverrideDelta;
  isFrameManagedTarget: (
    target: Element | null | undefined,
    relayoutStatus?: PreviewOverrideRelayoutStatus | null,
  ) => boolean;
  showResizeHandles?: ((cid: string) => void) | null;
  applyPreviewSvgOverrides?: ((options: ApplyPreviewSvgOverridesOptions) => void) | null;
}

function finiteNumber(value: string | null | undefined, fallback = 0): number {
  const numeric = Number.parseFloat(value ?? '');
  return Number.isFinite(numeric) ? numeric : fallback;
}

function setTranslateStyle(element: Element, dx: number, dy: number): void {
  (element as HTMLElement).style.transform = `translate(${dx}px, ${dy}px)`;
}

function zeroDelta(): PreviewOverrideDelta {
  return { dx: 0, dy: 0, dw: 0, dh: 0 };
}

export function resolvePreviewArrowSideShift(options: {
  delta: PreviewOverrideDelta;
  side: string | null | undefined;
  reflowDh?: number;
  reflowDy?: number;
}): PreviewArrowEndpointShift {
  const reflowDh = options.reflowDh ?? 0;
  const totalDh = options.delta.dh + reflowDh;
  let dx = options.delta.dx;
  let dy = options.delta.dy + (options.reflowDy ?? 0);

  if (options.side === 'bottom') dy += totalDh;
  if (options.side === 'right') dx += options.delta.dw;
  if (options.side === 'top' || options.side === 'bottom') dx += options.delta.dw / 2;
  if (options.side === 'left' || options.side === 'right') dy += totalDh / 2;

  return { dx, dy };
}

export function resolvePreviewReflowShiftMap(options: {
  reflowDhByComponent: Record<string, number>;
  rootNodes: PreviewOverrideRootNode[];
  getNode: (cid: string) => PreviewOverrideTreeNode | null | undefined;
}): Record<string, number> {
  const maxReflowDhByRow: Record<number, number> = {};
  for (const [cid, dh] of Object.entries(options.reflowDhByComponent)) {
    const row = options.getNode(cid)?.gridRow ?? 0;
    maxReflowDhByRow[row] = Math.max(maxReflowDhByRow[row] ?? 0, dh);
  }

  const affectedRows = Object.keys(maxReflowDhByRow)
    .map(Number)
    .sort((left, right) => left - right);
  const result: Record<string, number> = {};

  for (const node of options.rootNodes) {
    const row = node.gridRow ?? 0;
    let dy = 0;
    for (const affectedRow of affectedRows) {
      if (affectedRow < row) dy += maxReflowDhByRow[affectedRow] ?? 0;
    }
    if (dy > 0) result[node.id] = dy;
  }

  return result;
}

function isHorizontalSegment(segment: PreviewArrowSegmentCoordinate): boolean {
  return Math.abs(segment.y2 - segment.y1) <= Math.abs(segment.x2 - segment.x1);
}

export function resolvePreviewArrowShiftedSegments(options: {
  segments: PreviewArrowSegmentCoordinate[];
  sourceShift: PreviewArrowEndpointShift;
  targetShift: PreviewArrowEndpointShift;
}): PreviewArrowSegmentCoordinate[] {
  if (options.segments.length === 0) return [];
  if (options.segments.length === 1) {
    return [{
      x1: options.segments[0]!.x1 + options.sourceShift.dx,
      y1: options.segments[0]!.y1 + options.sourceShift.dy,
      x2: options.segments[0]!.x2 + options.targetShift.dx,
      y2: options.segments[0]!.y2 + options.targetShift.dy,
    }];
  }

  const coords = options.segments.map((segment) => ({ ...segment }));
  const lastIndex = coords.length - 1;

  coords[0]!.x1 += options.sourceShift.dx;
  coords[0]!.y1 += options.sourceShift.dy;
  coords[lastIndex]!.x2 += options.targetShift.dx;
  coords[lastIndex]!.y2 += options.targetShift.dy;

  if (isHorizontalSegment(options.segments[0]!)) {
    coords[0]!.y2 += options.sourceShift.dy;
  } else {
    coords[0]!.x2 += options.sourceShift.dx;
  }
  coords[1]!.x1 = coords[0]!.x2;
  coords[1]!.y1 = coords[0]!.y2;

  if (isHorizontalSegment(options.segments[lastIndex]!)) {
    coords[lastIndex]!.y1 += options.targetShift.dy;
  } else {
    coords[lastIndex]!.x1 += options.targetShift.dx;
  }
  coords[lastIndex - 1]!.x2 = coords[lastIndex]!.x1;
  coords[lastIndex - 1]!.y2 = coords[lastIndex]!.y1;

  return coords;
}

export function shiftPreviewArrowheadPoints(
  points: string | null | undefined,
  shift: PreviewArrowEndpointShift,
): string {
  const values = String(points ?? '')
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number.parseFloat(value));
  const pairs: string[] = [];
  for (let index = 0; index < values.length; index += 2) {
    const x = (values[index] ?? 0) + shift.dx;
    const y = (values[index + 1] ?? 0) + shift.dy;
    pairs.push(`${x},${y}`);
  }
  return pairs.join(' ');
}

function createMeasureContext(ownerDocument: Document): CanvasRenderingContext2D | null {
  return ownerDocument.createElement('canvas').getContext('2d');
}

function reflowTextInGroup(options: {
  group: Element;
  widthDelta: number;
  inset: number;
  iconSize: number;
  gridStep: number;
  isFrameManagedTarget: (target: Element | null | undefined) => boolean;
  measureContext: CanvasRenderingContext2D | null;
}): number {
  if (options.isFrameManagedTarget(options.group)) return 0;
  const rect = options.group.querySelector(':scope > rect:first-of-type');
  if (!(rect instanceof SVGElement)) return 0;
  const textEl = options.group.querySelector('text');
  if (!(textEl instanceof SVGElement)) return 0;
  if (!options.measureContext) return 0;

  const origWidth = finiteNumber(rect.getAttribute('data-orig-width'), finiteNumber(rect.getAttribute('width')));
  const newWidth = origWidth + options.widthDelta;
  const hasIcon = Boolean(options.group.querySelector('.dg-icon'));
  const iconWidth = hasIcon ? options.iconSize : 0;
  const iconGap = hasIcon ? options.inset : 0;
  const availableWidth = newWidth - (2 * options.inset) - (iconWidth > 0 ? iconWidth + iconGap : 0);
  if (availableWidth <= 0) return 0;

  const tspans = Array.from(textEl.querySelectorAll('tspan'));
  if (tspans.length === 0) return 0;

  const firstY = finiteNumber(tspans[0]!.getAttribute('y'));
  const lineStep = tspans.length >= 2
    ? finiteNumber(tspans[1]!.getAttribute('y')) - firstY
    : 24;
  const svgNs = 'http://www.w3.org/2000/svg';

  const runs: Array<{
    text: string;
    fontSize: string;
    fontWeight: string;
    fill: string;
    x: string;
    scAttr: string;
    lsAttr: string;
    ffAttr: string;
  }> = [];

  for (const tspan of tspans) {
    const fontSize = tspan.getAttribute('font-size') || '14';
    const fontWeight = tspan.getAttribute('font-weight') || '400';
    const fill = tspan.getAttribute('fill') || '#000';
    const x = tspan.getAttribute('x') || '0';
    const text = tspan.textContent || '';
    const scAttr = tspan.getAttribute('font-variant-caps') || '';
    const lsAttr = tspan.getAttribute('letter-spacing') || '';
    const ffAttr = tspan.getAttribute('font-family') || '';
    const previous = runs.length > 0 ? runs[runs.length - 1]! : null;
    const sameStyle = Boolean(previous)
      && previous!.fontSize === fontSize
      && previous!.fontWeight === fontWeight
      && previous!.fill === fill
      && previous!.scAttr === scAttr
      && previous!.lsAttr === lsAttr
      && previous!.ffAttr === ffAttr;

    if (sameStyle && previous!.text !== '' && text !== '') {
      previous!.text += ` ${text}`;
    } else {
      runs.push({ text, fontSize, fontWeight, fill, x, scAttr, lsAttr, ffAttr });
    }
  }

  const lineSpecs: typeof runs = [];
  for (const run of runs) {
    options.measureContext.font = `${run.fontWeight} ${run.fontSize}px 'Ubuntu Sans', sans-serif`;
    if (!run.text || options.measureContext.measureText(run.text).width <= availableWidth) {
      lineSpecs.push({ ...run });
      continue;
    }

    const words = run.text.split(/(\s+)/);
    let line = '';
    for (const word of words) {
      const candidate = line + word;
      if (options.measureContext.measureText(candidate.trim()).width > availableWidth && line.trim()) {
        lineSpecs.push({ ...run, text: line.trim() });
        line = word.trimStart();
      } else {
        line = candidate;
      }
    }
    if (line.trim()) {
      lineSpecs.push({ ...run, text: line.trim() });
    }
  }

  const contentChanged = lineSpecs.length !== tspans.length
    || lineSpecs.some((spec, index) => spec.text !== (tspans[index]?.textContent || ''));
  if (contentChanged) {
    textEl.innerHTML = '';
    let currentY = firstY;
    for (const spec of lineSpecs) {
      const tspan = textEl.ownerDocument.createElementNS(svgNs, 'tspan');
      tspan.setAttribute('x', spec.x);
      tspan.setAttribute('y', currentY.toFixed(2));
      tspan.setAttribute('font-size', spec.fontSize);
      tspan.setAttribute('font-weight', spec.fontWeight);
      tspan.setAttribute('fill', spec.fill);
      if (spec.scAttr) tspan.setAttribute('font-variant-caps', spec.scAttr);
      if (spec.lsAttr) tspan.setAttribute('letter-spacing', spec.lsAttr);
      if (spec.ffAttr) tspan.setAttribute('font-family', spec.ffAttr);
      tspan.textContent = spec.text;
      textEl.appendChild(tspan);
      currentY += lineStep;
    }
  }

  const originalHeight = finiteNumber(
    rect.getAttribute('data-orig-height'),
    finiteNumber(rect.getAttribute('height')),
  );
  const lastTspan = textEl.querySelector('tspan:last-of-type');
  if (!(lastTspan instanceof SVGElement)) return 0;

  const lastY = finiteNumber(lastTspan.getAttribute('y'));
  const lastFontSize = finiteNumber(lastTspan.getAttribute('font-size'), 18);
  const textBottom = lastY + (lastFontSize * 0.25);
  const rectY = finiteNumber(rect.getAttribute('y'));
  const minHeight = textBottom - rectY + options.inset;
  const currentHeight = finiteNumber(rect.getAttribute('height'));
  if (minHeight <= currentHeight) return 0;

  const newHeight = Math.ceil(minHeight / options.gridStep) * options.gridStep;
  rect.setAttribute('height', String(newHeight));
  return newHeight - originalHeight;
}

function applyTextOverrideToGroup(group: Element, overrideLines: string[]): void {
  const textEl = group.querySelector('text');
  if (!(textEl instanceof SVGElement)) return;

  const tspans = Array.from(textEl.querySelectorAll('tspan'));
  const minLength = Math.min(overrideLines.length, tspans.length);
  for (let index = 0; index < minLength; index += 1) {
    tspans[index]!.textContent = overrideLines[index]!;
  }

  if (overrideLines.length > tspans.length && tspans.length > 0) {
    const lastTspan = tspans[tspans.length - 1]!;
    const x = lastTspan.getAttribute('x') || '0';
    const lastY = finiteNumber(lastTspan.getAttribute('y'));
    const lineStep = tspans.length >= 2
      ? finiteNumber(tspans[1]!.getAttribute('y')) - finiteNumber(tspans[0]!.getAttribute('y'))
      : 20;
    const svgNs = 'http://www.w3.org/2000/svg';
    for (let index = tspans.length; index < overrideLines.length; index += 1) {
      const tspan = textEl.ownerDocument.createElementNS(svgNs, 'tspan');
      tspan.setAttribute('x', x);
      tspan.setAttribute('y', String(lastY + (lineStep * (index - tspans.length + 1))));
      tspan.setAttribute('font-size', lastTspan.getAttribute('font-size') || '14');
      tspan.setAttribute('font-weight', lastTspan.getAttribute('font-weight') || '400');
      tspan.setAttribute('fill', lastTspan.getAttribute('fill') || '#000');
      tspan.textContent = overrideLines[index]!;
      textEl.appendChild(tspan);
    }
  }

  if (overrideLines.length < tspans.length) {
    for (let index = tspans.length - 1; index >= overrideLines.length; index -= 1) {
      tspans[index]!.remove();
    }
  }
}

function applyStyleOverrideToGroup(
  group: Element,
  preset: PreviewOverrideBoxStylePreset,
): void {
  const rect = group.querySelector(':scope > rect:first-of-type');
  if (rect instanceof SVGElement) {
    rect.setAttribute('fill', preset.fill);
  }
  group.querySelectorAll('text tspan').forEach((tspan) => {
    tspan.setAttribute('fill', preset.text);
  });
  group.querySelectorAll('.dg-icon').forEach((icon) => {
    (icon as HTMLElement).style.filter = preset.icon === '#FFFFFF' ? 'invert(1)' : '';
  });
}

function applyArrowGroupShift(group: Element, shift: PreviewArrowEndpointShift): void {
  if (shift.dx !== 0 || shift.dy !== 0) {
    setTranslateStyle(group, shift.dx, shift.dy);
  }
}

export function applyPreviewSvgOverrides(options: ApplyPreviewSvgOverridesOptions): void {
  const svg = options.svg;
  const relayoutStatus = options.relayoutStatus ?? null;
  const isFrameManagedTarget = (target: Element | null | undefined) =>
    options.isFrameManagedTarget(target, relayoutStatus);

  svg.querySelectorAll('[data-component-id]').forEach((group) => {
    if (isFrameManagedTarget(group)) return;
    (group as HTMLElement).style.transform = '';
  });

  svg.querySelectorAll('rect[data-orig-width]').forEach((rect) => {
    if (isFrameManagedTarget(rect)) return;
    rect.setAttribute('width', rect.getAttribute('data-orig-width') || '0');
    rect.setAttribute('height', rect.getAttribute('data-orig-height') || '0');
  });

  svg.querySelectorAll('.dg-icon[data-orig-tx]').forEach((icon) => {
    if (isFrameManagedTarget(icon)) return;
    icon.setAttribute(
      'transform',
      `translate(${icon.getAttribute('data-orig-tx') || '0'} ${icon.getAttribute('data-orig-ty') || '0'})`,
    );
  });

  svg.querySelectorAll('line[data-orig-x1]').forEach((line) => {
    line.setAttribute('x1', line.getAttribute('data-orig-x1') || '0');
    line.setAttribute('y1', line.getAttribute('data-orig-y1') || '0');
    line.setAttribute('x2', line.getAttribute('data-orig-x2') || '0');
    line.setAttribute('y2', line.getAttribute('data-orig-y2') || '0');
  });
  svg.querySelectorAll('polygon[data-orig-points]').forEach((polygon) => {
    polygon.setAttribute('points', polygon.getAttribute('data-orig-points') || '');
  });

  svg.querySelectorAll('[data-component-id] > rect:first-of-type').forEach((rect) => {
    if (isFrameManagedTarget(rect)) return;
    if (!rect.hasAttribute('data-orig-width')) {
      rect.setAttribute('data-orig-width', rect.getAttribute('width') || '0');
      rect.setAttribute('data-orig-height', rect.getAttribute('height') || '0');
      rect.setAttribute('data-orig-fill', rect.getAttribute('fill') || '#FFFFFF');
    }
  });

  svg.querySelectorAll('rect[data-orig-fill]').forEach((rect) => {
    if (isFrameManagedTarget(rect)) return;
    rect.setAttribute('fill', rect.getAttribute('data-orig-fill') || '#FFFFFF');
  });

  svg.querySelectorAll('.dg-icon').forEach((icon) => {
    if (isFrameManagedTarget(icon)) return;
    (icon as HTMLElement).style.filter = '';
  });

  svg.querySelectorAll('[data-component-id] text').forEach((textEl) => {
    if (isFrameManagedTarget(textEl)) return;
    if (!textEl.hasAttribute('data-orig-inner')) {
      textEl.setAttribute('data-orig-inner', textEl.innerHTML);
    } else {
      textEl.innerHTML = textEl.getAttribute('data-orig-inner') || '';
    }
  });

  const measureContext = createMeasureContext(svg.ownerDocument);
  const reflowDhByComponent: Record<string, number> = {};

  const applyToComponent = (cid: string) => {
    const effectiveDelta = options.getEffectiveDelta(cid);
    svg.querySelectorAll(`[data-component-id="${cid}"]`).forEach((group) => {
      const frameManaged = isFrameManagedTarget(group);
      if (!frameManaged) {
        if (effectiveDelta.dx !== 0 || effectiveDelta.dy !== 0) {
          setTranslateStyle(group, effectiveDelta.dx, effectiveDelta.dy);
        }

        if (effectiveDelta.dw !== 0 || effectiveDelta.dh !== 0) {
          const rect = group.querySelector(':scope > rect:first-of-type');
          if (rect instanceof SVGElement) {
            const originalWidth = finiteNumber(
              rect.getAttribute('data-orig-width'),
              finiteNumber(rect.getAttribute('width')),
            );
            const originalHeight = finiteNumber(
              rect.getAttribute('data-orig-height'),
              finiteNumber(rect.getAttribute('height')),
            );
            rect.setAttribute('width', String(Math.max(32, originalWidth + effectiveDelta.dw)));
            rect.setAttribute('height', String(Math.max(32, originalHeight + effectiveDelta.dh)));
          }

          if (effectiveDelta.dw !== 0) {
            const ownWidthDelta = options.getOwnDelta(cid).dw;
            group.querySelectorAll('.dg-icon').forEach((icon) => {
              if (!icon.hasAttribute('data-orig-tx')) {
                const match = (icon.getAttribute('transform') || '')
                  .match(/translate\(([\d.e+-]+)[, ]\s*([\d.e+-]+)\)/);
                if (match) {
                  icon.setAttribute('data-orig-tx', match[1] || '0');
                  icon.setAttribute('data-orig-ty', match[2] || '0');
                }
              }
              const originalTx = finiteNumber(icon.getAttribute('data-orig-tx'));
              const originalTy = finiteNumber(icon.getAttribute('data-orig-ty'));
              icon.setAttribute(
                'transform',
                `translate(${originalTx + ownWidthDelta} ${originalTy})`,
              );
            });
          }
        }
      }

      const override = options.overrides[cid];
      if (!frameManaged && Array.isArray(override?.text)) {
        applyTextOverrideToGroup(group, override.text.map((line) => String(line)));
      }

      if (!frameManaged && typeof override?.style === 'string' && options.boxStyles[override.style]) {
        applyStyleOverrideToGroup(group, options.boxStyles[override.style]!);
      }

      if (!frameManaged && effectiveDelta.dw !== 0) {
        const reflowDh = reflowTextInGroup({
          group,
          widthDelta: effectiveDelta.dw,
          inset: options.inset,
          iconSize: options.iconSize,
          gridStep: options.gridStep,
          isFrameManagedTarget,
          measureContext,
        });
        if (reflowDh > 0) reflowDhByComponent[cid] = reflowDh;
      }
    });
  };

  const visit = (nodes: PreviewOverrideTreeNode[]) => {
    for (const node of nodes) {
      if (node.type !== 'arrow') applyToComponent(node.id);
      if (Array.isArray(node.children) && node.children.length > 0) {
        visit(node.children);
      }
    }
  };
  visit(options.componentTree);
  Object.keys(options.overrides).forEach(applyToComponent);

  const cumulativeReflowDy = options.hasDiagramGrid
    ? resolvePreviewReflowShiftMap({
      reflowDhByComponent,
      rootNodes: options.rootNodes,
      getNode: options.getNode,
    })
    : {};

  for (const [cid, dy] of Object.entries(cumulativeReflowDy)) {
    const effectiveDelta = options.getEffectiveDelta(cid);
    svg.querySelectorAll(`[data-component-id="${cid}"]`).forEach((group) => {
      setTranslateStyle(group, effectiveDelta.dx, effectiveDelta.dy + dy);
    });
  }

  for (const node of options.componentTree) {
    if (node.type !== 'arrow' || (!node.source && !node.target)) continue;
    const sourceCid = node.source ? node.source.split('.')[0] || '' : '';
    const sourceSide = node.source ? node.source.split('.').pop() : '';
    const targetCid = node.target ? node.target.split('.')[0] || '' : '';
    const targetSide = node.target ? node.target.split('.').pop() : '';
    const sourceDelta = sourceCid ? options.getEffectiveDelta(sourceCid) : zeroDelta();
    const targetDelta = targetCid ? options.getEffectiveDelta(targetCid) : zeroDelta();
    const sourceShift = resolvePreviewArrowSideShift({
      delta: sourceDelta,
      side: sourceSide,
      reflowDh: reflowDhByComponent[sourceCid] ?? 0,
      reflowDy: cumulativeReflowDy[sourceCid] ?? 0,
    });
    const targetShift = resolvePreviewArrowSideShift({
      delta: targetDelta,
      side: targetSide,
      reflowDh: reflowDhByComponent[targetCid] ?? 0,
      reflowDy: cumulativeReflowDy[targetCid] ?? 0,
    });

    if (sourceShift.dx === targetShift.dx && sourceShift.dy === targetShift.dy) {
      svg.querySelectorAll(`[data-component-id="${node.id}"]`).forEach((group) => {
        applyArrowGroupShift(group, sourceShift);
      });
      continue;
    }

    svg.querySelectorAll(`[data-component-id="${node.id}"]`).forEach((group) => {
      const lines = Array.from(group.querySelectorAll('line'));
      const polygons = Array.from(group.querySelectorAll('polygon'));
      if (lines.length === 0) return;

      lines.forEach((line) => {
        if (!line.hasAttribute('data-orig-x1')) {
          line.setAttribute('data-orig-x1', line.getAttribute('x1') || '0');
          line.setAttribute('data-orig-y1', line.getAttribute('y1') || '0');
          line.setAttribute('data-orig-x2', line.getAttribute('x2') || '0');
          line.setAttribute('data-orig-y2', line.getAttribute('y2') || '0');
        }
      });
      polygons.forEach((polygon) => {
        if (!polygon.hasAttribute('data-orig-points')) {
          polygon.setAttribute('data-orig-points', polygon.getAttribute('points') || '');
        }
      });

      lines.forEach((line) => {
        line.setAttribute('x1', line.getAttribute('data-orig-x1') || '0');
        line.setAttribute('y1', line.getAttribute('data-orig-y1') || '0');
        line.setAttribute('x2', line.getAttribute('data-orig-x2') || '0');
        line.setAttribute('y2', line.getAttribute('data-orig-y2') || '0');
      });
      polygons.forEach((polygon) => {
        polygon.setAttribute('points', polygon.getAttribute('data-orig-points') || '');
      });

      const visibleLines = lines.filter((line) => line.getAttribute('stroke') !== 'transparent');
      const hitLines = lines.filter((line) => line.getAttribute('stroke') === 'transparent');
      if (visibleLines.length === 0) return;

      const originalSegments = visibleLines.map((line) => ({
        x1: finiteNumber(line.getAttribute('data-orig-x1')),
        y1: finiteNumber(line.getAttribute('data-orig-y1')),
        x2: finiteNumber(line.getAttribute('data-orig-x2')),
        y2: finiteNumber(line.getAttribute('data-orig-y2')),
      }));
      const shiftedSegments = resolvePreviewArrowShiftedSegments({
        segments: originalSegments,
        sourceShift,
        targetShift,
      });

      shiftedSegments.forEach((segment, index) => {
        const line = visibleLines[index]!;
        line.setAttribute('x1', String(segment.x1));
        line.setAttribute('y1', String(segment.y1));
        line.setAttribute('x2', String(segment.x2));
        line.setAttribute('y2', String(segment.y2));
      });

      polygons.forEach((polygon) => {
        polygon.setAttribute(
          'points',
          shiftPreviewArrowheadPoints(polygon.getAttribute('data-orig-points'), targetShift),
        );
      });

      hitLines.forEach((line, index) => {
        if (index >= visibleLines.length) return;
        line.setAttribute('x1', visibleLines[index]!.getAttribute('x1') || '0');
        line.setAttribute('y1', visibleLines[index]!.getAttribute('y1') || '0');
        line.setAttribute('x2', visibleLines[index]!.getAttribute('x2') || '0');
        line.setAttribute('y2', visibleLines[index]!.getAttribute('y2') || '0');
      });
    });
  }

  if (options.selectedId && options.showResizeHandles) {
    options.showResizeHandles(options.selectedId);
  }
}

export function applyPreviewSvgOverridesHost(
  options: ApplyPreviewSvgOverridesHostOptions,
): boolean {
  const svg = options.document.querySelector('#stage svg');
  if (!svg) {
    return false;
  }
  const selectedIdList = [...options.selectedIds];
  const selectedId = selectedIdList.length > 0
    ? selectedIdList[selectedIdList.length - 1] ?? null
    : null;

  const applySvgOverrides = options.applyPreviewSvgOverrides ?? applyPreviewSvgOverrides;
  applySvgOverrides({
    svg,
    componentTree: options.componentTree,
    rootNodes: options.rootNodes,
    overrides: options.overrides,
    relayoutStatus: options.relayoutStatus ?? null,
    boxStyles: options.boxStyles,
    inset: options.inset,
    iconSize: options.iconSize,
    gridStep: options.gridStep,
    hasDiagramGrid: options.hasDiagramGrid,
    getNode: options.getNode,
    getOwnDelta: options.getOwnDelta,
    getEffectiveDelta: options.getEffectiveDelta,
    isFrameManagedTarget: options.isFrameManagedTarget,
    selectedId,
    showResizeHandles: options.showResizeHandles ?? null,
  });
  return true;
}
