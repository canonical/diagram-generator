import type {
  PreviewDocumentSvgRenderer,
  PreviewRenderableDocument,
} from './render.js';
import { registerPreviewDocumentSvgRenderer } from './render.js';
import { registerPreviewEngine } from './registry.js';
import type { PreviewEngineManifest } from './types.js';

export interface MindmapLiteDocumentData {
  root: string;
  children: string[];
}

export interface MindmapLitePreviewDocument extends PreviewRenderableDocument {
  kind: 'mindmap-lite';
  slug: string;
  title: string;
  layoutEngine: string;
  shellMode: 'grid';
  mindmap: MindmapLiteDocumentData;
}

export const MINDMAP_LITE_PREVIEW_ENGINE: PreviewEngineManifest = {
  id: 'mindmap-tree',
  label: 'Mindmap tree',
  algorithmClass: 'mindmap-install-proof',
  layoutEngineKey: 'mindmap-tree',
  shellMode: 'grid',
  hostView: {
    sidebarSections: [],
  },
  capabilities: {
    layoutControls: false,
    localRelayout: false,
    serverRelayout: false,
    engineBackedSave: false,
    nodeInspector: false,
    gridEditing: false,
    referenceImage: false,
    simulationControls: false,
    rawDebugView: false,
  },
  controlSpecs: [],
  scripts: [],
  compatibility: {
    documentKinds: ['mindmap-lite'],
    requiredLayoutEngineKey: 'mindmap-tree',
    description: 'Skeletal rooted-tree preview used to prove foreign-shaped install units',
  },
};

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function requireMindmapLitePreviewDocument(
  document: PreviewRenderableDocument,
): MindmapLitePreviewDocument {
  const candidate = document as Partial<MindmapLitePreviewDocument>;
  if (
    document.kind !== 'mindmap-lite'
    || !candidate.mindmap
    || typeof candidate.mindmap.root !== 'string'
    || !Array.isArray(candidate.mindmap.children)
  ) {
    throw new Error('Mindmap-lite preview renderer requires a rooted tree payload');
  }
  return candidate as MindmapLitePreviewDocument;
}

export const mindmapLitePreviewDocumentSvgRenderer: PreviewDocumentSvgRenderer = async (document) => {
  const previewDocument = requireMindmapLitePreviewDocument(document);
  const rootLabel = previewDocument.mindmap.root.trim();
  const children = previewDocument.mindmap.children
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const boxWidth = 176;
  const boxHeight = 52;
  const paddingX = 24;
  const paddingY = 24;
  const verticalGap = 76;
  const horizontalGap = 24;
  const childCount = Math.max(children.length, 1);
  const width = (boxWidth * childCount) + (horizontalGap * Math.max(childCount - 1, 0)) + (paddingX * 2);
  const height = children.length > 0
    ? (paddingY * 2) + (boxHeight * 2) + verticalGap
    : (paddingY * 2) + boxHeight;
  const rootX = (width - boxWidth) / 2;
  const rootY = paddingY;
  const rootCenterX = rootX + (boxWidth / 2);
  const rootBottomY = rootY + boxHeight;
  const childY = rootBottomY + verticalGap;

  const connectors = children.map((label, index) => {
    const childX = paddingX + (index * (boxWidth + horizontalGap));
    const childCenterX = childX + (boxWidth / 2);
    return [
      `<line x1="${rootCenterX}" y1="${rootBottomY}" x2="${childCenterX}" y2="${childY}" stroke="#5B6472" stroke-width="2" />`,
      `<rect x="${childX}" y="${childY}" width="${boxWidth}" height="${boxHeight}" rx="8" fill="#F5F7FA" stroke="#D0D7E2" />`,
      `<text x="${childCenterX}" y="${childY + 31}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#1F2937">${escapeXml(label)}</text>`,
    ].join('');
  }).join('');

  return {
    svgMarkup: [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-document-kind="mindmap-lite">`,
      `<rect width="${width}" height="${height}" fill="#FFFFFF" />`,
      `<rect x="${rootX}" y="${rootY}" width="${boxWidth}" height="${boxHeight}" rx="10" fill="#E8EEF9" stroke="#9DB4D8" />`,
      `<text x="${rootCenterX}" y="${rootY + 31}" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="600" fill="#1F2937">${escapeXml(rootLabel)}</text>`,
      connectors,
      `</svg>`,
    ].join(''),
    width,
    height,
  };
};

export function installMindmapLitePreviewEngine(): () => void {
  const unregisterEngine = registerPreviewEngine(MINDMAP_LITE_PREVIEW_ENGINE);
  const unregisterRenderer = registerPreviewDocumentSvgRenderer(
    'mindmap-lite',
    mindmapLitePreviewDocumentSvgRenderer,
  );
  return () => {
    unregisterRenderer();
    unregisterEngine();
  };
}
