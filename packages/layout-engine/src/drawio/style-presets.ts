/**
 * draw.io style presets — TypeScript port of scripts/drawio_style_presets.py.
 */

import { Fill } from '../frame-model.js';
import { BODY_SIZE, sizeToPx } from '../tokens.js';
import { drawioThemeColor } from './theme.js';

export const FONT_SOURCE = 'https%3A%2F%2Ffonts.googleapis.com%2Fcss%3Ffamily%3DUbuntu%2BSans';

export function styleString(props: Record<string, string | number | boolean | null | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined) continue;
    if (value === '') {
      parts.push(key);
    } else {
      parts.push(`${key}=${value}`);
    }
  }
  return parts.length > 0 ? `${parts.join(';')};` : '';
}

export function rectStyleProps(
  fill: string,
  options?: { stroke?: string; dashed?: boolean; strokeWidth?: number },
): Record<string, string> {
  const stroke = options?.stroke ?? Fill.BLACK;
  const dashed = options?.dashed ?? false;
  const strokeWidth = options?.strokeWidth ?? 1;
  const props: Record<string, string> = {
    rounded: '0',
    whiteSpace: 'wrap',
    html: '1',
    shadow: '0',
    fillColor: fill === 'transparent' ? 'none' : drawioThemeColor(fill),
  };
  if (stroke === 'none') {
    props.strokeColor = 'none';
    props.strokeWidth = '0';
  } else {
    props.strokeColor = drawioThemeColor(stroke);
    props.strokeWidth = String(strokeWidth);
  }
  if (dashed) {
    props.dashed = '1';
    props.dashPattern = '8 8';
  }
  return props;
}

export function labelStyleProps(options?: {
  fontSize?: number;
  fontColor?: string;
  align?: string;
  verticalAlign?: string;
  fontFamily?: string;
  fontSource?: string | null;
}): Record<string, string> {
  const props: Record<string, string> = {
    rounded: '0',
    whiteSpace: 'wrap',
    html: '1',
    align: options?.align ?? 'left',
    verticalAlign: options?.verticalAlign ?? 'top',
    spacing: '0',
    spacingTop: '0',
    spacingBottom: '0',
    spacingLeft: '0',
    spacingRight: '0',
    fillColor: 'none',
    strokeColor: 'none',
    strokeWidth: '0',
    shadow: '0',
    fontFamily: options?.fontFamily ?? 'Ubuntu Sans',
    fontSize: String(options?.fontSize ?? sizeToPx(BODY_SIZE)),
    fontColor: drawioThemeColor(options?.fontColor ?? Fill.BLACK),
  };
  const fontSource = options?.fontSource === undefined ? FONT_SOURCE : options.fontSource;
  if (fontSource) {
    props.fontSource = fontSource;
  }
  return props;
}

export function imageStyleProps(imageUri?: string): Record<string, string> {
  const props: Record<string, string> = {
    shape: 'image',
    html: '1',
    aspect: 'fixed',
    imageAspect: '0',
    verticalLabelPosition: 'middle',
    verticalAlign: 'middle',
    strokeColor: 'none',
    fillColor: 'none',
    imageBackground: 'none',
    imageBorder: '0',
  };
  if (imageUri) {
    props.image = imageUri;
  }
  return props;
}

export function edgeStyleProps(
  color: string,
  options?: {
    dashed?: boolean;
    startArrow?: boolean;
    endArrow?: boolean;
    orthogonal?: boolean;
    exitX?: number;
    exitY?: number;
    entryX?: number;
    entryY?: number;
  },
): Record<string, string> {
  const props: Record<string, string> = {};
  const orthogonal = options?.orthogonal ?? true;
  if (orthogonal) {
    props.edgeStyle = 'orthogonalEdgeStyle';
  } else {
    props.edgeStyle = 'none';
  }
  Object.assign(props, {
    rounded: '0',
    orthogonalLoop: '1',
    jettySize: 'auto',
    html: '1',
    strokeColor: drawioThemeColor(color),
    strokeWidth: '1',
  });
  if (options?.startArrow) {
    props.startArrow = 'blockThin';
    props.startFill = '1';
    props.startSize = '8';
  } else {
    props.startArrow = 'none';
    props.startFill = '0';
  }
  if (options?.endArrow ?? true) {
    props.endArrow = 'blockThin';
    props.endFill = '1';
    props.endSize = '8';
  } else {
    props.endArrow = 'none';
    props.endFill = '0';
  }
  if (options?.dashed) {
    props.dashed = '1';
    props.dashPattern = '8 8';
  }
  if (options?.exitX !== undefined && options?.exitY !== undefined) {
    props.exitX = String(options.exitX);
    props.exitY = String(options.exitY);
    props.exitDx = '0';
    props.exitDy = '0';
  }
  if (options?.entryX !== undefined && options?.entryY !== undefined) {
    props.entryX = String(options.entryX);
    props.entryY = String(options.entryY);
    props.entryDx = '0';
    props.entryDy = '0';
  }
  return props;
}

export function rectStyle(
  fill: string,
  options?: { stroke?: string; dashed?: boolean; strokeWidth?: number },
): string {
  return styleString(rectStyleProps(fill, options));
}

export function labelStyle(options?: Parameters<typeof labelStyleProps>[0]): string {
  return styleString(labelStyleProps(options));
}

export function imageStyle(imageUri: string): string {
  return styleString(imageStyleProps(imageUri));
}

export function edgeStyle(
  color: string,
  options?: Parameters<typeof edgeStyleProps>[1],
): string {
  return styleString(edgeStyleProps(color, options));
}
