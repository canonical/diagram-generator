import { parseFrameRecord } from '../frame-record-parser.js';
import { createArrow, createLine, FrameDiagram, type DiagramOverlay } from '../frame-model.js';
import { migrateLegacyFrameDiagramEngineState } from '../preview-engine/legacy-layout-engine-migration.js';
import { GRID_GUTTER } from '../tokens.js';
import { resolveStyles } from '../resolve-styles.js';
import type { AuthorArrow, AuthorFrameNode, DiagramDocument, LineSpec } from './types.js';

function lineSpecToRecord(line: LineSpec): Record<string, unknown> {
  const record: Record<string, unknown> = { text: line.text };
  if (line.size) record.size = line.size;
  if (line.weight) record.weight = line.weight;
  if (line.fill) record.fill = line.fill;
  if (line.letterSpacing) record.letter_spacing = line.letterSpacing;
  if (line.lineStep !== undefined) record.line_step = line.lineStep;
  if (line.fontFamily) record.font_family = line.fontFamily;
  return record;
}

function assignIfDefined(
  record: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  if (value !== undefined) {
    record[key] = value;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeLayoutProfiles(meta: Record<string, unknown>): Record<string, unknown> | undefined {
  const profiles = meta.layout_profiles;
  return isRecord(profiles) && Object.keys(profiles).length > 0
    ? { ...profiles }
    : undefined;
}

export function authorNodeToRecord(node: AuthorFrameNode): Record<string, unknown> {
  const record: Record<string, unknown> = {
    id: node.id,
    children: node.children.map(authorNodeToRecord),
  };

  assignIfDefined(record, 'direction', node.direction);
  assignIfDefined(record, 'flow_direction', node.flowDirection);
  assignIfDefined(record, 'gap', node.gap);
  assignIfDefined(record, 'gap_delta', node.gapDelta);
  assignIfDefined(record, 'padding', node.padding);
  assignIfDefined(record, 'padding_top', node.paddingTop);
  assignIfDefined(record, 'padding_right', node.paddingRight);
  assignIfDefined(record, 'padding_bottom', node.paddingBottom);
  assignIfDefined(record, 'padding_left', node.paddingLeft);
  assignIfDefined(record, 'sizing', node.sizing);
  assignIfDefined(record, 'sizing_w', node.sizingW);
  assignIfDefined(record, 'sizing_h', node.sizingH);
  assignIfDefined(record, 'fill_weight', node.fillWeight);
  assignIfDefined(record, 'width', node.width);
  assignIfDefined(record, 'height', node.height);
  assignIfDefined(record, 'min_width', node.minWidth);
  assignIfDefined(record, 'max_width', node.maxWidth);
  assignIfDefined(record, 'max_width_chars', node.maxWidthChars);
  assignIfDefined(record, 'min_height', node.minHeight);
  assignIfDefined(record, 'max_height', node.maxHeight);
  assignIfDefined(record, 'align', node.align);
  assignIfDefined(record, 'justify', node.justify);
  assignIfDefined(record, 'wrap', node.wrap);
  assignIfDefined(record, 'fill', node.fill);
  assignIfDefined(record, 'border', node.border);
  assignIfDefined(record, 'level', node.level);
  assignIfDefined(record, 'variant', node.variant);
  assignIfDefined(record, 'role', node.role);
  assignIfDefined(record, 'icon', node.icon);
  assignIfDefined(record, 'icon_fill', node.iconFill);
  assignIfDefined(record, 'position', node.position);
  assignIfDefined(record, 'x', node.x);
  assignIfDefined(record, 'y', node.y);
  assignIfDefined(record, 'col_span', node.colSpan);
  if (node.heading) record.heading = lineSpecToRecord(node.heading);
  if (node.helper) record.helper = node.helper.map(lineSpecToRecord);
  if (node.label) record.label = node.label.map(lineSpecToRecord);

  return record;
}

function lowerArrow(arrow: AuthorArrow) {
  return createArrow(arrow.source, arrow.target, {
    id: arrow.id,
    color: arrow.color,
    labelGap: arrow.labelGap,
    waypoints: arrow.waypoints,
    label: arrow.label?.map(line => createLine(line.text)),
  });
}

export function lowerToFrameDiagram(
  ast: DiagramDocument,
  source: Record<string, unknown>,
): FrameDiagram {
  if (!ast.root) {
    throw new Error('Cannot lower diagram without root');
  }

  const root = parseFrameRecord(authorNodeToRecord(ast.root), true);
  resolveStyles(root);

  const overlays: DiagramOverlay[] = ((source.overlays as Record<string, unknown>[]) ?? []).map(o => ({
    id: o.id != null ? String(o.id) : undefined,
    label: o.label != null ? String(o.label) : undefined,
    members: ((o.members as unknown[]) ?? []).map(m => String(m)),
  }));

  const grid = (source.grid as Record<string, unknown>) ?? {};
  const meta = (source.meta as Record<string, unknown>) ?? {};
  const layoutProfiles = normalizeLayoutProfiles(meta);
  const engineLayout: Record<string, Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (
      key === 'layout_engine'
      || key === 'diagram_type'
      || key === 'source_image'
      || key === 'frame_roles'
      || key === 'layout_profiles'
    ) {
      continue;
    }
    if (!isRecord(value)) {
      continue;
    }
    const layoutValues = Object.fromEntries(
      Object.entries(value)
        .map(([layoutKey, layoutValue]) => {
          if (key.endsWith('_nodes') && isRecord(layoutValue)) {
            return [layoutKey, Object.fromEntries(
              Object.entries(layoutValue).map(([nodeKey, nodeValue]) => [nodeKey, String(nodeValue)]),
            )];
          }
          return [layoutKey, String(layoutValue)];
        }),
    );
    if (Object.keys(layoutValues).length > 0) {
      engineLayout[`meta.${key}`] = layoutValues;
    }
  }
  const elkLayout = engineLayout['meta.elk'] as Record<string, string> | undefined;

  return new FrameDiagram(migrateLegacyFrameDiagramEngineState({
    title: String(source.title ?? ast.metadata.title ?? ''),
    root,
    arrows: ast.arrows.map(lowerArrow),
    overlays,
    gridCols: Number(grid.cols ?? 2),
    gridColGap: grid.col_gap != null ? Number(grid.col_gap) : GRID_GUTTER,
    gridRowGap: grid.row_gap != null ? Number(grid.row_gap) : GRID_GUTTER,
    gridOuterMargin: grid.outer_margin != null ? Number(grid.outer_margin) : GRID_GUTTER,
    layoutEngine: meta.layout_engine != null ? String(meta.layout_engine) : undefined,
    diagramType: meta.diagram_type != null ? String(meta.diagram_type) : undefined,
    sourceImage: meta.source_image != null ? String(meta.source_image) : undefined,
    layoutProfiles,
    elkLayout,
    engineLayout: Object.keys(engineLayout).length > 0 ? engineLayout : undefined,
  }));
}
